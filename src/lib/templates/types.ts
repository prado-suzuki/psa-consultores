// Tipos do engine de composição documental (OSG).
// O engine é agnóstico de documento: conhece blocos, flags e placeholders —
// nunca "matrícula", "contrato social", etc. Cada documento é só um Template.

/**
 * Tipo estrutural do bloco — governa a numeração automática na composição:
 * - capitulo:  conteúdo é só o título; numeração "CAPÍTULO {romano}" é automática
 * - clausula:  conteúdo é só o caput; "CLÁUSULA {ordinal}:" é automática (contínua, não reseta por capítulo)
 * - paragrafo: conteúdo é só o texto; agrupado sob a cláusula anterior como
 *              "Parágrafo Único:" (se for o único) ou "Parágrafo {ordinal}:" (reseta por cláusula)
 * - item:      conteúdo é só o texto; numeração DECIMAL sob a cláusula anterior
 *              ("2.1", "2.2"), reiniciando a cada cláusula nova
 * - subitem:   um nível abaixo do item ("1.1.1"); reinicia a cada item novo
 * - alinea:    letra minúscula ("a)", "b)"); reinicia a cada item ou cláusula
 * - inciso:    romano maiúsculo entre parênteses ("(I)", "(II)"); idem
 * - livre:     renderizado como está (preâmbulo, fecho, anexos etc.)
 *
 * POR QUE `item` EXISTE, ao lado de `paragrafo`. Os dois são subdivisão de
 * cláusula, e a diferença é de DOCUMENTO, não de gosto: o contrato social
 * escreve "Parágrafo Segundo:" e o Acordo de Quotistas escreve "2.2". Medido no
 * modelo da casa, 92 dos 243 parágrafos do Acordo são itens decimais, e o
 * próprio texto se referencia por eles, sete vezes ("observado o item 5.5").
 *
 * Escrever o número no texto do bloco não serve: cláusula condicional desligada
 * renumera as seguintes, e aí "5.5" passaria a apontar para outro item, calado.
 */
export const TIPOS_BLOCO = [
  'capitulo', 'clausula', 'paragrafo', 'item', 'subitem', 'alinea', 'inciso', 'livre',
] as const;
export type TipoBloco = (typeof TIPOS_BLOCO)[number];

export const LABEL_TIPO_BLOCO: Record<TipoBloco, string> = {
  capitulo: 'capítulo',
  clausula: 'cláusula',
  paragrafo: 'parágrafo',
  item: 'item',
  subitem: 'subitem',
  alinea: 'alínea',
  inciso: 'inciso',
  livre: 'livre',
};

export interface Bloco {
  id: string;
  /** Conteúdo do bloco com placeholders no formato {{ caminho }}. Texto no MVP; HTML quando o editor in-app existir. */
  conteudo: string;
  /** Tipo estrutural; ausente equivale a 'livre' (blocos legados). */
  tipo?: TipoBloco;
  /**
   * O título que vai DEPOIS do ordinal, no documento: "CLÁUSULA PRIMEIRA –
   * Definições das expressões utilizadas neste ACORDO."
   *
   * Só a cláusula usa, e só o Acordo de Quotistas tem. Sem ele a cláusula sai
   * como sempre saiu, "CLÁUSULA PRIMEIRA:", que é a forma do contrato social.
   *
   * NÃO CONFUNDIR COM `tmpl_bloco.nome`, que é rótulo de BIBLIOTECA ("Cláusula
   * — Composição do Conselho"): aquele serve para achar o bloco na estante, e
   * este é texto que sai no Word.
   */
  tituloDocumento?: string;
  /**
   * Reinicia capítulos e cláusulas a partir deste bloco. A consolidação dentro
   * de uma alteração contratual é um documento embutido e começa outra série.
   */
  reiniciaNumeracao?: boolean;
  /**
   * Abre PÁGINA NOVA antes deste bloco no .docx — o Anexo Único dos instrumentos
   * agrários sai em folha própria, no mesmo arquivo. Declarado no catálogo
   * (`tmpl_bloco.quebra_pagina_antes`), como `reiniciaNumeracao`.
   *
   * A prévia em tela não muda: página é coisa do arquivo, não do HTML.
   */
  quebraPaginaAntes?: boolean;
  /** Flags que precisam estar TODAS ativas para o bloco entrar (AND simples; sem OR, sem negação). */
  flagsRequeridas?: string[];
  /** Se true, entra sempre, ignorando flags. */
  obrigatorio?: boolean;
  /**
   * Âncora estável para referências de numeração: outro bloco escreve
   * {{ refs.<ancora> }} e recebe "Cláusula Quinta" / "parágrafo segundo" conforme
   * a posição REAL deste bloco na composição. Só letras/dígitos/underscore
   * (precisa caber num caminho de placeholder).
   */
  ancora?: string;
  /**
   * Nome da coleção do contexto sobre a qual o bloco repete: a composição expande
   * uma instância por item ANTES da numeração (ver repetidor.ts) — é assim que
   * "um parágrafo por sócio que integraliza" entra na sequência estrutural.
   */
  repeteColecao?: string;
  /** Escopo do item numa instância expandida (preenchido pela expansão, nunca pelo autor). */
  escopo?: Contexto;
  /** Id do bloco repetidor de origem numa instância expandida (o id da instância ganha sufixo "#n"). */
  instanciaDe?: string;
}

export interface Template {
  id: string;
  nome: string;
  /** Blocos na ordem de montagem. */
  blocos: Bloco[];
}

export type Contexto = Record<string, unknown>;
