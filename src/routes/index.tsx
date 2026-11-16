import { useEffect } from "react";
import { createFileRoute, Link, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { PosicaoEstrutural } from "@/components/DiagnosticoResumo";
import { ResumoPlanejamento, EficienciaResumoMetas } from "@/components/PlanejamentoResumo";

export const Route = createFileRoute("/")({
  codeSplitGroupings: [["loader", "component"]],
  beforeLoad: ({ location }) => {
    const hash = location.hash.replace(/^#/, "");
    if (hash === "mercado" || hash === "ordenacao-grupos")
      throw redirect({ to: "/analise-detalhada", hash: "mercado", replace: true });
  },
  head: () => ({
    meta: [
      { title: "Visão geral · ATLAS.SAD" },
      {
        name: "description",
        content: "Planeje metas anuais de receita e custos para buscar seu objetivo patrimonial.",
      },
    ],
  }),
  component: Index,
});
function Index() {
  const hash = useLocation({ select: (location) => location.hash.replace(/^#/, "") });
  const navigate = useNavigate();
  useEffect(() => {
    if (hash === "mercado" || hash === "ordenacao-grupos")
      void navigate({ to: "/analise-detalhada", hash: "mercado", replace: true });
  }, [hash, navigate]);
  return (
    <>
      <ResumoPlanejamento />
      <EficienciaResumoMetas />
      <section
        id="estrutura"
        className="mt-8 scroll-mt-80 border-t border-border pt-6 sm:scroll-mt-56"
        aria-label="Gap estrutural como contexto do benchmark"
      >
        <h2 className="mb-3 text-lg font-semibold">
          Como o patrimônio se compara à referência estatística
        </h2>
        <p className="mb-4 max-w-prose text-sm text-muted">
          Uma leitura complementar da amostra. Esta referência não define o objetivo nem prevê seu
          patrimônio futuro.
        </p>
        <PosicaoEstrutural />
      </section>
      <div className="mt-6 border-t border-border pt-5">
        <Link to="/analise-detalhada" className="text-primary underline underline-offset-4">
          Examinar custos, investimento e grupos do mercado
        </Link>
        <p className="mt-2 max-w-prose text-xs text-muted">
          Modelo educacional de apoio à decisão. O gestor escolhe as metas; os resultados dependem
          das hipóteses.
        </p>
      </div>
    </>
  );
}
