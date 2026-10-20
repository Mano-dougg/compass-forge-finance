import { useEffect, useRef, useState, type ReactNode } from "react";
import { PersistenceContext } from "./persistence-state";
import { FinanceContext, useFinanceState } from "./finance-state";
import { useAccount } from "./account-state";
import { accountRequest } from "@/lib/account-client";
import type { CompanyDocument, SessionData } from "@/lib/company-document";

export function FinanceProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial: SessionData | null;
}) {
  const { flush, guestDocument } = useAccount();
  const state = useFinanceState(
    initial?.document ?? guestDocument.current,
    initial?.account.nome ?? "",
  );
  const [status, setStatus] = useState(initial ? "Salvo" : "Dados nesta sessão");
  const [error, setError] = useState("");
  const document: CompanyDocument = {
    version: 1,
    base: state.base,
    dados: state.dados,
    nome: state.nome,
    janela: state.janela,
    horizonte: state.horizonte,
    linhas: state.linhas,
    hipoteses: state.hipoteses,
    mercadoCompleto: state.mercadoCompleto ? JSON.stringify(state.mercadoCompleto) : null,
    setor: state.mercado && state.mercado !== state.mercadoCompleto ? state.mercado.setor : "",
    demonstracao: state.mercado === null,
  };
  const serialized = JSON.stringify(document);
  const latest = useRef(serialized);
  latest.current = serialized;
  const lastSaved = useRef(initial?.document && !initial.document.demonstracao ? serialized : "");
  const revision = useRef(initial?.revision ?? 0);
  const pending = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);
  const blocked = useRef(false);
  const save = useRef(async () => {});
  save.current = async () => {
    if (!initial) return;
    if (pending.current) return pending.current;
    if (latest.current === lastSaved.current) return;
    if (blocked.current)
      throw new Error(
        "Recarregue a página antes de continuar: a versão salva foi alterada ou sua sessão expirou.",
      );
    const job = async () => {
      try {
        if (mounted.current) {
          setStatus("Salvando…");
          setError("");
        }
        while (latest.current !== lastSaved.current) {
          const snapshot = latest.current;
          const result = await accountRequest<{ revision: number }>(
            "company",
            "PUT",
            {
              document: JSON.parse(snapshot),
              revision: revision.current,
            },
            initial.account.id,
          );
          revision.current = result.revision;
          lastSaved.current = snapshot;
        }
        if (mounted.current) setStatus("Salvo");
      } catch (e) {
        if (e && typeof e === "object" && "status" in e && (e.status === 409 || e.status === 401))
          blocked.current = true;
        if (mounted.current) {
          setStatus("Não salvo");
          setError(e instanceof Error ? e.message : "Falha ao salvar. Tente novamente.");
        }
        throw e;
      } finally {
        pending.current = null;
      }
    };
    pending.current = job();
    return pending.current;
  };
  useEffect(() => {
    mounted.current = true;
    if (!initial)
      return () => {
        mounted.current = false;
      };
    guestDocument.current = null;
    flush.current = () => save.current();
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (latest.current !== lastSaved.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      mounted.current = false;
      flush.current = null;
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [flush, guestDocument, initial]);
  useEffect(() => {
    if (!initial) {
      guestDocument.current = JSON.parse(serialized) as CompanyDocument;
      return;
    }
    if (serialized === lastSaved.current) return;
    setStatus("Alterações pendentes");
    const timer = setTimeout(() => {
      void save.current().catch(() => {});
    }, 700);
    return () => clearTimeout(timer);
  }, [serialized, initial, guestDocument]);
  return (
    <FinanceContext.Provider value={state}>
      <PersistenceContext.Provider
        value={{
          status,
          error,
          retry: () => {
            void save.current().catch(() => {});
          },
        }}
      >
        {children}
      </PersistenceContext.Provider>
    </FinanceContext.Provider>
  );
}
