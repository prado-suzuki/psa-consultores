import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl, currentAmbiente } from '@/config/api';
import type { Database } from '@/integrations/supabase/types';

export type DocumentoArquivoRow = Database['public']['Tables']['documento_arquivo']['Row'];
export type DocCategoria = Database['public']['Enums']['osg_doc_categoria'];

export interface VinculoDoc {
  bemId?: string | null;
  matriculaId?: string | null;
  pessoaId?: string | null;
}

const LIST_KEY = 'documento-arquivo';
const listKey = (clienteId: string, v: VinculoDoc) =>
  [LIST_KEY, clienteId, v.bemId ?? '∅', v.matriculaId ?? '∅', v.pessoaId ?? '∅'];

/** Lista os documentos ativos de um vínculo (bem | matrícula | pessoa) de um cliente. */
export function useDocumentosByVinculo(clienteId: string | null, v: VinculoDoc) {
  return useQuery({
    queryKey: clienteId ? listKey(clienteId, v) : [LIST_KEY, '∅'],
    enabled: !!clienteId && !!(v.bemId || v.matriculaId || v.pessoaId),
    queryFn: async (): Promise<DocumentoArquivoRow[]> => {
      let q = supabase
        .from('documento_arquivo')
        .select('*')
        .eq('cliente_id', clienteId!)
        .eq('excluido', false)
        .eq('status', 'ativo');
      if (v.bemId) q = q.eq('bem_id', v.bemId);
      if (v.matriculaId) q = q.eq('matricula_id', v.matriculaId);
      if (v.pessoaId) q = q.eq('pessoa_id', v.pessoaId);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocumentoArquivoRow[];
    },
  });
}

interface UploadArgs {
  clienteId: string;
  vinculo: VinculoDoc;
  categoria: DocCategoria;
  file: File;
}

/** Orquestra sign-upload → PUT direto no GCS → finalize → insert da linha no Supabase. */
export function useUploadDocumento() {
  const { fetchWithAuth } = useApiAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clienteId, vinculo, categoria, file }: UploadArgs): Promise<DocumentoArquivoRow> => {
      // 1) signed PUT URL
      const signRes = await fetchWithAuth(getApiUrl('/api/v1/osg/documentos/sign-upload'), {
        method: 'POST',
        body: JSON.stringify({ cliente_id: clienteId, filename: file.name, content_type: file.type }),
      });
      if (!signRes.ok) throw new Error('Falha ao solicitar URL de upload');
      const sign = (await signRes.json()) as {
        object_key: string; gcs_uri: string; signed_url: string; ambiente: string;
      };

      // 2) PUT direto no GCS (fetch puro, SEM Authorization)
      const put = await fetch(sign.signed_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!put.ok) throw new Error('Falha ao enviar o arquivo para o storage');

      // 3) finalize (confirma + captura tamanho/checksum)
      const finRes = await fetchWithAuth(getApiUrl('/api/v1/osg/documentos/finalize'), {
        method: 'POST',
        body: JSON.stringify({ object_key: sign.object_key }),
      });
      if (!finRes.ok) throw new Error('Falha ao finalizar o upload');
      const fin = (await finRes.json()) as { tamanho: number; checksum: string; content_type: string | null };

      // 4) grava a linha (RLS)
      const { data, error } = await supabase
        .from('documento_arquivo')
        .insert({
          cliente_id: clienteId,
          fonte: 'cliente',
          categoria,
          bem_id: vinculo.bemId ?? null,
          matricula_id: vinculo.matriculaId ?? null,
          pessoa_id: vinculo.pessoaId ?? null,
          nome_original: file.name,
          gcs_uri: sign.gcs_uri,
          checksum: fin.checksum,
          mime: fin.content_type ?? file.type ?? null,
          tamanho: fin.tamanho,
          status: 'ativo',
          ambiente: sign.ambiente ?? currentAmbiente,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as DocumentoArquivoRow;
    },
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: listKey(vars.clienteId, vars.vinculo) });
      toast({ title: 'Documento anexado' });
    },
    onError: (e: unknown) => {
      toast({ title: 'Erro ao anexar documento', description: (e as Error).message, variant: 'destructive' });
    },
  });
}

/** Soft-delete: marca excluido=true (o blob permanece no bucket versionado). */
export function useExcluirDocumento(clienteId: string, vinculo: VinculoDoc) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documento_arquivo').update({ excluido: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey(clienteId, vinculo) });
      toast({ title: 'Documento removido' });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro ao remover', description: (e as Error).message, variant: 'destructive' }),
  });
}

/** Pede a signed GET URL e abre o download em nova aba. */
export function useBaixarDocumento() {
  const { fetchWithAuth } = useApiAuth();
  return useMutation({
    mutationFn: async (row: DocumentoArquivoRow) => {
      if (!row.gcs_uri) throw new Error('Documento sem arquivo associado');
      const res = await fetchWithAuth(getApiUrl('/api/v1/osg/documentos/sign-download'), {
        method: 'POST',
        body: JSON.stringify({ gcs_uri: row.gcs_uri }),
      });
      if (!res.ok) throw new Error('Falha ao gerar link de download');
      const { signed_url } = (await res.json()) as { signed_url: string };
      window.open(signed_url, '_blank', 'noopener');
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro ao baixar', description: (e as Error).message, variant: 'destructive' }),
  });
}
