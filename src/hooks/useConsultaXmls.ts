import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/config/api";
import { useApiAuth } from "@/hooks/useApiAuth";
import { ITEMS_PER_PAGE, onlyDigits } from "@/lib/consultaXmls";
import type { CTeRecord, ConsultaXmlFilters, NFeRecord, XmlApiResponse } from "@/types/consultaXmls";

function retryConsulta(failureCount: number, error: Error): boolean {
  if (error.message === "Sessão expirada") return false;
  return failureCount < 2;
}

export function useConsultaXmls(filters: ConsultaXmlFilters) {
  const { fetchWithAuth } = useApiAuth();
  const queryKeyTail = [
    filters.contribuinteId, filters.startDate, filters.endDate, filters.currentPage,
    filters.tipoMov, filters.emitente, filters.destinatario, filters.committedChave,
  ] as const;

  const query = async <T,>(document: "nfes" | "ctes"): Promise<XmlApiResponse<T> | null> => {
    if (!filters.contribuinteId) return null;
    const params = new URLSearchParams({
      data_inicio: filters.startDate,
      data_fim: filters.endDate,
      page: filters.currentPage.toString(),
      page_size: ITEMS_PER_PAGE.toString(),
    });
    if (filters.tipoMov) params.append("tipo_mov", filters.tipoMov);
    if (filters.emitente) params.append("emitente", onlyDigits(filters.emitente));
    if (filters.destinatario) params.append("destinatario", onlyDigits(filters.destinatario));
    // A condição usa o filtro vivo, mas o valor enviado continua sendo o submetido.
    if (filters.chaveAcesso) params.append("chave", onlyDigits(filters.committedChave));
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/v1/query/contribuintes/${filters.contribuinteId}/${document}?${params.toString()}`,
      { method: "GET" },
    );
    if (!response.ok) throw new Error(`Erro na API: ${response.status} - ${await response.text()}`);
    return response.json() as Promise<XmlApiResponse<T>>;
  };

  const nfeQuery = useQuery({
    queryKey: ["nfe-docs", ...queryKeyTail],
    queryFn: () => query<NFeRecord>("nfes"),
    enabled: filters.searchTriggered && !!filters.contribuinteId && filters.tipoDocumento === "nfe",
    retry: retryConsulta,
  });
  const cteQuery = useQuery({
    queryKey: ["cte-docs", ...queryKeyTail],
    queryFn: () => query<CTeRecord>("ctes"),
    enabled: filters.searchTriggered && !!filters.contribuinteId && filters.tipoDocumento === "cte",
    retry: retryConsulta,
  });
  return { nfeQuery, cteQuery };
}
