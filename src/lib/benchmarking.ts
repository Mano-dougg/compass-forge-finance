import { CENTROIDES, TETOS, diagnosticar, formatarMoeda, type EmpresaDados } from "./sad-model";

export const REFERENCIA = "Referências simuladas · demonstração, sem dados reais da B3";

export function benchmarkCluster(perfil: string): EmpresaDados {
  const c = CENTROIDES.find((item) => item.perfil === perfil);
  if (!c) throw new Error("Cluster de referência não encontrado.");
  const receita = c.escala * TETOS.receita;
  return { receita, custos: receita * (1 - c.margem), patrimonio: receita / c.alavancagem, investimento: receita * c.intensidadeInvestimento };
}

export function analisarGaps(d: EmpresaDados, perfil = diagnosticar(d).perfil) {
  const b = benchmarkCluster(perfil);
  const custoReferencia = d.receita * b.custos / b.receita;
  const investimentoReferencia = d.receita * b.investimento / b.receita;
  const excessoCustos = Math.max(0, d.custos - custoReferencia);
  const deficitInvestimento = Math.max(0, investimentoReferencia - d.investimento);
  const retorno = d.custos > 0 ? d.receita / d.custos : null;
  const retornoReferencia = b.receita / b.custos;
  const eficiencia = retorno === null ? null : retorno / retornoReferencia * 100;
  const reducaoCustosPct = d.custos > 0 ? excessoCustos / d.custos * 100 : 0;
  const receitaAlvo = d.custos / (b.custos / b.receita);
  return { benchmark: b, custoReferencia, investimentoReferencia, excessoCustos, deficitInvestimento, retorno, retornoReferencia, eficiencia, reducaoCustosPct, receitaAlvo,
    acoes: [
      excessoCustos > 0
        ? `Otimizar custos em ${reducaoCustosPct.toFixed(1).replace(".", ",")}% (${formatarMoeda(excessoCustos)}) para alinhar a eficiência ao perfil ${perfil}. Alternativa: receita de ${formatarMoeda(receitaAlvo)} com a base atual de despesas, sem a trava de simulação.`
        : "Preservar a eficiência de custos: a relação custo/receita está alinhada ou melhor que a referência simulada.",
      deficitInvestimento > 0
        ? `Avaliar alocação adicional de ${formatarMoeda(deficitInvestimento)} para atingir ${formatarMoeda(investimentoReferencia)} de investimento, proporcional à receita. Validar caixa e retorno antes da decisão.`
        : "Investimento alinhado ou acima da referência proporcional à receita; avaliar o retorno do capital antes de ampliar a alocação.",
      "Revalidar estas metas com dados reais do setor: as referências e os centroides deste diagnóstico são simulados.",
    ],
  };
}

export function dadosRadar(d: EmpresaDados, perfil: string) {
  const b = benchmarkCluster(perfil);
  const campos: { chave: keyof EmpresaDados; indicador: string }[] = [
    { chave: "patrimonio", indicador: "Patrimônio" }, { chave: "receita", indicador: "Receita" },
    { chave: "custos", indicador: "Custos" }, { chave: "investimento", indicador: "Investimento" },
  ];
  return campos.map(({ chave, indicador }) => ({ indicador, empresa: d[chave] / b[chave] * 100, cluster: 100, valorEmpresa: d[chave], valorCluster: b[chave] }));
}