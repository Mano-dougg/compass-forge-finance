import referencia from "../../public/base-cvm-2026-b3.json" with { type: "json" };
import { importarBaseMercado } from "./market-clusters.ts";

export const ANO_BENCHMARK_PADRAO = 2026;
export const ARQUIVO_BENCHMARK_PADRAO = "/base-cvm-2026-b3.json";

/** Snapshot auditável da CVM; disponível já no SSR e sem chamada de rede no início. */
export function criarBenchmarkPadrao() {
  return importarBaseMercado(JSON.stringify(referencia));
}
