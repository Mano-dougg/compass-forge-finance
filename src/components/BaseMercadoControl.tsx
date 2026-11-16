import { useState } from "react";
import {
  importarBaseMercado,
  descricaoReferencia,
  selecionarSetor,
  type BaseMercado,
} from "@/lib/market-clusters";
import { ARQUIVO_BENCHMARK_PADRAO, ANO_BENCHMARK_PADRAO } from "@/lib/default-benchmark";
import { Button } from "@/components/ui/button";

export function BaseMercadoControl({
  base,
  onChange,
  completa,
  setCompleta,
}: {
  base: BaseMercado | null;
  completa: BaseMercado | null;
  setCompleta: (base: BaseMercado | null) => void;
  onChange: (base: BaseMercado | null) => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  async function importar(arquivo: File) {
    setErro(null);
    setCarregando(true);
    try {
      if (arquivo.size > 5_000_000) throw new Error("O arquivo deve ter até 5 MB.");
      const nova = importarBaseMercado(await arquivo.text());
      setCompleta(nova);
      onChange(nova);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Falha na importação. Confira o formato do arquivo.",
      );
    } finally {
      setCarregando(false);
    }
  }
  async function carregarCVM() {
    setErro(null);
    setCarregando(true);
    try {
      const resposta = await fetch(ARQUIVO_BENCHMARK_PADRAO);
      if (!resposta.ok) throw new Error("Não foi possível carregar a base CVM. Tente novamente.");
      const nova = importarBaseMercado(await resposta.text());
      setCompleta(nova);
      onChange(nova);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar a base CVM.");
    } finally {
      setCarregando(false);
    }
  }
  const setores = completa
    ? [...new Set(completa.empresas.map((e) => e.setor).filter((s): s is string => !!s))].sort()
    : [];
  function filtrar(setor: string) {
    if (!completa) return;
    setErro(null);
    try {
      onChange(selecionarSetor(completa, setor));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao filtrar setor.");
    }
  }
  return (
    <section
      className="mb-5 border-b border-border pb-4"
      aria-label="Base de benchmarking"
      aria-busy={carregando}
    >
      <p className="mb-3 text-sm leading-relaxed text-muted">
        O benchmark CVM 2026 do catálogo integral de empresas B3 da pesquisa é carregado
        automaticamente. A cobertura inclui apenas empresas com demonstrações compatíveis no mesmo
        período. Use estas opções para escolher um setor ou trocar a fonte.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-medium">Base de benchmarking</h2>
        <Button
          variant="outline"
          size="sm"
          disabled={carregando}
          onClick={() => void carregarCVM()}
        >
          Restaurar catálogo B3 {ANO_BENCHMARK_PADRAO}
        </Button>
        <input
          id="base-mercado"
          type="file"
          accept=".json,application/json"
          disabled={carregando}
          className="max-w-full text-xs text-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-2 file:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          aria-label="Importar base setorial em JSON"
          aria-describedby="base-instrucoes"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            e.target.value = "";
            if (arquivo) void importar(arquivo);
          }}
        />
        <a
          className="text-xs text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
          href="/base-mercado-exemplo.json"
          download
        >
          Baixar exemplo fictício
        </a>
      </div>
      {completa && base && setores.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <label htmlFor="setor-mercado">Setor de referência</label>
          <select
            id="setor-mercado"
            disabled={carregando}
            value={base === completa ? "" : base.setor}
            onChange={(e) => filtrar(e.target.value)}
            className="max-w-full rounded-md border border-border bg-background px-3 py-2 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <option value="">
              Base completa · {completa.empresas.length} empresas (sem filtro)
            </option>
            {setores.map((setor) => {
              const n = completa.empresas.filter((e) => e.setor === setor).length;
              return (
                <option key={setor} value={setor}>
                  {setor} · {n} empresas{n < 3 ? " (sem agrupamento)" : ""}
                </option>
              );
            })}
          </select>
        </div>
      )}
      {base && (
        <p className="mt-3 text-sm">
          <strong>
            {base.empresas.length} de {completa?.empresas.length ?? base.empresas.length} empresas
            selecionadas.
          </strong>{" "}
          A mediana da seleção inteira é usada na opção C do planejamento. Os gráficos por grupo são
          comparações descritivas separadas.
        </p>
      )}
      {base && (
        <p className="mt-2 text-xs text-muted">
          {base.empresas.length < 10
            ? "Amostra pequena: os três clusters podem ter poucos pares; diagnóstico exploratório."
            : "Confira a representatividade setorial antes de usar a referência."}{" "}
          Fluxo de investimento da base CVM representa saída líquida de caixa; não equivale a CAPEX
          bruto.{" "}
          {base.centroides.some((c) => (c.empresas ?? 0) < 3)
            ? "Há clusters com menos de três empresas; as comparações exigem cautela."
            : ""}
        </p>
      )}
      <p className="mt-3 text-xs text-muted" role="status">
        {carregando ? "Calculando clusters da base…" : descricaoReferencia(base)}
      </p>
      {base?.metodologia && (
        <p className="mt-3 max-w-prose text-xs leading-relaxed text-muted">{base.metodologia}</p>
      )}
      {base && completa?.cobertura && (
        <p className="mt-2 text-xs text-muted">
          Cobertura da coleta: {completa.empresas.length} de {completa.cobertura.selecionadas}{" "}
          empresas; {completa.cobertura.excluidas} exclusões documentadas no arquivo.
        </p>
      )}
      <p id="base-instrucoes" className="mt-2 max-w-prose text-xs leading-relaxed text-muted">
        Use o catálogo integral ou importe um JSON em reais; selecione um setor para comparar pares.
        Custos e investimento na entrada manual são magnitudes positivas. O K-Means usa patrimônio,
        receita, custos assinados e fluxo líquido de investimento, com Z-score calculado na amostra
        selecionada. O campo opcional fluxoInvestimentoOriginal preserva entradas e saídas com
        sinal; sem ele, investimento é tratado como saída. Os nomes dos perfis descrevem o porte
        relativo e não uma ordem de qualidade. O catálogo é um snapshot do repositório, não uma
        consulta à listagem atual da B3. A amostra original de 35 empresas permanece disponível no
        arquivo histórico. Bases importadas exigem conferência da origem. Sem conta, importações e
        filtros ficam nesta sessão; com login, são salvos com os dados da empresa.
      </p>
      {erro && (
        <p className="mt-2 text-xs text-negative" role="alert">
          {erro} A referência anterior foi mantida.
        </p>
      )}
      {base?.erroClusters && (
        <p role="status" className="mt-3 text-xs text-primary">
          Agrupamento indisponível: {base.erroClusters}
        </p>
      )}
    </section>
  );
}
