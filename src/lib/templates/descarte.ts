import type { RenderDeBloco } from './render';
import { segmentar } from './tabela';
import type { Bloco } from './types';

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
//
// O motivo do descarte é devolvido, e não só um booleano, porque o descarte tem
// que se ANUNCIAR (emenda 9.2 do contrato): um bloco cujo laço não está fiado
// renderiza vazio e sumiria sem sinal nenhum, escondendo erro de fiação em vez
// de aparecer visivelmente quebrado.

/** Por que um bloco não entrou no documento. */
export type MotivoDescarte =
  /** Tem seção de repetição e ela não produziu item nenhum (lista vazia ou não fiada). */
  | 'lista-vazia'
  /** Tem tabela textual e o corpo dela saiu com zero linhas (só cabeçalho e separadora). */
  | 'tabela-vazia'
  /** Todos os campos do bloco resolveram vazio (ou foram sintetizados pelo motor). */
  | 'campos-vazios'
  /** O render inteiro saiu em branco. */
  | 'render-em-branco'
  /** O parágrafo perdeu a cláusula que o governava durante o descarte em cascata. */
  | 'clausula-descartada';

/** Índices dos blocos `paragrafo` que perderam a cláusula governante. */
export function paragrafosOrfaos(blocos: Bloco[]): boolean[] {
  return blocos.map((bloco, i) => {
    if (bloco.tipo !== 'paragrafo') return false;

    for (let anterior = i - 1; anterior >= 0; anterior -= 1) {
      const tipo = blocos[anterior].tipo;
      if (tipo === 'clausula') return false;
      if (tipo === 'capitulo') return true;
      // Livre, inclusive o legado sem tipo, não rompe o vínculo estrutural: há
      // tabelas legítimas entre o caput e os parágrafos que ele governa.
    }
    return true;
  });
}

/**
 * O motivo pelo qual o bloco deve ser descartado, ou `null` para ficar.
 * Descarta quando o bloco TEM ponto de dado e NENHUM deles trouxe dado:
 *
 * - ponto de dado é um segmento de valor ({{ campo }} resolvido), uma tabela
 *   textual (convenção `| … |` do tabela.ts) ou uma seção de repetição. Bloco
 *   de prosa fixa, sem nenhum dos três, NUNCA é descartado;
 * - trouxe dado é: algum segmento de valor não vazio E não sintetizado pelo
 *   motor, alguma seção de repetição com item, ou alguma tabela com corpo (linha
 *   com célula preenchida — linha de células vazias é buraco, não dado).
 *   Cabeçalho e separadora sozinhos não seguram o bloco no documento;
 * - valor SINTETIZADO (rótulo genérico de cartório, valor nominal da quota) não
 *   conta como dado: senão a cláusula de capital que cita {{ sociedade.
 *   quotaValorNominal }} sobreviveria sempre, e o contrato sem sócios voltaria a
 *   sair com "O capital social será de R$ (), dividido em () quotas" (emenda 9.1);
 * - a LACUNA de um campo manual (ver campos.ts) é um segmento de valor não
 *   vazio e portanto CONTA como conteúdo, de propósito: o fecho de assinaturas
 *   nunca desaparece por estar com data e testemunhas em branco.
 *
 * Bloco em que 1 de 5 campos veio preenchido não é descartado — a pontuação
 * órfã que sobra é assunto do aviso de documento incompleto (pendências).
 */
export function motivoDeDescarte({
  segmentos,
  secoesDeRepeticao,
  itensDeRepeticao,
}: RenderDeBloco): MotivoDescarte | null {
  const texto = segmentos.map((s) => s.texto).join('');
  const valores = segmentos.filter((s) => s.tipo === 'valor');
  const tabelas = segmentar(texto.split('\n')).filter((s) => s.tipo === 'tabela');

  const tabelaComCorpo = tabelas.some(
    (t) => t.tipo === 'tabela' && t.corpo.some((linha) => linha.some((celula) => celula.trim() !== '')),
  );
  const trouxeDado =
    valores.some((v) => v.tipo === 'valor' && !v.sintetizado && v.texto.trim() !== '') ||
    itensDeRepeticao > 0 ||
    tabelaComCorpo;
  if (trouxeDado) return null;

  // Do mais específico para o mais genérico: o motivo é o que a tela vai
  // mostrar para alguém entender por que o bloco não saiu.
  if (secoesDeRepeticao > 0) return 'lista-vazia';
  if (tabelas.length > 0) return 'tabela-vazia';
  if (valores.length > 0) return 'campos-vazios';
  // Render em branco sem ponto de dado nenhum: nada a imprimir, e um parágrafo
  // mudo ainda consumiria um número de cláusula.
  return texto.trim() === '' ? 'render-em-branco' : null;
}
