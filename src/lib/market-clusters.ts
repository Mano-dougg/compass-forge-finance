import {
  ajustarPadronizacao,
  compararDistancias,
  padronizar,
} from "./financial-standardization.ts";
import {
  TETOS,
  indicadores,
  diagnosticar,
  type Centroide,
  type EmpresaDados,
} from "./sad-model.ts";

export type EmpresaMercado = EmpresaDados & {
  empresa: string;
  setor?: string;
  fluxoInvestimentoOriginal?: number;
};
export type BaseMercado = {
  fonte: string;
  metodologia?: string;
  dataReferencia?: string;
  cobertura?: { selecionadas: number; excluidas: number };
  setor: string;
  periodo: string;
  empresas: EmpresaMercado[];
  centroides: Centroide[];
  erroClusters?: string;
};

type Vetor = number[];
const campos = ["receita", "custos", "patrimonio", "investimento"] as const;

const distancia = (a: Vetor, b: Vetor) => a.reduce((s, v, i) => s + (v - b[i]!) ** 2, 0);
function media(vetores: Vetor[]): Vetor {
  return vetores[0]!.map((_, i) => vetores.reduce((s, v) => s + v[i]!, 0) / vetores.length);
}
function estatistica(empresas: EmpresaMercado[], desvio = false): EmpresaDados {
  const medias = Object.fromEntries(
    campos.map((c) => [c, empresas.reduce((s, e) => s + e[c], 0) / empresas.length]),
  ) as EmpresaDados;
  if (!desvio) return medias;
  return Object.fromEntries(
    campos.map((c) => [
      c,
      Math.sqrt(empresas.reduce((s, e) => s + (e[c] - medias[c]) ** 2, 0) / empresas.length),
    ]),
  ) as EmpresaDados;
}

/** Lloyd determinístico com sementes mais distantes; não usa a empresa diagnosticada no treino. */
export function treinarClusters(empresas: EmpresaMercado[]): Centroide[] {
  const ordenadas = [...empresas].sort((a, b) => a.empresa.localeCompare(b.empresa));
  const tetoReceita = Math.max(TETOS.receita, ...ordenadas.map((e) => e.receita));
  const padronizacao = ajustarPadronizacao(ordenadas);
  const pontos = ordenadas.map((e) => padronizar(e, padronizacao));
  if (new Set(pontos.map((p) => JSON.stringify(p))).size < 3)
    throw new Error("A base precisa de pelo menos três perfis financeiros distintos.");
  let centros = [pontos[0]!];
  while (centros.length < 3) {
    const candidato = pontos.reduce((melhor, p) =>
      compararDistancias(
        Math.min(...centros.map((c) => distancia(p, c))),
        Math.min(...centros.map((c) => distancia(melhor, c))),
      ) > 0
        ? p
        : melhor,
    );
    centros.push(candidato);
  }
  let grupos: EmpresaMercado[][] = [];
  let convergiu = false;
  for (let iteracao = 0; iteracao < 200; iteracao++) {
    grupos = centros.map(() => []);
    pontos.forEach((p, i) => {
      const indice = centros.reduce(
        (melhor, c, j) =>
          compararDistancias(distancia(p, c), distancia(p, centros[melhor]!)) < 0 ? j : melhor,
        0,
      );
      grupos[indice]!.push(ordenadas[i]!);
    });
    if (grupos.some((g) => !g.length))
      throw new Error("A base gerou um cluster vazio. Revise a diversidade das empresas.");
    const novos = grupos.map((g) => media(g.map((e) => padronizar(e, padronizacao))));
    convergiu = novos.every((c, i) => distancia(c, centros[i]!) < 1e-16);
    centros = novos;
    if (convergiu) break;
  }
  if (!convergiu) throw new Error("K-Means não convergiu em 200 iterações. Revise a base.");
  // Nomes descritivos por porte médio, sem ordenação de qualidade ou risco.
  return grupos
    .map((g, i) => ({ g, v: centros[i]!, ordemTreino: i }))
    .sort((a, b) => estatistica(a.g).receita - estatistica(b.g).receita)
    .map(({ g, v, ordemTreino }, i) => {
      const perfil = ["Conservador", "Expansionista", "Gigante setorial"][i]!;
      const medias = estatistica(g);
      const ind = indicadores(medias);
      const proporcoes = g.map((e) => e.custos / e.receita).sort((a, b) => a - b);
      // Quantil com interpolação linear, posição (n−1)p (convenção tipo 7).
      const quantil = (p: number) => {
        const h = (proporcoes.length - 1) * p;
        const i = Math.floor(h);
        return (
          proporcoes[i]! +
          (h - i) * (proporcoes[Math.min(i + 1, proporcoes.length - 1)]! - proporcoes[i]!)
        );
      };
      return {
        tetoReceita,
        perfil,
        descricao: `Grupo ${perfil}, com ${g.length} empresas da amostra selecionada. Classificação por proximidade nas quatro variáveis contábeis padronizadas; o nome descreve o porte relativo e não uma nota de qualidade ou risco.`,
        padronizacao,
        ordemTreino,
        centroPadronizado: v,
        margem: ind.margem,
        intensidadeInvestimento: ind.intensidadeInvestimento,
        alavancagem: ind.alavancagem,
        escala: medias.receita / tetoReceita,
        valores: {
          ...medias,
          fluxoInvestimentoOriginal:
            g.reduce((s, e) => s + (e.fluxoInvestimentoOriginal ?? -e.investimento), 0) / g.length,
        },
        desvios: estatistica(g, true),
        empresas: g.length,
        distribuicaoCustos: { p25: quantil(0.25), mediana: quantil(0.5) },
      };
    });
}

/** Entrada em reais, um único setor/período e despesas/investimento como magnitudes positivas. */
export function importarBaseMercado(texto: string): BaseMercado {
  let valor: unknown;
  try {
    valor = JSON.parse(texto);
  } catch {
    throw new Error("Arquivo inválido. Use JSON no formato do exemplo.");
  }
  if (!valor || typeof valor !== "object") throw new Error("Base de mercado inválida.");
  const b = valor as Record<string, unknown>;
  for (const chave of ["fonte", "setor", "periodo"]) {
    if (typeof b[chave] !== "string" || !b[chave].trim())
      throw new Error(`Informe ${chave} da base de referência.`);
  }
  if (!Array.isArray(b["empresas"]) || b["empresas"].length < 3 || b["empresas"].length > 5000)
    throw new Error("Importe entre 3 e 5.000 empresas do mesmo setor e período.");
  const ids = new Set<string>();
  const empresas = b["empresas"].map((linha: unknown, i: number) => {
    if (!linha || typeof linha !== "object") throw new Error(`Empresa na linha ${i + 1} inválida.`);
    const e = linha as Record<string, unknown>;
    if (typeof e["empresa"] !== "string" || !e["empresa"].trim())
      throw new Error(`Informe o identificador da empresa na linha ${i + 1}.`);
    const empresa = e["empresa"].trim();
    if (ids.has(empresa.toLocaleUpperCase()))
      throw new Error(`Empresa duplicada: ${empresa}. Use apenas um registro por empresa.`);
    ids.add(empresa.toLocaleUpperCase());
    for (const campo of campos) {
      const n = e[campo];
      if (
        typeof n !== "number" ||
        !Number.isFinite(n) ||
        n < 0 ||
        ((campo === "receita" || campo === "patrimonio") && n === 0)
      ) {
        throw new Error(
          `${empresa}: ${campo} deve estar em reais, como números finitos não negativos; receita e patrimônio devem ser positivos.`,
        );
      }
    }
    if (
      "fluxoInvestimentoOriginal" in e &&
      (typeof e["fluxoInvestimentoOriginal"] !== "number" ||
        !Number.isFinite(e["fluxoInvestimentoOriginal"]))
    )
      throw new Error(
        `${empresa}: fluxoInvestimentoOriginal deve ser um número finito com sinal contábil.`,
      );
    return {
      empresa,
      ...(typeof e["setor"] === "string" ? { setor: e["setor"] } : {}),
      ...Object.fromEntries(campos.map((c) => [c, e[c]])),
      ...(typeof e["fluxoInvestimentoOriginal"] === "number" &&
      Number.isFinite(e["fluxoInvestimentoOriginal"])
        ? { fluxoInvestimentoOriginal: e["fluxoInvestimentoOriginal"] }
        : {}),
    } as EmpresaMercado;
  });
  return {
    fonte: (b["fonte"] as string).trim(),
    ...(typeof b["metodologia"] === "string" ? { metodologia: b["metodologia"] } : {}),
    ...(typeof b["dataReferencia"] === "string" ? { dataReferencia: b["dataReferencia"] } : {}),
    ...(Array.isArray(b["excluidas"])
      ? {
          cobertura: {
            selecionadas: empresas.length + b["excluidas"].length,
            excluidas: b["excluidas"].length,
          },
        }
      : b["cobertura"] &&
          typeof b["cobertura"] === "object" &&
          Number.isInteger((b["cobertura"] as Record<string, unknown>)["selecionadas"]) &&
          Number.isInteger((b["cobertura"] as Record<string, unknown>)["excluidas"])
        ? { cobertura: b["cobertura"] as { selecionadas: number; excluidas: number } }
        : {}),
    setor: (b["setor"] as string).trim(),
    periodo: (b["periodo"] as string).trim(),
    empresas,
    centroides: treinarClusters(empresas),
  };
}

export function descricaoReferencia(base?: BaseMercado | null): string {
  return base
    ? `Base importada · ${base.setor} · ${base.periodo} · ${base.empresas.length} empresas · fonte declarada: ${base.fonte}`
    : "Referências simuladas · demonstração, sem dados reais da B3";
}

/** Um setor pequeno ainda fornece estatísticas; não inventa grupos para completá-lo. */
export function selecionarSetor(base: BaseMercado, setor: string): BaseMercado {
  if (!setor) return base;
  const empresas = base.empresas.filter((e) => e.setor === setor);
  try {
    const centroides = empresas.length >= 3 ? treinarClusters(empresas) : [];
    return {
      ...base,
      setor,
      empresas,
      centroides,
      ...(centroides.length
        ? {}
        : {
            erroClusters:
              "São necessários três perfis distintos para formar os grupos. As estatísticas dos pares continuam disponíveis.",
          }),
    };
  } catch (e) {
    return {
      ...base,
      setor,
      empresas,
      centroides: [],
      erroClusters:
        e instanceof Error ? e.message : "Não foi possível formar os grupos deste recorte.",
    };
  }
}

export function limitesMercado(base?: BaseMercado | null): EmpresaDados {
  return Object.fromEntries(
    campos.map((c) => [c, Math.max(TETOS[c], ...(base?.empresas.map((e) => e[c]) ?? []))]),
  ) as EmpresaDados;
}

/** One plotted point per company in the selected sample, using the training classifier. */
export function pontosAmostra(base: BaseMercado) {
  return base.empresas.map((empresa) => {
    const ind = indicadores(empresa);
    return {
      empresa: empresa.empresa,
      setor: empresa.setor ?? base.setor,
      perfil: diagnosticar(empresa, base.centroides).perfil,
      margem: ind.margem * 100,
      alavancagem: ind.alavancagem,
    };
  });
}
