import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
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
import type { F100Item, RegF100, CampoAlteradoEfd } from '@/types/correcoesSped';
import { FloatingScrollbar } from '@/components/ui/floating-scrollbar';

const F100_FILTERABLE_KEYS: { key: string; label: string }[] = [
  { key: 'DT_OPER', label: 'Data' },
  { key: 'NOME', label: 'Nome' },
  { key: 'CPF_CNPJ', label: 'CPF/CNPJ' },
  { key: 'TIPO_PESSOA', label: 'Tipo' },
  { key: 'SIMPLES_LABEL', label: 'Simples' },
  { key: 'CST_PIS', label: 'CST PIS' },
  { key: 'ALIQ_PIS', label: '% PIS' },
  { key: 'CST_COFINS', label: 'CST COF' },
  { key: 'ALIQ_COFINS', label: '% COF' },
  { key: 'COD_CTA', label: 'Conta' },
];

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
const inlineInputClass = 'h-auto min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-xs';

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

interface TabF100Props extends CorrecoesActionsProps {
  data: F100Item[] | undefined;
  isLoading: boolean;
  error: Error | null;
  hasQueried: boolean;
  searchText: string;
  empresaCnpj: string | null;
  periodo: string | null;
  nat_bc_creds?: string[];
  cod_cta?: string;
  dt_ini?: string;
  dt_fin?: string;
}

export default function TabF100({ data, isLoading, error, hasQueried, searchText, empresaCnpj, periodo, contribuinteId, nat_bc_creds, cod_cta, dt_ini, dt_fin, onEnviar, onExportar, isSending, isExporting, pendingCount, idArquivos }: TabF100Props) {
  const { user } = useAuth();
  const { consultar: consultarSimples, isLoading: isConsultandoSimples } = useConsultaSimplesNacional({ id_contribuinte: contribuinteId, registro: 'F100', nat_bc_creds, cod_cta, dt_ini, dt_fin });
  const [page, setPage] = useState(0);
  const [editedRows, setEditedRows] = useState<Record<string, RegF100>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, F100Draft>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const selection = useRowSelection();
  const deferredSearchText = useDeferredValue(searchText);

  const handleSort = useCallback((key: string, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction });
  }, []);

  const handleFilter = useCallback((key: string, values: Set<string> | null) => {
    setColumnFilters((prev) => {
      if (values === null) { const next = { ...prev }; delete next[key]; return next; }
      return { ...prev, [key]: values };
    });
  }, []);

  const f100RowAccessor = (item: F100Item, key: string): string => {
    if (key === 'NOME') return item['0150']?.NOME ?? '';
    if (key === 'SIMPLES_LABEL') return SIMPLES_LABELS[item.SIMPLES ?? ''] ?? item.SIMPLES ?? '';
    if (key === 'CPF_CNPJ') return item.CPF_CNPJ ?? '';
    if (key === 'TIPO_PESSOA') return item.TIPO_PESSOA ?? '';
    const f = editedRows[item.F100.uuid] ?? item.F100;
    const v = f[key as keyof RegF100];
    if (v === null || v === undefined) return '';
    return String(v);
  };

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

  const baseFiltered = useMemo(() => {
    if (!deferredSearchText.trim()) {
      return indexedItems.map(({ item }) => item);
    }
    const searchTerm = deferredSearchText.trim().toLowerCase();
    return indexedItems
      .filter(({ searchKey }) => searchKey.includes(searchTerm))
      .map(({ item }) => item);
  }, [deferredSearchText, indexedItems]);

  const cascadingUniqueValues = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const { key } of F100_FILTERABLE_KEYS) {
      let subset = baseFiltered;
      for (const [fk, allowed] of Object.entries(columnFilters)) {
        if (fk !== key) subset = subset.filter((r) => allowed.has(f100RowAccessor(r, fk)));
      }
      result[key] = [...new Set(subset.map((r) => f100RowAccessor(r, key)))];
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseFiltered, columnFilters, editedRows]);

  const filtered = useMemo(() => {
    let items = baseFiltered;
    for (const [key, allowed] of Object.entries(columnFilters)) {
      if (allowed.size > 0) items = items.filter((i) => allowed.has(f100RowAccessor(i, key)));
    }
    if (sortConfig) {
      items = [...items].sort((a, b) => {
        const av = f100RowAccessor(a, sortConfig.key);
        const bv = f100RowAccessor(b, sortConfig.key);
        const cmp = av.localeCompare(bv, 'pt-BR', { numeric: true });
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseFiltered, columnFilters, sortConfig, editedRows]);

  useEffect(() => { setPage(0); }, [searchText, columnFilters, sortConfig]);

  useEffect(() => {
    setColumnFilters({});
    setSortConfig(null);
  }, [empresaCnpj, periodo]);

  const filteredIds = useMemo(() => filtered.map((i) => i.F100.uuid), [filtered]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleEnableEditMode = () => {
    if (!data) return;
    setDrafts(Object.fromEntries(data.map((item) => [item.F100.uuid, toDraft({ ...item, F100: getDisplayedF100(item) })])));
    selection.clear();
    setIsEditMode(true);
  };

  const handleCancelEditMode = () => {
    setIsEditMode(false);
    setDrafts({});
    selection.clear();
  };

  const handleDraftChange = (id: string, field: EditableF100Field, value: string) => {
    setDrafts((current) => applyBatchChange(current, selection.selectedIds, id, field, value));
  };

  const buildNextSnapshot = (item: F100Item, draft: F100Draft) => {
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

    return nextSnapshot;
  };

  const handleSaveAll = async () => {
    if (!user || !data) {
      if (!user) toast.error('Usuário não autenticado para salvar a correção.');
      return;
    }

    setIsSaving(true);

    try {
      let changedCount = 0;
      let savedCount = 0;
      const nextEditedRows = { ...editedRows };

      for (const item of data) {
        const draft = drafts[item.F100.uuid];
        if (!draft) continue;

        const originalSnapshot = getOriginalSnapshot(item);
        const displayedF100 = getDisplayedF100(item);
        const nextSnapshot = buildNextSnapshot(item, draft);
        if (!nextSnapshot) {
          setIsSaving(false);
          return;
        }

        if (buildChangedFields(displayedF100, nextSnapshot).length === 0) continue;

        changedCount += 1;
        const camposAlterados = buildChangedFields(originalSnapshot, nextSnapshot);

        const { data: correcaoAtiva, error: buscaError } = await supabase
          .from('efd_correcoes').select('id')
          .eq('registro_tipo', 'F100').eq('registro_original_id', item.F100.uuid).eq('ativo', true)
          .maybeSingle();
        if (buscaError) throw buscaError;

        if (camposAlterados.length === 0) {
          if (correcaoAtiva?.id) {
            const { error: e } = await supabase.from('efd_correcoes').update({ ativo: false, snapshot: nextSnapshot as unknown as Json, campos_alterados: null }).eq('id', correcaoAtiva.id);
            if (e) throw e;
          }
          delete nextEditedRows[item.F100.uuid];
          savedCount += 1;
          continue;
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

        nextEditedRows[item.F100.uuid] = nextSnapshot as unknown as RegF100;
        savedCount += 1;
      }

      if (changedCount === 0) {
        toast.success('Nenhuma alteração para salvar.');
        handleCancelEditMode();
        return;
      }

      setEditedRows(nextEditedRows);
      handleCancelEditMode();
      toast.success(savedCount === 1 ? '1 correção do F100 salva.' : `${savedCount} correções do F100 salvas.`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar correções.'); }
    finally { setIsSaving(false); }
  };

  const renderEditableCell = (
    item: F100Item, field: EditableF100Field, className: string,
    options?: { isCurrency?: boolean; isPercentage?: boolean },
  ) => {
    const displayedF100 = getDisplayedF100(item);
    const originalSnapshot = getOriginalSnapshot(item);
    const draft = drafts[item.F100.uuid];

    if (!isEditMode || !draft) {
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
        onChange={(e) => { let val = e.target.value; if (options?.isPercentage) { const n = Number(val.replace(',', '.')); if (!isNaN(n) && n > 100) val = '100'; } handleDraftChange(item.F100.uuid, field, val); }}
        className={`${inlineInputClass} ${className} ${options?.isCurrency ? 'pl-4' : ''}`}
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
    <Card className={`border-0 overflow-hidden ${isEditMode ? 'shadow-[0_0_30px_0px_hsl(var(--edit-shadow-color)/0.55)]' : 'shadow-md ring-1 ring-border/50'}`}>
      <CardContent className="p-0">
        <div className="px-4 py-2.5 border-b bg-muted/50 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'item' : 'itens'} encontrados{isEditMode && selection.selectedIds.size > 0 && ` · ${selection.selectedIds.size} selecionados`}</span>
          <div className="flex items-center gap-2">
            <CorrecoesActionButtons
              registroTipo="F100"
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
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum item F100 encontrado para os filtros selecionados.</div>
        ) : (
          <>
            <div className="overflow-auto">
              <Table containerRef={scrollRef}>
                <TableHeader>
                  <TableRow className="border-b-0">
                    {isEditMode && <TableHead className="w-[40px] min-w-[40px] pb-0 pt-2 bg-muted/40" />}
                    <TableHead colSpan={6} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 bg-muted/40"><span className="flex items-center gap-1">Dados EFD<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">O Bloco F consolida receitas financeiras, aluguéis e demais operações não escrituradas nos Blocos A, C e D.</TooltipContent></Tooltip></span></TableHead>
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
                    <TableHead className="text-[11px] min-w-[80px]"><span className="flex items-center gap-1">Data<ColumnFilterDropdown columnKey="DT_OPER" uniqueValues={cascadingUniqueValues['DT_OPER'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['DT_OPER'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] min-w-[180px]"><span className="flex items-center gap-1">Nome<ColumnFilterDropdown columnKey="NOME" uniqueValues={cascadingUniqueValues['NOME'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['NOME'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] min-w-[120px]"><span className="flex items-center gap-1">CPF/CNPJ<ColumnFilterDropdown columnKey="CPF_CNPJ" uniqueValues={cascadingUniqueValues['CPF_CNPJ'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['CPF_CNPJ'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] min-w-[60px]"><span className="flex items-center gap-1">Tipo<ColumnFilterDropdown columnKey="TIPO_PESSOA" uniqueValues={cascadingUniqueValues['TIPO_PESSOA'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['TIPO_PESSOA'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] min-w-[80px]"><span className="flex items-center gap-1">Simples<ColumnFilterDropdown columnKey="SIMPLES_LABEL" uniqueValues={cascadingUniqueValues['SIMPLES_LABEL'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['SIMPLES_LABEL'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px]">Valor</TableHead>
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
                    const displayedF100 = getDisplayedF100(item);
                    const linhaCorrigida = buildChangedFields(getOriginalSnapshot(item), displayedF100 as unknown as Record<string, unknown>).length > 0;
                    return (
                      <TableRow key={`f100-${item.F100.uuid}-${idx}`} className={isEditMode ? (selection.selectedIds.has(item.F100.uuid) ? 'bg-teal-100/60 dark:bg-teal-900/25' : 'bg-teal-50/30 dark:bg-teal-950/10') : 'group'}>
                        {isEditMode && (
                          <TableCell className="py-1.5 w-[40px] min-w-[40px] text-center">
                            <Checkbox checked={selection.selectedIds.has(item.F100.uuid)} onCheckedChange={() => selection.toggle(item.F100.uuid)} />
                          </TableCell>
                        )}
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
