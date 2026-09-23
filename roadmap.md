# Roadmap

- [x] Corrigir erros de build do preview: remover @ts-expect-error não usado (sync-cadastros, sync-perdcomp) e instalar unpdf@1.8.1. Build OK.
- [x] Republicar a edge function `notificar` (main `b26d2ce89`) e limpar os dois erros de tipo que o `deno check` do deploy acusava: linha de `destinatarios_cliente` sem tipo em `notificar` e `ReturnType<typeof createClient>` em `processar-procedimento`. `deno check` ok nas duas.

- [x] 11/09: restaurar src/integrations/supabase/types.ts da main (a regeneracao automatica contra producao derrubou tabelas ainda nao migradas) — typecheck e build OK
- [ ] 11/09: aplicar em producao as ~57 migrations pendentes (parado: falta o bloco de 01-02/09 do catalogo rural; aguardando confirmacao do Bernardo)
- [x] 23/09: aplicadas 17 das 23 (GES-01B 5, feed 4, outras 4, governanca 4 aditivas); types.ts regenerado; build OK
- [ ] 23/09: 20260915201913_capitulo_da_governanca_no_contrato_social — bloqueada: falta a migration da Frente C (flags governanca_por_orgaos etc.) na main
- [ ] 23/09: 5 migrations com DROP recusadas pela ferramenta (20260917143042, 20260917150005, 20260917212557, 20260918102900, 20260916180000) — humano roda no SQL editor
