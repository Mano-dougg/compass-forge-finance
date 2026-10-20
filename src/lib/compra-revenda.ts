import type { EmpresaDados } from "./sad-model.ts";
import type { DiagnosticoTemporal } from "./patrimonio-historico.ts";

export const HIPOTESE_COMPRA_REVENDA =
  "Compra de 100% da empresa pelo patrimônio líquido originalmente informado e revenda pelo patrimônio futuro com mudanças, no último ano selecionado da projeção. Alterações no campo Patrimônio são tratadas como aportes ou retiradas do comprador.";
export const LIMITES_COMPRA_REVENDA =
  "Estimativa patrimonial antes de custos de aquisição, recuperação e venda não informados. Patrimônio contábil não determina preço de mercado. O cálculo não estima passivos ocultos, liquidez, comprador ou financiamento da recuperação, e não comprova que a aquisição vale a pena.";

/** Conditional equity purchase/resale proxy, not a market valuation or cash-flow model. */
export function analisarCompraRevenda(
  base: EmpresaDados | null,
  temporal: DiagnosticoTemporal | null,
) {
  if (!base || !temporal) {
    return {
      disponivel: false as const,
      motivo:
        "Complete o histórico e as hipóteses acima para gerar o patrimônio futuro e analisar a compra e revenda com seus próprios dados.",
    };
  }
  const p = temporal.previsao;
  const precoCompra = base.patrimonio;
  const ultimoAno = p.projecoes.at(-1)!;
  const precoRevenda = ultimoAno.comMudancas;
  if (![precoCompra, precoRevenda, p.ajustePatrimonio].every(Number.isFinite)) {
    return {
      disponivel: false as const,
      motivo: "Revise os valores do cenário: há dados numéricos inválidos.",
    };
  }
  if (precoCompra <= 0) {
    return {
      disponivel: false as const,
      motivo:
        "O patrimônio atual é zero ou negativo. Ele não serve como preço de compra nesta hipótese. Para avaliar uma empresa nessa situação, é necessário conhecer o preço negociado e o custo da recuperação; não há retorno percentual calculável apenas com o patrimônio.",
    };
  }
  if (precoRevenda < 0) {
    return {
      disponivel: false as const,
      motivo:
        "O patrimônio futuro projetado é negativo. O cenário sinaliza deterioração patrimonial, mas não fornece um preço de revenda válido. A hipótese de vender pelo patrimônio não permite avaliar o retorno dessa aquisição.",
    };
  }
  const aporte = Math.max(0, p.ajustePatrimonio);
  const retirada = Math.max(0, -p.ajustePatrimonio);
  const totalAplicado = precoCompra + aporte;
  const recebimentoTotal = precoRevenda + retirada;
  const diferencaPatrimonial = precoRevenda - precoCompra;
  const diferenca = recebimentoTotal - totalAplicado;
  const ganhoAjustado = Math.abs(diferenca) < 0.005 ? 0 : diferenca;
  const retornoPct = (ganhoAjustado / totalAplicado) * 100;
  const sinal = ganhoAjustado > 0 ? "ganho" : ganhoAjustado < 0 ? "perda" : "equilibrio";
  const titulo =
    sinal === "ganho"
      ? "Há potencial de ganho na hipótese patrimonial"
      : sinal === "perda"
        ? "O cenário indica perda na hipótese patrimonial"
        : "O cenário empata antes dos custos da negociação";
  const resumo =
    sinal === "ganho"
      ? "A revenda projetada e as retiradas superam a compra e os aportes. Esse saldo é o espaço disponível para absorver os custos ainda não informados; se eles o ultrapassarem, o ganho desaparece."
      : sinal === "perda"
        ? "A revenda projetada e as retiradas não recuperam a compra e os aportes. Pelos valores desta hipótese, não há ganho, mesmo antes dos custos ainda não informados."
        : "A revenda projetada e as retiradas apenas recuperam a compra e os aportes. Qualquer custo adicional transforma esse resultado em perda.";
  return {
    disponivel: true as const,
    anoCompra: p.ultimoHistorico.ano,
    anoRevenda: ultimoAno.ano,
    anos: p.horizonte,
    precoCompra,
    precoRevenda,
    aporte,
    retirada,
    totalAplicado,
    recebimentoTotal,
    diferencaPatrimonial,
    ganhoAjustado,
    retornoPct,
    sinal,
    titulo,
    resumo,
  };
}
