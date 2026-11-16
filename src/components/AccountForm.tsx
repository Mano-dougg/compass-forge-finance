import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useAccount } from "@/contexts/account-state";
import { formatarCnpj, normalizarCnpj, validarCnpj } from "@/lib/cnpj";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountForm({ mode }: { mode: "login" | "cadastro" }) {
  const cadastro = mode === "cadastro";
  const { authenticate } = useAccount();
  const [cnpj, setCnpj] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!validarCnpj(cnpj)) {
      setError("Confira o CNPJ informado, incluindo os dígitos verificadores.");
      return;
    }
    if (cadastro && senha !== confirmacao) {
      setError("As senhas precisam ser iguais.");
      return;
    }
    setBusy(true);
    try {
      await authenticate(mode, {
        cnpj: normalizarCnpj(cnpj),
        senha,
        ...(cadastro ? { nome: nome.trim() } : {}),
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível acessar sua conta. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-screen bg-background font-sans text-foreground">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-10 md:grid-cols-2 md:gap-20 md:py-16">
        <section className="max-w-lg">
          <Link
            to="/login"
            className="inline-flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="ATLAS.SAD — acesso"
          >
            <span className="grid size-10 place-items-center rounded-md bg-primary text-xl font-bold text-primary-foreground">
              A
            </span>
            <span className="text-lg font-semibold tracking-tight">ATLAS.SAD</span>
          </Link>
          <h1 className="sr-only text-3xl md:not-sr-only md:mt-8 font-semibold leading-tight tracking-tight sm:text-4xl">
            As decisões da sua empresa começam com os seus dados.
          </h1>
          <p className="mt-5 hidden max-w-md md:block leading-relaxed text-muted">
            Defina seu objetivo patrimonial, compare metas anuais e use o mercado como referência
            para escolher seu planejamento.
          </p>
          <p className="mt-6 hidden border-t md:block border-border pt-5 text-sm leading-relaxed text-muted">
            Sua conta mantém os dados financeiros, o objetivo e o orçamento escolhido salvos para o
            próximo acesso. Você também pode explorar o sistema sem criar uma conta.
          </p>
        </section>
        <section className="w-full max-w-md md:justify-self-end" aria-labelledby="acesso-titulo">
          <h2 id="acesso-titulo" className="text-2xl font-semibold tracking-tight">
            {cadastro ? "Cadastre sua empresa" : "Entre na sua conta"}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {cadastro
              ? "Use o CNPJ como identificação da conta."
              : "Informe o CNPJ e a senha da empresa."}
          </p>
          <form onSubmit={(e) => void submit(e)} className="mt-7 space-y-5" aria-busy={busy}>
            {cadastro && (
              <div className="space-y-2">
                <Label htmlFor="razao-social">Razão social</Label>
                <Input
                  id="razao-social"
                  autoComplete="organization"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  minLength={2}
                  maxLength={160}
                  required
                  disabled={busy}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                name="username"
                autoComplete="username"
                autoCapitalize="characters"
                spellCheck={false}
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                onBlur={() => {
                  if (validarCnpj(cnpj)) setCnpj(formatarCnpj(cnpj));
                }}
                maxLength={18}
                placeholder="00.000.000/0001-00"
                required
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Input
                  id="senha"
                  name="password"
                  type={visible ? "text" : "password"}
                  autoComplete={cadastro ? "new-password" : "current-password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  minLength={10}
                  maxLength={128}
                  required
                  disabled={busy}
                  className="pr-12"
                  aria-describedby={cadastro ? "senha-ajuda" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setVisible((x) => !x)}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-md text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
                  aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={visible}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {cadastro && (
                <p id="senha-ajuda" className="text-xs text-muted">
                  Use entre 10 e 128 caracteres.
                </p>
              )}
            </div>
            {cadastro && (
              <div className="space-y-2">
                <Label htmlFor="confirmacao">Confirme a senha</Label>
                <Input
                  id="confirmacao"
                  type={visible ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  minLength={10}
                  maxLength={128}
                  required
                  disabled={busy}
                />
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="min-h-11 w-full" disabled={busy}>
              {busy && (
                <LoaderCircle
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
              {busy ? "Aguarde…" : cadastro ? "Criar conta da empresa" : "Entrar"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-muted">
            {cadastro ? "Sua empresa já tem uma conta? " : "Primeiro acesso? "}
            <Link
              to={cadastro ? "/login" : "/cadastro"}
              className="rounded-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
            >
              {cadastro ? "Entrar" : "Cadastrar empresa"}
            </Link>
          </p>
          <p className="mt-4 text-sm">
            <Link
              to="/"
              className="rounded-sm text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
            >
              Continuar sem conta
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
