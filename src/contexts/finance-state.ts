import { ajustarRegressaoPatrimonio, posicaoEstrutural } from "@/lib/regressao-patrimonio";
import { recomendacoes } from "@/lib/benchmarking";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { aplicarPasso, diagnosticar, type EmpresaDados } from "@/lib/sad-model";
import { limitesMercado, type BaseMercado } from "@/lib/market-clusters";
import {
  preverCenarioPatrimonio,
  prepararHistoricoPL,
  ANO_PREVISAO_PATRIMONIO,
  HORIZONTE_PADRAO_PATRIMONIO,
  type DiagnosticoTemporal,
  type HipotesesPL,
} from "@/lib/patrimonio-historico";

import type { CompanyDocument } from "@/lib/company-document";
import { criarBenchmarkPadrao } from "@/lib/default-benchmark";
import { analisarPlanejamento, invalidarConfirmacao } from "@/lib/planejamento-metas";
import { restaurarBenchmark } from "@/lib/benchmark-restoration";

export const PASSO = 5_000_000;
const PADRAO: EmpresaDados = {
  receita: 182_400_000,
  custos: 94_150_000,
  patrimonio: 168_240_000,
  investimento: 12_300_000,
};

export function useFinanceState(initial: CompanyDocument | null = null, accountName = "") {
  const [benchmarkPadrao] = useState(criarBenchmarkPadrao);
  const [restored] = useState(() => restaurarBenchmark(initial, benchmarkPadrao));
  const [mercado, setMercado] = useState<BaseMercado | null>(restored.selecionada);
  const [mercadoCompleto, setMercadoCompleto] = useState<BaseMercado | null>(restored.completa);
  const [base, setBase] = useState<EmpresaDados | null>(initial?.base ?? null);
  const [dados, setDados] = useState<EmpresaDados>(initial?.dados ?? PADRAO);
  const [modalAberto, setModalAberto] = useState(false);
  const [alerta, setAlerta] = useState<string | null>(restored.aviso);
  const centroides = mercado?.centroides;
  const dadosEmpresa = base ?? dados;
  const tetos = useMemo(() => limitesMercado(mercado), [mercado]);
  const diagnostico = useMemo(
    () =>
      centroides?.length === 0
        ? {
            perfil: "Indisponível",
            descricao: mercado?.erroClusters ?? "Não há grupos suficientes neste recorte.",
            distancia: 0,
            empresasNoCluster: 0,
          }
        : diagnosticar(dadosEmpresa, centroides),
    [dadosEmpresa, centroides, mercado?.erroClusters],
  );
  const perfilBase =
    base && centroides?.length !== 0 ? diagnosticar(base, centroides).perfil : null;
  const regressao = useMemo(() => ajustarRegressaoPatrimonio(mercado?.empresas ?? []), [mercado]);
  const posicao = useMemo(
    () => posicaoEstrutural(dadosEmpresa, regressao),
    [dadosEmpresa, regressao],
  );
  const recs = useMemo(
    () => (centroides?.length === 0 ? [] : recomendacoes(dadosEmpresa, diagnostico, centroides)),
    [dadosEmpresa, diagnostico, centroides],
  );
  const [janela, setJanela] = useState(initial?.janela ?? 3);
  const [horizonte, setHorizonte] = useState(initial?.horizonte ?? HORIZONTE_PADRAO_PATRIMONIO);
  const [nome, setNome] = useState(initial?.nome ?? accountName);
  const [planejamento, setPlanejamento] = useState<NonNullable<CompanyDocument["planejamento"]>>(
    initial?.planejamento ?? {
      objetivo: {
        patrimonioAlvo: initial?.base
          ? Math.round(initial.base.patrimonio * 1.5 * 100) / 100
          : 500_000_000,
        anos: 3,
        distribuicaoPct: 0,
        anoBase: 2026,
      },
      manual: {
        receita: initial?.base?.receita ?? PADRAO.receita,
        custos: initial?.base?.custos ?? PADRAO.custos,
      },
      escolha: null,
      assinatura: "",
      justificativa: "",
    },
  );
  const { patrimonio, receita, custos } = dadosEmpresa;
  const analiseMetas = useMemo(
    () =>
      analisarPlanejamento(
        { patrimonio, receita, custos },
        planejamento.objetivo,
        planejamento.manual,
        mercado?.empresas ?? [],
        { setor: mercado?.setor ?? "", periodo: mercado?.periodo ?? "" },
      ),
    [patrimonio, receita, custos, planejamento.objetivo, planejamento.manual, mercado],
  );
  const [linhas, setLinhas] = useState(() => prepararHistoricoPL(initial?.linhas));
  useEffect(() => {
    setPlanejamento((p) => invalidarConfirmacao(p, analiseMetas.assinatura));
  }, [analiseMetas.assinatura, planejamento.assinatura]);
  const [hipoteses, setHipoteses] = useState<Record<keyof HipotesesPL, string>>(
    initial?.hipoteses ?? {
      impostoPct: "0",
      retencaoPct: "100",
      retornoInvestimentoPct: "0",
    },
  );
  const resultadoTemporal = useMemo((): {
    diagnostico: DiagnosticoTemporal | null;
    erro: string | null;
  } => {
    if (!base)
      return {
        diagnostico: null,
        erro: "Informe os dados atuais da empresa para iniciar a projeção.",
      };
    try {
      const observacoes = linhas
        .filter((l) => l.patrimonio.trim() !== "")
        .map((l) => ({
          ano: l.ano.trim() === "" ? NaN : Number(l.ano),
          patrimonio: Number(l.patrimonio),
        }));
      if (Object.values(hipoteses).some((v) => v.trim() === ""))
        throw new Error("Preencha as três hipóteses percentuais do cenário.");
      const taxas = Object.fromEntries(
        Object.entries(hipoteses).map(([k, v]) => [k, Number(v)]),
      ) as HipotesesPL;
      const previsao = preverCenarioPatrimonio({
        historico: observacoes,
        base,
        cenario: dados,
        janela,
        hipoteses: taxas,
        anoAlvo: ANO_PREVISAO_PATRIMONIO,
        horizonte,
      });
      return {
        diagnostico: {
          empresa: nome.trim() || "Empresa informada",
          observacoes,
          hipoteses: taxas,
          previsao,
        },
        erro: null,
      };
    } catch (e) {
      return { diagnostico: null, erro: e instanceof Error ? e.message : "Histórico inválido." };
    }
  }, [base, dados, linhas, janela, nome, hipoteses, horizonte]);

  function passo(campo: keyof EmpresaDados, direcao: 1 | -1 | 0, valorDireto?: number) {
    const ajuste = valorDireto === undefined ? PASSO * direcao : valorDireto - dados[campo];
    const r = aplicarPasso(dados, campo, ajuste, tetos);
    setDados(r.dados);
    setAlerta(r.alerta);
  }
  function restaurar() {
    if (base) {
      setDados(base);
      setAlerta(null);
    }
  }
  function confirmarDados(novos: EmpresaDados) {
    // A primeira empresa informada substitui também o orçamento fictício do formulário.
    if (!base)
      setPlanejamento((p) => ({ ...p, manual: { receita: novos.receita, custos: novos.custos } }));
    setBase(novos);
    setDados(novos);
    setAlerta(null);
    setModalAberto(false);
  }
  return {
    mercado,
    setMercado,
    mercadoCompleto,
    setMercadoCompleto,
    base,
    dados,
    modalAberto,
    setModalAberto,
    alerta,
    setAlerta,
    centroides,
    tetos,
    diagnostico,
    perfilBase,
    regressao,
    posicao,
    recs,
    janela,
    setJanela,
    horizonte,
    setHorizonte,
    nome,
    setNome,
    planejamento,
    setPlanejamento,
    analiseMetas,
    linhas,
    setLinhas,
    hipoteses,
    setHipoteses,
    resultadoTemporal,
    temporal: resultadoTemporal.diagnostico,
    passo,
    restaurar,
    confirmarDados,
  };
}
export const FinanceContext = createContext<ReturnType<typeof useFinanceState> | null>(null);
export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("FinanceProvider não encontrado.");
  return context;
}
