import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { AccountContext } from "./account-state";
import { accountRequest } from "@/lib/account-client";
import type { CompanyDocument, SessionData } from "@/lib/company-document";
import { FinanceProvider } from "./FinanceProvider";
import { FinanceShell } from "@/components/FinanceShell";

export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const flush = useRef<(() => Promise<void>) | null>(null);
  const guestDocument = useRef<CompanyDocument | null>(null);
  const pathname = useLocation({ select: (l) => l.pathname });
  const navigate = useNavigate();
  const publicPage = pathname === "/login" || pathname === "/cadastro";
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    accountRequest<SessionData | { account: null }>(
      "session",
      "GET",
      undefined,
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (active) setSession(result.account ? (result as SessionData) : null);
      })
      // Account infrastructure must not block the public financial tools.
      .catch(() => {})
      .finally(() => {
        clearTimeout(timer);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);
  useEffect(() => {
    if (!loading && session && publicPage) void navigate({ to: "/", replace: true });
  }, [loading, session, publicPage, navigate]);
  async function authenticate(
    mode: "login" | "cadastro",
    credentials: { cnpj: string; senha: string; nome?: string },
  ) {
    const result = await accountRequest<SessionData>(mode, "POST", credentials);
    setSession(result);
    await navigate({ to: "/", replace: true });
  }
  async function logout() {
    await flush.current?.();
    await accountRequest("logout", "POST", {}, session?.account.id);
    guestDocument.current = null;
    setSession(null);
    await navigate({ to: "/", replace: true });
  }
  return (
    <AccountContext.Provider value={{ session, authenticate, logout, flush, guestDocument }}>
      {loading ? (
        <main className="grid min-h-screen place-items-center bg-background px-6 font-sans text-foreground">
          <p role="status">Abrindo o sistema…</p>
        </main>
      ) : (
        <FinanceProvider key={session?.account.id ?? "visitante"} initial={session}>
          {publicPage ? children : <FinanceShell>{children}</FinanceShell>}
        </FinanceProvider>
      )}
    </AccountContext.Provider>
  );
}
