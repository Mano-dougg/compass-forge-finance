"""Testes da extração histórica com ZIPs locais; não acessam rede."""
import csv
import importlib.util
import io
import tempfile
import unittest
import zipfile
from pathlib import Path

spec = importlib.util.spec_from_file_location("coleta", Path(__file__).with_name("coletar-base-cvm.py"))
coleta = importlib.util.module_from_spec(spec)
spec.loader.exec_module(coleta)


class HistoricoTest(unittest.TestCase):
    def test_versao_unidade_escopo_comparativos_e_ausencias(self):
        campos = ["CNPJ_CIA", "CD_CONTA", "ORDEM_EXERC", "DT_FIM_EXERC", "DT_REFER", "VERSAO", "MOEDA", "ESCALA_MOEDA", "VL_CONTA"]
        def row(ano, valor, **extra):
            return dict(CNPJ_CIA="00000000000001", CD_CONTA="2.03", ORDEM_EXERC="ÚLTIMO", DT_FIM_EXERC=f"{ano}-12-31", DT_REFER=f"{ano}-12-31", VERSAO="1", MOEDA="REAL", ESCALA_MOEDA="MIL", VL_CONTA=str(valor), **extra)
        def escrever_zip(pasta, ano, con, ind):
            with zipfile.ZipFile(pasta / f"dfp_cia_aberta_{ano}.zip", "w") as z:
                for escopo, rows in [("con", con), ("ind", ind)]:
                    texto = io.StringIO()
                    writer = csv.DictWriter(texto, fieldnames=campos, delimiter=";")
                    writer.writeheader()
                    writer.writerows(rows)
                    z.writestr(f"dfp_cia_aberta_BPP_{escopo}_{ano}.csv", texto.getvalue().encode("latin-1"))
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "data").mkdir()
            (root / "data/empresas-b3.csv").write_text("#,CNPJ,Razão Social,Setor\n7,00000000000001,Empresa Teste,Teste\n", encoding="utf-8")
            original_root = coleta.ROOT
            coleta.ROOT = root
            try:
                escrever_zip(root, 2023, [row(2023, -100), {**row(2023, -200), "VERSAO": "2"}, {**row(2023, 999), "ORDEM_EXERC": "PENÚLTIMO"}], [{**row(2023, 400), "ESCALA_MOEDA": "UNIDADE"}])
                escrever_zip(root, 2024, [], [{**row(2024, 500), "DT_REFER": "2024-09-30"}])
                escrever_zip(root, 2025, [{**row(2025, 0), "CD_CONTA": "2.04"}], [])
                base = coleta.coletar_historico(range(2023, 2026), root)
            finally:
                coleta.ROOT = original_root
        empresa = base["empresas"][0]
        con, ind = empresa["historicos"]
        self.assertEqual(con["escopo"], "con")
        self.assertEqual([o["ano"] for o in con["observacoes"]], [2023, 2025])
        self.assertEqual(con["observacoes"][0]["patrimonio"], -200_000)
        self.assertEqual(con["observacoes"][0]["versao"], 2)
        self.assertEqual(con["observacoes"][1]["patrimonio"], 0)
        self.assertEqual(con["observacoes"][1]["conta"], "2.04")
        self.assertEqual(ind["observacoes"][0]["patrimonio"], 400)
        self.assertEqual(len(ind["observacoes"]), 1)
        self.assertEqual(len(base["origem"]["arquivos"]), 3)


if __name__ == "__main__":
    unittest.main()
