/** Modelo educacional de orçamento anual constante. Não apura lucro líquido.
 * Centavos e frações BigInt preservam os arredondamentos da especificação.
 * Nenhum dado de investimento ou classificação de cluster entra nas metas.
 */
export type ObjetivoMetas = {
  patrimonioAlvo: number;
  anos: number;
  distribuicaoPct: number;
  anoBase: number;
};
export type BaseMetas = { patrimonio: number; receita: number; custos: number };
export type ParMetas = { receita: number; custos: number };
export const formatarReais = (valor: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
export type OrcamentoMetas = {
  receita: number;
  custos: number;
  resultado: number;
  distribuicao: number;
  retido: number;
  patrimonioFinal: number;
  serie: number[];
};
export type AlternativaMetas = OrcamentoMetas & { origens: string[] };

type Fracao = { n: bigint; d: bigint };
const fracao = (n: bigint, d = 1n): Fracao => ({ n, d });
const somar = (a: Fracao, b: Fracao) => fracao(a.n * b.d + b.n * a.d, a.d * b.d);
const subtrair = (a: Fracao, b: Fracao) => fracao(a.n * b.d - b.n * a.d, a.d * b.d);
const dividir = (a: Fracao, b: Fracao) => fracao(a.n * b.d, a.d * b.n);
const piso = (a: Fracao) => a.n / a.d - (a.n < 0n && a.n % a.d !== 0n ? 1n : 0n);
const teto = (a: Fracao) => -piso(fracao(-a.n, a.d));
const numero = (a: Fracao) => Number(a.n) / Number(a.d);
const MAX = BigInt(Number.MAX_SAFE_INTEGER);

function centavos(n: number, campo: string): bigint {
  if (!Number.isFinite(n) || !Number.isSafeInteger(Math.round(n * 100)))
    throw new Error(`${campo}: informe um valor em reais dentro da precisão de centavos.`);
  return BigInt(Math.round(n * 100));
}
function reais(n: bigint): number {
  if (n > MAX || n < -MAX)
    throw new Error("O resultado excede a precisão de centavos. Reduza os valores ou o prazo.");
  const valor = Number(n) / 100;
  if (BigInt(Math.round(valor * 100)) !== n)
    throw new Error(
      "O valor não preserva todos os centavos na precisão disponível. Reduza a escala monetária.",
    );
  return valor;
}

function validarObjetivo(objetivo: ObjetivoMetas) {
  if (!Number.isSafeInteger(objetivo.anos) || objetivo.anos < 1 || objetivo.anos > 50)
    throw new Error("Escolha um prazo inteiro entre 1 e 50 anos neste protótipo.");
  if (!Number.isInteger(objetivo.anoBase) || objetivo.anoBase < 1900 || objetivo.anoBase > 2200)
    throw new Error("Informe um ano-base entre 1900 e 2200.");
  if (
    !Number.isFinite(objetivo.distribuicaoPct) ||
    objetivo.distribuicaoPct < 0 ||
    objetivo.distribuicaoPct > 100
  )
    throw new Error("A distribuição deve estar entre 0% e 100%.");
  if (Math.abs(objetivo.distribuicaoPct * 100 - Math.round(objetivo.distribuicaoPct * 100)) > 1e-7)
    throw new Error("Use até duas casas decimais no percentual de distribuição.");
  centavos(objetivo.patrimonioAlvo, "Patrimônio desejado");
}

function proporcoes(pares: ParMetas[]): Fracao[] {
  return pares
    .flatMap((p) => {
      if (
        !Number.isFinite(p.receita) ||
        !Number.isFinite(p.custos) ||
        p.receita <= 0 ||
        p.custos < 0
      )
        return [];
      try {
        const r = centavos(p.receita, "Receita dos pares");
        if (r === 0n) return [];
        return [fracao(centavos(p.custos, "Custos dos pares"), r)];
      } catch {
        return [];
      }
    })
    .sort((a, b) => (a.n * b.d < b.n * a.d ? -1 : a.n * b.d > b.n * a.d ? 1 : 0));
}
function quantil(ordenados: Fracao[], p: number): Fracao | null {
  if (!ordenados.length) return null;
  const h = (ordenados.length - 1) * p;
  const a = ordenados[Math.floor(h)]!;
  const b = ordenados[Math.ceil(h)]!;
  const peso = BigInt(Math.round((h % 1) * 4));
  const delta = subtrair(b, a);
  return somar(a, fracao(delta.n * peso, delta.d * 4n));
}

export function resumirPares(pares: ParMetas[]) {
  const valores = proporcoes(pares);
  return {
    recebidos: pares.length,
    validos: valores.length,
    excluidos: pares.length - valores.length,
    mediana: valores.length ? numero(quantil(valores, 0.5)!) : null,
    p25: valores.length ? numero(quantil(valores, 0.25)!) : null,
    p75: valores.length ? numero(quantil(valores, 0.75)!) : null,
  };
}

export function simularOrcamento(
  base: BaseMetas,
  objetivo: ObjetivoMetas,
  receita: number,
  custos: number,
): OrcamentoMetas {
  validarObjetivo(objetivo);
  if (receita < 0 || custos < 0)
    throw new Error("Receita e custos devem ser maiores ou iguais a zero.");
  const p0 = centavos(base.patrimonio, "Patrimônio atual");
  const r = centavos(receita, "Receita");
  const c = centavos(custos, "Custos");
  const s = r - c;
  const d = s > 0n ? (s * BigInt(Math.round(objetivo.distribuicaoPct * 100))) / 10000n : 0n;
  const g = s - d;
  const serie = Array.from({ length: objetivo.anos }, (_, i) => reais(p0 + BigInt(i + 1) * g));
  return {
    receita: reais(r),
    custos: reais(c),
    resultado: reais(s),
    distribuicao: reais(d),
    retido: reais(g),
    patrimonioFinal: serie.at(-1)!,
    serie,
  };
}

export function planejarMetas(base: BaseMetas, objetivo: ObjetivoMetas, pares: ParMetas[]) {
  validarObjetivo(objetivo);
  let referencia: OrcamentoMetas | null = null;
  let erroReferencia: string | null = null;
  const p0 = centavos(base.patrimonio, "Patrimônio atual");
  const alvo = centavos(objetivo.patrimonioAlvo, "Patrimônio desejado");
  const r0 = centavos(base.receita, "Receita atual");
  const c0 = centavos(base.custos, "Custos atuais");
  if (r0 < 0n || c0 < 0n) throw new Error("Receita e custos devem ser maiores ou iguais a zero.");
  try {
    referencia = simularOrcamento(base, objetivo, base.receita, base.custos);
  } catch (e) {
    erroReferencia = e instanceof Error ? e.message : "Não foi possível calcular a referência.";
  }
  const resumo = resumirPares(pares);
  const alternativas: AlternativaMetas[] = [];
  const indisponiveis: Record<string, string> = {};
  const estado =
    alvo <= p0
      ? "meta_atingida"
      : objetivo.distribuicaoPct === 100
        ? "sem_retencao"
        : "geracao_condicional";
  const k = fracao(alvo - p0, BigInt(objetivo.anos));
  const retencao = fracao(10000n - BigInt(Math.round(objetivo.distribuicaoPct * 100)), 10000n);
  const necessario = estado === "geracao_condicional" ? dividir(k, retencao) : null;
  function adicionar(origem: string, r: bigint, c: bigint) {
    const existente = alternativas.find(
      (a) => centavos(a.receita, "Receita") === r && centavos(a.custos, "Custos") === c,
    );
    if (existente) {
      existente.origens.push(origem);
      return;
    }
    try {
      alternativas.push({
        origens: [origem],
        ...simularOrcamento(base, objetivo, reais(r), reais(c)),
      });
    } catch (e) {
      indisponiveis[origem] =
        e instanceof Error ? e.message : "Orçamento fora da precisão suportada.";
    }
  }
  if (necessario) {
    adicionar("A", teto(somar(fracao(c0), necessario)), c0);
    const custoB = subtrair(fracao(r0), necessario);
    if (custoB.n < 0n)
      indisponiveis["B"] =
        "Mantendo a receita atual, seria necessário ter custos negativos. Revise receita, prazo ou objetivo.";
    else adicionar("B", r0, piso(custoB));
    const q = quantil(proporcoes(pares), 0.5);
    if (!q)
      indisponiveis["C"] = "Não há pares válidos na seleção para calcular a proporção de custos.";
    else if (q.n >= q.d)
      indisponiveis["C"] =
        "A proporção mediana de custos é de 100% ou mais da receita; ela não gera retenção positiva para este objetivo.";
    else {
      const r = teto(dividir(necessario, subtrair(fracao(1n), q)));
      adicionar("C", r, piso(fracao(r * q.n, q.d)));
    }
  }
  return {
    referencia,
    erroReferencia,
    resumo,
    estado,
    alternativas,
    indisponiveis,
    retencaoNecessaria: numero(k) / 100,
    resultadoNecessario: necessario ? numero(necessario) / 100 : null,
  };
}

const titulos: Record<string, string> = {
  A: "Manter os custos atuais",
  B: "Manter a receita atual",
  C: "Usar a proporção do mercado",
  manual: "Orçamento personalizado",
  referencia: "Manter o orçamento atual",
};
export const nomeOrcamento = (id: string | null) =>
  id
    ? id
        .split("+")
        .map((chave) => titulos[chave] ?? chave)
        .join(" / ")
    : "Nenhum orçamento escolhido";
export const pct = (valor: number) =>
  `${(valor * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

/** Uma confirmação invalidada não volta a valer ao restaurar as antigas premissas. */
export function invalidarConfirmacao<T extends { assinatura: string }>(
  plano: T,
  assinaturaAtual: string,
): T {
  return plano.assinatura && plano.assinatura !== assinaturaAtual
    ? { ...plano, assinatura: "" }
    : plano;
}

/** Estado derivado compartilhado. Falhas de uma simulação manual ficam isoladas. */
export function analisarPlanejamento(
  entrada: BaseMetas,
  objetivo: ObjetivoMetas,
  orcamentoManual: Pick<OrcamentoMetas, "receita" | "custos">,
  pares: ParMetas[],
  recorte: { setor: string; periodo: string },
) {
  const assinatura = JSON.stringify([
    entrada.patrimonio,
    entrada.receita,
    entrada.custos,
    objetivo,
    orcamentoManual,
    recorte.setor,
    recorte.periodo,
    pares.map((p) => [p.receita, p.custos]),
  ]);
  try {
    const resultado = planejarMetas(entrada, objetivo, pares);
    let manual: OrcamentoMetas | null = null;
    let erroManual: string | null = null;
    try {
      manual = simularOrcamento(entrada, objetivo, orcamentoManual.receita, orcamentoManual.custos);
    } catch (e) {
      erroManual = e instanceof Error ? e.message : "Revise o orçamento personalizado.";
    }
    return { assinatura, resultado, manual, erroManual, erro: null };
  } catch (e) {
    return {
      assinatura,
      resultado: null,
      manual: null,
      erroManual: null,
      erro: e instanceof Error ? e.message : "Revise os dados do planejamento.",
    };
  }
}
