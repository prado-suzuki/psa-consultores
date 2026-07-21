import { useApiAuth } from "@/hooks/useApiAuth";
import { API_BASE_URL } from "@/config/api";
import { exportPayload } from "@/lib/consultaXmls";
import type { ExportDialogProps } from "@/types/consultaXmls";

export function useConsultaXmlsExport(props: ExportDialogProps) {
  const { fetchWithAuth } = useApiAuth();
  return async (selectedColumns: string[]): Promise<string> => {
    if (!props.contribuinteId) throw new Error("Contribuinte não selecionado");
    const docType = props.tipoDocumento === "cte" ? "cte" : "nfe";
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/v1/query/export/${props.contribuinteId}/${docType}/csv`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportPayload(props, selectedColumns)),
      },
    );
    if (!response.ok) throw new Error(`Erro ao exportar: ${response.status} - ${await response.text()}`);
    return response.text();
  };
}
