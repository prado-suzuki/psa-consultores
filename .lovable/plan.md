## Objetivo

Substituir mensagens genéricas de erro do Supabase (ex.: *"new row violates row-level security policy for table org_projects"*) por mensagens amigáveis que expliquem ao usuário o real motivo (falta de permissão) e o caminho (procurar líder/admin).

## Escopo

Arquivo único: `src/hooks/useOrgProjects.ts` — três pontos:
- `useCreateOrgProject` (linha 257)
- `useUpdateOrgProject` (linha 347)
- `useDeleteOrgProject` (linha 371)

## Abordagem

1. Criar helper local `formatProjectError(error, action)` que detecta erros de RLS via:
   - `error.code === '42501'`
   - mensagem contendo `row-level security` / `violates row-level security` / `permission denied`
   
2. Para erros de RLS, retornar mensagens contextualizadas:
   - **Criar:** *"Você não tem permissão para criar projetos. Apenas usuários com perfil Sublíder ou superior podem criar projetos. Solicite acesso à liderança."*
   - **Atualizar:** *"Você não tem permissão para atualizar este projeto. É necessário ser membro do projeto ou ter perfil Sublíder ou superior."*
   - **Excluir:** *"Você não tem permissão para excluir este projeto. Apenas o criador ou um Líder pode excluir."*

3. Para outros erros, mostrar mensagem genérica + `error.message` original (mantendo comportamento atual).

4. Substituir os 3 `toast.error(...)` para usar o helper.

## Detalhes técnicos

```ts
function formatProjectError(error: any, action: 'create' | 'update' | 'delete'): string {
  const msg = (error?.message || '').toLowerCase();
  const isRls = error?.code === '42501' || msg.includes('row-level security') || msg.includes('row level security') || msg.includes('permission denied');

  if (isRls) {
    switch (action) {
      case 'create': return 'Sem permissão para criar projetos. Apenas Sublíder, Líder ou Admin podem criar. Solicite acesso à liderança.';
      case 'update': return 'Sem permissão para editar este projeto. É necessário ser membro do projeto ou ter perfil Sublíder ou superior.';
      case 'delete': return 'Sem permissão para excluir este projeto. Apenas o criador ou um Líder pode excluir.';
    }
  }
  const fallback = { create: 'Erro ao criar projeto', update: 'Erro ao atualizar projeto', delete: 'Erro ao excluir projeto' }[action];
  return `${fallback}: ${error?.message ?? 'erro desconhecido'}`;
}
```

E nos `onError`:
```ts
toast.error(formatProjectError(error, 'create'));
```

## Fora de escopo

- Não alterar a UI (botões/permissões) — fica para outro plano.
- Não alterar policies do banco.
- Padrão pode ser replicado em outros hooks depois, mas este plano cobre apenas `useOrgProjects.ts`.