# Roadmap

- [x] Corrigir erros de build do preview: remover @ts-expect-error não usado (sync-cadastros, sync-perdcomp) e instalar unpdf@1.8.1. Build OK.
- [x] Republicar a edge function `notificar` (main `b26d2ce89`) e limpar os dois erros de tipo que o `deno check` do deploy acusava: linha de `destinatarios_cliente` sem tipo em `notificar` e `ReturnType<typeof createClient>` em `processar-procedimento`. `deno check` ok nas duas.
