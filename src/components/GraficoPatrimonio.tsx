import { ClientOnly } from "@tanstack/react-router";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarMoeda } from "@/lib/sad-model";
import { type DiagnosticoTemporal } from "@/lib/patrimonio-historico";
export function GraficoPatrimonio({ diagnostico }: { diagnostico: DiagnosticoTemporal }) {
  const p = diagnostico.previsao;
  const ultimoAno = p.projecoes.at(-1)!;
  const periodo = p.horizonte === 1 ? String(p.anoAlvo) : `${p.anoAlvo}–${p.anoFinal}`;
  const grafico = p
    ? [
        ...p.historico.map((o) => ({
          ano: o.ano,
          realizado: o.patrimonio,
          referencia: o.ano === p.ultimoHistorico.ano ? o.patrimonio : null,
          cenario: o.ano === p.ultimoHistorico.ano ? o.patrimonio : null,
        })),
        ...p.projecoes.map((ano) => ({
          ano: ano.ano,
          realizado: null,
          referencia: ano.semMudancas,
          cenario: ano.comMudancas,
        })),
      ]
    : [];
  return (
    <div
      data-report-chart={`Patrimônio da empresa · histórico e cenários ${periodo}`}
      className="mt-4"
    >
      <div className="mb-4 max-w-prose text-sm leading-relaxed">
        <h3 className="font-medium">Como ler a previsão para {periodo}</h3>
        <p className="mt-2">
          Em {p.anoFinal}, mantendo a variação média do histórico, o cenário sem mudanças chega a{" "}
          <strong>{formatarMoeda(ultimoAno.semMudancas)}</strong>. Com os ajustes e hipóteses
          informados, o cenário chega a <strong>{formatarMoeda(ultimoAno.comMudancas)}</strong>.
        </p>
        <p className="mt-2 text-muted">
          A linha clara mostra os anos que você informou. As linhas tracejadas mostram os dois
          cenários de {p.anoAlvo} até {p.anoFinal}. A variação histórica e o efeito operacional
          simulado se repetem a cada ano; o aporte ou a retirada entra uma única vez. São
          extrapolações condicionais, sem juros compostos nem intervalo de confiança calibrado. Anos
          mais distantes envolvem maior incerteza.
        </p>
      </div>
      <ClientOnly fallback={<div className="h-[260px]" />}>
        <div
          className="h-[260px] w-full"
          aria-label={`Histórico próprio de patrimônio e cenários de ${p.anoAlvo} até ${p.anoFinal}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={grafico} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
              <XAxis
                dataKey="ano"
                interval="preserveStartEnd"
                tick={{ fill: "var(--muted)", fontSize: 11 }}
              />
              <YAxis
                width={75}
                tickFormatter={(v: number) =>
                  `${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
                }
                tick={{ fill: "var(--muted)", fontSize: 10 }}
              />
              <Tooltip
                position={{ x: 0, y: 0 }}
                isAnimationActive={false}
                formatter={(v: number) => formatarMoeda(v)}
                contentStyle={{
                  background: "var(--surface)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                isAnimationActive={false}
                dataKey="realizado"
                name="Patrimônio que você informou"
                stroke="var(--foreground)"
                strokeWidth={2}
              />
              <Line
                isAnimationActive={false}
                dataKey="referencia"
                name="Sem mudanças"
                stroke="var(--muted)"
                strokeDasharray="3 3"
              />
              <Line
                isAnimationActive={false}
                dataKey="cenario"
                name="Com mudanças e hipóteses"
                stroke="var(--primary)"
                strokeWidth={2}
                strokeDasharray="5 4"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ClientOnly>
      <div
        className="mt-5 overflow-x-auto"
        role="region"
        aria-label="Valores projetados ano a ano"
        tabIndex={0}
      >
        <table className="w-full text-left text-xs">
          <caption className="mb-3 text-left font-medium">Patrimônio projetado ano a ano</caption>
          <thead>
            <tr className="border-b border-border text-muted">
              <th scope="col" className="py-2 pr-3">
                Ano
              </th>
              <th scope="col" className="px-2 py-2 text-right">
                Sem mudanças
              </th>
              <th scope="col" className="py-2 pl-2 text-right">
                Com mudanças
              </th>
            </tr>
          </thead>
          <tbody>
            {p.projecoes.map((ano) => (
              <tr key={ano.ano} className="border-b border-border">
                <th scope="row" className="py-3 pr-3 font-normal">
                  {ano.ano}
                </th>
                <td className="px-2 py-3 text-right font-mono tabular-nums">
                  {formatarMoeda(ano.semMudancas)}
                </td>
                <td
                  className={`py-3 pl-2 text-right font-mono tabular-nums ${ano.comMudancas < 0 ? "text-negative" : "text-primary"}`}
                >
                  {formatarMoeda(ano.comMudancas)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
