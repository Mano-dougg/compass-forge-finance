import type { EmpresaDados } from "./sad-model.ts";

export type Padronizacao = { medias: number[]; desvios: number[] };

/** Quatro variáveis do trabalho, em reais. Despesas e saídas de investimento têm sinal contábil. */
export function vetorContabil(d: EmpresaDados & { fluxoInvestimentoOriginal?: number }): number[] {
  return [d.patrimonio, d.receita, -d.custos, d.fluxoInvestimentoOriginal ?? -d.investimento];
}

export function ajustarPadronizacao(dados: EmpresaDados[]): Padronizacao {
  if (!dados.length) throw new Error("Informe uma amostra para padronização.");
  const vetores = dados.map(vetorContabil);
  const medias = vetores[0]!.map((_, j) => vetores.reduce((s, v) => s + v[j]!, 0) / dados.length);
  const desvios = medias.map((m, j) =>
    Math.sqrt(vetores.reduce((s, v) => s + (v[j]! - m) ** 2, 0) / dados.length),
  );
  return { medias, desvios };
}

/** Usa exclusivamente as médias/desvios do treino; variável constante não discrimina grupos. */
export function padronizar(d: EmpresaDados, p: Padronizacao): number[] {
  return vetorContabil(d).map((v, j) =>
    p.desvios[j]! > 0 ? (v - p.medias[j]!) / p.desvios[j]! : 0,
  );
}

/** Empates de ponto flutuante preservam a ordem de treino, inclusive ao converter unidades. */
export function compararDistancias(a: number, b: number): number {
  if (a === b) return 0;
  if (
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b))
  )
    return 0;
  return a < b ? -1 : 1;
}
