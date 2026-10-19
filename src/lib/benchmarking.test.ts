import { describe, test } from "node:test";
import assert from "node:assert/strict";
function expect(actual: unknown) {
  return {
    toBe: (expected: unknown) => assert.equal(actual, expected),
    toEqual: (expected: unknown) => assert.deepEqual(actual, expected),
    toBeNull: () => assert.equal(actual, null),
    toHaveLength: (length: number) => assert.equal((actual as unknown[]).length, length),
    toBeCloseTo: (expected: number) => assert.ok(typeof actual === "number" && Math.abs(actual - expected) < 0.01),
  };
}
import { analisarGaps, benchmarkCluster, dadosRadar } from "./benchmarking";
import { aplicarPasso, diagnosticar, posicaoEstrutural, TETOS } from "./sad-model";

describe("RF07–RF12 referências simuladas", () => {
  for (const perfil of ["Conservador", "Expansivo", "Estruturado"]) test(`centróide ${perfil} classifica no próprio cluster`, () => {
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
    const a = analisarGaps({ receita: 100_000_000, custos: 90_000_000, investimento: 1_000_000, patrimonio: 150_000_000 }, "Conservador");
    expect(a.custoReferencia).toBeCloseTo(82_000_000);
    expect(a.excessoCustos).toBeCloseTo(8_000_000);
    expect(a.reducaoCustosPct).toBeCloseTo(8.888888);
    expect(a.deficitInvestimento).toBeCloseTo(3_000_000);
  });
  test("custos zero não produzem infinito", () => {
    const a = analisarGaps({ receita: 0, custos: 0, investimento: 0, patrimonio: 0 }, "Conservador");
    expect(a.retorno).toBeNull();
    expect(a.eficiencia).toBeNull();
    expect(a.reducaoCustosPct).toBe(0);
  });
  test("simulação migra de Conservador para Estruturado", () => {
    expect(diagnosticar(benchmarkCluster("Conservador")).perfil).toBe("Conservador");
    expect(diagnosticar(benchmarkCluster("Estruturado")).perfil).toBe("Estruturado");
  });
  test("RN01 recalibra custos com 0,9629", () => {
    const d = { receita: 100_000_000, custos: 60_000_000, patrimonio: 100_000_000, investimento: 1_000_000 };
    expect(aplicarPasso(d, "receita", 5_000_000).dados.custos).toBe(62_888_700);
  });
  test("RN02 bloqueia valor acima do teto", () => {
    const d = benchmarkCluster("Conservador");
    expect(aplicarPasso(d, "receita", TETOS.receita).dados).toEqual(d);
  });
  test("RF05 compara PL real com benchmark sem previsão temporal", () => {
    const p = posicaoEstrutural({ receita: 100_000_000, custos: 80_000_000, investimento: 4_000_000, patrimonio: 150_000_000 });
    expect(p.plTeorico).toBe(163_690_000);
    expect(p.gap).toBe(-13_690_000);
    expect(p.suficiente).toBe(false);
  });
});