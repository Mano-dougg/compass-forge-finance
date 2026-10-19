import { analisarGaps } from "@/lib/benchmarking";
import { formatarMoeda, type EmpresaDados } from "@/lib/sad-model";

export function AnaliseGaps({ dados, perfil }: { dados: EmpresaDados; perfil: string }) {
  const a = analisarGaps(dados, perfil);
  return <section className="mt-5 border-y border-border py-5" aria-label="Gaps de eficiência">
    <h2 className="font-mono text-xs uppercase text-muted">Gaps de eficiência e alocação</h2>
    <div className="mt-4 grid gap-6 md:grid-cols-2">
      <div className="min-w-0">
        <h3 className="font-medium">Eficiência de custos</h3>
        <div className={`mt-2 font-mono text-xl ${a.excessoCustos > 0 ? "text-negative" : "text-positive"}`}>
          {a.eficiencia === null ? "Não calculável" : `${a.eficiencia.toFixed(1).replace(".", ",")}% da referência`}
        </div>
        <meter aria-label="Termômetro de eficiência de custos" min={0} max={200} low={90} high={100} optimum={120} value={a.eficiencia ?? 0} className="mt-2 h-3 w-full accent-primary" />
        <p className="mt-2 text-xs text-muted">Retorno operacional (receita/custos): {a.retorno === null ? "indefinido — custos zero" : `${a.retorno.toFixed(2)}x`} · referência {a.retornoReferencia.toFixed(2)}x.</p>
        <p className="mt-2 text-xs">{a.excessoCustos > 0 ? `Custos acima do padrão: ${formatarMoeda(a.excessoCustos)}.` : "Custos dentro ou abaixo do padrão proporcional à receita."}</p>
        <p className="mt-2 text-xs text-muted">100% = referência. Pearson −0,9629 orienta a trava; não é uma equação de custos.</p>
      </div>
      <div className="min-w-0">
        <h3 className="font-medium">Alocação de investimento</h3>
        <div className={`mt-2 font-mono text-xl ${a.deficitInvestimento > 0 ? "text-primary" : "text-positive"}`}>
          {a.deficitInvestimento > 0 ? `${formatarMoeda(a.deficitInvestimento)} abaixo` : "Alocação alinhada"}
        </div>
        <dl className="mt-3 space-y-2 text-xs">
          <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted">Investimento simulado</dt><dd className="font-mono">{formatarMoeda(dados.investimento)}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted">Referência proporcional à receita</dt><dd className="font-mono">{formatarMoeda(a.investimentoReferencia)}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted">Referência do centróide simulado, não dos líderes reais do mercado.</p>
      </div>
    </div>
    <h3 className="mt-5 border-t border-border pt-4 font-medium">Metas de alinhamento estrutural</h3>
    <ol className="mt-3 space-y-3">{a.acoes.map((acao, i) => <li key={acao} className="flex gap-3 text-xs leading-relaxed"><span className="font-mono text-primary">0{i + 1}</span><span>{acao}</span></li>)}</ol>
  </section>;
}