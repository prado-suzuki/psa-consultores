// Baixar o modelo em branco de um tipo de documento.
//
// ATENÇÃO AO ARMAZENAMENTO: são dois, e é fácil pegar o errado.
//
//   - O modelo (este arquivo) vive no SUPABASE STORAGE, bucket `osg-modelos`,
//     privado, com leitura para qualquer usuário logado — inclusive o papel
//     `client`, porque o modelo é material genérico da PSA e não tem dado de
//     ninguém dentro.
//   - O documento que o CLIENTE ENVIA vive no GCS e sai por
//     `/api/v1/osg/documentos/sign-download`, no `psa-backend-api`, fora deste
//     repositório. Nada aqui toca nele.
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { ModeloDocumento } from '@/lib/solicitacao';

/**
 * Baixa o modelo SEM sair da página.
 *
 * POR QUE BAIXAR O CONTEÚDO, e não abrir uma URL assinada
 *
 * A primeira versão assinava e chamava `window.open`. Isso custava uma aba, e no
 * portal do cliente a aba é pior do que parece: quem está preenchendo o checklist
 * perde o lugar da lista, e no celular a aba nova vira uma janela separada que ele
 * precisa fechar para voltar.
 *
 * A alternativa óbvia — assinar com `{ download: nome }` e navegar para a URL —
 * funciona porque o Storage devolve `Content-Disposition: attachment`, mas o modo
 * de falha é ruim: se esse cabeçalho não vier (policy trocada, proxy no meio), o
 * navegador NAVEGA, e o cliente perde a página em vez de ver um erro. Como o link
 * é de outra origem, o atributo `download` da âncora é ignorado e não protege.
 *
 * Baixando o conteúdo, a âncora aponta para um `blob:` da própria origem: o
 * atributo `download` vale, o navegador nunca navega, e o nome do arquivo é o do
 * catálogo e não o UUID do caminho. É o mesmo padrão de `EquipeBiblioteca`. Os
 * modelos têm dezenas de KB, então segurar o conteúdo em memória não pesa.
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
        .download(modelo.path);

      if (error) throw error;
      if (!data) {
        throw new Error('O armazenamento não devolveu o conteúdo deste modelo.');
      }

      const url = URL.createObjectURL(data);
      const ancora = document.createElement('a');
      ancora.href = url;
      ancora.download = modelo.nome;
      document.body.appendChild(ancora);
      ancora.click();
      ancora.remove();
      // Revogar no mesmo tick é seguro: o clique já entregou o blob ao
      // gerenciador de downloads do navegador, que não depende mais da URL.
      URL.revokeObjectURL(url);
    },
    onError: (erro: unknown) =>
      toast({
        title: 'Não foi possível baixar o modelo',
        description: (erro as Error).message,
        variant: 'destructive',
      }),
  });
}
