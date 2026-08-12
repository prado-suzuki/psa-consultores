/**
 * Poderes de um administrador.
 *
 * O cadastro tinha só `pode_isoladamente`, um sim/não que não descreve a regra
 * mais comum: "administra isoladamente, MAS os atos da cláusula sexta exigem as
 * duas assinaturas". A forma abaixo separa a regra geral (`forma`) das exceções
 * por tipo de ato (`excecoes`) e deixa `observacao` como saída de emergência do
 * que a estrutura não previu. Persiste em `administracao.poderes` (jsonb), com
 * `pode_isoladamente` mantido em sincronia porque o gerador de documentos e a
 * auditoria ainda leem a coluna antiga.
 */

export type ExigenciaAssinatura = 'isolada' | 'conjunta';

export interface ExcecaoPoder {
  /** Que atos fogem da regra geral. Ex.: "atos da cláusula sexta". */
  atos: string;
  exigencia: ExigenciaAssinatura;
}

export interface PoderesAdministracao {
  forma: ExigenciaAssinatura;
  excecoes: ExcecaoPoder[];
  observacao: string;
}

export const EXIGENCIAS: { value: ExigenciaAssinatura; label: string }[] = [
  { value: 'isolada', label: 'Isoladamente' },
  { value: 'conjunta', label: 'Em conjunto com outro administrador' },
];

const EXIGENCIA_CURTA: Record<ExigenciaAssinatura, string> = {
  isolada: 'isoladamente',
  conjunta: 'em conjunto',
};

export const poderesVazios = (): PoderesAdministracao => ({
  forma: 'conjunta',
  excecoes: [],
  observacao: '',
});

const ehExigencia = (valor: unknown): valor is ExigenciaAssinatura =>
  valor === 'isolada' || valor === 'conjunta';

const texto = (valor: unknown): string => (typeof valor === 'string' ? valor : '');

/**
 * Lê a coluna nova caindo para o booleano antigo.
 *
 * Vínculo cadastrado antes da migration tem `poderes` nulo e não é dado
 * incompleto: `pode_isoladamente` é exatamente a regra geral que aquele
 * cadastro sabia expressar. Por isso a derivação em vez de backfill.
 */
export function lerPoderes(bruto: unknown, podeIsoladamente?: boolean | null): PoderesAdministracao {
  const doBooleano: ExigenciaAssinatura = podeIsoladamente ? 'isolada' : 'conjunta';
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) {
    return { forma: doBooleano, excecoes: [], observacao: '' };
  }
  const objeto = bruto as Record<string, unknown>;
  const excecoesBrutas = Array.isArray(objeto.excecoes) ? objeto.excecoes : [];
  return {
    forma: ehExigencia(objeto.forma) ? objeto.forma : doBooleano,
    excecoes: excecoesBrutas
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        atos: texto(item.atos).trim(),
        exigencia: ehExigencia(item.exigencia) ? item.exigencia : 'conjunta',
      }))
      .filter((excecao) => excecao.atos.length > 0),
    observacao: texto(objeto.observacao).trim(),
  };
}

/**
 * Payload de gravação: normaliza (descarta exceção sem descrição, apara texto) e
 * devolve junto o booleano legado, para que as duas colunas nunca divirjam.
 */
export function poderesParaGravar(poderes: PoderesAdministracao): {
  poderes: PoderesAdministracao;
  pode_isoladamente: boolean;
} {
  const normalizado: PoderesAdministracao = {
    forma: poderes.forma,
    excecoes: poderes.excecoes
      .map((excecao) => ({ atos: excecao.atos.trim(), exigencia: excecao.exigencia }))
      .filter((excecao) => excecao.atos.length > 0),
    observacao: poderes.observacao.trim(),
  };
  return { poderes: normalizado, pode_isoladamente: normalizado.forma === 'isolada' };
}

/** Frase curta para o resumo da linha na lista de administradores. */
export function descreverPoderes(poderes: PoderesAdministracao): string {
  const base = `Assina ${EXIGENCIA_CURTA[poderes.forma]}`;
  if (poderes.excecoes.length === 0) return base;
  const total = poderes.excecoes.length;
  return `${base}, com ${total} ${total > 1 ? 'exceções' : 'exceção'}`;
}

/** Como cada exceção é lida na tela (e como o documento deve descrevê-la). */
export function descreverExcecao(excecao: ExcecaoPoder): string {
  return `${excecao.atos}: assina ${EXIGENCIA_CURTA[excecao.exigencia]}`;
}
