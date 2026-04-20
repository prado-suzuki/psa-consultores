import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { AlertCircle, Check, Info, Loader2, X } from 'lucide-react';
import { FloatingScrollbar } from '@/components/ui/floating-scrollbar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import { useRowSelection, applyBatchChange } from '@/components/equipe/dev/correcoes-sped/useRowSelection';
import { ColumnFilterDropdown } from '@/components/equipe/dev/pis-cofins/ColumnFilterDropdown';
import type { A170Item, A170Snapshot, CampoAlteradoEfd } from '@/types/correcoesSped';

const A170_FILTERABLE_KEYS: { key: string; label: string }[] = [
  { key: 'NOME_0150', label: 'Prestador' },
  { key: 'CPF_CNPJ_0150', label: 'CPF/CNPJ' },
  { key: 'DESCR_DISPLAY', label: 'Descrição' },
  { key: 'COD_CTA', label: 'Conta' },
  { key: 'CST_PIS', label: 'CST PIS' },
  { key: 'ALIQ_PIS', label: '% PIS' },
  { key: 'CST_COFINS', label: 'CST COF' },
  { key: 'ALIQ_COFINS', label: '% COF' },
];

const a170RowAccessor = (item: A170Item, key: string): string => {
  if (key === 'DESCR_DISPLAY') return item.DESCR_COMPL || item.DESCR_ITEM_0200 || '';
  const val = item[key as keyof A170Item];
  if (val === null || val === undefined) return '';
  return String(val);
};

type NcmFilter = 'all' | 'with' | 'without';

type EditableA170Field =
  | 'CHV_NFSE'
  | 'DESCR_COMPL'
  | 'VL_ITEM'
  | 'COD_CTA'
  | 'CST_PIS'
  | 'VL_BC_PIS'
  | 'ALIQ_PIS'
  | 'VL_PIS'
  | 'CST_COFINS'
  | 'VL_BC_COFINS'
  | 'ALIQ_COFINS'
  | 'VL_COFINS';

type A170Draft = Record<EditableA170Field, string>;

const formatCurrency = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const safeFixed = (v: number | null | undefined, d = 2) =>
  (v ?? 0).toFixed(d);

const editableFields: EditableA170Field[] = [
  'CHV_NFSE',
  'DESCR_COMPL',
  'VL_ITEM',
  'COD_CTA',
  'CST_PIS',
  'VL_BC_PIS',
  'ALIQ_PIS',
  'VL_PIS',
  'CST_COFINS',
  'VL_BC_COFINS',
  'ALIQ_COFINS',
  'VL_COFINS',
];

const numericFields = new Set<EditableA170Field>([
  'VL_ITEM',
  'CST_PIS',
  'VL_BC_PIS',
  'ALIQ_PIS',
  'VL_PIS',
  'CST_COFINS',
  'VL_BC_COFINS',
  'ALIQ_COFINS',
  'VL_COFINS',
]);

const nullableTextFields = new Set<EditableA170Field>(['CHV_NFSE']);
const inlineInputClass = 'h-auto min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-xs';

function toDraft(item: A170Item): A170Draft {
  return {
    CHV_NFSE: item.CHV_NFSE ?? '',
    DESCR_COMPL: item.DESCR_COMPL || item.DESCR_ITEM_0200 || '',
    VL_ITEM: item.VL_ITEM != null ? Number(item.VL_ITEM).toFixed(2).replace('.', ',') : '0,00',
    COD_CTA: item.COD_CTA ?? '',
    CST_PIS: item.CST_PIS != null ? String(item.CST_PIS) : '',
    VL_BC_PIS: item.VL_BC_PIS != null ? Number(item.VL_BC_PIS).toFixed(2).replace('.', ',') : '0,00',
    ALIQ_PIS: item.ALIQ_PIS != null ? Number(item.ALIQ_PIS).toFixed(2).replace('.', ',') : '0,00',
    VL_PIS: item.VL_PIS != null ? Number(item.VL_PIS).toFixed(2).replace('.', ',') : '0,00',
    CST_COFINS: item.CST_COFINS != null ? String(item.CST_COFINS) : '',
    VL_BC_COFINS: item.VL_BC_COFINS != null ? Number(item.VL_BC_COFINS).toFixed(2).replace('.', ',') : '0,00',
    ALIQ_COFINS: item.ALIQ_COFINS != null ? Number(item.ALIQ_COFINS).toFixed(2).replace('.', ',') : '0,00',
    VL_COFINS: item.VL_COFINS != null ? Number(item.VL_COFINS).toFixed(2).replace('.', ',') : '0,00',
  };
}

function getSnapshotFromItem(item: A170Item): A170Snapshot {
  const { DESCR_ITEM_0200, COD_NCM, TIPO_ITEM, NOME_0150, CPF_CNPJ_0150, VL_PIS_RET, VL_COFINS_RET, _originalSnapshot, ...snapshot } = item;
  return snapshot;
}

function serializeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function buildChangedFields(originalSnapshot: A170Snapshot, nextSnapshot: A170Snapshot): CampoAlteradoEfd[] {
  const fields = new Set([...Object.keys(originalSnapshot), ...Object.keys(nextSnapshot)]);

  return Array.from(fields)
    .sort()
    .flatMap((field) => {
      const fromValue = originalSnapshot[field as keyof A170Snapshot];
      const toValue = nextSnapshot[field as keyof A170Snapshot];

      if (Object.is(fromValue, toValue)) return [];

      return [{
        campo: field,
        de: serializeValue(fromValue),
        para: serializeValue(toValue),
      }];
    });
}

interface TabA170Props extends CorrecoesActionsProps {
  data: A170Item[] | undefined;
  isLoading: boolean;
  error: Error | null;
  hasQueried: boolean;
  ncmFilter: NcmFilter;
  searchText: string;
  empresaCnpj: string | null;
  periodo: string | null;
  onSelectNcm: (ncm: string) => void;
}

export default function TabA170({
  data,
  isLoading,
  error,
  hasQueried,
  ncmFilter,
  searchText,
  empresaCnpj,
  periodo,
  onSelectNcm,
  contribuinteId,
  onEnviar,
  onExportar,
  isSending,
  isExporting,
  pendingCount,
  idArquivos,
}: TabA170Props) {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<A170Item[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, A170Draft>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});
  const selection = useRowSelection();

  const scrollRef = useRef<HTMLDivElement>(null);
  const locallyEditedIds = useRef<Set<string>>(new Set());

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

  const baseFiltered = useMemo(() => {
    let items = rows;
    if (ncmFilter === 'with') items = items.filter((i) => !!i.COD_NCM);
    if (ncmFilter === 'without') items = items.filter((i) => !i.COD_NCM);
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      items = items.filter(
        (i) =>
          (i.DESCR_COMPL ?? '').toLowerCase().includes(s) ||
          (i.DESCR_ITEM_0200 ?? '').toLowerCase().includes(s) ||
          (i.CHV_NFSE ?? '').toLowerCase().includes(s) ||
          (i.COD_CTA ?? '').toLowerCase().includes(s) ||
          (i.COD_NCM ?? '').includes(s) ||
          (i.NOME_0150 ?? '').toLowerCase().includes(s) ||
          (i.CPF_CNPJ_0150 ?? '').toLowerCase().includes(s)
      );
    }
    return items;
  }, [rows, ncmFilter, searchText]);

  const cascadingUniqueValues = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const { key } of A170_FILTERABLE_KEYS) {
      let subset = baseFiltered;
      for (const [fk, allowed] of Object.entries(columnFilters)) {
        if (fk !== key) subset = subset.filter((r) => allowed.has(a170RowAccessor(r, fk)));
      }
      result[key] = [...new Set(subset.map((r) => a170RowAccessor(r, key)))];
    }
    return result;
  }, [baseFiltered, columnFilters]);

  const filtered = useMemo(() => {
    let items = baseFiltered;
    for (const [key, allowed] of Object.entries(columnFilters)) {
      if (allowed.size > 0) items = items.filter((i) => allowed.has(a170RowAccessor(i, key)));
    }
    if (sortConfig) {
      items = [...items].sort((a, b) => {
        const av = a170RowAccessor(a, sortConfig.key);
        const bv = a170RowAccessor(b, sortConfig.key);
        const cmp = av.localeCompare(bv, 'pt-BR', { numeric: true });
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }
    return items;
  }, [baseFiltered, columnFilters, sortConfig]);

  useEffect(() => {
    setPage(0);
  }, [ncmFilter, searchText, columnFilters, sortConfig]);

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

  const handleDraftChange = (id: string, field: EditableA170Field, value: string) => {
    setDrafts((current) => applyBatchChange(current, selection.selectedIds, id, field, value));
  };

  const buildNextSnapshot = (item: A170Item, draft: A170Draft) => {
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
          toast.error(`Valor inválido para o campo ${field}.`);
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

      if (nullableTextFields.has(field)) {
        nextSnapshot[field] = (rawValue || null) as never;
        continue;
      }

      nextSnapshot[field] = rawValue as never;
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

        if (buildChangedFields(getSnapshotFromItem(item), nextSnapshot).length === 0) continue;

        changedCount += 1;
        const camposAlterados = buildChangedFields(item._originalSnapshot, nextSnapshot);

        const { data: correcaoAtiva, error: buscaError } = await supabase
          .from('efd_correcoes')
          .select('id')
          .eq('registro_tipo', 'A170')
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
                snapshot: nextSnapshot as Json,
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

        if (!item.ID_CONTRIBUINTE) {
          toast.error('Nao foi possivel identificar o contribuinte desta linha A170.');
          setIsSaving(false);
          return;
        }

        const payload = {
          contribuinte_id: item.ID_CONTRIBUINTE,
          arquivo_id: item.ID_ARQUIVO,
          empresa_cnpj: empresaCnpj,
          periodo,
          arquivo_tipo: 'efd_contribuicoes',
          registro_tipo: 'A170',
          registro_original_id: item.uuid,
          tipo_operacao: 'U',
          snapshot: nextSnapshot as Json,
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
            .eq('registro_tipo', 'A170')
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
        toast.success('Nenhuma alteração para salvar.');
        handleCancelEditMode();
        return;
      }

      setRows(nextRows);
      handleCancelEditMode();
      toast.success(savedCount === 1 ? '1 correção do A170 salva.' : `${savedCount} correções do A170 salvas.`);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Erro inesperado ao salvar as correções.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditableCell = (
    item: A170Item,
    field: EditableA170Field,
    className: string,
  ) => {
    const draft = drafts[item.uuid];

    if (!isEditMode || !draft) {
      const value = item[field];
      const isChanged = item._originalSnapshot && !Object.is(item[field], item._originalSnapshot[field as keyof typeof item._originalSnapshot]);

      if (field === 'CHV_NFSE') {
        return value ? (
          <code className={`text-[10px] font-mono text-muted-foreground ${isChanged ? 'text-amber-600 font-bold dark:text-amber-500' : ''}`} title={String(value)}>
            {String(value).slice(0, 12)}…
          </code>
        ) : (
          <span className="text-xs text-muted-foreground/50 italic text-center block">—</span>
        );
      }

      if (field === 'DESCR_COMPL') {
        return (
          <div className="space-y-0.5" title={item.DESCR_COMPL || item.DESCR_ITEM_0200 || undefined}>
            <div className={`text-xs truncate ${isChanged ? 'text-amber-600 font-bold dark:text-amber-500' : ''}`}>{item.DESCR_COMPL || item.DESCR_ITEM_0200 || '—'}</div>
            {item.DESCR_ITEM_0200 && item.DESCR_ITEM_0200 !== item.DESCR_COMPL && (
              <div className="text-[10px] text-muted-foreground truncate">0200: {item.DESCR_ITEM_0200}</div>
            )}
          </div>
        );
      }

      const amberClass = isChanged ? 'text-amber-600 font-bold dark:text-amber-500' : '';

      if (field === 'VL_ITEM' || field === 'VL_BC_PIS' || field === 'VL_PIS' || field === 'VL_BC_COFINS' || field === 'VL_COFINS') {
        return <span className={amberClass}>{formatCurrency(typeof value === 'number' ? value : Number(value ?? 0))}</span>;
      }

      if (field === 'ALIQ_PIS' || field === 'ALIQ_COFINS') {
        return <span className={amberClass}>{safeFixed(typeof value === 'number' ? value : Number(value ?? 0))}</span>;
      }

      return <span className={amberClass}>{value ?? '—'}</span>;
    }

    return (
      <Input
        type="text"
        value={draft[field]}
        onChange={(event) => handleDraftChange(item.uuid, field, event.target.value)}
        className={`${inlineInputClass} ${className}`}
      />
    );
  };

  if (isLoading) {
    return (
      <Card><CardContent className="p-8 flex justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Carregando dados A170...</div>
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

  return (
    <Card className={`border-0 overflow-hidden ${isEditMode ? 'shadow-[0_0_30px_0px_hsl(var(--edit-shadow-color)/0.55)]' : 'shadow-md ring-1 ring-border/50'}`}>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum item A170 encontrado para os filtros selecionados.
          </div>
        ) : (
          <>
            <div className="px-4 py-2.5 border-b bg-muted/50 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? 'item' : 'itens'} encontrados
                {isEditMode && selection.selectedIds.size > 0 && ` · ${selection.selectedIds.size} selecionados`}
              </span>
              <div className="flex items-center gap-2">
                <CorrecoesActionButtons
                  registroTipo="A170"
                  contribuinteId={contribuinteId}
                  onEnviar={onEnviar}
                  onExportar={onExportar}
                  isSending={isSending}
                  isExporting={isExporting}
                  canExport={idArquivos.length > 0}
                  pendingCount={pendingCount}
                />
                <Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">As correções feitas aqui são salvas no banco de dados. O registro original é preservado intacto.</TooltipContent></Tooltip>
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
            <div ref={scrollRef} className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-0">
                    {isEditMode && <TableHead className="w-[40px] min-w-[40px] pb-0 pt-2 bg-muted/40" />}
                    <TableHead colSpan={5} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 bg-muted/40">Dados EFD</TableHead>
                    <TableHead colSpan={10} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">Impostos</TableHead>
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
                    <TableHead className="text-[11px] min-w-[180px]"><span className="flex items-center gap-1">Prestador<ColumnFilterDropdown columnKey="NOME_0150" uniqueValues={cascadingUniqueValues['NOME_0150'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['NOME_0150'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] min-w-[130px]"><span className="flex items-center gap-1">CPF/CNPJ<ColumnFilterDropdown columnKey="CPF_CNPJ_0150" uniqueValues={cascadingUniqueValues['CPF_CNPJ_0150'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['CPF_CNPJ_0150'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] min-w-[240px]"><span className="flex items-center gap-1">Descrição<ColumnFilterDropdown columnKey="DESCR_DISPLAY" uniqueValues={cascadingUniqueValues['DESCR_DISPLAY'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['DESCR_DISPLAY'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[120px]">Valor</TableHead>

                    <TableHead className="text-[11px] min-w-[130px]"><span className="flex items-center gap-1">Conta<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Código da conta analítica contábil (Registro 0500) representativa da operação.</TooltipContent></Tooltip><ColumnFilterDropdown columnKey="COD_CTA" uniqueValues={cascadingUniqueValues['COD_CTA'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['COD_CTA'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-center min-w-[60px] border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center justify-center gap-1">CST PIS<ColumnFilterDropdown columnKey="CST_PIS" uniqueValues={cascadingUniqueValues['CST_PIS'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['CST_PIS'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px] bg-slate-50/60 dark:bg-slate-800/20">BC PIS</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[80px] bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center justify-end gap-1">% PIS<ColumnFilterDropdown columnKey="ALIQ_PIS" uniqueValues={cascadingUniqueValues['ALIQ_PIS'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['ALIQ_PIS'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px] bg-slate-50/60 dark:bg-slate-800/20">VL PIS</TableHead>
                    <TableHead className="text-[11px] text-center min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center justify-center gap-1">CST COF<ColumnFilterDropdown columnKey="CST_COFINS" uniqueValues={cascadingUniqueValues['CST_COFINS'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['CST_COFINS'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px] bg-slate-50/60 dark:bg-slate-800/20">BC COF</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[80px] bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center justify-end gap-1">% COF<ColumnFilterDropdown columnKey="ALIQ_COFINS" uniqueValues={cascadingUniqueValues['ALIQ_COFINS'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['ALIQ_COFINS'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px] bg-slate-50/60 dark:bg-slate-800/20">VL COF</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px] bg-slate-50/60 dark:bg-slate-800/20">PIS Ret</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px] bg-slate-50/60 dark:bg-slate-800/20">COFINS Ret</TableHead>
                     <TableHead className="text-[11px] text-center w-[90px] min-w-[90px] max-w-[90px] sticky right-0 bg-background z-10"><span className="flex items-center gap-1 justify-center">Status<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Mostra se a linha já possui correção aplicada e se a tabela está em modo de edição.</TooltipContent></Tooltip></span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((item) => {
                    const linhaCorrigida = buildChangedFields(item._originalSnapshot, getSnapshotFromItem(item)).length > 0;

                    return (
                      <TableRow key={item.uuid} className={isEditMode ? (selection.selectedIds.has(item.uuid) ? 'bg-teal-100/60 dark:bg-teal-900/25' : 'bg-teal-50/30 dark:bg-teal-950/10') : 'group'}>
                        {isEditMode && (
                          <TableCell className="py-1.5 w-[40px] min-w-[40px] text-center">
                            <Checkbox checked={selection.selectedIds.has(item.uuid)} onCheckedChange={() => selection.toggle(item.uuid)} />
                          </TableCell>
                        )}
                        <TableCell className="text-xs py-1.5 max-w-[180px] truncate" title={item.NOME_0150 ?? undefined}>
                          {item.NOME_0150 || <span className="text-muted-foreground/50 italic">—</span>}
                        </TableCell>
                        <TableCell className="text-xs py-1.5 font-mono">
                          {item.CPF_CNPJ_0150 || <span className="text-muted-foreground/50 italic">—</span>}
                        </TableCell>
                        <TableCell className="py-1.5 max-w-[240px] truncate" title={String(item.DESCR_COMPL ?? '')}>
                          {renderEditableCell(item, 'DESCR_COMPL', 'h-8 text-xs')}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums">
                          {renderEditableCell(item, 'VL_ITEM', 'h-8 text-xs text-right font-mono')}
                        </TableCell>
                        <TableCell className="py-1.5 pr-[100px]">
                          {renderEditableCell(item, 'COD_CTA', 'h-8 text-xs font-mono')}
                        </TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-mono border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'CST_PIS', 'h-8 text-xs text-center font-mono')}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'VL_BC_PIS', 'h-8 text-xs text-right font-mono')}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'ALIQ_PIS', 'h-8 text-xs text-right font-mono')}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'VL_PIS', 'h-8 text-xs text-right font-mono')}
                        </TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'CST_COFINS', 'h-8 text-xs text-center font-mono')}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'VL_BC_COFINS', 'h-8 text-xs text-right font-mono')}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'ALIQ_COFINS', 'h-8 text-xs text-right font-mono')}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'VL_COFINS', 'h-8 text-xs text-right font-mono')}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {formatCurrency(item.VL_PIS_RET ?? 0)}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {formatCurrency(item.VL_COFINS_RET ?? 0)}
                        </TableCell>
                        {/* Actions — sticky right */}
                        <TableCell className="py-1.5 sticky right-0 bg-background z-10 w-[90px] min-w-[90px] max-w-[90px]">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {linhaCorrigida && (
                              <Tooltip><TooltipTrigger asChild><Badge variant="outline" className="text-[10px] cursor-help">Corrigido</Badge></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Indica que esta linha foi alterada e possui valores diferentes do arquivo SPED originalmente importado.</TooltipContent></Tooltip>
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
            <FloatingScrollbar targetRef={scrollRef} alwaysVisible />
            <div className="px-4 pb-3">
              <TablePagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
