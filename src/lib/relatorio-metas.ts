import {
  planejarMetas,
  simularOrcamento,
  formatarReais,
  type BaseMetas,
  type ObjetivoMetas,
} from "./planejamento-metas.ts";
import type { BaseMercado } from "./market-clusters.ts";
import { ajustarRegressaoPatrimonio, posicaoEstrutural } from "./regressao-patrimonio.ts";
import { capturarGraficos } from "./chart-images.ts";

export type RelatorioMetasEntrada = {
  base: BaseMetas & { investimento: number };
  objetivo: ObjetivoMetas;
  mercado: BaseMercado | null;
  manual: { receita: number; custos: number };
  escolha: string | null;
  justificativa: string;
  nome: string;
  exemplo: boolean;
};
const escapar = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const moeda = (n: number) => escapar(formatarReais(n));

/** HTML testável e sem acesso ao navegador; usa exatamente o motor das telas. */
export function montarRelatorioMetas(args: RelatorioMetasEntrada) {
  const { base, objetivo, mercado } = args;
  const plano = planejarMetas(base, objetivo, mercado?.empresas ?? []);
  let manual = null;
  let erroManual = "";
  try {
    manual = simularOrcamento(base, objetivo, args.manual.receita, args.manual.custos);
  } catch (e) {
    erroManual = e instanceof Error ? e.message : "Revise o orçamento personalizado.";
  }
  const opcoes = [
    ...(plano.referencia ? [{ id: "referencia", ...plano.referencia }] : []),
    ...plano.alternativas.map((a) => ({ id: a.origens.join("+"), ...a })),
    ...(manual ? [{ id: "manual", ...manual }] : []),
  ];
  const escolhida = opcoes.find((a) => a.id === args.escolha);
  const regressao = ajustarRegressaoPatrimonio(mercado?.empresas ?? []);
  const posicao = posicaoEstrutural(base, regressao);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Plano de metas · ATLAS.SAD</title><style>
    @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;color:#17212b;line-height:1.6;margin:0}h1{font-size:26px;margin:0}h2{font-size:18px;margin-top:28px;border-bottom:1px solid #ccc;padding-bottom:6px}h3{font-size:14px}p{max-width:95ch}table{width:100%;border-collapse:collapse;font-size:11px}td,th{padding:8px 5px;border-bottom:1px solid #ddd;text-align:right}th:first-child,td:first-child{text-align:left}tr,figure{break-inside:avoid}thead{display:table-header-group}.nota{border:1px solid #ddd;padding:10px 12px}.escolha{background:#faf2df;font-weight:bold}figure{margin:20px 0}figure img{width:100%;max-height:330px;object-fit:contain}.graficos{break-before:page}button{padding:10px 16px;margin-bottom:20px;cursor:pointer}@media print{button{display:none}}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  </style></head><body><button onclick="window.print()">Imprimir / salvar como PDF</button><h1>ATLAS.SAD</h1><p>Plano de metas anuais e trajetória patrimonial</p><h2>${escapar(args.nome || "Empresa informada")}</h2>${args.exemplo ? '<p class="nota"><strong>Empresa fictícia de demonstração.</strong> Os valores próprios não representam uma empresa real.</p>' : ""}
  <p>Patrimônio na base ${objetivo.anoBase}: <strong>${moeda(base.patrimonio)}</strong>. Objetivo: <strong>${moeda(objetivo.patrimonioAlvo)}</strong> em ${objetivo.anoBase + objetivo.anos}, com prazo de ${objetivo.anos} ano(s). Distribuição de ${objetivo.distribuicaoPct.toLocaleString("pt-BR")}% sobre resultado positivo.</p>
  <p>Referência de mercado: ${escapar(mercado ? `${mercado.setor}; ${mercado.periodo}; ${mercado.empresas.length} empresas; ${mercado.fonte}` : "Sem pares disponíveis")}. Base observada de comparação; não representa previsão para os anos do plano.</p>
  <h2>Compare os orçamentos</h2><p>A mantém custos; B mantém receita; C usa a mediana de custos/receita de toda a seleção. As opções coincidentes são reunidas. A ordem da tabela não é um ranking.</p><table><thead><tr><th>Orçamento</th><th>Receita anual</th><th>Custos anuais</th><th>Retido anual</th><th>Patrimônio final</th></tr></thead><tbody>${opcoes.map((a) => `<tr${a.id === args.escolha ? ' class="escolha"' : ""}><td>${escapar(a.id === "referencia" ? "Sem mudanças" : a.id === "manual" ? "Personalizado" : `Opção ${a.id}`)}${a.id === args.escolha ? " (escolhido)" : ""}</td><td>${moeda(a.receita)}</td><td>${moeda(a.custos)}</td><td>${moeda(a.retido)}</td><td>${moeda(a.patrimonioFinal)}</td></tr>`).join("")}</tbody></table>
  ${Object.entries(plano.indisponiveis)
    .map(([id, motivo]) => `<p>Opção ${escapar(id)} indisponível: ${escapar(motivo)}</p>`)
    .join("")}
  ${plano.erroReferencia ? `<p>Referência sem mudanças indisponível: ${escapar(plano.erroReferencia)}</p>` : ""}
  ${erroManual ? `<p>Orçamento personalizado indisponível: ${escapar(erroManual)}</p>` : ""}
  ${plano.estado === "meta_atingida" ? "<p>O objetivo já foi atingido na data-base. Isso não garante sua preservação ao final do prazo; confira a trajetória.</p>" : plano.estado === "sem_retencao" ? "<p>A distribuição de 100% impede acumulação positiva; não foram geradas alternativas automáticas.</p>" : ""}
  <h2>Escolha do gestor</h2><p>${escolhida ? `Orçamento ${escapar(escolhida.id)} confirmado. Diferença para o objetivo ao final: <strong>${moeda(escolhida.patrimonioFinal - objetivo.patrimonioAlvo)}</strong>. Resultado simplificado anual: ${moeda(escolhida.resultado)}; distribuição anual: ${moeda(escolhida.distribuicao)}; retenção anual: ${moeda(escolhida.retido)}.` : "Nenhum orçamento foi confirmado para os parâmetros atuais. Este relatório é uma comparação de alternativas."}</p><p>Justificativa informada: ${escapar(args.justificativa || "Não preenchida.")}</p>
  <h2>Trajetória anual</h2><table><thead><tr><th>Ano</th><th>Sem mudanças</th><th>Orçamento escolhido</th></tr></thead><tbody><tr><td>${objetivo.anoBase} (base)</td><td>${moeda(base.patrimonio)}</td><td>${escolhida ? moeda(base.patrimonio) : "Sem escolha"}</td></tr>${Array.from({ length: objetivo.anos }, (_, i) => `<tr><td>${objetivo.anoBase + i + 1}</td><td>${plano.referencia ? moeda(plano.referencia.serie[i]!) : "Indisponível"}</td><td>${escolhida ? moeda(escolhida.serie[i]!) : "Sem escolha"}</td></tr>`).join("")}</tbody></table>
  <h2>Contexto analítico do benchmark</h2><p>Sumarização: ${plano.resumo.validos} pares válidos de ${plano.resumo.recebidos}; ${plano.resumo.excluidos} exclusões. Mediana individual custos/receita: ${plano.resumo.mediana === null ? "indisponível" : `${(100 * plano.resumo.mediana).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`}. É a referência da opção C, não a razão entre médias.</p><p>Agrupamento: ${mercado?.centroides.length ? mercado.centroides.map((c) => `${escapar(c.perfil)} (${c.empresas} empresas)`).join("; ") : escapar(mercado?.erroClusters ?? "Indisponível")}. Perfis descritivos, sem ordenação de qualidade e sem mudar os pares usados em C.</p><p>Regressão patrimonial: ${regressao.disponivel && posicao ? `referência estrutural ${moeda(posicao.plTeorico)}, gap ${moeda(posicao.gap)}; R² na amostra ${regressao.r2 === null ? "indisponível" : regressao.r2.toFixed(3)}; ${regressao.n} empresas.` : escapar(regressao.disponivel ? "Referência indisponível." : regressao.motivo)} Este diagnóstico transversal não gera as metas nem prevê o patrimônio futuro.</p>
  <h2>Premissas e limites</h2><p class="nota">Protótipo educacional de SAD. Resultado simplificado = receita menos custos e despesas; não equivale a lucro líquido completo. Receita e custos são constantes durante o prazo. Apenas resultados positivos são distribuídos; prejuízos reduzem o patrimônio integralmente. Investimento é usado exclusivamente no benchmark, sem compor as metas ou a trajetória. Não incorpora inflação, aportes, outras mutações patrimoniais nem novos impostos. Não estima demanda, risco ou viabilidade operacional. O gestor deve avaliar o esforço e escolher.</p><p>Convenção do protótipo: receitas calculadas são arredondadas para cima em centavos, custos para baixo; distribuição truncada para centavos. O eventual excedente é mostrado sem ajustar artificialmente o patrimônio ao alvo.</p>
  <section class="graficos"><h2>Comparativo visual da trajetória</h2><p>Legenda: verde tracejado = patrimônio desejado; cinza = orçamento sem mudanças; âmbar = orçamento escolhido, quando confirmado.</p><div id="imagens">Preparando imagem do gráfico…</div></section></body></html>`;
}

export function exportarRelatorioMetas(args: RelatorioMetasEntrada): boolean {
  const html = montarRelatorioMetas(args);
  // Abrir durante o clique preserva a ativação do usuário; captura ocorre depois.
  const janela = window.open("", "_blank", "width=1000,height=1000");
  if (!janela) return false;
  janela.document.write(html);
  janela.document.close();
  janela.focus();
  void capturarGraficos()
    .then(async (imagens) => {
      if (janela.closed) return;
      if (!imagens.length) throw new Error("Gráfico ainda indisponível.");
      janela.document.getElementById("imagens")!.innerHTML = imagens
        .map(
          (i) =>
            `<figure><img src="${i.url}" alt="${escapar(i.titulo)}"><figcaption>${escapar(i.titulo)}</figcaption></figure>`,
        )
        .join("");
      await Promise.all([...janela.document.images].map((img) => img.decode()));
      await janela.document.fonts.ready;
      if (!janela.closed) janela.print();
    })
    .catch(() => {
      if (!janela.closed)
        janela.document.getElementById("imagens")!.textContent =
          "Não foi possível preparar a imagem. Feche esta janela e tente exportar novamente. Os valores completos estão na tabela anual.";
    });
  return true;
}
