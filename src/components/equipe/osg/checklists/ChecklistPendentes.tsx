import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft, ArrowRight, Building2, ClipboardCheck, FolderKanban,
  Landmark, Search, TriangleAlert, User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import { useChecklistDerivado } from '@/hooks/useChecklistDerivado';
import { useRevisarDocumento } from '@/hooks/useDocumentoArquivo';
import { AvisosDaFase } from './AvisosDaFase';
import { BotaoAvisarCliente } from './BotaoAvisarCliente';
import { BotaoComprovante } from './BotaoComprovante';
import { BotaoTrazerParaChecklist } from './BotaoTrazerParaChecklist';
import { DocumentosDialog, RecusaDialog } from './DocumentosDialog';
import {
  CLUSTER_ICON, CLUSTER_LABEL, ESTADO_CHIP, ESTADO_LABEL, estadoDaLinha,
} from './checklistKit';
import {
  agruparPorInstancia, resumirChecklist,
  type ArquivoDaLinha, type ClusterChecklist, type GrupoChecklist, type LinhaChecklist,
  type StatusChecklist,
} from '@/lib/checklistDerivado';
import { contarEstados, ESTADOS_DOCUMENTO, type EstadoDocumento } from '@/lib/estadoDocumento';

/**
 * O checklist do consultor: a leitura da subtração, mais o veredito sobre o que
 * chegou.
 *
 * A ÚNICA ESCRITA QUE EXISTE AQUI é a revisão do arquivo recebido do cliente
 * (aprovar, recusar com motivo, ou desfazer). Ela entrou depois — a tela nasceu
 * 100% em leitura — porque sem ela o upload do cliente era aceito em silêncio: foto
 * tremida e documento vencido fechavam a pendência igual ao documento certo.
 * Recusar devolve a linha para "pendente" e reabre o envio no portal.
 *
 * Note o que ela NÃO é: não edita status de linha, não vincula arquivo, não muda o
 * pedido. O veredito é sobre o ARQUIVO, não sobre a pendência — a subtração
 * continua derivada, e é ela que decide o que falta.
 *
 * O que era editável aqui e por que saiu (docs/planos/checklist-por-subtracao.md §4):
 * o select de 6 status (`recebido` agora é fato derivado do arquivo, e
 * `solicitado`/`nao_solicitado` não existem no modelo novo: item ativo de
 * solicitação enviada já é solicitado), o botão de vincular arquivo (o vínculo é
 * ato do Cadastro por Documento, e será da origem quando o cliente subir contra o
 * documento pedido) e os botões de gerar/adicionar item (o conjunto esperado é a
 * solicitação, que nasce da OS).
 */

type CategoryFilter = 'todos' | ClusterChecklist;

/**
 * O número da aba conta ENTIDADES, não documentos — e é por isso que cada uma
 * tem `substantivo`.
 *
 * A tela mostra três contagens de naturezas diferentes ao mesmo tempo: 123
 * documentos pendentes no topo, 9 entidades na aba "Tudo", e 0/64 documentos
 * dentro do cartão de uma pessoa. Dá para deduzir, mas ninguém deduz de
 * relance, e o "4" da aba de Pessoas Físicas lia como quatro documentos
 * (observação da Patrícia, 11/09/2026). O tooltip nomeia o que está sendo
 * contado; o substantivo existe para a frase sair em português em cada aba, em
 * vez de "4 pessoas físicas" virar "4 tudo" na primeira.
 */
const CATEGORIAS_FILTRO: Array<{
  value: CategoryFilter; label: string; substantivo: string; Icon: LucideIcon;
}> = [
  { value: 'todos', label: 'Tudo', substantivo: 'entidades', Icon: ClipboardCheck },
  { value: 'pessoa_pf', label: 'Pessoas físicas', substantivo: 'pessoas físicas', Icon: User },
  { value: 'pessoa_pj', label: 'Pessoas jurídicas', substantivo: 'pessoas jurídicas', Icon: Building2 },
  { value: 'imovel_rural', label: 'Imóveis rurais', substantivo: 'imóveis rurais', Icon: Landmark },
  { value: 'imovel_urbano', label: 'Imóveis urbanos', substantivo: 'imóveis urbanos', Icon: Landmark },
  { value: 'bem', label: 'Bens', substantivo: 'bens', Icon: FolderKanban },
  { value: 'cliente', label: 'Do cliente', substantivo: 'documentos do próprio cliente', Icon: ClipboardCheck },
];

type StatusFilter = 'todos' | 'abertos' | 'recebidos' | 'encerrados';

/**
 * O terceiro grupo reúne `nao_aplicavel` e `dispensado`: documentos que NÃO
 * serão pedidos ao cliente.
 *
 * O rótulo já foi "Encerrados", que não informava nada e encostava em
 * "solicitação finalizada". Virou "Fora da solicitação" — e essa também falhou:
 * a coordenação leu como "documentos recebidos que não faziam parte da
 * solicitação" (11/09/2026), exatamente o contrário. "Fora" sugere algo que veio
 * de fora e entrou; estes são itens que estavam dentro e saíram, e que o cliente
 * nunca verá. "Não solicitados" diz o fato sem margem, e o tooltip nomeia as
 * duas origens. O valor interno segue `encerrados`: é chave de filtro, ninguém vê.
 */
const NAO_SOLICITADOS_DICA = 'Documentos marcados como "Não se aplica" ou dispensados '
  + 'da solicitação. Não serão pedidos ao cliente.';

const STATUS_FILTRO: { value: StatusFilter; label: string; dica?: string; dot?: string }[] = [
  { value: 'todos', label: 'Todos' },
  // "Pendentes" e não "Em aberto": é o mesmo status do número do topo, e a tela
  // usava dois nomes para ele (Patrícia, 11/09/2026).
  { value: 'abertos', label: 'Pendentes', dot: 'bg-status-alerta' },
  { value: 'recebidos', label: 'Recebidos', dot: 'bg-osg-moss' },
  {
    value: 'encerrados', label: 'Não solicitados',
    dica: NAO_SOLICITADOS_DICA, dot: 'bg-status-neutro',
  },
];

const casaComStatus = (linha: LinhaChecklist, filtro: StatusFilter) => filtro === 'todos'
  || (filtro === 'abertos' && linha.status === 'pendente')
  || (filtro === 'recebidos' && linha.status === 'recebido')
  || (filtro === 'encerrados' && (linha.status === 'nao_aplicavel' || linha.status === 'dispensado'));

export function ChecklistPendentes({ clienteId }: { clienteId: string }) {
  const { data: clientes = [] } = useClientesLista();
  const { linhas, solicitacao, arquivosSemTipo, isLoading } = useChecklistDerivado(clienteId);
  const revisar = useRevisarDocumento();

  // A recusa passa por um modal porque o motivo é o que o cliente vai ler para
  // saber o que refazer; aprovar e desfazer são um clique só.
  const [aRecusar, setARecusar] = useState<ArquivoDaLinha | null>(null);
  const [motivo, setMotivo] = useState('');

  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoryFilter>('todos');
  const [filtroStatus, setFiltroStatus] = useState<StatusFilter>('todos');
  const [categoriaExpandida, setCategoriaExpandida] = useState<ClusterChecklist | null>(null);
  const [grupoAtivo, setGrupoAtivo] = useState<string | null>(null);
  // O estado escolhido no chip do card recorta a ficha que abre. Vive separado do
  // filtro global da barra: aquele pergunta "quais entidades", este pergunta
  // "dentro desta entidade, o quê" — e some quando a ficha fecha.
  const [filtroFicha, setFiltroFicha] = useState<EstadoDocumento | null>(null);
  const clienteNome = clientes.find((cliente) => cliente.id === clienteId)?.nome ?? '';

  const resumo = useMemo(() => resumirChecklist(linhas), [linhas]);

  const gruposFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    const visiveis = linhas.filter((linha) => {
      if (!casaComStatus(linha, filtroStatus)) return false;
      if (!termo) return true;
      return [linha.documento, linha.nota, linha.instancia.label, linha.instancia.detalhe]
        .filter(Boolean)
        .some((valor) => valor!.toLocaleLowerCase('pt-BR').includes(termo));
    });
    return agruparPorInstancia(visiveis);
  }, [linhas, busca, filtroStatus]);

  const contagemPorCategoria = useMemo(() => {
    const contagem = new Map<ClusterChecklist, number>();
    for (const grupo of gruposFiltrados) {
      const cluster = grupo.instancia.cluster;
      contagem.set(cluster, (contagem.get(cluster) ?? 0) + 1);
    }
    return contagem;
  }, [gruposFiltrados]);

  const gruposVisiveis = filtroCategoria === 'todos'
    ? gruposFiltrados
    : gruposFiltrados.filter((grupo) => grupo.instancia.cluster === filtroCategoria);

  // `gruposVisiveis` já vem ordenado por cluster (agruparPorInstancia), então as
  // seções saem da varredura sem reordenar nada.
  const categorias = useMemo(() => {
    const secoes: { cluster: ClusterChecklist; grupos: GrupoChecklist[] }[] = [];
    for (const grupo of gruposVisiveis) {
      const ultima = secoes[secoes.length - 1];
      if (ultima && ultima.cluster === grupo.instancia.cluster) ultima.grupos.push(grupo);
      else secoes.push({ cluster: grupo.instancia.cluster, grupos: [grupo] });
    }
    return secoes;
  }, [gruposVisiveis]);

  const grupoSelecionado = gruposFiltrados.find((grupo) => grupo.chave === grupoAtivo) ?? null;

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-osg-500">Carregando checklist do cliente...</p>;
  }

  if (!solicitacao) {
    return (
      <EstadoVazio
        titulo={`Nenhuma solicitação de documentos para ${clienteNome || 'este cliente'}.`}
        descricao="O checklist mostra o que foi solicitado menos o que já chegou, e a solicitação nasce dos produtos contratados na OS. Monte a lista em Solicitação de documentos para o checklist existir."
        acao={{ para: '/equipe/osg/work/onboarding', rotulo: 'Ir para Solicitação de documentos' }}
      />
    );
  }

  if (linhas.length === 0) {
    return (
      <EstadoVazio
        titulo="A solicitação deste cliente não gera nenhuma linha de checklist."
        descricao={solicitacao.status === 'rascunho'
          ? 'A lista está em rascunho: o consultor ainda monta os itens e o cliente ainda não recebeu a solicitação.'
          : 'Ou a solicitação não tem itens ativos, ou o cliente não tem as pessoas, os bens e as matrículas a que os documentos solicitados se referem.'}
        acao={{ para: '/equipe/osg/work/onboarding', rotulo: 'Ir para Solicitação de documentos' }}
      />
    );
  }

  // Antes desta transição há uma solicitação enviada, mas ainda não existe um
  // checklist operacional. Deixar filtros, entidades, comprovante e cobrança
  // visíveis aqui fazia a tela prometer ações sobre uma etapa que não começou.
  // O resumo permanece para dar contexto; a única ação possível é abrir a fase.
  const checklistLiberado = solicitacao.status === 'em_checklist'
    || solicitacao.status === 'encerrada';

  if (!checklistLiberado) {
    return (
      <div className="space-y-8">
        <ResumoHero clienteNome={clienteNome} {...resumo} />

        {solicitacao.status === 'enviada' && (
          <div className="flex flex-wrap items-center gap-3">
            <BotaoTrazerParaChecklist
              clienteId={clienteId}
              status={solicitacao.status}
              arquivosSemTipo={arquivosSemTipo}
            />
          </div>
        )}

        <AvisosDaFase
          status={solicitacao.status}
          encerradaEm={solicitacao.encerradaEm}
          arquivosSemTipo={arquivosSemTipo}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ResumoHero clienteNome={clienteNome} {...resumo} />

      <div className="flex flex-wrap items-center gap-3">
        {/* Estas ações só montam depois da passagem ao checklist. Além de
            esconder os botões, isso evita as consultas do comprovante antes de
            existir uma etapa de conferência. */}
        <BotaoComprovante
          clienteId={clienteId}
          clienteNome={clienteNome}
          solicitacao={solicitacao}
        />

        {/* O aviso 2 sai daqui, à mão: é o clique que fecha o lote de conferência
            (decisão de 17/08/2026). Recebe `linhas` inteiras, e não o resumo,
            porque a mensagem lista documento por documento. */}
        <BotaoAvisarCliente
          clienteId={clienteId}
          linhas={linhas}
          solicitacao={solicitacao}
        />
      </div>

      <AvisosDaFase
        status={solicitacao.status}
        encerradaEm={solicitacao.encerradaEm}
        arquivosSemTipo={arquivosSemTipo}
      />

      <div className="space-y-3 rounded-2xl border border-osg-200/70 bg-white/70 p-3 shadow-[0_8px_24px_-20px_hsl(var(--osg-700)/0.28)]">
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-osg-100 bg-osg-50 p-1">
          {CATEGORIAS_FILTRO.map(({ value, label, substantivo, Icon }) => {
            const ativo = filtroCategoria === value;
            const total = value === 'todos' ? gruposFiltrados.length : contagemPorCategoria.get(value) ?? 0;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setFiltroCategoria(value);
                  setCategoriaExpandida(value === 'todos' ? null : value);
                }}
                /* O número conta ENTIDADES, e nada na aba dizia isso: ao lado de
                   "123 pendentes" no topo, o "4" daqui lia como documentos. */
                title={`${total} ${substantivo} com documentos nesta solicitação.`}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  ativo ? 'bg-white text-osg-700 shadow-sm' : 'text-osg-500 hover:bg-osg-100/60 hover:text-osg-700',
                )}
              >
                <Icon className="h-3.5 w-3.5" />{label}
                <span className={cn('text-[10px] tabular-nums', ativo ? 'text-osg-600' : 'text-osg-500/70')}>{total}</span>
                {ativo && <span aria-hidden className="absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-osg-moss" />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTRO.map(({ value, label, dica, dot }) => {
              const ativo = filtroStatus === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFiltroStatus(value)}
                  title={dica}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    ativo
                      ? 'border-osg-moss bg-osg-moss/10 text-osg-700'
                      : 'border-osg-200/70 bg-white text-osg-500 hover:border-osg-300 hover:text-osg-700',
                  )}
                >
                  {dot && <span aria-hidden className={cn('h-2 w-2 rounded-full', dot)} />}
                  {label}
                </button>
              );
            })}
          </div>
          <div className="relative ml-auto min-w-[220px] flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-osg-300" />
            <Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar pessoa, imóvel ou documento..." className="border-osg-200/80 bg-osg-50/60 pl-9" />
          </div>
        </div>
      </div>

      {categorias.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-osg-200 py-14 text-center text-sm text-osg-500">Nenhum resultado para os filtros selecionados.</div>
      ) : categorias
        .filter((categoria) => !categoriaExpandida || categoria.cluster === categoriaExpandida)
        .map((categoria, index) => {
          const emFoco = categoriaExpandida === categoria.cluster;
          const progresso = resumirChecklist(categoria.grupos.flatMap((grupo) => grupo.linhas));
          return (
            <section key={categoria.cluster} className="animate-osg-rise">
              <div className="mb-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-osg-500">Categoria {String(index + 1).padStart(2, '0')}</span>
                <div className="mt-1 flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-bold tracking-tight text-osg-700">{CLUSTER_LABEL[categoria.cluster]}</h3>
                      <div className="mt-1 h-[3px] w-8 rounded-full bg-osg-moss" />
                    </div>
                    <div className="w-32 shrink-0 sm:w-36">
                      <div className="mb-1 flex items-baseline justify-between text-[11px] font-semibold">
                        <span className="tabular-nums text-osg-moss">{progresso.pct}%</span>
                        <span className="tabular-nums text-osg-500">{progresso.recebidos}/{progresso.base}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-osg-100">
                        <span className="block h-full rounded-full bg-osg-moss transition-[width] duration-500" style={{ width: `${progresso.pct}%` }} />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (emFoco) {
                        setFiltroCategoria('todos');
                        setCategoriaExpandida(null);
                      } else {
                        setCategoriaExpandida(categoria.cluster);
                      }
                    }}
                    className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-osg-moss transition-colors hover:text-osg-700 hover:underline"
                  >
                    {emFoco ? <><ArrowLeft className="h-3.5 w-3.5" />Voltar às categorias</> : <>Ver todos <ArrowRight className="h-3.5 w-3.5" /></>}
                  </button>
                </div>
                <span className="mt-2 block text-xs font-semibold tabular-nums text-osg-500">{categoria.grupos.length} entidade{categoria.grupos.length === 1 ? '' : 's'}</span>
              </div>
              {emFoco ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {categoria.grupos.map((grupo) => (
                    <EntityCard
                      key={grupo.chave}
                      grupo={grupo}
                      onOpen={(estado) => { setFiltroFicha(estado ?? null); setGrupoAtivo(grupo.chave); }}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pt-2 pb-4 [scrollbar-color:hsl(var(--osg-moss))_hsl(var(--osg-100))] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-osg-moss [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-osg-100"
                  aria-label={`Entidades de ${CLUSTER_LABEL[categoria.cluster]}`}
                >
                  {categoria.grupos.map((grupo) => (
                    <div key={grupo.chave} className="w-[85%] shrink-0 snap-start sm:w-[calc((100%_-_1rem)/2)] xl:w-[calc((100%_-_2rem)/3)]">
                      <EntityCard
                        grupo={grupo}
                        onOpen={(estado) => { setFiltroFicha(estado ?? null); setGrupoAtivo(grupo.chave); }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}

      <DocumentosDialog
        clienteId={clienteId}
        grupo={grupoSelecionado}
        filtro={filtroFicha}
        onLimparFiltro={() => setFiltroFicha(null)}
        onOpenChange={(open) => { if (!open) { setGrupoAtivo(null); setFiltroFicha(null); } }}
        emRevisao={revisar.isPending ? revisar.variables?.documentoId ?? null : null}
        onAprovar={(arquivo) => revisar.mutate({ clienteId, documentoId: arquivo.id, veredito: 'aprovado' })}
        onDesfazer={(arquivo) => revisar.mutate({ clienteId, documentoId: arquivo.id, veredito: 'pendente' })}
        onRecusar={(arquivo) => { setMotivo(arquivo.motivo ?? ''); setARecusar(arquivo); }}
      />

      <RecusaDialog
        arquivo={aRecusar}
        motivo={motivo}
        onMotivo={setMotivo}
        onOpenChange={(aberto) => !aberto && setARecusar(null)}
        onConfirmar={() => {
          if (aRecusar) {
            revisar.mutate({
              clienteId, documentoId: aRecusar.id, veredito: 'recusado', motivo,
            });
          }
          setARecusar(null);
        }}
      />
    </div>
  );
}

function EstadoVazio({ titulo, descricao, acao }: {
  titulo: string;
  descricao: string;
  acao: { para: string; rotulo: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-osg-300/70 bg-white/60 px-6 py-16 text-center shadow-sm">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-osg-100 text-osg-moss"><ClipboardCheck className="h-7 w-7" /></span>
      <div>
        <p className="font-semibold text-osg-700">{titulo}</p>
        <p className="mt-1 max-w-xl text-sm text-osg-500">{descricao}</p>
      </div>
      <Button asChild variant="outline"><Link to={acao.para}>{acao.rotulo}</Link></Button>
    </div>
  );
}

function ResumoHero({ clienteNome, pct, base, recebidos, pendentes, encerrados }: {
  clienteNome: string; pct: number; base: number; recebidos: number; pendentes: number; encerrados: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-osg-300/60 bg-white/75 p-5 shadow-[0_14px_40px_-28px_hsl(var(--osg-700)/0.35)] sm:p-7">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-osg-moss/5 blur-3xl" />
      <div className="relative grid gap-7 lg:grid-cols-[1fr_280px] lg:items-center">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-osg-500">Resumo da solicitação</span>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-osg-700">Documentos de {clienteNome}</h2>
          <div className="mt-1 h-[3px] w-8 rounded-full bg-osg-moss" />
          <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-1">
            <span className="text-4xl font-extrabold leading-none tabular-nums text-osg-moss">{pct}%</span>
            <span className="text-sm text-osg-500">{recebidos} de {base} documentos recebidos</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-osg-100">
            <div className="h-full rounded-full bg-osg-moss transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 border-osg-100 lg:border-l lg:pl-7">
          <Metric label="Pendentes" value={pendentes} tone="warning" />
          <Metric label="Recebidos" value={recebidos} tone="neutral" />
          {/* Mesmo rótulo e mesma explicação do filtro logo abaixo: são o mesmo
              conjunto, e dois nomes fariam o analista procurar dois números
              diferentes. */}
          <Metric
            label="Não solicitados"
            value={encerrados}
            tone="neutral"
            dica={NAO_SOLICITADOS_DICA}
          />
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, tone, dica }: {
  label: string;
  value: number;
  tone: 'warning' | 'neutral';
  /** Só onde o rótulo sozinho não basta. Pendentes e Recebidos se explicam. */
  dica?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-osg-50/70 px-2 py-3 text-center" title={dica}>
      <div className={cn('text-xl font-bold leading-none tabular-nums', tone === 'warning' ? 'text-osg-700' : 'text-osg-moss')}>{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase leading-tight text-osg-500">{label}</div>
    </div>
  );
}

function EntityCard({ grupo, onOpen }: {
  grupo: GrupoChecklist;
  onOpen: (estado?: EstadoDocumento) => void;
}) {
  const Icon = CLUSTER_ICON[grupo.instancia.cluster];
  const { recebidos, pendentes, base, pct } = resumirChecklist(grupo.linhas);
  const cardStatus: StatusChecklist | 'encerrado' = pendentes > 0
    ? 'pendente'
    : recebidos > 0 ? 'recebido' : 'encerrado';
  const preview = grupo.linhas
    .filter((linha) => linha.status === 'pendente')
    .slice(0, 2)
    .map((linha) => linha.documento)
    .join(' · ');
  const contagem = contarEstados(grupo.linhas.map(estadoDaLinha));

  /**
   * O card é `div` com um botão invisível por cima porque os chips de estado são
   * botões, e botão dentro de botão é HTML inválido — o navegador desmonta a
   * árvore e o clique de dentro some. O conteúdo fica com `pointer-events-none`
   * para o clique atravessar; só os chips reativam o ponteiro.
   */
  return (
    <div className="group relative flex h-full min-h-48 w-full flex-col rounded-2xl border border-osg-300/60 bg-white/75 p-5 text-left shadow-[0_8px_24px_-22px_hsl(var(--osg-700)/0.35)] transition-all duration-200 hover:-translate-y-1 hover:border-osg-moss/40 hover:shadow-[0_16px_30px_-20px_hsl(var(--osg-moss)/0.24)] focus-within:border-osg-moss/40">
      <button
        type="button"
        onClick={() => onOpen()}
        aria-label={`Ver os documentos de ${grupo.instancia.label}`}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss/40"
      />
      <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-osg-50 text-osg-moss"><Icon className="h-5 w-5" /></span>
        <span className={cn(
          'rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]',
          cardStatus === 'recebido' ? 'bg-osg-moss/10 text-osg-moss'
            : cardStatus === 'pendente' ? 'bg-osg-highlighter/25 text-osg-700'
              : 'bg-osg-100 text-osg-500',
        )}>
          {/* "Tratado" não dizia nada. Este selo aparece quando a entidade não
              tem pendência NEM documento recebido: tudo o que era dela saiu da
              solicitação. Em voz de entidade, e não de documento — a métrica do
              topo conta documentos "Não solicitados", aqui é a entidade que não
              tem o que solicitar. */}
          {cardStatus === 'recebido' ? 'Completo'
            : cardStatus === 'pendente' ? 'Pendente' : 'Nada a solicitar'}
        </span>
      </div>
      <h4 className="pointer-events-none relative z-10 mt-5 font-semibold leading-snug text-osg-700">{grupo.instancia.label}</h4>
      {grupo.instancia.detalhe && <p className="pointer-events-none relative z-10 text-xs font-medium text-osg-500">{grupo.instancia.detalhe}</p>}
      <p className="pointer-events-none relative z-10 mt-1 line-clamp-2 min-h-10 text-sm leading-relaxed text-osg-500">{preview || 'Nada pendente nesta entidade.'}</p>

      <ChipsDeEstado contagem={contagem} onEscolher={onOpen} />

      <div className="pointer-events-none relative z-10 mt-auto flex items-center gap-3 pt-5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-osg-100"><div className={cn('h-full rounded-full', pendentes ? 'bg-osg-highlighter' : 'bg-osg-moss')} style={{ width: `${pct}%` }} /></div>
        <span className="text-sm font-bold tabular-nums text-osg-600">{recebidos}/{base}</span>
      </div>
      <span className="pointer-events-none relative z-10 mt-3 text-xs font-semibold text-osg-moss group-hover:underline">Ver {grupo.linhas.length} documento{grupo.linhas.length === 1 ? '' : 's'}</span>
    </div>
  );
}

/**
 * Os quatro estados como atalho: abre a ficha já recortada.
 *
 * Estado zerado não vira botão. Quatro chips iguais em toda ficha, três deles
 * levando a uma lista vazia, seria ruído — o chip existe para dizer "tem coisa
 * aqui".
 */
function ChipsDeEstado({ contagem, onEscolher }: {
  contagem: Record<EstadoDocumento, number>;
  onEscolher: (estado: EstadoDocumento) => void;
}) {
  const visiveis = ESTADOS_DOCUMENTO.filter((estado) => contagem[estado] > 0);
  if (visiveis.length === 0) return null;

  return (
    <div className="pointer-events-none relative z-10 mt-3 flex flex-wrap gap-1.5">
      {visiveis.map((estado) => (
        <button
          key={estado}
          type="button"
          onClick={() => onEscolher(estado)}
          /* O chip não é só um contador: ele ABRE a ficha, já recortada. Nada na
             tela diz isso, e sem o tooltip o analista lê como enfeite. */
          title={`Abre a ficha desta entidade mostrando só os documentos em "${ESTADO_LABEL[estado]}".`}
          className={cn(
            'pointer-events-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss/40',
            ESTADO_CHIP[estado],
          )}
        >
          {ESTADO_LABEL[estado]}
          <span className="tabular-nums opacity-70">{contagem[estado]}</span>
        </button>
      ))}
    </div>
  );
}

export default ChecklistPendentes;
