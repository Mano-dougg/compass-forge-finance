import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { dadosRadar } from "@/lib/benchmarking";
import {
  comparativoCluster,
  nuvemB3,
  pontoEmpresa,
  type Diagnostico,
  type EmpresaDados,
} from "@/lib/sad-model";

const eixo = {
  stroke: "var(--muted)",
  fontSize: 10,
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
}: {
  dados: EmpresaDados;
  diagnostico: Diagnostico;
}) {
  const barras = comparativoCluster(dados, diagnostico.perfil);

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={barras} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="indicador" tickLine={false} axisLine={false} tick={eixo} />
          <YAxis tickLine={false} axisLine={false} tick={eixo} />
          <Tooltip cursor={{ fill: "var(--surface-2)" }} {...tooltipEstilo} />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}
          />
          <Bar dataKey="empresa" name="Sua empresa" fill="var(--primary)" radius={[2, 2, 0, 0]} />
          <Bar
            dataKey="cluster"
            name="Média do cluster"
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
}: {
  dados: EmpresaDados;
  diagnostico: Diagnostico;
}) {
  const nuvem = nuvemB3();
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
          <Tooltip cursor={{ strokeDasharray: "3 3" }} {...tooltipEstilo} />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}
          />
          <Scatter name="Amostra simulada" data={nuvem} fillOpacity={0.55}>
            {nuvem.map((p, i) => (
              <Cell
                key={i}
                fill={p.perfil === diagnostico.perfil ? "var(--positive)" : "var(--muted)"}
              />
            ))}
          </Scatter>
          <Scatter name="Sua empresa" data={empresa} fill="var(--primary)" shape="star" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoRadar({ dados, diagnostico }: { dados: EmpresaDados; diagnostico: Diagnostico }) {
  const radar = dadosRadar(dados, diagnostico.perfil);
  return <div className="h-[280px] w-full" aria-label="Radar de competitividade">
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={radar} margin={{ top: 20, right: 32, bottom: 10, left: 32 }}>
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="indicador" tick={eixo} />
        <PolarRadiusAxis tick={eixo} domain={[0, Math.max(150, ...radar.map((r) => r.empresa))]} />
        <Radar dataKey="cluster" name="Referência simulada (100)" stroke="var(--muted)" fill="var(--muted)" fillOpacity={0.12} />
        <Radar dataKey="empresa" name="Sua empresa (% da referência)" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.25} />
        <Tooltip {...tooltipEstilo} formatter={(v: number) => `${v.toFixed(1)}%`} />
        <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
      </RadarChart>
    </ResponsiveContainer>
  </div>;
}
