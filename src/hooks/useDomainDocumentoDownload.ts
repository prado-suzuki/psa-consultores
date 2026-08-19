import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';
import { LIMITE_LOGS_AUDITORIA } from '@/hooks/useDomainAuditLogs';
import type { JanelaAuditoria } from '@/lib/auditPeriodos';
import type { LinhaDownload } from '@/lib/documentoDownload';

/**
 * Prefixo da chave de consulta dos acessos a documento.
 *
 * Exportado porque `useBaixarDocumento` invalida por prefixo depois de registrar
 * o acesso: a aba de auditoria tem uma entrada de cache por janela de período, e
 * o download não sabe (nem deve saber) qual delas está aberta.
 */
export const DOWNLOADS_QUERY_KEY = 'documento-downloads';

/**
 * Os acessos a documento de um período, para a aba de Downloads da auditoria.
 *
 * A janela vem pronta de `janelaDoPeriodo`, em datas e não em instantes, pela
 * mesma razão do `useDomainAuditProdutividade`: a chave fica estável dentro do
 * dia em vez de trocar a cada render.
 *
 * Sem parâmetro de área, e não é esquecimento: `documento_download` não tem
 * coluna de área, e a política de leitura dela já recorta por cluster do cliente
 * (`cliente_visivel_para`). Quem consulta lê apenas os acessos dos clientes que
 * já enxerga, sem nenhum filtro adicional aqui.
 */
export function useDomainDocumentoDownloads(janela: JanelaAuditoria) {
  const { desde, ate } = janela;

  return useQuery({
    queryKey: [DOWNLOADS_QUERY_KEY, desde ?? 'inicio', ate ?? 'agora'],
    queryFn: async () => {
      let query = supabase
        .from('documento_download')
        .select(`
          id, documento_id, baixado_por, papel, acao, baixado_em,
          documento:documento_arquivo(nome_original, categoria),
          cliente:cliente(nome)
        `)
        // A própria tabela tem a coluna, copiada da linha do documento pela
        // função de gravação. Filtrar aqui, e não pelo embutido, mantém a linha
        // do acesso quando o documento é excluído depois: a política do
        // `documento_arquivo` esconde o embutido, e o embutido nulo não teria
        // ambiente para comparar. Sem este filtro a aba misturaria dev e prod.
        .eq('ambiente', currentAmbiente);

      if (desde) query = query.gte('baixado_em', `${desde}T00:00:00.000Z`);
      // Fim inclusivo: o dia escolhido entra inteiro.
      if (ate) query = query.lte('baixado_em', `${ate}T23:59:59.999Z`);

      const { data, error } = await query
        .order('baixado_em', { ascending: false })
        .limit(LIMITE_LOGS_AUDITORIA);

      if (error) throw error;
      return data as unknown as LinhaDownload[];
    },
  });
}
