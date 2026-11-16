import test from "node:test";
import assert from "node:assert/strict";
import pesquisa from "../../public/base-cvm-2026.json" with { type: "json" };
import { restaurarBenchmark } from "./benchmark-restoration.ts";
import { importarBaseMercado } from "./market-clusters.ts";
import type { CompanyDocument } from "./company-document.ts";

const antiga = importarBaseMercado(JSON.stringify(pesquisa));
const nova = importarBaseMercado(
  JSON.stringify({
    ...pesquisa,
    fonte: "Catálogo amplo de teste",
    setor: "Catálogo integral de teste",
  }),
);
function documento(base = antiga): CompanyDocument {
  return {
    version: 1,
    nome: "Empresa informada",
    base: { patrimonio: 200000, receita: 100000, custos: 80000, investimento: 1000 },
    dados: { patrimonio: 200000, receita: 100000, custos: 80000, investimento: 1000 },
    janela: 3,
    linhas: [],
    hipoteses: { impostoPct: "0", retencaoPct: "100", retornoInvestimentoPct: "0" },
    mercadoCompleto: JSON.stringify(base),
    setor: "",
    demonstracao: false,
  };
}
test("novo acesso usa padrão amplo e antigo padrão salvo migra sem alterar dados próprios", () => {
  assert.equal(restaurarBenchmark(null, nova).completa, nova);
  const doc = documento();
  const copia = JSON.stringify(doc);
  const restaurada = restaurarBenchmark(doc, nova);
  assert.equal(restaurada.completa, nova);
  assert.match(restaurada.aviso!, /atualizado/);
  assert.equal(JSON.stringify(doc), copia);
});
test("migração preserva setor existente e não depende da ordem das empresas", () => {
  const doc = documento({ ...antiga, empresas: [...antiga.empresas].reverse() });
  doc.setor = antiga.empresas[0]!.setor!;
  const restaurada = restaurarBenchmark(doc, nova);
  assert.equal(restaurada.completa, nova);
  assert.equal(restaurada.selecionada.setor, doc.setor);
  assert.ok(restaurada.selecionada.empresas.every((e) => e.setor === doc.setor));
});
test("reconhece o padrão salvo pelo importador antigo que descartava o fluxo original", () => {
  const legada = {
    ...antiga,
    empresas: antiga.empresas.map(({ fluxoInvestimentoOriginal: _fluxo, ...empresa }) => empresa),
  };
  const restaurada = restaurarBenchmark(documento(legada), nova);
  assert.equal(restaurada.completa, nova);
  assert.match(restaurada.aviso!, /atualizado/);
});
test("uma importação própria com valores ou origem diferentes não é substituída", () => {
  for (const base of [
    { ...antiga, fonte: "Fonte própria" },
    {
      ...antiga,
      empresas: antiga.empresas.map((e, i) => (i ? e : { ...e, receita: e.receita + 1 })),
    },
    {
      ...antiga,
      empresas: antiga.empresas.map((e, i) =>
        i
          ? e
          : {
              ...e,
              fluxoInvestimentoOriginal: (e.fluxoInvestimentoOriginal ?? -e.investimento) + 1,
            },
      ),
    },
  ]) {
    const restaurada = restaurarBenchmark(documento(base), nova);
    assert.equal(restaurada.completa.fonte, base.fonte);
    assert.equal(restaurada.completa.empresas[0]!.receita, base.empresas[0]!.receita);
    assert.equal(
      restaurada.completa.empresas[0]!.fluxoInvestimentoOriginal,
      base.empresas[0]!.fluxoInvestimentoOriginal,
    );
    assert.equal(restaurada.aviso, null);
  }
});
