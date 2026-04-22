

## Diagnóstico: cliente `alessandro.tavares@paiolmt.com.br` não consegue abrir chamado

### Causa raiz (combinação de 2 problemas)

**Problema 1 — Duplicidade na tabela `representante` quebra `.maybeSingle()`**

Existem **dois registros** de `representante` para o mesmo `user_id` deste usuário:

| id_representante | id_cliente | cliente nome | ambiente |
|---|---|---|---|
| `f53b7462…` | `581c809f…` | Paiol Comercial Agricola | **dev** |
| `6cfedcc9…` | `18cbce75…` | Paiol Comercial Agricola | **prod** |

Tanto `useClienteClusters` quanto `useCreateTicketCliente` resolvem o `id_cliente` com:
```ts
supabase.from('representante').select('id_cliente').eq('user_id', userId).maybeSingle()
```
`.maybeSingle()` **lança erro** quando retorna >1 linha (PGRST116 / "multiple rows returned"). Resultado: `useCreateTicketCliente.mutationFn` falha em produção neste usuário, o `toast` "Erro ao criar chamado" dispara e nenhum ticket é gravado (zero tickets registrados para `user_id=13582228…` confirmado em DB).

**Problema 2 — RLS de `representante` e `cliente_clusters` não cobre o papel `client`**

Mesmo se a duplicidade fosse resolvida, as políticas atuais bloqueiam usuários com role `client`:

- `representante` → SELECT só permite `admin/lider/sublider/team_member`.
- `cliente_clusters` → SELECT só permite `admin/lider/sublider/team_member`.

Para um cliente, ambas as queries retornam vazio silenciosamente (RLS denega sem erro). Hoje isso só não trava porque o cliente Paiol tem 1 cluster e o select de cluster não é obrigatório no submit; mas o `cliente_id` jamais seria resolvido — chamados ficariam órfãos (sem `cliente_id` nem `cluster_id`), quebrando notificação/roteamento.

### Plano de correção

**1. Limpeza de dados — remover duplicidade do representante (produção)**

A duplicidade é fruto de o sistema usar uma única instância de banco para `prod` e `dev` (memo `architecture/environment-isolation-strategy`). O mesmo usuário foi vinculado em representantes de dois clientes (mesma empresa) em ambientes diferentes. A query de `useClienteClusters` e `useCreateTicketCliente` **não filtra por `ambiente`**, então casa as duas linhas.

Correção em código (segura e definitiva): adicionar filtro de ambiente nas duas queries:

- `src/hooks/useClienteClusters.ts` — `representante` SELECT: adicionar `.eq('ambiente', currentAmbiente)` se a coluna `ambiente` existir nessa tabela; caso não exista, filtrar via JOIN com `cliente.ambiente=currentAmbiente` (resolver `id_cliente` apenas dentro do ambiente vigente). 
- `src/hooks/useCreateTicket.ts` (`useCreateTicketCliente`) — mesma alteração.

Verificar se `representante` possui coluna `ambiente`. Se não tiver, substituir o `.maybeSingle()` por: buscar todos os `id_cliente` de `representante` por `user_id`, e em seguida selecionar em `cliente` filtrando por `id IN (...)` + `ambiente = currentAmbiente` + `excluido = false`. Pegar o `cliente.id` resultante.

Adicionalmente, trocar `.maybeSingle()` por `.limit(1).maybeSingle()` após o filtro, para que futuras duplicidades nunca mais quebrem o fluxo do cliente.

**2. RLS — permitir que `client` leia o que precisa**

Migration adicionando políticas restritas:

- `public.representante` — SELECT: permitir quando `auth.uid() = user_id` (cliente lê apenas a própria linha de representante).
- `public.cliente_clusters` — SELECT: permitir quando `cliente_id IN (SELECT id_cliente FROM representante WHERE user_id = auth.uid())` (cliente lê apenas vínculos do seu próprio cliente).
- `public.estrutura_clusters` já permite `Authenticated users can read clusters` (`true`) — sem mudança.

Sem isso, o seletor de empresa do `NovoChamado` nunca aparecerá e `cluster_id` nunca será resolvido para clientes com 2+ empresas vinculadas.

**3. Tratamento de erro no formulário (defensivo)**

Em `src/pages/cliente/NovoChamado.tsx`, o `catch` atual mostra apenas mensagem genérica. Adicionar `console.error(error)` e exibir `error.message` no toast, para que falhas futuras sejam diagnosticáveis no console do cliente.

**4. Backfill (opcional, recomendado)**

Para os tickets antigos do usuário (zero hoje, então não há retrabalho aqui), nada a fazer. Mas convém auditar outros usuários `client` com `>1` linha em `representante`:
```sql
SELECT user_id, COUNT(*) FROM representante WHERE user_id IS NOT NULL GROUP BY user_id HAVING COUNT(*) > 1;
```
Resultado direcionará se é necessário script de saneamento.

### Arquivos a alterar

- `src/hooks/useClienteClusters.ts` — filtro por ambiente + tolerar duplicatas.
- `src/hooks/useCreateTicket.ts` — mesma alteração no `useCreateTicketCliente`.
- `src/pages/cliente/NovoChamado.tsx` — log de erro + toast com mensagem real.
- Nova migration SQL — políticas SELECT em `representante` e `cliente_clusters` para o próprio cliente.

### Resultado esperado

Após as alterações: o usuário `alessandro.tavares@paiolmt.com.br` consegue abrir chamados em produção; o `cliente_id` é corretamente resolvido (`18cbce75…` Paiol Comercial Agricola — prod); o `cluster_id` é populado quando aplicável; a duplicidade de `representante` deixa de quebrar o fluxo; novos clientes com múltiplas empresas verão o seletor de empresa funcionando.

