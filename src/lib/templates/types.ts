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
  /** Flags que precisam estar TODAS ativas para o bloco entrar (AND simples; sem OR, sem negação). */
  flagsRequeridas?: string[];
  /** Se true, entra sempre, ignorando flags. */
  obrigatorio?: boolean;
}

export interface Template {
  id: string;
  nome: string;
  /** Blocos na ordem de montagem. */
  blocos: Bloco[];
}

export type Contexto = Record<string, unknown>;
