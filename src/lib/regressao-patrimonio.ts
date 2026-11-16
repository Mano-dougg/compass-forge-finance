import type { EmpresaDados } from "./sad-model.ts";
import { vetorContabil } from "./financial-standardization.ts";

export type ModeloPatrimonio =
  | { disponivel: false; motivo: string; n: number }
  | {
      disponivel: true;
      n: number;
      medias: number[];
      desvios: number[];
      mediaPL: number;
      coeficientesPadronizados: number[];
      intercepto: number;
      coeficientes: number[];
      r2: number | null;
      r2Ajustado: number | null;
      erroResidual: number;
    };

const produto = (a: number[], b: number[]) => a.reduce((s, v, j) => s + v * b[j]!, 0);
const preditores = (d: EmpresaDados) => vetorContabil(d).slice(1);

/** MQO transversal: PL = b0 + b1 receita + b2 custos assinados + b3 fluxo de investimento.
 * QR com reortogonalização sobre preditores centrados/padronizados evita equações normais.
 * Método do trabalho (§5, tabelas 6–7); parâmetros são reestimados, nunca copiados do PDF.
 */
export function ajustarRegressaoPatrimonio(amostra: EmpresaDados[]): ModeloPatrimonio {
  const n = amostra.length;
  const indisponivel = (motivo: string): ModeloPatrimonio => ({ disponivel: false, motivo, n });
  if (n < 5)
    return indisponivel(
      "São necessárias ao menos cinco empresas para estimar três coeficientes, intercepto e variância residual.",
    );
  if (amostra.some((d) => !vetorContabil(d).every(Number.isFinite)))
    return indisponivel("A amostra contém valores financeiros inválidos.");
  const x = amostra.map(preditores);
  const medias = [0, 1, 2].map((j) => x.reduce((s, v) => s + v[j]!, 0) / n);
  const desvios = medias.map((m, j) => Math.sqrt(x.reduce((s, v) => s + (v[j]! - m) ** 2, 0) / n));
  if (![...medias, ...desvios].every(Number.isFinite))
    return indisponivel("A escala dos valores excede a capacidade numérica do modelo.");
  if (desvios.some((s) => s === 0))
    return indisponivel(
      "Há uma variável explicativa constante na amostra; a regressão completa não é identificável.",
    );
  const mediaPL = amostra.reduce((s, d) => s + d.patrimonio, 0) / n;
  const y = amostra.map((d) => d.patrimonio - mediaPL);
  const q: number[][] = [];
  const r = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (let j = 0; j < 3; j++) {
    let v = x.map((l) => (l[j]! - medias[j]!) / desvios[j]!);
    for (let repeticao = 0; repeticao < 2; repeticao++) {
      for (let k = 0; k < j; k++) {
        const projecao = produto(q[k]!, v);
        r[k]![j]! += projecao;
        v = v.map((a, i) => a - projecao * q[k]![i]!);
      }
    }
    const norma = Math.sqrt(produto(v, v));
    if (norma < Math.sqrt(n) * 1e-10)
      return indisponivel(
        "As variáveis são linearmente dependentes; não é possível estimar coeficientes individuais estáveis.",
      );
    r[j]![j] = norma;
    q.push(v.map((a) => a / norma));
  }
  const beta = [0, 0, 0];
  for (let j = 2; j >= 0; j--) {
    beta[j] =
      (produto(q[j]!, y) - beta.reduce((s, b, k) => s + (k > j ? r[j]![k]! * b : 0), 0)) /
      r[j]![j]!;
  }
  const coeficientes = beta.map((b, j) => b / desvios[j]!);
  const sse = x.reduce(
    (s, v, i) =>
      s + (y[i]! - v.reduce((a, z, j) => a + (beta[j]! * (z - medias[j]!)) / desvios[j]!, 0)) ** 2,
    0,
  );
  const sst = produto(y, y);
  if (![mediaPL, sse, sst, ...coeficientes].every(Number.isFinite))
    return indisponivel("A escala dos valores excede a capacidade numérica do modelo.");
  const r2 = sst > 0 ? Math.max(0, Math.min(1, 1 - sse / sst)) : null;
  return {
    disponivel: true,
    n,
    medias,
    desvios,
    mediaPL,
    coeficientesPadronizados: beta,
    coeficientes,
    intercepto: mediaPL - produto(coeficientes, medias),
    r2,
    r2Ajustado: r2 === null ? null : 1 - ((1 - r2) * (n - 1)) / (n - 4),
    erroResidual: Math.sqrt(sse / (n - 4)),
  };
}

export function preverPatrimonio(d: EmpresaDados, modelo: ModeloPatrimonio): number | null {
  if (!modelo.disponivel) return null;
  return (
    modelo.mediaPL +
    preditores(d).reduce(
      (s, v, j) =>
        s + (modelo.coeficientesPadronizados[j]! * (v - modelo.medias[j]!)) / modelo.desvios[j]!,
      0,
    )
  );
}

export function posicaoEstrutural(d: EmpresaDados, modelo: ModeloPatrimonio) {
  const plTeorico = preverPatrimonio(d, modelo);
  if (plTeorico === null) return null;
  const gap = d.patrimonio - plTeorico;
  return {
    plReal: d.patrimonio,
    plTeorico,
    gap,
    gapPct: plTeorico === 0 ? null : (gap / Math.abs(plTeorico)) * 100,
  };
}
