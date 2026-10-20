import { ComparacaoReceita } from "@/components/ComparacaoReceita";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useFinance } from "@/contexts/finance-state";
import { BaseMercadoControl } from "@/components/BaseMercadoControl";
import { ComparativosMercado } from "@/components/ComparativosMercado";
import { AnaliseGaps } from "@/components/AnaliseGaps";
import {
  PerfilCluster,
  PosicaoEstrutural,
  RecomendacoesEstrategicas,
} from "@/components/DiagnosticoResumo";
import { ResumoFinanceiro } from "@/components/ResumoFinanceiro";

export const Route = createFileRoute("/")({
  codeSplitGroupings: [["loader", "component"]],
  head: () => ({
    meta: [
      { title: "Diagnóstico · ATLAS.SAD" },
      {
        name: "description",
        content: "Diagnóstico financeiro, patrimônio e comparação da empresa com o mercado.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const {
    mercado,
    setMercado,
    mercadoCompleto,
    setMercadoCompleto,
    dados,
    diagnostico,
    centroides,
  } = useFinance();
  return (
    <>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Diagnóstico da empresa</h1>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
        Veja primeiro o patrimônio e o gap estrutural da sua empresa. Depois, acompanhe custos,
        investimentos e a comparação com o mercado. Os valores acompanham as mudanças do simulador.
      </p>
      <nav
        aria-label="Seções do diagnóstico"
        className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-primary"
      >
        <a
          href="#patrimonio"
          className="rounded-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
        >
          Patrimônio e gap estrutural
        </a>
        <a
          href="#resumo"
          className="rounded-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
        >
          Custos e investimento
        </a>
        <a
          href="#mercado"
          className="rounded-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
        >
          Comparação com o mercado
        </a>
      </nav>
      <div id="patrimonio" className="mt-6 scroll-mt-64 sm:scroll-mt-44">
        <PosicaoEstrutural />
      </div>
      <details className="mt-4 text-xs text-muted">
        <summary className="cursor-pointer rounded-sm text-primary focus-visible:outline-2 focus-visible:outline-primary">
          Ver fonte, escolher setor ou importar outra base
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
      <div id="resumo" className="scroll-mt-64 sm:scroll-mt-44">
        <ComparacaoReceita />
      </div>
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)]">
        <PerfilCluster />
        <div className="min-w-0">
          <ResumoFinanceiro />
        </div>
      </div>
      <section
        id="mercado"
        className="mt-7 scroll-mt-64 border-t border-border pt-5 sm:scroll-mt-44"
        aria-labelledby="titulo-mercado"
      >
        <h2 id="titulo-mercado" className="text-xl font-semibold tracking-tight">
          Compare sua empresa com o mercado
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
          Veja onde sua empresa aparece entre os grupos e compare os valores de receita, custos,
          investimento e patrimônio. A comparação por R$ 100 de receita está na seção de custos e
          investimento.
        </p>
        <ComparativosMercado incluirReceita={false} />
        <AnaliseGaps dados={dados} perfil={diagnostico.perfil} centroides={centroides} />
        <div className="mt-5">
          <RecomendacoesEstrategicas />
        </div>
      </section>
      <section className="mt-7 border-t border-border pt-5" aria-label="Próximas análises">
        <h2 className="font-medium">Continue a análise</h2>
        <div className="mt-3 divide-y divide-border">
          {[
            {
              to: "/simulador",
              titulo: "Testar um cenário",
              descricao: "Ajuste os dados e acompanhe a classificação e a estrutura de capital.",
            },
            {
              to: "/patrimonio-futuro",
              titulo: "Estimar o patrimônio futuro",
              descricao: "Use o histórico da empresa e as hipóteses para avaliar o próximo ano.",
            },
          ].map((p) => (
            <Link
              key={p.to}
              to={p.to}
              className="block rounded-md py-4 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span className="font-medium text-primary">{p.titulo} →</span>
              <span className="mt-1 block text-xs text-muted">{p.descricao}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
