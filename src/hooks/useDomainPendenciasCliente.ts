import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useApiAuth } from '@/hooks/useApiAuth';
import { currentAmbiente } from '@/config/api';
import { subirArquivoGcs, type DocCategoria, type DocRevisao } from '@/hooks/useDocumentoArquivo';

/**
 * A fase de CHECKLIST no portal do cliente: o que falta, de quem, e o anexo por
 * pendência.
 *
 * Duas RPCs, as duas de 13/08/2026:
 *
 *   get_pendencias_documentos_cliente  → uma linha por documento pedido × entidade
 *   anexar_documento_pendencia         → grava a linha do arquivo já classificada
 *
 * Por que o anexo é RPC e não o insert de sempre: a policy do portal valida
 * `fonte` e `cliente_id`, e nenhuma coluna de vínculo. Com o front passando dono e
 * tipo, sem validação o cliente poderia apontar para entidade de outro cliente ou
 * dar como recebido documento que ninguém pediu, e a tela do consultor (que é só
 * leitura) acreditaria. O tipo, por isso, NÃO é enviado: a RPC deriva do item.
 *
 * A fase de solicitação inicial continua em `useSolicitacaoAtivaCliente`
 * (4 gavetas). Ver docs/planos/checklist-por-subtracao.md.
 */

/** O alvo de uma pendência, no vocabulário da RPC. */
export interface AlvoPendencia {
  kind: 'pessoa' | 'bem' | 'matricula' | 'cliente';
  /** Nulo no grão `cliente`, que é o arquivo sem dono. */
  id: string | null;
  nome: string | null;
  /** Desambiguação secundária, hoje o número da matrícula. */
  detalhe: string | null;
}

export interface ArquivoDaPendencia {
  id: string;
  nome: string;
  /**
   * O veredito do consultor (migration 20260814180000). `recusado` é o único que
   * muda a conta: o arquivo continua aqui, com o `motivo`, mas a pendência volta a
   * faltar e o envio reabre.
   */
  revisao: DocRevisao;
  /** O que o consultor escreveu ao recusar. Nulo em qualquer outro estado. */
  motivo: string | null;
}

export interface PendenciaCliente {
  solicitacao_item_id: string;
  /** Nulo em item pedido à mão que não tem tipo: não fecha por arquivo. */
  documento_tipo_id: string | null;
  grupo: 'pf' | 'pj' | 'bens_imoveis' | 'outros';
  documento: string;
  nota: string | null;
  granularidade: string;
  alvo: AlvoPendencia;
  recebido: boolean;
  /** Recebido porque a PSA já tinha o arquivo, não porque o cliente enviou. */
  recebido_interno: boolean;
  arquivos: ArquivoDaPendencia[];
}

export interface PendenciasCliente {
  solicitacao: {
    id: string;
    status: string;
    enviada_em: string | null;
    encerrada_em: string | null;
  } | null;
  pendencias: PendenciaCliente[];
}

const VAZIO: PendenciasCliente = { solicitacao: null, pendencias: [] };

export const pendenciasClienteKey = (clienteId: string | null) =>
  ['pendencias-documentos-cliente', clienteId ?? '∅'] as const;

/**
 * As pendências do cliente logado.
 *
 * A RPC não recebe argumento: resolve o cliente por `auth.uid()` e é SECURITY
 * DEFINER, então o filtro por cliente mora dentro dela. O `clienteId` entra só na
 * chave de cache e no `enabled`.
 */
export function usePendenciasCliente(clienteId: string | null) {
  return useQuery({
    queryKey: pendenciasClienteKey(clienteId),
    enabled: !!clienteId,
    queryFn: async (): Promise<PendenciasCliente> => {
      // A RPC nova ainda não está no types.ts autogerado; o cast some na próxima
      // regeneração de tipos.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_pendencias_documentos_cliente');
      if (error) throw error;
      return (data ?? VAZIO) as PendenciasCliente;
    },
  });
}

export interface AnexarPendenciaArgs {
  clienteId: string;
  pendencia: PendenciaCliente;
  /** A categoria da gaveta do grupo, a mesma que monta o caminho no GCS. */
  categoria: DocCategoria;
  file: File;
}

/**
 * Anexa um arquivo a uma pendência: sobe o binário e grava a linha pela RPC.
 *
 * O binário sobe pelo mesmo caminho de sempre (sign-upload, PUT no GCS,
 * finalize); só a gravação da linha muda de insert para RPC. Uma falha depois do
 * PUT deixa objeto órfão no bucket, exatamente como no upload que já existia, e a
 * janela de soft-delete do balde é o que cobre isso.
 */
export function useAnexarPendencia() {
  const { fetchWithAuth } = useApiAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clienteId, pendencia, categoria, file }: AnexarPendenciaArgs) => {
      const gcs = await subirArquivoGcs(fetchWithAuth, { clienteId, file, categoria });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('anexar_documento_pendencia', {
        _solicitacao_item_id: pendencia.solicitacao_item_id,
        _alvo_kind: pendencia.alvo.kind,
        _alvo_id: pendencia.alvo.id,
        _categoria: categoria,
        _gcs_uri: gcs.gcs_uri,
        _checksum: gcs.checksum,
        _tamanho: gcs.tamanho,
        _mime: gcs.mime,
        _nome_original: file.name,
        _ambiente: gcs.ambiente ?? currentAmbiente,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_id, vars) => {
      queryClient.invalidateQueries({ queryKey: pendenciasClienteKey(vars.clienteId) });
      // A lista de arquivos do portal e o checklist do consultor leem daqui.
      queryClient.invalidateQueries({ queryKey: ['documento-arquivo', vars.clienteId] });
      toast({ title: 'Documento enviado' });
    },
    onError: (erro: unknown) => toast({
      title: 'Não foi possível enviar',
      description: (erro as Error).message,
      variant: 'destructive',
    }),
  });
}

/**
 * Remove um arquivo que o cliente enviou pela linha da pendência.
 *
 * É a mesma RPC da gaveta (`soft_delete_documento_cliente`, EDU-02), que desde a
 * migration 20260814180000 recusa arquivo já aprovado pela PSA. O hook próprio
 * existe pela invalidação: a tela do checklist lê da RPC de pendências, e a de
 * arquivos do portal lê da lista — sem invalidar as duas, o arquivo some de um
 * lado e continua do outro.
 */
export function useRemoverDocumentoPendencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentoId }: { clienteId: string; documentoId: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('soft_delete_documento_cliente', {
        _id: documentoId,
      });
      if (error) throw error;
    },
    onSuccess: (_vazio, vars) => {
      queryClient.invalidateQueries({ queryKey: pendenciasClienteKey(vars.clienteId) });
      queryClient.invalidateQueries({ queryKey: ['documento-arquivo', vars.clienteId] });
      toast({ title: 'Documento removido' });
    },
    onError: (erro: unknown) => toast({
      title: 'Não foi possível remover',
      description: (erro as Error).message,
      variant: 'destructive',
    }),
  });
}
