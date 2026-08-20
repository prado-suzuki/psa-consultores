// Constants, formatters, and factory functions for client form — extracted from NewClientModal

import { format } from "date-fns";
import { parseDate } from "@/lib/dateUtils";

// --- Dropdown options ---

export const TIPO_REPRESENTANTE_OPTIONS = [
  "Sócio/Proprietário",
  "Contador",
  "Advogado",
  "Procurador",
  "Representante Legal",
  "Diretor/Gestor",
  "Consultor Externo",
  "Outros",
];

/** @deprecated Use TIPO_REPRESENTANTE_OPTIONS */
export const TIPO_PARTICIPANTE_OPTIONS = TIPO_REPRESENTANTE_OPTIONS;

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

/** Por que o que foi digitado não vira data. */
export type MotivoDataInvalida = "incompleta" | "inexistente" | "fora_do_periodo";

/**
 * A data existe no calendário?
 *
 * Conferir faixa (dia 1..31, mês 1..12) não basta: 31/06 e 30/02 passam na faixa
 * e não existem. O JavaScript, em vez de recusar, rola para o mês seguinte
 * (`new Date(2026, 5, 31)` é 1 de julho), e era isso que fazia a tela mostrar
 * uma data diferente da digitada enquanto o rascunho guardava `2026-06-31`, que
 * só estourava lá na frente, no banco. Montar e conferir o retorno resolve
 * inclusive fevereiro em ano bissexto, sem regra escrita à mão.
 */
const dataExisteNoCalendario = (day: number, month: number, year: number): boolean => {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
};

const analisarDataMask = (
  masked: string,
): { iso: string; motivo: null } | { iso: null; motivo: MotivoDataInvalida } => {
  const d = masked.replace(/\D/g, "");
  if (d.length !== 8) return { iso: null, motivo: "incompleta" };
  const day = parseInt(d.slice(0, 2));
  const month = parseInt(d.slice(2, 4));
  const year = parseInt(d.slice(4, 8));
  if (year < 2000 || year > 2060) return { iso: null, motivo: "fora_do_periodo" };
  if (month < 1 || month > 12) return { iso: null, motivo: "inexistente" };
  if (day < 1 || day > 31) return { iso: null, motivo: "inexistente" };
  if (!dataExisteNoCalendario(day, month, year)) return { iso: null, motivo: "inexistente" };
  return {
    iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    motivo: null,
  };
};

export const parseDateMask = (masked: string): string | null => analisarDataMask(masked).iso;

/**
 * O motivo da recusa, para a tela dizer o que houve em vez de "Data inválida".
 * Devolve `null` quando a data é boa.
 */
export const motivoDataInvalida = (masked: string): MotivoDataInvalida | null =>
  analisarDataMask(masked).motivo;

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

// --- Default / factory functions ---

export const defaultClientData = {
  nome: "",
  categoria: "Bronze",
  ativo: true,
  fixo: "Sim",
  telefone: "",
  municipio: "",
  uf: "",
  observacoes: "",
  cluster_ids: [] as string[],
};

export const createDefaultDraftEntity = (): Partial<import("@/types/clientForm").DraftEntity> => ({
  tipo_pessoa: "PJ",
  cpf_cnpj: "",
  nome_razao_social: "",
  nome_fantasia: "",
  situacao_inscricao_estadual: "",
  inscricao_estadual: "",
  cod_cnae: "",
  setor: "",
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

export const createDefaultDraftRepresentante = () => ({
  nome: "",
  tipo_representante: "",
  cargo: "",
  email: "",
  telefone: "",
  observacoes: "",
  acesso_chamados: false,
});

/** @deprecated Use createDefaultDraftRepresentante */
export const createDefaultDraftParticipant = createDefaultDraftRepresentante;

export const createDefaultDraftContract = () => ({
  ordem_servico: "",
  data_emissao: "",
  data_inicio_projeto: "",
  data_fim_projeto: "",
  valor_projeto: 0,
  // OS nova nasce como pagamento único; quem cadastra troca pelo parcelamento
  // do contrato. Ver `src/lib/osParcelamento.ts`.
  numero_parcelas: 1 as number | null,
  valor_entrada: 0,
  valor_reembolso_km: 0,
  valor_reembolso_refeicao: 0,
  situacao_projeto: "em_andamento",
  observacoes_projeto: "",
  id_servico: "",
  id_produto_segmento: "",
  produtos_contratados: [] as Array<{ _id: number; _dbId?: string; produto_segmento_id: string }>,
  distribuicao_receita: [] as Array<{ id_centro_custo: string; percentual_rateio: number }>,
  cluster_id: "",
  setor_cliente: "",
  setor_cliente_id: "",
  regiao: "",
});
