import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
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
  fontSize: 14,
  fontFamily: "var(--font-mono)",
};

const tooltipEstilo = {
  contentStyle: {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    fontSize: 14,
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
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={barras} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
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
            wrapperStyle={{ fontSize: 14, fontFamily: "var(--font-mono)", color: "var(--muted)" }}
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
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
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
            wrapperStyle={{ fontSize: 14, fontFamily: "var(--font-mono)", color: "var(--muted)" }}
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

export function GraficoPorte({
  dados,
  diagnostico,
  centroides,
}: {
  dados: EmpresaDados;
  diagnostico: Diagnostico;
  centroides?: Centroide[] | undefined;
}) {
  const comparacao = dadosRadar(dados, diagnostico.perfil, centroides).map((item) => ({
    ...item,
    empresa: item.semReferencia ? null : item.empresa,
    cluster: item.semReferencia ? null : item.cluster,
  }));
  const percentual = (valor: unknown) =>
    typeof valor === "number"
      ? `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
      : "";
  const maximo = Math.max(150, ...comparacao.map((item) => item.empresa ?? 0));
  return (
    <div
      className="h-[360px] w-full"
      role="img"
      aria-label="Barras horizontais do tamanho da empresa em relação à média do grupo. Percentuais e valores completos estão descritos ao lado."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={comparacao}
          margin={{ top: 12, right: 88, bottom: 8, left: 0 }}
          barGap={4}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, maximo]}
            ticks={[0, 100, maximo]}
            interval="preserveStartEnd"
            tick={eixo}
            tickLine={false}
            axisLine={false}
            tickFormatter={percentual}
            minTickGap={8}
          />
          <YAxis
            type="category"
            dataKey="indicador"
            width={100}
            tick={{ ...eixo, fontFamily: "var(--font-sans)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            isAnimationActive={false}
            formatter={percentual}
            cursor={{ fill: "var(--surface-2)" }}
            {...tooltipEstilo}
          />
          <Legend wrapperStyle={{ fontSize: 14, fontFamily: "var(--font-sans)", paddingTop: 12 }} />
          <Bar
            isAnimationActive={false}
            dataKey="cluster"
            name="Média do grupo (100%)"
            fill="var(--muted)"
            barSize={12}
            radius={[0, 2, 2, 0]}
          >
            <LabelList
              dataKey="cluster"
              position="right"
              formatter={percentual}
              fill="var(--muted)"
              fontSize={14}
            />
          </Bar>
          <Bar
            isAnimationActive={false}
            dataKey="empresa"
            name="Sua empresa"
            fill="var(--primary)"
            barSize={12}
            radius={[0, 2, 2, 0]}
          >
            <LabelList
              dataKey="empresa"
              position="right"
              formatter={percentual}
              fill="var(--primary)"
              fontSize={14}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
