import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import {
  envioDeHojePara, type CanalAviso, type DisparoHistorico,
} from '@/lib/historicoNotificacoes';

/**
 * Quem recebe aviso deste cliente, e por qual canal cada um é alcançável.
 *
 * É a MESMA fonte que a função de borda usa (`destinatarios_cliente`), de propósito:
 * a tela precisa mostrar o que vai acontecer, e mostrar isso a partir de outra
 * consulta abriria a porta para a tela prometer um envio que a borda não faz.
 *
 * A função devolve uma linha por representante COM acesso ao portal (`user_id` não
 * nulo). Medido em 14/08/2026: e-mail preenchido em 38 de 38 desses, telefone em 8
 * de 38 — por isso o WhatsApp é a exceção e não a regra, e a tela tem de dizer isso
 * antes do clique em vez de depois.
 */

export interface DestinatarioAviso {
  user_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
}

export const destinatariosClienteKey = (clienteId: string | null) =>
  ['destinatarios-cliente', clienteId] as const;

export function useDestinatariosCliente(clienteId: string | null) {
  return useQuery<DestinatarioAviso[]>({
    queryKey: destinatariosClienteKey(clienteId),
    enabled: Boolean(clienteId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('destinatarios_cliente', {
        _cliente_id: clienteId as string,
      });
      if (error) throw error;

      return (data ?? []).map((d) => ({
        user_id: d.user_id,
        nome: d.nome ?? '',
        // Espaço em branco conta como ausente: é o mesmo critério da borda, que
        // faz `trim()` antes de decidir se o destinatário é alcançável.
        email: d.email?.trim() || null,
        telefone: d.telefone?.trim() || null,
      }));
    },
  });
}

/**
 * Quantos são alcançáveis por canal. É o que habilita ou desabilita a caixa.
 *
 * Desde que o analista escolhe destinatário (10/09/2026), quem chama passa a
 * lista SELECIONADA e não a lista inteira: com o único selecionado sem telefone,
 * o WhatsApp tem de aparecer desligado mesmo havendo outro representante com
 * telefone cadastrado que ficou de fora do envio.
 */
export function alcanceDosCanais(destinatarios: readonly DestinatarioAviso[]) {
  return {
    email: destinatarios.filter((d) => d.email).length,
    whatsapp: destinatarios.filter((d) => d.telefone).length,
  };
}

/**
 * O contato desta pessoa no canal — o mesmo valor que a borda grava como `destino`.
 *
 * Espelha o `destinoDoCanal` da função `notificar`. São duas cópias de propósito
 * (uma no navegador, outra no Deno) e a regra é trivial; o que não pode divergir
 * é qual campo alimenta qual canal, e é isso que os dois nomes iguais protegem.
 */
export function contatoNoCanal(
  d: DestinatarioAviso, canal: CanalAviso,
): string | null {
  return canal === 'email' ? d.email : d.telefone;
}

/** O que já saiu hoje para esta pessoa, por canal. Vazio = ela ainda pode receber. */
export function jaRecebeuHoje(
  d: DestinatarioAviso, jaHoje: DisparoHistorico | null,
): Partial<Record<CanalAviso, string>> {
  return {
    email: envioDeHojePara(jaHoje, 'email', d.email),
    whatsapp: envioDeHojePara(jaHoje, 'whatsapp', d.telefone),
  };
}

/**
 * Um representante ainda alcançável neste envio.
 *
 * "Alcançável" é ter contato E não ter recebido hoje por ele. As duas condições
 * juntas porque a borda recusa as duas pelo mesmo motivo prático — não sai
 * mensagem —, e separá-las na tela faria o analista marcar alguém para depois
 * descobrir que ele não entrou no disparo.
 *
 * Mora aqui, junto do resto do vocabulário de destinatário, e não no componente:
 * o modal precisa dela para semear a seleção antes de desenhar qualquer lista.
 */
export function podeReceberAgora(
  d: DestinatarioAviso, jaHoje: DisparoHistorico | null,
): boolean {
  const enviados = jaRecebeuHoje(d, jaHoje);
  return Boolean((d.email && !enviados.email) || (d.telefone && !enviados.whatsapp));
}
