# -*- coding: utf-8 -*-
"""Valida docs/itcmd-mt/golden-master.json contra a forma fechada da spec.

Uso:
    python scripts/itcmd/selftest-golden.py

Sai com codigo 1 se algum caso congelado divergir. Serve de porta de entrada
para o motor: quando ele existir, deve passar por este mesmo conjunto.
"""
import json
import os
import sys
from decimal import Decimal as D, ROUND_HALF_UP

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GM = os.path.join(RAIZ, "docs", "itcmd-mt", "golden-master.json")


def carregar_faixas(gm):
    return [(None if f["limite_superior_upf"] is None else D(f["limite_superior_upf"]),
             D(f["aliquota"]), D(f["deducao_upf"]), f["isento"])
            for f in gm["parametros"]["faixas_doacao"]]


GRUPOS = ("G1_regressao", "G2_correcao", "G3_borda_sintetica",
          "G4_homologado_agro_alianca", "G5_correcao_agro_alianca")


def imposto(base, upf, faixas):
    base, upf = D(base), D(upf)
    for i, (lim, aliq, ded, isento) in enumerate(faixas, start=1):
        if lim is None or base <= lim * upf:
            v = aliq * base - ded * upf
            if v < 0:
                raise ValueError(f"imposto negativo: {v}")
            return v, v.quantize(D("0.01"), ROUND_HALF_UP), isento, i
    raise AssertionError("faixa não encontrada")


def main():
    gm = json.load(open(GM, encoding="utf-8"))
    faixas = carregar_faixas(gm)
    falhas, total, pendentes = [], 0, []
    por_faixa = {}

    for grupo in GRUPOS:
        for c in gm[grupo]["casos"]:
            esp = str(c.get("esperado", ""))
            if "base" not in c or not esp.replace(".", "").replace("-", "").isdigit():
                pendentes.append((c["id"], esp))
                continue
            total += 1
            try:
                exato, arred, isento, faixa = imposto(c["base"], c["upf"], faixas)
            except ValueError as e:
                falhas.append(f"{c['id']}: {e}")
                continue
            por_faixa[faixa] = por_faixa.get(faixa, 0) + 1
            if arred != D(esp):
                falhas.append(f"{c['id']}: esperado {esp}, obtido {arred}")
            if "isento" in c and isento != c["isento"]:
                falhas.append(f"{c['id']}: flag isento esperado {c['isento']}, obtido {isento}")
            if "exato" in c and str(exato) != c["exato"]:
                falhas.append(f"{c['id']}: valor exato esperado {c['exato']}, obtido {exato}")
            if "faixa" in c and faixa != c["faixa"]:
                falhas.append(f"{c['id']}: faixa declarada {c['faixa']}, calculada {faixa}")

    # cadeia de avaliacao: reconstruido == WP, e quocientes exatos
    ca = gm["cadeia_avaliacao"]
    for k, v in ca["totais"].items():
        if v["reconstruido"] != v["wp"]:
            falhas.append(f"cadeia_avaliacao.{k}: reconstruído {v['reconstruido']} != WP {v['wp']}")
    for k in ("itr", "mercado"):
        n, d = ca["valor_por_quota"][k]["quociente"].split(" / ")
        if str(D(n) / D(d)) != ca["valor_por_quota"][k]["exato_28dig"]:
            falhas.append(f"valor_por_quota.{k}: quociente exato não confere")

    for cid, esp in pendentes:
        print(f"  pendente de homologação: {cid} -> {esp}")
    for f in falhas:
        print(f"  FALHA {f}")

    print(f"\nauto-teste golden-master: {total - len(falhas)}/{total} casos conferem, "
          f"{len(pendentes)} pendente(s) de homologação")
    nomes = {1: "isento", 2: "2%", 3: "4%", 4: "6%", 5: "8%"}
    print("cobertura por faixa: " + " · ".join(
        f"{nomes[k]} = {por_faixa.get(k, 0)}" for k in sorted(nomes)))
    if not por_faixa.get(1):
        print("  ATENÇÃO: nenhum caso exercita a faixa de isenção")
    print(f"bloqueios abertos: {len(gm['bloqueios']['itens'])} "
          f"({', '.join(i['id'] for i in gm['bloqueios']['itens'])})")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
