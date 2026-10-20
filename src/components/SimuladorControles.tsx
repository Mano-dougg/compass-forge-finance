import { useFinance } from "@/contexts/finance-state";
import { formatarMoeda, PEARSON_RECEITA_CUSTOS, type EmpresaDados } from "@/lib/sad-model";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const LINHAS: { chave: keyof EmpresaDados; label: string; codigo: string }[] = [
  { chave: "receita", label: "Receita Líquida", codigo: "ACR.01" },
  { chave: "custos", label: "Custos e Despesas", codigo: "ACR.02" },
  { chave: "investimento", label: "Fluxo de Investimento", codigo: "ACR.03" },
  { chave: "patrimonio", label: "Patrimônio Líquido", codigo: "ACR.04" },
];

export function SimuladorControles() {
  const { dados, base, tetos, perfilBase, diagnostico, passo, setAlerta, restaurar, mercado } =
    useFinance();
  const [referenciaInicial] = useState(() => ({ ...dados }));
  const [escalaAmpliada, setEscalaAmpliada] = useState(0);
  const referencia = base ?? referenciaInicial;
  const limiteEscala = Math.max(...Object.values(tetos));
  // Keep one stable scale for all variables, with the largest input at 50%.
  const faixaInicial = Math.max(1_000, Math.max(...Object.values(referencia)) / 0.5);
  const maximo = Math.max(faixaInicial, escalaAmpliada, ...Object.values(dados));
  return (
    <>
      <div
        className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-border py-3"
        aria-label="Enquadramento de cluster"
      >
        <p className="text-xs">
          <span className="text-muted">Perfil informado </span>
          <strong>{perfilBase ?? "Não informado"}</strong>
          <span className="mx-2 text-muted">→</span>
          <span className="text-muted">Simulação </span>
          <strong className="text-primary">{diagnostico.perfil}</strong>
          <span className="ml-3 text-muted">
            {perfilBase === diagnostico.perfil
              ? "Sem migração"
              : perfilBase
                ? "Migração de perfil"
                : ""}
          </span>
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={!base}
          onClick={() => {
            if (base) {
              restaurar();
              setEscalaAmpliada(0);
            }
          }}
        >
          Restaurar dados informados
        </Button>
      </div>
      <section className="animate-rise mt-4 overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
            Ajustes do cenário
          </span>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-muted">
              Escala única: o maior valor informado ocupa 50% da barra inicial.
            </span>
            <button
              type="button"
              disabled={maximo >= limiteEscala}
              onClick={() => setEscalaAmpliada(Math.min(limiteEscala, maximo * 2))}
              className="rounded-sm text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary disabled:text-muted disabled:no-underline"
            >
              {maximo >= limiteEscala ? "Escala máxima" : "Ampliar escala (2×)"}
            </button>
          </div>
        </div>

        <div className="hidden grid-cols-[180px_minmax(0,1fr)_190px] items-center gap-4 border-b border-border/70 bg-surface-2/50 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted md:grid">
          <span>Variável</span>
          <span>Ajuste · arraste ou use −/+</span>
          <span className="text-right">Valor atual</span>
        </div>

        {LINHAS.map((linha, i) => {
          const valor = dados[linha.chave];
          const teto = tetos[linha.chave];
          const pct = Math.min(100, (valor / maximo) * 100);
          const passoAjuste = Math.max(1, 10 ** Math.floor(Math.log10(maximo / 100)));
          const ajustar = (direcao: -1 | 1) =>
            passo(linha.chave, 0, Math.max(0, Math.min(teto, valor + direcao * passoAjuste)));
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
                  {linha.codigo} · passo {formatarMoeda(passoAjuste)}
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => ajustar(-1)}
                    aria-label={`Diminuir ${linha.label}`}
                    className="grid size-8 shrink-0 place-items-center rounded-md border border-border text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                  >
                    −
                  </Button>
                  <input
                    type="range"
                    min={0}
                    max={maximo}
                    step="any"
                    value={valor}
                    onChange={(e) => passo(linha.chave, 0, Math.min(teto, Number(e.target.value)))}
                    aria-label={`Arrastar para ajustar ${linha.label}`}
                    aria-valuetext={formatarMoeda(valor)}
                    className="slider h-2 min-w-0 flex-1 cursor-ew-resize appearance-none rounded-full outline-none"
                    style={{
                      background: `linear-gradient(to right, var(--primary) ${pct}%, var(--surface-2) ${pct}%)`,
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => ajustar(1)}
                    aria-label={`Aumentar ${linha.label}`}
                    className="grid size-8 shrink-0 place-items-center rounded-md border border-border text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                  >
                    +
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>De R$ 0 a {formatarMoeda(maximo)}</span>
                </div>
              </div>
              <div className="min-w-0 md:text-right">
                <label htmlFor={`cenario-${linha.chave}`} className="block text-[10px] text-muted">
                  Valor do cenário (R$)
                </label>
                <input
                  key={`${linha.chave}-${valor}`}
                  id={`cenario-${linha.chave}`}
                  type="number"
                  min={0}
                  max={teto}
                  step="any"
                  defaultValue={valor}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-primary md:text-right"
                  onBlur={(e) => {
                    const n = e.currentTarget.valueAsNumber;
                    if (e.currentTarget.value !== "" && Number.isFinite(n) && n >= 0 && n <= teto)
                      passo(linha.chave, 0, n);
                    else {
                      setAlerta(`Informe ${linha.label} entre zero e ${formatarMoeda(teto)}.`);
                      e.currentTarget.value = String(valor);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
              </div>
            </div>
          );
        })}
      </section>
      <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted">
        RN01 · Trava de multicolinearidade ativa (ρ ={" "}
        {PEARSON_RECEITA_CUSTOS.toFixed(4).replace(".", ",")}): o aumento de Receita recalibra
        automaticamente Custos e Despesas.{" "}
        {mercado
          ? "Limites: maior valor entre os tetos demonstrativos e os máximos observados na base selecionada; não são os tetos da pesquisa original."
          : "RN02 · Tetos demonstrativos do Box Plot."}
      </p>
    </>
  );
}
