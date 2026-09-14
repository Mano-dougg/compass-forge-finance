import { useState } from "react";
import {
  formatarNumero,
  parseNumero,
  TETOS,
  type EmpresaDados,
} from "@/lib/sad-model";

const CAMPOS: { chave: keyof EmpresaDados; label: string }[] = [
  { chave: "receita", label: "Receita Líquida (R$)" },
  { chave: "custos", label: "Custos e Despesas (R$)" },
  { chave: "patrimonio", label: "Patrimônio Líquido atual (R$)" },
  { chave: "investimento", label: "Fluxo de Investimento (R$)" },
];

type Props = {
  inicial: EmpresaDados;
  onCancelar?: (() => void) | undefined;
  onConfirmar: (dados: EmpresaDados) => void;
};

export function EntradaDadosModal({ inicial, onCancelar, onConfirmar }: Props) {
  const [valores, setValores] = useState<Record<keyof EmpresaDados, string>>({
    receita: formatarNumero(inicial.receita),
    custos: formatarNumero(inicial.custos),
    patrimonio: formatarNumero(inicial.patrimonio),
    investimento: formatarNumero(inicial.investimento),
  });
  const [erros, setErros] = useState<Partial<Record<keyof EmpresaDados, string>>>({});

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    const novosErros: Partial<Record<keyof EmpresaDados, string>> = {};
    const dados = {} as EmpresaDados;

    for (const { chave } of CAMPOS) {
      const n = parseNumero(valores[chave]);
      if (!n) {
        novosErros[chave] = "Campo obrigatório · informe um valor em reais.";
      } else if (n > TETOS[chave]) {
        novosErros[chave] = "Cenário fora da escala de mercado (teto do Box Plot).";
      }
      dados[chave] = n;
    }

    setErros(novosErros);
    if (Object.keys(novosErros).length === 0) onConfirmar(dados);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-background/80" onClick={onCancelar} />
      <div
        role="dialog"
        aria-label="Entrada de dados da empresa"
        className="animate-rise relative w-full max-w-md rounded-lg border border-border bg-surface shadow-2xl"
      >
        <div className="flex h-12 items-center justify-between border-b border-border px-5">
          <div>
            <div className="font-display font-semibold tracking-tight">Entrada de dados</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
              RF01 · formulário de diagnóstico
            </div>
          </div>
          {onCancelar && (
            <button
              type="button"
              onClick={onCancelar}
              aria-label="Fechar"
              className="text-lg leading-none text-muted transition-colors hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        <form className="space-y-4 p-5" onSubmit={submeter}>
          {CAMPOS.map(({ chave, label }) => (
            <div key={chave}>
              <label htmlFor={chave} className="mb-1.5 block text-[12px] text-muted">
                {label}
              </label>
              <div
                className={`flex items-center rounded-md border bg-background px-3 transition-colors focus-within:border-primary/60 ${
                  erros[chave] ? "border-negative/50" : "border-border"
                }`}
              >
                <span
                  className={`mr-2 font-mono text-[13px] ${erros[chave] ? "text-negative" : "text-muted"}`}
                >
                  R$
                </span>
                <input
                  id={chave}
                  inputMode="numeric"
                  value={valores[chave]}
                  onChange={(e) =>
                    setValores((v) => ({
                      ...v,
                      [chave]: e.target.value ? formatarNumero(parseNumero(e.target.value)) : "",
                    }))
                  }
                  className="w-full bg-transparent py-2 font-mono text-[14px] tabular-nums outline-none"
                />
              </div>
              {erros[chave] && (
                <p className="mt-1.5 text-[11px] text-negative">{erros[chave]}</p>
              )}
            </div>
          ))}

          <div className="flex gap-3 pt-1">
            {onCancelar && (
              <button
                type="button"
                onClick={onCancelar}
                className="flex-1 rounded-md border border-border px-4 py-2.5 text-[13px] text-muted transition-colors hover:text-foreground"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="flex-1 rounded-md bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Gerar Diagnóstico
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
