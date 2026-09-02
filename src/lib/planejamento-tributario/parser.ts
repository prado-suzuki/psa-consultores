import * as XLSX from 'xlsx';

import {
  ABAS_DE_APOIO,
  ABAS_DE_CENARIO,
  ABA_FAROL,
  ABA_RESUMO,
  ABA_VENDA_DE_ATIVOS,
  CABECALHO_DO_ESTUDO,
  PARAMETROS,
} from '@/lib/planejamento-tributario/mapa';
import type {
  AbaApoioWp,
  AbaCenarioWp,
  BlocoDeComentarios,
  LinhaWp,
  UnidadeWp,
} from '@/lib/planejamento-tributario/tipos';

/**
 * Leitura do papel de trabalho de Planejamento Tributário.
 *
 * Função pura: entra o conteúdo do arquivo, sai a lista de valores e a lista de
 * problemas. Não fala com Supabase, não sabe de React e não recebe `File`, e é
 * por isso que o teste consegue rodá-la contra as fixtures fora do navegador.
 * Quem tem `File` converte com `await file.arrayBuffer()` antes de chamar.
 *
 * O que ela lê está em `mapa.ts`, que é a PT-01 em código. Aqui só há mecânica:
 * andar pelos endereços do mapa, decidir o que a célula significa e produzir a
 * lista. Nenhuma regra de negócio nova.
 *
 * ## Os três estados de uma célula, e por que importam
 *
 * O SheetJS não recalcula fórmula: ele lê o resultado que o Excel guardou junto
 * dela. Então uma célula pode chegar em três estados, e confundi-los é o jeito
 * mais fácil de gerar um slide errado sem ninguém perceber:
 *
 * - **ausente ou vazia:** a conta não foi preenchida para este cliente. Não é
 *   zero e não é erro; simplesmente não entra.
 * - **com valor:** dado bom.
 * - **erro do Excel** (`#DIV/0!`, `#REF!`) **ou fórmula sem resultado guardado:**
 *   é problema, e nunca zero. `#DIV/0!` virando zero faria o slide anunciar que a
 *   redução de imposto foi 0%.
 *
 * Medido nos cinco WPs reais: 32.701 fórmulas e **nenhuma** sem resultado
 * guardado, então esse último caso é defensivo. Já célula de erro existe de
 * verdade: o próprio modelo em branco traz seis `#DIV/0!` na linha de Redução,
 * porque ela divide pelo Total do cenário atual, que num gabarito vazio é zero.
 */

/** Um valor lido do WP, com o endereço de onde saiu. */
export interface ValorWp {
  bloco: 'resumo' | 'dre' | 'apuracao';
  rotulo: string;
  /** 0 total de bloco, 1 grupo ou item direto, 2 detalhe de grupo. */
  nivel?: number;
  /**
   * O cenário. Vem do cabeçalho da coluna quando a origem é a aba `Resumo`
   * (`Cenário Atual`) e do nome da aba quando é uma aba de cenário
   * (`Cenário Atual (PF)`).
   *
   * **Os dois nomes convivem no WP e não são iguais.** Reconciliar isso é decisão
   * da persistência, na fase 2: aqui cada valor carrega o nome que a sua origem
   * usa, sem adivinhar. Derivar um do outro cortando o parêntese quebraria em
   * `Cenário 02 (Venda de Ativos)`.
   */
  cenario: string;
  /** Quem é o contribuinte daquela coluna. Só existe nas abas de cenário. */
  contribuinte?: string;
  ano: number;
  valor: number | string;
  unidade: UnidadeWp;
  /** `Resumo!D16`, para conferir na planilha e para depurar estudo torto. */
  origemCelula: string;
}

/** Um problema encontrado na leitura, sempre apontando a célula ou a aba. */
export interface ProblemaWp {
  tipo:
    | 'aba_ausente'
    | 'celula_de_erro'
    | 'formula_sem_resultado'
    | 'cabecalho_ilegivel'
    | 'tipo_inesperado'
    /** Leu bem, mas a conta não fecha. Vem do validador, não da leitura. */
    | 'conta_nao_fecha';
  onde: string;
  detalhe: string;
}

/**
 * A identificação do estudo e as duas premissas de projeção.
 *
 * Todo campo é opcional porque um recorte de WP pode não ter a aba de onde ele
 * sai, e porque no modelo em branco eles vêm vazios: é gabarito, não estudo.
 */
export interface CabecalhoLido {
  clienteNoWp?: string;
  anoInicial?: number;
  anoFinal?: number;
  preparadoPor?: string;
  revisadoPor?: string;
  anoBase?: number;
  /** Fração, não percentual: 0,05 e não 5. */
  crescimentoAnual?: number;
}

/**
 * Uma célula da Carga Tributária.
 *
 * Não tem ano nem contribuinte, e é por isso que não cabe em `ValorWp`: a
 * coordenada aqui é regime tributário contra tipo de pessoa.
 */
export interface ValorFarol {
  /** O grupo de tributos: `IRPF/IRPJ/CSLL`, `PIS/Cofins`, `FUNRURAL`. */
  bloco: string;
  rotulo: string;
  regime: 'presumido' | 'real';
  pessoa: 'pf' | 'pj';
  valor: number | string;
  unidade: UnidadeWp;
  origemCelula: string;
}

/** Uma linha de texto de um comentário, que no slide vira um item da caixa. */
export interface ComentarioLido {
  /** Nulo nas notas de rodapé do Farol, que não pertencem a cenário. */
  cenario: string | null;
  tributo: string;
  /** Posição da linha dentro do tributo, começando em 1. */
  ordem: number;
  texto: string;
  origemCelula: string;
}

/** Um bem da atividade rural, um por linha da aba de apoio. */
export interface BemLido {
  ordem: number;
  contribuinte?: string;
  categoria?: string;
  descricao?: string;
  valor?: number;
  origemLinha: string;
}

/** Um contrato de dívida, com a amortização de cada ano. */
export interface DividaLida {
  ordem: number;
  titularidade?: string;
  instituicao?: string;
  /** ISO `2028-06-30`, convertido do número de série do Excel. */
  vencimentoFinal?: string;
  saldoDevedor?: number;
  porAno: Record<string, number>;
  origemLinha: string;
}

/**
 * O que a leitura de um WP produz, na forma que a RPC `importar_wp` recebe.
 *
 * Um bloco por chave, e cada chave corresponde a uma tabela: `valores` vai para
 * `wp_valor`, `farol` para `wp_farol`, e assim por diante. O `cabecalho` é o
 * único que não é lista: ele descreve o arquivo, e mora em colunas de
 * `wp_importacao`.
 */
export interface ResultadoLeitura {
  cabecalho: CabecalhoLido;
  valores: ValorWp[];
  farol: ValorFarol[];
  comentarios: ComentarioLido[];
  bens: BemLido[];
  dividas: DividaLida[];
  problemas: ProblemaWp[];
}

/** O que um leitor de bloco devolve, antes de tudo ser juntado. */
interface LeituraDeBloco {
  valores: ValorWp[];
  problemas: ProblemaWp[];
}

/**
 * 75 rótulos do modelo vêm com espaço sobrando, tipo `(+) Soja - Própria  `. O
 * mapa guarda a forma normalizada, então a comparação normaliza o outro lado
 * também: espaço a mais em célula é ruído, não identidade.
 */
function normaliza(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim();
}

/** O que uma célula significa, antes de virar valor ou problema. */
type LeituraDeCelula =
  | { estado: 'vazia' }
  | { estado: 'valor'; valor: number | string }
  | { estado: 'erro'; motivo: ProblemaWp['tipo']; detalhe: string };

function leCelula(aba: XLSX.WorkSheet, endereco: string): LeituraDeCelula {
  const celula = aba[endereco] as XLSX.CellObject | undefined;
  if (!celula) return { estado: 'vazia' };

  if (celula.t === 'e') {
    /*
     * `w` é o texto formatado que o Excel guardou, `#DIV/0!` ou `#REF!`. Quando
     * falta, `v` traz o código do erro. Vale mostrar qual é: `#REF!` significa
     * referência apagada e `#DIV/0!` costuma ser cenário ainda não preenchido, e
     * quem for consertar a planilha precisa dessa distinção.
     */
    const qual = celula.w ?? String(celula.v ?? 'desconhecido');
    return {
      estado: 'erro',
      motivo: 'celula_de_erro',
      detalhe: `a célula traz erro do Excel: ${qual}`,
    };
  }

  /*
   * Fórmula sem `v` é fórmula que o Excel não guardou o resultado. Vale como
   * erro, e não como vazio, porque a planilha DIZ que ali tem conta: tratar como
   * "não preenchido" esconderia dado que existe.
   */
  if (celula.f && celula.v === undefined) {
    return {
      estado: 'erro',
      motivo: 'formula_sem_resultado',
      detalhe: `a fórmula \`${celula.f}\` não tem resultado guardado`,
    };
  }

  if (celula.v === undefined || celula.v === null) return { estado: 'vazia' };
  if (typeof celula.v === 'number') return { estado: 'valor', valor: celula.v };
  if (typeof celula.v === 'string') {
    const texto = normaliza(celula.v);
    return texto ? { estado: 'valor', valor: texto } : { estado: 'vazia' };
  }
  if (typeof celula.v === 'boolean') return { estado: 'valor', valor: String(celula.v) };
  return {
    estado: 'erro',
    motivo: 'tipo_inesperado',
    detalhe: `tipo ${typeof celula.v} não esperado`,
  };
}

function endereco(coluna: string, linha: number): string {
  return `${coluna}${linha}`;
}

/**
 * Lê a aba `Resumo`, que é a origem da tabela do slide de Resumo da Tributação.
 *
 * Ela é um retângulo de tributo por cenário por ano: cada bloco de ano tem uma
 * coluna por cenário, e o nome do cenário está no cabeçalho de cada coluna. O
 * ano fica só na primeira coluna do bloco, e é daí que sai o `colunasPorAno` do
 * mapa em vez de um cálculo de deslocamento: o intervalo entre blocos não é
 * regular (2026 em D, 2027 em H, 2028 em L, com uma coluna em branco entre
 * eles).
 */
function leResumo(aba: XLSX.WorkSheet): LeituraDeBloco {
  const valores: ValorWp[] = [];
  const problemas: ProblemaWp[] = [];

  for (const colunasDoAno of ABA_RESUMO.colunasPorAno) {
    const [primeira] = colunasDoAno;
    const cabecalhoAno = leCelula(aba, endereco(primeira, ABA_RESUMO.cabecalhoAnos));

    /*
     * Bloco de ano sem ano no cabeçalho não é erro: o modelo tem três blocos e um
     * estudo pode usar menos. Só é erro se houver dado nas colunas do bloco, e
     * isso o validador vê melhor do que aqui.
     */
    if (cabecalhoAno.estado !== 'valor') continue;
    const ano = Number(cabecalhoAno.valor);
    if (!Number.isInteger(ano)) {
      problemas.push({
        tipo: 'cabecalho_ilegivel',
        onde: `${ABA_RESUMO.nome}!${endereco(primeira, ABA_RESUMO.cabecalhoAnos)}`,
        detalhe: `esperava um ano, veio ${JSON.stringify(cabecalhoAno.valor)}`,
      });
      continue;
    }

    for (const coluna of colunasDoAno) {
      const cabecalhoCenario = leCelula(aba, endereco(coluna, ABA_RESUMO.cabecalhoCenarios));
      if (cabecalhoCenario.estado !== 'valor') continue;
      const cenario = String(cabecalhoCenario.valor);

      for (const linha of ABA_RESUMO.linhas) {
        const alvo = endereco(coluna, linha.linha);
        const onde = `${ABA_RESUMO.nome}!${alvo}`;
        const celula = leCelula(aba, alvo);

        if (celula.estado === 'erro') {
          problemas.push({ tipo: celula.motivo, onde, detalhe: celula.detalhe });
          continue;
        }
        if (celula.estado === 'vazia') continue;

        valores.push({
          bloco: 'resumo',
          rotulo: linha.rotulo,
          cenario,
          ano,
          valor: celula.valor,
          unidade: linha.unidade,
          origemCelula: onde,
        });
      }
    }
  }

  return { valores, problemas };
}

/**
 * Descobre quais colunas de uma aba de cenário têm dado, e de que ano e de que
 * contribuinte cada uma é.
 *
 * Não dá para calcular por deslocamento fixo, porque o número de colunas por ano
 * muda com o cenário: no `Cenário Atual (PF)` é uma coluna por ano, porque a
 * atividade toda está na pessoa física, e nos cenários avaliados são duas, porque
 * a operação se divide entre duas entidades. Então a leitura descobre: percorre a
 * linha dos anos, e cada coluna com contribuinte pertence ao último ano visto até
 * ali.
 *
 * É o que faz a leitura aguentar um estudo com três contribuintes ou com cinco
 * anos sem mudar código.
 */
function descobreColunas(
  aba: XLSX.WorkSheet,
  linhaDosAnos: number,
  linhaDoContribuinte: number,
): Array<{ coluna: string; ano: number; contribuinte: string }> {
  const COLUNAS = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const achadas: Array<{ coluna: string; ano: number; contribuinte: string }> = [];
  let anoCorrente: number | undefined;

  for (const coluna of COLUNAS) {
    const cabecalhoAno = leCelula(aba, endereco(coluna, linhaDosAnos));
    if (cabecalhoAno.estado === 'valor') {
      const ano = Number(cabecalhoAno.valor);
      if (Number.isInteger(ano) && ano > 1900) anoCorrente = ano;
    }

    const contribuinte = leCelula(aba, endereco(coluna, linhaDoContribuinte));
    if (contribuinte.estado === 'valor' && anoCorrente !== undefined) {
      achadas.push({ coluna, ano: anoCorrente, contribuinte: String(contribuinte.valor) });
    }
  }

  return achadas;
}

/**
 * Lê uma aba de cenário: a DRE projetada e, quando existe, a apuração do IRPF.
 *
 * A DRE carrega o nível de cada linha, porque é o que diz se a conta é um total
 * de bloco, um grupo ou um detalhe. Quem monta o slide usa isso para decidir o
 * que mostrar; a leitura só registra e entrega tudo o que foi preenchido.
 */
function leCenario(aba: XLSX.WorkSheet, mapa: AbaCenarioWp): LeituraDeBloco {
  const valores: ValorWp[] = [];
  const problemas: ProblemaWp[] = [];

  const colunas = descobreColunas(aba, mapa.anos, mapa.contribuinte);

  const blocos: Array<{ bloco: ValorWp['bloco']; linhas: readonly LinhaWp[] }> = [
    { bloco: 'dre', linhas: mapa.dre },
    { bloco: 'apuracao', linhas: mapa.apuracao },
  ];

  for (const { coluna, ano, contribuinte } of colunas) {
    for (const { bloco, linhas } of blocos) {
      for (const linha of linhas) {
        if (linha.eTitulo) continue;

        const alvo = endereco(coluna, linha.linha);
        const onde = `${mapa.nome}!${alvo}`;
        const celula = leCelula(aba, alvo);

        if (celula.estado === 'erro') {
          problemas.push({ tipo: celula.motivo, onde, detalhe: celula.detalhe });
          continue;
        }
        if (celula.estado === 'vazia') continue;

        valores.push({
          bloco,
          rotulo: linha.rotulo,
          nivel: linha.nivel,
          cenario: mapa.nome,
          contribuinte,
          ano,
          valor: celula.valor,
          unidade: linha.unidade,
          origemCelula: onde,
        });
      }
    }
  }

  return { valores, problemas };
}

/**
 * Lê a aba de Venda de Ativos, origem do slide de Transferência da Atividade
 * Rural.
 *
 * Tem duas diferenças que impedem reusar `leCenario`. Não há linha de
 * contribuinte, porque a venda é do produtor e não se reparte por pessoa, então
 * as colunas não precisam ser descobertas: vêm fixas do mapa. E a apuração corre
 * sete anos em vez dos três do estudo, acompanhando o cronograma de amortização
 * da dívida.
 *
 * O bloco de cima, bens contra dívidas, mora numa coluna só e não tem ano. Ele
 * entra com o primeiro ano da apuração, que é o ano em que a venda começa, para
 * que o slide consiga mostrar os dois lado a lado sem inventar coordenada.
 */
function leVendaDeAtivos(aba: XLSX.WorkSheet): LeituraDeBloco {
  const valores: ValorWp[] = [];
  const problemas: ProblemaWp[] = [];
  const mapa = ABA_VENDA_DE_ATIVOS;

  const anos: Array<{ coluna: string; ano: number }> = [];
  for (const coluna of mapa.colunas) {
    const celula = leCelula(aba, endereco(coluna, mapa.anos));
    if (celula.estado !== 'valor') continue;
    const ano = Number(celula.valor);
    if (Number.isFinite(ano)) anos.push({ coluna, ano });
  }

  const registra = (
    bloco: ValorWp['bloco'],
    linha: LinhaWp,
    coluna: string,
    ano: number | undefined,
  ) => {
    if (linha.eTitulo || ano === undefined) return;

    const alvo = endereco(coluna, linha.linha);
    const onde = `${mapa.nome}!${alvo}`;
    const celula = leCelula(aba, alvo);

    if (celula.estado === 'erro') {
      problemas.push({ tipo: celula.motivo, onde, detalhe: celula.detalhe });
      return;
    }
    if (celula.estado === 'vazia') return;

    valores.push({
      bloco,
      rotulo: linha.rotulo,
      nivel: linha.nivel,
      cenario: mapa.nome,
      ano,
      valor: celula.valor,
      unidade: linha.unidade,
      origemCelula: onde,
    });
  };

  const primeiroAno = anos[0]?.ano;
  for (const linha of mapa.valores) registra('apuracao', linha, mapa.colunaDoValor, primeiroAno);
  for (const { coluna, ano } of anos) {
    for (const linha of mapa.apuracao) registra('apuracao', linha, coluna, ano);
  }

  return { valores, problemas };
}

/** Depois dos dois-pontos, que é onde o valor mora quando o rótulo divide a célula. */
function depoisDoRotulo(texto: string): string {
  const corte = texto.indexOf(':');
  return corte === -1 ? normaliza(texto) : normaliza(texto.slice(corte + 1));
}

/**
 * Lê a identificação do estudo e as duas premissas de projeção.
 *
 * **Rótulo e valor moram na mesma célula.** `B4` é a string
 * `'Data-base: 2026 a 2028'` inteira e `B7` é `'Preparado por: '`, então o corte é
 * no dois-pontos. Os dois anos saem da data-base, que é o único lugar do modelo
 * onde o período do estudo está escrito.
 *
 * **O texto entre colchetes é marcação de gabarito, não dado.** No modelo em
 * branco o nome do cliente vem `[Nome do Cliente]`, e gravar isso como nome do
 * cliente seria pior do que gravar nada.
 */
function leCabecalho(planilha: XLSX.WorkBook): {
  cabecalho: CabecalhoLido;
  problemas: ProblemaWp[];
} {
  const cabecalho: CabecalhoLido = {};
  const problemas: ProblemaWp[] = [];

  const resumo = planilha.Sheets[CABECALHO_DO_ESTUDO.aba];
  if (resumo) {
    const texto = (endereco: string): string | undefined => {
      const celula = leCelula(resumo, endereco);
      if (celula.estado === 'erro') {
        problemas.push({
          tipo: celula.motivo,
          onde: `${CABECALHO_DO_ESTUDO.aba}!${endereco}`,
          detalhe: celula.detalhe,
        });
        return undefined;
      }
      return celula.estado === 'valor' ? String(celula.valor) : undefined;
    };

    const cliente = texto(CABECALHO_DO_ESTUDO.cliente);
    if (cliente && !/^\[.*\]$/.test(normaliza(cliente))) {
      cabecalho.clienteNoWp = normaliza(cliente);
    }

    const dataBase = texto(CABECALHO_DO_ESTUDO.dataBase);
    if (dataBase !== undefined) {
      const anos = depoisDoRotulo(dataBase).match(/\d{4}/g);
      if (anos && anos.length >= 2) {
        cabecalho.anoInicial = Number(anos[0]);
        cabecalho.anoFinal = Number(anos[anos.length - 1]);
      } else {
        problemas.push({
          tipo: 'cabecalho_ilegivel',
          onde: `${CABECALHO_DO_ESTUDO.aba}!${CABECALHO_DO_ESTUDO.dataBase}`,
          detalhe: `não achei dois anos na data-base \`${normaliza(dataBase)}\``,
        });
      }
    }

    const preparado = texto(CABECALHO_DO_ESTUDO.preparadoPor);
    if (preparado) {
      const quem = depoisDoRotulo(preparado);
      if (quem) cabecalho.preparadoPor = quem;
    }
    const revisado = texto(CABECALHO_DO_ESTUDO.revisadoPor);
    if (revisado) {
      const quem = depoisDoRotulo(revisado);
      if (quem) cabecalho.revisadoPor = quem;
    }
  }

  const projetada = planilha.Sheets[PARAMETROS.aba];
  if (projetada) {
    const numero = (endereco: string): number | undefined => {
      const celula = leCelula(projetada, endereco);
      if (celula.estado !== 'valor') return undefined;
      const n = Number(celula.valor);
      return Number.isFinite(n) ? n : undefined;
    };
    cabecalho.crescimentoAnual = numero(PARAMETROS.crescimentoAnual);
    cabecalho.anoBase = numero(PARAMETROS.anoBase);
  }

  return { cabecalho, problemas };
}

/**
 * Lê a aba `Farol`, origem do slide de Carga Tributária.
 *
 * A coordenada aqui é regime contra tipo de pessoa, quatro colunas fixas, e não
 * há ano: a alíquota de um regime não muda de ano para ano dentro do estudo.
 *
 * **A célula traz alíquota ou marcador.** Onde o regime não se aplica, o modelo
 * põe uma letra em fonte de símbolo, que no slide vira ícone. Ela chega aqui como
 * texto, e é por isso que o valor é `number | string`: virar zero seria dizer que
 * a alíquota é zero, o que é outra coisa.
 *
 * As notas de rodapé saem junto, mas como comentário: elas são texto corrido que
 * acompanha o slide, e é na mesma tabela que o resto do texto do estudo mora.
 */
function leFarol(aba: XLSX.WorkSheet): {
  farol: ValorFarol[];
  comentarios: ComentarioLido[];
  problemas: ProblemaWp[];
} {
  const farol: ValorFarol[] = [];
  const comentarios: ComentarioLido[] = [];
  const problemas: ProblemaWp[] = [];

  for (const linha of ABA_FAROL.linhas) {
    if (linha.eTitulo) continue;

    for (const { coluna, regime, pessoa } of ABA_FAROL.colunas) {
      const alvo = endereco(coluna, linha.linha);
      const onde = `${ABA_FAROL.nome}!${alvo}`;
      const celula = leCelula(aba, alvo);

      if (celula.estado === 'erro') {
        problemas.push({ tipo: celula.motivo, onde, detalhe: celula.detalhe });
        continue;
      }
      if (celula.estado === 'vazia') continue;

      farol.push({
        bloco: linha.grupo ?? linha.rotulo,
        rotulo: linha.rotulo,
        regime,
        pessoa,
        valor: celula.valor,
        /*
         * A unidade do mapa vale para a alíquota. Quando a célula traz o marcador,
         * o que está ali é texto, e dizer `percentual` faria o slide formatar uma
         * letra como porcentagem.
         */
        unidade: typeof celula.valor === 'number' ? linha.unidade : 'texto',
        origemCelula: onde,
      });
    }
  }

  let ordem = 0;
  for (let linha = ABA_FAROL.notas.de; linha <= ABA_FAROL.notas.ate; linha += 1) {
    const alvo = endereco('B', linha);
    const celula = leCelula(aba, alvo);
    if (celula.estado !== 'valor') continue;

    ordem += 1;
    comentarios.push({
      cenario: null,
      tributo: 'Notas da Carga Tributária',
      ordem,
      texto: normaliza(String(celula.valor)),
      origemCelula: `${ABA_FAROL.nome}!${alvo}`,
    });
  }

  return { farol, comentarios, problemas };
}

/**
 * Lê o bloco de comentários de uma aba, origem das caixas de texto do slide.
 *
 * Um marcador `[a]` na coluna A abre um item e a coluna B da mesma linha traz o
 * tributo; as linhas seguintes sem marcador são o texto dele. Uma linha por item
 * de texto, e não um texto só concatenado, porque no slide cada uma é um marcador
 * de lista e a ordem importa.
 *
 * **Texto antes de qualquer marcador é descartado**, e marcador sem tributo
 * também: no modelo os cinco marcadores existem sempre, e o estudo preenche os
 * que usa.
 */
function leComentarios(
  aba: XLSX.WorkSheet,
  cenario: string,
  bloco: BlocoDeComentarios,
): { comentarios: ComentarioLido[]; problemas: ProblemaWp[] } {
  const comentarios: ComentarioLido[] = [];
  const problemas: ProblemaWp[] = [];

  let tributo: string | undefined;
  let ordem = 0;

  for (let linha = bloco.de; linha <= bloco.ate; linha += 1) {
    if (linha === bloco.percentualDeParceria) {
      tributo = undefined;
      continue;
    }

    const marcador = leCelula(aba, endereco(bloco.colunaDoMarcador, linha));
    const alvo = endereco(bloco.coluna, linha);
    const onde = `${cenario}!${alvo}`;
    const celula = leCelula(aba, alvo);

    if (celula.estado === 'erro') {
      problemas.push({ tipo: celula.motivo, onde, detalhe: celula.detalhe });
      continue;
    }

    if (marcador.estado === 'valor') {
      /* Começa um item. Sem rótulo, é marcador que o estudo não usou. */
      tributo =
        celula.estado === 'valor' ? normaliza(String(celula.valor)).replace(/:$/, '') : undefined;
      ordem = 0;
      continue;
    }

    if (celula.estado !== 'valor' || tributo === undefined) continue;

    ordem += 1;
    comentarios.push({
      cenario,
      tributo,
      ordem,
      texto: normaliza(String(celula.valor)),
      origemCelula: onde,
    });
  }

  return { comentarios, problemas };
}

/**
 * O número de série do Excel vira data ISO.
 *
 * A conta é dias desde 30/12/1899, e não 01/01/1900, porque o Excel conta um
 * 29/02/1900 que nunca existiu. Ler com `cellDates` resolveria, mas mudaria o
 * tipo de toda célula de data do arquivo, e o resto da leitura trabalha com
 * número e texto.
 */
function dataDoExcel(serie: number): string | undefined {
  if (!Number.isFinite(serie) || serie <= 0) return undefined;
  const base = Date.UTC(1899, 11, 30);
  const quando = new Date(base + Math.round(serie) * 86_400_000);
  return Number.isNaN(quando.getTime()) ? undefined : quando.toISOString().slice(0, 10);
}

/**
 * Lê uma aba de apoio, que é uma tabela comum: uma linha por registro e as
 * colunas nomeadas no cabeçalho.
 *
 * Serve bens e dívidas com o mesmo código, e devolve os campos com o nome que o
 * cabeçalho dá. Quem transforma isso no registro de cada tabela são as duas
 * funções abaixo, porque só elas sabem que `Situação em 31/12/2024` é o valor do
 * bem.
 *
 * **Para de ler na linha de total ou na primeira linha vazia.** O total é conta
 * da planilha e não é registro: gravar seria contar tudo duas vezes.
 */
function leLista(
  aba: XLSX.WorkSheet,
  mapa: AbaApoioWp,
): {
  registros: Array<{ ordem: number; campos: Record<string, number | string>; origemLinha: string }>;
  problemas: ProblemaWp[];
} {
  const registros: Array<{
    ordem: number;
    campos: Record<string, number | string>;
    origemLinha: string;
  }> = [];
  const problemas: ProblemaWp[] = [];

  const faixa = aba['!ref'] ? XLSX.utils.decode_range(aba['!ref']) : undefined;
  const ultima = faixa ? faixa.e.r + 1 : mapa.cabecalho;

  for (let linha = mapa.cabecalho + 1; linha <= ultima; linha += 1) {
    const primeira = leCelula(aba, endereco(mapa.colunas[0].coluna, linha));
    if (
      primeira.estado === 'valor' &&
      typeof primeira.valor === 'string' &&
      /^total$/i.test(normaliza(primeira.valor))
    ) {
      break;
    }

    const campos: Record<string, number | string> = {};
    for (const { coluna, rotulo } of mapa.colunas) {
      const alvo = endereco(coluna, linha);
      const celula = leCelula(aba, alvo);
      if (celula.estado === 'erro') {
        problemas.push({
          tipo: celula.motivo,
          onde: `${mapa.nome}!${alvo}`,
          detalhe: celula.detalhe,
        });
        continue;
      }
      if (celula.estado === 'valor') campos[rotulo] = celula.valor;
    }

    if (Object.keys(campos).length === 0) continue;
    registros.push({
      ordem: registros.length + 1,
      campos,
      origemLinha: `${mapa.nome}!${linha}`,
    });
  }

  return { registros, problemas };
}

function comoTexto(valor: number | string | undefined): string | undefined {
  if (valor === undefined) return undefined;
  const texto = normaliza(String(valor));
  return texto || undefined;
}

function comoNumero(valor: number | string | undefined): number | undefined {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : undefined;
}

/** O valor do bem é a coluna de situação na data-base, a única numérica da aba. */
function paraBem(registro: {
  ordem: number;
  campos: Record<string, number | string>;
  origemLinha: string;
}): BemLido {
  const { campos } = registro;
  const valor = Object.entries(campos).find(([rotulo]) => rotulo.startsWith('Situação em'));

  return {
    ordem: registro.ordem,
    contribuinte: comoTexto(campos['Contribuinte']),
    categoria: comoTexto(campos['Categoria']),
    descricao: comoTexto(campos['Descrição']),
    valor: comoNumero(valor?.[1]),
    origemLinha: registro.origemLinha,
  };
}

/**
 * A amortização por ano vai em `porAno`, e as colunas de ano são as que têm
 * rótulo de quatro dígitos. É assim, e não por lista fixa, porque o cronograma da
 * dívida não é a data-base do estudo: o modelo vai até 2032 e outro cliente vai
 * até outro ano.
 */
function paraDivida(registro: {
  ordem: number;
  campos: Record<string, number | string>;
  origemLinha: string;
}): DividaLida {
  const { campos } = registro;
  const porAno: Record<string, number> = {};
  for (const [rotulo, valor] of Object.entries(campos)) {
    if (!/^\d{4}$/.test(rotulo)) continue;
    const n = comoNumero(valor);
    if (n !== undefined) porAno[rotulo] = n;
  }

  const vencimento = comoNumero(campos['Data do Vencimento Final']);

  return {
    ordem: registro.ordem,
    titularidade: comoTexto(campos['Titularidade']),
    instituicao: comoTexto(campos['Instituição Financeira']),
    vencimentoFinal: vencimento === undefined ? undefined : dataDoExcel(vencimento),
    saldoDevedor: comoNumero(campos['Total do Saldo Devedor']),
    porAno,
    origemLinha: registro.origemLinha,
  };
}

/**
 * Confere o cabeçalho de uma aba de apoio.
 *
 * Aqui a leitura é por coluna, não por linha, então o que precisa estar no lugar é
 * o cabeçalho: coluna trocada faria o valor do bem virar descrição.
 */
function confereCabecalhoDaLista(aba: XLSX.WorkSheet, mapa: AbaApoioWp): ProblemaWp[] {
  const problemas: ProblemaWp[] = [];

  for (const { coluna, rotulo } of mapa.colunas) {
    const alvo = endereco(coluna, mapa.cabecalho);
    const celula = leCelula(aba, alvo);
    if (celula.estado !== 'valor') continue;

    const lido = normaliza(String(celula.valor));
    if (lido !== rotulo) {
      problemas.push({
        tipo: 'cabecalho_ilegivel',
        onde: `${mapa.nome}!${alvo}`,
        detalhe: `esperava \`${rotulo}\` e achei \`${lido}\``,
      });
    }
  }

  return problemas;
}

/**
 * Confere que o rótulo da coluna B é o que o mapa espera, aba por aba.
 *
 * É o que pega WP de formato antigo e WP com linha inserida. Sem isto, a leitura
 * por endereço pegaria o valor da linha errada e devolveria número plausível: o
 * pior defeito possível aqui, porque não se anuncia.
 */
function conferePosicaoDosRotulos(
  aba: XLSX.WorkSheet,
  nomeDaAba: string,
  linhas: readonly LinhaWp[],
): ProblemaWp[] {
  const problemas: ProblemaWp[] = [];
  let encontrados = 0;

  for (const linha of linhas) {
    const alvo = endereco('B', linha.linha);
    const celula = leCelula(aba, alvo);

    /*
     * Rótulo ausente não é deslocamento, é linha que aquele arquivo não traz: um
     * recorte de WP, ou uma aba que o estudo não usou. Rótulo DIFERENTE é que
     * denuncia linha inserida ou apagada, porque nesse caso o rótulo do vizinho
     * aparece no endereço errado.
     */
    if (celula.estado !== 'valor') continue;
    encontrados += 1;

    const lido = normaliza(String(celula.valor));
    if (lido !== linha.rotulo) {
      problemas.push({
        tipo: 'cabecalho_ilegivel',
        onde: `${nomeDaAba}!${alvo}`,
        detalhe: `esperava \`${linha.rotulo}\` e achei \`${lido}\``,
      });
    }
  }

  /*
   * A trava para o caso extremo: uma aba com o nome certo e quase nenhum rótulo
   * reconhecido não é um recorte, é outra planilha. Sem isto, um arquivo alheio
   * com uma aba chamada `Resumo` passaria calado e devolveria zero valor.
   *
   * Zero rótulo reconhecido fica de fora da trava de propósito: significa bloco
   * ausente, e é o caso de um recorte que traz só a apuração e não a DRE.
   */
  const minimo = Math.ceil(linhas.length * 0.2);
  if (encontrados > 0 && encontrados < minimo) {
    problemas.push({
      tipo: 'cabecalho_ilegivel',
      onde: nomeDaAba,
      detalhe: `a aba não parece ser a do modelo: reconheci ${encontrados} de ${linhas.length} rótulos esperados`,
    });
  }

  return problemas;
}

/**
 * Lê o WP e devolve os valores e os problemas.
 *
 * Cobre a aba `Resumo`, as três abas de cenário e a de Venda de Ativos. As abas de
 * apoio (imóveis, bens e dívidas) entram depois; até lá, a ausência delas não é
 * reportada para não fingir cobertura que não existe.
 *
 * **Aba que não está no arquivo não é erro por si.** Um recorte de WP, como as
 * fixtures, tem uma aba só, e um estudo pode ter dois cenários em vez de três.
 * Erro é o arquivo não ter nenhuma das abas conhecidas: aí não é um WP.
 */
export function lerWp(dados: ArrayBuffer | Uint8Array): ResultadoLeitura {
  const planilha = XLSX.read(dados, { type: 'array', cellFormula: true });

  const valores: ValorWp[] = [];
  const farol: ValorFarol[] = [];
  const comentarios: ComentarioLido[] = [];
  const bens: BemLido[] = [];
  const dividas: DividaLida[] = [];
  const problemas: ProblemaWp[] = [];
  let achouAlgumaAba = false;

  const doCabecalho = leCabecalho(planilha);
  problemas.push(...doCabecalho.problemas);

  const abaFarol = planilha.Sheets[ABA_FAROL.nome];
  if (abaFarol) {
    achouAlgumaAba = true;
    problemas.push(...conferePosicaoDosRotulos(abaFarol, ABA_FAROL.nome, ABA_FAROL.linhas));
    const lido = leFarol(abaFarol);
    farol.push(...lido.farol);
    comentarios.push(...lido.comentarios);
    problemas.push(...lido.problemas);
  }

  const resumo = planilha.Sheets[ABA_RESUMO.nome];
  if (resumo) {
    achouAlgumaAba = true;
    problemas.push(...conferePosicaoDosRotulos(resumo, ABA_RESUMO.nome, ABA_RESUMO.linhas));
    const lido = leResumo(resumo);
    valores.push(...lido.valores);
    problemas.push(...lido.problemas);
  }

  for (const mapa of ABAS_DE_CENARIO) {
    const aba = planilha.Sheets[mapa.nome];
    if (!aba) continue;
    achouAlgumaAba = true;
    /*
     * Bloco a bloco, e não a aba inteira: a trava de reconhecimento precisa julgar
     * a DRE e a apuração separadamente. Um recorte que traz só a apuração tem 8 de
     * 8 rótulos dali e nenhum da DRE, e somando os dois pareceria uma aba
     * irreconhecível.
     */
    problemas.push(...conferePosicaoDosRotulos(aba, mapa.nome, mapa.dre));
    problemas.push(...conferePosicaoDosRotulos(aba, mapa.nome, mapa.apuracao));
    const lido = leCenario(aba, mapa);
    valores.push(...lido.valores);
    problemas.push(...lido.problemas);

    const texto = leComentarios(aba, mapa.nome, mapa.comentarios);
    comentarios.push(...texto.comentarios);
    problemas.push(...texto.problemas);
  }

  const vendaDeAtivos = planilha.Sheets[ABA_VENDA_DE_ATIVOS.nome];
  if (vendaDeAtivos) {
    achouAlgumaAba = true;
    problemas.push(
      ...conferePosicaoDosRotulos(
        vendaDeAtivos,
        ABA_VENDA_DE_ATIVOS.nome,
        ABA_VENDA_DE_ATIVOS.valores,
      ),
    );
    problemas.push(
      ...conferePosicaoDosRotulos(
        vendaDeAtivos,
        ABA_VENDA_DE_ATIVOS.nome,
        ABA_VENDA_DE_ATIVOS.apuracao,
      ),
    );
    const lido = leVendaDeAtivos(vendaDeAtivos);
    valores.push(...lido.valores);
    problemas.push(...lido.problemas);

    const texto = leComentarios(
      vendaDeAtivos,
      ABA_VENDA_DE_ATIVOS.nome,
      ABA_VENDA_DE_ATIVOS.comentarios,
    );
    comentarios.push(...texto.comentarios);
    problemas.push(...texto.problemas);
  }

  /*
   * `Imóveis Explorados` fica de fora de propósito. O Bernardo tirou a tabela do
   * escopo em 02/09/2026, para dar a ela um uso maior depois, e ler sem ter onde
   * gravar só produziria dado que se perde.
   */
  for (const mapa of ABAS_DE_APOIO) {
    if (mapa.nome === 'Imóveis Explorados') continue;

    const aba = planilha.Sheets[mapa.nome];
    if (!aba) continue;
    achouAlgumaAba = true;
    problemas.push(...confereCabecalhoDaLista(aba, mapa));

    const lido = leLista(aba, mapa);
    problemas.push(...lido.problemas);
    if (mapa.nome === 'Bens da Atv. Rural') bens.push(...lido.registros.map(paraBem));
    else dividas.push(...lido.registros.map(paraDivida));
  }

  if (!achouAlgumaAba) {
    const conhecidas = [
      ABA_FAROL.nome,
      ABA_RESUMO.nome,
      ...ABAS_DE_CENARIO.map((a) => a.nome),
      ABA_VENDA_DE_ATIVOS.nome,
      ...ABAS_DE_APOIO.map((a) => a.nome),
    ];
    return {
      cabecalho: {},
      valores: [],
      farol: [],
      comentarios: [],
      bens: [],
      dividas: [],
      problemas: [
        {
          tipo: 'aba_ausente',
          onde: 'arquivo',
          detalhe: `nenhuma aba conhecida foi encontrada. Esperava uma de: ${conhecidas.join(', ')}. Achei: ${planilha.SheetNames.join(', ')}`,
        },
      ],
    };
  }

  return {
    cabecalho: doCabecalho.cabecalho,
    valores,
    farol,
    comentarios,
    bens,
    dividas,
    problemas,
  };
}
