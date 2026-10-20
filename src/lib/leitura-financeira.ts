import { analisarGaps } from "./benchmarking.ts";
import { formatarMoeda, type Centroide, type EmpresaDados } from "./sad-model.ts";

const moedaPorCem = (valor: number) =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Camada de apresentação: reutiliza os mesmos gaps do diagnóstico e do relatório. */
export function leituraFinanceira(dados: EmpresaDados, perfil: string, centroides?: Centroide[]) {
  const gaps = analisarGaps(dados, perfil, centroides);
  const porCem = (valor: number, receita: number) => (receita > 0 ? (valor / receita) * 100 : null);
  const custos = porCem(dados.custos, dados.receita);
  const investimento = porCem(dados.investimento, dados.receita);
  const custosGrupo = porCem(gaps.benchmark.custos, gaps.benchmark.receita);
  const investimentoGrupo = porCem(gaps.benchmark.investimento, gaps.benchmark.receita);
  const resumo = [
    {
      titulo: "Seus custos estão altos para a receita que você gera?",
      resposta:
        custos === null
          ? "Informe uma receita maior que zero para comparar."
          : gaps.excessoCustos > 0
            ? "Sim, estão acima da proporção do grupo."
            : "Estão na proporção do grupo ou abaixo dela.",
      explicacao:
        custos === null || custosGrupo === null
          ? "A comparação precisa de uma receita válida."
          : `A cada R$ 100 de receita, sua empresa usa ${moedaPorCem(custos)} em custos e despesas. No grupo de referência, são ${moedaPorCem(custosGrupo)}.`,
      proximoPasso:
        custos === null
          ? "Revise a receita informada."
          : gaps.excessoCustos > 0
            ? `Para chegar à mesma proporção, a diferença a revisar é ${formatarMoeda(gaps.excessoCustos)} no período informado. Investigue quais despesas explicam essa diferença antes de definir cortes.`
            : "Acompanhe essa proporção ao crescer para verificar se os custos continuam sob controle.",
    },
    {
      titulo: "Você destina menos da receita ao investimento?",
      resposta:
        investimento === null
          ? "Ainda não é possível comparar."
          : gaps.deficitInvestimento > 0
            ? "Sim, a parcela é menor que a do grupo."
            : "A parcela está na proporção do grupo ou acima dela.",
      explicacao:
        investimento === null || investimentoGrupo === null
          ? "Informe uma receita maior que zero para calcular a parcela investida."
          : `De cada R$ 100 de receita, ${moedaPorCem(investimento)} vão para investimento. A referência do grupo é ${moedaPorCem(investimentoGrupo)}.`,
      proximoPasso:
        investimento === null
          ? "Revise a receita informada."
          : gaps.deficitInvestimento > 0
            ? `A diferença é ${formatarMoeda(gaps.deficitInvestimento)} para igualar a proporção do grupo. Confira o caixa disponível e o retorno esperado antes de investir mais.`
            : "Verifique o retorno dos investimentos. Destinar mais dinheiro não garante um resultado melhor.",
    },
  ];
  return { gaps, custos, investimento, custosGrupo, investimentoGrupo, resumo };
}
