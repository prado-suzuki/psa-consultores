// Tipos do engine de composição documental (OSG).
// O engine é agnóstico de documento: conhece blocos, flags e placeholders —
// nunca "matrícula", "contrato social", etc. Cada documento é só um Template.

/**
 * Tipo estrutural do bloco — governa a numeração automática na composição:
 * - capitulo:  conteúdo é só o título; numeração "CAPÍTULO {romano}" é automática
 * - clausula:  conteúdo é só o caput; "CLÁUSULA {ordinal}:" é automática (contínua, não reseta por capítulo)
 * - paragrafo: conteúdo é só o texto; agrupado sob a cláusula anterior como
 *              "Parágrafo Único:" (se for o único) ou "Parágrafo {ordinal}:" (reseta por cláusula)
 * - livre:     renderizado como está (preâmbulo, fecho, anexos etc.)
 */
export const TIPOS_BLOCO = ['capitulo', 'clausula', 'paragrafo', 'livre'] as const;
export type TipoBloco = (typeof TIPOS_BLOCO)[number];

export const LABEL_TIPO_BLOCO: Record<TipoBloco, string> = {
  capitulo: 'capítulo',
  clausula: 'cláusula',
  paragrafo: 'parágrafo',
  livre: 'livre',
};

export interface Bloco {
  id: string;
  /** Conteúdo do bloco com placeholders no formato {{ caminho }}. Texto no MVP; HTML quando o editor in-app existir. */
  conteudo: string;
  /** Tipo estrutural; ausente equivale a 'livre' (blocos legados). */
  tipo?: TipoBloco;
  /**
   * Reinicia capítulos e cláusulas a partir deste bloco. A consolidação dentro
   * de uma alteração contratual é um documento embutido e começa outra série.
   */
  reiniciaNumeracao?: boolean;
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
