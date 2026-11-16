import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { PencilLine } from "lucide-react";
import { usePlanejamento } from "@/contexts/planejamento-state";
import {
  planejarMetas,
  simularOrcamento,
  formatarReais as formatarMoeda,
  nomeOrcamento,
  type ObjetivoMetas,
} from "@/lib/planejamento-metas";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ValoresOrcamento } from "./PlanejamentoComum";

const inputClass =
  "mt-2 h-auto w-full rounded-md border border-border bg-background px-3 py-3 text-base tabular-nums focus-visible:outline-2 focus-visible:outline-primary";

export function FormularioObjetivo() {
  const { entrada, planejamento, setPlanejamento, mercado } = usePlanejamento();
  const [campos, setCampos] = useState<Record<keyof ObjetivoMetas, string>>(() => ({
    patrimonioAlvo: String(planejamento.objetivo.patrimonioAlvo),
    anoBase: String(planejamento.objetivo.anoBase),
    anos: String(planejamento.objetivo.anos),
    distribuicaoPct: String(planejamento.objetivo.distribuicaoPct),
  }));
  const alterado = (Object.keys(campos) as (keyof ObjetivoMetas)[]).some(
    (chave) => !campos[chave].trim() || Number(campos[chave]) !== planejamento.objetivo[chave],
  );
  const [erro, setErro] = useState("");
  const [atualizado, setAtualizado] = useState(false);
  function submeter(event: FormEvent) {
    event.preventDefault();
    try {
      if (Object.values(campos).some((c) => !c.trim()))
        throw new Error("Preencha todos os parâmetros do objetivo.");
      const objetivo = {
        patrimonioAlvo: Number(campos["patrimonioAlvo"]),
        anos: Number(campos["anos"]),
        distribuicaoPct: Number(campos["distribuicaoPct"]),
        anoBase: Number(campos["anoBase"]),
      };
      planejarMetas(entrada, objetivo, mercado?.empresas ?? []);
      setPlanejamento((p) => ({ ...p, objetivo }));
      setErro("");
      setAtualizado(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Revise os parâmetros.");
    }
  }
  return (
    <form
      onSubmit={submeter}
      className="mt-6 rounded-xl border border-border bg-surface p-5 sm:p-6"
      aria-labelledby="titulo-objetivo"
    >
      <h2 id="titulo-objetivo" className="text-lg font-semibold">
        Qual patrimônio você quer alcançar?
      </h2>
      <p className="mt-1 max-w-prose text-sm text-muted">
        Informe o objetivo. O sistema calcula diferentes orçamentos anuais; você avalia qual faz
        sentido para a empresa.
      </p>
      <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.5fr]">
        {(
          [
            {
              chave: "patrimonioAlvo",
              label: "Patrimônio desejado (R$)",
              step: "0.01",
              min: undefined,
              max: undefined,
            },
            { chave: "anoBase", label: "Ano-base dos dados", step: "1", min: 1900, max: 2200 },
            { chave: "anos", label: "Prazo (anos)", step: "1", min: 1, max: 50 },
            {
              chave: "distribuicaoPct",
              label: "Distribuição aos sócios (%)",
              step: "0.01",
              min: 0,
              max: 100,
            },
          ] as const
        ).map((campo) => (
          <label key={campo.chave} className="text-sm" htmlFor={`meta-${campo.chave}`}>
            {campo.label}
            <Input
              id={`meta-${campo.chave}`}
              type="number"
              required
              min={campo.min}
              max={campo.max}
              step={campo.step}
              value={campos[campo.chave] ?? ""}
              onChange={(e) => {
                setCampos((c) => ({ ...c, [campo.chave]: e.target.value }));
                setAtualizado(false);
              }}
              className={inputClass}
            />
            {campo.chave === "patrimonioAlvo" &&
              campos.patrimonioAlvo.trim() &&
              Number.isFinite(Number(campos.patrimonioAlvo)) && (
                <span className="mt-1 block text-xs text-muted">
                  {formatarMoeda(Number(campos.patrimonioAlvo))}
                </span>
              )}
          </label>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Button type="submit">Atualizar alternativas</Button>
        <p className="max-w-prose text-xs text-muted">
          A distribuição incide apenas sobre resultado positivo. Padrão: 0%, com todo o resultado
          retido. Orçamentos iguais em todos os anos.
        </p>
      </div>
      {erro && (
        <p role="alert" className="mt-3 text-negative">
          {erro}
        </p>
      )}
      {!erro && atualizado && (
        <p role="status" className="mt-3 text-positive">
          Alternativas atualizadas. Confira os valores antes de escolher.
        </p>
      )}
      {!atualizado && alterado && (
        <p role="status" className="mt-3 text-xs text-primary">
          Há parâmetros não aplicados. As comparações abaixo ainda usam o último objetivo
          confirmado.
        </p>
      )}
    </form>
  );
}

export function OrcamentoPersonalizado() {
  const { planejamento } = usePlanejamento();
  return (
    <FormularioOrcamentoPersonalizado
      key={`${planejamento.manual.receita}:${planejamento.manual.custos}`}
    />
  );
}

function FormularioOrcamentoPersonalizado() {
  const { entrada, planejamento, setPlanejamento, assinatura, manual, escolhida, erroManual } =
    usePlanejamento();
  const [campos, setCampos] = useState(() => ({
    receita: String(planejamento.manual.receita),
    custos: String(planejamento.manual.custos),
  }));
  const alterado = (["receita", "custos"] as const).some(
    (chave) => !campos[chave].trim() || Number(campos[chave]) !== planejamento.manual[chave],
  );
  const [erro, setErro] = useState("");
  function simular(event: FormEvent) {
    event.preventDefault();
    const r = Number(campos.receita);
    const c = Number(campos.custos);
    if (
      !campos.receita.trim() ||
      !campos.custos.trim() ||
      ![r, c].every(
        (v) => Number.isFinite(v) && v >= 0 && Number.isSafeInteger(Math.round(v * 100)),
      )
    ) {
      setErro("Informe receita e custos não negativos, em reais.");
      return;
    }
    try {
      simularOrcamento(entrada, planejamento.objetivo, r, c);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Revise os valores.");
      return;
    }
    setErro("");
    setPlanejamento((p) => ({ ...p, manual: { receita: r, custos: c } }));
  }
  return (
    <section
      className="mt-8 grid items-start gap-6 rounded-xl border border-border p-5 sm:p-6 lg:grid-cols-2"
      aria-labelledby="personalizado"
    >
      <div>
        <PencilLine aria-hidden="true" className="mb-3 text-muted" />
        <h2 id="personalizado" className="text-lg font-semibold">
          Prefere definir seus próprios valores?
        </h2>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Teste um orçamento que considere viável. Ele pode ficar abaixo ou acima do objetivo; o
          sistema mostra a diferença.
        </p>
        <form onSubmit={simular} className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {(["receita", "custos"] as const).map((c) => (
              <label key={c} htmlFor={`manual-${c}`}>
                {c === "receita" ? "Receita anual (R$)" : "Custos anuais (R$)"}
                <Input
                  id={`manual-${c}`}
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={campos[c]}
                  onChange={(e) => setCampos((p) => ({ ...p, [c]: e.target.value }))}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="submit" variant="outline">
              Simular orçamento
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setCampos({ receita: String(entrada.receita), custos: String(entrada.custos) })
              }
            >
              Preencher com dados atuais
            </Button>
          </div>
          {erro && (
            <p role="alert" className="mt-3 text-negative">
              {erro}
            </p>
          )}
          {alterado && (
            <p role="status" className="mt-3 text-xs text-primary">
              Há valores não aplicados. Simule o orçamento para atualizar a comparação e poder
              escolhê-lo.
            </p>
          )}
        </form>
      </div>
      <div>
        {erroManual && (
          <p role="alert" className="text-negative">
            Orçamento personalizado indisponível: {erroManual}
          </p>
        )}
        {manual && (
          <>
            <h3 className="font-semibold">Última simulação confirmada</h3>
            <ValoresOrcamento orcamento={manual} />
            <p className="mt-4 text-sm">
              {manual.patrimonioFinal >= planejamento.objetivo.patrimonioAlvo
                ? `Fica ${formatarMoeda(manual.patrimonioFinal - planejamento.objetivo.patrimonioAlvo)} acima do objetivo, nas hipóteses.`
                : `Fica ${formatarMoeda(planejamento.objetivo.patrimonioAlvo - manual.patrimonioFinal)} abaixo do objetivo.`}
            </p>
            <Button
              className="mt-4"
              disabled={alterado}
              aria-pressed={Boolean(escolhida && planejamento.escolha === "manual")}
              onClick={() => setPlanejamento((p) => ({ ...p, escolha: "manual", assinatura }))}
            >
              Escolher orçamento personalizado
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

export function EscolhaGestor() {
  const { escolhida, planejamento, setPlanejamento } = usePlanejamento();
  return (
    <section className="mt-8 border-t border-border pt-6" aria-labelledby="escolha-gestor">
      <h2 id="escolha-gestor" className="text-xl font-semibold">
        Sua decisão de planejamento
      </h2>
      <p role="status" className="mt-2 text-primary">
        {escolhida
          ? nomeOrcamento(planejamento.escolha)
          : "Compare os orçamentos e confirme uma opção para compor o plano."}
      </p>
      <label className="mt-5 block max-w-3xl text-sm" htmlFor="justificativa-plano">
        O que você considerou para escolher? (opcional)
        <textarea
          id="justificativa-plano"
          maxLength={2000}
          rows={3}
          value={planejamento.justificativa}
          onChange={(e) => setPlanejamento((p) => ({ ...p, justificativa: e.target.value }))}
          placeholder="Ex.: manter a equipe atual e priorizar o esforço comercial."
          className={inputClass}
        />
      </label>
      <div className="mt-5 flex flex-wrap gap-4">
        <Button asChild variant="outline">
          <Link to="/patrimonio-futuro">Ver trajetória anual</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/relatorios">Revisar relatório</Link>
        </Button>
      </div>
      <p className="mt-5 max-w-prose text-xs text-muted">
        Modelo educacional: resultado simplificado não é lucro líquido contábil. Não considera
        aportes, impostos adicionais ou outras mutações do patrimônio. Investimento permanece
        somente no benchmark.
      </p>
    </section>
  );
}
