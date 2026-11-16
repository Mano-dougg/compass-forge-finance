import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  analisarPlanejamento,
  invalidarConfirmacao,
  planejarMetas,
  resumirPares,
  simularOrcamento,
} from "./planejamento-metas.ts";

test("voltar às premissas antigas não restaura uma confirmação invalidada", () => {
  const confirmado = { escolha: "A", assinatura: "premissas-iniciais" };
  assert.equal(invalidarConfirmacao(confirmado, "premissas-iniciais"), confirmado);
  const alterado = invalidarConfirmacao(confirmado, "novas-premissas");
  assert.equal(alterado.assinatura, "");
  assert.equal(invalidarConfirmacao(alterado, "premissas-iniciais").assinatura, "");
  assert.equal(confirmado.assinatura, "premissas-iniciais", "não muta a confirmação original");
});

test("rejeita saída que perderia um centavo na conversão para number", () => {
  const objetivo = {
    patrimonioAlvo: 60_000_000_000_000.07,
    anos: 1,
    distribuicaoPct: 0,
    anoBase: 2026,
  };
  const plano = planejarMetas(
    { patrimonio: 0, receita: 0, custos: 20_000_000_000_000 },
    objetivo,
    [],
  );
  assert.ok(!plano.alternativas.some((a) => a.origens.includes("A")));
  assert.match(plano.indisponiveis["A"]!, /centavos/);
  assert.ok(plano.alternativas.every((a) => a.patrimonioFinal >= objetivo.patrimonioAlvo));
});

test("pares sem precisão monetária não bloqueiam alternativas ou orçamento manual", () => {
  const pares = [1, 2, 3].map((i) => ({ receita: i * 1e14, custos: i * 2e13 }));
  const analise = analisarPlanejamento(
    { patrimonio: 200000, receita: 100000, custos: 80000 },
    { patrimonioAlvo: 230000, anos: 1, distribuicaoPct: 0, anoBase: 2026 },
    { receita: 110000, custos: 80000 },
    pares,
    { setor: "Base importada", periodo: "2026" },
  );
  assert.equal(analise.erro, null);
  assert.equal(analise.resultado?.resumo.excluidos, 3);
  assert.equal(analise.resultado?.referencia?.patrimonioFinal, 220000);
  assert.deepEqual(
    analise.resultado?.alternativas.map((a) => a.origens),
    [["A"], ["B"]],
  );
  assert.equal(analise.manual?.patrimonioFinal, 230000);
});

test("referência fora da precisão não oculta metas e manual válidos", () => {
  const analise = analisarPlanejamento(
    { patrimonio: 0, receita: 2e12, custos: 0 },
    { patrimonioAlvo: 1000000, anos: 50, distribuicaoPct: 0, anoBase: 2026 },
    { receita: 20000, custos: 0 },
    [],
    { setor: "Geral", periodo: "2026" },
  );
  assert.equal(analise.erro, null);
  assert.equal(analise.resultado?.referencia, null);
  assert.match(analise.resultado?.erroReferencia ?? "", /precisão/);
  assert.equal(
    analise.resultado?.alternativas.find((a) => a.origens.includes("A"))?.patrimonioFinal,
    1000000,
  );
  assert.equal(analise.manual?.patrimonioFinal, 1000000);
});

const referencia = JSON.parse(
  readFileSync(new URL("./fixtures/metas-referencia.json", import.meta.url), "utf8"),
);
for (const c of referencia.casos) {
  test(`${c.id}: ${c.titulo}`, () => {
    const base = {
      patrimonio: Number(c.pl_inicial),
      receita: Number(c.receita),
      custos: Number(c.custos),
    };
    const objetivo = {
      patrimonioAlvo: Number(c.pl_alvo),
      anos: c.anos,
      distribuicaoPct: Number(c.distribuicao_pct),
      anoBase: 2026,
    };
    const pares = c.pares.map((p: { receita: string; custos: string }) => ({
      receita: Number(p.receita),
      custos: Number(p.custos),
    }));
    const calculado = planejarMetas(base, objetivo, pares);
    function conferir(a: ReturnType<typeof simularOrcamento>, esperado: Record<string, unknown>) {
      for (const [chave, campo] of Object.entries({
        receita: "receita",
        custos: "custos",
        resultado: "resultado",
        distribuicao: "distribuicao",
        retido: "retido",
        patrimonioFinal: "pl_final",
      })) {
        if (esperado[campo] !== undefined)
          assert.equal(a[chave as keyof typeof a], Number(esperado[campo]), campo);
      }
      assert.deepEqual(a.serie, (esperado["serie"] as string[]).map(Number));
    }
    assert.ok(calculado.referencia);
    conferir(calculado.referencia, c.referencia);
    if (c.pares_validos !== undefined) assert.equal(calculado.resumo.validos, c.pares_validos);
    if (c.mediana_q !== undefined)
      assert.equal(calculado.resumo.mediana, c.mediana_q === null ? null : Number(c.mediana_q));
    for (const esperado of c.alternativas) {
      const a = calculado.alternativas.find((a) => a.origens.includes(esperado.origem));
      assert.ok(a, `Alternativa ${esperado.origem}`);
      conferir(a, esperado);
      assert.ok(a.patrimonioFinal >= objetivo.patrimonioAlvo);
    }
    for (const origem of Object.keys(c.indisponiveis)) assert.ok(calculado.indisponiveis[origem]);
    if (c.alternativas.length === 0) assert.equal(calculado.alternativas.length, 0);
    if (c.id === "M10")
      assert.equal(calculado.alternativas.length, 1, "unir alternativas coincidentes");
  });
}

test("mediana de razões, quartis, entrada inválida e independência do investimento", () => {
  assert.deepEqual(
    resumirPares([
      { receita: 100, custos: 50 },
      { receita: 1000, custos: 800 },
    ]),
    { recebidos: 2, validos: 2, excluidos: 0, mediana: 0.65, p25: 0.575, p75: 0.725 },
  );
  const b = { patrimonio: 200000, receita: 100000, custos: 80000, investimento: 0 };
  const o = { patrimonioAlvo: 230000, anos: 1, distribuicaoPct: 0, anoBase: 2026 };
  const comInvestimento = { ...b, investimento: 999999 };
  assert.deepEqual(planejarMetas(b, o, []), planejarMetas(comInvestimento, o, []));
  for (const alteracao of [
    { anos: 0 },
    { anos: 1.5 },
    { distribuicaoPct: 101 },
    { distribuicaoPct: NaN },
    { patrimonioAlvo: Infinity },
  ])
    assert.throws(() => planejarMetas(b, { ...o, ...alteracao }, []));
  assert.throws(() => planejarMetas({ ...b, receita: -1 }, o, []));
});

test("opção C fora da precisão não esconde A, B ou referência válidas", () => {
  const p = planejarMetas(
    { patrimonio: 200000, receita: 100000, custos: 80000 },
    { patrimonioAlvo: 230000, anos: 1, distribuicaoPct: 0, anoBase: 2026 },
    [{ receita: 1e9, custos: 999999999.99 }],
  );
  assert.equal(p.alternativas.length, 2);
  assert.equal(p.referencia?.patrimonioFinal, 220000);
  assert.match(p.indisponiveis["C"]!, /precisão/);
});

test("análise compartilhada isola falha manual e identifica mudanças nas premissas", () => {
  const base = { patrimonio: 168240000, receita: 182400000, custos: 94150000, investimento: 0 };
  const objetivo = { patrimonioAlvo: 500000000, anos: 50, distribuicaoPct: 0, anoBase: 2026 };
  const manual = { receita: 2e12, custos: 0 };
  const recorte = { setor: "Geral", periodo: "2026" };
  const analise = analisarPlanejamento(base, objetivo, manual, [], recorte);
  assert.ok(analise.resultado);
  assert.equal(analise.erro, null);
  assert.equal(analise.manual, null);
  assert.match(analise.erroManual!, /precisão/);
  const comInvestimento = { ...base, investimento: 2000000 };
  assert.equal(
    analisarPlanejamento(comInvestimento, objetivo, manual, [], recorte).assinatura,
    analise.assinatura,
  );
  assert.notEqual(
    analisarPlanejamento(base, { ...objetivo, anos: 3 }, manual, [], recorte).assinatura,
    analise.assinatura,
  );
  assert.notEqual(
    analisarPlanejamento(base, objetivo, manual, [], { ...recorte, setor: "Setor" }).assinatura,
    analise.assinatura,
  );
  const invalida = analisarPlanejamento(base, { ...objetivo, anos: 0 }, manual, [], recorte);
  assert.equal(invalida.resultado, null);
  assert.match(invalida.erro!, /prazo/);
});
