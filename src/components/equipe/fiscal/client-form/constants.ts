// Constants and mask utilities extracted from NewClientModal

export const TIPO_PARTICIPANTE_OPTIONS = [
  "Sócio/Proprietário",
  "Contador",
  "Advogado",
  "Procurador",
  "Representante Legal",
  "Diretor/Gestor",
  "Consultor Externo",
  "Outros",
];

export const SITUACAO_PROJETO_OPTIONS = [
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
  { value: "suspenso", label: "Suspenso" },
  { value: "cancelado", label: "Cancelado" },
];

export const UF_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

// --- Mask utilities ---
export const formatCpfCnpj = (value: string, tipo: string): string => {
  const digits = value.replace(/\D/g, "");
  if (tipo === "PF") {
    const d = digits.slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  const d = digits.slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

export const formatCep = (value: string): string => {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

export const formatPhone = (value: string): string => {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

// --- Currency mask utilities ---
export const formatBRLInput = (value: number): string => {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const centsToValue = (cents: number): number => cents / 100;

export const valueToCents = (value: number): number => Math.round(value * 100);

// --- Date mask utilities ---
export const formatDateMask = (value: string): string => {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};

export const parseDateMask = (masked: string): string | null => {
  const d = masked.replace(/\D/g, "");
  if (d.length !== 8) return null;
  const day = parseInt(d.slice(0, 2));
  const month = parseInt(d.slice(2, 4));
  const year = parseInt(d.slice(4, 8));
  if (year < 2000 || year > 2060) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

// isoToMasked is in DateFieldWithInput.tsx (needs parseDate/format imports)
// Kept here as a re-export-friendly signature for other consumers
import { parseDate } from "@/lib/dateUtils";
import { format } from "date-fns";

export const isoToMasked = (iso: string): string => {
  if (!iso) return "";
  try {
    const date = parseDate(iso);
    return format(date, "dd/MM/yyyy");
  } catch {
    return "";
  }
};

export const formatCurrencyDisplay = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
