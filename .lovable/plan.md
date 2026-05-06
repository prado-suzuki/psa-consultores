# Etapa 1 — Adicionar `equipe_id` em `org_projects`

## Contexto verificado
Distribuição atual de projetos por área:

| Área | Nº projetos | Equipes na área | Destino |
|---|---|---|---|
| Área Fiscal | 21 | Equipe Fiscal | Equipe Fiscal |
| Área Fixos | 20 | Equipe Fixos | Equipe Fixos |
| Área Pontuais | 15 | Equipe Pontuais | Equipe Pontuais |
| PSA Consultores | 17 | (exceção) | **Equipe Pontuais** |
| Trabalhos compartilhados OSG | 3 | (exceção, tem 2 equipes) | **Equipe Pontuais** |

Total: 76 projetos, todos mapeáveis sem ambiguidade.

## Migração SQL

1. `ALTER TABLE public.org_projects ADD COLUMN equipe_id uuid REFERENCES public.estrutura_equipes(id);`
2. `CREATE INDEX idx_org_projects_equipe_id ON public.org_projects(equipe_id);`
3. UPDATE em duas etapas:
   - **Exceções** (PSA Consultores e Trabalhos compartilhados OSG) → `equipe_id = '4995f1d5-bdaa-4854-b88c-cf0f42380d13'` (Equipe Pontuais).
   - **Demais** → `equipe_id = (SELECT id FROM estrutura_equipes WHERE area_id = org_projects.estrutura_area_id LIMIT 1)`.
4. Validação pós-update: confirmar que nenhum projeto ficou com `equipe_id IS NULL`.

## Fora de escopo desta etapa
- `estrutura_area_id` permanece intocada.
- Nenhuma mudança em código frontend, hooks, edge functions ou tipos — apenas a coluna nova preenchida no banco. Atualização de `src/integrations/supabase/types.ts` ocorre automaticamente após a migração.
- RLS policies não são alteradas nesta etapa.
