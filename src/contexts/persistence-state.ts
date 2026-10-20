import { createContext, useContext } from "react";
export const PersistenceContext = createContext<{
  status: string;
  error: string;
  retry: () => void;
}>({
  status: "",
  error: "",
  retry: () => {},
});
export const useFinancePersistence = () => useContext(PersistenceContext);
