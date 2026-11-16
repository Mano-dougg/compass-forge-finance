"""Catálogo de emissores da pesquisa; não é consulta em tempo real à listagem B3."""
import csv
import hashlib
import re

CATALOGO_COMMIT = "6b9d085d1e250a44b9c217264a523d92e4f04be6"
CATALOGO_URL = f"https://raw.githubusercontent.com/Mano-dougg/metodos-estatisticos-scripts/{CATALOGO_COMMIT}/empresas_br_acoes_b3%282%29.csv"


def carregar_catalogo(root, indices, universo="pesquisa"):
    arquivo = root / "data/empresas-b3.csv"
    bruto = arquivo.read_bytes()
    with arquivo.open(encoding="utf-8-sig") as f:
        linhas = [e for e in csv.DictReader(f) if universo == "b3" or int(e["#"]) in indices]
    empresas, vistos, duplicatas = [], set(), []
    for e in linhas:
        chave = re.sub(r"\D", "", e["CNPJ"]).zfill(14)
        if len(chave) != 14 or chave == "0" * 14:
            raise ValueError(f"CNPJ inválido no catálogo: {e['CNPJ']}")
        if chave in vistos:
            duplicatas.append(dict(cnpj=chave, empresa=e["Razão Social"]))
            continue
        vistos.add(chave)
        empresas.append({**e, "CNPJ": chave})
    descricao = "Catálogo integral de empresas B3 da pesquisa" if universo == "b3" else "Amostra multissetorial da pesquisa"
    return empresas, dict(
        tipo=universo, descricao=descricao, linhasSelecionadas=len(linhas), emissores=len(empresas),
        duplicatasDescartadas=duplicatas, arquivo="data/empresas-b3.csv", sha256=hashlib.sha256(bruto).hexdigest(),
        url=CATALOGO_URL, commit=CATALOGO_COMMIT, dataCommit="2026-06-19",
        limitacao="Snapshot do catálogo publicado no repositório; não verifica admissão, suspensão ou cancelamento na B3 em tempo real. Não corresponde a todas as companhias abertas cadastradas na CVM.",
    )
