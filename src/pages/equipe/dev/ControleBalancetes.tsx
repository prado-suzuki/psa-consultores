import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TABLE_NAMES, getApiUrl } from '@/config/api';
import { useApiAuth } from '@/hooks/useApiAuth';
import { toast } from '@/hooks/use-toast';
import DevLayout from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MonthYearPicker, monthYearToDateString } from '@/components/ui/month-year-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Filter, Search, Eraser, Plus, FileSpreadsheet, Download, FileDown, Loader2 } from 'lucide-react';
import { UploadBalanceteModal } from '@/components/equipe/dev/balancete/UploadBalanceteModal';

interface Balancete {
  id: string;
  id_contribuinte: string;
  contribuinte_nome?: string;
  periodo_inicio: string;
  periodo_fim: string;
  adicionado_por: string;
  created_at: string;
  [key: string]: unknown;
}

const ControleBalancetes = () => {
  const { fetchWithAuth } = useApiAuth();

  const [clienteId, setClienteId] = useState('');
  const [contribuinteId, setContribuinteId] = useState('');
  const [periodo, setPeriodo] = useState<{month: number;year: number;} | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [balancetes, setBalancetes] = useState<Balancete[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [downloading, setDownloading] = useState<Record<string, 'download' | 'export' | null>>({});

  // Fetch clientes
  const { data: clientes } = useQuery({
    queryKey: ['clientes-balancetes', TABLE_NAMES.cliente],
    queryFn: async () => {
      const { data, error } = await supabase.
      from(TABLE_NAMES.cliente).
      select('id, nome').
      eq('ativo', true).
      order('nome');
      if (error) throw error;
      return data;
    }
  });

  // Fetch contribuintes filtered by client
  const { data: contribuintes } = useQuery({
    queryKey: ['contribuintes-balancetes', TABLE_NAMES.contribuinte, clienteId],
    queryFn: async () => {
      let query = supabase.
      from(TABLE_NAMES.contribuinte).
      select('id, nome_razao_social, cliente_id').
      order('nome_razao_social');
      if (clienteId) query = query.eq('cliente_id', clienteId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const handleClear = () => {
    setClienteId('');
    setContribuinteId('');
    setPeriodo(null);
    setBalancetes([]);
    setSearched(false);
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
        const dtIni = monthYearToDateString(periodo, 'start');
        const dtFim = monthYearToDateString(periodo, 'end');
        if (dtIni) url += `&dt_ini=${dtIni}`;
        if (dtFim) url += `&dt_fim=${dtFim}`;
      }

      const response = await fetchWithAuth(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detail = errorData?.detail;
        const message = typeof detail === 'object' && detail?.error_message ?
        detail.error_message :
        typeof detail === 'string' ? detail : `Erro ${response.status}`;
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
        const message = typeof detail === 'object' && detail?.error_message ?
        detail.error_message :
        typeof detail === 'string' ? detail : `Erro ${response.status}`;
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
    // Refresh list after upload if contribuinte is selected
    if (!open && contribuinteId && searched) {
      handleSearch();
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const hasFilters = clienteId || contribuinteId || periodo;

  return (
    <DevLayout title="Controle de Balancetes" subtitle="Upload e consulta de balancetes contábeis">
      {/* Filters Card */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg text-primary">
            <Filter className="h-5 w-5 text-teal-600" />
            <span className="uppercase text-sm tracking-wider font-bold text-slate-800">Filtros de Busca</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Cliente */}
            <div className="col-span-4 space-y-2">
              <Label className="text-sm font-medium text-slate-700">Cliente</Label>
              <Select value={clienteId} onValueChange={(v) => {setClienteId(v);setContribuinteId('');}}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes?.map((c) =>
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Contribuinte */}
            <div className="col-span-4 space-y-2">
              <Label className="text-sm font-medium text-slate-700">Contribuinte</Label>
              <Select value={contribuinteId} onValueChange={setContribuinteId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione o contribuinte" />
                </SelectTrigger>
                <SelectContent>
                  {contribuintes?.map((c) =>
                  <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Período */}
            <div className="col-span-4 space-y-2">
              <Label className="text-sm font-medium text-slate-700">Período</Label>
              <MonthYearPicker value={periodo} onChange={setPeriodo} placeholder="Selecione o período" />
            </div>
          </div>

          {/* Action footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
            {hasFilters &&
            <Button variant="outline" onClick={handleClear} className="gap-2 text-red-600 border-red-300 hover:bg-red-50">
                <Eraser className="h-4 w-4" />
                Limpar filtros
              </Button>
            }
            <Button onClick={() => handleSearch()} disabled={loading} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white py-[20px] px-[15px] my-[5px] mx-px">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Balancetes</CardTitle>
          <Button onClick={() => setModalOpen(true)} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4" />
            Novo Balancete
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full">
            <Table className="text-xs">
              <TableHeader className="[&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-slate-700">
                <TableRow>
                  <TableHead>Período Início</TableHead>
                  <TableHead>Período Fim</TableHead>
                  <TableHead>Adicionado por</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ?
                <TableRow>
                   <TableCell colSpan={4} className="text-center py-12 text-slate-400">
                      <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-teal-500" />
                      <p className="text-sm font-medium">Buscando balancetes...</p>
                    </TableCell>
                  </TableRow> :
                balancetes.length > 0 ?
                balancetes.map((b) =>
                <TableRow key={b.id}>
                      <TableCell>{formatDate(b.periodo_inicio)}</TableCell>
                      <TableCell>{formatDate(b.periodo_fim)}</TableCell>
                      <TableCell>{b.adicionado_por || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={downloading[b.id] === 'download'}
                              onClick={() => handleBlobDownload(b.id, 'download', 'download')}>
                              
                                  {downloading[b.id] === 'download' ?
                              <Loader2 className="h-4 w-4 animate-spin" /> :
                              <Download className="h-4 w-4 text-teal-600" />}
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
                              className="h-8 w-8"
                              disabled={downloading[b.id] === 'export'}
                              onClick={() => handleBlobDownload(b.id, 'export-excel', 'export')}>
                              
                                  {downloading[b.id] === 'export' ?
                              <Loader2 className="h-4 w-4 animate-spin" /> :
                              <FileDown className="h-4 w-4 text-blue-600" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Exportar movimentos (Excel)</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                ) :

                <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-slate-400">
                      <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm font-medium">
                        {searched ? 'Nenhum balancete encontrado' : 'Selecione um contribuinte e clique em Buscar'}
                      </p>
                      {!searched &&
                    <p className="text-xs mt-1">Ou clique em "+ Novo Balancete" para enviar um arquivo</p>
                    }
                    </TableCell>
                  </TableRow>
                }
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <UploadBalanceteModal open={modalOpen} onOpenChange={handleModalClose} />
    </DevLayout>);

};

export default ControleBalancetes;