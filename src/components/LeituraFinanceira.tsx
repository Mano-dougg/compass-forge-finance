import { useFinance } from "@/contexts/finance-state";
import { leituraFinanceira } from "@/lib/leitura-financeira";

export function LeituraFinanceira({ compacta = false }: { compacta?: boolean }) {
  const { dados, base, diagnostico, centroides, mercado } = useFinance();
  if (!base)
    return (
      <section className="my-6 border-y border-border py-5">
        <h2 className="text-lg font-semibold">Comece pelos dados da sua empresa</h2>
        <p className="mt-2 text-sm text-muted">
          Use “Informar dados” para ver a leitura do seu negócio. Os números exibidos antes disso
          são apenas um exemplo.
        </p>
      </section>
    );
  const { resumo } = leituraFinanceira(dados, diagnostico.perfil, centroides);
  const alterado = Object.keys(base).some(
    (campo) => base[campo as keyof typeof base] !== dados[campo as keyof typeof dados],
  );
  return (
    <section
      className={compacta ? "min-w-0" : "my-6 border-y border-border py-5"}
      aria-label="Seu negócio em linguagem simples"
    >
      {!compacta && (
        <>
          <h2 className="text-xl font-semibold tracking-tight">
            O que os números dizem sobre sua empresa
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
            {alterado
              ? "Esta leitura usa as mudanças que você está testando no simulador."
              : "Esta leitura usa os dados que você informou."}{" "}
            Comparamos empresas de tamanhos diferentes usando a mesma base: R$ 100 de receita.
          </p>
        </>
      )}
      <div className={compacta ? "divide-y divide-border" : "mt-5 divide-y divide-border"}>
        {resumo.map((item) => (
          <article key={item.titulo} className="py-5 first:pt-0 last:pb-0">
            <h3 className="text-base font-medium">{item.titulo}</h3>
            <p className="mt-2 text-base font-semibold text-primary">{item.resposta}</p>
            <p className="mt-2 max-w-prose text-sm leading-relaxed">{item.explicacao}</p>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
              <strong className="font-medium text-foreground">O que avaliar agora: </strong>
              {item.proximoPasso}
            </p>
          </article>
        ))}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-muted">
        {mercado
          ? `Referência: ${diagnostico.empresasNoCluster} empresas do grupo ${diagnostico.perfil}, dentro da base selecionada.`
          : "Referência de demonstração: os dados do grupo são simulados."}{" "}
        A comparação mostra diferenças de proporção; não é uma avaliação completa da saúde
        financeira.
      </p>
    </section>
  );
}
