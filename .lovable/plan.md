# EDU-25 · Gerar a lista de documentos no formato novo

Executar, sem alterar nada, a migration `supabase/migrations/20260804010000_gerar_solicitacao_os_v2.sql`.

## O que a migration faz

- Reescreve a rotina que monta a lista de documentos de uma ordem de serviço. Ela passa a achar (ou criar em rascunho) o cabeçalho do pedido do cliente e gravar uma linha por documento do produto na tabela nova de itens, em vez da tabela antiga de checklist.
- Some a multiplicação por entidade cadastrada (pessoa, bem, matrícula), que inflava a lista.
- Texto de exibição (documento, entidade, nota) fica em branco e é herdado do catálogo na leitura; granularidade, grupo e ordem são copiados por serem estruturais.
- Continua idempotente: só cria o que falta, nunca atualiza nem apaga, e não mexe em status nem na data de envio.
- Mesmo nome, mesmos parâmetros, mesmo retorno. Nenhuma tabela é alterada e a migration não grava dado nenhum.

## Passos

1. Executar essa migration, exatamente como está no repositório, e somente ela.
2. Regenerar `src/integrations/supabase/types.ts`.
3. Rodar o GATE de 4 consultas de leitura e devolver os resultados na íntegra, sem resumir, confirmando que o types.ts mantém a assinatura da função.

A função não será executada: ela grava.

## Fora de escopo

- Lib de grupos (EDU-26) e tela do cliente (EDU-27).
- Qualquer alteração de front.
- Remoção ou alteração de `get_checklist_solicitado_cliente`.

## Se falhar

Devolver a mensagem de erro completa e o diagnóstico, sem editar a migration e sem contornar.
