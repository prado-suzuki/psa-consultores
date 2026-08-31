import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { avaliarFlags, comFlagDaPecaRetroativa, comporBlocos, copiarOrigemProfunda, flagDaPeca, gerarBlocos, gerarComposicao, inclusoesDe, mapearSignatarios, marcarRealceDiff, pendenciasDoDocumento, removerMarcas, unirBlocos, type Bloco, type BlocoDescartado, type BlocoGerado, type FlagDeclarativa, type OrigemValor, type RegistroFamilias, type Template } from '@/lib/templates';
import { baixarDocx } from '@/lib/templates/docx';
import { camposDaEntidade, derivarCampos, type TipoEntidade } from '@/lib/templates/vocabulario';
import { calcularHistoricoCapital } from '@/lib/templates/historicoCapital';
import { conteudoParaDeteccao, detectarBindingsDeConteudo, labelDoBinding, normalizarReferenciasLegadas, normalizarSelecaoLegada } from '@/lib/templates/binding';
import { calcularCapitalSociedade, mapearAdministrador, mapearCessoes, mapearGeorefCabecalho, mapearIntegralizacoes, mapearPartesSelecionadas, mapearQuadroSocietario, mapearRegistro, mapearSociedade, mapearVertice, montarContexto, reidratarItensPorLista, tituloColetivoDosSocios, type ItemLista } from '@/lib/templates/mapeadores';
import { quotasDoSocio } from '@/lib/templates/capital';
import { useModelos, useModeloBlocos } from '@/hooks/useModelosDocumento';
import { montarRegistroFamilias, useBlocos, useFlags, type BlocoComVersao } from '@/hooks/useBibliotecaModelos';
import { useDocumentoGeradoHead, useDocumentoGeradoPorId, useDocumentoOverrides, useDocumentoVersoes, useOrdemNaSucessao, useRegistrarDocumento, useSalvarDocumentoGerado, type DocumentoGeradoRow, type OverrideAplicavel, type SnapshotDados } from '@/hooks/useDocumentoGerado';
import { escopoDaFlag, nomesDasFlagsManuaisLigadas, useFlagsManuaisProjeto, useResponderEventosDaAlteracao } from '@/hooks/useDomainFlagsManuais';
import { useEventosDerivados, useFormalizarMovimentos } from '@/hooks/useEventosDaAlteracao';
import type { SnapshotDaPeca } from '@/lib/osg/baselineDaPeca';
import { toast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';
import { useAllMatriculas, type BemRow, type MatriculaEnriched } from '@/hooks/useDiagnosticoPatrimonial';
import { PESSOA_LEGADA_PREFIX, useListasDaEmpresa, useRegistrosPorTipo } from '@/hooks/useGeracaoDocumento';
import { useGeorefByMatricula, useGeorefsByMatriculas } from '@/hooks/useGeorefByMatricula';
import { useAuditAutores, useMarcarNotificacoesVistas, useNotificacaoVisto, useNotificacoesDocumento } from '@/hooks/useNotificacoesDocumento';
import { formatChangedFields, type LookupMaps } from '@/components/equipe/audit/auditFieldFormatter';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { BlocoFolha, EstadoFolha } from '@/components/equipe/osg/gerar/FolhaDocumento';
import type { EstadoPasso } from '@/components/equipe/osg/gerar/gerarKit';
import { realcarMudancas, renderizarVersao, type SnapshotVersoes } from '@/components/equipe/osg/gerar/renderizarVersao';
import { prepararDownloadDocumento } from '@/components/equipe/osg/gerar/downloadDocumento';
import { completarListasDoSnapshot, contextoComGeoref, selecaoComOrigemDoSnapshot } from '@/components/equipe/osg/gerar/contextoDoDocumento';
import { blocosForaDaFolha, resumoDaFolha } from '@/components/equipe/osg/gerar/resumoDaComposicao';
import { camposEditaveisPorBinding } from '@/components/equipe/osg/gerar/camposDoBinding';

const fmtDataNotificacao = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
export interface LinhaNotificacao {
  key: string;
  action: 'created' | 'deleted' | 'updated' | 'field';
  entityName: string;
  label?: string;
  newValue?: string;
  meta: string;
}

export function useGerarDocumentoController() {
  const { data: modelos = [], isLoading: carregandoModelos } = useModelos();
  const [modeloId, setModeloId] = useState<string | null>(null);
  const { data: docBlocos = [], isLoading: carregandoBlocos } = useModeloBlocos(modeloId);
  const modeloSocietario = modelos.find((m) => m.id === modeloId)?.tipo === 'societario';

  // Cliente vem da barra global da área OSG (igual aos cadastros).
  const { clienteId } = useOsgWork();
  const { registros, isFetching: carregandoRegistros } = useRegistrosPorTipo(clienteId);

  // selecao[binding][campoId] = valor; selecaoRegistroId[binding] = id do registro escolhido.
  const [selecao, setSelecao] = useState<Record<string, Record<string, string>>>({});
  const [registroPorBinding, setRegistroPorBinding] = useState<Record<string, string>>({});
  const [registrosPorLista, setRegistrosPorLista] = useState<Record<string, string[]>>({});
  // A seleção múltipla só se declara pronta quando o consultor diz que terminou
  // de montar a lista (ver alternarRegistroDaLista / confirmarSelecaoDeListas).
  const [listasConfirmadas, setListasConfirmadas] = useState(false);
  // Assistente de ALTERAÇÃO CONTRATUAL, em modal. Não é passo do fluxo de
  // geração: perguntar que evento societário aconteceu antes de existir contrato
  // registrado é perguntar sobre um documento que ainda não valeu. O assistente
  // parte da folha de um documento TRAVADO (status 'registrado') e produz outro
  // documento, que substitui aquele.
  const [alteracaoDialogOpen, setAlteracaoDialogOpen] = useState(false);
  // Rascunho local das respostas enquanto o modal está aberto; só vai ao banco
  // no "Gerar alteração contratual" do último passo.
  const [respostasAlteracao, setRespostasAlteracao] = useState<Record<string, boolean>>({});
  const [registrarConfirmOpen, setRegistrarConfirmOpen] = useState(false);
  const [valoresLivres, setValoresLivres] = useState<Record<string, string>>({});
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const camposEditadosRef = useRef(new Set<string>());
  const empresaSociedadeRef = useRef<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  // Passo reaberto pelo botão "Trocar" (volta a fechar na próxima escolha).
  const [passoAberto, setPassoAberto] = useState<1 | 2 | null>(null);
  const [ajustesAbertos, setAjustesAbertos] = useState(false);
  // Seletor expandido no rail ao lado da folha (um por vez, estilo acordeão).
  // `lista:<nome>` é a seleção múltipla de uma lista do modelo ({{#imoveis}}).
  const [railAberto, setRailAberto] = useState<
    'modelo' | 'empresa' | 'registros' | 'versoes' | `lista:${string}` | null
  >(null);
  // Versão selada sob visualização (somente leitura na folha central); null = a
  // head viva e editável. Trocar de modelo/empresa zera (effect mais abaixo).
  const [versaoVisualizadaId, setVersaoVisualizadaId] = useState<string | null>(null);
  // Aba do painel de conferência: a aba "Notificações" só existe com versão validada.
  const [aba, setAba] = useState<'conferencia' | 'notificacoes'>('conferencia');

  const queryClient = useQueryClient();
  const { data: catalogoBlocos = [] } = useBlocos();

  // Documento gerado (persistido pelo passo "Validar versão"): sem ele não há
  // como ancorar um override. Resolve o rascunho da combinação cliente+modelo+
  // empresa e o mantém em estado — a validação cria/atualiza e congela os valores.
  const [documentoHead, setDocumentoHead] = useState<DocumentoGeradoRow | null>(null);
  const { data: head } = useDocumentoGeradoHead({
    clienteId: clienteId || null,
    modeloId,
    pjPessoaId: empresaId,
  });
  useEffect(() => {
    // A head governa o estado: trocar de modelo/empresa re-resolve (ou zera).
    setDocumentoHead(head ?? null);
    // Sai do modo leitura: a linhagem mudou (outro doc, ou nova versão selada).
    setVersaoVisualizadaId(null);
    const snap = head?.snapshot_dados as unknown as SnapshotDados | null | undefined;
    if (snap) {
      setSelecao(
        modeloSocietario
          ? normalizarSelecaoLegada(snap.selecao ?? {}, snap.valoresLivres ?? {})
          : (snap.selecao ?? {}),
      );
      setRegistroPorBinding(snap.registroPorBinding ?? {});
      setRegistrosPorLista(snap.registrosPorLista ?? {});
      // Rascunho com lista já montada reabre direto no documento: a confirmação
      // é do ato de montar, e ele aconteceu quando o rascunho foi salvo.
      setListasConfirmadas(Object.values(snap.registrosPorLista ?? {}).some((ids) => ids.length > 0));
      setValoresLivres(snap.valoresLivres ?? {});
      setEmpresaId(snap.empresaId ?? null);
    }
    // É também aqui que a alteração contratual nasce "a partir do" documento
    // anterior: quando a head é o REGISTRADO, o snapshot dele semeia as
    // seleções, e os efeitos vivos (sociedade, georref) reescrevem por cima com
    // o cadastro atualizado, porque `congelado` é falso durante a alteração.
  }, [head, modeloSocietario]);

  // --- Quem é o documento da tela ------------------------------------------
  // A head pode estar em dois estados, e eles se comportam de modo oposto:
  //
  //   'rascunho'   — documento em edição. Congela do snapshot dele.
  //   'registrado' — peça travada, registrada na junta. Também congela do
  //                  snapshot: é o que valeu, e continua sendo lido como foi.
  //
  // A exceção é a ALTERAÇÃO EM CURSO: quando o consultor já respondeu o
  // assistente sobre um registrado, a tela deixa de mostrar aquele registrado e
  // passa a compor AO VIVO o documento novo — resoluções pelas flags de evento
  // e consolidado do cadastro atualizado. Por isso `documentoGerado` fica null
  // ali: `congelado` é `documentoGerado != null`, e uma head não-nula faria a
  // folha renderizar do snapshot antigo, que é justamente o estado que mudou.
  const documentoRegistrado = documentoHead?.status === 'registrado' ? documentoHead : null;
  // O documento a partir do qual as respostas de evento valem: o registrado que
  // está na tela, ou — depois que a alteração já foi validada e virou rascunho —
  // o que aquele rascunho declara substituir.
  const documentoBaseId = documentoRegistrado?.id ?? documentoHead?.substitui_documento_id ?? null;
  const { data: documentoBaseConsultado } = useDocumentoGeradoPorId(documentoBaseId);
  const documentoBase = documentoRegistrado ?? documentoBaseConsultado;

  // Respostas manuais aplicáveis: as de escopo cliente, as da empresa e as
  // ancoradas no documento base (os eventos da alteração). Lida aqui, antes de
  // `documentoGerado`, porque é ela que decide se há alteração em curso.
  const { data: valoresFlagsManuais = [] } = useFlagsManuaisProjeto({
    clienteId: clienteId || null,
    pjPessoaId: empresaId,
    documentoBaseId,
  });
  // O assistente grava TODAS as flags, inclusive as desmarcadas: a existência de
  // qualquer linha ancorada no registrado é o que marca "há uma alteração em
  // curso aqui". Desmarcar tudo é uma resposta, não um cancelamento.
  const respostasDaAlteracao = useMemo(
    () => valoresFlagsManuais.filter((v) => v.documento_base_id != null),
    [valoresFlagsManuais],
  );
  const alteracaoEmCurso = documentoRegistrado != null && respostasDaAlteracao.length > 0;
  // "Rever os eventos" não vive só enquanto a alteração compõe ao vivo: depois de
  // validar, a head passa a ser ELA (em rascunho), `alteracaoEmCurso` cai e o
  // botão desaparecia do rail — não havia como reabrir o assistente pela tela.
  // Vale para qualquer folha que tenha respostas ancoradas numa peça base e ainda
  // não esteja registrada (registrada, acabou a edição).
  const podeReverEventos =
    respostasDaAlteracao.length > 0 &&
    documentoBaseId != null &&
    documentoHead?.status !== 'registrado';

  // Que peça é esta na sucessão: 0 = constituição, 1 = primeira alteração, …
  // O documento CONTADO depende de qual peça está na folha, e são duas
  // situações diferentes:
  //  - alteração em curso: a folha é o SUCESSOR (ainda não existe no banco) do
  //    registrado, logo é uma alteração a mais do que ele;
  //  - qualquer outro caso: a folha é a própria head, e a posição dela na
  //    sucessão é a que vale (o contrato registrado continua sendo constituição
  //    quando revisitado, e a alteração registrada continua sendo a primeira).
  const documentoContado = alteracaoEmCurso ? documentoRegistrado!.id : (documentoHead?.id ?? null);
  const { data: elosDaSucessao = 0 } = useOrdemNaSucessao(clienteId || null, documentoContado);
  const numeroAlteracao = !documentoContado ? 0 : alteracaoEmCurso ? elosDaSucessao + 1 : elosDaSucessao;
  // Durante a alteração em curso não há documento validado: a folha compõe ao
  // vivo, e "Validar versão" é que vai criar o documento novo.
  const documentoGerado = alteracaoEmCurso ? null : documentoHead;

  const documentoGeradoId = documentoGerado?.id ?? null;
  const documentoRaizId = documentoGerado?.documento_raiz_id ?? documentoGerado?.id ?? null;
  // Linhagem de versões (raiz → … → head) para o histórico e o viewer de versão
  // anterior. Cada linha carrega o snapshot que a torna reproduzível sozinha.
  const { data: versoes = [] } = useDocumentoVersoes(documentoRaizId);
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

  // Famílias de variantes disponíveis ao render: {{familia nome="…"}} dentro de um
  // bloco resolve por aqui, uma variante por item do laço (ver familia.ts). O
  // override do documento vale para a VARIANTE (que é um bloco de verdade), então
  // entra no conteúdo antes de o registro chegar ao motor; `familiasOriginais` é o
  // espelho sem override, que alimenta o realce do diff.
  const familias = useMemo(
    () =>
      montarRegistroFamilias(
        catalogoBlocos,
        (v) => porBlocoAlvo.get(v.id)?.conteudoSubstituto ?? v.versao_atual?.conteudo ?? null,
      ),
    [catalogoBlocos, porBlocoAlvo],
  );
  const familiasOriginais = useMemo(() => montarRegistroFamilias(catalogoBlocos), [catalogoBlocos]);

  // Variantes por id (achatadas do catálogo): o render marca os segmentos com o id
  // da variante, e tanto o rótulo na prévia quanto o override precisam do bloco.
  const variantePorId = useMemo(() => {
    const mapa = new Map<string, BlocoComVersao>();
    for (const cabeca of catalogoBlocos) {
      for (const v of cabeca.variantes) mapa.set(v.id, v);
    }
    return mapa;
  }, [catalogoBlocos]);
  const reiniciaNumeracaoPorBlocoId = useMemo(
    () =>
      new Map(
        catalogoBlocos.map((b) => [
          b.id,
          (b as BlocoComVersao & { reinicia_numeracao?: boolean }).reinicia_numeracao,
        ]),
      ),
    [catalogoBlocos],
  );
  const nomePorVarianteId = useMemo(
    () => new Map([...variantePorId].map(([id, v]) => [id, v.variante_rotulo ?? v.nome])),
    [variantePorId],
  );

  // Posições do modelo (tmpl_documento_bloco.id) cujo bloco-alvo tem override —
  // alimenta o selo "Ajustado neste documento" na prévia. Uma posição também conta
  // como ajustada quando o override caiu numa VARIANTE que ela pode escrever: o
  // texto sai daquele parágrafo, mesmo que o bloco hospedeiro esteja intocado.
  const posicoesSobrescritas = useMemo(() => {
    const set = new Set<string>();
    docBlocos.forEach((b) => {
      if (b.bloco?.id && porBlocoAlvo.has(b.bloco.id)) set.add(b.id);
      else if (
        b.bloco?.conteudo &&
        inclusoesDe(b.bloco.conteudo).some((nome) =>
          (familias[nome] ?? []).some((v) => porBlocoAlvo.has(v.id)),
        )
      ) {
        set.add(b.id);
      }
    });
    return set;
  }, [docBlocos, porBlocoAlvo, familias]);

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
          conteudo: modeloSocietario
            ? normalizarReferenciasLegadas(ov ? ov.conteudoSubstituto : (b.bloco!.conteudo as string))
            : (ov ? ov.conteudoSubstituto : (b.bloco!.conteudo as string)),
          obrigatorio: b.obrigatorio,
          reiniciaNumeracao: reiniciaNumeracaoPorBlocoId.get(b.bloco!.id) ?? undefined,
          flagsRequeridas: b.bloco!.flags,
          repeteColecao: b.bloco!.repete_colecao ?? undefined,
          ancora: b.bloco!.ancora ?? undefined,
        };
      });
    return { id: modeloId ?? 'novo', nome: 'documento', blocos };
  }, [docBlocos, modeloId, porBlocoAlvo, modeloSocietario, reiniciaNumeracaoPorBlocoId]);

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
        conteudo: modeloSocietario
          ? normalizarReferenciasLegadas(b.bloco!.conteudo as string)
          : (b.bloco!.conteudo as string),
        obrigatorio: b.obrigatorio,
        reiniciaNumeracao: reiniciaNumeracaoPorBlocoId.get(b.bloco!.id) ?? undefined,
        flagsRequeridas: b.bloco!.flags,
        repeteColecao: b.bloco!.repete_colecao ?? undefined,
        ancora: b.bloco!.ancora ?? undefined,
      }));
    return { id: modeloId ?? 'novo', nome: 'documento', blocos };
  }, [docBlocos, modeloId, posicoesSobrescritas, template, modeloSocietario, reiniciaNumeracaoPorBlocoId]);

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
  // Congelamento do texto da versão: os blocos do modelo (com override aplicado)
  // MAIS as famílias que eles citam, com o texto de cada variante como está agora.
  // Só as citadas: o snapshot é o retrato deste documento, não da Biblioteca.
  const snapshotVersoes = useMemo<SnapshotVersoes>(() => {
    const citadas = new Set(template.blocos.flatMap((b) => inclusoesDe(b.conteudo)));
    const usadas: RegistroFamilias = {};
    for (const nome of citadas) {
      if (familias[nome]) usadas[nome] = familias[nome];
    }
    return { blocos: template.blocos, familias: usadas };
  }, [template, familias]);

  const validarVersao = async (novaVersao = false): Promise<DocumentoGeradoRow | null> => {
    if (!clienteId || !modeloId) return null;
    // PORTEIRO: folha em erro de composição não vira documento. Selar aqui
    // congelaria o snapshot e carimbaria o ledger apontando uma peça que não
    // existe como texto — dano permanente a partir de um erro visível na tela.
    // Diferente de PENDÊNCIA (placeholder por preencher), que é rascunho legítimo
    // e continua podendo validar.
    if (resultado.erro) {
      toast({
        title: 'A folha está em erro de composição',
        description: `${resultado.erro} — conserte antes de validar a versão.`,
        variant: 'destructive',
      });
      return null;
    }
    const snap: SnapshotDados = {
      selecao,
      registroPorBinding,
      registrosPorLista,
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
      nomeModelo,
      snapshotFlags: flagsAtivas,
      snapshotDados: snap as unknown as Json,
      // Texto dos blocos já resolvido (com overrides) + variantes das famílias
      // citadas — congela o render da versão.
      snapshotVersoesBlocos: snapshotVersoes as unknown as Json,
      novaVersao,
      // Só tem efeito quando não existe head e a raiz vai ser criada — que é
      // exatamente o caso da alteração contratual sendo validada pela primeira
      // vez. Nos forks o valor é copiado da head, não daqui.
      substituiDocumentoId: alteracaoEmCurso ? documentoBaseId : null,
    });
    setDocumentoHead(doc);
    // Validar NÃO carimba o ledger nem vira status de bem: validar é congelar um
    // rascunho, e as duas marcas irreversíveis nascem em "Registrar na junta"
    // (D4), que é quando o ato produz efeito. Ver `confirmarRegistro`.
    return doc;
  };

  // "Revalidar": descarta o congelamento e refaz o snapshot com os cadastros atuais.
  const revalidar = async () => {
    if (!clienteId || !modeloId) return;

    const selecaoFresh: Record<string, Record<string, string>> = { ...selecao };
    for (const b of bindings) {
      if (b.tipo === 'sociedade') {
        selecaoFresh[b.nome] = empresaRow
          ? mapearSociedade(
              empresaRow,
              { capitalValor, totalQuotas },
              { numeroAlteracao, ...historicoCapital, tituloColetivoSocios: tituloColetivoDosSocios(socios) },
            )
          : {};
        continue;
      }
      const id = registroPorBinding[b.nome];
      const reg = id ? registros[b.tipo].find((r) => r.id === id) : undefined;
      if (reg) selecaoFresh[b.nome] = mapearRegistro(b.tipo, reg.row);
    }
    // mapearRegistro (matrícula) não traz o georref; re-mescla o cabeçalho atual
    // para o snapshot recém-feito não perder os campos georef* da matrícula.
    if (bindingMatricula && Object.keys(georefCabecalhoCampos).length > 0) {
      selecaoFresh[bindingMatricula] = {
        ...(selecaoFresh[bindingMatricula] ?? {}),
        ...georefCabecalhoCampos,
      };
    }

    // Se os flags mudarem a estrutura, repuxa os bindings da estrutura congelada;
    // trocar modelo/empresa ainda força uma remontagem estrutural completa.
    const snap: SnapshotDados = {
      selecao: selecaoFresh,
      registroPorBinding,
      registrosPorLista,
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
      nomeModelo,
      snapshotFlags: flagsAtivasLive,
      snapshotDados: snap as unknown as Json,
      snapshotVersoesBlocos: snapshotVersoes as unknown as Json,
      // Re-sync de dados na mesma versão — não ramifica.
      novaVersao: false,
    });
    setSelecao(selecaoFresh);
    setDocumentoHead(doc);
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
  // dela. setDocumentoHead já passa a apontar para a head nova.
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

  /**
   * Edição a partir da prévia. `alvoId` permite mirar a VARIANTE que escreveu o
   * trecho em vez do bloco hospedeiro: variante é bloco de verdade, então o
   * override cai nela e passa a valer em toda alínea que a eleger neste documento.
   */
  const editarBlocoNaPrevia = (b: BlocoFolha, alvoId?: string) => {
    const id = alvoId ?? b.blocoId;
    const bloco = id ? (catalogoBlocos.find((x) => x.id === id) ?? variantePorId.get(id) ?? null) : null;
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

  // --- Flags MANUAIS -------------------------------------------------------
  // O interruptor que o consultor liga na mão, para o que não se deriva do
  // cadastro (na alteração contratual: "houve aumento de capital", "houve cessão
  // de quotas"). Só interessam as que ESTE modelo referencia — o catálogo é
  // global e um modelo de constituição não deve pedir nada disso.
  const nomesDeFlagDoModelo = useMemo(
    () => new Set(template.blocos.flatMap((b) => b.flagsRequeridas ?? [])),
    [template],
  );
  const flagsManuaisDoModelo = useMemo(
    () => catalogoFlags.filter((f) => f.tipo === 'manual' && nomesDeFlagDoModelo.has(f.nome)),
    [catalogoFlags, nomesDeFlagDoModelo],
  );
  const valorPorFlagId = useMemo(
    () => new Map(valoresFlagsManuais.map((v) => [v.flag_id, v.valor])),
    [valoresFlagsManuais],
  );
  const nomePorFlagId = useMemo(
    () => new Map(catalogoFlags.map((f) => [f.id, f.nome])),
    [catalogoFlags],
  );
  const flagsManuaisLigadas = useMemo(
    () => nomesDasFlagsManuaisLigadas(valoresFlagsManuais, nomePorFlagId),
    [valoresFlagsManuais, nomePorFlagId],
  );

  // --- Assistente de alteração contratual (modal) --------------------------
  const responderEventos = useResponderEventosDaAlteracao();
  const formalizarMovimentos = useFormalizarMovimentos();


  /**
   * Abre o assistente a partir da folha de um documento travado.
   *
   * O interruptor nasce ligado quando o cadastro sustenta o evento, e a resposta
   * JÁ GRAVADA vence a derivação: reabrir é edição, não recomeço, e desmarcar um
   * evento derivado tem de continuar desmarcado na segunda visita.
   */
  const abrirAlteracao = () => {
    const semente: Record<string, boolean> = {};
    for (const f of flagsManuaisDoModelo) {
      const gravada = valorPorFlagId.get(f.id);
      semente[f.id] = gravada !== undefined ? gravada === true : eventoPorFlagNome.has(f.nome);
    }
    setRespostasAlteracao(semente);
    setAlteracaoDialogOpen(true);
  };

  const alternarRespostaAlteracao = (flagId: string, valor: boolean) => {
    setRespostasAlteracao((prev) => ({ ...prev, [flagId]: valor }));
  };

  /**
   * Fecha o assistente gravando as respostas ancoradas no documento registrado.
   * A partir daqui a folha passa a compor a alteração ao vivo; o documento novo
   * em si só nasce no "Validar versão" seguinte.
   */
  const confirmarAlteracao = async () => {
    // `documentoBaseId`, e não o registrado da tela: depois que a alteração foi
    // validada, a head é ela (em rascunho) e o registrado só existe como
    // `substitui_documento_id`. Exigir o registrado em cena impedia rever os
    // eventos justamente quando a peça já estava composta.
    if (!clienteId || !documentoBaseId) return;
    await responderEventos.mutateAsync({
      clienteId,
      pjPessoaId: empresaId,
      documentoBaseId,
      respostas: flagsManuaisDoModelo.map((f) => ({
        flagId: f.id,
        flagNome: f.nome,
        valor: respostasAlteracao[f.id] === true,
      })),
    });
    setAlteracaoDialogOpen(false);
  };

  // --- Registro na junta ---------------------------------------------------
  const registrarDocumento = useRegistrarDocumento();
  const confirmarRegistro = async () => {
    if (!documentoGeradoId) return;
    // O mesmo porteiro do validar: registrar é o gesto irreversível de propósito,
    // e é ele que carimba o ledger e vira o status do bem.
    if (resultado.erro) {
      toast({
        title: 'A folha está em erro de composição',
        description: `${resultado.erro} — conserte antes de registrar na junta.`,
        variant: 'destructive',
      });
      return;
    }
    const doc = await registrarDocumento.mutateAsync({ documentoGeradoId, nomeModelo });
    setDocumentoHead(doc);
    setRegistrarConfirmOpen(false);
    // O ato produziu efeito: é AQUI que o ledger é carimbado e que os bens desses
    // movimentos passam a 'Integralizado' (D4/D5/D6). Falha não derruba o registro
    // (ver useFormalizarMovimentos): o pior caso é o evento voltar na próxima peça.
    //
    // Quais movimentos a peça contou depende de qual peça ela é:
    //  - ALTERAÇÃO: os eventos que o consultor confirmou no assistente. O que ele
    //    desmarcou não entrou na peça e continua pendente, para a próxima.
    //  - CONTRATO SOCIAL: todos os pendentes. Ele não passa pelo assistente, e a
    //    cláusula de capital dele conta os aportes de constituição inteiros — é
    //    esta extensão (D3) que impede a primeira alteração de recontá-los.
    const ehAlteracao = respostasDaAlteracao.length > 0;
    const aFormalizar = ehAlteracao
      ? flagsManuaisDoModelo
          .filter((f) => respostasAlteracao[f.id] === true || valorPorFlagId.get(f.id) === true)
          .flatMap((f) => eventoPorFlagNome.get(f.nome)?.movimentoIds ?? [])
      : movimentosPendentes;
    if (aFormalizar.length > 0) {
      await formalizarMovimentos.mutateAsync({
        movimentoIds: aFormalizar,
        documentoGeradoId,
        empresaPessoaId: empresaId,
      });
    }
  };

  const flagsAtivasLive = useMemo(() => {
    const declarativas: FlagDeclarativa[] = catalogoFlags
      .filter((f) => f.entidade && f.campo && f.valor)
      .map((f) => ({ nome: f.nome, entidade: f.entidade!, campo: f.campo!, valor: f.valor! }));
    const derivadas = avaliarFlags(declarativas, { empresa: empresaRow });
    // Para o motor os dois tipos são o mesmo interruptor: ele recebe uma lista
    // de nomes ativos e não pergunta de onde cada nome veio. As manuais entram
    // aqui, nas VIVAS, e por isso são congeladas no snapshot como as demais.
    return [...new Set([...derivadas, ...flagsManuaisLigadas, flagDaPeca(numeroAlteracao)])];
  }, [catalogoFlags, empresaRow, flagsManuaisLigadas, numeroAlteracao]);
  // Quando congelado, a estrutura segue os flags gravados; senão, os vivos.
  const flagsAtivas = useMemo(
    () => (congelado && snapshotFlags
      // Snapshot selado antes de as flags de peça existirem é contrato social e
      // não sabe dizê-lo; sem completar, os blocos que passaram a pender de
      // `e_constituicao` somem daquelas peças (ver comFlagDaPecaRetroativa).
      ? comFlagDaPecaRetroativa(snapshotFlags)
      : flagsAtivasLive),
    [congelado, snapshotFlags, flagsAtivasLive],
  );

  // Composição: blocos que efetivamente entram com as flags atuais. A detecção
  // de bindings roda SOBRE OS COMPOSTOS — bloco excluído não pede seleção.
  const blocosCompostos = useMemo(() => comporBlocos(template, flagsAtivas), [template, flagsAtivas]);
  const blocosExcluidos = useMemo(
    () => template.blocos.filter((b) => !blocosCompostos.includes(b)),
    [template, blocosCompostos],
  );
  // Nem toda exclusão por flag é "perfil da empresa". Desde que as resoluções da
  // alteração contratual passaram a morar no MESMO modelo do contrato social
  // (uma por evento, cada uma na sua flag manual), todo contrato de constituição
  // exclui as seis por evento não marcado — e anunciá-las como "não se aplicam a
  // esta empresa" seria mentir sobre o motivo e encher o painel de ruído.
  // O painel nomeia só as que dependem do PERFIL (flags derivadas do cadastro).
  const nomesDeFlagManual = useMemo(
    () => new Set(flagsManuaisDoModelo.map((f) => f.nome)),
    [flagsManuaisDoModelo],
  );
  const nomesDeFlagDaPeca = useMemo(() => new Set(['e_alteracao', 'e_constituicao']), []);
  const blocosExcluidosPorPerfil = useMemo(
    () =>
      blocosExcluidos.filter((b) =>
        (b.flagsRequeridas ?? []).some((n) => !nomesDeFlagManual.has(n) && !nomesDeFlagDaPeca.has(n)),
      ),
    [blocosExcluidos, nomesDeFlagManual, nomesDeFlagDaPeca],
  );
  // Excluído por CONDIÇÃO não marcada: tem flag, e todas as que tem são manuais.
  // Bloco sem flag nenhuma que ficou de fora por não ser obrigatório não entra
  // em bucket nenhum: ele não é condicional, é opcional.
  const blocosExcluidosPorEvento = useMemo(
    () =>
      blocosExcluidos.filter((b) => {
        const flags = b.flagsRequeridas ?? [];
        return (
          flags.length > 0
          && flags.every((n) => nomesDeFlagManual.has(n))
          && flags.every((n) => !nomesDeFlagDaPeca.has(n))
        );
      }),
    [blocosExcluidos, nomesDeFlagManual, nomesDeFlagDaPeca],
  );

  // Bloco repetidor entra na detecção embrulhado na própria seção (os campos do
  // item ficam no escopo da lista; a coleção entra como lista a carregar), e a
  // inclusão de família entra como a união das variantes (os campos que só a
  // redação urbana usa também precisam ser pedidos).
  const { bindings, listas, desconhecidos, secoesDesconhecidas, campos: placeholders } = useMemo(
    () => detectarBindingsDeConteudo(blocosCompostos.map((b) => conteudoParaDeteccao(b, familias)).join(' ')),
    [blocosCompostos, familias],
  );

  // --- Georreferenciamento (caminho de volta: BigQuery → memorial no contrato) ---
  // O georref pende de UMA matrícula: usamos o 1º binding de matrícula do modelo.
  // O cabeçalho vai para os campos georef* desse binding (mesclado em selecao, via
  // efeito abaixo); os vértices entram na lista {{#vertices}} de itensPorLista.
  const bindingMatricula = useMemo(
    () => bindings.find((b) => b.tipo === 'matricula')?.nome ?? null,
    [bindings],
  );
  const matriculaGeorefId = bindingMatricula ? (registroPorBinding[bindingMatricula] ?? null) : null;
  const { data: georef } = useGeorefByMatricula(matriculaGeorefId);
  const georefCabecalhoCampos = useMemo(() => mapearGeorefCabecalho(georef?.cabecalho), [georef]);
  const verticesItens = useMemo<ItemLista[]>(
    () => (georef?.vertices ?? []).map(mapearVertice),
    [georef],
  );

  // Listas relacionais (sócios/administradores) carregam da empresa escolhida;
  // a empresa também alimenta as flags, então o passo aparece em ambos os casos.
  // Vértices (fonte 'georef') vêm da matrícula, não da empresa — não contam aqui.
  const usaListas = listas.some((l) => !['georef', 'selecao'].includes(l.papel.fonte));
  // A "Sociedade" (objeto do contrato) é dirigida pela mesma Empresa que alimenta
  // listas e flags — não tem seletor próprio. Detectar aqui faz o passo de Empresa
  // aparecer mesmo num modelo que só usa sociedade.* (sem listas nem flags).
  const temSociedade = bindings.some((b) => b.tipo === 'sociedade');
  // Rascunhos legados podiam guardar a sociedade inteira como campos livres, sem
  // empresaId. Depois da reidratação, esses valores bastam se não houver listas
  // relacionais nem flags que realmente dependam da empresa.
  const sociedadeCongeladaSemEmpresa =
    congelado &&
    !empresaId &&
    temSociedade &&
    bindings
      .filter((b) => b.tipo === 'sociedade')
      .every((b) => Object.keys(selecao[b.nome] ?? {}).length > 0);
  const precisaEmpresa = usaListas || temBlocosComFlags || (temSociedade && !sociedadeCongeladaSemEmpresa);
  // A sociedade também precisa das listas: capital social e total de quotas saem
  // do quadro societário, e das integralizações apenas na PR que ainda não gravou
  // o quadro, onde os próprios sócios são derivados (daí o tipo da empresa).
  const {
    socios, administradores, integralizacoes, aportes, cessoes, quadroGravado,
    isFetching: carregandoListas,
  } = useListasDaEmpresa(
    usaListas || temSociedade ? empresaId : null,
    empresaRow?.tipo_empresa,
  );
  const carregandoListasEfetivo = carregandoListas && !(congelado && snapshotDados?.itensPorLista);

  // --- Os eventos DERIVADOS da alteração contratual ------------------------
  // O assistente deixa de perguntar "houve aumento de capital?" e passa a
  // mostrar "aumento de capital de R$ 872.674,00 para R$ 4.234.822,00", com o
  // interruptor já ligado. Fica aqui, e não junto do resto do assistente, porque
  // depende das listas da empresa (a janela de audit_logs cobre também as linhas
  // de `administracao`, que é de onde sai a mudança de administração).
  const idsAdministracao = useMemo(
    () => administradores.map((a) => a.administracaoId).filter((id): id is string => !!id),
    [administradores],
  );
  // A chave do diff de quadro (D2): o snapshot não congela o `pessoa.id`, então o
  // "quem entrou e quem saiu" casa por CPF/CNPJ, e o lado vivo entrega o seu aqui.
  const cpfCnpjPorPessoaId = useMemo(() => {
    const out: Record<string, string> = {};
    for (const s of socios) {
      if (s.pessoa.id && s.pessoa.cpf_cnpj) out[s.pessoa.id] = s.pessoa.cpf_cnpj;
    }
    return out;
  }, [socios]);
  const { eventos: eventosDerivados, idsPendentes: movimentosPendentes } = useEventosDerivados({
    empresaPessoaId: empresaId,
    validadoEm: documentoBase?.snapshot_validado_em ?? null,
    administracaoIds: idsAdministracao,
    snapshotDoBase: (documentoBase?.snapshot_dados as unknown as SnapshotDaPeca | null) ?? null,
    cpfCnpjPorPessoaId,
  });
  const eventoPorFlagNome = useMemo(
    () => new Map(eventosDerivados.map((e) => [e.flagNome, e])),
    [eventosDerivados],
  );
  const ehEmpresaPR = empresaRow?.tipo_empresa === 'PR';
  // Sócios derivados de titular sem pessoa cadastrada: qualificação sai incompleta.
  const sociosSemCadastro = useMemo(
    () => socios.filter((s) => s.pessoa.id?.startsWith(PESSOA_LEGADA_PREFIX)),
    [socios],
  );

  // `socio.percentual` e a linha `total` são derivados (calculados aqui, não vêm
  // do banco): dependem da soma das quotas, que só existe no nível da lista.
  // Os ids de quem administra entram no mapeador do quadro: é o que a linha de
  // assinatura precisa para escrever "Sócia administradora" em vez de só "Sócia".
  // A informação cruza duas fontes (o quadro societário x administracao), e o
  // mapeador é quem tem a linha da pessoa para casar.
  const quadro = useMemo(
    () => mapearQuadroSocietario(socios, new Set(administradores.map((a) => a.pessoa.id).filter(Boolean))),
    [socios, administradores],
  );
  const idsImoveisSelecionados = useMemo(
    () => registrosPorLista.imoveis ?? [],
    [registrosPorLista.imoveis],
  );
  const { porMatricula: georefsPorMatricula, isFetching: carregandoGeorefsSelecionados } =
    useGeorefsByMatriculas(idsImoveisSelecionados);
  const imoveisSelecionados = useMemo<ItemLista[]>(
    () => idsImoveisSelecionados.flatMap((id) => {
      const registro = registros.matricula.find((item) => item.id === id);
      if (!registro) return [];
      const georefDoImovel = georefsPorMatricula[id];
      return [{
        imovel: {
          ...mapearRegistro('matricula', registro.row),
          ...mapearGeorefCabecalho(georefDoImovel?.cabecalho),
        },
        vertices: (georefDoImovel?.vertices ?? []).map(mapearVertice),
      }];
    }),
    [idsImoveisSelecionados, registros.matricula, georefsPorMatricula],
  );
  const carregandoDadosDocumento = carregandoListasEfetivo || carregandoGeorefsSelecionados;
  const pessoaPorId = useMemo(
    () => new Map(registros.pessoa.map((registro) => {
      const pessoa = registro.row as PessoaRow;
      return [pessoa.id, pessoa] as const;
    })),
    [registros.pessoa],
  );
  // Quotas de cada pessoa no quadro da empresa selecionada, para a ORDEM das
  // partes (ver mapearPartesSelecionadas). Sai do NÚMERO (quotasDoSocio), não do
  // `socio.quotas` do quadro mapeado, que já é texto formatado com milhar —
  // ordenar por ele ordenaria "1.500" antes de "900". Sem empresa (ou empresa sem
  // quadro) o mapa fica vazio, e a ordenação cai no balde alfabético sozinha.
  const quotasPorPessoa = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const s of socios) {
      const quotas = quotasDoSocio(s.quotas, s.vlr_total);
      if (s.pessoa.id && quotas != null) mapa.set(s.pessoa.id, quotas);
    }
    return mapa;
  }, [socios]);
  // Listas de PESSOAS escolhidas a dedo ({{#partes}}): mesma fonte 'selecao' dos
  // imóveis (registrosPorLista + registros do cliente), derivadas genericamente do
  // papel — declarar outra seção de pessoas em PAPEIS_LISTA não pede código aqui.
  // Os imóveis ficam de fora de propósito: eles têm tratamento próprio (georref por
  // imóvel e a lista aninhada {{#vertices}}).
  const listasDePessoaSelecionada = useMemo(
    () =>
      listas
        .filter((l) => l.papel.fonte === 'selecao' && l.papel.tipo === 'pessoa')
        .map((l) => l.nome),
    [listas],
  );
  // A chave existe sempre que o papel é detectado — array vazio quando ainda não
  // há seleção. É o que `montarContexto` já garante para toda lista detectada; num
  // bloco REPETIDOR a coleção ausente derruba a prévia inteira (repetidor.ts:34-36),
  // e numa seção inline ela sairia como laço vazio, descartando o bloco calado.
  const partesPorLista = useMemo<Record<string, ItemLista[]>>(() => {
    const out: Record<string, ItemLista[]> = {};
    for (const nome of listasDePessoaSelecionada) {
      out[nome] = mapearPartesSelecionadas(
        (registrosPorLista[nome] ?? []).flatMap((id) => {
          const registro = registros.pessoa.find((item) => item.id === id);
          return registro ? [{ id, campos: mapearRegistro('pessoa', registro.row) }] : [];
        }),
        quotasPorPessoa,
      );
    }
    return out;
  }, [listasDePessoaSelecionada, registrosPorLista, registros.pessoa, quotasPorPessoa]);
  const itensPorLista = useMemo<Record<string, ItemLista[]>>(
    () => ({
      socios: quadro.itens,
      administradores: administradores.map(mapearAdministrador),
      integralizacoes: mapearIntegralizacoes(socios, integralizacoes, aportes),
      cessoes: mapearCessoes(cessoes),
      imoveis: imoveisSelecionados,
      signatarios: mapearSignatarios({
        socios,
        administradores,
        pessoaPorId: (id) => pessoaPorId.get(id) ?? null,
        // Advogado e testemunhas continuam em linhas fixas no bloco de fecho.
        // Passá-los aqui os faria assinar duas vezes.
      }),
      vertices: verticesItens,
      // Listas de seleção manual de pessoas ({{#partes}}), por nome do papel.
      ...partesPorLista,
    }),
    [quadro, socios, administradores, integralizacoes, aportes, cessoes, imoveisSelecionados, pessoaPorId, verticesItens, partesPorLista],
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
      s.movimentoIds?.forEach((mid) => ids.add(mid));
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
      if (log.action === 'deleted' || log.action === 'created') {
        out.push({ key: log.id, action: log.action, entityName: log.entity_name, meta });
        continue;
      }
      const mudancas = log.changed_fields ? formatChangedFields(log.changed_fields, lookupsNotificacao) : [];
      if (mudancas.length === 0) {
        out.push({ key: log.id, action: 'updated', entityName: log.entity_name, meta });
        continue;
      }
      mudancas.forEach((m, i) => out.push({
        key: `${log.id}:${i}`, action: 'field', entityName: log.entity_name,
        label: m.label, newValue: m.newValue, meta,
      }));
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

  // Campos editáveis (base, não-derivados) de cada binding, conforme o que o
  // modelo referencia — a regra inteira vive em camposDoBinding.ts, com teste.
  const camposPorBinding = useMemo(
    () => camposEditaveisPorBinding(placeholders, bindings),
    [placeholders, bindings],
  );

  // Trocar de modelo ou de cliente zera as seleções.
  useEffect(() => {
    setSelecao({});
    setRegistroPorBinding({});
    setRegistrosPorLista({});
    setListasConfirmadas(false);
    setValoresLivres({});
    setEmpresaId(null);
    camposEditadosRef.current.clear();
    empresaSociedadeRef.current = null;
    setRecongelarPendente(false);
  }, [modeloId, clienteId]);

  // Capital social + total de quotas da sociedade: a PR ainda sem quadro gravado
  // soma as integralizações aprovadas (quota = R$ 1,00); as demais (e a PR
  // depois de gravar) somam o quadro societário.
  const { capitalValor, totalQuotas } = useMemo(
    () => calcularCapitalSociedade(empresaRow, socios, integralizacoes, quadroGravado),
    [empresaRow, socios, integralizacoes, quadroGravado],
  );
  const historicoCapital = useMemo(
    () => calcularHistoricoCapital(
      capitalValor,
      documentoBase?.snapshot_dados as unknown as SnapshotDados | null | undefined,
    ),
    [capitalValor, documentoBase?.snapshot_dados],
  );
  const tituloColetivoSocios = useMemo(() => tituloColetivoDosSocios(socios), [socios]);

  // A Sociedade (objeto do contrato) espelha a Empresa selecionada: escolher/trocar
  // a empresa (ou carregar o capital calculado) repreenche os campos sociedade.* do
  // cadastro (editáveis depois); sem empresa, ficam em branco. Não tem seletor de
  // registro próprio. Deps primitivas: as listas trocam de identidade a cada render
  // enquanto carregam — depender delas aqui criaria loop de setState.
  useEffect(() => {
    const empresaMudou = empresaSociedadeRef.current !== empresaId;
    empresaSociedadeRef.current = empresaId;
    const sociedadeBindings = bindings.filter((b) => b.tipo === 'sociedade');
    if (empresaMudou) {
      for (const b of sociedadeBindings) {
        for (const chave of camposEditadosRef.current) {
          if (chave.startsWith(`${b.nome}.`)) camposEditadosRef.current.delete(chave);
        }
      }
    }
    if (sociedadeBindings.length === 0) return;
    const campos = empresaRow
      ? mapearSociedade(
          empresaRow,
          { capitalValor, totalQuotas },
          { numeroAlteracao, ...historicoCapital, tituloColetivoSocios },
        )
      : {};

    // CONGELADO: a sociedade vem do snapshot, e nenhum valor dele se reescreve —
    // é o que faz a peça validada continuar a peça que valeu. Mas a head (mesmo
    // registrada) renderiza os blocos VIVOS da Biblioteca, e um bloco pode passar
    // a citar um campo que o snapshot daquele documento nem conhecia. Sem
    // preencher a lacuna, o documento antigo quebra inteiro em "Placeholder não
    // resolvido" no dia em que o modelo evolui. Então o que falta ENTRA, e só o
    // que falta.
    if (congelado) {
      setSelecao((prev) => {
        let mudou = false;
        const next = { ...prev };
        for (const b of sociedadeBindings) {
          const atual = prev[b.nome] ?? {};
          const faltantes = Object.entries(campos).filter(([campoId]) => atual[campoId] === undefined);
          if (faltantes.length === 0) continue;
          next[b.nome] = { ...atual, ...Object.fromEntries(faltantes) };
          mudou = true;
        }
        // Devolver `prev` quando nada faltava mantém a identidade do estado: um
        // objeto novo a cada passada faria a prévia recompor sem motivo.
        return mudou ? next : prev;
      });
      return;
    }

    setSelecao((prev) => {
      const next = { ...prev };
      for (const b of sociedadeBindings) {
        const atual = prev[b.nome] ?? {};
        const mesclado = { ...campos };
        for (const [campoId, valor] of Object.entries(atual)) {
          if (camposEditadosRef.current.has(`${b.nome}.${campoId}`)) mesclado[campoId] = valor;
        }
        next[b.nome] = mesclado;
      }
      return next;
    });
  }, [empresaId, empresaRow, bindings, capitalValor, totalQuotas, congelado, numeroAlteracao, historicoCapital, tituloColetivoSocios]);

  // O cabeçalho do georref (área/perímetro/sistema/certificação) espelha a matrícula
  // selecionada nos campos georef* do binding de matrícula — como a sociedade espelha
  // a empresa. Mescla (não substitui) para preservar os campos do cadastro e a origem
  // clicável já gravada. Sem georref, nada a fazer. Congelado vem do snapshot.
  useEffect(() => {
    if (congelado) return;
    if (!bindingMatricula) return;
    if (Object.keys(georefCabecalhoCampos).length === 0) return;
    setSelecao((prev) => {
      const atual = prev[bindingMatricula] ?? {};
      const mudou = Object.entries(georefCabecalhoCampos).some(([k, v]) => atual[k] !== v);
      if (!mudou) return prev;
      return { ...prev, [bindingMatricula]: { ...atual, ...georefCabecalhoCampos } };
    });
  }, [georefCabecalhoCampos, bindingMatricula, congelado]);

  const escolherRegistro = (nome: string, tipo: TipoEntidade, registroId: string) => {
    const reg = registros[tipo].find((r) => r.id === registroId);
    if (!reg) return;
    for (const chave of camposEditadosRef.current) {
      if (chave.startsWith(`${nome}.`)) camposEditadosRef.current.delete(chave);
    }
    setRegistroPorBinding((prev) => ({ ...prev, [nome]: registroId }));
    setSelecao((prev) => ({ ...prev, [nome]: mapearRegistro(tipo, reg.row) }));
    setPassoAberto(null);
    if (congelado) setRecongelarPendente(true);
  };

  // Seleção MÚLTIPLA: marcar um item não fecha o passo nem conclui a escolha —
  // o contrato de constituição integraliza várias matrículas, e fechar no
  // primeiro clique (como faz a escolha unitária) tirava a lista da tela com um
  // item só. Quem declara o fim da montagem é `confirmarSelecaoDeListas`.
  const alternarRegistroDaLista = (nome: string, registroId: string) => {
    setRegistrosPorLista((prev) => {
      const atuais = prev[nome] ?? [];
      const proximos = atuais.includes(registroId)
        ? atuais.filter((id) => id !== registroId)
        : [...atuais, registroId];
      return { ...prev, [nome]: proximos };
    });
    if (congelado) setRecongelarPendente(true);
  };

  const confirmarSelecaoDeListas = () => {
    setListasConfirmadas(true);
    setPassoAberto(null);
  };

  const editarCampo = (nome: string, tipo: TipoEntidade, campoId: string, valor: string) => {
    camposEditadosRef.current.add(`${nome}.${campoId}`);
    for (const campo of camposDaEntidade(tipo)) {
      const dependencias = Array.isArray(campo.derivadoDe) ? campo.derivadoDe : [campo.derivadoDe];
      if (dependencias.includes(campoId)) camposEditadosRef.current.add(`${nome}.${campo.id}`);
    }
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
    | { blocos: BlocoGerado[]; texto: string; descartados: BlocoDescartado[]; erro: null }
    | { blocos: null; texto: null; descartados: BlocoDescartado[]; erro: string }
  >(() => {
    if (template.blocos.length === 0) return { blocos: [], texto: '', descartados: [], erro: null };
    try {
      // Texto livre: todo placeholder sem binding resolve em branco quando vazio,
      // para a prévia não travar antes de preencher (diferente dos bindings, que
      // exigem seleção de registro).
      const livres = Object.fromEntries(desconhecidosVisiveis.map((ph) => [ph, valoresLivres[ph] ?? '']));
      // Seções desconhecidas resolvem como '' (falsy): o trecho sai da prévia sem travar.
      for (const nome of secoesDesconhecidas) livres[nome] = livres[nome] ?? '';
      // Snapshot antigo sem itensPorLista/total cai para a fonte viva até revalidar.
      // O snapshot vem do jsonb (round-trip): reidratar religa as referências
      // cruzadas de integralizacoes ({{ refItem.ref }}) perdidas na serialização.
      // Listas que o snapshot selado pode não ter (georref, signatários): sem esta
      // ponte, a chave ausente vira laço vazio e o motor descarta o bloco inteiro —
      // é o que apagava a folha de assinaturas de todo documento validado antes de
      // `signatarios` existir. A regra de cada lista está em contextoDoDocumento.ts.
      const itensEfetivo = completarListasDoSnapshot(
        reidratarItensPorLista(congelado ? (snapshotDados?.itensPorLista ?? itensPorLista) : itensPorLista),
        itensPorLista,
      );
      const totalEfetivo = congelado ? (snapshotDados?.total ?? quadro.total) : quadro.total;

      // A serialização do snapshot também PERDE a proveniência (a origem viaja
      // como Symbol — ver origem.ts), e sem ela os valores da prévia deixam de
      // ser clicáveis. Religamos: bindings unitários/sociedade pela id guardada
      // no próprio snapshot; as listas copiando a origem dos itens vivos (mesma
      // ordem). No caminho vivo (não congelado) a origem já está lá — nada a fazer.
      let selecaoEfetiva = selecao;
      if (congelado) {
        selecaoEfetiva = selecaoComOrigemDoSnapshot(selecao, bindings, registroPorBinding, empresaId);
        // itensEfetivo === itensPorLista quando o snapshot não tinha listas (fonte
        // viva, já com origem) — só copia quando são estruturas distintas.
        if (itensEfetivo !== itensPorLista) copiarOrigemProfunda(itensEfetivo, itensPorLista);
      }
      const ctx = montarContexto(bindings, selecaoEfetiva, livres, itensEfetivo, listas);
      contextoComGeoref(ctx, bindingMatricula, georefCabecalhoCampos);
      // Total dos sócios: campos em branco mantêm a prévia viva antes de a empresa
      // ser escolhida; preenchem quando as quotas carregam.
      if (usaTotalSocios) ctx.total = { quotas: '', vlrTotal: '', percentual: '', ...totalEfetivo };
      // gerarComposicao, e não gerarBlocos: o descarte de bloco sem dado se ANUNCIA
      // (emenda 9.2), e é o que a folha conta e o painel de conferência mostra.
      const { blocos, descartados } = gerarComposicao(template, ctx, flagsAtivas, familias);
      const texto = unirBlocos(blocos);

      // Blocos sobrescritos: renderiza os MESMOS blocos com o conteúdo original
      // (mesmo ctx → numeração/placeholders idênticos) e marca, por palavra, só o
      // que mudou. Sem overrides, nada é renderizado a mais. As famílias também
      // vão sem override, senão a variante sobrescrita não apareceria realçada.
      if (posicoesSobrescritas.size === 0) return { blocos, texto, descartados, erro: null };
      const original = gerarBlocos(templateOriginal, ctx, flagsAtivas, familiasOriginais);
      const textoOriginalPorId = new Map(original.map((b) => [b.id, b.conteudo]));
      const comRealce = blocos.map((b) => {
        const posId = b.instanciaDe ?? b.id;
        const orig = textoOriginalPorId.get(b.id);
        if (!posicoesSobrescritas.has(posId) || orig == null) return b;
        return { ...b, segmentos: marcarRealceDiff(b.segmentos, orig) };
      });
      return { blocos: comRealce, texto, descartados, erro: null };
    } catch (e) {
      return { blocos: null, texto: null, descartados: [], erro: e instanceof Error ? e.message : String(e) };
    }
  }, [template, templateOriginal, familias, familiasOriginais, posicoesSobrescritas, bindings, selecao, registroPorBinding, empresaId, valoresLivres, desconhecidosVisiveis, secoesDesconhecidas, itensPorLista, listas, usaTotalSocios, quadro, flagsAtivas, congelado, snapshotDados, bindingMatricula, georefCabecalhoCampos]);

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

  const pendenciasDocumento = useMemo(
    () => resultado.blocos ? pendenciasDoDocumento(resultado.blocos) : [],
    [resultado.blocos],
  );
  const documentoCompleto = pendenciasDocumento.length === 0;
  // Por que selar e registrar estão fechados, em português de tela. Vira tooltip
  // no rail e é a mesma condição que os porteiros de `validarVersao` e
  // `confirmarRegistro` checam — a guarda mora na função, o aviso mora aqui.
  const motivoDeBloqueio = resultado.erro
    ? `A folha está em erro de composição: ${resultado.erro}`
    : null;
  const [baixando, setBaixando] = useState(false);
  const [baixarIncompletoOpen, setBaixarIncompletoOpen] = useState(false);

  const executarDownload = async (rascunho: boolean) => {
    if (!resultado.blocos?.length) return;
    setBaixando(true);
    try {
      const download = prepararDownloadDocumento(nomeModelo, resultado.blocos, rascunho);
      await baixarDocx(download.nome, download.blocos);
    } finally {
      setBaixando(false);
    }
  };

  const baixar = async () => {
    if (!resultado.blocos?.length) return;
    if (!documentoCompleto) {
      setBaixarIncompletoOpen(true);
      return;
    }
    await executarDownload(false);
  };

  const confirmarDownloadIncompleto = async () => {
    setBaixarIncompletoOpen(false);
    await executarDownload(true);
  };

  // Bindings ainda não preenchidos (sem registro escolhido e sem edição manual):
  // a prévia só resolve depois de ligar um registro a cada entidade.
  const bindingsPendentes = bindings.filter(
    (b) =>
      b.tipo !== 'sociedade' &&
      !registroPorBinding[b.nome] &&
      Object.keys(selecao[b.nome] ?? {}).length === 0,
  );
  const listasDeSelecao = listas.filter((lista) => lista.papel.fonte === 'selecao');
  const listasSelecaoPendentes = listasDeSelecao.filter(
    (lista) => (registrosPorLista[lista.nome] ?? []).length === 0,
  );
  // Enquanto o consultor monta a lista, a seleção NÃO está completa mesmo com um
  // item marcado — senão o passo sai de cena no primeiro clique.
  const selecaoDeListasEmAberto = listasDeSelecao.length > 0 && !listasConfirmadas;
  const listasPendentes =
    (precisaEmpresa && !empresaId) || listasSelecaoPendentes.length > 0 || selecaoDeListasEmAberto;

  // Empresas (PJ) do cliente, para a fonte das listas relacionais.
  const empresas = useMemo(
    () => registros.pessoa.filter((r) => (r.row as PessoaRow).tipo_pessoa === 'PJ'),
    [registros.pessoa],
  );

  // --- Fluxo guiado: estado de cada passo -----------------------------------

  const bindingsNaoSociedade = bindings.filter((b) => b.tipo !== 'sociedade');
  const precisaSelecoes = precisaEmpresa || bindingsNaoSociedade.length > 0 || listasDeSelecao.length > 0;
  const selecoesCompletas = !listasPendentes && bindingsPendentes.length === 0;
  const modeloPronto = !!modeloId && !carregandoBlocos && template.blocos.length > 0;

  // As condições manuais NÃO são passo do fluxo de geração. Elas são as
  // perguntas do assistente de alteração contratual, que só faz sentido diante
  // de um contrato já registrado — ver abrirAlteracao. O modelo pode ou não ter
  // blocos pendurados nelas; quando não tem, não há alteração a gerar.
  const podeGerarAlteracao = flagsManuaisDoModelo.length > 0;

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
  // Os eventos que esta alteração registra, para o banner sobre a folha.
  const rotulosEventosDaAlteracao = flagsManuaisDoModelo
    .filter((f) => valorPorFlagId.get(f.id) === true)
    .map((f) => f.descricao || f.nome);
  const resumoDaAlteracao =
    rotulosEventosDaAlteracao.length > 0
      ? rotulosEventosDaAlteracao.join(' · ')
      : 'Nenhum evento marcado';

  const pendencias = [
    precisaEmpresa && !empresaId ? 'escolha a empresa do contrato' : null,
    listasSelecaoPendentes.length > 0
      ? `selecione ${listasSelecaoPendentes.map((lista) => lista.papel.label).join(', ')}`
      : selecaoDeListasEmAberto
        ? 'conclua a seleção dos registros'
        : null,
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
        // Variantes que escreveram trecho DESTA instância (o render marca cada
        // segmento com o bloco de origem): a prévia oferece editar a redação que
        // saiu de verdade, não só o parágrafo hospedeiro. Num repetidor cada
        // instância pode ter caído numa variante diferente, e é por isso que a
        // lista sai do render e não do conteúdo do bloco.
        const variantes = [...new Set(b.segmentos.map((s) => s.blocoId).filter((id): id is string => !!id))].map(
          (id) => ({ id, nome: nomePorVarianteId.get(id) ?? id }),
        );
        return {
          id: b.id,
          blocoId: bibliotecaIdPorBlocoId.get(posicaoId) ?? null,
          nome: nomePorBlocoId.get(posicaoId) ?? '',
          tipo: b.tipo,
          conteudo: b.conteudo,
          segmentos: b.segmentos,
          sobrescrito: posicoesSobrescritas.has(posicaoId),
          variantes,
        };
      }),
    [resultado.blocos, nomePorBlocoId, nomePorVarianteId, bibliotecaIdPorBlocoId, posicoesSobrescritas],
  );

  // --- Visualização de versão anterior (somente leitura) --------------------
  // Renderiza a versão selada escolhida PURAMENTE do seu snapshot (sem cadastros
  // vivos) e realça, por palavra, o que mudou em relação à versão imediatamente
  // anterior na linhagem. A head (rascunho) não passa por aqui — ela é a prévia viva.
  const versaoView = useMemo(() => {
    if (!versaoVisualizadaId) return null;
    const idx = versoes.findIndex((v) => v.row.id === versaoVisualizadaId);
    if (idx < 0) return null;
    const alvo = versoes[idx].row;
    const anterior = idx > 0 ? versoes[idx - 1].row : null;
    const atual = renderizarVersao(
      alvo.snapshot_versoes_blocos as unknown as SnapshotVersoes | null,
      alvo.snapshot_flags as string[] | null,
      alvo.snapshot_dados as unknown as SnapshotDados | null,
      modeloSocietario,
    );
    const base = anterior
      ? renderizarVersao(
          anterior.snapshot_versoes_blocos as unknown as SnapshotVersoes | null,
          anterior.snapshot_flags as string[] | null,
          anterior.snapshot_dados as unknown as SnapshotDados | null,
          modeloSocietario,
        )
      : null;
    return {
      numero: versoes[idx].numero,
      row: alvo,
      erro: atual.erro,
      blocos: realcarMudancas(atual.blocos, base?.blocos ?? null),
    };
  }, [versaoVisualizadaId, versoes, modeloSocietario]);

  const modoVisualizacao = versaoView != null;

  const blocosFolhaVersao = useMemo<BlocoFolha[]>(
    () =>
      (versaoView?.blocos ?? []).map((b) => {
        const posicaoId = b.instanciaDe ?? b.id;
        return {
          id: b.id,
          blocoId: null, // somente leitura: sem atalho de edição
          nome: nomePorBlocoId.get(posicaoId) ?? '',
          tipo: b.tipo,
          conteudo: b.conteudo,
          segmentos: b.segmentos,
          sobrescrito: false,
        };
      }),
    [versaoView, nomePorBlocoId],
  );

  const [baixandoVersao, setBaixandoVersao] = useState(false);
  const baixarVersao = async () => {
    if (!versaoView?.blocos?.length) return;
    setBaixandoVersao(true);
    try {
      await baixarDocx(`${nomeModelo} (versão ${versaoView.numero})`, versaoView.blocos);
    } finally {
      setBaixandoVersao(false);
    }
  };

  const folhaEstado: EstadoFolha = !selecoesCompletas
    ? 'pendente'
    : carregandoDadosDocumento
      ? 'carregando'
      : resultado.erro
        ? 'erro'
        : 'pronto';

  // Rodapé da folha: conta o que SAIU, não o que foi composto. Contar os
  // compostos anunciava "1 blocos · preenchido do cadastro" numa folha vazia,
  // depois que o descarte de bloco sem dado passou a valer.
  const infoFolha = resumoDaFolha({
    blocos: resultado.blocos ?? [],
    descartados: resultado.descartados,
    totalNoModelo: template.blocos.length,
    excluidosPorFlag: blocosExcluidosPorPerfil.length,
    excluidosPorEvento: blocosExcluidosPorEvento.length,
  });

  // O que não entrou no documento, com o porquê — o descarte se anuncia na tela,
  // não só no retorno do motor (emenda 9.2).
  const blocosSemDado = blocosForaDaFolha(
    resultado.descartados,
    resultado.blocos ?? [],
    (id) => nomePorBlocoId.get(id) ?? id,
  );

  // O painel de conferência só existe quando há algo a conferir/ajustar — e um
  // bloco que ficou de fora do documento é algo a conferir.
  const temPainel =
    blocosSemDado.length > 0 ||
    precisaEmpresa ||
    bindings.length > 0 ||
    desconhecidosVisiveis.length > 0 ||
    secoesDesconhecidas.length > 0;

  const mostraSocios = listas.some((l) => l.nome === 'socios');
  const mostraAdministradores = listas.some((l) => l.nome === 'administradores');
  const mostraIntegralizacoes = listas.some((l) => l.nome === 'integralizacoes');

  return {
    modelos, carregandoModelos, modeloId, setModeloId, docBlocos, carregandoBlocos,
    clienteId, registros, carregandoRegistros, selecao, registroPorBinding,
    registrosPorLista, alternarRegistroDaLista, confirmarSelecaoDeListas,
    listasDeSelecao, listasSelecaoPendentes, blocosSemDado, valoresLivres,
    setValoresLivres, empresaId, setEmpresaId, copiado, passoAberto, setPassoAberto,
    ajustesAbertos, setAjustesAbertos, railAberto, setRailAberto, versaoVisualizadaId,
    setVersaoVisualizadaId, abaEfetiva, setAba, documentoGeradoId, documentoRaizId,
    versoes, congelado, porBlocoAlvo, template, nomePorBlocoId, salvarDocumento,
    blocoOverrideAlvo, setBlocoOverrideAlvo, blocoPendente, setBlocoPendente,
    validarConfirmOpen, setValidarConfirmOpen, novaVersaoConfirmOpen,
    setNovaVersaoConfirmOpen, gatingPromptOpen, setGatingPromptOpen,
    setRecongelarPendente, confirmarValidacao, confirmarNovaVersao, revalidar,
    confirmarValidacaoEAbrirBloco, pessoaEditando, bemEditando, matriculaEditando,
    flagsAtivas, temBlocosComFlags, blocosExcluidos, blocosExcluidosPorPerfil, bindings, secoesDesconhecidas,
    precisaEmpresa, socios, administradores, integralizacoes,
    carregandoListasEfetivo: carregandoDadosDocumento,
    ehEmpresaPR, sociosSemCadastro, capitalValor, totalQuotas, naoLidas,
    linhasNotificacao, marcarVistas, autorPorId, usaTotalSocios,
    desconhecidosVisiveis, camposPorBinding, escolherRegistro, editarCampo, editarBlocoNaPrevia,
    matriculasDoCliente, origemClicavel, abrirCadastroOrigem, fecharCadastroOrigem,
    resultado, copiar, nomeModelo, baixando, baixar, baixarIncompletoOpen,
    setBaixarIncompletoOpen, confirmarDownloadIncompleto, pendenciasDocumento,
    documentoCompleto, motivoDeBloqueio, bindingsPendentes,
    listasPendentes, empresas, bindingsNaoSociedade, precisaSelecoes,
    selecoesCompletas, modeloPronto, passo1Estado, passo2Estado,
    // Alteração contratual: o documento travado, o assistente em modal e o
    // registro na junta que trava o documento em primeiro lugar.
    documentoRegistrado, documentoBaseId, alteracaoEmCurso, podeReverEventos, podeGerarAlteracao,
    flagsManuaisDoModelo, valorPorFlagId, resumoDaAlteracao, rotulosEventosDaAlteracao,
    // A evidência de cada evento derivado, por nome de flag: é ela que o
    // assistente mostra no lugar da pergunta.
    evidenciaPorFlagNome: new Map(
      [...eventoPorFlagNome].map(([nome, evento]) => [nome, evento.evidencia]),
    ),
    alteracaoDialogOpen, setAlteracaoDialogOpen, respostasAlteracao,
    abrirAlteracao, alternarRespostaAlteracao, confirmarAlteracao,
    salvandoAlteracao: responderEventos.isPending,
    registrarConfirmOpen, setRegistrarConfirmOpen, confirmarRegistro,
    registrandoDocumento: registrarDocumento.isPending,
    modoDocumento,
    empresaLabel, labelsRegistros, resumoPasso2, mensagemPendente, blocosFolha,
    versaoView, modoVisualizacao, blocosFolhaVersao, baixandoVersao, baixarVersao,
    folhaEstado, infoFolha, temPainel, mostraSocios, mostraAdministradores,
    mostraIntegralizacoes,
  };
}

export type GerarDocumentoController = ReturnType<typeof useGerarDocumentoController>;
