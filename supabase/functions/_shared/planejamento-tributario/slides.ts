/**
 * Transforma uma revisão do papel de trabalho no conteúdo do capítulo 03.
 *
 * **Mora aqui, e não em `src/`, porque quem usa é a Edge Function.** Neste
 * repositório os dois mundos não se importam: função é Deno com caminho
 * relativo, front é Vite com o atalho `@/`. E a fronteira certa é esta mesmo: a
 * função não lê arquivo, lê o banco, então a entrada é o formato das tabelas e
 * não o do parser.
 *
 * É puro: não fala com Supabase, não abre pptx, não sabe o que é um token. Quem
 * encaixa isto no molde é a função; quem confere que os números batem é o teste
 * ao lado, contra os gabaritos das fixtures da PT-01.
 *
 * ## O que mudou em 21/09/2026, e por quê
 *
 * O molde deixou de ser tabela e passou a ser SLOT FIXO. O modelo novo da
 * consultoria (`PSA_Modelo de Relatório_Reestruturação Societária e Tributária`)
 * não tem uma única tabela nativa no capítulo 03: medido, o slide do Resumo tem
 * 216 formas e zero `<a:tbl>`, e no modelo inteiro as 6 tabelas que existem estão
 * nos anexos. Em troca, cada quadro tem um número FIXO de linhas com rótulo fixo.
 *
 * Isso vira o módulo do avesso, e para melhor:
 *
 * - **Sumiu a poda.** Não existe mais "entra tudo o que foi preenchido e o
 *   consultor corta no PowerPoint", que era a decisão da Mônica e do Bernardo de
 *   31/08. Não porque alguém mudou de ideia, mas porque o modelo novo já faz a
 *   escolha: ele tem 11 linhas na DRE, não 80. A escolha saiu do consultor e
 *   entrou no desenho do slide.
 * - **Sumiu o transbordo.** Com slot fixo não há linha a mais para estourar, e
 *   `CABEM`, `transbordou` e `escondidas` deixaram de existir.
 * - **Sumiu o Farol e sumiram os comentários por tributo.** O capítulo novo não
 *   tem esses dois slides. O dado continua sendo importado (`wp_farol` e
 *   `wp_comentario` seguem de pé, a PT-02 não mudou); ele só não vai mais ao
 *   deck. Confirmado pelo usuário em 21/09: o modelo novo é autoridade sobre o
 *   conteúdo, e o que ele não mostra deixa de sair.
 *
 * ## O de-para não foi inventado, foi medido
 *
 * Os 11 slots do QUADRO 01 são um reagrupamento das contas do WP, e a prova de
 * que o reagrupamento está certo é aritmética: as partes fecham nos totais e a
 * última linha dá, ao centavo, o `(=) Lucro/Prejuízo do exercício` da planilha.
 * `montaQuadro01` confere isso em toda geração e registra um problema quando não
 * fecha, em vez de imprimir número errado com cara de certo.
 */

/**
 * Os nomes de aba de que este arquivo precisa.
 *
 * **São cópia do `mapa.ts`, e é de propósito**, porque o Deno não alcança
 * `src/`. O que impede a cópia de envelhecer é o teste ao lado, que compara
 * estas quatro strings com as do mapa e quebra se divergirem.
 */
export const ABA_VENDA_DE_ATIVOS = 'Cenário 02 (Venda de Ativos)';
export const ABAS_DE_CENARIO = ['Cenário Atual (PF)', 'Cenário 01 (PFxPJ)', 'Cenário 02 (PJxPJ)'];

/** Uma unidade de valor, igual à do mapa. */
export type UnidadeWp = 'moeda' | 'percentual' | 'texto' | 'data' | 'inteiro';

/** Um valor gravado, no formato de `wp_valor`. */
export interface ValorDaRevisao {
  bloco: 'resumo' | 'dre' | 'apuracao';
  rotulo: string;
  nivel?: number;
  cenario: string;
  contribuinte?: string;
  ano: number;
  valor: number | string;
  unidade: UnidadeWp;
  /** `Resumo!D16`. É daqui que sai a ordem das linhas e das colunas. */
  origemCelula?: string;
}

/** O que a função lê do banco para montar o capítulo. */
export interface Revisao {
  clienteNoWp?: string;
  valores: ValorDaRevisao[];
  /** `DRE Projetada!C7`, o último ano-calendário encerrado. */
  anoBase?: number | null;
  /** `DRE Projetada!C5`, em fração: `0.05` são 5%. */
  crescimentoAnual?: number | null;
}

/** Um problema para registrar em `wp_apresentacao.problemas`. */
export interface ProblemaDoDeck {
  /**
   * `formatacao` quando é sobre o espaço do slide, `origem` quando é sobre de
   * onde o dado vem. A tela mostra só `formatacao`; os dois ficam gravados.
   */
  tipo: 'formatacao' | 'origem';
  onde: string;
  detalhe: string;
}

export type ValorDoSlide = string;

/** Uma parcela do fluxo da transferência: o ano e o que entra nele. */
export interface ParcelaDoFluxo {
  ano: string;
  valor: ValorDoSlide;
}

export interface Deck {
  cliente: string | undefined;
  /** Os exercícios projetados, na ordem. O capítulo mostra os três primeiros. */
  anos: number[];
  /** O ano-calendário de partida, para a premissa 01. */
  anoBase: string;
  /** A taxa de crescimento sem o símbolo, para a premissa 03: `5`. */
  crescimento: string;
  /**
   * A proporção da parceria nos cenários 01 e 02, cada um com as duas pontas.
   * `[maior, menor]`, que é a ordem em que o slide desenha os dois círculos.
   */
  parceria: { cenario01: [ValorDoSlide, ValorDoSlide]; cenario02: [ValorDoSlide, ValorDoSlide] };
  /** QUADRO 01: as 11 linhas, cada uma com um valor por ano. */
  quadro01: ValorDoSlide[][];
  /** A transferência da atividade rural. */
  transferencia: { bens: ValorDoSlide; dividas: ValorDoSlide; parcelas: ParcelaDoFluxo[] };
  /** Os cenários do QUADRO 02, na ordem das colunas. */
  cenarios: string[];
  /** QUADRO 02: as 14 linhas, cada uma com um valor por ano e cenário. */
  quadro02: ValorDoSlide[][][];
  /** A variação contra o primeiro cenário, por ano e cenário. */
  variacao: ValorDoSlide[][];
  /** Os três cartões do topo do Resumo: a soma dos exercícios e a variação. */
  cartoes: { soma: ValorDoSlide; variacao: ValorDoSlide }[];
  problemas: ProblemaDoDeck[];
}

/** Quantos anos o capítulo mostra em cada quadro. É o desenho do modelo. */
export const ANOS_NO_QUADRO = 3;
/** Quantos cenários o QUADRO 02 compara. Coincide com o número de anos, e a
 * constante existe separada justamente para o leitor não achar que é o mesmo 3. */
export const CENARIOS_NO_QUADRO = 3;
/** Quantas parcelas o fluxo da transferência desenha. */
export const PARCELAS_NO_FLUXO = 6;
/** Quantas linhas cada quadro tem. Fixo, porque o slot é fixo. */
export const LINHAS_DO_QUADRO_01 = 11;
export const LINHAS_DO_QUADRO_02 = 14;

/**
 * O formato de número da apresentação, tirado dos gabaritos das fixtures.
 *
 * Três regras, e as três são visíveis nos decks reais: milhar com ponto e sem
 * centavo, negativo entre parênteses em vez de sinal, e **zero vira traço**. O
 * traço é o que faz a tabela dizer "não se aplica" em vez de "custou zero reais",
 * e é a diferença entre um slide certo e um que engana.
 */
export function formataValor(
  valor: number | string | undefined | null,
  unidade: UnidadeWp = 'moeda',
): ValorDoSlide {
  if (valor === undefined || valor === null || valor === '') return '-';
  if (typeof valor === 'string') return valor;
  if (unidade === 'texto') return String(valor);

  if (unidade === 'percentual') {
    const pct = Math.round(valor * 100);
    if (pct === 0) return '-';
    return pct < 0 ? `(${Math.abs(pct)}%)` : `${pct}%`;
  }

  const arredondado = Math.round(valor);
  if (arredondado === 0) return '-';
  const absoluto = Math.abs(arredondado).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  return arredondado < 0 ? `(${absoluto})` : absoluto;
}

/**
 * A variação entre dois cenários, como o modelo a escreve: `−24%` e `+54%`.
 *
 * **Sinal explícito nos dois lados**, porque a faixa compara com o cenário base
 * e "24%" sozinho não diz se subiu ou desceu. O menos é o sinal tipográfico
 * `U+2212`, que é o que está no modelo, e não o hífen.
 */
export function formataVariacao(atual: number, base: number): ValorDoSlide {
  if (!Number.isFinite(base) || Math.round(base) === 0) return '-';
  const pct = Math.round(((atual - base) / base) * 100);
  if (pct === 0) return '0%';
  return pct < 0 ? `−${Math.abs(pct)}%` : `+${pct}%`;
}

/** `Cenário 01 (PFxPJ)` e `Cenário 01` são o mesmo cenário com nomes diferentes. */
function raizDoCenario(cenario: string): string {
  return cenario.replace(/\s*\(.*\)\s*$/, '').trim();
}

/**
 * A ordem da planilha, tirada do endereço da célula.
 *
 * **O banco não guarda ordem.** O PostgREST devolve as linhas como quiser, e sem
 * isto o Resumo saía com Lucro Real antes de Lucro Presumido, e os valores
 * pulavam de coluna entre uma geração e outra: números certos, tabela errada, e
 * nada acusando.
 */
function enderecoDaCelula(v: ValorDaRevisao): [number, number] {
  const m = /![ ]*([A-Z]+)([0-9]+)/.exec(v.origemCelula ?? '');
  if (!m) return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
  let coluna = 0;
  for (const c of m[1]) coluna = coluna * 26 + (c.charCodeAt(0) - 64);
  return [Number(m[2]), coluna];
}

function naOrdemDaPlanilha(a: ValorDaRevisao, b: ValorDaRevisao): number {
  const [la, ca] = enderecoDaCelula(a);
  const [lb, cb] = enderecoDaCelula(b);
  return la - lb || ca - cb;
}

/** A linha da planilha de onde o valor saiu. É ela que agrupa, não o rótulo. */
function linhaDaPlanilha(v: ValorDaRevisao): number {
  return enderecoDaCelula(v)[0];
}

/**
 * Compara rótulo de planilha sem tropeçar em acento, caixa nem espaço dobrado.
 *
 * **O parêntese NÃO é removido, e isso já custou um bug.** Na primeira versão a
 * função descartava o parêntese final para casar `CBS (a partir de 2027)` com
 * `CBS`, e com isso `(-) Máquinas/Equip. (aquisições)` passou a colidir com
 * `(-) Máquinas/Equip. (serviços)`: o investimento do QUADRO 01 saiu somando os
 * dois, quase 10 milhões a mais, e o teste de aritmética foi quem acusou. No WP
 * o parêntese distingue conta, então ele fica. Quem precisa ignorá-lo é só a aba
 * `Resumo`, e para isso existe `chaveDoTributo`.
 */
function chave(rotulo: string): string {
  return rotulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * A mesma chave, ignorando o parêntese final, para os tributos da aba `Resumo`.
 *
 * Ali `CBS (a partir de 2027)` e `CBS` são a mesma linha, e a Família Lunardi
 * escreve dos dois jeitos na mesma aba. Os rótulos daquela aba são curtos e não
 * se distinguem por parêntese, então remover é seguro; na DRE não seria.
 */
function chaveDoTributo(rotulo: string): string {
  return chave(rotulo.replace(/\([^()]*\)\s*$/, ''));
}

function soma(valores: (number | undefined)[]): number {
  /* O genérico é explícito porque, sem ele, o TS escolhe a sobrecarga em que o
   * acumulador herda `number | undefined` do elemento e o retorno deixa de ser
   * número. */
  return valores.reduce<number>((t, v) => t + (typeof v === 'number' ? v : 0), 0);
}

// ─── QUADRO 01, a DRE das Premissas ──────────────────────────────────────────

/** As contas do WP que o QUADRO 01 lê por nome. Todas únicas na aba. */
const CONTA = {
  receita: 'Receita',
  custos: '(-) Custos',
  administrativas: '(-) Despesas administrativas',
  financeiro: '(+/-) Resultado financeiro',
  lucro: '(=) Lucro/Prejuízo do exercício',
  /**
   * **Investimento é esta conta, e só ela.** Não é escolha minha: o WP antigo da
   * Família Lunardi tinha uma linha `(-) Investimentos` explícita, somando
   * `Aquisição de imobilizado`, `Benfeitorias` e `Taxa de manutenção`. No WP
   * atual essa linha foi dissolvida dentro de `(-) Custos` (correção da Mônica de
   * 31/08) e a única conta de capex que sobrou é esta. Reposição de gado fica em
   * custo, como a planilha a coloca.
   */
  investimentos: '(-) Máquinas/Equip. (aquisições)',
  tributos: '(-) Tributos e contribuições',
} as const;

/** Os subtotais de receita que o modelo chama de venda da produção agrícola. */
const RECEITA_DE_PRODUCAO = [
  '(+) M.I. - Agrícola própria',
  '(+) M.I. - Agrícola arrendada',
  '(+) M.E. - Agrícola própria',
  '(+) M.E. - Agrícola arrendada',
  '(+) M.I. - Beneficiamento',
];

/**
 * Os subtotais de receita que o modelo chama de outras receitas da atividade.
 *
 * Arrendamento e aluguel entram aqui e não em produção porque ceder a terra não
 * é vender safra. `RECEITA_DE_PRODUCAO` mais estes dois são os sete filhos de
 * `Receita`, então as duas linhas do slide somam o total sem sobra.
 */
const OUTRAS_RECEITAS = ['(+) M.I.  Arrendamento/Aluguel', '(+) M.I. - Outras receitas'];

/**
 * De que lado a planilha guarda o sinal das contas de saída.
 *
 * **As duas convenções existem em WP de verdade e nenhuma é erro.** Medido na
 * planilha do gabarito da PT-01: `Receita` vem `+152.182.209`, `(-) Custos` vem
 * `+145.757.030` (magnitude, com o sinal no rótulo) e `(+/-) Resultado
 * financeiro` vem `-4.781.983` (já sinalizado). Adivinhar pelo prefixo do rótulo
 * seria frágil, então a convenção se DESCOBRE: calcula-se o lucro dos dois modos
 * e vence o que reconcilia com o `(=) Lucro/Prejuízo do exercício` que a própria
 * planilha traz.
 */
type Convencao = 'magnitude' | 'sinalizado';

/** Um real de folga, para não brigar com arredondamento de ponto flutuante. */
const FOLGA = 1;

function descobreConvencao(
  porAno: Map<number, Map<string, number>>,
): { convencao: Convencao; erro: number } {
  const candidatas: Convencao[] = ['magnitude', 'sinalizado'];
  let melhor = { convencao: 'magnitude' as Convencao, erro: Number.POSITIVE_INFINITY };
  for (const convencao of candidatas) {
    const s = convencao === 'magnitude' ? -1 : 1;
    let erro = 0;
    for (const contas of porAno.values()) {
      const esperado = contas.get(chave(CONTA.lucro));
      if (typeof esperado !== 'number') continue;
      const calculado =
        soma([contas.get(chave(CONTA.receita))]) +
        s * soma([contas.get(chave(CONTA.custos)), contas.get(chave(CONTA.administrativas))]) +
        soma([contas.get(chave(CONTA.financeiro))]);
      erro += Math.abs(calculado - esperado);
    }
    if (erro < melhor.erro) melhor = { convencao, erro };
  }
  return melhor;
}

/**
 * As 11 linhas do QUADRO 01, uma coluna por exercício.
 *
 * **Vem de UMA aba de cenário, a do Cenário Atual**, e o título do quadro no
 * modelo diz isso em letra: "DEMONSTRAÇÃO DE RESULTADO PROJETADA — CENÁRIO
 * ATUAL". Está medido desde a PT-03: no deck da Família Lunardi o lucro das
 * Premissas é célula por célula a aba `Cenário Atual`, e a mesma linha do
 * `Cenário Avaliado 01` não aparece em slide nenhum.
 */
function montaQuadro01(valores: ValorDaRevisao[]): {
  linhas: ValorDoSlide[][];
  anos: number[];
  problemas: ProblemaDoDeck[];
} {
  const problemas: ProblemaDoDeck[] = [];
  const ONDE = 'Premissas, o QUADRO 01';

  const daDre = valores.filter((v) => v.bloco === 'dre');
  const cenarios = [...new Set(daDre.map((v) => v.cenario))];
  const base = ABAS_DE_CENARIO.find((n) => cenarios.includes(n)) ?? cenarios[0];
  if (base !== undefined && base !== ABAS_DE_CENARIO[0]) {
    problemas.push({
      tipo: 'origem',
      onde: ONDE,
      detalhe:
        `O WP não trouxe DRE do "${ABAS_DE_CENARIO[0]}", que é a aba das Premissas. ` +
        `Saiu a do "${base}".`,
    });
  }

  const daAba = daDre.filter((v) => v.cenario === base).sort(naOrdemDaPlanilha);
  const anos = [...new Set(daAba.map((v) => v.ano))].sort((a, b) => a - b);

  /* Conta por ano, com a chave normalizada. Repetida soma, que é o que o
   * desdobramento em duas linhas do WP quer dizer. */
  const porAno = new Map<number, Map<string, number>>();
  for (const v of daAba) {
    if (typeof v.valor !== 'number') continue;
    const contas = porAno.get(v.ano) ?? new Map<string, number>();
    const k = chave(v.rotulo);
    contas.set(k, (contas.get(k) ?? 0) + v.valor);
    porAno.set(v.ano, contas);
  }

  const { convencao, erro } = descobreConvencao(porAno);
  if (porAno.size > 0 && erro > FOLGA) {
    problemas.push({
      tipo: 'origem',
      onde: ONDE,
      detalhe:
        `As contas da DRE não fecham com o "${CONTA.lucro}" da planilha: ` +
        `sobram ${formataValor(erro)} somando os exercícios. Os números do quadro saem ` +
        `como estão, mas alguém precisa olhar a aba antes de apresentar.`,
    });
  }
  const s = convencao === 'magnitude' ? -1 : 1;

  const linhas: ValorDoSlide[][] = Array.from({ length: LINHAS_DO_QUADRO_01 }, () => []);
  for (const ano of anos.slice(0, ANOS_NO_QUADRO)) {
    const c = porAno.get(ano) ?? new Map<string, number>();
    const pega = (nome: string) => c.get(chave(nome));
    const pegaTodos = (nomes: string[]) => soma(nomes.map((n) => c.get(chave(n))));

    const receita = soma([pega(CONTA.receita)]);
    const producao = pegaTodos(RECEITA_DE_PRODUCAO);
    const outras = pegaTodos(OUTRAS_RECEITAS);
    /* A partir daqui tudo é sinalizado: saída é negativa. */
    const custos = s * soma([pega(CONTA.custos)]);
    const administrativas = s * soma([pega(CONTA.administrativas)]);
    const investimentos = s * soma([pega(CONTA.investimentos)]);
    const tributos = s * soma([pega(CONTA.tributos)]);
    const financeiro = soma([pega(CONTA.financeiro)]);

    const custeio = custos + administrativas - investimentos;
    const operacional = receita + custeio;
    const antesDosInvestimentos = operacional + financeiro;

    const doAno = [
      receita,
      producao,
      outras,
      custeio,
      custos - investimentos - tributos,
      administrativas + tributos,
      operacional,
      financeiro,
      antesDosInvestimentos,
      investimentos,
      antesDosInvestimentos + investimentos,
    ];
    doAno.forEach((v, i) => linhas[i].push(formataValor(v)));

    /*
     * **As três provas, em toda geração.** O quadro é um reagrupamento, então as
     * partes têm de fechar nos totais e a última linha tem de dar o lucro da
     * planilha. Quando não dá, o slide sai com aviso em vez de sair calado: é o
     * tipo de erro que ninguém percebe olhando, porque todo número parece
     * plausível.
     */
    const lucroDaPlanilha = pega(CONTA.lucro);
    const provas: [string, number][] = [
      ['a venda da produção mais as outras receitas não dão a receita bruta', producao + outras - receita],
      ['insumos mais administrativas não dão as despesas de custeio', (custos - investimentos - tributos) + (administrativas + tributos) - custeio],
    ];
    if (typeof lucroDaPlanilha === 'number') {
      provas.push([
        `o resultado final não dá o "${CONTA.lucro}" da planilha`,
        antesDosInvestimentos + investimentos - lucroDaPlanilha,
      ]);
    }
    for (const [queixa, diferenca] of provas) {
      if (Math.abs(diferenca) <= FOLGA) continue;
      problemas.push({
        tipo: 'origem',
        onde: ONDE,
        detalhe: `Em ${ano}, ${queixa}: diferença de ${formataValor(diferenca)}.`,
      });
    }
  }

  /* Ano que o estudo não tem sai como traço, senão o slot fica vazio e parece
   * falha de leitura. */
  for (const linha of linhas) {
    while (linha.length < ANOS_NO_QUADRO) linha.push('-');
  }

  if (anos.length > ANOS_NO_QUADRO) {
    problemas.push({
      tipo: 'formatacao',
      onde: ONDE,
      detalhe:
        `O quadro tem ${ANOS_NO_QUADRO} colunas e o estudo tem ${anos.length} exercícios. ` +
        `Ficaram de fora: ${anos.slice(ANOS_NO_QUADRO).join(', ')}.`,
    });
  }

  return { linhas, anos, problemas };
}

// ─── QUADRO 02, o Resumo da tributação ───────────────────────────────────────

/** Os cabeçalhos de grupo da aba `Resumo`, na ordem em que ela os escreve. */
const GRUPOS_DO_RESUMO = [
  ['Pessoa Física', 'Pessoas Físicas'],
  ['PJ - Lucro Presumido'],
  ['PJ - Lucro Real'],
];

/**
 * Onde cada linha da aba `Resumo` cai no QUADRO 02, por grupo.
 *
 * **Agrupa pela LINHA da planilha, nunca pelo rótulo.** `IRPJ/CSLL` aparece duas
 * vezes na aba e `INSS` três, uma sob cada grupo; casar por nome transformava as
 * três numa e as últimas sobrescreviam as anteriores.
 *
 * Duas linhas da aba caem no mesmo slot de propósito: `PIS/Cofins` e `CBS` viram
 * a única linha `IBS e CBS` do modelo. Os dois regimes não convivem no mesmo
 * exercício, então somar dá a carga de consumo do ano e fecha contra o total do
 * grupo, que a aba calcula incluindo os dois.
 */
const DESTINO_NO_QUADRO_02: Record<string, number>[] = [
  { irpf: 2, irpfm: 3, cbs: 4, inss: 5 },
  { irpjcsll: 7, piscofins: 8, cbs: 8, inss: 9 },
  { irpjcsll: 11, piscofins: 12, cbs: 12, inss: 13 },
];

/** A linha do quadro que é o total de cada grupo, e a do total geral. */
const TOTAL_DO_GRUPO = [1, 6, 10];
const LINHA_DO_TOTAL = 14;

/** Os dois rótulos de fecho da aba, que não são tributo. */
const ROTULO_TOTAL = 'Total';
const ROTULO_VARIACAO = 'Redução';

function montaQuadro02(valores: ValorDaRevisao[]): {
  linhas: ValorDoSlide[][][];
  variacao: ValorDoSlide[][];
  cartoes: { soma: ValorDoSlide; variacao: ValorDoSlide }[];
  cenarios: string[];
  anos: number[];
  problemas: ProblemaDoDeck[];
} {
  const problemas: ProblemaDoDeck[] = [];
  const ONDE = 'Resumo, o QUADRO 02';

  const doResumo = valores.filter((v) => v.bloco === 'resumo').sort(naOrdemDaPlanilha);
  const anos = [...new Set(doResumo.map((v) => v.ano))].sort((a, b) => a - b);

  /* A ordem dos cenários é a das colunas da planilha, não a alfabética. */
  const cenarios: string[] = [];
  for (const v of doResumo) {
    const nome = raizDoCenario(v.cenario);
    if (!cenarios.includes(nome)) cenarios.push(nome);
  }

  /* (ano, cenário, linha do quadro) -> soma. */
  const celulas = new Map<string, number>();
  const totais = new Map<string, number>();
  const variacaoDaAba = new Map<string, number>();
  const semDestino = new Set<string>();
  const em = (ano: number, cenario: string, linha: number) => `${ano}|${cenario}|${linha}`;

  for (const cenario of cenarios) {
    for (const ano of anos) {
      const doCorte = doResumo
        .filter((v) => raizDoCenario(v.cenario) === cenario && v.ano === ano)
        .sort((a, b) => linhaDaPlanilha(a) - linhaDaPlanilha(b));

      let grupo = -1;
      for (const v of doCorte) {
        const k = chaveDoTributo(v.rotulo);
        const abre = GRUPOS_DO_RESUMO.findIndex((nomes) => nomes.some((n) => chaveDoTributo(n) === k));
        if (abre >= 0) {
          grupo = abre;
          if (typeof v.valor === 'number') {
            const alvo = em(ano, cenario, TOTAL_DO_GRUPO[abre]);
            celulas.set(alvo, (celulas.get(alvo) ?? 0) + v.valor);
          }
          continue;
        }
        if (k === chaveDoTributo(ROTULO_TOTAL)) {
          if (typeof v.valor === 'number') {
            celulas.set(em(ano, cenario, LINHA_DO_TOTAL), v.valor);
            totais.set(`${ano}|${cenario}`, v.valor);
          }
          continue;
        }
        if (k === chaveDoTributo(ROTULO_VARIACAO)) {
          if (typeof v.valor === 'number') variacaoDaAba.set(`${ano}|${cenario}`, v.valor);
          continue;
        }
        const linha = grupo >= 0 ? DESTINO_NO_QUADRO_02[grupo][k] : undefined;
        if (linha === undefined) {
          semDestino.add(v.rotulo);
          continue;
        }
        if (typeof v.valor !== 'number') continue;
        const alvo = em(ano, cenario, linha);
        celulas.set(alvo, (celulas.get(alvo) ?? 0) + v.valor);
      }
    }
  }

  /*
   * **Linha da aba que o modelo novo não tem sai, e isso é dito.** Na Família
   * Lunardi são `ITBI`, `Fundos de Investimento` e `Custo da estrutura`. Medido:
   * as três ficam FORA do `Total` da aba, que é a soma dos três grupos, então
   * descartá-las não desequilibra o quadro. O aviso existe para quem montou a
   * planilha não procurar no slide uma linha que preencheu.
   */
  for (const rotulo of semDestino) {
    problemas.push({
      tipo: 'origem',
      onde: ONDE,
      detalhe: `O quadro do modelo novo não tem linha para "${rotulo}", então ela não sai.`,
    });
  }

  const anosMostrados = anos.slice(0, ANOS_NO_QUADRO);
  const cenariosMostrados = cenarios.slice(0, CENARIOS_NO_QUADRO);

  const linhas: ValorDoSlide[][][] = [];
  for (let li = 1; li <= LINHAS_DO_QUADRO_02; li += 1) {
    const daLinha: ValorDoSlide[][] = [];
    for (let ai = 0; ai < ANOS_NO_QUADRO; ai += 1) {
      const doAno: ValorDoSlide[] = [];
      for (let ci = 0; ci < CENARIOS_NO_QUADRO; ci += 1) {
        const ano = anosMostrados[ai];
        const cenario = cenariosMostrados[ci];
        if (ano === undefined || cenario === undefined) {
          doAno.push('-');
          continue;
        }
        doAno.push(formataValor(celulas.get(em(ano, cenario, li))));
      }
      daLinha.push(doAno);
    }
    linhas.push(daLinha);
  }

  /*
   * **A variação é recalculada dos totais, não lida da aba.** A linha `Redução`
   * existe, mas só na coluna dos cenários avaliados e com o sinal trocado de um
   * estudo para outro; o gabarito da PT-01 traz `-0` e `1`, que não é percentual
   * de nada. Calcular do total é reprodutível e casa com o que a faixa do modelo
   * afirma comparar.
   */
  const variacao: ValorDoSlide[][] = [];
  for (let ai = 0; ai < ANOS_NO_QUADRO; ai += 1) {
    const doAno: ValorDoSlide[] = [];
    const ano = anosMostrados[ai];
    const referencia = ano === undefined ? undefined : totais.get(`${ano}|${cenariosMostrados[0]}`);
    for (let ci = 0; ci < CENARIOS_NO_QUADRO; ci += 1) {
      const cenario = cenariosMostrados[ci];
      const atual = ano === undefined || cenario === undefined ? undefined : totais.get(`${ano}|${cenario}`);
      if (ci === 0 || typeof atual !== 'number' || typeof referencia !== 'number') {
        doAno.push('-');
        continue;
      }
      doAno.push(formataVariacao(atual, referencia));
    }
    variacao.push(doAno);
  }

  const somaPorCenario = cenariosMostrados.map((cenario) =>
    soma(anosMostrados.map((ano) => totais.get(`${ano}|${cenario}`))),
  );
  const cartoes = somaPorCenario.map((s, ci) => ({
    soma: formataValor(s),
    variacao: ci === 0 ? '-' : formataVariacao(s, somaPorCenario[0]),
  }));

  if (cenarios.length > CENARIOS_NO_QUADRO) {
    problemas.push({
      tipo: 'formatacao',
      onde: ONDE,
      detalhe:
        `O quadro tem ${CENARIOS_NO_QUADRO} cenários e o estudo tem ${cenarios.length}. ` +
        `Ficaram de fora: ${cenarios.slice(CENARIOS_NO_QUADRO).join(', ')}.`,
    });
  }

  return { linhas, variacao, cartoes, cenarios: cenariosMostrados, anos, problemas };
}

// ─── A transferência da atividade rural ──────────────────────────────────────

const APURACAO = {
  bens: 'Bens da atividade rural',
  dividas: 'Dívidas da atividade rural',
  /**
   * **A parcela é esta linha, e a fórmula da planilha explica por quê.** Na aba
   * da venda de ativos, `Resultado do exercício` de cada ano é
   * `IF(bens < dívidas que vencem no ano, bens, dívidas que vencem no ano)`,
   * puxando `'Dívidas da Atv. Rural'!I35:O35`. Ou seja é o recebimento daquele
   * ano, dimensionado para quitar o que vence, que é exatamente o que a faixa do
   * modelo afirma: "o recebimento quita as dívidas que ficaram na pessoa física".
   */
  parcela: 'Resultado do exercício',
} as const;

function montaTransferencia(valores: ValorDaRevisao[]): {
  transferencia: Deck['transferencia'];
  problemas: ProblemaDoDeck[];
} {
  const problemas: ProblemaDoDeck[] = [];
  const ONDE = 'Transferência da atividade rural';

  const daVenda = valores.filter((v) => v.cenario === ABA_VENDA_DE_ATIVOS);
  const primeiro = (nome: string) => daVenda.find((v) => chave(v.rotulo) === chave(nome));

  const bens = primeiro(APURACAO.bens);
  const dividas = primeiro(APURACAO.dividas);
  for (const [nome, achado] of [[APURACAO.bens, bens], [APURACAO.dividas, dividas]] as const) {
    if (achado === undefined) {
      problemas.push({
        tipo: 'origem',
        onde: ONDE,
        detalhe: `A linha "${nome}" não veio na leitura, então o slide sai sem esse número.`,
      });
    }
  }

  const todas = daVenda
    .filter((v) => chave(v.rotulo) === chave(APURACAO.parcela))
    .sort((a, b) => a.ano - b.ano);
  const parcelas = todas.slice(0, PARCELAS_NO_FLUXO).map((v) => ({
    ano: String(v.ano),
    valor: formataValor(v.valor, v.unidade),
  }));
  while (parcelas.length < PARCELAS_NO_FLUXO) parcelas.push({ ano: '-', valor: '-' });

  /*
   * **O corte do 7º ano passa a ser dito.** A aba tem sete colunas de ano por
   * construção e o fluxo do modelo desenha seis, então a última parcela não tem
   * onde cair. Isso já acontecia antes, num `slice(0, 6)` calado dentro do
   * gerador; o que muda aqui é que o deck diz quanto ficou de fora. Importa
   * porque a faixa do slide afirma que o recebimento quita as dívidas, e sem a
   * última parcela a linha não soma o que a caixa ao lado declara.
   */
  const sobraram = todas.slice(PARCELAS_NO_FLUXO).filter((v) => typeof v.valor === 'number' && v.valor !== 0);
  if (sobraram.length > 0) {
    const forasoma = soma(sobraram.map((v) => (typeof v.valor === 'number' ? v.valor : 0)));
    const mostrado = soma(todas.slice(0, PARCELAS_NO_FLUXO).map((v) => (typeof v.valor === 'number' ? v.valor : 0)));
    problemas.push({
      tipo: 'formatacao',
      onde: ONDE,
      detalhe:
        `O fluxo desenha ${PARCELAS_NO_FLUXO} parcelas e o estudo tem ${todas.length}. ` +
        `Ficou de fora ${formataValor(forasoma)} de ${sobraram.map((v) => v.ano).join(', ')}, ` +
        `então as parcelas mostradas somam ${formataValor(mostrado)} e não o total das dívidas.`,
    });
  }

  return {
    transferencia: {
      bens: formataValor(bens?.valor, bens?.unidade),
      dividas: formataValor(dividas?.valor, dividas?.unidade),
      parcelas,
    },
    problemas,
  };
}

// ─── Os cenários avaliados ───────────────────────────────────────────────────

/** Uma taxa que vem como fração ou como inteiro, escrita sem o símbolo. */
function escrevePercentualInteiro(taxa: number | null | undefined): ValorDoSlide {
  if (typeof taxa !== 'number' || !Number.isFinite(taxa)) return '-';
  return String(Math.round(Math.abs(taxa) > 1 ? taxa : taxa * 100));
}

/**
 * O rótulo com que o parser grava o percentual de parceria em `wp_valor`.
 *
 * **Cópia do `parser.ts`, pelo mesmo motivo dos nomes de aba:** o Deno não
 * alcança `src/`. O teste ao lado compara as duas strings e quebra se divergirem.
 */
export const ROTULO_PERCENTUAL_DE_PARCERIA = 'Percentual de parceria agrícola';

/**
 * A proporção da parceria, como o slide desenha: a ponta maior primeiro.
 *
 * O WP guarda um número só, o percentual da parceria agrícola; a outra ponta é o
 * complemento. Sem o dado, as duas pontas saem como traço e o problema fica
 * registrado, porque inventar `90% / 10%` seria apresentar o exemplo do modelo
 * como se fosse medida do cliente.
 */
function montaParceria(
  percentual: number | null | undefined,
): [ValorDoSlide, ValorDoSlide] | null {
  if (typeof percentual !== 'number' || !Number.isFinite(percentual)) return null;
  /* Aceita `0.9` e `90`, porque a célula aparece dos dois jeitos. */
  const fracao = Math.abs(percentual) > 1 ? percentual / 100 : percentual;
  /*
   * **Zero e um não são parceria.** No modelo em branco a célula vem `0`, e
   * escrever "100% / 0%" afirmaria uma divisão que ninguém mediu.
   */
  if (fracao <= 0 || fracao >= 1) return null;
  const maior = Math.max(fracao, 1 - fracao);
  const menor = Math.min(fracao, 1 - fracao);
  const escreve = (f: number) => `${Math.round(f * 100)}%`;
  return [escreve(maior), escreve(menor)];
}

/** O percentual de parceria de uma aba de cenário, lido de `wp_valor`. */
function percentualDaAba(valores: ValorDaRevisao[], aba: string): number | undefined {
  const achado = valores.find(
    (v) => v.cenario === aba && chave(v.rotulo) === chave(ROTULO_PERCENTUAL_DE_PARCERIA),
  );
  return typeof achado?.valor === 'number' ? achado.valor : undefined;
}

// ─── O capítulo inteiro ──────────────────────────────────────────────────────

export function montaDeck(leitura: Revisao): Deck {
  const doQuadro01 = montaQuadro01(leitura.valores);
  const doQuadro02 = montaQuadro02(leitura.valores);
  const daTransferencia = montaTransferencia(leitura.valores);

  const problemas: ProblemaDoDeck[] = [
    ...doQuadro01.problemas,
    ...doQuadro02.problemas,
    ...daTransferencia.problemas,
  ];

  /*
   * O percentual de parceria fica fora da conta dos exercícios: o ano dele é
   * preenchimento de coluna NOT NULL, não informação, e deixá-lo entrar podia
   * inventar um exercício que o estudo não tem.
   */
  const anos = [
    ...new Set(
      leitura.valores
        .filter((v) => v.bloco !== 'apuracao')
        .filter((v) => chave(v.rotulo) !== chave(ROTULO_PERCENTUAL_DE_PARCERIA))
        .map((v) => v.ano),
    ),
  ].sort((a, b) => a - b);

  const anoBase =
    typeof leitura.anoBase === 'number'
      ? String(leitura.anoBase)
      : anos.length > 0
        ? String(anos[0] - 1)
        : '-';
  if (typeof leitura.anoBase !== 'number' && anos.length > 0) {
    problemas.push({
      tipo: 'origem',
      onde: 'Premissas, o ano-base',
      detalhe:
        `O WP não trouxe o ano-calendário de partida (\`DRE Projetada!C7\`), então a ` +
        `premissa saiu com ${anoBase}, que é o primeiro exercício menos um.`,
    });
  }

  /* A célula aparece como fração (`0,05`) e como inteiro (`5`), e as duas querem
   * dizer 5%. O slide escreve o número sem o símbolo, que já está no molde. */
  const crescimento = escrevePercentualInteiro(leitura.crescimentoAnual);
  if (crescimento === '-') {
    problemas.push({
      tipo: 'origem',
      onde: 'Premissas, o crescimento',
      detalhe: 'O WP não trouxe o percentual de crescimento anual (`DRE Projetada!C5`).',
    });
  }

  const c1 = montaParceria(percentualDaAba(leitura.valores, ABAS_DE_CENARIO[1]));
  const c2 = montaParceria(percentualDaAba(leitura.valores, ABAS_DE_CENARIO[2]));
  if (c1 === null || c2 === null) {
    problemas.push({
      tipo: 'origem',
      onde: 'Cenários avaliados',
      detalhe:
        'O WP não trouxe o percentual de parceria agrícola (linha 11 das abas de cenário), ' +
        'então a proporção dos cenários sai como traço.',
    });
  }

  return {
    cliente: leitura.clienteNoWp,
    anos,
    anoBase,
    crescimento,
    parceria: { cenario01: c1 ?? ['-', '-'], cenario02: c2 ?? ['-', '-'] },
    quadro01: doQuadro01.linhas,
    transferencia: daTransferencia.transferencia,
    cenarios: doQuadro02.cenarios,
    quadro02: doQuadro02.linhas,
    variacao: doQuadro02.variacao,
    cartoes: doQuadro02.cartoes,
    problemas,
  };
}
