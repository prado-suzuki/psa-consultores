import { expressaoDoQuorum, type BaseQuorum, type TipoQuorum } from '@/lib/acordoQuotistasPadrao';
import type { EntradaAcordo } from '@/lib/templates/contextoAcordo';
import type { AcordoCompleto } from '@/hooks/useDomainAcordoQuotistas';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

/**
 * O que o cadastro do Acordo guarda, traduzido para o que o motor espera.
 *
 * Mesmo papel do `entradaGovernanca.ts` e do `entradaRural.ts`: a tela e o hook
 * falam a língua do banco (uuid de pessoa, `tipo` mais `percentual` mais `base`
 * em três colunas), e o motor fala a língua do documento ("¾ (três quartos) do
 * capital social", a pessoa qualificada por inteiro). A tradução mora aqui, e
 * não no controller, para ser testável sem subir tela nem banco.
 *
 * AS PESSOAS CHEGAM POR PARÂMETRO, porque as tabelas de vínculo guardam só o
 * uuid. Sem elas o preâmbulo sairia com uuid no lugar do nome do signatário, que
 * é o mesmo defeito que a Matriz teve com a atividade.
 */
export function entradaDoAcordo(
  dados: AcordoCompleto | null | undefined,
  pessoaPorId: Map<string, PessoaRow>,
): EntradaAcordo | null {
  if (!dados) return null;
  const { acordo } = dados;

  /*
   * A EXPRESSÃO DO QUÓRUM SE MONTA AQUI, e não no bloco de texto.
   *
   * O banco guarda três colunas (`tipo`, `percentual`, `base`) e o documento
   * escreve uma frase: "¾ (três quartos) do capital social". `expressaoDoQuorum`
   * é a mesma função que a tela usa para mostrar a prévia embaixo de cada linha,
   * então o que o consultor lê ao preencher é literalmente o que sai no Word.
   * Duas montagens da mesma frase divergiriam no dia em que uma mudasse.
   */
  const quoruns = dados.quoruns.map((q) => ({
    materia: q.materia,
    expressao: expressaoDoQuorum({
      tipo: q.tipo as TipoQuorum,
      percentual: q.percentual,
      base: q.base as BaseQuorum,
    }),
    ordem: q.ordem,
  }));

  /*
   * Vínculo cuja pessoa sumiu do cadastro é DESCARTADO, e não vira item vazio.
   * O `ON DELETE CASCADE` da tabela de vínculo cobre a exclusão de verdade, mas
   * a pessoa pode estar fora desta consulta por filtro de RLS. Item sem pessoa
   * escreveria uma linha em branco no preâmbulo.
   */
  const pessoas = (ids: { pessoa_id: string }[]) =>
    ids.map((v) => pessoaPorId.get(v.pessoa_id)).filter((p): p is PessoaRow => !!p);

  const empresas = (ids: { empresa_pessoa_id: string }[]) =>
    ids.map((v) => pessoaPorId.get(v.empresa_pessoa_id)).filter((p): p is PessoaRow => !!p);

  const representante = acordo.representante_pessoa_id
    ? pessoaPorId.get(acordo.representante_pessoa_id)
    : undefined;
  const substituto = acordo.substituto_representante_pessoa_id
    ? pessoaPorId.get(acordo.substituto_representante_pessoa_id)
    : undefined;

  return {
    acordo: {
      clienteId: acordo.cliente_id,
      assinadoEm: acordo.assinado_em,
      vigenciaAnos: acordo.vigencia_anos,
      reuniaoPreviaObrigatoria: acordo.reuniao_previa_obrigatoria,
      mecanismos: acordo.mecanismos,
      metodosAvaliacao: acordo.metodos_avaliacao,
      consolidaComposse: acordo.consolida_composse,
      naoConcorrencia: acordo.nao_concorrencia,
      naoConcorrenciaPrazoAnos: acordo.nao_concorrencia_prazo_anos,
      naoConcorrenciaArea: acordo.nao_concorrencia_area,
      naoConcorrenciaMulta: acordo.nao_concorrencia_multa,
      naoConcorrenciaAlcancaParentes: acordo.nao_concorrencia_alcanca_parentes,
      opcaoCompraPrevista: acordo.opcao_compra_prevista,
      opcaoCompraQuem: acordo.opcao_compra_quem,
      opcaoCompraPreco: acordo.opcao_compra_preco,
      opcaoVendaPrevista: acordo.opcao_venda_prevista,
      jurosValorSubscrito: acordo.juros_valor_subscrito,
      solucaoLitigios: acordo.solucao_litigios,
      camaraArbitral: acordo.camara_arbitral,
      regimeNomeacaoArbitros: acordo.regime_nomeacao_arbitros,
      representanteNome: representante?.denominacao ?? null,
      /*
       * O gênero do representante é da PESSOA, e por isso vem do cadastro dela e
       * não de um campo do acordo: é ele que decide entre "o Sr." e "a Sra." na
       * cláusula que o elege.
       */
      representanteGenero: (representante as { genero?: string | null } | undefined)?.genero
        ?? null,
      substitutoRepresentanteNome: substituto?.denominacao ?? null,
      substitutoRepresentanteGenero:
        (substituto as { genero?: string | null } | undefined)?.genero ?? null,
      foroEleitoComarca: acordo.foro_eleito_comarca,
      foroEleitoEstado: acordo.foro_eleito_estado,
    },
    quoruns,
    ramos: dados.ramos.map((r) => ({ nome: r.nome, ordem: r.ordem })),
    ordemPreferencia: dados.ordemPreferencia.map((o) => ({ quem: o.quem, ordem: o.ordem })),
    signatarios: pessoas(dados.signatarios),
    sociedadesRelacionadas: empresas(dados.sociedades),
    objetosPreferencia: acordo.objetos_preferencia,
  };
}
