import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AlertCircle, BookOpen, Check, FileSearch, Info, Loader2, Network, Search, X } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import { useRowSelection, applyBatchChange } from '@/components/equipe/dev/correcoes-sped/useRowSelection';
import type { C170Item, ItemEfd, CampoAlteradoEfd, FlatItemEfd } from '@/types/correcoesSped';
import { ColumnFilterDropdown } from '@/components/equipe/dev/pis-cofins/ColumnFilterDropdown';
import { useRegrasNCM } from '@/hooks/useRegrasNCM';
import { FloatingScrollbar } from '@/components/ui/floating-scrollbar';

type NcmFilter = 'all' | 'with' | 'without';

const FILTERABLE_KEYS: { key: string; label: string }[] = [
  { key: 'DESCR_DISPLAY', label: 'Descrição' },
  { key: 'COD_NCM', label: 'NCM (0200)' },
  { key: 'CST_PIS', label: 'CST PIS' },
  { key: 'ALIQ_PIS', label: '% PIS' },
  { key: 'CST_COFINS', label: 'CST COF' },
  { key: 'ALIQ_COFINS', label: '% COF' },
  { key: 'COD_CTA', label: 'Conta' },
];

const rowAccessor = (item: C170Item, key: string): string => {
  if (key === 'DESCR_DISPLAY') return item.DESCR_COMPL || item.DESCR_ITEM_0200 || '';
  const val = item[key as keyof C170Item];
  if (val === null || val === undefined) return '';
  return String(val);
};

type EditableC170Field =
  | 'DESCR_COMPL'
  | 'VL_ITEM'
  | 'COD_CTA'
  | 'CST_PIS'
  | 'ALIQ_PIS'
  | 'VL_PIS'
  | 'CST_COFINS'
  | 'ALIQ_COFINS'
  | 'VL_COFINS';

type C170Draft = Record<EditableC170Field, string>;

const formatCurrency = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const safeFixed = (v: number | null | undefined, d = 2) =>
  (v ?? 0).toFixed(d);

const getNcm = (item: C170Item): string | null => item.COD_NCM ?? null;

const editableFields: EditableC170Field[] = [
  'DESCR_COMPL',
  'VL_ITEM',
  'COD_CTA',
  'CST_PIS',
  'ALIQ_PIS',
  'VL_PIS',
  'CST_COFINS',
  'ALIQ_COFINS',
  'VL_COFINS',
];

const numericFields = new Set<EditableC170Field>([
  'VL_ITEM',
  'CST_PIS',
  'ALIQ_PIS',
  'VL_PIS',
  'CST_COFINS',
  'ALIQ_COFINS',
  'VL_COFINS',
]);
const inlineInputClass = 'h-auto min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-xs';

function toDraft(item: C170Item): C170Draft {
  return {
    DESCR_COMPL: item.DESCR_COMPL || item.DESCR_ITEM_0200 || '',
    VL_ITEM: item.VL_ITEM != null ? Number(item.VL_ITEM).toFixed(2).replace('.', ',') : '0,00',
    COD_CTA: item.COD_CTA ?? '',
    CST_PIS: item.CST_PIS != null ? String(item.CST_PIS) : '',
    ALIQ_PIS: item.ALIQ_PIS != null ? Number(item.ALIQ_PIS).toFixed(2).replace('.', ',') : '0,00',
    VL_PIS: item.VL_PIS != null ? Number(item.VL_PIS).toFixed(2).replace('.', ',') : '0,00',
    CST_COFINS: item.CST_COFINS != null ? String(item.CST_COFINS) : '',
    ALIQ_COFINS: item.ALIQ_COFINS != null ? Number(item.ALIQ_COFINS).toFixed(2).replace('.', ',') : '0,00',
    VL_COFINS: item.VL_COFINS != null ? Number(item.VL_COFINS).toFixed(2).replace('.', ',') : '0,00',
  };
}

function getSnapshotFromItem(item: C170Item): ItemEfd {
  const { chv_nfe, dt_doc, tipo_relacao, nfe_itens, DESCR_ITEM_0200, COD_NCM, TIPO_ITEM, ID_CONTRIBUINTE, _originalSnapshot, ...snapshot } = item;
  return snapshot as ItemEfd;
}

function serializeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function buildChangedFields(originalSnapshot: ItemEfd, nextSnapshot: ItemEfd): CampoAlteradoEfd[] {
  const fields = new Set([...Object.keys(originalSnapshot), ...Object.keys(nextSnapshot)]);

  return Array.from(fields)
    .sort()
    .flatMap((field) => {
      const fromValue = originalSnapshot[field as keyof ItemEfd];
      const toValue = nextSnapshot[field as keyof ItemEfd];

      if (Object.is(fromValue, toValue)) return [];

      return [{
        campo: field,
        de: serializeValue(fromValue),
        para: serializeValue(toValue),
      }];
    });
}

interface TabC170Props {
  data: C170Item[] | undefined;
  isLoading: boolean;
  error: Error | null;
  hasQueried: boolean;
  ncmFilter: NcmFilter;
  searchText: string;
  empresaCnpj: string | null;
  periodo: string | null;
  onSelectItem: (item: FlatItemEfd) => void;
  onSelectNcm: (ncm: string) => void;
}

export default function TabC170({
  data,
  isLoading,
  error,
  hasQueried,
  ncmFilter,
  searchText,
  empresaCnpj,
  periodo,
  onSelectItem,
  onSelectNcm,
}: TabC170Props) {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<C170Item[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, C170Draft>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});
  const [regraFilterId, setRegraFilterId] = useState<string | null>(null);
  const [regraPopoverOpen, setRegraPopoverOpen] = useState(false);
  const [regraSearch, setRegraSearch] = useState('');
  const { regras } = useRegrasNCM();
  const selection = useRowSelection();

  const handleSort = useCallback((key: string, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction });
  }, []);

  const handleFilter = useCallback((key: string, values: Set<string> | null) => {
    setColumnFilters((prev) => {
      if (values === null) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: values };
    });
  }, []);

  const locallyEditedIds = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data) return;
    if (isEditMode) return;

    if (locallyEditedIds.current.size === 0) {
      setRows(data);
      return;
    }

    setRows((currentRows) => data.map((d) => {
      if (locallyEditedIds.current.has(d.uuid)) {
        const local = currentRows.find((r) => r.uuid === d.uuid);
        return local ?? d;
      }
      return d;
    }));
  }, [data, isEditMode]);

  const regraFilteredNcms = useMemo(() => {
    if (!regraFilterId) return null;
    return new Set(regras.filter((r) => r.id === regraFilterId).map((r) => r.cod_ncm));
  }, [regraFilterId, regras]);

  const loadedNcms = useMemo(
    () => new Set(rows.map((r) => getNcm(r)).filter((n): n is string => !!n)),
    [rows]
  );

  const regrasDisponiveis = useMemo(
    () => regras.filter((r) => loadedNcms.has(r.cod_ncm)),
    [regras, loadedNcms]
  );

  const baseFiltered = useMemo(() => {
    let items = rows;
    if (ncmFilter === 'with') items = items.filter((i) => !!getNcm(i));
    if (ncmFilter === 'without') items = items.filter((i) => !getNcm(i));
    if (regraFilteredNcms) {
      items = items.filter((i) => {
        const ncm = getNcm(i);
        return ncm !== null && regraFilteredNcms.has(ncm);
      });
    }
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      items = items.filter(
        (i) =>
          (i.DESCR_COMPL ?? '').toLowerCase().includes(s) ||
          (i.DESCR_ITEM_0200 ?? '').toLowerCase().includes(s) ||
          i.chv_nfe.includes(s) ||
          (getNcm(i) && getNcm(i)!.includes(s))
      );
    }
    return items;
  }, [rows, ncmFilter, searchText, regraFilteredNcms]);

  const cascadingUniqueValues = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const { key } of FILTERABLE_KEYS) {
      let subset = baseFiltered;
      for (const [fk, allowed] of Object.entries(columnFilters)) {
        if (fk !== key) {
          subset = subset.filter((r) => allowed.has(rowAccessor(r, fk)));
        }
      }
      result[key] = [...new Set(subset.map((r) => rowAccessor(r, key)))];
    }
    return result;
  }, [baseFiltered, columnFilters]);

  const filtered = useMemo(() => {
    let items = baseFiltered;
    for (const [key, allowed] of Object.entries(columnFilters)) {
      if (allowed.size > 0) {
        items = items.filter((i) => allowed.has(rowAccessor(i, key)));
      }
    }
    if (sortConfig) {
      items = [...items].sort((a, b) => {
        const av = rowAccessor(a, sortConfig.key);
        const bv = rowAccessor(b, sortConfig.key);
        const cmp = av.localeCompare(bv, 'pt-BR', { numeric: true });
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }
    return items;
  }, [baseFiltered, columnFilters, sortConfig]);

  useEffect(() => {
    setPage(0);
  }, [ncmFilter, searchText, columnFilters, sortConfig, regraFilterId]);

  useEffect(() => {
    setColumnFilters({});
    setRegraFilterId(null);
    setRegraSearch('');
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

  const handleDraftChange = (id: string, field: EditableC170Field, value: string) => {
    setDrafts((current) => applyBatchChange(current, selection.selectedIds, id, field, value));
  };

  const buildNextSnapshot = (item: C170Item, draft: C170Draft) => {
    const nextSnapshot = { ...getSnapshotFromItem(item) };

    for (const field of editableFields) {
      const rawValue = draft[field].trim();

      if (numericFields.has(field)) {
        if (!rawValue) {
          toast.error(`Preencha o campo ${field}.`);
          return;
        }

        const parsedValue = Number(rawValue.replace(',', '.'));

        if (Number.isNaN(parsedValue)) {
          toast.error(`Valor invalido para o campo ${field}.`);
          return;
        }

        nextSnapshot[field] = parsedValue as never;
        continue;
      }

      if (field === 'DESCR_COMPL') {
        if (!item.DESCR_COMPL && rawValue === (item.DESCR_ITEM_0200 ?? '')) {
          nextSnapshot[field] = item.DESCR_COMPL as never;
        } else {
          nextSnapshot[field] = (rawValue || null) as never;
        }
        continue;
      }

      nextSnapshot[field] = rawValue as never;
    }

    return nextSnapshot;
  };

  const handleSaveAll = async () => {
    if (!user) {
      toast.error('Usuario nao autenticado para salvar a correcao.');
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

        if (buildChangedFields(getSnapshotFromItem(item), nextSnapshot).length === 0) continue;

        changedCount += 1;
        const camposAlterados = buildChangedFields(item._originalSnapshot, nextSnapshot);

        const { data: correcaoAtiva, error: buscaError } = await supabase
          .from('efd_correcoes')
          .select('id')
          .eq('registro_tipo', 'C170')
          .eq('registro_original_id', item.uuid)
          .eq('ativo', true)
          .maybeSingle();

        if (buscaError) throw buscaError;

        if (camposAlterados.length === 0) {
          if (correcaoAtiva?.id) {
            const { error: desativacaoError } = await supabase
              .from('efd_correcoes')
              .update({
                ativo: false,
                snapshot: nextSnapshot as unknown as Json,
                campos_alterados: null,
              })
              .eq('id', correcaoAtiva.id);

            if (desativacaoError) throw desativacaoError;
          }

          nextRows[index] = { ...item, ...item._originalSnapshot };
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
          registro_tipo: 'C170',
          registro_original_id: item.uuid,
          tipo_operacao: 'U',
          snapshot: nextSnapshot as unknown as Json,
          campos_alterados: camposAlterados as unknown as Json,
          motivo: 'Correcao manual realizada na tela de revisao do SPED.',
          usuario_id: user.id,
          ativo: true,
          sync_status: 'P',
          sync_error: null,
          sync_sent_at: null,
        };

        if (correcaoAtiva?.id) {
          const { error: desativacaoError } = await supabase
            .from('efd_correcoes')
            .update({ ativo: false })
            .eq('registro_tipo', 'C170')
            .eq('registro_original_id', item.uuid)
            .eq('ativo', true);

          if (desativacaoError) throw desativacaoError;
        }

        const { error: insertError } = await supabase
          .from('efd_correcoes')
          .insert(payload);

        if (insertError) throw insertError;

        nextRows[index] = { ...item, ...nextSnapshot };
        locallyEditedIds.current.add(item.uuid);
        savedCount += 1;
      }

      if (changedCount === 0) {
        toast.success('Nenhuma alteracao para salvar.');
        handleCancelEditMode();
        return;
      }

      setRows(nextRows);
      handleCancelEditMode();
      toast.success(savedCount === 1 ? '1 correcao do C170 salva.' : `${savedCount} correcoes do C170 salvas.`);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Erro inesperado ao salvar as correcoes.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditableCell = (
    item: C170Item,
    field: EditableC170Field,
    className: string,
    options?: { isCurrency?: boolean; isPercentage?: boolean },
  ) => {
    const draft = drafts[item.uuid];

    if (!isEditMode || !draft) {
      const value = item[field];
      const isChanged = item._originalSnapshot && !Object.is(item[field], item._originalSnapshot[field as keyof typeof item._originalSnapshot]);

      if (field === 'DESCR_COMPL') {
        return (
          <span className={`text-xs truncate block ${isChanged ? 'text-amber-600 font-bold dark:text-amber-500' : ''}`} title={item.DESCR_COMPL || item.DESCR_ITEM_0200 || undefined}>
            {item.DESCR_COMPL || item.DESCR_ITEM_0200 || '\u2014'}
          </span>
        );
      }

      const amberClass = isChanged ? 'text-amber-600 font-bold dark:text-amber-500' : '';

      if (field === 'VL_ITEM' || field === 'VL_PIS' || field === 'VL_COFINS') {
        return <span className={amberClass}>{formatCurrency(typeof value === 'number' ? value : Number(value ?? 0))}</span>;
      }

      if (field === 'ALIQ_PIS' || field === 'ALIQ_COFINS') {
        return <span className={amberClass}>{safeFixed(typeof value === 'number' ? value : Number(value ?? 0))}</span>;
      }

      return <span className={amberClass}>{value ?? '\u2014'}</span>;
    }

    const input = (
      <Input
        type="text"
        value={draft[field]}
        onChange={(event) => {
          let val = event.target.value;
          if (options?.isPercentage) {
            const num = Number(val.replace(',', '.'));
            if (!isNaN(num) && num > 100) val = '100';
          }
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
    return (
      <Card><CardContent className="p-8 flex justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Carregando dados C170...</div>
      </CardContent></Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-4 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error.message}
        </CardContent>
      </Card>
    );
  }

  if (!hasQueried || !data) return null;

  const totalNotas = new Set(filtered.map((i) => i.chv_nfe)).size;

  return (
    <Card className={`border-0 overflow-hidden ${isEditMode ? 'shadow-[0_0_30px_0px_hsl(var(--edit-shadow-color)/0.55)]' : 'shadow-md ring-1 ring-border/50'}`}>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum item encontrado para os filtros selecionados.
          </div>
        ) : (
          <>
            <div className="px-4 py-2.5 border-b bg-muted/50 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? 'item' : 'itens'} encontrados
                {' '}&middot; {totalNotas} notas
                {isEditMode && selection.selectedIds.size > 0 && ` · ${selection.selectedIds.size} selecionados`}
              </span>
              <div className="flex items-center gap-2">
                {isEditMode && (
                  <Button size="sm" variant="outline" onClick={handleCancelEditMode} disabled={isSaving}>
                    <X className="h-3.5 w-3.5 mr-1" />Cancelar
                  </Button>
                )}
                <Button size="sm" onClick={isEditMode ? handleSaveAll : handleEnableEditMode} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  {isSaving ? 'Salvando...' : isEditMode ? 'Salvar alterações' : 'Habilitar modo edição'}
                </Button>
              </div>
            </div>
            <div className="overflow-auto">
              <Table containerRef={scrollRef}>
                <TableHeader>
                  <TableRow className="border-b-0">
                    {isEditMode && <TableHead className="w-[40px] min-w-[40px] pb-0 pt-2 bg-muted/40" />}
                    <TableHead colSpan={3} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 bg-muted/40">Dados EFD</TableHead>
                    <TableHead colSpan={3} className="text-[10px] uppercase tracking-wider font-bold text-emerald-600/70 dark:text-emerald-400/70 pb-0 pt-2 border-l-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20"><span className="flex items-center gap-1">Dados XML<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Dados lidos diretamente do arquivo XML original para confronto com a escrituração (SPED).</TooltipContent></Tooltip></span></TableHead>
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
                    <TableHead className="text-[11px] min-w-[200px]"><span className="flex items-center gap-1">Descricao<ColumnFilterDropdown columnKey="DESCR_DISPLAY" uniqueValues={cascadingUniqueValues['DESCR_DISPLAY'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['DESCR_DISPLAY'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] min-w-[100px]">
                      <span className="flex items-center gap-1">NCM (0200)<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">NCM declarado na EFD. Como o Registro C170 não possui campo de NCM, este dado é trazido do Registro 0200 correspondente ao item.</TooltipContent></Tooltip><ColumnFilterDropdown columnKey="COD_NCM" uniqueValues={cascadingUniqueValues['COD_NCM'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['COD_NCM'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span>
                      <Popover open={regraPopoverOpen} onOpenChange={(o) => { setRegraPopoverOpen(o); if (o) setRegraSearch(''); }}>
                        <PopoverTrigger asChild>
                          <button
                            className={`mt-0.5 flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-normal transition-colors max-w-[96px] truncate ${regraFilterId ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                            onPointerDown={(e) => e.stopPropagation()}
                            title={regraFilterId ? (regras.find((r) => r.id === regraFilterId)?.desc_cst ?? 'Regra selecionada') : 'Filtrar por regra MAPA'}
                          >
                            <Search className="h-3 w-3 shrink-0" />
                            <span className="truncate">{regraFilterId ? (regras.find((r) => r.id === regraFilterId)?.cod_ncm ?? 'Regra') : 'Regra MAPA'}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" side="bottom" className="w-72 p-0" onPointerDown={(e) => e.stopPropagation()}>
                          <div className="border-b px-3 py-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Filtrar por Regra MAPA</p>
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                              <Input
                                autoFocus
                                placeholder="NCM ou descrição..."
                                value={regraSearch}
                                onChange={(e) => setRegraSearch(e.target.value)}
                                className="h-7 pl-7 text-xs"
                              />
                            </div>
                          </div>
                          <ScrollArea className="h-56">
                            <div className="p-1">
                              <button
                                className={`w-full text-left rounded px-2 py-1.5 text-xs transition-colors ${!regraFilterId ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                                onClick={() => { setRegraFilterId(null); setRegraPopoverOpen(false); }}
                              >
                                Todas as regras
                              </button>
                              {regrasDisponiveis
                                .filter((r) => {
                                  const q = regraSearch.toLowerCase();
                                  if (!q) return true;
                                  return r.cod_ncm.toLowerCase().includes(q) || (r.desc_cst ?? '').toLowerCase().includes(q);
                                })
                                .map((r) => (
                                  <button
                                    key={r.id}
                                    className={`w-full text-left rounded px-2 py-1.5 text-xs transition-colors flex items-baseline gap-2 ${regraFilterId === r.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                                    onClick={() => { setRegraFilterId(r.id); setRegraPopoverOpen(false); }}
                                  >
                                    <span className="font-mono shrink-0">{r.cod_ncm}</span>
                                    {r.desc_cst && <span className="truncate text-[10px] opacity-70">{r.desc_cst}</span>}
                                  </button>
                                ))}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px]">Valor</TableHead>
                    <TableHead className="text-[11px] min-w-[200px] border-l-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20"><span className="flex items-center gap-1">Descricao<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">{"Descrição do produto no XML (tag <xProd>). Exibe 'Consolidado' quando o sistema identifica que vários itens do XML foram agrupados em uma única linha no SPED."}</TooltipContent></Tooltip></span></TableHead>
                    <TableHead className="text-[11px] min-w-[100px] bg-emerald-50/60 dark:bg-emerald-950/20"><span className="flex items-center gap-1">NCM<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">{"NCM do produto no XML (tag <NCM>). Fica em vermelho quando não bate com o NCM declarado no Registro 0200 do SPED."}</TooltipContent></Tooltip></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px] bg-emerald-50/60 dark:bg-emerald-950/20"><span className="flex items-center gap-1 justify-end">Valor<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">{"Valor do produto no XML (tag <vProd>). Fica em laranja quando há diferença em relação ao valor bruto (VL_ITEM) declarado no SPED."}</TooltipContent></Tooltip></span></TableHead>
                    <TableHead className="text-[11px] text-center min-w-[60px] border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center justify-center gap-1">CST PIS<ColumnFilterDropdown columnKey="CST_PIS" uniqueValues={cascadingUniqueValues['CST_PIS'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['CST_PIS'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center justify-end gap-1">% PIS<ColumnFilterDropdown columnKey="ALIQ_PIS" uniqueValues={cascadingUniqueValues['ALIQ_PIS'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['ALIQ_PIS'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">VL PIS</TableHead>
                    <TableHead className="text-[11px] text-center min-w-[60px] bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center justify-center gap-1">CST COF<ColumnFilterDropdown columnKey="CST_COFINS" uniqueValues={cascadingUniqueValues['CST_COFINS'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['CST_COFINS'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center justify-end gap-1">% COF<ColumnFilterDropdown columnKey="ALIQ_COFINS" uniqueValues={cascadingUniqueValues['ALIQ_COFINS'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['ALIQ_COFINS'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">VL COF</TableHead>
                    <TableHead className="text-[11px] min-w-[150px] max-w-[150px] bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center gap-1">Conta<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Código da conta analítica contábil (Registro 0500) representativa da operação.</TooltipContent></Tooltip><ColumnFilterDropdown columnKey="COD_CTA" uniqueValues={cascadingUniqueValues['COD_CTA'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['COD_CTA'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                     <TableHead className="text-[11px] text-center w-[90px] min-w-[90px] max-w-[90px] sticky right-0 bg-background z-10 border-l border-slate-200 dark:border-slate-700 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((item, idx) => {
                    const xml = item.tipo_relacao === '1:1' && item.nfe_itens[0] ? item.nfe_itens[0] : null;
                    const efdNcm = getNcm(item);
                    const ncmDivergent = xml && efdNcm && efdNcm !== xml.ncm;
                    const valueDivergent = xml && Math.abs((item.VL_ITEM ?? 0) - xml.vProd) > 0.01;
                    const linhaCorrigida = buildChangedFields(item._originalSnapshot, getSnapshotFromItem(item)).length > 0;

                    return (
                      <TableRow key={`${item.chv_nfe}-${item.NUM_ITEM}-${idx}`} className={isEditMode ? (selection.selectedIds.has(item.uuid) ? 'bg-teal-100/60 dark:bg-teal-900/25' : 'bg-teal-50/30 dark:bg-teal-950/10') : 'group'}>
                        {isEditMode && (
                          <TableCell className="py-1.5 w-[40px] min-w-[40px] text-center">
                            <Checkbox checked={selection.selectedIds.has(item.uuid)} onCheckedChange={() => selection.toggle(item.uuid)} />
                          </TableCell>
                        )}
                        <TableCell className="text-xs py-1.5 max-w-[200px] truncate">
                          {renderEditableCell(item, 'DESCR_COMPL', 'h-8 text-xs')}
                        </TableCell>
                        <TableCell className="py-1.5">
                          {efdNcm ? (
                            <Badge
                              variant="outline"
                              className="cursor-pointer gap-1 font-mono text-[11px] hover:bg-teal-50 dark:hover:bg-teal-950/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800"
                              onClick={() => onSelectNcm(efdNcm)}
                            >
                              <BookOpen className="h-3 w-3 shrink-0" />
                              {efdNcm}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground/50 italic text-center block">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums">
                          {renderEditableCell(item, 'VL_ITEM', 'h-8 text-xs text-right font-mono', { isCurrency: true })}
                        </TableCell>
                        {/* XML zone */}
                        <TableCell className="py-1.5 border-l-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/5" title={xml?.xProd}>
                          {xml ? (
                            <Badge
                              variant="outline"
                              className="cursor-pointer gap-1 text-[11px] max-w-[190px] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                              onClick={() => onSelectItem(item)}
                            >
                              <FileSearch className="h-3 w-3 shrink-0" />
                              <span className="truncate">{xml.xProd}</span>
                            </Badge>
                          ) : item.tipo_relacao === 'CONSOLIDADO' ? (
                            <Badge
                              className="cursor-pointer gap-1 text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
                              onClick={() => onSelectItem(item)}
                            >
                              <Network className="h-3 w-3 shrink-0" />
                              Consolidado
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground/50 italic text-center block">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5 bg-emerald-50/20 dark:bg-emerald-950/5">
                          {xml ? (
                            ncmDivergent ? (
                              <Badge variant="destructive" className="font-mono text-[11px] gap-1">
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                {xml.ncm}
                              </Badge>
                            ) : (
                              <code className="text-xs font-mono text-muted-foreground">{xml.ncm}</code>
                            )
                          ) : <span className="text-xs text-muted-foreground/50 italic text-center block">&mdash;</span>}
                        </TableCell>
                        <TableCell className={`text-xs text-right py-1.5 font-mono tabular-nums bg-emerald-50/20 dark:bg-emerald-950/5 ${valueDivergent ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}`}>
                          {xml ? formatCurrency(xml.vProd) : <span className="text-xs text-muted-foreground/50 italic text-center block">&mdash;</span>}
                        </TableCell>
                        {/* Tax zone */}
                        <TableCell className="text-xs text-center py-1.5 font-mono border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'CST_PIS', 'h-8 text-xs text-center font-mono')}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'ALIQ_PIS', 'h-8 text-xs text-right font-mono', { isPercentage: true })}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'VL_PIS', 'h-8 text-xs text-right font-mono', { isCurrency: true })}
                        </TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'CST_COFINS', 'h-8 text-xs text-center font-mono')}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'ALIQ_COFINS', 'h-8 text-xs text-right font-mono', { isPercentage: true })}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'VL_COFINS', 'h-8 text-xs text-right font-mono', { isCurrency: true })}
                        </TableCell>
                        <TableCell className="text-xs py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10 min-w-[150px] max-w-[150px]">
                          {renderEditableCell(item, 'COD_CTA', 'h-8 text-xs font-mono')}
                        </TableCell>
                        {/* Actions — sticky right */}
                        <TableCell className="py-1.5 sticky right-0 bg-background z-10 w-[90px] min-w-[90px] max-w-[90px] border-l border-slate-200 dark:border-slate-700 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {linhaCorrigida && (
                              <Badge variant="outline" className="text-[10px]">Corrigido</Badge>
                            )}
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
