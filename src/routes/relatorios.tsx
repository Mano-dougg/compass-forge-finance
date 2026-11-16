import { nomeOrcamento } from "@/lib/planejamento-metas";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePlanejamento } from "@/contexts/planejamento-state";
import { GraficoMetas } from "@/components/GraficoMetas";
import {
  AvisoDados,
  ErroPlanejamento,
  ValoresOrcamento,
  TabelaTrajetoria,
  ReferenciaParesMetas,
} from "@/components/PlanejamentoComum";
import { exportarRelatorioMetas } from "@/lib/relatorio-metas";
import { formatarReais } from "@/lib/planejamento-metas";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatório do plano · ATLAS.SAD" }] }),
  component: Relatorios,
});
function Relatorios() {
  const { entrada, resultado, planejamento, escolhida, mercado, nome, base, erro, assinatura } =
    usePlanejamento();
  const [pronto, setPronto] = useState(false);
  const [erroExportacao, setErroExportacao] = useState("");
  const resultadoDisponivel = resultado !== null;
  useEffect(() => {
    setPronto(false);
    let frame: number;
    const inicio = performance.now();
    function conferir() {
      const svg = document.querySelector("[data-report-chart] svg.recharts-surface");
      if (svg && svg.getBoundingClientRect().width > 0 && svg.getBoundingClientRect().height > 0) {
        setPronto(true);
        return;
      }
      if (performance.now() - inicio > 8000) {
        setErroExportacao("O gráfico não ficou pronto. Recarregue a página para tentar novamente.");
        return;
      }
      frame = requestAnimationFrame(conferir);
    }
    if (resultadoDisponivel) frame = requestAnimationFrame(conferir);
    return () => cancelAnimationFrame(frame);
  }, [assinatura, resultadoDisponivel]);
  function exportar() {
    try {
      const ok = exportarRelatorioMetas({
        base: entrada,
        objetivo: planejamento.objetivo,
        mercado,
        manual: planejamento.manual,
        escolha: escolhida ? planejamento.escolha : null,
        justificativa: planejamento.justificativa,
        nome: nome || (base ? "Empresa informada" : "Empresa fictícia"),
        exemplo: !base,
      });
      setErroExportacao(ok ? "" : "Permita a abertura da janela de impressão e tente novamente.");
    } catch (e) {
      setErroExportacao(e instanceof Error ? e.message : "Não foi possível gerar o relatório.");
    }
  }
  return (
    <>
      <AvisoDados />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            O plano e as razões da sua escolha
          </h1>
          <p className="mt-2 max-w-prose text-muted">
            Revise objetivo, orçamento e premissas antes de compartilhar o relatório.
          </p>
        </div>
        <Button disabled={!pronto || !resultado} onClick={exportar}>
          Exportar plano em PDF
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted">
        Na janela de impressão, escolha Salvar como PDF.{" "}
        {!pronto
          ? "Preparando gráfico…"
          : "O relatório inclui uma imagem do gráfico e os valores anuais."}
      </p>
      <ErroPlanejamento erro={erro} />
      {erroExportacao && (
        <p role="alert" className="mt-4 text-negative">
          {erroExportacao}
        </p>
      )}
      <section className="mt-6 grid gap-6 rounded-xl border border-border bg-surface p-5 sm:p-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Objetivo do planejamento</h2>
          <p className="mt-3">
            Partir de <strong>{formatarReais(entrada.patrimonio)}</strong> em{" "}
            {planejamento.objetivo.anoBase} para{" "}
            <strong className="text-primary">
              {formatarReais(planejamento.objetivo.patrimonioAlvo)}
            </strong>{" "}
            em {planejamento.objetivo.anoBase + planejamento.objetivo.anos}.
          </p>
          <p className="mt-3 text-sm text-muted">
            Prazo: {planejamento.objetivo.anos} ano(s). Distribuição:{" "}
            {planejamento.objetivo.distribuicaoPct.toLocaleString("pt-BR")}% do resultado positivo.
            Mesmos valores anuais de receita e custos durante todo o prazo.
          </p>
          <h3 className="mt-6 font-semibold">
            {escolhida ? nomeOrcamento(planejamento.escolha) : "Orçamento ainda não confirmado"}
          </h3>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted">
            {planejamento.justificativa ||
              "Justificativa não preenchida. A escolha final é do gestor."}
          </p>
        </div>
        <div>
          {escolhida ? (
            <ValoresOrcamento orcamento={escolhida} />
          ) : (
            <p className="text-sm text-muted">
              O PDF pode ser exportado como comparação de alternativas. Para registrar uma decisão,
              escolha ou confirme um orçamento em Planejar metas.
            </p>
          )}
        </div>
      </section>
      {resultado && (
        <>
          <section
            className="mt-6 rounded-xl border border-border bg-surface p-4 sm:p-6"
            aria-label="Trajetória do relatório"
          >
            <GraficoMetas
              patrimonio={entrada.patrimonio}
              objetivo={planejamento.objetivo}
              referencia={resultado.referencia}
              escolhida={escolhida}
            />
          </section>
          <TabelaTrajetoria />
        </>
      )}
      <ReferenciaParesMetas />
      <p className="mt-6 max-w-prose text-xs leading-relaxed text-muted">
        Uso educacional. O resultado simplificado não é lucro líquido contábil. O plano não inclui
        inflação, aportes ou outras mutações do patrimônio. O benchmark não valida a viabilidade
        comercial das metas.
      </p>
    </>
  );
}
