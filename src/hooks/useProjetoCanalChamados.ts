import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Projeto de canal de chamados de um cliente — ou `null` quando ele não tem.
 *
 * Serve à borda da EDU-11: o trigger `delegar_chamado_gera_tarefa` cria a tarefa
 * no projeto de canal do cliente e, quando esse projeto não existe, grava
 * `RAISE WARNING` no log do servidor e deixa a delegação passar. Ninguém na tela
 * fica sabendo. Este hook é o que permite avisar.
 *
 * Duas decisões que não são estilo:
 *
 * - **O produto é resolvido pela marca `produto_segmento.is_canal_chamados`**, e
 *   nunca por código ou nome. Produção usa `01-CHA`, o banco de desenvolvimento
 *   ainda usa `CHA`, e amanhã pode mudar de novo — a coluna existe exatamente
 *   para o código não virar regra de negócio. O trigger casa pela mesma marca.
 * - **`maybeSingle()` e embutido `!inner`.** A ausência de projeto é o caso
 *   normal que a tela quer detectar, e `single()` estouraria nele. Sem o
 *   `!inner` o filtro da marca recairia só sobre o embutido, e a linha-pai
 *   voltaria mesmo sem ser de canal — o hook devolveria projeto errado.
 *
 * Se um cliente algum dia tiver DOIS projetos de canal, `maybeSingle()` acusa a
 * multiplicidade em vez de escolher em silêncio. É o comportamento desejado: o
 * trigger, nesse caso, usa o mais antigo e grava um aviso pedindo correção do
 * dado (ver `20260817184423_delegar_chamado_gera_tarefa.sql`).
 */
export function useProjetoCanalChamados(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: ['projeto-canal-chamados', clienteId],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('org_projects')
        .select('id, produto_segmento:produto_segmento!inner(is_canal_chamados)')
        .eq('external_client_id', clienteId!)
        .eq('produto_segmento.is_canal_chamados', true)
        .maybeSingle();

      // Erro propaga: devolver `null` aqui faria "sem projeto" e "não consegui
      // olhar" virarem a mesma coisa na tela.
      if (error) throw error;
      return data?.id ?? null;
    },
    enabled: !!clienteId,
  });
}
