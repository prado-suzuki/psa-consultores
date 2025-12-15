/**
 * Utilitários de data para timezone brasileiro (UTC-3)
 * Evita problemas com funções do date-fns que usam new Date() em UTC
 */

/**
 * Parse de string de data (YYYY-MM-DD) para Date local
 * Evita problema de timezone UTC onde datas são interpretadas como dia anterior
 */
export const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Obtém a data de hoje no timezone brasileiro (sem horas)
 */
export const getTodayBrazil = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

/**
 * Verifica se uma data é hoje (timezone brasileiro)
 */
export const isTodayBrazil = (date: Date): boolean => {
  const today = getTodayBrazil();
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate();
};

/**
 * Verifica se uma data é amanhã (timezone brasileiro)
 */
export const isTomorrowBrazil = (date: Date): boolean => {
  const tomorrow = getTodayBrazil();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.getFullYear() === tomorrow.getFullYear() &&
         date.getMonth() === tomorrow.getMonth() &&
         date.getDate() === tomorrow.getDate();
};

/**
 * Verifica se uma data está no passado (timezone brasileiro)
 * Considera apenas a data, ignorando horas
 */
export const isPastBrazil = (date: Date): boolean => {
  const today = getTodayBrazil();
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return dateOnly < today;
};

/**
 * Verifica se uma data é futura (timezone brasileiro)
 * Considera apenas a data, ignorando horas
 */
export const isFutureBrazil = (date: Date): boolean => {
  const today = getTodayBrazil();
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return dateOnly > today;
};
