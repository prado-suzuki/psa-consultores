/**
 * Tipos do mapa do papel de trabalho de Planejamento Tributário.
 *
 * Separados de `mapa.ts` porque o mapa é gerado a partir do arquivo do modelo e
 * este arquivo é escrito à mão.
 *
 * O mapa é tipado com estas interfaces em vez de `as const` de propósito: com
 * `as const`, cada linha vira um tipo literal próprio e as propriedades
 * opcionais deixam de existir nas irmãs que não as têm, o que torna a união
 * inutilizável para quem só quer varrer a lista.
 */

/** Como o valor da célula deve ser lido. */
export type UnidadeWp = 'moeda' | 'percentual' | 'texto' | 'marcador';

/** Uma linha do WP, endereçada pelo número de linha no modelo. */
export interface LinhaWp {
  /** Número da linha na aba, no `WP Atualizado`. */
  linha: number;
  /** Rótulo normalizado, como está na coluna B da planilha. */
  rotulo: string;
  /** Grupo a que pertence, quando há hierarquia. */
  grupo?: string;
  /** 0 total de bloco, 1 grupo ou item direto, 2 detalhe de grupo. */
  nivel: number;
  unidade: UnidadeWp;
  /** Linha que soma as de baixo. */
  eTotal?: boolean;
  /** Linha que é só título, sem valor. */
  eTitulo?: boolean;
  /**
   * Conta de "outros", cujo rótulo o consultor escreve. Na aba de cenário do
   * modelo, estas são fórmulas espelhadas de `DRE Projetada` coluna B, então a
   * leitura deve seguir a fórmula em vez de casar pelo rótulo.
   */
  editavel?: boolean;
}

/**
 * O bloco de comentários de uma aba, origem das caixas de texto do slide.
 *
 * A forma é regular nas quatro abas: um marcador `[a]`, `[b]` na coluna A abre um
 * item, a coluna B da mesma linha traz o tributo, e as linhas seguintes sem
 * marcador são o texto daquele item. Marcador sem tributo é item que o estudo não
 * usou, e sai da leitura.
 */
export interface BlocoDeComentarios {
  /** Primeira linha depois do rótulo `Comentários:`. */
  de: number;
  /** Última linha antes do próximo bloco da aba. */
  ate: number;
  /** Coluna do marcador. */
  colunaDoMarcador: string;
  /** Coluna do tributo e do texto. */
  coluna: string;
  /**
   * Linha do percentual de parceria agrícola, quando existe. Ela ocupa um marcador
   * mas não é comentário: é premissa, com o valor na coluna C, e serve o slide de
   * Cenários Avaliados, que está fora dos seis mapeados. Sai da leitura de texto
   * para não virar uma caixa vazia no slide.
   */
  percentualDeParceria?: number;
}

/** A aba `Resumo`, que é a origem da tabela do slide de Resumo da Tributação. */
export interface AbaResumoWp {
  nome: string;
  /** Linha do cabeçalho com os anos. */
  cabecalhoAnos: number;
  /** Linha do cabeçalho com o nome de cada cenário. */
  cabecalhoCenarios: number;
  /** Um bloco por ano, cada bloco com uma coluna por cenário. */
  colunasPorAno: string[][];
  linhas: LinhaWp[];
}

/** A aba `Farol`, origem do slide de Carga Tributária. Sem ano e sem cenário. */
export interface AbaFarolWp {
  nome: string;
  cabecalhoRegimes: number;
  cabecalhoPessoas: number;
  colunas: Array<{
    coluna: string;
    regime: 'presumido' | 'real';
    pessoa: 'pf' | 'pj';
  }>;
  notas: { de: number; ate: number };
  linhas: LinhaWp[];
}

/**
 * Uma aba de cenário: a DRE projetada e, quando há pessoa física no arranjo, o
 * bloco de apuração do IRPF. O `Cenário 02 (PJxPJ)` não tem apuração, porque não
 * há pessoa física a apurar.
 */
export interface AbaCenarioWp {
  nome: string;
  /** Linha do cabeçalho com os anos. */
  anos: number;
  /** Linha que identifica o contribuinte de cada coluna. */
  contribuinte: number;
  dre: LinhaWp[];
  apuracao: LinhaWp[];
  comentarios: BlocoDeComentarios;
}

/**
 * A aba `Cenário 02 (Venda de Ativos)`, origem do slide de Transferência da
 * Atividade Rural.
 *
 * Tem forma própria e não cabe em `AbaCenarioWp` por três motivos: não tem linha
 * de contribuinte, tem em cima um bloco de três valores numa coluna única, e a
 * apuração corre **sete anos** (2026 a 2032) em vez dos três do estudo, porque
 * acompanha o cronograma de amortização da dívida, que vai até 2032 na aba
 * `Dívidas da Atv. Rural`.
 *
 * As três linhas do bloco de cima (bens, dívidas e a diferença entre os dois) são
 * fórmula somando as abas de apoio, então chegam com valor em cache e a leitura
 * não precisa recalcular nada.
 */
export interface AbaVendaDeAtivosWp {
  nome: string;
  /** Linha do cabeçalho do bloco de valores, `Descrição | Valor`. */
  cabecalhoValores: number;
  /** Coluna única onde mora o valor do bloco de cima. */
  colunaDoValor: string;
  valores: LinhaWp[];
  /** Linha do cabeçalho com os anos da apuração. */
  anos: number;
  /** Colunas da apuração, uma por ano, em ordem. */
  colunas: string[];
  apuracao: LinhaWp[];
  comentarios: BlocoDeComentarios;
}

/** Uma aba de apoio, preenchida a partir dos documentos do cliente. */
export interface AbaApoioWp {
  nome: string;
  /** Linha do cabeçalho das colunas. */
  cabecalho: number;
  colunas: Array<{ coluna: string; rotulo: string }>;
}

/**
 * Onde estão os dados de identificação do estudo, na aba `Resumo`.
 *
 * **Rótulo e valor moram na mesma célula.** `B4` é a string
 * `'Data-base: 2026 a 2028'` inteira e `B7` é `'Preparado por: '`, então a leitura
 * parte no dois-pontos em vez de procurar o valor numa célula vizinha. Os dois
 * anos saem da própria data-base, que é o único lugar do modelo onde o período do
 * estudo está escrito.
 */
export interface CabecalhoWp {
  aba: string;
  /** Nome do cliente. No modelo em branco vem `[Nome do Cliente]`. */
  cliente: string;
  /** `Data-base: <ano inicial> a <ano final>`. */
  dataBase: string;
  preparadoPor: string;
  revisadoPor: string;
}

/**
 * Os dois parâmetros de projeção, na aba `DRE Projetada`.
 *
 * **Essa aba não é lida como aba.** Ela é a entrada de onde as abas de cenário
 * puxam a receita por fórmula (`'DRE Projetada'!F10` e vizinhas), e a aba de
 * cenário já carrega o número calculado. Dela só saem estes dois campos, que são
 * premissa do estudo e não têm outra origem.
 */
export interface ParametrosWp {
  aba: string;
  /** Taxa de crescimento anual da receita, em fração. No modelo, 0,05. */
  crescimentoAnual: string;
  /** Ano-base da projeção, anterior ao primeiro ano do estudo. */
  anoBase: string;
}

/**
 * As conferências que a leitura deve aplicar, em forma declarativa para o
 * validador não precisar conhecer o domínio.
 */
export type ValidacaoWp =
  | { tipo: 'soma_do_grupo'; aba: string; grupo: string }
  | { tipo: 'soma_de_rotulos'; aba: string; total: string; partes: string[] }
  | {
      tipo: 'proporcao';
      de: string;
      sobre: string;
      fator: number;
      /**
       * Restringe a regra a um cenário. Necessário porque a mesma linha tem base
       * diferente em abas diferentes: `Presunção de 20%` é 20% da `Receita` nas
       * abas de cenário e 20% do `Resultado do exercício` na de Venda de Ativos.
       */
      cenario?: string;
      /**
       * Não aplica a regra à coluna daquele contribuinte.
       *
       * O `Cenário 01 (PFxPJ)` tem duas colunas por ano, uma da pessoa física e
       * outra da jurídica, e o bloco de apuração ali se chama `IRPF`. Presunção de
       * 20% é regime do produtor rural pessoa física: a PJ apura por IRPJ e CSLL,
       * com outra base, em bloco próprio logo abaixo. Sem isto a regra conferia a
       * coluna da PJ e acusava conta que nunca deveria fechar ali. O modelo
       * concorda: a fórmula `C130 = C41*20%` existe só nas colunas de pessoa
       * física.
       *
       * **É exclusão e não inclusão, de propósito.** No modelo aquela linha traz
       * `Pessoa Física` e `Pessoa Jurídica`, mas nos WPs antigos ela traz o NOME
       * do contribuinte. Uma regra que só valesse para o texto `Pessoa Física`
       * pararia de conferir em silêncio nesses arquivos, que é o defeito pior.
       * Excluindo a PJ, o caso duvidoso vira aviso, e não silêncio.
       */
      excetoContribuinte?: string;
    }
  | { tipo: 'zero_antes_de'; rotulo: string; ano: number };
