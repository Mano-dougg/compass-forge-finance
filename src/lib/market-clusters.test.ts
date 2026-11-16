import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importarBaseMercado, treinarClusters, limitesMercado } from "./market-clusters.ts";
import { diagnosticar, aplicarPasso } from "./sad-model.ts";
import { analisarGaps, benchmarkCluster, dadosRadar } from "./benchmarking.ts";

const exemplo = JSON.parse(
  readFileSync(new URL("../../public/base-mercado-exemplo.json", import.meta.url), "utf8"),
);
const importar = () => importarBaseMercado(JSON.stringify(exemplo));
describe("RF07–RF13 base de mercado e diagnóstico compartilhado", () => {
  test("K-Means agrupa a amostra em três perfis com médias exatas e dispersão populacional", () => {
    const b = importar();
    assert.equal(b.centroides.length, 3);
    for (const c of b.centroides) {
      assert.ok(c.empresas! > 0);
      const membros = b.empresas.filter((e) => diagnosticar(e, b.centroides).perfil === c.perfil);
      assert.equal(membros.length, c.empresas);
      for (const campo of ["receita", "custos", "patrimonio", "investimento"] as const) {
        const media: number = membros.reduce((s, e) => s + e[campo], 0) / membros.length;
        assert.equal(benchmarkCluster(c.perfil, b.centroides)[campo], media);
        const desvio = Math.sqrt(
          membros.reduce((s, e) => s + (e[campo] - media) ** 2, 0) / membros.length,
        );
        assert.equal(c.desvios![campo], desvio);
      }
    }
  });
  test("ordem das empresas não altera treinamento", () => {
    const b = importar();
    assert.deepEqual(treinarClusters([...b.empresas].reverse()), b.centroides);
  });
  test("classifica centroides e permite migração entre perfis", () => {
    const b = importar();
    for (const c of b.centroides)
      assert.equal(diagnosticar(c.valores!, b.centroides).perfil, c.perfil);
  });
  test("metas, radar, retorno e desvios usam as médias dos mesmos membros", () => {
    const b = importar();
    const c = b.centroides.find((c) => c.perfil === "Conservador")!;
    const d = { ...c.valores!, custos: c.valores!.receita * 0.9, investimento: 0 };
    const a = analisarGaps(d, c.perfil, b.centroides);
    assert.ok(Math.abs(a.excessoCustos - 8_000_000) < 1);
    assert.ok(Math.abs(a.reducaoCustosPct - 8.8888889) < 0.00001);
    assert.ok(Math.abs(a.receitaAlvo! / d.custos - 1 / 0.82) < 1e-8);
    assert.ok(a.distribuicaoCustos!.p25 <= a.distribuicaoCustos!.mediana);
    assert.ok(a.desvios!.custos! > 0);
    assert.equal(
      dadosRadar(d, c.perfil, b.centroides).find((p) => p.indicador === "Receita")!.empresa,
      100,
    );
    assert.ok(a.acoes.every((acao) => !acao.includes("líderes")));
  });
  test("quartis descrevem custo/receita, sem selecionar empresas pela maior receita", () => {
    const b = importar();
    for (const c of b.centroides) {
      const ratios = b.empresas
        .filter((e) => diagnosticar(e, b.centroides).perfil === c.perfil)
        .map((e) => e.custos / e.receita)
        .sort((a, b) => a - b);
      assert.ok(c.distribuicaoCustos!.p25 >= ratios[0]!);
      assert.ok(c.distribuicaoCustos!.p25 <= c.distribuicaoCustos!.mediana);
      if (ratios.length === 3)
        assert.equal(c.distribuicaoCustos!.p25, (ratios[0]! + ratios[1]!) / 2);
    }
  });
  test("média zero e dispersão zero não geram NaN ou infinito", () => {
    const b = importar();
    const c = {
      ...b.centroides[0]!,
      valores: { ...b.centroides[0]!.valores!, investimento: 0 },
      desvios: { receita: 0, custos: 0, patrimonio: 0, investimento: 0 },
    };
    const radar = dadosRadar(c.valores, c.perfil, [c]);
    assert.ok(radar.every((p) => Number.isFinite(p.empresa)));
    assert.equal(radar.find((p) => p.indicador === "Investimento")!.semReferencia, true);
    assert.ok(
      Object.values(analisarGaps(c.valores, c.perfil, [c]).desvios!).every((v) => v === null),
    );
  });
  test("rejeita base inválida, empresas duplicadas, valores não numéricos e perfis idênticos", () => {
    assert.throws(() => importarBaseMercado("{"), /JSON/);
    assert.throws(() => importarBaseMercado(JSON.stringify({ ...exemplo, setor: "" })), /setor/);
    assert.throws(
      () =>
        importarBaseMercado(JSON.stringify({ ...exemplo, empresas: exemplo.empresas.slice(0, 2) })),
      /3/,
    );
    assert.throws(
      () =>
        importarBaseMercado(
          JSON.stringify({ ...exemplo, empresas: [...exemplo.empresas, exemplo.empresas[0]] }),
        ),
      /duplicada/,
    );
    assert.throws(
      () =>
        importarBaseMercado(
          JSON.stringify({
            ...exemplo,
            empresas: exemplo.empresas.map((e: object) => ({ ...e, receita: "100" })),
          }),
        ),
      /receita/,
    );
    assert.throws(
      () =>
        importarBaseMercado(
          JSON.stringify({
            ...exemplo,
            empresas: exemplo.empresas.map((_: unknown, i: number) => ({
              ...exemplo.empresas[0],
              empresa: String(i),
            })),
          }),
        ),
      /distintos/,
    );
  });
  test("ajuste de receita limitado em zero mantém os custos independentes", () => {
    const d = { receita: 1_000_000, custos: 2_000_000, patrimonio: 1_000_000, investimento: 0 };
    const r = aplicarPasso(d, "receita", -5_000_000);
    assert.equal(r.dados.receita, 0);
    assert.equal(r.dados.custos, 2_000_000);
    assert.deepEqual(aplicarPasso(d, "receita", Number.NaN).dados, d);
  });
});

test("CVM 2024: mantém 28 empresas, escala real e filtros setoriais", () => {
  const original = JSON.parse(
    readFileSync(new URL("../../public/base-cvm-2024.json", import.meta.url), "utf8"),
  );
  const b = importarBaseMercado(JSON.stringify(original));
  assert.equal(b.empresas.length, 28);
  assert.equal(original.excluidas.length, 7);
  assert.equal(
    b.centroides.reduce((s, c) => s + c.empresas!, 0),
    28,
  );
  assert.ok(limitesMercado(b).receita > 900_000_000);
  const energia = importarBaseMercado(
    JSON.stringify({
      ...original,
      setor: "Energia Elétrica",
      empresas: original.empresas.filter((e: { setor: string }) => e.setor === "Energia Elétrica"),
    }),
  );
  assert.equal(energia.empresas.length, 4);
  assert.equal(
    energia.centroides.reduce((s, c) => s + c.empresas!, 0),
    4,
  );
  for (const c of energia.centroides) {
    const membros = energia.empresas.filter(
      (e) => diagnosticar(e, energia.centroides).perfil === c.perfil,
    );
    assert.equal(membros.length, c.empresas);
  }
});
test("referência de custos zero não inventa retorno infinito nem meta impossível", () => {
  const b = importar();
  const c = { ...b.centroides[0]!, valores: { ...b.centroides[0]!.valores!, custos: 0 } };
  const a = analisarGaps({ ...c.valores, custos: 1_000 }, c.perfil, [c]);
  assert.equal(a.retornoReferencia, null);
  assert.equal(a.eficiencia, null);
  assert.equal(a.receitaAlvo, null);
  assert.ok(a.acoes[0]!.includes("não há meta de receita"));
});
