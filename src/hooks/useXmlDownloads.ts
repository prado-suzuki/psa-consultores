import { useState } from "react";
import { API_BASE_URL } from "@/config/api";
import { useApiAuth } from "@/hooks/useApiAuth";
import { toast } from "@/hooks/use-toast";
import { batchFilename, onlyDigits } from "@/lib/consultaXmls";
import type { DocumentoXml, TipoMovimentoXml } from "@/types/consultaXmls";

interface BatchOptions {
  contribuinteId: string;
  startDate: string;
  endDate: string;
  tipoDocumento: DocumentoXml;
  tipoMov: TipoMovimentoXml;
  emitente: string;
  destinatario: string;
}

function saveBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

export function useXmlDownloads() {
  const { fetchWithAuth } = useApiAuth();
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [downloadingBatch, setDownloadingBatch] = useState(false);

  const downloadSingle = async (chave: string, docType: DocumentoXml) => {
    setDownloadingKey(chave);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/query/download/${docType}/xml/${encodeURIComponent(chave)}`, {
        method: "GET", headers: { Accept: "application/xml" },
      });
      if (!response.ok) throw new Error(`Erro ao baixar XML: ${response.status}`);
      saveBlob(new Blob([await response.text()], { type: "application/xml" }), `${chave}.xml`);
      toast({ title: "Download concluído", description: "XML baixado com sucesso." });
    } catch (error) {
      console.error("Erro ao baixar XML:", error);
      toast({ title: "Erro no download", description: (error as Error).message, variant: "destructive" });
    } finally {
      setDownloadingKey(null);
    }
  };

  const downloadBatch = async (options: BatchOptions) => {
    if (!options.contribuinteId || !options.startDate) return;
    setDownloadingBatch(true);
    try {
      const params = new URLSearchParams({ data_inicio: options.startDate });
      if (options.endDate) params.append("data_fim", options.endDate);
      if (options.tipoMov) params.append("tipo_mov", options.tipoMov);
      if (options.emitente) params.append("emitente", onlyDigits(options.emitente));
      if (options.destinatario) params.append("destinatario", onlyDigits(options.destinatario));
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/v1/query/download/contribuintes/${options.contribuinteId}/${options.tipoDocumento}/xml?${params}`,
        { method: "GET", headers: { Accept: "application/xml, application/zip" } },
      );
      if (!response.ok) throw new Error(`Erro ao baixar XMLs: ${response.status}`);
      const found = response.headers.get("X-Files-Found");
      const missing = response.headers.get("X-Files-Missing");
      saveBlob(await response.blob(), batchFilename(response));
      const parts: string[] = [];
      if (found) parts.push(`${found} arquivo(s) encontrado(s)`);
      if (missing && missing !== "0") parts.push(`${missing} não localizado(s)`);
      toast({ title: "Download concluído", description: parts.length ? parts.join(". ") : "XMLs baixados com sucesso." });
    } catch (error) {
      console.error("Erro no download em lote:", error);
      toast({ title: "Erro no download", description: (error as Error).message, variant: "destructive" });
    } finally {
      setDownloadingBatch(false);
    }
  };

  return { downloadingKey, downloadingBatch, downloadSingle, downloadBatch };
}
