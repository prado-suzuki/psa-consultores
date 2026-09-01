import { useState, useEffect, useRef, DragEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiAuth } from '@/hooks/useApiAuth';
import { useDomainUploadBalancete } from '@/hooks/useDomainUploadBalancete';
import { getApiUrl } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MonthRangePicker, type MonthRange } from '@/components/ui/month-range-picker';
import { monthRangeToDateStrings } from '@/components/ui/month-range-picker.utils';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, AlertCircle, FileSpreadsheet, X } from 'lucide-react';

const DESCRICAO_MAX = 500;

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];

// O processamento do balancete (conversao + upload no data lake) e assincrono:
// o POST retorna 202 com status `processing` e o resultado e acompanhado via
// polling do endpoint de status ate ficar `success` ou `error`.
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 6 * 60 * 1000;

type BalanceteStatus = 'processing' | 'success' | 'error' | 'timeout';

function isValidFile(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof error.message === 'string'
  ) {
    return error.message;
  }
  return undefined;
}

interface UploadBalanceteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillData?: {
    clienteId: string;
    contribuinteId: string;
    periodo: MonthRange | null;
  } | null;
}

const STORAGE_KEY = 'last-balancete-upload';

export const UploadBalanceteModal = ({ open, onOpenChange, prefillData }: UploadBalanceteModalProps) => {
  const { user } = useAuth();
  const { fetchWithAuth } = useApiAuth();

  const [clienteId, setClienteId] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s).clienteId || '' : ''; } catch { return ''; }
  });
  const [contribuinteId, setContribuinteId] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s).contribuinteId || '' : ''; } catch { return ''; }
  });
  const [periodo, setPeriodo] = useState<MonthRange | null>(null);
  const [descricao, setDescricao] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [detalhamento, setDetalhamento] = useState<boolean | null>(null);
  const [showDetalhamentoPrompt, setShowDetalhamentoPrompt] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prefillDataRef = useRef(prefillData);
  prefillDataRef.current = prefillData;

  const {
    clientes,
    contribuintes,
    buscarConfig,
    salvarDetalhamento,
  } = useDomainUploadBalancete({ open, clienteId, contribuinteId });

  // Pré-preenche os campos a partir dos filtros de busca quando o modal abre
  // (usado quando a consulta não retornou balancetes e o usuário decide cadastrar)
  useEffect(() => {
    if (!open) return;
    const p = prefillDataRef.current;
    if (!p) return;
    if (p.clienteId) setClienteId(p.clienteId);
    if (p.contribuinteId) setContribuinteId(p.contribuinteId);
    if (p.periodo) setPeriodo(p.periodo);
  }, [open]);

  useEffect(() => {
    if (clienteId && contribuintes && contribuintes.length === 1 && !contribuinteId) {
      setContribuinteId(contribuintes[0].id);
    }
  }, [clienteId, contribuintes, contribuinteId]);

  // Fetch config when contribuinte changes or modal opens
  useEffect(() => {
    if (!open || !contribuinteId) {
      if (!contribuinteId) {
        setDetalhamento(null);
        setShowDetalhamentoPrompt(false);
      }
      return;
    }

    const fetchConfig = async () => {
      try {
        const data = await buscarConfig(contribuinteId);

        if (data && data.balancete_detalhamento !== null) {
          setDetalhamento(data.balancete_detalhamento);
          setShowDetalhamentoPrompt(false);
        } else {
          setDetalhamento(null);
          setShowDetalhamentoPrompt(true);
        }
      } catch (error) {
        console.error('Erro ao buscar config:', error);
        setDetalhamento(null);
        setShowDetalhamentoPrompt(false);
      }
    };

    fetchConfig();
  }, [buscarConfig, contribuinteId, open]);

  const handleDetalhamentoChoice = async (value: boolean) => {
    setSavingConfig(true);
    try {
      await salvarDetalhamento({ contribuinteId, value });
      setDetalhamento(value);
      setShowDetalhamentoPrompt(false);
    } catch (error) {
      toast({ title: 'Erro ao salvar configuração', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!isValidFile(selectedFile)) {
      toast({ title: 'Formato inválido', description: 'Apenas arquivos .xlsx e .xls são aceitos.', variant: 'destructive' });
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  };

  const resetForm = () => {
    setPeriodo(null);
    setDescricao('');
    setFile(null);
    setDetalhamento(null);
    setShowDetalhamentoPrompt(false);
    setDragging(false);
    setShowConfirm(false);
    setProcessing(false);
  };

  // Faz polling do status de processamento do balancete ate um estado terminal
  // (success/error) ou estourar o tempo limite (timeout).
  const pollBalanceteStatus = async (
    idBalancete: string,
  ): Promise<{ status: BalanceteStatus; mensagem?: string | null }> => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      try {
        const res = await fetchWithAuth(
          getApiUrl(`/api/v1/contabil/balancetes/${idBalancete}/status`),
        );
        if (!res.ok) continue; // tolera transientes; segue tentando ate o deadline
        const data = await res.json();
        if (data?.status === 'success' || data?.status === 'error') {
          return { status: data.status, mensagem: data.status_mensagem };
        }
      } catch {
        // erro transiente de rede: ignora e tenta de novo no proximo ciclo
      }
    }
    return { status: 'timeout' };
  };

  const handleClose = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  const handleSubmit = async () => {
    if (!contribuinteId || !periodo || !file || detalhamento === null || !descricao.trim()) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const dates = monthRangeToDateStrings(periodo);
      const formData = new FormData();
      formData.append('id_contribuinte', contribuinteId);
      formData.append('periodo_inicio', dates.start);
      formData.append('periodo_fim', dates.end);
      formData.append('adicionado_por', user?.email || '');
      formData.append('detalhamento', String(detalhamento));
      formData.append('descricao', descricao.trim());
      formData.append('file', file);

      // 1) Cria o balancete: retorna 202 com { id_balancete, status: 'processing' }
      const response = await fetchWithAuth(getApiUrl('/api/v1/contabil/balancetes'), {
        method: 'POST',
        body: formData,
      }, 120000);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detail = errorData?.detail;
        const message = typeof detail === 'object' && detail?.error_message
          ? detail.error_message
          : typeof detail === 'string'
            ? detail
            : `Erro ${response.status}`;
        throw new Error(message);
      }

      const created = await response.json().catch(() => null);
      const idBalancete: string | undefined = created?.id_balancete;
      if (!idBalancete) {
        throw new Error('Resposta invalida do servidor ao criar o balancete.');
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify({ clienteId, contribuinteId }));

      // 2) Processamento assincrono: faz polling do status ate concluir
      setProcessing(true);
      const result = await pollBalanceteStatus(idBalancete);

      if (result.status === 'success') {
        toast({ title: 'Balancete processado com sucesso!' });
        handleClose(false);
      } else if (result.status === 'error') {
        // Mantem o modal aberto para o usuario corrigir e reenviar
        throw new Error(result.mensagem || 'Falha ao processar o balancete.');
      } else {
        // timeout: ainda processando — informa e fecha (a lista atualiza depois)
        toast({
          title: 'Processamento em andamento',
          description: 'O balancete ainda esta sendo processado. Atualize a lista em instantes.',
        });
        handleClose(false);
      }
    } catch (error) {
      toast({ title: 'Erro ao enviar balancete', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSubmitting(false);
      setProcessing(false);
    }
  };

  const isValid = contribuinteId && periodo && file && detalhamento !== null && descricao.trim().length > 0;

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Novo Balancete</DialogTitle>
          <DialogDescription>Arraste o arquivo e preencha os dados para upload.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-2">
          {/* Left — Drop zone */}
          <div className="md:col-span-5">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer
                transition-colors h-full min-h-[280px]
                ${dragging ? 'border-primary/50 bg-primary/5' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'}
                ${file ? 'border-primary/30 bg-primary/5' : ''}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                  e.target.value = '';
                }}
              />
              {file ? (
                <div className="flex flex-col items-center gap-3 px-4 text-center">
                  <FileSpreadsheet className="h-12 w-12 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 break-all">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 gap-1"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  >
                    <X className="h-3 w-3" />
                    Remover
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 px-4 text-center">
                  <Upload className="h-10 w-10 text-slate-300" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">Arraste o arquivo aqui</p>
                    <p className="text-xs text-slate-400 mt-1">ou clique para selecionar</p>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">.xlsx ou .xls</p>
                </div>
              )}
            </div>
          </div>

          {/* Right — Form fields */}
          <div className="md:col-span-7 space-y-4">
            {/* Cliente */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Cliente</Label>
              <Select value={clienteId} onValueChange={(v) => { setClienteId(v); setContribuinteId(''); }}>
                <SelectTrigger className="h-11 rounded-lg">
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
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Contribuinte</Label>
              <Select value={contribuinteId} onValueChange={setContribuinteId} disabled={!clienteId}>
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue placeholder="Selecione o contribuinte" />
                </SelectTrigger>
                <SelectContent>
                  {contribuintes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Detalhamento prompt */}
            {showDetalhamentoPrompt && contribuinteId && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <p className="text-sm text-warning">O balancete deste contribuinte possui detalhamento?</p>
                </div>
                <div className="flex gap-2 ml-6">
                  <Button size="sm" variant="outline" disabled={savingConfig} onClick={() => handleDetalhamentoChoice(true)} className="text-xs">Sim</Button>
                  <Button size="sm" variant="outline" disabled={savingConfig} onClick={() => handleDetalhamentoChoice(false)} className="text-xs">Não</Button>
                  {savingConfig && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </div>
            )}

            {/* Detalhamento switch */}
            {detalhamento !== null && contribuinteId && (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <Label htmlFor="detalhamento-switch" className="text-sm text-slate-600">Detalhamento</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{detalhamento ? 'Sim' : 'Não'}</span>
                  <Switch id="detalhamento-switch" checked={detalhamento} onCheckedChange={setDetalhamento} />
                </div>
              </div>
            )}

            {/* Período */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Período</Label>
              <MonthRangePicker value={periodo} onChange={setPeriodo} placeholder="Selecione o período" />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="descricao-balancete" className="text-sm font-medium text-slate-600">
                  Descrição <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-slate-400">{descricao.length}/{DESCRICAO_MAX}</span>
              </div>
              <Textarea
                id="descricao-balancete"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value.slice(0, DESCRICAO_MAX))}
                placeholder="Ex.: Balancete janeiro/2025 - revisado"
                rows={3}
                className="resize-none rounded-lg"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={() => setShowConfirm(true)} disabled={!isValid || submitting} className="gap-2 bg-primary hover:bg-primary/90 text-white">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {processing ? 'Processando...' : submitting ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Confirm upload */}
    <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar envio do balancete</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><strong>Contribuinte:</strong> {contribuintes?.find(c => c.id === contribuinteId)?.nome_razao_social}</p>
              {periodo && <p><strong>Período:</strong> {`${String(periodo.start.month + 1).padStart(2, '0')}/${periodo.start.year} — ${String(periodo.end.month + 1).padStart(2, '0')}/${periodo.end.year}`}</p>}
              {descricao.trim() && <p><strong>Descrição:</strong> {descricao.trim()}</p>}
              {file && <p><strong>Arquivo:</strong> {file.name}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-primary hover:bg-primary/90" onClick={() => { setShowConfirm(false); handleSubmit(); }}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
