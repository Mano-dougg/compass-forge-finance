import { createFileRoute, Link } from "@tanstack/react-router";
import { useFinance } from "@/contexts/finance-state";
import { BaseMercadoControl } from "@/components/BaseMercadoControl";
import { ComparativosMercado } from "@/components/ComparativosMercado";
import { PerfilCluster } from "@/components/DiagnosticoResumo";
import { DetalhesModeloPatrimonial } from "@/components/DetalhesModeloPatrimonial";
import { AvisoDados, ReferenciaParesMetas } from "@/components/PlanejamentoComum";
import { formatarReais } from "@/lib/planejamento-metas";
export const Route = createFileRoute("/analise-detalhada")({
  head: () => ({ meta: [{ title: "Análise detalhada · ATLAS.SAD" }] }),
  component: AnaliseDetalhada,
});
function AnaliseDetalhada() {
  const { mercado, setMercado, mercadoCompleto, setMercadoCompleto, base, dados } = useFinance();
  const entrada = base ?? dados;
  return (
    <>
      <AvisoDados />
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Entenda a referência antes de definir as metas
      </h1>
      <p className="mt-2 max-w-prose text-muted">
        Examine os pares, os perfis e a posição estrutural da empresa. O mercado é um contexto para
        a sua decisão, não uma obrigação de seguir a média.
      </p>
      <nav
        aria-label="Seções da análise detalhada"
        className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm text-primary"
      >
        {[
          ["base", "Base de referência"],
          ["pares", "Estatísticas dos pares"],
          ["mercado", "Gráficos e perfis"],
          ["modelo", "Modelo patrimonial"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="underline underline-offset-4">
            {label}
          </a>
        ))}
      </nav>
      <details
        id="base"
        className="mt-6 scroll-mt-80 rounded-lg border border-border bg-surface p-5 sm:scroll-mt-56"
      >
        <summary className="cursor-pointer rounded-sm text-lg font-semibold focus-visible:outline-2 focus-visible:outline-primary">
          Base de referência
        </summary>
        <div className="mt-4">
          <BaseMercadoControl
            base={mercado}
            onChange={setMercado}
            completa={mercadoCompleto}
            setCompleta={setMercadoCompleto}
          />
        </div>
      </details>
      <ReferenciaParesMetas />
      <section className="mt-6 rounded-lg border border-border p-5" aria-labelledby="valores-base">
        <h2 id="valores-base" className="text-lg font-semibold">
          Valores da empresa usados no benchmark
        </h2>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Patrimônio", entrada.patrimonio],
            ["Receita anual", entrada.receita],
            ["Custos anuais", entrada.custos],
            ["Investimento anual", entrada.investimento],
          ].map(([label, v]) => (
            <div key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="mt-2 break-words font-mono tabular-nums">
                {formatarReais(Number(v))}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section
        id="mercado"
        className="mt-8 scroll-mt-80 border-t border-border pt-6 sm:scroll-mt-56"
        aria-label="Gráficos e perfis da amostra"
      >
        <h2 className="text-xl font-semibold">Perfis do mercado e comparação visual</h2>
        <p className="my-4 max-w-prose text-sm text-muted">
          Os grupos descrevem semelhanças nas quatro variáveis. Não há ordenação de melhor ou pior;
          a opção C continua usando todos os pares da seleção.
        </p>
        {mercado?.centroides.length === 0 ? (
          <p role="status" className="rounded-lg border border-border p-5">
            Agrupamento indisponível: {mercado.erroClusters} As metas A e B e o orçamento manual
            continuam disponíveis.
          </p>
        ) : (
          <>
            <PerfilCluster />
            <ComparativosMercado />
          </>
        )}
      </section>
      <DetalhesModeloPatrimonial />
      <div className="mt-7 flex flex-wrap gap-5 border-t border-border pt-5 text-primary">
        <Link to="/simulador" className="underline underline-offset-4">
          Voltar à comparação de metas
        </Link>
        <Link to="/" hash="estrutura" className="underline underline-offset-4">
          Ver gap estrutural na visão geral
        </Link>
      </div>
    </>
  );
}
