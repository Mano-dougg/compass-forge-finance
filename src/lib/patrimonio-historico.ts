import { type EmpresaDados } from "./sad-model.ts";

export const ANO_PREVISAO_PATRIMONIO = 2027;
export const ANO_BASE_PATRIMONIO = ANO_PREVISAO_PATRIMONIO - 1;
export const HORIZONTE_PADRAO_PATRIMONIO = 5;
export const HORIZONTE_MAXIMO_PATRIMONIO = 5;
export type LinhaHistoricoPL = { ano: string; patrimonio: string };

/** Update empty drafts; keep dated values intact and request the missing base year. */
export function prepararHistoricoPL(linhas?: LinhaHistoricoPL[]): LinhaHistoricoPL[] {
  if (!linhas?.some((linha) => linha.patrimonio.trim() !== "")) {
    return Array.from({ length: 5 }, (_, i) => ({
      ano: String(ANO_BASE_PATRIMONIO - 4 + i),
      patrimonio: "",
    }));
  }
  return linhas.some((linha) => Number(linha.ano) === ANO_BASE_PATRIMONIO)
    ? linhas.map((linha) => ({ ...linha }))
    : [
        ...linhas.map((linha) => ({ ...linha })),
        { ano: String(ANO_BASE_PATRIMONIO), patrimonio: "" },
      ];
}

export type ObservacaoPL = { ano: number; patrimonio: number };
export type HipotesesPL = {
  impostoPct: number;
  retencaoPct: number;
  retornoInvestimentoPct: number;
};
export type DiagnosticoTemporal = {
  empresa: string;
  observacoes: ObservacaoPL[];
  hipoteses: HipotesesPL;
  previsao: ReturnType<typeof preverCenarioPatrimonio>;
};

function serieOrdenada(serie: ObservacaoPL[]): ObservacaoPL[] {
  const anos = new Set<number>();
  for (const o of serie) {
    if (
      !Number.isInteger(o.ano) ||
      o.ano < 1900 ||
      o.ano > 2200 ||
      !Number.isFinite(o.patrimonio) ||
      Math.abs(o.patrimonio) > Number.MAX_SAFE_INTEGER
    )
      throw new Error("Use anos válidos e patrimônios numéricos em reais.");
    if (anos.has(o.ano)) throw new Error(`Ano duplicado: ${o.ano}. Informe um patrimônio por ano.`);
    anos.add(o.ano);
  }
  return [...serie].sort((a, b) => a.ano - b.ano);
}
function consecutivos(serie: ObservacaoPL[]): boolean {
  return serie.every((o, i) => i === 0 || o.ano === serie[i - 1]!.ano + 1);
}
const media = (serie: ObservacaoPL[]) => serie.reduce((s, o) => s + o.patrimonio / serie.length, 0);

/** Média móvel simples unilateral: somente observações anteriores entram na previsão. */
export function preverMediaMovel(serie: ObservacaoPL[], janela = 3) {
  if (!Number.isInteger(janela) || janela < 2 || janela > 5)
    throw new Error("Escolha uma janela entre 2 e 5 anos.");
  const ordenada = serieOrdenada(serie);
  if (ordenada.length < janela)
    throw new Error(`São necessários ${janela} anos de patrimônio para esta janela.`);
  const usados = ordenada.slice(-janela);
  if (!consecutivos(usados))
    throw new Error(
      `A janela precisa de ${janela} anos consecutivos. Anos ausentes não são estimados como zero.`,
    );
  const ultimo = usados.at(-1)!;
  const valor = media(usados);
  const historico = ordenada.map((o, i) => {
    const anteriores = ordenada.slice(Math.max(0, i - janela), i);
    return {
      ...o,
      estimativa:
        anteriores.length === janela && consecutivos([...anteriores, o]) ? media(anteriores) : null,
    };
  });
  const avaliacoes = historico.flatMap((o, i) =>
    o.estimativa === null
      ? []
      : [
          {
            ano: o.ano,
            real: o.patrimonio,
            previsto: o.estimativa,
            ingenuo: ordenada[i - 1]!.patrimonio,
          },
        ],
  );
  const mae = avaliacoes.length
    ? avaliacoes.reduce((s, o) => s + Math.abs(o.real - o.previsto) / avaliacoes.length, 0)
    : null;
  const maeIngenuo = avaliacoes.length
    ? avaliacoes.reduce((s, o) => s + Math.abs(o.real - o.ingenuo) / avaliacoes.length, 0)
    : null;
  return {
    janela,
    anoAlvo: ultimo.ano + 1,
    valor,
    ultimo,
    usados,
    historico,
    avaliacoes,
    mae,
    maeIngenuo,
  };
}

/** Cenário anual extrapolado com variação fixa; ajuste de capital uma única vez. */
export function preverCenarioPatrimonio(args: {
  historico: ObservacaoPL[];
  base: EmpresaDados;
  cenario: EmpresaDados;
  janela: number;
  hipoteses: HipotesesPL;
  anoAlvo?: number;
  horizonte?: number;
}) {
  const { base, cenario, janela, hipoteses } = args;
  const horizonte = args.horizonte ?? 1;
  if (!Number.isInteger(horizonte) || horizonte < 1 || horizonte > HORIZONTE_MAXIMO_PATRIMONIO)
    throw new Error(`Escolha uma projeção entre 1 e ${HORIZONTE_MAXIMO_PATRIMONIO} anos.`);
  const serie = serieOrdenada(args.historico);
  if (args.anoAlvo !== undefined) {
    if (!Number.isInteger(args.anoAlvo) || args.anoAlvo < 1901 || args.anoAlvo > 2201)
      throw new Error("Informe um ano de previsão válido.");
    if (serie.at(-1)?.ano !== args.anoAlvo - 1)
      throw new Error(
        `Para projetar ${args.anoAlvo}, o histórico precisa terminar em ${args.anoAlvo - 1}. Informe o patrimônio desse ano e os anos anteriores, sem mudar as datas dos dados já registrados.`,
      );
  }
  for (const valor of [...Object.values(base), ...Object.values(cenario)]) {
    if (!Number.isFinite(valor) || Math.abs(valor) > Number.MAX_SAFE_INTEGER)
      throw new Error("Cenário financeiro inválido.");
  }
  for (const valor of Object.values(hipoteses)) {
    if (!Number.isFinite(valor) || valor < 0 || valor > 100)
      throw new Error("Informe hipóteses entre 0% e 100%.");
  }
  if (serie.length < janela + 1)
    throw new Error(
      `Informe pelo menos ${janela + 1} patrimônios anuais para calcular ${janela} variações.`,
    );
  if (!consecutivos(serie.slice(-(janela + 1))))
    throw new Error(
      `Informe ${janela + 1} patrimônios de anos consecutivos para calcular a média das variações.`,
    );
  const variacoes = serie.flatMap((o, i) =>
    i > 0 && o.ano === serie[i - 1]!.ano + 1
      ? [{ ano: o.ano, patrimonio: o.patrimonio - serie[i - 1]!.patrimonio }]
      : [],
  );
  const mediaVariacoes = preverMediaMovel(variacoes, janela);
  if (mediaVariacoes.ultimo.ano !== serie.at(-1)!.ano)
    throw new Error("O último ano não tem um ano anterior consecutivo. Complete o histórico.");
  if (
    Math.abs(serie.at(-1)!.patrimonio - base.patrimonio) >
    Math.max(0.01, Math.abs(base.patrimonio) * 1e-12)
  )
    throw new Error(
      "O último patrimônio histórico deve coincidir com o PL informado inicialmente. Confira os anos e use o botão de preenchimento do último PL.",
    );
  const variacaoMedia = mediaVariacoes.valor;
  const deltaReceita = cenario.receita - base.receita;
  const deltaCustos = cenario.custos - base.custos;
  const deltaInvestimento = cenario.investimento - base.investimento;
  const resultadoOperacional = deltaReceita - deltaCustos;
  const retornoInvestimento = (deltaInvestimento * hipoteses.retornoInvestimentoPct) / 100;
  const impactoRetido =
    ((resultadoOperacional + retornoInvestimento) *
      (1 - hipoteses.impostoPct / 100) *
      hipoteses.retencaoPct) /
    100;
  const ajustePatrimonio = cenario.patrimonio - base.patrimonio;
  const semMudancas = base.patrimonio + variacaoMedia;
  const comMudancas = semMudancas + ajustePatrimonio + impactoRetido;
  // Forecasts are never fed back into the measured historical window or backtest.
  const projecoes = Array.from({ length: horizonte }, (_, i) => {
    const anosAFrente = i + 1;
    const referencia = base.patrimonio + anosAFrente * variacaoMedia;
    return {
      ano: mediaVariacoes.anoAlvo + i,
      anosAFrente,
      semMudancas: referencia,
      comMudancas: referencia + ajustePatrimonio + anosAFrente * impactoRetido,
    };
  });
  if (projecoes.some((p) => !Number.isFinite(p.comMudancas) || !Number.isFinite(p.semMudancas)))
    throw new Error("Os valores projetados ultrapassam a escala numérica suportada.");
  const avaliacoes = mediaVariacoes.avaliacoes.map((a) => {
    const anterior = serie.find((o) => o.ano === a.ano - 1)!;
    const real = serie.find((o) => o.ano === a.ano)!;
    return {
      ano: a.ano,
      real: real.patrimonio,
      previsto: anterior.patrimonio + a.previsto,
      ingenuo: anterior.patrimonio,
    };
  });
  const mae = avaliacoes.length
    ? avaliacoes.reduce((s, a) => s + Math.abs(a.real - a.previsto) / avaliacoes.length, 0)
    : null;
  const maeIngenuo = avaliacoes.length
    ? avaliacoes.reduce((s, a) => s + Math.abs(a.real - a.ingenuo) / avaliacoes.length, 0)
    : null;
  return {
    anoAlvo: mediaVariacoes.anoAlvo,
    anoFinal: projecoes.at(-1)!.ano,
    horizonte,
    projecoes,
    janela,
    variacaoMedia,
    semMudancas,
    comMudancas,
    ajustePatrimonio,
    deltaReceita,
    deltaCustos,
    deltaInvestimento,
    resultadoOperacional,
    retornoInvestimento,
    impactoRetido,
    ultimoHistorico: serie.at(-1)!,
    historico: serie,
    avaliacoes,
    mae,
    maeIngenuo,
  };
}
