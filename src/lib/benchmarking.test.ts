import { describe, test } from "node:test";
import assert from "node:assert/strict";
function expect(actual: unknown) {
  return {
    toBe: (expected: unknown) => assert.equal(actual, expected),
    toEqual: (expected: unknown) => assert.deepEqual(actual, expected),
    toBeNull: () => assert.equal(actual, null),
    toHaveLength: (length: number) => assert.equal((actual as unknown[]).length, length),
    toBeCloseTo: (expected: number) =>
      assert.ok(typeof actual === "number" && Math.abs(actual - expected) < 0.01),
  };
}
import { analisarGaps, benchmarkCluster, dadosRadar, recomendacoes } from "./benchmarking.ts";
import { aplicarPasso, diagnosticar, TETOS } from "./sad-model.ts";

describe("RF07–RF12 referências simuladas", () => {
  for (const perfil of ["Conservador", "Expansivo", "Estruturado"])
    test(`centróide ${perfil} classifica no próprio cluster`, () => {
      expect(diagnosticar(benchmarkCluster(perfil)).perfil).toBe(perfil);
    });
  test("radar compara quatro valores reais com referência normalizada em 100", () => {
    const b = benchmarkCluster("Conservador");
    const radar = dadosRadar({ ...b, receita: b.receita * 2 }, "Conservador");
    expect(radar).toHaveLength(4);
    expect(radar.find((r) => r.indicador === "Receita")?.empresa).toBe(200);
    expect(radar.every((r) => r.cluster === 100)).toBe(true);
  });
  test("gaps usam custo e investimento proporcionais à receita", () => {
    const a = analisarGaps(
      {
        receita: 100_000_000,
        custos: 90_000_000,
        investimento: 1_000_000,
        patrimonio: 150_000_000,
      },
      "Conservador",
    );
    expect(a.custoReferencia).toBeCloseTo(82_000_000);
    expect(a.excessoCustos).toBeCloseTo(8_000_000);
    expect(a.reducaoCustosPct).toBeCloseTo(8.888888);
    expect(a.deficitInvestimento).toBeCloseTo(3_000_000);
  });
  test("custos zero não produzem infinito", () => {
    const a = analisarGaps(
      { receita: 0, custos: 0, investimento: 0, patrimonio: 0 },
      "Conservador",
    );
    expect(a.retorno).toBeNull();
    expect(a.eficiencia).toBeNull();
    expect(a.reducaoCustosPct).toBe(0);
  });
  test("simulação migra de Conservador para Estruturado", () => {
    expect(diagnosticar(benchmarkCluster("Conservador")).perfil).toBe("Conservador");
    expect(diagnosticar(benchmarkCluster("Estruturado")).perfil).toBe("Estruturado");
  });
  test("ajuste de receita preserva os custos informados", () => {
    const d = {
      receita: 100_000_000,
      custos: 60_000_000,
      patrimonio: 100_000_000,
      investimento: 1_000_000,
    };
    expect(aplicarPasso(d, "receita", 5_000_000).dados.custos).toBe(60_000_000);
  });
  test("RN02 bloqueia valor acima do teto", () => {
    const d = benchmarkCluster("Conservador");
    expect(aplicarPasso(d, "receita", TETOS.receita).dados).toEqual(d);
  });
});

describe("recomendações compartilhadas com as metas", () => {
  const dados = { receita: 100_000, custos: 90_000, investimento: 1_000, patrimonio: 70_000 };
  // Intentionally different centroid ratios: financial means must drive the actions.
  const centroides = [
    {
      perfil: "Teste",
      descricao: "Referência de teste",
      margem: 0.8,
      intensidadeInvestimento: 0.01,
      alavancagem: 1,
      escala: 0.1,
      valores: { receita: 200_000, custos: 160_000, investimento: 40_000, patrimonio: 150_000 },
      distribuicaoCustos: { p25: 0.6, mediana: 0.8 },
    },
  ];
  test("interpreta os gaps financeiros sem duplicar as metas em reais", () => {
    const diag = diagnosticar(dados, centroides);
    const gaps = analisarGaps(dados, diag.perfil, centroides);
    const recs = recomendacoes(dados, diag, centroides);
    assert.notDeepEqual(recs, gaps.acoes);
    assert.match(recs[0]!, /Investigar a diferença de custos/);
    assert.match(recs[1]!, /Avaliar os projetos/);
    assert.doesNotMatch(recs.join(" "), /Prioridade:|Depois,|líderes/);
    assert.equal(gaps.excessoCustos, 10_000);
    assert.equal(gaps.deficitInvestimento, 19_000);
    assert.equal(gaps.distribuicaoCustos!.p25, 0.6);
    assert.ok(recs.every((r) => !gaps.acoes.includes(r)));
    assert.doesNotMatch(recs.join(" "), /51,3|48,7|R²|captação|sem comprometer o caixa/);
  });
  test("referência proporcional é mantida ao mudar o porte e reage à base selecionada", () => {
    const alinhada = { ...dados, custos: 70_000, investimento: 30_000 };
    const diag = diagnosticar(alinhada, centroides);
    const recs = recomendacoes(alinhada, diag, centroides);
    assert.match(recs[0]!, /Acompanhar custos/);
    assert.match(recs[1]!, /Revisar o retorno/);
    const outraBase = [
      { ...centroides[0]!, valores: { ...centroides[0]!.valores, custos: 100_000 } },
    ];
    assert.match(recomendacoes(alinhada, diag, outraBase)[0]!, /Investigar a diferença de custos/);
  });
  test("custos e investimento geram alternativas independentes, sem prioridade automática", () => {
    const cenario = { ...dados, custos: 70_000 };
    const recs = recomendacoes(cenario, diagnosticar(cenario, centroides), centroides);
    assert.match(recs[0]!, /Acompanhar custos/);
    assert.match(recs[1]!, /Avaliar os projetos/);
    assert.doesNotMatch(recs.join(" "), /Prioridade:|Depois/);
  });
  test("receita zero não recomenda alinhamento ou capacidade financeira", () => {
    const zero = { ...dados, receita: 0 };
    const recs = recomendacoes(zero, diagnosticar(zero, centroides), centroides);
    assert.match(recs[0]!, /Comece pelos dados/);
    assert.doesNotMatch(recs.join(" "), /Preservar a eficiência|Alocação alinhada|NaN|Infinity|R²/);
  });
});
