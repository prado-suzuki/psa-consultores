# Migração: líder de área → gestor de equipe

## Diagnóstico do banco (já verificado)

- **Áreas com >1 líder:** nenhuma. Migração segue sem bloqueio.
- **Áreas com líder + N equipes:**
  - 6 áreas com 1 líder e 1 equipe → mapeamento 1:1.
  - 1 área (`Trabalhos compartilhados OSG`) tem 1 líder e 2 equipes (`Equipe Fiscal e OSG`, `Equipe Tax + Advogados`). O mesmo `user_id` será replicado nas duas equipes (decisão segura: ele já era líder da área inteira).
- **Áreas sem líder** (Compliance, PRADO ADV CIVIL, Societaria) → ficam com `gestor_id = NULL`.

## Backup CSV

Antes da migração, exportar `estrutura_area_lideres` para `/mnt/documents/backup_estrutura_area_lideres_<timestamp>.csv` via `psql COPY`.

## Migração de schema (uma única migration)

```sql
-- 1. Coluna gestor_id
ALTER TABLE public.estrutura_equipes
  ADD COLUMN gestor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Preencher: para cada equipe, pegar o líder da área (DISTINCT — todos os casos têm 1 líder)
UPDATE public.estrutura_equipes e
SET gestor_id = al.user_id
FROM public.estrutura_area_lideres al
WHERE al.area_id = e.area_id;

-- 3. Drop tabela
DROP TABLE public.estrutura_area_lideres;

-- 4. Atualizar função is_area_member: remover UNION com estrutura_area_lideres,
--    incluindo gestor_id da equipe como "membro" da área
CREATE OR REPLACE FUNCTION public.is_area_member(_user_id uuid, _estrutura_area_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM estrutura_equipe_membros em
    JOIN estrutura_equipes eq ON eq.id = em.equipe_id
    WHERE em.user_id = _user_id AND eq.area_id = _estrutura_area_id
    UNION ALL
    SELECT 1 FROM estrutura_equipes eq
    WHERE eq.gestor_id = _user_id AND eq.area_id = _estrutura_area_id
  );
$$;
```

## Mudanças no código

### Hooks
- **`src/hooks/useEstruturaManager.ts`**
  - Remover `AreaLider`, `useEstruturaLideres`, `setAreaLider`.
  - Adicionar `gestor_id` ao type `Equipe` e ao `saveEquipe` (com diff em audit log).
  - Adicionar `setEquipeGestor(equipeId, userId, oldUserId)`.
- **`src/hooks/useEstruturaArea.ts`**
  - Trocar query de `estrutura_area_lideres` por `estrutura_equipes.gestor_id` filtrado pelas equipes da área. `liderIds` continua existindo (agregação de gestores das equipes da área) para preservar o `allMemberIds`.
- **`src/hooks/useClientFormOptions.ts`** e **`src/hooks/useTaxReferenceData.ts`**
  - Substituir leitura de `estrutura_area_lideres` por leitura de `estrutura_equipes.gestor_id`.

### UI
- **`src/components/equipe/estrutura/EstruturaManager.tsx`**
  - Remover bloco "Líder da Área" do nível Área.
  - Adicionar campo "Gestor" (select de profile) dentro da Equipe, exibido junto com nome/ações da equipe. Permite apenas 1 valor.
- **`src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`** e **`src/components/equipe/fiscal/tasks/TaskModal.tsx`**
  - Onde mostravam o líder da área, passar a mostrar o gestor da equipe correspondente (ou unir gestores das equipes da área quando o contexto for "área").

### Edge Functions
- **`supabase/functions/notify-ticket/index.ts`**
  - `getGestorRecipients`: trocar JOIN com `estrutura_area_lideres` por `estrutura_equipes` filtrando `area.name = 'Área Fiscal' AND is_active=true` e pegando `gestor_id`. Atualizar `docs/notificacoes-chamados.md`.
- **`supabase/functions/delete-team-member/index.ts`**
  - Remover cleanup de `estrutura_area_lideres`. Adicionar passo: `UPDATE estrutura_equipes SET gestor_id = NULL WHERE gestor_id = <user>`.

### Memória do projeto
- Atualizar `mem://index.md` removendo a referência a "estrutura_area_lideres" e o link memorial relacionado.

## Ordem de execução

1. Rodar export CSV (`psql COPY` para `/mnt/documents/`).
2. Aplicar migration (schema + UPDATE + DROP + função).
3. Atualizar hooks, componentes e edge functions em paralelo.
4. Atualizar `docs/notificacoes-chamados.md` e memória.
5. Validar build e fluxos de notificação/estrutura.

## Riscos e mitigação

- **Áreas com N equipes recebem o mesmo gestor:** aceitável (era a semântica anterior). Após migração o gestor pode ser ajustado por equipe na UI.
- **`is_area_member` muda semântica:** mantida — gestor da equipe conta como membro da área (equivalente ao líder anterior).
- **Áreas sem equipe (Compliance, PRADO ADV CIVIL, Societaria) perdem rastreio de "líder":** essas áreas já não tinham líder cadastrado, então sem perda de dado.
