import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiUrl } from '@/config/api';
import { useApiAuth } from '@/hooks/useApiAuth';
import { toast } from '@/hooks/use-toast';
import type { EFDTipo } from '@/types/efd';

export type EfdExportStatus = 'idle' | 'starting' | 'processing' | 'completed' | 'error';

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  download_url?: string;
  url?: string;
  error?: string;
  progress?: number;
  file_name?: string;
}

interface UseEfdExportMachineOptions {
  arquivoId: string;
  idContribuinte: string;
  tipo: EFDTipo;
  onCompleted: () => void;
}

const downloadLink = (url: string, fileName: string) => {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
};

export function useEfdExportMachine({ arquivoId, idContribuinte, tipo, onCompleted }: UseEfdExportMachineOptions) {
  const { fetchWithAuth } = useApiAuth();
  const [status, setStatus] = useState<EfdExportStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompletedRef = useRef(onCompleted);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  const stop = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const resetVisual = useCallback(() => {
    setStatus('idle');
    setStatusMessage('');
    setJobId(null);
  }, []);

  useEffect(() => stop, [stop]);

  const complete = useCallback((url?: string, fileName = 'export.xlsx') => {
    setStatus('completed');
    setStatusMessage('Download pronto!');
    if (url) downloadLink(url, fileName);
    toast({ title: 'Exportação concluída', description: 'Arquivo Excel baixado com sucesso!' });
    setTimeout(() => onCompletedRef.current(), 1000);
  }, []);

  const fail = useCallback((statusText: string, toastText = statusText) => {
    setStatus('error');
    setStatusMessage(statusText);
    toast({ title: 'Erro na exportação', description: toastText, variant: 'destructive' });
  }, []);

  const checkJob = useCallback(async (id: string, signal: AbortSignal): Promise<JobStatus | null> => {
    try {
      const response = await fetchWithAuth(getApiUrl(`/api/v1/efd/exportar/status/${id}`), { signal });
      if (signal.aborted || !response.ok) return null;
      return await response.json() as JobStatus;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return null;
      console.error('Erro ao verificar status:', error);
      return null;
    }
  }, [fetchWithAuth]);

  const startPolling = useCallback((id: string, signal: AbortSignal) => {
    const poll = async () => {
      if (signal.aborted) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        return;
      }
      const result = await checkJob(id, signal);
      if (!result || signal.aborted) return;
      const url = result.download_url || result.url;
      if (result.status === 'completed' && url) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
        complete(url, result.file_name);
      } else if (result.status === 'failed') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
        fail(
          result.error || 'Erro na geração do arquivo',
          result.error || 'Falha ao gerar arquivo.',
        );
      } else if (result.progress !== undefined) {
        setStatusMessage(`Processando... ${Math.round(result.progress * 100)}%`);
      }
    };
    pollingRef.current = setInterval(poll, 2000);
    void poll();
  }, [checkJob, complete, fail]);

  const downloadStream = useCallback(async (response: Response) => {
    setStatus('processing');
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let blob: Blob;
    if (total && response.body) {
      let loaded = 0;
      const reader = response.body.getReader();
      const chunks: BlobPart[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        setStatusMessage(`Baixando... ${Math.round((loaded / total) * 100)}%`);
      }
      blob = new Blob(chunks, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } else {
      setStatusMessage('Baixando arquivo...');
      blob = await response.blob();
    }
    const url = URL.createObjectURL(blob);
    const fileName = response.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] ?? 'export.xlsx';
    downloadLink(url, fileName);
    URL.revokeObjectURL(url);
    complete();
  }, [complete]);

  const start = useCallback(async (selectedRegistros: Set<string>) => {
    if (selectedRegistros.size === 0) {
      toast({ title: 'Selecione registros', description: 'Selecione ao menos um registro para exportar.', variant: 'destructive' });
      return;
    }
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setStatus('starting');
    setStatusMessage('Iniciando geração do relatório...');
    try {
      const response = await fetchWithAuth(
        getApiUrl(`/api/v1/efd/${tipo}/${idContribuinte}/${arquivoId}/exportar`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registros: Array.from(selectedRegistros).map(code => code.replace('REG_', '')) }),
          signal,
        },
        300000,
      );
      if (signal.aborted) return;
      if (!response.ok) throw new Error('Falha ao iniciar exportação');
      if ((response.headers.get('content-type') || '').includes('json')) {
        const data = await response.json() as { url?: string; download_url?: string; file_name?: string; job_id?: string; id?: string };
        const url = data.url || data.download_url;
        if (url) return complete(url, data.file_name);
        const nextJobId = data.job_id || data.id;
        if (!nextJobId) throw new Error('Resposta inesperada do servidor');
        setJobId(nextJobId);
        setStatus('processing');
        setStatusMessage('Gerando arquivo no servidor...');
        startPolling(nextJobId, signal);
        return;
      }
      await downloadStream(response);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Erro ao exportar:', error);
      fail('Erro ao iniciar exportação', 'Não foi possível iniciar a geração do arquivo.');
    }
  }, [arquivoId, complete, downloadStream, fail, fetchWithAuth, idContribuinte, startPolling, tipo]);

  return { status, statusMessage, jobId, start, resetVisual, cancel: stop };
}
