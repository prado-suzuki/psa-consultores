import {
  FORMAS_MOVIMENTO,
  pagamentoDasColunas,
  type FormaPagamento,
  type TipoMovimento,
} from './movimentoQuotas';

// A projeção do quadro societário em QUALQUER ponto da sequência de movimentos.
//
// A view `v_quadro_societario` dá o acumulado FINAL, que é o que o preâmbulo e o
// consolidado precisam. A peça real precisa de outra coisa: a 2ª alteração da
// MMS Agro publica, na cláusula sexta, o quadro DEPOIS do aumento de capital e
// ANTES da cessão das quotas à holding, tudo no mesmo instrumento. Nenhum motor
// que só saiba ler o estado final consegue escrever essa cláusula.
//
// Daí o fold aqui, em TypeScript puro, sobre as linhas do livro: mesma regra da
// view (entradas menos saídas, saldo zero fora do quadro, `ordem` = created_at do
// primeiro movimento do sócio), com um CORTE. Rodar a projeção sem corte tem de
// reproduzir a view exatamente, e é isso que o teste amarra.

/** Uma linha do livro, no formato em que a projeção a consome. */
export interface MovimentoDoLedger {
  id: string;
  empresaPessoaId: string;
  tipo: TipoMovimento;
  origemPessoaId: string | null;
  destinoPessoaId: string | null;
  quotas: number;
  /** `vlr_capital_arredondado`: valor de CAPITAL das quotas movidas. */
  valor: number;
  createdAt: string;
  dataMovimento: string | null;
  atoId: string | null;
  sequencia: number | null;
  documentoGeradoId: string | null;
  /** Com o que o aporte foi pago (moeda corrente quando não há outra coisa). */
  pagamento: FormaPagamento;
}

/** Colunas cruas de `movimentacao_quotas` que a projeção sabe ler. */
export interface LinhaCrua {
  id: string;
  empresa_pessoa_id: string;
  tipo: string;
  origem_pessoa_id: string | null;
  destino_pessoa_id: string | null;
  quotas: number | string;
  vlr_capital_arredondado: number | string | null;
  created_at: string;
  data_movimento: string | null;
  ato_id: string | null;
  sequencia: number | null;
  documento_gerado_id: string | null;
  bem_id: string | null;
  pago_com_empresa_pessoa_id: string | null;
  pago_com_quotas: number | string | null;
  pago_com_valor: number | string | null;
}

/** Converte a linha do banco no movimento da projeção. `bigint` chega como string. */
export function movimentoDaLinha(l: LinhaCrua): MovimentoDoLedger {
  return {
    id: l.id,
    empresaPessoaId: l.empresa_pessoa_id,
    tipo: l.tipo as TipoMovimento,
    origemPessoaId: l.origem_pessoa_id,
    destinoPessoaId: l.destino_pessoa_id,
    quotas: Number(l.quotas ?? 0),
    valor: Number(l.vlr_capital_arredondado ?? 0),
    createdAt: l.created_at,
    dataMovimento: l.data_movimento,
    atoId: l.ato_id,
    sequencia: l.sequencia,
    documentoGeradoId: l.documento_gerado_id,
    pagamento: pagamentoDasColunas({
      bem_id: l.bem_id,
      pago_com_empresa_pessoa_id: l.pago_com_empresa_pessoa_id,
      pago_com_quotas: l.pago_com_quotas == null ? null : Number(l.pago_com_quotas),
      pago_com_valor: l.pago_com_valor == null ? null : Number(l.pago_com_valor),
    }),
  };
}

/**
 * A ordem canônica do livro: `created_at`, e `sequencia` como desempate.
 *
 * É `created_at` e não `data_movimento` porque é ele que a view já usa em
 * `ordem` (a ordem dos sócios no preâmbulo) e porque a gravação o escalona de
 * propósito, um milissegundo por linha (ver `useGravarAporteInicial`). A
 * sequência entra como desempate porque os lançamentos de um mesmo ato nascem
 * num insert em lote, e aí o carimbo pode empatar: é justamente dentro do ato
 * que a ordem tem de ser exata, senão o quadro intermediário sai errado.
 */
export function ordenarMovimentos(movs: readonly MovimentoDoLedger[]): MovimentoDoLedger[] {
  return [...movs].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    const sa = a.sequencia ?? 0;
    const sb = b.sequencia ?? 0;
    if (sa !== sb) return sa - sb;
    // Último desempate para a projeção ser função só dos dados, e não da ordem
    // em que o PostgREST devolveu as linhas.
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * Até onde projetar.
 *
 *   'fim'            — o acumulado final, o mesmo da view.
 *   'antesDoAto'     — o estado que o ato encontrou (o quadro "anterior" da peça).
 *   'sequenciaDoAto' — dentro do ato, incluindo até a sequência dada. É o corte
 *                      da cláusula que publica o quadro no meio do instrumento.
 */
export type CorteDaProjecao =
  | { ate: 'fim' }
  | { ate: 'antesDoAto'; atoId: string }
  | { ate: 'sequenciaDoAto'; atoId: string; sequencia: number };

/** Uma linha do quadro projetado, no mesmo formato que a view publica. */
export interface LinhaProjetada {
  pessoaId: string;
  quotas: number;
  vlrTotal: number;
  /** created_at do PRIMEIRO movimento do sócio: a ordem do preâmbulo. */
  ordem: string;
  movimentoIds: string[];
}

/**
 * Onde o corte cai na sequência ordenada: o índice do ÚLTIMO movimento que
 * entra. -1 quando nada entra, `movs.length - 1` quando tudo entra.
 */
function indiceDoCorte(movs: readonly MovimentoDoLedger[], corte: CorteDaProjecao): number {
  if (corte.ate === 'fim') return movs.length - 1;
  if (corte.ate === 'antesDoAto') {
    const primeiro = movs.findIndex((m) => m.atoId === corte.atoId);
    // Ato que não está no livro não corta nada: projeta tudo, que é o estado
    // que ele encontraria se fosse gravado agora.
    return primeiro === -1 ? movs.length - 1 : primeiro - 1;
  }
  let ultimo = -1;
  for (let i = 0; i < movs.length; i++) {
    const m = movs[i];
    if (m.atoId === corte.atoId && (m.sequencia ?? 0) > corte.sequencia) break;
    ultimo = i;
  }
  return ultimo;
}

/**
 * O quadro societário de UMA empresa no ponto pedido: entradas menos saídas,
 * sócio de saldo zero fora, na ordem do primeiro movimento de cada um.
 *
 * Recebe os movimentos já lidos (de qualquer empresa: filtra aqui) para poder
 * ser puro e testável, e porque quem projeta o par espelhado da subida lê o ato
 * inteiro de uma vez, nas duas empresas.
 */
export function quadroEm(
  movimentos: readonly MovimentoDoLedger[],
  empresaPessoaId: string,
  corte: CorteDaProjecao = { ate: 'fim' },
): LinhaProjetada[] {
  // O corte é da SEQUÊNCIA DO ATO, que atravessa empresas: filtrar antes de
  // localizar o corte faria o índice do ato mudar conforme a empresa olhada.
  const todos = ordenarMovimentos(movimentos);
  const limite = indiceDoCorte(todos, corte);

  const porPessoa = new Map<string, LinhaProjetada>();
  const registrar = (pessoaId: string, quotas: number, valor: number, mov: MovimentoDoLedger) => {
    const atual = porPessoa.get(pessoaId);
    if (atual) {
      atual.quotas += quotas;
      atual.vlrTotal += valor;
      atual.movimentoIds.push(mov.id);
      return;
    }
    porPessoa.set(pessoaId, {
      pessoaId,
      quotas,
      vlrTotal: valor,
      ordem: mov.createdAt,
      movimentoIds: [mov.id],
    });
  };

  todos.forEach((mov, i) => {
    if (i > limite) return;
    if (mov.empresaPessoaId !== empresaPessoaId) return;
    if (mov.destinoPessoaId) registrar(mov.destinoPessoaId, mov.quotas, mov.valor, mov);
    if (mov.origemPessoaId) registrar(mov.origemPessoaId, -mov.quotas, -mov.valor, mov);
  });

  return [...porPessoa.values()]
    .filter((l) => l.quotas !== 0)
    .sort((a, b) => (a.ordem < b.ordem ? -1 : a.ordem > b.ordem ? 1 : 0));
}

/**
 * Os movimentos de um ato, na ordem em que ele os executa. É o que a peça
 * percorre para escrever uma resolução por movimento.
 */
export function movimentosDoAto(
  movimentos: readonly MovimentoDoLedger[],
  atoId: string,
): MovimentoDoLedger[] {
  return ordenarMovimentos(movimentos.filter((m) => m.atoId === atoId));
}

/**
 * Movimentos ainda NÃO formalizados por documento nenhum: os eventos pendentes,
 * que é o que a próxima alteração contratual tem de contar.
 *
 * `documento_gerado_id` está documentado no banco como "o ato que formalizou o
 * movimento, quando existe"; movimento sem documento é evento pendente, e é daí
 * que o assistente deriva a lista de eventos em vez de perguntar.
 */
export function movimentosPendentes(
  movimentos: readonly MovimentoDoLedger[],
  empresaPessoaId: string,
): MovimentoDoLedger[] {
  return ordenarMovimentos(
    movimentos.filter((m) => m.empresaPessoaId === empresaPessoaId && !m.documentoGeradoId),
  );
}

/** O ato, no mínimo que a procedência precisa saber dele. */
export interface AtoParaProcedencia {
  id: string;
  data: string | null;
  descricao: string | null;
}

/** 'AAAA-MM-DD' → 'DD/MM/AAAA', sem passar por Date (evita fuso). */
function dataBR(iso: string | null): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

/**
 * De onde veio cada movimento, em uma frase curta por linha do livro. É o que a
 * tela do quadro mostra ao lado do sócio para o saldo deixar de ser um número
 * sem história.
 *
 * "Constituição" é o PREFIXO de aportes sem ato: são os lançamentos que abriram
 * a sociedade, e é isso que a gravação do quadro inicial escreve. O primeiro
 * movimento que não seja aporte, ou que pertença a um ato, encerra o prefixo, e
 * dali em diante cada movimento se nomeia pelo ato (quando tem) ou pela forma
 * dele. Assim nenhum aumento posterior é confundido com o capital de abertura.
 */
export function procedenciaDosMovimentos(
  movimentos: readonly MovimentoDoLedger[],
  empresaPessoaId: string,
  atos: readonly AtoParaProcedencia[] = [],
): Map<string, string> {
  const porAto = new Map(atos.map((a) => [a.id, a]));
  const doEmpresa = ordenarMovimentos(
    movimentos.filter((m) => m.empresaPessoaId === empresaPessoaId),
  );

  const rotulos = new Map<string, string>();
  let naConstituicao = true;
  for (const m of doEmpresa) {
    if (naConstituicao && m.tipo === 'aporte' && !m.atoId) {
      rotulos.set(m.id, 'Constituição');
      continue;
    }
    naConstituicao = false;
    if (m.atoId) {
      const ato = porAto.get(m.atoId);
      const nome = ato?.descricao?.trim();
      const quando = dataBR(ato?.data ?? m.dataMovimento);
      rotulos.set(m.id, nome || (quando ? `Ato de ${quando}` : 'Ato societário'));
      continue;
    }
    const forma = FORMAS_MOVIMENTO[m.tipo]?.label ?? m.tipo;
    const quando = dataBR(m.dataMovimento);
    rotulos.set(m.id, quando ? `${forma} de ${quando}` : forma);
  }
  return rotulos;
}
