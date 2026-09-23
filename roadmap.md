# Roadmap

- [x] Corrigir erros de build do preview: remover @ts-expect-error não usado (sync-cadastros, sync-perdcomp) e instalar unpdf@1.8.1. Build OK.
- [x] Republicar a edge function `notificar` (main `b26d2ce89`) e limpar os dois erros de tipo que o `deno check` do deploy acusava: linha de `destinatarios_cliente` sem tipo em `notificar` e `ReturnType<typeof createClient>` em `processar-procedimento`. `deno check` ok nas duas.

- [x] 11/09: restaurar src/integrations/supabase/types.ts da main (a regeneracao automatica contra producao derrubou tabelas ainda nao migradas) — typecheck e build OK
- [x] 11/09: aplicar em producao as ~57 migrations pendentes (51 aplicadas apos o bloco rural)
- [x] 23/09: aplicadas 17 das 23 (GES-01B 5, feed 4, outras 4, governanca 4 aditivas); types.ts regenerado; build OK
- [x] 23/09: 20260923122543 + 20260915200947 (Frente C) + 20260915201913 (capitulo da governanca) aplicadas em ordem
- [x] 23/09: 5 migrations com DROP aplicadas (20260916180000, 20260917143042, 20260917150005, 20260917212557, 20260918102900); types.ts regenerado; typecheck OK
