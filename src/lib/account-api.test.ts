import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { handleAuthApi, hashPassword, verifyPassword } from "../server/auth-api.ts";
import type { Database, Statement } from "../server/database.ts";
import { normalizarCnpj, validarCnpj } from "./cnpj.ts";
import { companyDocumentSchema, type CompanyDocument } from "./company-document.ts";
function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  sqlite.exec(readFileSync("migrations/0001_accounts.sql", "utf8"));
  const db: Database = {
    prepare(sql) {
      let values: (string | number | null)[] = [];
      const statement: Statement = {
        bind(...v) {
          values = v;
          return statement;
        },
        async first<T>() {
          return (sqlite.prepare(sql).get(...values) as T | undefined) ?? null;
        },
        async run() {
          return { meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } };
        },
      };
      return statement;
    },
  };
  return { db, sqlite };
}
const cookieAccounts = new Map<string, string>();
function request(
  path: string,
  method = "GET",
  data?: unknown,
  cookie = "",
  origin = "https://atlas.test",
) {
  return new Request(`https://atlas.test/api/${path}`, {
    method,
    headers: {
      origin,
      "content-type": "application/json",
      cookie,
      "x-atlas-account": cookieAccounts.get(cookie) ?? "",
    },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
}
const document: CompanyDocument = {
  version: 1,
  base: { receita: 100, custos: 50, patrimonio: 80, investimento: 10 },
  dados: { receita: 120, custos: 60, patrimonio: 80, investimento: 15 },
  nome: "Empresa A",
  janela: 3,
  horizonte: 3,
  linhas: [{ ano: "2025", patrimonio: "80" }],
  hipoteses: { impostoPct: "0", retencaoPct: "100", retornoInvestimentoPct: "0" },
  mercadoCompleto: null,
  setor: "",
  demonstracao: false,
  planejamento: {
    objetivo: { patrimonioAlvo: 200, anos: 3, distribuicaoPct: 0, anoBase: 2026 },
    manual: { receita: 120, custos: 60 },
    escolha: "manual",
    assinatura: "assinatura-de-teste",
    justificativa: "Manter o orçamento anual escolhido",
  },
};
test("CNPJ: normalização, dígitos numéricos e alfanuméricos", () => {
  assert.equal(normalizarCnpj("12.abc.345/01de-35"), "12ABC34501DE35");
  for (const cnpj of ["11.222.333/0001-81", "12.ABC.345/01DE-35"])
    assert.equal(validarCnpj(cnpj), true);
  for (const cnpj of ["00000000000000", "11222333000182", "12.ABC.345/01DE-34", "11!222333000181"])
    assert.equal(validarCnpj(cnpj), false);
});
test("senha é salgada e a verificação rejeita valores incorretos", async () => {
  const first = await hashPassword("uma senha longa para teste");
  const second = await hashPassword("uma senha longa para teste");
  assert.notEqual(first, second);
  assert.ok(!first.includes("uma senha longa"));
  assert.equal(await verifyPassword("uma senha longa para teste", first), true);
  assert.equal(await verifyPassword("outra senha incorreta", first), false);
});
test("cadastro, autenticação, isolamento, conflito de abas e revogação da sessão", async () => {
  const { db, sqlite } = database();
  try {
    assert.equal(
      (await handleAuthApi(request("company", "PUT", { document, revision: 0 }), db)).status,
      401,
    );
    assert.equal(
      (
        await handleAuthApi(
          request(
            "cadastro",
            "POST",
            { cnpj: "11222333000181", senha: "longa senha segura", nome: "Empresa A" },
            "",
            "https://outro.test",
          ),
          db,
        )
      ).status,
      403,
    );
    const registration = await handleAuthApi(
      request("cadastro", "POST", {
        cnpj: "11.222.333/0001-81",
        senha: "longa senha segura",
        nome: "Empresa A",
      }),
      db,
    );
    assert.equal(registration.status, 200);
    assert.match(registration.headers.get("set-cookie")!, /HttpOnly; SameSite=Lax.*Secure/);
    const cookie = registration.headers.get("set-cookie")!.split(";")[0]!;
    const accountA = await registration.json();
    cookieAccounts.set(cookie, accountA.account.id);
    assert.equal(accountA.revision, 0);
    const stored = sqlite.prepare("SELECT password_hash FROM accounts").get()!;
    assert.notEqual(stored["password_hash"], "longa senha segura");
    const saved = await handleAuthApi(
      request("company", "PUT", { document, revision: 0 }, cookie),
      db,
    );
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).revision, 1);
    const loaded = await handleAuthApi(request("session", "GET", undefined, cookie), db);
    assert.deepEqual((await loaded.json()).document, document);
    assert.equal(
      (await handleAuthApi(request("company", "PUT", { document, revision: 0 }, cookie), db))
        .status,
      409,
    );
    const other = await handleAuthApi(
      request("cadastro", "POST", {
        cnpj: "12.ABC.345/01DE-35",
        senha: "segunda senha segura",
        nome: "Empresa B",
      }),
      db,
    );
    const otherCookie = other.headers.get("set-cookie")!.split(";")[0]!;
    const accountB = await other.json();
    cookieAccounts.set(otherCookie, accountB.account.id);
    assert.equal(accountB.document, null);
    const switched = request("company", "PUT", { document, revision: 0 }, otherCookie);
    switched.headers.set("x-atlas-account", accountA.account.id);
    assert.equal((await handleAuthApi(switched, db)).status, 409);
    assert.equal(
      (await (await handleAuthApi(request("session", "GET", undefined, otherCookie), db)).json())
        .document,
      null,
    );
    assert.equal(
      (
        await handleAuthApi(
          request("company", "PUT", { document, revision: 1, accountId: "another" }, otherCookie),
          db,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await handleAuthApi(
          request("cadastro", "POST", {
            cnpj: "11222333000181",
            senha: "nova senha segura",
            nome: "Outra",
          }),
          db,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await handleAuthApi(
          request("login", "POST", { cnpj: "11222333000181", senha: "senha incorreta" }),
          db,
        )
      ).status,
      401,
    );
    assert.equal((await handleAuthApi(request("logout", "POST", {}, cookie), db)).status, 200);
    assert.equal(
      (await handleAuthApi(request("company", "PUT", { document, revision: 1 }, cookie), db))
        .status,
      401,
    );
    const login = await handleAuthApi(
      request("login", "POST", { cnpj: "11222333000181", senha: "longa senha segura" }),
      db,
    );
    assert.equal(login.status, 200);
    assert.deepEqual((await login.json()).document, document);
    assert.equal(
      (await handleAuthApi(request("company", "PUT", { document, revision: 1 }, otherCookie), db))
        .status,
      409,
    );
  } finally {
    sqlite.close();
  }
});
test("validação, limite de tentativas, expiração e ausência de banco", async () => {
  const { db, sqlite } = database();
  try {
    assert.equal((await handleAuthApi(request("session"), undefined)).status, 503);
    assert.equal(
      (
        await handleAuthApi(
          request("cadastro", "POST", { cnpj: "invalido", senha: "123", nome: "A" }),
          db,
        )
      ).status,
      400,
    );
    const registration = await handleAuthApi(
      request("cadastro", "POST", {
        cnpj: "11222333000181",
        senha: "uma senha segura",
        nome: "Empresa",
      }),
      db,
    );
    const cookie = registration.headers.get("set-cookie")!.split(";")[0]!;
    sqlite.exec("UPDATE sessions SET expires_at=0");
    assert.equal(
      (await (await handleAuthApi(request("session", "GET", undefined, cookie), db)).json())
        .account,
      null,
    );
    for (let i = 0; i < 9; i++)
      assert.equal(
        (
          await handleAuthApi(
            request("login", "POST", { cnpj: "11222333000181", senha: "errada mas longa" }),
            db,
          )
        ).status,
        401,
      );
    assert.equal(
      (
        await handleAuthApi(
          request("login", "POST", { cnpj: "11222333000181", senha: "uma senha segura" }),
          db,
        )
      ).status,
      429,
    );
  } finally {
    sqlite.close();
  }
});

test("documento aceita horizonte de 1 a 5 anos e mantém compatibilidade com contas antigas", () => {
  const { horizonte: _horizonte, ...antigo } = document;
  assert.equal(companyDocumentSchema.parse(antigo).horizonte, undefined);
  for (const horizonte of [1, 5])
    assert.equal(companyDocumentSchema.parse({ ...document, horizonte }).horizonte, horizonte);
  for (const horizonte of [0, 6, 1.5, NaN])
    assert.equal(companyDocumentSchema.safeParse({ ...document, horizonte }).success, false);
});

test("documentos antigos com preferências de ordenação continuam legíveis sem mudar dados financeiros", () => {
  const legado = {
    ...document,
    saw: {
      pesos: { margem: 1, giro: 1, investimento: 1 },
      metaInvestimentoPct: 10,
      justificativa: "Preferências de uma versão anterior",
    },
  };
  const carregado = companyDocumentSchema.parse(legado);
  assert.deepEqual(carregado.dados, document.dados);
  assert.deepEqual(carregado.base, document.base);
  assert.deepEqual(carregado.linhas, document.linhas);
  assert.equal(companyDocumentSchema.parse(document).saw, undefined);
});

test("documentos antigos descartam hipóteses de aquisição sem alterar os demais dados", async () => {
  const legado = {
    ...document,
    hipotesesAquisicao: {
      multiploCompra: "0.8",
      multiploRevenda: "1.2",
      custoEntrada: "10",
      custoSaida: "5",
      taxaDescontoPct: "12",
    },
  };
  assert.deepEqual(companyDocumentSchema.parse(legado), document);
  assert.deepEqual(companyDocumentSchema.parse(document), document);
  assert.equal("hipotesesAquisicao" in companyDocumentSchema.parse(legado), false);
  const { db, sqlite } = database();
  try {
    const registration = await handleAuthApi(
      request("cadastro", "POST", {
        cnpj: "11222333000181",
        senha: "longa senha segura",
        nome: document.nome,
      }),
      db,
    );
    assert.equal(registration.status, 200);
    const cookie = registration.headers.get("set-cookie")!.split(";")[0]!;
    const { account } = await registration.json();
    cookieAccounts.set(cookie, account.id);
    sqlite
      .prepare(
        "INSERT INTO company_documents (account_id, document, revision, updated_at) VALUES (?, ?, 1, ?)",
      )
      .run(account.id, JSON.stringify(legado), Date.now());
    const response = await handleAuthApi(request("session", "GET", undefined, cookie), db);
    assert.equal(response.status, 200);
    const loaded = await response.json();
    assert.deepEqual(loaded.document, document);
    // Reading does not migrate or change the stored account document.
    assert.deepEqual(
      JSON.parse(
        sqlite.prepare("SELECT document FROM company_documents").get()!["document"] as string,
      ),
      legado,
    );
    const saved = await handleAuthApi(
      request(
        "company",
        "PUT",
        { document: { ...legado, nome: "Nome atualizado" }, revision: loaded.revision },
        cookie,
      ),
      db,
    );
    assert.equal(saved.status, 200);
    assert.deepEqual(
      JSON.parse(
        sqlite.prepare("SELECT document FROM company_documents").get()!["document"] as string,
      ),
      { ...document, nome: "Nome atualizado" },
    );
  } finally {
    sqlite.close();
  }
});

test("conta salva filtro com poucos pares sem exigir três clusters e rejeita setor inexistente", async () => {
  const { db, sqlite } = database();
  try {
    const cadastro = await handleAuthApi(
      request("cadastro", "POST", {
        cnpj: "11222333000181",
        senha: "senha de teste longa",
        nome: "Empresa setorial",
      }),
      db,
    );
    assert.equal(cadastro.status, 200);
    const session = await cadastro.json();
    const cookie = cadastro.headers.get("set-cookie")!.split(";")[0]!;
    cookieAccounts.set(cookie, session.account.id);
    const mercado = JSON.parse(
      readFileSync(new URL("../../public/base-mercado-exemplo.json", import.meta.url), "utf8"),
    );
    mercado.empresas = mercado.empresas.map((e: object, i: number) => ({
      ...e,
      setor: i < 2 ? "Setor pequeno" : "Outro setor",
    }));
    const comFiltro = {
      ...document,
      mercadoCompleto: JSON.stringify(mercado),
      setor: "Setor pequeno",
    };
    const salvo = await handleAuthApi(
      request("company", "PUT", { document: comFiltro, revision: 0 }, cookie),
      db,
    );
    assert.equal(salvo.status, 200);
    const carregado = await handleAuthApi(request("session", "GET", undefined, cookie), db);
    assert.equal((await carregado.json()).document.setor, "Setor pequeno");
    const invalido = await handleAuthApi(
      request(
        "company",
        "PUT",
        { document: { ...comFiltro, setor: "Setor inexistente" }, revision: 1 },
        cookie,
      ),
      db,
    );
    assert.equal(invalido.status, 400);
  } finally {
    sqlite.close();
  }
});
