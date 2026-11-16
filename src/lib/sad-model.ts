import {
  ajustarPadronizacao,
  compararDistancias,
  padronizar,
  type Padronizacao,
} from "./financial-standardization.ts";
// Classificação por distância euclidiana sobre variáveis contábeis padronizadas.

/** Variáveis do estudo: Trabalho metodos.pdf, §2.1/Quadro 1 (pp. 3–4).
 * PL é posição na data; demais campos são fluxos no período.
 * Custos e investimento aqui são magnitudes positivas, diferentemente dos sinais do estudo.
 * Ver README: trabalho acadêmico de origem e limites de transferência.
 */
export type EmpresaDados = {
  receita: number;
  custos: number;
  patrimonio: number;
  investimento: number;
};

// Resultado reportado na Tabela 5 (p. 31), n=28, custos contábeis negativos.
// Não reestimado para o benchmark atual; não constitui coeficiente de regressão para custos.
export const PEARSON_RECEITA_CUSTOS = -0.9629;

/** Limites numéricos da demonstração; não são limites estatísticos de Box Plot. */
export const TETOS: Record<keyof EmpresaDados, number> = {
  receita: 900_000_000,
  custos: 700_000_000,
  patrimonio: 1_200_000_000,
  investimento: 250_000_000,
};

export type Centroide = {
  ordemTreino?: number;
  padronizacao?: Padronizacao;
  centroPadronizado?: number[];
  tetoReceita?: number;
  valores?: EmpresaDados & { fluxoInvestimentoOriginal?: number };
  desvios?: EmpresaDados;
  distribuicaoCustos?: { p25: number; mediana: number };
  empresas?: number;
  perfil: string;
  descricao: string;
  margem: number; // (receita - custos) / receita
  intensidadeInvestimento: number; // investimento / receita
  alavancagem: number; // receita / patrimonio
  escala: number; // razão de receita usada apenas nas referências demonstrativas legadas
};

/** Referências sintéticas legadas; o benchmark padrão utiliza centroides treinados da CVM. */
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

/** Quantidades fictícias exclusivas da demonstração. */
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
  empresasNoCluster: number;
};

export function indicadores(d: EmpresaDados) {
  const receita = Math.max(d.receita, 1);
  const patrimonio = Math.max(d.patrimonio, 1);
  return {
    margem: (receita - d.custos) / receita,
    intensidadeInvestimento: d.investimento / receita,
    alavancagem: receita / patrimonio,
  };
}

export function diagnosticar(d: EmpresaDados, centroides: Centroide[] = CENTROIDES): Diagnostico {
  const valores = centroides.map(
    (c) =>
      c.valores ?? {
        receita: c.escala * TETOS.receita,
        custos: c.escala * TETOS.receita * (1 - c.margem),
        patrimonio: (c.escala * TETOS.receita) / c.alavancagem,
        investimento: c.escala * TETOS.receita * c.intensidadeInvestimento,
      },
  );
  const referencia = centroides[0]?.padronizacao ?? ajustarPadronizacao(valores);
  const ponto = padronizar(d, referencia);
  let melhor = centroides[0];
  if (!melhor) throw new Error("Nenhum centróide de referência disponível.");
  let menor = Number.POSITIVE_INFINITY;

  for (const c of centroides) {
    const centro = c.centroPadronizado ?? padronizar(valores[centroides.indexOf(c)]!, referencia);
    const dist = Math.sqrt(ponto.reduce((s, v, j) => s + (v - centro[j]!) ** 2, 0));
    const comparacao = compararDistancias(dist, menor);
    if (
      comparacao < 0 ||
      (comparacao === 0 &&
        (c.ordemTreino ?? centroides.indexOf(c)) <
          (melhor.ordemTreino ?? centroides.indexOf(melhor)))
    ) {
      menor = dist;
      melhor = c;
    }
  }

  return {
    perfil: melhor.perfil,
    descricao: melhor.descricao,
    distancia: menor,
    empresasNoCluster: melhor.empresas ?? tamanhoCluster(melhor.perfil),
  };
}

/** Ajusta somente a variável escolhida; correlação não determina uma relação causal. */
export function aplicarPasso(
  dados: EmpresaDados,
  campo: keyof EmpresaDados,
  passo: number,
  tetos: EmpresaDados = TETOS,
): { dados: EmpresaDados; alerta: string | null } {
  const proximo: EmpresaDados = { ...dados };
  const alerta: string | null = null;

  if (!Number.isFinite(passo)) return { dados, alerta: "Informe um ajuste numérico válido." };
  const bruto = proximo[campo] + passo;
  if (bruto > tetos[campo]) {
    return { dados, alerta: "Cenário fora da escala de mercado (limite de simulação)." };
  }
  proximo[campo] = Math.max(0, bruto);

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

function centroideDoPerfil(perfil: string, centroides: Centroide[] = CENTROIDES): Centroide {
  const centroide = centroides.find((c) => c.perfil === perfil);
  if (!centroide) throw new Error("Nenhum centróide de referência disponível.");
  return centroide;
}

export function comparativoCluster(
  d: EmpresaDados,
  perfil: string,
  centroides: Centroide[] = CENTROIDES,
): BarraComparativa[] {
  const ind = indicadores(d);
  const c = centroideDoPerfil(perfil, centroides);
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
