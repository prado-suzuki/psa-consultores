import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useAuth } from '@/contexts/AuthContext';
import { computeFieldDiff } from '@/lib/diffUtils';
import type { Database, Json } from '@/integrations/supabase/types';
import type { ItemLista } from '@/lib/templates/mapeadores';
import { avaliarTravaDoConstitutivo, type TravaDoConstitutivo } from '@/lib/osg/travaDoConstitutivo';
import { avaliarTravaDaSucessao } from '@/lib/osg/travaDaSucessao';
import type { PropostaAC } from '@/lib/osg/alteracaoPorEventos';
import { subirArquivoGcs, type FetchWithAuth } from '@/hooks/useDocumentoArquivo';

export type DocumentoGeradoRow = Database['public']['Tables']['documento_gerado']['Row'];

/**
 * O marco do registro na junta, gravado em `snapshot_dados.registroContratual`
 * no gesto de registrar. Cada campo é uma coisa distinta e nenhum deles é o NIRE
 * da sociedade: protocolo é o pedido à junta, arquivamento é o número que ela deu
 * ao ato, e a data do registro é a do deferimento. `arquivoId` aponta para a
 * linha de `documento_arquivo` do PDF efetivamente registrado; `confirmacaoId`
 * identifica ESTA confirmação, para um retry mandar a mesma coisa. O contrato
 * inteiro está em docs/osg/registro-contratual-atomico.md.
 *
 * O MÍNIMO que o banco cobra é `protocolo` + `dataRegistro`: é o que faz a peça
 * dizer qual registro a tornou oponível. O resto (arquivamento, junta, UF, PDF)
 * é opcional, porque a junta devolve cada coisa num dia, e entra depois por
 * `useCompletarRegistroContratual`, sobre a peça já registrada. A chave AUSENTE
 * é o "ainda não sei"; string vazia o banco recusa, e é por isso que o controller
 * omite o campo em branco em vez de mandá-lo vazio.
 *
 * Os dois obrigatórios são opcionais NO TIPO porque ele também descreve o que se
 * LÊ: linha registrada antes de 09/09/2026 pode não tê-los (e pode carregar
 * `dataInstrumento`/`dataProtocolo`, que saíram de v1). Quem escreve passa pelo
 * diálogo e pela trigger, e os dois cobram.
 */
export interface RegistroContratual {
  versao: 1;
  confirmacaoId: string;
  protocolo?: string;
  /** ISO `AAAA-MM-DD`. */
  dataRegistro?: string;
  numeroArquivamento?: string;
  juntaUf?: string;
  junta?: string;
  arquivoId?: string;
}

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
  /**
   * A proposta de alteração contratual confirmada no assistente: base, seleção,
   * antes/depois e abrangência. Só nas peças alteradoras. É o que faz reabrir o
   * assistente restaurar a seleção e o que denuncia valor mudado depois da
   * conferência (ver alteracaoPorEventos.ts).
   */
  propostaAC?: PropostaAC;
  /**
   * Os movimentos do livro que ESTA peça formaliza, congelados na validação.
   * `[]` declara que a peça não formaliza nenhum. O registro usa este conjunto,
   * e não a lista viva: um movimento lançado depois da validação não entra.
   */
  movimentosFormalizados?: string[];
  /** Preenchido pelo gesto de registrar; ausente antes dele. */
  registroContratual?: RegistroContratual;
}

// O documento_gerado é persistido pelo passo "Validar versão": ele encerra os
// cadastros e CONGELA os valores atuais (snapshot_flags/snapshot_dados) nesta
// versão. Sem ele não há documento_gerado_id e, portanto, não dá para ancorar
// um override de bloco. Aqui ficam o find-or-create do rascunho e a leitura dos
// overrides ativos que a composição aplica.

/**
 * O que a trilha de auditoria compara numa versão de documento.
 *
 * Fora daqui ficam os três `snapshot_*`: são blobs de jsonb do tamanho do
 * documento inteiro, e gravar o "antes e depois" deles em `changed_fields`
 * encheria a `audit_logs` sem dizer nada que a tela de versões já não diga.
 * `snapshot_validado_em` entra, e é ele que marca que houve re-congelamento.
 */
const DOCUMENTO_DIFF_FIELDS = [
  'status', 'documento_raiz_id', 'documento_anterior_id',
  'substitui_documento_id', 'snapshot_validado_em',
];

/**
 * Duas sessões (duas abas, dois cliques) validando a MESMA combinação ao mesmo
 * tempo: as duas leem "não há head" e as duas tentam criar a raiz. Antes as duas
 * passavam e a linhagem nascia partida em dois; agora os índices parciais
 * uq_documento_gerado_head_* barram a segunda com 23505.
 *
 * O que o usuário precisa saber não é o nome do índice, é que a tela dele está
 * velha — a versão já foi criada do outro lado.
 */
const UNIQUE_VIOLATION = '23505';
const DEADLOCK_DETECTED = '40P01';

function traduzirHeadDuplicada(erro: unknown): unknown {
  const codigo = (erro as { code?: string } | null)?.code;
  if (codigo !== UNIQUE_VIOLATION) return erro;
  return new Error(
    'Este documento já foi criado em outra aba ou por outra pessoa — recarregue a tela para continuar de lá.',
  );
}

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

/**
 * As sociedades do cliente que já existem na junta: `pj_pessoa_id` de todo
 * documento com `papel = 'constitutivo'` e `status = 'registrado'`.
 *
 * Uma consulta por cliente, e não uma por empresa, porque quem pergunta são
 * telas que já têm várias empresas na mão (o quadro societário, o modal da
 * subida). Rascunho e versão selada ficam de fora: nenhum dos dois foi à junta.
 */
export function useConstitutivosRegistrados(clienteId: string | null) {
  return useQuery({
    queryKey: ['constitutivos-registrados', clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('documento_gerado')
        .select('pj_pessoa_id')
        .eq('cliente_id', clienteId!)
        .eq('papel', 'constitutivo')
        .eq('status', 'registrado');
      if (error) throw error;
      return new Set(
        (data ?? []).map((d) => d.pj_pessoa_id).filter((id): id is string => !!id),
      );
    },
  });
}

/**
 * O marco do registro de uma peça registrada, sem arrastar o snapshot inteiro:
 * a coluna pesada é `snapshot_dados`, e o que esta tela quer dela é uma chave só.
 */
export interface PecaRegistrada {
  id: string;
  papel: string | null;
  createdAt: string;
  substituiDocumentoId: string | null;
  /** Null em peça registrada antes de o marco existir. */
  registro: RegistroContratual | null;
}

const COLUNAS_DA_PECA_REGISTRADA: string =
  'id, papel, created_at, substitui_documento_id, snapshot_dados->registroContratual';

/**
 * As peças da sociedade que JÁ foram à junta, da constituição à última alteração.
 *
 * Existe porque o marco do registro deixou de ser obrigatório no gesto: quem
 * registrou três atos com o protocolo ainda por sair precisa de um caminho de
 * volta a cada um deles, e a tela do gerador mostra uma peça só (a head da
 * combinação cliente+modelo+empresa). Sem esta lista, a peça registrada há dois
 * atos não tem por onde ser alcançada.
 */
export function useRegistradosDaSociedade(clienteId: string | null, pjPessoaId: string | null) {
  return useQuery({
    queryKey: ['registrados-da-sociedade', clienteId, pjPessoaId],
    enabled: !!clienteId && !!pjPessoaId,
    queryFn: async (): Promise<PecaRegistrada[]> => {
      const { data, error } = await supabase
        .from('documento_gerado')
        // `snapshot_dados->registroContratual` é seleção de caminho do PostgREST:
        // o jsonb inteiro de cada peça tem o tamanho do documento, e não é ele
        // que está sendo pedido. A lista vem numa `const` de tipo `string`
        // porque o tipo derivado do literal manda o compilador desdobrar a
        // projeção do jsonb e ele estoura ("type instantiation is excessively
        // deep"); o formato de volta é declarado no cast único abaixo.
        .select(COLUNAS_DA_PECA_REGISTRADA)
        .eq('cliente_id', clienteId!)
        .eq('pj_pessoa_id', pjPessoaId!)
        .eq('status', 'registrado')
        .order('created_at', { ascending: true });
      if (error) throw error;
      const linhas = (data ?? []) as unknown as Array<{
        id: string;
        papel: string | null;
        created_at: string;
        substitui_documento_id: string | null;
        registroContratual: RegistroContratual | null;
      }>;
      return linhas.map((l) => ({
        id: l.id,
        papel: l.papel,
        createdAt: l.created_at,
        substituiDocumentoId: l.substitui_documento_id,
        registro: l.registroContratual ?? null,
      }));
    },
  });
}

export interface SalvarDocumentoGeradoInput {
  clienteId: string;
  pjPessoaId: string | null;
  modeloId: string;
  /** Nome do modelo, só para a trilha de auditoria ficar legível. */
  nomeModelo: string;
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

/** Os dois papéis que uma peça pode exercer sobre a sociedade. */
export type PapelDocumento = 'constitutivo' | 'alterador';

/**
 * O papel da peça que está nascendo, ou null quando o modelo é de escopo avulso.
 *
 * Constitutivo é a primeira peça da sociedade, a que publica a existência dela;
 * alterador é a que sucede uma registrada. A distinção não pode morar no MODELO
 * porque a alteração contratual usa o MESMO modelo do contrato social que ela
 * substitui — quem responde é a peça, e é por isso que o carimbo é aqui.
 */
async function papelDaRaiz(
  modeloId: string,
  substituiDocumentoId: string | null | undefined,
  clienteId: string,
  pjPessoaId: string | null,
): Promise<PapelDocumento | null> {
  const { data: modelo, error } = await supabase
    .from('tmpl_documento')
    .select('escopo')
    .eq('id', modeloId)
    .single();
  if (error) throw error;
  if (modelo.escopo !== 'sociedade') return null;

  if (substituiDocumentoId) {
    // Nasceria ALTERADOR: a peça anterior só pode ser sucedida uma vez. Sem esta
    // leitura, duas linhagens apontam para o mesmo antecessor e as duas se
    // dizem a mesma alteração da sociedade (ver useOrdemNaSucessao). A tela não
    // oferece o gesto duas vezes, mas ela pode estar velha: a primeira alteração
    // pode ter nascido em outra aba depois que esta carregou.
    const { data: sucessor, error: erroSucessor } = await supabase
      .from('documento_gerado')
      .select('status')
      .eq('substitui_documento_id', substituiDocumentoId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (erroSucessor) throw erroSucessor;
    const trava = avaliarTravaDaSucessao(sucessor);
    if (!trava.liberado) throw new Error(trava.motivo!);
    return 'alterador';
  }

  // Nasceria CONSTITUTIVO: antes de carimbar, pergunte se a sociedade já não foi
  // constituída. Este é o ponto exato em que o segundo contrato social nascia,
  // porque a busca da head acima só enxerga rascunho: com a peça anterior
  // REGISTRADA, `head` vem nulo e o fluxo cai aqui como se fosse a primeira vez.
  const trava = await travaDoConstitutivoNoBanco(clienteId, pjPessoaId);
  if (!trava.liberado) throw new Error(trava.motivo!);
  return 'constitutivo';
}

/**
 * Relê do banco os fatos da trava e a avalia com a mesma função pura da tela.
 *
 * É a SEGUNDA leitura da regra, e não preciosismo: o rail pode estar com dado
 * velho (aberto numa aba enquanto a peça é registrada em outra), e estes são os
 * gestos que gravam. O hook não reimplementa a regra, relê o FATO.
 */
async function travaDoConstitutivoNoBanco(
  clienteId: string,
  pjPessoaId: string | null,
): Promise<TravaDoConstitutivo> {
  if (!pjPessoaId) return { liberado: true, motivo: null };

  const { data, error } = await supabase
    .from('documento_gerado')
    .select('pj_pessoa_id')
    .eq('cliente_id', clienteId)
    .eq('papel', 'constitutivo')
    .eq('status', 'registrado');
  if (error) throw error;
  const registrados = new Set(
    (data ?? []).map((d) => d.pj_pessoa_id).filter((id): id is string => !!id),
  );
  if (!registrados.has(pjPessoaId)) return { liberado: true, motivo: null };

  // A denominação só é buscada quando a trava vai morder: ela existe para a
  // frase dizer QUAL sociedade já foi constituída, e no caminho liberado (que é
  // o normal) seria uma consulta a mais por nada. Sem ela a frase ainda fecha.
  const { data: pessoa } = await supabase
    .from('pessoa')
    .select('denominacao')
    .eq('id', pjPessoaId)
    .maybeSingle();

  return avaliarTravaDoConstitutivo(
    { pessoaId: pjPessoaId, denominacao: pessoa?.denominacao ?? null },
    registrados,
  );
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
  const { logAction } = useAuditLog();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: SalvarDocumentoGeradoInput): Promise<DocumentoGeradoRow> => {
      const userId = user?.id ?? null;

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

      // Sem head: cria a raiz da linhagem. `documento_raiz_id` (= o próprio id)
      // é preenchido pelo trigger trg_documento_gerado_raiz, e não por um segundo
      // UPDATE daqui: o valor é função da própria linha, e a escrita extra podia
      // falhar e deixar raiz nula.
      if (!head) {
        // O PAPEL é carimbado aqui, no nascimento da linhagem, e daqui em diante
        // não muda: as versões o herdam pelo fork (`selar_e_forkar_documento`) e
        // mexer no modelo depois não reescreve peça já registrada.
        //
        // O escopo é lido do banco, e não recebido do chamador, porque é ele que
        // decide se a peça tem papel: quem grava a invariante não deveria depender
        // da tela ter passado o valor certo. Uma consulta só, no caminho raro.
        const papel = await papelDaRaiz(
          input.modeloId,
          input.substituiDocumentoId,
          input.clienteId,
          input.pjPessoaId,
        );

        const { data: comRaiz, error: erroInsert } = await supabase
          .from('documento_gerado')
          .insert({
            cliente_id: input.clienteId,
            pj_pessoa_id: input.pjPessoaId,
            documento_template_id: input.modeloId,
            status: 'rascunho',
            substitui_documento_id: input.substituiDocumentoId ?? null,
            papel,
            gerado_por_id: userId,
            ...snapshotCols,
          })
          .select('*')
          .single();
        if (erroInsert) throw traduzirHeadDuplicada(erroInsert);

        await logAction({
          area: 'osg',
          entity_type: 'documento_gerado',
          entity_id: comRaiz.id,
          entity_name: input.nomeModelo,
          action: 'created',
          details: input.substituiDocumentoId
            ? 'Primeira versão da alteração contratual'
            : 'Primeira versão validada',
          changed_fields: computeFieldDiff(null, comRaiz, DOCUMENTO_DIFF_FIELDS),
        });

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

        await logAction({
          area: 'osg',
          entity_type: 'documento_gerado',
          entity_id: data.id,
          entity_name: input.nomeModelo,
          action: 'updated',
          details: 'Recongelamento na mesma versão (atualização do cadastro)',
          changed_fields: computeFieldDiff(head, data, DOCUMENTO_DIFF_FIELDS),
        });

        return data as DocumentoGeradoRow;
      }

      // Head existe + commit deliberado: SELA a head atual e FORKA uma nova.
      //
      // Os três passos (selo, fork, cópia dos overrides) vivem numa transação só,
      // dentro de `selar_e_forkar_documento`. Feitos daqui, uma falha entre o
      // primeiro e o segundo deixava a linhagem SEM head rascunho, e o save
      // seguinte caía no ramo `if (!head)` e abria uma RAIZ nova: o histórico se
      // partia em duas linhagens, em silêncio.
      //
      // O selo grava os snapshots junto de propósito: a head renderiza ao vivo
      // (Biblioteca + overrides aplicados na composição), então o
      // snapshot_versoes_blocos dela fica defasado assim que um override muda.
      // Sem congelar aqui, a versão selada renderizaria o texto PRÉ-override,
      // porque o viewer de versão lê do snapshot e não dos cadastros.
      const { data: nova, error: erroFork } = await supabase.rpc('selar_e_forkar_documento', {
        _head_id: head.id,
        _snapshot_flags: input.snapshotFlags,
        _snapshot_dados: input.snapshotDados,
        _snapshot_versoes_blocos: input.snapshotVersoesBlocos,
        _validado_em: validadoEm,
      });
      if (erroFork) throw erroFork;
      if (!nova) throw new Error('A nova versão não foi criada — recarregue a tela.');

      await logAction({
        area: 'osg',
        entity_type: 'documento_gerado',
        entity_id: head.id,
        entity_name: input.nomeModelo,
        action: 'updated',
        details: 'Versão selada (não aceita mais edição)',
        changed_fields: { status: { old: head.status, new: 'revisao' } },
      });

      await logAction({
        area: 'osg',
        entity_type: 'documento_gerado',
        entity_id: nova.id,
        entity_name: input.nomeModelo,
        action: 'created',
        details: 'Nova versão a partir da anterior',
        changed_fields: computeFieldDiff(null, nova, DOCUMENTO_DIFF_FIELDS),
      });

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

// --- A proposta de alteração contratual -------------------------------------

export interface ConfirmarPropostaACInput {
  clienteId: string;
  pjPessoaId: string | null;
  modeloId: string;
  nomeModelo: string;
  /** O documento REGISTRADO que a alteração substitui. */
  documentoBaseId: string;
  /** Flags projetadas dos eventos confirmados (mais as derivadas e a da peça). */
  snapshotFlags: string[];
  /** `estadoProposto` + `propostaAC` (ver SnapshotDados). */
  snapshotDados: Json;
}

/**
 * Persiste a proposta confirmada no assistente como a HEAD em rascunho da
 * alteração, AINDA NÃO VALIDADA (`snapshot_validado_em` nulo).
 *
 * Antes a proposta não existia no banco: só as respostas booleanas em
 * `projeto_flag_valor`, e o documento nascia no "Validar versão" com o que o
 * cadastro tivesse naquele instante. Agora o que o consultor conferiu (base,
 * seleção, antes/depois, abrangência) fica gravado no ato de confirmar, e
 * reabrir o assistente lê daqui. A peça continua sendo criada uma vez só: se a
 * head da alteração já existe, a confirmação a ATUALIZA e a desvalida, porque
 * mudar a seleção muda o texto e ninguém conferiu o texto novo.
 */
export function useConfirmarPropostaAC() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: ConfirmarPropostaACInput): Promise<DocumentoGeradoRow> => {
      const userId = user?.id ?? null;
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

      const colunas = {
        snapshot_flags: input.snapshotFlags,
        snapshot_dados: input.snapshotDados,
        // O texto ainda não foi selado: sem blocos congelados e sem validação.
        snapshot_versoes_blocos: null,
        snapshot_validado_em: null,
      };

      if (!head) {
        const papel = await papelDaRaiz(input.modeloId, input.documentoBaseId, input.clienteId, input.pjPessoaId);
        if (papel !== 'alterador') {
          throw new Error('A proposta de alteração só nasce de um modelo societário sobre uma peça registrada.');
        }
        const { data, error } = await supabase
          .from('documento_gerado')
          .insert({
            cliente_id: input.clienteId,
            pj_pessoa_id: input.pjPessoaId,
            documento_template_id: input.modeloId,
            status: 'rascunho',
            substitui_documento_id: input.documentoBaseId,
            papel,
            gerado_por_id: userId,
            ...colunas,
          })
          .select('*')
          .single();
        if (error) throw traduzirHeadDuplicada(error);
        await logAction({
          area: 'osg',
          entity_type: 'documento_gerado',
          entity_id: data.id,
          entity_name: input.nomeModelo,
          action: 'created',
          details: 'Proposta de alteração contratual confirmada no assistente (ainda não validada)',
          changed_fields: computeFieldDiff(null, data, DOCUMENTO_DIFF_FIELDS),
        });
        return data as DocumentoGeradoRow;
      }

      if (head.substitui_documento_id !== input.documentoBaseId) {
        throw new Error('O rascunho em cena não sucede esta peça registrada: recarregue a tela.');
      }
      const { data, error } = await supabase
        .from('documento_gerado')
        .update({ ...colunas, updated_by: userId })
        .eq('id', head.id)
        .select('*')
        .single();
      if (error) throw error;
      await logAction({
        area: 'osg',
        entity_type: 'documento_gerado',
        entity_id: data.id,
        entity_name: input.nomeModelo,
        action: 'updated',
        details: 'Seleção de eventos da alteração reconfirmada: a versão volta a precisar de validação',
        changed_fields: computeFieldDiff(head, data, DOCUMENTO_DIFF_FIELDS),
      });
      return data as DocumentoGeradoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RASCUNHO_KEY] });
      queryClient.invalidateQueries({ queryKey: ['documento-versoes'] });
      queryClient.invalidateQueries({ queryKey: ['documento-sucessor'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao confirmar a alteração', description: error.message, variant: 'destructive' });
    },
  });
}

// --- Registro na junta: o documento vira peça travada -----------------------

export interface EnviarArquivoRegistradoInput {
  clienteId: string;
  /** A PJ da peça: o arquivo fica vinculado a ela e ao documento. */
  pjPessoaId: string;
  documentoGeradoId: string;
  file: File;
  fetchWithAuth: FetchWithAuth;
}

/**
 * Sobe o PDF efetivamente registrado na junta e grava a linha em
 * `documento_arquivo`, já aprovada e vinculada à peça e à PJ. É o passo que
 * NÃO cabe na transação do registro: o binário vai para o GCS antes, e o registro
 * só confirma depois de a referência existir. Se o registro falhar em seguida, o
 * arquivo fica gravado e o retry o reaproveita, em vez de subir outro.
 */
export function useEnviarArquivoRegistrado() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: EnviarArquivoRegistradoInput): Promise<string> => {
      const gcs = await subirArquivoGcs(input.fetchWithAuth, {
        clienteId: input.clienteId,
        file: input.file,
        categoria: 'societarios',
      });
      const agora = new Date().toISOString();
      const { data, error } = await supabase
        .from('documento_arquivo')
        .insert({
          cliente_id: input.clienteId,
          fonte: 'psa',
          categoria: 'societarios',
          pessoa_id: input.pjPessoaId,
          documento_gerado_id: input.documentoGeradoId,
          nome_original: input.file.name,
          gcs_uri: gcs.gcs_uri,
          checksum: gcs.checksum,
          mime: gcs.mime,
          tamanho: gcs.tamanho,
          status: 'ativo',
          ambiente: gcs.ambiente,
          // Quem registra a peça já conferiu o arquivo que a junta devolveu: a
          // revisão nasce aprovada, pela mesma pessoa, no mesmo gesto.
          revisao: 'aprovado',
          revisao_em: agora,
          revisao_por: user?.id ?? null,
          created_by: user?.id ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      await logAction({
        area: 'osg',
        entity_type: 'documento_arquivo',
        entity_id: data.id,
        entity_name: input.file.name,
        action: 'created',
        details: 'PDF registrado na junta, anexado à peça no gesto de registrar',
        changed_fields: {
          documento_gerado_id: { old: null, new: input.documentoGeradoId },
          revisao: { old: null, new: 'aprovado' },
        },
      });
      return data.id as string;
    },
    onSuccess: (_id, input) => {
      queryClient.invalidateQueries({ queryKey: ['documento-arquivo', input.clienteId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao enviar o arquivo registrado', description: error.message, variant: 'destructive' });
    },
  });
}

export interface RegistrarDocumentoInput {
  documentoGeradoId: string;
  /** O marco do registro, gravado junto com a virada de status. */
  registro: RegistroContratual;
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: RegistrarDocumentoInput): Promise<DocumentoGeradoRow> => {
      const userId = user?.id ?? null;

      // Segunda leitura da trava do constitutivo, agora no gesto irreversível.
      // Registrar é o que torna a peça oponível a terceiros, e é a hora em que um
      // segundo contrato social da mesma sociedade deixaria de ser rascunho.
      // Quem barrava aqui era o índice único
      // `documento_gerado_um_constitutivo_registrado`, e o consultor recebia a
      // mensagem crua do Postgres.
      const { data: peca, error: erroPeca } = await supabase
        .from('documento_gerado')
        .select('cliente_id, pj_pessoa_id, papel, status, snapshot_dados, snapshot_validado_em')
        .eq('id', input.documentoGeradoId)
        .maybeSingle();
      if (erroPeca) throw erroPeca;
      if (!peca) throw new Error('Este documento não existe mais: recarregue a tela.');
      const snapshotAtual = (peca.snapshot_dados as unknown as SnapshotDados | null) ?? null;
      // Retry da MESMA confirmação sobre a peça já registrada: o resultado é o
      // que já está lá. Confirmação diferente sobre peça registrada é conflito.
      if (peca.status === 'registrado') {
        if (snapshotAtual?.registroContratual?.confirmacaoId === input.registro.confirmacaoId) {
          const { data: registrado, error: erroLeitura } = await supabase
            .from('documento_gerado').select('*').eq('id', input.documentoGeradoId).single();
          if (erroLeitura) throw erroLeitura;
          return registrado as DocumentoGeradoRow;
        }
        throw new Error('Este documento já foi registrado com outra confirmação: recarregue a tela.');
      }
      if (peca.snapshot_validado_em == null) {
        throw new Error('Valide a versão antes de registrar: o texto ainda não foi selado.');
      }
      if (peca.papel === 'constitutivo') {
        const trava = await travaDoConstitutivoNoBanco(peca.cliente_id, peca.pj_pessoa_id);
        if (!trava.liberado) throw new Error(trava.motivo!);
      }

      // O snapshot vai INTEIRO de volta, só com o marco do registro a mais: é o
      // contrato da trigger `trg_documento_registro_atomico` (a peça não se
      // reescreve ao registrar). É ela quem, na mesma transação, valida o
      // snapshot e o arquivo, carimba os movimentos congelados, integraliza os
      // bens deles e grava a auditoria dos três; daqui não sai mais nenhuma
      // escrita depois do UPDATE.
      const snapshotComRegistro = {
        ...(snapshotAtual ?? {}),
        registroContratual: input.registro,
      } as unknown as Json;
      const { data, error } = await supabase
        .from('documento_gerado')
        .update({ status: 'registrado', snapshot_dados: snapshotComRegistro, updated_by: userId })
        .eq('id', input.documentoGeradoId)
        .eq('status', 'rascunho')
        .select('*')
        .maybeSingle();
      // A trava acima fecha a janela normal; sobra a corrida entre duas sessões
      // registrando ao mesmo tempo. Quem decide é o banco: o índice único do
      // constitutivo, ou a trigger, que recusa (23505) um segundo sucessor
      // registrado sobre a mesma base. Deadlock (40P01) é a mesma corrida vista
      // do outro lado: repetir com a mesma confirmação resolve.
      if (error) {
        const codigo = (error as { code?: string } | null)?.code;
        if (codigo === UNIQUE_VIOLATION) {
          throw new Error(
            'Outro instrumento desta sociedade acabou de ser registrado em outra aba ou por outra pessoa: recarregue a tela.',
          );
        }
        if (codigo === DEADLOCK_DETECTED) {
          throw new Error('Outro registro desta sociedade estava em curso ao mesmo tempo: tente de novo.');
        }
        throw error;
      }
      if (!data) {
        throw new Error('Este documento não está mais em rascunho — recarregue a tela.');
      }

      return data as DocumentoGeradoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RASCUNHO_KEY] });
      queryClient.invalidateQueries({ queryKey: ['documento-versoes'] });
      queryClient.invalidateQueries({ queryKey: ['documento-sucessor'] });
      // Registrar é o gesto que MUDA o fato lido pelas travas de ordem (a do
      // constitutivo e a da subida de quotas): a sociedade passa a existir na
      // junta. Sem esta invalidação as duas seguem lendo o mundo de antes.
      queryClient.invalidateQueries({ queryKey: ['constitutivos-registrados'] });
      // O banco carimbou os movimentos e integralizou os bens dentro do registro:
      // o livro, os aportes, as cessões e a lista de bens elegíveis mudaram sem
      // nenhuma escrita daqui. Sem estas invalidações a folha segue oferecendo
      // um imóvel que este ato já consumiu.
      queryClient.invalidateQueries({ queryKey: ['movimentos-da-empresa'] });
      queryClient.invalidateQueries({ queryKey: ['aportes-do-livro'] });
      queryClient.invalidateQueries({ queryKey: ['cessoes-do-livro'] });
      queryClient.invalidateQueries({ queryKey: ['integralizacoes-geracao'] });
      queryClient.invalidateQueries({ queryKey: ['mudancas-desde-registro'] });
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

export interface CompletarRegistroContratualInput {
  documentoGeradoId: string;
  /** O marco INTEIRO como fica depois da edição, sem a confirmação (ela é a da peça). */
  registro: Omit<RegistroContratual, 'versao' | 'confirmacaoId'>;
}

/**
 * Completa (ou corrige) o MARCO do registro de uma peça já registrada.
 *
 * É a única escrita que a peça registrada aceita, e a trigger
 * `trg_documento_registro_atomico` é quem garante isso: qualquer outro campo,
 * snapshot ou elo de linhagem que viaje no mesmo UPDATE derruba a operação com
 * "Documento registrado e imutavel". Aqui não há status, não há carimbo de
 * movimento e não há bem integralizado: isso aconteceu no registro, uma vez.
 *
 * Duas coisas não mudam depois: a `confirmacaoId` (a peça continua sendo o ato
 * que foi confirmado naquele gesto) e o `arquivoId` já eleito (o PDF chancelado
 * pode CHEGAR depois, mas trocar o que já foi conferido deixaria a peça
 * apontando para outro arquivo). Por isso as duas saem da peça, não do
 * formulário.
 *
 * A trilha é do BANCO: a trigger grava o `audit_logs` do antes e depois do marco
 * na mesma transação. Um `logAction` daqui duplicaria a linha (mesmo contrato de
 * docs/osg/registro-contratual-atomico.md).
 */
export function useCompletarRegistroContratual() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CompletarRegistroContratualInput): Promise<DocumentoGeradoRow> => {
      const { data: peca, error: erroPeca } = await supabase
        .from('documento_gerado')
        .select('status, snapshot_dados')
        .eq('id', input.documentoGeradoId)
        .maybeSingle();
      if (erroPeca) throw erroPeca;
      if (!peca) throw new Error('Este documento não existe mais: recarregue a tela.');
      if (peca.status !== 'registrado') {
        throw new Error('Os dados da junta pertencem à peça registrada: esta não está mais registrada, recarregue a tela.');
      }
      const snapshotAtual = (peca.snapshot_dados as unknown as SnapshotDados | null) ?? null;
      const anterior = snapshotAtual?.registroContratual ?? null;
      if (!anterior) {
        throw new Error('Esta peça foi registrada sem o marco do registro e não pode ser completada por aqui.');
      }
      // Campo em branco é campo AUSENTE: o banco recusa string vazia, e mandar
      // `''` gravaria "não tem protocolo" onde o consultor quis dizer "ainda não".
      const preenchidos: Record<string, string> = {};
      for (const [chave, valor] of Object.entries(input.registro)) {
        const texto = typeof valor === 'string' ? valor.trim() : '';
        if (texto) preenchidos[chave] = texto;
      }
      const marco: RegistroContratual = {
        ...preenchidos,
        versao: 1,
        confirmacaoId: anterior.confirmacaoId,
        ...(anterior.arquivoId ? { arquivoId: anterior.arquivoId } : {}),
      };
      const { data, error } = await supabase
        .from('documento_gerado')
        .update({
          snapshot_dados: { ...(snapshotAtual ?? {}), registroContratual: marco } as unknown as Json,
          updated_by: user?.id ?? null,
        })
        .eq('id', input.documentoGeradoId)
        .eq('status', 'registrado')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      // Zero linhas aqui não é falha: a trigger não escreve quando o marco novo
      // é igual ao que já está gravado (salvar duas vezes o mesmo). O estado
      // pedido é o estado atual, e é ele que volta.
      if (!data) {
        const { data: atual, error: erroLeitura } = await supabase
          .from('documento_gerado').select('*').eq('id', input.documentoGeradoId).single();
        if (erroLeitura) throw erroLeitura;
        return atual as DocumentoGeradoRow;
      }
      return data as DocumentoGeradoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RASCUNHO_KEY] });
      queryClient.invalidateQueries({ queryKey: ['documento-versoes'] });
      queryClient.invalidateQueries({ queryKey: ['documento-gerado-por-id'] });
      queryClient.invalidateQueries({ queryKey: ['registrados-da-sociedade'] });
      // A trilha da peça mudou, e ela é lida pelo histórico dos cadastros.
      queryClient.invalidateQueries({ queryKey: ['historico-cadastro'] });
      toast({ title: 'Dados do registro salvos' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar os dados do registro', description: error.message, variant: 'destructive' });
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
