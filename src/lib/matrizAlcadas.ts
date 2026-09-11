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
