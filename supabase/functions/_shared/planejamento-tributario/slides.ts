/**
 * Transforma uma revisão do papel de trabalho no conteúdo dos slides.
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
 * ## O sistema não escolhe as contas
 *
 * **A Mônica e o Bernardo decidiram em 31/08/2026 que quem escolhe o que aparece
 * no slide é o consultor**, não o sistema. Está escrito no `README.md` da fixture
 * da DRE: a seção `slide` de lá é a escolha feita naquele estudo, um exemplo, não
 * uma regra. Por isso aqui **entra tudo o que foi preenchido**, e a poda acontece
 * no PowerPoint, onde as tabelas são nativas e editáveis.
 *
 * A consequência é que a tabela pode passar do espaço, e passar caladamente seria
 * o pior dos mundos. Daí o `transbordou`: o deck avisa quantas linhas saíram e
 * quantas cabem, e quem for montar já abre sabendo o que ajustar.
 */

/**
 * Os nomes de aba de que este arquivo precisa.
 *
 * **São cópia do `mapa.ts`, e é de propósito**, porque o Deno não alcança
 * `src/`. O que impede a cópia de envelhecer é o teste ao lado, que compara
 * estas quatro strings com as do mapa e quebra se divergirem.
 */
export const ABA_VENDA_DE_ATIVOS = 'Cenário 02 (Venda de Ativos)';
export const ABAS_DE_CENARIO = [
  'Cenário Atual (PF)',
  'Cenário 01 (PFxPJ)',
  'Cenário 02 (PJxPJ)',
];

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
  /** `Resumo!D16`. É daqui que sai a ordem das linhas no slide. */
  origemCelula?: string;
}

/** Uma célula do Farol, no formato de `wp_farol`. */
export interface FarolDaRevisao {
  rotulo: string;
  regime: 'presumido' | 'real';
  pessoa: 'pf' | 'pj';
  valor: number | string;
}

/** Uma linha de comentário, no formato de `wp_comentario`. */
export interface ComentarioDaRevisao {
  cenario: string | null;
  tributo: string;
  ordem: number;
  texto: string;
}

/** O que a função lê do banco para montar o deck. */
export interface Revisao {
  clienteNoWp?: string;
  valores: ValorDaRevisao[];
  farol: FarolDaRevisao[];
  comentarios: ComentarioDaRevisao[];
}

/** Um problema para registrar em `wp_apresentacao.problemas`. */
export interface ProblemaDoDeck {
  tipo: string;
  onde: string;
  detalhe: string;
}

/** Quantas linhas de dado cabem em cada tabela do molde, sem transbordar. */
const CABEM = {
  /*
   * Números empíricos, tirados do deck de origem, que comprovadamente cabe.
   * **Não dá para calcular pelo XML:** `<a:tr h="...">` é altura MÍNIMA, e a
   * linha cresce quando o texto não cabe, então dividir a moldura pela altura
   * declarada dá 141 onde cabem 20. Para remedir, é preencher o molde, converter
   * para PDF pelo LibreOffice e olhar onde corta.
   */
  dre: 20,
  transferencia: 16,
  resumo: 18,
} as const;

export type ValorDoSlide = string;

export interface LinhaDaTabela {
  rotulo: string;
  /** 0 total de bloco, 1 grupo, 2 detalhe. Escolhe a linha-modelo no molde. */
  nivel: number;
  /** Vazio numa linha que é só título de seção. */
  valores: Record<string, ValorDoSlide>;
}

export interface TabelaDoSlide {
  titulo: string;
  /** As colunas, na ordem, para o molde saber o que preencher. */
  colunas: string[];
  linhas: LinhaDaTabela[];
  /** Quantas linhas saíram além do que cabe. Zero é o normal. */
  transbordou: number;
}

export interface CelulaDoFarol {
  rotulo: string;
  regime: FarolDaRevisao['regime'];
  pessoa: FarolDaRevisao['pessoa'];
  /** Percentual já formatado, ou o marcador. */
  valor: string;
  /** `true` quando é ✓ ou ✗ e precisa sair em Wingdings 2. */
  eMarcador: boolean;
}

export interface Deck {
  cliente: string | undefined;
  anos: number[];
  /** Os cenários do Resumo, na ordem das colunas do slide. */
  cenarios: string[];
  dre: TabelaDoSlide;
  transferencia: TabelaDoSlide;
  resumo: TabelaDoSlide;
  farol: CelulaDoFarol[];
  comentarios: { tributo: string; texto: string }[];
  notas: string[];
  problemas: ProblemaDoDeck[];
}

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

  /*
   * O percentual sai sem casa decimal no Resumo (`(24%)`, `54%`), e com duas no
   * Farol (`5,50%`). Não é descuido do deck: no Resumo o número é comparação
   * grosseira entre cenários, e no Farol é alíquota, onde meio ponto importa.
   * Por isso o Farol formata por conta própria, em `montaFarol`.
   */
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

/** `Cenário 01 (PFxPJ)` e `Cenário 01` são o mesmo cenário com nomes diferentes. */
function raizDoCenario(cenario: string): string {
  return cenario.replace(/\s*\(.*\)\s*$/, '').trim();
}

/**
 * O nome que a linha tem no slide, quando ele difere do da planilha.
 *
 * **É de-para de verdade, não capricho de redação.** A PT-01 registrou que a
 * apresentação renomeia linhas do WP, e comparar contra os gabaritos confirmou
 * quais. Sem isto a tabela sai com o vocabulário interno da planilha na frente
 * do cliente.
 */
const RENOMEIA: Record<string, string> = {
  Redução: 'Aumento/Redução em relação ao cenário atual',
};

function rotuloDoSlide(rotulo: string): string {
  return RENOMEIA[rotulo] ?? rotulo;
}

/**
 * Junta valores numa tabela: uma linha por rótulo, uma coluna por chave.
 *
 * A ordem das linhas é a de aparição, que é a da planilha, e é ela que o slide
 * usa. **Ordenar por rótulo quebraria a Transferência**, onde a compensação de
 * prejuízo vem antes da presunção na planilha e o slide depende dessa sequência.
 *
 * **O rótulo se repete, e agrupar por ele perde linha.** No Resumo, `IRPF`,
 * `CBS` e `INSS` aparecem três vezes cada, sob Pessoa Física, sob Lucro
 * Presumido e sob Lucro Real. Agrupando pelo nome as três viravam uma e a última
 * sobrescrevia as outras, com o slide saindo com 10 linhas em vez de 16. Por
 * isso a chave conta a ocorrência dentro de cada coluna.
 */
/**
 * A ordem da planilha, tirada do endereço da célula.
 *
 * **O banco não guarda ordem.** O PostgREST devolve as linhas como quiser, e sem
 * isto o Resumo saía com Lucro Real antes de Lucro Presumido, e os valores
 * pulavam de coluna entre uma geração e outra: números certos, tabela errada, e
 * nada acusando.
 *
 * `Resumo!D16` diz linha 16, coluna D. Ordenar por linha e depois por coluna
 * reconstrói a varredura da planilha, que é a ordem que o slide espera, tanto
 * para as linhas quanto para a sequência dos anos e cenários.
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

function montaTabela(
  titulo: string,
  valoresFora: ValorDaRevisao[],
  coluna: (v: ValorDaRevisao) => string,
  cabem: number,
): TabelaDoSlide {
  const linhas: LinhaDaTabela[] = [];
  const porChave = new Map<string, LinhaDaTabela>();
  const colunas: string[] = [];
  const ocorrencias = new Map<string, Map<string, number>>();

  const valores = [...valoresFora].sort(naOrdemDaPlanilha);

  for (const v of valores) {
    const c = coluna(v);
    if (!colunas.includes(c)) colunas.push(c);

    const daColuna = ocorrencias.get(c) ?? new Map<string, number>();
    const n = (daColuna.get(v.rotulo) ?? 0) + 1;
    daColuna.set(v.rotulo, n);
    ocorrencias.set(c, daColuna);

    const chave = `${v.rotulo}#${n}`;
    let linha = porChave.get(chave);
    if (!linha) {
      linha = { rotulo: rotuloDoSlide(v.rotulo), nivel: v.nivel ?? 1, valores: {} };
      porChave.set(chave, linha);
      linhas.push(linha);
    }
    linha.valores[c] = formataValor(v.valor, v.unidade);
  }

  /* Coluna que existe na tabela mas não naquela linha sai como traço, senão a
   * célula fica vazia no slide e parece erro de leitura. */
  for (const linha of linhas) {
    for (const c of colunas) if (!(c in linha.valores)) linha.valores[c] = '-';
  }

  return { titulo, colunas, linhas, transbordou: Math.max(0, linhas.length - cabem) };
}

/**
 * A DRE do slide de Premissas, uma coluna por ano e contribuinte.
 *
 * **Vem de UMA aba de cenário, não das três.** O WP tem DRE em `Cenário Atual
 * (PF)`, `Cenário 01 (PFxPJ)` e `Cenário 02 (PJxPJ)`, com 73 contas cada.
 * Juntando as três a tabela saía com 247 linhas, num slide desenhado para 20, e
 * o erro não aparecia nas fixtures porque cada uma é o recorte de uma aba só.
 *
 * **Fica com a primeira aba de cenário, a do cenário atual**, que é a projeção
 * base e é de onde o único gabarito de DRE que existe foi recortado. **Vale
 * confirmar com o Fiscal:** no deck do Lunardi aquele slide traz duas colunas de
 * contribuinte, PF e PJ, e no WP quem tem dois contribuintes é o `Cenário 01
 * (PFxPJ)`. Pode ser que a premissa mostrada mude de estudo para estudo.
 *
 * Entra tudo o que foi preenchido naquela aba, pelo motivo explicado no topo do
 * arquivo. O `nivel` acompanha cada linha porque o molde tem três linhas-modelo,
 * uma por nível, e é ele que decide se a conta sai em negrito, normal ou recuada.
 */
function montaDre(valores: ValorDaRevisao[]): { tabela: TabelaDoSlide; problemas: ProblemaDoDeck[] } {
  const daDre = valores.filter((v) => v.bloco === 'dre');
  const cenarios = [...new Set(daDre.map((v) => v.cenario))];
  const base = ABAS_DE_CENARIO.find((n) => cenarios.includes(n)) ?? cenarios[0];

  const problemas: ProblemaDoDeck[] = [];
  if (cenarios.length > 1) {
    problemas.push({
      tipo: 'tipo_inesperado',
      onde: '3.1 Premissas, a DRE',
      detalhe:
        `A DRE veio de ${cenarios.length} cenários e o slide mostra um. ` + `Saiu o de "${base}".`,
    });
  }

  return {
    tabela: montaTabela(
      '3.1 Premissas, a DRE',
      daDre.filter((v) => v.cenario === base),
      (v) => (v.contribuinte ? `${v.ano}|${v.contribuinte}` : String(v.ano)),
      CABEM.dre,
    ),
    problemas,
  };
}

/**
 * O Resumo, uma coluna por ano e cenário.
 *
 * **O molde tem três colunas por ano**, e é o gerador que escreve o nome de cada
 * cenário no cabeçalho: assim o slide mostra os cenários que aquele estudo tem,
 * em vez de rótulo fixo que pode não corresponder. Se vierem mais de três, o
 * excedente não cabe e o deck avisa.
 */
const CENARIOS_NO_MOLDE = 3;

function montaResumo(valores: ValorDaRevisao[]): {
  tabela: TabelaDoSlide;
  cenarios: string[];
  problemas: ProblemaDoDeck[];
} {
  const doResumo = valores.filter((v) => v.bloco === 'resumo');
  const tabela = montaTabela(
    '3.5 Resumo da Tributação',
    doResumo,
    (v) => `${v.ano}|${raizDoCenario(v.cenario)}`,
    CABEM.resumo,
  );

  /* Na ordem em que aparecem na planilha, que é a ordem das colunas do slide. */
  const cenarios: string[] = [];
  for (const c of tabela.colunas) {
    const nome = c.split('|')[1];
    if (nome && !cenarios.includes(nome)) cenarios.push(nome);
  }

  const problemas: ProblemaDoDeck[] = [];
  if (cenarios.length > CENARIOS_NO_MOLDE) {
    problemas.push({
      tipo: 'tipo_inesperado',
      onde: '3.5 Resumo da Tributação',
      detalhe:
        `O estudo tem ${cenarios.length} cenários e o slide tem ${CENARIOS_NO_MOLDE} colunas. ` +
        `Ficaram de fora: ${cenarios.slice(CENARIOS_NO_MOLDE).join(', ')}.`,
    });
  }

  return { tabela, cenarios, problemas };
}

/**
 * A Transferência não é projeção da planilha: é uma tabela com desenho próprio.
 *
 * **Três coisas mudam entre a aba e o slide**, e todas estão documentadas na
 * PT-01. A ordem muda: na planilha a compensação de prejuízo vem antes da
 * presunção, e no slide o limite de 20% vem primeiro. O nome muda: `Resultado do
 * exercício` vira `Receita com a venda dos bens da atividade rural`, e
 * `Presunção de 20%` vira `Limite de 20% sobre a receita bruta total`. E o slide
 * tem linhas que a planilha não produz.
 *
 * Por isso a tabela é declarada, e não derivada. Projetar a aba na ordem dela
 * produziria um slide errado que ninguém perceberia, porque os números estariam
 * todos certos.
 */
interface LinhaDeclarada {
  slide: string;
  /** O rótulo correspondente na planilha. Ausente quando o slide inventa a linha. */
  daPlanilha?: string;
  /** Linha que é só título de seção, sem número. */
  titulo?: boolean;
  /** Linha do slide que a PT-01 não mapeou e que ninguém sabe de onde vem. */
  semFonte?: boolean;
}

const LINHAS_DA_TRANSFERENCIA: LinhaDeclarada[] = [
  { slide: 'Bens da atividade rural', daPlanilha: 'Bens da atividade rural' },
  { slide: 'Dívidas da atividade rural', daPlanilha: 'Dívidas da atividade rural' },
  { slide: 'Informação do exercício anterior', titulo: true },
  {
    slide: 'Saldo de prejuízo(s) a compensar de exercício(s) anterior(es)',
    daPlanilha: 'Saldo de prejuízo a compensar de exercício(s) anterior(es)',
  },
  { slide: 'Apuração do resultado tributável', titulo: true },
  {
    slide: 'Receita com a venda dos bens da atividade rural',
    daPlanilha: 'Resultado do exercício',
  },
  /* Sai sempre como traço. Omitir quebraria o alinhamento da tabela, provado no
   * par Bahia Potrich. */
  { slide: 'Despesas de custeio e investimento total' },
  { slide: 'Resultado da Atividade Rural', daPlanilha: 'Lucro/Prejuízo fiscal do exercício' },
  { slide: 'Limite de 20% sobre a receita bruta total', daPlanilha: 'Presunção de 20%' },
  /* No deck de origem sai "Presumido" em todos os anos, mas a PT-01 não mapeou a
   * célula de onde isso vem. Enquanto não mapear, sai traço e o deck avisa. */
  { slide: 'Opção pela forma de apuração do resultado tributável', semFonte: true },
  {
    slide: 'Compensação de prejuízo(s) de exercício(s) anteriores',
    daPlanilha: 'Compensação de prejuízo',
  },
  { slide: 'Resultado Tributável', daPlanilha: 'Resultado tributável' },
  { slide: 'Imposto a pagar', daPlanilha: 'Total a recolher' },
  {
    slide: 'Saldo de prejuízo a compensar nos exercícios seguintes',
    daPlanilha: 'Saldo de prejuízo a compensar',
  },
];

function montaTransferencia(valores: ValorDaRevisao[]): {
  tabela: TabelaDoSlide;
  problemas: ProblemaDoDeck[];
} {
  const daVenda = valores.filter((v) => v.cenario === ABA_VENDA_DE_ATIVOS);
  const anos = [...new Set(daVenda.map((v) => v.ano))].sort((a, b) => a - b).map(String);

  const porRotulo = new Map<string, Map<string, ValorDaRevisao>>();
  for (const v of daVenda) {
    const linha = porRotulo.get(v.rotulo) ?? new Map<string, ValorDaRevisao>();
    linha.set(String(v.ano), v);
    porRotulo.set(v.rotulo, linha);
  }

  const problemas: ProblemaDoDeck[] = [];
  const linhas: LinhaDaTabela[] = LINHAS_DA_TRANSFERENCIA.map((d) => {
    const valoresDaLinha: Record<string, ValorDoSlide> = {};
    if (!d.titulo) {
      const daPlanilha = d.daPlanilha ? porRotulo.get(d.daPlanilha) : undefined;
      if (d.daPlanilha && !daPlanilha) {
        problemas.push({
          tipo: 'tipo_inesperado',
          onde: ABA_VENDA_DE_ATIVOS,
          detalhe: `A linha "${d.daPlanilha}" não veio na leitura, então "${d.slide}" sai vazia no slide.`,
        });
      }
      for (const ano of anos) {
        const celula = daPlanilha?.get(ano);
        valoresDaLinha[ano] = formataValor(celula?.valor, celula?.unidade);
      }
    }
    if (d.semFonte) {
      problemas.push({
        tipo: 'tipo_inesperado',
        onde: `slide, "${d.slide}"`,
        detalhe:
          'Esta linha existe no slide e a PT-01 não mapeou a célula de origem, ' +
          'então ela sai como traço. Precisa ser levantada com o Fiscal.',
      });
    }
    return { rotulo: d.slide, nivel: d.titulo ? 0 : 1, valores: valoresDaLinha };
  });

  return {
    tabela: {
      titulo: '3.4 Transferência da Atividade Rural',
      colunas: anos,
      linhas,
      transbordou: Math.max(0, linhas.length - CABEM.transferencia),
    },
    problemas,
  };
}

/**
 * O marcador do Farol, em Wingdings 2.
 *
 * `P` é o certo e `O` é o errado, medido no deck do Lunardi cruzando o XML com o
 * slide renderizado. **O gerador precisa escrever a fonte junto com o valor:** a
 * célula do molde guarda a fonte que tinha, e um percentual caindo numa célula de
 * símbolo sai como rabisco, sem erro nenhum.
 */
const CERTO = 'P';
const ERRADO = 'O';

function montaFarol(farol: FarolDaRevisao[]): CelulaDoFarol[] {
  return farol.map((f) => {
    const base = { rotulo: f.rotulo, regime: f.regime, pessoa: f.pessoa };
    const texto = typeof f.valor === 'string' ? f.valor.trim() : null;

    if (texto === CERTO || texto === ERRADO) {
      return { ...base, valor: texto, eMarcador: true };
    }

    /*
     * O percentual vem de dois jeitos no WP e os dois são legítimos: número puro
     * (`0.0163`) quando a célula é conta, e texto já formatado (`23,20%³`)
     * quando o consultor pendurou a chamada de nota de rodapé nele. Reformatar o
     * segundo perderia o expoente, então ele passa como está.
     */
    if (typeof f.valor === 'number') {
      const pct = (f.valor * 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return { ...base, valor: `${pct}%`, eMarcador: false };
    }

    return { ...base, valor: texto === null || texto === '' ? '-' : texto, eMarcador: false };
  });
}

/**
 * As caixas de texto do Resumo, uma por tributo.
 *
 * **O tributo é texto livre da planilha**, lido da coluna do marcador: não existe
 * lista fechada. O molde tem quatro caixas, e um tributo sem caixa vira problema
 * registrado em vez de sumir calado.
 */
const CAIXAS_DO_MOLDE = ['IRPF', 'CBS', 'IRPJ/CSLL', 'PIS/Cofins'];

function normaliza(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function montaComentarios(comentarios: ComentarioDaRevisao[]): {
  caixas: { tributo: string; texto: string }[];
  problemas: ProblemaDoDeck[];
} {
  const porTributo = new Map<string, string[]>();
  for (const c of comentarios) {
    if (c.cenario === null) continue;
    const atual = porTributo.get(c.tributo) ?? [];
    atual.push(c.texto);
    porTributo.set(c.tributo, atual);
  }

  const caixas: { tributo: string; texto: string }[] = [];
  const problemas: ProblemaDoDeck[] = [];
  const doMolde = new Set(CAIXAS_DO_MOLDE.map(normaliza));

  for (const [tributo, linhas] of porTributo) {
    const texto = linhas.join('\n');
    if (doMolde.has(normaliza(tributo))) {
      caixas.push({ tributo, texto });
    } else {
      problemas.push({
        tipo: 'tipo_inesperado',
        onde: `comentário de ${tributo}`,
        detalhe: `O molde não tem caixa para "${tributo}", então esse comentário não sai no slide.`,
      });
    }
  }
  return { caixas, problemas };
}

export function montaDeck(leitura: Revisao): Deck {
  const daDre = montaDre(leitura.valores);
  const dre = daDre.tabela;
  const daTransferencia = montaTransferencia(leitura.valores);
  const transferencia = daTransferencia.tabela;
  const doResumo = montaResumo(leitura.valores);
  const resumo = doResumo.tabela;
  const { caixas, problemas: dosComentarios } = montaComentarios(leitura.comentarios);

  const problemas: ProblemaDoDeck[] = [
    ...daDre.problemas,
    ...doResumo.problemas,
    ...dosComentarios,
    ...daTransferencia.problemas,
  ];
  for (const [nome, t] of [
    ['a DRE', dre],
    ['a Transferência', transferencia],
    ['o Resumo', resumo],
  ] as const) {
    if (t.transbordou > 0) {
      problemas.push({
        tipo: 'tipo_inesperado',
        onde: t.titulo,
        detalhe:
          `${nome} saiu com ${t.linhas.length} linhas e cabem cerca de ` +
          `${t.linhas.length - t.transbordou}. Vai ser preciso tirar ${t.transbordou} no PowerPoint.`,
      });
    }
  }

  const anos = [...new Set(leitura.valores.map((v) => v.ano))].sort((a, b) => a - b);

  return {
    cliente: leitura.clienteNoWp,
    anos,
    cenarios: doResumo.cenarios,
    dre,
    transferencia,
    resumo,
    farol: montaFarol(leitura.farol),
    comentarios: caixas,
    notas: leitura.comentarios.filter((c) => c.cenario === null).map((c) => c.texto),
    problemas,
  };
}

