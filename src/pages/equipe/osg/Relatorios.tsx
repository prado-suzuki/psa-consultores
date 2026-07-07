import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2, CheckCircle2, Circle, ClipboardCheck, FolderArchive, FolderKanban,
  Landmark, Link2, MinusCircle, PieChart, Plus, Printer, RefreshCw, ScrollText,
  Search, ShieldAlert, Trash2, User, Users,
} from 'lucide-react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import { usePessoasByCliente } from '@/hooks/useQualificacaoDasPartes';
import { useBensByCliente, useAllMatriculas } from '@/hooks/useDiagnosticoPatrimonial';
import { useDocumentosByCliente } from '@/hooks/useDocumentoArquivo';
import {
  useChecklistPadrao, useChecklistClienteItens, useGerarChecklistCliente,
  useAdicionarCondicional, useDefinirStatusItem, useVincularDocumento, useRemoverChecklistItem,
  itemRecebido, type ChecklistClienteRow, type ChecklistPadraoRow,
} from '@/hooks/useOsgChecklist';

const RELATORIOS = [{ value: 'checklist-pendentes', label: 'Checklist de Documentos Pendentes' }];

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

type StatusEfetivo = 'pendente' | 'recebido' | 'dispensado' | 'nao_aplicavel';
const efetivo = (r: ChecklistClienteRow): StatusEfetivo => {
  if (r.status === 'dispensado') return 'dispensado';
  if (r.status === 'nao_aplicavel') return 'nao_aplicavel';
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
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
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

  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<'pendente' | 'recebido' | 'todos'>('pendente');
  const [soObrig, setSoObrig] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [vincId, setVincId] = useState<string | null>(null);

  const clienteNome = clientes.find((c) => c.id === clienteId)?.nome ?? '';

  // Rótulos das instâncias (de quem é o requisito).
  const { pessoaById, bemLabelById, matriculaLabelById } = useMemo(() => {
    const pById = new Map(pessoas.map((p) => [p.id, p]));
    const bById = new Map(bens.map((b) => [b.id, [b.referencia_dp, b.denominacao].filter(Boolean).join(' — ')]));
    const mById = new Map(allMatriculas.map((m) => [m.id, `Matrícula ${m.numero}`]));
    return { pessoaById: pById, bemLabelById: bById, matriculaLabelById: mById };
  }, [pessoas, bens, allMatriculas]);

  const instanceLabel = (r: ChecklistClienteRow): string | null => {
    if (r.pessoa_id) return pessoaById.get(r.pessoa_id)?.denominacao ?? 'Pessoa';
    if (r.matricula_id) return matriculaLabelById.get(r.matricula_id) ?? 'Matrícula';
    if (r.bem_id) return bemLabelById.get(r.bem_id) ?? 'Bem';
    return null;
  };

  const totais = useMemo(() => {
    let pendentes = 0, recebidos = 0, obrigPend = 0;
    for (const r of itens) {
      const e = efetivo(r);
      if (e === 'recebido') recebidos++;
      else if (e === 'pendente') { pendentes++; if (r.obrigatorio) obrigPend++; }
    }
    return { total: itens.length, pendentes, recebidos, obrigPend };
  }, [itens]);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return itens.filter((r) => {
      const e = efetivo(r);
      if (filtro === 'pendente' && e !== 'pendente') return false;
      if (filtro === 'recebido' && e !== 'recebido') return false;
      if (soObrig && !r.obrigatorio) return false;
      if (t) {
        const hay = `${r.documento} ${r.nota ?? ''} ${r.entidade} ${instanceLabel(r) ?? ''}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, filtro, soObrig, q, pessoaById, bemLabelById, matriculaLabelById]);

  const grupos = useMemo(() => {
    const mods: { modulo: string; entidades: { entidade: string; items: ChecklistClienteRow[] }[] }[] = [];
    const idx = new Map<string, number>();
    for (const it of filtrados) {
      let mi = idx.get(it.modulo);
      if (mi === undefined) { mi = mods.length; idx.set(it.modulo, mi); mods.push({ modulo: it.modulo, entidades: [] }); }
      const mod = mods[mi];
      let ent = mod.entidades.find((e) => e.entidade === it.entidade);
      if (!ent) { ent = { entidade: it.entidade, items: [] }; mod.entidades.push(ent); }
      ent.items.push(it);
    }
    mods.sort((a, b) => {
      const ia = MODULO_ORDER.indexOf(a.modulo), ib = MODULO_ORDER.indexOf(b.modulo);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    return mods;
  }, [filtrados]);

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
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Condicional
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Contador label="Pendentes" valor={totais.pendentes} tone="pend" />
        <Contador label="Obrigatórios pendentes" valor={totais.obrigPend} tone="obrig" />
        <Contador label="Recebidos" valor={totais.recebidos} tone="ok" />
        <Contador label="Total no checklist" valor={totais.total} tone="neutro" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar documento, nota ou de quem…" className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-sm">
            {([
              { k: 'pendente', label: `Pendentes (${totais.pendentes})` },
              { k: 'recebido', label: `Recebidos (${totais.recebidos})` },
              { k: 'todos', label: `Todos (${totais.total})` },
            ] as { k: typeof filtro; label: string }[]).map(({ k, label }) => (
              <button key={k} type="button" onClick={() => setFiltro(k)}
                className={cn('rounded-md px-3 py-1.5 font-medium transition-colors',
                  filtro === k ? 'bg-background text-osg-700 shadow-sm' : 'text-slate-500 hover:text-osg-700')}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setSoObrig((v) => !v)}
            className={cn('rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              soObrig ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-osg-700')}>
            Só obrigatórios
          </button>
        </div>
      </div>

      {grupos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-muted-foreground">
          Nenhum documento corresponde ao filtro.
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => {
            const MIcon = MODULO_ICON[g.modulo] ?? ClipboardCheck;
            const count = g.entidades.reduce((n, e) => n + e.items.length, 0);
            return (
              <section key={g.modulo} className="overflow-hidden rounded-xl border border-osg-200 bg-background">
                <header className="flex items-center gap-2.5 border-b border-osg-100 bg-osg-50/70 px-4 py-2.5">
                  <MIcon className="h-4 w-4 text-osg-600" />
                  <h3 className="text-sm font-semibold text-osg-800">{moduloLabel(g.modulo)}</h3>
                  <span className="rounded-full bg-osg-100 px-2 text-xs font-medium tabular-nums text-osg-700">{count}</span>
                </header>
                <div className="divide-y divide-slate-100">
                  {g.entidades.map((ent) => {
                    const EIcon = ENTIDADE_ICON[ent.entidade] ?? ClipboardCheck;
                    return (
                      <div key={ent.entidade}>
                        <div className="flex items-center gap-2 bg-slate-50/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <EIcon className="h-3.5 w-3.5" /> {ent.entidade}
                        </div>
                        <ul className="divide-y divide-slate-100">
                          {ent.items.map((it) => (
                            <ItemRow
                              key={it.id}
                              it={it}
                              instanceLabel={instanceLabel(it)}
                              onVincular={() => setVincId(it.id)}
                              onDispensar={() => setStatus.mutate({ id: it.id, status: 'dispensado' })}
                              onReativar={() => setStatus.mutate({ id: it.id, status: 'pendente' })}
                              onRemover={() => remover.mutate(it.id)}
                            />
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

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
        onConfirm={(args) => { addCond.mutate(args); setAddOpen(false); }}
      />
    </div>
  );
}

function ItemRow({
  it, instanceLabel, onVincular, onDispensar, onReativar, onRemover,
}: {
  it: ChecklistClienteRow;
  instanceLabel: string | null;
  onVincular: () => void;
  onDispensar: () => void;
  onReativar: () => void;
  onRemover: () => void;
}) {
  const e = efetivo(it);
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <StatusIcon estado={e} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn('font-medium', e === 'recebido' || e === 'dispensado' ? 'text-slate-500' : 'text-slate-800')}>
            {it.documento}
          </span>
          {instanceLabel && (
            <span className="rounded-full bg-osg-50 px-2 py-0.5 text-[11px] font-medium text-osg-700">{instanceLabel}</span>
          )}
          <ObrigBadge obrigatorio={it.obrigatorio} />
          {it.origem === 'manual' && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">manual</span>
          )}
          {it.confidencial && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">
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
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onVincular} title="Vincular documento">
          <Link2 className="h-4 w-4" />
        </Button>
        {e === 'dispensado' ? (
          <Button variant="ghost" size="sm" onClick={onReativar} title="Reativar">
            <RefreshCw className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onDispensar} title="Dispensar (não se aplica)">
            <MinusCircle className="h-4 w-4" />
          </Button>
        )}
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
  onConfirm: (args: { padrao: ChecklistPadraoRow; pessoaId?: string | null; bemId?: string | null; matriculaId?: string | null }) => void;
}) {
  const condicionais = useMemo(
    () => padrao.filter((p) => !p.obrigatorio_default).sort((a, b) => a.ordem - b.ordem),
    [padrao],
  );
  const [padraoId, setPadraoId] = useState<string>('');
  const [instId, setInstId] = useState<string>('');
  const sel = condicionais.find((p) => p.id === padraoId) ?? null;
  const gran = sel?.granularidade ?? 'cliente';

  const instOpts = useMemo(() => {
    if (gran === 'pessoa_pf') return pessoas.filter((p) => p.tipo_pessoa === 'PF').map((p) => ({ id: p.id, label: p.denominacao ?? 'Pessoa' }));
    if (gran === 'pessoa_pj') return pessoas.filter((p) => p.tipo_pessoa === 'PJ').map((p) => ({ id: p.id, label: p.denominacao ?? 'Empresa' }));
    if (gran === 'matricula_rural' || gran === 'matricula_urbana') return matriculas.map((m) => ({ id: m.id, label: `Matrícula ${m.numero}` }));
    if (gran === 'bem') return bens.map((b) => ({ id: b.id, label: [b.referencia_dp, b.denominacao].filter(Boolean).join(' — ') }));
    return [];
  }, [gran, pessoas, bens, matriculas]);

  const confirmar = () => {
    if (!sel) return;
    const arg: { padrao: ChecklistPadraoRow; pessoaId?: string | null; bemId?: string | null; matriculaId?: string | null } = { padrao: sel };
    if (instId) {
      if (gran === 'pessoa_pf' || gran === 'pessoa_pj') arg.pessoaId = instId;
      else if (gran === 'matricula_rural' || gran === 'matricula_urbana') arg.matriculaId = instId;
      else if (gran === 'bem') arg.bemId = instId;
    }
    onConfirm(arg);
    setPadraoId(''); setInstId('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setPadraoId(''); setInstId(''); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar condicional</DialogTitle>
          <DialogDescription>Escolha um documento condicional do catálogo para incluir no checklist deste cliente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Documento</Label>
            <Select value={padraoId} onValueChange={(v) => { setPadraoId(v); setInstId(''); }}>
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
              <Label className="text-xs">Aplicar a (opcional)</Label>
              <Select value={instId} onValueChange={setInstId}>
                <SelectTrigger><SelectValue placeholder="Instância específica…" /></SelectTrigger>
                <SelectContent>
                  {instOpts.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {sel?.nota && <p className="text-xs text-muted-foreground">{sel.nota}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={!sel}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Contador({ label, valor, tone }: { label: string; valor: number; tone: 'pend' | 'obrig' | 'ok' | 'neutro' }) {
  const toneCls = {
    pend: 'border-rose-200 bg-rose-50 text-rose-800',
    obrig: 'border-amber-200 bg-amber-50 text-amber-800',
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    neutro: 'border-slate-200 bg-background text-slate-700',
  }[tone];
  return (
    <div className={cn('rounded-xl border px-4 py-3', toneCls)}>
      <div className="text-2xl font-bold tabular-nums leading-none">{valor}</div>
      <div className="mt-1 text-xs font-medium opacity-80">{label}</div>
    </div>
  );
}

function StatusIcon({ estado }: { estado: StatusEfetivo }) {
  if (estado === 'recebido') return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-label="Recebido" />;
  if (estado === 'dispensado' || estado === 'nao_aplicavel') return <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-label="Dispensado" />;
  return <Circle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-label="Pendente" />;
}

function ObrigBadge({ obrigatorio }: { obrigatorio: boolean }) {
  return obrigatorio ? (
    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">Obrigatório</span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Condicional</span>
  );
}

export default Relatorios;
