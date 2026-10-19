// Motor de diagnóstico e previsão — fórmulas MOCKADAS para prototipagem.

export type EmpresaDados = {
  receita: number;
  custos: number;
  patrimonio: number;
  investimento: number;
};

export const PEARSON_RECEITA_CUSTOS = -0.9629;
export const R2 = 0.513;
export const VARIANCIA_NAO_EXPLICADA = 0.487;

/** Tetos de escala derivados do Box Plot da pesquisa (mock). */
export const TETOS: Record<keyof EmpresaDados, number> = {
  receita: 900_000_000,
  custos: 700_000_000,
  patrimonio: 1_200_000_000,
  investimento: 250_000_000,
};

type Centroide = {
  perfil: string;
  descricao: string;
  margem: number; // (receita - custos) / receita
  intensidadeInvestimento: number; // investimento / receita
  alavancagem: number; // receita / patrimonio
  escala: number; // receita / teto do Box Plot — separa os gigantes setoriais
};

/** Os 3 clusters da B3 usados na classificação. */
export const CENTROIDES: Centroide[] = [
  {
    perfil: "Conservador",
    descricao:
      "Baixa intensidade de investimento e estrutura patrimonial robusta: priorizam preservação de capital e crescimento orgânico.",
    margem: 0.18,
    intensidadeInvestimento: 0.04,
    alavancagem: 0.65,
    escala: 0.35,
  },
  {
    perfil: "Expansivo",
    descricao:
      "Alto reinvestimento com giro de receita acima do patrimônio: foco em crescimento acelerado e ganho de participação de mercado.",
    margem: 0.3,
    intensidadeInvestimento: 0.2,
    alavancagem: 1.1,
    escala: 0.55,
  },
  {
    perfil: "Estruturado",
    descricao:
      "Escala de receita dominante no setor, margens estáveis e base patrimonial consolidada: referência de preço e capacidade de investimento.",
    margem: 0.24,
    intensidadeInvestimento: 0.12,
    alavancagem: 1.9,
    escala: 0.88,
  },
];

/** Quantidade de empresas da B3 em cada cluster (mock determinístico). */
export function tamanhoCluster(perfil: string): number {
  const tamanhos: Record<string, number> = {
    Conservador: 118,
    Expansivo: 87,
    Estruturado: 34,
  };
  return tamanhos[perfil] ?? 60;
}

export type Diagnostico = {
  perfil: string;
  descricao: string;
  distancia: number;
  scoreEmpresa: number;
  scoreCluster: number;
  empresasNoCluster: number;
};

function indicadores(d: EmpresaDados) {
  const receita = Math.max(d.receita, 1);
  const patrimonio = Math.max(d.patrimonio, 1);
  return {
    margem: (receita - d.custos) / receita,
    intensidadeInvestimento: d.investimento / receita,
    alavancagem: receita / patrimonio,
  };
}

export function diagnosticar(d: EmpresaDados): Diagnostico {
  const ind = indicadores(d);
  // Escala normalizada: receita relativa ao teto do Box Plot.
  const escala = Math.min(1, d.receita / TETOS.receita);

  let melhor = CENTROIDES[0];
  if (!melhor) throw new Error("Nenhum centróide de referência disponível.");
  let menor = Number.POSITIVE_INFINITY;

  for (const c of CENTROIDES) {
    const dist = Math.sqrt(
      (ind.margem - c.margem) ** 2 +
        (ind.intensidadeInvestimento - c.intensidadeInvestimento) ** 2 +
        ((ind.alavancagem - c.alavancagem) / 3) ** 2 +
        (escala - c.escala) ** 2,
    );
    if (dist < menor) {
      menor = dist;
      melhor = c;
    }
  }

  const scoreEmpresa = Math.round(
    Math.min(100, Math.max(5, ind.margem * 140 + ind.intensidadeInvestimento * 120)),
  );
  const scoreCluster = Math.round(
    Math.min(100, Math.max(5, melhor.margem * 140 + melhor.intensidadeInvestimento * 120)),
  );

  return {
    perfil: melhor.perfil,
    descricao: melhor.descricao,
    distancia: menor,
    scoreEmpresa,
    scoreCluster,
    empresasNoCluster: tamanhoCluster(melhor.perfil),
  };
}

/**
 * RF05 (ajustado) · Regressão linear mockada que calcula o Patrimônio Líquido
 * Teórico (benchmark B3) exigido para suportar o volume de operações simulado.
 */
export function preverPatrimonio(d: EmpresaDados): number {
  return (
    d.patrimonio * 1.014 + 0.58 * (d.receita - d.custos) + 0.31 * d.investimento - 1_250_000
  );
}

export type PosicaoEstrutural = {
  plReal: number;
  plTeorico: number;
  gap: number; // plReal - plTeorico
  gapPct: number; // gap / plTeorico
  suficiente: boolean;
  status: string;
};

/** Compara o PL Real com o PL Teórico e diagnostica a estrutura de capital. */
export function posicaoEstrutural(d: EmpresaDados): PosicaoEstrutural {
  const plTeorico = preverPatrimonio(d);
  const plReal = d.patrimonio;
  const gap = plReal - plTeorico;
  const gapPct = plTeorico !== 0 ? (gap / Math.abs(plTeorico)) * 100 : 0;
  const suficiente = gap >= 0;
  return {
    plReal,
    plTeorico,
    gap,
    gapPct,
    suficiente,
    status: suficiente
      ? "Estrutura de capital suficiente para o volume de operações simulado."
      : "Estrutura de capital insuficiente: o PL Real está abaixo do benchmark da B3 para este volume de operações.",
  };
}

/**
 * Aplica um passo em um dos campos, com trava de multicolinearidade (RN01)
 * e teto de escala do Box Plot (RN02).
 */
export function aplicarPasso(
  dados: EmpresaDados,
  campo: keyof EmpresaDados,
  passo: number,
): { dados: EmpresaDados; alerta: string | null } {
  const proximo: EmpresaDados = { ...dados };
  let alerta: string | null = null;

  const bruto = proximo[campo] + passo;
  if (bruto > TETOS[campo]) {
    return { dados, alerta: "Cenário fora da escala de mercado (teto do Box Plot)." };
  }
  proximo[campo] = Math.max(0, bruto);

  if (campo === "receita") {
    const razao = dados.receita > 0 ? dados.custos / dados.receita : 0.6;
    const ajuste = passo * Math.abs(PEARSON_RECEITA_CUSTOS) * razao;
    const custosAjustados = proximo.custos + ajuste;
    if (custosAjustados > TETOS.custos) {
      return { dados, alerta: "Cenário fora da escala de mercado (teto do Box Plot)." };
    }
    proximo.custos = Math.max(0, custosAjustados);
    alerta = `RN01 · Custos reajustados em ${formatarMoeda(ajuste)} pela trava de multicolinearidade.`;
  }

  return { dados: proximo, alerta };
}

export function formatarMoeda(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Math.round(v));
}

export function formatarNumero(v: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v);
}

export function parseNumero(s: string): number {
  const limpo = s.replace(/[^\d]/g, "");
  return limpo ? Number(limpo) : 0;
}

// ---------------------------------------------------------------------------
// RF03 · dados para os gráficos comparativos (mock derivado dos centróides)
// ---------------------------------------------------------------------------

export type BarraComparativa = {
  indicador: string;
  empresa: number;
  cluster: number;
  sufixo: string;
};

function centroideDoPerfil(perfil: string): Centroide {
  const centroide = CENTROIDES.find((c) => c.perfil === perfil) ?? CENTROIDES[0];
  if (!centroide) throw new Error("Nenhum centróide de referência disponível.");
  return centroide;
}

export function comparativoCluster(d: EmpresaDados, perfil: string): BarraComparativa[] {
  const ind = indicadores(d);
  const c = centroideDoPerfil(perfil);
  return [
    {
      indicador: "Margem",
      empresa: +(ind.margem * 100).toFixed(1),
      cluster: +(c.margem * 100).toFixed(1),
      sufixo: "%",
    },
    {
      indicador: "Invest./Receita",
      empresa: +(ind.intensidadeInvestimento * 100).toFixed(1),
      cluster: +(c.intensidadeInvestimento * 100).toFixed(1),
      sufixo: "%",
    },
    {
      indicador: "Giro do PL",
      empresa: +ind.alavancagem.toFixed(2),
      cluster: +c.alavancagem.toFixed(2),
      sufixo: "x",
    },
  ];
}

export type PontoDispersao = { margem: number; alavancagem: number; perfil: string };

/** Nuvem sintética de empresas da B3 (mock determinístico). */
export function nuvemB3(): PontoDispersao[] {
  const pontos: PontoDispersao[] = [];
  CENTROIDES.forEach((c, ci) => {
    for (let i = 0; i < 18; i++) {
      const s = Math.sin((ci + 1) * 12.9898 + i * 78.233) * 43758.5453;
      const r1 = s - Math.floor(s);
      const t = Math.sin((ci + 1) * 4.898 + i * 23.233) * 12345.6789;
      const r2 = t - Math.floor(t);
      pontos.push({
        perfil: c.perfil,
        margem: +Math.max(0, c.margem * 100 + (r1 - 0.5) * 12).toFixed(1),
        alavancagem: +Math.max(0.1, c.alavancagem + (r2 - 0.5) * 0.7).toFixed(2),
      });
    }
  });
  return pontos;
}

export function pontoEmpresa(d: EmpresaDados): PontoDispersao {
  const ind = indicadores(d);
  return {
    perfil: "Sua empresa",
    margem: +(ind.margem * 100).toFixed(1),
    alavancagem: +ind.alavancagem.toFixed(2),
  };
}

// ---------------------------------------------------------------------------
// RF06 · recomendações estratégicas (mock baseado nos indicadores)
// ---------------------------------------------------------------------------

export function recomendacoes(d: EmpresaDados, diag: Diagnostico): string[] {
  const ind = indicadores(d);
  const c = centroideDoPerfil(diag.perfil);
  const lista: string[] = [];

  if (ind.margem < c.margem) {
    lista.push(
      `Margem operacional ${(ind.margem * 100).toFixed(1)}% abaixo da média do cluster (${(c.margem * 100).toFixed(1)}%): priorizar revisão de custos fixos antes de novas expansões de receita.`,
    );
  } else {
    lista.push(
      `Margem operacional ${(ind.margem * 100).toFixed(1)}% acima da média do cluster: há espaço para ampliar o fluxo de investimento sem comprometer o caixa.`,
    );
  }

  if (ind.intensidadeInvestimento < c.intensidadeInvestimento) {
    lista.push(
      "Intensidade de investimento abaixo dos pares: considerar alocação incremental em CAPEX para sustentar crescimento no próximo ciclo.",
    );
  } else {
    lista.push(
      "Intensidade de investimento acima dos pares: monitorar o retorno sobre o capital investido para evitar diluição de margem.",
    );
  }

  if (ind.alavancagem > 2) {
    lista.push(
      "Giro de receita sobre patrimônio elevado: reforçar a base patrimonial antes de assumir novos compromissos de dívida.",
    );
  } else {
    lista.push(
      "Estrutura patrimonial equilibrada em relação à receita: cenário adequado para captação planejada de recursos.",
    );
  }

  lista.push(
    "Reavaliar o cenário trimestralmente: a projeção possui 48,7% de variância não explicada (R² de 51,3%).",
  );

  return lista;
}
