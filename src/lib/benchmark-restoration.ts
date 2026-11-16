import pesquisa from "../../public/base-cvm-2026.json" with { type: "json" };
import type { CompanyDocument } from "./company-document.ts";
import { importarBaseMercado, selecionarSetor, type BaseMercado } from "./market-clusters.ts";

function assinaturaBase(base: BaseMercado) {
  return JSON.stringify([
    base.fonte,
    base.setor,
    base.periodo,
    base.dataReferencia ?? null,
    base.metodologia ?? null,
    base.cobertura?.selecionadas ?? null,
    base.cobertura?.excluidas ?? null,
    [...base.empresas]
      .sort((a, b) => a.empresa.localeCompare(b.empresa))
      .map((e) => [
        e.empresa,
        e.setor ?? null,
        e.patrimonio,
        e.receita,
        e.custos,
        e.investimento,
        e.fluxoInvestimentoOriginal ?? null,
      ]),
  ]);
}
const pesquisaNormalizada = importarBaseMercado(JSON.stringify(pesquisa));
const assinaturaPesquisa = assinaturaBase(pesquisaNormalizada);
// O importador publicado anteriormente não persistia o fluxo original.
const assinaturaPesquisaLegada = assinaturaBase({
  ...pesquisaNormalizada,
  empresas: pesquisaNormalizada.empresas.map(
    ({ fluxoInvestimentoOriginal: _fluxo, ...empresa }) => empresa,
  ),
});

/** Migra somente o snapshot padrão anterior; importações próprias permanecem preservadas. */
export function restaurarBenchmark(initial: CompanyDocument | null, padrao: BaseMercado) {
  const salva =
    !initial?.demonstracao && initial?.mercadoCompleto
      ? importarBaseMercado(initial.mercadoCompleto)
      : null;
  const migrada =
    salva !== null &&
    [assinaturaPesquisa, assinaturaPesquisaLegada].includes(assinaturaBase(salva)) &&
    assinaturaBase(padrao) !== assinaturaPesquisa;
  const completa = !salva || migrada ? padrao : salva;
  let selecionada = completa;
  let aviso: string | null = migrada
    ? "O benchmark padrão foi atualizado para o catálogo integral da B3 disponível no projeto. Os dados da empresa foram preservados; revise a comparação e confirme novamente seu orçamento."
    : null;
  if (!initial?.demonstracao && initial?.setor) {
    if (migrada && !completa.empresas.some((e) => e.setor === initial.setor)) {
      aviso +=
        " O setor salvo não tem pares válidos neste corte; a referência geral foi selecionada.";
    } else selecionada = selecionarSetor(completa, initial.setor);
  }
  return { completa, selecionada, aviso };
}
