## Rodar migration `20260527120000_pessoa_align_diagram.sql`

Alinha a tabela `public.pessoa` ao diagrama ER.

### O que a migration faz

1. **Renomeia colunas** (RG → documento de identidade genérico):
   - `rg_numero` → `documento_identidade_numero`
   - `rg_orgao_emissor` → `documento_identidade_orgao`
   - `rg_uf` → `documento_identidade_uf`

2. **Adiciona novas colunas** em `pessoa`:
   - `documento_identidade_tipo` (rg/cnh/reservista/ctps)
   - `nome_uso`, `genero` (M/F)
   - `naturalidade_municipio`, `naturalidade_uf`
   - `filiacao_pai_pessoa_id`, `filiacao_mae_pessoa_id` (FKs para `pessoa.id`, ON DELETE SET NULL)
   - `convive_uniao_estavel` (bool, default false)
   - `is_fundador` (bool, default false)

3. **Checks**: `genero IN ('M','F')`, `documento_identidade_tipo IN ('rg','cnh','reservista','ctps')`.

4. **Comentários** em todas as novas colunas + índices nos dois novos FKs.

### Observações

- Migration é puramente de schema (sem GRANT/RLS novos — a tabela já existe com políticas).
- **Impacto em código**: o hook `src/hooks/useQuadroSocietario.ts` lista `rg_numero`, `rg_orgao_emissor`, `rg_uf` em `PESSOA_DIFF_FIELDS`. Após a migration os tipos do Supabase serão regenerados e esses nomes deixarão de existir — vai quebrar TypeScript. Será necessário atualizar o array (e qualquer formulário que use os nomes antigos) para os novos nomes `documento_identidade_*` num passo seguinte.

### Passos

1. Executar a migration via tool de migration.
2. Após aprovação e regeneração dos tipos, ajustar `useQuadroSocietario.ts` (e demais usos de `rg_*` em `pessoa`) para os novos nomes — confirmar comigo antes.