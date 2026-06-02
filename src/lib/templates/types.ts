// Tipos do engine de composição documental (OSG).
// O engine é agnóstico de documento: conhece blocos, flags e placeholders —
// nunca "matrícula", "contrato social", etc. Cada documento é só um Template.

export interface Bloco {
  id: string;
  /** Conteúdo do bloco com placeholders no formato {{ caminho }}. Texto no MVP; HTML quando o editor in-app existir. */
  conteudo: string;
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
