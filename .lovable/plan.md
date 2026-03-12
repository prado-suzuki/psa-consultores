

# Análise: RLS e Queries Inline em FiscalProjetosCadastro.tsx

## Resultado da Investigação

### Problema 1 (RLS): JÁ RESOLVIDO

Ambas as tabelas **já possuem políticas de UPDATE** para todos os papéis necessários:

**`tax_project_members`** — possui 5 políticas:
- `Admins can manage tax_project_members` (ALL)
- `Members can view their project members` (SELECT)
- `Team can insert tax_project_members` (INSERT) — admin, lider, sublider, team_member
- **`Team can update tax_project_members` (UPDATE)** — admin, lider, sublider, team_member ✅
- `Team can delete tax_project_members` (DELETE) — admin, lider, sublider, team_member

**`project_servicos`** — possui 4 políticas:
- SELECT, INSERT, **UPDATE** ✅, DELETE — todas para admin, lider, sublider, team_member

**Nenhuma alteração SQL é necessária.** Os upserts já são suportados pelas políticas existentes.

---

### Problema 2 (Queries Inline): JÁ RESOLVIDO

Todas as mutations (create, update, delete de projetos + membros + serviços) **já residem no hook `useTaxProjects.ts`**. O componente consome:
- `useCreateTaxProject()`, `useUpdateTaxProject()`, `useDeleteTaxProject()` — mutations via hook ✅
- `useProjectMembers()`, `useProjectServicos()`, `useProjectHours()` — queries via hook ✅

As queries inline restantes no componente são **dados de referência contextuais** (não são mutations CUD):
- `servicos_prestados` — catálogo de serviços (dropdown)
- `area_servicos` — links entre áreas e serviços (filtro)
- `profiles_safe` — lista de usuários (dropdowns)
- `user_roles` — papéis para filtrar líderes/sublíderes/membros
- `estrutura_equipes` / `estrutura_equipe_membros` — filtragem de membros por sublíder

Estas são queries de **leitura pura para dados de referência**, categoria tolerada conforme o `AI_CONTEXT.md`:
> "Exceções toleradas: queries inline com useQuery em páginas de listagem simples."

---

## Conclusão

**Ambos os problemas descritos já foram corrigidos em iterações anteriores.** Não há alterações pendentes de SQL (RLS) nem refatoração de código necessária. O sistema está em conformidade com as regras do `AI_CONTEXT.md`.

Se o erro `new row violates row-level security policy` ainda estiver ocorrendo, a causa seria outra — por exemplo, a política de **SELECT** em `tax_project_members` que exige `is_project_member()`, o que pode bloquear o retorno do upsert para membros novos. Se esse for o caso, posso investigar esse cenário específico.

