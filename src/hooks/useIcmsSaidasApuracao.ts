import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getApiUrl } from '@/config/api';
import { useApiAuth } from '@/hooks/useApiAuth';
import type {
  T01ApuracaoData,
  T01MatrizRow,
  T01MatrizSection,
  T01ResumoRow,
} from '@/components/equipe/dev/icms-saidas/mocks';

type NumericLike = number | string | null | undefined;

export interface ApuRecApiRow {
  ID_CONTRIBUINTE?: string | number | null;
  DT_INI: string;
  TOT_DEB?: NumericLike;
  AJ_DEB?: NumericLike;
  EST_CRED?: NumericLike;
  AJ_CRED?: NumericLike;
  TOT_CRED?: NumericLike;
  SLD_CRED_ANT?: NumericLike;
  EST_DEB?: NumericLike;
  ICMS_RECOLHER?: NumericLike;
  EXTRA_APUR?: NumericLike;
}

interface UseIcmsSaidasApuracaoParams {
  enabled: boolean;
  contribuinteId: string;
  dataInicio: string;
  dataFim: string;
}

const MATRIZ_SECTIONS: Omit<T01MatrizSection, 'linhas'>[] = [
  {
    id: 'icms_normal',
    titulo: 'ICMS Normal - Matriz',
    codigo: '1112',
    observacao: '(E116)',
  },
  {
    id: 'icms_difal',
    titulo: 'ICMS DIFAL - Matriz',
    codigo: '1317/5606/9813/9816/9820',
    observacao: '(E116)',
  },
];

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const toNumber = (value: NumericLike) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) return 0;

    const parsed = normalized.includes(',') && normalized.includes('.')
      ? Number(normalized.replace(/\./g, '').replace(',', '.'))
      : normalized.includes(',')
        ? Number(normalized.replace(',', '.'))
        : Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const parseDateValue = (value: string) => {
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? new Date(value) : parsed;
};

const formatPeriodo = (value: string) => {
  const parsed = parseDateValue(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const periodo = format(parsed, 'MMMM/yyyy', { locale: ptBR });
  return periodo.charAt(0).toUpperCase() + periodo.slice(1);
};

const getCreditos = (row: ApuRecApiRow) =>
  roundCurrency(
    toNumber(row.AJ_CRED) +
    toNumber(row.TOT_CRED) +
    toNumber(row.EST_CRED) +
    toNumber(row.SLD_CRED_ANT),
  );

const buildEmptyMatrizes = (): T01MatrizSection[] =>
  MATRIZ_SECTIONS.map((section) => ({
    ...section,
    linhas: [],
  }));

const buildResumoRow = (row: ApuRecApiRow): T01ResumoRow => {
  const debitos = roundCurrency(toNumber(row.TOT_DEB) + toNumber(row.AJ_DEB));
  const creditos = getCreditos(row);
  const estornos = roundCurrency(toNumber(row.EST_DEB));
  const icmsRecolher = roundCurrency(toNumber(row.ICMS_RECOLHER));
  const difal = roundCurrency(toNumber(row.EXTRA_APUR));
  const totalRecolhido = roundCurrency(debitos - creditos - estornos + difal);

  return {
    periodo: formatPeriodo(row.DT_INI),
    debitos,
    creditos,
    estornos,
    icmsRecolher,
    difal,
    totalRecolhido,
    diferenca: roundCurrency(icmsRecolher + difal - totalRecolhido),
  };
};

const buildMatrizNormalRow = (row: ApuRecApiRow): T01MatrizRow => {
  const apurado = roundCurrency(
    toNumber(row.TOT_DEB) +
    toNumber(row.AJ_DEB) +
    toNumber(row.EST_DEB),
  );
  const creditos = getCreditos(row);
  const devido = roundCurrency(apurado - creditos);

  return {
    periodo: formatPeriodo(row.DT_INI),
    apurado,
    creditos,
    devido,
    dar: devido,
    total: devido,
    diferenca: 0,
  };
};

const buildMatrizDifalRow = (row: ApuRecApiRow): T01MatrizRow => {
  const devido = roundCurrency(toNumber(row.EXTRA_APUR));

  return {
    periodo: formatPeriodo(row.DT_INI),
    apurado: devido,
    creditos: null,
    devido,
    dar: devido,
    total: devido,
    diferenca: 0,
  };
};

export function mapApuRecResponse(rows: ApuRecApiRow[]): T01ApuracaoData {
  if (rows.length === 0) {
    return {
      resumoMensal: [],
      matrizes: buildEmptyMatrizes(),
    };
  }

  const sortedRows = [...rows].sort((left, right) => {
    const leftDate = parseDateValue(left.DT_INI);
    const rightDate = parseDateValue(right.DT_INI);

    return leftDate.getTime() - rightDate.getTime();
  });

  return {
    resumoMensal: sortedRows.map(buildResumoRow),
    matrizes: [
      {
        ...MATRIZ_SECTIONS[0],
        linhas: sortedRows.map(buildMatrizNormalRow),
      },
      {
        ...MATRIZ_SECTIONS[1],
        linhas: sortedRows.map(buildMatrizDifalRow),
      },
    ],
  };
}

export function useIcmsSaidasApuracao({
  enabled,
  contribuinteId,
  dataInicio,
  dataFim,
}: UseIcmsSaidasApuracaoParams) {
  const { fetchWithAuth } = useApiAuth();

  return useQuery<T01ApuracaoData>({
    queryKey: ['icms-saidas-t01', contribuinteId, dataInicio, dataFim],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('id_contribuinte', contribuinteId);
      if (dataInicio) sp.set('data_nota_ini', dataInicio);
      if (dataFim) sp.set('data_nota_fim', dataFim);
      sp.set('page', '1');

      const url = getApiUrl(`/api/v1/saida_icms/apu_rec?${sp.toString()}`);
      const response = await fetchWithAuth(url);

      if (!response.ok) {
        const body = await response.text();
        let detail = body;

        try {
          const parsed = JSON.parse(body);
          detail = parsed?.detail?.error_message ?? parsed?.detail ?? parsed?.message ?? body;
          if (typeof detail !== 'string') detail = JSON.stringify(detail);
        } catch {
          // Mantem o corpo bruto quando a resposta nao for JSON.
        }

        const err = new Error(`HTTP ${response.status} - ${detail}`);
        (err as Error & { status?: number }).status = response.status;
        throw err;
      }

      const json = await response.json();
      const rows = Array.isArray(json) ? (json as ApuRecApiRow[]) : [];

      return mapApuRecResponse(rows);
    },
    enabled: enabled && !!contribuinteId,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
