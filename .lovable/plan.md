

## Plano: Carregar dados CSV na tabela `pis_cofins_regra`

### Análise do CSV
- 1.748 linhas (1 header + 1.747 registros)
- Colunas coincidem com a tabela: `id, id_segmento, cod_ncm, cst_pis, cst_cofins, desc_cst, base_legal, permite_credito, tipo_credito, observacoes, data_vigencia_inicio, data_vigencia_fim`
- Problema: cada linha termina com `;;;` (lixo do export BigQuery) — precisa ser limpo antes do import

### Passos

1. **Limpar o CSV** — remover os `;;;` do final de cada linha via script
2. **Inserir via `psql COPY`** — carregar as 1.747 linhas diretamente na tabela `pis_cofins_regra` usando `COPY FROM STDIN WITH CSV HEADER`
3. **Validar** — contar registros inseridos para confirmar integridade

### Observações
- Os UUIDs originais do BigQuery serão preservados (coluna `id`)
- `created_at` será preenchido automaticamente pelo default `now()`
- Campos vazios no CSV serão inseridos como `NULL`

