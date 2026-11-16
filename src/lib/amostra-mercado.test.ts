import test from "node:test";
import assert from "node:assert/strict";
import { criarBenchmarkPadrao } from "./default-benchmark.ts";
import { importarBaseMercado, pontosAmostra } from "./market-clusters.ts";
import { diagnosticar, indicadores } from "./sad-model.ts";

test("base completa plota todos os emissores elegíveis, sem reduzi-los aos três centroides", () => {
  const base = criarBenchmarkPadrao();
  const pontos = pontosAmostra(base);
  assert.equal(pontos.length, base.empresas.length);
  assert.equal(new Set(pontos.map((p) => p.empresa)).size, base.empresas.length);
  assert.ok(pontos.length > 300);
  assert.deepEqual(
    pontos.map((p) => p.empresa),
    base.empresas.map((e) => e.empresa),
  );
  for (const [index, ponto] of pontos.entries()) {
    const empresa = base.empresas[index]!;
    const ind = indicadores(empresa);
    assert.equal(ponto.margem, ind.margem * 100);
    assert.equal(ponto.alavancagem, ind.alavancagem);
    assert.equal(ponto.perfil, diagnosticar(empresa, base.centroides).perfil);
    assert.ok(Number.isFinite(ponto.margem) && Number.isFinite(ponto.alavancagem));
  }
  for (const grupo of base.centroides)
    assert.equal(pontos.filter((p) => p.perfil === grupo.perfil).length, grupo.empresas);
});
test("filtro setorial plota somente os membros selecionados e restaurar recupera a base completa", () => {
  const completa = criarBenchmarkPadrao();
  const setores = [...new Set(completa.empresas.map((e) => e.setor))];
  let verificadas = 0;
  for (const setor of setores) {
    const empresas = completa.empresas.filter((e) => e.setor === setor);
    if (!setor || empresas.length < 3) continue;
    const filtrada = importarBaseMercado(JSON.stringify({ ...completa, setor, empresas }));
    const pontos = pontosAmostra(filtrada);
    assert.equal(pontos.length, empresas.length);
    assert.ok(pontos.every((p) => p.setor === setor));
    assert.deepEqual(
      pontos.map((p) => p.empresa),
      empresas.map((e) => e.empresa),
    );
    verificadas++;
  }
  assert.ok(verificadas > 0);
  assert.equal(pontosAmostra(completa).length, completa.empresas.length);
});
