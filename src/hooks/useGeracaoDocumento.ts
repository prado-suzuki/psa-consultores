import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePessoasByCliente, type PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { useBensByCliente, useCartorios } from '@/hooks/useDiagnosticoPatrimonial';
import { STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO } from '@/lib/osg/statusIntegralizacao';
import type { TipoEntidade } from '@/lib/templates/vocabulario';
import { PARES } from '@/lib/templates/concordancia';
import {
  calcularParticipacoesPR,
  mapearPessoa,
  type AdministradorParaMapear,
  type AporteParaMapear,
  type CessaoParaMapear,
  type MatriculaIntegralizacao,
  type MatriculaParaMapear,
  type SocioParaMapear,
} from '@/lib/templates/mapeadores';

// Glue entre o cadastro OSG (pessoa/bem/matrícula/cartório) e o binding por entidade
// do gerador. Para cada tipo de entidade, devolve os registros do cliente como
// { id, label, row } — guardando a linha crua para o mapeador puro (mapeadores.ts).

export interface Registro<T = unknown> {
  id: string;
  label: string;
  /** Linha crua do cadastro, consumida pelo mapeador do tipo. */
  row: T;
}

// JOIN da matrícula com bem + cartório + titulares, no formato que `mapearMatricula`
// achata sob o binding do imóvel (e o cliente_id usado para filtrar por cliente).
// `tipo_bem`/`tipo_exploracao_posse` (da matrícula) classificam o imóvel para as
// condicionais rural/urbano/posse; o endereço, a área construída e a inscrição
// municipal (do bem) são o que a descrição de imóvel URBANO usa no lugar da
// denominação e do CCIR.
const MATRICULA_GERACAO_SELECT = `
  id, numero, livro, folha, municipio_imovel, uf_imovel,
  area_documento, area_unidade, vlr_contabil, confrontacoes_texto, descricao_psa_completa,
  tipo_bem, tipo_exploracao_posse,
  bem:bem_id (
    denominacao, vlr_contabil, ccir_codigo, cliente_id, tipo_bem, inscricao_municipal,
    endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro, endereco_cep,
    area_construida_m2, participa_estruturacao
  ),
  cartorio:cartorio_id ( nome_completo, comarca, uf ),
  titularidade ( integralizador, fracao, titular:titular_pessoa_id ( id, denominacao, cliente_id ) )
`;

interface RawMatriculaGeracao {
  id: string;
  numero: string | null; livro: string | null; folha: string | null;
  municipio_imovel: string | null; uf_imovel: string | null;
  area_documento: number | null; area_unidade: string | null; vlr_contabil: number | null;
  confrontacoes_texto: string | null; descricao_psa_completa: string | null;
  tipo_bem: string | null; tipo_exploracao_posse: string | null;
  bem: {
    denominacao: string | null; vlr_contabil: number | null; ccir_codigo: string | null;
    cliente_id: string | null; tipo_bem: string | null; inscricao_municipal: string | null;
    endereco_logradouro: string | null; endereco_numero: string | null;
    endereco_complemento: string | null; endereco_bairro: string | null;
    endereco_cep: string | null; area_construida_m2: number | null;
    participa_estruturacao: boolean | null;
  } | null;
  cartorio: { nome_completo: string | null; comarca: string | null; uf: string | null } | null;
  titularidade: Array<{
    integralizador: boolean | null;
    fracao: number | null;
    titular: { id: string; denominacao: string | null; cliente_id: string | null } | null;
  }> | null;
}

function useMatriculasGeracao(clienteId: string | null) {
  return useQuery<RawMatriculaGeracao[]>({
    queryKey: ['matriculas-geracao', clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matricula')
        .select(MATRICULA_GERACAO_SELECT)
        .order('numero');
      if (error) throw error;
      return (data ?? []) as unknown as RawMatriculaGeracao[];
    },
  });
}

/**
 * "Esse bem pode entrar num documento?" — o recorte da ESTRUTURAÇÃO.
 *
 * `participa_estruturacao` desligado significa que o bem foi levantado no
 * Diagnóstico Patrimonial mas está fora do desenho (com o motivo escrito em
 * `motivo_nao_integralizacao`): ele tem de aparecer na tela do Diagnóstico e não
 * pode aparecer em documento NENHUM. Antes, a fonte dos seletores da tela Gerar
 * não olhava a coluna, e o consultor podia marcar um bem excluído — o que a
 * seleção múltipla de imóveis tornou fácil de fazer sem perceber.
 *
 * Só o `false` explícito exclui: o default da coluna é participar (linha antiga
 * sem valor continua participando, como no relatório do DP) e matrícula ÓRFÃ, sem
 * bem, não tem flag para consultar — ela continua disponível, que é o caminho da
 * matrícula digitada.
 *
 * O que este predicado NÃO faz: filtrar por `status_integralizacao`. Elegibilidade
 * de status é sobre INTEGRALIZAR um bem numa PJ (ver `useIntegralizacoesAprovadas`
 * e `STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO`), e um modelo pode descrever um imóvel
 * sem integralizá-lo — a matrícula digitada urbana é exatamente isso. Filtrar por
 * status aqui esconderia do seletor a matrícula que o modelo quer descrever.
 */
function foraDaEstruturacao(bem: { participa_estruturacao?: boolean | null } | null | undefined): boolean {
  return bem?.participa_estruturacao === false;
}

/**
 * Registros do cliente por tipo de entidade, prontos para os seletores da tela
 * Gerar (um por binding). Pessoas e bens vêm filtrados pelo cliente; matrículas
 * são filtradas por bem.cliente_id ou pelo cliente de algum titular; cartórios
 * são globais (não pertencem a um cliente). Bem (e matrícula de bem) fora da
 * estruturação não entra em nenhum dos dois — ver `participaDaEstruturacao`.
 */
export function useRegistrosPorTipo(clienteId: string | null) {
  const pessoasQ = usePessoasByCliente(clienteId);
  const bensQ = useBensByCliente(clienteId);
  const matriculasQ = useMatriculasGeracao(clienteId);
  const cartoriosQ = useCartorios();

  const registros = useMemo<Record<TipoEntidade, Registro[]>>(() => {
    const pessoa: Registro[] = (pessoasQ.data ?? []).map((p) => ({
      id: p.id,
      label: p.denominacao,
      row: p,
    }));

    const bem: Registro[] = (bensQ.data ?? [])
      .filter((b) => !foraDaEstruturacao(b))
      .map((b) => ({
        id: b.id,
        label: [b.referencia_dp, b.denominacao].filter(Boolean).join(' — ') || 's/ ref',
        row: b,
      }));

    const matricula: Registro<MatriculaParaMapear>[] = (matriculasQ.data ?? [])
      .filter(
        (m) =>
          !foraDaEstruturacao(m.bem) &&
          (m.bem?.cliente_id === clienteId ||
            (m.titularidade ?? []).some((t) => t.titular?.cliente_id === clienteId)),
      )
      .map((m) => ({
        id: m.id,
        label: `${m.numero ?? 's/ nº'}${m.bem?.denominacao ? ` — ${m.bem.denominacao}` : ''}`,
        row: {
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
        },
      }));

    const cartorio: Registro[] = (cartoriosQ.data ?? []).map((c) => ({
      id: c.id,
      label: [c.nome_completo, [c.comarca, c.uf].filter(Boolean).join('/')].filter(Boolean).join(' — '),
      row: c,
    }));

    // Sociedade (objeto do contrato) é uma pessoa PJ; na tela Gerar ela é dirigida
    // pelo seletor único de Empresa, não por um seletor próprio — mas o catálogo de
    // registros segue exaustivo por TipoEntidade.
    const sociedade: Registro[] = pessoa.filter((r) => (r.row as PessoaRow).tipo_pessoa === 'PJ');

    // `vertice` nunca tem registro/seletor (é só item de lista do georref); entra
    // vazio para satisfazer o Record<TipoEntidade, …>.
    return { pessoa, sociedade, bem, matricula, cartorio, vertice: [] };
  }, [pessoasQ.data, bensQ.data, matriculasQ.data, cartoriosQ.data, clienteId]);

  return {
    registros,
    isFetching:
      pessoasQ.isFetching || bensQ.isFetching || matriculasQ.isFetching || cartoriosQ.isFetching,
  };
}

// --- Listas relacionais da empresa (bindings de cardinalidade 'lista') --------

interface RawAdministracao {
  id: string;
  cargo: string | null;
  administrador: PessoaRow | null;
}

/**
 * Matrículas dos bens ELEGÍVEIS para integralização na empresa (PJ destino),
 * sem impedimento ativo — fonte única do gerador (seção {{#integralizacoes}})
 * E da visão derivada do Quadro Societário (empresa PR).
 *
 * "Elegível" não é literal daqui: o conjunto de status vive em
 * `@/lib/osg/statusIntegralizacao`, o mesmo que a tela do Diagnóstico
 * Patrimonial usa para avisar o consultor. Mudar o conjunto lá muda esta query,
 * o painel de conferência e qualquer relatório que use o conceito.
 */
export function useIntegralizacoesAprovadas(empresaId: string | null) {
  return useQuery<MatriculaIntegralizacao[]>({
    // Key compartilhada com a tela Gerar — não renomear (cache único).
    queryKey: ['integralizacoes-geracao', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bem')
        .select(`
          id, denominacao, vlr_contabil, ccir_codigo, tipo_bem, inscricao_municipal,
          endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro, endereco_cep,
          area_construida_m2,
          matricula (
            id, numero, livro, folha, municipio_imovel, uf_imovel,
            area_documento, area_unidade, vlr_contabil, confrontacoes_texto, descricao_psa_completa,
            tipo_bem, tipo_exploracao_posse,
            cartorio:cartorio_id ( nome_completo, comarca, uf ),
            titularidade ( id, integralizador, fracao, titular:titular_pessoa_id ( id, denominacao, tipo_pessoa, cpf_cnpj ) ),
            impedimento ( id, cancelado )
          )
        `)
        .eq('empresa_destino_pessoa_id', empresaId!)
        // Fora da estruturação, fora de todo documento — a mesma regra dos
        // seletores (ver `foraDaEstruturacao`). Um bem marcado como "não
        // participa" que tivesse ficado com status elegível entraria no contrato
        // pelas alíneas de integralização sem passar por escolha nenhuma.
        .eq('participa_estruturacao', true)
        .in('status_integralizacao', [...STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO]);
      if (error) throw error;

      const bens = (data ?? []) as unknown as Array<{
        id: string; denominacao: string | null; vlr_contabil: number | null; ccir_codigo: string | null;
        tipo_bem: string | null; inscricao_municipal: string | null;
        endereco_logradouro: string | null; endereco_numero: string | null;
        endereco_complemento: string | null; endereco_bairro: string | null;
        endereco_cep: string | null; area_construida_m2: number | null;
        matricula: Array<{
          id: string; numero: string | null; livro: string | null; folha: string | null;
          municipio_imovel: string | null; uf_imovel: string | null;
          area_documento: number | null; area_unidade: string | null; vlr_contabil: number | null;
          confrontacoes_texto: string | null; descricao_psa_completa: string | null;
          tipo_bem: string | null; tipo_exploracao_posse: string | null;
          cartorio: { nome_completo: string | null; comarca: string | null; uf: string | null } | null;
          titularidade: Array<{
            id: string;
            integralizador: boolean | null; fracao: number | null;
            titular: { id: string; denominacao: string | null; tipo_pessoa: string | null; cpf_cnpj: string | null } | null;
          }> | null;
          impedimento: Array<{ id: string; cancelado: boolean | null }> | null;
        }> | null;
      }>;

      const matriculas: MatriculaIntegralizacao[] = [];
      for (const b of bens) {
        for (const m of b.matricula ?? []) {
          // Impedimento ativo (não cancelado) trava a integralização do imóvel.
          if ((m.impedimento ?? []).some((i) => !i.cancelado)) continue;
          matriculas.push({
            id: m.id,
            // O bem a que a matrícula pertence: vira `bem_id` do aporte quando a
            // tela do Quadro Societário grava a proposta da PR.
            bemId: b.id,
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
            bem: {
              denominacao: b.denominacao,
              vlr_contabil: b.vlr_contabil,
              ccir_codigo: b.ccir_codigo,
              tipo_bem: b.tipo_bem,
              inscricao_municipal: b.inscricao_municipal,
              endereco_logradouro: b.endereco_logradouro,
              endereco_numero: b.endereco_numero,
              endereco_complemento: b.endereco_complemento,
              endereco_bairro: b.endereco_bairro,
              endereco_cep: b.endereco_cep,
              area_construida_m2: b.area_construida_m2,
            },
            cartorio: m.cartorio,
            // Ids das titularidades desta matrícula — metadado p/ notificações.
            titularidadeIds: (m.titularidade ?? []).map((t) => t.id),
            titulares: (m.titularidade ?? []).map((t) => ({
              pessoaId: t.titular?.id ?? null,
              denominacao: t.titular?.denominacao ?? null,
              tipoPessoa: t.titular?.tipo_pessoa ?? null,
              cpfCnpj: t.titular?.cpf_cnpj ?? null,
              integralizador: !!t.integralizador,
              fracao: t.fracao ?? null,
            })),
          });
        }
      }
      // Ordem estável das alíneas: pelo número da matrícula.
      return matriculas.sort((a, z) => (a.numero ?? '').localeCompare(z.numero ?? '', 'pt-BR', { numeric: true }));
    },
  });
}

/** Prefixo do id sintético do sócio derivado sem pessoa cadastrada (titular legado). */
export const PESSOA_LEGADA_PREFIX = 'legado:';

/**
 * PessoaRow completa dos sócios (a qualificação do preâmbulo precisa da linha
 * inteira) + o representante de cada sócia PJ.
 *
 * Representante: administradores dela com qualificação completa ("o senhor
 * FULANO, brasileiro, casado…"), no padrão do preâmbulo real: a qualificação da
 * sócia PJ contrai o primeiro ("representada pelo senhor…") e os demais entram
 * juntados com ", e, ".
 *
 * Existe separado porque o quadro chega de duas formas (gravado na view,
 * derivado dos bens na PR ainda sem movimentação) e as duas precisam do mesmo
 * par de leituras, e duplicá-lo faria a qualificação de um lado divergir do outro.
 */
async function lerPessoasERepresentantes(ids: string[]): Promise<{
  pessoas: Record<string, PessoaRow>;
  representantes: Record<string, string>;
}> {
  const { data, error } = await supabase.from('pessoa').select('*').in('id', ids);
  if (error) throw error;
  const pessoas: Record<string, PessoaRow> = {};
  for (const p of (data ?? []) as PessoaRow[]) pessoas[p.id] = p;

  const idsPj = Object.values(pessoas).filter((p) => p.tipo_pessoa === 'PJ').map((p) => p.id);
  const representantes: Record<string, string> = {};
  if (idsPj.length > 0) {
    const { data: adms, error: errAdms } = await supabase
      .from('administracao')
      .select('pj_pessoa_id, administrador:administrador_pessoa_id (*)')
      .in('pj_pessoa_id', idsPj)
      .order('created_at');
    if (errAdms) throw errAdms;
    for (const a of (adms ?? []) as unknown as Array<{
      pj_pessoa_id: string;
      administrador: PessoaRow | null;
    }>) {
      if (!a.administrador?.denominacao) continue;
      const qualificado =
        `${PARES.senhor(a.administrador.genero as 'M' | 'F' | null)} ` +
        mapearPessoa(a.administrador).qualificacao;
      const atual = representantes[a.pj_pessoa_id];
      representantes[a.pj_pessoa_id] = atual ? `${atual}, e, ${qualificado}` : qualificado;
    }
  }
  return { pessoas, representantes };
}

/**
 * Itens das seções de lista, dada a empresa (PJ) escolhida na tela Gerar:
 * sócios e administradores. Para sócia PJ, busca em administracao quem a
 * representa ("neste ato representada por…").
 *
 * **O quadro societário tem uma fonte só**, igual para a Proprietária (PR) e
 * para a Controladora (CN): `v_quadro_societario`, o acumulado dos movimentos de
 * quota da empresa. A ordem dos sócios no preâmbulo é `ordem`, o `created_at` do
 * PRIMEIRO movimento de cada um, o equivalente à ordem de digitação que o
 * quadro digitado tinha.
 *
 * Antes daqui havia DUAS fontes e nenhuma servia aos dois casos: a PR derivava
 * os sócios dos titulares das matrículas no render, a CN lia a tabela
 * `quadro_societario`. A derivação responde "quem entrou com o quê", não "quem
 * tem quantas quotas hoje": as duas coisas coincidem na constituição e divergem
 * na primeira cessão.
 *
 * **A derivação sobrevive como FALLBACK da PR**, e só enquanto a empresa não tem
 * movimentação nenhuma: é o mesmo critério da tela do Quadro Societário
 * (`gravado = quadro.length > 0`), para tela e gerador nunca discordarem. Sem
 * ele, toda PR que ainda não gravou o quadro de constituição perderia os sócios
 * do documento na troca de fonte. Titular sem pessoa vinculada entra como sócio
 * com uma linha sintética (id "legado:<nome>") e qualificação incompleta,
 * decisão registrada em docs/osg/plano-quadro-societario-pr.md §12.
 */
/**
 * Os APORTES do livro de movimentos desta empresa, com a forma de pagamento de
 * cada um, prontos para as alíneas de {{#integralizacoes}}.
 *
 * Só os PENDENTES: movimento com `documento_gerado_id` já foi formalizado por
 * uma peça, e repeti-lo faria a alteração seguinte integralizar duas vezes o
 * mesmo bem. É a mesma regra que decide os eventos do assistente.
 *
 * O aporte pago com quotas de outra sociedade traz a PJ de origem QUALIFICADA
 * por inteiro (CNPJ, NIRE, sede) mais quem a representa, porque é isso que a
 * cláusula publica: "as quotas que possuía na sociedade X, inscrita no CNPJ…,
 * com sede em…, neste ato representada por…".
 */
export function useAportesDoLivro(empresaId: string | null) {
  return useQuery<AporteParaMapear[]>({
    queryKey: ['aportes-do-livro', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimentacao_quotas')
        .select('id, destino_pessoa_id, quotas, vlr_capital_arredondado, created_at, sequencia, bem_id, pago_com_empresa_pessoa_id, pago_com_quotas, pago_com_valor')
        .eq('empresa_pessoa_id', empresaId!)
        .eq('tipo', 'aporte')
        .is('documento_gerado_id', null)
        .order('created_at')
        .order('sequencia', { nullsFirst: true });
      if (error) throw error;

      const linhas = (data ?? []).filter((l) => l.destino_pessoa_id);
      const idsOrigem = [
        ...new Set(linhas.map((l) => l.pago_com_empresa_pessoa_id).filter((id): id is string => !!id)),
      ];
      const { pessoas, representantes } =
        idsOrigem.length > 0
          ? await lerPessoasERepresentantes(idsOrigem)
          : { pessoas: {} as Record<string, PessoaRow>, representantes: {} as Record<string, string> };

      return linhas.map((l): AporteParaMapear => {
        const origemId = l.pago_com_empresa_pessoa_id;
        const pessoaOrigem = origemId ? pessoas[origemId] : undefined;
        return {
          id: l.id,
          pessoaId: l.destino_pessoa_id!,
          quotas: Number(l.quotas ?? 0),
          valor: Number(l.vlr_capital_arredondado ?? 0),
          forma: origemId ? 'quotas' : l.bem_id ? 'bem' : 'moeda',
          bemId: l.bem_id,
          origem:
            origemId && pessoaOrigem
              ? {
                  pessoa: pessoaOrigem,
                  administradores: representantes[origemId] ?? null,
                  quotas: Number(l.pago_com_quotas ?? 0),
                  valor: Number(l.pago_com_valor ?? 0),
                }
              : null,
        };
      });
    },
  });
}

/**
 * As CESSÕES (e doações) do livro desta empresa que ainda não foram
 * formalizadas, com as duas pontas qualificadas.
 *
 * É o que faltava para a resolução de cessão nomear o ato em vez de só publicar
 * o quadro resultante. Movimento já formalizado fica de fora pela mesma razão
 * dos aportes: repeti-lo faria a peça seguinte narrar de novo o que já foi
 * registrado.
 */
export function useCessoesDoLivro(empresaId: string | null) {
  return useQuery<CessaoParaMapear[]>({
    queryKey: ['cessoes-do-livro', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimentacao_quotas')
        .select('id, tipo, origem_pessoa_id, destino_pessoa_id, quotas, vlr_capital_arredondado, created_at, sequencia')
        .eq('empresa_pessoa_id', empresaId!)
        .in('tipo', ['cessao', 'doacao'])
        .is('documento_gerado_id', null)
        .order('created_at')
        .order('sequencia', { nullsFirst: true });
      if (error) throw error;

      const linhas = (data ?? []).filter((l) => l.origem_pessoa_id && l.destino_pessoa_id);
      if (linhas.length === 0) return [];

      const ids = [
        ...new Set(linhas.flatMap((l) => [l.origem_pessoa_id!, l.destino_pessoa_id!])),
      ];
      const { pessoas, representantes } = await lerPessoasERepresentantes(ids);

      return linhas.flatMap((l): CessaoParaMapear[] => {
        const cedente = pessoas[l.origem_pessoa_id!];
        const cessionario = pessoas[l.destino_pessoa_id!];
        // Ponta que a RLS não devolve fica de fora: meia cessão descreveria um
        // ato que não aconteceu.
        if (!cedente || !cessionario) return [];
        return [{
          id: l.id,
          cedente,
          cessionario,
          quotas: Number(l.quotas ?? 0),
          valor: Number(l.vlr_capital_arredondado ?? 0),
          doacao: l.tipo === 'doacao',
          representanteCedente: representantes[cedente.id] ?? null,
          representanteCessionario: representantes[cessionario.id] ?? null,
        }];
      });
    },
  });
}

export function useListasDaEmpresa(empresaId: string | null, tipoEmpresa?: string | null) {
  const ehPR = tipoEmpresa === 'PR';

  // O quadro GRAVADO. Duas leituras e não um embed: o PostgREST só infere
  // relacionamento de view quando a coluna vem direto da tabela base, e
  // `pessoa_id` aqui nasce de um `union all` com `group by`, então `socio:pessoa_id
  // (*)` não existe em v_quadro_societario.
  const quadroQ = useQuery<SocioParaMapear[]>({
    queryKey: ['socios-geracao', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_quadro_societario')
        // `movimento_ids` são as linhas que compõem o saldo: metadado p/ as
        // notificações de variável alterada da tela Gerar.
        .select('pessoa_id, quotas, vlr_total, movimento_ids')
        .eq('empresa_pessoa_id', empresaId!)
        .order('ordem');
      if (error) throw error;

      const linhas = (data ?? []).filter((l) => l.pessoa_id);
      if (linhas.length === 0) return [];

      const { pessoas, representantes } = await lerPessoasERepresentantes(
        linhas.map((l) => l.pessoa_id!),
      );
      return linhas.flatMap((l) => {
        const pessoa = pessoas[l.pessoa_id!];
        // Sócio cuja pessoa a RLS não devolve fica fora, como ficava o embed nulo.
        if (!pessoa) return [];
        return [{
          pessoa,
          quotas: l.quotas,
          vlr_total: l.vlr_total,
          representante: representantes[pessoa.id] ?? null,
          movimentoIds: l.movimento_ids ?? [],
        }];
      });
    },
  });

  const administradoresQ = useQuery<AdministradorParaMapear[]>({
    queryKey: ['administradores-geracao', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('administracao')
        // `id` (linha de administração) acompanha p/ as notificações da tela Gerar.
        .select('id, cargo, administrador:administrador_pessoa_id (*)')
        .eq('pj_pessoa_id', empresaId!)
        .order('created_at');
      if (error) throw error;
      return ((data ?? []) as unknown as RawAdministracao[])
        .filter((l) => l.administrador)
        .map((l) => ({ pessoa: l.administrador!, cargo: l.cargo, administracaoId: l.id }));
    },
  });

  // Matrículas dos bens ELEGÍVEIS para integralização nesta empresa, sem
  // impedimento ativo — a matéria-prima da seção {{#integralizacoes}}.
  const integralizacoesQ = useIntegralizacoesAprovadas(empresaId);

  // Os APORTES do livro de movimentos: é o que permite às alíneas de
  // integralização misturarem as três formas (imóvel, moeda corrente, quotas de
  // outra sociedade). A matrícula só sabe descrever a primeira.
  const aportesQ = useAportesDoLivro(empresaId);

  // As CESSÕES pendentes: a resolução de cessão nomeia as duas pontas e a
  // quantidade, e não só o quadro que sobra depois.
  const cessoesQ = useCessoesDoLivro(empresaId);

  // --- PR sem movimentação: sócios derivados das integralizações -------------

  /** A empresa tem quadro gravado: o saldo dos movimentos de quota existe. */
  const quadroGravado = (quadroQ.data?.length ?? 0) > 0;
  /**
   * Cai no quadro derivado: só a PR, e só depois de o quadro ter voltado VAZIO
   * (`data` definido). Enquanto a view carrega não se deriva nada, senão a
   * prévia renderizaria o quadro derivado e o trocaria pelo gravado em seguida.
   */
  const derivarPR = ehPR && quadroQ.data != null && quadroQ.data.length === 0;

  // No quadro derivado, o titular legado ganha o mesmo id sintético do sócio
  // derivado, para mapearIntegralizacoes casar as alíneas dele em
  // {{#integralizacoes}}. Com quadro gravado não existe sócio legado (a gravação
  // é bloqueada enquanto houver titular sem pessoa), e o titular sem pessoa
  // passa a ser tratado como na CN: aparece na descrição, não lidera alínea.
  const integralizacoes = useMemo<MatriculaIntegralizacao[]>(() => {
    const base = integralizacoesQ.data ?? [];
    if (!derivarPR) return base;
    return base.map((m) => ({
      ...m,
      titulares: m.titulares.map((t) =>
        t.pessoaId ? t : { ...t, pessoaId: `${PESSOA_LEGADA_PREFIX}${t.denominacao ?? '—'}` },
      ),
    }));
  }, [derivarPR, integralizacoesQ.data]);

  const participacoes = useMemo(
    () => (derivarPR ? calcularParticipacoesPR(integralizacoesQ.data ?? []) : []),
    [derivarPR, integralizacoesQ.data],
  );
  const idsPessoas = useMemo(
    () => participacoes.map((p) => p.pessoaId).filter((id): id is string => !!id).sort(),
    [participacoes],
  );

  const pessoasPRQ = useQuery({
    queryKey: ['socios-geracao-pr', empresaId, idsPessoas.join(',')],
    enabled: derivarPR && idsPessoas.length > 0,
    queryFn: () => lerPessoasERepresentantes(idsPessoas),
  });

  const sociosDerivados = useMemo<SocioParaMapear[]>(() => {
    if (!derivarPR) return [];
    // Espera as PessoaRow chegarem para não renderizar a prévia com a
    // qualificação em branco e repreencher em seguida.
    if (idsPessoas.length > 0 && !pessoasPRQ.data) return [];
    const pessoas = pessoasPRQ.data?.pessoas ?? {};
    const representantes = pessoasPRQ.data?.representantes ?? {};
    return participacoes.map((p) => ({
      pessoa:
        (p.pessoaId ? pessoas[p.pessoaId] : undefined) ??
        ({
          id: p.pessoaId ?? `${PESSOA_LEGADA_PREFIX}${p.denominacao}`,
          denominacao: p.denominacao,
          tipo_pessoa: p.tipoPessoa,
          cpf_cnpj: p.cpfCnpj,
        } as unknown as PessoaRow),
      quotas: p.quotas,
      vlr_total: p.valor,
      representante: p.pessoaId ? (representantes[p.pessoaId] ?? null) : null,
      // Sócio derivado não tem movimento: não existe linha no livro de quotas
      // para a notificação de variável alterada apontar.
      movimentoIds: null,
    }));
  }, [derivarPR, participacoes, idsPessoas, pessoasPRQ.data]);

  return {
    socios: derivarPR ? sociosDerivados : (quadroQ.data ?? []),
    administradores: administradoresQ.data ?? [],
    integralizacoes,
    aportes: aportesQ.data ?? [],
    cessoes: cessoesQ.data ?? [],
    /**
     * O capital da PR sai das integralizações enquanto o quadro é derivado, e do
     * próprio quadro depois de gravado. Senão a identidade Σ quotas dos sócios
     * === totalQuotas quebra na primeira divergência entre bem e quota.
     */
    quadroGravado,
    isFetching:
      quadroQ.isFetching ||
      // A janela entre "a view voltou vazia" e "as pessoas do derivado
      // chegaram": sem ela a prévia pisca sem sócio nenhum.
      (derivarPR && idsPessoas.length > 0 && !pessoasPRQ.data) ||
      pessoasPRQ.isFetching ||
      administradoresQ.isFetching ||
      integralizacoesQ.isFetching ||
      aportesQ.isFetching ||
      cessoesQ.isFetching,
  };
}
