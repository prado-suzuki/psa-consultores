import type { ProblemaWp, ResultadoLeitura } from '@/lib/planejamento-tributario/parser';

/**
 * Decide se uma leitura pode virar revisão no banco.
 *
 * A leitura e a validação apenas relatam: elas dizem o que acharam e o que não
 * fecha, sem julgar. Este arquivo é o julgamento, e existe separado porque a
 * regra é de negócio e muda por decisão de gente, não por mudança no WP.
 *
 * ## A régua, e o porquê de cada lado
 *
 * **Recusa quando o arquivo não é o WP, ou saiu do lugar.** Aba que falta e
 * cabeçalho ilegível significam que a leitura por endereço não vale mais: ela
 * continuaria devolvendo número, só que da linha errada, e número plausível vindo
 * do lugar errado é o pior defeito possível aqui, porque não se anuncia. Sem
 * nenhum número lido também recusa, pela mesma razão.
 *
 * **Recusa quando falta campo que a tabela exige.** Bem sem categoria e dívida
 * sem titularidade fariam a RPC abortar a transação inteira, e o erro chegaria
 * como falha de restrição do Postgres, sem dizer que linha da planilha causou.
 * Barrar aqui custa o mesmo e devolve o endereço.
 *
 * **Aceita com aviso quando o número existe mas é suspeito.** Célula de erro do
 * Excel, fórmula sem resultado guardado e conta que não fecha são coisas que a
 * pessoa precisa VER, e esconder o estudo até ela consertar a planilha não ajuda:
 * ela conserta olhando o que entrou. O aviso vai junto da revisão.
 */

/** O que fazer com a leitura. */
export type Veredito = 'aceita' | 'aceita_com_aviso' | 'recusa';

export interface Decisao {
  veredito: Veredito;
  /** Os problemas que impedem a importação. Vazio quando não recusa. */
  impedimentos: ProblemaWp[];
  /** Os problemas que acompanham a revisão sem impedi-la. */
  avisos: ProblemaWp[];
}

/**
 * Os tipos que impedem. Os demais viram aviso, e é de propósito que a lista dos
 * que impedem seja a curta: tipo novo nasce avisando, que é o lado seguro.
 */
const IMPEDEM: ReadonlySet<ProblemaWp['tipo']> = new Set([
  'aba_ausente',
  'cabecalho_ilegivel',
  'campo_obrigatorio',
]);

/**
 * Confere os campos que a tabela exige e a leitura não tem como garantir.
 *
 * `wp_bem.categoria` e `wp_divida.titularidade` são `not null`. A leitura devolve
 * o que a planilha tem, e uma linha em branco no meio da tabela é gap de
 * preenchimento, não erro de leitura: quem sabe que aquilo é obrigatório é o
 * banco, e é essa distância que esta função cobre.
 */
function confereObrigatorios(leitura: ResultadoLeitura): ProblemaWp[] {
  const problemas: ProblemaWp[] = [];

  for (const bem of leitura.bens) {
    if (!bem.categoria) {
      problemas.push({
        tipo: 'campo_obrigatorio',
        onde: bem.origemLinha,
        detalhe: 'o bem não tem categoria, e a categoria é o que o slide agrupa',
      });
    }
  }

  for (const divida of leitura.dividas) {
    if (!divida.titularidade) {
      problemas.push({
        tipo: 'campo_obrigatorio',
        onde: divida.origemLinha,
        detalhe: 'a dívida não tem titularidade, e sem ela não se sabe de quem é o contrato',
      });
    }
  }

  return problemas;
}

/** Se a leitura não trouxe número nenhum, não houve importação. */
function nenhumNumero(leitura: ResultadoLeitura): boolean {
  return (
    leitura.valores.length === 0 &&
    leitura.farol.length === 0 &&
    leitura.bens.length === 0 &&
    leitura.dividas.length === 0
  );
}

/**
 * Decide o que fazer com a leitura de um WP.
 *
 * Recebe também os problemas da validação, porque a aritmética é conferida por
 * fora: `validar(leitura.valores)` devolve o que não fecha, e aqui os dois
 * conjuntos são julgados pela mesma régua.
 */
export function decideImportacao(
  leitura: ResultadoLeitura,
  problemasDaValidacao: readonly ProblemaWp[] = [],
): Decisao {
  const todos = [...leitura.problemas, ...problemasDaValidacao, ...confereObrigatorios(leitura)];

  const impedimentos = todos.filter((p) => IMPEDEM.has(p.tipo));
  const avisos = todos.filter((p) => !IMPEDEM.has(p.tipo));

  /*
   * O arquivo sem número entra como impedimento, e não como veredito à parte, para
   * a tela ter sempre uma linha explicando o que houve em vez de uma recusa sem
   * motivo listado.
   *
   * **Só quando a leitura ainda não disse isso.** Quando o arquivo não é um WP, a
   * leitura já devolve `aba_ausente` dizendo quais abas esperava e quais achou, o
   * que é mais útil; somar "nenhum número foi lido" em cima repete a mesma
   * informação com menos detalhe, e a tela passa a acusar duas coisas onde há uma.
   */
  const jaDisseQueNaoEhWp = impedimentos.some((p) => p.tipo === 'aba_ausente');
  if (nenhumNumero(leitura) && !jaDisseQueNaoEhWp) {
    impedimentos.push({
      tipo: 'aba_ausente',
      onde: 'arquivo',
      detalhe: 'nenhum número foi lido: o arquivo não tem dado preenchido nas abas conhecidas',
    });
  }

  if (impedimentos.length > 0) return { veredito: 'recusa', impedimentos, avisos };
  if (avisos.length > 0) return { veredito: 'aceita_com_aviso', impedimentos: [], avisos };
  return { veredito: 'aceita', impedimentos: [], avisos: [] };
}
