import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';

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

/** Quantos são alcançáveis por canal. É o que habilita ou desabilita a caixa. */
export function alcanceDosCanais(destinatarios: readonly DestinatarioAviso[]) {
  return {
    email: destinatarios.filter((d) => d.email).length,
    whatsapp: destinatarios.filter((d) => d.telefone).length,
  };
}
