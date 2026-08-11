// Como o cartório é NOMEADO no documento (B4).
//
// O que identifica a serventia é o nome cadastrado ("2º Ofício de Registro de
// Imóveis de Sinop"), não um rótulo institucional montado com a comarca — era
// isso que fazia o contrato dizer "do Cartório de Registro de Imóveis de Lucas
// do Rio Verde" onde o cadastro dizia "Cartório de 1° Ofício de Imóveis", e o
// ofício, que é o que distingue uma serventia da outra, se perdia.
//
// As duas decisões (o rótulo de quem não tem nome e a supressão da comarca
// redundante) moram AQUI, num lugar só, e não em cada bloco: o bloco escreve
// sempre a mesma frase e ela sai gramatical nos dois extremos.

/**
 * Rótulo genérico de quem não tem nome cadastrado: sem comarca, sem preposição
 * e sem ponto final — quem completa a frase é o bloco.
 */
export const CARTORIO_SEM_NOME = 'Cartório de Registro de Imóveis';

/** Minúsculas sem acento, para comparar nome de serventia com nome de cidade. */
function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

/** O nome cadastrado da serventia, ou o rótulo genérico. Nunca vazio. */
export function nomeDoCartorio(nomeCompleto: string | null | undefined): string {
  return (nomeCompleto ?? '').trim() || CARTORIO_SEM_NOME;
}

/**
 * A comarca a ser dita DEPOIS do nome do cartório — vazia quando o nome já a
 * contém. Sem isso, "2º Ofício de Registro de Imóveis de Sinop" sairia como
 * "do 2º Ofício de Registro de Imóveis de Sinop da comarca de Sinop".
 */
export function comarcaComplementar(nomeCartorio: string, comarca: string | null | undefined): string {
  const nomeComarca = (comarca ?? '').trim();
  if (!nomeComarca) return '';
  return semAcento(nomeCartorio).includes(semAcento(nomeComarca)) ? '' : nomeComarca;
}
