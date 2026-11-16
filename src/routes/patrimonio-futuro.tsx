import { nomeOrcamento } from "@/lib/planejamento-metas";
import { createFileRoute, Link } from "@tanstack/react-router";
import { usePlanejamento } from "@/contexts/planejamento-state";
import { GraficoMetas } from "@/components/GraficoMetas";
import {
  AvisoDados,
  ErroPlanejamento,
  TabelaTrajetoria,
  ValoresOrcamento,
} from "@/components/PlanejamentoComum";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/patrimonio-futuro")({
  head: () => ({ meta: [{ title: "Trajetória patrimonial · ATLAS.SAD" }] }),
  component: PatrimonioFuturo,
});
function PatrimonioFuturo() {
  const { entrada, planejamento, resultado, escolhida, erro } = usePlanejamento();
  return (
    <>
      <AvisoDados />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Seu plano, ano a ano
          </h1>
          <p className="mt-2 max-w-prose text-muted">
            Veja o efeito de repetir o mesmo orçamento anual por {planejamento.objetivo.anos}{" "}
            ano(s), a partir de {planejamento.objetivo.anoBase + 1}.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/simulador">Revisar metas</Link>
        </Button>
      </div>
      <ErroPlanejamento erro={erro} />
      {!escolhida && (
        <p role="status" className="mt-6 rounded-lg border border-primary/30 p-4">
          {resultado?.referencia
            ? "A referência sem mudanças está disponível."
            : `Referência sem mudanças indisponível: ${resultado?.erroReferencia ?? erro}`}{" "}
          Escolha ou confirme um orçamento em Planejar metas para comparar sua trajetória.
        </p>
      )}
      {resultado && (
        <>
          <section
            className="mt-6 rounded-xl border border-border bg-surface p-4 sm:p-7"
            aria-label="Gráfico da trajetória patrimonial"
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
      {escolhida && (
        <section className="mt-6 grid gap-5 rounded-lg border border-border p-5 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold">{nomeOrcamento(planejamento.escolha)}</h2>
            <p className="mt-3 max-w-prose text-sm text-muted">
              O resultado retido é somado ao patrimônio em cada ano. O prejuízo reduz o patrimônio
              integralmente; a distribuição só ocorre sobre resultado positivo.
            </p>
            <Link
              to="/relatorios"
              className="mt-4 inline-block text-primary underline underline-offset-4"
            >
              Revisar e exportar este plano
            </Link>
          </div>
          <ValoresOrcamento orcamento={escolhida} />
        </section>
      )}
    </>
  );
}
