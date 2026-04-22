import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CorrecoesActionButtons, { type CorrecoesActionsProps } from './CorrecoesActionButtons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AlertCircle, Check, Info, Loader2, Search, X } from 'lucide-react';
import { useConsultaSimplesNacional } from '@/hooks/useConsultaSimplesNacional';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import { useRowSelection, applyBatchChange } from '@/components/equipe/dev/correcoes-sped/useRowSelection';
import { ColumnFilterDropdown } from '@/components/equipe/dev/pis-cofins/ColumnFilterDropdown';
import { renderColumnLabel } from '@/components/equipe/dev/pis-cofins/ColumnTooltip';
import { SPED_TOOLTIPS } from '@/components/equipe/dev/correcoes-sped/tooltipHelpers';
import type { D100Item, CampoAlteradoEfd } from '@/types/correcoesSped';
import { FloatingScrollbar } from '@/components/ui/floating-scrollbar';

const D100_FILTERABLE_KEYS: { key: string; label: string }[] = [
  { key: 'DT_DOC', label: 'Data' },
  { key: 'CHV_CTE', label: 'CHV CTe' },
  { key: 'CNPJ_EFD', label: 'CNPJ' },
  { key: 'SIMPLES_LABEL', label: 'Simples' },
  { key: 'CST_PIS', label: 'CST PIS' },
  { key: 'ALIQ_PIS', label: '% PIS' },
  { key: 'CST_COFINS', label: 'CST COF' },
  { key: 'ALIQ_COFINS', label: '% COF' },
  { key: 'COD_CTA', label: 'Conta' },
];

const d100RowAccessor = (item: D100Item, key: string): string => {
  if (key === 'SIMPLES_LABEL') return SIMPLES_LABELS[item.SIMPLES ?? ''] ?? item.SIMPLES ?? '';
  const val = item[key as keyof D100Item];
  if (val === null || val === undefined) return '';
  return String(val);
};

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
const inlineInputClass = 'h-auto min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-xs';

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
  return rest as unknown as Record<string, unknown>;
}

function serializeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function buildChangedFields(original: D100Item, next: Record<string, unknown>): CampoAlteradoEfd[] {
  const origRec = original as unknown as Record<string, unknown>;
  const fields = new Set([...Object.keys(origRec), ...Object.keys(next)]);
  return Array.from(fields).sort().flatMap((field) => {
    if (field === '_originalSnapshot') return [];
    const fromValue = origRec[field];
    const toValue = next[field];
    if (Object.is(fromValue, toValue)) return [];
    return [{ campo: field, de: serializeValue(fromValue), para: serializeValue(toValue) }];
  });
}

interface TabD100Props extends CorrecoesActionsProps {
  data: D100Item[] | undefined;
  isLoading: boolean;
  error: Error | null;
  hasQueried: boolean;
  searchText: string;
  empresaCnpj: string | null;
  periodo: string | null;
  cod_cta?: string;
  dt_ini?: string;
  dt_fin?: string;
}

export default function TabD100({ data, isLoading, error, hasQueried, searchText, empresaCnpj, periodo, contribuinteId, cod_cta, dt_ini, dt_fin, onEnviar, onExportar, isSending, isExporting, pendingCount, idArquivos }: TabD100Props) {
  const { user } = useAuth();
  const { consultar: consultarSimples, isLoading: isConsultandoSimples } = useConsultaSimplesNacional({ id_contribuinte: contribuinteId, registro: 'D100', cod_cta, dt_ini, dt_fin });
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<D100Item[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, D100Draft>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});
  const selection = useRowSelection();
  const locallyEditedIds = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSort = useCallback((key: string, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction });
  }, []);

  const handleFilter = useCallback((key: string, values: Set<string> | null) => {
    setColumnFilters((prev) => {
      if (values === null) { const next = { ...prev }; delete next[key]; return next; }
      return { ...prev, [key]: values };
    });
  }, []);

  useEffect(() => {
    if (!data) return;
    if (isEditMode) return;
    if (locallyEditedIds.current.size === 0) { setRows(data); return; }
    setRows((currentRows) => data.map(d => {
      if (locallyEditedIds.current.has(d.uuid)) {
        const local = currentRows.find(r => r.uuid === d.uuid);
        return local ?? d;
      }
      return d;
    }));
  }, [data, isEditMode]);

  const baseFiltered = useMemo(() => {
    let items = rows;
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      items = items.filter(
        (i) => i.CHV_CTE.toLowerCase().includes(s) || i.CNPJ_EFD.includes(s)
      );
    }
    return items;
  }, [rows, searchText]);

  const cascadingUniqueValues = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const { key } of D100_FILTERABLE_KEYS) {
      let subset = baseFiltered;
      for (const [fk, allowed] of Object.entries(columnFilters)) {
        if (fk !== key) subset = subset.filter((r) => allowed.has(d100RowAccessor(r, fk)));
      }
      result[key] = [...new Set(subset.map((r) => d100RowAccessor(r, key)))];
    }
    return result;
  }, [baseFiltered, columnFilters]);

  const filtered = useMemo(() => {
    let items = baseFiltered;
    for (const [key, allowed] of Object.entries(columnFilters)) {
      if (allowed.size > 0) items = items.filter((i) => allowed.has(d100RowAccessor(i, key)));
    }
    if (sortConfig) {
      items = [...items].sort((a, b) => {
        const av = d100RowAccessor(a, sortConfig.key);
        const bv = d100RowAccessor(b, sortConfig.key);
        const cmp = av.localeCompare(bv, 'pt-BR', { numeric: true });
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }
    return items;
  }, [baseFiltered, columnFilters, sortConfig]);

  useEffect(() => { setPage(0); }, [searchText, columnFilters, sortConfig]);

  useEffect(() => {
    setColumnFilters({});
    setSortConfig(null);
  }, [empresaCnpj, periodo]);

  const filteredIds = useMemo(() => filtered.map((i) => i.uuid), [filtered]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleEnableEditMode = () => {
    setDrafts(Object.fromEntries(rows.map((row) => [row.uuid, toDraft(row)])));
    selection.clear();
    setIsEditMode(true);
  };

  const handleCancelEditMode = () => {
    setIsEditMode(false);
    setDrafts({});
    selection.clear();
  };

  const handleDraftChange = (id: string, field: EditableD100Field, value: string) => {
    setDrafts((current) => applyBatchChange(current, selection.selectedIds, id, field, value));
  };

  const buildNextSnapshot = (item: D100Item, draft: D100Draft) => {
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

    return nextSnapshot;
  };

  const handleSaveAll = async () => {
    if (!user) {
      toast.error('Usuário não autenticado para salvar a correção.');
      return;
    }

    setIsSaving(true);

    try {
      let changedCount = 0;
      let savedCount = 0;
      const nextRows = [...rows];

      for (const [index, item] of rows.entries()) {
        const draft = drafts[item.uuid];
        if (!draft) continue;

        const nextSnapshot = buildNextSnapshot(item, draft);
        if (!nextSnapshot) {
          setIsSaving(false);
          return;
        }

        if (buildChangedFields(item, nextSnapshot).length === 0) continue;

        changedCount += 1;

        const camposAlterados = buildChangedFields(item._originalSnapshot, nextSnapshot);

        const { data: correcaoAtiva, error: buscaError } = await supabase
          .from('efd_correcoes').select('id')
          .eq('registro_tipo', 'D100').eq('registro_original_id', item.uuid).eq('ativo', true)
          .maybeSingle();
        if (buscaError) throw buscaError;

        if (camposAlterados.length === 0) {
          if (correcaoAtiva?.id) {
            const { error: e } = await supabase.from('efd_correcoes').update({ ativo: false, snapshot: nextSnapshot as unknown as Json, campos_alterados: null }).eq('id', correcaoAtiva.id);
            if (e) throw e;
          }

          nextRows[index] = {
            ...item,
            ...(item._originalSnapshot as unknown as Partial<D100Item>),
          };
          locallyEditedIds.current.add(item.uuid);
          savedCount += 1;
          continue;
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

        nextRows[index] = { ...item, ...nextSnapshot } as D100Item;
        locallyEditedIds.current.add(item.uuid);
        savedCount += 1;
      }

      if (changedCount === 0) {
        toast.success('Nenhuma alteração para salvar.');
        handleCancelEditMode();
        return;
      }

      setRows(nextRows);
      handleCancelEditMode();
      toast.success(savedCount === 1 ? '1 correção do D100 salva.' : `${savedCount} correções do D100 salvas.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar correções.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditableCell = (
    item: D100Item, field: EditableD100Field, className: string,
    options?: { isCurrency?: boolean; isPercentage?: boolean },
  ) => {
    const draft = drafts[item.uuid];

    if (!isEditMode || !draft) {
      const value = item[field];
      const isChanged = item._originalSnapshot && !Object.is(item[field], (item._originalSnapshot as unknown as Record<string, unknown>)[field]);
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
          handleDraftChange(item.uuid, field, val);
        }}
        className={`${inlineInputClass} ${className} ${options?.isCurrency ? 'pl-4' : ''}`}
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
    <Card className={`border-0 overflow-hidden ${isEditMode ? 'shadow-[0_0_30px_0px_hsl(var(--edit-shadow-color)/0.55)]' : 'shadow-md ring-1 ring-border/50'}`}>
      <CardContent className="p-0">
        <div className="px-4 py-2.5 border-b bg-muted/50 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'item' : 'itens'} encontrados{isEditMode && selection.selectedIds.size > 0 && ` · ${selection.selectedIds.size} selecionados`}</span>
          <div className="flex items-center gap-2">
            <CorrecoesActionButtons
              registroTipo="D100"
              contribuinteId={contribuinteId}
              onEnviar={onEnviar}
              onExportar={onExportar}
              isSending={isSending}
              isExporting={isExporting}
              canExport={idArquivos.length > 0}
              pendingCount={pendingCount}
            />
            <Button size="sm" variant="outline" onClick={consultarSimples} disabled={isConsultandoSimples || !contribuinteId}>
              {isConsultandoSimples ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1" />}
              {isConsultandoSimples ? 'Consultando...' : 'Consultar Simples Nacional'}
            </Button>
            {filtered.length > 0 && (
              <>
                {isEditMode && (
                  <Button size="sm" variant="outline" onClick={handleCancelEditMode} disabled={isSaving}>
                    <X className="h-3.5 w-3.5 mr-1" />Cancelar
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={isEditMode ? handleSaveAll : handleEnableEditMode} disabled={isSaving} className="bg-white text-black border border-input hover:bg-emerald-600 hover:text-white hover:border-emerald-600 active:bg-emerald-700 active:text-white transition-colors duration-200 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black disabled:hover:border-input shrink-0">
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  {isSaving ? 'Salvando...' : isEditMode ? 'Salvar alterações' : 'Habilitar modo edição'}
                </Button>
              </>
            )}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum item D100 encontrado para os filtros selecionados.</div>
        ) : (
          <>
            <div className="overflow-auto">
              <Table containerRef={scrollRef}>
                <TableHeader>
                  <TableRow className="border-b-0">
                    {isEditMode && <TableHead className="w-[40px] min-w-[40px] pb-0 pt-2 bg-muted/40" />}
                    <TableHead colSpan={5} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 bg-muted/40">Dados EFD</TableHead>
                    <TableHead colSpan={7} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">Impostos</TableHead>
                     <TableHead colSpan={1} className="pb-0 pt-2 bg-background" />
                  </TableRow>
                  <TableRow>
                    {isEditMode && (
                      <TableHead className="w-[40px] min-w-[40px] text-center">
                        <Checkbox
                          checked={filteredIds.length > 0 && filteredIds.every((id) => selection.selectedIds.has(id)) ? true : filteredIds.some((id) => selection.selectedIds.has(id)) ? 'indeterminate' : false}
                          onCheckedChange={() => selection.toggleAll(filteredIds)}
                        />
                      </TableHead>
                    )}
                    <TableHead className="text-[11px] min-w-[80px]"><span className="flex items-center gap-1">Data<ColumnFilterDropdown columnKey="DT_DOC" uniqueValues={cascadingUniqueValues['DT_DOC'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['DT_DOC'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] min-w-[140px]"><span className="flex items-center gap-1">CHV CTe<ColumnFilterDropdown columnKey="CHV_CTE" uniqueValues={cascadingUniqueValues['CHV_CTE'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['CHV_CTE'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] min-w-[130px]"><span className="flex items-center gap-1">CNPJ<ColumnFilterDropdown columnKey="CNPJ_EFD" uniqueValues={cascadingUniqueValues['CNPJ_EFD'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['CNPJ_EFD'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] min-w-[70px]"><span className="flex items-center gap-1">Simples<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Indica se o participante da operação é optante pelo Simples Nacional.</TooltipContent></Tooltip><ColumnFilterDropdown columnKey="SIMPLES_LABEL" uniqueValues={cascadingUniqueValues['SIMPLES_LABEL'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['SIMPLES_LABEL'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px]"><span className="flex items-center gap-1 justify-end">Valor Doc<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Valor total do documento fiscal de transporte.</TooltipContent></Tooltip></span></TableHead>
                    <TableHead className="text-[11px] text-center min-w-[60px] border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center justify-center gap-1">CST PIS<ColumnFilterDropdown columnKey="CST_PIS" uniqueValues={cascadingUniqueValues['CST_PIS'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['CST_PIS'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center justify-end gap-1">% PIS<ColumnFilterDropdown columnKey="ALIQ_PIS" uniqueValues={cascadingUniqueValues['ALIQ_PIS'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['ALIQ_PIS'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">VL PIS</TableHead>
                    <TableHead className="text-[11px] text-center min-w-[60px] bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center justify-center gap-1">CST COF<ColumnFilterDropdown columnKey="CST_COFINS" uniqueValues={cascadingUniqueValues['CST_COFINS'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['CST_COFINS'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center justify-end gap-1">% COF<ColumnFilterDropdown columnKey="ALIQ_COFINS" uniqueValues={cascadingUniqueValues['ALIQ_COFINS'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['ALIQ_COFINS'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">VL COF</TableHead>
                    <TableHead className="text-[11px] min-w-[120px] bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center gap-1">Conta<ColumnFilterDropdown columnKey="COD_CTA" uniqueValues={cascadingUniqueValues['COD_CTA'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['COD_CTA'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                     <TableHead className="text-[11px] text-center w-[90px] min-w-[90px] max-w-[90px] sticky right-0 bg-background z-10 border-l border-slate-200 dark:border-slate-700 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((item, idx) => {
                    const linhaCorrigida = buildChangedFields(item._originalSnapshot, getSnapshotFromItem(item)).length > 0;
                    return (
                      <TableRow key={`d100-${item.CHV_CTE}-${idx}`} className={isEditMode ? (selection.selectedIds.has(item.uuid) ? 'bg-teal-100/60 dark:bg-teal-900/25' : 'bg-teal-50/30 dark:bg-teal-950/10') : 'group'}>
                        {isEditMode && (
                          <TableCell className="py-1.5 w-[40px] min-w-[40px] text-center">
                            <Checkbox checked={selection.selectedIds.has(item.uuid)} onCheckedChange={() => selection.toggle(item.uuid)} />
                          </TableCell>
                        )}
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
                            {linhaCorrigida && <Badge variant="outline" className="text-[10px]">Corrigido</Badge>}
                            {isEditMode && <span className="text-[10px] text-teal-700 dark:text-teal-400">Editável</span>}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <FloatingScrollbar targetRef={scrollRef} />
            <div className="px-4 pb-3">
              <TablePagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
