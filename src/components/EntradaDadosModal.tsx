import { useState } from "react";
import { type EmpresaDados } from "@/lib/sad-model";
import { formatarReais as formatarMoeda } from "@/lib/planejamento-metas";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
const CAMPOS: { chave: keyof EmpresaDados; label: string }[] = [
  { chave: "patrimonio", label: "Patrimônio líquido na data-base (R$)" },
  { chave: "receita", label: "Receita líquida anual (R$)" },
  { chave: "custos", label: "Custos e despesas anuais (R$)" },
  { chave: "investimento", label: "Saída líquida de investimento anual (R$)" },
];
type Props = {
  inicial: EmpresaDados;
  onCancelar?: (() => void) | undefined;
  onConfirmar: (dados: EmpresaDados) => void;
  tetos?: EmpresaDados;
};
export function EntradaDadosModal({ inicial, onCancelar, onConfirmar }: Props) {
  const [valores, setValores] = useState(() =>
    Object.fromEntries(CAMPOS.map(({ chave }) => [chave, String(inicial[chave])])),
  );
  const [erro, setErro] = useState("");
  function submeter(e: React.FormEvent) {
    e.preventDefault();
    const dados = {} as EmpresaDados;
    for (const { chave } of CAMPOS) {
      const n = Number(valores[chave]);
      if (
        !valores[chave]?.trim() ||
        !Number.isFinite(n) ||
        !Number.isSafeInteger(Math.round(n * 100)) ||
        (chave !== "patrimonio" && n < 0)
      ) {
        setErro("Preencha todos os valores em reais. Apenas o patrimônio pode ser negativo.");
        return;
      }
      dados[chave] = n;
    }
    onConfirmar(dados);
  }
  return (
    <Dialog
      open
      onOpenChange={(aberto) => {
        if (!aberto) onCancelar?.();
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg bg-surface">
        <DialogTitle>Dados da sua empresa</DialogTitle>
        <DialogDescription>
          Use receita, custos e investimento do mesmo período anual. O patrimônio é o saldo na
          data-base definida em Planejar metas.
        </DialogDescription>
        <form onSubmit={submeter} className="space-y-4">
          {CAMPOS.map(({ chave, label }) => (
            <label key={chave} className="block text-sm" htmlFor={`empresa-${chave}`}>
              {label}
              <Input
                id={`empresa-${chave}`}
                type="number"
                required
                step="0.01"
                min={chave === "patrimonio" ? undefined : 0}
                value={valores[chave] ?? ""}
                onChange={(e) => setValores((p) => ({ ...p, [chave]: e.target.value }))}
                className="mt-1.5 h-auto w-full rounded-md border border-border bg-background px-3 py-2.5 text-base tabular-nums focus-visible:outline-2 focus-visible:outline-primary"
              />
              <span className="mt-1 block text-xs text-muted">
                {valores[chave]?.trim() && Number.isFinite(Number(valores[chave]))
                  ? formatarMoeda(Number(valores[chave]))
                  : "Informe um valor"}
                {chave === "investimento" ? " · somente no benchmark" : ""}
              </span>
            </label>
          ))}
          {erro && (
            <p role="alert" className="text-negative">
              {erro}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onCancelar}>
              Cancelar
            </Button>
            <Button type="submit">Usar estes dados</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
