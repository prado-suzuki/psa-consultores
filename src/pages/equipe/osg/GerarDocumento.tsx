import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  Database,
  Landmark,
  Layers,
  Loader2,
  Map as MapIcon,
  Pencil,
  PieChart,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  avaliarFlags,
  comporBlocos,
  gerarBlocos,
  marcarRealceDiff,
  removerMarcas,
  unirBlocos,
  type BlocoGerado,
  type FlagDeclarativa,
  type OrigemValor,
  type Template,
} from '@/lib/templates';
import { baixarDocx } from '@/lib/templates/docx';
import {
  campoDaEntidade,
  camposDaEntidade,
  derivarCampos,
  type CampoEntidade,
  type TipoEntidade,
} from '@/lib/templates/vocabulario';
import { conteudoParaDeteccao, detectarBindingsDeConteudo, labelDoBinding } from '@/lib/templates/binding';
import {
  calcularCapitalSociedade,
  mapearAdministrador,
  mapearIntegralizacoes,
  mapearQuadroSocietario,
  mapearRegistro,
  mapearSociedade,
  montarContexto,
  type ItemLista,
} from '@/lib/templates/mapeadores';
import { useQueryClient } from '@tanstack/react-query';
import { useModelos, useModeloBlocos } from '@/hooks/useModelosDocumento';
import { useBlocos, useFlags, type BlocoComVersao } from '@/hooks/useBibliotecaModelos';
import {
  useDocumentoGeradoRascunho,
  useDocumentoOverrides,
  useSalvarDocumentoGerado,
  type DocumentoGeradoRow,
  type OverrideAplicavel,
  type SnapshotDados,
} from '@/hooks/useDocumentoGerado';
import { OverrideBlocoDialog } from '@/components/equipe/osg/OverrideBlocoDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';
import { PessoaModal } from '@/components/equipe/osg/qualificacao-das-partes/PessoaModal';
import { BemModal } from '@/components/equipe/osg/diagnostico-patrimonial/BemModal';
import { MatriculaModal } from '@/components/equipe/osg/diagnostico-patrimonial/MatriculaModal';
import { useAllMatriculas, type BemRow, type MatriculaEnriched } from '@/hooks/useDiagnosticoPatrimonial';
import { PESSOA_LEGADA_PREFIX, useListasDaEmpresa, useRegistrosPorTipo } from '@/hooks/useGeracaoDocumento';
import {
  useAuditAutores,
  useMarcarNotificacoesVistas,
  useNotificacaoVisto,
  useNotificacoesDocumento,
} from '@/hooks/useNotificacoesDocumento';
import { formatChangedFields, type LookupMaps } from '@/components/equipe/audit/auditFieldFormatter';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { fmtBRL, fmtInt } from '@/components/equipe/osg/quadro-societario/quadroFmt';
import { fieldCls, labelCls, textareaCls } from '@/components/equipe/osg/formKit';
import { PassoCard, SeletorRail, OpcaoRail, type EstadoPasso } from '@/components/equipe/osg/gerar/gerarKit';
import { EscolhaModelo } from '@/components/equipe/osg/gerar/EscolhaModelo';
import { EscolhaEmpresa } from '@/components/equipe/osg/gerar/EscolhaEmpresa';
import { FolhaDocumento, type BlocoFolha, type EstadoFolha } from '@/components/equipe/osg/gerar/FolhaDocumento';
import { PainelAcoes } from '@/components/equipe/osg/gerar/PainelAcoes';

// --- Peças do painel de conferência ----------------------------------------

const SecaoPainel = ({
  icone,
  titulo,
  contagem,
  children,
}: {
  icone: ReactNode;
  titulo: string;
  contagem?: number;
  children: ReactNode;
}) => (
  <div className="space-y-2.5">
    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
      <span className="text-osg-600 [&>svg]:h-4 [&>svg]:w-4">{icone}</span>
      {titulo}
      {contagem != null && (
        <span className="ml-auto rounded-full bg-osg-100 px-1.5 py-px text-xs font-bold tabular-nums text-osg-700">
          {contagem}
        </span>
      )}
    </div>
    {children}
  </div>
);

const AvisoPendencia = ({
  children,
  acao,
  onAcao,
}: {
  children: ReactNode;
  acao?: string;
  onAcao?: () => void;
}) => (
  <div className="space-y-2 rounded-md border border-amber-300/70 bg-amber-50/70 p-3 text-sm text-amber-800">
    <div className="flex items-start gap-1.5">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
    {acao && (
      <Button
        variant="outline"
        size="sm"
        className="h-8 border-amber-300 bg-white text-sm text-amber-900 hover:bg-amber-100 hover:text-amber-900"
        onClick={onAcao}
      >
        {acao}
      </Button>
    )}
  </div>
);

// --- Aba "Notificações" do painel ------------------------------------------

const fmtDataNotificacao = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** Uma linha da lista de notificações (um campo alterado, ou um evento). */
interface LinhaNotificacao {
  key: string;
  texto: ReactNode;
  /** "Fulano · 16/06/2026 14:30" */
  meta: string;
}

const ListaNotificacoes = ({
  linhas,
  naoLidas,
  onMarcarLido,
  marcando,
}: {
  linhas: LinhaNotificacao[];
  naoLidas: number;
  onMarcarLido: () => void;
  marcando: boolean;
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-slate-500">
        {naoLidas > 0
          ? `${naoLidas} ${naoLidas > 1 ? 'alterações' : 'alteração'} desde a validação`
          : 'Tudo em dia desde a validação'}
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2 text-xs text-osg-600 hover:text-osg-800 disabled:opacity-40"
        onClick={onMarcarLido}
        disabled={naoLidas === 0 || marcando}
      >
        {marcando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Marcar como lido
      </Button>
    </div>
    {linhas.length === 0 ? (
      <p className="rounded-md border border-dashed border-osg-200/70 bg-osg-50/40 px-3 py-6 text-center text-sm text-slate-500">
        Nenhuma alteração desde a validação.
      </p>
    ) : (
      <ul className="space-y-2">
        {linhas.map((l) => (
          <li
            key={l.key}
            className="rounded-md border border-osg-200/60 bg-white px-3 py-2 text-sm shadow-sm shadow-osg-300/10"
          >
            <p className="leading-snug text-slate-700">{l.texto}</p>
            <p className="mt-1 text-xs text-slate-400">{l.meta}</p>
          </li>
        ))}
      </ul>
    )}
  </div>
);

// ----------------------------------------------------------------------------

const GerarDocumento = () => {
  const navigate = useNavigate();
  const { data: modelos = [], isLoading: carregandoModelos } = useModelos();
  const [modeloId, setModeloId] = useState<string | null>(null);
  const { data: docBlocos = [], isLoading: carregandoBlocos } = useModeloBlocos(modeloId);

  // Cliente vem da barra global da área OSG (igual aos cadastros).
  const { clienteId } = useOsgWork();
  const { registros, isFetching: carregandoRegistros } = useRegistrosPorTipo(clienteId);

  // selecao[binding][campoId] = valor; selecaoRegistroId[binding] = id do registro escolhido.
  const [selecao, setSelecao] = useState<Record<string, Record<string, string>>>({});
  const [registroPorBinding, setRegistroPorBinding] = useState<Record<string, string>>({});
  const [valoresLivres, setValoresLivres] = useState<Record<string, string>>({});
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  // Passo reaberto pelo botão "Trocar" (volta a fechar na próxima escolha).
  const [passoAberto, setPassoAberto] = useState<1 | 2 | null>(null);
  const [ajustesAbertos, setAjustesAbertos] = useState(false);
  // Seletor expandido no rail ao lado da folha (um por vez, estilo acordeão).
  const [railAberto, setRailAberto] = useState<'modelo' | 'empresa' | 'registros' | null>(null);
  // Aba do painel de conferência: a aba "Notificações" só existe com versão validada.
  const [aba, setAba] = useState<'conferencia' | 'notificacoes'>('conferencia');

  const queryClient = useQueryClient();
  const { data: catalogoBlocos = [] } = useBlocos();

  // Documento gerado (persistido pelo passo "Validar versão"): sem ele não há
  // como ancorar um override. Resolve o rascunho da combinação cliente+modelo+
  // empresa e o mantém em estado — a validação cria/atualiza e congela os valores.
  const [documentoGerado, setDocumentoGerado] = useState<DocumentoGeradoRow | null>(null);
  const { data: rascunho } = useDocumentoGeradoRascunho({
    clienteId: clienteId || null,
    modeloId,
    pjPessoaId: empresaId,
  });
  useEffect(() => {
    // O rascunho governa o estado: trocar de modelo/empresa re-resolve (ou zera).
    setDocumentoGerado(rascunho ?? null);
    const snap = rascunho?.snapshot_dados as unknown as SnapshotDados | null | undefined;
    if (snap) {
      setSelecao(snap.selecao ?? {});
      setRegistroPorBinding(snap.registroPorBinding ?? {});
      setValoresLivres(snap.valoresLivres ?? {});
      setEmpresaId(snap.empresaId ?? null);
    }
  }, [rascunho]);
  const documentoGeradoId = documentoGerado?.id ?? null;
  const documentoRaizId = documentoGerado?.documento_raiz_id ?? documentoGerado?.id ?? null;
  // Versão validada => prévia renderiza do snapshot, não dos cadastros vivos.
  const congelado = documentoGerado != null;
  const snapshotDados = (documentoGerado?.snapshot_dados as unknown as SnapshotDados | null | undefined) ?? null;
  const snapshotFlags = (documentoGerado?.snapshot_flags as string[] | null | undefined) ?? null;

  // Overrides ativos do documento: substituem o conteúdo do bloco-alvo na prévia.
  const { data: overrides } = useDocumentoOverrides(documentoGeradoId);
  const porBlocoAlvo = useMemo<Map<string, OverrideAplicavel>>(
    () => overrides?.porBlocoAlvo ?? new Map(),
    [overrides],
  );

  // Posições do modelo (tmpl_documento_bloco.id) cujo bloco-alvo tem override —
  // alimenta o selo "Ajustado neste documento" na prévia.
  const posicoesSobrescritas = useMemo(() => {
    const set = new Set<string>();
    docBlocos.forEach((b) => {
      if (b.bloco?.id && porBlocoAlvo.has(b.bloco.id)) set.add(b.id);
    });
    return set;
  }, [docBlocos, porBlocoAlvo]);

  // Template do engine: blocos do modelo com tipo, obrigatório e flags requeridas.
  // Para um bloco sobrescrito, mantemos posição/flags/tipo e só trocamos o
  // `conteudo` pelo texto do substituto — numeração/repetidores/placeholders
  // seguem inalterados (o override é aplicado fora do motor).
  const template = useMemo<Template>(() => {
    const blocos = docBlocos
      .filter((b) => b.bloco?.conteudo)
      .map((b) => {
        const ov = b.bloco?.id ? porBlocoAlvo.get(b.bloco.id) : undefined;
        return {
          id: b.id,
          tipo: b.bloco!.tipo,
          conteudo: ov ? ov.conteudoSubstituto : (b.bloco!.conteudo as string),
          obrigatorio: b.obrigatorio,
          flagsRequeridas: b.bloco!.flags,
          repeteColecao: b.bloco!.repete_colecao ?? undefined,
          ancora: b.bloco!.ancora ?? undefined,
        };
      });
    return { id: modeloId ?? 'novo', nome: 'documento', blocos };
  }, [docBlocos, modeloId, porBlocoAlvo]);

  // Espelho do template SEM os overrides: usado só para diferenciar, por palavra,
  // o que cada bloco sobrescrito mudou em relação ao original (realce na prévia).
  // Sem nenhum override, reaproveita o próprio `template` (não renderiza de novo).
  const templateOriginal = useMemo<Template>(() => {
    if (posicoesSobrescritas.size === 0) return template;
    const blocos = docBlocos
      .filter((b) => b.bloco?.conteudo)
      .map((b) => ({
        id: b.id,
        tipo: b.bloco!.tipo,
        conteudo: b.bloco!.conteudo as string,
        obrigatorio: b.obrigatorio,
        flagsRequeridas: b.bloco!.flags,
        repeteColecao: b.bloco!.repete_colecao ?? undefined,
        ancora: b.bloco!.ancora ?? undefined,
      }));
    return { id: modeloId ?? 'novo', nome: 'documento', blocos };
  }, [docBlocos, modeloId, posicoesSobrescritas, template]);

  const nomePorBlocoId = useMemo(
    () => new Map(docBlocos.map((b) => [b.id, b.bloco?.nome ?? b.id])),
    [docBlocos],
  );
  // Posição no modelo → bloco da Biblioteca, para a edição a partir da prévia.
  const bibliotecaIdPorBlocoId = useMemo(
    () => new Map(docBlocos.map((b) => [b.id, b.bloco?.id ?? null])),
    [docBlocos],
  );

  // Edição de bloco direto da prévia: agora é um OVERRIDE escopado ao documento.
  // Clicar num trecho abre o popover e, dele, o OverrideBlocoDialog — que edita o
  // texto só deste documento (o bloco original da Biblioteca permanece intacto).
  const salvarDocumento = useSalvarDocumentoGerado();
  const [blocoOverrideAlvo, setBlocoOverrideAlvo] = useState<BlocoComVersao | null>(null);
  // Bloco que o usuário tentou ajustar antes de validar — reaberto após validar.
  const [blocoPendente, setBlocoPendente] = useState<BlocoComVersao | null>(null);
  const [validarConfirmOpen, setValidarConfirmOpen] = useState(false);
  // Confirmação do commit deliberado ("Atualizar versão" → sela a atual + nova).
  const [novaVersaoConfirmOpen, setNovaVersaoConfirmOpen] = useState(false);
  const [gatingPromptOpen, setGatingPromptOpen] = useState(false);
  // Marca que o usuário editou explicitamente enquanto congelado => re-congelar.
  const [recongelarPendente, setRecongelarPendente] = useState(false);

  // Persiste o snapshot. novaVersao=true (commit deliberado "Atualizar versão")
  // sela a versão atual e cria uma nova; false (1ª validação / re-congelar ao
  // editar) cria a raiz ou atualiza a head no lugar.
  const validarVersao = async (novaVersao = false): Promise<DocumentoGeradoRow | null> => {
    if (!clienteId || !modeloId) return null;
    const snap: SnapshotDados = {
      selecao,
      registroPorBinding,
      valoresLivres,
      empresaId,
      itensPorLista,
      total: usaTotalSocios
        ? {
            quotas: quadro.total.quotas ?? '',
            vlrTotal: quadro.total.vlrTotal ?? '',
            percentual: quadro.total.percentual ?? '',
          }
        : null,
    };
    const doc = await salvarDocumento.mutateAsync({
      clienteId,
      pjPessoaId: empresaId,
      modeloId,
      snapshotFlags: flagsAtivas,
      snapshotDados: snap as unknown as Json,
      // Texto dos blocos já resolvido (com overrides) — congela o render da versão.
      snapshotVersoesBlocos: template.blocos as unknown as Json,
      novaVersao,
    });
    setDocumentoGerado(doc);
    return doc;
  };

  // "Revalidar": descarta o congelamento e refaz o snapshot com os cadastros atuais.
  const revalidar = async () => {
    if (!clienteId || !modeloId) return;

    const selecaoFresh: Record<string, Record<string, string>> = { ...selecao };
    for (const b of bindings) {
      if (b.tipo === 'sociedade') {
        selecaoFresh[b.nome] = empresaRow ? mapearSociedade(empresaRow, { capitalValor, totalQuotas }) : {};
        continue;
      }
      const id = registroPorBinding[b.nome];
      const reg = id ? registros[b.tipo].find((r) => r.id === id) : undefined;
      if (reg) selecaoFresh[b.nome] = mapearRegistro(b.tipo, reg.row);
    }

    // Se os flags mudarem a estrutura, repuxa os bindings da estrutura congelada;
    // trocar modelo/empresa ainda força uma remontagem estrutural completa.
    const snap: SnapshotDados = {
      selecao: selecaoFresh,
      registroPorBinding,
      valoresLivres,
      empresaId,
      itensPorLista,
      total: usaTotalSocios
        ? {
            quotas: quadro.total.quotas ?? '',
            vlrTotal: quadro.total.vlrTotal ?? '',
            percentual: quadro.total.percentual ?? '',
          }
        : null,
    };
    const doc = await salvarDocumento.mutateAsync({
      clienteId,
      pjPessoaId: empresaId,
      modeloId,
      snapshotFlags: flagsAtivasLive,
      snapshotDados: snap as unknown as Json,
      snapshotVersoesBlocos: template.blocos as unknown as Json,
      // Re-sync de dados na mesma versão — não ramifica.
      novaVersao: false,
    });
    setSelecao(selecaoFresh);
    setDocumentoGerado(doc);
  };

  useEffect(() => {
    if (!congelado || !recongelarPendente) return;
    void validarVersao()
      .catch(() => undefined)
      .finally(() => setRecongelarPendente(false));
    // Gatilho one-shot: dispara o re-congelamento quando recongelarPendente vira
    // true e se auto-reseta. validarVersao é recriada a cada render e lê o estado
    // atual no momento da chamada — incluí-la nas deps só causaria re-disparos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [congelado, recongelarPendente]);

  const confirmarValidacao = async () => {
    await validarVersao();
    setValidarConfirmOpen(false);
  };

  // "Atualizar versão": sela a versão atual (preservada) e abre uma nova a partir
  // dela. setDocumentoGerado já passa a apontar para a head nova.
  const confirmarNovaVersao = async () => {
    const doc = await validarVersao(true);
    setNovaVersaoConfirmOpen(false);
    if (doc) {
      toast({
        title: 'Nova versão criada',
        description: 'A versão anterior foi preservada — você continua editando na versão nova.',
      });
    }
  };

  // A partir do prompt de gating: valida e, em seguida, reabre o editor no bloco
  // que o usuário havia clicado.
  const confirmarValidacaoEAbrirBloco = async () => {
    const doc = await validarVersao();
    setGatingPromptOpen(false);
    if (doc && blocoPendente) {
      setBlocoOverrideAlvo(blocoPendente);
      setBlocoPendente(null);
    }
  };

  const editarBlocoNaPrevia = (b: BlocoFolha) => {
    const bloco = b.blocoId ? (catalogoBlocos.find((x) => x.id === b.blocoId) ?? null) : null;
    if (!bloco) return;
    // Sem versão validada, conduz à validação em vez de bloquear passivamente.
    if (!documentoGeradoId) {
      setBlocoPendente(bloco);
      setGatingPromptOpen(true);
      return;
    }
    setBlocoOverrideAlvo(bloco);
  };

  // Edição de cadastro direto da prévia: clicar num VALOR (proveniência do
  // render) abre o modal do cadastro de origem por cima da tela — pessoa/empresa,
  // bem ou matrícula, conforme de onde o valor veio.
  const [pessoaEditando, setPessoaEditando] = useState<PessoaRow | null>(null);
  const [bemEditando, setBemEditando] = useState<BemRow | null>(null);
  const [matriculaEditando, setMatriculaEditando] = useState<MatriculaEnriched | null>(null);
  // Registro recém-editado cujos bindings unitários precisam ser re-mapeados
  // quando o refetch de registros chegar (a selecao é um snapshot).
  const [origemPendenteRemap, setOrigemPendenteRemap] = useState<string | null>(null);

  // Flags derivadas declarativas avaliadas sobre a empresa selecionada.
  const { data: catalogoFlags = [] } = useFlags();
  const temBlocosComFlags = template.blocos.some((b) => (b.flagsRequeridas ?? []).length > 0);
  const empresaRow = useMemo(
    () => (empresaId ? (registros.pessoa.find((r) => r.id === empresaId)?.row as PessoaRow | undefined) : undefined),
    [registros.pessoa, empresaId],
  );
  const flagsAtivasLive = useMemo(() => {
    const declarativas: FlagDeclarativa[] = catalogoFlags
      .filter((f) => f.entidade && f.campo && f.valor)
      .map((f) => ({ nome: f.nome, entidade: f.entidade!, campo: f.campo!, valor: f.valor! }));
    return avaliarFlags(declarativas, { empresa: empresaRow });
  }, [catalogoFlags, empresaRow]);
  // Quando congelado, a estrutura segue os flags gravados; senão, os vivos.
  const flagsAtivas = useMemo(
    () => (congelado && snapshotFlags ? snapshotFlags : flagsAtivasLive),
    [congelado, snapshotFlags, flagsAtivasLive],
  );

  // Composição: blocos que efetivamente entram com as flags atuais. A detecção
  // de bindings roda SOBRE OS COMPOSTOS — bloco excluído não pede seleção.
  const blocosCompostos = useMemo(() => comporBlocos(template, flagsAtivas), [template, flagsAtivas]);
  const blocosExcluidos = useMemo(
    () => template.blocos.filter((b) => !blocosCompostos.includes(b)),
    [template, blocosCompostos],
  );

  // Bloco repetidor entra na detecção embrulhado na própria seção (os campos do
  // item ficam no escopo da lista; a coleção entra como lista a carregar).
  const { bindings, listas, desconhecidos, secoesDesconhecidas, campos: placeholders } = useMemo(
    () => detectarBindingsDeConteudo(blocosCompostos.map(conteudoParaDeteccao).join(' ')),
    [blocosCompostos],
  );

  // Listas relacionais (sócios/administradores) carregam da empresa escolhida;
  // a empresa também alimenta as flags, então o passo aparece em ambos os casos.
  const usaListas = listas.length > 0;
  // A "Sociedade" (objeto do contrato) é dirigida pela mesma Empresa que alimenta
  // listas e flags — não tem seletor próprio. Detectar aqui faz o passo de Empresa
  // aparecer mesmo num modelo que só usa sociedade.* (sem listas nem flags).
  const temSociedade = bindings.some((b) => b.tipo === 'sociedade');
  const precisaEmpresa = usaListas || temBlocosComFlags || temSociedade;
  // A sociedade também precisa das listas: capital social e total de quotas são
  // calculados das integralizações (PR) ou do quadro societário (demais). Na PR
  // os próprios sócios são derivados das integralizações (daí o tipo da empresa).
  const { socios, administradores, integralizacoes, isFetching: carregandoListas } = useListasDaEmpresa(
    usaListas || temSociedade ? empresaId : null,
    empresaRow?.tipo_empresa,
  );
  const carregandoListasEfetivo = carregandoListas && !(congelado && snapshotDados?.itensPorLista);
  const ehEmpresaPR = empresaRow?.tipo_empresa === 'PR';
  // Sócios derivados de titular sem pessoa cadastrada: qualificação sai incompleta.
  const sociosSemCadastro = useMemo(
    () => socios.filter((s) => s.pessoa.id?.startsWith(PESSOA_LEGADA_PREFIX)),
    [socios],
  );

  // `socio.percentual` e a linha `total` são derivados (calculados aqui, não vêm
  // do banco): dependem da soma das quotas, que só existe no nível da lista.
  const quadro = useMemo(() => mapearQuadroSocietario(socios), [socios]);
  const itensPorLista = useMemo<Record<string, ItemLista[]>>(
    () => ({
      socios: quadro.itens,
      administradores: administradores.map(mapearAdministrador),
      integralizacoes: mapearIntegralizacoes(socios, integralizacoes),
    }),
    [quadro, socios, administradores, integralizacoes],
  );

  // --- Notificações de mudança de variável (só com versão validada) ---------

  // Conjunto de cadastros que hidratam ESTE documento. Usa o lado VIVO (não o
  // snapshot — a proveniência viaja como Symbol e some no JSON, perdendo os ids):
  // a janela compara `audit_logs.entity_id` contra este conjunto. Tier 1 (ids
  // diretos) + Tier 2 (linhas relacionais quadro/administração/titularidade).
  const entidadeIds = useMemo(() => {
    const ids = new Set<string>();
    if (empresaId) ids.add(empresaId); // sociedade / empresa (pessoa PJ)
    Object.values(registroPorBinding).forEach((id) => id && ids.add(id)); // bindings unitários
    socios.forEach((s) => {
      if (s.pessoa.id && !s.pessoa.id.startsWith(PESSOA_LEGADA_PREFIX)) ids.add(s.pessoa.id);
      if (s.quadroSocietarioId) ids.add(s.quadroSocietarioId);
    });
    administradores.forEach((a) => {
      if (a.pessoa.id) ids.add(a.pessoa.id);
      if (a.administracaoId) ids.add(a.administracaoId);
    });
    integralizacoes.forEach((m) => {
      if (m.id) ids.add(m.id);
      m.titularidadeIds?.forEach((tid) => ids.add(tid));
      m.titulares.forEach((t) => {
        if (t.pessoaId && !t.pessoaId.startsWith(PESSOA_LEGADA_PREFIX)) ids.add(t.pessoaId);
      });
    });
    return [...ids];
  }, [empresaId, registroPorBinding, socios, administradores, integralizacoes]);

  const validadoEm = documentoGerado?.snapshot_validado_em ?? null;
  const { data: vistoEm = null } = useNotificacaoVisto(documentoGeradoId);
  const { data: notificacoes = [] } = useNotificacoesDocumento({
    documentoGeradoId,
    validadoEm,
    vistoEm,
    entidadeIds,
  });
  const marcarVistas = useMarcarNotificacoesVistas();
  const { data: autorPorId = {} } = useAuditAutores();
  // Tudo que volta na janela é, por construção, "não-lido".
  const naoLidas = notificacoes.length;
  // A aba "Notificações" só existe com versão validada.
  const abaEfetiva = documentoGeradoId ? aba : 'conferencia';

  // Ao validar (ou abrir um documento) com mudanças pendentes, destaca a aba
  // uma única vez — sem brigar com o usuário se ele voltar para "Conferência".
  const autoAbertoRef = useRef<string | null>(null);
  useEffect(() => {
    if (!documentoGeradoId) {
      autoAbertoRef.current = null;
      setAba('conferencia');
      return;
    }
    if (naoLidas > 0 && autoAbertoRef.current !== documentoGeradoId) {
      autoAbertoRef.current = documentoGeradoId;
      setAba('notificacoes');
    }
  }, [documentoGeradoId, naoLidas]);

  // FIELD_LABELS/formatValue resolvem os rótulos/valores; só `profiles` importa
  // (autores) — os demais lookups da auditoria não se aplicam aos campos OSG.
  const lookupsNotificacao = useMemo<LookupMaps>(
    () => ({ profiles: autorPorId, projects: {}, areas: {}, clients: {}, contribuintes: {}, servicos: {}, tasks: {} }),
    [autorPorId],
  );
  const linhasNotificacao = useMemo<LinhaNotificacao[]>(() => {
    const out: LinhaNotificacao[] = [];
    for (const log of notificacoes) {
      const autor = autorPorId[log.performed_by] ?? 'Alguém';
      const meta = `${autor} · ${fmtDataNotificacao.format(new Date(log.performed_at))}`;
      const nome = <em className="not-italic font-medium text-slate-600">{log.entity_name}</em>;
      if (log.action === 'deleted') {
        out.push({ key: log.id, texto: <>{nome} removido do cadastro</>, meta });
        continue;
      }
      if (log.action === 'created') {
        out.push({ key: log.id, texto: <>{nome} adicionado ao cadastro</>, meta });
        continue;
      }
      // updated: uma linha por campo alterado (modelo de evento — só o valor novo).
      const mudancas = log.changed_fields ? formatChangedFields(log.changed_fields, lookupsNotificacao) : [];
      if (mudancas.length === 0) {
        out.push({ key: log.id, texto: <>{nome} atualizado</>, meta });
        continue;
      }
      mudancas.forEach((m, i) => {
        out.push({
          key: `${log.id}:${i}`,
          texto: (
            <>
              <span className="font-semibold text-slate-700">{m.label}</span> de {nome} alterado para{' '}
              <span className="font-semibold text-osg-700">{m.newValue}</span>
            </>
          ),
          meta,
        });
      });
    }
    return out;
  }, [notificacoes, autorPorId, lookupsNotificacao]);

  // `total.*` é injetado automaticamente quando há a lista de sócios; não deve
  // virar campo de texto livre na UI (seria editável e ignorado).
  const usaTotalSocios = listas.some((l) => l.nome === 'socios');
  const desconhecidosVisiveis = useMemo(
    () => (usaTotalSocios ? desconhecidos.filter((ph) => !ph.startsWith('total.')) : desconhecidos),
    [usaTotalSocios, desconhecidos],
  );

  // Campos editáveis (base, não-derivados) de cada binding, conforme o que o modelo referencia.
  const camposPorBinding = useMemo<Record<string, CampoEntidade[]>>(() => {
    const refs = new Map<string, Set<string>>();
    for (const ph of placeholders) {
      const ponto = ph.indexOf('.');
      if (ponto < 0) continue;
      const nome = ph.slice(0, ponto);
      const campoId = ph.slice(ponto + 1);
      if (!bindings.some((b) => b.nome === nome)) continue;
      if (!refs.has(nome)) refs.set(nome, new Set());
      refs.get(nome)!.add(campoId);
    }
    const out: Record<string, CampoEntidade[]> = {};
    for (const b of bindings) {
      const referenciados = refs.get(b.nome) ?? new Set<string>();
      const vistos = new Set<string>();
      const lista: CampoEntidade[] = [];
      const adicionar = (c: CampoEntidade) => {
        if (!vistos.has(c.id)) {
          vistos.add(c.id);
          lista.push(c);
        }
      };
      for (const campoId of referenciados) {
        const campo = campoDaEntidade(b.tipo, campoId);
        if (campo?.derivadoDe) {
          // Derivados compostos (ex.: qualificação) listam vários campos-base.
          const bases = Array.isArray(campo.derivadoDe) ? campo.derivadoDe : [campo.derivadoDe];
          for (const baseId of bases) {
            const base = campoDaEntidade(b.tipo, baseId);
            if (base) adicionar(base);
          }
        } else if (campo) {
          adicionar(campo);
        } else {
          // Campo referenciado fora do catálogo: vira input de texto livre sob o binding.
          adicionar({ id: campoId, label: campoId, tipo: 'texto' });
        }
      }
      // Ordena conforme o catálogo da entidade (campos fora dele vão ao fim).
      const ordem = camposDaEntidade(b.tipo).map((c) => c.id);
      lista.sort((a, z) => {
        const ia = ordem.indexOf(a.id);
        const iz = ordem.indexOf(z.id);
        return (ia < 0 ? Infinity : ia) - (iz < 0 ? Infinity : iz);
      });
      out[b.nome] = lista;
    }
    return out;
  }, [placeholders, bindings]);

  // Trocar de modelo ou de cliente zera as seleções.
  useEffect(() => {
    setSelecao({});
    setRegistroPorBinding({});
    setValoresLivres({});
    setEmpresaId(null);
    setRecongelarPendente(false);
  }, [modeloId, clienteId]);

  // Capital social + total de quotas da sociedade: PR soma as integralizações
  // aprovadas (quota = R$ 1,00); demais somam o quadro societário.
  const { capitalValor, totalQuotas } = useMemo(
    () => calcularCapitalSociedade(empresaRow, socios, integralizacoes),
    [empresaRow, socios, integralizacoes],
  );

  // A Sociedade (objeto do contrato) espelha a Empresa selecionada: escolher/trocar
  // a empresa (ou carregar o capital calculado) repreenche os campos sociedade.* do
  // cadastro (editáveis depois); sem empresa, ficam em branco. Não tem seletor de
  // registro próprio. Deps primitivas: as listas trocam de identidade a cada render
  // enquanto carregam — depender delas aqui criaria loop de setState.
  useEffect(() => {
    if (congelado) return; // congelado: a sociedade vem do snapshot hidratado
    const sociedadeBindings = bindings.filter((b) => b.tipo === 'sociedade');
    if (sociedadeBindings.length === 0) return;
    const campos = empresaRow ? mapearSociedade(empresaRow, { capitalValor, totalQuotas }) : {};
    setSelecao((prev) => {
      const next = { ...prev };
      for (const b of sociedadeBindings) next[b.nome] = campos;
      return next;
    });
  }, [empresaRow, bindings, capitalValor, totalQuotas, congelado]);

  const escolherRegistro = (nome: string, tipo: TipoEntidade, registroId: string) => {
    const reg = registros[tipo].find((r) => r.id === registroId);
    if (!reg) return;
    setRegistroPorBinding((prev) => ({ ...prev, [nome]: registroId }));
    setSelecao((prev) => ({ ...prev, [nome]: mapearRegistro(tipo, reg.row) }));
    setPassoAberto(null);
    if (congelado) setRecongelarPendente(true);
  };

  const editarCampo = (nome: string, tipo: TipoEntidade, campoId: string, valor: string) => {
    setSelecao((prev) => {
      const atual = { ...(prev[nome] ?? {}), [campoId]: valor };
      return { ...prev, [nome]: derivarCampos(tipo, atual) };
    });
    if (congelado) setRecongelarPendente(true);
  };

  // --- Valores clicáveis na prévia ------------------------------------------

  // Matrículas enriquecidas do cliente, para o MatriculaModal aberto da prévia —
  // mesmo escopo do Controle de Matrículas: o bem é do cliente OU um titular é.
  const { data: todasMatriculas = [] } = useAllMatriculas();
  const matriculasDoCliente = useMemo(
    () =>
      clienteId
        ? todasMatriculas.filter(
            (m) => m.bem_cliente_id === clienteId || m.titular_cliente_ids.includes(clienteId),
          )
        : [],
    [todasMatriculas, clienteId],
  );

  // Pessoa e sociedade são linhas do mesmo cadastro (PessoaRow); sócio derivado
  // de titular sem cadastro (id "legado:…") não está em registros.pessoa e fica
  // sem clique. Cartório ainda não carrega origem.
  const origemClicavel = (o: OrigemValor) => {
    switch (o.tipo) {
      case 'pessoa':
      case 'sociedade':
        return registros.pessoa.some((r) => r.id === o.id);
      case 'bem':
        return registros.bem.some((r) => r.id === o.id);
      case 'matricula':
        return matriculasDoCliente.some((m) => m.id === o.id);
      default:
        return false;
    }
  };

  const abrirCadastroOrigem = (o: OrigemValor) => {
    if (o.tipo === 'pessoa' || o.tipo === 'sociedade') {
      const reg = registros.pessoa.find((r) => r.id === o.id);
      if (reg) setPessoaEditando(reg.row as PessoaRow);
    } else if (o.tipo === 'bem') {
      const reg = registros.bem.find((r) => r.id === o.id);
      if (reg) setBemEditando(reg.row as BemRow);
    } else if (o.tipo === 'matricula') {
      const m = matriculasDoCliente.find((mat) => mat.id === o.id);
      if (m) setMatriculaEditando(m);
    }
  };

  const fecharCadastroOrigem = (id: string | null | undefined) => {
    setPessoaEditando(null);
    setBemEditando(null);
    setMatriculaEditando(null);
    if (!id) return;
    // O modal não distingue salvar de cancelar — refetch incondicional (barato).
    // Os hooks de upsert já invalidam os próprios cadastros ('pessoas-by-cliente',
    // 'bens-by-cliente', 'matriculas-all'…); as listas da geração têm chaves próprias.
    setOrigemPendenteRemap(id);
    for (const key of [
      'socios-geracao',
      'socios-geracao-pr',
      'administradores-geracao',
      'integralizacoes-geracao',
      'matriculas-geracao',
    ]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  // Bindings unitários guardam um SNAPSHOT do registro em `selecao` — depois de
  // editar o cadastro, re-mapeia os que apontam para ele assim que o refetch
  // chega (roda a cada atualização de registros até assentar; edições manuais
  // daquele binding são substituídas pelo cadastro novo, de propósito).
  useEffect(() => {
    if (congelado) {
      setOrigemPendenteRemap(null);
      return;
    }
    if (!origemPendenteRemap) return;
    setSelecao((prev) => {
      let next: typeof prev | null = null;
      for (const b of bindings) {
        // Sociedade re-deriva sozinha do useEffect de empresaRow.
        if (b.tipo === 'sociedade' || registroPorBinding[b.nome] !== origemPendenteRemap) continue;
        const reg = registros[b.tipo].find((r) => r.id === origemPendenteRemap);
        if (!reg) continue;
        next = next ?? { ...prev };
        next[b.nome] = mapearRegistro(b.tipo, reg.row);
      }
      return next ?? prev;
    });
    if (!carregandoRegistros) setOrigemPendenteRemap(null);
  }, [origemPendenteRemap, registros, carregandoRegistros, bindings, registroPorBinding, congelado]);

  const resultado = useMemo<
    { blocos: BlocoGerado[]; texto: string; erro: null } | { blocos: null; texto: null; erro: string }
  >(() => {
    if (template.blocos.length === 0) return { blocos: [], texto: '', erro: null };
    try {
      // Texto livre: todo placeholder sem binding resolve em branco quando vazio,
      // para a prévia não travar antes de preencher (diferente dos bindings, que
      // exigem seleção de registro).
      const livres = Object.fromEntries(desconhecidosVisiveis.map((ph) => [ph, valoresLivres[ph] ?? '']));
      // Seções desconhecidas resolvem como '' (falsy): o trecho sai da prévia sem travar.
      for (const nome of secoesDesconhecidas) livres[nome] = livres[nome] ?? '';
      // Snapshot antigo sem itensPorLista/total cai para a fonte viva até revalidar.
      const itensEfetivo = congelado ? (snapshotDados?.itensPorLista ?? itensPorLista) : itensPorLista;
      const totalEfetivo = congelado ? (snapshotDados?.total ?? quadro.total) : quadro.total;
      const ctx = montarContexto(bindings, selecao, livres, itensEfetivo, listas);
      // Total dos sócios: campos em branco mantêm a prévia viva antes de a empresa
      // ser escolhida; preenchem quando as quotas carregam.
      if (usaTotalSocios) ctx.total = { quotas: '', vlrTotal: '', percentual: '', ...totalEfetivo };
      const blocos = gerarBlocos(template, ctx, flagsAtivas);
      const texto = unirBlocos(blocos);

      // Blocos sobrescritos: renderiza os MESMOS blocos com o conteúdo original
      // (mesmo ctx → numeração/placeholders idênticos) e marca, por palavra, só o
      // que mudou. Sem overrides, nada é renderizado a mais.
      if (posicoesSobrescritas.size === 0) return { blocos, texto, erro: null };
      const original = gerarBlocos(templateOriginal, ctx, flagsAtivas);
      const textoOriginalPorId = new Map(original.map((b) => [b.id, b.conteudo]));
      const comRealce = blocos.map((b) => {
        const posId = b.instanciaDe ?? b.id;
        const orig = textoOriginalPorId.get(b.id);
        if (!posicoesSobrescritas.has(posId) || orig == null) return b;
        return { ...b, segmentos: marcarRealceDiff(b.segmentos, orig) };
      });
      return { blocos: comRealce, texto, erro: null };
    } catch (e) {
      return { blocos: null, texto: null, erro: e instanceof Error ? e.message : String(e) };
    }
  }, [template, templateOriginal, posicoesSobrescritas, bindings, selecao, valoresLivres, desconhecidosVisiveis, secoesDesconhecidas, itensPorLista, listas, usaTotalSocios, quadro, flagsAtivas, congelado, snapshotDados]);

  const copiar = async () => {
    if (!resultado.texto) return;
    // Texto puro na área de transferência: as marcas (*, _, ~) saem.
    await navigator.clipboard.writeText(removerMarcas(resultado.texto));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const nomeModelo = useMemo(
    () => modelos.find((m) => m.id === modeloId)?.nome ?? 'documento',
    [modelos, modeloId],
  );

  const [baixando, setBaixando] = useState(false);
  const baixar = async () => {
    if (!resultado.blocos?.length) return;
    setBaixando(true);
    try {
      await baixarDocx(nomeModelo, resultado.blocos);
    } finally {
      setBaixando(false);
    }
  };

  // Bindings ainda não preenchidos (sem registro escolhido e sem edição manual):
  // a prévia só resolve depois de ligar um registro a cada entidade.
  const bindingsPendentes = bindings.filter(
    (b) =>
      b.tipo !== 'sociedade' &&
      !registroPorBinding[b.nome] &&
      Object.keys(selecao[b.nome] ?? {}).length === 0,
  );
  const listasPendentes = precisaEmpresa && !empresaId;

  // Empresas (PJ) do cliente, para a fonte das listas relacionais.
  const empresas = useMemo(
    () => registros.pessoa.filter((r) => (r.row as PessoaRow).tipo_pessoa === 'PJ'),
    [registros.pessoa],
  );

  // --- Fluxo guiado: estado de cada passo -----------------------------------

  const bindingsNaoSociedade = bindings.filter((b) => b.tipo !== 'sociedade');
  const precisaSelecoes = precisaEmpresa || bindingsNaoSociedade.length > 0;
  const selecoesCompletas = !listasPendentes && bindingsPendentes.length === 0;
  const modeloPronto = !!modeloId && !carregandoBlocos && template.blocos.length > 0;

  const passo1Estado: EstadoPasso = !modeloId || passoAberto === 1 ? 'aberto' : 'concluido';
  const passo2Estado: EstadoPasso =
    !selecoesCompletas || passoAberto === 2 ? 'aberto' : 'concluido';

  // Com tudo escolhido, os passos saem de cena e a folha assume a tela; trocar
  // modelo/empresa passa a ser feito nos seletores compactos do rail. Trocar o
  // modelo zera as seleções (useEffect acima) e devolve o fluxo aos passos.
  const modoDocumento = modeloPronto && selecoesCompletas;

  const empresaLabel = empresas.find((r) => r.id === empresaId)?.label;
  const labelsRegistros = bindingsNaoSociedade
    .map((b) => registros[b.tipo].find((r) => r.id === registroPorBinding[b.nome])?.label)
    .filter((l): l is string => !!l);
  const resumoPasso2 = [precisaEmpresa ? empresaLabel : null, ...labelsRegistros]
    .filter(Boolean)
    .join(' · ');

  const pendencias = [
    listasPendentes ? 'escolha a empresa do contrato' : null,
    bindingsPendentes.length > 0
      ? `selecione ${bindingsPendentes.map((b) => labelDoBinding(b.nome)).join(', ')}`
      : null,
  ].filter(Boolean);
  const mensagemPendente = `Para gerar o documento, ${pendencias.join(' e ')}.`;

  // Blocos da folha com o nome de exibição: a prévia destaca, no hover, qual
  // trecho do documento veio de qual bloco do modelo. Instância de repetidor
  // (id com sufixo #n) resolve nome/edição pelo bloco repetidor de origem.
  const blocosFolha = useMemo<BlocoFolha[]>(
    () =>
      (resultado.blocos ?? []).map((b) => {
        const posicaoId = b.instanciaDe ?? b.id;
        return {
          id: b.id,
          blocoId: bibliotecaIdPorBlocoId.get(posicaoId) ?? null,
          nome: nomePorBlocoId.get(posicaoId) ?? '',
          tipo: b.tipo,
          conteudo: b.conteudo,
          segmentos: b.segmentos,
          sobrescrito: posicoesSobrescritas.has(posicaoId),
        };
      }),
    [resultado.blocos, nomePorBlocoId, bibliotecaIdPorBlocoId, posicoesSobrescritas],
  );

  const folhaEstado: EstadoFolha = !selecoesCompletas
    ? 'pendente'
    : carregandoListasEfetivo
      ? 'carregando'
      : resultado.erro
        ? 'erro'
        : 'pronto';

  const infoFolha =
    blocosCompostos.length === template.blocos.length
      ? `${template.blocos.length} blocos · preenchido do cadastro`
      : `${blocosCompostos.length} de ${template.blocos.length} blocos · ajustado ao perfil da empresa`;

  // O painel de conferência só existe quando há algo a conferir/ajustar.
  const temPainel =
    precisaEmpresa ||
    bindings.length > 0 ||
    desconhecidosVisiveis.length > 0 ||
    secoesDesconhecidas.length > 0;

  const mostraSocios = listas.some((l) => l.nome === 'socios');
  const mostraAdministradores = listas.some((l) => l.nome === 'administradores');
  const mostraIntegralizacoes = listas.some((l) => l.nome === 'integralizacoes');

  return (
    <OsgLayout
      title="Gerar Documento"
      subtitle="Etapa final da oficina: escolha o modelo e a empresa — o documento sai pronto, preenchido do cadastro"
    >
      <div className="space-y-6 py-2">
        {/* Fase de escolhas: só os passos, numa coluna central estreita — a
            folha não aparece enquanto faltar decisão. */}
        {!modoDocumento && (
        <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Passo 1 — modelo */}
        <PassoCard
          numero={1}
          titulo="Escolha o modelo"
          descricao="Qual documento você quer gerar?"
          estado={passo1Estado}
          resumo={
            carregandoBlocos
              ? nomeModelo
              : `${nomeModelo} · ${template.blocos.length} blocos`
          }
          onTrocar={() => setPassoAberto(1)}
        >
          <EscolhaModelo
            modelos={modelos}
            carregando={carregandoModelos}
            modeloId={modeloId}
            onEscolher={(id) => {
              setModeloId(id);
              setPassoAberto(null);
            }}
          />
        </PassoCard>

        {modeloId && carregandoBlocos && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando modelo…
          </div>
        )}

        {modeloId && !carregandoBlocos && template.blocos.length === 0 && (
          <Card className="rounded-md border-osg-300/60 shadow-sm shadow-osg-300/30">
            <CardContent className="py-10 text-center">
              <p className="text-sm text-slate-600">
                Este modelo ainda não tem blocos com conteúdo.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => navigate('/equipe/osg/work/montagem-documentos')}
              >
                Abrir Montagem de Documentos
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Passo 2 — empresa-alvo (e demais papéis, quando o modelo pedir) */}
        {modeloPronto && precisaSelecoes && (
          <PassoCard
            numero={2}
            titulo={precisaEmpresa ? 'Escolha a empresa do contrato' : 'Escolha os registros do documento'}
            descricao={
              precisaEmpresa
                ? 'Sócios, administradores e capital carregam sozinhos do cadastro dela'
                : 'Aponte de quem é cada papel do documento'
            }
            estado={passo2Estado}
            resumo={resumoPasso2}
            onTrocar={() => setPassoAberto(2)}
            delay={60}
          >
            <div className="space-y-4">
              {precisaEmpresa && (
                <EscolhaEmpresa
                  empresas={empresas.map((r) => ({ id: r.id, row: r.row as PessoaRow }))}
                  empresaId={empresaId}
                  onEscolher={(id) => {
                    setEmpresaId(id);
                    setPassoAberto(null);
                    if (congelado) setRecongelarPendente(true);
                  }}
                  temCliente={!!clienteId}
                  carregando={carregandoRegistros}
                />
              )}

              {bindingsNaoSociedade.length > 0 && (
                <div className="space-y-3">
                  {precisaEmpresa && (
                    <p className="text-xs font-semibold text-slate-600">
                      Este modelo também precisa de:
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {bindingsNaoSociedade.map((b) => {
                      const precisaCliente = b.tipo !== 'cartorio' && !clienteId;
                      return (
                        <div key={b.nome} className="space-y-1.5">
                          <Label className={labelCls}>{labelDoBinding(b.nome)}</Label>
                          <Select
                            value={registroPorBinding[b.nome] ?? undefined}
                            onValueChange={(id) => escolherRegistro(b.nome, b.tipo, id)}
                            disabled={precisaCliente}
                          >
                            <SelectTrigger className={fieldCls}>
                              <SelectValue
                                placeholder={
                                  precisaCliente
                                    ? 'Escolha um cliente na barra acima'
                                    : registros[b.tipo].length === 0
                                      ? 'Nenhum registro cadastrado'
                                      : 'Selecione…'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {registros[b.tipo].map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </PassoCard>
        )}
        </div>
        )}

        {/* Documento em cena: os passos somem e a folha vira o centro da tela —
            conferência à esquerda; ações e seletores compactos (trocar modelo/
            empresa sem sair daqui) à direita. */}
        {modoDocumento && (
          <section className="animate-osg-rise motion-reduce:animate-none">
            <div
              className={cn(
                'mx-auto grid max-w-[1400px] grid-cols-1 items-start gap-6',
                temPainel
                  ? 'xl:grid-cols-[330px_minmax(0,1fr)_240px]'
                  : 'xl:grid-cols-[minmax(0,1fr)_240px]',
              )}
            >
              {temPainel && (
                <Card className="order-3 rounded-md border-osg-300/60 shadow-sm shadow-osg-300/30 xl:sticky xl:top-4 xl:order-1">
                  <CardHeader className="space-y-2 pb-4">
                    {documentoGeradoId ? (
                      <>
                        {/* Validado: a conferência divide o painel com as notificações. */}
                        <div className="flex gap-1 rounded-md bg-osg-50 p-1">
                          <button
                            type="button"
                            onClick={() => setAba('conferencia')}
                            className={cn(
                              'flex-1 rounded px-2 py-1 text-sm font-medium transition-colors',
                              abaEfetiva === 'conferencia'
                                ? 'bg-white text-osg-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700',
                            )}
                          >
                            Conferência
                          </button>
                          <button
                            type="button"
                            onClick={() => setAba('notificacoes')}
                            className={cn(
                              'flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-sm font-medium transition-colors',
                              abaEfetiva === 'notificacoes'
                                ? 'bg-white text-osg-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700',
                            )}
                          >
                            <Bell className="h-4 w-4" />
                            Notificações
                            {naoLidas > 0 && (
                              <span className="rounded-full bg-osg-moss px-1.5 text-xs font-bold tabular-nums text-white">
                                {naoLidas}
                              </span>
                            )}
                          </button>
                        </div>
                        <CardDescription className="text-sm">
                          {abaEfetiva === 'conferencia'
                            ? 'Tudo abaixo veio do cadastro — confira antes de baixar.'
                            : 'Mudanças nos cadastros desde que esta versão foi validada.'}
                        </CardDescription>
                      </>
                    ) : (
                      <>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                          <Database className="h-4 w-4 text-osg-600" /> Conferência dos dados
                        </CardTitle>
                        <span aria-hidden className="block h-[3px] w-10 rounded-full bg-osg-moss" />
                        <CardDescription className="text-sm">
                          Tudo abaixo veio do cadastro — confira antes de baixar.
                        </CardDescription>
                      </>
                    )}
                  </CardHeader>
                  {abaEfetiva === 'conferencia' && (
                  <CardContent className="space-y-6">
                    {carregandoListasEfetivo ? (
                      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados do cadastro…
                      </div>
                    ) : (
                      <>
                        {empresaId && (capitalValor != null || totalQuotas != null) && (
                          <div className="divide-y divide-osg-200/60 overflow-hidden rounded-md border border-osg-200/70 bg-osg-50/50">
                            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                              <p className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <Landmark className="h-3.5 w-3.5 shrink-0 text-osg-600" /> Capital social
                              </p>
                              <p className="whitespace-nowrap text-base font-bold tabular-nums text-osg-700">
                                {capitalValor != null ? fmtBRL.format(capitalValor) : '—'}
                              </p>
                            </div>
                            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                              <p className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <PieChart className="h-3.5 w-3.5 shrink-0 text-osg-600" /> Quotas
                              </p>
                              <p className="whitespace-nowrap text-base font-bold tabular-nums text-osg-700">
                                {totalQuotas != null ? fmtInt.format(totalQuotas) : '—'}
                              </p>
                            </div>
                          </div>
                        )}

                        {empresaId && mostraSocios && (
                          <SecaoPainel icone={<Users />} titulo="Sócios" contagem={socios.length}>
                            {socios.length === 0 ? (
                              <AvisoPendencia
                                acao={ehEmpresaPR ? 'Abrir Diagnóstico Patrimonial' : 'Abrir Quadro Societário'}
                                onAcao={() =>
                                  navigate(
                                    ehEmpresaPR
                                      ? '/equipe/osg/work/diagnostico-patrimonial'
                                      : '/equipe/osg/work/quadro-societario',
                                  )
                                }
                              >
                                {ehEmpresaPR
                                  ? 'Nenhum bem aprovado para integralização nesta empresa — os sócios da Proprietária vêm do Diagnóstico Patrimonial.'
                                  : 'Nenhum sócio no Quadro Societário desta empresa.'}
                              </AvisoPendencia>
                            ) : (
                              <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                                {socios.map((s, i) => (
                                  <li
                                    key={s.pessoa.id}
                                    className="flex items-baseline gap-2 text-sm text-slate-700"
                                  >
                                    <span className="w-4 shrink-0 text-right tabular-nums text-slate-400">
                                      {i + 1}.
                                    </span>
                                    <span className="min-w-0 flex-1 truncate" title={s.pessoa.denominacao}>
                                      {s.pessoa.denominacao}
                                    </span>
                                    {s.quotas != null && (
                                      <span className="shrink-0 tabular-nums text-slate-500">
                                        {fmtInt.format(s.quotas)} quotas
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {sociosSemCadastro.length > 0 && (
                              <AvisoPendencia
                                acao="Abrir Controle de Matrículas"
                                onAcao={() => navigate('/equipe/osg/work/controle-matriculas')}
                              >
                                {sociosSemCadastro.length} titular(es) sem cadastro (
                                {sociosSemCadastro.map((s) => s.pessoa.denominacao).join(', ')}): entram
                                como sócios, mas a qualificação sai incompleta. Vincule a pessoa na
                                titularidade da matrícula.
                              </AvisoPendencia>
                            )}
                          </SecaoPainel>
                        )}

                        {empresaId && mostraAdministradores && (
                          <SecaoPainel
                            icone={<UserCog />}
                            titulo="Administradores"
                            contagem={administradores.length}
                          >
                            {administradores.length === 0 ? (
                              <AvisoPendencia>
                                Nenhum administrador cadastrado para esta empresa.
                              </AvisoPendencia>
                            ) : (
                              <ul className="space-y-1.5">
                                {administradores.map((a, i) => (
                                  <li
                                    key={a.pessoa.id}
                                    className="flex items-baseline gap-2 text-sm text-slate-700"
                                  >
                                    <span className="w-4 shrink-0 text-right tabular-nums text-slate-400">
                                      {i + 1}.
                                    </span>
                                    <span className="min-w-0 flex-1 truncate" title={a.pessoa.denominacao}>
                                      {a.pessoa.denominacao}
                                    </span>
                                    {a.cargo && (
                                      <span className="shrink-0 text-slate-500">{a.cargo}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </SecaoPainel>
                        )}

                        {empresaId && mostraIntegralizacoes && (
                          <SecaoPainel
                            icone={<MapIcon />}
                            titulo="Imóveis integralizados"
                            contagem={integralizacoes.length}
                          >
                            {integralizacoes.length === 0 ? (
                              <AvisoPendencia
                                acao="Abrir Diagnóstico Patrimonial"
                                onAcao={() => navigate('/equipe/osg/work/diagnostico-patrimonial')}
                              >
                                Nenhum imóvel aprovado para integralização nesta empresa.
                              </AvisoPendencia>
                            ) : (
                              <ul className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                                {integralizacoes.map((m) => (
                                  <li key={m.id} className="flex items-baseline gap-2 text-sm text-slate-700">
                                    <span className="shrink-0 tabular-nums text-slate-500">
                                      Matr. {m.numero ?? 's/ nº'}
                                    </span>
                                    <span
                                      className="min-w-0 flex-1 truncate"
                                      title={m.bem?.denominacao ?? undefined}
                                    >
                                      {m.bem?.denominacao ?? ''}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </SecaoPainel>
                        )}

                        {empresaId && temBlocosComFlags && (
                          flagsAtivas.length === 0 ? (
                            <AvisoPendencia
                              acao="Abrir Qualificação das Partes"
                              onAcao={() => navigate('/equipe/osg/work/qualificacao-das-partes')}
                            >
                              Não foi possível identificar o tipo desta empresa — as cláusulas
                              condicionais podem sair erradas. Confira o tipo da empresa no cadastro.
                            </AvisoPendencia>
                          ) : (
                            <div className="space-y-1.5 rounded-md border border-osg-moss/25 bg-osg-moss/[0.05] p-3 text-sm">
                              <p className="flex items-center gap-1.5 font-semibold text-osg-700">
                                <Sparkles className="h-4 w-4" /> Ajustado ao perfil da empresa
                              </p>
                              <p className="text-slate-600">
                                {blocosExcluidos.length > 0
                                  ? `${blocosExcluidos.length} cláusula${blocosExcluidos.length > 1 ? 's' : ''} não se aplica${blocosExcluidos.length > 1 ? 'm' : ''} a esta empresa e ficou${blocosExcluidos.length > 1 ? 'aram' : ''} de fora: ${blocosExcluidos.map((b) => nomePorBlocoId.get(b.id)).join(', ')}.`
                                  : 'Todas as cláusulas do modelo se aplicam a esta empresa.'}
                              </p>
                            </div>
                          )
                        )}

                        {empresaId && (mostraSocios || mostraIntegralizacoes) && (
                          <p className="flex items-start gap-1.5 text-xs text-slate-500">
                            <Database className="mt-0.5 h-3 w-3 shrink-0 text-osg-600" />
                            {ehEmpresaPR
                              ? 'Sócios calculados das integralizações aprovadas (participação decrescente); administradores do cadastro.'
                              : 'Preenchido do cadastro, na ordem do registro.'}
                          </p>
                        )}
                      </>
                    )}

                    {secoesDesconhecidas.length > 0 && (
                      <AvisoPendencia>
                        Partes do modelo não foram reconhecidas e ficaram fora do documento:{' '}
                        <code>{secoesDesconhecidas.map((s) => `#${s}`).join(', ')}</code>. Avise quem
                        montou o modelo.
                      </AvisoPendencia>
                    )}

                    {desconhecidosVisiveis.length > 0 && (
                      <SecaoPainel
                        icone={<Pencil />}
                        titulo="Preencher à mão"
                        contagem={desconhecidosVisiveis.length}
                      >
                        <p className="text-xs text-slate-500">
                          Estes campos do modelo não vêm do cadastro.
                        </p>
                        <div className="space-y-3">
                          {desconhecidosVisiveis.map((ph) => (
                            <div key={ph} className="space-y-1.5">
                              <Label className={cn(labelCls, 'text-sm')}>{ph}</Label>
                              <Input
                                value={valoresLivres[ph] ?? ''}
                                onChange={(e) => {
                                  setValoresLivres((prev) => ({ ...prev, [ph]: e.target.value }));
                                  if (congelado) setRecongelarPendente(true);
                                }}
                                className={cn(fieldCls, 'text-sm')}
                              />
                            </div>
                          ))}
                        </div>
                      </SecaoPainel>
                    )}

                    {bindings.length > 0 && (
                      <Collapsible open={ajustesAbertos} onOpenChange={setAjustesAbertos}>
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-center gap-1.5 rounded-md border border-osg-200/70 bg-osg-50/40 px-3 py-2 text-sm font-semibold text-osg-700 transition-colors hover:bg-osg-50"
                          >
                            <Pencil className="h-4 w-4" /> Ajustar dados manualmente
                            <ChevronDown
                              className={cn(
                                'ml-auto h-4 w-4 transition-transform duration-200',
                                ajustesAbertos && 'rotate-180',
                              )}
                            />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-5 pt-4">
                          <p className="text-xs text-slate-500">
                            Os ajustes valem só para este documento — o cadastro não muda.
                          </p>
                          {bindings.map((b) => (
                            <div key={b.nome} className="space-y-2.5">
                              <p className="text-sm font-semibold text-slate-600">
                                {labelDoBinding(b.nome)}
                              </p>
                              {b.tipo === 'sociedade' && !empresaId && (
                                <p className="text-xs text-slate-500">
                                  Selecione a empresa para preencher.
                                </p>
                              )}
                              <div className="space-y-3">
                                {(camposPorBinding[b.nome] ?? []).map((c) => {
                                  const valor = selecao[b.nome]?.[c.id] ?? '';
                                  const onChange = (v: string) => editarCampo(b.nome, b.tipo, c.id, v);
                                  // Placeholder com campo que não existe no catálogo da
                                  // entidade (ex.: sociedade.objetoSocial em vez de
                                  // sociedade.objeto): não preenche do cadastro — avisar
                                  // em vez de deixar vazio em silêncio.
                                  const foraDoCatalogo = !campoDaEntidade(b.tipo, c.id);
                                  return (
                                    <div key={c.id} className="space-y-1">
                                      <Label className={cn(labelCls, 'text-sm')}>{c.label}</Label>
                                      {c.tipo === 'textarea' ? (
                                        <Textarea
                                          value={valor}
                                          onChange={(e) => onChange(e.target.value)}
                                          rows={4}
                                          className={cn(textareaCls, 'text-sm')}
                                        />
                                      ) : (
                                        <Input
                                          value={valor}
                                          onChange={(e) => onChange(e.target.value)}
                                          className={cn(fieldCls, 'text-sm')}
                                        />
                                      )}
                                      {foraDoCatalogo && (
                                        <p className="flex items-start gap-1 text-xs text-amber-700">
                                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                                          <span>
                                            "{c.id}" não existe no cadastro de {labelDoBinding(b.nome)} —
                                            preencha à mão (ou corrija o campo no modelo).
                                          </span>
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </CardContent>
                  )}

                  {abaEfetiva === 'notificacoes' && documentoGeradoId && (
                    <CardContent>
                      <ListaNotificacoes
                        linhas={linhasNotificacao}
                        naoLidas={naoLidas}
                        marcando={marcarVistas.isPending}
                        onMarcarLido={() => marcarVistas.mutate(documentoGeradoId)}
                      />
                    </CardContent>
                  )}
                </Card>
              )}

              <div className="order-2 mx-auto w-full min-w-0 max-w-[860px]">
                <FolhaDocumento
                  titulo={nomeModelo}
                  estado={folhaEstado}
                  mensagemPendente={mensagemPendente}
                  erro={resultado.erro}
                  blocos={blocosFolha}
                  onEditarBloco={editarBlocoNaPrevia}
                  onClickOrigem={abrirCadastroOrigem}
                  origemClicavel={origemClicavel}
                />
              </div>

              <aside className="order-1 space-y-4 xl:sticky xl:top-4 xl:order-3">
                {/* Validar versão: encerra os cadastros, congela os valores e
                    habilita o ajuste de blocos só deste documento. */}
                {documentoGeradoId ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-1.5 rounded-md border border-osg-moss/30 bg-osg-moss/[0.06] px-3 py-2 text-xs font-semibold text-osg-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-osg-moss" />
                      Versão validada · rascunho
                    </div>
                    {/* Commit deliberado: sela esta versão e abre uma nova a
                        partir dela (a anterior fica preservada no histórico). */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-osg-moss/40 text-osg-700 hover:bg-osg-moss/[0.06] hover:text-osg-800"
                          onClick={() => setNovaVersaoConfirmOpen(true)}
                          disabled={salvarDocumento.isPending}
                        >
                          {salvarDocumento.isPending ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Layers className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Atualizar versão
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs leading-relaxed">
                        Fecha esta versão (fica preservada como está) e abre uma nova a partir dela, com os mesmos
                        dados e ajustes — para seguir editando sem perder o que já validou.
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-osg-600 hover:text-osg-800"
                          onClick={() => void revalidar()}
                          disabled={salvarDocumento.isPending}
                        >
                          {salvarDocumento.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                          Atualizar do cadastro
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs leading-relaxed">
                        Puxa os dados atuais dos cadastros e congela esta versão de novo.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full border-osg-moss/40 text-osg-700 hover:bg-osg-moss/[0.06] hover:text-osg-800"
                        onClick={() => setValidarConfirmOpen(true)}
                        disabled={salvarDocumento.isPending}
                      >
                        {salvarDocumento.isPending ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-1.5 h-4 w-4" />
                        )}
                        Validar versão
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs leading-relaxed">
                      Confirma que os cadastros estão completos e revisados e congela os valores atuais nesta
                      versão do documento. Depois de validar, você pode ajustar blocos só deste documento.
                    </TooltipContent>
                  </Tooltip>
                )}

                <PainelAcoes
                  pronto={folhaEstado === 'pronto'}
                  info={infoFolha}
                  onCopiar={copiar}
                  copiado={copiado}
                  onBaixar={baixar}
                  baixando={baixando}
                />

                {/* As escolhas dos passos, agora compactas: trocar o modelo
                    volta o fluxo aos passos (as seleções zeram); trocar a
                    empresa atualiza a folha na hora. */}
                <div className="space-y-3">
                  <SeletorRail
                    titulo="Modelo"
                    resumo={nomeModelo}
                    aberto={railAberto === 'modelo'}
                    onAbertoChange={(aberto) => setRailAberto(aberto ? 'modelo' : null)}
                  >
                    <div className="space-y-0.5">
                      {modelos
                        .filter((m) => m.ativo)
                        .map((m) => (
                          <OpcaoRail
                            key={m.id}
                            selecionado={m.id === modeloId}
                            onEscolher={() => {
                              setModeloId(m.id);
                              setRailAberto(null);
                            }}
                          >
                            {m.nome}
                          </OpcaoRail>
                        ))}
                    </div>
                  </SeletorRail>

                  {precisaEmpresa && (
                    <SeletorRail
                      titulo="Empresa do contrato"
                      resumo={empresaLabel}
                      aberto={railAberto === 'empresa'}
                      onAbertoChange={(aberto) => setRailAberto(aberto ? 'empresa' : null)}
                    >
                      <div className="space-y-0.5">
                        {empresas.map((r) => (
                          <OpcaoRail
                            key={r.id}
                            selecionado={r.id === empresaId}
                            onEscolher={() => {
                              setEmpresaId(r.id);
                              setRailAberto(null);
                              if (congelado) setRecongelarPendente(true);
                            }}
                          >
                            {r.label}
                          </OpcaoRail>
                        ))}
                      </div>
                    </SeletorRail>
                  )}

                  {bindingsNaoSociedade.length > 0 && (
                    <SeletorRail
                      titulo="Demais papéis"
                      resumo={labelsRegistros.join(' · ')}
                      aberto={railAberto === 'registros'}
                      onAbertoChange={(aberto) => setRailAberto(aberto ? 'registros' : null)}
                    >
                      <div className="space-y-3 p-1.5">
                        {bindingsNaoSociedade.map((b) => (
                          <div key={b.nome} className="space-y-1.5">
                            <Label className={labelCls}>{labelDoBinding(b.nome)}</Label>
                            <Select
                              value={registroPorBinding[b.nome] ?? undefined}
                              onValueChange={(id) => escolherRegistro(b.nome, b.tipo, id)}
                            >
                              <SelectTrigger className={fieldCls}>
                                <SelectValue placeholder="Selecione…" />
                              </SelectTrigger>
                              <SelectContent>
                                {registros[b.tipo].map((r) => (
                                  <SelectItem key={r.id} value={r.id}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </SeletorRail>
                  )}
                </div>
              </aside>
            </div>
          </section>
        )}
      </div>

      {/* Ajuste de bloco (override) escopado a este documento. */}
      {documentoGeradoId && documentoRaizId && (
        <OverrideBlocoDialog
          open={blocoOverrideAlvo !== null}
          onOpenChange={(open) => {
            if (!open) setBlocoOverrideAlvo(null);
          }}
          documentoGeradoId={documentoGeradoId}
          documentoRaizId={documentoRaizId}
          blocoAlvo={blocoOverrideAlvo}
          override={blocoOverrideAlvo ? (porBlocoAlvo.get(blocoOverrideAlvo.id) ?? null) : null}
          modeloId={modeloId}
        />
      )}

      {/* Confirmação do passo "Validar versão". */}
      <AlertDialog open={validarConfirmOpen} onOpenChange={setValidarConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Validar esta versão do documento?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Ao validar, você confirma que <strong>terminou e revisou todos os cadastros</strong>.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Os valores atuais ficam <strong>congelados</strong> nesta versão — não mudam mais sozinhos.
                  </li>
                  <li>
                    Se um cadastro for alterado depois, você será <strong>avisado antes</strong> de atualizar o
                    documento.
                  </li>
                  <li>
                    A partir daqui, você pode <strong>ajustar blocos apenas deste documento</strong>.
                  </li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvarDocumento.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmarValidacao();
              }}
              className="bg-osg-600 hover:bg-osg-700"
            >
              {salvarDocumento.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Validar versão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Commit deliberado: sela a versão atual e abre uma nova a partir dela. */}
      <AlertDialog open={novaVersaoConfirmOpen} onOpenChange={setNovaVersaoConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atualizar para uma nova versão?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  A versão atual é <strong>preservada como está</strong> — não muda mais.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Uma <strong>versão nova</strong> é criada a partir desta, com os mesmos dados e ajustes.
                  </li>
                  <li>
                    Você <strong>continua editando na versão nova</strong>; a anterior fica no histórico.
                  </li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvarDocumento.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmarNovaVersao();
              }}
              className="bg-osg-600 hover:bg-osg-700"
            >
              {salvarDocumento.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Atualizar versão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prompt ativo ao tentar ajustar um bloco antes de validar a versão. */}
      <AlertDialog
        open={gatingPromptOpen}
        onOpenChange={(open) => {
          setGatingPromptOpen(open);
          if (!open) setBlocoPendente(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valide a versão antes de ajustar blocos</AlertDialogTitle>
            <AlertDialogDescription>
              Para ajustar um bloco só deste documento, primeiro valide a versão — assim os valores ficam
              congelados e o ajuste fica preso a este documento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvarDocumento.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmarValidacaoEAbrirBloco();
              }}
              className="bg-osg-600 hover:bg-osg-700"
            >
              {salvarDocumento.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Validar versão agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cadastro aberto de um valor da prévia: corrigir o dado sem sair da
          tela — ao fechar, listas e bindings re-derivam do cadastro novo. */}
      {clienteId && (
        <>
          <PessoaModal
            open={pessoaEditando !== null}
            clienteId={clienteId}
            pessoa={pessoaEditando}
            pessoasCliente={registros.pessoa.map((r) => r.row as PessoaRow)}
            onClose={() => fecharCadastroOrigem(pessoaEditando?.id)}
          />
          <BemModal
            open={bemEditando !== null}
            clienteId={clienteId}
            bem={bemEditando}
            pessoasCliente={registros.pessoa.map((r) => r.row as PessoaRow)}
            onClose={() => fecharCadastroOrigem(bemEditando?.id)}
          />
          {/* bemId/bemTipo nulos como no Controle de Matrículas: edição avulsa,
              com todos os campos visíveis. */}
          <MatriculaModal
            open={matriculaEditando !== null}
            bemId={null}
            bemTipo={null}
            matricula={matriculaEditando}
            pessoasCliente={registros.pessoa.map((r) => r.row as PessoaRow)}
            matriculasDoBem={matriculasDoCliente}
            onClose={() => fecharCadastroOrigem(matriculaEditando?.id)}
          />
        </>
      )}
    </OsgLayout>
  );
};

export default GerarDocumento;
