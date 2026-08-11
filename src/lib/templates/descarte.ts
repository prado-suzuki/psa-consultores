import type { RenderDeBloco } from './render';
import { segmentar } from './tabela';

// Bloco sem dado não entra no documento (B5).
//
// A regra é de COMPOSIÇÃO, não de bloco: depois de renderizar e antes de
// numerar, o motor descarta o bloco que não trouxe dado nenhum. Antes disso a
// corretude dependia de cada autor lembrar de embrulhar o bloco inteiro num
// {{#imovel.georefArea}}…{{/imovel.georefArea}}, e nada validava isso — foi
// assim que o contrato saiu terminando em "O imóvel possui área de  ha e
// perímetro de  m, georreferenciado no sistema , certificado junto ao SIGEF sob
// o código  em , conforme o memorial descritivo:" com a tabela de vértices só
// com cabeçalho, depois das testemunhas.
//
// Nada aqui olha para o NOME nem para o id do bloco: o próximo bloco condicional
// (ônus, benfeitorias, arrendamento) é coberto sem uma linha a mais.

/**
 * Um bloco é descartado quando TEM ponto de dado e NENHUM deles trouxe dado:
 *
 * - ponto de dado é um segmento de valor ({{ campo }} resolvido), uma tabela
 *   textual (convenção `| … |` do tabela.ts) ou uma seção de repetição. Bloco
 *   de prosa fixa, sem nenhum dos três, NUNCA é descartado;
 * - trouxe dado é: algum segmento de valor não vazio, alguma seção de repetição
 *   com item, ou alguma tabela com corpo. Cabeçalho e separadora sozinhos não
 *   seguram o bloco no documento;
 * - a LACUNA de um campo manual (ver campos.ts) é um segmento de valor não
 *   vazio e portanto CONTA como conteúdo, de propósito: o fecho de assinaturas
 *   nunca desaparece por estar com data e testemunhas em branco.
 *
 * Bloco em que 1 de 5 campos veio preenchido não é descartado — a pontuação
 * órfã que sobra é assunto do aviso de documento incompleto (pendências).
 */
export function blocoSemDado({
  segmentos,
  secoesDeRepeticao,
  itensDeRepeticao,
}: RenderDeBloco): boolean {
  const texto = segmentos.map((s) => s.texto).join('');
  const valores = segmentos.filter((s) => s.tipo === 'valor');
  const tabelas = segmentar(texto.split('\n')).filter((s) => s.tipo === 'tabela');

  const trouxeDado =
    valores.some((v) => v.texto.trim() !== '') ||
    itensDeRepeticao > 0 ||
    tabelas.some((t) => t.tipo === 'tabela' && t.corpo.length > 0);
  if (trouxeDado) return false;

  // Render que resultou só em espaço em branco: nada a imprimir, e um parágrafo
  // mudo ainda consumiria um número de cláusula.
  if (texto.trim() === '') return true;

  return valores.length > 0 || tabelas.length > 0 || secoesDeRepeticao > 0;
}
