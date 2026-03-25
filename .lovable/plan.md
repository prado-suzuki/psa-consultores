

## Plano: Atualizar IDs de contribuintes para sincronizar com DW

### Situacao atual

Confirmei que ambos os contribuintes existem na base:
- `e4e3ccc9-...` → Dk Transportes Rodoviarios Ltda
- `a20fdaf0-...` → Rene Jungeuira Barbour

Tabelas que referenciam esses IDs:
| Tabela | Registros afetados |
|--------|-------------------|
| `per` | 8 |
| `contribuinte_bal_config` | 1 |
| `tax_projects` | 0 |
| `fiscal_tasks` | 0 |
| `inscricao_contribuinte` | 0 |

### O que sera feito

Uma unica migration SQL que:

1. Atualiza as tabelas dependentes primeiro (per, contribuinte_bal_config) trocando o ID antigo pelo novo
2. Atualiza o ID do proprio contribuinte

A ordem e: dependentes primeiro, depois o registro principal — evita violacao de FK.

**DK Transportes:**
- `per.id_contribuinte`: `e4e3ccc9-...` → `1dc16e34-...` (8 linhas)
- `contribuinte_bal_config.id_contribuinte`: mesma troca (verificar qual dos dois)
- `contribuinte.id`: `e4e3ccc9-...` → `1dc16e34-...`

**Rene Jungeuira Barbour:**
- `contribuinte.id`: `a20fdaf0-...` → `0b81b35b-...`
- (sem dependentes)

### Nenhum arquivo de codigo muda

Apenas uma migration de dados no banco.

