import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ajustarRegressaoPatrimonio,
  preverPatrimonio,
  posicaoEstrutural,
} from "./regressao-patrimonio.ts";
import type { EmpresaDados } from "./sad-model.ts";

const amostra = Array.from({ length: 20 }, (_, i) => {
  const receita = 100 + i * 7;
  const custos = 20 + (i % 7) * 3;
  const investimento = 4 + (i % 3) * 2;
  return {
    receita,
    custos,
    investimento,
    patrimonio: 10 + 0.7 * receita - 0.4 * custos + 2 * investimento,
  };
});
const perto = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-7 * Math.max(1, Math.abs(b)), `${a} != ${b}`);

test("MQO recupera equação conhecida com sinais contábeis e não usa o PL do cenário como preditor", () => {
  const m = ajustarRegressaoPatrimonio(amostra);
  assert.ok(m.disponivel);
  perto(m.intercepto, 10);
  m.coeficientes.forEach((b, j) => perto(b, [0.7, 0.4, -2][j]!));
  perto(m.r2!, 1);
  perto(m.r2Ajustado!, 1);
  const d = { receita: 200, custos: 60, investimento: 8, patrimonio: -100 };
  perto(preverPatrimonio(d, m)!, 142);
  const p = posicaoEstrutural(d, m)!;
  perto(p.gap, -242);
  perto(preverPatrimonio({ ...d, patrimonio: 10_000 }, m)!, 142);
});

test("MQO mantém resultados ao converter reais para milhões e não modifica a amostra", () => {
  const antes = JSON.stringify(amostra);
  const fator = 1e6;
  const grandes = amostra.map(
    (d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v * fator])) as EmpresaDados,
  );
  const m = ajustarRegressaoPatrimonio(grandes);
  assert.ok(m.disponivel);
  perto(preverPatrimonio(grandes[5]!, m)!, amostra[5]!.patrimonio * fator);
  perto(m.coeficientes[0]!, 0.7);
  assert.equal(JSON.stringify(amostra), antes);
});

test("amostra insuficiente, preditor constante e colinearidade não fabricam referência", () => {
  for (const a of [
    amostra.slice(0, 4),
    amostra.map((d) => ({ ...d, investimento: 1 })),
    amostra.map((d) => ({ ...d, custos: d.receita * 0.5 })),
  ]) {
    const m = ajustarRegressaoPatrimonio(a);
    assert.equal(m.disponivel, false);
    assert.equal(posicaoEstrutural(amostra[0]!, m), null);
  }
});

test("resíduos MQO têm média zero, são ortogonais aos preditores e mudam com a base", () => {
  const ruidosa = amostra.map((d, i) => ({ ...d, patrimonio: d.patrimonio + (i % 4) ** 2 }));
  const m = ajustarRegressaoPatrimonio(ruidosa);
  assert.ok(m.disponivel);
  const residuos = ruidosa.map((d) => d.patrimonio - preverPatrimonio(d, m)!);
  perto(
    residuos.reduce((s, v) => s + v, 0),
    0,
  );
  for (const campo of ["receita", "custos", "investimento"] as const)
    perto(
      residuos.reduce((s, v, i) => s + v * ruidosa[i]![campo], 0),
      0,
    );
  assert.ok(m.r2! < 1 && m.r2! > 0);
  const outra = ajustarRegressaoPatrimonio(
    ruidosa.map((d) => ({ ...d, patrimonio: d.patrimonio + 100 })),
  );
  perto(preverPatrimonio(amostra[0]!, outra)! - preverPatrimonio(amostra[0]!, m)!, 100);
});

test("fluxo líquido original positivo é preservado como preditor, sem ser convertido em saída", () => {
  const assinada = amostra.map((d, i) => ({
    ...d,
    fluxoInvestimentoOriginal: i % 2 ? d.investimento : -d.investimento,
    patrimonio:
      10 + 0.7 * d.receita - 0.4 * d.custos + 2 * (i % 2 ? d.investimento : -d.investimento),
  }));
  const m = ajustarRegressaoPatrimonio(assinada);
  assert.ok(m.disponivel);
  perto(m.coeficientes[2]!, 2);
  perto(preverPatrimonio(assinada[4]!, m)!, assinada[4]!.patrimonio);
});
