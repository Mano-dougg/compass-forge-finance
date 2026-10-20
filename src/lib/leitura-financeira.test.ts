import test from "node:test";
import assert from "node:assert/strict";
import { leituraFinanceira } from "./leitura-financeira.ts";
import { benchmarkCluster } from "./benchmarking.ts";

test("leitura por R$ 100 permite comparar portes diferentes sem inventar gaps", () => {
  const referencia = benchmarkCluster("Conservador");
  const dados = {
    ...referencia,
    receita: referencia.receita / 2,
    custos: referencia.custos / 2,
    investimento: referencia.investimento / 2,
    patrimonio: referencia.patrimonio / 2,
  };
  const leitura = leituraFinanceira(dados, "Conservador");
  assert.equal(leitura.custos, leitura.custosGrupo);
  assert.equal(leitura.investimento, leitura.investimentoGrupo);
  assert.equal(leitura.gaps.excessoCustos, 0);
  assert.equal(leitura.gaps.deficitInvestimento, 0);
  assert.match(leitura.resumo[0]!.resposta, /ou abaixo/);
});
test("receita zero produz instrução de preenchimento, não um diagnóstico de eficiência", () => {
  const leitura = leituraFinanceira(
    { receita: 0, custos: 100, patrimonio: 50, investimento: 10 },
    "Conservador",
  );
  assert.equal(leitura.custos, null);
  assert.equal(leitura.investimento, null);
  assert.match(leitura.resumo[0]!.resposta, /receita maior que zero/);
  assert.match(leitura.resumo[1]!.resposta, /não é possível/);
  assert.ok(leitura.resumo.every((item) => !JSON.stringify(item).includes("Infinity")));
});
test("custos maiores que a receita permanecem visíveis e ações usam o gap compartilhado", () => {
  const leitura = leituraFinanceira(
    { receita: 100, custos: 150, patrimonio: 100, investimento: 0 },
    "Conservador",
  );
  assert.equal(leitura.custos, 150);
  assert.match(leitura.resumo[0]!.resposta, /acima/);
  assert.match(leitura.resumo[0]!.explicacao, /150,00/);
  assert.match(leitura.resumo[1]!.proximoPasso, /caixa disponível/);
});
