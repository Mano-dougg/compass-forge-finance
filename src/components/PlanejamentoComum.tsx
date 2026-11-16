import { useFinance } from "@/contexts/finance-state";
import { usePlanejamento } from "@/contexts/planejamento-state";
import { formatarReais as formatarMoeda, pct, type OrcamentoMetas } from "@/lib/planejamento-metas";
import { Button } from "./ui/button";

export function AvisoDados() {
  const { base, setModalAberto } = useFinance();
  if (base) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <p className="max-w-prose text-sm">
        <strong>Você está explorando uma empresa fictícia.</strong> Informe seus valores para
        planejar a sua empresa.
      </p>
      <Button variant="outline" onClick={() => setModalAberto(true)}>
        Informar minha empresa
      </Button>
    </div>
  );
}

export function ErroPlanejamento({ erro }: { erro: string | null }) {
  return erro ? (
    <p role="alert" className="my-5 rounded-lg border border-negative/40 p-4 text-negative">
      {erro} Revise os dados da empresa ou os parâmetros em Planejar metas.
    </p>
  ) : null;
}

export function ValoresOrcamento({ orcamento }: { orcamento: OrcamentoMetas }) {
  return (
    <dl className="mt-5 space-y-3">
      {[
        ["Receita por ano", orcamento.receita],
        ["Custos por ano", orcamento.custos],
        ["Resultado simplificado", orcamento.resultado],
        ["Distribuição aos sócios", orcamento.distribuicao],
        ["Retido por ano", orcamento.retido],
      ].map(([label, valor]) => (
        <div
          key={label}
          className="flex flex-wrap justify-between gap-x-3 gap-y-1 border-b border-border/70 pb-2"
        >
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="break-words text-right font-mono text-sm tabular-nums">
            {formatarMoeda(Number(valor))}
          </dd>
        </div>
      ))}
      <div className="pt-2">
        <dt className="text-xs text-muted">Patrimônio no fim do prazo</dt>
        <dd className="mt-1 break-words font-mono text-xl tabular-nums">
          {formatarMoeda(orcamento.patrimonioFinal)}
        </dd>
      </div>
    </dl>
  );
}

export function TabelaTrajetoria() {
  const { entrada, planejamento, resultado, escolhida } = usePlanejamento();
  if (!resultado) return null;
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[580px] text-sm">
        <caption className="p-4 text-left font-semibold">
          Patrimônio simulado ao fim de cada ano
        </caption>
        <thead className="bg-surface-2 text-xs text-muted">
          <tr>
            <th className="p-4 text-left">Ano</th>
            <th className="p-4 text-right">Sem mudanças</th>
            <th className="p-4 text-right">Orçamento escolhido</th>
            <th className="p-4 text-right">Diferença para o objetivo</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: planejamento.objetivo.anos + 1 }, (_, i) => {
            const r = i ? (resultado.referencia?.serie[i - 1] ?? null) : entrada.patrimonio;
            const e = escolhida ? (i ? escolhida.serie[i - 1]! : entrada.patrimonio) : null;
            return (
              <tr key={i} className="border-t border-border">
                <th className="p-4 text-left font-normal">
                  {planejamento.objetivo.anoBase + i}
                  {i === 0 ? " (base)" : ""}
                </th>
                <td className="p-4 text-right font-mono tabular-nums">
                  {r === null ? "Indisponível" : formatarMoeda(r)}
                </td>
                <td className="p-4 text-right font-mono text-primary tabular-nums">
                  {e === null ? "Sem escolha" : formatarMoeda(e)}
                </td>
                <td className="p-4 text-right font-mono tabular-nums">
                  {e === null ? "—" : formatarMoeda(e - planejamento.objetivo.patrimonioAlvo)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ReferenciaParesMetas() {
  const { resultado, mercado } = usePlanejamento();
  const resumo = resultado?.resumo;
  return (
    <section
      id="pares"
      className="mt-6 scroll-mt-80 rounded-xl border border-border bg-surface p-5 sm:scroll-mt-56 sm:p-6"
      aria-labelledby="titulo-pares"
    >
      <h2 id="titulo-pares" className="text-lg font-semibold">
        O que a amostra mostra
      </h2>
      <p className="mt-2 max-w-prose text-sm text-muted">
        {mercado ? `${mercado.setor} · ${mercado.periodo}.` : "Sem amostra real selecionada."} A
        opção C usa a mediana das proporções individuais de custos sobre receita.
      </p>
      <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Pares válidos", resumo ? `${resumo.validos} de ${resumo.recebidos}` : "Indisponível"],
          [
            "Custos/receita: mediana",
            resumo?.mediana != null ? pct(resumo.mediana) : "Indisponível",
          ],
          ["Primeiro quartil", resumo?.p25 != null ? pct(resumo.p25) : "Indisponível"],
          ["Terceiro quartil", resumo?.p75 != null ? pct(resumo.p75) : "Indisponível"],
        ].map(([label, valor]) => (
          <div key={label}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-2 font-mono text-xl tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 max-w-prose text-xs text-muted">
        {resumo?.excluidos
          ? `${resumo.excluidos} pares sem receita positiva, custos válidos ou precisão monetária compatível foram excluídos deste resumo. `
          : ""}
        Os quartis delimitam os 50% centrais das proporções observadas. Amostras pequenas, setores e
        portes distintos limitam a comparação; a proporção não comprova que o orçamento é
        executável.
      </p>
    </section>
  );
}
