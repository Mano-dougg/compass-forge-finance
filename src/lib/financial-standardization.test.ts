import { test } from "node:test";
import assert from "node:assert/strict";
import { ajustarPadronizacao, padronizar } from "./financial-standardization.ts";
import { importarBaseMercado } from "./market-clusters.ts";
import { diagnosticar } from "./sad-model.ts";

const empresas = Array.from({ length: 12 }, (_, i) => ({
  empresa: `E${i}`,
  receita: 100 + i * 20,
  custos: 20 + i * 3,
  patrimonio: 50 + i * 10,
  investimento: 3,
  fluxoInvestimentoOriginal: i % 2 ? 2 : -3,
}));
test("Z-score usa média/desvio do treino, com média zero, variância unitária e variável constante nula", () => {
  const p = ajustarPadronizacao(empresas);
  const z = empresas.map((e) => padronizar(e, p));
  for (let j = 0; j < 4; j++) {
    assert.ok(Math.abs(z.reduce((s, v) => s + v[j]!, 0)) < 1e-10);
    assert.ok(Math.abs(z.reduce((s, v) => s + v[j]! ** 2, 0) / z.length - 1) < 1e-10);
  }
  const constantes = empresas.map((e) => ({ ...e, fluxoInvestimentoOriginal: -3 }));
  assert.equal(padronizar(constantes[0]!, ajustarPadronizacao(constantes))[3], 0);
});
test("importação preserva fluxo assinado e aplica a mesma transformação no treino/classificação", () => {
  const b = importarBaseMercado(
    JSON.stringify({ fonte: "teste", setor: "teste", periodo: "2026", empresas }),
  );
  assert.equal(b.empresas[1]!.fluxoInvestimentoOriginal, 2);
  for (const c of b.centroides) {
    const membros = b.empresas.filter((e) => diagnosticar(e, b.centroides).perfil === c.perfil);
    assert.equal(membros.length, c.empresas);
    const media = membros
      .map((e) => padronizar(e, c.padronizacao!))
      .reduce((s, v) => s.map((a, j) => a + v[j]! / membros.length), [0, 0, 0, 0]);
    media.forEach((v, j) => assert.ok(Math.abs(v - c.centroPadronizado![j]!) < 1e-10));
  }
});

test("unidades monetárias diferentes por variável não mudam os grupos após Z-score", () => {
  const importar = (linhas: typeof empresas) =>
    importarBaseMercado(
      JSON.stringify({ fonte: "teste", setor: "teste", periodo: "2026", empresas: linhas }),
    );
  const a = importar(empresas);
  const convertidas = empresas.map((e) => ({
    ...e,
    receita: e.receita * 1000,
    custos: e.custos * 0.01,
    patrimonio: e.patrimonio * 10,
    investimento: e.investimento * 100,
    fluxoInvestimentoOriginal: e.fluxoInvestimentoOriginal * 100,
  }));
  const b = importar(convertidas);
  empresas.forEach((e, i) => {
    const antes = diagnosticar(e, a.centroides);
    const depois = diagnosticar(convertidas[i]!, b.centroides);
    assert.equal(depois.perfil, antes.perfil);
    assert.ok(Math.abs(depois.distancia - antes.distancia) < 1e-10);
  });
  assert.throws(
    () => importar(empresas.map((e) => ({ ...e, fluxoInvestimentoOriginal: Number.NaN }))),
    /fluxoInvestimentoOriginal/,
  );
});
