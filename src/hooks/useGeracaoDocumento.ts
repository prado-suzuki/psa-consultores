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

interface RawQuadroSocietario {
  id: string;
  quotas: number | null;
  vlr_total: number | null;
  socio: PessoaRow | null;
}

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
 * Itens das seções de lista, dada a empresa (PJ) escolhida na tela Gerar:
 * sócios e administradores, na ordem do cadastro. Para sócia PJ, busca em
 * administracao quem a representa ("neste ato representada por…").
 *
 * Empresa Proprietária (PR, via `tipoEmpresa`): o quadro societário não é
 * digitado — os sócios são DERIVADOS dos titulares das integralizações
 * aprovadas (calcularParticipacoesPR: quotas a R$ 1,00, ordem de participação
 * decrescente), com a PessoaRow completa buscada para a qualificação. Titular
 * sem pessoa vinculada também entra como sócio, com uma linha sintética
 * (id "legado:<nome>") e qualificação incompleta — decisão registrada em
 * docs/osg/plano-quadro-societario-pr.md §12.
 */
export function useListasDaEmpresa(empresaId: string | null, tipoEmpresa?: string | null) {
  const ehPR = tipoEmpresa === 'PR';

  const sociosQ = useQuery<SocioParaMapear[]>({
    queryKey: ['socios-geracao', empresaId],
    enabled: !!empresaId && !ehPR,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quadro_societario')
        // `id` (linha do quadro) acompanha p/ as notificações da tela Gerar.
        .select('id, quotas, vlr_total, socio:socio_pessoa_id (*)')
        .eq('empresa_pessoa_id', empresaId!)
        .order('created_at');
      if (error) throw error;
      const linhas = ((data ?? []) as unknown as RawQuadroSocietario[]).filter((l) => l.socio);

      // Representantes das sócias PJ: administradores delas com qualificação
      // completa ("o senhor FULANO, brasileiro, casado…"), no padrão do preâmbulo
      // real — a qualificação da sócia PJ contrai o primeiro ("representada pelo
      // senhor…") e os demais entram juntados com ", e, ".
      const idsPj = linhas.filter((l) => l.socio!.tipo_pessoa === 'PJ').map((l) => l.socio!.id);
      const representantes = new Map<string, string>();
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
          const atual = representantes.get(a.pj_pessoa_id);
          representantes.set(a.pj_pessoa_id, atual ? `${atual}, e, ${qualificado}` : qualificado);
        }
      }

      return linhas.map((l) => ({
        pessoa: l.socio!,
        quotas: l.quotas,
        vlr_total: l.vlr_total,
        representante: representantes.get(l.socio!.id) ?? null,
        quadroSocietarioId: l.id,
      }));
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

  // --- PR: sócios derivados das integralizações ------------------------------

  // Na PR, o titular legado ganha o mesmo id sintético do sócio derivado, para
  // mapearIntegralizacoes casar as alíneas dele em {{#integralizacoes}}.
  const integralizacoes = useMemo<MatriculaIntegralizacao[]>(() => {
    const base = integralizacoesQ.data ?? [];
    if (!ehPR) return base;
    return base.map((m) => ({
      ...m,
      titulares: m.titulares.map((t) =>
        t.pessoaId ? t : { ...t, pessoaId: `${PESSOA_LEGADA_PREFIX}${t.denominacao ?? '—'}` },
      ),
    }));
  }, [ehPR, integralizacoesQ.data]);

  const participacoes = useMemo(
    () => (ehPR ? calcularParticipacoesPR(integralizacoesQ.data ?? []) : []),
    [ehPR, integralizacoesQ.data],
  );
  const idsPessoas = useMemo(
    () => participacoes.map((p) => p.pessoaId).filter((id): id is string => !!id).sort(),
    [participacoes],
  );

  // PessoaRow completa dos titulares (a qualificação do preâmbulo precisa da
  // linha inteira) + representante das sócias PJ, como no fluxo manual.
  const pessoasPRQ = useQuery<{
    pessoas: Record<string, PessoaRow>;
    representantes: Record<string, string>;
  }>({
    queryKey: ['socios-geracao-pr', empresaId, idsPessoas.join(',')],
    enabled: ehPR && idsPessoas.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('pessoa').select('*').in('id', idsPessoas);
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
    },
  });

  const sociosDerivados = useMemo<SocioParaMapear[]>(() => {
    if (!ehPR) return [];
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
    }));
  }, [ehPR, participacoes, idsPessoas, pessoasPRQ.data]);

  return {
    socios: ehPR ? sociosDerivados : (sociosQ.data ?? []),
    administradores: administradoresQ.data ?? [],
    integralizacoes,
    isFetching:
      (ehPR ? pessoasPRQ.isFetching : sociosQ.isFetching) ||
      administradoresQ.isFetching ||
      integralizacoesQ.isFetching,
  };
}
