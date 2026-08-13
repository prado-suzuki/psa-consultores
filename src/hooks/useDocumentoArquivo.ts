import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useApiAuth } from '@/hooks/useApiAuth';
import { useAuditLog } from '@/hooks/useAuditLog';
import { getApiUrl, currentAmbiente } from '@/config/api';
import type { Database } from '@/integrations/supabase/types';
// Só o tipo: as chaves dos 4 grupos são definidas em agrupadorDocumentos, que é
// a fonte única. O import é `type` dos dois lados, então o ciclo some no build.
import type { GrupoDocumentoKey } from '@/lib/agrupadorDocumentos';
import { computeFieldDiff } from '@/lib/diffUtils';

/**
 * A linha do arquivo.
 *
 * `documento_tipo_id` entra à mão porque o `types.ts` é autogerado e só ganha a
 * coluna quando o Lovable aplicar a migration 20260807120000. Assim que os
 * tipos forem regerados, esta interseção some e volta a ser só o `Row`.
 */
export type DocumentoArquivoRow = Database['public']['Tables']['documento_arquivo']['Row'] & {
  documento_tipo_id: string | null;
};
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
  /**
   * A solicitação em resposta à qual o arquivo chegou.
   *
   * Grava `documento_arquivo.solicitacao_id`, coluna que existia desde a EDU-23 e
   * que ninguém preenchia — todo arquivo nascia sem saber de qual pedido veio, e o
   * cliente que abria pedido novo continuava vendo os arquivos do ciclo anterior.
   *
   * Só RASTREIA: nenhuma leitura filtra por ela. A lista do cliente segue por
   * `documento_arquivo.cliente_id`, porque um arquivo entregue continua valendo
   * depois que o pedido fecha.
   */
  solicitacaoId?: string | null;
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

export type FetchWithAuth = ReturnType<typeof useApiAuth>['fetchWithAuth'];

export interface SubirArquivoGcsArgs {
  clienteId: string;
  file: File;
  categoria: DocCategoria;
  matriculaId?: string | null;
  nrMatricula?: string | null;
}

export interface ArquivoGcsResultado {
  gcs_uri: string;
  checksum: string;
  tamanho: number;
  mime: string | null;
  ambiente: string;
}

/**
 * Helper: sign-upload → PUT no GCS → finalize. Reusado por `enviarUmDocumento`
 * (fluxo interno da equipe), pelo upload da área do cliente e pelo anexo por
 * pendência da fase de checklist (useDomainPendenciasCliente), que sobe o binário
 * igual e só troca a gravação da linha por uma RPC que valida o vínculo.
 */
export async function subirArquivoGcs(
  fetchWithAuth: FetchWithAuth,
  args: SubirArquivoGcsArgs,
): Promise<ArquivoGcsResultado> {
  const { clienteId, file, categoria, matriculaId, nrMatricula } = args;
  const isGeorreferenciamento = categoria === 'georreferenciamento';
  const numeroMatricula = nrMatricula?.trim() || null;
  if (isGeorreferenciamento && !matriculaId) {
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
    signPayload.matricula_id = matriculaId!;
    signPayload.nr_matricula = numeroMatricula!;
  }

  const signRes = await fetchWithAuth(getApiUrl('/api/v1/osg/documentos/sign-upload'), {
    method: 'POST',
    body: JSON.stringify(signPayload),
  });
  if (!signRes.ok) throw new Error('Falha ao solicitar URL de upload');
  const sign = (await signRes.json()) as SignUploadResponse;

  const put = await fetch(sign.signed_url, {
    method: 'PUT',
    headers: {
      ...(sign.upload_headers ?? {}),
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });
  if (!put.ok) throw new Error('Falha ao enviar o arquivo para o storage');

  const finRes = await fetchWithAuth(getApiUrl('/api/v1/osg/documentos/finalize'), {
    method: 'POST',
    body: JSON.stringify({ object_key: sign.object_key }),
  });
  if (!finRes.ok) throw new Error('Falha ao finalizar o upload');
  const fin = (await finRes.json()) as { tamanho: number; checksum: string; content_type: string | null };

  return {
    gcs_uri: sign.gcs_uri,
    checksum: fin.checksum,
    tamanho: fin.tamanho,
    mime: fin.content_type ?? file.type ?? null,
    ambiente: sign.ambiente ?? currentAmbiente,
  };
}

/**
 * Núcleo do upload de 1 documento: sign-upload → PUT no GCS → finalize → insert.
 * Isolado (recebe fetchWithAuth) para ser reusado pelo upload em massa e para,
 * no futuro, ceder lugar a endpoints em lote (sign/finalize/insert de N itens)
 * sem afetar a UI — só o orquestrador muda.
 */
async function enviarUmDocumento(fetchWithAuth: FetchWithAuth, args: UploadArgs): Promise<DocumentoArquivoRow> {
  const { clienteId, vinculo, categoria, file, nrMatricula, fonte = 'cliente', solicitacaoId } = args;

  const gcs = await subirArquivoGcs(fetchWithAuth, {
    clienteId,
    file,
    categoria,
    matriculaId: vinculo.matriculaId ?? null,
    nrMatricula,
  });

  // grava a linha (RLS)
  const { data, error } = await supabase
    .from('documento_arquivo')
    .insert({
      cliente_id: clienteId,
      fonte,
      categoria,
      bem_id: vinculo.bemId ?? null,
      matricula_id: vinculo.matriculaId ?? null,
      pessoa_id: vinculo.pessoaId ?? null,
      solicitacao_id: solicitacaoId ?? null,
      nome_original: file.name,
      gcs_uri: gcs.gcs_uri,
      checksum: gcs.checksum,
      mime: gcs.mime,
      tamanho: gcs.tamanho,
      status: 'ativo',
      ambiente: gcs.ambiente,
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
    // `categoria` é opcional e existe para a coleta por grupo (Pessoas Físicas,
    // Jurídicas, Imóveis): é só uma gaveta de entrada, a classificação fina
    // continua sendo da PSA. Sem ela, cai em 'outros' como antes.
    mutationFn: (args: {
      clienteId: string;
      file: File;
      categoria?: DocCategoria;
      /** A solicitação enviada que motivou o envio; grava para rastrear a origem. */
      solicitacaoId?: string | null;
    }) =>
      enviarUmDocumento(fetchWithAuth, {
        clienteId: args.clienteId,
        vinculo: {},
        categoria: args.categoria ?? 'outros',
        file: args.file,
        fonte: 'cliente',
        solicitacaoId: args.solicitacaoId ?? null,
      }),
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: [LIST_KEY, vars.clienteId] });
      toast({ title: 'Documento enviado' });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro ao enviar documento', description: (e as Error).message, variant: 'destructive' }),
  });
}

interface DeleteDocumentoResult {
  documento_id: string;
  object_key: string | null;
  deleted: boolean;
  georef_rows_deleted: number;
  georef_preservado: boolean;
}

/**
 * Exclui um documento: marca a linha como excluída e apaga o binário no GCS.
 *
 * As DUAS escritas acontecem no backend, numa ordem que não é detalhe de
 * implementação — é a autorização. O `PATCH excluido=true` roda com o JWT do
 * usuário, então a RLS decide, e "0 linhas afetadas" vira 403 antes de qualquer
 * byte morrer. Por isso o front não atualiza a linha aqui: fazer o UPDATE deste
 * lado deixaria a permissão de destruir os bytes apoiada em quem consegue LER o
 * documento, e ler é permissão que o portal do cliente tem.
 *
 * A linha permanece com `excluido=true` e `gcs_uri` — é o que torna utilizável a
 * janela de soft-delete de 7 dias do bucket.
 */
export function useExcluirDocumento(clienteId: string) {
  const { fetchWithAuth } = useApiAuth();
  const { logAction } = useAuditLog();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: DocumentoArquivoRow): Promise<DeleteDocumentoResult> => {
      // Timeout generoso: a chamada é destrutiva e pode incluir DML no BigQuery
      // (georref) sobre um Cloud Run frio. Abortar no cliente não aborta o
      // servidor — o erro de timeout mentiria sobre o que aconteceu.
      const res = await fetchWithAuth(
        getApiUrl('/api/v1/osg/documentos/delete'),
        { method: 'POST', body: JSON.stringify({ documento_id: doc.id }) },
        60000,
      );
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? 'Sem permissão para excluir este documento (ou ele já estava excluído).'
            : 'Falha ao excluir o documento',
        );
      }
      const resultado = (await res.json()) as DeleteDocumentoResult;
      await logAction({
        area: 'osg',
        entity_type: 'documento_arquivo',
        entity_id: doc.id,
        entity_name: doc.nome_original,
        action: 'deleted',
        changed_fields: { excluido: { old: false, new: true } },
        details: resultado.object_key
          ? `Arquivo apagado do storage (${resultado.object_key})`
          : 'Linha sem arquivo associado',
      });
      return resultado;
    },
    onSuccess: (resultado, doc) => {
      // A invalidação por prefixo já recompõe o checklist do consultor: ele
      // deixou de ser tabela e passou a ser derivado desta mesma lista de
      // arquivos (src/lib/checklistDerivado.ts). Antes havia uma segunda
      // invalidação, da query de `checklist_cliente_item`, que não existe mais.
      qc.invalidateQueries({ queryKey: [LIST_KEY, clienteId] });
      // O georref vive no BigQuery e foi purgado pelo backend; sem invalidar,
      // a tela Gerar seguiria montando a tabela de vértices (e o .docx) com
      // coordenadas que já não existem.
      if (doc.categoria === 'georreferenciamento' && doc.matricula_id) {
        qc.invalidateQueries({ queryKey: ['georef-by-matricula', doc.matricula_id] });
      }
      toast({
        title: 'Documento excluído',
        // Não afirma que apagou o arquivo quando os bytes já não estavam lá.
        description: resultado.deleted
          ? 'O arquivo foi apagado do storage.'
          : 'O registro foi excluído (o arquivo já não estava no storage).',
      });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro ao excluir', description: (e as Error).message, variant: 'destructive' }),
  });
}

/** Soft-delete (cliente / EDU-02): único caminho de exclusão pelo próprio cliente.
 * Chama a RPC SECURITY DEFINER que valida posse (fonte='cliente' e cliente_id do
 * usuário). Não damos privilégio de UPDATE em `documento_arquivo` ao cliente, então
 * ele não consegue alterar `gcs_uri`, `nome_original` ou qualquer outra coluna. */
export function useSoftDeleteDocumentoCliente(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('soft_delete_documento_cliente', { _id: id });
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

/** EDU-02: resolve o nome de exibição de uploaders (created_by) via RPC segura.
 * A RPC filtra por visibilidade: cliente só recebe nomes de uploaders dos próprios
 * documentos; equipe (team_member+) recebe qualquer nome pedido. */
export function useUploaderNames(userIds: string[]) {
  const uniqSorted = Array.from(new Set(userIds.filter(Boolean))).sort();
  return useQuery({
    queryKey: ['uploader-names', uniqSorted.join(',')],
    enabled: uniqSorted.length > 0,
    queryFn: async (): Promise<Record<string, string>> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_uploader_names', { _ids: uniqSorted });
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of (data ?? []) as Array<{ user_id: string; display_name: string | null }>) {
        if (row.user_id && row.display_name) map[row.user_id] = row.display_name;
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// A leitura do checklist pelo cliente (EDU-03: ChecklistSolicitadoItem e
// useChecklistSolicitadoCliente) saiu na EDU-27, junto com a tela que a usava.
// Quem entrega o pedido ao cliente agora é useSolicitacaoAtivaCliente, abaixo.
// A RPC get_checklist_solicitado_cliente continua no banco, órfã: apagá-la é
// tarefa própria, fora do escopo da EDU-27.

/**
 * EDU-24: item da solicitação enviada, do ponto de vista do cliente.
 *
 * `documento`, `nota` e `entidade` já chegam resolvidos: a linha de
 * solicitacao_item não copia texto do catálogo, e o coalesce com documento_tipo
 * acontece dentro da RPC.
 *
 * `grupo` é a gaveta, gravada na própria linha. É por ela que a área do cliente
 * agrupa, e não mais pelo texto de `entidade`.
 */
export interface SolicitacaoItemCliente {
  id: string;
  grupo: GrupoDocumentoKey;
  documento: string;
  nota: string | null;
  entidade: string | null;
  ordem: number | null;
}

/** EDU-24: cabeçalho da solicitação enviada. Nulo quando não há pedido enviado. */
export interface SolicitacaoAtivaHeader {
  id: string;
  status: string;
  enviada_em: string | null;
}

/** EDU-24: retorno de `get_solicitacao_ativa_cliente`. */
export interface SolicitacaoAtivaCliente {
  solicitacao: SolicitacaoAtivaHeader | null;
  itens: SolicitacaoItemCliente[];
}

const SOLICITACAO_VAZIA: SolicitacaoAtivaCliente = { solicitacao: null, itens: [] };

/**
 * EDU-24: a solicitação ENVIADA do cliente logado e os itens ativos dela.
 *
 * A RPC não recebe argumento: ela resolve o cliente por `auth.uid()` e é
 * SECURITY DEFINER, então o filtro por cliente mora dentro dela. O `clienteId`
 * entra só na chave de cache e no `enabled`, para a consulta não disparar antes
 * de o cliente do usuário estar resolvido.
 *
 * Sem pedido enviado (rascunho, encerrada ou nenhuma), a RPC devolve
 * `solicitacao: null` e `itens: []`. Nunca null puro, então o front trata um
 * formato só.
 */
export function useSolicitacaoAtivaCliente(clienteId: string | null) {
  return useQuery({
    queryKey: ['solicitacao-ativa-cliente', clienteId ?? '∅'],
    enabled: !!clienteId,
    queryFn: async (): Promise<SolicitacaoAtivaCliente> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_solicitacao_ativa_cliente');
      if (error) throw error;
      return (data ?? SOLICITACAO_VAZIA) as SolicitacaoAtivaCliente;
    },
    staleTime: 60 * 1000,
  });
}

// O upload por item (EDU-03: useUploadDocumentoSolicitado) saiu na EDU-27 com a
// tela que o chamava. O cliente agora envia pela gaveta, com
// useUploadDocumentoCliente, e a classificação item x arquivo é trabalho
// posterior do analista. A RPC anexar_documento_solicitado fica no banco.

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
  /**
   * Marca de triagem (BER-39): preenchida quando alguém decidiu que o arquivo
   * não é de nenhuma entidade e sim do cliente como um todo. A constraint
   * `documento_arquivo_um_dono_apenas` recusa esta marca junto com um dono, por
   * isso quem a envia tem de zerar as três colunas de vínculo na mesma jogada.
   */
  triado_em?: string | null;
  /**
   * Que documento este arquivo é, referenciando o catálogo `documento_tipo`.
   * Opcional em toda parte: classificar não bloqueia vincular. Quem não quer
   * mexer no tipo simplesmente não manda a chave, e o valor gravado sobrevive.
   */
  documento_tipo_id?: string | null;
}

/**
 * Colunas que o histórico acompanha: de quem é o arquivo e que documento ele é.
 * Renomear e trocar categoria passam por aqui e não viram histórico, de
 * propósito — o que interessa registrar são as duas decisões de triagem.
 */
const CAMPOS_AUDITADOS = ['pessoa_id', 'bem_id', 'matricula_id', 'triado_em', 'documento_tipo_id'];

/** Atualiza um documento (categoria, vínculo ou nome exibido) direto no Supabase. */
export function useAtualizarDocumento(clienteId: string) {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();
  return useMutation({
    mutationFn: async (
      { id, patch, origem }: { id: string; patch: AtualizarDocumentoPatch; origem?: string },
    ): Promise<DocumentoArquivoRow> => {
      // O "antes" do log não sai do update: o PostgREST devolve só a linha nova.
      // Busco a anterior aqui dentro, e não peço ao chamador, por dois motivos:
      // os quatro consumidores auditam sem precisar ser alterados, e ninguém
      // registra um "antes" errado por esquecer de passar.
      // `documento_tipo_id` ainda não está no types.ts autogerado (migration
      // 20260807120000, aplicada pelo Lovable). Sem o alias, tanto o select
      // abaixo quanto o update recusam a coluna em tempo de compilação. Some
      // sozinho na próxima regeneração de tipos.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;

      const { data: anterior } = await sb
        .from('documento_arquivo')
        .select('pessoa_id, bem_id, matricula_id, triado_em, documento_tipo_id')
        .eq('id', id)
        .maybeSingle();

      // `triado_por` acompanha `triado_em`: quem decidiu sai da sessão, e não do
      // patch, para a lib de regras seguir pura. Marca posta preenche o autor;
      // marca desfeita (triado_em null) limpa junto.
      let corpo: AtualizarDocumentoPatch & { triado_por?: string | null } = patch;
      if ('triado_em' in patch) {
        const { data: sessao } = await supabase.auth.getUser();
        corpo = { ...patch, triado_por: patch.triado_em ? (sessao.user?.id ?? null) : null };
      }
      const { data, error } = await sb
        .from('documento_arquivo')
        .update(corpo)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      const linha = data as DocumentoArquivoRow;

      const mudou = computeFieldDiff(
        anterior as Record<string, unknown> | null,
        linha as unknown as Record<string, unknown>,
        CAMPOS_AUDITADOS,
      );
      if (Object.keys(mudou).length > 0) {
        // Sem await e dentro de try/catch: o vínculo já está gravado, e uma
        // falha de auditoria não pode derrubá-lo nem segurar o consultor que
        // está varrendo o balde. O próprio logAction já engole erro; a guarda
        // aqui vale mesmo que ele mude, e cobre tanto rejeição quanto erro
        // síncrono.
        void (async () => {
          try {
            await logAction({
              area: 'osg',
              entity_type: 'documento_arquivo',
              entity_id: linha.id,
              entity_name: linha.nome_original,
              action: 'updated',
              changed_fields: mudou,
              details: origem,
            });
          } catch {
            // silêncio proposital: auditoria é registro, não caminho crítico
          }
        })();
      }
      return linha;
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
