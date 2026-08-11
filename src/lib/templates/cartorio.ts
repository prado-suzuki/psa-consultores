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

/** Escapa o que for metacaractere de regex num nome de cidade ("Santa Bárbara d'Oeste"). */
function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A comarca a ser dita DEPOIS do nome do cartório — vazia quando o nome já
 * TERMINA nela. Sem isso, "2º Ofício de Registro de Imóveis de Sinop" sairia
 * como "do 2º Ofício de Registro de Imóveis de Sinop da comarca de Sinop".
 *
 * A comparação é pelo FIM do nome, não por conter: "Registro" é comarca de
 * verdade (SP), e um teste de substring apagaria a comarca de toda serventia
 * chamada "Cartório de Registro de Imóveis", que é quase todas. O nome da
 * serventia diz a cidade no fim ("… de Sinop"), então é lá que se procura.
 *
 * A assimetria de risco manda no critério: suprimir demais some com a informação
 * de qual comarca é (documento ambíguo); suprimir de menos repete a cidade
 * (documento verboso, porém completo). Fica a repetição, quando houver dúvida.
 * Uma sigla de UF colada no fim ("… de Sinop - MT") não atrapalha.
 */
export function comarcaComplementar(nomeCartorio: string, comarca: string | null | undefined): string {
  const nomeComarca = (comarca ?? '').trim();
  if (!nomeComarca) return '';
  // Tira do fim uma UF avulsa ("- mt", "/mt") antes de comparar.
  const nome = semAcento(nomeCartorio).replace(/[\s.,;:/-]+[a-z]{2}\s*$/u, '').trim();
  const termina = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaparRegex(semAcento(nomeComarca))}$`, 'u');
  return termina.test(nome) ? '' : nomeComarca;
}
