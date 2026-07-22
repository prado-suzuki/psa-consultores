import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl, currentAmbiente } from '@/config/api';
import type { Database } from '@/integrations/supabase/types';

export type DocumentoArquivoRow = Database['public']['Tables']['documento_arquivo']['Row'];
export type DocCategoria = Database['public']['Enums']['osg_doc_categoria'];
export type DocFonte = Database['public']['Enums']['osg_doc_fonte'];

export interface VinculoDoc {
  bemId?: string | null;
  matriculaId?: string | null;
  pessoaId?: string | null;
}

const LIST_KEY = 'documento-arquivo';
const listKey = (clienteId: string, v: VinculoDoc) =>
  [LIST_KEY, clienteId, v.bemId ?? '∅', v.matriculaId ?? '∅', v.pessoaId ?? '∅'];
// Lista central (todos os documentos do cliente). Compartilha o prefixo
// [LIST_KEY, clienteId] com as listas por vínculo, então uma invalidação por
// prefixo atualiza ambas de uma vez.
const clienteListKey = (clienteId: string) => [LIST_KEY, clienteId, '__all__'];

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

/** Lista todos os documentos ativos de um cliente, sem filtrar por vínculo. */
export function useDocumentosByCliente(clienteId: string | null) {
  return useQuery({
    queryKey: clienteId ? clienteListKey(clienteId) : [LIST_KEY, '∅'],
    enabled: !!clienteId,
    queryFn: async (): Promise<DocumentoArquivoRow[]> => {
      const { data, error } = await supabase
        .from('documento_arquivo')
        .select('*')
        .eq('cliente_id', clienteId!)
        .eq('excluido', false)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false });
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
  nrMatricula?: string | null;
  /** Origem do arquivo; default 'cliente' (recebido). 'psa' = produzido internamente. */
  fonte?: DocFonte;
  /** Suprime os toasts por-arquivo (usado no upload em massa, que mostra um resumo). */
  silencioso?: boolean;
}

interface SignUploadPayload {
  cliente_id: string;
  filename: string;
  content_type: string;
  categoria: DocCategoria;
  matricula_id?: string;
  nr_matricula?: string;
}

interface SignUploadResponse {
  object_key: string;
  gcs_uri: string;
  signed_url: string;
  ambiente: string;
  id_georef: string | null;
  upload_headers: Record<string, string>;
}

type FetchWithAuth = ReturnType<typeof useApiAuth>['fetchWithAuth'];

/**
 * Núcleo do upload de 1 documento: sign-upload → PUT no GCS → finalize → insert.
 * Isolado (recebe fetchWithAuth) para ser reusado pelo upload em massa e para,
 * no futuro, ceder lugar a endpoints em lote (sign/finalize/insert de N itens)
 * sem afetar a UI — só o orquestrador muda.
 */
async function enviarUmDocumento(fetchWithAuth: FetchWithAuth, args: UploadArgs): Promise<DocumentoArquivoRow> {
  const { clienteId, vinculo, categoria, file, nrMatricula, fonte = 'cliente' } = args;
  const isGeorreferenciamento = categoria === 'georreferenciamento';
  const numeroMatricula = nrMatricula?.trim() || null;
  if (isGeorreferenciamento && !vinculo.matriculaId) {
    throw new Error('Documentos de georreferenciamento devem estar vinculados a uma matrícula.');
  }
  if (isGeorreferenciamento && !numeroMatricula) {
    throw new Error('Não foi possível identificar o número da matrícula selecionada.');
  }

  const signPayload: SignUploadPayload = {
    cliente_id: clienteId,
    filename: file.name,
    content_type: file.type,
    categoria,
  };
  if (isGeorreferenciamento) {
    signPayload.matricula_id = vinculo.matriculaId!;
    signPayload.nr_matricula = numeroMatricula!;
  }

  // 1) signed PUT URL — categoria compõe a raiz da chave no GCS
  const signRes = await fetchWithAuth(getApiUrl('/api/v1/osg/documentos/sign-upload'), {
    method: 'POST',
    body: JSON.stringify(signPayload),
  });
  if (!signRes.ok) throw new Error('Falha ao solicitar URL de upload');
  const sign = (await signRes.json()) as SignUploadResponse;

  // 2) PUT direto no GCS (fetch puro, SEM Authorization)
  const put = await fetch(sign.signed_url, {
    method: 'PUT',
    headers: {
      ...(sign.upload_headers ?? {}),
      'Content-Type': file.type || 'application/octet-stream',
    },
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
      fonte,
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
}

/** Orquestra o upload de 1 documento (usa o núcleo enviarUmDocumento). */
export function useUploadDocumento() {
  const { fetchWithAuth } = useApiAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: UploadArgs) => enviarUmDocumento(fetchWithAuth, args),
    onSuccess: (_row, vars) => {
      // Prefixo [LIST_KEY, clienteId] cobre a lista por vínculo e a lista central.
      qc.invalidateQueries({ queryKey: [LIST_KEY, vars.clienteId] });
      if (!vars.silencioso) toast({ title: 'Documento anexado' });
    },
    onError: (e: unknown, vars) => {
      if (!vars.silencioso) {
        toast({ title: 'Erro ao anexar documento', description: (e as Error).message, variant: 'destructive' });
      }
    },
  });
}

/**
 * Upload simplificado para a Área do Cliente (EDU-01): sem vínculo (bem/matrícula/pessoa),
 * categoria fixa 'outros' e fonte 'cliente'. Reusa o mesmo pipeline sign-upload → PUT GCS
 * → finalize → insert. A policy RLS "cliente can insert own documento_arquivo" garante
 * que só cabe insert com cliente_id = resolve_user_cliente_id(auth.uid()).
 */
export function useUploadDocumentoCliente() {
  const { fetchWithAuth } = useApiAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { clienteId: string; file: File }) =>
      enviarUmDocumento(fetchWithAuth, {
        clienteId: args.clienteId,
        vinculo: {},
        categoria: 'outros',
        file: args.file,
        fonte: 'cliente',
      }),
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: [LIST_KEY, vars.clienteId] });
      toast({ title: 'Documento enviado' });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro ao enviar documento', description: (e as Error).message, variant: 'destructive' }),
  });
}

/** Soft-delete: marca excluido=true (o blob permanece no bucket versionado). */
export function useExcluirDocumento(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documento_arquivo').update({ excluido: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [LIST_KEY, clienteId] });
      toast({ title: 'Documento removido' });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro ao remover', description: (e as Error).message, variant: 'destructive' }),
  });
}

/**
 * Campos editáveis de um documento já existente (Fase 0 — base para
 * classificar/vincular/renomear depois do upload). Só usa colunas que já
 * existem; a RLS "team_member+ can update documento_arquivo" já autoriza.
 * O vínculo é polimórfico e mutuamente exclusivo: quem chama envia a entidade
 * escolhida e zera as outras (ex.: { pessoa_id: X, matricula_id: null, bem_id: null }).
 */
export interface AtualizarDocumentoPatch {
  categoria?: DocCategoria;
  nome_original?: string;
  bem_id?: string | null;
  matricula_id?: string | null;
  pessoa_id?: string | null;
}

/** Atualiza um documento (categoria, vínculo ou nome exibido) direto no Supabase. */
export function useAtualizarDocumento(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: AtualizarDocumentoPatch }): Promise<DocumentoArquivoRow> => {
      const { data, error } = await supabase
        .from('documento_arquivo')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as DocumentoArquivoRow;
    },
    onSuccess: () => {
      // Prefixo [LIST_KEY, clienteId] cobre a lista central e as por vínculo.
      qc.invalidateQueries({ queryKey: [LIST_KEY, clienteId] });
      toast({ title: 'Documento atualizado' });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro ao atualizar', description: (e as Error).message, variant: 'destructive' }),
  });
}

export type StatusItemMassa = 'pendente' | 'enviando' | 'ok' | 'erro';
export interface ItemMassa {
  file: File;
  status: StatusItemMassa;
  erro?: string;
}
/** Base (cliente/categoria/vínculo/origem) aplicada a todos os arquivos do lote. */
export type BaseMassa = Omit<UploadArgs, 'file' | 'silencioso'>;

/**
 * Orquestra o upload de N arquivos com concorrência limitada, reusando o núcleo
 * enviarUmDocumento. É AQUI que, no futuro, entram os endpoints em lote
 * (sign/finalize/insert de N itens) — a UI que consome este hook não muda.
 */
export function useUploadEmMassa() {
  const { fetchWithAuth } = useApiAuth();
  const qc = useQueryClient();
  const [itens, setItens] = useState<ItemMassa[]>([]);
  const [rodando, setRodando] = useState(false);

  const enviar = useCallback(
    async (files: File[], base: BaseMassa, concorrencia = 5): Promise<{ ok: number; erros: number; falhas: File[] }> => {
      setItens(files.map((f) => ({ file: f, status: 'pendente' as StatusItemMassa })));
      setRodando(true);
      let cursor = 0;
      let ok = 0;
      let erros = 0;
      const falhas: File[] = [];
      const worker = async () => {
        while (cursor < files.length) {
          const i = cursor;
          cursor += 1;
          setItens((prev) => prev.map((it, k) => (k === i ? { ...it, status: 'enviando' } : it)));
          try {
            await enviarUmDocumento(fetchWithAuth, { ...base, file: files[i], silencioso: true });
            setItens((prev) => prev.map((it, k) => (k === i ? { ...it, status: 'ok' } : it)));
            ok += 1;
          } catch (e) {
            const erro = (e as Error).message;
            setItens((prev) => prev.map((it, k) => (k === i ? { ...it, status: 'erro', erro } : it)));
            erros += 1;
            falhas.push(files[i]);
          }
        }
      };
      // Pool: dispara N workers que consomem a fila até esvaziar.
      const n = Math.min(Math.max(1, concorrencia), files.length);
      await Promise.all(Array.from({ length: n }, () => worker()));
      qc.invalidateQueries({ queryKey: [LIST_KEY, base.clienteId] });
      setRodando(false);
      return { ok, erros, falhas };
    },
    [fetchWithAuth, qc],
  );

  const reset = useCallback(() => setItens([]), []);
  return { itens, rodando, enviar, reset };
}

/** Gera a signed GET URL para pré-visualizar inline (sem baixar). */
export function usePreviewUrl() {
  const { fetchWithAuth } = useApiAuth();
  return useMutation({
    mutationFn: async (row: DocumentoArquivoRow): Promise<string> => {
      if (!row.gcs_uri) throw new Error('Documento sem arquivo associado');
      const res = await fetchWithAuth(getApiUrl('/api/v1/osg/documentos/sign-download'), {
        method: 'POST',
        body: JSON.stringify({ gcs_uri: row.gcs_uri }),
      });
      if (!res.ok) throw new Error('Falha ao gerar link de pré-visualização');
      const { signed_url } = (await res.json()) as { signed_url: string };
      return signed_url;
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro ao pré-visualizar', description: (e as Error).message, variant: 'destructive' }),
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
