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
};

export const CENTROIDES: Centroide[] = [
  {
    perfil: "Conservador",
    descricao: "Baixa intensidade de investimento e estrutura patrimonial robusta.",
    margem: 0.22,
    intensidadeInvestimento: 0.05,
    alavancagem: 0.7,
  },
  {
    perfil: "Expansionista",
    descricao: "Alto reinvestimento com giro de receita acima do patrimônio.",
    margem: 0.3,
    intensidadeInvestimento: 0.18,
    alavancagem: 1.2,
  },
  {
    perfil: "Alavancado",
    descricao: "Receita elevada sobre base patrimonial estreita e margem comprimida.",
    margem: 0.12,
    intensidadeInvestimento: 0.12,
    alavancagem: 2.4,
  },
  {
    perfil: "Eficiente",
    descricao: "Margem superior ao setor com investimento moderado e disciplinado.",
    margem: 0.38,
    intensidadeInvestimento: 0.09,
    alavancagem: 1.0,
  },
];

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

  let melhor: Centroide = CENTROIDES[0]!;
  let menor = Number.POSITIVE_INFINITY;

  for (const c of CENTROIDES) {
    const dist = Math.sqrt(
      (ind.margem - c.margem) ** 2 +
        (ind.intensidadeInvestimento - c.intensidadeInvestimento) ** 2 +
        ((ind.alavancagem - c.alavancagem) / 3) ** 2,
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
    empresasNoCluster: 96 + CENTROIDES.indexOf(melhor) * 23,
  };
}

/** Regressão múltipla mockada para o Patrimônio Líquido projetado. */
export function preverPatrimonio(d: EmpresaDados): number {
  return (
    d.patrimonio * 1.014 + 0.58 * (d.receita - d.custos) + 0.31 * d.investimento - 1_250_000
  );
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
