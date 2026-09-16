-- 20260915001408_liberar_reserva_de_envio_que_falhou.sql
-- Avisos no Google Chat: envio que falha nao pode queimar o aviso.
--
-- DEFEITO ACHADO NO PRIMEIRO ENVIO DE VERDADE, em 14/09/2026. O Google Chat
-- limita webhook a cerca de UMA mensagem por segundo por espaco, a borda disparou
-- onze seguidas, e a ultima voltou 429 (RESOURCE_EXHAUSTED).
--
-- O 429 em si e o de menos -- ele se resolve com pausa e nova tentativa, do lado
-- da borda. O problema e o que sobrava depois dele:
--
--   1. a reserva ja estava gravada, com a chave de idempotencia;
--   2. `confirmar_envio` marcava `falhou`, mas a linha (e a chave) ficavam;
--   3. `avisos_para_o_chat` filtra por EXISTENCIA da chave, sem olhar status;
--   4. logo a tarefa nunca mais era oferecida, e o aviso sumia em silencio.
--
-- Uma oscilacao de rede de dois segundos apagaria um aviso para sempre. E nao da
-- para "ignorar as falhadas" no filtro: a chave e UNICA e o `reservar_envio` faz
-- ON CONFLICT DO NOTHING, entao a linha velha negaria a reserva nova de qualquer
-- jeito.
--
-- A SAIDA E ANULAR A CHAVE, e ela existe porque o indice
-- `notificacao_envio_idem_uidx` e PARCIAL (`where chave_idempotencia is not
-- null`, ver 20260814180000). Sem chave, a linha sai do indice e o lugar fica
-- livre para a proxima tentativa -- e a linha CONTINUA la, com status `falhou` e
-- o erro escrito, que e o rastro que o desenho de reservar-antes-de-enviar existe
-- para preservar.
--
-- Apagar a linha resolveria o bloqueio e destruiria exatamente essa evidencia.
-- Por isso: anula a chave, mantem o corpo.
--
-- SO A PARTIR DE `pendente`, pela mesma razao do `confirmar_envio`: uma
-- confirmacao atrasada nao pode rebaixar uma mensagem que ja consta como enviada.
--
-- Reversao: DROP FUNCTION IF EXISTS public.liberar_reserva_falha(uuid, text).

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
     AND e.status = 'pendente';
$function$;

COMMENT ON FUNCTION public.liberar_reserva_falha IS
  'Fecha como `falhou` a reserva de um envio que nao saiu, E ANULA a chave de '
  'idempotencia para que a proxima passada possa tentar de novo. A linha fica, '
  'com o erro escrito: o indice de idempotencia e parcial, entao chave nula sai '
  'do indice sem apagar o rastro. Use no lugar de confirmar_envio(falhou) quando '
  'a falha for de ENVIO e a nova tentativa for desejavel.';
