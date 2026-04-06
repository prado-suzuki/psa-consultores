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
import { AlertCircle, BookOpen, Check, FileSearch, Info, Loader2, Network, Pencil, X } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import type { C170Item, ItemEfd, CampoAlteradoEfd, FlatItemEfd } from '@/types/correcoesSped';

type NcmFilter = 'all' | 'with' | 'without';

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

function toDraft(item: C170Item): C170Draft {
  return {
    DESCR_COMPL: item.DESCR_COMPL ?? '',
    VL_ITEM: String(item.VL_ITEM ?? 0),
    COD_CTA: item.COD_CTA ?? '',
    CST_PIS: String(item.CST_PIS ?? 0),
    ALIQ_PIS: String(item.ALIQ_PIS ?? 0),
    VL_PIS: String(item.VL_PIS ?? 0),
    CST_COFINS: String(item.CST_COFINS ?? 0),
    ALIQ_COFINS: String(item.ALIQ_COFINS ?? 0),
    VL_COFINS: String(item.VL_COFINS ?? 0),
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<C170Draft | null>(null);

  const locallyEditedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!data) return;
    if (editingId) return;

    if (locallyEditedIds.current.size === 0) {
      setRows(data);
      return;
    }

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
    if (ncmFilter === 'with') items = items.filter((i) => !!getNcm(i));
    if (ncmFilter === 'without') items = items.filter((i) => !getNcm(i));
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
  }, [rows, ncmFilter, searchText]);

  useEffect(() => {
    setPage(0);
  }, [ncmFilter, searchText]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleStartEdit = (item: C170Item) => {
    setEditingId(item.uuid);
    setDraft(toDraft(item));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const handleDraftChange = (field: EditableC170Field, value: string) => {
    setDraft((current) => current ? { ...current, [field]: value } : current);
  };

  const handleSave = async (item: C170Item) => {
    if (!user) {
      toast.error('Usuario nao autenticado para salvar a correcao.');
      return;
    }

    if (!draft || editingId !== item.uuid) return;

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

      nextSnapshot[field] = rawValue as never;
    }

    const camposAlterados = buildChangedFields(item._originalSnapshot, nextSnapshot);

    setSavingId(item.uuid);

    try {
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
          toast.success('Correcao removida; a linha voltou ao valor original.');
        } else {
          toast.success('Nenhuma alteracao para salvar.');
        }

        setRows((current) => current.map((row) =>
          row.uuid === item.uuid
            ? { ...row, ...item._originalSnapshot }
            : row
        ));
        handleCancelEdit();
        return;
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

      setRows((current) => current.map((row) =>
        row.uuid === item.uuid
          ? { ...row, ...nextSnapshot }
          : row
      ));
      locallyEditedIds.current.add(item.uuid);
      handleCancelEdit();
      toast.success('Correcao do C170 salva na tabela efd_correcoes.');
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Erro inesperado ao salvar a correcao.';
      toast.error(message);
    } finally {
      setSavingId(null);
    }
  };

  const renderEditableCell = (
    item: C170Item,
    field: EditableC170Field,
    className: string,
    options?: { type?: 'text' | 'number'; step?: string }
  ) => {
    if (editingId !== item.uuid || !draft) {
      const value = item[field];

      if (field === 'DESCR_COMPL') {
        return (
          <span className="text-xs truncate block" title={item.DESCR_COMPL || item.DESCR_ITEM_0200 || undefined}>
            {item.DESCR_ITEM_0200 || item.DESCR_COMPL || '\u2014'}
          </span>
        );
      }

      if (field === 'VL_ITEM' || field === 'VL_PIS' || field === 'VL_COFINS') {
        return formatCurrency(typeof value === 'number' ? value : Number(value ?? 0));
      }

      if (field === 'ALIQ_PIS' || field === 'ALIQ_COFINS') {
        return safeFixed(typeof value === 'number' ? value : Number(value ?? 0));
      }

      return value ?? '\u2014';
    }

    return (
      <Input
        type={options?.type ?? 'text'}
        step={options?.step}
        value={draft[field]}
        onChange={(event) => handleDraftChange(field, event.target.value)}
        className={`${className} bg-background border-primary/20 focus-visible:ring-primary/40`}
      />
    );
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
    <Card className="shadow-md border-0 ring-1 ring-border/50 overflow-hidden">
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
              </span>
              <span className="text-[11px] text-muted-foreground">
                Clique no <Pencil className="inline h-3 w-3 align-[-1px]" /> para editar e salvar a correcao da linha.
              </span>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-0">
                    <TableHead colSpan={3} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 bg-muted/40">Dados EFD</TableHead>
                    <TableHead colSpan={3} className="text-[10px] uppercase tracking-wider font-bold text-emerald-600/70 dark:text-emerald-400/70 pb-0 pt-2 border-l-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20"><span className="flex items-center gap-1">Dados XML<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Dados lidos diretamente do arquivo XML original para confronto com a escrituração (SPED).</TooltipContent></Tooltip></span></TableHead>
                    <TableHead colSpan={7} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">Impostos</TableHead>
                    <TableHead colSpan={1} className="pb-0 pt-2 bg-background" />
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-[11px] min-w-[200px]">Descricao</TableHead>
                    <TableHead className="text-[11px] min-w-[100px]"><span className="flex items-center gap-1">NCM (0200)<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">NCM declarado na EFD. Como o Registro C170 não possui campo de NCM, este dado é trazido do Registro 0200 correspondente ao item.</TooltipContent></Tooltip></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px]">Valor</TableHead>
                    <TableHead className="text-[11px] min-w-[200px] border-l-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20"><span className="flex items-center gap-1">Descricao<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">{"Descrição do produto no XML (tag <xProd>). Exibe 'Consolidado' quando o sistema identifica que vários itens do XML foram agrupados em uma única linha no SPED."}</TooltipContent></Tooltip></span></TableHead>
                    <TableHead className="text-[11px] min-w-[100px] bg-emerald-50/60 dark:bg-emerald-950/20"><span className="flex items-center gap-1">NCM<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">{"NCM do produto no XML (tag <NCM>). Fica em vermelho quando não bate com o NCM declarado no Registro 0200 do SPED."}</TooltipContent></Tooltip></span></TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px] bg-emerald-50/60 dark:bg-emerald-950/20"><span className="flex items-center gap-1 justify-end">Valor<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">{"Valor do produto no XML (tag <vProd>). Fica em laranja quando há diferença em relação ao valor bruto (VL_ITEM) declarado no SPED."}</TooltipContent></Tooltip></span></TableHead>
                    <TableHead className="text-[11px] text-center min-w-[60px] border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">CST PIS</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20">% PIS</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">VL PIS</TableHead>
                    <TableHead className="text-[11px] text-center min-w-[60px] bg-slate-50/60 dark:bg-slate-800/20">CST COF</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20">% COF</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">VL COF</TableHead>
                    <TableHead className="text-[11px] min-w-[90px] bg-slate-50/60 dark:bg-slate-800/20"><span className="flex items-center gap-1">Conta<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Código da conta analítica contábil (Registro 0500) representativa da operação.</TooltipContent></Tooltip></span></TableHead>
                    <TableHead className="text-[11px] text-center min-w-[100px] sticky right-0 bg-background z-10">Ações</TableHead>
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
                      <TableRow key={`${item.chv_nfe}-${item.NUM_ITEM}-${idx}`} className={editingId === item.uuid ? "bg-accent/30" : "group"}>
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
                          {renderEditableCell(item, 'VL_ITEM', 'h-8 text-xs text-right font-mono', { type: 'number', step: '0.01' })}
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
                          {renderEditableCell(item, 'CST_PIS', 'h-8 text-xs text-center font-mono', { type: 'number', step: '1' })}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'ALIQ_PIS', 'h-8 text-xs text-right font-mono', { type: 'number', step: '0.0001' })}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'VL_PIS', 'h-8 text-xs text-right font-mono', { type: 'number', step: '0.01' })}
                        </TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'CST_COFINS', 'h-8 text-xs text-center font-mono', { type: 'number', step: '1' })}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'ALIQ_COFINS', 'h-8 text-xs text-right font-mono', { type: 'number', step: '0.0001' })}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'VL_COFINS', 'h-8 text-xs text-right font-mono', { type: 'number', step: '0.01' })}
                        </TableCell>
                        <TableCell className="text-xs py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'COD_CTA', 'h-8 text-xs font-mono')}
                        </TableCell>
                        {/* Actions — sticky right */}
                        <TableCell className="py-1.5 sticky right-0 bg-background z-10">
                          <div className="flex items-center justify-center gap-1">
                            {editingId === item.uuid ? (
                              <>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => handleSave(item)}
                                  disabled={savingId === item.uuid}
                                >
                                  {savingId === item.uuid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-emerald-600" />}
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={handleCancelEdit}
                                  disabled={savingId === item.uuid}
                                >
                                  <X className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleStartEdit(item)}
                                disabled={!!savingId}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {linhaCorrigida && editingId !== item.uuid && (
                              <Badge variant="outline" className="text-[10px]">Corrigido</Badge>
                            )}
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
