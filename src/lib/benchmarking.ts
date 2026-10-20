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
  const investimentoLideres =
    c?.intensidadeLideres === undefined ? null : d.receita * c.intensidadeLideres;
  const deficitLideres =
    investimentoLideres === null ? null : Math.max(0, investimentoLideres - d.investimento);
  const desvios = c?.desvios
    ? (Object.fromEntries(
        (Object.keys(b) as (keyof EmpresaDados)[]).map((campo) => [
          campo,
          c.desvios![campo] > 0 ? (d[campo] - b[campo]) / c.desvios![campo] : null,
        ]),
      ) as Record<keyof EmpresaDados, number | null>)
    : null;
  return {
    investimentoLideres,
    deficitLideres,
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
              ? `Otimizar custos em ${reducaoCustosPct.toFixed(1).replace(".", ",")}% (${formatarMoeda(excessoCustos)}) para alinhar a eficiência ao perfil ${perfil}. ${receitaAlvo === null ? "A referência tem custos zero: não há meta de receita calculável com despesas positivas." : `Alternativa: receita de ${formatarMoeda(receitaAlvo)} com a base atual de despesas, sem a trava de simulação.`}`
              : "Preservar a eficiência de custos: a relação custo/receita está alinhada ou melhor que a referência do cluster.",
            deficitInvestimento > 0
              ? `Avaliar alocação adicional de ${formatarMoeda(deficitInvestimento)} para atingir ${formatarMoeda(investimentoReferencia)} de investimento, proporcional à receita. Validar caixa e retorno antes da decisão.`
              : "Investimento alinhado ou acima da referência proporcional à receita; avaliar o retorno do capital antes de ampliar a alocação.",
            ...(deficitLideres !== null
              ? [
                  deficitLideres > 0
                    ? `Investimento abaixo dos líderes em ${formatarMoeda(deficitLideres)}: avaliar meta de ${formatarMoeda(investimentoLideres!)}. Líderes são o quartil superior por receita do cluster; comparação proporcional à receita.`
                    : "Investimento alinhado ou acima dos líderes (quartil superior por receita do cluster). Monitorar retorno e liquidez.",
                ]
              : []),
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
  const lista: string[] = [];
  if (gaps.excessoCustos > 0) {
    lista.push(
      "Prioridade: investigar os custos. Sua empresa consome mais receita em custos que a referência. Separe despesas fixas e variáveis e identifique os maiores desvios antes de escolher cortes; os dados atuais não mostram qual despesa causou a diferença.",
    );
    lista.push(
      gaps.deficitInvestimento > 0
        ? "Depois, avalie os projetos de investimento. Há também uma diferença de alocação frente ao grupo, mas ela não deve virar aumento automático de gastos: compare retorno esperado, prazo de retorno e disponibilidade de caixa junto com a revisão de custos."
        : "Ao revisar os custos, avalie o retorno dos investimentos já realizados. A alocação está na proporção do grupo ou acima dela; aumentar o volume, por si só, não resolve a diferença de eficiência.",
    );
  } else if (gaps.deficitInvestimento > 0) {
    lista.push(
      "Prioridade: avaliar oportunidades de investimento. A proporção de custos está na referência ou abaixo dela, enquanto a alocação de investimento é menor. Compare projetos por retorno esperado, prazo de retorno e caixa necessário antes de decidir; a margem não comprova dinheiro disponível.",
    );
    lista.push(
      "Acompanhe os custos durante a expansão. Use a relação custo/receita como referência para conferir se novos projetos preservam a eficiência observada, sem tratar a média do grupo como uma obrigação de gasto.",
    );
  } else {
    lista.push(
      "Prioridade: acompanhar os resultados das alocações atuais. Custos e investimento não apresentam os gaps proporcionais sinalizados pelo sistema. Verifique se os projetos entregam o retorno esperado antes de ampliar os compromissos.",
    );
    lista.push(
      "Revise a evolução da relação custo/receita nos próximos períodos. Estar alinhado ao grupo hoje não garante rentabilidade futura nem mede liquidez ou capacidade de endividamento.",
    );
  }
  if (gaps.deficitLideres !== null && gaps.deficitLideres > 0) {
    lista.push(
      "Use os líderes como uma segunda comparação. Eles são as empresas de maior receita do grupo; investigue diferenças de estratégia e necessidade de capital antes de adotar sua proporção de investimento como meta.",
    );
  }
  const referencia = centroides.find((c) => c.perfil === diagnostico.perfil);
  lista.push(
    !referencia?.valores
      ? "Valide as prioridades com uma base real do seu setor: a referência selecionada é demonstrativa."
      : (referencia.empresas ?? diagnostico.empresasNoCluster) < 5
        ? "Confirme a comparação com outras fontes: este grupo tem menos de cinco empresas e pode refletir casos particulares."
        : "Confira período, setor e porte dos pares antes de executar o plano. Depois de alterar o cenário, reavalie as metas e as prioridades com a mesma base.",
  );
  return lista;
}
