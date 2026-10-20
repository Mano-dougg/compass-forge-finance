import { recomendacoes } from "@/lib/benchmarking";
import { createContext, useContext, useMemo, useState } from "react";
import {
  aplicarPasso,
  diagnosticar,
  posicaoEstrutural,
  preverPatrimonio,
  type EmpresaDados,
} from "@/lib/sad-model";
import { importarBaseMercado, limitesMercado, type BaseMercado } from "@/lib/market-clusters";
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

export const PASSO = 5_000_000;
const PADRAO: EmpresaDados = {
  receita: 182_400_000,
  custos: 94_150_000,
  patrimonio: 168_240_000,
  investimento: 12_300_000,
};

export function useFinanceState(initial: CompanyDocument | null = null, accountName = "") {
  const [benchmarkPadrao] = useState(criarBenchmarkPadrao);
  const [restored] = useState(() => {
    const completa =
      !initial?.demonstracao && initial?.mercadoCompleto
        ? importarBaseMercado(initial.mercadoCompleto)
        : benchmarkPadrao;
    // Legacy demo selections return to the real default, without discarding company data.
    const selecionada =
      !initial?.demonstracao && initial?.setor
        ? importarBaseMercado(
            JSON.stringify({
              ...completa,
              setor: initial.setor,
              empresas: completa.empresas.filter((e) => e.setor === initial.setor),
            }),
          )
        : completa;
    return { completa, selecionada };
  });
  const [mercado, setMercado] = useState<BaseMercado | null>(restored.selecionada);
  const [mercadoCompleto, setMercadoCompleto] = useState<BaseMercado | null>(restored.completa);
  const [base, setBase] = useState<EmpresaDados | null>(initial?.base ?? null);
  const [dados, setDados] = useState<EmpresaDados>(initial?.dados ?? PADRAO);
  const [modalAberto, setModalAberto] = useState(!initial?.base);
  const [alerta, setAlerta] = useState<string | null>(null);
  const centroides = mercado?.centroides;
  const tetos = useMemo(() => limitesMercado(mercado), [mercado]);
  const diagnostico = useMemo(() => diagnosticar(dados, centroides), [dados, centroides]);
  const perfilBase = base ? diagnosticar(base, centroides).perfil : null;
  const projecao = useMemo(() => preverPatrimonio(dados), [dados]);
  const posicao = useMemo(() => posicaoEstrutural(dados), [dados]);
  const recs = useMemo(
    () => recomendacoes(dados, diagnostico, centroides),
    [dados, diagnostico, centroides],
  );
  const [janela, setJanela] = useState(initial?.janela ?? 3);
  const [horizonte, setHorizonte] = useState(initial?.horizonte ?? HORIZONTE_PADRAO_PATRIMONIO);
  const [nome, setNome] = useState(initial?.nome ?? accountName);
  const [linhas, setLinhas] = useState(() => prepararHistoricoPL(initial?.linhas));
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
    projecao,
    posicao,
    recs,
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
