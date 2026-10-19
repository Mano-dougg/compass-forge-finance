// RF06 · geração do relatório em PDF (via janela de impressão do navegador).

import {
  comparativoCluster,
  diagnosticar as diagnosticarBase,
  formatarMoeda,
  recomendacoes,
  type Diagnostico,
  type EmpresaDados,
} from "./sad-model";
import { analisarGaps, REFERENCIA } from "./benchmarking";
import { capturarGraficos } from "./chart-images";

function escapar(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
}

export function gerarRelatorioPDF(args: {
  dados: EmpresaDados;
  base: EmpresaDados | null;
  diagnostico: Diagnostico;
  projecao: number;
}): boolean {
  const { dados, base, diagnostico, projecao } = args;
  const barras = comparativoCluster(dados, diagnostico.perfil);
  const recs = recomendacoes(dados, diagnostico);
  const gaps = analisarGaps(dados, diagnostico.perfil);
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
  <p class="muted">${escapar(REFERENCIA)}. Modelo demonstrativo, sem validação de mercado.</p>
  <p>Perfil informado: <strong>${escapar(base ? diagnosticarBase(base).perfil : diagnostico.perfil)}</strong> · cenário simulado: <strong>${escapar(diagnostico.perfil)}</strong>.</p>

  <h2>1 · Diagnóstico de perfil operacional</h2>
  <p><span class="badge">${escapar(diagnostico.perfil)}</span>
     <span class="muted"> · distância ao centróide ${diagnostico.distancia.toFixed(2).replace(".", ",")}
      · grupo sintético com ${diagnostico.empresasNoCluster} empresas de referência</span></p>
  <p>${escapar(diagnostico.descricao)}</p>

  <h2>2 · Cenário simulado</h2>
  <table><tbody>
    ${linhas.map(([k, v]) => `<tr><td>${escapar(k)}</td><td class="v">${escapar(v)}</td></tr>`).join("")}
    ${base ? `<tr><td class="muted">Patrimônio Líquido informado (base)</td><td class="v muted">${escapar(formatarMoeda(base.patrimonio))}</td></tr>` : ""}
  </tbody></table>

  <h2>3 · Posição Estrutural — PL Real vs. PL Teórico (regressão linear)</h2>
  <table><tbody>
    <tr><td>Patrimônio Líquido Real (informado)</td><td class="v">${escapar(formatarMoeda(dados.patrimonio))}</td></tr>
    <tr><td>Patrimônio Líquido Teórico (benchmark B3)</td><td class="v">${escapar(formatarMoeda(projecao))}</td></tr>
    <tr><td><strong>Gap estrutural</strong></td><td class="v"><strong>${escapar(formatarMoeda(dados.patrimonio - projecao))} (${projecao !== 0 ? (((dados.patrimonio - projecao) / Math.abs(projecao)) * 100).toFixed(1).replace(".", ",") : "0,0"}%)</strong></td></tr>
  </tbody></table>
  <p>${dados.patrimonio >= projecao
    ? "Diagnóstico: a estrutura de capital é <strong>suficiente</strong> para suportar o volume de operações simulado, segundo os padrões da B3."
    : "Diagnóstico: a estrutura de capital é <strong>insuficiente</strong> — o PL Real está abaixo do benchmark da B3 para o volume de operações simulado."}</p>
  ${base ? `<p class="mono muted">Patrimônio Líquido informado na entrada de dados: ${escapar(formatarMoeda(base.patrimonio))}</p>` : ""}

  <h2>4 · Comparativo com a média do cluster</h2>
  <table><thead><tr><th>Indicador</th><th class="v">Sua empresa</th><th class="v">Média do cluster</th></tr></thead>
  <tbody>${barras
    .map(
      (b) =>
        `<tr><td>${escapar(b.indicador)}</td><td class="v">${String(b.empresa).replace(".", ",")}${b.sufixo}</td><td class="v">${String(b.cluster).replace(".", ",")}${b.sufixo}</td></tr>`,
    )
    .join("")}</tbody></table>

  <h2>5 · Recomendações estratégicas</h2>
  <ol>${recs.map((r) => `<li>${escapar(r)}</li>`).join("")}</ol>

  <h2>6 · Gaps de eficiência e plano de ação</h2>
  <table><tbody>
    <tr><td>Custos acima da referência proporcional</td><td class="v">${escapar(formatarMoeda(gaps.excessoCustos))}</td></tr>
    <tr><td>Déficit de investimento proporcional</td><td class="v">${escapar(formatarMoeda(gaps.deficitInvestimento))}</td></tr>
    <tr><td>Retorno operacional (receita / custos)</td><td class="v">${gaps.retorno === null ? "Não calculável" : gaps.retorno.toFixed(2) + "x"}</td></tr>
  </tbody></table>
  <ol>${gaps.acoes.map((r) => `<li>${escapar(r)}</li>`).join("")}</ol>
  <p class="muted">Pearson −0,9629 é uma hipótese da trava de simulação, não uma regressão de custos. Metas não garantem competitividade.</p>

  <div class="aviso"><strong>Termo de confiança:</strong> a projeção preditiva possui margem de
  variância não explicada de 48,7% (100% − R² de 51,3%). Os resultados apoiam a decisão, mas não
  substituem a análise do gestor.</div>
  <section id="visuais"><h2>7 · Comparativos visuais do cenário simulado</h2><div id="imagens">Preparando gráficos…</div></section>
</body></html>`;

  const janela = window.open("", "_blank", "width=900,height=1000");
  if (!janela) return false;
  janela.document.write(html);
  janela.document.close();
  janela.focus();
  void capturarGraficos().then(async (imagens) => {
    if (janela.closed) return;
    const alvo = janela.document.getElementById("imagens");
    if (alvo) alvo.innerHTML = imagens.length ? imagens.map((imagem) => `<figure><figcaption>${escapar(imagem.titulo)}</figcaption><img src="${imagem.url}" alt="${escapar(imagem.titulo)}" /></figure>`).join("") : "Gráficos indisponíveis; consulte os comparativos tabulares.";
    await Promise.all(Array.from(janela.document.images).map((img) => img.decode().catch(() => undefined)));
    janela.print();
  }).catch(() => {
    const alvo = janela.document.getElementById("imagens");
    if (alvo) alvo.textContent = "Não foi possível capturar os gráficos; consulte os comparativos tabulares.";
    if (!janela.closed) janela.print();
  });
  return true;
}
