## Diagnóstico

Investiguei o fluxo de login do cliente e encontrei **um bug de roteamento + uma causa operacional** que explica os relatos.

### O que está OK (não é o problema)

- `ProtectedRoute` (usado em `/cliente`, `/cliente/chamados`, etc.) só exige usuário logado. **Não bloqueia por role nem por `acesso_chamados`** — qualquer usuário autenticado entra.
- Os 12 representantes que já têm `user_id` vinculado **possuem a role `client`** corretamente em `user_roles` (verificado no banco). A role é concedida pelo trigger `handle_new_user` em todo signup e também explicitamente pela edge function `upsert-representante-user`.
- A área `/cliente` (ClienteDashboard) não tem gate adicional.

### Causa #1 — Bug no Header (desktop)

No `src/components/Header.tsx` (linha 99–104), o botão **"Área do Cliente" do desktop aponta para `/ajuda`**, não para `/auth`:

```tsx
<Link to="/ajuda" className="...">Área do Cliente</Link>
```

No menu mobile (linha 156–162) o link está correto (`/auth`).

A página `/ajuda` *também* tem um formulário de login e redireciona para `/cliente` ao autenticar, então funcionalmente "funciona" — mas:
- O cliente vê uma página de FAQ com formulário no meio, não a tela de login esperada.
- Quem chega pelo footer/mobile vê uma tela; quem chega pelo header desktop vê outra. Inconsistência reforça percepção de "não consigo entrar".
- A página `/ajuda` **não trata `must_change_password`** no `useEffect` de redirect (só `/auth` e `EquipeAuth` tratam). Para representantes recém-criados pelo backfill, isso ainda funciona porque o `ProtectedRoute` em `/cliente` redireciona para `/primeiro-acesso`, então não é bloqueante — mas vale unificar.

### Causa #2 — Operacional (provavelmente o real motivo dos relatos)

Dos 49 representantes ativos, apenas **12 têm `user_id`** (auth user criado). Os representantes vinculados foram provisionados com **senha fixa `'trocarsenha'`** e flag `must_change_password=true`. Se eles não foram comunicados dessa senha inicial, vão tentar logar com qualquer senha e receber "Email ou senha incorretos" — interpretando como "não consigo entrar na área de chamados".

Os 37 representantes restantes **não têm auth user** ainda (provavelmente sem email cadastrado, ou cadastrados antes do mecanismo de upsert). Esses simplesmente não conseguem logar de forma alguma.

## Plano de correção

### 1. Corrigir link do Header (bug de roteamento)

**Arquivo**: `src/components/Header.tsx`

- Linha 100: trocar `to="/ajuda"` por `to="/auth"` no botão "Área do Cliente" do desktop, alinhando com o mobile.
- Resultado: ambos os caminhos levam à tela de login dedicada, consistente com o restante do sistema.

### 2. Tratar `must_change_password` em `/ajuda`

**Arquivo**: `src/pages/Ajuda.tsx` (linhas 59–63)

- No `useEffect` de redirect pós-login, antes de `navigate("/cliente")`, checar `user.user_metadata?.must_change_password === true` e redirecionar para `/primeiro-acesso`.
- Mesmo comportamento já presente em `/auth` e `EquipeAuth`. Garante que clientes que entrarem pela `/ajuda` (caso o link continue sendo divulgado em algum lugar) sigam o fluxo de troca de senha sem ficarem em loop visual.

### 3. Diagnóstico para o time operacional (não-código)

Após a correção, fornecer a lista dos representantes que precisam de ação:

- **12 com auth user**: confirmar com cada um se receberam a senha inicial `trocarsenha`. Posso gerar uma listagem com `email`, `nome`, `acesso_chamados` e `last_sign_in_at` (via consulta assistida) para o time enviar comunicação.
- **37 sem auth user**: revisar se têm email cadastrado e marcar `acesso_chamados=true` para disparar o provisionamento via `upsert-representante-user` no próximo save do cliente. Posso listar quais representantes estão nesse estado.

## Fora de escopo

- Unificar `/ajuda` e `/auth` em uma única tela (refactor maior; não bloqueia o problema atual).
- Mudar a regra de provisionamento automático (já foi decidido na conversa anterior: role `client` independente de `acesso_chamados`).
- Email automático de boas-vindas com a senha inicial (decidido como fora de escopo no plano anterior).
