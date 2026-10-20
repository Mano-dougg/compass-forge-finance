import { ANO_BASE_PATRIMONIO, ANO_PREVISAO_PATRIMONIO } from "@/lib/patrimonio-historico";
import { CompraRevenda } from "@/components/CompraRevenda";
import { createFileRoute } from "@tanstack/react-router";
import { PrevisaoPatrimonio } from "@/components/PrevisaoPatrimonio";
import { SimuladorControles } from "@/components/SimuladorControles";
export const Route = createFileRoute("/patrimonio-futuro")({
  head: () => ({ meta: [{ title: "Patrimônio futuro · ATLAS.SAD" }] }),
  component: PatrimonioFuturo,
});
function PatrimonioFuturo() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Patrimônio futuro</h1>
      <p className="mt-2 text-sm text-muted">
        Projete de 1 a 5 anos a partir de {ANO_PREVISAO_PATRIMONIO}, usando {ANO_BASE_PATRIMONIO}
        como ano-base, seu histórico e as mudanças do cenário.
      </p>
      <details className="mt-5 rounded-lg border border-border bg-surface p-4">
        <summary className="cursor-pointer rounded-md font-medium focus-visible:outline-2 focus-visible:outline-primary">
          Ajustar cenário nesta página
        </summary>
        <SimuladorControles />
      </details>
      <PrevisaoPatrimonio />
      <CompraRevenda />
    </div>
  );
}
