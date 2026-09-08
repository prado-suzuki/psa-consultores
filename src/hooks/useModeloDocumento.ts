// Baixar o modelo em branco de um tipo de documento.
//
// ATENÇÃO AO ARMAZENAMENTO: são dois, e é fácil pegar o errado.
//
//   - O modelo (este arquivo) vive no SUPABASE STORAGE, balde `osg-modelos`,
//     privado, com leitura para qualquer usuário logado — inclusive o papel
//     `client`, porque o modelo é material genérico da PSA e não tem dado de
//     ninguém dentro. O caminho é `createSignedUrl`, o mesmo do SOPViewerModal.
//   - O documento que o CLIENTE ENVIA vive no GCS e sai por
//     `/api/v1/osg/documentos/sign-download`, no `psa-backend-api`, fora deste
//     repositório. Nada aqui toca nele.
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { ModeloDocumento } from '@/lib/solicitacao';

/**
 * Validade da URL assinada.
 *
 * Sessenta segundos porque a URL é consumida no mesmo gesto que a pediu: ela
 * nasce, abre a aba e morre. Prazo longo transformaria o link num caminho de
 * acesso ao balde que sobrevive à sessão de quem clicou.
 */
const VALIDADE_SEGUNDOS = 60;

/**
 * Assina e abre o modelo em nova aba.
 *
 * O erro PROPAGA e vira toast: um download que falha calado deixa o cliente
 * achando que o arquivo não existe, e é justamente ele que está travado sem o
 * formulário. Se a policy do balde não alcançar o papel de quem clicou, é aqui
 * que isso aparece — e é o único ponto do card que pode falhar em silêncio para
 * um papel que não seja da equipe.
 */
export function useModeloDocumento() {
  return useMutation({
    mutationFn: async (modelo: ModeloDocumento): Promise<void> => {
      const { data, error } = await supabase.storage
        .from(modelo.bucket)
        .createSignedUrl(modelo.path, VALIDADE_SEGUNDOS);

      if (error) throw error;
      if (!data?.signedUrl) {
        throw new Error('O armazenamento não devolveu um link para este modelo.');
      }

      window.open(data.signedUrl, '_blank', 'noopener');
    },
    onError: (erro: unknown) =>
      toast({
        title: 'Não foi possível baixar o modelo',
        description: (erro as Error).message,
        variant: 'destructive',
      }),
  });
}
