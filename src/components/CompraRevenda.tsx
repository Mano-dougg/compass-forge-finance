import { useFinance } from "@/contexts/finance-state";
import {
  analisarCompraRevenda,
  HIPOTESE_COMPRA_REVENDA,
  LIMITES_COMPRA_REVENDA,
} from "@/lib/compra-revenda";
import { formatarMoeda } from "@/lib/sad-model";

export function CompraRevenda() {
  const { base, temporal } = useFinance();
  const a = analisarCompraRevenda(base, temporal);
  return (
    <section className="mt-7 border-t border-border py-5" aria-labelledby="compra-revenda-titulo">
      <h2 id="compra-revenda-titulo" className="text-lg font-semibold">
        Comprar, recuperar e revender
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
        {HIPOTESE_COMPRA_REVENDA}
      </p>
      {a.disponivel ? (
        <>
          <h3
            className={`mt-5 font-semibold ${a.sinal === "ganho" ? "text-positive" : a.sinal === "perda" ? "text-negative" : "text-primary"}`}
          >
            {a.titulo}
          </h3>
          <p className="mt-2 max-w-prose text-sm leading-relaxed">{a.resumo}</p>
          <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {[
              [`Compra hipotética · PL de ${a.anoCompra}`, formatarMoeda(a.precoCompra)],
              [`Revenda hipotética · PL de ${a.anoRevenda}`, formatarMoeda(a.precoRevenda)],
              ["Aporte simulado do comprador", formatarMoeda(a.aporte)],
              ["Retirada simulada devolvida ao comprador", formatarMoeda(a.retirada)],
              ["Total aplicado · compra + aporte", formatarMoeda(a.totalAplicado)],
              ["Total recebido · revenda + retirada", formatarMoeda(a.recebimentoTotal)],
              ["Ganho ou perda antes dos demais custos", formatarMoeda(a.ganhoAjustado)],
              [
                `Retorno acumulado sobre o total aplicado · ${a.anos} ${a.anos === 1 ? "ano" : "anos"}`,
                `${a.retornoPct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`,
              ],
            ].map(([nome, valor]) => (
              <div key={nome} className="min-w-0 border-b border-border pb-3">
                <dt className="text-xs text-muted">{nome}</dt>
                <dd className="mt-1 break-words font-mono text-base tabular-nums">{valor}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 max-w-prose text-xs leading-relaxed text-muted">
            Resultado = revenda + retirada − compra − aporte. O preço de compra usa o PL original,
            preservado quando você altera o simulador. Aportes aumentam o total aplicado e não são
            tratados como lucro. Este retorno pressupõe aportes no início do período e recebimentos
            no encerramento do horizonte selecionado. O percentual é acumulado no período, não
            anualizado, e não é uma TIR com fluxos em datas diferentes.
          </p>
        </>
      ) : (
        <p className="mt-4 max-w-prose text-sm leading-relaxed">{a.motivo}</p>
      )}
      <p className="mt-4 max-w-prose text-xs leading-relaxed text-muted">
        {LIMITES_COMPRA_REVENDA}
      </p>
    </section>
  );
}
