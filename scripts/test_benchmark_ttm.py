"""Testes de período, sinal, versão e conciliação TTM; sem rede."""
import csv
import io
import unittest
import subprocess
import tempfile
from pathlib import Path
import sys
import zipfile
from benchmark_ttm import ler_demonstracoes, montar_ttm

CNPJ = "00000000000001"
EMPRESAS = [{"CNPJ": CNPJ, "Razão Social": "Empresa Teste", "Setor": "Teste"}]

def indice(ref, receita, custo, despesa, fluxo, pl=None, escopo="con"):
    valores = {(CNPJ, escopo, "DRE", ref): {"versao": 1, "valores": {"3.01": receita, "3.02": custo, "3.04": despesa}}, (CNPJ, escopo, "DFC_MI", ref): {"versao": 1, "valores": {"6.02": fluxo}}}
    if pl is not None:
        valores[(CNPJ, escopo, "BPP", ref)] = {"versao": 1, "valores": {"2.03": pl}}
    return valores

class BenchmarkTTMTest(unittest.TestCase):
    def test_cli_nao_sobrescreve_benchmark_quando_coleta_anual_vem_vazia(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            bruto = root / "vazio.zip"
            with zipfile.ZipFile(bruto, "w"):
                pass
            destino = root / "base.json"
            destino.write_text('{"preservar": true}', encoding="utf-8")
            r = subprocess.run([sys.executable, str(Path(__file__).with_name("coletar-base-cvm.py")), "--ano", "2026", "--zip", str(bruto), "--saida", str(destino)], capture_output=True, text=True)
            self.assertEqual(r.returncode, 2)
            self.assertIn("Nenhum arquivo foi gravado", r.stderr)
            self.assertEqual(destino.read_text(), '{"preservar": true}')

    def test_conciliacao_sinais_e_patrimonio_na_data_atual(self):
        atual = indice("2026-06-30", 80, -30, -10, -12, pl=200)
        anual = indice("2025-12-31", 120, -50, -20, -20)
        anterior = indice("2025-06-30", 50, -20, -5, -8)
        incluidos, excluidos = montar_ttm(EMPRESAS, atual, anual, anterior, "2026-06-30")
        self.assertEqual(excluidos, [])
        e = incluidos[0]
        self.assertEqual(e["receita"], 150)
        self.assertEqual(e["custos"], 85)
        self.assertEqual(e["investimento"], 24)
        self.assertEqual(e["patrimonio"], 200)
        self.assertEqual(e["conciliacao"]["componentes"]["fluxo"]["valor"], -24)

    def test_nao_mistura_escopos_nem_imputa_ausencias(self):
        atual = indice("2026-06-30", 80, -30, -10, -12, pl=200)
        anual = indice("2025-12-31", 120, -50, -20, -20)
        anterior = indice("2025-06-30", 50, -20, -5, -8, escopo="ind")
        incluidos, excluidos = montar_ttm(EMPRESAS, atual, anual, anterior, "2026-06-30")
        self.assertEqual(incluidos, [])
        self.assertIn("itrAnterior/receita", excluidos[0]["motivo"])

    def test_fluxo_positivo_vira_zero_de_saida_sem_perder_o_original(self):
        atual = indice("2026-06-30", 80, -30, -10, 12, pl=200)
        anual = indice("2025-12-31", 120, -50, -20, 20)
        anterior = indice("2025-06-30", 50, -20, -5, 8)
        e = montar_ttm(EMPRESAS, atual, anual, anterior, "2026-06-30")[0][0]
        self.assertEqual(e["investimento"], 0)
        self.assertEqual(e["fluxoInvestimentoOriginal"], 24)

    def test_nao_completa_ultima_versao_com_conta_antiga_ou_trimestre_isolado(self):
        campos = ["CNPJ_CIA", "CD_CONTA", "ORDEM_EXERC", "DT_FIM_EXERC", "DT_INI_EXERC", "DT_REFER", "VERSAO", "MOEDA", "ESCALA_MOEDA", "VL_CONTA"]
        def row(conta, valor, versao="1", inicio="2026-01-01"):
            return dict(CNPJ_CIA=CNPJ, CD_CONTA=conta, ORDEM_EXERC="ÚLTIMO", DT_FIM_EXERC="2026-06-30", DT_INI_EXERC=inicio, DT_REFER="2026-06-30", VERSAO=versao, MOEDA="REAL", ESCALA_MOEDA="MIL", VL_CONTA=str(valor))
        texto = io.StringIO()
        w = csv.DictWriter(texto, fieldnames=campos, delimiter=";")
        w.writeheader()
        w.writerows([row("3.01", 100), row("3.02", -20), row("3.01", 110, "2"), row("3.04", -10, "2"), row("3.02", -5, "2", inicio="2026-04-01")])
        bruto = io.BytesIO()
        with zipfile.ZipFile(bruto, "w") as z:
            z.writestr("itr_cia_aberta_DRE_con_2026.csv", texto.getvalue().encode("latin-1"))
        r = ler_demonstracoes(bruto.getvalue(), "itr", 2026, {CNPJ})
        dre = r[(CNPJ, "con", "DRE", "2026-06-30")]
        self.assertEqual(dre["versao"], 2)
        self.assertEqual(dre["valores"]["3.01"], 110_000)
        self.assertNotIn("3.02", dre["valores"])

if __name__ == "__main__":
    unittest.main()
