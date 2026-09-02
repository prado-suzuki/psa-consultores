/**
 * A proposta comercial anexada ao cadastro do cliente (ALE-8).
 *
 * NÃO existe superfície nova de armazenamento. A proposta é uma linha de
 * `documento_arquivo` com categoria própria, `fonte = 'psa'` e as TRÊS colunas de
 * dono nulas — ela pertence ao cliente inteiro, não a um bem, matrícula ou
 * pessoa. É a constraint `documento_arquivo_um_dono_apenas` que permite isso: ela
 * recusa mais de um dono, e nenhum dono é caso válido de propósito.
 *
 * `fonte = 'psa'` é o que mantém a proposta FORA do portal do cliente: a policy
 * "cliente can view own documento_arquivo" exige `fonte = 'cliente'`. Gravar
 * 'cliente' aqui publicaria a proposta para quem ela precifica.
 *
 * Este módulo COMPÕE os hooks públicos de `useDocumentoArquivo` e não o edita: o
 * arquivo tem 825 linhas e o núcleo de upload (`enviarUmDocumento`) é privado do
 * módulo. Compor pelo hook público é justamente o que evita exportá-lo.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORIA_PROPOSTA } from '@/components/equipe/osg/documentos/docMeta';
import {
  useUploadDocumento,
  type DocumentoArquivoRow,
} from '@/hooks/useDocumentoArquivo';

/**
 * Chave da lista de propostas de um cliente.
 *
 * Começa com o MESMO prefixo `['documento-arquivo', clienteId]` das listas de
 * `useDocumentoArquivo`. Não é estética: `useUploadDocumento` e
 * `useExcluirDocumento` invalidam por esse prefixo, então esta lista herda a
 * invalidação dos dois sem uma linha de código a mais — e o explorador de
 * arquivos, que usa a lista central, também se atualiza quando uma proposta
 * entra ou sai.
 */
const propostaListKey = (clienteId: string) => ['documento-arquivo', clienteId, '__proposta__'];

/**
 * As propostas comerciais ativas de um cliente, da mais nova para a mais antiga.
 *
 * Os quatro filtros acompanham `useDocumentosByCliente`: cliente, não excluído,
 * status ativo — e a categoria, que é o que separa esta lista da geral.
 *
 * NÃO filtra `ambiente`, e isso é deliberado: nenhuma das leituras de
 * `documento_arquivo` filtra, e a gravação resolve o ambiente no backend.
 * Divergir aqui deixaria esta aba mostrando coisa diferente da tela irmã. A
 * lacuna fica registrada, não corrigida — consertá-la é tarefa própria, não
 * trabalho de carona nesta.
 */
export function usePropostasDoCliente(clienteId: string | null) {
  return useQuery({
    queryKey: clienteId ? propostaListKey(clienteId) : ['documento-arquivo', '∅'],
    enabled: !!clienteId,
    queryFn: async (): Promise<DocumentoArquivoRow[]> => {
      const { data, error } = await supabase
        .from('documento_arquivo')
        .select('*')
        .eq('cliente_id', clienteId!)
        .eq('excluido', false)
        .eq('status', 'ativo')
        .eq('categoria', CATEGORIA_PROPOSTA)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocumentoArquivoRow[];
    },
  });
}

/**
 * Anexa uma proposta comercial ao cadastro do cliente.
 *
 * Reusa `useUploadDocumento` inteiro — sign-upload → PUT no GCS → finalize →
 * insert — passando vínculo vazio, a categoria da proposta e a origem da casa. O
 * formato tem precedente exato em `useUploadDocumentoCliente`, que faz o mesmo
 * com `fonte: 'cliente'`.
 *
 * `silencioso: true` suprime os avisos genéricos do hook de baixo ("Documento
 * anexado") para não sair aviso em dobro; em troca, os toasts desta mutação são
 * de responsabilidade daqui.
 */
export function useAnexarProposta(clienteId: string) {
  const upload = useUploadDocumento();
  const { logAction } = useAuditLog();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File): Promise<DocumentoArquivoRow> => {
      const linha = await upload.mutateAsync({
        clienteId,
        vinculo: {},
        categoria: CATEGORIA_PROPOSTA,
        file,
        fonte: 'psa',
        silencioso: true,
      });

      // A PROPOSTA NASCE TRIADA, e isto não é detalhe: `triado_em` significa
      // exatamente "alguém decidiu que este arquivo não é de nenhuma entidade e
      // sim do cliente como um todo" — que é a proposta por definição.
      //
      // Sem a marca ela cairia no balde do modo Classificar, porque `semDono`
      // (src/lib/classificarBalde.ts) é "sem os três donos E sem triagem": o
      // consultor receberia a proposta na fila pedindo para vinculá-la a uma
      // pessoa ou matrícula. Marcar aqui corrige na origem e vale para todos os
      // consumidores de uma vez (o balde, o contador de "sem dono" da tela de
      // Cadastro por Documento), em vez de ensinar cada um a conhecer a
      // categoria. A constraint `documento_arquivo_um_dono_apenas` aceita a marca
      // justamente porque não há dono.
      //
      // Erro aqui não derruba a mutação, no mesmo espírito do registro de
      // download: o arquivo já está anexado, e acionar o onError faria a pessoa
      // reenviar e duplicar. Vai ao console porque é o único aviso.
      const { error: erroTriagem } = await supabase
        .from('documento_arquivo')
        .update({ triado_em: new Date().toISOString(), triado_por: user?.id ?? null })
        .eq('id', linha.id);
      if (erroTriagem) console.error('Falha ao marcar a proposta como triada', erroTriagem);

      // Auditoria depois do arquivo já gravado, e engolindo erro: o binário está
      // no storage e a linha no banco, então falha de registro não pode derrubar
      // um anexo que funcionou. `logAction` já engole erro por dentro; a guarda
      // aqui vale mesmo que ele mude.
      try {
        await logAction({
          area: 'cadastros',
          entity_type: 'documento_arquivo',
          entity_id: linha.id,
          entity_name: linha.nome_original,
          action: 'created',
          details: 'Proposta comercial anexada ao cadastro do cliente',
        });
      } catch {
        // silêncio proposital: auditoria é registro, não caminho crítico
      }

      return linha;
    },
    onSuccess: () => toast({ title: 'Proposta anexada' }),
    onError: (e: unknown) =>
      toast({
        title: 'Erro ao anexar a proposta',
        description: (e as Error).message,
        variant: 'destructive',
      }),
  });
}
