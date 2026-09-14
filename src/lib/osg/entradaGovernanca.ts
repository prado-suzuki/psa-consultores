import { resumoDaCompetencia, textoDaAlcada } from '@/lib/matrizAlcadas';
import type { EntradaGovernanca, LinhaParaMapear } from '@/lib/templates/contextoGovernanca';
import type { AtividadeDoCatalogo, MatrizDoCliente, PapelDeGovernanca } from '@/hooks/useDomainMatrizAlcadas';
import type { OrgaoGovernanca } from '@/hooks/useDomainOrgaoGovernanca';

/**
 * O que o cadastro guarda, traduzido para o que o motor documental espera.
 *
 * Mesmo papel do `entradaRural.ts`: a tela e o hook falam a língua do banco
 * (uuid de atividade, uuid de papel, `alcada_valor` com `alcada_unidade` ao
 * lado); o motor fala a língua do documento (o nome da atividade, os verbos em
 * prosa, "até R$ 100.000,00"). A tradução mora aqui, e não no controller, para
 * ser testável sem subir tela nem banco.
 *
 * Os catálogos chegam por parâmetro porque o nome da atividade e o do papel não
 * estão na linha da matriz: ela guarda o id. Sem eles a cláusula sairia com
 * uuid no lugar do assunto.
 */
export function entradaDaGovernanca(
  matriz: MatrizDoCliente | null | undefined,
  orgaos: OrgaoGovernanca[],
  atividades: AtividadeDoCatalogo[],
  papeis: PapelDeGovernanca[],
): EntradaGovernanca {
  /*
   * Só os órgãos que recebem cláusula. Órgão marcado como interno existe na
   * Matriz e não no contrato: levá-lo ao gerador criaria capítulo que a Junta
   * não deveria ver.
   */
  const doContrato = (orgaos ?? []).filter((o) => o.entra_no_contrato);
  /*
   * `matriz?.linhas` e nao `matriz.linhas`: a matriz pode existir sem linha
   * nenhuma (o consultor criou e nao preencheu), e o teste de caracterizacao da
   * tela Gerar entrega o objeto pela metade. Cair aqui derrubaria a tela
   * inteira por causa de um cadastro vazio.
   */
  const linhasDaMatriz = matriz?.linhas ?? [];
  if (linhasDaMatriz.length === 0) return { orgaos: doContrato, linhas: [] };

  const nomeDaAtividade = new Map(atividades.map((a) => [a.id, a.nome]));
  const nomeDoPapel = new Map(papeis.map((p) => [p.id, p.nome]));
  /*
   * O infinitivo vem do catálogo, e não de derivação: 7 dos 32 papéis terminam
   * em "e" e são ambíguos entre -er e -ir. Papel sem o campo cai no nome.
   */
  const infinitivoDoPapel = new Map(
    papeis.map((p) => [p.id, (p as { infinitivo?: string | null }).infinitivo || p.nome]),
  );
  const nomeDoOrgao = new Map(orgaos.map((o) => [o.id, o.nome]));
  /*
   * "ao" ou "à" pelo gênero do órgão de DESTINO. Sem isto o documento saía
   * "encaminhando a Conselho" e "encaminhando a Reunião de Sócios".
   */
  const preposicaoDoOrgao = new Map(
    orgaos.map((o) => [o.id, (o as { genero?: string | null }).genero === 'F' ? 'à' : 'ao']),
  );

  const linhas: LinhaParaMapear[] = linhasDaMatriz.map((linha) => ({
    id: linha.id,
    atividade: nomeDaAtividade.get(linha.atividade_id) ?? '(atividade removida do catálogo)',
    detalhamento: linha.detalhamento,
    ordem: linha.ordem,
    celulas: (linha.competencias ?? []).map((c) => ({
      id: c.id,
      orgaoId: c.orgao_id,
      naoParticipa: c.nao_participa,
      papeis: (c.papeis ?? []).map((id) => nomeDoPapel.get(id) ?? '?'),
      papeisInfinitivo: (c.papeis ?? []).map((id) => infinitivoDoPapel.get(id) ?? '?'),
      alcada: textoDaAlcada(c),
      sobePara: c.sobe_para_orgao_id ? (nomeDoOrgao.get(c.sobe_para_orgao_id) ?? null) : null,
      sobeParaAo: c.sobe_para_orgao_id ? (preposicaoDoOrgao.get(c.sobe_para_orgao_id) ?? 'ao') : null,
      foraDaPolitica: c.fora_da_politica,
      // A célula inteira em uma linha, que é o que a grade do documento da
      // Matriz põe dentro de cada quadradinho.
      resumo: resumoDaCompetencia(
        { ...c, alcada_valor: c.alcada_valor === null ? null : Number(c.alcada_valor) },
        (id) => nomeDoPapel.get(id) ?? '?',
        (id) => nomeDoOrgao.get(id) ?? '?',
      ),
    })),
  }));

  return { orgaos: doContrato, linhas };
}
