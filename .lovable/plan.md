

# Plano: Filtrar cards de sub-área por permissões reais do usuário

## Problema
O `DigitalAreaSelector` mostra "Digital Rotina" e "Digital Dev" para todos os usuários internos, mesmo que só tenham acesso a uma das categorias. O `ProjetosAreaSelector` tem o mesmo problema com "Fiscal" e "Fixos".

## Solução

### Hook reutilizável: `useUserAccessibleCategories`
Criar um hook que consulta `user_page_access` + `page_permissions` para retornar as categorias acessíveis do usuário logado. Padrão: `useQuery` + supabase (mesmo padrão do `usePageAccess`).

```typescript
// src/hooks/useUserAccessibleCategories.ts
export function useUserAccessibleCategories() {
  const { user, isAdmin } = useAuth();
  return useQuery({
    queryKey: ['user-accessible-categories', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_page_access')
        .select('page_permission_id, page_permissions(category)')
        .eq('user_id', user!.id);
      return [...new Set(data?.map(d => d.page_permissions?.category).filter(Boolean))];
    },
    enabled: !!user && !isAdmin,
    staleTime: 5 * 60 * 1000,
  });
}
```

### Arquivo 1: `src/pages/equipe/DigitalAreaSelector.tsx`
- Importar o hook + adicionar campo `category` a cada card (`'rotina'`, `'dev'`)
- O card "Acessos" continua `adminOnly`
- Filtrar: admin vê tudo; demais veem apenas cards cuja `category` está na lista retornada pelo hook
- Mostrar skeleton/loading enquanto carrega

### Arquivo 2: `src/pages/equipe/projetos/ProjetosAreaSelector.tsx`
- Mesma lógica: adicionar `category` (`'fiscal'`, `'fixos'`) e filtrar pelos acessos do usuário

### Comportamento
- Admin → vê todos os cards (sem query)
- Usuário com acesso apenas a `dev` → vê só "Digital Dev"
- Se restar apenas 1 card, pode navegar direto (opcional, sem impacto crítico)
- Loading state com skeleton enquanto a query resolve

### Arquivos alterados
1. **Novo**: `src/hooks/useUserAccessibleCategories.ts`
2. **Editar**: `src/pages/equipe/DigitalAreaSelector.tsx`
3. **Editar**: `src/pages/equipe/projetos/ProjetosAreaSelector.tsx`

