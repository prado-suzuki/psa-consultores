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
 * Hoje como `YYYY-MM-DD` no fuso local, para gravar em coluna `date`.
 *
 * Existe porque `new Date().toISOString().slice(0, 10)` devolve o dia em UTC:
 * das 21h em diante, no horário de Brasília, ele já responde "amanhã". Numa data
 * gravada automaticamente e travada depois — como a emissão da OS — o erro só
 * apareceria como uma OS emitida no dia seguinte ao que foi criada.
 */
export const todayIsoBrazil = (): string => {
  const today = getTodayBrazil();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
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

/**
 * Data e hora de uma mensagem, no formato curto: `31/08/2026 14:10`.
 *
 * Existe para tirar o "há cerca de 5 horas" das conversas. O tempo relativo
 * obriga quem lê a fazer conta de cabeça e muda de significado conforme a hora
 * em que a pessoa abre a tela: o mesmo comentário lê "há 5 horas" de manhã e
 * "ontem" à noite. Pedido da Patricia em 27/08/2026 e reforçado em 31/08, para
 * o chat do projeto, o da tarefa e o feed ao mesmo tempo.
 *
 * Formato curto por decisão dela: cabe na thread estreita, onde a forma por
 * extenso quebraria a linha.
 */
export const dataHoraCurta = (valor: string | Date): string => {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return '';

  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const hora = String(data.getHours()).padStart(2, '0');
  const minuto = String(data.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${data.getFullYear()} ${hora}:${minuto}`;
};
