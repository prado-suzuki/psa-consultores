/**
 * Utilitários de CNPJ.
 *
 * O CNPJ vive em `estrutura_clusters.cnpj` — a empresa de faturamento é o
 * próprio cluster (ver `docs/geral/decisoes/empresa-de-faturamento-vive-no-cluster.md`).
 * Cadastros antigos foram gravados só com dígitos; por isso a formatação vale
 * tanto na digitação quanto na exibição do que já está no banco.
 */

/**
 * Máscara aplicada enquanto se digita: `23112230000148` vira
 * `23.112.230/0001-48`. Digitação parcial é preservada — a máscara acompanha
 * o que existe — e o excesso de dígitos é descartado.
 */
export function formatarCnpj(valor: string | null | undefined): string {
  const digitos = (valor || '').replace(/\D/g, '').slice(0, 14);
  if (!digitos) return '';
  let saida = digitos.slice(0, 2);
  if (digitos.length > 2) saida += `.${digitos.slice(2, 5)}`;
  if (digitos.length > 5) saida += `.${digitos.slice(5, 8)}`;
  if (digitos.length > 8) saida += `/${digitos.slice(8, 12)}`;
  if (digitos.length > 12) saida += `-${digitos.slice(12, 14)}`;
  return saida;
}

/** Há CNPJ digitado, mas ainda não são os 14 dígitos. */
export function cnpjIncompleto(valor: string | null | undefined): boolean {
  const digitos = (valor || '').replace(/\D/g, '');
  return digitos.length > 0 && digitos.length < 14;
}
