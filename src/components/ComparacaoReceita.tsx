import { ClientOnly } from "@tanstack/react-router";
import { useFinance } from "@/contexts/finance-state";
import { GraficoBarras } from "@/components/GraficosComparativos";
import { LeituraFinanceira } from "@/components/LeituraFinanceira";

/** The picture and its interpretation use the same reference and update together. */
export function ComparacaoReceita() {
  const { dados: cenarioLegado, base, diagnostico, centroides } = useFinance();
  const dados = base ?? cenarioLegado;
  if (dados.receita <= 0)
    return (
      <p className="my-6 rounded-lg border border-border p-5 text-muted">
        A comparação por R$ 100 de receita está indisponível com receita zero. Os valores absolutos
        continuam disponíveis.
      </p>
    );
  return (
    <section
      data-report-chart="Quanto da receita vai para custos e investimento"
      className="my-6 rounded-lg border border-border bg-surface p-5"
    >
      <h2 className="text-lg font-semibold">
        Custos e investimento: veja a comparação e entenda o resultado
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {base
          ? "O gráfico e as explicações usam os dados informados da empresa."
          : "Os valores do gráfico são um exemplo até você informar seus dados."}{" "}
        As barras colocam sua empresa e o grupo na mesma escala: R$ 100 de receita.
      </p>
      <div className="mt-5 grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="min-w-0">
          <h3 className="mb-3 text-base font-medium">Para onde vão os seus R$ 100 de receita?</h3>
          <ClientOnly fallback={<div className="h-[220px]" />}>
            <GraficoBarras dados={dados} diagnostico={diagnostico} centroides={centroides} />
          </ClientOnly>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            40% na barra significa R$ 40 de cada R$ 100 de receita. Compare as duas barras de custos
            entre si e depois as duas de investimento. São comparações separadas; não precisam somar
            100%.
          </p>
        </div>
        <LeituraFinanceira compacta />
      </div>
    </section>
  );
}
