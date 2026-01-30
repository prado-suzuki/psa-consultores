
# Plano: Correção do Sistema de Controle de Acessos

## Problemas Identificados

### 1. Verificação de Acesso Inexistente
O componente `TeamRoute` verifica apenas se o usuário é `team_member` ou `admin`, mas **não verifica se o usuário tem permissão específica para a página**. Isso significa que qualquer membro da equipe pode acessar qualquer página, tornando o sistema de permissões inútil.

**Situação do Bernardo:**
- Ele tem role `team_member` ✓
- Ele tem acesso a páginas dev (4 páginas) ✓
- Ele **NÃO tem** acesso à página `/equipe/dev/consulta-efd` ✗
- Mas ele consegue acessar porque `TeamRoute` não verifica isso

### 2. Botão "Atualizar Lista" Não Funciona
O botão apenas recarrega a lista de páginas do banco, mas não atualiza o cache de permissões do usuário nem força uma nova verificação de acesso.

### 3. Permissões Não São Verificadas nas Rotas
Quando um usuário tenta acessar uma página, o sistema não verifica se ele tem a permissão específica na tabela `user_page_access`.

## Solução Proposta

### Abordagem: Access Gate por Página

Criar um componente `DevPageAccessGate` que verifica permissões individuais para cada página da área Dev (e similar para Rotina).

```text
Fluxo Atual (INCORRETO):
┌──────────────┐     ┌────────────────┐     ┌──────────────┐
│    Usuário   │────▶│   TeamRoute    │────▶│    Página    │
│              │     │ (só verifica   │     │              │
│              │     │  team_member)  │     │              │
└──────────────┘     └────────────────┘     └──────────────┘

Fluxo Proposto (CORRETO):
┌──────────────┐     ┌────────────────┐     ┌──────────────────┐     ┌──────────────┐
│    Usuário   │────▶│   TeamRoute    │────▶│ DevPageAccessGate│────▶│    Página    │
│              │     │ (team_member)  │     │ (verifica acesso │     │              │
│              │     │                │     │  específico)      │     │              │
└──────────────┘     └────────────────┘     └──────────────────┘     └──────────────┘
```

## Mudanças Necessárias

### 1. Criar Hook `usePageAccess`

Novo arquivo: `src/hooks/usePageAccess.ts`

```typescript
// Hook para verificar se o usuário tem acesso a uma página específica
export function usePageAccess(pagePath: string) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  const { data: hasAccess, isLoading } = useQuery({
    queryKey: ['page-access', user?.id, pagePath],
    queryFn: async () => {
      if (!user) return false;
      if (isAdmin) return true; // Admins sempre têm acesso
      
      // Verificar se a página existe
      const { data: page } = await supabase
        .from('page_permissions')
        .select('id')
        .eq('page_path', pagePath)
        .single();
      
      if (!page) return true; // Página não cadastrada = acesso livre
      
      // Verificar se usuário tem acesso
      const { data: access } = await supabase
        .from('user_page_access')
        .select('id')
        .eq('user_id', user.id)
        .eq('page_permission_id', page.id)
        .maybeSingle();
      
      return !!access;
    },
    enabled: !!user && !authLoading,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  return { hasAccess, isLoading: authLoading || isLoading };
}
```

### 2. Criar Componente `PageAccessGate`

Novo arquivo: `src/components/auth/PageAccessGate.tsx`

```typescript
// Componente que verifica acesso à página e mostra tela de acesso negado se necessário
export const PageAccessGate = ({ 
  pagePath, 
  children 
}: { pagePath: string; children: React.ReactNode }) => {
  const { hasAccess, isLoading } = usePageAccess(pagePath);
  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!hasAccess) {
    return <AccessDeniedScreen onBack={() => navigate('/equipe/digital')} />;
  }

  return <>{children}</>;
};
```

### 3. Atualizar Rotas no App.tsx

Envolver as páginas da área Dev com verificação de acesso:

```tsx
// Antes:
<Route path="/equipe/dev/consulta-efd" element={<TeamRoute><ConsultaEFD /></TeamRoute>} />

// Depois:
<Route path="/equipe/dev/consulta-efd" element={
  <TeamRoute>
    <PageAccessGate pagePath="/equipe/dev/consulta-efd">
      <ConsultaEFD />
    </PageAccessGate>
  </TeamRoute>
} />
```

### 4. Melhorar o Botão "Atualizar Lista"

Modificar a função `handleRefreshPages` para também invalidar o cache de acessos:

```typescript
const handleRefreshPages = () => {
  // Invalida cache de páginas
  queryClient.invalidateQueries({ queryKey: ['page-permissions'] });
  // Invalida cache de acessos de usuários
  queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
  // Invalida cache de verificação de acesso por página
  queryClient.invalidateQueries({ queryKey: ['page-access'] });
  toast.success('Lista de páginas e permissões atualizada');
};
```

### 5. Conceder Acesso ao Bernardo

Após as correções, será necessário conceder manualmente o acesso à página EFD Contribuições para o Bernardo através da interface de Controle de Acessos.

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/hooks/usePageAccess.ts` | Criar (novo hook) |
| `src/components/auth/PageAccessGate.tsx` | Criar (novo componente) |
| `src/App.tsx` | Modificar (adicionar PageAccessGate nas rotas dev) |
| `src/pages/equipe/EquipeControleAcessos.tsx` | Modificar (melhorar invalidação de cache) |

## Comportamento Esperado Após Implementação

1. **Bernardo sem acesso**: Ao tentar acessar `/equipe/dev/consulta-efd`, verá tela de "Acesso Negado"
2. **Admin concede acesso**: Na tela de Controle de Acessos, clica em "Conceder" para EFD Contribuições
3. **Bernardo com acesso**: Consegue acessar a página normalmente
4. **Botão atualizar funciona**: Ao clicar, o cache é limpo e as novas permissões são refletidas

## Considerações de UX

- Tela de "Acesso Negado" deve ser informativa e ter botão para voltar
- Loading deve ser exibido durante verificação de permissões
- Toast de feedback ao conceder/revogar acesso deve ser claro
