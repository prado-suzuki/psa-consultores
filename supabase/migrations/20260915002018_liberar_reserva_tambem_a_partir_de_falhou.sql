-- 20260915002018_liberar_reserva_tambem_a_partir_de_falhou.sql
-- `liberar_reserva_falha` tambem age sobre linha JA fechada como `falhou`.
--
-- DEFEITO ACHADO AO PROVAR A CORRECAO ANTERIOR, minutos depois dela, em
-- 14/09/2026. A versao da 20260915001408 so agia a partir de `pendente`, copiando
-- o guard do `confirmar_envio`. Mas os dois guards protegem coisas diferentes:
--
--   `confirmar_envio` nao pode REBAIXAR uma mensagem ja entregue quando chega um
--   webhook atrasado da Meta. Dai o guard.
--
--   Aqui o que se faz e LIBERAR A CHAVE de algo que nao chegou a sair. Uma linha
--   `falhou` tambem nao saiu -- e e exatamente ela que fica bloqueando a tarefa
--   para sempre, porque `avisos_para_o_chat` filtra por existencia de chave.
--
-- O caso apareceu sozinho: a linha do 429 de hoje foi fechada como `falhou` pelo
-- codigo antigo, e a funcao nova nao teve efeito nenhum sobre ela. Se a condicao
-- continuasse so em `pendente`, toda linha fechada por uma versao anterior --
-- ou por qualquer caminho que marque `falhou` antes de liberar -- viraria um
-- bloqueio permanente, que e o defeito que a 20260915001408 existe para matar.
--
-- O QUE CONTINUA PROTEGIDO: `enviado`, `entregue` e `lido`. Esses SAIRAM, e
-- liberar a chave deles ofereceria a tarefa de novo, publicando a mesma coisa
-- duas vezes no espaco. A condicao e por isso uma lista explicita dos dois
-- estados de "nao saiu", e nao um `!= 'enviado'`: estado novo no enum nasce de
-- fora da lista, que e o lado seguro.
--
-- MIGRATION NOVA E NAO EDICAO DA 20260915001408: aquela ja esta registrada no
-- ledger do sandbox, e editar o arquivo faria repositorio e registro contarem
-- historias diferentes.
--
-- Reversao: reaplicar o corpo da 20260915001408.

CREATE OR REPLACE FUNCTION public.liberar_reserva_falha(
  _id   uuid,
  _erro text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.notificacao_envio e
     SET status             = 'falhou',
         sucesso            = false,
         erro               = coalesce(_erro, e.erro),
         chave_idempotencia = NULL
   WHERE e.id = _id
     AND e.status IN ('pendente', 'falhou');
$function$;

COMMENT ON FUNCTION public.liberar_reserva_falha IS
  'Fecha como `falhou` a reserva de um envio que nao saiu, E ANULA a chave de '
  'idempotencia para que a proxima passada possa tentar de novo. Age a partir de '
  '`pendente` E de `falhou` -- as duas significam que a mensagem nao saiu, e e a '
  'linha falhada que bloqueia a tarefa. Nunca a partir de enviado/entregue/lido, '
  'que sairam: liberar a chave deles publicaria a mesma coisa duas vezes. A linha '
  'fica, com o erro escrito: o indice de idempotencia e parcial, entao chave nula '
  'sai do indice sem apagar o rastro.';
