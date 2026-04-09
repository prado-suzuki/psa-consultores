import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AlertCircle, Check, Info, Loader2, Pencil, Search, X } from 'lucide-react';
import { useConsultaSimplesNacional } from '@/hooks/useConsultaSimplesNacional';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import type { F100Item, RegF100, CampoAlteradoEfd } from '@/types/correcoesSped';

const formatCurrency = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const safeFixed = (v: number | null | undefined, d = 2) =>
  (v ?? 0).toFixed(d);

const SIMPLES_LABELS: Record<string, string> = { A: 'Ausente', O: 'Optante', N: 'Não Optante' };
const formatSimples = (code: string | null | undefined) => SIMPLES_LABELS[code ?? ''] ?? code ?? '—';

type EditableF100Field = 'VL_OPER' | 'CST_PIS' | 'ALIQ_PIS' | 'VL_PIS' | 'CST_COFINS' | 'ALIQ_COFINS' | 'VL_COFINS' | 'COD_CTA';
type F100Draft = Record<EditableF100Field, string>;

const editableFields: EditableF100Field[] = ['VL_OPER', 'CST_PIS', 'ALIQ_PIS', 'VL_PIS', 'CST_COFINS', 'ALIQ_COFINS', 'VL_COFINS', 'COD_CTA'];
const numericFields = new Set<EditableF100Field>(['VL_OPER', 'CST_PIS', 'ALIQ_PIS', 'VL_PIS', 'CST_COFINS', 'ALIQ_COFINS', 'VL_COFINS']);

function toDraft(item: F100Item): F100Draft {
  const f = item.F100;
  return {
    VL_OPER: f.VL_OPER != null ? Number(f.VL_OPER).toFixed(2).replace('.', ',') : '0,00',
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

function buildChangedFields(original: RegF100, next: Record<string, unknown>): CampoAlteradoEfd[] {
  const origRec = original as unknown as Record<string, unknown>;
  const fields = new Set([...Object.keys(origRec), ...Object.keys(next)]);
  return Array.from(fields).sort().flatMap((field) => {
    const from = origRec[field];
    const to = next[field];
    if (Object.is(from, to)) return [];
    return [{ campo: field, de: serializeValue(from), para: serializeValue(to) }];
  });
}

interface TabF100Props {
  data: F100Item[] | undefined;
  isLoading: boolean;
  error: Error | null;
  hasQueried: boolean;
  searchText: string;
  empresaCnpj: string | null;
  periodo: string | null;
  contribuinteId: string;
}

export default function TabF100({ data, isLoading, error, hasQueried, searchText, empresaCnpj, periodo, contribuinteId }: TabF100Props) {
  const { user } = useAuth();
  const { consultar: consultarSimples, isLoading: isConsultandoSimples } = useConsultaSimplesNacional({ id_contribuinte: contribuinteId, registro: 'F100' });
  const [page, setPage] = useState(0);
  const [editedRows, setEditedRows] = useState<Record<string, RegF100>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<F100Draft | null>(null);
  const deferredSearchText = useDeferredValue(searchText);

  useEffect(() => {
    if (!data) return;
    const validIds = new Set(data.map((item) => item.F100.uuid));
    setEditedRows((current) => {
      const nextEntries = Object.entries(current).filter(([id]) => validIds.has(id));
      if (nextEntries.length === Object.keys(current).length) return current;
      return Object.fromEntries(nextEntries);
    });
  }, [data]);

  const indexedItems = useMemo(() => {
    if (!data) return [] as Array<{ item: F100Item; searchKey: string }>;
    return data.map((item) => ({
      item,
      searchKey: `${item['0150'].NOME} ${item.CPF_CNPJ}`.toLowerCase(),
    }));
  }, [data]);

  const getDisplayedF100 = (item: F100Item) => editedRows[item.F100.uuid] ?? item.F100;
  const getOriginalSnapshot = (item: F100Item) => item._originalSnapshot ?? item.F100;

  const filtered = useMemo(() => {
    if (!deferredSearchText.trim()) {
      return indexedItems.map(({ item }) => item);
    }
    const searchTerm = deferredSearchText.trim().toLowerCase();
    return indexedItems
      .filter(({ searchKey }) => searchKey.includes(searchTerm))
      .map(({ item }) => item);
  }, [deferredSearchText, indexedItems]);

  useEffect(() => { setPage(0); }, [searchText]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleStartEdit = (item: F100Item) => {
    setEditingId(item.F100.uuid);
    setDraft(toDraft({ ...item, F100: getDisplayedF100(item) }));
  };
  const handleCancelEdit = () => { setEditingId(null); setDraft(null); };
  const handleDraftChange = (field: EditableF100Field, value: string) => { setDraft((c) => c ? { ...c, [field]: value } : c); };

  const handleSave = async (item: F100Item) => {
    if (!user || !draft || editingId !== item.F100.uuid) return;

    const originalSnapshot = getOriginalSnapshot(item);
    const displayedF100 = getDisplayedF100(item);
    const nextSnapshot: Record<string, unknown> = { ...displayedF100 };

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

    const camposAlterados = buildChangedFields(originalSnapshot, nextSnapshot);
    setSavingId(item.F100.uuid);

    try {
      const { data: correcaoAtiva, error: buscaError } = await supabase
        .from('efd_correcoes').select('id')
        .eq('registro_tipo', 'F100').eq('registro_original_id', item.F100.uuid).eq('ativo', true)
        .maybeSingle();
      if (buscaError) throw buscaError;

      if (camposAlterados.length === 0) {
        if (correcaoAtiva?.id) {
          const { error: e } = await supabase.from('efd_correcoes').update({ ativo: false, snapshot: nextSnapshot as unknown as Json, campos_alterados: null }).eq('id', correcaoAtiva.id);
          if (e) throw e;
          toast.success('Correção removida; a linha voltou ao valor original.');
        } else { toast.success('Nenhuma alteração para salvar.'); }
        setEditedRows((current) => {
          const next = { ...current };
          delete next[item.F100.uuid];
          return next;
        });
        handleCancelEdit(); return;
      }

      const payload = {
        contribuinte_id: item.ID_CONTRIBUINTE,
        arquivo_id: item.F100.ID_ARQUIVO,
        empresa_cnpj: empresaCnpj,
        periodo,
        arquivo_tipo: 'efd_contribuicoes',
        registro_tipo: 'F100',
        registro_original_id: item.F100.uuid,
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
        const { error: e } = await supabase.from('efd_correcoes').update({ ativo: false }).eq('registro_tipo', 'F100').eq('registro_original_id', item.F100.uuid).eq('ativo', true);
        if (e) throw e;
      }
      const { error: insertError } = await supabase.from('efd_correcoes').insert(payload);
      if (insertError) throw insertError;

      setEditedRows((current) => ({ ...current, [item.F100.uuid]: nextSnapshot as RegF100 }));
      handleCancelEdit();
      toast.success('Correção do F100 salva.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar correção.'); }
    finally { setSavingId(null); }
  };

  const renderEditableCell = (
    item: F100Item, field: EditableF100Field, className: string,
    options?: { isCurrency?: boolean; isPercentage?: boolean },
  ) => {
    const displayedF100 = getDisplayedF100(item);
    const originalSnapshot = getOriginalSnapshot(item);

    if (editingId !== item.F100.uuid || !draft) {
      const value = displayedF100[field as keyof RegF100];
      const origValue = (originalSnapshot as unknown as Record<string, unknown>)[field];
      const isChanged = !Object.is(value, origValue);
      const amberClass = isChanged ? 'text-amber-600 font-bold dark:text-amber-500' : '';

      if (field === 'VL_OPER' || field === 'VL_PIS' || field === 'VL_COFINS') return <span className={amberClass}>{formatCurrency(typeof value === 'number' ? value : Number(value ?? 0))}</span>;
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

  if (isLoading) return <Card><CardContent className="p-8 flex justify-center"><div className="animate-pulse text-sm text-muted-foreground">Carregando dados F100...</div></CardContent></Card>;
  if (error) return <Card className="border-destructive/50 bg-destructive/5"><CardContent className="p-4 flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error.message}</CardContent></Card>;
  if (!hasQueried || !data) return null;

  return (
    <Card className="shadow-md border-0 ring-1 ring-border/50 overflow-hidden">
      <CardContent className="p-0">
        <div className="px-4 py-2.5 border-b bg-muted/50 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'item' : 'itens'} encontrados</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={consultarSimples} disabled={isConsultandoSimples || !contribuinteId}>
              {isConsultandoSimples ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1" />}
              {isConsultandoSimples ? 'Consultando...' : 'Consultar Simples Nacional'}
            </Button>
            {filtered.length > 0 && <span className="text-[11px] text-muted-foreground">Clique no <Pencil className="inline h-3 w-3 align-[-1px]" /> para editar.</span>}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum item F100 encontrado para os filtros selecionados.</div>
        ) : (
          <>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-0">
                    <TableHead colSpan={6} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 bg-muted/40"><span className="flex items-center gap-1">Dados EFD<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">O Bloco F consolida receitas financeiras, aluguéis e demais operações não escrituradas nos Blocos A, C e D.</TooltipContent></Tooltip></span></TableHead>
                    <TableHead colSpan={7} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">Impostos</TableHead>
                    <TableHead colSpan={1} className="pb-0 pt-2 bg-background" />
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-[11px] min-w-[80px]">Data</TableHead>
                    <TableHead className="text-[11px] min-w-[180px]">Nome</TableHead>
                    <TableHead className="text-[11px] min-w-[120px]">CPF/CNPJ</TableHead>
                    <TableHead className="text-[11px] min-w-[60px]">Tipo</TableHead>
                    <TableHead className="text-[11px] min-w-[80px]">Simples</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px]">Valor</TableHead>
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
                    const displayedF100 = getDisplayedF100(item);
                    const linhaCorrigida = buildChangedFields(getOriginalSnapshot(item), displayedF100 as unknown as Record<string, unknown>).length > 0;
                    return (
                      <TableRow key={`f100-${item.F100.uuid}-${idx}`} className={editingId === item.F100.uuid ? 'bg-accent/30' : 'group'}>
                        <TableCell className="text-xs py-1.5 font-mono">{displayedF100.DT_OPER}</TableCell>
                        <TableCell className="text-xs py-1.5 max-w-[180px] truncate" title={item['0150'].NOME}>{item['0150'].NOME}</TableCell>
                        <TableCell className="text-xs py-1.5 font-mono">{item.CPF_CNPJ}</TableCell>
                        <TableCell className="py-1.5"><Badge variant="outline" className="text-[10px] font-medium">{item.TIPO_PESSOA}</Badge></TableCell>
                        <TableCell className="py-1.5"><Badge variant="outline" className="text-[10px] font-medium">{formatSimples(item.SIMPLES)}</Badge></TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums">{renderEditableCell(item, 'VL_OPER', 'h-8 text-xs text-right font-mono', { isCurrency: true })}</TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-mono border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'CST_PIS', 'h-8 text-xs text-center font-mono')}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'ALIQ_PIS', 'h-8 text-xs text-right font-mono', { isPercentage: true })}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'VL_PIS', 'h-8 text-xs text-right font-mono', { isCurrency: true })}</TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'CST_COFINS', 'h-8 text-xs text-center font-mono')}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'ALIQ_COFINS', 'h-8 text-xs text-right font-mono', { isPercentage: true })}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'VL_COFINS', 'h-8 text-xs text-right font-mono', { isCurrency: true })}</TableCell>
                        <TableCell className="text-xs py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">{renderEditableCell(item, 'COD_CTA', 'h-8 text-xs font-mono')}</TableCell>
                        <TableCell className="py-1.5 sticky right-0 bg-background z-10 w-[90px] min-w-[90px] max-w-[90px] border-l border-slate-200 dark:border-slate-700 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {editingId === item.F100.uuid ? (
                              <>
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSave(item)} disabled={savingId === item.F100.uuid}>{savingId === item.F100.uuid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-emerald-600" />}</Button>
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEdit} disabled={savingId === item.F100.uuid}><X className="h-4 w-4 text-muted-foreground" /></Button>
                              </>
                            ) : (
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEdit(item)} disabled={!!savingId}><Pencil className="h-4 w-4" /></Button>
                            )}
                            {linhaCorrigida && editingId !== item.F100.uuid && <Badge variant="outline" className="text-[10px]">Corrigido</Badge>}
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
