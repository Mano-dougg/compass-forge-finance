import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ObjetivoMetas, OrcamentoMetas } from "@/lib/planejamento-metas";
import { formatarReais as formatarMoeda } from "@/lib/planejamento-metas";

export function GraficoMetas({
  patrimonio,
  objetivo,
  referencia,
  escolhida,
}: {
  patrimonio: number;
  objetivo: ObjetivoMetas;
  referencia: OrcamentoMetas | null;
  escolhida: OrcamentoMetas | null;
}) {
  const pontos = Array.from({ length: objetivo.anos + 1 }, (_, i) => ({
    ano: objetivo.anoBase + i,
    referencia: referencia ? (i ? referencia.serie[i - 1] : patrimonio) : undefined,
    escolhida: escolhida ? (i ? escolhida.serie[i - 1] : patrimonio) : undefined,
    alvo: objetivo.patrimonioAlvo,
  }));
  return (
    <figure data-report-chart="Trajetória patrimonial do orçamento anual" className="min-w-0">
      <div
        role="img"
        aria-label="Trajetória do patrimônio: referência sem mudanças, objetivo e orçamento escolhido. Valores completos na tabela anual."
        className="h-72 w-full sm:h-80"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pontos} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
            <XAxis dataKey="ano" stroke="var(--muted)" tick={{ fontSize: 14 }} minTickGap={24} />
            <YAxis
              width={78}
              stroke="var(--muted)"
              tick={{ fontSize: 13 }}
              tickFormatter={(v: number) =>
                new Intl.NumberFormat("pt-BR", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(v)
              }
            />
            <Tooltip
              formatter={(v: number) => formatarMoeda(v)}
              labelFormatter={(ano) => `Ano ${ano}`}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--foreground)",
              }}
            />
            <Legend wrapperStyle={{ paddingTop: 16, fontSize: 14 }} />
            <Line
              type="linear"
              dataKey="alvo"
              name="Patrimônio desejado"
              stroke="var(--positive)"
              strokeDasharray="6 6"
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
            {referencia && (
              <Line
                type="linear"
                dataKey="referencia"
                name="Sem mudanças"
                stroke="var(--muted)"
                dot={objetivo.anos <= 10}
                strokeWidth={2}
                isAnimationActive={false}
              />
            )}
            {escolhida && (
              <Line
                type="linear"
                dataKey="escolhida"
                name="Orçamento escolhido"
                stroke="var(--primary)"
                dot={objetivo.anos <= 10}
                strokeWidth={3}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-4 max-w-prose text-xs leading-relaxed text-muted">
        Orçamento anual constante, em valores nominais. O gráfico mostra consequências das
        hipóteses, sem estimar demanda, inflação ou probabilidade de atingir o objetivo.
      </figcaption>
    </figure>
  );
}
