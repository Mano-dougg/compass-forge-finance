#!/usr/bin/env python3
"""Coleta somente leitura, adaptada de Mano-dougg/metodos-estatisticos-scripts.
Python 3, apenas biblioteca padrão. Nunca envia dados a formulários.
"""
import argparse
import csv
import hashlib
import io
import json
import re
import urllib.request
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from catalogo_b3 import carregar_catalogo

ROOT = Path(__file__).resolve().parents[1]
INDICES = {380, 444, 106, 227, 406, 146, 168, 7, 207, 458, 417, 359, 326, 148, 42, 377, 268, 45, 8, 74, 447, 335, 465, 109, 119, 467, 446, 36, 229, 284, 404, 136, 281, 274, 80}
REPO = "https://github.com/Mano-dougg/metodos-estatisticos-scripts"
COMMIT_PESQUISA = "6b9d085d1e250a44b9c217264a523d92e4f04be6"


def cnpj(valor):
    return re.sub(r"\D", "", valor).zfill(14)


def coletar(ano, arquivo_zip=None, universo="pesquisa"):
    url = f"https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS/dfp_cia_aberta_{ano}.zip"
    bruto = Path(arquivo_zip).read_bytes() if arquivo_zip else urllib.request.urlopen(url, timeout=120).read()
    empresas, catalogo = carregar_catalogo(ROOT, INDICES, universo)
    ids = {cnpj(e["CNPJ"]) for e in empresas}
    registros = defaultdict(list)
    tipos = {"BPP": {"2.03", "2.04"}, "DRE": {"3.01", "3.02", "3.04"}, "DFC_MI": {"6.02"}, "DFC_MD": {"6.02"}}
    with zipfile.ZipFile(io.BytesIO(bruto)) as z:
        for tipo, contas in tipos.items():
            for escopo in ["con", "ind"]:
                nome = f"dfp_cia_aberta_{tipo}_{escopo}_{ano}.csv"
                if nome not in z.namelist():
                    continue
                for row in csv.DictReader(io.TextIOWrapper(z.open(nome), encoding="latin-1"), delimiter=";"):
                    chave = cnpj(row["CNPJ_CIA"])
                    # Ano anual exato, exercício atual; impede mistura de comparativos e trimestres.
                    if chave not in ids or row["ORDEM_EXERC"] != "ÚLTIMO" or row["DT_FIM_EXERC"] != f"{ano}-12-31":
                        continue
                    if tipo != "BPP" and row.get("DT_INI_EXERC") != f"{ano}-01-01":
                        continue
                    if row["CD_CONTA"] in contas:
                        registros[(chave, tipo, escopo, row["CD_CONTA"])].append(row)

    def conta(chave, tipo, escopo, codigo):
        rows = registros.get((chave, tipo, escopo, codigo), [])
        if not rows:
            return None
        row = max(rows, key=lambda r: (r.get("DT_REFER", ""), int(r.get("VERSAO", "0"))))
        escala = row["ESCALA_MOEDA"].upper()
        if escala not in {"MIL", "UNIDADE"} or row.get("MOEDA") != "REAL":
            raise ValueError(f"Unidade não suportada para {chave}: {escala}/{row.get('MOEDA')}")
        return float(row["VL_CONTA"].replace(",", ".")) * (1000 if escala == "MIL" else 1)

    incluidos, excluidos = [], []
    for e in empresas:
        chave = cnpj(e["CNPJ"])
        resultado = None
        for escopo in ["con", "ind"]:
            # Não mistura consolidado e individual entre métricas de uma mesma empresa.
            pl = conta(chave, "BPP", escopo, "2.03")
            if pl is None:
                pl = conta(chave, "BPP", escopo, "2.04")
            receita = conta(chave, "DRE", escopo, "3.01")
            custo = conta(chave, "DRE", escopo, "3.02")
            despesa = conta(chave, "DRE", escopo, "3.04")
            fi = conta(chave, "DFC_MI", escopo, "6.02")
            if fi is None:
                fi = conta(chave, "DFC_MD", escopo, "6.02")
            if any(v is None for v in [pl, receita, custo, despesa, fi]):
                continue
            cd = -(custo + despesa)
            if pl <= 0 or receita <= 0 or cd < 0:
                continue
            resultado = dict(empresa=e["Razão Social"], cnpj=chave, setor=e["Setor"], patrimonio=pl, receita=receita, custos=cd,
                             investimento=max(0, -fi), fluxoInvestimentoOriginal=fi, escopo=escopo)
            break
        if resultado:
            incluidos.append(resultado)
        else:
            excluidos.append(dict(empresa=e["Razão Social"], motivo="Demonstrações anuais completas e compatíveis não disponíveis; ou receita/PL não positivos/custos incompatíveis."))
    return dict(fonte=f"CVM DFP {ano} · {catalogo['descricao']}", setor=catalogo["descricao"], periodo=f"{ano} anual",
                empresas=incluidos, universo=catalogo, origem=dict(repositorio=REPO, commitPesquisa=COMMIT_PESQUISA, url=url, sha256=hashlib.sha256(bruto).hexdigest(), coletadoEm=datetime.now(timezone.utc).isoformat(),
                contas=dict(patrimonio="BPP 2.03, fallback 2.04", receita="DRE 3.01", custos="-(DRE 3.02 + 3.04)", investimento="max(0, -DFC 6.02), saída líquida de caixa; não equivale a CAPEX bruto"),
                regras="Exercício ÚLTIMO, anual de janeiro a dezembro, valores em reais; mesmo escopo por empresa. Sem imputar dados ausentes como zero. Perfil é operacional, não rating de crédito."), excluidas=excluidos)


def coletar_historico(anos, diretorio_zip=None, universo="pesquisa"):
    """Séries anuais de PL da mesma empresa/escopo, sem imputação de ausências."""
    empresas, catalogo = carregar_catalogo(ROOT, INDICES, universo)
    ids = {cnpj(e["CNPJ"]) for e in empresas}
    series = defaultdict(list)
    fontes = []
    for ano in anos:
        url = f"https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS/dfp_cia_aberta_{ano}.zip"
        cache = Path(diretorio_zip) / f"dfp_cia_aberta_{ano}.zip" if diretorio_zip else None
        if cache and cache.exists():
            bruto = cache.read_bytes()
        else:
            bruto = urllib.request.urlopen(url, timeout=120).read()
            if cache:
                cache.parent.mkdir(parents=True, exist_ok=True)
                cache.write_bytes(bruto)
        fontes.append(dict(ano=ano, url=url, sha256=hashlib.sha256(bruto).hexdigest()))
        print(f"Histórico de patrimônio: {ano}")
        with zipfile.ZipFile(io.BytesIO(bruto)) as z:
            for escopo in ["con", "ind"]:
                nome = f"dfp_cia_aberta_BPP_{escopo}_{ano}.csv"
                if nome not in z.namelist():
                    continue
                candidatos = defaultdict(list)
                for row in csv.DictReader(io.TextIOWrapper(z.open(nome), encoding="latin-1"), delimiter=";"):
                    chave = cnpj(row["CNPJ_CIA"])
                    if chave in ids and row["CD_CONTA"] in {"2.03", "2.04"} and row["ORDEM_EXERC"] == "ÚLTIMO" and row["DT_FIM_EXERC"] == f"{ano}-12-31" and row["DT_REFER"] == f"{ano}-12-31":
                        candidatos[chave].append(row)
                for chave, rows in candidatos.items():
                    versao = max(int(r["VERSAO"]) for r in rows)
                    atuais = [r for r in rows if int(r["VERSAO"]) == versao]
                    row = next((r for r in atuais if r["CD_CONTA"] == "2.03"), atuais[0])
                    escala = row["ESCALA_MOEDA"].upper()
                    if row["MOEDA"] != "REAL" or escala not in {"MIL", "UNIDADE"}:
                        raise ValueError(f"Moeda/escala incompatível em {ano}, {chave}.")
                    pl = float(row["VL_CONTA"].replace(",", ".")) * (1000 if escala == "MIL" else 1)
                    # PL negativo ou zero é informação válida em uma série temporal.
                    series[(chave, escopo)].append(dict(ano=ano, patrimonio=pl, conta=row["CD_CONTA"], versao=versao, escalaOriginal=escala))
    saida = []
    for e in empresas:
        chave = cnpj(e["CNPJ"])
        historicos = [dict(escopo=escopo, observacoes=series[(chave, escopo)]) for escopo in ["con", "ind"] if series[(chave, escopo)]]
        saida.append(dict(empresa=e["Razão Social"], cnpj=chave, setor=e["Setor"], historicos=historicos))
    return dict(fonte="CVM DFP · patrimônio líquido anual", anos=list(anos), unidade="BRL", empresas=saida, universo=catalogo,
                origem=dict(repositorio=REPO, commitPesquisa=COMMIT_PESQUISA, coletadoEm=datetime.now(timezone.utc).isoformat(), arquivos=fontes,
                regras="BPP 2.03 (fallback 2.04), 31/12, ÚLTIMO, última versão por ano. Consolidado e individual em séries separadas. Valores nominais em reais, sem corrigir inflação. Ausências não viram zero. Revisões disponíveis na data da coleta; não é base point-in-time."))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ttm", action="store_true", help="Benchmark anual móvel com ITR do ano solicitado")
    parser.add_argument("--universo", choices=["b3", "pesquisa"], default="b3", help="b3: catálogo integral de emissores do repositório (padrão); pesquisa: recorte original de 35 empresas")
    parser.add_argument("--data-referencia", help="Corte trimestral opcional, ex.: 2026-06-30")
    parser.add_argument("--historico", action="store_true", help="Coletar série anual de PL em vez do benchmark de um ano")
    parser.add_argument("--inicio", type=int, default=2021)
    parser.add_argument("--fim", type=int, default=2025)
    parser.add_argument("--cache-dir", help="Diretório opcional para guardar ZIPs públicos da CVM")
    parser.add_argument("--ano", type=int, default=2024)
    parser.add_argument("--zip", help="Arquivo CVM já baixado (opcional)")
    parser.add_argument("--saida", default=None)
    args = parser.parse_args()
    if args.ttm and args.historico:
        parser.error("Escolha --ttm ou --historico, não ambos.")
    if args.ttm:
        from benchmark_ttm import coletar_ttm
        base = coletar_ttm(args.ano, ROOT, INDICES, REPO, COMMIT_PESQUISA, args.cache_dir, args.data_referencia, args.universo)
        saida = args.saida or str(ROOT / f"public/base-cvm-{args.ano}{'-b3' if args.universo == 'b3' else ''}.json")
    elif args.historico:
        if args.inicio > args.fim or args.fim - args.inicio > 20:
            parser.error("Use um intervalo crescente de até 21 anos.")
        base = coletar_historico(range(args.inicio, args.fim + 1), args.cache_dir, args.universo)
        saida = args.saida or str(ROOT / "public/historico-patrimonio-cvm.json")
    else:
        base = coletar(args.ano, args.zip, args.universo)
        saida = args.saida or str(ROOT / f"public/base-cvm-{args.ano}{'-b3' if args.universo == 'b3' else ''}.json")
    if not args.historico and len(base["empresas"]) < 3:
        parser.error("Cobertura insuficiente: menos de três empresas completas. Nenhum arquivo foi gravado. Para ano em andamento, utilize --ttm com ITR acumulado.")
    import tempfile
    destino = Path(saida)
    destino.parent.mkdir(parents=True, exist_ok=True)
    temporario = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=destino.parent, prefix=".benchmark-", suffix=".json", delete=False) as arquivo:
            temporario = Path(arquivo.name)
            json.dump(base, arquivo, indent=2, ensure_ascii=False, allow_nan=False)
            arquivo.write("\n")
        temporario.chmod(0o644)
        temporario.replace(destino)
    finally:
        if temporario and temporario.exists():
            temporario.unlink()
    print(f"{len(base['empresas'])} empresas. Saída: {saida}")
