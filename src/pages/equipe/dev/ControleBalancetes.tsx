import { useState, useCallback, useMemo, useEffect } from 'react';
import { getApiUrl } from '@/config/api';
import { useApiAuth } from '@/hooks/useApiAuth';
import { useDomainControleBalancetes } from '@/hooks/useDomainControleBalancetes';
import { toast } from '@/hooks/use-toast';
import DevLayout from '@/components/equipe/dev/DevLayout';
import { DevPageHeader } from '@/components/equipe/dev/DevPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SelecaoDeCliente } from '@/components/equipe/selecao/SelecaoDeCliente';
import { SelecaoDeContribuinte } from '@/components/equipe/selecao/SelecaoDeContribuinte';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MonthRangePicker, type MonthRange } from '@/components/ui/month-range-picker';
import { monthRangeToDateStrings } from '@/components/ui/month-range-picker.utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
// `FileDown` saiu em 11/09/2026 e o `FileSpreadsheet` ocupou o lugar dele. Os dois
// que a tela usava — `Download` e `FileDown` — são a MESMA ideia desenhada duas
// vezes, uma seta para baixo, e só se distinguiam pela cor: azul de estoque num,
// âncora no outro. Tirar a cor sem trocar o ícone deixaria os dois idênticos.
// Agora um diz QUE BAIXA (a seta) e o outro diz O QUE SAI (a grade da planilha),
// e a grade separa em 15px mesmo os dois em `foreground`. O `FileSpreadsheet` já
// estava importado aqui, e é o que as telas irmãs do módulo usam para planilha.
import { Filter, Search, Plus, FileSpreadsheet, Download, Loader2, Info, Trash2 } from 'lucide-react';
import { UploadBalanceteModal } from '@/components/equipe/dev/balancete/UploadBalanceteModal';
import { Checkbox } from '@/components/ui/checkbox';
import { RequiredMark } from '@/components/ui/required-mark';
import { BotaoLimparFiltros } from '@/components/ui/BotaoLimparFiltros';

// --- Tooltip helpers ---
const FieldTooltip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
    </TooltipTrigger>
    <TooltipContent side="top" className="font-normal normal-case tracking-normal text-xs text-center max-w-[220px]">
      {text}
    </TooltipContent>
  </Tooltip>
);

// --- Tooltip texts ---
const TOOLTIPS = {
  cliente: "Filtra os balancetes por cliente ou grupo.",
  contribuinte: "CNPJ/CPF vinculado ao cliente. Obrigatório para a busca.",
  periodo: "Define o período contábil da consulta.",
} as const;

interface Balancete {
  id: string;
  id_contribuinte: string;
  contribuinte_nome?: string;
  periodo_inicio: string;
  periodo_fim: string;
  adicionado_por: string;
  descricao: string;
  created_at: string;
  qtd_linhas?: number;
  total_linhas?: number;
  [key: string]: unknown;
}

interface BalancetesResponse {
  balancetes?: Balancete[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const getApiErrorMessage = (payload: unknown, status: number) => {
  const detail = isRecord(payload) ? payload.detail : undefined;

  if (isRecord(detail) && typeof detail.error_message === 'string') {
    return detail.error_message;
  }

  return typeof detail === 'string' ? detail : `Erro ${status}`;
};

const getThrownErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return isRecord(error) && typeof error.message === 'string' ? error.message : undefined;
};

const COL_COUNT = 6;

const ControleBalancetes = () => {
  const { fetchWithAuth } = useApiAuth();

  const [clienteId, setClienteId] = useState('');
  const [contribuinteId, setContribuinteId] = useState('');
  const { clientes, contribuintes } = useDomainControleBalancetes(clienteId);
  const [periodo, setPeriodo] = useState<MonthRange | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [balancetes, setBalancetes] = useState<Balancete[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [downloading, setDownloading] = useState<Record<string, 'download' | 'export' | 'delete' | null>>({});
  const [confirmDownload, setConfirmDownload] = useState<string | null>(null);
  const [confirmExport, setConfirmExport] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
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
        const errorData: unknown = await response.json().catch(() => null);
        throw new Error(getApiErrorMessage(errorData, response.status));
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
    } catch (err: unknown) {
      toast({ title: type === 'download' ? 'Erro ao baixar arquivos' : 'Erro ao exportar Excel', description: getThrownErrorMessage(err), variant: 'destructive' });
    } finally {
      setDownloading((prev) => ({ ...prev, [bulkKey]: null }));
    }
  };

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
    if (!overrideContribuinteId) {
      const missing: string[] = [];
      if (!clienteId) missing.push("Cliente");
      if (!contribuinteId) missing.push("Contribuinte");
      if (!periodo) missing.push("Período");
      if (missing.length > 0) {
        toast({
          title: 'Preenchimento obrigatório',
          description: `Por favor, preencha ${missing.join(", ")} para realizar a busca.`,
          variant: 'destructive',
        });
        return;
      }
    }
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
        const errorData: unknown = await response.json().catch(() => null);
        throw new Error(getApiErrorMessage(errorData, response.status));
      }

      const data: unknown = await response.json();
      const list = Array.isArray(data)
        ? data as Balancete[]
        : isRecord(data) && Array.isArray(data.balancetes)
          ? (data as BalancetesResponse).balancetes ?? []
          : [];
      setBalancetes(list.map((b) => ({
        ...b,
        id: (typeof b.id_balancete === 'string' && b.id_balancete) || b.id,
      })));
    } catch (err: unknown) {
      toast({ title: 'Erro ao buscar balancetes', description: getThrownErrorMessage(err), variant: 'destructive' });
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
        const errorData: unknown = await response.json().catch(() => null);
        throw new Error(getApiErrorMessage(errorData, response.status));
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
    } catch (err: unknown) {
      toast({ title: type === 'download' ? 'Erro ao baixar arquivo' : 'Erro ao exportar Excel', description: getThrownErrorMessage(err), variant: 'destructive' });
    } finally {
      setDownloading((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleDelete = async (id: string) => {
    setDownloading((prev) => ({ ...prev, [id]: 'delete' }));
    try {
      const response = await fetchWithAuth(getApiUrl(`/api/v1/contabil/balancetes/${id}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData: unknown = await response.json().catch(() => null);
        throw new Error(getApiErrorMessage(errorData, response.status));
      }

      const data = await response.json().catch(() => ({})) as { file_deleted?: boolean };

      setBalancetes((prev) => prev.filter((b) => b.id !== id));
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      toast({
        title: 'Balancete deletado',
        description: data?.file_deleted === false
          ? 'Registros removidos, mas o arquivo original pode ter ficado órfão no storage.'
          : 'Registros e arquivo original removidos com sucesso.',
      });
    } catch (err: unknown) {
      toast({ title: 'Erro ao deletar balancete', description: getThrownErrorMessage(err), variant: 'destructive' });
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

  const filtrosAtivos = [clienteId, contribuinteId, periodo].filter(Boolean).length;

  return (
    <DevLayout title="Controle de Balancetes" subtitle="Upload e consulta de balancetes contábeis">
      <DevPageHeader
        description="A ferramenta **Controle de Balancetes** centraliza a busca e o gerenciamento dos Balancetes Contábeis da base de dados. Utilize os filtros abaixo para consultar arquivos específicos ou analisar períodos inteiros, permitindo a visualização detalhada de contas e saldos diretamente em tela, o acompanhamento da evolução contábil e a exportação dos dados consolidados em formato Excel (.xlsx)."
        manualUrl="https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/balancete/"
      />
      {/* Filters Card */}
      <Card className="mb-8 rounded-2xl border-border shadow-sm">
        <CardHeader className="pb-2 p-6 md:p-8 md:pb-4">
          <CardTitle className="flex items-center gap-2.5">
            <Filter className="h-5 w-5 text-primary" />
            <span className="uppercase text-xs tracking-widest font-bold text-muted-foreground">Filtros de Busca</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6 md:px-8 md:pb-8 pt-0">
          <div className="grid grid-cols-12 gap-6">
            {/* Cliente */}
            <div className="col-span-4 space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Cliente <RequiredMark /></Label>
              <SelecaoDeCliente
                clientes={clientes}
                value={clienteId}
                onChange={(v) => { setClienteId(v); setContribuinteId(''); }}
                placeholder="Selecione o cliente"
                className="w-full min-w-0 h-11 rounded-lg"
              />
            </div>

            {/* Contribuinte */}
            <div className="col-span-4 space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Contribuinte <RequiredMark /></Label>
              <SelecaoDeContribuinte
                contribuintes={contribuintes}
                value={contribuinteId}
                onChange={setContribuinteId}
                placeholder="Selecione o contribuinte"
                className="w-full min-w-0 h-11 rounded-lg"
              />
            </div>

            {/* Período */}
            <div className="col-span-4 space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Período <RequiredMark /></Label>
              <MonthRangePicker value={periodo} onChange={setPeriodo} placeholder="Selecione o período" />
            </div>
          </div>

          {/* Action footer */}
          <div className="flex items-center justify-between pt-5 border-t border-border">
            <Button onClick={() => setModalOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 text-white rounded-lg">
              <Plus className="h-4 w-4" />
              Novo Balancete
            </Button>
            <div className="flex items-center gap-3">
              <BotaoLimparFiltros quantidade={filtrosAtivos} onClick={handleClear} className="rounded-lg" />
              <Button onClick={() => handleSearch()} disabled={loading} className="gap-2 bg-primary hover:bg-primary/90 text-white rounded-lg py-2.5 px-5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="p-6 md:px-8 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">Balancetes</CardTitle>
          {/*
            A barra de lote só existe quando há seleção, e aí ela diz QUANTOS.

            Antes as duas ações moravam aqui o tempo todo, desabilitadas — dois
            botões apagados ocupando o cabeçalho em 100% das visitas para servir
            à minoria delas. E a contagem vinha numa pílula colada ao lado do
            rótulo, que só aparecia depois de selecionar: quem lia "Baixar
            original" não sabia se ia baixar um ou trinta até olhar a pílula.
            Agora o número está na frase, e a pílula deixou de existir — foi o
            último consumidor de `ui/badge` nesta tela.

            Ação de UM balancete mora na linha dele (os ícones `ghost` da coluna
            Ações), que é onde a pessoa já está olhando quando decide.

            Nenhuma classe de cor: `variant="outline"` já se enche da âncora da
            área no hover (`hover:bg-accent`) — é a mesma receita que as Correções
            SPED consolidaram em `classesDeBotao.ts` depois de achá-la copiada
            sete vezes. O "Exportar" estava em azul de estoque, inventando um
            terceiro nível que o vocabulário do `ui/button` não tem.
          */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={downloading['__bulk__'] === 'download'}
                onClick={() => handleBulkAction('batch-download', 'download')}
              >
                {downloading['__bulk__'] === 'download' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Baixar {selectedIds.size} {selectedIds.size === 1 ? 'original' : 'originais'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={downloading['__bulk__'] === 'export'}
                onClick={() => handleBulkAction('batch-export-excel', 'export')}
              >
                {downloading['__bulk__'] === 'export' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                Exportar {selectedIds.size} em Excel
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-6 pt-0 md:px-8 md:pb-8">
          <div className="overflow-x-auto w-full">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={handleToggleAll} aria-label="Selecionar todos" />
                  </TableHead>
                  <TableHead className="uppercase tracking-wider text-[11px] font-semibold w-[340px] max-w-[340px]">Descrição</TableHead>
                  <TableHead className="uppercase tracking-wider text-[11px] font-semibold w-32 whitespace-nowrap">Período Início</TableHead>
                  <TableHead className="uppercase tracking-wider text-[11px] font-semibold w-32 whitespace-nowrap">Período Fim</TableHead>
                  <TableHead className="uppercase tracking-wider text-[11px] font-semibold w-72 whitespace-nowrap">Adicionado por</TableHead>
                  <TableHead className="uppercase tracking-wider text-[11px] font-semibold text-center w-36">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={COL_COUNT} className="text-center py-16 text-muted-foreground">
                      <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin text-primary" />
                      <p className="text-sm font-medium text-muted-foreground">Buscando balancetes...</p>
                    </TableCell>
                  </TableRow>
                ) : balancetes.length > 0 ? (
                  balancetes.map((b, index) => (
                    <TableRow key={b.id} className="border-border hover:bg-muted/60">
                      <TableCell>
                        <Checkbox checked={selectedIds.has(b.id)} onCheckedChange={() => handleToggleItem(b.id)} aria-label={`Selecionar balancete ${index + 1}`} />
                      </TableCell>
                      <TableCell className="text-foreground w-[340px] max-w-[340px]">
                        {b.descricao ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block truncate cursor-help">{b.descricao}</span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[360px] whitespace-pre-wrap break-words">
                                {b.descricao}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-foreground">{formatDate(b.periodo_inicio)}</TableCell>
                      <TableCell className="text-foreground">{formatDate(b.periodo_fim)}</TableCell>
                      <TableCell className="text-foreground">{b.adicionado_por || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-primary/5"
                                  disabled={downloading[b.id] === 'download'}
                                  onClick={() => setConfirmDownload(b.id)}
                                >
                                  {downloading[b.id] === 'download' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4 text-primary" />
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
                                  className="h-8 w-8 rounded-lg hover:bg-primary/5"
                                  disabled={downloading[b.id] === 'export'}
                                  onClick={() => setConfirmExport(b.id)}
                                >
                                  {downloading[b.id] === 'export' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Exportar movimentos (Excel)</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-destructive/10"
                                  disabled={downloading[b.id] === 'delete'}
                                  onClick={() => setConfirmDelete(b.id)}
                                >
                                  {downloading[b.id] === 'delete' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Deletar balancete</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={COL_COUNT} className="text-center py-16 text-muted-foreground">
                      <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                      <p className="text-sm font-medium text-muted-foreground">
                        {searched ? 'Nenhum balancete encontrado' : 'Selecione um contribuinte e clique em Buscar'}
                      </p>
                      {!searched && (
                        <p className="text-xs mt-1.5 text-muted-foreground">Ou clique em "Novo Balancete" para enviar um arquivo</p>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <UploadBalanceteModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        prefillData={searched && !loading && balancetes.length === 0
          ? { clienteId, contribuinteId, periodo }
          : null}
      />

      {/* Confirm Download */}
      <AlertDialog open={!!confirmDownload} onOpenChange={() => setConfirmDownload(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Baixar arquivo original</AlertDialogTitle>
            <AlertDialogDescription>Deseja baixar o arquivo original deste balancete?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-primary hover:bg-primary/90" onClick={() => { if (confirmDownload) handleBlobDownload(confirmDownload, 'download', 'download'); setConfirmDownload(null); }}>Baixar</AlertDialogAction>
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
            <AlertDialogAction className="bg-primary hover:bg-primary/90" onClick={() => { if (confirmExport) handleBlobDownload(confirmExport, 'export-excel', 'export'); setConfirmExport(null); }}>Exportar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar balancete</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>irreversível</strong>. Todos os registros deste balancete serão removidos do banco e o arquivo original será apagado do storage. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (confirmDelete) handleDelete(confirmDelete); setConfirmDelete(null); }}>Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DevLayout>
  );
};

export default ControleBalancetes;
