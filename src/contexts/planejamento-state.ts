import { useFinance } from "./finance-state";

/** Seleciona os cálculos memorizados no provider; não treina modelos ao renderizar. */
export function usePlanejamento() {
  const finance = useFinance();
  const { planejamento, analiseMetas, base, dados } = finance;
  const { assinatura, resultado, manual } = analiseMetas;
  const escolhaValida = planejamento.assinatura === assinatura;
  const escolhida = !escolhaValida
    ? null
    : planejamento.escolha === "manual"
      ? manual
      : planejamento.escolha === "referencia"
        ? (resultado?.referencia ?? null)
        : (resultado?.alternativas.find((a) => a.origens.join("+") === planejamento.escolha) ??
          null);
  return { ...finance, ...analiseMetas, entrada: base ?? dados, escolhida };
}
