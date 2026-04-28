## Objetivo

Criar a sub-ferramenta **"Carga de chamados"** dentro de `/equipe/dev/gerenciar-dados`, com a descrição:
> "Utilize para criar o cadastro de usuários e importar o histórico de chamados do sistema legado."

Duas abas:
1. **Criar usuários** (ativa agora) — cria em lote os auth users dos representantes que ainda **não** possuem `user_id`.
2. **Importar histórico** (visível mas `disabled`, badge "Em breve").

A regra "nunca atualiza dados" significa: **não sobrescrever cadastros já existentes** (não recriar usuário para representante que já tem `user_id`, não alterar email/nome/cargo etc.). Os efeitos colaterais necessários para o fluxo funcionar **são permitidos**:
- gravar `representante.user_id` quando o usuário for criado/vinculado, e
- ligar `representante.acesso_chamados = true` para os representantes processados.

---

## Fluxo da aba "Criar usuários"

```text
[ Status do cliente: (•) Ativos  ( ) Inativos  ( ) Todos ]
[ x ] Disparar fluxo N8n (webhook de boas-vindas)

           [ Contabilizar representantes ]   -> abre modal

  -- após execução --
  Card resumo: "X criados · Y já existiam · Z falharam · W ainda pendentes"
```

### Modal "Representantes pendentes"
- Campo de busca por nome no topo.
- Lista virtualizada com: **Nome** · **Email** · **Cliente (nome)**.
- Contador "N representantes pendentes".
- Botão central inferior: **Criar usuários** — processa todos os itens da lista filtrada (não só os visíveis após busca; a busca é só visual).

### Filtro de pendentes
Query (em hook próprio):
- `representante` com `excluido = false`, `user_id IS NULL`, `email` não-vazio/válido,
- join `cliente!inner(id, nome, ativo, excluido)` com `cliente.excluido = false`,
- aplicar filtro de `cliente.ativo` conforme escolha (Ativos / Inativos / Todos).

A tabela `representante` **não tem** coluna `ambiente`; o filtro de ambiente entra via `cliente.ambiente = currentAmbiente` (cliente possui ambiente, ver memória Core).

### Efeitos por representante processado
Para cada representante da lista:
1. Chamar edge function `upsert-representante-user` (idempotente; já valida JWT e role admin/lider/sublider) com `{ email, first_name, last_name }`.
2. Receber `{ user_id, created }`.
3. **Atualizar `representante`** (única atualização permitida) com:
   - `user_id = <retornado>` (se ainda for null),
   - `acesso_chamados = true`.
   Usar `update().eq('id_representante', ...)` — sem delete+insert, preservando UUID. Se `user_id` já existir e `acesso_chamados` já for `true`, pular o update (não cadastrar usuário já cadastrado).
4. Disparar webhook N8n **apenas** se a checkbox estiver marcada **e** `created === true`.
5. Registrar via `useAuditLog`:
   - `area: 'digital'`, `entity_type: 'representante'`, `entity_id: id_representante`, `action: 'updated'`,
   - `changed_fields: { user_id: {from: null, to: <id>}, acesso_chamados: {from: false/null, to: true}, via: 'carga-chamados' }`.

A defesa em profundidade do trigger `tg_representante_block_disable_acesso_chamados` continua válida (só bloqueia transição `true → false`; aqui fazemos `null/false → true`, permitido).

---

## Estratégia anti-rajada para o webhook N8n

O workflow `Boas-Vindas - Novo Usuário (Refatorado)` é um Webhook → Code → IF → Gmail. Ele **não tem fila/throttle interno**, então um burst de 50–200 POSTs simultâneos pode:
- estourar o rate limit do Gmail API (HTTP 429 / "User rate limit exceeded"),
- saturar a execução do n8n (limites de execuções concorrentes da instância),
- e o atual `fire-and-forget` não detecta nem reenvia falhas.

Medidas adotadas no cliente (sem mexer no workflow n8n):

1. **Envio estritamente sequencial** dos webhooks (concorrência = 1). A criação dos usuários no Supabase pode ser sequencial também, ou em pequenos lotes (ex.: 3 paralelos), mas o **dispatch do webhook é serializado em uma fila própria**.
2. **Throttle / espaçamento mínimo** entre webhooks: ex. 500ms entre disparos (configurável; razoável para Gmail).
3. **Aguardar resposta** (não fire-and-forget) — nesse caso esperamos status HTTP < 500 com timeout (ex. 15s) usando `AbortController`.
4. **Retry com backoff exponencial**: até 3 tentativas (ex. 1s, 3s, 9s) para erros de rede, timeout, 429 e 5xx. 4xx (exceto 429) não é repetido.
5. **Falha por usuário não interrompe o lote**: se um webhook falhar após os retries, marca como "email falhou" no resumo final, mas o usuário no Supabase continua criado.
6. **Barra de progresso** na UI mostrando "Processando X de Y · Y enviados / Z falhas de email".
7. **Botão "Reenviar e-mails de boas-vindas das falhas"** ao final, para tentar novamente apenas os que falharam (sem recriar usuários).
8. **Lote máximo por execução**: cap de 200 representantes por clique (com aviso). Se houver mais, o usuário roda novamente — evita executions infinitas.
9. (Opcional/recomendado) **Acrescentar `Idempotency-Key`** no header do POST com o `user_id`, caso queiramos depois evoluir o n8n para deduplicar — não custa nada agora.

Resultado: mesmo com 100+ usuários, o n8n recebe 1 POST a cada ~500ms, com retry confiável.

---

## Detalhes técnicos

### Arquivos novos
- `src/components/equipe/dev/carga-chamados/CargaChamados.tsx` — `Tabs` ("Criar usuários" / "Importar histórico" disabled).
- `src/components/equipe/dev/carga-chamados/CriarUsuariosTab.tsx` — UI: filtros, checkbox N8n, botão Contabilizar, card de resumo, barra de progresso, botão de reenvio de falhas.
- `src/components/equipe/dev/carga-chamados/RepresentantesPendentesModal.tsx` — `Dialog` com busca, lista, botão "Criar usuários".
- `src/hooks/useRepresentantesSemUsuario.ts` — `useQuery` com filtro de status do cliente.
- `src/hooks/useCriarUsuariosRepresentantes.ts` — `useMutation` orquestrando: invoke da edge function (concorrência leve), update de `representante` (`user_id` + `acesso_chamados`), enfileiramento do webhook, auditoria. Expõe `progress` reativo.
- `src/lib/welcomeWebhookQueue.ts` — fila assíncrona, throttle (`MIN_INTERVAL_MS = 500`), retry com backoff, contagem de sucesso/falha; expõe `enqueue(payload)` e `flush()`.
- `src/lib/webhooks.ts` — extrai `N8N_WELCOME_WEBHOOK` (hoje duplicado em `useTeamMemberMutations.ts` e `useSaveClientTransaction.ts`).
- `src/lib/nameUtils.ts` — extrai `splitName` (hoje inline em `useSaveClientTransaction.ts`).

### Alterações
- `src/pages/equipe/dev/GerenciarDados.tsx` — incluir o card/seção `<CargaChamados />` (não toca no fluxo de import CSV existente).
- `src/hooks/useTeamMemberMutations.ts` e `src/hooks/useSaveClientTransaction.ts` — passar a importar `N8N_WELCOME_WEBHOOK` e `splitName` dos novos arquivos. Comportamento inalterado.

### Não tocados
- `supabase/functions/upsert-representante-user/index.ts` — sem mudanças.
- Schema do banco — sem migrations.
- Workflow n8n — sem mudanças (a robustez é toda no cliente).

### Acesso
- Página já protegida por `PageAccessGate` em `src/config/protectedPages.ts`.
- Edge function valida role admin/lider/sublider.
- Trigger `tg_representante_block_disable_acesso_chamados` continua ativo como defesa em profundidade.

---

## Resumo do comportamento garantido

- **Não recria** usuários para representantes que já têm `user_id` (esses nem aparecem no modal).
- **Cria** auth user via edge function idempotente, atribui role `client`.
- **Atualiza** `representante.user_id` e `representante.acesso_chamados = true` apenas para os processados.
- **N8n recebe disparos serializados, espaçados e com retry** — minimiza falha em rajada.
- **Resumo final** mostra criados, já existentes, falhas de criação, falhas de e-mail e pendentes restantes, com opção de reenvio só dos e-mails que falharam.
