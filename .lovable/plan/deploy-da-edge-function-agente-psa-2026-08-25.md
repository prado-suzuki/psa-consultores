# Deploy da edge function `agente-psa`

## Estado confirmado
- Os 6 arquivos já estão no repositório (sincronizados da main): `index.ts`, `acesso.ts`, `ai.ts`, `notificacoes.ts`, `prompt.ts`, `tipos.ts` — mais o import `../_shared/cors.ts`, que sobe junto no deploy.
- O endpoint `/functions/v1/agente-psa` responde **404** hoje (testado com OPTIONS e POST) — a função nunca foi publicada.
- A função valida JWT em código (`auth.getClaims`, retorna 401 sem token), usa CORS whitelist de `_shared/cors.ts` e escreve nas tabelas `agente_*` via service role — tudo já no código, nada a alterar.

## O que será feito
1. **Deploy** da função `agente-psa` com a ferramenta de deploy de edge functions (os 6 arquivos + `_shared/cors.ts` sobem juntos automaticamente).
2. **Verificação pós-deploy**:
   - OPTIONS e POST sem token devem deixar de responder 404 — esperado: preflight CORS ok e POST sem auth → `401 Não autenticado.` (prova de que a função está no ar e o guard de JWT funciona).
   - Checar os logs da função se algo inesperado aparecer.

## O que NÃO será feito
- Nenhuma alteração de código (front ou função).
- Nenhuma alteração em `supabase/config.toml`: `verify_jwt = false` já é o default das funções gerenciadas e a validação de JWT é feita no código — um bloco `[functions.agente-psa]` seria redundante.
- Nenhum secret novo: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `LOVABLE_API_KEY` (gateway de IA) são injetados automaticamente pela plataforma.
- Nenhuma migration — as tabelas `agente_*` já foram aplicadas na mensagem anterior.

## Detalhes técnicos
- Ferramenta: `supabase--deploy_edge_functions` com `["agente-psa"]`.
- Verificação: `curl` OPTIONS + POST sem bearer token contra `/functions/v1/agente-psa`; sucesso = deixou de ser 404 e responde 401 com a mensagem de não autenticado.
