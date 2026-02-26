

# Primeiro Acesso: Troca Obrigatoria de Senha com Barreira Global

## Objetivo
Garantir que usuarios criados pelo admin com senha provisoria sejam **obrigados** a trocar a senha antes de acessar qualquer parte do sistema -- mesmo que fechem a aba e voltem depois.

## Como funciona (visao geral)

1. Quando o admin cria um usuario, o sistema marca esse usuario com uma flag `must_change_password: true`.
2. Em **toda navegacao autenticada**, o sistema verifica essa flag. Se estiver ativa, o usuario e redirecionado para a tela de "Definir Nova Senha".
3. Nao ha como escapar: fechar a aba, recarregar a pagina ou acessar outra URL sempre traz o usuario de volta para a troca de senha.
4. Apos trocar a senha, a flag e removida e o usuario pode acessar o sistema normalmente.

## Detalhes Tecnicos

### 1. Edge Function `create-team-member/index.ts`
Adicionar `must_change_password: true` no `user_metadata` ao chamar `admin.createUser()`:
```text
user_metadata: {
  first_name,
  last_name,
  must_change_password: true   // <-- novo
}
```

### 2. AuthContext -- barreira global (ponto central da solucao)
Adicionar um novo campo `mustChangePassword` ao contexto de autenticacao (`src/contexts/AuthContext.tsx`):
- Derivado de `user?.user_metadata?.must_change_password === true`.
- Atualizado sempre que `user` muda (login, restauracao de sessao, refresh).
- Exposto via `useAuth()` para uso em qualquer componente.

### 3. Componentes de rota protegida -- redirecionamento automatico
Modificar os 3 guards existentes para incluir a verificacao:

- **`ProtectedRoute.tsx`**: Se `mustChangePassword` for `true`, redireciona para `/primeiro-acesso` em vez de renderizar o conteudo.
- **`TeamRoute.tsx`**: Mesma logica.
- **`AdminRoute.tsx`**: Mesma logica.
- **`GestaoAccessGate.tsx`**: Mesma logica.

Isso cobre **todas** as rotas autenticadas do sistema. Nao importa como o usuario chega (login, sessao restaurada, link direto) -- o guard sempre verificara a flag antes de permitir acesso.

### 4. Nova pagina `/primeiro-acesso` (`src/pages/PrimeiroAcesso.tsx`)
Tela dedicada e isolada para troca obrigatoria de senha:
- Formulario com "Nova senha" + "Confirmar senha" (minimo 8 caracteres).
- Sem navegacao para outras areas do sistema (sem header, sem sidebar, sem links).
- Ao submeter:
  1. Chama `supabase.auth.updateUser({ password, data: { must_change_password: false } })`.
  2. Faz `signOut()` e redireciona para a tela de login.
  3. Exibe mensagem de sucesso orientando o usuario a logar com a nova senha.
- Se o usuario nao tiver a flag ativa (acesso direto por URL), redireciona para a area principal.

### 5. Rota no `App.tsx`
Adicionar a rota publica (requer sessao mas nao passa pelo guard):
```text
<Route path="/primeiro-acesso" element={<PrimeiroAcesso />} />
```

### 6. Login pages -- redirecionamento imediato (complementar)
Adicionar verificacao apos login bem-sucedido em:
- **`EquipeAuth.tsx`**: Apos `signIn` com sucesso, verificar `session.user.user_metadata.must_change_password`. Se `true`, navegar para `/primeiro-acesso`.
- **`Auth.tsx`**: Mesma verificacao no `useEffect` que redireciona apos login.

Isso garante que o usuario va direto para a troca de senha sem piscar na tela principal.

### Resumo dos arquivos alterados

| Arquivo | Tipo | O que muda |
|---------|------|------------|
| `supabase/functions/create-team-member/index.ts` | Edicao | Adiciona flag `must_change_password` no metadata |
| `src/contexts/AuthContext.tsx` | Edicao | Expoe `mustChangePassword` no contexto |
| `src/components/auth/ProtectedRoute.tsx` | Edicao | Redireciona para `/primeiro-acesso` se flag ativa |
| `src/components/auth/TeamRoute.tsx` | Edicao | Idem |
| `src/components/auth/AdminRoute.tsx` | Edicao | Idem |
| `src/components/gestao/GestaoAccessGate.tsx` | Edicao | Idem |
| `src/pages/PrimeiroAcesso.tsx` | **Novo** | Tela de troca obrigatoria de senha |
| `src/App.tsx` | Edicao | Adiciona rota `/primeiro-acesso` |
| `src/pages/equipe/EquipeAuth.tsx` | Edicao | Redireciona imediato apos login |
| `src/pages/Auth.tsx` | Edicao | Redireciona imediato apos login |

### Fluxo de seguranca

```text
Usuario faz login com senha provisoria
        |
        v
  Login OK --> user_metadata.must_change_password == true?
        |                          |
       Nao                        Sim
        |                          |
        v                          v
  Acessa o sistema       Redireciona para /primeiro-acesso
                                   |
                          (fecha a aba e volta)
                                   |
                                   v
                          Sessao restaurada --> ProtectedRoute/TeamRoute/AdminRoute
                                   |
                                   v
                          must_change_password == true?
                                   |
                                  Sim --> /primeiro-acesso (sem escapatoria)
```
