import { test } from "node:test";
import assert from "node:assert/strict";
import { analisarCompraRevenda } from "./compra-revenda.ts";
import { preverCenarioPatrimonio, type DiagnosticoTemporal } from "./patrimonio-historico.ts";
import type { EmpresaDados } from "./sad-model.ts";

const base = { receita: 500, custos: 300, investimento: 20, patrimonio: 200 };
const hipoteses = { impostoPct: 0, retencaoPct: 100, retornoInvestimentoPct: 0 };
function temporal(cenario = base, patrimonios = [100, 110, 130, 160, 200]): DiagnosticoTemporal {
  const observacoes = patrimonios.map((patrimonio, i) => ({ ano: 2021 + i, patrimonio }));
  return {
    empresa: "Teste",
    observacoes,
    hipoteses,
    previsao: preverCenarioPatrimonio({
      historico: observacoes,
      base,
      cenario,
      janela: 3,
      hipoteses,
    }),
  };
}
function avaliar(cenario = base, patrimonios?: number[]) {
  const analise = analisarCompraRevenda(base, temporal(cenario, patrimonios));
  if (!analise.disponivel) throw new Error(analise.motivo);
  return analise;
}
test("compra pelo PL original e revenda pelo cenário futuro geram retorno de um ano", () => {
  const a = avaliar();
  assert.equal(a.precoCompra, 200);
  assert.equal(a.precoRevenda, 230);
  assert.equal(a.ganhoAjustado, 30);
  assert.equal(a.retornoPct, 15);
  assert.equal(a.anoRevenda - a.anoCompra, 1);
  assert.equal(a.sinal, "ganho");
});
test("aportes aumentam o capital aplicado sem criar lucro artificial", () => {
  const a = avaliar({ ...base, patrimonio: 250 });
  assert.equal(a.precoCompra, 200);
  assert.equal(a.precoRevenda, 280);
  assert.equal(a.aporte, 50);
  assert.equal(a.totalAplicado, 250);
  assert.equal(a.diferencaPatrimonial, 80);
  assert.equal(a.ganhoAjustado, 30);
  assert.equal(a.retornoPct, 12);
  const semCrescimento = avaliar({ ...base, patrimonio: 250 }, [200, 200, 200, 200, 200]);
  assert.equal(semCrescimento.ganhoAjustado, 0);
  assert.equal(semCrescimento.sinal, "equilibrio");
});
test("retirada é devolução ao comprador e não perda patrimonial operacional", () => {
  const a = avaliar({ ...base, patrimonio: 150 });
  assert.equal(a.precoRevenda, 180);
  assert.equal(a.retirada, 50);
  assert.equal(a.recebimentoTotal, 230);
  assert.equal(a.ganhoAjustado, 30);
  assert.equal(a.retornoPct, 15);
});
test("perda e revenda zero não são ocultadas nem classificadas como ganho", () => {
  const perda = avaliar({ ...base, custos: 400 });
  assert.equal(perda.ganhoAjustado, -70);
  assert.equal(perda.sinal, "perda");
  const zero = avaliar({ ...base, custos: 530 });
  assert.equal(zero.precoRevenda, 0);
  assert.equal(zero.retornoPct, -100);
});
test("não inventa preço de compra para PL zero ou negativo, nem revenda negativa", () => {
  for (const patrimonio of [0, -200]) {
    const a = analisarCompraRevenda({ ...base, patrimonio }, temporal());
    assert.equal(a.disponivel, false);
    if (!a.disponivel) assert.match(a.motivo, /preço negociado/);
  }
  const a = analisarCompraRevenda(base, temporal({ ...base, custos: 1000 }));
  assert.equal(a.disponivel, false);
  if (!a.disponivel) assert.match(a.motivo, /futuro projetado é negativo/);
});
test("aguarda histórico válido e rejeita entrada numérica inválida", () => {
  assert.equal(analisarCompraRevenda(null, null).disponivel, false);
  assert.equal(analisarCompraRevenda(base, null).disponivel, false);
  assert.equal(analisarCompraRevenda({ ...base, patrimonio: NaN }, temporal()).disponivel, false);
});
test("mudanças operacionais reaproveitam o mesmo cenário temporal, sem usar a regressão demonstrativa", () => {
  const cenario: EmpresaDados = { ...base, receita: 550, custos: 320 };
  const a = avaliar(cenario);
  assert.equal(a.precoRevenda, temporal(cenario).previsao.comMudancas);
  assert.equal(a.precoRevenda, 260);
  assert.equal(a.ganhoAjustado, 60);
});

test("revenda acompanha o último ano selecionado e usa retorno acumulado", () => {
  const d = temporal({ ...base, patrimonio: 250 });
  const previsao = preverCenarioPatrimonio({
    historico: d.observacoes,
    base,
    cenario: { ...base, patrimonio: 250 },
    janela: 3,
    hipoteses,
    horizonte: 5,
  });
  const a = analisarCompraRevenda(base, { ...d, previsao });
  assert.equal(a.disponivel, true);
  if (!a.disponivel) throw new Error("Análise indisponível");
  assert.equal(a.anos, 5);
  assert.equal(a.anoRevenda - a.anoCompra, 5);
  assert.equal(a.precoRevenda, 400);
  assert.equal(a.aporte, 50);
  assert.equal(a.totalAplicado, 250);
  assert.equal(a.ganhoAjustado, 150);
  assert.equal(a.retornoPct, 60);
});
