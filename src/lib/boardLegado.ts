/**
 * Os cadastros LEGADOS que não podem entrar na leitura da diretoria.
 *
 * Decisão da reunião de 28/08 (Mariana + Patricia): "PSA Consultores",
 * "P Consultores" e o que sobrou do Prado Suzuki pesam na conta e produzem
 * número que a diretoria já sabe que está errado — pior que dado ausente.
 *
 * A lista NÃO foi inventada: foi conferida no cadastro antes de virar código.
 *  - em `cliente` existe exatamente um: "Psa Consultores";
 *  - os demais existem só como CENTRO DE CUSTO (`centros_custo`): PSA
 *    CONSULTORES, PSA CONSULTORES - FILIAL, PSA CONSULTORIA EMPRESARIAL,
 *    PSA ADM, PRADO SUZUKI, PRADOSUZUKI EMPRESAS FAMILIARES;
 *  - nenhum deles é cluster da estrutura atual (`estrutura_clusters` tem PSA
 *    Auditores, PSA Norte, Profitto, TAX, OSG, Prado Advogados… — esses FICAM,
 *    são operação viva e não podem ser confundidos com o legado).
 *
 * Por que por NOME e não por id: os ids diferem entre `cliente` e
 * `centros_custo`, e a mesma entidade legada aparece nos dois cadastros com
 * grafias diferentes. Quando existir uma marca de legado no cadastro, ela
 * substitui esta lista — e este arquivo some.
 */

/** Nomes já normalizados (minúsculo, sem acento, sem sufixo de filial). */
const LEGADOS = new Set([
  'psa consultores',
  'psa consultoria empresarial',
  'psa adm',
  'p consultores',
  'prado suzuki',
  'pradosuzuki',
  'pradosuzuki empresas familiares',
  'prado suzuki empresas familiares',
]);

/** Minúsculo, sem acento, sem pontuação de sufixo (" - FILIAL", " LTDA"). */
export function normalizarNomeCadastro(nome: string | null | undefined): string {
  return (nome ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s*-\s*filial\b/g, '')
    .replace(/\b(ltda|s\/a|sa|me|epp|eireli)\b\.?/g, '')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** `true` quando o nome é de um cadastro legado que a diretoria não quer ver. */
export function ehCadastroLegado(nome: string | null | undefined): boolean {
  return LEGADOS.has(normalizarNomeCadastro(nome));
}

/**
 * Remove as linhas de cadastro legado de qualquer coleção — a mesma regra para
 * OS, cliente, projeto e centro de custo, para as quatro não divergirem.
 */
export function semCadastroLegado<T>(linhas: T[], nomeDe: (linha: T) => string | null | undefined): T[] {
  return linhas.filter((l) => !ehCadastroLegado(nomeDe(l)));
}
