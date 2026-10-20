import { useFinance } from "@/contexts/finance-state";
import { formatarMoeda, type EmpresaDados } from "@/lib/sad-model";
const campos: { chave: keyof EmpresaDados; label: string }[] = [
  { chave: "receita", label: "Receita líquida" },
  { chave: "custos", label: "Custos e despesas" },
  { chave: "investimento", label: "Fluxo de investimento" },
  { chave: "patrimonio", label: "Patrimônio líquido" },
];
export function ResumoFinanceiro() {
  const { base, dados } = useFinance();
  return (
    <section className="mt-5" aria-label="Resumo dos dados financeiros">
      <h2 className="font-medium">Seus valores e as mudanças em teste</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        “Informado” é o ponto de partida. “Cenário atual” inclui as alterações feitas no simulador;
        editar a simulação não altera os valores originais.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted">
              <th scope="col" className="py-3 pr-4 font-normal">
                Indicador
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-normal">
                Informado
              </th>
              <th scope="col" className="py-3 text-right font-normal">
                Cenário atual
              </th>
            </tr>
          </thead>
          <tbody>
            {campos.map(({ chave, label }) => (
              <tr key={chave} className="border-b border-border">
                <th scope="row" className="py-3 pr-4 font-normal">
                  {label}
                </th>
                <td className="whitespace-nowrap py-3 pr-4 text-right font-mono">
                  {base ? formatarMoeda(base[chave]) : "Não informado"}
                </td>
                <td className="whitespace-nowrap py-3 text-right font-mono">
                  {formatarMoeda(dados[chave])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
