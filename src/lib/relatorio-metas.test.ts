import test from "node:test";
import assert from "node:assert/strict";
import { montarRelatorioMetas, type RelatorioMetasEntrada } from "./relatorio-metas.ts";
import { companyDocumentSchema } from "./company-document.ts";
import { selecionarSetor, importarBaseMercado } from "./market-clusters.ts";
import { resumirPares } from "./planejamento-metas.ts";
import { readFileSync } from "node:fs";

test("relatório recalcula os mesmos centavos das telas e escapa os textos informados", () => {
  const args: RelatorioMetasEntrada = {
    base: { patrimonio: 200000, receita: 100000, custos: 80000, investimento: 100 },
    objetivo: { patrimonioAlvo: 230000, anos: 1, distribuicaoPct: 0, anoBase: 2026 },
    mercado: {
      fonte: "CVM",
      setor: "Pesquisa",
      periodo: "TTM",
      centroides: [],
      empresas: [0.5, 0.72, 0.9].map((q, i) => ({
        empresa: `Par ${i}`,
        patrimonio: 200000,
        receita: 100000,
        custos: 100000 * q,
        investimento: 100,
      })),
    },
    manual: { receita: 100000, custos: 80000 },
    escolha: "C",
    justificativa: '<script>alert("x")</script>',
    nome: "Empresa <teste>",
    exemplo: false,
  };
  const html = montarRelatorioMetas(args);
  assert.match(html, /230\.000,01/);
  assert.match(html, /2027/);
  assert.match(html, /72%/);
  assert.match(html, /Opção C \(escolhido\)/);
  assert.ok(!html.includes('<script>alert("x")</script>'));
  assert.match(html, /Empresa &lt;teste&gt;/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(montarRelatorioMetas({ ...args, escolha: null }), /Nenhum orçamento foi confirmado/);
  const comManualInvalido = montarRelatorioMetas({
    ...args,
    objetivo: { ...args.objetivo, anos: 50 },
    manual: { receita: 2e12, custos: 0 },
    escolha: null,
  });
  assert.match(comManualInvalido, /Orçamento personalizado indisponível/);
  assert.match(comManualInvalido, /Opção A/);
  const semReferencia = montarRelatorioMetas({
    ...args,
    base: { patrimonio: 0, receita: 2e12, custos: 0, investimento: 0 },
    objetivo: { ...args.objetivo, patrimonioAlvo: 1000000, anos: 50 },
    manual: { receita: 20000, custos: 0 },
    escolha: "manual",
  });
  assert.match(semReferencia, /Referência sem mudanças indisponível/);
  assert.match(semReferencia, /Orçamento manual confirmado/);
  assert.match(semReferencia, /1\.000\.000,00/);
});

test("setor com menos de três empresas mantém os pares sem inventar centróides", () => {
  const json = JSON.parse(
    readFileSync(new URL("../../public/base-mercado-exemplo.json", import.meta.url), "utf8"),
  );
  json.empresas = json.empresas.map((e: object, i: number) => ({
    ...e,
    setor: i < 2 ? "Pequeno" : "Outro",
  }));
  const base = importarBaseMercado(JSON.stringify(json));
  const pequena = selecionarSetor(base, "Pequeno");
  assert.equal(pequena.empresas.length, 2);
  assert.equal(pequena.centroides.length, 0);
  assert.ok(pequena.erroClusters);
  assert.equal(resumirPares(pequena.empresas).validos, 2);
  assert.equal(selecionarSetor(base, ""), base);
  assert.equal(selecionarSetor(base, "Inexistente").empresas.length, 0);
});

test("documento antigo permanece legível e novo plano sobrevive ao ciclo de serialização", () => {
  const doc = {
    version: 1,
    base: null,
    dados: { receita: 100, custos: 50, patrimonio: -10, investimento: 0 },
    nome: "Empresa",
    janela: 3,
    linhas: [],
    hipoteses: { impostoPct: "0", retencaoPct: "100", retornoInvestimentoPct: "0" },
    mercadoCompleto: null,
    setor: "",
    demonstracao: false,
  };
  assert.ok(companyDocumentSchema.safeParse(doc).success);
  const planejamento = {
    objetivo: { patrimonioAlvo: 200, anos: 10, distribuicaoPct: 12.5, anoBase: 2026 },
    manual: { receita: 200, custos: 100 },
    escolha: "manual",
    assinatura: "[dados]",
    justificativa: "Manter capacidade",
  };
  const restaurado = companyDocumentSchema.parse(
    JSON.parse(JSON.stringify({ ...doc, planejamento })),
  );
  assert.deepEqual(restaurado.planejamento, planejamento);
  assert.ok(
    !companyDocumentSchema.safeParse({
      ...doc,
      planejamento: { ...planejamento, objetivo: { ...planejamento.objetivo, anos: 0 } },
    }).success,
  );
});
