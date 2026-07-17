import { useMemo, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2, Check, ChevronRight, ClipboardCheck, FileText, FolderArchive, FolderKanban,
  Info, Landmark, Link2, MoreHorizontal, PieChart, Plus, Printer, RefreshCw, ScrollText,
  ShieldAlert, Trash2, User, Users,
} from 'lucide-react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import { usePessoasByCliente } from '@/hooks/useQualificacaoDasPartes';
import { useBensByCliente, useAllMatriculas } from '@/hooks/useDiagnosticoPatrimonial';
import { useDocumentosByCliente } from '@/hooks/useDocumentoArquivo';
import {
  useChecklistPadrao, useChecklistClienteItens, useGerarChecklistCliente,
  useAdicionarCondicional, useDefinirStatusItem, useVincularDocumento, useRemoverChecklistItem,
  itemRecebido, type ChecklistClienteRow, type ChecklistPadraoRow, type ChecklistStatus,
} from '@/hooks/useOsgChecklist';
import { DiagnosticoPatrimonialReport } from '@/components/equipe/osg/relatorios/DiagnosticoPatrimonialReport';
import { SocietarioReport } from '@/components/equipe/osg/relatorios/SocietarioReport';
import { FiscalReport } from '@/components/equipe/osg/relatorios/FiscalReport';
import { GerarApresentacaoMenu } from '@/components/equipe/osg/relatorios/GerarApresentacao';

const RELATORIOS = [
  { value: 'checklist-pendentes', label: 'Checklist de Documentos Pendentes' },
  { value: 'dp', label: 'Diagnóstico Patrimonial' },
  { value: 'societario', label: 'Quadro Societário / Organograma' },
  { value: 'fiscal', label: 'Abertura de Demanda — Planejamento Tributário' },
];

const MODULO_ORDER = ['Qualificação das Partes', 'Diagnóstico Patrimonial', 'Quadro Societário', 'EXTRAS POR PROJETO'];
const MODULO_ICON: Record<string, LucideIcon> = {
  'Qualificação das Partes': Users,
  'Diagnóstico Patrimonial': Landmark,
  'Quadro Societário': PieChart,
  'EXTRAS POR PROJETO': FolderKanban,
};
const ENTIDADE_ICON: Record<string, LucideIcon> = {
  'Pessoa Física': User,
  'Pessoa Jurídica': Building2,
  'Matrícula (Imóvel Rural)': ScrollText,
  'Matrícula (Imóvel Urbano)': ScrollText,
  'Bem': Landmark,
  'Pessoa Jurídica (Cooperativa)': Building2,
};
const moduloLabel = (m: string) => (m === 'EXTRAS POR PROJETO' ? 'Extras por Projeto' : m);

type GroupMode = 'entidade' | 'documento' | 'modulo';
// Agrupamento é sempre por entidade (nativo); seções agrupadas por tipo (rótulo de cluster).
const TIPO_CLUSTER_LABEL: Record<string, string> = {
  'Pessoa Física': 'Pessoas Físicas',
  'Pessoa Jurídica': 'Pessoas Jurídicas',
  'Pessoa Jurídica (Cooperativa)': 'Pessoas Jurídicas',
  'Matrícula (Imóvel Rural)': 'Imóveis Rurais',
  'Matrícula (Imóvel Urbano)': 'Imóveis Urbanos',
  Bem: 'Bens',
};
const TIPO_CLUSTER_ORDER = [
  'Pessoa Física', 'Pessoa Jurídica', 'Pessoa Jurídica (Cooperativa)',
  'Matrícula (Imóvel Rural)', 'Matrícula (Imóvel Urbano)', 'Bem',
];

type StatusEfetivo = 'pendente' | 'solicitado' | 'recebido' | 'dispensado' | 'nao_aplicavel' | 'nao_solicitado';
const efetivo = (r: ChecklistClienteRow): StatusEfetivo => {
  if (r.status === 'dispensado') return 'dispensado';
  if (r.status === 'nao_aplicavel') return 'nao_aplicavel';
  if (r.status === 'solicitado') return 'solicitado';
  if (r.status === 'nao_solicitado') return 'nao_solicitado';
  return itemRecebido(r) ? 'recebido' : 'pendente';
};

const Relatorios = () => {
  const { clienteId } = useOsgWork();
  const [relatorio, setRelatorio] = useState(RELATORIOS[0].value);

  return (
    <OsgLayout
      title="Relatórios"
      subtitle="Relatórios da área OSG Work, por cliente"
      headerActions={
        clienteId ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
            <GerarApresentacaoMenu clienteId={clienteId} />
          </div>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Label className="text-sm font-semibold text-slate-600 sm:w-24">Relatório</Label>
          <Select value={relatorio} onValueChange={setRelatorio}>
            <SelectTrigger className="w-full sm:max-w-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RELATORIOS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {!clienteId ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 py-16 text-center text-muted-foreground">
            <FolderArchive className="h-10 w-10 opacity-50" />
            <p className="text-sm">Selecione um cliente na barra acima para gerar o relatório.</p>
          </div>
        ) : relatorio === 'checklist-pendentes' ? (
          <ChecklistPendentes clienteId={clienteId} />
        ) : relatorio === 'dp' ? (
          <DiagnosticoPatrimonialReport clienteId={clienteId} />
        ) : relatorio === 'societario' ? (
          <SocietarioReport clienteId={clienteId} />
        ) : relatorio === 'fiscal' ? (
          <FiscalReport clienteId={clienteId} />
        ) : null}
      </div>
    </OsgLayout>
  );
};

function ChecklistPendentes({ clienteId }: { clienteId: string }) {
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

  const agruparPor = 'entidade' as GroupMode;
  const [openState, setOpenState] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [vincId, setVincId] = useState<string | null>(null);

  const clienteNome = clientes.find((c) => c.id === clienteId)?.nome ?? '';

  // Rótulos das instâncias (de quem é o requisito).
  const { pessoaById, bemLabelById, matriculaById } = useMemo(() => {
    const pById = new Map(pessoas.map((p) => [p.id, p]));
    const bById = new Map(bens.map((b) => [b.id, [b.referencia_dp, b.denominacao].filter(Boolean).join(' — ')]));
    // A matrícula pertence a um imóvel (bem): a entidade é o imóvel; o nº da matrícula é detalhe.
    const mById = new Map(allMatriculas.map((m) => [
      m.id,
      { imovel: m.bem_denominacao || m.bem_referencia || null, numero: m.numero as string | null },
    ]));
    return { pessoaById: pById, bemLabelById: bById, matriculaById: mById };
  }, [pessoas, bens, allMatriculas]);

  const instanceLabel = (r: ChecklistClienteRow): string | null => {
    if (r.pessoa_id) return pessoaById.get(r.pessoa_id)?.denominacao ?? 'Pessoa';
    if (r.matricula_id) {
      const m = matriculaById.get(r.matricula_id);
      return m?.imovel ?? (m?.numero ? `Matrícula ${m.numero}` : 'Imóvel');
    }
    if (r.bem_id) return bemLabelById.get(r.bem_id) ?? 'Bem';
    return null;
  };

  // Detalhe da linha: nº da matrícula, para desambiguar imóveis com mais de uma matrícula.
  const instanceDetail = (r: ChecklistClienteRow): string | null => {
    if (r.matricula_id) {
      const m = matriculaById.get(r.matricula_id);
      if (m?.imovel && m.numero) return `Mat. ${m.numero}`;
    }
    return null;
  };

  const totais = useMemo(() => {
    let pendentes = 0, recebidos = 0, solicitados = 0, naoSolicitados = 0, obrigPend = 0;
    for (const r of itens) {
      const e = efetivo(r);
      if (e === 'recebido') recebidos++;
      else if (e === 'pendente') { pendentes++; if (r.obrigatorio) obrigPend++; }
      else if (e === 'solicitado') { solicitados++; if (r.obrigatorio) obrigPend++; }
      else if (e === 'nao_solicitado') naoSolicitados++;
    }
    // Base do progresso: recebidos + pendentes + solicitados (solicitado é "aberto").
    // Excluídos: dispensado, nao_aplicavel, nao_solicitado.
    const base = recebidos + pendentes + solicitados;
    return {
      total: itens.length,
      pendentes, recebidos, solicitados, naoSolicitados, obrigPend,
      pct: base ? Math.round((recebidos / base) * 100) : 0,
    };
  }, [itens]);

  // Agrupamento por dimensão escolhida (Entidade | Tipo de documento | Módulo).
  type Grupo = { key: string; label: string; tipo: string | null; items: ChecklistClienteRow[] };
  const grupos = useMemo<Grupo[]>(() => {
    const map = new Map<string, Grupo>();
    for (const it of itens) {
      let key: string, label: string, tipo: string | null;
      if (agruparPor === 'entidade') { key = instanceLabel(it) ?? it.entidade; label = key; tipo = it.entidade; }
      else if (agruparPor === 'documento') { key = it.documento; label = it.documento; tipo = null; }
      else { key = it.modulo; label = moduloLabel(it.modulo); tipo = null; }
      let g = map.get(key);
      if (!g) { g = { key, label, tipo, items: [] }; map.set(key, g); }
      g.items.push(it);
    }
    const arr = [...map.values()];
    const hasPend = (g: Grupo) => g.items.some((x) => { const e = efetivo(x); return e === 'pendente' || e === 'solicitado'; });
    arr.sort((a, b) => {
      if (agruparPor === 'entidade') {
        const ia = TIPO_CLUSTER_ORDER.indexOf(a.tipo ?? ''), ib = TIPO_CLUSTER_ORDER.indexOf(b.tipo ?? '');
        const to = (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); if (to) return to;
      } else if (agruparPor === 'modulo') {
        const ia = MODULO_ORDER.indexOf(a.key), ib = MODULO_ORDER.indexOf(b.key);
        const to = (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); if (to) return to;
      }
      if (hasPend(a) !== hasPend(b)) return hasPend(a) ? -1 : 1;
      return a.label.localeCompare(b.label, 'pt-BR');
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, agruparPor, pessoaById, bemLabelById, matriculaById]);

  const iconForGroup = (g: Grupo): LucideIcon =>
    agruparPor === 'documento' ? FileText
      : agruparPor === 'modulo' ? (MODULO_ICON[g.key] ?? ClipboardCheck)
        : (ENTIDADE_ICON[g.tipo ?? ''] ?? ClipboardCheck);

  // Texto de cada linha muda conforme a dimensão de agrupamento (a seção já dá o contexto).
  const rowTexts = (it: ChecklistClienteRow): { primary: string; context: string | null } => {
    const det = instanceDetail(it);
    if (agruparPor === 'entidade') return { primary: it.documento, context: det };
    if (agruparPor === 'documento') {
      const inst = instanceLabel(it);
      return { primary: inst ?? it.entidade, context: det ?? (inst ? it.entidade : null) };
    }
    const inst = instanceLabel(it);
    return { primary: it.documento, context: [inst ?? it.entidade, det].filter(Boolean).join(' · ') || null };
  };

  const vincItem = vincId ? itens.find((i) => i.id === vincId) ?? null : null;

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Carregando checklist do cliente…</p>;
  }

  // ── Estado vazio: cliente ainda não tem checklist gerado ──
  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 py-16 text-center">
        <ClipboardCheck className="h-10 w-10 text-osg-400" />
        <div>
          <p className="text-sm font-medium text-slate-700">Nenhum checklist gerado para {clienteNome || 'este cliente'}.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Gera os documentos obrigatórios do padrão, criando um item por instância (RG por pessoa, matrícula por matrícula, etc.).
          </p>
        </div>
        <Button onClick={() => gerar.mutate()} disabled={gerar.isPending}>
          <RefreshCw className={cn('mr-2 h-4 w-4', gerar.isPending && 'animate-spin')} />
          {gerar.isPending ? 'Gerando…' : 'Gerar checklist deste cliente'}
        </Button>
      </div>
    );
  }

  const renderPanel = (g: Grupo) => {
    const Icon = iconForGroup(g);
    const isAberto = (r: ChecklistClienteRow) => {
      const e = efetivo(r);
      return e === 'pendente' || e === 'solicitado';
    };
    const pendN = g.items.filter(isAberto).length;
    const opened = openState[g.key] ?? false; // recolhido por padrão
    const items = g.items.slice().sort((a, b) => (isAberto(a) ? 0 : 1) - (isAberto(b) ? 0 : 1));
    return (
      <div key={g.key} className="overflow-hidden rounded-xl border border-osg-200 bg-background shadow-sm">
        <button
          type="button"
          onClick={() => setOpenState((s) => ({ ...s, [g.key]: !(s[g.key] ?? false) }))}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-osg-50/40"
        >
          <Icon className="h-4 w-4 shrink-0 text-slate-400" />
          <h3 className="min-w-0 truncate text-sm font-semibold text-slate-800">{g.label}</h3>
          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            {pendN === 0 ? <Pill tone="ok">Completo</Pill> : <Pill tone="pend">{pendN} pendente{pendN > 1 ? 's' : ''}</Pill>}
            <ChevronRight className={cn('h-4 w-4 text-slate-300 transition-transform', opened && 'rotate-90')} />
          </div>
        </button>
        {opened && (
          <ul className="divide-y divide-osg-100 border-t border-osg-100">
            {items.map((it) => {
              const rt = rowTexts(it);
              return (
                <ItemRow
                  key={it.id}
                  it={it}
                  primary={rt.primary}
                  context={rt.context}
                  onVincular={() => setVincId(it.id)}
                  onSetStatus={(s) => setStatus.mutate({ id: it.id, status: s })}
                  onRemover={() => remover.mutate(it.id)}
                />
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-800">
          Documentos pendentes — <span className="text-osg-700">{clienteNome}</span>
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => gerar.mutate()} disabled={gerar.isPending}>
            <RefreshCw className={cn('mr-2 h-4 w-4', gerar.isPending && 'animate-spin')} /> Atualizar
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar documento
          </Button>
        </div>
      </div>

      <ResumoStrip {...totais} />

      <div className="space-y-2.5">
        {agruparPor === 'entidade'
          ? (() => {
              const tipoCount: Record<string, number> = {};
              grupos.forEach((g) => { const t = g.tipo ?? ''; tipoCount[t] = (tipoCount[t] ?? 0) + 1; });
              const out: ReactNode[] = [];
              let last: string | null | undefined;
              grupos.forEach((g) => {
                if (g.tipo !== last) {
                  last = g.tipo;
                  out.push(
                    <div key={`c:${g.tipo}`} className="flex items-center gap-2 px-1 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400 first:pt-1">
                      {TIPO_CLUSTER_LABEL[g.tipo ?? ''] ?? g.tipo}
                      <span className="rounded-full bg-slate-100 px-2 text-[11px] font-bold tabular-nums text-slate-500">{tipoCount[g.tipo ?? '']}</span>
                    </div>,
                  );
                }
                out.push(renderPanel(g));
              });
              return out;
            })()
          : grupos.map(renderPanel)}
      </div>

      <div className="flex items-start gap-2 px-1 text-xs leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span>
          Todo documento listado é <b className="font-semibold text-slate-600">necessário</b> para este cliente
          (obrigatórios do padrão + condicionais). A etiqueta indica se já foi{' '}
          <b className="font-semibold text-slate-600">recebido</b> ou está{' '}
          <b className="font-semibold text-slate-600">pendente</b>. Clique numa seção para expandir.
        </span>
      </div>

      {/* Dialog: vincular documento existente ao item */}
      <Dialog open={!!vincItem} onOpenChange={(o) => !o && setVincId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular documento</DialogTitle>
            <DialogDescription>
              {vincItem ? <>Escolha o arquivo do cliente que satisfaz <strong>{vincItem.documento}</strong>{instanceLabel(vincItem ?? ({} as ChecklistClienteRow)) ? <> · {instanceLabel(vincItem)}</> : null}.</> : null}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {docs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum documento anexado a este cliente ainda.</p>
            ) : (
              docs.map((d) => {
                const linked = vincItem?.arquivos.some((a) => a.id === d.id) ?? false;
                return (
                  <div key={d.id} className="flex items-center gap-2 rounded-md border border-slate-100 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{d.nome_original}</span>
                    {linked ? (
                      <Button variant="ghost" size="sm" className="text-rose-600"
                        onClick={() => vincItem && vincular.mutate({ documentoId: d.id, itemId: null })}>
                        Desvincular
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm"
                        onClick={() => vincItem && vincular.mutate({ documentoId: d.id, itemId: vincItem.id })}>
                        Vincular
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVincId(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: adicionar condicional do catálogo */}
      <AddCondicionalDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        padrao={padrao}
        pessoas={pessoas}
        bens={bens}
        matriculas={allMatriculas.filter((m) => m.bem_cliente_id === clienteId || m.titular_cliente_ids.includes(clienteId))}
        onConfirm={(list) => { list.forEach((a) => addCond.mutate(a)); setAddOpen(false); }}
      />
    </div>
  );
}

const STATUS_MANUAIS: { value: ChecklistStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'solicitado', label: 'Solicitado' },
  { value: 'dispensado', label: 'Dispensado' },
  { value: 'nao_aplicavel', label: 'Não aplicável' },
  { value: 'nao_solicitado', label: 'Não solicitado' },
];

function ItemRow({
  it, primary, context, onVincular, onSetStatus, onRemover,
}: {
  it: ChecklistClienteRow;
  primary: string;
  context: string | null;
  onVincular: () => void;
  onSetStatus: (s: ChecklistStatus) => void;
  onRemover: () => void;
}) {
  const e = efetivo(it);
  const dimmed = e === 'recebido' || e === 'dispensado' || e === 'nao_aplicavel' || e === 'nao_solicitado';
  const renderPill = () => {
    if (e === 'recebido') return <Pill tone="ok">Recebido</Pill>;
    if (e === 'pendente') return <Pill tone="pend">Pendente</Pill>;
    if (e === 'solicitado') return <Pill tone="info">Solicitado</Pill>;
    if (e === 'dispensado') return <Pill tone="neutral">Dispensado</Pill>;
    if (e === 'nao_aplicavel') return <Pill tone="neutral">Não aplicável</Pill>;
    return <Pill tone="neutral">Não solicitado</Pill>;
  };
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn('font-medium', dimmed ? 'text-slate-500' : 'text-slate-800')}>
            {primary}
          </span>
          {context && <span className="text-xs text-slate-400">· {context}</span>}
          <ObrigBadge obrigatorio={it.obrigatorio} />
          {it.origem === 'manual' && (
            <span className="rounded-full bg-osg-100 px-2 py-0.5 text-[11px] font-medium text-osg-700">manual</span>
          )}
          {it.confidencial && (
            <span className="inline-flex items-center gap-1 rounded-full bg-osg-red/10 px-2 py-0.5 text-[11px] font-medium text-osg-red">
              <ShieldAlert className="h-3 w-3" /> Confidencial
            </span>
          )}
          {it.categoria_docbox && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{it.categoria_docbox}</span>
          )}
        </div>
        {it.nota && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{it.nota}</p>}
        {it.arquivos.length > 0 && (
          <p className="mt-1 text-[11px] text-emerald-700">
            {it.arquivos.length} arquivo(s): {it.arquivos.map((a) => a.nome_original).join(', ')}
          </p>
        )}
        {e === 'dispensado' && <p className="mt-1 text-[11px] text-slate-500">Dispensado para este cliente.</p>}
        {e === 'nao_solicitado' && <p className="mt-1 text-[11px] text-slate-500">Não solicitado — fora da base do progresso.</p>}
      </div>
      {renderPill()}
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onVincular} title="Vincular documento">
          <Link2 className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" title="Alterar status">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-slate-500">Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUS_MANUAIS.map((s) => (
              <DropdownMenuItem
                key={s.value}
                disabled={it.status === s.value}
                onSelect={() => onSetStatus(s.value)}
              >
                {s.label}
                {it.status === s.value && <Check className="ml-auto h-3.5 w-3.5 text-slate-400" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {it.origem === 'manual' && (
          <Button variant="ghost" size="sm" className="text-rose-600" onClick={onRemover} title="Remover item">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </li>
  );
}

function AddCondicionalDialog({
  open, onOpenChange, padrao, pessoas, bens, matriculas, onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  padrao: ChecklistPadraoRow[];
  pessoas: { id: string; denominacao: string | null; tipo_pessoa: string }[];
  bens: { id: string; referencia_dp: string; denominacao: string }[];
  matriculas: { id: string; numero: string }[];
  onConfirm: (args: Array<{ padrao: ChecklistPadraoRow; pessoaId?: string | null; bemId?: string | null; matriculaId?: string | null }>) => void;
}) {
  const condicionais = useMemo(
    () => padrao.filter((p) => !p.obrigatorio_default).sort((a, b) => a.ordem - b.ordem),
    [padrao],
  );
  const [padraoId, setPadraoId] = useState<string>('');
  const [instIds, setInstIds] = useState<string[]>([]);
  const sel = condicionais.find((p) => p.id === padraoId) ?? null;
  const gran = sel?.granularidade ?? 'cliente';

  const instOpts = useMemo(() => {
    if (gran === 'pessoa_pf') return pessoas.filter((p) => p.tipo_pessoa === 'PF').map((p) => ({ id: p.id, label: p.denominacao ?? 'Pessoa' }));
    if (gran === 'pessoa_pj') return pessoas.filter((p) => p.tipo_pessoa === 'PJ').map((p) => ({ id: p.id, label: p.denominacao ?? 'Empresa' }));
    if (gran === 'matricula_rural' || gran === 'matricula_urbana') return matriculas.map((m) => ({ id: m.id, label: `Matrícula ${m.numero}` }));
    if (gran === 'bem') return bens.map((b) => ({ id: b.id, label: [b.referencia_dp, b.denominacao].filter(Boolean).join(' — ') }));
    return [];
  }, [gran, pessoas, bens, matriculas]);

  const toggleInst = (id: string) => setInstIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const argFor = (id: string) => {
    const a: { padrao: ChecklistPadraoRow; pessoaId?: string | null; bemId?: string | null; matriculaId?: string | null } = { padrao: sel! };
    if (gran === 'pessoa_pf' || gran === 'pessoa_pj') a.pessoaId = id;
    else if (gran === 'matricula_rural' || gran === 'matricula_urbana') a.matriculaId = id;
    else if (gran === 'bem') a.bemId = id;
    return a;
  };
  const reset = () => { setPadraoId(''); setInstIds([]); };
  const confirmar = () => {
    if (!sel) return;
    onConfirm(instIds.length ? instIds.map(argFor) : [{ padrao: sel }]);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar documento</DialogTitle>
          <DialogDescription>Escolha um documento condicional do catálogo e, se quiser, aplique a várias entidades de uma vez.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Documento</Label>
            <Select value={padraoId} onValueChange={(v) => { setPadraoId(v); setInstIds([]); }}>
              <SelectTrigger><SelectValue placeholder="Selecione o condicional…" /></SelectTrigger>
              <SelectContent>
                {condicionais.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.entidade} · {p.documento}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {sel && instOpts.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Aplicar a (pode marcar vários)</Label>
                <div className="flex gap-3 text-[11px]">
                  <button type="button" className="font-medium text-osg-700 hover:underline" onClick={() => setInstIds(instOpts.map((o) => o.id))}>Todas</button>
                  <button type="button" className="text-slate-500 hover:underline" onClick={() => setInstIds([])}>Limpar</button>
                </div>
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-1">
                {instOpts.map((o) => {
                  const on = instIds.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggleInst(o.id)}
                      className={cn('flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
                        on ? 'bg-osg-50 text-osg-800' : 'text-slate-700 hover:bg-slate-50')}
                    >
                      <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        on ? 'border-osg-moss bg-osg-moss text-white' : 'border-slate-300')}>
                        {on && <Check className="h-3 w-3" />}
                      </span>
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">Sem marcar nenhuma, adiciona um único item genérico.</p>
            </div>
          )}
          {sel?.nota && <p className="text-xs text-muted-foreground">{sel.nota}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={!sel}>
            Adicionar{instIds.length > 1 ? ` (${instIds.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Tira de resumo sóbria (substitui os cards KPI): Pendentes + Recebidos com barra de progresso.
function ResumoStrip({ pendentes, recebidos, total, pct, obrigPend }: {
  pendentes: number; recebidos: number; total: number; pct: number; obrigPend: number;
}) {
  return (
    <div className="flex overflow-hidden rounded-xl border border-osg-200 bg-background shadow-sm max-sm:flex-col">
      <div className="flex-1 px-5 py-3.5 max-sm:border-b max-sm:border-osg-100 sm:border-r sm:border-osg-100">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <span className="h-2 w-2 rounded-sm bg-amber-500" /> Pendentes
        </div>
        <div className="mt-1 text-[22px] font-semibold leading-tight text-slate-800">
          {pendentes} <span className="text-[13px] font-normal text-slate-500">de {total} documentos</span>
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          {obrigPend > 0
            ? `${obrigPend} obrigatório${obrigPend > 1 ? 's' : ''} · aguardando envio do cliente`
            : 'aguardando envio do cliente'}
        </div>
      </div>
      <div className="flex-1 px-5 py-3.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <span className="h-2 w-2 rounded-sm bg-osg-moss" /> Recebidos
        </div>
        <div className="mt-1 text-[22px] font-semibold leading-tight text-slate-800">
          {recebidos} <span className="text-[13px] font-normal text-slate-500">· {pct}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <span className="block h-full rounded-full bg-osg-moss" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function Pill({ tone, children }: { tone: 'ok' | 'pend' | 'neutral'; children: ReactNode }) {
  const cls = {
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    pend: 'border-amber-200 bg-amber-50 text-amber-700',
    neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  }[tone];
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', cls)}>
      {children}
    </span>
  );
}

function ObrigBadge({ obrigatorio }: { obrigatorio: boolean }) {
  return obrigatorio ? (
    <span className="inline-flex items-center rounded-full border border-osg-200 bg-osg-50 px-2 py-0.5 text-[11px] font-medium text-osg-700">Obrigatório</span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">Condicional</span>
  );
}

export default Relatorios;
