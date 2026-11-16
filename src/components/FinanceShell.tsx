import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useFinance } from "@/contexts/finance-state";
import { EntradaDadosModal } from "@/components/EntradaDadosModal";
import { Button } from "@/components/ui/button";

import { useAccount } from "@/contexts/account-state";
import { useFinancePersistence } from "@/contexts/persistence-state";
import { formatarCnpj } from "@/lib/cnpj";

const paginas = [
  { to: "/", label: "Visão geral" },
  { to: "/simulador", label: "Planejar metas" },
  { to: "/patrimonio-futuro", label: "Trajetória patrimonial" },
  { to: "/analise-detalhada", label: "Análise detalhada" },
  { to: "/relatorios", label: "Relatórios" },
] as const;

export function FinanceShell({ children }: { children: ReactNode }) {
  const { session, logout } = useAccount();
  const persistence = useFinancePersistence();
  const [saindo, setSaindo] = useState(false);
  const [erroSaida, setErroSaida] = useState("");
  async function sair() {
    setSaindo(true);
    setErroSaida("");
    try {
      await logout();
    } catch (e) {
      setErroSaida(e instanceof Error ? e.message : "Não foi possível sair. Tente novamente.");
      setSaindo(false);
    }
  }
  const { mercado, base, dados, tetos, modalAberto, setModalAberto, confirmarDados, alerta } =
    useFinance();
  return (
    <div className="min-h-screen bg-background font-sans text-sm text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:p-3 focus:text-primary-foreground"
      >
        Ir para o conteúdo
      </a>
      <header className="sticky top-0 z-20 border-b border-border bg-background/95">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/"
            aria-label="ATLAS.SAD — visão geral"
            className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="font-display grid size-8 place-items-center rounded-md bg-primary text-base font-bold text-primary-foreground">
              A
            </span>
            <span>
              <span className="font-display block font-semibold tracking-tight">ATLAS.SAD</span>
              <span className="hidden text-xs text-muted sm:block">Planejamento patrimonial</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted sm:block">
              {mercado?.dataReferencia
                ? `Benchmark · ${mercado.dataReferencia.slice(0, 4)}`
                : mercado
                  ? "Base importada"
                  : "Benchmark simulado"}
            </span>
            <Button
              variant="outline"
              size="sm"
              aria-label={base ? "Editar dados" : "Informar dados"}
              onClick={() => setModalAberto(true)}
            >
              <span className="sm:hidden">Dados</span>
              <span className="hidden sm:inline">{base ? "Editar dados" : "Informar dados"}</span>
            </Button>
            {session ? (
              <Button variant="ghost" size="sm" disabled={saindo} onClick={() => void sair()}>
                {saindo ? "Saindo…" : "Sair"}
              </Button>
            ) : (
              <Link
                to="/login"
                aria-label="Entrar ou cadastrar"
                className="rounded-md px-3 py-2 text-xs font-medium text-primary focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="sm:hidden">Entrar</span>
                <span className="hidden sm:inline">Entrar / Cadastrar</span>
              </Link>
            )}
          </div>
        </div>
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 pb-2 text-xs text-muted sm:px-6">
          <span className="hidden min-w-0 break-words sm:inline">
            {session
              ? `${session.account.nome} · ${formatarCnpj(session.account.cnpj)}`
              : "Visitante · Entre para salvar e recuperar seus dados"}
          </span>
          <span className="min-w-0 break-words sm:hidden">
            {session ? session.account.nome : "Visitante · uso sem conta"}
          </span>
          <span role="status" aria-live="polite">
            {persistence.status}
          </span>
        </div>
        <nav
          aria-label="Navegação principal"
          className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto whitespace-nowrap px-4 pb-2 sm:px-6"
        >
          {paginas.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              className="rounded-md px-3 py-2 text-xs transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary sm:text-sm"
              activeProps={{ className: "bg-surface-2 font-medium text-primary" }}
              inactiveProps={{ className: "text-muted" }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto max-w-[1400px] px-4 py-7 outline-none sm:px-6"
      >
        {(persistence.error || erroSaida) && (
          <div
            role="alert"
            className="mb-5 rounded-md border border-destructive/40 bg-surface p-4 text-sm"
          >
            <p>{persistence.error || erroSaida}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={persistence.retry}>
                Tentar salvar novamente
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
                Recarregar dados salvos
              </Button>
            </div>
          </div>
        )}
        {alerta && (
          <p
            role="status"
            className="mb-5 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary"
          >
            {alerta}
          </p>
        )}
        {children}
      </main>
      {modalAberto && (
        <EntradaDadosModal
          tetos={tetos}
          inicial={base ?? dados}
          onCancelar={() => setModalAberto(false)}
          onConfirmar={confirmarDados}
        />
      )}
    </div>
  );
}
