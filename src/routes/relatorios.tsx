import { ANO_PREVISAO_PATRIMONIO } from "@/lib/patrimonio-historico";
import { CompraRevenda } from "@/components/CompraRevenda";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useFinance } from "@/contexts/finance-state";
import { gerarRelatorioPDF } from "@/lib/relatorio";
import { descricaoReferencia } from "@/lib/market-clusters";
import { formatarMoeda } from "@/lib/sad-model";
import { ComparativosMercado } from "@/components/ComparativosMercado";
import { GraficoPatrimonio } from "@/components/GraficoPatrimonio";
import { ResumoFinanceiro } from "@/components/ResumoFinanceiro";
import { AnaliseGaps } from "@/components/AnaliseGaps";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios · ATLAS.SAD" }] }),
  component: Relatorios,
});
function Relatorios() {
  const { dados, base, diagnostico, projecao, mercado, temporal, centroides, setAlerta } =
    useFinance();
  const [pronto, setPronto] = useState(false);
  const [falha, setFalha] = useState(false);
  useEffect(() => {
    setPronto(false);
    setFalha(false);
    const inicio = performance.now();
    let frame: number;
    function verificar() {
      const graficos = [...document.querySelectorAll("[data-report-chart]")].map((container) =>
        container.querySelector("svg.recharts-surface"),
      );
      if (
        graficos.length === (temporal ? 4 : 3) &&
        graficos.every(
          (g) => g && g.getBoundingClientRect().width > 0 && g.getBoundingClientRect().height > 0,
        )
      ) {
        setPronto(true);
        return;
      }
      if (performance.now() - inicio > 8000) {
        setFalha(true);
        return;
      }
      frame = requestAnimationFrame(verificar);
    }
    frame = requestAnimationFrame(verificar);
    return () => cancelAnimationFrame(frame);
  }, [dados, mercado, temporal]);
  function exportar() {
    try {
      const ok = gerarRelatorioPDF({ dados, base, diagnostico, projecao, mercado, temporal });
      setAlerta(
        ok
          ? null
          : "Não foi possível abrir a janela do relatório. Libere os pop-ups deste site e tente novamente.",
      );
    } catch {
      setAlerta("Falha ao gerar o relatório. Tente novamente em alguns instantes.");
    }
  }
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Relatório executivo
          </h1>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Revise o cenário e exporte o dossiê com diagnóstico, gráficos, gaps e plano de ação.
          </p>
        </div>
        <Button onClick={exportar} disabled={!pronto}>
          Exportar Relatório (PDF)
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted">
        Na janela de impressão, escolha Salvar como PDF.{" "}
        {pronto
          ? "Gráficos prontos para exportação."
          : falha
            ? "Não foi possível preparar os gráficos. Recarregue esta página para tentar novamente."
            : "Preparando gráficos…"}
      </p>
      <p className="mt-4 text-xs text-muted">{descricaoReferencia(mercado)}</p>
      <p className="mt-3 text-sm">
        Grupo de comparação: <strong className="text-primary">{diagnostico.perfil}</strong>, com{" "}
        {diagnostico.empresasNoCluster} empresas de referência.
      </p>
      <ComparativosMercado />
      <ResumoFinanceiro />
      <AnaliseGaps dados={dados} perfil={diagnostico.perfil} centroides={centroides} />
      <section
        className="mt-7 border-t border-border pt-5"
        aria-label="Patrimônio futuro no relatório"
      >
        <h2 className="font-medium">
          Patrimônio futuro a partir de {ANO_PREVISAO_PATRIMONIO} no dossiê
        </h2>
        {temporal ? (
          <>
            <p className="mt-3 text-sm">
              {temporal.empresa} · cenário inicial para {temporal.previsao.anoAlvo}:{" "}
              <strong className="font-mono text-primary">
                {formatarMoeda(temporal.previsao.comMudancas)}
              </strong>
              .
            </p>
            <p className="mt-2 text-xs text-muted">
              Sem mudanças: {formatarMoeda(temporal.previsao.semMudancas)}. Hipóteses: imposto{" "}
              {temporal.hipoteses.impostoPct}%, retenção {temporal.hipoteses.retencaoPct}% e retorno
              adicional {temporal.hipoteses.retornoInvestimentoPct}%. Cenário condicional, sem
              intervalo de confiança calibrado.
            </p>
            <GraficoPatrimonio diagnostico={temporal} />
          </>
        ) : (
          <p className="mt-3 text-xs text-muted">
            A previsão ainda não tem um histórico válido para o cenário atual.{" "}
            <Link to="/patrimonio-futuro" className="text-primary underline underline-offset-4">
              Preencha ou revise o histórico
            </Link>{" "}
            para incluí-la; o diagnóstico de mercado pode ser exportado agora.
          </p>
        )}
      </section>
      <CompraRevenda />
    </>
  );
}
