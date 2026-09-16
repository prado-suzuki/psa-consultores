# Roadmap

- [x] Corrigir erros de build do preview: remover @ts-expect-error não usado (sync-cadastros, sync-perdcomp) e instalar unpdf@1.8.1. Build OK.
- [x] Republicar a edge function `notificar` (main `b26d2ce89`) e limpar os dois erros de tipo que o `deno check` do deploy acusava: linha de `destinatarios_cliente` sem tipo em `notificar` e `ReturnType<typeof createClient>` em `processar-procedimento`. `deno check` ok nas duas.

- [x] 11/09: restaurar src/integrations/supabase/types.ts da main (a regeneracao automatica contra producao derrubou tabelas ainda nao migradas) — typecheck e build OK
- [ ] 11/09: aplicar em producao as ~57 migrations pendentes (parado: falta o bloco de 01-02/09 do catalogo rural; aguardando confirmacao do Bernardo)
