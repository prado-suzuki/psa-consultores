import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AlertCircle, Check, Info, Loader2, Pencil, X } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import type { D100Item, CampoAlteradoEfd } from '@/types/correcoesSped';

const formatCurrency = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const safeFixed = (v: number | null | undefined, d = 2) =>
  (v ?? 0).toFixed(d);

const SIMPLES_LABELS: Record<string, string> = {
  A: 'Ausente',
  O: 'Optante',
  N: 'Não Optante',
};
const formatSimples = (code: string | null | undefined) =>
  SIMPLES_LABELS[code ?? ''] ?? code ?? '—';

type EditableD100Field = 'CST_PIS' | 'ALIQ_PIS' | 'VL_PIS' | 'CST_COFINS' | 'ALIQ_COFINS' | 'VL_COFINS' | 'COD_CTA';
type D100Draft = Record<EditableD100Field, string>;

const editableFields: EditableD100Field[] = ['CST_PIS', 'ALIQ_PIS', 'VL_PIS', 'CST_COFINS', 'ALIQ_COFINS', 'VL_COFINS', 'COD_CTA'];
const numericFields = new Set<EditableD100Field>(['CST_PIS', 'ALIQ_PIS', 'VL_PIS', 'CST_COFINS', 'ALIQ_COFINS', 'VL_COFINS']);

function toDraft(item: D100Item): D100Draft {
  return {
    CST_PIS: item.CST_PIS != null ? String(item.CST_PIS) : '',
    ALIQ_PIS: item.ALIQ_PIS != null ? Number(item.ALIQ_PIS).toFixed(2).replace('.', ',') : '0,00',
    VL_PIS: item.VL_PIS != null ? Number(item.VL_PIS).toFixed(2).replace('.', ',') : '0,00',
    CST_COFINS: item.CST_COFINS != null ? String(item.CST_COFINS) : '',
    ALIQ_COFINS: item.ALIQ_COFINS != null ? Number(item.ALIQ_COFINS).toFixed(2).replace('.', ',') : '0,00',
    VL_COFINS: item.VL_COFINS != null ? Number(item.VL_COFINS).toFixed(2).replace('.', ',') : '0,00',
    COD_CTA: item.COD_CTA ?? '',
  };
}

function getSnapshotFromItem(item: D100Item): Record<string, unknown> {
  const { _originalSnapshot, ...rest } = item;
  return rest;
}

function serializeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function buildChangedFields(original: D100Item, next: Record<string, unknown>): CampoAlteradoEfd[] {
  const fields = new Set([...Object.keys(original), ...Object.keys(next)]);
  return Array.from(fields).sort().flatMap((field) => {
    if (field === '_originalSnapshot') return [];
    const fromValue = (original as Record<string, unknown>)[field];
    const toValue = next[field];
    if (Object.is(fromValue, toValue)) return [];
    return [{ campo: field, de: serializeValue(fromValue), para: serializeValue(toValue) }];
  });
}

interface TabD100Props {
  data: D100Item[] | undefined;
  isLoading: boolean;
  error: Error | null;
  hasQueried: boolean;
  searchText: string;
  empresaCnpj: string | null;
  periodo: string | null;
}

export default function TabD100({ data, isLoading, error, hasQueried, searchText, empresaCnpj, periodo }: TabD100Props) {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<D100Item[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<D100Draft | null>(null);
  const locallyEditedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!data) return;
    if (editingId) return;
    if (locallyEditedIds.current.size === 0) { setRows(data); return; }
    setRows(data.map(d => {
      if (locallyEditedIds.current.has(d.uuid)) {
        const local = rows.find(r => r.uuid === d.uuid);
        return local ?? d;
      }
      return d;
    }));
  }, [data]);

  const filtered = useMemo(() => {
    let items = rows;
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      items = items.filter(
        (i) => i.CHV_CTE.toLowerCase().includes(s) || i.CNPJ_EFD.includes(s)
      );
    }
    return items;
  }, [rows, searchText]);

  useEffect(() => { setPage(0); }, [searchText]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleStartEdit = (item: D100Item) => { setEditingId(item.uuid); setDraft(toDraft(item)); };
  const handleCancelEdit = () => { setEditingId(null); setDraft(null); };
  const handleDraftChange = (field: EditableD100Field, value: string) => {
    setDraft((c) => c ? { ...c, [field]: value } : c);
  };

  const handleSave = async (item: D100Item) => {
    if (!user || !draft || editingId !== item.uuid) return;

    const nextSnapshot = { ...getSnapshotFromItem(item) };

    for (const field of editableFields) {
      const rawValue = draft[field].trim();
      if (numericFields.has(field)) {
        if (!rawValue) { toast.error(`Preencha o campo ${field}.`); return; }
        const parsed = Number(rawValue.replace(',', '.'));
        if (Number.isNaN(parsed)) { toast.error(`Valor inválido para ${field}.`); return; }
        nextSnapshot[field] = parsed;
        continue;
      }
      nextSnapshot[field] = rawValue;
    }

    const camposAlterados = buildChangedFields(item._originalSnapshot, nextSnapshot);

    setSavingId(item.uuid);
    try {
      const { data: correcaoAtiva, error: buscaError } = await supabase
        .from('efd_correcoes').select('id')
        .eq('registro_tipo', 'D100').eq('registro_original_id', item.uuid).eq('ativo', true)
        .maybeSingle();
      if (buscaError) throw buscaError;

      if (camposAlterados.length === 0) {
        if (correcaoAtiva?.id) {
          const { error: e } = await supabase.from('efd_correcoes').update({ ativo: false, snapshot: nextSnapshot as unknown as Json, campos_alterados: null }).eq('id', correcaoAtiva.id);
          if (e) throw e;
          toast.success('Correção removida; a linha voltou ao valor original.');
        } else { toast.success('Nenhuma alteração para salvar.'); }
        setRows((c) => c.map((r) => r.uuid === item.uuid ? { ...r, ...(item._originalSnapshot as unknown as Partial<D100Item>) } : r));
        handleCancelEdit(); return;
      }

      const payload = {
        contribuinte_id: item.ID_CONTRIBUINTE,
        arquivo_id: item.ID_ARQUIVO,
        empresa_cnpj: empresaCnpj,
        periodo,
        arquivo_tipo: 'efd_contribuicoes',
        registro_tipo: 'D100',
        registro_original_id: item.uuid,
        tipo_operacao: 'U',
        snapshot: nextSnapshot as unknown as Json,
        campos_alterados: camposAlterados as unknown as Json,
        motivo: 'Correção manual realizada na tela de revisão do SPED.',
        usuario_id: user.id,
        ativo: true,
        sync_status: 'P',
        sync_error: null,
        sync_sent_at: null,
      };

      if (correcaoAtiva?.id) {
        const { error: e } = await supabase.from('efd_correcoes').update({ ativo: false }).eq('registro_tipo', 'D100').eq('registro_original_id', item.uuid).eq('ativo', true);
        if (e) throw e;
      }

      const { error: insertError } = await supabase.from('efd_correcoes').insert(payload);
      if (insertError) throw insertError;

      setRows((c) => c.map((r) => r.uuid === item.uuid ? { ...r, ...nextSnapshot } as D100Item : r));
      locallyEditedIds.current.add(item.uuid);
      handleCancelEdit();
      toast.success('Correção do D100 salva.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar correção.');
    } finally { setSavingId(null); }
  };

  const renderEditableCell = (
    item: D100Item, field: EditableD100Field, className: string,
    options?: { isCurrency?: boolean; isPercentage?: boolean },
  ) => {
    if (editingId !== item.uuid || !draft) {
      const value = item[field];
      const isChanged = item._originalSnapshot && !Object.is(item[field], (item._originalSnapshot as Record<string, unknown>)[field]);
      const amberClass = isChanged ? 'text-amber-600 font-bold dark:text-amber-500' : '';

      if (field === 'VL_PIS' || field === 'VL_COFINS') return <span className={amberClass}>{formatCurrency(typeof value === 'number' ? value : Number(value ?? 0))}</span>;
      if (field === 'ALIQ_PIS' || field === 'ALIQ_COFINS') return <span className={amberClass}>{safeFixed(typeof value === 'number' ? value : Number(value ?? 0))}</span>;
      return <span className={amberClass}>{value ?? '—'}</span>;
    }

    const input = (
      <Input
        type="text"
        value={draft[field]}
        onChange={(e) => {
          let val = e.target.value;
          if (options?.isPercentage) { const n = Number(val.replace(',', '.')); if (!isNaN(n) && n > 100) val = '100'; }
          handleDraftChange(field, val);
        }}
        className={`${className} bg-background border-primary/20 focus-visible:ring-primary/40 ${options?.isCurrency ? 'pl-7' : ''}`}
      />
    );

    if (options?.isCurrency) {
      return (
        <div className="relative flex items-center w-full">
          <span className="absolute left-2 text-xs font-medium text-muted-foreground pointer-events-none">R$</span>
          {input}
        </div>
      );
    }
    return input;
  };

  if (isLoading) {
    return (<Card><CardContent className="p-8 flex justify-center"><div className="animate-pulse text-sm text-muted-foreground">Carregando dados D100...</div></CardContent></Card>);
  }
  if (error) {
    return (<Card className="border-destructive/50 bg-destructive/5"><CardContent className="p-4 flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error.message}</CardContent></Card>);
  }
  if (!hasQueried || !data) return null;

  return (
    <Card className="shadow-md border-0 ring-1 ring-border/50 overflow-hidden">
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum item D100 encontrado para os filtros selecionados.</div>
        ) : (
          <>
            <div className="px-4 py-2.5 border-b bg-muted/50 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'item' : 'itens'} encontrados</span>
              <span className="text-[11px] text-muted-foreground">Clique no <Pencil className="inline h-3 w-3 align-[-1px]" /> para editar.</span>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-0">
                    <TableHead colSpan={5} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 bg-muted/40">Dados EFD</TableHead>
                    <TableHead colSpan={7} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">Impostos</TableHead>
                    <TableHead colSpan={1} className="pb-0 pt-2 bg-background" />
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-[11px] min-w-[80px]">Data</TableHead>
                    <TableHead className="text-[11px] min-w-[140px]">CHV CTe</TableHead>
                    <TableHead className="text-[11px] min-w-[130px]">CNPJ</TableHead>
                    <TableHead className="text-[11px] min-w-[70px]"><span className="flex items-center gap-1">Simples<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Indica se o participante da operação é optante pelo Simples Nacional.</TooltipContent></Tooltip></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px]"><span className="flex items-center gap-1 justify-end">Valor Doc<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Valor total do documento fiscal de transporte.</TooltipContent></Tooltip></span></TableHead>
                    <TableHead className="text-[11px] text-center min-w-[60px] border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">CST PIS</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20">% PIS</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">VL PIS</TableHead>
                    <TableHead className="text-[11px] text-center min-w-[60px] bg-slate-50/60 dark:bg-slate-800/20">CST COF</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20">% COF</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">VL COF</TableHead>
                    <TableHead className="text-[11px] min-w-[120px] bg-slate-50/60 dark:bg-slate-800/20">Conta</TableHead>
                    <TableHead className="text-[11px] text-center w-[90px] min-w-[90px] max-w-[90px] sticky right-0 bg-background z-10 border-l border-slate-200 dark:border-slate-700 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((item, idx) => {
                    const linhaCorrigida = buildChangedFields(item._originalSnapshot, getSnapshotFromItem(item)).length > 0;
                    return (
                      <TableRow key={`d100-${item.CHV_CTE}-${idx}`} className={editingId === item.uuid ? 'bg-accent/30' : 'group'}>
                        <TableCell className="text-xs py-1.5 font-mono">{item.DT_DOC}</TableCell>
                        <TableCell className="py-1.5"><code className="text-[10px] font-mono text-muted-foreground" title={item.CHV_CTE}>{item.CHV_CTE.slice(0, 12)}…</code></TableCell>
                        <TableCell className="text-xs py-1.5 font-mono">{item.CNPJ_EFD}</TableCell>
                        <TableCell className="py-1.5"><Badge variant="outline" className="text-[10px] font-medium">{formatSimples(item.SIMPLES)}</Badge></TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums">{formatCurrency(item.VL_DOC)}</TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-mono border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'CST_PIS', 'h-8 text-xs text-center font-mono')}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'ALIQ_PIS', 'h-8 text-xs text-right font-mono', { isPercentage: true })}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'VL_PIS', 'h-8 text-xs text-right font-mono', { isCurrency: true })}</TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'CST_COFINS', 'h-8 text-xs text-center font-mono')}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'ALIQ_COFINS', 'h-8 text-xs text-right font-mono', { isPercentage: true })}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'VL_COFINS', 'h-8 text-xs text-right font-mono', { isCurrency: true })}</TableCell>
                        <TableCell className="text-xs py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'COD_CTA', 'h-8 text-xs font-mono')}</TableCell>
                        <TableCell className="py-1.5 sticky right-0 bg-background z-10 w-[90px] min-w-[90px] max-w-[90px] border-l border-slate-200 dark:border-slate-700 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {editingId === item.uuid ? (
                              <>
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSave(item)} disabled={savingId === item.uuid}>
                                  {savingId === item.uuid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-emerald-600" />}
                                </Button>
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEdit} disabled={savingId === item.uuid}>
                                  <X className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </>
                            ) : (
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEdit(item)} disabled={!!savingId}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {linhaCorrigida && editingId !== item.uuid && <Badge variant="outline" className="text-[10px]">Corrigido</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="px-4 pb-3">
              <TablePagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
