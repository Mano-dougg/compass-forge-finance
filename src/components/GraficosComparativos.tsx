import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { pontosAmostra, type BaseMercado } from "@/lib/market-clusters";
import { leituraFinanceira } from "@/lib/leitura-financeira";
import { dadosRadar } from "@/lib/benchmarking";
import {
  nuvemB3,
  pontoEmpresa,
  type Centroide,
  type Diagnostico,
  type EmpresaDados,
} from "@/lib/sad-model";

const eixo = {
  stroke: "var(--muted)",
  fontSize: 11,
  fontFamily: "var(--font-mono)",
};

const tooltipEstilo = {
  contentStyle: {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    fontSize: 11,
    fontFamily: "var(--font-mono)",
    color: "var(--foreground)",
  },
  labelStyle: { color: "var(--muted)" },
  itemStyle: { color: "var(--foreground)" },
};

export function GraficoBarras({
  dados,
  diagnostico,
  centroides,
}: {
  dados: EmpresaDados;
  diagnostico: Diagnostico;
  centroides?: Centroide[] | undefined;
}) {
  const leitura = leituraFinanceira(dados, diagnostico.perfil, centroides);
  const barras = [
    { indicador: "Custos", empresa: leitura.custos, cluster: leitura.custosGrupo },
    {
      indicador: "Investimento",
      empresa: leitura.investimento,
      cluster: leitura.investimentoGrupo,
    },
  ];

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={barras} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="indicador" tickLine={false} axisLine={false} tick={eixo} />
          <YAxis tickLine={false} axisLine={false} tick={eixo} unit="%" />
          <Tooltip
            position={{ x: 0, y: 0 }}
            isAnimationActive={false}
            formatter={(v: number) =>
              `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% da receita`
            }
            cursor={{ fill: "var(--surface-2)" }}
            {...tooltipEstilo}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}
          />
          <Bar
            isAnimationActive={false}
            dataKey="empresa"
            name="Sua empresa"
            fill="var(--primary)"
            radius={[2, 2, 0, 0]}
          />
          <Bar
            isAnimationActive={false}
            dataKey="cluster"
            name="Grupo de referência"
            fill="var(--muted)"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoDispersao({
  dados,
  diagnostico,
  centroides,
  mercado,
}: {
  dados: EmpresaDados;
  diagnostico: Diagnostico;
  centroides?: Centroide[] | undefined;
  mercado?: BaseMercado | null | undefined;
}) {
  const nuvem = mercado
    ? pontosAmostra(mercado)
    : centroides
      ? centroides.map((c) => ({
          perfil: c.perfil,
          margem: c.margem * 100,
          alavancagem: c.alavancagem,
          empresa: `Média do grupo ${c.perfil}`,
          setor: "Referência",
        }))
      : nuvemB3().map((p, i) => ({
          ...p,
          empresa: `Exemplo simulado ${i + 1}`,
          setor: "Demonstração",
        }));
  const empresa = [pontoEmpresa(dados)];

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
          <XAxis
            type="number"
            dataKey="margem"
            name="Margem (%)"
            tickLine={false}
            axisLine={false}
            tick={eixo}
            unit="%"
          />
          <YAxis
            type="number"
            dataKey="alavancagem"
            name="Giro do PL"
            tickLine={false}
            axisLine={false}
            tick={eixo}
            unit="x"
          />
          <ZAxis range={[40, 40]} />
          <Tooltip
            position={{ x: 0, y: 0 }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const ponto = payload[0]?.payload as
                | {
                    perfil: string;
                    margem: number;
                    alavancagem: number;
                    empresa?: string;
                    setor?: string;
                  }
                | undefined;
              if (!ponto) return null;
              return (
                <div
                  style={{
                    ...tooltipEstilo.contentStyle,
                    maxWidth: 280,
                    padding: 10,
                    overflowWrap: "anywhere",
                  }}
                >
                  <p className="font-semibold">
                    {ponto.perfil === "Sua empresa"
                      ? "Sua empresa"
                      : (ponto.empresa ?? `Grupo ${ponto.perfil}`)}
                  </p>
                  {ponto.perfil !== "Sua empresa" && (
                    <p className="mt-1">
                      Grupo {ponto.perfil}
                      {ponto.setor ? ` · ${ponto.setor}` : ""}
                    </p>
                  )}
                  <p className="mt-2">
                    Receita após custos:{" "}
                    {ponto.margem.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
                  </p>
                  <p>
                    Receita ÷ patrimônio:{" "}
                    {ponto.alavancagem.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}x
                  </p>
                </div>
              );
            }}
            cursor={{ strokeDasharray: "3 3" }}
            {...tooltipEstilo}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}
          />
          <Scatter
            isAnimationActive={false}
            name={mercado ? "Empresas de outros grupos" : "Outros grupos"}
            data={nuvem.filter((p) => p.perfil !== diagnostico.perfil)}
            fill="var(--muted)"
            fillOpacity={0.8}
          />
          <Scatter
            isAnimationActive={false}
            name={
              mercado
                ? `Empresas do seu grupo (${diagnostico.perfil})`
                : `Seu grupo (${diagnostico.perfil})`
            }
            data={nuvem.filter((p) => p.perfil === diagnostico.perfil)}
            fill="var(--positive)"
          />
          <Scatter
            isAnimationActive={false}
            name="Sua empresa"
            data={empresa}
            fill="var(--primary)"
            shape="star"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoRadar({
  dados,
  diagnostico,
  centroides,
}: {
  dados: EmpresaDados;
  diagnostico: Diagnostico;
  centroides?: Centroide[] | undefined;
}) {
  const radar = dadosRadar(dados, diagnostico.perfil, centroides);
  return (
    <div className="h-[280px] w-full" aria-label="Radar de competitividade">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radar} margin={{ top: 20, right: 88, bottom: 10, left: 88 }}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="indicador" tick={eixo} />
          <PolarRadiusAxis
            tick={eixo}
            domain={[0, Math.max(150, ...radar.map((r) => r.empresa))]}
          />
          <Radar
            isAnimationActive={false}
            dataKey="cluster"
            name={centroides ? "Grupo de referência (100%)" : "Referência simulada (100)"}
            stroke="var(--muted)"
            fill="var(--muted)"
            fillOpacity={0.12}
          />
          <Radar
            isAnimationActive={false}
            dataKey="empresa"
            name="Sua empresa (% da referência)"
            dot={{ r: 3, fill: "var(--primary)" }}
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.25}
          />
          <Tooltip
            position={{ x: 0, y: 0 }}
            isAnimationActive={false}
            {...tooltipEstilo}
            formatter={(v: number) => `${v.toFixed(1)}%`}
          />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
