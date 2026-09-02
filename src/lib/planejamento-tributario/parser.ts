import * as XLSX from 'xlsx';

import {
  ABAS_DE_CENARIO,
  ABA_RESUMO,
  ABA_VENDA_DE_ATIVOS,
} from '@/lib/planejamento-tributario/mapa';
import type { AbaCenarioWp, LinhaWp, UnidadeWp } from '@/lib/planejamento-tributario/tipos';

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

export interface ResultadoLeitura {
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
function leResumo(aba: XLSX.WorkSheet): ResultadoLeitura {
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
function leCenario(aba: XLSX.WorkSheet, mapa: AbaCenarioWp): ResultadoLeitura {
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
function leVendaDeAtivos(aba: XLSX.WorkSheet): ResultadoLeitura {
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
  const problemas: ProblemaWp[] = [];
  let achouAlgumaAba = false;

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
  }

  if (!achouAlgumaAba) {
    const conhecidas = [
      ABA_RESUMO.nome,
      ...ABAS_DE_CENARIO.map((a) => a.nome),
      ABA_VENDA_DE_ATIVOS.nome,
    ];
    return {
      valores: [],
      problemas: [
        {
          tipo: 'aba_ausente',
          onde: 'arquivo',
          detalhe: `nenhuma aba conhecida foi encontrada. Esperava uma de: ${conhecidas.join(', ')}. Achei: ${planilha.SheetNames.join(', ')}`,
        },
      ],
    };
  }

  return { valores, problemas };
}
