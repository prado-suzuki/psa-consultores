

## Plano: Editar e Excluir Usuarios no Controle de Acessos

### Problema Atual
Na aba "Usuarios" do Controle de Acessos, os usuarios existentes aparecem numa lista lateral somente para visualizacao e gestao de permissoes de pagina. Nao ha opcao para **editar dados** (nome, email, papeis) nem para **excluir** usuarios existentes.

### Solucao
Adicionar funcionalidades de edicao e exclusao diretamente na lista de usuarios, com dialogs de confirmacao.

---

### 1. Editar usuario existente

**Novo dialog de edicao** que aparece ao clicar em um botao "Editar" no card do usuario selecionado:
- Campos editaveis: Nome, Sobrenome, Email
- Checkboxes de papeis (Admin, Membro da Equipe, Cliente) -- igual ao formulario de criacao
- Ao salvar:
  - Atualiza `profiles` (first_name, last_name, email)
  - Sincroniza `user_roles`: remove roles que foram desmarcados, adiciona os marcados

**Logica de sincronizacao de roles**:
1. Buscar roles atuais do usuario
2. Calcular diff (roles a adicionar vs roles a remover)
3. DELETE dos removidos, INSERT dos adicionados

### 2. Excluir usuario

**Novo botao "Excluir"** no card do usuario selecionado, com dialog de confirmacao:
- Mensagem clara: "Tem certeza que deseja excluir o usuario X? Esta acao nao pode ser desfeita."
- Ao confirmar, chama uma **edge function** `delete-team-member` que:
  - Verifica que o solicitante e admin
  - Impede auto-exclusao (admin nao pode excluir a si mesmo)
  - Usa `supabaseAdmin.auth.admin.deleteUser(userId)` para remover o usuario do auth (cascadeia para `user_roles` e `profiles` via FK)

### 3. UI na lista de usuarios

Quando um usuario esta **selecionado**, mostrar botoes de acao no header do painel de permissoes:
- Botao "Editar" (icone Pencil) -- abre dialog de edicao
- Botao "Excluir" (icone Trash2, vermelho) -- abre dialog de confirmacao

---

### Detalhes Tecnicos

| Componente | Alteracao |
|---|---|
| `src/pages/equipe/EquipeControleAcessos.tsx` | Adicionar estados para edicao/exclusao; dialog de edicao com form; dialog de confirmacao de exclusao; mutations para update profile + sync roles + delete |
| `supabase/functions/delete-team-member/index.ts` | Nova edge function: verifica admin, impede auto-exclusao, deleta usuario via admin API |

#### Edge function `delete-team-member`
- Recebe `{ user_id: string }` no body
- Valida auth e role admin do solicitante
- Impede exclusao do proprio usuario
- Chama `supabaseAdmin.auth.admin.deleteUser(user_id)`
- Retorna sucesso/erro

#### Mutations no frontend

**Editar**: 2 operacoes em sequencia:
1. `supabase.from('profiles').update({ first_name, last_name, email }).eq('id', userId)`
2. Diff de roles: `delete` dos removidos + `insert` dos adicionados em `user_roles`

**Excluir**:
1. `supabase.functions.invoke('delete-team-member', { body: { user_id } })`
2. Invalidar queries e limpar selecao

### Resultado Esperado
- Admin pode editar nome, email e papeis de qualquer usuario existente
- Admin pode excluir usuarios (exceto a si mesmo)
- Dialogs de confirmacao previnem exclusoes acidentais
- Lista de usuarios atualiza automaticamente apos edicao/exclusao

