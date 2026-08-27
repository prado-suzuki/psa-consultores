import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database, Json } from '@/integrations/supabase/types';
import type { ItemLista } from '@/lib/templates/mapeadores';

export type DocumentoGeradoRow = Database['public']['Tables']['documento_gerado']['Row'];

/** Conteúdo de documento_gerado.snapshot_dados (jsonb). */
export interface SnapshotDados {
  selecao: Record<string, Record<string, string>>;
  registroPorBinding: Record<string, string>;
  /** Seleções de papéis com cardinalidade múltipla (ex.: {{#imoveis}}). */
  registrosPorLista?: Record<string, string[]>;
  valoresLivres: Record<string, string>;
  empresaId: string | null;
  itensPorLista: Record<string, ItemLista[]>;
  /** quadro.total no momento da validação; null quando o modelo não usa sócios. */
  total: { quotas: string; vlrTotal: string; percentual: string } | null;
}

// O documento_gerado é persistido pelo passo "Validar versão": ele encerra os
// cadastros e CONGELA os valores atuais (snapshot_flags/snapshot_dados) nesta
// versão. Sem ele não há documento_gerado_id e, portanto, não dá para ancorar
// um override de bloco. Aqui ficam o find-or-create do rascunho e a leitura dos
// overrides ativos que a composição aplica.

const RASCUNHO_KEY = 'documento-gerado-rascunho';
const rascunhoKey = (clienteId: string | null, modeloId: string | null, pjPessoaId: string | null) =>
  [RASCUNHO_KEY, clienteId ?? '∅', modeloId ?? '∅', pjPessoaId ?? '∅'];

interface RascunhoArgs {
  clienteId: string | null;
  modeloId: string | null;
  /** Empresa do contrato (pode ser null em modelos sem empresa). */
  pjPessoaId: string | null;
}

/**
 * A HEAD da combinação cliente+modelo+empresa: o rascunho vivo se houver, senão
 * o documento REGISTRADO mais recente. Null quando não há nem um nem outro.
 *
 * O registrado entra aqui porque ele não deixa de ser o documento da tela quando
 * é travado — pelo contrário, é a peça que valeu, e continua sendo lida do
 * snapshot dela. O rascunho ganha do registrado quando os dois existem: é o caso
 * da alteração contratual já validada, cujo rascunho sucede o contrato
 * registrado e passa a ser o documento em edição.
 *
 * Versões seladas ('revisao') ficam de fora: elas vivem no histórico da linhagem
 * (useDocumentoVersoes) e não são editáveis.
 */
export function useDocumentoGeradoHead({ clienteId, modeloId, pjPessoaId }: RascunhoArgs) {
  return useQuery({
    queryKey: rascunhoKey(clienteId, modeloId, pjPessoaId),
    enabled: !!clienteId && !!modeloId,
    queryFn: async (): Promise<DocumentoGeradoRow | null> => {
      let q = supabase
        .from('documento_gerado')
        .select('*')
        .eq('cliente_id', clienteId!)
        .eq('documento_template_id', modeloId!)
        .in('status', ['rascunho', 'registrado']);
      // pj_pessoa_id IS NULL e = <id> são filtros distintos no Postgres.
      q = pjPessoaId ? q.eq('pj_pessoa_id', pjPessoaId) : q.is('pj_pessoa_id', null);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      const linhas = (data ?? []) as DocumentoGeradoRow[];
      return linhas.find((l) => l.status === 'rascunho') ?? linhas[0] ?? null;
    },
  });
}

/** Documento específico da cadeia de substituição, usado como fonte congelada do ato anterior. */
export function useDocumentoGeradoPorId(documentoId: string | null) {
  return useQuery({
    queryKey: ['documento-gerado-por-id', documentoId],
    enabled: !!documentoId,
    queryFn: async (): Promise<DocumentoGeradoRow | null> => {
      const { data, error } = await supabase
        .from('documento_gerado')
        .select('*')
        .eq('id', documentoId!)
        .maybeSingle();
      if (error) throw error;
      return (data as DocumentoGeradoRow) ?? null;
    },
  });
}

/** Uma versão da linhagem de um documento, com o número de ordem cronológico. */
export interface VersaoDocumento {
  row: DocumentoGeradoRow;
  /** 1-based, na ordem em que as versões foram criadas (1 = raiz). */
  numero: number;
  /** A head viva e editável (status 'rascunho'); as demais estão seladas. */
  ehHead: boolean;
}

/**
 * Linhagem completa de um documento, em ordem cronológica (raiz → … → head).
 * Todas as versões compartilham o mesmo documento_raiz_id (a raiz aponta para si
 * mesma). Cada linha carrega o snapshot que a torna reproduzível, então o viewer
 * de versão antiga renderiza direto daqui — sem tocar nos cadastros vivos.
 */
export function useDocumentoVersoes(raizId: string | null) {
  return useQuery({
    queryKey: ['documento-versoes', raizId],
    enabled: !!raizId,
    queryFn: async (): Promise<VersaoDocumento[]> => {
      const { data, error } = await supabase
        .from('documento_gerado')
        .select('*')
        .eq('documento_raiz_id', raizId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as DocumentoGeradoRow[]).map((row, i) => ({
        row,
        numero: i + 1,
        ehHead: row.status === 'rascunho',
      }));
    },
  });
}

/**
 * True se o cliente possui ao menos um documento_gerado (qualquer status/versão).
 * Usado como gate de exibição do histórico de alterações nos modais de cadastro:
 * a captura no audit_logs é incondicional, mas o histórico só aparece depois que
 * o cliente teve ao menos uma versão gerada.
 */
export function useClienteTemDocumentoGerado(clienteId: string | null) {
  return useQuery({
    queryKey: ['cliente-tem-documento-gerado', clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<boolean> => {
      const { count, error } = await supabase
        .from('documento_gerado')
        .select('id', { count: 'exact', head: true })
        .eq('cliente_id', clienteId!);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });
}

export interface SalvarDocumentoGeradoInput {
  clienteId: string;
  pjPessoaId: string | null;
  modeloId: string;
  /** Flags ativas no momento da validação (nomes) — congeladas na versão. */
  snapshotFlags: string[];
  /** Estado dos cadastros congelado em documento_gerado.snapshot_dados. */
  snapshotDados: Json;
  /**
   * Texto dos blocos JÁ RESOLVIDO (com overrides aplicados), congelado em
   * documento_gerado.snapshot_versoes_blocos. Sem isso a versão antiga "vaza"
   * para o texto novo quando um bloco da biblioteca ou um override muda — com
   * ele, cada versão renderiza para sempre o que foi validado.
   */
  snapshotVersoesBlocos: Json;
  /**
   * true => commit deliberado ("Atualizar versão"): sela a head atual
   * (rascunho→revisao, snapshot intacto = história imutável) e cria uma head
   * nova encadeada. false => atualiza a head no lugar (edição incremental ou
   * re-sync de dados). Ignorado quando ainda não há head — aí cria a raiz.
   */
  novaVersao?: boolean;
  /**
   * Documento REGISTRADO que esta peça substitui — preenchido só quando a
   * validação está criando a RAIZ de uma alteração contratual. Sucessão entre
   * documentos distintos, diferente de documento_raiz_id/documento_anterior_id,
   * que encadeiam versões do mesmo documento. Nos forks da linhagem o valor é
   * copiado da head, não deste campo.
   */
  substituiDocumentoId?: string | null;
}

/**
 * Persiste o passo "Validar/Atualizar versão" sobre a HEAD (o rascunho ativo da
 * combinação cliente+modelo+empresa):
 *  - sem head ainda: cria a RAIZ da linhagem (documento_raiz_id = id);
 *  - novaVersao=false: atualiza a head NO LUGAR (edição incremental / re-sync);
 *  - novaVersao=true: SELA a head atual (rascunho→revisao, snapshot intacto =
 *    história imutável) e FORKA uma head nova encadeada (anterior=selada,
 *    raiz=raiz), copiando os snapshots e os overrides — continua-se do mesmo
 *    ponto sem perder o que já foi validado.
 * Devolve a head vigente após a operação.
 */
export function useSalvarDocumentoGerado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SalvarDocumentoGeradoInput): Promise<DocumentoGeradoRow> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      // Head = rascunho mais recente da combinação. pj_pessoa_id IS NULL e = <id>
      // são filtros distintos no Postgres.
      let buscar = supabase
        .from('documento_gerado')
        .select('*')
        .eq('cliente_id', input.clienteId)
        .eq('documento_template_id', input.modeloId)
        .eq('status', 'rascunho');
      buscar = input.pjPessoaId
        ? buscar.eq('pj_pessoa_id', input.pjPessoaId)
        : buscar.is('pj_pessoa_id', null);
      const { data: head, error: erroBusca } = await buscar
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (erroBusca) throw erroBusca;

      // visto_em da notificação compara contra este carimbo: cada (re)validação
      // reinicia a janela, tirando da vista as mudanças que o snapshot já adotou.
      const validadoEm = new Date().toISOString();
      const snapshotCols = {
        snapshot_flags: input.snapshotFlags,
        snapshot_dados: input.snapshotDados,
        snapshot_versoes_blocos: input.snapshotVersoesBlocos,
        snapshot_validado_em: validadoEm,
      };

      // Sem head: cria a raiz da linhagem (documento_raiz_id = o próprio id).
      if (!head) {
        const { data: novo, error: erroInsert } = await supabase
          .from('documento_gerado')
          .insert({
            cliente_id: input.clienteId,
            pj_pessoa_id: input.pjPessoaId,
            documento_template_id: input.modeloId,
            status: 'rascunho',
            substitui_documento_id: input.substituiDocumentoId ?? null,
            gerado_por_id: userId,
            ...snapshotCols,
          })
          .select('*')
          .single();
        if (erroInsert) throw erroInsert;

        const { data: comRaiz, error: erroRaiz } = await supabase
          .from('documento_gerado')
          .update({ documento_raiz_id: novo.id })
          .eq('id', novo.id)
          .select('*')
          .single();
        if (erroRaiz) throw erroRaiz;
        return comRaiz as DocumentoGeradoRow;
      }

      // Head existe + edição incremental / re-sync: re-congela no lugar.
      if (!input.novaVersao) {
        const { data, error } = await supabase
          .from('documento_gerado')
          .update(snapshotCols)
          .eq('id', head.id)
          .select('*')
          .single();
        if (error) throw error;
        return data as DocumentoGeradoRow;
      }

      // Head existe + commit deliberado: SELA a head atual e FORKA uma nova.
      // 1. Selo: rascunho → revisao, CONGELANDO o estado atual no snapshot. A head
      //    renderiza ao vivo (Biblioteca + overrides aplicados na composição), então
      //    seu snapshot_versoes_blocos fica defasado assim que um override é criado/
      //    editado/revertido — só validarVersao o re-congela, e mexer em override não
      //    dispara isso. Sem gravar snapshotCols aqui, a versão selada renderizaria o
      //    texto PRÉ-override (o viewer de versão lê do snapshot, não dos cadastros).
      const { error: erroSelo } = await supabase
        .from('documento_gerado')
        .update({ status: 'revisao', ...snapshotCols })
        .eq('id', head.id);
      if (erroSelo) throw erroSelo;

      // 2. Fork: a nova head continua de onde a selada parou.
      const raizId = head.documento_raiz_id ?? head.id;
      const { data: nova, error: erroFork } = await supabase
        .from('documento_gerado')
        .insert({
          cliente_id: input.clienteId,
          pj_pessoa_id: input.pjPessoaId,
          documento_template_id: input.modeloId,
          status: 'rascunho',
          documento_anterior_id: head.id,
          documento_raiz_id: raizId,
          // Copiada da head, não do input: toda versão da linhagem de uma
          // alteração responde o que ela substitui sem join até a raiz.
          substitui_documento_id: head.substitui_documento_id,
          gerado_por_id: userId,
          ...snapshotCols,
        })
        .select('*')
        .single();
      if (erroFork) throw erroFork;

      // 3. Copia os overrides da selada para a nova head. O texto resolvido já
      // viajou em snapshot_versoes_blocos, mas a head precisa dos overrides VIVOS
      // para seguir editando os mesmos blocos. Os derivados são da raiz
      // (compartilhados pela linhagem); re-editá-los não afeta a selada, que
      // renderiza do snapshot.
      const { data: ovs, error: erroOvs } = await supabase
        .from('documento_override')
        .select('tipo, bloco_alvo_id, bloco_substituto_id, observacao')
        .eq('documento_gerado_id', head.id);
      if (erroOvs) throw erroOvs;
      if (ovs && ovs.length > 0) {
        const { error: erroCopia } = await supabase.from('documento_override').insert(
          ovs.map((o) => ({
            documento_gerado_id: nova.id,
            tipo: o.tipo,
            bloco_alvo_id: o.bloco_alvo_id,
            bloco_substituto_id: o.bloco_substituto_id,
            observacao: o.observacao,
          })),
        );
        if (erroCopia) throw erroCopia;
      }

      return nova as DocumentoGeradoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RASCUNHO_KEY] });
      // Selar/forkar muda a linhagem: o histórico de versões precisa refletir.
      queryClient.invalidateQueries({ queryKey: ['documento-versoes'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao validar a versão', description: error.message, variant: 'destructive' });
    },
  });
}

// --- Registro na junta: o documento vira peça travada -----------------------

export interface RegistrarDocumentoInput {
  documentoGeradoId: string;
  /** Nome do modelo, só para a trilha de auditoria ficar legível. */
  nomeModelo: string;
}

/**
 * Marca o documento como REGISTRADO na junta comercial (status 'registrado', já
 * previsto no CHECK documento_gerado_status_check do baseline).
 *
 * O que isso significa na tela: acabou a edição. O registrado não forka versão
 * nova, não re-sincroniza do cadastro e não aceita override de bloco — ele é a
 * peça que valeu, e mexer nele seria reescrever um documento que já produziu
 * efeito. O caminho para mudar a sociedade a partir daqui é OUTRO documento: a
 * alteração contratual, que nasce deste e o substitui.
 *
 * Só a head vale: exige status 'rascunho' na própria condição do update, para
 * que registrar duas vezes (ou registrar uma versão selada) não passe.
 */
export function useRegistrarDocumento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RegistrarDocumentoInput): Promise<DocumentoGeradoRow> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      const { data, error } = await supabase
        .from('documento_gerado')
        .update({ status: 'registrado', updated_by: userId })
        .eq('id', input.documentoGeradoId)
        .eq('status', 'rascunho')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error('Este documento não está mais em rascunho — recarregue a tela.');
      }
      return data as DocumentoGeradoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RASCUNHO_KEY] });
      queryClient.invalidateQueries({ queryKey: ['documento-versoes'] });
      toast({
        title: 'Documento registrado',
        description: 'A peça está travada. Para mudar a sociedade, gere uma alteração contratual.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao registrar o documento', description: error.message, variant: 'destructive' });
    },
  });
}

/**
 * O documento que SUCEDE um registrado, se já existe: a alteração contratual
 * cuja raiz aponta para ele em substitui_documento_id. Serve para não oferecer
 * "Gerar alteração contratual" duas vezes sobre a mesma peça.
 */
export function useDocumentoSucessor(documentoId: string | null) {
  return useQuery({
    queryKey: ['documento-sucessor', documentoId],
    enabled: !!documentoId,
    queryFn: async (): Promise<DocumentoGeradoRow | null> => {
      const { data, error } = await supabase
        .from('documento_gerado')
        .select('*')
        .eq('substitui_documento_id', documentoId!)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as DocumentoGeradoRow) ?? null;
    },
  });
}

/**
 * Quantas ALTERAÇÕES vieram antes do documento `documentoId` na cadeia de
 * substituição: 0 quando ele é a constituição (não substitui ninguém), 1 quando
 * substitui a constituição, 2 quando substitui aquela, e assim por diante.
 *
 * É a conta que nomeia a peça: a alteração que sucede este documento é a
 * `resultado + 1`-ésima, e é esse ordinal que abre o cabeçalho ("PRIMEIRA
 * ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL" — ver `tituloDoInstrumento`).
 *
 * A cadeia é percorrida no cliente, sobre UMA leitura de todos os documentos do
 * cliente: são poucas linhas, e uma consulta recursiva no banco custaria uma RPC
 * nova para responder o que um `Map` responde aqui. `substitui_documento_id`
 * liga documentos DISTINTOS; `documento_raiz_id`/`documento_anterior_id` ligam
 * versões do mesmo documento e não entram nesta conta.
 */
export function useOrdemNaSucessao(clienteId: string | null, documentoId: string | null) {
  return useQuery({
    queryKey: ['documento-ordem-sucessao', clienteId, documentoId],
    enabled: !!clienteId && !!documentoId,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('documento_gerado')
        .select('id, substitui_documento_id')
        .eq('cliente_id', clienteId!);
      if (error) throw error;
      const antecessor = new Map<string, string | null>();
      for (const linha of (data ?? []) as Array<{ id: string; substitui_documento_id: string | null }>) {
        antecessor.set(linha.id, linha.substitui_documento_id);
      }
      // Ciclo é impossível pelo fluxo (o sucessor nasce depois), mas um dado
      // torto não pode travar a tela: `vistos` encerra a caminhada.
      const vistos = new Set<string>();
      let atual: string | null = documentoId;
      let elos = 0;
      while (atual && !vistos.has(atual)) {
        vistos.add(atual);
        atual = antecessor.get(atual) ?? null;
        if (atual) elos += 1;
      }
      return elos;
    },
  });
}

// --- Overrides ativos do documento ------------------------------------------

export interface OverrideAplicavel {
  overrideId: string;
  /** = tmpl_bloco.id do bloco ORIGINAL (casa com b.bloco.id na montagem). */
  blocoAlvoId: string;
  blocoSubstitutoId: string;
  /** Texto a injetar no lugar do original (formato do EditorConteudoModelo). */
  conteudoSubstituto: string;
  justificativa: string | null;
}

export interface OverridesDocumento {
  porBlocoAlvo: Map<string, OverrideAplicavel>;
  lista: OverrideAplicavel[];
}

const SEM_OVERRIDES: OverridesDocumento = { porBlocoAlvo: new Map(), lista: [] };

/** Overrides ativos do documento + conteúdo atual de cada bloco substituto. */
export function useDocumentoOverrides(documentoGeradoId: string | null) {
  return useQuery({
    queryKey: ['documento-overrides', documentoGeradoId],
    enabled: !!documentoGeradoId,
    queryFn: async (): Promise<OverridesDocumento> => {
      const { data: ovs, error } = await supabase
        .from('documento_override')
        .select('id, tipo, bloco_alvo_id, bloco_substituto_id, observacao')
        .eq('documento_gerado_id', documentoGeradoId!)
        // Reverter um ajuste apaga a linha (hard delete), então todo override
        // existente está vigente. Mais recente por último: ao montar o Map,
        // sobrescreve eventuais duplicatas do mesmo alvo.
        .order('created_at', { ascending: true });
      if (error) throw error;

      const subs = (ovs ?? []).filter(
        (o) => o.tipo === 'substituicao' && o.bloco_alvo_id && o.bloco_substituto_id,
      );

      const substitutoIds = [...new Set(subs.map((o) => o.bloco_substituto_id as string))];
      const conteudoPorBloco = new Map<string, string>();
      if (substitutoIds.length > 0) {
        const { data: versoes, error: erroVersoes } = await supabase
          .from('tmpl_bloco_versao')
          .select('bloco_id, conteudo, atual')
          .in('bloco_id', substitutoIds)
          .eq('atual', true);
        if (erroVersoes) throw erroVersoes;
        for (const v of versoes ?? []) conteudoPorBloco.set(v.bloco_id, v.conteudo ?? '');
      }

      const lista: OverrideAplicavel[] = subs.map((o) => ({
        overrideId: o.id,
        blocoAlvoId: o.bloco_alvo_id as string,
        blocoSubstitutoId: o.bloco_substituto_id as string,
        conteudoSubstituto: conteudoPorBloco.get(o.bloco_substituto_id as string) ?? '',
        justificativa: o.observacao ?? null,
      }));

      return { porBlocoAlvo: new Map(lista.map((o) => [o.blocoAlvoId, o])), lista };
    },
    // placeholderData (e NÃO initialData): mostra o shape vazio enquanto carrega,
    // mas nunca entra no cache como dado "fresco". Com initialData + o staleTime
    // global de 1 min, um cold load (F5) tratava o vazio inicial como fresco e
    // PULAVA o fetch — os overrides do documento só reapareciam após uma
    // invalidação explícita (ex.: salvar outro ajuste). placeholderData sempre busca.
    placeholderData: SEM_OVERRIDES,
  });
}
