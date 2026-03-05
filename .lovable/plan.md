
# Atualizar nomes na tabela `empresas_faturamento`

## Situação atual
A tabela tem 8 registros. A lista desejada tem 9 nomes.

| Atual | Ação |
|---|---|
| PRADO ADVOGADOS | Manter |
| PRADO SUZUKI | Manter |
| PROFITTO | Manter |
| PSA AUDITORES | Manter |
| PSA CONSULTORES | Manter |
| PSA NORTE | Manter |
| **PSA ADM JUDICIAL** | Renomear → **PSA CONSULTORIA EMPRESARIAL** |
| **PROTENUN** | Renomear → **SF PARTICIPACOES** |
| *(novo)* | Inserir → **PRADOSUZUKI EMPRESAS FAMILIARES** |

## Execução
Três comandos SQL via ferramenta de dados:

1. `UPDATE empresas_faturamento SET nome = 'PSA CONSULTORIA EMPRESARIAL' WHERE id = '4752cf73-...'`
2. `UPDATE empresas_faturamento SET nome = 'SF PARTICIPACOES' WHERE id = 'f0c1caaa-...'`
3. `INSERT INTO empresas_faturamento (nome) VALUES ('PRADOSUZUKI EMPRESAS FAMILIARES')`

Nenhuma alteração de código é necessária.
