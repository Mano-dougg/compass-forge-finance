import { Button } from "@/components/ui/button";
import { formatarMoeda } from "@/lib/sad-model";
import {
  ANO_BASE_PATRIMONIO,
  ANO_PREVISAO_PATRIMONIO,
  type HipotesesPL,
} from "@/lib/patrimonio-historico";
import { useFinance } from "@/contexts/finance-state";
import { GraficoPatrimonio } from "@/components/GraficoPatrimonio";

const CAMPOS_HIPOTESES: { chave: keyof HipotesesPL; label: string }[] = [
  { chave: "impostoPct", label: "Imposto sobre resultado adicional (%)" },
  { chave: "retencaoPct", label: "Retenção do resultado adicional (%)" },
  { chave: "retornoInvestimentoPct", label: "Retorno anual do investimento adicional (%)" },
];
const campo =
  "mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs focus-visible:outline-2 focus-visible:outline-primary";

export function PrevisaoPatrimonio() {
  const {
    base,
    janela,
    setJanela,
    horizonte,
    setHorizonte,
    nome,
    setNome,
    linhas,
    setLinhas,
    hipoteses,
    setHipoteses,
    resultadoTemporal: resultado,
  } = useFinance();
  const d = resultado.diagnostico;
  const p = d?.previsao;
  return (
    <section
      className="mt-5 border-y border-border py-5"
      aria-label="Previsão de patrimônio da sua empresa"
    >
      <h2 className="font-medium">Histórico e hipóteses da sua empresa</h2>
      <p className="mt-2 max-w-prose text-xs leading-relaxed text-muted">
        Projeções a partir de {ANO_PREVISAO_PATRIMONIO}, com base em {ANO_BASE_PATRIMONIO}. Informe
        o patrimônio dos anos anteriores e o PL atual ou estimado para o fechamento de{" "}
        {ANO_BASE_PATRIMONIO}. A média móvel das variações anuais cria a referência; as alterações
        no simulador ajustam o cenário conforme as hipóteses abaixo. Receita, custos e investimento
        iniciais devem corresponder ao período-base de {ANO_BASE_PATRIMONIO}. Valores estimados
        desse ano são hipóteses informadas por você.
      </p>
      <div className="mt-4">
        <label htmlFor="nome-historico" className="block text-xs text-muted">
          Nome da empresa (opcional)
        </label>
        <input
          id="nome-historico"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className={campo}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <label htmlFor="janela-media">Média das variações dos últimos</label>
        <select
          id="janela-media"
          value={janela}
          onChange={(e) => setJanela(Number(e.target.value))}
          className="rounded-md border border-border bg-background px-3 py-2 focus-visible:outline-2 focus-visible:outline-primary"
        >
          {[2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n} anos ({n + 1} patrimônios)
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          disabled={!base || !linhas.some((l) => Number(l.ano) === ANO_BASE_PATRIMONIO)}
          onClick={() => {
            if (base)
              setLinhas((ls) =>
                ls.map((l) =>
                  Number(l.ano) === ANO_BASE_PATRIMONIO
                    ? { ...l, patrimonio: String(base.patrimonio) }
                    : l,
                ),
              );
          }}
        >
          Usar PL informado em {ANO_BASE_PATRIMONIO}
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        <label htmlFor="horizonte-previsao">Projetar por</label>
        <select
          id="horizonte-previsao"
          value={horizonte}
          onChange={(e) => setHorizonte(Number(e.target.value))}
          className="rounded-md border border-border bg-background px-3 py-2 focus-visible:outline-2 focus-visible:outline-primary"
        >
          {[1, 2, 3, 4, 5].map((anos) => (
            <option key={anos} value={anos}>
              {anos} {anos === 1 ? "ano" : "anos"} · {ANO_PREVISAO_PATRIMONIO}
              {anos > 1 ? `–${ANO_PREVISAO_PATRIMONIO + anos - 1}` : ""}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-3 text-xs text-muted">
        Valores em reais, com ponto para decimais e sem separador de milhar. Deixe em branco os anos
        sem dados. Valores históricos negativos e zero são aceitos.
      </p>
      <div className="mt-3 space-y-2">
        {linhas.map((linha, i) => (
          <div key={i} className="grid grid-cols-[90px_minmax(0,1fr)] gap-3">
            <div>
              <label htmlFor={`pl-ano-${i}`} className="text-xs text-muted">
                Ano
              </label>
              <input
                id={`pl-ano-${i}`}
                type="number"
                min={1900}
                max={2200}
                value={linha.ano}
                onChange={(e) =>
                  setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ano: e.target.value } : l)))
                }
                className={campo}
              />
            </div>
            <div>
              <label htmlFor={`pl-valor-${i}`} className="text-xs text-muted">
                Patrimônio líquido (R$)
              </label>
              <input
                id={`pl-valor-${i}`}
                type="number"
                step="any"
                value={linha.patrimonio}
                onChange={(e) =>
                  setLinhas((ls) =>
                    ls.map((l, j) => (j === i ? { ...l, patrimonio: e.target.value } : l)),
                  )
                }
                className={campo}
              />
            </div>
          </div>
        ))}
      </div>
      <fieldset className="mt-5 border-t border-border pt-3">
        <legend className="pr-3 text-xs font-medium">
          Hipóteses anuais mantidas durante a projeção
        </legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {CAMPOS_HIPOTESES.map(({ chave, label }) => (
            <div key={chave}>
              <label htmlFor={`hipotese-${chave}`} className="block text-xs text-muted">
                {label}
              </label>
              <input
                id={`hipotese-${chave}`}
                type="number"
                min={0}
                max={100}
                step="any"
                value={hipoteses[chave]}
                onChange={(e) => setHipoteses((h) => ({ ...h, [chave]: e.target.value }))}
                className={campo}
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Início simplificado: imposto 0%, retenção 100% e retorno do investimento 0%. Ajuste as
          taxas antes de decidir. Investimento não é descontado diretamente do patrimônio: o cenário
          considera apenas seu retorno adicional. Aportes ou retiradas atuais podem ser
          representados alterando o campo Patrimônio no simulador e entram uma única vez. As
          mudanças de receita, custos e retorno adicional se repetem anualmente, com os mesmos
          valores e taxas.
        </p>
      </fieldset>
      {resultado.erro && (
        <p role="status" className="mt-3 text-xs text-muted">
          {resultado.erro}
        </p>
      )}
      {d && p && (
        <div className="mt-5" aria-live="polite">
          <p className="text-sm">
            Cenário para 31/12/{p.anoAlvo}:{" "}
            <strong data-testid="patrimonio-futuro" className="font-mono text-primary">
              {formatarMoeda(p.comMudancas)}
            </strong>
          </p>
          <p className="mt-2 text-xs text-muted">
            {d.empresa} · sem as mudanças:{" "}
            <span data-testid="patrimonio-referencia">{formatarMoeda(p.semMudancas)}</span> · efeito
            total das mudanças: {formatarMoeda(p.comMudancas - p.semMudancas)}.
          </p>
          {p.anoAlvo < new Date().getFullYear() && (
            <p className="mt-2 text-xs text-muted">
              O ano estimado já encerrou. Atualize o histórico para projetar um ano futuro.
            </p>
          )}
          <details className="mt-4 border-y border-border py-3">
            <summary className="cursor-pointer rounded-sm text-sm text-primary focus-visible:outline-2 focus-visible:outline-primary">
              Ver como o valor foi calculado
            </summary>
            <dl className="mt-3 space-y-2 text-xs">
              {[
                ["PL informado inicialmente", base!.patrimonio],
                ["Média das variações anuais de PL", p.variacaoMedia],
                ["Mudança de receita menos mudança de custos", p.resultadoOperacional],
                ["Retorno adicional de investimento assumido", p.retornoInvestimento],
                ["Resultado adicional após imposto e retenção", p.impactoRetido],
                ["Ajuste atual de patrimônio no simulador", p.ajustePatrimonio],
              ].map(([label, valor]) => (
                <div key={label} className="flex flex-wrap justify-between gap-2">
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-mono">{formatarMoeda(valor as number)}</dd>
                </div>
              ))}
            </dl>
          </details>
          <GraficoPatrimonio diagnostico={d} />
          <details className="mt-4 border-t border-border pt-3">
            <summary className="cursor-pointer rounded-sm text-sm text-primary focus-visible:outline-2 focus-visible:outline-primary">
              Ver teste com anos anteriores e limites da previsão
            </summary>
            <p className="mt-3 text-xs text-muted">
              {p.mae === null
                ? "Sem anos suficientes para testar a referência histórica contra resultados conhecidos."
                : `Teste retrospectivo da referência em ${p.avaliacoes.length} ano(s): erro absoluto médio de ${formatarMoeda(p.mae)}; repetindo o último PL, ${formatarMoeda(p.maeIngenuo!)}. ${p.mae < p.maeIngenuo! ? "A média das variações teve menor erro nesta amostra." : "A média das variações não superou a repetição do último PL nesta amostra."}`}{" "}
              Esse teste avalia um ano à frente; não valida os efeitos das mudanças simuladas nem a
              precisão dos anos mais distantes.
            </p>
            <p className="mt-2 max-w-prose text-xs leading-relaxed text-muted">
              Cenários condicionais em reais nominais para até {horizonte}{" "}
              {horizonte === 1 ? "ano" : "anos"}, sem intervalo de confiança calibrado. A referência
              já contém o resultado e as distribuições habituais do passado; apenas efeitos
              adicionais são somados. Imposto e retenção são taxas marginais simplificadas,
              inclusive para resultados adicionais negativos. Mudanças contábeis, inflação e choques
              não são modelados.
            </p>
          </details>
        </div>
      )}
    </section>
  );
}
