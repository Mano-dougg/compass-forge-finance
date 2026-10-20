import {
  analisarCompraRevenda,
  HIPOTESE_COMPRA_REVENDA,
  LIMITES_COMPRA_REVENDA,
} from "./compra-revenda";
// RF13 · dossiê executivo em PDF (via janela de impressão do navegador).

import {
  comparativoCluster,
  diagnosticar as diagnosticarBase,
  formatarMoeda,
  type Diagnostico,
  type EmpresaDados,
} from "./sad-model";
import { leituraFinanceira } from "./leitura-financeira";
import { analisarGaps, dadosRadar, recomendacoes } from "./benchmarking";
import { descricaoReferencia, type BaseMercado } from "./market-clusters";
import { type DiagnosticoTemporal } from "./patrimonio-historico";
import { capturarGraficos } from "./chart-images";

function escapar(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

export function gerarRelatorioPDF(args: {
  dados: EmpresaDados;
  base: EmpresaDados | null;
  diagnostico: Diagnostico;
  projecao: number;
  mercado?: BaseMercado | null;
  temporal?: DiagnosticoTemporal | null;
}): boolean {
  const { dados, base, diagnostico, projecao, mercado, temporal } = args;
  const centroides = mercado?.centroides;
  const barras = comparativoCluster(dados, diagnostico.perfil, centroides);
  const gaps = analisarGaps(dados, diagnostico.perfil, centroides);
  const recs = recomendacoes(dados, diagnostico, centroides);
  const leitura = leituraFinanceira(dados, diagnostico.perfil, centroides);
  const aquisicao = analisarCompraRevenda(base, temporal ?? null);
  const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());

  const linhas: [string, string][] = [
    ["Receita Líquida", formatarMoeda(dados.receita)],
    ["Custos e Despesas", formatarMoeda(dados.custos)],
    ["Fluxo de Investimento", formatarMoeda(dados.investimento)],
    ["Patrimônio Líquido atual", formatarMoeda(dados.patrimonio)],
  ];

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<title>ATLAS.SAD · Dossiê Executivo</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  tr, li, figure { break-inside: avoid; }
  figure { margin: 12px 0; } figure img { width: 100%; max-height: 260px; object-fit: contain; }
  #visuais { break-before: page; }
  * { box-sizing: border-box; }
  body { font-family: "IBM Plex Sans", Arial, sans-serif; color: #15181f; font-size: 12px; margin: 0; }
  h1 { font-size: 20px; margin: 0 0 2px; letter-spacing: -0.02em; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280;
       border-bottom: 1px solid #d8dce4; padding-bottom: 5px; margin: 26px 0 10px; }
  .top { display: flex; justify-content: space-between; align-items: flex-end;
         border-bottom: 2px solid #15181f; padding-bottom: 10px; }
  .mono { font-family: "IBM Plex Mono", monospace; }
  .muted { color: #6b7280; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 7px 0; border-bottom: 1px solid #e6e9ef; text-align: left; }
  td.v, th.v { text-align: right; font-family: "IBM Plex Mono", monospace; }
  .big { font-family: "IBM Plex Mono", monospace; font-size: 30px; font-weight: 600; }
  .badge { display: inline-block; border: 1px solid #15181f; border-radius: 999px;
           padding: 3px 10px; font-weight: 600; }
  ol { padding-left: 18px; margin: 0; } li { margin-bottom: 8px; line-height: 1.5; }
  .aviso { margin-top: 26px; border: 1px solid #b45309; background: #fff7ed; color: #7c2d12;
           padding: 10px 12px; border-radius: 6px; line-height: 1.5; }
</style></head><body>
  <div class="top">
    <div><h1>ATLAS.SAD</h1><div class="mono muted">Dossiê Executivo de Auditoria Estratégica</div></div>
    <div class="mono muted">${escapar(data)}</div>
  </div>
  <p class="muted">${escapar(descricaoReferencia(mercado))}. ${mercado ? "Fonte declarada pelo usuário; origem e representatividade não verificadas automaticamente." : "Modelo demonstrativo, sem validação de mercado."}</p>
  ${mercado?.metodologia ? `<p class="muted">${escapar(mercado.metodologia)}</p>` : ""}
  <p>Perfil informado: <strong>${escapar(base ? diagnosticarBase(base, centroides).perfil : diagnostico.perfil)}</strong> · cenário simulado: <strong>${escapar(diagnostico.perfil)}</strong>.</p>

  ${mercado ? `<p><strong>Amostra analisada: ${mercado.empresas.length} empresas.</strong> O grupo ${escapar(diagnostico.perfil)}, com ${diagnostico.empresasNoCluster} empresas, é a referência das médias e metas. A dispersão mostra cada empresa da amostra selecionada.</p>` : ""}
  <h2>Entenda os principais resultados</h2>
  ${leitura.resumo.map((item) => `<h3>${escapar(item.titulo)}</h3><p><strong>${escapar(item.resposta)}</strong></p><p>${escapar(item.explicacao)}</p><p><strong>O que avaliar agora:</strong> ${escapar(item.proximoPasso)}</p>`).join("")}
  <p class="muted">As comparações usam proporções da receita. Elas não representam uma avaliação completa da saúde financeira.</p>
  <h2>1 · Diagnóstico de perfil operacional</h2>
  <p><span class="badge">${escapar(diagnostico.perfil)}</span>
     <span class="muted"> · distância ao centróide ${diagnostico.distancia.toFixed(2).replace(".", ",")}
      · ${mercado ? "cluster da base importada" : "grupo sintético"} com ${diagnostico.empresasNoCluster} empresas de referência</span></p>
  <p>${escapar(diagnostico.descricao)}</p>

  <h2>2 · Cenário simulado</h2>
  <table><tbody>
    ${linhas.map(([k, v]) => `<tr><td>${escapar(k)}</td><td class="v">${escapar(v)}</td></tr>`).join("")}
    ${base ? `<tr><td class="muted">Patrimônio Líquido informado (base)</td><td class="v muted">${escapar(formatarMoeda(base.patrimonio))}</td></tr>` : ""}
  </tbody></table>

  <h2>3 · Posição Estrutural — PL Real vs. PL Teórico (regressão demonstrativa)</h2>
  <table><tbody>
    <tr><td>Patrimônio Líquido Real (informado)</td><td class="v">${escapar(formatarMoeda(dados.patrimonio))}</td></tr>
    <tr><td>Patrimônio Líquido Teórico (modelo demonstrativo)</td><td class="v">${escapar(formatarMoeda(projecao))}</td></tr>
    <tr><td><strong>Gap estrutural</strong></td><td class="v"><strong>${escapar(formatarMoeda(dados.patrimonio - projecao))} (${projecao !== 0 ? (((dados.patrimonio - projecao) / Math.abs(projecao)) * 100).toFixed(1).replace(".", ",") : "0,0"}%)</strong></td></tr>
  </tbody></table>
  <p>${
    dados.patrimonio >= projecao
      ? "O patrimônio está acima ou no valor do modelo demonstrativo. Essa diferença não comprova suficiência de capital; o modelo não foi calibrado com a base importada."
      : "O patrimônio está abaixo do modelo demonstrativo. Essa diferença não comprova insuficiência de capital; o modelo não foi calibrado com a base importada."
  }</p>
  ${base ? `<p class="mono muted">Patrimônio Líquido informado na entrada de dados: ${escapar(formatarMoeda(base.patrimonio))}</p>` : ""}

  <h2>4 · Comparativo com a média do cluster</h2>
  <table><thead><tr><th>Indicador</th><th class="v">Sua empresa</th><th class="v">Média do cluster</th></tr></thead>
  <tbody>${barras
    .map(
      (b) =>
        `<tr><td>${escapar(b.indicador)}</td><td class="v">${String(b.empresa).replace(".", ",")}${b.sufixo}</td><td class="v">${String(b.cluster).replace(".", ",")}${b.sufixo}</td></tr>`,
    )
    .join("")}</tbody></table>

  <h3>Valores absolutos do radar</h3>
  <table><thead><tr><th>Indicador</th><th class="v">Sua empresa</th><th class="v">Média do cluster</th></tr></thead><tbody>${dadosRadar(
    dados,
    diagnostico.perfil,
    centroides,
  )
    .map(
      (p) =>
        `<tr><td>${escapar(p.indicador)}</td><td class="v">${escapar(formatarMoeda(p.valorEmpresa))}</td><td class="v">${escapar(formatarMoeda(p.valorCluster))}</td></tr>`,
    )
    .join("")}</tbody></table>
  <p class="muted">Radar normalizado: 100% representa a média do cluster; média zero torna a comparação percentual indisponível.</p>
  <h2>5 · O que priorizar agora</h2>
  <ol>${recs.map((r) => `<li>${escapar(r)}</li>`).join("")}</ol>

  <h2>6 · Gaps de eficiência e plano de ação</h2>
  <table><tbody>
    <tr><td>Custos acima da referência proporcional</td><td class="v">${escapar(formatarMoeda(gaps.excessoCustos))}</td></tr>
    <tr><td>Déficit de investimento proporcional</td><td class="v">${escapar(formatarMoeda(gaps.deficitInvestimento))}</td></tr>
    ${gaps.investimentoLideres !== null ? `<tr><td>Meta proporcional dos líderes (quartil superior por receita)</td><td class="v">${escapar(formatarMoeda(gaps.investimentoLideres))}</td></tr><tr><td>Déficit frente aos líderes</td><td class="v">${escapar(formatarMoeda(gaps.deficitLideres!))}</td></tr>` : ""}
    <tr><td>Eficiência de custos (100% = referência)</td><td class="v">${gaps.eficiencia === null ? "Não calculável" : gaps.eficiencia.toFixed(1) + "%"}</td></tr>
    <tr><td>Retorno operacional (receita / custos)</td><td class="v">${gaps.retorno === null ? "Não calculável" : gaps.retorno.toFixed(2) + "x"}</td></tr>
  </tbody></table>
  ${
    gaps.desvios
      ? `<h3>Desvios padrão em relação à média absoluta do cluster</h3><table><tbody>${Object.entries(
          gaps.desvios,
        )
          .map(
            ([campo, valor]) =>
              `<tr><td>${escapar(campo)}</td><td class="v">${valor === null ? "Sem dispersão no grupo" : valor.toFixed(2) + " σ"}</td></tr>`,
          )
          .join(
            "",
          )}</tbody></table><p class="muted">Desvio padrão populacional; comparação de porte sem ajuste proporcional à receita.</p>`
      : ""
  }
  <ol>${gaps.acoes.map((r) => `<li>${escapar(r)}</li>`).join("")}</ol>
  <p class="muted">Pearson −0,9629 é uma hipótese da trava de simulação, não uma regressão de custos. Metas não garantem competitividade.</p>

  ${mercado ? `<p class="muted">Metodologia: K-Means determinístico, três grupos, distância euclidiana sobre margem, investimento/receita, giro do patrimônio dividido por 3 e receita/máximo de treinamento (limitada a 1). Rótulos do SAD por intensidade de investimento: Conservador (menor), Estruturado (intermediária) e Expansivo (maior). Não são rótulos oficiais da B3. Médias financeiras e desvios são calculados a partir dos membros de cada grupo. Grupos pequenos podem ter dispersão nula e baixa representatividade. Investimento CVM representa saída líquida de caixa, não CAPEX bruto.</p>` : ""}
  ${
    temporal
      ? `<h2>Projeção temporal do patrimônio da empresa</h2>
  <p>${escapar(temporal.empresa)} · histórico próprio informado pelo gestor · cenários condicionais de ${temporal.previsao.anoAlvo} até ${temporal.previsao.anoFinal}. Primeiro encerramento projetado: 31/12/${temporal.previsao.anoAlvo}.</p>
  <table><tbody>
    <tr><td>Média das últimas ${temporal.previsao.janela} variações anuais do PL</td><td class="v">${escapar(formatarMoeda(temporal.previsao.variacaoMedia))}</td></tr>
    <tr><td>Referência sem mudanças</td><td class="v">${escapar(formatarMoeda(temporal.previsao.semMudancas))}</td></tr>
    <tr><td>Mudança de receita menos mudança de custos</td><td class="v">${escapar(formatarMoeda(temporal.previsao.resultadoOperacional))}</td></tr>
    <tr><td>Retorno adicional de investimento assumido</td><td class="v">${escapar(formatarMoeda(temporal.previsao.retornoInvestimento))}</td></tr>
    <tr><td>Resultado adicional após imposto e retenção</td><td class="v">${escapar(formatarMoeda(temporal.previsao.impactoRetido))}</td></tr>
    <tr><td>Ajuste atual do patrimônio no simulador</td><td class="v">${escapar(formatarMoeda(temporal.previsao.ajustePatrimonio))}</td></tr>
    <tr><td><strong>Patrimônio futuro com mudanças</strong></td><td class="v"><strong>${escapar(formatarMoeda(temporal.previsao.comMudancas))}</strong></td></tr>
  </tbody></table>
  <p>Hipóteses anuais mantidas durante ${temporal.previsao.horizonte} ano(s): imposto ${temporal.hipoteses.impostoPct}%; retenção do resultado adicional ${temporal.hipoteses.retencaoPct}%; retorno do investimento adicional ${temporal.hipoteses.retornoInvestimentoPct}%.</p>
  <p class="muted">Os valores acima detalham o primeiro ano. Para h anos à frente: PL = PL atual + h × média das variações anuais + ajuste único de PL + h × [(Δ receita − Δ custos) + Δ investimento × retorno] × (1 − imposto) × retenção. Variação histórica e efeito operacional são mantidos em reais, sem juros compostos; aportes/retiradas entram uma única vez. Investimento não é deduzido diretamente do PL. O histórico já contém o resultado habitual; apenas os efeitos adicionais são somados.</p>
  <h3>Patrimônio projetado ano a ano</h3>
  <table id="projecoes-pl"><thead><tr><th>Ano</th><th class="v">Sem mudanças</th><th class="v">Com mudanças</th></tr></thead><tbody>${temporal.previsao.projecoes.map((ano) => `<tr><td>${ano.ano}</td><td class="v">${escapar(formatarMoeda(ano.semMudancas))}</td><td class="v">${escapar(formatarMoeda(ano.comMudancas))}</td></tr>`).join("")}</tbody></table>
  <table><thead><tr><th>Ano</th><th class="v">PL histórico informado</th></tr></thead><tbody>${temporal.previsao.historico.map((o) => `<tr><td>${o.ano}</td><td class="v">${escapar(formatarMoeda(o.patrimonio))}</td></tr>`).join("")}</tbody></table>
  <p class="muted">${temporal.previsao.mae === null ? "Histórico insuficiente para teste retrospectivo da referência." : `Teste retrospectivo da referência em ${temporal.previsao.avaliacoes.length} ano(s): erro absoluto médio ${escapar(formatarMoeda(temporal.previsao.mae))}; repetindo o último PL ${escapar(formatarMoeda(temporal.previsao.maeIngenuo!))}.`} Esse teste avalia um ano à frente; não valida os efeitos simulados nem a precisão dos anos mais distantes. Quanto mais distante o ano, maior a incerteza. Estimativa nominal, sem intervalo de confiança calibrado; não incorpora inflação, choques nem mudanças contábeis. Imposto e retenção também incidem sobre efeitos adicionais negativos nesta simplificação.</p>`
      : ""
  }

  <h2>Compra, recuperação e revenda pela hipótese patrimonial</h2>
  <p>${escapar(HIPOTESE_COMPRA_REVENDA)}</p>
  ${
    aquisicao.disponivel
      ? `<h3>${escapar(aquisicao.titulo)}</h3><p>${escapar(aquisicao.resumo)}</p>
  <table><tbody>
    <tr><td>Compra hipotética · PL de ${aquisicao.anoCompra}</td><td class="v">${escapar(formatarMoeda(aquisicao.precoCompra))}</td></tr>
    <tr><td>Revenda hipotética · PL de ${aquisicao.anoRevenda}</td><td class="v">${escapar(formatarMoeda(aquisicao.precoRevenda))}</td></tr>
    <tr><td>Aporte simulado do comprador</td><td class="v">${escapar(formatarMoeda(aquisicao.aporte))}</td></tr>
    <tr><td>Retirada simulada devolvida ao comprador</td><td class="v">${escapar(formatarMoeda(aquisicao.retirada))}</td></tr>
    <tr><td>Total aplicado · compra + aporte</td><td class="v">${escapar(formatarMoeda(aquisicao.totalAplicado))}</td></tr>
    <tr><td>Total recebido · revenda + retirada</td><td class="v">${escapar(formatarMoeda(aquisicao.recebimentoTotal))}</td></tr>
    <tr><td>Ganho ou perda antes dos demais custos</td><td class="v">${escapar(formatarMoeda(aquisicao.ganhoAjustado))}</td></tr>
    <tr><td>Retorno acumulado sobre o total aplicado · ${aquisicao.anos} ano(s)</td><td class="v">${aquisicao.retornoPct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</td></tr>
  </tbody></table>
  <p class="muted">Resultado = revenda + retirada − compra − aporte. Aportes não são lucro. Aportes no início e recebimentos no encerramento do horizonte selecionado. Retorno acumulado no período, não anualizado; não é TIR com fluxos em datas diferentes.</p>`
      : `<p>${escapar(aquisicao.motivo)}</p>`
  }
  <p class="muted">${escapar(LIMITES_COMPRA_REVENDA)}</p>
  <div class="aviso"><strong>Termo de confiança:</strong> as metas são comparações com o grupo selecionado, não previsões de retorno ou garantias de competitividade. A regressão estrutural é demonstrativa e não foi ajustada à base atual; não há R² ou precisão estatística calibrados para este diagnóstico. Margem e giro do patrimônio não comprovam disponibilidade de caixa nem capacidade de endividamento.</div>
  <section id="visuais"><h2>7 · Comparativos visuais do cenário simulado</h2><div id="imagens">Preparando gráficos…</div></section>
</body></html>`;

  const janela = window.open("", "_blank", "width=900,height=1000");
  if (!janela) return false;
  janela.document.write(html);
  janela.document.close();
  janela.focus();
  void capturarGraficos()
    .then(async (imagens) => {
      if (janela.closed) return;
      const alvo = janela.document.getElementById("imagens");
      if (alvo)
        alvo.innerHTML = imagens.length
          ? imagens
              .map(
                (imagem) =>
                  `<figure><figcaption>${escapar(imagem.titulo)}</figcaption><img src="${imagem.url}" alt="${escapar(imagem.titulo)}" /></figure>`,
              )
              .join("")
          : "Gráficos indisponíveis; consulte os comparativos tabulares.";
      await Promise.all(
        Array.from(janela.document.images).map((img) => img.decode().catch(() => undefined)),
      );
      if (janela.closed) return;
      await janela.document.fonts.ready;
      await new Promise<void>((resolve) =>
        janela.requestAnimationFrame(() => {
          resolve();
        }),
      );
      if (!janela.closed) janela.print();
    })
    .catch(() => {
      if (janela.closed) return;
      const alvo = janela.document.getElementById("imagens");
      if (alvo)
        alvo.textContent =
          "Não foi possível capturar os gráficos; consulte os comparativos tabulares.";
      if (!janela.closed) janela.print();
    });
  return true;
}
