import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2, Check, ClipboardCheck, FilePlus2, FileText, Hourglass, Landmark, Loader2, Search,
  ShieldCheck, Trash2, TriangleAlert, UploadCloud, Users,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { ACCEPT, MAX_BYTES, extensaoValida } from '@/components/equipe/osg/documentos/docMeta';
import type { GrupoDocumentoKey } from '@/lib/agrupadorDocumentos';
import {
  montarGavetasChecklist, resumirPendencias,
  type EntidadeChecklist, type GavetaChecklist,
} from '@/lib/checklistCliente';
import {
  contarEstados, estadoDoDocumento, ESTADOS_DOCUMENTO, type EstadoDocumento,
} from '@/lib/estadoDocumento';
import {
  usePendenciasCliente, useAnexarPendencia, useRemoverDocumentoPendencia,
  type ArquivoDaPendencia, type PendenciaCliente,
} from '@/hooks/useDomainPendenciasCliente';

/**
 * A área do cliente na fase de CHECKLIST.
 *
 * A diferença em relação à gaveta-balde não é visual, é de eixo: aqui cada linha
 * é um documento pedido PARA UMA ENTIDADE, e o envio acontece na linha. Por isso o
 * arquivo nasce sabendo o que é e de quem é, e ninguém precisa classificar depois.
 *
 * A forma da tela é a mesma do checklist do consultor
 * (`equipe/osg/checklists/ChecklistPendentes`): resumo no topo, barra de filtros,
 * e cada entidade como um card que abre o modal com os documentos dela. Primeiro
 * porque as duas telas leem a mesma subtração e ler igual dos dois lados evita
 * "cada um vê uma lista diferente"; segundo porque a lista corrida anterior não
 * escalava: cliente com 12 pessoas e 8 matrículas virava uma parede de linhas sem
 * onde parar. A paleta continua a teal do portal, não a osg: o cliente está dentro
 * da Área do Cliente, e trocar de cor no meio da aba pareceria outro produto.
 *
 * O que NÃO copiamos de lá: o consultor lê e só; aqui a linha carrega a ação de
 * envio, que é o motivo da tela existir. Por isso o botão de enviar mora na linha
 * dentro do modal, e o card diz quantos faltam para o clique não ser às cegas.
 *
 * Quem decide qual das duas telas aparece é o status da solicitação, em
 * ColetaDocumentosCliente. Ver docs/planos/checklist-por-subtracao.md.
 */

const GRUPO_ICON: Record<GrupoDocumentoKey, LucideIcon> = {
  pf: Users,
  pj: Building2,
  bens_imoveis: Landmark,
  outros: FilePlus2,
};

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

type FiltroGrupo = 'todos' | GrupoDocumentoKey;
type FiltroStatus = 'todos' | 'faltando' | 'recebidos';

const FILTROS_GRUPO: Array<{ value: FiltroGrupo; label: string; Icon: LucideIcon }> = [
  { value: 'todos', label: 'Tudo', Icon: ClipboardCheck },
  { value: 'pf', label: 'Pessoas físicas', Icon: Users },
  { value: 'pj', label: 'Pessoas jurídicas', Icon: Building2 },
  { value: 'bens_imoveis', label: 'Bens e imóveis', Icon: Landmark },
  { value: 'outros', label: 'Outros', Icon: FilePlus2 },
];

const FILTROS_STATUS: Array<{ value: FiltroStatus; label: string; dot?: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'faltando', label: 'Falta enviar', dot: 'bg-warning' },
  { value: 'recebidos', label: 'Recebidos', dot: 'bg-primary' },
];

/** O vocabulário do portal para os quatro estados (o consultor usa outro). */
const ESTADO_LABEL: Record<EstadoDocumento, string> = {
  pendente: 'Falta enviar',
  em_analise: 'Em análise',
  recusado: 'Recusado',
  aprovado: 'Aprovado',
};
const ESTADO_CHIP: Record<EstadoDocumento, string> = {
  pendente: 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400',
  em_analise: 'border-border bg-muted text-slate-600 hover:border-slate-400',
  recusado: 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-400',
  aprovado: 'border-primary/15 bg-accent/5 text-primary hover:border-primary/40',
};

const estadoDaPendencia = (pendencia: PendenciaCliente): EstadoDocumento =>
  estadoDoDocumento(pendencia.recebido, pendencia.arquivos);

const casaComStatus = (pendencia: PendenciaCliente, filtro: FiltroStatus) => filtro === 'todos'
  || (filtro === 'faltando' && !pendencia.recebido)
  || (filtro === 'recebidos' && pendencia.recebido);

const casaComBusca = (pendencia: PendenciaCliente, termo: string) => !termo
  || [pendencia.documento, pendencia.nota, pendencia.alvo.nome, pendencia.alvo.detalhe]
    .filter(Boolean)
    .some((valor) => valor!.toLocaleLowerCase('pt-BR').includes(termo));

/** Chave da entidade dentro da tela toda: a mesma entidade pode existir em duas gavetas. */
const chaveDaEntidade = (gaveta: GavetaChecklist, entidade: EntidadeChecklist) =>
  `${gaveta.key}|${entidade.chave}`;

export function ChecklistDocumentosCliente({ clienteId }: { clienteId: string }) {
  const { data, isLoading } = usePendenciasCliente(clienteId);
  const anexar = useAnexarPendencia();
  const remover = useRemoverDocumentoPendencia();
  const [enviando, setEnviando] = useState<string | null>(null);
  const [aRemover, setARemover] = useState<ArquivoDaPendencia | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState<FiltroGrupo>('todos');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [entidadeAtiva, setEntidadeAtiva] = useState<string | null>(null);
  // O estado escolhido no chip do card: recorta a ficha que vai abrir. Fica
  // separado do filtro global porque é uma pergunta de outro alcance ("dentro
  // desta pessoa, o que está em análise?") e some quando a ficha fecha.
  const [filtroFicha, setFiltroFicha] = useState<EstadoDocumento | null>(null);

  // O `?? []` sai daqui e vira memo próprio: literal na dependência de outro memo
  // muda de identidade a cada render e mataria o cache dos dois de baixo.
  const pendencias = useMemo(() => data?.pendencias ?? [], [data]);
  // O resumo do topo é da coleta INTEIRA, não do recorte: filtro é lente, e o
  // "faltam 3 de 20" não pode mudar porque alguém digitou na busca.
  const resumo = useMemo(() => resumirPendencias(pendencias), [pendencias]);
  const encerrada = data?.solicitacao?.status === 'encerrada';

  /**
   * O filtro escolhe QUAIS fichas aparecem, nunca o que elas contam.
   *
   * A tentação era filtrar as pendências e remontar as gavetas, mas aí o card de
   * quem já mandou 3 de 4 vira "0/2" em "Falta enviar", e a barra da seção cai
   * para 0%: número que some porque alguém clicou num filtro não é número, é
   * susto. Então a montagem é sempre da lista inteira, e o recorte só decide a
   * lista de cards; os totais de cada seção somam as fichas que ficaram à vista.
   */
  const gavetas = useMemo(() => montarGavetasChecklist(pendencias), [pendencias]);

  const gavetasFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    if (filtroStatus === 'todos' && !termo) return gavetas;
    return gavetas
      .map((gaveta) => ({
        ...gaveta,
        entidades: gaveta.entidades.filter((entidade) => entidade.pendencias.some(
          (pendencia) => casaComStatus(pendencia, filtroStatus) && casaComBusca(pendencia, termo),
        )),
      }))
      .filter((gaveta) => gaveta.entidades.length > 0);
  }, [gavetas, busca, filtroStatus]);

  const gavetasVisiveis = filtroGrupo === 'todos'
    ? gavetasFiltradas
    : gavetasFiltradas.filter((gaveta) => gaveta.key === filtroGrupo);

  const totalEntidades = gavetasFiltradas.reduce((soma, gaveta) => soma + gaveta.entidades.length, 0);

  // A entidade aberta é procurada na lista filtrada, e não guardada como objeto:
  // depois de um envio a query recarrega e o objeto antigo ficaria congelado com o
  // documento ainda pendente.
  const selecionada = useMemo(() => {
    if (!entidadeAtiva) return null;
    for (const gaveta of gavetas) {
      for (const entidade of gaveta.entidades) {
        if (chaveDaEntidade(gaveta, entidade) === entidadeAtiva) return { gaveta, entidade };
      }
    }
    return null;
  }, [gavetas, entidadeAtiva]);

  const enviar = async (gaveta: GavetaChecklist, pendencia: PendenciaCliente, arquivo: File) => {
    if (!extensaoValida(arquivo.name)) {
      toast({ title: 'Formato não aceito', description: `"${arquivo.name}" não é um formato que recebemos.`, variant: 'destructive' });
      return;
    }
    if (arquivo.size > MAX_BYTES) {
      toast({ title: 'Arquivo muito grande', description: `"${arquivo.name}" passa do limite por arquivo.`, variant: 'destructive' });
      return;
    }
    const chave = `${pendencia.solicitacao_item_id}|${pendencia.alvo.id ?? 'cliente'}`;
    setEnviando(chave);
    try {
      await anexar.mutateAsync({ clienteId, pendencia, categoria: gaveta.categoria, file: arquivo });
    } finally {
      setEnviando(null);
    }
  };

  if (isLoading) {
    return <p className="py-12 text-center text-sm text-slate-500">Carregando a sua lista de documentos...</p>;
  }

  if (pendencias.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/80 bg-white/70 px-6 py-16 text-center shadow-sm">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/5 text-primary">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <p className="font-semibold text-slate-800">Nada pendente no momento.</p>
        <p className="max-w-md text-sm text-slate-500">
          Assim que a PSA precisar de um documento novo, ele aparece aqui com o envio na própria
          linha.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ResumoHero {...resumo} />

      {encerrada && (
        <p className="rounded-xl border border-border/70 bg-muted/70 px-4 py-3 text-sm text-slate-600">
          Este pedido foi encerrado. A lista fica para consulta e o envio está desligado. Se
          precisar mandar algo, fale com a PSA.
        </p>
      )}

      <div className="space-y-3 rounded-2xl border border-border/70 bg-white/70 p-3 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.28)]">
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted p-1">
          {FILTROS_GRUPO.map(({ value, label, Icon }) => {
            const ativo = filtroGrupo === value;
            const total = value === 'todos'
              ? totalEntidades
              : gavetasFiltradas.find((gaveta) => gaveta.key === value)?.entidades.length ?? 0;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFiltroGrupo(value)}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  FOCO,
                  ativo ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-muted/70 hover:text-slate-700',
                )}
              >
                <Icon className="h-3.5 w-3.5" />{label}
                <span className={cn('text-[10px] tabular-nums', ativo ? 'text-primary' : 'text-slate-400')}>{total}</span>
                {ativo && <span aria-hidden className="absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTROS_STATUS.map(({ value, label, dot }) => {
              const ativo = filtroStatus === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFiltroStatus(value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    FOCO,
                    ativo
                      ? 'border-primary bg-accent/5 text-primary'
                      : 'border-border/80 bg-white text-slate-500 hover:border-border hover:text-slate-700',
                  )}
                >
                  {dot && <span aria-hidden className={cn('h-2 w-2 rounded-full', dot)} />}
                  {label}
                </button>
              );
            })}
          </div>
          <div className="relative ml-auto min-w-[220px] flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar pessoa, imóvel ou documento..."
              className="bg-muted/60 pl-9"
            />
          </div>
        </div>
      </div>

      {gavetasVisiveis.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-slate-500">
          Nenhum documento para os filtros selecionados.
        </div>
      ) : gavetasVisiveis.map((gaveta) => (
        <SecaoGaveta
          key={gaveta.key}
          gaveta={gaveta}
          onAbrir={(entidade, estado) => {
            setFiltroFicha(estado ?? null);
            setEntidadeAtiva(chaveDaEntidade(gaveta, entidade));
          }}
        />
      ))}

      <EntidadeDialog
        selecionada={selecionada}
        somenteLeitura={encerrada}
        enviando={enviando}
        filtro={filtroFicha}
        onLimparFiltro={() => setFiltroFicha(null)}
        onOpenChange={(aberto) => {
          if (!aberto) { setEntidadeAtiva(null); setFiltroFicha(null); }
        }}
        onArquivo={(pendencia, arquivo) => {
          if (selecionada) void enviar(selecionada.gaveta, pendencia, arquivo);
        }}
        onRemover={setARemover}
      />

      {/* Fora do modal da ficha de propósito: os dois convivem empilhados, e a
          confirmação some junto com o arquivo sem derrubar a ficha aberta. */}
      <AlertDialog open={!!aRemover} onOpenChange={(aberto) => !aberto && setARemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este documento?</AlertDialogTitle>
            <AlertDialogDescription>
              "{aRemover?.nome}" sai da sua lista e o documento volta a aparecer como pendente.
              Você pode enviar outro arquivo no lugar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (aRemover) remover.mutate({ clienteId, documentoId: aRemover.id });
                setARemover(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ResumoHero({ pct, total, recebidos, faltando }: {
  pct: number; total: number; recebidos: number; faltando: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-white/80 p-5 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.4)] sm:p-7">
      <div aria-hidden className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="relative grid gap-7 lg:grid-cols-[1fr_240px] lg:items-center">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
            Documentos solicitados
          </span>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-800">
            Documentos que faltam
          </h2>
          <div className="mt-1 h-[3px] w-8 rounded-full bg-primary" />
          <p className="mt-3 max-w-2xl text-sm text-slate-500">
            Cada documento aparece junto de quem ele é, e o envio acontece ali mesmo: assim ele já
            chega organizado, e você não precisa renomear nem separar nada.
          </p>
          <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-1">
            <span className="text-4xl font-extrabold leading-none tabular-nums text-primary">{pct}%</span>
            <span className="text-sm text-slate-500">{recebidos} de {total} documentos recebidos</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-border lg:border-l lg:pl-7">
          <Metrica label="Falta enviar" value={faltando} tom="atencao" />
          <Metrica label="Recebidos" value={recebidos} tom="neutro" />
        </div>
      </div>
    </section>
  );
}

function Metrica({ label, value, tom }: { label: string; value: number; tom: 'atencao' | 'neutro' }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-muted/80 px-2 py-3 text-center">
      <div className={cn(
        'text-xl font-bold leading-none tabular-nums',
        tom === 'atencao' ? 'text-amber-600' : 'text-primary',
      )}>
        {value}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase leading-tight text-slate-500">{label}</div>
    </div>
  );
}

function SecaoGaveta({ gaveta, onAbrir }: {
  gaveta: GavetaChecklist;
  onAbrir: (entidade: EntidadeChecklist, estado?: EstadoDocumento) => void;
}) {
  // Os totais somam as fichas à vista com a contagem cheia de cada uma: o filtro
  // tira card da tela, não documento da conta.
  const total = gaveta.entidades.reduce((soma, entidade) => soma + entidade.pendencias.length, 0);
  const recebidos = gaveta.entidades.reduce(
    (soma, entidade) => soma + entidade.pendencias.length - entidade.faltando, 0,
  );
  const pct = total ? Math.round((recebidos / total) * 100) : 0;
  return (
    <section>
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold tracking-tight text-slate-800">{gaveta.titulo}</h3>
            <div className="mt-1 h-[3px] w-8 rounded-full bg-primary" />
          </div>
          <div className="w-32 shrink-0 sm:w-36">
            <div className="mb-1 flex items-baseline justify-between text-[11px] font-semibold">
              <span className="tabular-nums text-primary">{pct}%</span>
              <span className="tabular-nums text-slate-500">{recebidos}/{total}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
        <span className="mt-2 block text-xs font-semibold tabular-nums text-slate-500">
          {gaveta.subtitulo} · {gaveta.entidades.length} {gaveta.entidades.length === 1 ? 'item' : 'itens'}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {gaveta.entidades.map((entidade) => (
          <EntidadeCard
            key={entidade.chave}
            gaveta={gaveta}
            entidade={entidade}
            onAbrir={(estado) => onAbrir(entidade, estado)}
          />
        ))}
      </div>
    </section>
  );
}

function EntidadeCard({ gaveta, entidade, onAbrir }: {
  gaveta: GavetaChecklist;
  entidade: EntidadeChecklist;
  onAbrir: (estado?: EstadoDocumento) => void;
}) {
  const Icon = GRUPO_ICON[gaveta.key];
  const total = entidade.pendencias.length;
  const recebidos = total - entidade.faltando;
  const pct = total ? Math.round((recebidos / total) * 100) : 0;
  // Duas linhas do que falta: dizem POR QUE clicar. Entidade completa mostra a
  // frase no lugar, para o card não ficar com um buraco onde os outros têm texto.
  const previa = entidade.pendencias
    .filter((pendencia) => !pendencia.recebido)
    .slice(0, 2)
    .map((pendencia) => pendencia.documento)
    .join(' · ');
  const contagem = contarEstados(entidade.pendencias.map(estadoDaPendencia));

  /**
   * O card virou `div` com um botão invisível por cima, e não é enfeite: os chips
   * de estado são botões, e botão dentro de botão é HTML inválido (o navegador
   * desmonta a árvore e o clique de dentro para de existir). O conteúdo fica com
   * `pointer-events-none` para o clique atravessar até a camada de baixo; só os
   * chips reativam o ponteiro.
   */
  return (
    <div
      className={cn(
        'group relative flex h-full min-h-48 w-full flex-col rounded-2xl border border-border/80 bg-white/80 p-5 text-left shadow-[0_8px_24px_-22px_rgba(15,23,42,0.4)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_30px_-20px_rgba(13,148,136,0.3)] focus-within:border-primary/40',
      )}
    >
      <button
        type="button"
        onClick={() => onAbrir()}
        aria-label={`Ver os documentos de ${entidade.nome}`}
        className={cn('absolute inset-0 z-0 rounded-2xl', FOCO)}
      />
      <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/5 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <span className={cn(
          'rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]',
          entidade.faltando > 0 ? 'bg-warning/10 text-warning' : 'bg-accent/5 text-primary',
        )}>
          {entidade.faltando > 0
            ? `${entidade.faltando} pendente${entidade.faltando === 1 ? '' : 's'}`
            : 'Completo'}
        </span>
      </div>
      <h4 className="pointer-events-none relative z-10 mt-5 font-semibold leading-snug text-slate-800">
        {entidade.nome}
      </h4>
      {entidade.detalhe && (
        <p className="pointer-events-none relative z-10 text-xs font-medium text-slate-500">
          {entidade.detalhe}
        </p>
      )}
      <p className="pointer-events-none relative z-10 mt-1 line-clamp-2 min-h-10 text-sm leading-relaxed text-slate-500">
        {previa || 'Você já enviou tudo desta ficha.'}
      </p>

      <ChipsDeEstado contagem={contagem} onEscolher={onAbrir} />

      <div className="pointer-events-none relative z-10 mt-auto flex items-center gap-3 pt-5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full', entidade.faltando > 0 ? 'bg-amber-400' : 'bg-primary')}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm font-bold tabular-nums text-slate-600">{recebidos}/{total}</span>
      </div>
      <span className="pointer-events-none relative z-10 mt-3 text-xs font-semibold text-primary group-hover:underline">
        {entidade.faltando > 0
          ? `Enviar ${entidade.faltando} documento${entidade.faltando === 1 ? '' : 's'}`
          : `Ver ${total} documento${total === 1 ? '' : 's'}`}
      </span>
    </div>
  );
}

/**
 * Os quatro estados como atalho: abre a ficha já recortada.
 *
 * Estado zerado não vira botão. O card ficaria com quatro chips iguais em toda
 * ficha, e três deles levariam a uma lista vazia — o chip existe para dizer "tem
 * coisa aqui", e um chip que promete nada é ruído.
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
          className={cn(
            'pointer-events-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors',
            ESTADO_CHIP[estado],
            FOCO,
          )}
        >
          {ESTADO_LABEL[estado]}
          <span className="tabular-nums opacity-70">{contagem[estado]}</span>
        </button>
      ))}
    </div>
  );
}

function EntidadeDialog({
  selecionada, somenteLeitura, enviando, filtro, onLimparFiltro, onOpenChange, onArquivo, onRemover,
}: {
  selecionada: { gaveta: GavetaChecklist; entidade: EntidadeChecklist } | null;
  somenteLeitura: boolean;
  enviando: string | null;
  /** O estado escolhido no chip do card; nulo mostra a ficha inteira. */
  filtro: EstadoDocumento | null;
  onLimparFiltro: () => void;
  onOpenChange: (aberto: boolean) => void;
  onArquivo: (pendencia: PendenciaCliente, arquivo: File) => void;
  onRemover: (arquivo: ArquivoDaPendencia) => void;
}) {
  const pendencias = (selecionada?.entidade.pendencias ?? [])
    .filter((pendencia) => !filtro || estadoDaPendencia(pendencia) === filtro);

  return (
    <Dialog open={!!selecionada} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border bg-muted/60 px-6 py-5 text-left">
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
            {selecionada?.gaveta.titulo}
          </span>
          <DialogTitle className="text-xl text-slate-800">{selecionada?.entidade.nome}</DialogTitle>
          <DialogDescription>
            {selecionada?.entidade.detalhe
              ? `${selecionada.entidade.detalhe}. Envie cada documento na própria linha.`
              : 'Envie cada documento na própria linha.'}
          </DialogDescription>
          {filtro && (
            <div className="flex items-center gap-2 pt-1">
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                ESTADO_CHIP[filtro],
              )}>
                {ESTADO_LABEL[filtro]}
                <span className="tabular-nums opacity-70">{pendencias.length}</span>
              </span>
              <button
                type="button"
                onClick={onLimparFiltro}
                className={cn('rounded-md text-[11px] font-semibold text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline', FOCO)}
              >
                ver todos os {selecionada?.entidade.pendencias.length}
              </button>
            </div>
          )}
        </DialogHeader>
        <div className="max-h-[calc(90vh-140px)] divide-y divide-border overflow-y-auto px-4 pb-2 sm:px-6">
          {pendencias.map((pendencia) => (
            <LinhaPendencia
              key={`${pendencia.solicitacao_item_id}|${pendencia.alvo.id ?? 'cliente'}`}
              pendencia={pendencia}
              somenteLeitura={somenteLeitura}
              enviando={enviando}
              onArquivo={onArquivo}
              onRemover={onRemover}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinhaPendencia({ pendencia, somenteLeitura, enviando, onArquivo, onRemover }: {
  pendencia: PendenciaCliente;
  somenteLeitura: boolean;
  enviando: string | null;
  onArquivo: (pendencia: PendenciaCliente, arquivo: File) => void;
  onRemover: (arquivo: ArquivoDaPendencia) => void;
}) {
  const chave = `${pendencia.solicitacao_item_id}|${pendencia.alvo.id ?? 'cliente'}`;
  const ocupado = enviando === chave;
  /**
   * Item pedido à mão que não tem tipo cadastrado: a RPC de anexo recusaria, então
   * a linha aparece sem campo de envio, com o caminho de saída dito na tela.
   */
  const semTipo = !pendencia.documento_tipo_id;

  /**
   * O selo da linha responde "e agora?", e por isso não é o mesmo que o estado de
   * cada arquivo. Recusado ganha destaque porque é o único que pede ação; entre os
   * que já valem, aprovado vence "em análise" (a PSA já bateu o martelo).
   */
  const estado = estadoDaPendencia(pendencia);
  const recusado = estado === 'recusado';
  const selo = pendencia.recebido_interno && pendencia.arquivos.length === 0
    ? 'Já temos'
    : estado === 'pendente' ? null : ESTADO_LABEL[estado];

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
      <span className={cn(
        'mt-0.5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex',
        pendencia.recebido ? 'bg-accent/5 text-primary'
          : recusado ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700',
      )}>
        {pendencia.recebido ? <Check className="h-4 w-4" />
          : recusado ? <TriangleAlert className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('text-sm font-medium', pendencia.recebido ? 'text-slate-500' : 'text-slate-800')}>
            {pendencia.documento}
          </span>
          {selo && (
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              recusado ? 'bg-rose-50 text-rose-700'
                : estado === 'em_analise' ? 'bg-muted text-slate-600'
                  : 'bg-accent/5 text-primary',
            )}>
              {recusado ? <TriangleAlert className="h-3 w-3" />
                : estado === 'em_analise' ? <Hourglass className="h-3 w-3" />
                  : <Check className="h-3 w-3" />}
              {selo}
            </span>
          )}
        </div>
        {pendencia.nota && !pendencia.recebido && (
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{pendencia.nota}</p>
        )}
        {pendencia.arquivos.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {pendencia.arquivos.map((arquivo) => (
              <ArquivoEnviado
                key={arquivo.id}
                arquivo={arquivo}
                somenteLeitura={somenteLeitura}
                onRemover={onRemover}
              />
            ))}
          </ul>
        )}
      </div>

      {!pendencia.recebido && !somenteLeitura && (
        semTipo ? (
          <span className="shrink-0 text-xs text-slate-500">Fale com a PSA para enviar este</span>
        ) : (
          <label
            className={cn(
              'inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-primary/30 bg-white px-3 py-2 text-xs font-semibold text-primary transition-colors hover:border-primary/60 hover:bg-accent/5',
              FOCO,
              ocupado && 'pointer-events-none opacity-60',
            )}
          >
            {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {ocupado ? 'Enviando...' : recusado ? 'Enviar novamente' : 'Enviar arquivo'}
            <input
              type="file"
              className="sr-only"
              accept={ACCEPT}
              disabled={ocupado}
              onChange={(evento) => {
                const arquivo = evento.target.files?.[0];
                evento.target.value = '';
                if (arquivo) onArquivo(pendencia, arquivo);
              }}
            />
          </label>
        )
      )}
    </div>
  );
}

/**
 * Um arquivo que o cliente já mandou, com o que aconteceu com ele.
 *
 * O botão de remover só some quando a PSA aprovou: antes disso o arquivo é do
 * cliente, e mandar errado tem conserto sem precisar pedir. Depois da aprovação
 * ele vira insumo de trabalho interno, e a RPC recusa a remoção mesmo que alguém
 * chame por fora — aqui a ausência do botão é só a versão educada da mesma regra.
 */
function ArquivoEnviado({ arquivo, somenteLeitura, onRemover }: {
  arquivo: ArquivoDaPendencia;
  somenteLeitura: boolean;
  onRemover: (arquivo: ArquivoDaPendencia) => void;
}) {
  const recusado = arquivo.revisao === 'recusado';
  const aprovado = arquivo.revisao === 'aprovado';

  return (
    <li className={cn(
      'rounded-xl border px-3 py-2',
      recusado ? 'border-rose-200/80 bg-rose-50/50' : 'border-border/80 bg-muted/60',
    )}>
      <div className="flex items-center gap-2">
        <FileText className={cn('h-3.5 w-3.5 shrink-0', recusado ? 'text-rose-600' : 'text-slate-400')} />
        <span className={cn(
          'min-w-0 flex-1 truncate text-xs font-medium',
          recusado ? 'text-rose-700 line-through' : 'text-slate-600',
        )}>
          {arquivo.nome}
        </span>
        <span className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]',
          recusado ? 'bg-rose-100 text-rose-700'
            : aprovado ? 'bg-accent/10 text-primary' : 'bg-muted/70 text-slate-600',
        )}>
          {recusado ? 'Recusado' : aprovado ? 'Aprovado' : 'Em análise'}
        </span>
        {!aprovado && !somenteLeitura && (
          <button
            type="button"
            onClick={() => onRemover(arquivo)}
            title="Remover este arquivo"
            className={cn(
              'shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600',
              FOCO,
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">Remover {arquivo.nome}</span>
          </button>
        )}
      </div>
      {recusado && arquivo.motivo && (
        <p className="mt-1 pl-5 text-xs leading-relaxed text-rose-700">{arquivo.motivo}</p>
      )}
    </li>
  );
}

export default ChecklistDocumentosCliente;
