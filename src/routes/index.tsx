import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { EntradaDadosModal } from "@/components/EntradaDadosModal";
import { GraficoBarras, GraficoDispersao } from "@/components/GraficosComparativos";
import { gerarRelatorioPDF } from "@/lib/relatorio";
import {
  aplicarPasso,
  diagnosticar,
  formatarMoeda,
  posicaoEstrutural,
  preverPatrimonio,
  recomendacoes,
  tamanhoCluster,
  CENTROIDES,
  PEARSON_RECEITA_CUSTOS,
  TETOS,
  type EmpresaDados,
} from "@/lib/sad-model";


export const Route = createFileRoute("/")({
  codeSplitGroupings: [["loader", "component"]],
  head: () => ({
    meta: [
      { title: "ATLAS.SAD — Diagnóstico e Simulação de Cenários" },
      {
        name: "description",
        content:
          "Informe os dados da sua empresa, receba a classificação de perfil operacional e simule cenários de Patrimônio Líquido em tempo real.",
      },
      { property: "og:title", content: "ATLAS.SAD — Diagnóstico e Simulação de Cenários" },
      {
        property: "og:description",
        content:
          "Diagnóstico por clusters da B3 e projeção preditiva de Patrimônio Líquido com simulador por passos.",
      },
    ],
  }),
  component: Index,
});

const PASSO = 5_000_000;

const PADRAO: EmpresaDados = {
  receita: 182_400_000,
  custos: 94_150_000,
  patrimonio: 168_240_000,
  investimento: 12_300_000,
};

const LINHAS: { chave: keyof EmpresaDados; label: string; codigo: string }[] = [
  { chave: "receita", label: "Receita Líquida", codigo: "ACR.01" },
  { chave: "custos", label: "Custos e Despesas", codigo: "ACR.02" },
  { chave: "investimento", label: "Fluxo de Investimento", codigo: "ACR.03" },
  { chave: "patrimonio", label: "Patrimônio Líquido", codigo: "ACR.04" },
];

function Index() {
  const [modalAberto, setModalAberto] = useState(true);
  const [base, setBase] = useState<EmpresaDados | null>(null);
  const [dados, setDados] = useState<EmpresaDados>(PADRAO);
  const [alerta, setAlerta] = useState<string | null>(null);

  const diagnostico = useMemo(() => diagnosticar(dados), [dados]);
  const projecao = useMemo(() => preverPatrimonio(dados), [dados]);
  const posicao = useMemo(() => posicaoEstrutural(dados), [dados]);

  function passo(campo: keyof EmpresaDados, direcao: 1 | -1 | 0, valorDireto?: number) {
    const ajuste = valorDireto === undefined ? PASSO * direcao : valorDireto - dados[campo];
    const r = aplicarPasso(dados, campo, ajuste);
    setDados(r.dados);
    setAlerta(r.alerta);
  }

  const recs = useMemo(() => recomendacoes(dados, diagnostico), [dados, diagnostico]);

  function exportar() {
    try {
      const ok = gerarRelatorioPDF({ dados, base, diagnostico, projecao });
      setAlerta(
        ok
          ? null
          : "Não foi possível abrir a janela do relatório. Libere os pop-ups deste site e tente novamente.",
      );
    } catch {
      setAlerta("Falha ao gerar o relatório. Tente novamente em alguns instantes.");
    }
  }


  return (
    <div className="min-h-screen bg-background font-sans text-sm text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-6">
          <div className="flex items-center gap-3">
            <div className="font-display grid size-8 place-items-center rounded-md bg-primary text-base font-bold text-primary-foreground">
              A
            </div>
            <div className="leading-tight">
              <div className="font-display font-semibold tracking-tight">ATLAS.SAD</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                Plataforma de Decisão · v2.4
              </div>
            </div>
          </div>
          <nav className="ml-6 hidden items-center gap-5 text-[13px] text-muted md:flex">
            <span className="text-foreground">Diagnóstico</span>
            <span>Comparativo</span>
            <span>Simulador</span>
            <span>Relatórios</span>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden items-center gap-2 font-mono text-[11px] text-muted sm:flex">
              <span className="size-1.5 animate-pulse rounded-full bg-positive" /> B3 · ao vivo
            </div>
            <button
              onClick={() => setModalAberto(true)}
              className="rounded-md border border-border px-3 py-2 text-[13px] transition-colors hover:border-primary/50 hover:text-foreground"
            >
              Editar dados
            </button>
            <button
              onClick={exportar}
              className="rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Exportar Relatório
            </button>

          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-7">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              Diagnóstico Financeiro
            </div>
            <h1 className="font-display mt-1 text-balance text-2xl font-semibold tracking-tight">
              Simulador de Cenários · Perfil {diagnostico.perfil}
            </h1>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
            <span className="size-2 rounded-full bg-primary" />
            <span className="text-[12px] text-foreground/90">
              Margem de erro do modelo:{" "}
              <span className="font-mono font-semibold text-primary">48,7%</span> (100% − R² 51,3%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 flex flex-col gap-4 lg:col-span-3">
            <section className="animate-rise rounded-lg border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
                  Diagnóstico
                </span>
                <span className="font-mono text-[11px] text-muted">
                  Cluster B3 · {diagnostico.empresasNoCluster} empresas
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-[13px] font-medium text-primary">
                  {diagnostico.perfil}
                </span>
                <span className="text-[12px] text-muted">
                  distância ao centróide{" "}
                  <span className="font-mono text-foreground">
                    {diagnostico.distancia.toFixed(2).replace(".", ",")}
                  </span>
                </span>
              </div>
              <div className="mt-5 space-y-3">
                <div>
                  <div className="mb-1.5 flex justify-between text-[12px]">
                    <span className="text-muted">Sua empresa</span>
                    <span className="font-mono">{diagnostico.scoreEmpresa}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full bg-foreground/70 transition-[width] duration-500"
                      style={{ width: `${diagnostico.scoreEmpresa}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-[12px]">
                    <span className="text-muted">Média do cluster</span>
                    <span className="font-mono">{diagnostico.scoreCluster}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="animate-sweep h-full origin-left bg-primary transition-[width] duration-500"
                      style={{ width: `${diagnostico.scoreCluster}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="mt-4 text-[12px] leading-relaxed text-muted">
                {diagnostico.descricao}
              </p>
              <div className="mt-4 border-t border-border pt-3">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                  Clusters da B3
                </div>
                <div className="space-y-1.5">
                  {CENTROIDES.map((c) => {
                    const ativo = c.perfil === diagnostico.perfil;
                    return (
                      <div
                        key={c.perfil}
                        className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-[12px] ${
                          ativo
                            ? "border border-primary/40 bg-primary/10 text-primary"
                            : "text-muted"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`size-1.5 rounded-full ${ativo ? "bg-primary" : "bg-border"}`}
                          />
                          {c.perfil}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums">
                          {tamanhoCluster(c.perfil)} empresas
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>


            <section className="animate-rise rounded-lg border border-border bg-surface p-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
                Recomendações estratégicas
              </span>
              <ol className="mt-3 space-y-2.5">
                {recs.map((r, i) => (
                  <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-foreground/90">
                    <span className="font-mono text-[11px] text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{r}</span>
                  </li>
                ))}
              </ol>
            </section>

            <button
              onClick={exportar}
              className="rounded-md border border-primary/40 px-4 py-3 text-[14px] font-medium text-primary transition-colors hover:bg-primary/10"
            >
              Exportar Relatório (PDF)
            </button>

          </div>

          <div className="col-span-12 lg:col-span-9">
            <section
              className={`animate-rise rounded-lg border p-5 ${
                posicao.suficiente
                  ? "border-positive/40 bg-surface-2"
                  : "border-negative/50 bg-surface-2"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
                  Posição Estrutural · PL Real vs. PL Teórico
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${
                    posicao.suficiente
                      ? "border-positive/40 bg-positive/10 text-positive"
                      : "border-negative/50 bg-negative/10 text-negative"
                  }`}
                >
                  {posicao.suficiente ? "Estrutura suficiente" : "Capital insuficiente"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                    PL Real (informado)
                  </div>
                  <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
                    {formatarMoeda(posicao.plReal)}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                    PL Teórico (benchmark B3)
                  </div>
                  <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
                    {formatarMoeda(posicao.plTeorico)}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                    Gap estrutural
                  </div>
                  <div
                    className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
                      posicao.suficiente ? "text-positive" : "text-negative"
                    }`}
                  >
                    {posicao.gap >= 0 ? "+" : "−"}
                    {formatarMoeda(Math.abs(posicao.gap)).replace("R$", "R$")}
                    <span className="ml-2 text-sm font-normal text-muted">
                      ({posicao.gapPct >= 0 ? "+" : ""}
                      {posicao.gapPct.toFixed(1).replace(".", ",")}%)
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-muted">{posicao.status}</p>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
                <span className="size-1.5 animate-pulse rounded-full bg-positive" /> Tempo real ·
                regressão linear · margem não explicada 48,7%
              </div>
            </section>

            <section className="animate-rise mt-4 overflow-hidden rounded-lg border border-border bg-surface">
              <div className="flex h-11 items-center justify-between border-b border-border px-5">
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
                  Linhas de simulação · ajuste por passo
                </span>
                <span className="font-mono text-[11px] text-muted">
                  passo ± {formatarMoeda(PASSO)}
                </span>
              </div>

              <div className="hidden grid-cols-[180px_minmax(0,1fr)_190px] items-center gap-4 border-b border-border/70 bg-surface-2/50 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted md:grid">
                <span>Variável</span>
                <span>Ajuste · arraste ou use −/+</span>
                <span className="text-right">Valor atual</span>
              </div>

              {LINHAS.map((linha, i) => {
                const valor = dados[linha.chave];
                const teto = TETOS[linha.chave];
                const pct = Math.min(100, (valor / teto) * 100);
                return (
                  <div
                    key={linha.chave}
                    className={`grid grid-cols-1 items-center gap-3 px-5 py-4 md:grid-cols-[180px_minmax(0,1fr)_190px] md:gap-4 ${
                      i < LINHAS.length - 1 ? "border-b border-border/70" : ""
                    }`}
                  >
                    <div>
                      <div className="text-[13px] font-medium">{linha.label}</div>
                      <div className="font-mono text-[10px] tracking-[0.1em] text-muted">
                        {linha.codigo} · teto {formatarMoeda(teto)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => passo(linha.chave, -1)}
                        aria-label={`Diminuir ${linha.label}`}
                        className="grid size-8 shrink-0 place-items-center rounded-md border border-border text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                      >
                        −
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={teto}
                        step={PASSO}
                        value={valor}
                        onChange={(e) =>
                          passo(linha.chave, 0, Number(e.target.value))
                        }
                        aria-label={`Arrastar para ajustar ${linha.label}`}
                        className="slider h-2 flex-1 cursor-ew-resize appearance-none rounded-full outline-none"
                        style={{
                          background: `linear-gradient(to right, var(--primary) ${pct}%, var(--surface-2) ${pct}%)`,
                        }}
                      />
                      <button
                        onClick={() => passo(linha.chave, 1)}
                        aria-label={`Aumentar ${linha.label}`}
                        className="grid size-8 shrink-0 place-items-center rounded-md border border-border text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                      >
                        +
                      </button>
                    </div>
                    <div className="font-mono text-xl font-semibold tracking-tight tabular-nums md:text-right">
                      {formatarMoeda(valor)}
                    </div>
                  </div>
                );
              })}
            </section>

            {alerta && (
              <p className="mt-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 font-mono text-[11px] leading-relaxed text-primary">
                {alerta}
              </p>
            )}

            <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted">
              RN01 · Trava de multicolinearidade ativa (ρ ={" "}
              {PEARSON_RECEITA_CUSTOS.toFixed(4).replace(".", ",")}): o aumento de Receita recalibra
              automaticamente Custos e Despesas. RN02 · Teto de escala do Box Plot aplicável.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <section className="animate-rise rounded-lg border border-border bg-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
                    Comparativo · empresa vs. cluster
                  </span>
                  <span className="font-mono text-[10px] text-muted">tempo real</span>
                </div>
                <ClientOnly fallback={<div className="h-[220px]" />}>
                  <GraficoBarras dados={dados} diagnostico={diagnostico} />
                </ClientOnly>
              </section>

              <section className="animate-rise rounded-lg border border-border bg-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
                    Dispersão · margem × giro do PL
                  </span>
                  <span className="font-mono text-[10px] text-muted">amostra B3</span>
                </div>
                <ClientOnly fallback={<div className="h-[240px]" />}>
                  <GraficoDispersao dados={dados} diagnostico={diagnostico} />
                </ClientOnly>
              </section>
            </div>

          </div>
        </div>
      </main>

      {modalAberto && (
        <EntradaDadosModal
          inicial={dados}
          onCancelar={base ? () => setModalAberto(false) : undefined}
          onConfirmar={(novos) => {
            setBase(novos);
            setDados(novos);
            setAlerta(null);
            setModalAberto(false);
          }}
        />
      )}
    </div>
  );
}
