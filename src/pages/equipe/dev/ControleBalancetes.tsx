import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getApiUrl, currentAmbiente } from '@/config/api';
import { useApiAuth } from '@/hooks/useApiAuth';
import { toast } from '@/hooks/use-toast';
import DevLayout from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MonthRangePicker, monthRangeToDateStrings, type MonthRange } from '@/components/ui/month-range-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Filter, Search, Eraser, Plus, FileSpreadsheet, Download, FileDown, Loader2 } from 'lucide-react';
import { UploadBalanceteModal } from '@/components/equipe/dev/balancete/UploadBalanceteModal';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RequiredMark } from '@/components/ui/required-mark';

interface Balancete {
  id: string;
  id_contribuinte: string;
  contribuinte_nome?: string;
  periodo_inicio: string;
  periodo_fim: string;
  adicionado_por: string;
  created_at: string;
  qtd_linhas?: number;
  total_linhas?: number;
  [key: string]: unknown;
}

const COL_COUNT = 6;

const ControleBalancetes = () => {
  const { fetchWithAuth } = useApiAuth();

  const [clienteId, setClienteId] = useState('');
  const [contribuinteId, setContribuinteId] = useState('');
  const [periodo, setPeriodo] = useState<MonthRange | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [balancetes, setBalancetes] = useState<Balancete[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [downloading, setDownloading] = useState<Record<string, 'download' | 'export' | null>>({});
  const [confirmDownload, setConfirmDownload] = useState<string | null>(null);
  const [confirmExport, setConfirmExport] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected = useMemo(() => balancetes.length > 0 && balancetes.every(b => selectedIds.has(b.id)), [balancetes, selectedIds]);

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(balancetes.map(b => b.id)));
    }
  };

  const handleToggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (endpoint: 'batch-download' | 'batch-export-excel', type: 'download' | 'export') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const bulkKey = '__bulk__';
    setDownloading((prev) => ({ ...prev, [bulkKey]: type }));
    try {
      const response = await fetchWithAuth(getApiUrl(`/api/v1/contabil/balancetes/${endpoint}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_balancetes: ids }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detail = errorData?.detail;
        const message = typeof detail === 'object' && detail?.error_message
          ? detail.error_message
          : typeof detail === 'string' ? detail : `Erro ${response.status}`;
        throw new Error(message);
      }

      const filesFound = response.headers.get('X-Files-Found');
      const filesMissing = response.headers.get('X-Files-Missing');

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      let filename = endpoint === 'batch-download' ? 'balancetes_originais.zip' : 'balancetes_export.zip';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match?.[1]) filename = match[1].replace(/['"]/g, '');
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      if (filesFound || filesMissing) {
        toast({
          title: 'Download concluído',
          description: `Arquivos encontrados: ${filesFound ?? '?'} | Faltantes: ${filesMissing ?? '0'}`,
        });
      }
    } catch (err: any) {
      toast({ title: type === 'download' ? 'Erro ao baixar arquivos' : 'Erro ao exportar Excel', description: err.message, variant: 'destructive' });
    } finally {
      setDownloading((prev) => ({ ...prev, [bulkKey]: null }));
    }
  };

  // Fetch clientes
  const { data: clientes } = useQuery({
    queryKey: ['clientes-balancetes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  // Fetch contribuintes filtered by client
  const { data: contribuintes } = useQuery({
    queryKey: ['contribuintes-balancetes', clienteId],
    queryFn: async () => {
      let query = supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cliente_id')
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');
      if (clienteId) query = query.eq('cliente_id', clienteId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (clienteId && contribuintes && contribuintes.length === 1 && !contribuinteId) {
      setContribuinteId(contribuintes[0].id);
    }
  }, [clienteId, contribuintes, contribuinteId]);

  const handleClear = () => {
    setClienteId('');
    setContribuinteId('');
    setPeriodo(null);
    setBalancetes([]);
    setSearched(false);
    setSelectedIds(new Set());
  };

  const handleSearch = useCallback(async (overrideContribuinteId?: string) => {
    const idToUse = overrideContribuinteId || contribuinteId;
    if (!idToUse) {
      toast({ title: 'Selecione um contribuinte', description: 'O contribuinte é obrigatório para buscar balancetes.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      let url = getApiUrl(`/api/v1/contabil/balancetes?id_contribuinte=${idToUse}`);
      if (periodo) {
        const dates = monthRangeToDateStrings(periodo);
        if (dates.start) url += `&dt_ini=${dates.start}`;
        if (dates.end) url += `&dt_fim=${dates.end}`;
      }

      const response = await fetchWithAuth(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detail = errorData?.detail;
        const message = typeof detail === 'object' && detail?.error_message
          ? detail.error_message
          : typeof detail === 'string' ? detail : `Erro ${response.status}`;
        throw new Error(message);
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : Array.isArray(data?.balancetes) ? data.balancetes : [];
      setBalancetes(list.map((b: any) => ({ ...b, id: b.id_balancete || b.id })));
    } catch (err: any) {
      toast({ title: 'Erro ao buscar balancetes', description: err.message, variant: 'destructive' });
      setBalancetes([]);
    } finally {
      setLoading(false);
    }
  }, [contribuinteId, periodo, fetchWithAuth]);

  const handleBlobDownload = async (id: string, endpoint: 'download' | 'export-excel', type: 'download' | 'export') => {
    setDownloading((prev) => ({ ...prev, [id]: type }));
    try {
      const response = await fetchWithAuth(getApiUrl(`/api/v1/contabil/balancetes/${id}/${endpoint}`));
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detail = errorData?.detail;
        const message = typeof detail === 'object' && detail?.error_message
          ? detail.error_message
          : typeof detail === 'string' ? detail : `Erro ${response.status}`;
        throw new Error(message);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      let filename = endpoint === 'download' ? 'balancete_original.xlsx' : 'balancete_movimentos.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match?.[1]) filename = match[1].replace(/['"]/g, '');
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      toast({ title: type === 'download' ? 'Erro ao baixar arquivo' : 'Erro ao exportar Excel', description: err.message, variant: 'destructive' });
    } finally {
      setDownloading((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open && contribuinteId && searched) {
      handleSearch();
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      // Append T00:00:00 to avoid UTC midnight shifting to previous day in BR timezone
      const normalized = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
      return new Date(normalized).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const hasFilters = clienteId || contribuinteId || periodo;

  return (
    <DevLayout title="Controle de Balancetes" subtitle="Upload e consulta de balancetes contábeis">
      {/* Filters Card */}
      <Card className="mb-8 rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="pb-2 p-6 md:p-8 md:pb-4">
          <CardTitle className="flex items-center gap-2.5">
            <Filter className="h-5 w-5 text-teal-600" />
            <span className="uppercase text-xs tracking-widest font-bold text-slate-600">Filtros de Busca</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6 md:px-8 md:pb-8 pt-0">
          <div className="grid grid-cols-12 gap-6">
            {/* Cliente */}
            <div className="col-span-4 space-y-2">
              <Label className="text-sm font-medium text-slate-600">Cliente <RequiredMark /></Label>
              <Select value={clienteId} onValueChange={(v) => { setClienteId(v); setContribuinteId(''); }}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contribuinte */}
            <div className="col-span-4 space-y-2">
              <Label className="text-sm font-medium text-slate-600">Contribuinte</Label>
              <Select value={contribuinteId} onValueChange={setContribuinteId}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200">
                  <SelectValue placeholder="Selecione o contribuinte" />
                </SelectTrigger>
                <SelectContent>
                  {contribuintes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Período */}
            <div className="col-span-4 space-y-2">
              <Label className="text-sm font-medium text-slate-600">Período</Label>
              <MonthRangePicker value={periodo} onChange={setPeriodo} placeholder="Selecione o período" />
            </div>
          </div>

          {/* Action footer */}
          <div className="flex items-center justify-between pt-5 border-t border-slate-100">
            <Button onClick={() => setModalOpen(true)} className="gap-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg">
              <Plus className="h-4 w-4" />
              Novo Balancete
            </Button>
            <div className="flex items-center gap-3">
              {hasFilters && (
                <Button variant="outline" onClick={handleClear} className="gap-2 text-red-600 border-red-200 hover:bg-red-50 rounded-lg">
                  <Eraser className="h-4 w-4" />
                  Limpar filtros
                </Button>
              )}
              <Button onClick={() => handleSearch()} disabled={loading} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 px-5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="p-6 md:px-8 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800">Balancetes</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-teal-700 border-teal-200 hover:bg-teal-50"
              disabled={selectedIds.size === 0 || downloading['__bulk__'] === 'download'}
              onClick={() => handleBulkAction('batch-download', 'download')}
            >
              {downloading['__bulk__'] === 'download' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Baixar original
              {selectedIds.size > 0 && <Badge variant="secondary" className="ml-1 text-xs">{selectedIds.size}</Badge>}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-blue-700 border-blue-200 hover:bg-blue-50"
              disabled={selectedIds.size === 0 || downloading['__bulk__'] === 'export'}
              onClick={() => handleBulkAction('batch-export-excel', 'export')}
            >
              {downloading['__bulk__'] === 'export' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Exportar movimentos
              {selectedIds.size > 0 && <Badge variant="secondary" className="ml-1 text-xs">{selectedIds.size}</Badge>}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0 md:px-8 md:pb-8">
          <div className="overflow-x-auto w-full">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={handleToggleAll} aria-label="Selecionar todos" />
                  </TableHead>
                  <TableHead className="uppercase tracking-wider text-[11px] font-semibold text-slate-500 w-12">#</TableHead>
                  <TableHead className="uppercase tracking-wider text-[11px] font-semibold text-slate-500">Período Início</TableHead>
                  <TableHead className="uppercase tracking-wider text-[11px] font-semibold text-slate-500">Período Fim</TableHead>
                  <TableHead className="uppercase tracking-wider text-[11px] font-semibold text-slate-500">Adicionado por</TableHead>
                  
                  <TableHead className="uppercase tracking-wider text-[11px] font-semibold text-slate-500 text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={COL_COUNT} className="text-center py-16 text-slate-400">
                      <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin text-teal-500" />
                      <p className="text-sm font-medium text-slate-500">Buscando balancetes...</p>
                    </TableCell>
                  </TableRow>
                ) : balancetes.length > 0 ? (
                  balancetes.map((b, index) => (
                    <TableRow key={b.id} className="border-slate-100 hover:bg-slate-50/60">
                      <TableCell>
                        <Checkbox checked={selectedIds.has(b.id)} onCheckedChange={() => handleToggleItem(b.id)} aria-label={`Selecionar balancete ${index + 1}`} />
                      </TableCell>
                      <TableCell className="text-slate-400 font-medium">{index + 1}</TableCell>
                      <TableCell className="text-slate-700">{formatDate(b.periodo_inicio)}</TableCell>
                      <TableCell className="text-slate-700">{formatDate(b.periodo_fim)}</TableCell>
                      <TableCell className="text-slate-700">{b.adicionado_por || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-teal-50"
                                  disabled={downloading[b.id] === 'download'}
                                  onClick={() => setConfirmDownload(b.id)}
                                >
                                  {downloading[b.id] === 'download' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4 text-teal-600" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Baixar arquivo original</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-blue-50"
                                  disabled={downloading[b.id] === 'export'}
                                  onClick={() => setConfirmExport(b.id)}
                                >
                                  {downloading[b.id] === 'export' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FileDown className="h-4 w-4 text-blue-600" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Exportar movimentos (Excel)</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={COL_COUNT} className="text-center py-16 text-slate-400">
                      <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">
                        {searched ? 'Nenhum balancete encontrado' : 'Selecione um contribuinte e clique em Buscar'}
                      </p>
                      {!searched && (
                        <p className="text-xs mt-1.5 text-slate-400">Ou clique em "Novo Balancete" para enviar um arquivo</p>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <UploadBalanceteModal open={modalOpen} onOpenChange={handleModalClose} />

      {/* Confirm Download */}
      <AlertDialog open={!!confirmDownload} onOpenChange={() => setConfirmDownload(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Baixar arquivo original</AlertDialogTitle>
            <AlertDialogDescription>Deseja baixar o arquivo original deste balancete?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-teal-600 hover:bg-teal-700" onClick={() => { if (confirmDownload) handleBlobDownload(confirmDownload, 'download', 'download'); setConfirmDownload(null); }}>Baixar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Export */}
      <AlertDialog open={!!confirmExport} onOpenChange={() => setConfirmExport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exportar movimentos</AlertDialogTitle>
            <AlertDialogDescription>Deseja exportar os movimentos deste balancete em Excel?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-blue-600 hover:bg-blue-700" onClick={() => { if (confirmExport) handleBlobDownload(confirmExport, 'export-excel', 'export'); setConfirmExport(null); }}>Exportar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DevLayout>
  );
};

export default ControleBalancetes;
