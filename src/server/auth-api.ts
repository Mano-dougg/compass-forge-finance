import { z } from "zod";
import { normalizarCnpj, validarCnpj } from "../lib/cnpj.ts";
import { importarBaseMercado } from "../lib/market-clusters.ts";
import { companyDocumentSchema } from "../lib/company-document.ts";
import type { Database } from "./database.ts";

const COOKIE = "atlas_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const ITERATIONS = 100_000; // Cloudflare Web Crypto PBKDF2 iteration limit.
const credentials = z.object({
  cnpj: z.string().max(40).transform(normalizarCnpj).refine(validarCnpj),
  senha: z.string().min(10).max(128),
  nome: z.string().trim().min(2).max(160).optional(),
});
class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
const hex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const digest = async (value: string) =>
  hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
async function derive(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return hex(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: new TextEncoder().encode(salt),
        iterations: ITERATIONS,
      },
      key,
      256,
    ),
  );
}
export async function hashPassword(password: string): Promise<string> {
  const salt = random();
  return `pbkdf2-sha256$${ITERATIONS}$${salt}$${await derive(password, salt)}`;
}
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [algorithm, iterations, salt, expected] = hash.split("$");
  if (algorithm !== "pbkdf2-sha256" || Number(iterations) !== ITERATIONS || !salt || !expected)
    return false;
  const actual = await derive(password, salt);
  let difference = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++)
    difference |= actual.charCodeAt(i) ^ (expected.charCodeAt(i) || 0);
  return difference === 0;
}
function json(value: unknown, status = 200, cookie?: string): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  if (cookie) headers.set("Set-Cookie", cookie);
  return new Response(JSON.stringify(value), { status, headers });
}
function sessionCookie(request: Request, token: string, age: number): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
async function body(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new ApiError(415, "Envie os dados em JSON.");
  // Stream limit also covers clients without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Dados ausentes.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.length;
    if (size > 5_100_000) {
      await reader.cancel();
      throw new ApiError(413, "Os dados excedem o limite de 5 MB.");
    }
    chunks.push(next.value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(buffer));
  } catch {
    throw new ApiError(400, "JSON inválido.");
  }
}
async function tokenHash(request: Request): Promise<string | null> {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? digest(token) : null;
}
type Row = { id: string; cnpj: string; name: string; password_hash: string };
async function current(request: Request, db: Database): Promise<Row | null> {
  const hash = await tokenHash(request);
  if (!hash) return null;
  return db
    .prepare(
      "SELECT a.id,a.cnpj,a.name,a.password_hash FROM accounts a JOIN sessions s ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?",
    )
    .bind(hash, Date.now())
    .first<Row>();
}
async function sessionData(account: Row, db: Database) {
  const saved = await db
    .prepare("SELECT document,revision FROM company_documents WHERE account_id=?")
    .bind(account.id)
    .first<{ document: string; revision: number }>();
  return {
    account: { id: account.id, cnpj: account.cnpj, nome: account.name },
    document: saved ? companyDocumentSchema.parse(JSON.parse(saved.document)) : null,
    revision: saved?.revision ?? 0,
  };
}
async function throttle(db: Database, key: string, limit: number) {
  const now = Date.now();
  await db
    .prepare(
      "INSERT INTO auth_attempts (key,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires_at<=? THEN 1 ELSE attempts+1 END,expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END",
    )
    .bind(key, now + 15 * 60_000, now, now)
    .run();
  const row = await db
    .prepare("SELECT attempts FROM auth_attempts WHERE key=?")
    .bind(key)
    .first<{ attempts: number }>();
  if ((row?.attempts ?? 0) > limit)
    throw new ApiError(429, "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.");
}
export async function handleAuthApi(request: Request, db: Database | undefined): Promise<Response> {
  try {
    if (!db)
      throw new ApiError(
        503,
        "O banco de dados ainda não está conectado. Configure o banco ATLAS_DB no servidor.",
      );
    const path = new URL(request.url).pathname;
    if (request.method !== "GET") {
      if (request.headers.get("origin") !== new URL(request.url).origin)
        throw new ApiError(403, "Origem da solicitação não permitida.");
    }
    if (path === "/api/session" && request.method === "GET") {
      const account = await current(request, db);
      return json(account ? await sessionData(account, db) : { account: null });
    }
    if ((path === "/api/login" || path === "/api/cadastro") && request.method === "POST") {
      const ip = request.headers.get("cf-connecting-ip") || "local";
      await throttle(db, `ip:${await digest(ip)}`, 60);
      const parsed = credentials.safeParse(await body(request));
      if (!parsed.success)
        throw new ApiError(400, "Informe um CNPJ válido e uma senha de 10 a 128 caracteres.");
      const { cnpj, senha, nome } = parsed.data;
      await throttle(db, `cnpj:${cnpj}`, 10);
      let account = await db
        .prepare("SELECT id,cnpj,name,password_hash FROM accounts WHERE cnpj=?")
        .bind(cnpj)
        .first<Row>();
      if (path === "/api/cadastro") {
        if (!nome) throw new ApiError(400, "Informe a razão social da empresa.");
        if (account)
          throw new ApiError(
            409,
            "Não foi possível cadastrar esse CNPJ. Se já possui uma conta, entre com sua senha.",
          );
        const id = crypto.randomUUID();
        const passwordHash = await hashPassword(senha);
        try {
          await db
            .prepare(
              "INSERT INTO accounts (id,cnpj,name,password_hash,created_at) VALUES (?,?,?,?,?)",
            )
            .bind(id, cnpj, nome, passwordHash, Date.now())
            .run();
        } catch (error) {
          if (String(error).includes("UNIQUE"))
            throw new ApiError(
              409,
              "Não foi possível cadastrar esse CNPJ. Se já possui uma conta, entre com sua senha.",
            );
          throw error;
        }
        account = { id, cnpj, name: nome, password_hash: passwordHash };
      } else {
        // Always derive a key, including when the identifier is unknown.
        const hash =
          account?.password_hash ??
          `pbkdf2-sha256$${ITERATIONS}$${"0".repeat(64)}$${"0".repeat(64)}`;
        const valid = await verifyPassword(senha, hash);
        if (!account || !valid) throw new ApiError(401, "CNPJ ou senha incorretos.");
      }
      const token = random();
      await db
        .prepare("INSERT INTO sessions (token_hash,account_id,expires_at) VALUES (?,?,?)")
        .bind(await digest(token), account.id, Date.now() + SESSION_MS)
        .run();
      await db.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(Date.now()).run();
      await db.prepare("DELETE FROM auth_attempts WHERE expires_at<=?").bind(Date.now()).run();
      return json(
        await sessionData(account, db),
        200,
        sessionCookie(request, token, SESSION_MS / 1000),
      );
    }
    const account = await current(request, db);
    if (!account) throw new ApiError(401, "Sua sessão expirou. Entre novamente para continuar.");
    if (
      (path === "/api/company" || path === "/api/logout") &&
      request.headers.get("x-atlas-account") !== account.id
    ) {
      throw new ApiError(
        409,
        "A conta conectada mudou em outra aba. Recarregue a página antes de continuar.",
      );
    }
    if (path === "/api/logout" && request.method === "POST") {
      const hash = await tokenHash(request);
      if (hash) await db.prepare("DELETE FROM sessions WHERE token_hash=?").bind(hash).run();
      return json({ ok: true }, 200, sessionCookie(request, "", 0));
    }
    if (path === "/api/company" && request.method === "PUT") {
      const parsed = z
        .object({ document: companyDocumentSchema, revision: z.number().int().nonnegative() })
        .strict()
        .safeParse(await body(request));
      if (!parsed.success)
        throw new ApiError(400, "Os dados da empresa são inválidos. Revise os valores informados.");
      const { document, revision } = parsed.data;
      if (document.mercadoCompleto) {
        try {
          const market = importarBaseMercado(document.mercadoCompleto);
          if (document.setor && !document.demonstracao) {
            // A seleção pode ter poucos pares: estatísticas continuam válidas mesmo sem clusters.
            if (!market.empresas.some((e) => e.setor === document.setor))
              throw new Error("O setor selecionado não existe na base salva.");
          }
        } catch {
          throw new ApiError(
            400,
            "A base de benchmarking salva é inválida. Importe uma base válida e tente novamente.",
          );
        }
      } else if (document.setor) {
        throw new ApiError(400, "O setor selecionado precisa de uma base de benchmarking.");
      }
      const result =
        revision === 0
          ? await db
              .prepare(
                "INSERT INTO company_documents (account_id,document,revision,updated_at) VALUES (?,?,1,?) ON CONFLICT(account_id) DO NOTHING",
              )
              .bind(account.id, JSON.stringify(document), Date.now())
              .run()
          : await db
              .prepare(
                "UPDATE company_documents SET document=?,revision=revision+1,updated_at=? WHERE account_id=? AND revision=?",
              )
              .bind(JSON.stringify(document), Date.now(), account.id, revision)
              .run();
      if (result.meta.changes !== 1)
        throw new ApiError(
          409,
          "Os dados foram alterados em outra aba. Recarregue a página para usar a versão salva.",
        );
      return json({ revision: revision + 1 });
    }
    throw new ApiError(404, "Operação não encontrada.");
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    console.error(
      "Falha na API de contas",
      error instanceof Error ? error.message : "Erro desconhecido",
    );
    return json({ error: "Não foi possível concluir a operação. Tente novamente." }, 500);
  }
}
