import { useFinance } from "@/contexts/finance-state";
import { formatarMoeda, tamanhoCluster, CENTROIDES } from "@/lib/sad-model";

export function PerfilCluster() {
  const { mercado, centroides, diagnostico } = useFinance();
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold">Com quem comparamos sua empresa?</h2>
      <p className="mt-3 text-sm">
        Seu perfil mais próximo é <strong className="text-primary">{diagnostico.perfil}</strong>.
      </p>
      <p className="mt-3 text-sm leading-relaxed">{diagnostico.descricao}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        O grupo reúne {diagnostico.empresasNoCluster} empresas com características de operação
        semelhantes. O nome do perfil descreve o grupo; não é uma nota de qualidade ou um selo
        oficial da B3.
      </p>
      <details className="mt-5 border-t border-border pt-3">
        <summary className="cursor-pointer rounded-sm text-sm text-primary focus-visible:outline-2 focus-visible:outline-primary">
          Como o grupo foi escolhido
        </summary>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          K-Means com três grupos: patrimônio, receita, custos e fluxo líquido de investimento são
          padronizados por Z-score usando a amostra selecionada. A distância euclidiana ao centróide
          determina o perfil mais próximo. Distância:{" "}
          {diagnostico.distancia.toFixed(2).replace(".", ",")}.{" "}
          {mercado ? "Usa a base selecionada." : "Usa uma amostra simulada."}
        </p>
        <ul className="mt-3 space-y-2 text-xs text-muted">
          {(centroides ?? CENTROIDES).map((c) => (
            <li key={c.perfil}>
              {c.perfil}: {c.empresas ?? tamanhoCluster(c.perfil)} empresas
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
export function RecomendacoesEstrategicas() {
  const { recs } = useFinance();
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-sm font-medium text-primary">Pontos para avaliar</h2>
      <ul className="mt-3 space-y-2.5">
        {recs.map((r, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
            <span aria-hidden="true" className="text-primary">
              •
            </span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
export function PosicaoEstrutural() {
  const { posicao, regressao, dados: cenarioLegado, base } = useFinance();
  const dados = base ?? cenarioLegado;
  if (!posicao || !regressao.disponivel)
    return (
      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-base font-semibold">Patrimônio da empresa · gap estrutural</h2>
        <p className="mt-3 font-mono">Patrimônio atual: {formatarMoeda(dados.patrimonio)}</p>
        <p className="mt-3 text-sm text-muted">
          Referência indisponível:{" "}
          {regressao.disponivel ? "Não foi possível calcular o gap." : regressao.motivo}
        </p>
      </section>
    );
  const valores = [
    { nome: "Patrimônio atual", valor: posicao.plReal, cor: "var(--primary)" },
    { nome: "Referência do modelo", valor: posicao.plTeorico, cor: "var(--muted)" },
  ];
  const minimo = Math.min(0, ...valores.map((item) => item.valor));
  const amplitude = Math.max(0, ...valores.map((item) => item.valor)) - minimo || 1;
  const coordenada = (valor: number) => ((valor - minimo) / amplitude) * 1000;
  const zero = coordenada(0);
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-base font-semibold">Patrimônio da empresa · gap estrutural</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        O gap estrutural é a diferença entre o patrimônio do cenário atual e a referência do modelo.
      </p>
      <dl className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="min-w-0">
          <dt className="text-xs text-muted">Patrimônio atual (PL real)</dt>
          <dd className="mt-1 break-words font-mono text-lg font-semibold tabular-nums">
            {formatarMoeda(posicao.plReal)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted">Referência do modelo (PL teórico)</dt>
          <dd className="mt-1 break-words font-mono text-lg font-semibold tabular-nums">
            {formatarMoeda(posicao.plTeorico)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted">Gap estrutural</dt>
          <dd
            className={`mt-1 break-words font-mono text-lg font-semibold tabular-nums ${posicao.gap < 0 ? "text-negative" : "text-positive"}`}
          >
            {posicao.gap > 0 ? "+" : ""}
            {formatarMoeda(posicao.gap)}
            <span className="mt-1 block text-sm font-normal">
              {posicao.gapPct === null
                ? "Percentual indisponível: referência igual a zero."
                : `${posicao.gapPct > 0 ? "+" : ""}${posicao.gapPct.toFixed(1).replace(".", ",")}% em relação ao modelo`}
            </span>
          </dd>
        </div>
      </dl>
      <figure
        className="mt-5 border-t border-border pt-4"
        aria-label="Gráfico de gap estrutural: patrimônio atual e referência do modelo"
      >
        <figcaption className="mb-4 text-sm font-medium">
          Compare o patrimônio com a referência
        </figcaption>
        <div className="space-y-4">
          {valores.map((item) => (
            <div key={item.nome}>
              <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs">
                <span>{item.nome}</span>
                <span className="font-mono text-muted">{formatarMoeda(item.valor)}</span>
              </div>
              <svg
                viewBox="0 0 1000 20"
                preserveAspectRatio="none"
                className="h-5 w-full rounded-sm bg-surface-2"
                aria-hidden="true"
              >
                <rect
                  x={Math.min(zero, coordenada(item.valor))}
                  y="0"
                  width={Math.abs(coordenada(item.valor) - zero)}
                  height="20"
                  fill={item.cor}
                />
                <line
                  x1={zero}
                  x2={zero}
                  y1="0"
                  y2="20"
                  stroke="var(--foreground)"
                  strokeWidth="2"
                />
              </svg>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed">
          <strong>
            {posicao.gap < 0
              ? "Abaixo da referência: "
              : posicao.gap > 0
                ? "Acima da referência: "
                : "Na referência: "}
          </strong>
          {posicao.gap === 0
            ? "o patrimônio coincide com o valor do modelo."
            : `a diferença é de ${formatarMoeda(Math.abs(posicao.gap))}.`}
        </p>
      </figure>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Regressão por mínimos quadrados ajustada às {regressao.n} empresas da amostra selecionada.
        R² na própria amostra:{" "}
        {regressao.r2 === null ? "indisponível" : regressao.r2.toFixed(3).replace(".", ",")}; erro
        residual: {formatarMoeda(regressao.erroResidual)}. O R² mede ajuste, não precisão futura. O
        gap não comprova falta ou sobra de capital e não é uma previsão temporal.
      </p>
    </section>
  );
}
