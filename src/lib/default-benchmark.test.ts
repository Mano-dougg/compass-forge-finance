import { test } from "node:test";
import assert from "node:assert/strict";
import referencia from "../../public/base-cvm-2026.json" with { type: "json" };
import { criarBenchmarkPadrao, ANO_BENCHMARK_PADRAO } from "./default-benchmark.ts";
import { diagnosticar } from "./sad-model.ts";
import { analisarGaps } from "./benchmarking.ts";

test("benchmark padrão usa 2026 TTM, com 29 empresas e corte comum de junho", () => {
  const b = criarBenchmarkPadrao();
  assert.equal(ANO_BENCHMARK_PADRAO, 2026);
  assert.equal(b.dataReferencia, "2026-06-30");
  assert.equal(b.empresas.length, 29);
  assert.deepEqual(b.cobertura, { selecionadas: 35, excluidas: 6 });
  assert.ok(b.periodo.includes("01/07/2025 a 30/06/2026"));
  assert.equal(
    b.centroides.reduce((s, c) => s + c.empresas!, 0),
    29,
  );
  assert.ok(b.metodologia!.includes("sem extrapolação"));
});

test("conciliação de cada parcela TTM corresponde aos valores publicados no benchmark", () => {
  const cnpjs = new Set<string>();
  for (const e of referencia.empresas) {
    assert.equal(cnpjs.has(e.cnpj), false);
    cnpjs.add(e.cnpj);
    assert.equal(e.dataReferencia, referencia.dataReferencia);
    const c = e.conciliacao.componentes;
    for (const p of Object.values(c)) assert.equal(p.valor, p.dfp + p.itrAtual - p.itrAnterior);
    assert.equal(e.receita, c.receita.valor);
    assert.equal(e.custos, -(c.custo.valor + c.despesa.valor));
    assert.equal(e.fluxoInvestimentoOriginal, c.fluxo.valor);
    assert.equal(e.investimento, Math.max(0, -c.fluxo.valor));
    assert.ok(e.patrimonio > 0 && e.receita > 0 && e.custos >= 0);
  }
});

test("classificação e gaps aceitam o benchmark real sem resultados não finitos", () => {
  const b = criarBenchmarkPadrao();
  for (const e of b.empresas) {
    const diag = diagnosticar(e, b.centroides);
    assert.ok(Number.isFinite(diag.distancia));
    const a = analisarGaps(e, diag.perfil, b.centroides);
    for (const v of [a.excessoCustos, a.deficitInvestimento, a.eficiencia, a.retorno])
      assert.ok(v === null || Number.isFinite(v));
  }
});
