import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config/api';
import { useApiAuth } from '@/hooks/useApiAuth';
import { useToast } from '@/hooks/use-toast';

type ExportStatus = 'idle' | 'starting' | 'processing' | 'completed' | 'error';

interface ExportInput {
  contribuinteId: string;
  startDate: string;
  endDate: string;
  pendingDecisionsCount: number;
}

function downloadFromUrl(url: string, fileName: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
}

export function useProcessoDifalExport() {
  const { fetchWithAuth } = useApiAuth();
  const { toast } = useToast();
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [exportMessage, setExportMessage] = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (abortRef.current) abortRef.current.abort();
    },
    [],
  );

  const exportMutation = useMutation<void, Error, ExportInput>({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ contribuinteId, startDate, endDate }) => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (abortRef.current) abortRef.current.abort();
      setExportStatus('starting');
      setExportMessage('Iniciando exportação...');
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/v1/ncm/calculo-difal/exportar/${contribuinteId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data_inicio: startDate, data_fim: endDate }),
        },
        300000,
      );
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(errorData.detail || 'Erro ao iniciar exportação');
      }
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('json')) {
        const data = (await response.json()) as {
          url?: string;
          download_url?: string;
          file_name?: string;
          job_id?: string;
          id?: string;
        };
        const downloadUrl = data.url || data.download_url;
        if (downloadUrl) {
          downloadFromUrl(downloadUrl, data.file_name || 'DIFAL_export.xlsx');
          setExportStatus('idle');
          toast({
            title: 'Exportação concluída',
            description: 'O download iniciará automaticamente.',
          });
          return;
        }
        const jobId = data.job_id || data.id;
        if (jobId) {
          setExportStatus('processing');
          setExportMessage('Processando arquivo...');
          const controller = new AbortController();
          abortRef.current = controller;
          pollingRef.current = setInterval(async () => {
            try {
              const statusRes = await fetchWithAuth(
                `${API_BASE_URL}/api/v1/ncm/calculo-difal/exportar/status/${jobId}`,
                { signal: controller.signal },
              );
              if (!statusRes.ok) {
                const errorData = (await statusRes.json().catch(() => ({}))) as { detail?: string };
                throw new Error(errorData.detail || `Erro ${statusRes.status}`);
              }
              const statusData = (await statusRes.json()) as {
                status?: string;
                download_url?: string;
                url?: string;
                file_name?: string;
                message?: string;
                error?: string;
              };
              if (statusData.status === 'completed') {
                if (pollingRef.current) clearInterval(pollingRef.current);
                pollingRef.current = null;
                const url = statusData.download_url || statusData.url;
                if (url) {
                  downloadFromUrl(url, statusData.file_name || 'DIFAL_export.xlsx');
                  toast({
                    title: 'Exportação concluída',
                    description: 'O download iniciará automaticamente.',
                  });
                }
                setExportStatus('idle');
              } else if (statusData.status === 'failed' || statusData.status === 'error') {
                if (pollingRef.current) clearInterval(pollingRef.current);
                pollingRef.current = null;
                toast({
                  title: 'Erro na exportação',
                  description:
                    statusData.message || statusData.error || 'Falha ao gerar o arquivo.',
                  variant: 'destructive',
                });
                setExportStatus('idle');
              }
            } catch (error) {
              if ((error as Error).name === 'AbortError') return;
              console.error('[DIFAL Export] Polling error:', error);
            }
          }, 2000);
          return;
        }
        throw new Error('Resposta inesperada do servidor');
      }
      setExportStatus('processing');
      setExportMessage('Baixando arquivo...');
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
          setExportMessage(`Baixando... ${Math.round((loaded / total) * 100)}%`);
        }
        blob = new Blob(chunks, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      } else blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const fileName =
        response.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] ??
        'DIFAL_export.xlsx';
      downloadFromUrl(url, fileName);
      URL.revokeObjectURL(url);
      setExportStatus('idle');
      toast({ title: 'Exportação concluída', description: 'O download iniciará automaticamente.' });
    },
    onError: (error) => {
      setExportStatus('idle');
      toast({
        title: 'Erro na exportação',
        description: error.message || 'Erro ao exportar dados',
        variant: 'destructive',
      });
    },
  });

  const exportExcel = (input: ExportInput) => {
    if (!input.contribuinteId || !input.startDate || !input.endDate) {
      toast({
        title: 'Filtros incompletos',
        description: 'Selecione contribuinte e período para exportar.',
        variant: 'destructive',
      });
      return;
    }
    if (input.pendingDecisionsCount > 0) {
      toast({
        title: 'Decisões não salvas',
        description: 'Salve as alterações antes de exportar.',
        variant: 'destructive',
      });
      return;
    }
    exportMutation.mutate(input);
  };

  return {
    exportExcel,
    exportStatus,
    exportMessage,
    isExporting: exportStatus === 'starting' || exportStatus === 'processing',
  };
}
