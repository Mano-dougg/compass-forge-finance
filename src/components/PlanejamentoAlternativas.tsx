import { Check } from "lucide-react";
import { usePlanejamento } from "@/contexts/planejamento-state";
import { formatarReais as formatarMoeda, nomeOrcamento, pct } from "@/lib/planejamento-metas";
import { Button } from "./ui/button";
import { ErroPlanejamento, ValoresOrcamento } from "./PlanejamentoComum";

export function CompararMetas() {
  const { resultado, entrada, planejamento, setPlanejamento, assinatura, escolhida, erro } =
    usePlanejamento();
  function escolher(id: string) {
    setPlanejamento((p) => ({ ...p, escolha: id, assinatura }));
  }
  const delta = (valor: number, atual: number) =>
    `${formatarMoeda(valor - atual)}${atual > 0 ? ` (${pct((valor - atual) / atual)})` : " (variação percentual indisponível)"}`;
  return (
    <>
      <ErroPlanejamento erro={erro} />
      {resultado && (
        <section className="mt-8" aria-labelledby="titulo-alternativas">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="titulo-alternativas" className="text-xl font-semibold">
                Compare os caminhos possíveis
              </h2>
              <p className="mt-2 max-w-prose text-muted">
                Cada opção mantém uma condição diferente. Os valores são exigências matemáticas, não
                uma garantia de viabilidade.
              </p>
            </div>
          </div>
          {resultado.estado !== "geracao_condicional" && (
            <p role="status" className="mt-5 rounded-lg border border-primary/30 p-4">
              {resultado.estado === "meta_atingida"
                ? "O patrimônio desejado já foi atingido na data-base. Confira se o orçamento atual o preserva no prazo; você também pode editar um orçamento."
                : "Com distribuição de 100% do resultado positivo, não há retenção para aumentar o patrimônio. Reduza a distribuição ou revise o objetivo."}
            </p>
          )}
          {resultado.resultadoNecessario !== null && (
            <p className="mt-5 border-l-2 border-primary py-1 pl-4">
              Para este objetivo, o resultado simplificado necessário é de aproximadamente{" "}
              <strong>{formatarMoeda(resultado.resultadoNecessario)} por ano</strong>, antes da
              distribuição.
            </p>
          )}
          <div className="mt-6 grid items-stretch gap-5 xl:grid-cols-3">
            {resultado.alternativas.map((a) => {
              const id = a.origens.join("+");
              const selecionada = escolhida && planejamento.escolha === id;
              return (
                <article
                  key={id}
                  className={`flex min-w-0 flex-col rounded-xl border bg-surface p-5 sm:p-6 ${selecionada ? "border-primary" : "border-border"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-muted">Opção {id}</span>
                    {selecionada && (
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <Check size={16} aria-hidden="true" /> Sua escolha
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{nomeOrcamento(id)}</h3>
                  <p className="mt-2 text-xs text-muted">
                    {a.origens.includes("C")
                      ? `Referência: mediana de custos/receita dos ${resultado.resumo.validos} pares selecionados (${pct(resultado.resumo.mediana!)}).`
                      : a.origens.includes("A")
                        ? "Calcula a receita necessária mantendo o orçamento de custos informado."
                        : "Calcula o orçamento de custos mantendo a receita informada."}
                    {a.origens.length > 1 &&
                      " Estas opções geraram o mesmo orçamento e foram reunidas."}
                  </p>
                  <ValoresOrcamento orcamento={a} />
                  <div className="mt-5 space-y-2 text-xs">
                    <p>
                      Variação de receita: <strong>{delta(a.receita, entrada.receita)}</strong>
                    </p>
                    <p>
                      Variação de custos: <strong>{delta(a.custos, entrada.custos)}</strong>
                    </p>
                    <p className="text-muted">
                      {a.receita === resultado.referencia?.receita &&
                      a.custos === resultado.referencia?.custos
                        ? "Coincide com a referência sem mudanças."
                        : "Avalie demanda, capacidade e despesas antes de adotar."}
                    </p>
                  </div>
                  <Button
                    className="mt-6 w-full"
                    variant={selecionada ? "default" : "outline"}
                    aria-pressed={Boolean(selecionada)}
                    onClick={() => escolher(id)}
                  >
                    {selecionada ? "Orçamento escolhido" : "Escolher este orçamento"}
                  </Button>
                </article>
              );
            })}
            {Object.entries(resultado.indisponiveis).map(([id, motivo]) => (
              <article key={id} className="rounded-xl border border-dashed border-border p-6">
                <p className="text-xs text-muted">Opção {id} · indisponível</p>
                <h3 className="mt-3 text-lg font-semibold">{nomeOrcamento(id)}</h3>
                <p className="mt-3 text-sm text-muted">{motivo}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border px-5 py-4">
            <div>
              <h3 className="font-semibold">Referência sem mudanças</h3>
              {resultado.referencia ? (
                <p className="mt-1 text-sm text-muted">
                  {formatarMoeda(resultado.referencia.receita)} de receita e{" "}
                  {formatarMoeda(resultado.referencia.custos)} de custos por ano. Patrimônio final:{" "}
                  <strong className="text-foreground">
                    {formatarMoeda(resultado.referencia.patrimonioFinal)}
                  </strong>
                  .
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted">
                  Indisponível: {resultado.erroReferencia} As demais opções continuam avaliáveis.
                </p>
              )}
            </div>
            <Button
              variant="outline"
              disabled={!resultado.referencia}
              aria-pressed={Boolean(escolhida && planejamento.escolha === "referencia")}
              onClick={() => escolher("referencia")}
            >
              Manter orçamento atual
            </Button>
          </div>
          <p role="status" aria-live="polite" className="mt-4 text-sm text-primary">
            {escolhida
              ? `Orçamento escolhido: ${nomeOrcamento(planejamento.escolha)}. A trajetória e o relatório foram atualizados.`
              : planejamento.escolha && !escolhida
                ? "Os dados ou as premissas mudaram. Revise as alternativas e confirme uma nova escolha."
                : ""}
          </p>
        </section>
      )}
    </>
  );
}
