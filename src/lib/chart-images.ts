// Capture rendered chart SVGs as PNGs for the executive print dossier.
export async function capturarGraficos(): Promise<{ titulo: string; url: string }[]> {
  const resultados: { titulo: string; url: string }[] = [];
  for (const container of document.querySelectorAll<HTMLElement>("[data-report-chart]")) {
    const svg = container.querySelector("svg.recharts-surface");
    if (!svg) continue;
    const clone = svg.cloneNode(true) as SVGElement;
    const originais = [svg, ...svg.querySelectorAll("*")];
    const copias = [clone, ...clone.querySelectorAll("*")];
    originais.forEach((elemento, i) => {
      const copia = copias[i];
      if (!copia) return;
      const estilo = getComputedStyle(elemento);
      for (const prop of ["fill", "stroke", "color", "font-family", "font-size", "font-weight", "fill-opacity", "stroke-opacity"]) copia.setAttribute(prop, estilo.getPropertyValue(prop));
    });
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const rect = svg.getBoundingClientRect();
    clone.setAttribute("width", String(rect.width));
    clone.setAttribute("height", String(rect.height));
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
    try {
      const img = new Image(); img.src = url; await img.decode();
      const canvas = document.createElement("canvas"); canvas.width = rect.width * 2; canvas.height = rect.height * 2;
      const ctx = canvas.getContext("2d"); if (!ctx) continue;
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim();
      ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resultados.push({ titulo: container.dataset.reportChart ?? "Comparativo", url: canvas.toDataURL("image/png") });
    } finally { URL.revokeObjectURL(url); }
  }
  return resultados;
}