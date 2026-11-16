import { Link } from "@tanstack/react-router";
import { ArrowRight, Target } from "lucide-react";
import { usePlanejamento } from "@/contexts/planejamento-state";
import { formatarReais as formatarMoeda, nomeOrcamento, pct } from "@/lib/planejamento-metas";
import { Button } from "./ui/button";
import { GraficoMetas } from "./GraficoMetas";
import { AvisoDados, ErroPlanejamento } from "./PlanejamentoComum";

export function ResumoPlanejamento() {
  const { entrada, planejamento, resultado, escolhida, erro } = usePlanejamento();
  const objetivo = planejamento.objetivo;
  return (
    <>
      <AvisoDados />
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Um plano para o seu patrimônio
          </h1>
          <p className="mt-2 max-w-prose text-muted">
            Entenda o ponto de partida e compare as metas anuais para chegar onde você quer.
          </p>
        </div>
        <Button asChild>
          <Link to="/simulador">
            Planejar metas <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <ErroPlanejamento erro={erro} />
      <section
        aria-labelledby="resumo-patrimonial"
        className="mt-7 rounded-xl border border-border bg-surface p-5 sm:p-7"
      >
        <h2 id="resumo-patrimonial" className="text-lg font-semibold">
          Do patrimônio atual ao seu objetivo
        </h2>
        <div className="mt-5 grid items-center gap-5 md:grid-cols-[1fr_auto_1fr]">
          <div>
            <p className="text-muted">Hoje · base {objetivo.anoBase}</p>
            <p className="mt-2 break-words font-mono text-2xl tabular-nums">
              {formatarMoeda(entrada.patrimonio)}
            </p>
          </div>
          <ArrowRight aria-hidden="true" className="hidden text-muted md:block" />
          <div className="border-l-2 border-primary pl-5">
            <p className="text-muted">
              Objetivo em {objetivo.anoBase + objetivo.anos} · {objetivo.anos} ano(s)
            </p>
            <p className="mt-2 break-words font-mono text-2xl text-primary tabular-nums">
              {formatarMoeda(objetivo.patrimonioAlvo)}
            </p>
          </div>
        </div>
        {resultado?.referencia && (
          <div className="mt-6 border-t border-border pt-5">
            <p>
              Sem mudar o orçamento, o patrimônio simulado ao final seria{" "}
              <strong>{formatarMoeda(resultado.referencia.patrimonioFinal)}</strong>.
            </p>
            <p className="mt-2 max-w-prose text-xs text-muted">
              {resultado.referencia.patrimonioFinal >= objetivo.patrimonioAlvo
                ? "A referência sem mudanças já atende ao objetivo nas hipóteses escolhidas. Você pode mantê-la ou comparar outros orçamentos."
                : `Faltariam ${formatarMoeda(objetivo.patrimonioAlvo - resultado.referencia.patrimonioFinal)} para o objetivo. Compare diferentes combinações de receita e custos antes de escolher.`}
            </p>
          </div>
        )}
      </section>
      {resultado?.erroReferencia && (
        <p role="status" className="mt-4 text-muted">
          Referência sem mudanças indisponível: {resultado.erroReferencia} Compare as alternativas
          ou um orçamento próprio.
        </p>
      )}
      <section aria-label="Orçamento anual informado" className="mt-6 grid gap-5 sm:grid-cols-3">
        {[
          { label: "Receita anual", valor: entrada.receita, detalhe: "Receita líquida informada" },
          {
            label: "Custos e despesas anuais",
            valor: entrada.custos,
            detalhe:
              entrada.receita > 0
                ? `${pct(entrada.custos / entrada.receita)} da receita`
                : "Proporção indisponível com receita zero",
          },
          {
            label: "Resultado simplificado anual",
            valor: entrada.receita - entrada.custos,
            detalhe: "Receita menos custos e despesas",
          },
        ].map((item) => (
          <div key={item.label} className="border-t border-border pt-4">
            <h2 className="text-sm text-muted">{item.label}</h2>
            <p className="mt-2 break-words font-mono text-xl tabular-nums">
              {formatarMoeda(item.valor)}
            </p>
            <p className="mt-1 text-xs text-muted">{item.detalhe}</p>
          </div>
        ))}
      </section>
      {resultado && (
        <section
          className="mt-8 grid items-start gap-7 border-t border-border pt-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]"
          aria-labelledby="trajetoria-resumo"
        >
          <div className="min-w-0">
            <h2 id="trajetoria-resumo" className="mb-4 text-lg font-semibold">
              O caminho até o objetivo
            </h2>
            <GraficoMetas
              patrimonio={entrada.patrimonio}
              objetivo={objetivo}
              referencia={resultado.referencia}
              escolhida={escolhida}
            />
          </div>
          <div className="rounded-lg border border-border p-5">
            <Target aria-hidden="true" className="mb-3 text-primary" />
            <h2 className="text-lg font-semibold">
              {escolhida ? "Seu orçamento escolhido" : "A decisão continua com você"}
            </h2>
            <p className="mt-3 text-sm text-muted">
              {escolhida
                ? nomeOrcamento(planejamento.escolha)
                : "Compare opções que mantêm seus custos, mantêm sua receita ou usam a proporção de custos dos pares. Nenhuma é escolhida automaticamente."}
            </p>
            {escolhida && (
              <p className="mt-4 text-sm">
                Retenção anual: <strong>{formatarMoeda(escolhida.retido)}</strong>.
              </p>
            )}
            <Link
              to="/simulador"
              className="mt-5 inline-block text-primary underline underline-offset-4"
            >
              {escolhida ? "Revisar minha escolha" : "Comparar orçamentos"}
            </Link>
          </div>
        </section>
      )}
    </>
  );
}

export function EficienciaResumoMetas() {
  const { entrada, resultado } = usePlanejamento();
  const custoAtual = entrada.receita > 0 ? (100 * entrada.custos) / entrada.receita : null;
  const mercado = resultado?.resumo.mediana;
  return (
    <section className="mt-7 border-t border-border pt-6" aria-labelledby="eficiencia-metas">
      <h2 id="eficiencia-metas" className="text-lg font-semibold">
        Para cada R$ 100 de receita
      </h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-3">
        {[
          [
            "Custos da sua empresa",
            custoAtual === null ? "Indisponível" : formatarMoeda(custoAtual),
            "Custos e despesas informados",
          ],
          [
            "Custos na referência",
            mercado == null ? "Indisponível" : formatarMoeda(100 * mercado),
            "Mediana de todos os pares selecionados",
          ],
          [
            "Investimento da sua empresa",
            entrada.receita > 0
              ? formatarMoeda((100 * entrada.investimento) / entrada.receita)
              : "Indisponível",
            "Somente no benchmark; não compõe as metas",
          ],
        ].map(([label, valor, descricao]) => (
          <div key={label} className="border-l border-border pl-4">
            <h3 className="text-sm text-muted">{label}</h3>
            <p className="mt-2 font-mono text-xl tabular-nums">{valor}</p>
            <p className="mt-1 text-xs text-muted">{descricao}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 max-w-prose text-xs text-muted">
        Custos menores proporcionalmente deixam mais receita após as despesas informadas. Essa
        comparação isolada não avalia qualidade, demanda ou saúde financeira completa.
      </p>
    </section>
  );
}
