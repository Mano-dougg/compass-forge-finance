import { ComparacaoReceita } from "@/components/ComparacaoReceita";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SimuladorControles } from "@/components/SimuladorControles";
import { PosicaoEstrutural } from "@/components/DiagnosticoResumo";
export const Route = createFileRoute("/simulador")({
  head: () => ({ meta: [{ title: "Simulador · ATLAS.SAD" }] }),
  component: Simulador,
});
function Simulador() {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Simulador de cenários</h1>
      <p className="mt-2 text-sm text-muted">
        Ajuste receita, custos, investimento e patrimônio. O cenário é compartilhado com todas as
        análises.
      </p>
      <SimuladorControles />
      <ComparacaoReceita />
      <PosicaoEstrutural />
      <p className="mt-6 text-sm">
        <Link
          to="/patrimonio-futuro"
          className="rounded-md text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
        >
          Avaliar este cenário no patrimônio futuro →
        </Link>
      </p>
    </>
  );
}
