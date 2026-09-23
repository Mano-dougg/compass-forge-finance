// RF06 · geração do relatório em PDF (via janela de impressão do navegador).

import {
  comparativoCluster,
  formatarMoeda,
  recomendacoes,
  type Diagnostico,
  type EmpresaDados,
} from "./sad-model";

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
  const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());

  const linhas: [string, string][] = [
    ["Receita Líquida", formatarMoeda(dados.receita)],
    ["Custos e Despesas", formatarMoeda(dados.custos)],
    ["Fluxo de Investimento", formatarMoeda(dados.investimento)],
    ["Patrimônio Líquido atual", formatarMoeda(dados.patrimonio)],
  ];

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<title>ATLAS.SAD · Relatório de Diagnóstico</title>
<style>
  @page { margin: 22mm 18mm; }
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
    <div><h1>ATLAS.SAD</h1><div class="mono muted">Relatório de Diagnóstico e Simulação de Cenários</div></div>
    <div class="mono muted">${escapar(data)}</div>
  </div>

  <h2>1 · Diagnóstico de perfil operacional</h2>
  <p><span class="badge">${escapar(diagnostico.perfil)}</span>
     <span class="muted"> · distância ao centróide ${diagnostico.distancia.toFixed(2).replace(".", ",")}
     · cluster com ${diagnostico.empresasNoCluster} empresas da B3</span></p>
  <p>${escapar(diagnostico.descricao)}</p>

  <h2>2 · Cenário simulado</h2>
  <table><tbody>
    ${linhas.map(([k, v]) => `<tr><td>${escapar(k)}</td><td class="v">${escapar(v)}</td></tr>`).join("")}
    ${base ? `<tr><td class="muted">Patrimônio Líquido informado (base)</td><td class="v muted">${escapar(formatarMoeda(base.patrimonio))}</td></tr>` : ""}
  </tbody></table>

  <h2>3 · Projeção de Patrimônio Líquido (regressão múltipla)</h2>
  <div class="big">${escapar(formatarMoeda(projecao))}</div>
  ${
    base
      ? `<p class="mono muted">variação sobre a base: ${(((projecao - base.patrimonio) / base.patrimonio) * 100).toFixed(1).replace(".", ",")}%</p>`
      : ""
  }

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

  <div class="aviso"><strong>Termo de confiança:</strong> a projeção preditiva possui margem de
  variância não explicada de 48,7% (100% − R² de 51,3%). Os resultados apoiam a decisão, mas não
  substituem a análise do gestor.</div>
</body></html>`;

  const janela = window.open("", "_blank", "width=900,height=1000");
  if (!janela) return false;
  janela.document.write(html);
  janela.document.close();
  janela.focus();
  setTimeout(() => janela.print(), 350);
  return true;
}
