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
import type { F120Item, F120Reg, CampoAlteradoEfd } from '@/types/correcoesSped';

const formatCurrency = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const safeFixed = (v: number | null | undefined, d = 2) =>
  (v ?? 0).toFixed(d);

type EditableF120Field = 'VL_OPER_DEP' | 'CST_PIS' | 'ALIQ_PIS' | 'VL_PIS' | 'CST_COFINS' | 'ALIQ_COFINS' | 'VL_COFINS' | 'COD_CTA';
type F120Draft = Record<EditableF120Field, string>;

const editableFields: EditableF120Field[] = ['VL_OPER_DEP', 'CST_PIS', 'ALIQ_PIS', 'VL_PIS', 'CST_COFINS', 'ALIQ_COFINS', 'VL_COFINS', 'COD_CTA'];
const numericFields = new Set<EditableF120Field>(['VL_OPER_DEP', 'CST_PIS', 'ALIQ_PIS', 'VL_PIS', 'CST_COFINS', 'ALIQ_COFINS', 'VL_COFINS']);

function toDraft(item: F120Item): F120Draft {
  const f = item.F120;
  return {
    VL_OPER_DEP: f.VL_OPER_DEP != null ? Number(f.VL_OPER_DEP).toFixed(2).replace('.', ',') : '0,00',
    CST_PIS: f.CST_PIS != null ? String(f.CST_PIS) : '',
    ALIQ_PIS: f.ALIQ_PIS != null ? Number(f.ALIQ_PIS).toFixed(2).replace('.', ',') : '0,00',
    VL_PIS: f.VL_PIS != null ? Number(f.VL_PIS).toFixed(2).replace('.', ',') : '0,00',
    CST_COFINS: f.CST_COFINS != null ? String(f.CST_COFINS) : '',
    ALIQ_COFINS: f.ALIQ_COFINS != null ? Number(f.ALIQ_COFINS).toFixed(2).replace('.', ',') : '0,00',
    VL_COFINS: f.VL_COFINS != null ? Number(f.VL_COFINS).toFixed(2).replace('.', ',') : '0,00',
    COD_CTA: f.COD_CTA ?? '',
  };
}

function serializeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function buildChangedFields(original: F120Reg, next: Record<string, unknown>): CampoAlteradoEfd[] {
  const origRec = original as unknown as Record<string, unknown>;
  const fields = new Set([...Object.keys(origRec), ...Object.keys(next)]);
  return Array.from(fields).sort().flatMap((field) => {
    const from = origRec[field];
    const to = next[field];
    if (Object.is(from, to)) return [];
    return [{ campo: field, de: serializeValue(from), para: serializeValue(to) }];
  });
}

interface TabF120Props {
  data: F120Item[] | undefined;
  isLoading: boolean;
  error: Error | null;
  hasQueried: boolean;
  searchText: string;
  empresaCnpj: string | null;
  periodo: string | null;
}

export default function TabF120({ data, isLoading, error, hasQueried, searchText, empresaCnpj, periodo }: TabF120Props) {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<F120Item[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<F120Draft | null>(null);
  const locallyEditedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!data) return;
    if (editingId) return;
    if (locallyEditedIds.current.size === 0) { setRows(data); return; }
    setRows(data.map(d => {
      if (locallyEditedIds.current.has(d.F120.uuid)) {
        const local = rows.find(r => r.F120.uuid === d.F120.uuid);
        return local ?? d;
      }
      return d;
    }));
  }, [data]);

  const filtered = useMemo(() => {
    let items = rows;
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      items = items.filter((i) =>
        i.DESC_IDENT_BEM_IMOB?.toLowerCase().includes(s) ||
        i.DESC_IND_UTIL_BEM_IMOB?.toLowerCase().includes(s) ||
        i.F120.COD_CTA?.toLowerCase().includes(s)
      );
    }
    return items;
  }, [rows, searchText]);

  useEffect(() => { setPage(0); }, [searchText]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleStartEdit = (item: F120Item) => { setEditingId(item.F120.uuid); setDraft(toDraft(item)); };
  const handleCancelEdit = () => { setEditingId(null); setDraft(null); };
  const handleDraftChange = (field: EditableF120Field, value: string) => { setDraft((c) => c ? { ...c, [field]: value } : c); };

  const handleSave = async (item: F120Item) => {
    if (!user || !draft || editingId !== item.F120.uuid) return;
    const nextSnapshot: Record<string, unknown> = { ...item.F120 };

    for (const field of editableFields) {
      const raw = draft[field].trim();
      if (numericFields.has(field)) {
        if (!raw) { toast.error(`Preencha o campo ${field}.`); return; }
        const parsed = Number(raw.replace(',', '.'));
        if (Number.isNaN(parsed)) { toast.error(`Valor inválido para ${field}.`); return; }
        nextSnapshot[field] = parsed;
        continue;
      }
      nextSnapshot[field] = raw;
    }

    const camposAlterados = buildChangedFields(item._originalSnapshot, nextSnapshot);
    setSavingId(item.F120.uuid);

    try {
      const { data: correcaoAtiva, error: buscaError } = await supabase
        .from('efd_correcoes').select('id')
        .eq('registro_tipo', 'F120').eq('registro_original_id', item.F120.uuid).eq('ativo', true)
        .maybeSingle();
      if (buscaError) throw buscaError;

      if (camposAlterados.length === 0) {
        if (correcaoAtiva?.id) {
          const { error: e } = await supabase.from('efd_correcoes').update({ ativo: false, snapshot: nextSnapshot as unknown as Json, campos_alterados: null }).eq('id', correcaoAtiva.id);
          if (e) throw e;
          toast.success('Correção removida.');
        } else { toast.success('Nenhuma alteração para salvar.'); }
        setRows((c) => c.map((r) => r.F120.uuid === item.F120.uuid ? { ...r, F120: { ...item._originalSnapshot } } : r));
        handleCancelEdit(); return;
      }

      const payload = {
        contribuinte_id: item.ID_CONTRIBUINTE, arquivo_id: item.F120.ID_ARQUIVO,
        empresa_cnpj: empresaCnpj, periodo, arquivo_tipo: 'efd_contribuicoes',
        registro_tipo: 'F120', registro_original_id: item.F120.uuid,
        tipo_operacao: 'U', snapshot: nextSnapshot as unknown as Json,
        campos_alterados: camposAlterados as unknown as Json,
        motivo: 'Correção manual realizada na tela de revisão do SPED.',
        usuario_id: user.id, ativo: true, sync_status: 'P', sync_error: null, sync_sent_at: null,
      };

      if (correcaoAtiva?.id) {
        const { error: e } = await supabase.from('efd_correcoes').update({ ativo: false }).eq('registro_tipo', 'F120').eq('registro_original_id', item.F120.uuid).eq('ativo', true);
        if (e) throw e;
      }
      const { error: insertError } = await supabase.from('efd_correcoes').insert(payload);
      if (insertError) throw insertError;

      setRows((c) => c.map((r) => r.F120.uuid === item.F120.uuid ? { ...r, F120: { ...r.F120, ...nextSnapshot } as F120Reg } : r));
      locallyEditedIds.current.add(item.F120.uuid);
      handleCancelEdit();
      toast.success('Correção do F120 salva.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar correção.'); }
    finally { setSavingId(null); }
  };

  const renderEditableCell = (
    item: F120Item, field: EditableF120Field, className: string,
    options?: { isCurrency?: boolean; isPercentage?: boolean },
  ) => {
    if (editingId !== item.F120.uuid || !draft) {
      const value = item.F120[field as keyof F120Reg];
      const origValue = item._originalSnapshot ? (item._originalSnapshot as unknown as Record<string, unknown>)[field] : undefined;
      const isChanged = !Object.is(value, origValue);
      const amberClass = isChanged ? 'text-amber-600 font-bold dark:text-amber-500' : '';

      if (field === 'VL_OPER_DEP' || field === 'VL_PIS' || field === 'VL_COFINS') return <span className={amberClass}>{formatCurrency(typeof value === 'number' ? value : Number(value ?? 0))}</span>;
      if (field === 'ALIQ_PIS' || field === 'ALIQ_COFINS') return <span className={amberClass}>{safeFixed(typeof value === 'number' ? value : Number(value ?? 0))}</span>;
      return <span className={amberClass}>{value ?? '—'}</span>;
    }

    const input = (
      <Input type="text" value={draft[field]}
        onChange={(e) => { let val = e.target.value; if (options?.isPercentage) { const n = Number(val.replace(',', '.')); if (!isNaN(n) && n > 100) val = '100'; } handleDraftChange(field, val); }}
        className={`${className} bg-background border-primary/20 focus-visible:ring-primary/40 ${options?.isCurrency ? 'pl-7' : ''}`}
      />
    );

    if (options?.isCurrency) {
      return (<div className="relative flex items-center w-full"><span className="absolute left-2 text-xs font-medium text-muted-foreground pointer-events-none">R$</span>{input}</div>);
    }
    return input;
  };

  if (isLoading) return <Card><CardContent className="p-8 flex justify-center"><div className="animate-pulse text-sm text-muted-foreground">Carregando dados F120...</div></CardContent></Card>;
  if (error) return <Card className="border-destructive/50 bg-destructive/5"><CardContent className="p-4 flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error.message}</CardContent></Card>;
  if (!hasQueried || !data) return null;

  return (
    <Card className="shadow-md border-0 ring-1 ring-border/50 overflow-hidden">
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum item F120 encontrado para os filtros selecionados.</div>
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
                    <TableHead colSpan={4} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 bg-muted/40">
                      <span className="flex items-center gap-1">Dados do Bem<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Registro F120 — Bens do ativo imobilizado com depreciação/amortização geradores de crédito.</TooltipContent></Tooltip></span>
                    </TableHead>
                    <TableHead colSpan={7} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">Impostos</TableHead>
                    <TableHead colSpan={1} className="pb-0 pt-2 bg-background" />
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-[11px] min-w-[200px]">Bem Imobilizado</TableHead>
                    <TableHead className="text-[11px] min-w-[140px]">Utilização</TableHead>
                    <TableHead className="text-[11px] min-w-[80px]">Nat. Créd.</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[120px]">Depreciação</TableHead>
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
                    const linhaCorrigida = buildChangedFields(item._originalSnapshot, item.F120 as unknown as Record<string, unknown>).length > 0;
                    return (
                      <TableRow key={`f120-${item.F120.uuid}-${idx}`} className={editingId === item.F120.uuid ? 'bg-accent/30' : 'group'}>
                        <TableCell className="text-xs py-1.5 max-w-[200px] truncate" title={item.DESC_IDENT_BEM_IMOB}>{item.DESC_IDENT_BEM_IMOB}</TableCell>
                        <TableCell className="text-xs py-1.5 max-w-[140px] truncate" title={item.DESC_IND_UTIL_BEM_IMOB}>{item.DESC_IND_UTIL_BEM_IMOB}</TableCell>
                        <TableCell className="text-xs py-1.5 font-mono">{item.F120.NAT_BC_CRED}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums">{renderEditableCell(item, 'VL_OPER_DEP', 'h-8 text-xs text-right font-mono', { isCurrency: true })}</TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-mono border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'CST_PIS', 'h-8 text-xs text-center font-mono')}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'ALIQ_PIS', 'h-8 text-xs text-right font-mono', { isPercentage: true })}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'VL_PIS', 'h-8 text-xs text-right font-mono', { isCurrency: true })}</TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'CST_COFINS', 'h-8 text-xs text-center font-mono')}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'ALIQ_COFINS', 'h-8 text-xs text-right font-mono', { isPercentage: true })}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'VL_COFINS', 'h-8 text-xs text-right font-mono', { isCurrency: true })}</TableCell>
                        <TableCell className="text-xs py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'COD_CTA', 'h-8 text-xs font-mono')}</TableCell>
                        <TableCell className="py-1.5 sticky right-0 bg-background z-10 w-[90px] min-w-[90px] max-w-[90px] border-l border-slate-200 dark:border-slate-700 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {editingId === item.F120.uuid ? (
                              <>
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSave(item)} disabled={savingId === item.F120.uuid}>{savingId === item.F120.uuid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-emerald-600" />}</Button>
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEdit} disabled={savingId === item.F120.uuid}><X className="h-4 w-4 text-muted-foreground" /></Button>
                              </>
                            ) : (
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEdit(item)} disabled={!!savingId}><Pencil className="h-4 w-4" /></Button>
                            )}
                            {linhaCorrigida && editingId !== item.F120.uuid && <Badge variant="outline" className="text-[10px]">Corrigido</Badge>}
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
