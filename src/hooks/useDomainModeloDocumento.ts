import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { ModeloDocumento } from '@/lib/modeloDocumento';

/**
 * Baixa o modelo em branco de um documento.
 *
 * O balde `osg-modelos` é privado, então o acesso sai por URL assinada — o mesmo
 * mecanismo do `SOPViewerModal`, mas com a chamada aqui dentro, e não no componente,
 * como manda a Regra Inegociável nº 1 do AGENTS.md.
 *
 * `download` na URL assinada faz o navegador SALVAR com o nome amigável em vez de
 * abrir o .xlsx numa aba, que é o que o cliente espera de um formulário para
 * preencher.
 *
 * Sem `useAuditLog` e sem `invalidateQueries`: isto é leitura, não muda nada no banco.
 */
export function useBaixarModelo() {
  return useMutation({
    mutationKey: ['modelo-documento', 'baixar'],
    mutationFn: async (modelo: ModeloDocumento) => {
      const { data, error } = await supabase.storage
        .from(modelo.bucket)
        .createSignedUrl(modelo.path, 3600, { download: modelo.nome });
      if (error) throw error;
      if (!data?.signedUrl) throw new Error('O modelo não está disponível agora.');
      return data.signedUrl;
    },
    onError: (erro: Error) =>
      toast.error('Não foi possível baixar o modelo: ' + erro.message),
  });
}
