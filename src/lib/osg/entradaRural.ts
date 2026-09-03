/**
 * Linhas do cadastro → entrada dos mapeadores agrários. Puro: nada de React,
 * nada de Supabase.
 *
 * Existe separado do `useGeracaoDocumento` por um motivo concreto: DOIS
 * consumidores precisam da mesma conversão, e um deles não é a tela.
 *
 *   · a tela Gerar, pelo hook `useRegistrosPorTipo`;
 *   · o arnês `scripts/osg/render-contratos-mms.ts`, que renderiza os contratos
 *     do MMS para comparar com o assinado.
 *
 * O arnês já teve os dados do MMS escritos à mão dentro dele. Isso significava
 * duas fontes para o mesmo cadastro — a semeadura no banco e a cópia no script —,
 * e elas divergiram: o preâmbulo saía sem capital social e sem os
 * administradores, e a alínea sem Livro e Folha, tudo com o dado correto gravado
 * no banco. O arnês dizia "nenhum placeholder pendente" e estava certo; só não
 * estava comparando o que a tela produz.
 *
 * Ou seja: este arquivo não é organização, é a correção de um ponto cego. Se a
 * conversão viver em dois lugares, o teste volta a validar outra coisa.
 */
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { MatriculaParaMapear } from '@/lib/templates/mapeadores';
import type {
  EntradaInstrumentoRural,
  ImovelRural,
  ParteRural,
} from '@/lib/templates/contextoRural';

/**
 * A matrícula com bem, cartório e titulares, como o `select` da geração a traz.
 *
 * `tipo_bem`/`tipo_exploracao_posse` classificam o imóvel para as condicionais
 * rural/urbano/posse; o endereço, a área construída e a inscrição municipal (do
 * bem) são o que a descrição de imóvel URBANO usa no lugar da denominação e do
 * CCIR.
 */
export interface MatriculaCrua {
  id: string;
  numero: string | null;
  livro: string | null;
  folha: string | null;
  municipio_imovel: string | null;
  uf_imovel: string | null;
  area_documento: number | null;
  area_unidade: string | null;
  vlr_contabil: number | null;
  confrontacoes_texto: string | null;
  descricao_psa_completa: string | null;
  tipo_bem: string | null;
  tipo_exploracao_posse: string | null;
  bem: {
    denominacao: string | null;
    vlr_contabil: number | null;
    ccir_codigo: string | null;
    cliente_id?: string | null;
    tipo_bem: string | null;
    inscricao_municipal: string | null;
    endereco_logradouro: string | null;
    endereco_numero: string | null;
    endereco_complemento: string | null;
    endereco_bairro: string | null;
    endereco_cep: string | null;
    area_construida_m2: number | null;
    participa_estruturacao?: boolean | null;
  } | null;
  cartorio: { nome_completo: string | null; comarca: string | null; uf: string | null } | null;
  titularidade: Array<{
    integralizador: boolean | null;
    fracao: number | null;
    titular: { id: string; denominacao: string | null; cliente_id?: string | null } | null;
  }> | null;
}

/** A linha achatada no formato que `mapearMatricula` consome. */
export function matriculaParaMapear(m: MatriculaCrua): MatriculaParaMapear {
  return {
    id: m.id,
    numero: m.numero,
    livro: m.livro,
    folha: m.folha,
    municipio_imovel: m.municipio_imovel,
    uf_imovel: m.uf_imovel,
    area_documento: m.area_documento,
    area_unidade: m.area_unidade,
    vlr_contabil: m.vlr_contabil,
    confrontacoes_texto: m.confrontacoes_texto,
    descricao_psa_completa: m.descricao_psa_completa,
    tipo_bem: m.tipo_bem,
    tipo_exploracao_posse: m.tipo_exploracao_posse,
    bem: m.bem
      ? {
          denominacao: m.bem.denominacao,
          vlr_contabil: m.bem.vlr_contabil,
          ccir_codigo: m.bem.ccir_codigo,
          tipo_bem: m.bem.tipo_bem,
          inscricao_municipal: m.bem.inscricao_municipal,
          endereco_logradouro: m.bem.endereco_logradouro,
          endereco_numero: m.bem.endereco_numero,
          endereco_complemento: m.bem.endereco_complemento,
          endereco_bairro: m.bem.endereco_bairro,
          endereco_cep: m.bem.endereco_cep,
          area_construida_m2: m.bem.area_construida_m2,
        }
      : null,
    cartorio: m.cartorio,
    titulares: (m.titularidade ?? []).map((t) => ({
      pessoaId: t.titular?.id ?? null,
      denominacao: t.titular?.denominacao ?? null,
      integralizador: !!t.integralizador,
      fracao: t.fracao ?? null,
    })),
  } as MatriculaParaMapear;
}

/** A linha de `exploracao_rural` com as três filhas, na forma que a conversão lê. */
export interface ExploracaoCrua {
  tipo_exploracao: string;
  data_assinatura: string | null;
  data_encerramento: string | null;
  data_inicio_vigencia: string | null;
  vigencia_prorrogavel: boolean | null;
  percentual_outorgante: number | null;
  percentual_explorador: number | null;
  culturas: string | null;
  inclui_pecuaria: boolean | null;
  pecuaria_modalidades: string[] | null;
  permite_penhor: boolean | null;
  prazo_indivisao_quantidade: number | null;
  prazo_indivisao_unidade: string | null;
  indivisao_prorrogavel: boolean | null;
  indivisao_aviso_quantidade: number | null;
  indivisao_aviso_unidade: string | null;
  regra_administracao: string | null;
  liquidacao_periodicidade: string | null;
  liquidacao_numero_parcelas: number | null;
  outorgante_pessoa_id: string | null;
  outorgante_capital_social_na_assinatura: number | null;
  partes: Array<{ pessoa_id: string | null; papel: string; fracao: number | null; ordem: number | null }>;
  imoveis: Array<{
    matricula_id: string | null;
    area_explorada: number | null;
    area_unidade: string | null;
    ordem: number | null;
    origem_tipo: string | null;
    origem_externa_id: string | null;
    origem_exploracao_rural_id: string | null;
  }>;
  origens: Array<{
    id: string;
    titulo_instrumento: string | null;
    data_assinatura: string | null;
    outorgante_pessoa_id: string | null;
    outorgante_representante: string | null;
    outorgante_capital_social_na_assinatura: number | null;
  }>;
}

/**
 * A exploração rural na forma que os mapeadores agrários consomem.
 *
 * O cadastro guarda ids (`pessoa_id`, `matricula_id`); os mapeadores precisam da
 * PESSOA e da MATRÍCULA inteiras, porque quem qualifica e quem descreve são
 * `mapearPessoa` e `mapearMatricula` — os mesmos do Contrato Social.
 *
 * Parte cuja pessoa não está na coleção é DESCARTADA em vez de virar linha vazia:
 * uma parte sem nome no preâmbulo é um contrato quebrado, e o descarte se anuncia
 * pela lista menor do que o cadastro.
 */
export function entradaDoInstrumento(
  exploracao: ExploracaoCrua,
  pessoaPorId: Map<string, PessoaRow>,
  matriculaPorId: Map<string, MatriculaParaMapear>,
  administradoresPorPj: Map<string, PessoaRow[]>,
  /**
   * Os OUTROS instrumentos do cliente, por id — para a origem INTERNA.
   *
   * O Considerando V do composse nomeia quem cedeu a posse:
   *
   *   "Itens 'a' ao 'f' advêm do INSTRUMENTO PARTICULAR DE PARCERIA…, firmado em
   *    11 de outubro de 2.022, no qual figuram como Parceiros Outorgados os
   *    COMPOSSUIDORES RURAIS e como Parceira Outorgante a empresa MMS AGRO LTDA,
   *    pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o n.º…"
   *
   * Quando a origem é EXTERNA, isso vem de `exploracao_rural_origem_externa`.
   * Quando é INTERNA — o imóvel aponta para outra exploração do próprio cliente —
   * o outorgante é o daquela exploração, e a data é a dela: está a UM salto de
   * distância, e sem seguir esse salto o Considerando V saía sem contraparte e
   * `{{ outorgante.qualificacao }}` derrubava a geração inteira.
   *
   * Ausente (ou sem a exploração referida), a origem interna fica sem contraparte
   * — que é o comportamento anterior, agora explícito.
   */
  exploracaoPorId: Map<string, ExploracaoCrua> = new Map(),
): EntradaInstrumentoRural {
  const partes: ParteRural[] = exploracao.partes.flatMap((p) => {
    const pessoa = p.pessoa_id ? pessoaPorId.get(p.pessoa_id) : undefined;
    if (!pessoa) return [];
    return [{
      pessoa,
      papel: p.papel as ParteRural['papel'],
      fracao: p.fracao,
      ordem: p.ordem ?? 0,
    }];
  });

  const imoveis: ImovelRural[] = exploracao.imoveis.flatMap((i) => {
    const matricula = i.matricula_id ? matriculaPorId.get(i.matricula_id) : undefined;
    if (!matricula) return [];
    return [{
      matricula,
      areaExplorada: i.area_explorada,
      areaUnidade: i.area_unidade ?? 'ha',
      ordem: i.ordem ?? 0,
      origemTipo: i.origem_tipo,
      // A chave agrupa os imóveis de MESMA origem no Considerando V. Origem
      // interna (outro instrumento do próprio cliente) e externa são duas colunas
      // exclusivas entre si, e o prefixo mantém as duas famílias separadas.
      origemChave: i.origem_externa_id
        ?? (i.origem_exploracao_rural_id ? `interna:${i.origem_exploracao_rural_id}` : null),
    }];
  });

  return {
    instrumento: {
      tipoExploracao: exploracao.tipo_exploracao,
      dataAssinatura: exploracao.data_assinatura,
      dataEncerramento: exploracao.data_encerramento,
      dataInicioVigencia: exploracao.data_inicio_vigencia,
      vigenciaProrrogavel: !!exploracao.vigencia_prorrogavel,
      percentualOutorgante: exploracao.percentual_outorgante,
      percentualExplorador: exploracao.percentual_explorador,
      culturas: exploracao.culturas,
      incluiPecuaria: !!exploracao.inclui_pecuaria,
      pecuariaModalidades: exploracao.pecuaria_modalidades ?? [],
      permitePenhor: !!exploracao.permite_penhor,
      prazoIndivisaoQuantidade: exploracao.prazo_indivisao_quantidade,
      prazoIndivisaoUnidade: exploracao.prazo_indivisao_unidade,
      indivisaoProrrogavel: exploracao.indivisao_prorrogavel,
      indivisaoAvisoQuantidade: exploracao.indivisao_aviso_quantidade,
      indivisaoAvisoUnidade: exploracao.indivisao_aviso_unidade,
      regraAdministracao: exploracao.regra_administracao,
      liquidacaoPeriodicidade: exploracao.liquidacao_periodicidade,
      liquidacaoNumeroParcelas: exploracao.liquidacao_numero_parcelas,
    },
    outorgante: exploracao.outorgante_pessoa_id
      ? pessoaPorId.get(exploracao.outorgante_pessoa_id) ?? null
      : null,
    outorganteAdministradores: exploracao.outorgante_pessoa_id
      ? administradoresPorPj.get(exploracao.outorgante_pessoa_id) ?? []
      : [],
    // O capital social é RETRATO da data da assinatura, e por isso é coluna do
    // instrumento — a mesma decisão de `outorgante_capital_social_na_assinatura`
    // na origem da posse. Somar o quadro societário de hoje imprimiria no
    // contrato de 2022 o capital de depois do aumento.
    outorganteCapitalSocial: exploracao.outorgante_capital_social_na_assinatura,
    partes,
    imoveis,
    origens: [
      // Externas: a tabela própria guarda título, data e contraparte.
      ...exploracao.origens.map((o) => ({
        chave: o.id,
        tituloInstrumento: o.titulo_instrumento,
        dataAssinatura: o.data_assinatura,
        outorgante: o.outorgante_pessoa_id ? pessoaPorId.get(o.outorgante_pessoa_id) ?? null : null,
        // Se a contraparte da origem externa É pessoa jurídica cadastrada, os
        // administradores dela entram por aqui e a qualificação sai por inteiro,
        // como na origem interna. Sem cadastro, sobra o texto de
        // `outorgante_representante`, que é o que existe.
        outorganteAdministradores: o.outorgante_pessoa_id
          ? administradoresPorPj.get(o.outorgante_pessoa_id) ?? []
          : [],
        outorganteRepresentante: o.outorgante_representante,
        capitalSocialNaAssinatura: o.outorgante_capital_social_na_assinatura,
      })),
      // Internas: a contraparte é o outorgante do instrumento apontado, e a data
      // é a dele. A chave repete o prefixo que os imóveis usam (ver `origemChave`
      // acima), senão o agrupamento do Considerando V não casa.
      ...[...new Set(
        exploracao.imoveis
          .map((i) => i.origem_exploracao_rural_id)
          .filter((id): id is string => !!id),
      )].flatMap((id) => {
        const outra = exploracaoPorId.get(id);
        if (!outra) return [];
        return [{
          chave: `interna:${id}`,
          tituloInstrumento: null,
          dataAssinatura: outra.data_assinatura,
          outorgante: outra.outorgante_pessoa_id
            ? pessoaPorId.get(outra.outorgante_pessoa_id) ?? null
            : null,
          // Os administradores da outorgante DAQUELE instrumento, pelo mesmo mapa
          // que serve ao preâmbulo deste. Ficavam de fora, e o Considerando V
          // qualificava a MMS Agro sem dizer quem assinou por ela — 95 palavras
          // onde o instrumento assinado tem 268.
          outorganteAdministradores: outra.outorgante_pessoa_id
            ? administradoresPorPj.get(outra.outorgante_pessoa_id) ?? []
            : [],
          // Texto de representante é campo de origem EXTERNA, onde a contraparte
          // não está no cadastro. Aqui ela está, e quem responde é a lista acima.
          outorganteRepresentante: null,
          capitalSocialNaAssinatura: outra.outorgante_capital_social_na_assinatura,
        }];
      }),
    ],
  };
}
