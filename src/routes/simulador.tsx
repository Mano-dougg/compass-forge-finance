import { createFileRoute, Link } from "@tanstack/react-router";
import { AvisoDados } from "@/components/PlanejamentoComum";
import {
  FormularioObjetivo,
  OrcamentoPersonalizado,
  EscolhaGestor,
} from "@/components/PlanejamentoMetas";
import { CompararMetas } from "@/components/PlanejamentoAlternativas";
export const Route = createFileRoute("/simulador")({
  head: () => ({ meta: [{ title: "Planejar metas · ATLAS.SAD" }] }),
  component: PlanejarMetas,
});
function PlanejarMetas() {
  return (
    <>
      <AvisoDados />
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Que metas anuais levam ao seu objetivo?
      </h1>
      <p className="mt-2 max-w-prose text-muted">
        Parta do patrimônio desejado e do prazo. Compare combinações de receita e custos, avalie o
        esforço e escolha seu orçamento.
      </p>
      <FormularioObjetivo />
      <p className="mt-4 text-xs text-muted">
        A opção de mercado usa toda a seleção geral ou setorial, sem filtrar pelo grupo mais
        próximo.{" "}
        <Link
          to="/analise-detalhada"
          hash="base"
          className="text-primary underline underline-offset-4"
        >
          Revisar base de referência
        </Link>
        .
      </p>
      <CompararMetas />
      <OrcamentoPersonalizado />
      <EscolhaGestor />
    </>
  );
}
