import { ClientOnly } from "@tanstack/react-router";
import { ComparacaoReceita } from "@/components/ComparacaoReceita";
import { useFinance } from "@/contexts/finance-state";
import { GraficoDispersao, GraficoPorte } from "@/components/GraficosComparativos";
import { dadosRadar } from "@/lib/benchmarking";
import { formatarMoeda } from "@/lib/sad-model";

export function ComparativosMercado({ incluirReceita = true }: { incluirReceita?: boolean }) {
  const { dados: cenarioLegado, base, diagnostico, centroides, mercado } = useFinance();
  const dados = base ?? cenarioLegado;
  const comparacao = dadosRadar(dados, diagnostico.perfil, centroides);
  return (
    <div className="mt-4 space-y-5">
      {incluirReceita && <ComparacaoReceita />}
      <section
        data-report-chart={
          mercado
            ? `Amostra de ${mercado.empresas.length} empresas · margem e receita em relação ao patrimônio`
            : "Dispersão · amostra simulada"
        }
        className="rounded-lg border border-border bg-surface p-5"
      >
        <h2 className="text-lg font-semibold">Onde sua empresa aparece entre os grupos?</h2>
        {mercado && (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            <strong className="text-foreground">
              {mercado.empresas.length} empresas na amostra selecionada
            </strong>{" "}
            · {mercado.setor}. Cada ponto representa uma empresa dessa seleção; a estrela é a sua
            empresa.
          </p>
        )}
        <div className="mt-5 grid items-center gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="min-w-0">
            {dados.patrimonio > 0 ? (
              <ClientOnly fallback={<div className="h-[240px]" />}>
                <GraficoDispersao
                  dados={dados}
                  diagnostico={diagnostico}
                  centroides={centroides}
                  mercado={mercado}
                />
              </ClientOnly>
            ) : (
              <p className="text-sm text-muted">
                A dispersão usa receita/patrimônio e requer patrimônio positivo. Consulte os demais
                comparativos e os valores absolutos.
              </p>
            )}
          </div>
          <div className="min-w-0 space-y-3 text-sm leading-relaxed">
            <h3 className="text-base font-semibold text-primary">
              Seu grupo de comparação é {diagnostico.perfil}.
            </h3>
            <p>
              {mercado
                ? `Todas as ${mercado.empresas.length} empresas da seleção aparecem no gráfico. Dessas, ${diagnostico.empresasNoCluster} pertencem ao grupo ${diagnostico.perfil}, destacado em verde. As demais estão em cinza.`
                : "A estrela amarela é sua empresa; os demais pontos representam a amostra simulada."}
            </p>
            <p className="text-muted">
              As médias destes gráficos usam o grupo mais parecido com sua operação. A opção C de
              planejamento usa a mediana de toda a seleção geral ou setorial, e não apenas deste
              grupo.
            </p>
            <p className="text-muted">
              Mais à direita, maior a parcela da receita que resta após os custos informados. Mais
              acima, maior a receita em relação ao patrimônio. A posição descreve a operação; não é
              uma nota de qualidade. Os eixos mostram dois indicadores descritivos; os grupos são
              calculados pelas quatro variáveis contábeis padronizadas.
            </p>
            <p className="text-muted">
              Passe o mouse ou toque nos pontos para ver o nome da empresa, o grupo e os valores.
              Pontos com indicadores próximos podem se sobrepor.
            </p>
          </div>
        </div>
      </section>
      <section
        data-report-chart="Valores totais em relação à média do grupo (100%)"
        className="rounded-lg border border-border bg-surface p-5"
      >
        <h2 className="text-lg font-semibold">O tamanho da sua empresa em relação ao grupo</h2>
        {mercado && (
          <p className="mt-2 text-sm text-muted">
            Amostra selecionada: {mercado.empresas.length} empresas. Referência destas barras: as{" "}
            {diagnostico.empresasNoCluster} empresas do grupo {diagnostico.perfil}.
          </p>
        )}
        <div className="mt-5 grid items-center gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="min-w-0">
            {dados.patrimonio >= 0 ? (
              <ClientOnly fallback={<div className="h-[280px]" />}>
                <GraficoPorte dados={dados} diagnostico={diagnostico} centroides={centroides} />
              </ClientOnly>
            ) : (
              <p className="text-sm text-muted">
                A comparação de volumes requer patrimônio não negativo. Os valores completos estão
                ao lado; o planejamento aceita patrimônio negativo.
              </p>
            )}
          </div>
          <div className="min-w-0 text-sm leading-relaxed">
            <h3 className="text-base font-medium">Compare os percentuais e os valores em reais</h3>
            <p className="mt-2 text-muted">
              100% é a média do grupo. 50% é metade; 200%, o dobro. Uma barra maior indica maior
              volume, não melhor desempenho.
            </p>
            <dl className="mt-4 divide-y divide-border">
              {comparacao.map((item) => (
                <div key={item.indicador} className="py-3">
                  <dt className="font-medium">{item.indicador}</dt>
                  <dd className="mt-1 text-xs leading-relaxed text-muted">
                    Sua empresa:{" "}
                    <span className="font-mono text-foreground">
                      {formatarMoeda(item.valorEmpresa)}
                    </span>
                    <br />
                    Média do grupo ({diagnostico.empresasNoCluster} empresas):{" "}
                    <span className="font-mono">{formatarMoeda(item.valorCluster)}</span>
                    {!item.semReferencia && (
                      <span className="mt-1 block text-primary">
                        Sua empresa equivale a{" "}
                        {item.empresa.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% dessa
                        média.
                      </span>
                    )}
                    {item.semReferencia && (
                      <span className="block">
                        Média zero: sem comparação percentual neste eixo.
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted">
              As barras usam a mesma escala. Quando a empresa é muito menor que a média, sua barra
              fica curta; o percentual exato permanece visível ao lado dela. Este gráfico compara
              valores totais. Para avaliar custos e investimento proporcionalmente à receita, use a
              comparação por R$ 100 acima.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
