/**
 * Guarda de deduplicação da ALE-1: "esse aviso já saiu para essa entidade por
 * esse canal, hoje?".
 *
 * A chave de dedup é (tipo, entidade_tipo, entidade_id, canal) — é exatamente
 * o índice `notificacao_envio_dedup_idx` criado em
 * `20260812120000_notificacao_base.sql`, comentado lá como "a consulta do
 * ALE-1 é esse aviso já saiu para essa entidade por esse canal?". NÃO filtra
 * por destinatário: o mesmo evento (ex.: chamado vencido) é um aviso só, não
 * um aviso por pessoa — o índice em si já deixa isso explícito.
 *
 * Padrão de uso:
 *
 *   import { jaEnviadoHoje } from "../_shared/jaEnviadoHoje.ts";
 *
 *   if (await jaEnviadoHoje(supabase, "chamado_vencido", "ticket", ticket.id, "email")) {
 *     // pular o envio
 *   }
 */

/**
 * Já existe uma linha de envio bem-sucedido, hoje, para essa
 * (tipo, entidade_tipo, entidade_id, canal)?
 *
 * A janela é o DIA CORRENTE EM UTC — mesmo corte que `check-ticket-deadlines`
 * já usa (`new Date().toISOString().split("T")[0]`) — e não o dia civil de
 * Brasília: é o ponto de corte mais simples de reproduzir sem depender do
 * fuso do servidor, ao custo de o dia virar às 21h em Brasília (UTC-3) em vez
 * da meia-noite local.
 *
 * Em caso de falha na consulta, loga e devolve `true` (falha fechada): o pior
 * caso vira pular o envio de hoje, e o `check-ticket-deadlines` reprocessa o
 * mesmo chamado amanhã, ainda vencido — atrasar um dia é mais barato que
 * mandar a mesma cobrança em dobro, que é o problema que esta guarda existe
 * para evitar.
 */
export async function jaEnviadoHoje(
  // `any` de propósito: mesmo padrão de getEmailForUser/getGestorRecipients em
  // notify-ticket/index.ts — o client de serviço já tipado forçaria importar
  // Database aqui só para um helper de leitura de uma tabela.
  supabase: any,
  tipo: string,
  entidadeTipo: string,
  entidadeId: string,
  canal: string
): Promise<boolean> {
  const inicioDoDiaUtc = `${new Date().toISOString().split("T")[0]}T00:00:00.000Z`;

  const { data, error } = await supabase
    .from("notificacao_envio")
    .select("id")
    .eq("tipo", tipo)
    .eq("entidade_tipo", entidadeTipo)
    .eq("entidade_id", entidadeId)
    .eq("canal", canal)
    .eq("sucesso", true)
    .gte("enviado_em", inicioDoDiaUtc)
    .limit(1);

  if (error) {
    console.error("[jaEnviadoHoje] Error checking dedup:", error);
    return true;
  }

  return (data?.length ?? 0) > 0;
}
