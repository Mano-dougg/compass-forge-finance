import { test } from "node:test";
import assert from "node:assert/strict";
import {
  preverMediaMovel,
  preverCenarioPatrimonio,
  ANO_BASE_PATRIMONIO,
  ANO_PREVISAO_PATRIMONIO,
  prepararHistoricoPL,
} from "./patrimonio-historico.ts";

const historico = [100, 110, 130, 160, 200].map((patrimonio, i) => ({ ano: 2021 + i, patrimonio }));
const base = { receita: 500, custos: 300, investimento: 20, patrimonio: 200 };
const hipoteses = { impostoPct: 0, retencaoPct: 100, retornoInvestimentoPct: 0 };
const prever = (cenario = base, taxas = hipoteses, h = historico) =>
  preverCenarioPatrimonio({ historico: h, base, cenario, janela: 3, hipoteses: taxas });

test("média móvel dos níveis usa somente os últimos anos e não altera a entrada", () => {
  const copia = structuredClone(historico);
  const p = preverMediaMovel([...historico].reverse());
  assert.equal(p.anoAlvo, 2026);
  assert.ok(Math.abs(p.valor - (130 + 160 + 200) / 3) < 1e-9);
  assert.deepEqual(historico, copia);
  assert.ok(
    Math.abs(p.historico.find((o) => o.ano === 2024)!.estimativa! - (100 + 110 + 130) / 3) < 1e-9,
  );
});
test("projeção da empresa usa PL atual mais média de três variações anuais", () => {
  const p = prever();
  assert.equal(p.variacaoMedia, 30);
  assert.equal(p.semMudancas, 230);
  assert.equal(p.comMudancas, 230);
  assert.equal(p.anoAlvo, 2026);
});
test("somente receita e custos adicionais entram, sem duplicar o resultado habitual", () => {
  const p = prever({ ...base, receita: 550, custos: 320 });
  assert.equal(p.resultadoOperacional, 30);
  assert.equal(p.comMudancas, 260);
  assert.equal(prever({ ...base, custos: 350 }).comMudancas, 180);
});
test("investimento não reduz PL automaticamente; retorno é hipótese explícita", () => {
  assert.equal(prever({ ...base, investimento: 120 }).comMudancas, 230);
  const p = prever({ ...base, investimento: 120 }, { ...hipoteses, retornoInvestimentoPct: 10 });
  assert.equal(p.retornoInvestimento, 10);
  assert.equal(p.comMudancas, 240);
});
test("tributação e retenção se aplicam apenas ao efeito adicional", () => {
  const p = prever({ ...base, receita: 600 }, { ...hipoteses, impostoPct: 20, retencaoPct: 50 });
  assert.equal(p.impactoRetido, 40);
  assert.equal(p.comMudancas, 270);
  assert.equal(
    prever({ ...base, receita: 600 }, { ...hipoteses, retencaoPct: 0 }).comMudancas,
    230,
  );
});
test("alterar PL do cenário representa ajuste atual de capital", () => {
  const p = prever({ ...base, patrimonio: 250 });
  assert.equal(p.ajustePatrimonio, 50);
  assert.equal(p.comMudancas, 280);
});
test("teste retrospectivo não usa PL do ano previsto nem os efeitos simulados", () => {
  const p = prever();
  assert.deepEqual(p.avaliacoes, [{ ano: 2025, real: 200, previsto: 180, ingenuo: 160 }]);
  assert.equal(p.mae, 20);
  assert.equal(p.maeIngenuo, 40);
  assert.deepEqual(prever({ ...base, receita: 1000 }).avaliacoes, p.avaliacoes);
});
test("valida duplicatas, anos faltantes, amostra curta, hipóteses e coerência do último PL", () => {
  assert.throws(() => prever(base, hipoteses, [...historico, historico[0]!]), /duplicado/);
  assert.throws(
    () =>
      prever(
        base,
        hipoteses,
        historico.filter((o) => o.ano !== 2023),
      ),
    /consecutivos/,
  );
  assert.throws(() => prever(base, hipoteses, historico.slice(-3)), /4 patrimônios/);
  assert.throws(() => prever(base, { ...hipoteses, impostoPct: 101 }), /0% e 100%/);
  assert.throws(() => prever(base, { ...hipoteses, retencaoPct: NaN }), /0% e 100%/);
  assert.throws(
    () =>
      prever(
        base,
        hipoteses,
        historico.map((o) => ({ ...o, patrimonio: o.patrimonio + 1 })),
      ),
    /coincidir/,
  );
});
test("aceita histórico com zero e negativo; não oculta previsão negativa", () => {
  const h = [-100, 0, 100, 200].map((patrimonio, i) => ({ ano: 2022 + i, patrimonio }));
  assert.equal(prever(base, hipoteses, h).variacaoMedia, 100);
  assert.ok(prever({ ...base, custos: 1000 }).comMudancas < 0);
});

test("formulário padrão prepara 2026 como base da previsão 2027", () => {
  assert.equal(ANO_PREVISAO_PATRIMONIO, 2027);
  assert.equal(ANO_BASE_PATRIMONIO, 2026);
  const linhas = prepararHistoricoPL();
  assert.deepEqual(
    linhas.map((l) => l.ano),
    ["2022", "2023", "2024", "2025", "2026"],
  );
  assert.ok(linhas.every((l) => l.patrimonio === ""));
  const antigoVazio = ["2021", "2022", "2023", "2024", "2025"].map((ano) => ({
    ano,
    patrimonio: "",
  }));
  assert.deepEqual(prepararHistoricoPL(antigoVazio), linhas);
});
test("histórico salvo preserva anos e valores e pede 2026 sem inventar patrimônio", () => {
  const antigo = historico.map((o) => ({ ano: String(o.ano), patrimonio: String(o.patrimonio) }));
  const copia = structuredClone(antigo);
  const preparado = prepararHistoricoPL(antigo);
  assert.deepEqual(preparado.slice(0, antigo.length), antigo);
  assert.deepEqual(preparado.at(-1), { ano: "2026", patrimonio: "" });
  assert.deepEqual(antigo, copia);
  assert.deepEqual(prepararHistoricoPL(preparado), preparado);
});
test("alvo explícito 2027 exige base 2026 e não troca apenas o rótulo da previsão", () => {
  const args = {
    historico,
    base,
    cenario: base,
    janela: 3,
    hipoteses,
    anoAlvo: ANO_PREVISAO_PATRIMONIO,
  };
  assert.throws(() => preverCenarioPatrimonio(args), /Para projetar 2027.*terminar em 2026/);
  const atualizado = historico.map((o) => ({ ...o, ano: o.ano + 1 }));
  const p = preverCenarioPatrimonio({ ...args, historico: atualizado });
  assert.equal(p.anoAlvo, 2027);
  assert.equal(p.ultimoHistorico.ano, 2026);
  assert.equal(p.comMudancas, 230);
  assert.throws(() => preverCenarioPatrimonio({ ...args, anoAlvo: NaN }), /ano de previsão válido/);
});

test("projeção de vários anos mantém a variação histórica e repete apenas o efeito anual", () => {
  const args = {
    historico,
    base,
    cenario: { ...base, receita: 550, custos: 320, patrimonio: 250 },
    janela: 3,
    hipoteses,
  };
  const p = preverCenarioPatrimonio({ ...args, horizonte: 5 });
  assert.equal(p.anoFinal, p.anoAlvo + 4);
  assert.equal(p.horizonte, 5);
  assert.deepEqual(
    p.projecoes.map((ano) => ano.semMudancas),
    [230, 260, 290, 320, 350],
  );
  assert.deepEqual(
    p.projecoes.map((ano) => ano.comMudancas),
    [310, 370, 430, 490, 550],
  );
  assert.deepEqual(
    p.projecoes.map((ano) => ano.anosAFrente),
    [1, 2, 3, 4, 5],
  );
  assert.equal(p.comMudancas, preverCenarioPatrimonio(args).comMudancas);
  assert.deepEqual(p.avaliacoes, preverCenarioPatrimonio(args).avaliacoes);
  assert.deepEqual(p.historico, historico);
});
test("aporte ou retirada sem crescimento não vira ganho recorrente em anos futuros", () => {
  const serie = historico.map((o) => ({ ...o, patrimonio: base.patrimonio }));
  for (const patrimonio of [150, 250]) {
    const p = preverCenarioPatrimonio({
      historico: serie,
      base,
      cenario: { ...base, patrimonio },
      janela: 3,
      hipoteses,
      horizonte: 5,
    });
    assert.deepEqual(
      p.projecoes.map((ano) => ano.comMudancas),
      Array(5).fill(patrimonio),
    );
  }
});
test("mantém negativos na série futura e valida o horizonte", () => {
  const args = { historico, base, cenario: { ...base, custos: 400 }, janela: 3, hipoteses };
  const p = preverCenarioPatrimonio({ ...args, horizonte: 5 });
  assert.deepEqual(
    p.projecoes.map((ano) => ano.comMudancas),
    [130, 60, -10, -80, -150],
  );
  for (const horizonte of [0, 6, 2.5, NaN])
    assert.throws(() => preverCenarioPatrimonio({ ...args, horizonte }), /entre 1 e 5 anos/);
});

test("perdas não geram crédito fiscal automático e não são atenuadas pela retenção de lucros", () => {
  const p = prever({ ...base, custos: 900 }, { ...hipoteses, impostoPct: 20, retencaoPct: 50 });
  // Resultado base 200 -> retido 80; cenário −400 -> perda integral −400.
  assert.equal(p.impactoRetido, -480);
  assert.equal(p.comMudancas, -250);
  const h = [100, 100, 100, 200].map((patrimonio, i) => ({ ano: 2022 + i, patrimonio }));
  const prejuizo = { ...base, custos: 600 };
  const outra = preverCenarioPatrimonio({
    historico: h,
    base: prejuizo,
    cenario: { ...prejuizo, custos: 650 },
    janela: 3,
    hipoteses: { ...hipoteses, impostoPct: 30, retencaoPct: 0 },
  });
  assert.equal(outra.impactoRetido, -50);
});

test("validação por horizonte usa apenas a origem e anos passados; deriva linear tem erro zero", () => {
  const h = Array.from({ length: 10 }, (_, i) => ({ ano: 2016 + i, patrimonio: 110 + i * 10 }));
  const p = preverCenarioPatrimonio({
    historico: h,
    base,
    cenario: base,
    janela: 3,
    hipoteses,
    horizonte: 5,
  });
  p.validacaoHorizontes.forEach((v) => {
    assert.equal(v.mae, 0);
    assert.equal(v.maeIngenuo, v.horizonte * 10);
    assert.equal(v.avaliacoes, 7 - v.horizonte);
  });
  const curto = preverCenarioPatrimonio({
    historico,
    base,
    cenario: base,
    janela: 3,
    hipoteses,
    horizonte: 5,
  });
  assert.equal(curto.validacaoHorizontes[0]!.mae, curto.mae);
  assert.equal(curto.validacaoHorizontes[4]!.mae, null);
});

test("erros de dois e três anos usam deriva anterior ao alvo em uma série irregular", () => {
  const h = [100, 110, 130, 160, 200, 250, 310].map((patrimonio, i) => ({
    ano: 2019 + i,
    patrimonio,
  }));
  const gerar = (serie: typeof h) =>
    preverCenarioPatrimonio({
      historico: serie,
      base: { ...base, patrimonio: serie.at(-1)!.patrimonio },
      cenario: { ...base, patrimonio: serie.at(-1)!.patrimonio },
      janela: 3,
      hipoteses,
      horizonte: 3,
    });
  const v = gerar(h).validacaoHorizontes;
  assert.equal(v[1]!.avaliacoes, 2);
  assert.equal(v[1]!.mae, 50);
  assert.equal(v[1]!.maeIngenuo, 100);
  assert.equal(v[2]!.mae, 90);
  // Mudar somente o alvo final não muda as previsões anteriores (200 e260).
  const alterada = h.map((o, i) => (i === 6 ? { ...o, patrimonio: 1000 } : o));
  assert.equal(gerar(alterada).validacaoHorizontes[1]!.mae, 395);
});
