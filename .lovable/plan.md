

## Diagnóstico: Bug "Could not find table 'public.tax_projects'"

### Situação atual

O código-fonte já está 100% correto:
- `src/hooks/useOrgProjects.ts` usa `.from('org_projects')` com FK hints `org_projects_*`
- Zero referências a `tax_projects` em qualquer arquivo `.ts`/`.tsx` (exceto uma FK name metadata em `types.ts` que não afeta queries)
- `types.ts` já foi regenerado com `org_projects` e `org_project_members`

### Causa do erro

O preview em execução está rodando um **build antigo** (cache). As requests de rede mostram chamadas a `rest/v1/tax_projects` com FK hints `tax_projects_*` — código que já não existe mais nos fontes.

### Plano

1. **Forçar rebuild** — Adicionar um comentário trivial em `useOrgProjects.ts` (ex: `// rebuild trigger`) para garantir que o Vite invalide o cache e gere um novo build com o código atualizado.

Nenhuma correção de código é necessária — o problema é exclusivamente de cache do preview.

**1 arquivo, 1 linha adicionada.**

