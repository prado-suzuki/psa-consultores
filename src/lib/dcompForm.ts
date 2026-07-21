import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';
import type { GrupoTributo } from '@/hooks/useCatalogoTributos';
import { stripToDigits } from '@/lib/perdcompUtils';

type DcompRow = Database['public']['Tables']['dcomp']['Row'];
type DistribuicaoInsert = Database['public']['Tables']['distribuicao_dcomp']['Insert'];
type PerRow = Database['public']['Tables']['per']['Row'];

export type DcompEditData = DcompRow & { imposto?: string | null };
export type DcompPersistedRecord = Pick<
  DcompRow,
  | 'nr_documento'
  | 'nr_per_orig'
  | 'mes_ano_exercicio'
  | 'dt_envio'
  | 'vlr_compensado'
  | 'nr_dcomp_ret'
>;
export type DcompOption = Pick<DcompRow, 'nr_documento' | 'mes_ano_exercicio' | 'nr_dcomp_ret'>;
export type DcompPerOption = Pick<
  PerRow,
  | 'nr_per'
  | 'id_contribuinte'
  | 'exercicio'
  | 'tri_exercicio'
  | 'dt_solicitada'
  | 'tp_credito'
  | 'porcentagem_psa'
>;

export interface DistribuicaoLinha {
  id?: string;
  grupo_tributo_id: string | null;
  codigo_receita_id: string | null;
  valor_tributo: number;
  competencia: string;
  valor_original?: number | null;
}

export interface DistribuicaoExistente extends DistribuicaoLinha {
  id: string;
  _legacyTributo: string | null;
}

export const dcompSchema = z.object({
  nr_documento: z.string().min(1, 'Número do documento é obrigatório'),
  nr_per_orig: z.string().min(1, 'PER de origem é obrigatório'),
  mes_ano_exercicio: z.string().optional().default(''),
  dt_envio: z.string().min(1, 'Data de envio é obrigatória'),
  vlr_compensado: z.coerce.number().min(0, 'Valor deve ser positivo'),
  nr_dcomp_ret: z.string().nullable().optional(),
});

export type DcompFormData = z.infer<typeof dcompSchema>;

export interface DcompDraft extends DcompFormData {
  distribuicoes?: DistribuicaoLinha[];
}

export const normalizeMesAno = (value: string): string => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  return value;
};

export const formatDcompNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 24);
  const parts = [
    digits.slice(0, 5),
    digits.slice(5, 10),
    digits.slice(10, 16),
    digits.slice(16, 17),
    digits.slice(17, 18),
    digits.slice(18, 20),
  ];
  let formatted = parts[0];
  if (digits.length > 5) formatted += `.${parts[1]}`;
  if (digits.length > 10) formatted += `.${parts[2]}`;
  if (digits.length > 16) formatted += `.${parts[3]}`;
  if (digits.length > 17) formatted += `.${parts[4]}`;
  if (digits.length > 18) formatted += `.${parts[5]}`;
  if (digits.length > 20) formatted += `-${digits.slice(20, 24)}`;
  return formatted;
};

export const formatCurrencyDisplay = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const parseCurrencyToNumber = (value: string): number => {
  const digits = value.replace(/\D/g, '');
  return parseInt(digits || '0', 10) / 100;
};

export const toCents = (value: number): number => Math.round(value * 100);
export const round2 = (value: number): number => Math.round(value * 100) / 100;

export const formatCompetenciaDisplay = (value: string): string => {
  if (!value) return '';
  const match = value.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[2]}/${match[1]}` : value;
};

export const parseCompetenciaInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 6);
  if (digits.length === 6) return `${digits.slice(2, 6)}-${digits.slice(0, 2)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
};

export const isCompetenciaValida = (value: string): boolean =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(value) || /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value);

export function validateDistribuicoes(distribuicoes: DistribuicaoLinha[], total: number) {
  const totalRateado = distribuicoes.reduce((sum, linha) => sum + (linha.valor_tributo || 0), 0);
  const temDistribuicao = distribuicoes.length > 0;
  const temGrupoNaoSelecionado = distribuicoes.some((linha) => !linha.grupo_tributo_id);
  const temValorZero = distribuicoes.some((linha) => toCents(linha.valor_tributo || 0) === 0);
  const temCompetenciaInvalida = distribuicoes.some(
    (linha) => !isCompetenciaValida(linha.competencia || ''),
  );
  const somaIgual = toCents(totalRateado) === toCents(total);
  return {
    totalRateado,
    temDistribuicao,
    temGrupoNaoSelecionado,
    temValorZero,
    temCompetenciaInvalida,
    somaIgual,
    validas:
      temDistribuicao &&
      !temGrupoNaoSelecionado &&
      !temValorZero &&
      !temCompetenciaInvalida &&
      somaIgual,
  };
}

export function groupCodigosByGrupo<T extends { grupo_tributo_id: string }>(codigos: T[]) {
  const grouped: Record<string, T[]> = {};
  for (const codigo of codigos) {
    if (!grouped[codigo.grupo_tributo_id]) grouped[codigo.grupo_tributo_id] = [];
    grouped[codigo.grupo_tributo_id].push(codigo);
  }
  return grouped;
}

export function getDcompsVigentes(dcomps: DcompOption[]): DcompOption[] {
  const retificados = new Set(
    dcomps.filter((dcomp) => dcomp.nr_dcomp_ret).map((dcomp) => dcomp.nr_dcomp_ret),
  );
  return dcomps.filter((dcomp) => !retificados.has(dcomp.nr_documento));
}

export const getProporcaoOriginal = (fatorSelic: number): number =>
  fatorSelic > 0 ? 1 / (1 + fatorSelic) : 1;

export function getValorAtualizadoSelicMax(
  saldoRestantePer: number | undefined,
  nrPerOrig: string,
  preSelectedPer: string | undefined,
  fatorSelicHoje: number,
): number | null {
  if (saldoRestantePer == null || nrPerOrig !== preSelectedPer) return null;
  return saldoRestantePer * (1 + fatorSelicHoje);
}

export function buildCreateRecord(data: DcompFormData): DcompPersistedRecord {
  return {
    nr_documento: stripToDigits(data.nr_documento),
    nr_per_orig: stripToDigits(data.nr_per_orig),
    mes_ano_exercicio: normalizeMesAno(data.mes_ano_exercicio),
    dt_envio: data.dt_envio,
    vlr_compensado: data.vlr_compensado,
    nr_dcomp_ret: data.nr_dcomp_ret ? stripToDigits(data.nr_dcomp_ret) : null,
  };
}

export function buildUpdateRecord(data: DcompFormData): Omit<DcompPersistedRecord, 'nr_documento'> {
  const { nr_documento: _nrDocumento, ...record } = buildCreateRecord(data);
  return record;
}

export interface BuildDistribuicoesInput {
  nrDocumento: string;
  distribuicoes: DistribuicaoLinha[];
  existentes: DistribuicaoExistente[];
  grupos: GrupoTributo[];
  isEditing: boolean;
  dtEnvioMudou: boolean;
  proporcaoOriginal: number;
}

export function buildDistribuicaoRows(input: BuildDistribuicoesInput): DistribuicaoInsert[] {
  return input.distribuicoes.map((linha) => {
    const original =
      input.isEditing && linha.id
        ? input.existentes.find((item) => item.id === linha.id)
        : undefined;
    const valorMudou = original
      ? toCents(original.valor_tributo) !== toCents(linha.valor_tributo)
      : true;
    const preservar =
      input.isEditing && !input.dtEnvioMudou && !valorMudou && linha.valor_original != null;
    const grupo = input.grupos.find((item) => item.id === linha.grupo_tributo_id);
    return {
      nr_documento: input.nrDocumento,
      tributo: grupo?.sigla ?? '',
      grupo_tributo_id: linha.grupo_tributo_id,
      codigo_receita_id: linha.codigo_receita_id,
      valor_tributo: linha.valor_tributo,
      valor_original: preservar
        ? linha.valor_original
        : round2(linha.valor_tributo * input.proporcaoOriginal),
      competencia: normalizeMesAno(linha.competencia),
    };
  });
}
