import { createContext, useContext, type MutableRefObject } from "react";
import type { CompanyDocument, SessionData } from "@/lib/company-document";
export type AccountContextValue = {
  session: SessionData | null;
  guestDocument: MutableRefObject<CompanyDocument | null>;
  authenticate: (
    mode: "login" | "cadastro",
    credentials: { cnpj: string; senha: string; nome?: string },
  ) => Promise<void>;
  logout: () => Promise<void>;
  flush: MutableRefObject<(() => Promise<void>) | null>;
};
export const AccountContext = createContext<AccountContextValue | null>(null);
export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) throw new Error("Contexto da conta indisponível.");
  return context;
}
