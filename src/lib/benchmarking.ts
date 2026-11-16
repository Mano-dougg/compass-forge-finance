import {
  CENTROIDES,
  TETOS,
  diagnosticar,
  formatarMoeda,
  type Centroide,
  type Diagnostico,
  type EmpresaDados,
} from "./sad-model.ts";

export const REFERENCIA = "Referências simuladas · demonstração, sem dados reais da B3";

export function benchmarkCluster(
  perfil: string,
  centroides: Centroide[] = CENTROIDES,
): EmpresaDados {
  const c = centroides.find((item) => item.perfil === perfil);
  if (!c) throw new Error("Cluster de referência não encontrado.");
  if (c.valores) return { ...c.valores };
  const receita = c.escala * TETOS.receita;
  return {
    receita,
    custos: receita * (1 - c.margem),
    patrimonio: receita / c.alavancagem,
    investimento: receita * c.intensidadeInvestimento,
  };
}

export function analisarGaps(
  d: EmpresaDados,
  perfil = diagnosticar(d).perfil,
  centroides: Centroide[] = CENTROIDES,
) {
  const c = centroides.find((item) => item.perfil === perfil);
  const b = benchmarkCluster(perfil, centroides);
  const custoReferencia = (d.receita * b.custos) / b.receita;
  const investimentoReferencia = (d.receita * b.investimento) / b.receita;
  const excessoCustos = Math.max(0, d.custos - custoReferencia);
  const deficitInvestimento = Math.max(0, investimentoReferencia - d.investimento);
  const retorno = d.custos > 0 ? d.receita / d.custos : null;
  const retornoReferencia = b.custos > 0 ? b.receita / b.custos : null;
  const eficiencia =
    retorno === null || retornoReferencia === null ? null : (retorno / retornoReferencia) * 100;
  const reducaoCustosPct = d.custos > 0 ? (excessoCustos / d.custos) * 100 : 0;
  const receitaAlvo = b.custos > 0 ? d.custos / (b.custos / b.receita) : null;
  const desvios = c?.desvios
    ? (Object.fromEntries(
        (["receita", "custos", "patrimonio", "investimento"] as const).map((campo) => [
          campo,
          c.desvios![campo] > 0 ? (d[campo] - b[campo]) / c.desvios![campo] : null,
        ]),
      ) as Record<keyof EmpresaDados, number | null>)
    : null;
  return {
    distribuicaoCustos: c?.distribuicaoCustos ?? null,
    desvios,
    benchmark: b,
    custoReferencia,
    investimentoReferencia,
    excessoCustos,
    deficitInvestimento,
    retorno,
    retornoReferencia,
    eficiencia,
    reducaoCustosPct,
    receitaAlvo,
    acoes:
      d.receita <= 0
        ? [
            "Informe uma receita positiva para calcular metas de custos e investimento proporcionais ao grupo. Com receita zero, esses alinhamentos não podem ser avaliados.",
            "Revise os custos e compromissos de caixa informados antes de definir novas alocações. Os dados disponíveis não permitem concluir capacidade de investimento ou endividamento.",
          ]
        : [
            excessoCustos > 0
              ? `Diferença de custos para a referência: ${reducaoCustosPct.toFixed(1).replace(".", ",")}% (${formatarMoeda(excessoCustos)}) para igualar a proporção do perfil ${perfil}. ${receitaAlvo === null ? "A referência tem custos zero: não há meta de receita calculável com despesas positivas." : `Alternativa: receita de ${formatarMoeda(receitaAlvo)} com a base atual de despesas. São equivalências aritméticas; investigar viabilidade antes de assumir uma meta.`}`
              : "Acompanhar a proporção de custos: ela está igual ou abaixo da referência. Isso não comprova eficiência global.",
            deficitInvestimento > 0
              ? `Avaliar alocação adicional de ${formatarMoeda(deficitInvestimento)} para atingir ${formatarMoeda(investimentoReferencia)} de investimento, proporcional à receita. Validar caixa e retorno antes da decisão.`
              : "Investimento alinhado ou acima da referência proporcional à receita; avaliar o retorno do capital antes de ampliar a alocação.",
            c?.valores
              ? "Metas derivadas da base importada. Verificar origem, período e representatividade antes de decidir; correlação não implica causalidade."
              : "Revalidar estas metas com dados reais do setor: as referências e os centroides deste diagnóstico são simulados.",
          ],
  };
}

export function dadosRadar(d: EmpresaDados, perfil: string, centroides: Centroide[] = CENTROIDES) {
  const b = benchmarkCluster(perfil, centroides);
  const campos: { chave: keyof EmpresaDados; indicador: string }[] = [
    { chave: "patrimonio", indicador: "Patrimônio" },
    { chave: "receita", indicador: "Receita" },
    { chave: "custos", indicador: "Custos" },
    { chave: "investimento", indicador: "Investimento" },
  ];
  return campos.map(({ chave, indicador }) => ({
    indicador,
    empresa: b[chave] > 0 ? (d[chave] / b[chave]) * 100 : 0,
    cluster: b[chave] > 0 ? 100 : 0,
    semReferencia: b[chave] === 0,
    valorEmpresa: d[chave],
    valorCluster: b[chave],
  }));
}

/** Interpret the shared gaps as priorities without duplicating the numeric targets. */
export function recomendacoes(
  dados: EmpresaDados,
  diagnostico: Diagnostico,
  centroides: Centroide[] = CENTROIDES,
): string[] {
  const gaps = analisarGaps(dados, diagnostico.perfil, centroides);
  if (dados.receita <= 0) {
    return [
      "Comece pelos dados: confirme a receita do período e se custos e investimento correspondem ao mesmo intervalo. Sem receita positiva, não é possível ordenar prioridades por comparação proporcional.",
      "Antes de simular novas despesas, levante o caixa disponível e os compromissos já assumidos; esses valores não estão incluídos neste diagnóstico.",
    ];
  }
  // Alternativas independentes de investigação, sem ranking causal ou ordem obrigatória.
  const lista = [
    gaps.excessoCustos > 0
      ? "Investigar a diferença de custos por receita. Verifique composição das despesas, processo, setor e porte dos pares; a diferença não é uma economia comprovada nem uma ordem de corte."
      : "Acompanhar custos por receita: a proporção está igual ou abaixo da referência, sem demonstrar eficiência global ou qualidade do serviço.",
    gaps.deficitInvestimento > 0
      ? "Avaliar os projetos de investimento: a saída líquida por receita é menor que a referência. Compare fluxos de caixa, prazo e retorno esperado; a média do grupo não define um orçamento obrigatório."
      : "Revisar o retorno dos projetos existentes: investimento igual ou acima da referência não comprova competitividade ou rentabilidade.",
  ];
  const referencia = centroides.find((c) => c.perfil === diagnostico.perfil);
  lista.push(
    !referencia?.valores
      ? "Valide as prioridades com uma base real do seu setor: a referência selecionada é demonstrativa."
      : (referencia.empresas ?? diagnostico.empresasNoCluster) < 5
        ? "Confirme a comparação com outras fontes: este grupo tem menos de cinco empresas e pode refletir casos particulares."
        : "Confira período, setor e porte dos pares antes de executar o plano. Ao alterar o cenário, reavalie as comparações com a mesma base.",
  );
  return lista;
}
