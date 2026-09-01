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
}

/** Uma aba de apoio, preenchida a partir dos documentos do cliente. */
export interface AbaApoioWp {
  nome: string;
  /** Linha do cabeçalho das colunas. */
  cabecalho: number;
  colunas: Array<{ coluna: string; rotulo: string }>;
}

/**
 * As conferências que a leitura deve aplicar, em forma declarativa para o
 * validador não precisar conhecer o domínio.
 */
export type ValidacaoWp =
  | { tipo: 'soma_do_grupo'; aba: string; grupo: string }
  | { tipo: 'soma_de_rotulos'; aba: string; total: string; partes: string[] }
  | { tipo: 'proporcao'; de: string; sobre: string; fator: number }
  | { tipo: 'zero_antes_de'; rotulo: string; ano: number };
