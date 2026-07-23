import { useState } from 'react';
import { getApiUrl } from '@/config/api';
import { useApiAuth } from '@/hooks/useApiAuth';
import { toast } from '@/hooks/use-toast';
import type { EFDArquivo } from '@/types/efd';

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = fileName;
  document.body.appendChild(anchor); anchor.click(); document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export function useEfdExportDownloads() {
  const { fetchWithAuth } = useApiAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const downloadOne = async (arquivo: EFDArquivo) => {
    setDownloadingId(arquivo.ID_ARQUIVO);
    try {
      const response = await fetchWithAuth(getApiUrl(`/api/v1/query/download/efd/icms/arquivo/${encodeURIComponent(arquivo.ID_ARQUIVO)}`), {}, 60000);
      if (!response.ok) throw new Error(`Erro ${response.status}: Falha ao baixar arquivo`);
      const blob = await response.blob();
      if (!blob.size) throw new Error('Arquivo vazio retornado pelo servidor');
      const fileName = `EFD_ICMS_${arquivo.CNPJ}_${arquivo.DT_INI.replace(/-/g, '')}.txt`;
      saveBlob(blob, fileName);
      toast({ title: 'Download concluído', description: `Arquivo ${fileName} baixado com sucesso.` });
    } catch (error) {
      toast({ title: 'Erro no download', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' });
    } finally { setDownloadingId(null); }
  };
  const downloadAll = async (idContribuinte: string, cnpj: string, inicio: string, fim: string) => {
    if (!idContribuinte) return;
    setDownloadingAll(true);
    try {
      const url = new URL(getApiUrl(`/api/v1/query/download/efd/icms/${idContribuinte}`));
      if (inicio) url.searchParams.set('data_inicio', inicio);
      if (fim) url.searchParams.set('data_fim', fim);
      const response = await fetchWithAuth(url.toString(), {}, 60000);
      if (!response.ok) {
        if (response.headers.get('Content-Type')?.includes('application/json')) {
          const data = await response.json().catch(() => ({})) as { error_message?: string };
          throw new Error(data.error_message || `Erro ${response.status}`);
        }
        throw new Error(`Erro ${response.status} ao baixar arquivos`);
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error('Arquivo vazio recebido do servidor');
      const isZip = response.headers.get('Content-Type')?.includes('application/zip');
      let fileName = isZip ? `EFD_ICMS_${cnpj}.zip` : `EFD_ICMS_${cnpj}.txt`;
      const match = response.headers.get('Content-Disposition')?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match?.[1]) fileName = match[1].replace(/['"]/g, '');
      saveBlob(blob, fileName);
      const found = response.headers.get('X-Files-Found');
      const missing = response.headers.get('X-Files-Missing');
      const description = found && missing && parseInt(missing) > 0 ? `${found} arquivo(s) baixado(s), ${missing} não encontrado(s) no storage.` : found ? `${found} arquivo(s) baixado(s) com sucesso.` : `Arquivo ${fileName} (${(blob.size / 1024).toFixed(1)} KB) baixado.`;
      toast({ title: 'Download concluído', description });
    } catch (error) {
      console.error('Erro ao baixar todos:', error);
      toast({ title: 'Erro no download', description: error instanceof Error ? error.message : 'Não foi possível baixar os arquivos.', variant: 'destructive' });
    } finally { setDownloadingAll(false); }
  };
  return { downloadingId, downloadingAll, downloadOne, downloadAll };
}
