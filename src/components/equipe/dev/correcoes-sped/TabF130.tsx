import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CorrecoesActionButtons, { type CorrecoesActionsProps } from './CorrecoesActionButtons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AlertCircle, Check, ChevronsUpDown, Info, Loader2, X } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import { useRowSelection, applyBatchChange } from '@/components/equipe/dev/correcoes-sped/useRowSelection';
import { ColumnFilterDropdown } from '@/components/equipe/dev/pis-cofins/ColumnFilterDropdown';
import { renderColumnLabel } from '@/components/equipe/dev/pis-cofins/ColumnTooltip';
import { SPED_TOOLTIPS } from '@/components/equipe/dev/correcoes-sped/tooltipHelpers';
import type { F130Item, F130Reg, CampoAlteradoEfd } from '@/types/correcoesSped';
import { FloatingScrollbar } from '@/components/ui/floating-scrollbar';
import { cn } from '@/lib/utils';

const F130_FILTERABLE_KEYS: { key: string; label: string }[] = [
  { key: 'DESC_IDENT_BEM_IMOB', label: 'Bem Imobilizado' },
  { key: 'DESC_IND_UTIL_BEM_IMOB', label: 'Utilização' },
  { key: 'DESC_NAT_BC_CRED', label: 'Nat. Créd.' },
  { key: 'MES_OPER_AQUIS', label: 'Mês Aquis.' },
  { key: 'CST_PIS', label: 'CST PIS' },
  { key: 'ALIQ_PIS', label: '% PIS' },
  { key: 'CST_COFINS', label: 'CST COF' },
  { key: 'ALIQ_COFINS', label: '% COF' },
  { key: 'COD_CTA', label: 'Conta' },
];

const f130RowAccessor = (item: F130Item, key: string): string => {
  if (key === 'DESC_IDENT_BEM_IMOB') return item.DESC_IDENT_BEM_IMOB ?? '';
  if (key === 'DESC_IND_UTIL_BEM_IMOB') return item.DESC_IND_UTIL_BEM_IMOB ?? '';
  if (key === 'DESC_NAT_BC_CRED') return item.DESC_NAT_BC_CRED ?? '';
  const v = item.F130[key as keyof F130Reg];
  if (v === null || v === undefined) return '';
  return String(v);
};

const formatCurrency = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const safeFixed = (v: number | null | undefined, d = 2) =>
  (v ?? 0).toFixed(d);

type EditableF130Field = 'IDENT_BEM_IMOB' | 'IND_UTIL_BEM_IMOB' | 'NAT_BC_CRED' | 'VL_OPER_AQUIS' | 'CST_PIS' | 'ALIQ_PIS' | 'VL_PIS' | 'CST_COFINS' | 'ALIQ_COFINS' | 'VL_COFINS' | 'COD_CTA';
type F130Draft = Record<EditableF130Field, string>;

const editableFields: EditableF130Field[] = ['IDENT_BEM_IMOB', 'IND_UTIL_BEM_IMOB', 'NAT_BC_CRED', 'VL_OPER_AQUIS', 'CST_PIS', 'ALIQ_PIS', 'VL_PIS', 'CST_COFINS', 'ALIQ_COFINS', 'VL_COFINS', 'COD_CTA'];
const numericFields = new Set<EditableF130Field>(['VL_OPER_AQUIS', 'CST_PIS', 'ALIQ_PIS', 'VL_PIS', 'CST_COFINS', 'ALIQ_COFINS', 'VL_COFINS']);
const codeFields = new Set<EditableF130Field>(['IDENT_BEM_IMOB', 'IND_UTIL_BEM_IMOB', 'NAT_BC_CRED']);
const inlineInputClass = 'h-auto min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-xs';

function toDraft(item: F130Item): F130Draft {
  const f = item.F130;
  return {
    IDENT_BEM_IMOB: f.IDENT_BEM_IMOB != null ? String(f.IDENT_BEM_IMOB) : '',
    IND_UTIL_BEM_IMOB: f.IND_UTIL_BEM_IMOB != null ? String(f.IND_UTIL_BEM_IMOB) : '',
    NAT_BC_CRED: f.NAT_BC_CRED != null ? String(f.NAT_BC_CRED) : '',
    VL_OPER_AQUIS: f.VL_OPER_AQUIS != null ? Number(f.VL_OPER_AQUIS).toFixed(2).replace('.', ',') : '0,00',
    CST_PIS: f.CST_PIS != null ? String(f.CST_PIS) : '',
    ALIQ_PIS: f.ALIQ_PIS != null ? Number(f.ALIQ_PIS).toFixed(2).replace('.', ',') : '0,00',
    VL_PIS: f.VL_PIS != null ? Number(f.VL_PIS).toFixed(2).replace('.', ',') : '0,00',
    CST_COFINS: f.CST_COFINS != null ? String(f.CST_COFINS) : '',
    ALIQ_COFINS: f.ALIQ_COFINS != null ? Number(f.ALIQ_COFINS).toFixed(2).replace('.', ',') : '0,00',
    VL_COFINS: f.VL_COFINS != null ? Number(f.VL_COFINS).toFixed(2).replace('.', ',') : '0,00',
    COD_CTA: f.COD_CTA != null ? String(f.COD_CTA) : '',
  };
}

type CodeField130 = 'IDENT_BEM_IMOB' | 'IND_UTIL_BEM_IMOB' | 'NAT_BC_CRED';
const DESC_KEY_BY_CODE_FIELD: Record<CodeField130, 'DESC_IDENT_BEM_IMOB' | 'DESC_IND_UTIL_BEM_IMOB' | 'DESC_NAT_BC_CRED'> = {
  IDENT_BEM_IMOB: 'DESC_IDENT_BEM_IMOB',
  IND_UTIL_BEM_IMOB: 'DESC_IND_UTIL_BEM_IMOB',
  NAT_BC_CRED: 'DESC_NAT_BC_CRED',
};

function buildCodeOptions(rows: F130Item[], codeField: CodeField130): { code: string; description: string }[] {
  const descKey = DESC_KEY_BY_CODE_FIELD[codeField];
  const map = new Map<string, string>();
  for (const row of rows) {
    const code = row.F130[codeField];
    if (code === null || code === undefined || code === '') continue;
    if (!map.has(code)) map.set(code, row[descKey] ?? '');
  }
  return Array.from(map.entries())
    .map(([code, description]) => ({ code, description }))
    .sort((a, b) => a.code.localeCompare(b.code, 'pt-BR', { numeric: true }));
}

function serializeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function buildChangedFields(original: F130Reg, next: Record<string, unknown>): CampoAlteradoEfd[] {
  const origRec = original as unknown as Record<string, unknown>;
  const fields = new Set([...Object.keys(origRec), ...Object.keys(next)]);
  return Array.from(fields).sort().flatMap((field) => {
    const from = origRec[field];
    const to = next[field];
    if (Object.is(from, to)) return [];
    return [{ campo: field, de: serializeValue(from), para: serializeValue(to) }];
  });
}

interface TabF130Props extends CorrecoesActionsProps {
  data: F130Item[] | undefined;
  isLoading: boolean;
  error: Error | null;
  hasQueried: boolean;
  searchText: string;
  empresaCnpj: string | null;
  periodo: string | null;
}

export default function TabF130({ data, isLoading, error, hasQueried, searchText, empresaCnpj, periodo, contribuinteId, onEnviar, onExportar, isSending, isExporting, pendingCount, idArquivos }: TabF130Props) {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<F130Item[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, F130Draft>>({});
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
      if (locallyEditedIds.current.has(d.F130.uuid)) {
        const local = currentRows.find(r => r.F130.uuid === d.F130.uuid);
        return local ?? d;
      }
      return d;
    }));
  }, [data, isEditMode]);

  const baseFiltered = useMemo(() => {
    let items = rows;
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      items = items.filter((i) =>
        i.DESC_IDENT_BEM_IMOB?.toLowerCase().includes(s) ||
        i.DESC_IND_UTIL_BEM_IMOB?.toLowerCase().includes(s) ||
        i.F130.COD_CTA?.toLowerCase().includes(s)
      );
    }
    return items;
  }, [rows, searchText]);

  const cascadingUniqueValues = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const { key } of F130_FILTERABLE_KEYS) {
      let subset = baseFiltered;
      for (const [fk, allowed] of Object.entries(columnFilters)) {
        if (fk !== key) subset = subset.filter((r) => allowed.has(f130RowAccessor(r, fk)));
      }
      result[key] = [...new Set(subset.map((r) => f130RowAccessor(r, key)))];
    }
    return result;
  }, [baseFiltered, columnFilters]);

  const filtered = useMemo(() => {
    let items = baseFiltered;
    for (const [key, allowed] of Object.entries(columnFilters)) {
      if (allowed.size > 0) items = items.filter((i) => allowed.has(f130RowAccessor(i, key)));
    }
    if (sortConfig) {
      items = [...items].sort((a, b) => {
        const av = f130RowAccessor(a, sortConfig.key);
        const bv = f130RowAccessor(b, sortConfig.key);
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

  const filteredIds = useMemo(() => filtered.map((i) => i.F130.uuid), [filtered]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const identBemImobOptions = useMemo(() => buildCodeOptions(rows, 'IDENT_BEM_IMOB'), [rows]);
  const indUtilBemImobOptions = useMemo(() => buildCodeOptions(rows, 'IND_UTIL_BEM_IMOB'), [rows]);
  const natBcCredOptions = useMemo(() => buildCodeOptions(rows, 'NAT_BC_CRED'), [rows]);
  const optionsByField: Record<CodeField130, { code: string; description: string }[]> = {
    IDENT_BEM_IMOB: identBemImobOptions,
    IND_UTIL_BEM_IMOB: indUtilBemImobOptions,
    NAT_BC_CRED: natBcCredOptions,
  };

  const handleEnableEditMode = () => {
    setDrafts(Object.fromEntries(rows.map((row) => [row.F130.uuid, toDraft(row)])));
    selection.clear();
    setIsEditMode(true);
  };

  const handleCancelEditMode = () => {
    setIsEditMode(false);
    setDrafts({});
    selection.clear();
  };

  const handleDraftChange = (id: string, field: EditableF130Field, value: string) => {
    setDrafts((current) => applyBatchChange(current, selection.selectedIds, id, field, value));
  };

  const buildNextSnapshot = (item: F130Item, draft: F130Draft) => {
    const nextSnapshot: Record<string, unknown> = { ...item.F130 };

    for (const field of editableFields) {
      const raw = draft[field].trim();
      if (numericFields.has(field)) {
        if (!raw) { toast.error(`Preencha o campo ${field}.`); return; }
        const parsed = Number(raw.replace(',', '.'));
        if (Number.isNaN(parsed)) { toast.error(`Valor inválido para ${field}.`); return; }
        nextSnapshot[field] = parsed;
        continue;
      }
      if (codeFields.has(field)) {
        if (!raw) { toast.error(`Selecione um código para ${field}.`); return; }
        nextSnapshot[field] = raw;
        continue;
      }
      nextSnapshot[field] = raw;
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
        const draft = drafts[item.F130.uuid];
        if (!draft) continue;

        const nextSnapshot = buildNextSnapshot(item, draft);
        if (!nextSnapshot) {
          setIsSaving(false);
          return;
        }

        if (buildChangedFields(item.F130, nextSnapshot).length === 0) continue;

        changedCount += 1;
        const camposAlterados = buildChangedFields(item._originalSnapshot, nextSnapshot);

        const { data: correcaoAtiva, error: buscaError } = await supabase
          .from('efd_correcoes').select('id')
          .eq('registro_tipo', 'F130').eq('registro_original_id', item.F130.uuid).eq('ativo', true)
          .maybeSingle();
        if (buscaError) throw buscaError;

        if (camposAlterados.length === 0) {
          if (correcaoAtiva?.id) {
            const { error: e } = await supabase.from('efd_correcoes').update({ ativo: false, snapshot: nextSnapshot as unknown as Json, campos_alterados: null }).eq('id', correcaoAtiva.id);
            if (e) throw e;
          }
          nextRows[index] = { ...item, F130: { ...item._originalSnapshot } };
          locallyEditedIds.current.add(item.F130.uuid);
          savedCount += 1;
          continue;
        }

        const payload = {
          contribuinte_id: item.ID_CONTRIBUINTE, arquivo_id: item.F130.ID_ARQUIVO,
          empresa_cnpj: empresaCnpj, periodo, arquivo_tipo: 'efd_contribuicoes',
          registro_tipo: 'F130', registro_original_id: item.F130.uuid,
          tipo_operacao: 'U', snapshot: nextSnapshot as unknown as Json,
          campos_alterados: camposAlterados as unknown as Json,
          motivo: 'Correção manual realizada na tela de revisão do SPED.',
          usuario_id: user.id, ativo: true, sync_status: 'P', sync_error: null, sync_sent_at: null,
        };

        if (correcaoAtiva?.id) {
          const { error: e } = await supabase.from('efd_correcoes').update({ ativo: false }).eq('registro_tipo', 'F130').eq('registro_original_id', item.F130.uuid).eq('ativo', true);
          if (e) throw e;
        }
        const { error: insertError } = await supabase.from('efd_correcoes').insert(payload);
        if (insertError) throw insertError;

        nextRows[index] = { ...item, F130: { ...item.F130, ...nextSnapshot } as F130Reg };
        locallyEditedIds.current.add(item.F130.uuid);
        savedCount += 1;
      }

      if (changedCount === 0) {
        toast.success('Nenhuma alteração para salvar.');
        handleCancelEditMode();
        return;
      }

      setRows(nextRows);
      handleCancelEditMode();
      toast.success(savedCount === 1 ? '1 correção do F130 salva.' : `${savedCount} correções do F130 salvas.`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar correções.'); }
    finally { setIsSaving(false); }
  };

  const renderCodeCell = (item: F130Item, field: CodeField130) => {
    const draft = drafts[item.F130.uuid];
    const options = optionsByField[field];
    const descKey = DESC_KEY_BY_CODE_FIELD[field];
    const descFallback = item[descKey] ?? '';

    const currentCode = isEditMode && draft ? draft[field] : item.F130[field];
    const origCode = item._originalSnapshot ? (item._originalSnapshot as unknown as Record<string, unknown>)[field] : undefined;
    const isChanged = !Object.is(item.F130[field], origCode);
    const selectedOption = options.find((o) => o.code === currentCode);
    const displayDescription = selectedOption?.description ?? descFallback;
    const amberClass = isChanged ? 'text-amber-600 font-bold dark:text-amber-500' : '';

    if (!isEditMode || !draft) {
      return <span className={`text-xs ${amberClass}`}>{displayDescription || '—'}</span>;
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex w-full items-center justify-between gap-1 rounded border border-input bg-background px-2 py-1 text-left text-xs hover:bg-muted',
              amberClass,
            )}
          >
            <span className="truncate">
              {currentCode ? (
                <>
                  <span className="font-mono font-semibold mr-1">{currentCode}</span>
                  <span className="text-muted-foreground">{displayDescription || '—'}</span>
                </>
              ) : (
                <span className="text-muted-foreground italic">Selecionar...</span>
              )}
            </span>
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar por código ou descrição..." className="h-8 text-xs" />
            <CommandList>
              <CommandEmpty>
                {options.length === 0
                  ? 'Nenhum código carregado no período.'
                  : 'Nenhuma opção encontrada.'}
              </CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.code}
                    value={`${option.code} ${option.description}`}
                    onSelect={() => handleDraftChange(item.F130.uuid, field, option.code)}
                    className="group text-xs"
                  >
                    <Check className={cn('mr-2 h-3.5 w-3.5 shrink-0', currentCode === option.code ? 'opacity-100' : 'opacity-0')} />
                    <span className="font-mono font-semibold mr-2 shrink-0">{option.code}</span>
                    <span className="truncate text-muted-foreground group-data-[selected=true]:text-accent-foreground">{option.description || '—'}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  const renderEditableCell = (
    item: F130Item, field: EditableF130Field, className: string,
    options?: { isCurrency?: boolean; isPercentage?: boolean },
  ) => {
    const draft = drafts[item.F130.uuid];

    if (!isEditMode || !draft) {
      const value = item.F130[field as keyof F130Reg];
      const origValue = item._originalSnapshot ? (item._originalSnapshot as unknown as Record<string, unknown>)[field] : undefined;
      const isChanged = !Object.is(value, origValue);
      const amberClass = isChanged ? 'text-amber-600 font-bold dark:text-amber-500' : '';

      if (field === 'VL_OPER_AQUIS' || field === 'VL_PIS' || field === 'VL_COFINS') return <span className={amberClass}>{formatCurrency(typeof value === 'number' ? value : Number(value ?? 0))}</span>;
      if (field === 'ALIQ_PIS' || field === 'ALIQ_COFINS') return <span className={amberClass}>{safeFixed(typeof value === 'number' ? value : Number(value ?? 0))}</span>;
      return <span className={amberClass}>{value ?? '—'}</span>;
    }

    const input = (
      <Input type="text" value={draft[field]}
        onChange={(e) => { let val = e.target.value; if (options?.isPercentage) { const n = Number(val.replace(',', '.')); if (!isNaN(n) && n > 100) val = '100'; } handleDraftChange(item.F130.uuid, field, val); }}
        className={`${inlineInputClass} ${className} ${options?.isCurrency ? 'pl-4' : ''}`}
      />
    );

    if (options?.isCurrency) {
      return (<div className="relative flex items-center w-full"><span className="absolute left-2 text-xs font-medium text-muted-foreground pointer-events-none">R$</span>{input}</div>);
    }
    return input;
  };

  if (isLoading) return <Card><CardContent className="p-8 flex justify-center"><div className="animate-pulse text-sm text-muted-foreground">Carregando dados F130...</div></CardContent></Card>;
  if (error) return <Card className="border-destructive/50 bg-destructive/5"><CardContent className="p-4 flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error.message}</CardContent></Card>;
  if (!hasQueried || !data) return null;

  return (
    <Card className={`border-0 overflow-hidden ${isEditMode ? 'shadow-[0_0_30px_0px_hsl(var(--edit-shadow-color)/0.55)]' : 'shadow-md ring-1 ring-border/50'}`}>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum item F130 encontrado para os filtros selecionados.</div>
        ) : (
          <>
            <div className="px-4 py-2.5 border-b bg-muted/50 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'item' : 'itens'} encontrados{isEditMode && selection.selectedIds.size > 0 && ` · ${selection.selectedIds.size} selecionados`}</span>
              <div className="flex items-center gap-2">
                <CorrecoesActionButtons
                  registroTipo="F130"
                  contribuinteId={contribuinteId}
                  onEnviar={onEnviar}
                  onExportar={onExportar}
                  isSending={isSending}
                  isExporting={isExporting}
                  canExport={idArquivos.length > 0}
                  pendingCount={pendingCount}
                />
                {isEditMode && (
                  <Button size="sm" variant="outline" onClick={handleCancelEditMode} disabled={isSaving}>
                    <X className="h-3.5 w-3.5 mr-1" />Cancelar
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={isEditMode ? handleSaveAll : handleEnableEditMode} disabled={isSaving} className="bg-white text-black border border-input hover:bg-emerald-600 hover:text-white hover:border-emerald-600 active:bg-emerald-700 active:text-white transition-colors duration-200 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black disabled:hover:border-input shrink-0">
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
                    <TableHead colSpan={5} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 bg-muted/40">
                      <span className="flex items-center gap-1">Dados do Bem<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Registro F130 — Bens do ativo imobilizado adquiridos no período, com crédito sobre aquisição.</TooltipContent></Tooltip></span>
                    </TableHead>
                    <TableHead colSpan={7} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">{renderColumnLabel('Impostos', SPED_TOOLTIPS.impostos)}</TableHead>
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
                    <TableHead className="text-[11px] min-w-[200px] whitespace-normal break-words"><span className="flex items-center gap-1">{renderColumnLabel('Bem Imobilizado', SPED_TOOLTIPS.f130Bem)}<ColumnFilterDropdown columnKey="DESC_IDENT_BEM_IMOB" uniqueValues={cascadingUniqueValues['DESC_IDENT_BEM_IMOB'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['DESC_IDENT_BEM_IMOB'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] min-w-[140px] whitespace-normal break-words"><span className="flex items-center gap-1">{renderColumnLabel('Utilização', SPED_TOOLTIPS.f130Utilizacao)}<ColumnFilterDropdown columnKey="DESC_IND_UTIL_BEM_IMOB" uniqueValues={cascadingUniqueValues['DESC_IND_UTIL_BEM_IMOB'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['DESC_IND_UTIL_BEM_IMOB'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] min-w-[140px] whitespace-normal break-words"><span className="flex items-center gap-1">{renderColumnLabel('Nat. Créd.', SPED_TOOLTIPS.natBcCred)}<ColumnFilterDropdown columnKey="DESC_NAT_BC_CRED" uniqueValues={cascadingUniqueValues['DESC_NAT_BC_CRED'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['DESC_NAT_BC_CRED'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] min-w-[90px]"><span className="flex items-center gap-1">{renderColumnLabel('Mês Aquis.', SPED_TOOLTIPS.f130MesAquis)}<ColumnFilterDropdown columnKey="MES_OPER_AQUIS" uniqueValues={cascadingUniqueValues['MES_OPER_AQUIS'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['MES_OPER_AQUIS'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[120px]">{renderColumnLabel('VL Aquisição', SPED_TOOLTIPS.f130Aquisicao)}</TableHead>
                    <TableHead className="text-[11px] text-center min-w-[60px] border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center justify-center gap-1">{renderColumnLabel('CST PIS', SPED_TOOLTIPS.cstPis)}<ColumnFilterDropdown columnKey="CST_PIS" uniqueValues={cascadingUniqueValues['CST_PIS'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['CST_PIS'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center justify-end gap-1">{renderColumnLabel('% PIS', SPED_TOOLTIPS.pctPis)}<ColumnFilterDropdown columnKey="ALIQ_PIS" uniqueValues={cascadingUniqueValues['ALIQ_PIS'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['ALIQ_PIS'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">{renderColumnLabel('VL PIS', SPED_TOOLTIPS.vlPis)}</TableHead>
                    <TableHead className="text-[11px] text-center min-w-[60px] bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center justify-center gap-1">{renderColumnLabel('CST COF', SPED_TOOLTIPS.cstCof)}<ColumnFilterDropdown columnKey="CST_COFINS" uniqueValues={cascadingUniqueValues['CST_COFINS'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['CST_COFINS'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center justify-end gap-1">{renderColumnLabel('% COF', SPED_TOOLTIPS.pctCof)}<ColumnFilterDropdown columnKey="ALIQ_COFINS" uniqueValues={cascadingUniqueValues['ALIQ_COFINS'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['ALIQ_COFINS'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">{renderColumnLabel('VL COF', SPED_TOOLTIPS.vlCof)}</TableHead>
                    <TableHead className="text-[11px] min-w-[120px] bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center gap-1">{renderColumnLabel('Conta', SPED_TOOLTIPS.conta)}<ColumnFilterDropdown columnKey="COD_CTA" uniqueValues={cascadingUniqueValues['COD_CTA'] ?? []} activeSort={sortConfig} activeFilter={columnFilters['COD_CTA'] ?? null} onSort={handleSort} onFilter={handleFilter} /></span></TableHead>
                     <TableHead className="text-[11px] text-center w-[90px] min-w-[90px] max-w-[90px] sticky right-0 bg-background z-10 border-l border-slate-200 dark:border-slate-700 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">{renderColumnLabel('Status', SPED_TOOLTIPS.status)}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((item, idx) => {
                    const linhaCorrigida = buildChangedFields(item._originalSnapshot, item.F130 as unknown as Record<string, unknown>).length > 0;
                    return (
                      <TableRow key={`f130-${item.F130.uuid}-${idx}`} className={isEditMode ? (selection.selectedIds.has(item.F130.uuid) ? 'bg-teal-100/60 dark:bg-teal-900/25' : 'bg-teal-50/30 dark:bg-teal-950/10') : 'group'}>
                        {isEditMode && (
                          <TableCell className="py-1.5 w-[40px] min-w-[40px] text-center">
                            <Checkbox checked={selection.selectedIds.has(item.F130.uuid)} onCheckedChange={() => selection.toggle(item.F130.uuid)} />
                          </TableCell>
                        )}
                        <TableCell className="text-xs py-1.5 max-w-[200px] whitespace-normal break-words leading-5">{renderCodeCell(item, 'IDENT_BEM_IMOB')}</TableCell>
                        <TableCell className="text-xs py-1.5 max-w-[140px] whitespace-normal break-words leading-5">{renderCodeCell(item, 'IND_UTIL_BEM_IMOB')}</TableCell>
                        <TableCell className="text-xs py-1.5 max-w-[220px] whitespace-normal break-words leading-5">{renderCodeCell(item, 'NAT_BC_CRED')}</TableCell>
                        <TableCell className="text-xs py-1.5 font-mono">{item.F130.MES_OPER_AQUIS}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums">{renderEditableCell(item, 'VL_OPER_AQUIS', 'h-8 text-xs text-right font-mono', { isCurrency: true })}</TableCell>
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
