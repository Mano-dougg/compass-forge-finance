import { useFinance } from "@/contexts/finance-state";
import { formatarMoeda } from "@/lib/sad-model";

export function DetalhesModeloPatrimonial() {
  const { regressao } = useFinance();
  const decimal = (v: number | null) =>
    v === null ? "Indisponível" : v.toFixed(3).replace(".", ",");
  return (
    <section
      id="modelo"
      className="mt-7 scroll-mt-80 rounded-lg border border-border bg-surface p-5 sm:scroll-mt-56"
      aria-labelledby="titulo-modelo"
    >
      <h2 id="titulo-modelo" className="text-lg font-semibold">
        Detalhes do modelo patrimonial
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        A referência do gap é calculada com as empresas da amostra selecionada. Alterar a base
        recalcula os parâmetros abaixo.
      </p>
      {regressao.disponivel ? (
        <>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              ["Empresas", String(regressao.n)],
              ["R² na amostra", decimal(regressao.r2)],
              ["R² ajustado", decimal(regressao.r2Ajustado)],
            ].map(([nome, valor]) => (
              <div key={nome}>
                <dt className="text-sm text-muted">{nome}</dt>
                <dd className="mt-1 font-mono">{valor}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 break-words font-mono text-sm leading-relaxed">
            PL = {formatarMoeda(regressao.intercepto)}
            {regressao.coeficientes
              .map(
                (c, i) =>
                  ` ${c >= 0 ? "+" : "−"} ${Math.abs(c).toPrecision(5).replace(".", ",")} × ${["receita", "custos assinados", "fluxo líquido de investimento"][i]}`,
              )
              .join("")}
          </p>
          <p className="mt-3 text-sm text-muted">
            Valores em reais; custos e saídas de investimento entram negativos. Erro residual do
            ajuste: {formatarMoeda(regressao.erroResidual)}.
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">{regressao.motivo}</p>
      )}
      <p className="mt-3 text-sm leading-relaxed text-muted">
        O gap é o patrimônio informado menos a referência do modelo. R² mede ajuste na própria
        amostra, não precisão futura. A diferença não determina necessidade de aporte ou capital
        mínimo.
      </p>
    </section>
  );
}
