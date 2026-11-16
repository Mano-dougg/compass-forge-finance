import { test } from "node:test";
import assert from "node:assert/strict";
import referencia from "../../public/base-cvm-2026-b3.json" with { type: "json" };
import historica from "../../public/base-cvm-2026.json" with { type: "json" };
import { criarBenchmarkPadrao, ANO_BENCHMARK_PADRAO } from "./default-benchmark.ts";
import { diagnosticar } from "./sad-model.ts";
import { analisarGaps } from "./benchmarking.ts";
import { ajustarRegressaoPatrimonio } from "./regressao-patrimonio.ts";

test("benchmark padrão usa o catálogo integral: 374 emissores aptos de 491 no corte comum", () => {
  const b = criarBenchmarkPadrao();
  assert.equal(ANO_BENCHMARK_PADRAO, 2026);
  assert.equal(b.dataReferencia, "2026-06-30");
  assert.equal(b.empresas.length, 374);
  assert.deepEqual(b.cobertura, { selecionadas: 491, excluidas: 117 });
  assert.equal(referencia.universo.tipo, "b3");
  assert.equal(referencia.universo.emissores, 491);
  assert.ok(referencia.metodologia.includes("não verifica"));
  assert.equal(
    referencia.empresas.length + referencia.excluidas.length,
    referencia.universo.emissores,
  );
  assert.ok(b.periodo.includes("01/07/2025 a 30/06/2026"));
  assert.equal(
    b.centroides.reduce((s, c) => s + c.empresas!, 0),
    374,
  );
  assert.ok(b.metodologia!.includes("sem extrapolação"));
  assert.ok(JSON.stringify(b).length < 5_000_000, "base persistida cabe no limite de 5 MB");
  assert.ok(ajustarRegressaoPatrimonio(b.empresas).disponivel);
  assert.equal(historica.empresas.length, 29, "amostra anterior continua auditável");
  assert.equal(historica.excluidas.length, 6);
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
