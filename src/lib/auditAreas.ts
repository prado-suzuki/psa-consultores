/**
 * Escopo de área das telas de auditoria ("Logs de Equipe").
 *
 * A Tax e a OSG olham a própria área; o Board olha as duas somadas. É a MESMA
 * tela montada com escopo diferente — quem muda uma aba muda para os três.
 *
 * `audit_logs.area` guarda 'tax' ou 'osg'. `'todas'` não é valor de banco: é o
 * pedido de ler as duas áreas de uma vez, traduzido em `areasDoEscopo`.
 */

/** Área que existe em `audit_logs.area`. */
export type AuditAreaModulo = 'tax' | 'osg';

/** Escopo pedido pela tela — inclui o consolidado do Board. */
export type AuditArea = AuditAreaModulo | 'todas';

export const AUDIT_AREAS_MODULO: readonly AuditAreaModulo[] = ['tax', 'osg'];

export const AUDIT_AREA_LABEL: Record<AuditArea, string> = {
  todas: 'Tax + OSG',
  tax: 'Tax',
  osg: 'OSG',
};

/** Opções na ordem em que o seletor do Board mostra. */
export const AUDIT_AREA_OPCOES: readonly AuditArea[] = ['todas', 'tax', 'osg'];

/** Valores de `audit_logs.area` que este escopo abrange. */
export function areasDoEscopo(area: AuditArea): AuditAreaModulo[] {
  return area === 'todas' ? [...AUDIT_AREAS_MODULO] : [area];
}

/**
 * Área do módulo dono de um registro, para quando a tela precisa de UMA área
 * mesmo no consolidado — o link de "onde resolver" da fila de pendências vive
 * em `/equipe/<area>/projetos`, e no Board cada linha volta para a sua área.
 *
 * Log com área desconhecida cai em 'tax': mandar para a tela errada é ruim,
 * mas montar rota inexistente é pior.
 */
export function areaDoRegistro(
  escopo: AuditArea,
  areaDoRegistroNoLog: string | null | undefined,
): AuditAreaModulo {
  if (escopo !== 'todas') return escopo;
  return areaDoRegistroNoLog === 'osg' ? 'osg' : 'tax';
}
