import { capitalDeQuotas, quotasDeValor } from '@/lib/templates/capital';
import { problemaDoPagamento, type MovimentoDeQuotas } from './movimentoQuotas';

// O macro da subida: os sócios da empresa Proprietária passam as quotas dela
// para a Controladora e recebem, em troca, quotas da Controladora.
//
// Ele existe porque esse movimento não tem formulário a preencher: dadas as
// duas empresas e a data, TUDO o mais se calcula. Pedir ao consultor que digite
// quatro lançamentos espelhados, com a aritmética batendo dos dois lados, é
// pedir que ele reproduza à mão uma conta que o sistema sabe fazer, e é onde o
// erro entra.
//
// As duas regras de domínio que a conta obedece (extraídas dos instrumentos
// reais do grupo MMS, ver docs/planos/ledger-societario-e-alteracao-derivada.md):
//
//   1. A subida é 1:1 em VALOR, não em quantidade. O sócio integraliza na
//      controladora o valor das quotas que tinha na proprietária, e a quantidade
//      emitida é esse valor dividido pelo valor nominal da controladora. Os
//      números só coincidem quando as duas têm o mesmo nominal, que é o caso da
//      casa hoje (ver capital.ts), mas a conta é feita pelo valor de propósito.
//   2. O aporte SOMA, não substitui. O quadro da controladora depois da subida é
//      o dela mais o da proprietária, e por isso sobra o resíduo do capital de
//      constituição. É daí que nasce o desalinhamento de proporção que este
//      módulo avisa em vez de esconder.
//
// O macro NÃO cria documento: ele enche o ledger, e cada alteração contratual
// nasce depois pelo fluxo normal, que já sabe ler estado (porteiros de validar
// versão, snapshot congelado, registro na junta e sucessão).

/** Um sócio e o que ele tem na empresa de onde as quotas saem. */
export interface SocioQueSobe {
  pessoaId: string;
  denominacao: string;
  quotas: number;
  /** R$ de capital dessas quotas (`vlr_total` do quadro). */
  valor: number;
}

/** Um lançamento a gravar, com a empresa a que ele pertence. */
export interface LancamentoDaSubida {
  empresaPessoaId: string;
  /** Nome de quem entra na trilha de auditoria. */
  denominacao: string;
  movimento: MovimentoDeQuotas;
}

export interface PlanoDaSubida {
  /** Na ordem do ato: primeiro as cessões na proprietária, depois os aportes. */
  lancamentos: LancamentoDaSubida[];
  /** Por que o plano NÃO pode ser gravado, ou null. Uma frase para a tela. */
  problema: string | null;
  /**
   * O quadro da controladora não vai reproduzir a proporção da proprietária.
   * Não impede nada: é decisão do consultor ajustar antes ou aceitar que virá
   * uma terceira alteração só para arrumar a proporção.
   */
  avisoDeProporcao: string | null;
  totalValorCedido: number;
  totalValorAportado: number;
  /** Quadro da controladora depois da subida, para a tela mostrar o resultado. */
  quadroResultante: SocioQueSobe[];
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}%`;

export interface ArgsDaSubida {
  proprietariaPessoaId: string;
  controladoraPessoaId: string;
  /** Quadro atual da proprietária: quem sobe, e com quanto. */
  socios: SocioQueSobe[];
  /** Quadro atual da controladora: o capital de constituição a que o aporte SOMA. */
  quadroControladora: SocioQueSobe[];
  /** ISO (yyyy-mm-dd). A mesma data nos dois lados: é um ato só. */
  dataMovimento: string | null;
}

/**
 * Monta o par espelhado, confere a aritmética e diz o que a tela deve mostrar
 * antes de gravar. Puro: não toca no banco, e é por isso que a tela consegue
 * acusar o problema antes de existir documento nenhum.
 */
export function planejarSubidaDeQuotas(args: ArgsDaSubida): PlanoDaSubida {
  const { proprietariaPessoaId, controladoraPessoaId, socios, quadroControladora, dataMovimento } = args;

  const vazio: PlanoDaSubida = {
    lancamentos: [],
    problema: null,
    avisoDeProporcao: null,
    totalValorCedido: 0,
    totalValorAportado: 0,
    quadroResultante: [],
  };

  if (proprietariaPessoaId === controladoraPessoaId) {
    return { ...vazio, problema: 'A proprietária e a controladora são a mesma empresa.' };
  }
  const comQuotas = socios.filter((s) => s.quotas > 0);
  if (comQuotas.length === 0) {
    return { ...vazio, problema: 'A proprietária não tem quadro societário para transferir.' };
  }
  // A controladora não cede para si mesma: as quotas que ela já tem na
  // proprietária são o resultado de uma subida anterior e ficam onde estão.
  //
  // Isto NÃO é o mesmo que "a subida já aconteceu, não repita". O ciclo da casa
  // passa por aqui mais de uma vez: depois da concentração, um aumento de
  // capital por integralização de imóveis novos traz os subscritores de volta ao
  // quadro da proprietária (ver aporteInicial.ts), e a alteração contratual
  // seguinte tem de concentrar OUTRA VEZ, agora só o que entrou. Antes, a
  // presença da holding no quadro travava o macro inteiro e a segunda
  // concentração não tinha por onde ser gravada.
  const queSobem = comQuotas.filter((s) => s.pessoaId !== controladoraPessoaId);
  if (queSobem.length === 0) {
    return {
      ...vazio,
      problema: 'A controladora já é a única sócia da proprietária: não há quotas a subir.',
    };
  }

  const lancamentos: LancamentoDaSubida[] = [];
  let sequencia = 0;

  // Primeiro as cessões, todas: o sócio precisa ter cedido para poder
  // integralizar com o que cedeu, e é essa a ordem em que a peça as escreve.
  for (const s of queSobem) {
    lancamentos.push({
      empresaPessoaId: proprietariaPessoaId,
      denominacao: s.denominacao,
      movimento: {
        tipo: 'cessao',
        origemPessoaId: s.pessoaId,
        destinoPessoaId: controladoraPessoaId,
        quotas: s.quotas,
        dataMovimento,
        sequencia: ++sequencia,
      },
    });
  }

  // Depois os aportes na controladora, cada um pago com as quotas cedidas.
  const emitidasPorSocio = new Map<string, number>();
  for (const s of queSobem) {
    // 1:1 em VALOR: o que ele tinha lá, convertido ao nominal daqui.
    const emitidas = quotasDeValor(s.valor);
    emitidasPorSocio.set(s.pessoaId, emitidas);
    lancamentos.push({
      empresaPessoaId: controladoraPessoaId,
      denominacao: s.denominacao,
      movimento: {
        tipo: 'aporte',
        origemPessoaId: null,
        destinoPessoaId: s.pessoaId,
        quotas: emitidas,
        dataMovimento,
        sequencia: ++sequencia,
        pagamento: {
          tipo: 'quotas',
          empresaPessoaId: proprietariaPessoaId,
          quotas: s.quotas,
          valor: s.valor,
        },
      },
    });
  }

  const totalValorCedido = queSobem.reduce((soma, s) => soma + s.valor, 0);
  const totalValorAportado = [...emitidasPorSocio.values()].reduce(
    (soma, q) => soma + capitalDeQuotas(q),
    0,
  );

  // O invariante que a tela acusa ANTES de gravar. Ele só quebra quando o valor
  // do quadro da proprietária não é múltiplo do nominal (quadro legado, gravado
  // antes de o capital seguir as quotas): aí a conversão arredonda e o valor
  // some, em vez de aparecer.
  const porSocioDesbate = queSobem.find(
    (s) => Math.abs(capitalDeQuotas(emitidasPorSocio.get(s.pessoaId) ?? 0) - s.valor) >= 0.005,
  );
  // A forma de pagamento dos aportes, conferida pela MESMA função do formulário.
  // É para isto que `problemaDoPagamento` foi separada de `problemaDoMovimento`:
  // o macro monta o par espelhado sem passar pelo formulário, então nenhuma das
  // regras de pagamento tinha sido lida neste caminho, e quem recusava um aporte
  // pago com quota de valor zero era o CHECK do banco, com mensagem de
  // constraint. Reimplementar a regra aqui é o que faria as duas divergirem.
  const pagamentoInvalido = lancamentos
    .map((l) => problemaDoPagamento(l.movimento, l.empresaPessoaId))
    .find((p): p is string => !!p);
  const problema = porSocioDesbate
    ? `O valor das quotas de ${porSocioDesbate.denominacao} na proprietária (R$ ${fmt(porSocioDesbate.valor)}) não fecha com o das quotas a emitir na controladora (R$ ${fmt(capitalDeQuotas(emitidasPorSocio.get(porSocioDesbate.pessoaId) ?? 0))}). Corrija o quadro da proprietária antes de subir.`
    : (pagamentoInvalido ?? null);

  // O quadro que a controladora passa a ter: o dela MAIS o que sobe.
  const resultante = new Map<string, SocioQueSobe>();
  for (const s of quadroControladora) {
    resultante.set(s.pessoaId, { ...s });
  }
  for (const s of queSobem) {
    const emitidas = emitidasPorSocio.get(s.pessoaId) ?? 0;
    const atual = resultante.get(s.pessoaId);
    if (atual) {
      atual.quotas += emitidas;
      atual.valor = capitalDeQuotas(atual.quotas);
    } else {
      resultante.set(s.pessoaId, {
        pessoaId: s.pessoaId,
        denominacao: s.denominacao,
        quotas: emitidas,
        valor: capitalDeQuotas(emitidas),
      });
    }
  }
  const quadroResultante = [...resultante.values()].filter((s) => s.quotas > 0);

  return {
    lancamentos,
    problema,
    avisoDeProporcao: avisoDeProporcao(
      queSobem,
      quadroResultante,
      comQuotas.reduce((soma, s) => soma + s.quotas, 0),
    ),
    totalValorCedido,
    totalValorAportado,
    quadroResultante,
  };
}

/**
 * A frase que avisa o desalinhamento de proporção, com os números, ou null
 * quando as duas proporções batem.
 *
 * Por que avisar e não impedir: o desalinhamento é legítimo e previsível (o
 * capital de constituição da controladora não some), e a saída dele é uma
 * TERCEIRA alteração contratual só para arrumar a proporção, não um remendo no
 * mesmo ato. Quem decide entre ajustar antes e aceitar a terceira peça é o
 * consultor, e para decidir ele precisa dos números na hora.
 */
function avisoDeProporcao(
  naProprietaria: readonly SocioQueSobe[],
  naControladora: readonly SocioQueSobe[],
  /**
   * Capital TOTAL da proprietária, e não a soma de quem sobe. Na primeira
   * concentração os dois são a mesma coisa; na segunda, a holding já detém uma
   * parte, e dividir pela soma de quem sobe inflaria a participação de cada um.
   */
  totalPR: number,
): string | null {
  const totalCN = naControladora.reduce((s, x) => s + x.quotas, 0);
  if (totalPR === 0 || totalCN === 0) return null;

  const porId = new Map(naControladora.map((s) => [s.pessoaId, s]));
  const desalinhados = naProprietaria
    .map((s) => ({
      denominacao: s.denominacao,
      antes: (s.quotas / totalPR) * 100,
      depois: ((porId.get(s.pessoaId)?.quotas ?? 0) / totalCN) * 100,
    }))
    // Tolerância de meio milésimo: o mesmo grão que o percentual impresso no
    // contrato usa. Abaixo disso a diferença não aparece na peça.
    .filter((p) => Math.abs(p.antes - p.depois) >= 0.0005);

  if (desalinhados.length === 0) return null;
  const detalhe = desalinhados
    .map((p) => `${p.denominacao}: ${pct(p.antes)} na proprietária, ${pct(p.depois)} na controladora`)
    .join('; ');
  return `O capital de constituição da controladora não some, então o quadro dela não reproduz a proporção da proprietária (${detalhe}). Ajuste antes de subir, ou aceite que a proporção será corrigida por uma alteração contratual própria.`;
}
