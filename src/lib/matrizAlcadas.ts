import type { Competencia, CompetenciaInput } from '@/hooks/useDomainMatrizAlcadas';

/**
 * O resumo de uma célula da Matriz, e o diff de uma linha para a auditoria.
 *
 * **Por que o diff é por CÉLULA e não por coluna do banco.** O card pede
 * auditoria "campo a campo", e o caminho óbvio seria registrar
 * `alcada_valor: 400000 → 500000`. Só que a pessoa não pensa em colunas: ela
 * pensa "o Diretor Executivo decidia até 400 mil e agora decide até 500 mil".
 * Um diff que fala a língua da coluna obriga quem lê a auditoria a remontar a
 * célula de cabeça, e o valor de um log é ser lido meses depois por alguém que
 * não estava lá.
 *
 * Some-se a isso que salvar uma linha APAGA e regrava as células, então não
 * existe um UPDATE de coluna para observar: o que existe é a célula antes e a
 * célula depois.
 */

const BASES: Record<string, string> = {
  orcamento_aprovado: 'do orçamento aprovado',
  faturamento_ano_anterior: 'do faturamento do ano anterior',
};

/** A base do percentual em prosa ("do orçamento aprovado"); '' quando não há. */
export function baseDaAlcada(base: string | null | undefined): string {
  return base ? (BASES[base] ?? '') : '';
}

/**
 * Só o pedaço da alçada, em texto: "até R$ 100.000,00" ou "até 10% do orçamento
 * aprovado". Sai daqui e não do `resumoDaCompetencia` porque a alínea do
 * contrato usa a alçada sozinha, no meio da frase, enquanto o resumo é a célula
 * inteira para a grade. Duas leituras do mesmo dado, uma função cada.
 */
export function textoDaAlcada(c: {
  alcada_valor: number | string | null;
  alcada_unidade: string | null;
  alcada_base: string | null;
}): string | null {
  if (c.alcada_valor === null || c.alcada_valor === undefined) return null;
  const valor = Number(c.alcada_valor);
  if (c.alcada_unidade === 'percentual') {
    const base = c.alcada_base ? (BASES[c.alcada_base] ?? '') : '';
    return `até ${valor}% ${base}`.trim();
  }
  return `até R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

/**
 * O PISO DA ALÇADA NÃO É CAMPO NOVO: é o teto de quem aponta para este órgão na
 * mesma linha.
 *
 * A escada inteira da "contratação de prestadores de serviços" no Zamo mostra
 * por que a faixa não se digita:
 *
 *   Gestão    → até 500 mil, sobe para a Diretoria  (órgão interno: sem cláusula)
 *   Diretoria → até 5 MM, sobe para o Conselho      → "superior a R$ 500.000,00
 *                                                      e até R$ 5.000.000,00"
 *   Conselho  → até 15 MM, sobe para a Reunião      → "superior a R$ 5.000.000,00"
 *
 * A faixa da Diretoria é o teto DELA mais o teto de quem sobe para ela. Pedir o
 * piso no cadastro seria pedir duas vezes o mesmo número, e a segunda digitação
 * é que fica velha quando a primeira muda.
 *
 * As cinco regras, todas com caso no corpus:
 *
 *  1. O piso vem de QUALQUER célula da linha, inclusive de órgão interno. A
 *     Gestão do Zamo não recebe cláusula (`entra_no_contrato = false`) e é ela
 *     que dá o piso da Diretoria — por isso esta função recebe as células da
 *     linha inteira, e não os órgãos já filtrados.
 *  2. Mais de uma célula apontando para o mesmo órgão: o piso é o MAIOR teto
 *     entre elas. É o único valor a partir do qual toda decisão chega a este
 *     órgão sem passar por ninguém abaixo.
 *  3. Unidade (ou base) diferente entre quem aponta e quem recebe: NÃO HÁ FAIXA.
 *     A célula sai só com o teto e a linha vira pendência, porque a matriz está
 *     pedindo uma comparação que o contrato não sabe escrever ("superior a 10%
 *     do faturamento e até R$ 1.000.000,00" não é faixa, é duas coisas). A base
 *     entra na comparação junto com a unidade pelo mesmo motivo: 10% do
 *     faturamento e 20% do orçamento não formam intervalo.
 *  4. Célula que sobe SEM alçada (só `fora_da_politica`, ou papel de análise)
 *     não contribui para o piso de ninguém — não há teto a herdar.
 *  5. Órgão com teto e ninguém apontando para ele sai sem piso, e a alínea não
 *     pode inventar um.
 */
export interface CelulaDaEscada {
  orgao_id: string;
  nao_participa: boolean;
  sobe_para_orgao_id: string | null;
  alcada_valor: number | string | null;
  alcada_unidade: string | null;
  alcada_base: string | null;
}

export interface PisoDaCelula {
  /** O maior teto que sobe para este órgão; null quando não há piso derivável. */
  valor: number | null;
  /**
   * Quem aponta e quem recebe medem coisas diferentes (regra 3). A célula sai só
   * com o teto, e quem chama transforma isto em pendência do documento.
   */
  incomparavel: boolean;
}

/** A medida de uma alçada, para comparar duas: "R$" e "10% do orçamento" não se comparam. */
function medida(c: { alcada_unidade: string | null; alcada_base: string | null }): string {
  return c.alcada_unidade === 'percentual' ? `percentual:${c.alcada_base ?? ''}` : 'moeda';
}

/**
 * O piso de cada órgão que RECEBE alçada nesta linha, pelas regras acima.
 * Só entra no mapa o órgão para quem alguém sobe; os demais não têm piso.
 */
export function pisosDaLinha(celulas: readonly CelulaDaEscada[]): Map<string, PisoDaCelula> {
  const porOrgao = new Map<string, CelulaDaEscada[]>();
  for (const c of celulas) {
    // Regra 4: sem destino ou sem teto, não há o que herdar.
    if (!c.sobe_para_orgao_id || c.nao_participa) continue;
    if (c.alcada_valor === null || c.alcada_valor === undefined) continue;
    const lista = porOrgao.get(c.sobe_para_orgao_id) ?? [];
    lista.push(c);
    porOrgao.set(c.sobe_para_orgao_id, lista);
  }

  const pisos = new Map<string, PisoDaCelula>();
  for (const [orgaoId, apontam] of porOrgao) {
    const recebe = celulas.find((c) => c.orgao_id === orgaoId);
    const medidas = new Set(apontam.map(medida));
    // A medida de quem recebe só entra quando ele TEM teto: órgão de topo (que
    // recebe e não sobe para ninguém) legitimamente sai só com piso.
    if (recebe && recebe.alcada_valor !== null && recebe.alcada_valor !== undefined && !recebe.nao_participa) {
      medidas.add(medida(recebe));
    }
    if (medidas.size > 1) {
      pisos.set(orgaoId, { valor: null, incomparavel: true });
      continue;
    }
    // Regra 2: o maior teto entre quem aponta.
    const valor = Math.max(...apontam.map((c) => Number(c.alcada_valor)));
    pisos.set(orgaoId, {
      valor: Number.isFinite(valor) ? valor : null,
      incomparavel: false,
    });
  }
  return pisos;
}

/** Uma célula em uma linha de texto, do jeito que ela se lê. */
export function resumoDaCompetencia(
  c: {
    nao_participa: boolean;
    papeis: string[];
    sobe_para_orgao_id: string | null;
    alcada_valor: number | null;
    /* Vem `'moeda' | 'percentual'` da tela e `string` do banco. */
    alcada_unidade: string | null;
    alcada_base: string | null;
    fora_da_politica: boolean;
  },
  nomeDoPapel: (id: string) => string,
  nomeDoOrgao: (id: string) => string,
): string {
  if (c.nao_participa) return 'Não participa';

  const partes: string[] = [];

  if (c.papeis.length > 0) partes.push(c.papeis.map(nomeDoPapel).join(', '));

  if (c.alcada_valor !== null && c.alcada_valor !== undefined) {
    const valor =
      c.alcada_unidade === 'percentual'
        ? `${c.alcada_valor}% ${c.alcada_base ? (BASES[c.alcada_base] ?? '') : ''}`.trim()
        : `R$ ${c.alcada_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    partes.push(`até ${valor}`);
  }

  if (c.sobe_para_orgao_id) partes.push(`sobe para ${nomeDoOrgao(c.sobe_para_orgao_id)}`);

  /*
   * A ressalva se lê diferente nos dois lados da escada, e é o `sobe_para` que
   * diz de que lado esta célula está: quem tem destino manda, quem não tem
   * recebe. É a mesma distinção que o contrato faz ("submete ao Conselho o que
   * estiver fora da política" contra "autorizar os atos não previstos nestas
   * políticas").
   */
  if (c.fora_da_politica) {
    partes.push(
      c.sobe_para_orgao_id
        ? 'inclusive o que foge da política'
        : 'autoriza o que foge da política',
    );
  }

  return partes.length > 0 ? partes.join(' · ') : 'vazio';
}

/**
 * O que mudou numa linha, órgão por órgão.
 *
 * A chave é o NOME do órgão, e não o id, porque quem lê a auditoria depois não
 * tem como resolver um uuid. Órgão que não mudou fica de fora, para o histórico
 * não encher de linha de quem só abriu e fechou a caixa.
 */
export function diffDaLinha(
  antes: Competencia[],
  depois: CompetenciaInput[],
  nomeDoPapel: (id: string) => string,
  nomeDoOrgao: (id: string) => string,
): Record<string, { old: string; new: string }> {
  const mudou: Record<string, { old: string; new: string }> = {};
  const idsDeOrgao = new Set([...antes, ...depois].map((c) => c.orgao_id));

  for (const orgaoId of idsDeOrgao) {
    const a = antes.find((c) => c.orgao_id === orgaoId);
    const d = depois.find((c) => c.orgao_id === orgaoId);

    /*
     * Célula ausente dos dois lados não existe; ausente de um lado é "vazio",
     * que é diferente de "Não participa": vazio é não preenchido, e não
     * participa é preenchido com nada.
     */
    const velho = a
      ? resumoDaCompetencia(
        { ...a, alcada_valor: a.alcada_valor === null ? null : Number(a.alcada_valor) },
        nomeDoPapel,
        nomeDoOrgao,
      )
      : 'vazio';

    /* Do lado novo, a tela manda todas as células, inclusive as intocadas. */
    const novo =
      d && (d.nao_participa || d.papeis.length > 0 || d.sobe_para_orgao_id || d.alcada_valor)
        ? resumoDaCompetencia(d, nomeDoPapel, nomeDoOrgao)
        : 'vazio';

    if (velho !== novo) mudou[nomeDoOrgao(orgaoId)] = { old: velho, new: novo };
  }

  return mudou;
}
