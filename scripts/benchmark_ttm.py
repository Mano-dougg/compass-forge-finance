"""Benchmark de últimos 12 meses: DFP anterior + ITR atual − ITR anterior.
A posição patrimonial é a do ITR atual. Não anualiza nem imputa valores ausentes.
"""
import csv
import hashlib
import io
import math
import re
import urllib.request
import zipfile
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from pathlib import Path


def normalizar_cnpj(valor):
    return re.sub(r"\D", "", valor).zfill(14)


def ler_demonstracoes(bruto, tipo, ano, ids):
    contas = {"BPP": {"2.03", "2.04"}, "DRE": {"3.01", "3.02", "3.04"}, "DFC_MI": {"6.02"}, "DFC_MD": {"6.02"}}
    grupos = defaultdict(list)
    with zipfile.ZipFile(io.BytesIO(bruto)) as z:
        for demonstrativo, codigos in contas.items():
            for escopo in ["con", "ind"]:
                nome = f"{tipo}_cia_aberta_{demonstrativo}_{escopo}_{ano}.csv"
                if nome not in z.namelist():
                    continue
                with io.TextIOWrapper(z.open(nome), encoding="latin-1") as arquivo:
                    for row in csv.DictReader(arquivo, delimiter=";"):
                        chave = normalizar_cnpj(row["CNPJ_CIA"])
                        if chave not in ids or row["ORDEM_EXERC"] != "ÚLTIMO":
                            continue
                        ref = row["DT_REFER"]
                        if row["DT_FIM_EXERC"] != ref or not ref.startswith(f"{ano}-"):
                            continue
                        # Guarda também as demais contas para selecionar a última versão do documento,
                        # sem completar contas ausentes com uma versão antiga.
                        grupos[(chave, escopo, demonstrativo, ref)].append(row)
    saida = {}
    for chave, rows in grupos.items():
        versao = max(int(r["VERSAO"]) for r in rows)
        valores = {}
        for row in rows:
            if int(row["VERSAO"]) != versao or row["CD_CONTA"] not in contas[chave[2]]:
                continue
            if chave[2] != "BPP" and row.get("DT_INI_EXERC") != f"{ano}-01-01":
                continue
            escala = row["ESCALA_MOEDA"].upper()
            if row["MOEDA"] != "REAL" or escala not in {"MIL", "UNIDADE"}:
                raise ValueError(f"Unidade/moeda incompatível em {chave}.")
            valor = float(row["VL_CONTA"].replace(",", ".")) * (1000 if escala == "MIL" else 1)
            if not math.isfinite(valor):
                raise ValueError(f"Valor não finito em {chave}.")
            codigo = row["CD_CONTA"]
            if codigo in valores and valores[codigo] != valor:
                raise ValueError(f"Conta duplicada conflitante em {chave}/{codigo}.")
            valores[codigo] = valor
        saida[chave] = dict(versao=versao, valores=valores)
    return saida


def extrair_componente(indice, cnpj, escopo, ref, campo):
    escolhas = {"patrimonio": [("BPP", "2.03"), ("BPP", "2.04")], "receita": [("DRE", "3.01")], "custo": [("DRE", "3.02")], "despesa": [("DRE", "3.04")], "fluxo": [("DFC_MI", "6.02"), ("DFC_MD", "6.02")]}
    for demonstrativo, conta in escolhas[campo]:
        documento = indice.get((cnpj, escopo, demonstrativo, ref))
        if documento and conta in documento["valores"]:
            return documento["valores"][conta], dict(demonstrativo=demonstrativo, conta=conta, versao=documento["versao"])
    return None, None


def montar_ttm(empresas, atual, anual, anterior, referencia):
    ano = int(referencia[:4])
    ref_anual = f"{ano - 1}-12-31"
    ref_anterior = f"{ano - 1}{referencia[4:]}"
    incluidos, excluidos = [], []
    for e in empresas:
        chave = normalizar_cnpj(e["CNPJ"])
        motivos = []
        for escopo in ["con", "ind"]:
            pl, origem_pl = extrair_componente(atual, chave, escopo, referencia, "patrimonio")
            componentes = {}
            faltantes = []
            for campo in ["receita", "custo", "despesa", "fluxo"]:
                parcelas = []
                origens = []
                for nome, indice, ref in [("dfp", anual, ref_anual), ("itrAtual", atual, referencia), ("itrAnterior", anterior, ref_anterior)]:
                    valor, origem = extrair_componente(indice, chave, escopo, ref, campo)
                    if valor is None:
                        faltantes.append(f"{nome}/{campo}")
                    parcelas.append(valor)
                    origens.append(origem)
                if all(v is not None for v in parcelas):
                    componentes[campo] = dict(valor=parcelas[0] + parcelas[1] - parcelas[2], dfp=parcelas[0], itrAtual=parcelas[1], itrAnterior=parcelas[2], documentos=origens)
            if pl is None:
                faltantes.append("itrAtual/patrimonio")
            if faltantes:
                motivos.append(f"{escopo}: ausentes " + ", ".join(faltantes))
                continue
            receita = componentes["receita"]["valor"]
            custos = -(componentes["custo"]["valor"] + componentes["despesa"]["valor"])
            fluxo = componentes["fluxo"]["valor"]
            if pl <= 0 or receita <= 0 or custos < 0:
                motivos.append(f"{escopo}: PL/receita não positivos ou custos incompatíveis")
                continue
            incluidos.append(dict(empresa=e["Razão Social"], cnpj=chave, setor=e["Setor"], escopo=escopo, dataReferencia=referencia, patrimonio=pl, receita=receita, custos=custos, investimento=max(0, -fluxo), fluxoInvestimentoOriginal=fluxo, conciliacao=dict(patrimonio=origem_pl, componentes=componentes)))
            break
        else:
            excluidos.append(dict(empresa=e["Razão Social"], cnpj=chave, motivo="; ".join(motivos)))
    return incluidos, excluidos


def coletar_ttm(ano, root, indices, repositorio, commit, diretorio_cache=None, referencia=None):
    with (root / "data/empresas-b3.csv").open(encoding="utf-8-sig") as arquivo:
        empresas = [e for e in csv.DictReader(arquivo) if int(e["#"]) in indices]
    ids = {normalizar_cnpj(e["CNPJ"]) for e in empresas}
    bases, fontes = {}, []
    for nome, tipo, ano_base in [("atual", "itr", ano), ("anual", "dfp", ano - 1), ("anterior", "itr", ano - 1)]:
        filename = f"{tipo}_cia_aberta_{ano_base}.zip"
        url = f"https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/{tipo.upper()}/DADOS/{filename}"
        cache = Path(diretorio_cache) / filename if diretorio_cache else None
        if cache and cache.exists():
            bruto = cache.read_bytes()
        else:
            with urllib.request.urlopen(url, timeout=120) as resposta:
                bruto = resposta.read()
            if cache:
                cache.parent.mkdir(parents=True, exist_ok=True)
                cache.write_bytes(bruto)
        fontes.append(dict(tipo=tipo.upper(), ano=ano_base, url=url, sha256=hashlib.sha256(bruto).hexdigest()))
        bases[nome] = ler_demonstracoes(bruto, tipo, ano_base, ids)
    candidatos = sorted({k[3] for k in bases["atual"] if k[2] == "BPP" and k[3][5:] in {"03-31", "06-30", "09-30"}}, reverse=True)
    if referencia:
        if referencia not in candidatos:
            raise ValueError("Data de referência trimestral indisponível na amostra.")
        candidatos = [referencia]
    resultados = []
    for ref in candidatos:
        incluidos, excluidos = montar_ttm(empresas, bases["atual"], bases["anual"], bases["anterior"], ref)
        resultados.append(dict(data=ref, incluidas=len(incluidos)))
        # Seleciona o período mais recente que cobre ao menos metade da amostra e três perfis.
        if len(incluidos) >= max(3, math.ceil(len(empresas) / 2)):
            referencia = ref
            break
    else:
        raise ValueError(f"Cobertura insuficiente para um benchmark TTM da amostra: {resultados}")
    corte = date.fromisoformat(referencia)
    inicio = date(ano - 1, corte.month + 1, 1)
    return dict(fonte=f"CVM ITR/DFP {ano} · últimos 12 meses (TTM) · amostra da pesquisa", setor="Amostra multissetorial da pesquisa", periodo=f"{inicio:%d/%m/%Y} a {corte:%d/%m/%Y} (12 meses/TTM); PL em {corte:%d/%m/%Y}", dataReferencia=referencia, empresas=incluidos, excluidas=excluidos,
                metodologia="Receita, custos e fluxo: DFP do ano anterior + ITR acumulado atual − ITR acumulado do mesmo período anterior. Patrimônio na data de corte. Valores em reais nominais; sem extrapolação do semestre.",
                origem=dict(repositorio=repositorio, commitPesquisa=commit, coletadoEm=datetime.now(timezone.utc).isoformat(), arquivos=fontes, periodosAvaliados=resultados, selecionadas=len(empresas), incluidas=len(incluidos), excluidas=len(excluidos), setores=dict(Counter(e["setor"] for e in incluidos)), regras="Mesmo CNPJ e escopo em todas as parcelas; última versão de cada documento; períodos acumulados desde 01/01. Custos = -(3.02+3.04); investimento = max(0, -fluxo TTM 6.02), saída líquida e não CAPEX bruto. Ausências não são imputadas. Não é classificação oficial de risco."))
