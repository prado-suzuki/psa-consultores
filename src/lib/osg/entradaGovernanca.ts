import { baseDaAlcada, pisosDaLinha, resumoDaCompetencia, textoDaAlcada } from '@/lib/matrizAlcadas';
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
  if (linhasDaMatriz.length === 0) return { orgaos: doContrato, linhas: [], pendencias: [] };

  const nomeDaAtividade = new Map(atividades.map((a) => [a.id, a.nome]));
  const nomeDoPapel = new Map(papeis.map((p) => [p.id, p.nome]));
  /*
   * O infinitivo vem do catálogo, e não de derivação: 7 dos 32 papéis terminam
   * em "e" e são ambíguos entre -er e -ir. Papel sem o campo cai no nome.
   */
  const infinitivoDoPapel = new Map(
    papeis.map((p) => [p.id, (p as { infinitivo?: string | null }).infinitivo || p.nome]),
  );
  /*
   * O GRUPO do papel, que é o que separa a redação da alínea do Conselho da
   * redação da Diretoria na MESMA linha da matriz. Ele já existe no catálogo
   * (`papel_governanca.grupo`, com Decisão, Análise, Preparação, Negociação e
   * Execução); o que faltava era levá-lo ao motor, porque `papeis` chega como
   * prosa concatenada ("Aprova, Monitora") e o seletor de família compara
   * igualdade de string.
   */
  const grupoDoPapel = new Map(
    papeis.map((p) => [p.id, (p as { grupo?: string | null }).grupo ?? null]),
  );
  const nomeDoOrgao = new Map(orgaos.map((o) => [o.id, o.nome]));
  /*
   * "ao" ou "à" pelo gênero do órgão de DESTINO. Sem isto o documento saía
   * "encaminhando a Conselho" e "encaminhando a Reunião de Sócios".
   */
  const preposicaoDoOrgao = new Map(
    orgaos.map((o) => [o.id, (o as { genero?: string | null }).genero === 'F' ? 'à' : 'ao']),
  );

  const pendencias: string[] = [];

  const linhas: LinhaParaMapear[] = linhasDaMatriz.map((linha) => {
    const atividade = nomeDaAtividade.get(linha.atividade_id) ?? '(atividade removida do catálogo)';
    const celulasDaLinha = linha.competencias ?? [];
    /*
     * O piso sai da LINHA INTEIRA, antes de qualquer filtro: quem dá o piso da
     * Diretoria do Zamo é a Gestão, que é órgão interno e não recebe cláusula
     * (ver `pisosDaLinha`). Derivar depois do filtro de `doContrato` perderia
     * justamente a célula que sustenta a faixa.
     */
    const pisos = pisosDaLinha(celulasDaLinha);
    if ([...pisos.values()].some((p) => p.incomparavel)) {
      pendencias.push(
        `Na atividade "${atividade}", a alçada de quem sobe e a de quem recebe não se comparam `
        + '(unidades ou bases diferentes): a alínea sai só com o teto, sem a faixa.',
      );
    }

    return {
      id: linha.id,
      atividade,
      detalhamento: linha.detalhamento,
      ordem: linha.ordem,
      celulas: celulasDaLinha.map((c) => ({
        id: c.id,
        orgaoId: c.orgao_id,
        naoParticipa: c.nao_participa,
        papeis: (c.papeis ?? []).map((id) => nomeDoPapel.get(id) ?? '?'),
        papeisInfinitivo: (c.papeis ?? []).map((id) => infinitivoDoPapel.get(id) ?? '?'),
        // Sem repetir: a célula com "Aprova" e "Autoriza" é uma célula de
        // decisão, não duas.
        grupos: [...new Set(
          (c.papeis ?? []).map((id) => grupoDoPapel.get(id)).filter((g): g is string => !!g),
        )],
        alcada: textoDaAlcada(c),
        /*
         * A ALÇADA TAMBÉM EM PEÇAS, e não só na frase pronta.
         *
         * `textoDaAlcada` entrega "até R$ 5.000.000,00" montado, e daí saíam dois
         * defeitos: o "até" ficava fixo (a faixa do meio da escada precisa de
         * "superior a … e até …") e não havia de onde derivar o extenso, porque
         * campo derivado precisa de um número irmão e o irmão era prosa. A frase
         * pronta fica, para quem quiser a forma curta; o bloco novo usa as peças.
         */
        alcadaValor: c.alcada_valor === null || c.alcada_valor === undefined ? null : Number(c.alcada_valor),
        /*
         * A MEDIDA PODE VIR DO PISO, e não da própria célula.
         *
         * O órgão de topo da escada não tem alçada própria: ele decide acima do
         * teto de quem sobe para ele, e a célula dele guarda `alcada_valor` nulo
         * (a constraint do banco não deixa haver unidade sem valor). Lendo só a
         * célula, a unidade vinha nula, o seletor de variante escolhia "só piso,
         * em reais", e a alínea do Conselho do Zamo saiu "em valor superior a
         * R$ 5,00 (cinco reais)" onde a matriz dizia 5% do orçamento aprovado.
         *
         * A célula vence quando tem teto próprio; nesse caso as duas medidas já
         * são a mesma, senão `pisosDaLinha` teria marcado incomparável.
         */
        alcadaUnidade: c.alcada_unidade ?? pisos.get(c.orgao_id)?.unidade ?? null,
        alcadaBase: baseDaAlcada(c.alcada_base ?? pisos.get(c.orgao_id)?.base ?? null),
        alcadaPiso: pisos.get(c.orgao_id)?.valor ?? null,
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
    };
  });

  return { orgaos: doContrato, linhas, pendencias };
}
