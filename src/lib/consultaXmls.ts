import type { ExportDialogProps } from "@/types/consultaXmls";

export const ITEMS_PER_PAGE = 10;

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCnpj(cnpj: string): string {
  if (!cnpj) return "-";
  const cleaned = onlyDigits(cnpj);
  return cleaned.length === 14
    ? cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
    : cnpj;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatXmlDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "-";
}

export function exportPayload(props: ExportDialogProps, selectedColumns: string[]) {
  return {
    data_inicio: props.start_date,
    data_fim: props.end_date,
    colunas: selectedColumns,
    ...(props.tipoMov && { tipo_mov: props.tipoMov }),
    ...(props.emitente && { emitente: onlyDigits(props.emitente) }),
    ...(props.destinatario && { destinatario: onlyDigits(props.destinatario) }),
  };
}

export function exportFilename(tipoDocumento: ExportDialogProps["tipoDocumento"], startDate: string, endDate: string): string {
  return `${tipoDocumento}_export_${startDate}_${endDate}.xlsx`;
}

// Intencionalmente ingênuo para preservar o contrato atual do CSV.
export function parseConsultaXmlsCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];
  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(separator).map((header) => header.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(separator).map((value) => value.trim().replace(/^"|"$/g, ""));
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] || "";
      return row;
    }, {});
  });
}

export function batchFilename(response: Response): string {
  const contentType = response.headers.get("Content-Type") || "";
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename[^;=\n]*=["']?([^"';\n]*)["']?/);
  return match?.[1] || (contentType.includes("zip") ? "xmls.zip" : "documento.xml");
}
