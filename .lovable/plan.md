## Objetivo

Remover com segurança a coluna `sublider_id` da tabela `estrutura_equipes`, sem quebrar a edge function `delete-team-member` nem perder histórico de quem era sublíder de cada equipe.

## Contexto da auditoria

- **Frontend (`src/`)**: 0 referências.
- **Views / funções SQL / RLS policies**: 0 referências.
- **FK existente**: `estrutura_equipes_sublider_id_fkey` → `profiles(id)` (some junto com a coluna).
- **Edge function**: `supabase/functions/delete-team-member/index.ts` (linha 108) — faz `UPDATE estrutura_equipes SET sublider_id = null` ao excluir membro. Vai quebrar com `column does not exist` se a coluna sumir antes do deploy.
- **Dados**: 5 das 7 linhas têm `sublider_id` preenchido — esses vínculos serão perdidos se não houver backup.

## Etapas (ordem importa)

### 1. Backup dos dados atuais (precaução)
Antes de qualquer alteração, exportar via `read_query`:
```sql
SELECT id, nome, sublider_id FROM estrutura_equipes WHERE sublider_id IS NOT NULL;
```
Salvar resultado em `/mnt/documents/backup_sublider_estrutura_equipes.csv` para que a liderança possa reconstituir a informação se necessário.

### 2. Atualizar a edge function `delete-team-member`
Remover a entrada `{ table: 'estrutura_equipes', column: 'sublider_id' }` do array `nullifyTables` (linha 108 do `supabase/functions/delete-team-member/index.ts`).

### 3. Deploy da edge function
Fazer deploy de `delete-team-member` **antes** da migration. Garante que nenhuma execução em curso vai tentar atualizar a coluna que está prestes a sumir.

### 4. Migration de remoção
```sql
ALTER TABLE public.estrutura_equipes
  DROP COLUMN IF EXISTS sublider_id;
```
A FK `estrutura_equipes_sublider_id_fkey` é dropada automaticamente pelo `DROP COLUMN`.

### 5. Validação pós-deploy
- Rodar `SELECT column_name FROM information_schema.columns WHERE table_name='estrutura_equipes' AND column_name='sublider_id'` (esperado: 0 linhas).
- Conferir no preview que telas de Estrutura/Equipes seguem carregando.
- Smoke-test: tentar excluir um team member para confirmar que `delete-team-member` roda sem erro.

## Ordem fixa de execução
1. Backup CSV.
2. Editar edge function.
3. Deploy edge function.
4. Migration `DROP COLUMN`.
5. Validação.

## Fora de escopo
- Não criar tabela substituta para "sublíder de equipe". Hoje a liderança continua sendo modelada via `estrutura_area_lideres` (nível área). Se no futuro for preciso voltar a ter sublíder por equipe, será uma nova feature.
- Não regenerar o `src/integrations/supabase/types.ts` manualmente — ele é atualizado automaticamente após a migration.