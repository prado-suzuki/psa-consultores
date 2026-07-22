import { useMemo, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2, Check, ClipboardCheck, FileText, FolderKanban, Landmark, Link2,
  FilterX, Plus, RefreshCw, Search, ShieldAlert, SlidersHorizontal, Trash2, User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import { usePessoasByCliente } from '@/hooks/useQualificacaoDasPartes';
import { useBensByCliente, useAllMatriculas } from '@/hooks/useDiagnosticoPatrimonial';
import { useDocumentosByCliente } from '@/hooks/useDocumentoArquivo';
import {
  useChecklistPadrao, useChecklistClienteItens, useGerarChecklistCliente,
  useAdicionarCondicional, useDefinirStatusItem, useVincularDocumento, useRemoverChecklistItem,
  itemRecebido, type ChecklistClienteRow, type ChecklistStatus,
} from '@/hooks/useOsgChecklist';
import {
  AddCondicionalDialog, VincularDocumentoDialog,
} from '@/components/equipe/osg/checklists/ChecklistItemDialogs';

const ENTIDADE_ICON: Record<string, LucideIcon> = {
  'Pessoa Física': User,
  'Pessoa Jurídica': Building2,
  'Pessoa Jurídica (Cooperativa)': Building2,
  'Matrícula (Imóvel Rural)': Landmark,
  'Matrícula (Imóvel Urbano)': Landmark,
  Bem: FolderKanban,
};
const TIPO_CLUSTER_LABEL: Record<string, string> = {
  'Pessoa Física': 'Pessoas Físicas',
  'Pessoa Jurídica': 'Pessoas Jurídicas',
  'Pessoa Jurídica (Cooperativa)': 'Pessoas Jurídicas',
  'Matrícula (Imóvel Rural)': 'Imóveis Rurais',
  'Matrícula (Imóvel Urbano)': 'Imóveis Urbanos',
  Bem: 'Bens e Direitos',
};
const TIPO_CLUSTER_ORDER = [
  'Pessoa Física', 'Pessoa Jurídica',
  'Matrícula (Imóvel Rural)', 'Matrícula (Imóvel Urbano)', 'Bem',
];
const clusterKey = (tipo: string) => tipo === 'Pessoa Jurídica (Cooperativa)' ? 'Pessoa Jurídica' : tipo;
type CategoryFilter = 'todos' | typeof TIPO_CLUSTER_ORDER[number];
const CATEGORIAS_FILTRO: Array<{ value: CategoryFilter; label: string; Icon: LucideIcon }> = [
  { value: 'todos', label: 'Tudo', Icon: ClipboardCheck },
  { value: 'Pessoa Física', label: 'Pessoas físicas', Icon: User },
  { value: 'Pessoa Jurídica', label: 'Pessoas jurídicas', Icon: Building2 },
  { value: 'Matrícula (Imóvel Rural)', label: 'Imóveis rurais', Icon: Landmark },
  { value: 'Matrícula (Imóvel Urbano)', label: 'Imóveis urbanos', Icon: Landmark },
  { value: 'Bem', label: 'Bens', Icon: FolderKanban },
];
const STATUS_OPTIONS: { value: ChecklistStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'solicitado', label: 'Solicitado' },
  { value: 'recebido', label: 'Recebido' },
  { value: 'dispensado', label: 'Dispensado' },
  { value: 'nao_aplicavel', label: 'Não aplicável' },
  { value: 'nao_solicitado', label: 'Não solicitado' },
];

type StatusEfetivo = 'pendente' | 'solicitado' | 'recebido' | 'dispensado' | 'nao_aplicavel' | 'nao_solicitado';
type StatusFilter = 'todos' | 'abertos' | 'recebidos' | 'encerrados';
type Grupo = { key: string; label: string; tipo: string; items: ChecklistClienteRow[] };

const statusEfetivo = (item: ChecklistClienteRow): StatusEfetivo => {
  if (item.status === 'dispensado') return 'dispensado';
  if (item.status === 'nao_aplicavel') return 'nao_aplicavel';
  if (item.status === 'solicitado') return 'solicitado';
  if (item.status === 'nao_solicitado') return 'nao_solicitado';
  return itemRecebido(item) ? 'recebido' : 'pendente';
};
const itemAberto = (item: ChecklistClienteRow) => ['pendente', 'solicitado'].includes(statusEfetivo(item));

export function ChecklistPendentes({ clienteId }: { clienteId: string }) {
  const { data: clientes = [] } = useClientesLista();
  const { data: itens = [], isLoading } = useChecklistClienteItens(clienteId);
  const { data: padrao = [] } = useChecklistPadrao();
  const { data: pessoas = [] } = usePessoasByCliente(clienteId);
  const { data: bens = [] } = useBensByCliente(clienteId);
  const { data: allMatriculas = [] } = useAllMatriculas();
  const { data: docs = [] } = useDocumentosByCliente(clienteId);
  const gerar = useGerarChecklistCliente(clienteId);
  const addCond = useAdicionarCondicional(clienteId);
  const setStatus = useDefinirStatusItem(clienteId);
  const vincular = useVincularDocumento(clienteId);
  const remover = useRemoverChecklistItem(clienteId);

  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoryFilter>('todos');
  const [filtroStatus, setFiltroStatus] = useState<StatusFilter>('todos');
  const [grupoAtivo, setGrupoAtivo] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [vincId, setVincId] = useState<string | null>(null);
  const clienteNome = clientes.find((cliente) => cliente.id === clienteId)?.nome ?? '';

  const { pessoaById, bemLabelById, matriculaById } = useMemo(() => ({
    pessoaById: new Map(pessoas.map((pessoa) => [pessoa.id, pessoa])),
    bemLabelById: new Map(bens.map((bem) => [bem.id, [bem.referencia_dp, bem.denominacao].filter(Boolean).join(' — ')])),
    matriculaById: new Map(allMatriculas.map((matricula) => [
      matricula.id,
      { imovel: matricula.bem_denominacao || matricula.bem_referencia || null, numero: matricula.numero as string | null },
    ])),
  }), [pessoas, bens, allMatriculas]);

  const instanceLabel = (item: ChecklistClienteRow): string | null => {
    if (item.pessoa_id) return pessoaById.get(item.pessoa_id)?.denominacao ?? 'Pessoa';
    if (item.matricula_id) {
      const matricula = matriculaById.get(item.matricula_id);
      return matricula?.imovel ?? (matricula?.numero ? `Matrícula ${matricula.numero}` : 'Imóvel');
    }
    if (item.bem_id) return bemLabelById.get(item.bem_id) ?? 'Bem';
    return null;
  };
  const instanceDetail = (item: ChecklistClienteRow): string | null => {
    if (!item.matricula_id) return null;
    const matricula = matriculaById.get(item.matricula_id);
    return matricula?.imovel && matricula.numero ? `Matrícula ${matricula.numero}` : null;
  };

  const totais = useMemo(() => {
    let pendentes = 0;
    let recebidos = 0;
    let solicitados = 0;
    let encerrados = 0;
    for (const item of itens) {
      const status = statusEfetivo(item);
      if (status === 'recebido') recebidos++;
      else if (status === 'pendente') pendentes++;
      else if (status === 'solicitado') solicitados++;
      else encerrados++;
    }
    const base = recebidos + pendentes + solicitados;
    return { pendentes, recebidos, solicitados, encerrados, base, pct: base ? Math.round((recebidos / base) * 100) : 0 };
  }, [itens]);

  const todosGrupos = useMemo<Grupo[]>(() => {
    const map = new Map<string, Grupo>();
    for (const item of itens) {
      const label = instanceLabel(item) ?? item.entidade;
      const key = `${item.entidade}:${label}`;
      const existente = map.get(key);
      if (existente) existente.items.push(item);
      else map.set(key, { key, label, tipo: item.entidade, items: [item] });
    }
    return [...map.values()].sort((a, b) => {
      const tipoA = TIPO_CLUSTER_ORDER.indexOf(clusterKey(a.tipo));
      const tipoB = TIPO_CLUSTER_ORDER.indexOf(clusterKey(b.tipo));
      if (tipoA !== tipoB) return (tipoA < 0 ? 99 : tipoA) - (tipoB < 0 ? 99 : tipoB);
      const abertoA = a.items.some(itemAberto);
      const abertoB = b.items.some(itemAberto);
      if (abertoA !== abertoB) return abertoA ? -1 : 1;
      return a.label.localeCompare(b.label, 'pt-BR');
    });
    // Os mapas de entidades alteram os rótulos que formam as chaves dos grupos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, pessoaById, bemLabelById, matriculaById]);

  const gruposFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return todosGrupos.filter((grupo) => grupo.items.some((item) => {
      const status = statusEfetivo(item);
      const correspondeStatus = filtroStatus === 'todos'
        || (filtroStatus === 'abertos' && (status === 'pendente' || status === 'solicitado'))
        || (filtroStatus === 'recebidos' && status === 'recebido')
        || (filtroStatus === 'encerrados' && ['dispensado', 'nao_aplicavel', 'nao_solicitado'].includes(status));
      const correspondeBusca = !termo || [grupo.label, grupo.tipo, item.documento, item.nota, instanceDetail(item)]
        .filter(Boolean).some((valor) => valor!.toLocaleLowerCase('pt-BR').includes(termo));
      return correspondeStatus && correspondeBusca;
    }));
    // instanceDetail depende do mapa de matrículas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todosGrupos, busca, filtroStatus, matriculaById]);

  const contagemPorCategoria = useMemo(() => {
    const contagem = new Map<string, number>();
    gruposFiltrados.forEach((grupo) => {
      const categoria = clusterKey(grupo.tipo);
      contagem.set(categoria, (contagem.get(categoria) ?? 0) + 1);
    });
    return contagem;
  }, [gruposFiltrados]);
  const gruposVisiveis = filtroCategoria === 'todos'
    ? gruposFiltrados
    : gruposFiltrados.filter((grupo) => clusterKey(grupo.tipo) === filtroCategoria);

  const grupoSelecionado = todosGrupos.find((grupo) => grupo.key === grupoAtivo) ?? null;
  const vincItem = vincId ? itens.find((item) => item.id === vincId) ?? null : null;

  if (isLoading) return <p className="py-16 text-center text-sm text-osg-500">Carregando checklist do cliente...</p>;
  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-osg-300/70 bg-white/60 px-6 py-16 text-center shadow-sm">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-osg-100 text-osg-moss"><ClipboardCheck className="h-7 w-7" /></span>
        <div>
          <p className="font-semibold text-osg-700">Nenhum checklist gerado para {clienteNome || 'este cliente'}.</p>
          <p className="mt-1 max-w-xl text-sm text-osg-500">Gere os documentos obrigatórios do padrão para cada pessoa, bem e matrícula.</p>
        </div>
        <Button onClick={() => gerar.mutate()} disabled={gerar.isPending}>
          <RefreshCw className={cn('mr-2 h-4 w-4', gerar.isPending && 'animate-spin')} />
          {gerar.isPending ? 'Gerando...' : 'Gerar checklist do cliente'}
        </Button>
      </div>
    );
  }

  const categorias = [...new Set(gruposVisiveis.map((grupo) => clusterKey(grupo.tipo)))]
    .sort((a, b) => {
      const indexA = TIPO_CLUSTER_ORDER.indexOf(a);
      const indexB = TIPO_CLUSTER_ORDER.indexOf(b);
      return (indexA < 0 ? 99 : indexA) - (indexB < 0 ? 99 : indexB) || a.localeCompare(b, 'pt-BR');
    })
    .map((tipo) => ({ tipo, grupos: gruposVisiveis.filter((grupo) => clusterKey(grupo.tipo) === tipo) }));

  return (
    <div className="space-y-8">
      <ResumoHero clienteNome={clienteNome} {...totais} />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-osg-200/70 bg-white/70 p-3 shadow-[0_8px_24px_-20px_hsl(var(--osg-700)/0.28)]">
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-osg-100 bg-osg-50 p-1">
          {CATEGORIAS_FILTRO.map(({ value, label, Icon }) => {
            const ativo = filtroCategoria === value;
            const total = value === 'todos' ? gruposFiltrados.length : contagemPorCategoria.get(value) ?? 0;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFiltroCategoria(value)}
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
        <div className="relative ml-auto min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-osg-300" />
          <Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar pessoa, imóvel ou documento..." className="border-osg-200/80 bg-osg-50/60 pl-9" />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" />Filtros
              {filtroStatus !== 'todos' && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-osg-moss px-1 text-[10px] font-bold text-white">1</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={filtroStatus} onValueChange={(value) => setFiltroStatus(value as StatusFilter)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="abertos">Em aberto</SelectItem>
                  <SelectItem value="recebidos">Recebidos</SelectItem>
                  <SelectItem value="encerrados">Encerrados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filtroStatus !== 'todos' && (
              <Button variant="ghost" size="sm" onClick={() => setFiltroStatus('todos')} className="h-8 w-full text-xs text-osg-500 hover:text-osg-700">
                <FilterX className="mr-1.5 h-3.5 w-3.5" />Limpar filtros
              </Button>
            )}
          </PopoverContent>
        </Popover>
        <Button variant="outline" onClick={() => gerar.mutate()} disabled={gerar.isPending}>
          <RefreshCw className={cn('mr-2 h-4 w-4', gerar.isPending && 'animate-spin')} />Atualizar
        </Button>
        <Button onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Adicionar</Button>
      </div>

      {categorias.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-osg-200 py-14 text-center text-sm text-osg-500">Nenhum resultado para os filtros selecionados.</div>
      ) : categorias.map((categoria, index) => (
        <section key={categoria.tipo} className="animate-osg-rise">
          <div className="mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-osg-500">Categoria {String(index + 1).padStart(2, '0')}</span>
            <div className="mt-1 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-osg-700">{TIPO_CLUSTER_LABEL[categoria.tipo] ?? categoria.tipo}</h3>
                <div className="mt-1 h-[3px] w-8 rounded-full bg-osg-moss" />
              </div>
              <span className="text-xs font-semibold tabular-nums text-osg-500">{categoria.grupos.length} entidade{categoria.grupos.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categoria.grupos.map((grupo) => <EntityCard key={grupo.key} grupo={grupo} onOpen={() => setGrupoAtivo(grupo.key)} />)}
          </div>
        </section>
      ))}

      <DocumentosDialog
        grupo={grupoSelecionado}
        onOpenChange={(open) => !open && setGrupoAtivo(null)}
        onVincular={(id) => setVincId(id)}
        onSetStatus={(id, status) => setStatus.mutate({ id, status })}
        onRemover={(id) => remover.mutate(id)}
      />
      <VincularDocumentoDialog
        item={vincItem}
        documentos={docs}
        onOpenChange={(open) => !open && setVincId(null)}
        onVincular={(documentoId, itemId) => vincular.mutate({ documentoId, itemId })}
      />
      <AddCondicionalDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        padrao={padrao}
        pessoas={pessoas}
        bens={bens}
        matriculas={allMatriculas.filter((matricula) => matricula.bem_cliente_id === clienteId || matricula.titular_cliente_ids.includes(clienteId))}
        onConfirm={(lista) => { lista.forEach((argumento) => addCond.mutate(argumento)); setAddOpen(false); }}
      />
    </div>
  );
}

function ResumoHero({ clienteNome, pct, base, recebidos, pendentes, solicitados, encerrados }: {
  clienteNome: string; pct: number; base: number; recebidos: number; pendentes: number; solicitados: number; encerrados: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-osg-300/60 bg-white/75 p-5 shadow-[0_14px_40px_-28px_hsl(var(--osg-700)/0.35)] sm:p-7">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-osg-moss/5 blur-3xl" />
      <div className="relative grid gap-7 lg:grid-cols-[1fr_280px] lg:items-center">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-osg-500">Resumo da coleta</span>
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
          <Metric label="Solicitados" value={solicitados} tone="neutral" />
          <Metric label="Encerrados" value={encerrados} tone="neutral" />
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'warning' | 'neutral' }) {
  return (
    <div className="rounded-xl bg-osg-50/70 px-3 py-3 text-center">
      <div className={cn('text-xl font-bold tabular-nums', tone === 'warning' ? 'text-osg-700' : 'text-osg-moss')}>{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-osg-500">{label}</div>
    </div>
  );
}

function EntityCard({ grupo, onOpen }: { grupo: Grupo; onOpen: () => void }) {
  const Icon = ENTIDADE_ICON[grupo.tipo] ?? ClipboardCheck;
  const recebidos = grupo.items.filter((item) => statusEfetivo(item) === 'recebido').length;
  const abertos = grupo.items.filter(itemAberto).length;
  const base = recebidos + abertos;
  const pct = base ? Math.round((recebidos / base) * 100) : 0;
  const cardStatus = abertos > 0
    ? grupo.items.some((item) => statusEfetivo(item) === 'solicitado') ? 'solicitado' : 'pendente'
    : recebidos > 0 ? 'recebido' : 'encerrado';
  const preview = grupo.items.filter(itemAberto).slice(0, 2).map((item) => item.documento).join(' · ');
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex min-h-48 flex-col rounded-2xl border border-osg-300/60 bg-white/75 p-5 text-left shadow-[0_8px_24px_-22px_hsl(var(--osg-700)/0.35)] transition-all duration-200 hover:-translate-y-1 hover:border-osg-moss/40 hover:shadow-[0_16px_30px_-20px_hsl(var(--osg-moss)/0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss/40"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-osg-50 text-osg-moss"><Icon className="h-5 w-5" /></span>
        <StatusPill status={cardStatus} />
      </div>
      <h4 className="mt-5 font-semibold leading-snug text-osg-700">{grupo.label}</h4>
      <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-relaxed text-osg-500">{preview || 'Todos os documentos foram tratados.'}</p>
      <div className="mt-auto flex items-center gap-3 pt-5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-osg-100"><div className={cn('h-full rounded-full', abertos ? 'bg-osg-highlighter' : 'bg-osg-moss')} style={{ width: `${pct}%` }} /></div>
        <span className="text-sm font-bold tabular-nums text-osg-600">{recebidos}/{base}</span>
      </div>
      <span className="mt-3 text-xs font-semibold text-osg-moss group-hover:underline">Ver {grupo.items.length} documento{grupo.items.length === 1 ? '' : 's'}</span>
    </button>
  );
}

function DocumentosDialog({ grupo, onOpenChange, onVincular, onSetStatus, onRemover }: {
  grupo: Grupo | null;
  onOpenChange: (open: boolean) => void;
  onVincular: (id: string) => void;
  onSetStatus: (id: string, status: ChecklistStatus) => void;
  onRemover: (id: string) => void;
}) {
  return (
    <Dialog open={!!grupo} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-osg-100 bg-osg-50/50 px-6 py-5 text-left">
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-osg-500">{grupo ? TIPO_CLUSTER_LABEL[grupo.tipo] ?? grupo.tipo : ''}</span>
          <DialogTitle className="text-xl text-osg-700">{grupo?.label}</DialogTitle>
          <DialogDescription>Consulte arquivos e atualize o andamento de cada documento.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[calc(90vh-130px)] divide-y divide-osg-100 overflow-y-auto px-2 pb-2 sm:px-4">
          {grupo?.items.slice().sort((a, b) => Number(itemAberto(b)) - Number(itemAberto(a))).map((item) => (
            <DocumentRow key={item.id} item={item} onVincular={() => onVincular(item.id)} onSetStatus={(status) => onSetStatus(item.id, status)} onRemover={() => onRemover(item.id)} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DocumentRow({ item, onVincular, onSetStatus, onRemover }: {
  item: ChecklistClienteRow;
  onVincular: () => void;
  onSetStatus: (status: ChecklistStatus) => void;
  onRemover: () => void;
}) {
  const status = statusEfetivo(item);
  return (
    <div className="px-2 py-4 sm:px-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', status === 'recebido' ? 'bg-osg-moss/10 text-osg-moss' : 'bg-osg-highlighter/20 text-osg-700')}>
          {status === 'recebido' ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-osg-700">{item.documento}</h4>
            {item.obrigatorio && <Badge>Obrigatório</Badge>}
            {item.origem === 'manual' && <Badge>Manual</Badge>}
            {item.confidencial && <Badge tone="danger"><ShieldAlert className="h-3 w-3" />Confidencial</Badge>}
          </div>
          {item.nota && <p className="mt-1 text-xs leading-relaxed text-osg-500">{item.nota}</p>}
          {item.arquivos.length > 0 && <p className="mt-2 truncate text-xs font-medium text-osg-moss">{item.arquivos.map((arquivo) => arquivo.nome_original).join(', ')}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Select value={item.status} onValueChange={(value) => onSetStatus(value as ChecklistStatus)}>
            <SelectTrigger className="h-8 w-36 border-osg-200/80 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map((opcao) => <SelectItem key={opcao.value} value={opcao.value} disabled={opcao.value === 'recebido'}>{opcao.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={onVincular} title="Vincular arquivo"><Link2 className="h-4 w-4" /></Button>
          {item.origem === 'manual' && <Button variant="ghost" size="sm" className="text-osg-red" onClick={onRemover} title="Remover documento"><Trash2 className="h-4 w-4" /></Button>}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: 'recebido' | 'pendente' | 'solicitado' | 'encerrado' }) {
  const config = {
    recebido: ['Concluído', 'bg-osg-moss/10 text-osg-moss'],
    pendente: ['Pendente', 'bg-osg-highlighter/25 text-osg-700'],
    solicitado: ['Solicitado', 'bg-osg-100 text-osg-700'],
    encerrado: ['Tratado', 'bg-osg-100 text-osg-500'],
  }[status];
  return <span className={cn('rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]', config[1])}>{config[0]}</span>;
}

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'danger' }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', tone === 'danger' ? 'bg-osg-red/10 text-osg-red' : 'bg-osg-100/70 text-osg-600')}>{children}</span>;
}

export default ChecklistPendentes;
