import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  ChevronDown,
  Database,
  Landmark,
  Loader2,
  Map as MapIcon,
  Pencil,
  PieChart,
  Sparkles,
  UserCog,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  avaliarFlags,
  comporBlocos,
  gerarBlocos,
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
import { detectarBindingsDeConteudo, labelDoBinding } from '@/lib/templates/binding';
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
import { EditorBlocoDialog } from '@/components/equipe/osg/EditorBlocoDialog';
import { PessoaModal } from '@/components/equipe/osg/qualificacao-das-partes/PessoaModal';
import { BemModal } from '@/components/equipe/osg/diagnostico-patrimonial/BemModal';
import { MatriculaModal } from '@/components/equipe/osg/diagnostico-patrimonial/MatriculaModal';
import { useAllMatriculas, type BemRow, type MatriculaEnriched } from '@/hooks/useDiagnosticoPatrimonial';
import { PESSOA_LEGADA_PREFIX, useListasDaEmpresa, useRegistrosPorTipo } from '@/hooks/useGeracaoDocumento';
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

  // Template do engine: blocos do modelo com tipo, obrigatório e flags requeridas.
  const template = useMemo<Template>(() => {
    const blocos = docBlocos
      .filter((b) => b.bloco?.conteudo)
      .map((b) => ({
        id: b.id,
        tipo: b.bloco!.tipo,
        conteudo: b.bloco!.conteudo as string,
        obrigatorio: b.obrigatorio,
        flagsRequeridas: b.bloco!.flags,
      }));
    return { id: modeloId ?? 'novo', nome: 'documento', blocos };
  }, [docBlocos, modeloId]);

  const nomePorBlocoId = useMemo(
    () => new Map(docBlocos.map((b) => [b.id, b.bloco?.nome ?? b.id])),
    [docBlocos],
  );
  // Posição no modelo → bloco da Biblioteca, para a edição a partir da prévia.
  const bibliotecaIdPorBlocoId = useMemo(
    () => new Map(docBlocos.map((b) => [b.id, b.bloco?.id ?? null])),
    [docBlocos],
  );

  // Edição de bloco direto da prévia: clicar num trecho abre o popover e, dele,
  // o mesmo dialog da Biblioteca/Montagem com o bloco carregado.
  const queryClient = useQueryClient();
  const { data: catalogoBlocos = [] } = useBlocos();
  const [blocoEditando, setBlocoEditando] = useState<BlocoComVersao | null>(null);
  const abrirEdicaoBloco = (blocoId: string | null) => {
    const bloco = blocoId ? (catalogoBlocos.find((b) => b.id === blocoId) ?? null) : null;
    if (bloco) setBlocoEditando(bloco);
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
  const flagsAtivas = useMemo(() => {
    const declarativas: FlagDeclarativa[] = catalogoFlags
      .filter((f) => f.entidade && f.campo && f.valor)
      .map((f) => ({ nome: f.nome, entidade: f.entidade!, campo: f.campo!, valor: f.valor! }));
    return avaliarFlags(declarativas, { empresa: empresaRow });
  }, [catalogoFlags, empresaRow]);

  // Composição: blocos que efetivamente entram com as flags atuais. A detecção
  // de bindings roda SOBRE OS COMPOSTOS — bloco excluído não pede seleção.
  const blocosCompostos = useMemo(() => comporBlocos(template, flagsAtivas), [template, flagsAtivas]);
  const blocosExcluidos = useMemo(
    () => template.blocos.filter((b) => !blocosCompostos.includes(b)),
    [template, blocosCompostos],
  );

  const { bindings, listas, desconhecidos, secoesDesconhecidas, campos: placeholders } = useMemo(
    () => detectarBindingsDeConteudo(blocosCompostos.map((b) => b.conteudo).join(' ')),
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
    const sociedadeBindings = bindings.filter((b) => b.tipo === 'sociedade');
    if (sociedadeBindings.length === 0) return;
    const campos = empresaRow ? mapearSociedade(empresaRow, { capitalValor, totalQuotas }) : {};
    setSelecao((prev) => {
      const next = { ...prev };
      for (const b of sociedadeBindings) next[b.nome] = campos;
      return next;
    });
  }, [empresaRow, bindings, capitalValor, totalQuotas]);

  const escolherRegistro = (nome: string, tipo: TipoEntidade, registroId: string) => {
    const reg = registros[tipo].find((r) => r.id === registroId);
    if (!reg) return;
    setRegistroPorBinding((prev) => ({ ...prev, [nome]: registroId }));
    setSelecao((prev) => ({ ...prev, [nome]: mapearRegistro(tipo, reg.row) }));
    setPassoAberto(null);
  };

  const editarCampo = (nome: string, tipo: TipoEntidade, campoId: string, valor: string) => {
    setSelecao((prev) => {
      const atual = { ...(prev[nome] ?? {}), [campoId]: valor };
      return { ...prev, [nome]: derivarCampos(tipo, atual) };
    });
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
  }, [origemPendenteRemap, registros, carregandoRegistros, bindings, registroPorBinding]);

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
      const ctx = montarContexto(bindings, selecao, livres, itensPorLista, listas);
      // Total dos sócios: campos em branco mantêm a prévia viva antes de a empresa
      // ser escolhida; preenchem quando as quotas carregam.
      if (usaTotalSocios) ctx.total = { quotas: '', vlrTotal: '', percentual: '', ...quadro.total };
      const blocos = gerarBlocos(template, ctx, flagsAtivas);
      return { blocos, texto: unirBlocos(blocos), erro: null };
    } catch (e) {
      return { blocos: null, texto: null, erro: e instanceof Error ? e.message : String(e) };
    }
  }, [template, bindings, selecao, valoresLivres, desconhecidosVisiveis, secoesDesconhecidas, itensPorLista, listas, usaTotalSocios, quadro, flagsAtivas]);

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
  // trecho do documento veio de qual bloco do modelo.
  const blocosFolha = useMemo<BlocoFolha[]>(
    () =>
      (resultado.blocos ?? []).map((b) => ({
        id: b.id,
        blocoId: bibliotecaIdPorBlocoId.get(b.id) ?? null,
        nome: nomePorBlocoId.get(b.id) ?? '',
        tipo: b.tipo,
        conteudo: b.conteudo,
        segmentos: b.segmentos,
      })),
    [resultado.blocos, nomePorBlocoId, bibliotecaIdPorBlocoId],
  );

  const folhaEstado: EstadoFolha = !selecoesCompletas
    ? 'pendente'
    : carregandoListas
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
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Database className="h-4 w-4 text-osg-600" /> Conferência dos dados
                    </CardTitle>
                    <span aria-hidden className="block h-[3px] w-10 rounded-full bg-osg-moss" />
                    <CardDescription className="text-sm">
                      Tudo abaixo veio do cadastro — confira antes de baixar.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {carregandoListas ? (
                      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados do cadastro…
                      </div>
                    ) : (
                      <>
                        {empresaId && (capitalValor != null || totalQuotas != null) && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-md border border-osg-200/70 bg-osg-50/50 p-3">
                              <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <Landmark className="h-3.5 w-3.5 text-osg-600" /> Capital social
                              </p>
                              <p className="mt-1.5 text-base font-bold tabular-nums text-osg-700">
                                {capitalValor != null ? fmtBRL.format(capitalValor) : '—'}
                              </p>
                            </div>
                            <div className="rounded-md border border-osg-200/70 bg-osg-50/50 p-3">
                              <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <PieChart className="h-3.5 w-3.5 text-osg-600" /> Quotas
                              </p>
                              <p className="mt-1.5 text-base font-bold tabular-nums text-osg-700">
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
                                onChange={(e) =>
                                  setValoresLivres((prev) => ({ ...prev, [ph]: e.target.value }))
                                }
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
                </Card>
              )}

              <div className="order-2 mx-auto w-full min-w-0 max-w-[860px]">
                <FolhaDocumento
                  titulo={nomeModelo}
                  estado={folhaEstado}
                  mensagemPendente={mensagemPendente}
                  erro={resultado.erro}
                  blocos={blocosFolha}
                  onEditarBloco={(b) => abrirEdicaoBloco(b.blocoId)}
                  onClickOrigem={abrirCadastroOrigem}
                  origemClicavel={origemClicavel}
                />
              </div>

              <aside className="order-1 space-y-4 xl:sticky xl:top-4 xl:order-3">
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

      <EditorBlocoDialog
        open={blocoEditando !== null}
        bloco={blocoEditando}
        onOpenChange={(open) => {
          if (!open) setBlocoEditando(null);
        }}
        // Salvar cria versão nova do bloco: recarrega os blocos do modelo para a
        // prévia refletir o conteúdo na hora (o hook só invalida a Biblioteca).
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['modelo-blocos'] })}
      />

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
