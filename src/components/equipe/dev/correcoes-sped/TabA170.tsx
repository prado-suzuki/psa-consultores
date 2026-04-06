import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AlertCircle, BookOpen, Check, Info, Loader2, Pencil, X } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import type { A170Item, A170Snapshot, CampoAlteradoEfd } from '@/types/correcoesSped';

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

function toDraft(item: A170Item): A170Draft {
  return {
    CHV_NFSE: item.CHV_NFSE ?? '',
    DESCR_COMPL: item.DESCR_COMPL ?? '',
    VL_ITEM: String(item.VL_ITEM ?? 0),
    COD_CTA: item.COD_CTA ?? '',
    CST_PIS: String(item.CST_PIS ?? 0),
    VL_BC_PIS: String(item.VL_BC_PIS ?? 0),
    ALIQ_PIS: String(item.ALIQ_PIS ?? 0),
    VL_PIS: String(item.VL_PIS ?? 0),
    CST_COFINS: String(item.CST_COFINS ?? 0),
    VL_BC_COFINS: String(item.VL_BC_COFINS ?? 0),
    ALIQ_COFINS: String(item.ALIQ_COFINS ?? 0),
    VL_COFINS: String(item.VL_COFINS ?? 0),
  };
}

function getSnapshotFromItem(item: A170Item): A170Snapshot {
  const { DESCR_ITEM_0200, COD_NCM, TIPO_ITEM, _originalSnapshot, ...snapshot } = item;
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

interface TabA170Props {
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
}: TabA170Props) {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<A170Item[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<A170Draft | null>(null);

  useEffect(() => {
    setRows(data ?? []);
  }, [data]);

  const filtered = useMemo(() => {
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
          (i.COD_NCM ?? '').includes(s)
      );
    }
    return items;
  }, [rows, ncmFilter, searchText]);

  useEffect(() => {
    setPage(0);
  }, [ncmFilter, searchText]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleStartEdit = (item: A170Item) => {
    setEditingId(item.uuid);
    setDraft(toDraft(item));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const handleDraftChange = (field: EditableA170Field, value: string) => {
    setDraft((current) => current ? { ...current, [field]: value } : current);
  };

  const handleSave = async (item: A170Item) => {
    if (!user) {
      toast.error('Usuário não autenticado para salvar a correção.');
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
          toast.error(`Valor inválido para o campo ${field}.`);
          return;
        }

        nextSnapshot[field] = parsedValue as never;
        continue;
      }

      if (nullableTextFields.has(field)) {
        nextSnapshot[field] = (rawValue || null) as never;
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
          toast.success('Correção removida; a linha voltou ao valor original.');
        } else {
          toast.success('Nenhuma alteração para salvar.');
        }

        setRows((current) => current.map((row) =>
          row.uuid === item.uuid
            ? { ...row, ...item._originalSnapshot }
            : row
        ));
        handleCancelEdit();
        return;
      }

      if (!item.ID_CONTRIBUINTE) {
        toast.error('Nao foi possivel identificar o contribuinte desta linha A170.');
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

      setRows((current) => current.map((row) =>
        row.uuid === item.uuid
          ? { ...row, ...nextSnapshot }
          : row
      ));
      handleCancelEdit();
      toast.success('Correção do A170 salva na tabela efd_correcoes.');
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Erro inesperado ao salvar a correção.';
      toast.error(message);
    } finally {
      setSavingId(null);
    }
  };

  const renderEditableCell = (
    item: A170Item,
    field: EditableA170Field,
    className: string,
    options?: { type?: 'text' | 'number'; align?: 'left' | 'center' | 'right'; step?: string }
  ) => {
    if (editingId !== item.uuid || !draft) {
      const value = item[field];

      if (field === 'CHV_NFSE') {
        return value ? (
          <code className="text-[10px] font-mono text-muted-foreground" title={String(value)}>
            {String(value).slice(0, 12)}…
          </code>
        ) : (
          <span className="text-xs text-muted-foreground/50 italic text-center block">—</span>
        );
      }

      if (field === 'DESCR_COMPL') {
        return (
          <div className="space-y-0.5" title={item.DESCR_COMPL || item.DESCR_ITEM_0200 || undefined}>
            <div className="text-xs truncate">{item.DESCR_COMPL || item.DESCR_ITEM_0200 || '—'}</div>
            {item.DESCR_ITEM_0200 && item.DESCR_ITEM_0200 !== item.DESCR_COMPL && (
              <div className="text-[10px] text-muted-foreground truncate">0200: {item.DESCR_ITEM_0200}</div>
            )}
          </div>
        );
      }

      if (field === 'VL_ITEM' || field === 'VL_BC_PIS' || field === 'VL_PIS' || field === 'VL_BC_COFINS' || field === 'VL_COFINS') {
        return formatCurrency(typeof value === 'number' ? value : Number(value ?? 0));
      }

      if (field === 'ALIQ_PIS' || field === 'ALIQ_COFINS') {
        return safeFixed(typeof value === 'number' ? value : Number(value ?? 0));
      }

      return value ?? '—';
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
    <Card className="shadow-md border-0 ring-1 ring-border/50 overflow-hidden">
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
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                Clique no <Pencil className="inline h-3 w-3 align-[-1px]" /> para editar e salvar a correção da linha.
                <Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">As correções feitas aqui são salvas no banco de dados. O registro original é preservado intacto.</TooltipContent></Tooltip>
              </span>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-0">
                    <TableHead colSpan={5} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 bg-muted/40">Dados EFD</TableHead>
                    <TableHead colSpan={8} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 pb-0 pt-2 border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">Impostos</TableHead>
                    <TableHead colSpan={1} className="pb-0 pt-2 bg-background" />
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-[11px] min-w-[140px]">CHV NFSe</TableHead>
                    <TableHead className="text-[11px] min-w-[240px]">Descrição</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[120px]">Valor</TableHead>
                    <TableHead className="text-[11px] min-w-[100px]"><span className="flex items-center gap-1">NCM<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">NCM trazido do Registro 0200 correspondente a este item.</TooltipContent></Tooltip></span></TableHead>
                    <TableHead className="text-[11px] min-w-[130px]"><span className="flex items-center gap-1">Conta<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Código da conta analítica contábil (Registro 0500) representativa da operação.</TooltipContent></Tooltip></span></TableHead>
                    <TableHead className="text-[11px] text-center min-w-[60px] border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">CST PIS</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px] bg-slate-50/60 dark:bg-slate-800/20">BC PIS</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[80px] bg-slate-50/60 dark:bg-slate-800/20">% PIS</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px] bg-slate-50/60 dark:bg-slate-800/20">VL PIS</TableHead>
                    <TableHead className="text-[11px] text-center min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20">CST COF</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px] bg-slate-50/60 dark:bg-slate-800/20">BC COF</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[80px] bg-slate-50/60 dark:bg-slate-800/20">% COF</TableHead>
                    <TableHead className="text-[11px] text-right min-w-[110px] bg-slate-50/60 dark:bg-slate-800/20">VL COF</TableHead>
                    <TableHead className="text-[11px] text-center min-w-[100px] sticky right-0 bg-background z-10"><span className="flex items-center gap-1 justify-center">Ações<Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Permite corrigir os valores da linha. Se você desfazer as edições e salvar com os valores originais, a correção será inativada.</TooltipContent></Tooltip></span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((item) => {
                    const linhaCorrigida = buildChangedFields(item._originalSnapshot, getSnapshotFromItem(item)).length > 0;

                    return (
                      <TableRow key={item.uuid} className={editingId === item.uuid ? "bg-accent/30" : "group"}>
                        <TableCell className="py-1.5">
                          {renderEditableCell(item, 'CHV_NFSE', 'h-8 text-xs font-mono')}
                        </TableCell>
                        <TableCell className="py-1.5 max-w-[240px] truncate" title={String(item.DESCR_COMPL ?? '')}>
                          {renderEditableCell(item, 'DESCR_COMPL', 'h-8 text-xs')}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums">
                          {renderEditableCell(item, 'VL_ITEM', 'h-8 text-xs text-right font-mono', { type: 'number', step: '0.01' })}
                        </TableCell>
                        <TableCell className="py-1.5">
                          {item.COD_NCM ? (
                            <Badge
                              variant="outline"
                              className="cursor-pointer gap-1 font-mono text-[11px] hover:bg-teal-50 dark:hover:bg-teal-950/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800"
                              onClick={() => onSelectNcm(item.COD_NCM!)}
                            >
                              <BookOpen className="h-3 w-3 shrink-0" />
                              {item.COD_NCM}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground/50 italic text-center block">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5">
                          {renderEditableCell(item, 'COD_CTA', 'h-8 text-xs font-mono')}
                        </TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-mono border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'CST_PIS', 'h-8 text-xs text-center font-mono', { type: 'number', step: '1' })}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'VL_BC_PIS', 'h-8 text-xs text-right font-mono', { type: 'number', step: '0.01' })}
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
                          {renderEditableCell(item, 'VL_BC_COFINS', 'h-8 text-xs text-right font-mono', { type: 'number', step: '0.01' })}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'ALIQ_COFINS', 'h-8 text-xs text-right font-mono', { type: 'number', step: '0.0001' })}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">
                          {renderEditableCell(item, 'VL_COFINS', 'h-8 text-xs text-right font-mono', { type: 'number', step: '0.01' })}
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
                              <Tooltip><TooltipTrigger asChild><Badge variant="outline" className="text-[10px] cursor-help">Corrigido</Badge></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Indica que esta linha foi alterada e possui valores diferentes do arquivo SPED originalmente importado.</TooltipContent></Tooltip>
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
