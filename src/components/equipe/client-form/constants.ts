// Constants, formatters, and factory functions for client form — extracted from NewClientModal

import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { parseDate } from "@/lib/dateUtils";
import type { DraftOrdemServico } from "@/types/clientForm";

// --- Dropdown options ---

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

export const UF_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

export const SITUACAO_PROJETO_OPTIONS = [
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
  { value: "suspenso", label: "Suspenso" },
  { value: "cancelado", label: "Cancelado" },
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

// --- Currency mask utilities (centavos approach) ---

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

export const isoToMasked = (iso: string): string => {
  if (!iso) return "";
  try {
    const date = parseDate(iso);
    return format(date, "dd/MM/yyyy");
  } catch {
    return "";
  }
};

// --- Currency display ---

export const formatCurrencyDisplay = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

// --- Auto-generate OS number (XXX/AAAA) ---

export const generateNextOsNumber = async (localContracts: DraftOrdemServico[]): Promise<string> => {
  const year = new Date().getFullYear();
  const suffix = `/${year}`;

  const { data } = await (supabase.from("ordem_servico" as any) as any)
    .select("numero_os")
    .like("numero_os", `%${suffix}`)
    .order("numero_os", { ascending: false })
    .limit(1000);

  let maxSeq = 0;

  if (data && data.length > 0) {
    for (const row of data) {
      const match = (row.numero_os as string)?.match(/^(\d+)\//);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  }

  for (const c of localContracts) {
    if (c.ordem_servico?.endsWith(suffix)) {
      const match = c.ordem_servico.match(/^(\d+)\//);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  }

  const next = (maxSeq + 1).toString().padStart(3, "0");
  return `${next}${suffix}`;
};

// --- Default / factory functions ---

export const defaultClientData = {
  nome: "",
  categoria: "Bronze",
  ativo: true,
  fixo: "Sim",
  telefone: "",
  municipio: "",
  uf: "",
  setor_cliente: "",
  setor_cliente_id: "",
  regiao: "",
};

export const createDefaultDraftEntity = (): Partial<import("@/types/clientForm").DraftEntity> => ({
  tipo_pessoa: "PJ",
  cpf_cnpj: "",
  nome_razao_social: "",
  nome_fantasia: "",
  situacao_inscricao_estadual: "",
  inscricao_estadual: "",
  cod_cnae: "",
  setor: "Indústria",
  simples_nacional: "",
  telefone: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  municipio: "",
  uf: "",
  contribuinte_faturamento: false,
  atividade_principal: "",
});

export const createDefaultDraftParticipant = () => ({
  nome: "",
  tipo_participante: "",
  cargo: "",
  email: "",
  telefone: "",
  observacoes: "",
  acesso_chamados: false,
});

export const createDefaultDraftContract = () => ({
  ordem_servico: "",
  data_emissao: "",
  data_inicio_projeto: "",
  data_fim_projeto: "",
  valor_projeto: 0,
  valor_reembolso_km: 0,
  valor_reembolso_refeicao: 0,
  situacao_projeto: "em_andamento",
  observacoes_projeto: "",
  id_servico: "",
  id_produto_segmento: "",
  distribuicao_receita: [] as Array<{ id_centro_custo: string; percentual_rateio: number }>,
});
