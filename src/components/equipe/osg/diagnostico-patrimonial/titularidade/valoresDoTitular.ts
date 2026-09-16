// O pouco que as telas de titularidade precisam saber sobre os valores por
// titular e que não é conta pura (essa mora em `@/lib/osg/integralizacaoDaMatricula`).

export const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * O campo de dinheiro dos modais OSG guarda string com ponto decimal ("1234.56")
 * ou vazia; a coluna guarda `numeric` ou NULL. As duas conversões ficam aqui
 * porque o VAZIO É SIGNIFICATIVO nos dois sentidos: "a integralizar" em branco
 * é o titular que NÃO integraliza, e zero não diz a mesma coisa (zero seria
 * "integraliza nada", que o banco aceita mas o texto do contrato não distingue).
 */
export const valorParaCampo = (valor: number | null | undefined): string =>
  valor == null ? '' : String(valor);

export const campoParaValor = (campo: string): number | null => {
  const texto = campo.trim();
  if (!texto) return null;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : null;
};

/** O texto digitado existe mas não é número: barra o salvamento com mensagem. */
export const campoInvalido = (campo: string): boolean => {
  const texto = campo.trim();
  return texto.length > 0 && !Number.isFinite(Number(texto));
};

/**
 * A soma das frações fecha 100%?
 *
 * A tolerância não é preciosismo: fração periódica não tem decimal exato, e três
 * comunheiros com 1/3 gravam 33,3333 cada e somam 99,9999% (ver `fracaoUtils`).
 * Sem ela o painel acusaria "abaixo de 100%" no cadastro mais comum de composse.
 */
const TOLERANCIA_FRACAO = 0.001;

export type FechamentoDasFracoes = 'fecha' | 'excede' | 'abaixo';

export function fechamentoDasFracoes(total: number): FechamentoDasFracoes {
  if (total > 100 + TOLERANCIA_FRACAO) return 'excede';
  if (total < 100 - TOLERANCIA_FRACAO) return 'abaixo';
  return 'fecha';
}

/** Soma de frações imprime até 4 casas (a precisão do cadastro), sem zeros à toa. */
export const formatarFracao = (total: number): string =>
  total.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
