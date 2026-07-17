## OSG-BE-03 (Parte 2) — Separar itens agrupados do checklist

Uma única migração forward idempotente, sem tocar em front, RLS, triggers ou outras tabelas.

### Passo 1 — Pré-voo (read-only, dentro do DO block)
- Verificar que `pessoa-fisica--rg-cnh` e `pessoa-juridica--balanco-balancete-dre` existem e estão `ativo=true`.
- Guard de idempotência: se `pessoa-fisica--rg` já existe, `RAISE NOTICE` e `RETURN` (migração vira no-op).

### Passo 2 — Migração (forward, idempotente)

Estrutura do `DO $$ ... END $$` (tudo em uma transação):

1. **Guard**: se `pessoa-fisica--rg` já existe → NOTICE + RETURN.
2. **Desativar combinados**: `UPDATE checklist_item_padrao SET ativo=false, updated_at=now() WHERE codigo IN ('pessoa-fisica--rg-cnh','pessoa-juridica--balanco-balancete-dre')`.
3. **Abrir espaço na ordem (apenas ativos)**:
   - `ordem += 3` para itens ativos com `ordem >= 15`.
   - `ordem += 1` para itens ativos com `ordem BETWEEN 5 AND 13`.
   - RG/CNH-combo (ordem 4) e Balanço-combo (agora deslocado) já estão `ativo=false`, não são afetados.
4. **Inserir 5 novos itens padrão** (`ativo=true`, `obrigatorio_default=true`), herdando entidade/categoria/docbox/granularidade dos originais:
   - `pessoa-fisica--rg` (ordem 4, granularidade `pessoa_pf`, categoria `pessoais`, docbox `Documentos Pessoais`).
   - `pessoa-fisica--cnh` (ordem 5, mesma config).
   - `pessoa-juridica--balanco` (ordem 15, granularidade `pessoa_pj`, categoria `societarios`, docbox `Documentos Societários`).
   - `pessoa-juridica--balancete` (ordem 16).
   - `pessoa-juridica--dre` (ordem 17).
5. **Migrar 16 cópias em `checklist_cliente_item`**:
   - Para cada linha vinculada ao combo RG/CNH, inserir 2 novas linhas (uma apontando para `--rg`, outra para `--cnh`) preservando `cliente_id`, `pessoa_id`, `bem_id`, `matricula_id`, `origem`, `status`, `observacao`.
   - Para cada linha vinculada ao combo Balanço/Balancete/DRE, inserir 3 novas linhas (`--balanco`, `--balancete`, `--dre`) idem.
   - `DELETE` as linhas antigas dos combos (usando JOIN com `checklist_item_padrao` pelos códigos combinados).
   - Como nenhuma linha antiga tem `documento_arquivo.checklist_item_id` apontando pra ela, o DELETE não fere FKs.

### Passo 3 — GATE de validação (queries read-only pós-migração)
1. `SELECT codigo, ordem, ativo, obrigatorio_default FROM checklist_item_padrao WHERE codigo IN (5 novos)` → todos `ativo=true`, `obrigatorio_default=true`, ordens 4,5,15,16,17.
2. Combos com `ativo=false`.
3. `SELECT count(*), count(DISTINCT ordem) FROM checklist_item_padrao WHERE ativo=true` → 66/66; e `min=1, max=66` sem gaps/duplicatas.
4. Contagens em `checklist_cliente_item` por `item_padrao_id`: RG=13, CNH=13, Balanço=3, Balancete=3, DRE=3; nenhuma linha para os combos; total geral consistente (100 nas 5 novas).
5. `SELECT count(*) FROM documento_arquivo WHERE checklist_item_id IS NOT NULL` → inalterado (0).
6. Abrir `/equipe/osg/work/relatorios` num cliente com PF/PJ para conferir visualmente.

### Fora de escopo
- Não apagar combinados (só `ativo=false`).
- Não tocar em `docTipos.ts`, `checklistPadrao.ts`, `FiscalReport.tsx` nem front.
- Não mexer em `documento_arquivo`, enum `osg_checklist_status`, RLS, triggers, outras tabelas.
- Não renumerar itens inativos.
- Não criar itens de "Planejamento Tributário/Fiscal".

### Dívida técnica registrada (não-ação)
- `checklistPadrao.ts` e o seed são gerados por `build_checklist.py` (fora do repo). O gerador precisa ser atualizado depois para não ressuscitar os combinados. Anotar em `docs/osg/` como follow-up.
