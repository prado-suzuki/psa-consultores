import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { currentAmbiente } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';
import {
  montarLinhasFaturamentoOs,
  type LinhaFaturamentoOs,
  type RawCentroCustoOs,
  type RawClienteNome,
  type RawClusterEmpresa,
  type RawContribuinteFaturamento,
  type RawOsFaturamento,
  type RawRateioOs,
} from '@/lib/admFinFaturamentoOs';

/**
 * As OS do grupo com os dados de faturamento, para o dashboard da Adm & Fin.
 *
 * SEIS SELECTS EM PARALELO E O CRUZAMENTO NO FRONT, e não um `select` aninhado:
 * o join do PostgREST por `contribuinte_id` traria o contribuinte SEM passar
 * pelo filtro de `ambiente` dele, e é a lista de clientes que recorta o ambiente
 * desta tela (`ordem_servico` não tem a coluna — ver AGENTS.md). É o mesmo
 * arranjo do `useDashboardClientesOs`.
 *
 * SEM RECORTE DE CLUSTER, como a tela de Clientes desta área: a Adm & Fin fatura
 * para o grupo inteiro, e o cluster PRADO SUZUKI não tem OS nenhuma. Quem limita
 * o que cada pessoa enxerga é a RLS das tabelas, não um filtro daqui.
 *
 * `excluido` SÓ EM `cliente` E `contribuinte`. As outras quatro não têm mais a
 * coluna: as migrations `20260910201121` e `20260910201123` a derrubaram de
 * `ordem_servico` e `distribuicao_receita`, e filtrar por ela devolve 42703
 * ("column does not exist"), não uma lista vazia. Conferido nos DOIS bancos em
 * 15/09/2026 — no `types.ts` (sandbox) e por `information_schema` em produção,
 * pelo MCP. O `docs/rls/mapa-do-banco.md` ainda lista a coluna em
 * `ordem_servico`: ele está desatualizado, e foi por ele que este arquivo quase
 * saiu com o filtro errado.
 *
 * As colunas de cada `select` foram conferidas uma a uma contra o `types.ts` em
 * 15/09/2026. A conferência é manual porque a consulta vai sem os tipos gerados
 * (ver `ConsultaCrua`, logo abaixo).
 */
interface RawBundle {
  clientes: RawClienteNome[];
  os: RawOsFaturamento[];
  contribuintes: RawContribuinteFaturamento[];
  clusters: RawClusterEmpresa[];
  rateio: RawRateioOs[];
  centrosCusto: RawCentroCustoOs[];
}

/** O que qualquer uma das seis consultas devolve, visto daqui. */
type RespostaCrua = { data: unknown; error: { message?: string } | null };

/**
 * Consulta sem os tipos gerados do Supabase, e isso é uma DÍVIDA MEDIDA, não
 * preguiça.
 *
 * O compilador do TypeScript tem um teto de instanciações por programa, e este
 * repositório já o encosta: com os tipos gerados, as consultas deste arquivo
 * falham com `TS2589` ("type instantiation is excessively deep") — e falham em
 * consultas DIFERENTES conforme a ordem em que os arquivos são checados, que é o
 * jeito desse teto se manifestar. Medido em 15/09/2026: as mesmas seis consultas
 * compilam sozinhas num arquivo de teste e não compilam aqui, com qualquer
 * arranjo (`select('*')`, uma const por consulta, helper genérico). Os erros que
 * o `bun run typecheck` ja acusava antes desta tela em `useDomainAcordoQuotistas`
 * e `useDomainOrgaoGovernanca` são o MESMO teto, degradando tipo gerado em
 * `{ error: true } & String`.
 *
 * O que se perde é a conferência do nome das colunas contra o `types.ts`. O que
 * segura no lugar: as interfaces `Raw*` são a forma exata que cada `select` pede,
 * a camada pura consome esses campos e `admFinFaturamentoOs.test.ts` quebra se um
 * deles deixar de chegar. Coluna renomeada no banco aparece como célula vazia na
 * tela, não como tela quebrada.
 *
 * Quando o teto deixar de ser encostado (menos consulta tipada no programa, ou
 * versão de TypeScript que instancie mais barato), isto volta a ser
 * `supabase.from(...)` direto, sem mudar mais nada.
 */
type ConsultaCrua = {
  select: (colunas: string) => ConsultaCrua;
  eq: (coluna: string, valor: string | boolean) => ConsultaCrua;
} & PromiseLike<RespostaCrua>;

const tabela = (nome: string): ConsultaCrua =>
  (supabase.from as unknown as (n: string) => ConsultaCrua)(nome);

/** As linhas de uma consulta, ou a falha dela dita pelo nome. */
function linhasDe<T>(res: RespostaCrua, label: string): T[] {
  if (res.error) {
    throw new Error(`Falha ao carregar ${label}: ${res.error.message ?? 'erro desconhecido'}`);
  }
  return (res.data ?? []) as T[];
}

export function useDomainFaturamentoOs() {
  const query = useQuery<RawBundle>({
    queryKey: ['adm-fin-faturamento-os', currentAmbiente],
    staleTime: 60_000,
    queryFn: async () => {
      const [cliRes, osRes, contribRes, cluRes, ratRes, ccRes] = await Promise.all([
        tabela('cliente')
          .select('id, nome')
          .eq('excluido', false)
          .eq('ambiente', currentAmbiente),
        tabela('ordem_servico')
          .select('id, numero_os, id_cliente, contribuinte_id, cluster_id, situacao, created_at, valor_projeto, numero_parcelas, valor_entrada, valor_reembolso_km, valor_reembolso_refeicao'),
        tabela('contribuinte')
          .select('id, nome_razao_social, cpf_cnpj, inscricao_estadual, telefone, cep, logradouro, complemento, numero, bairro, municipio, uf')
          .eq('excluido', false)
          .eq('ambiente', currentAmbiente),
        tabela('estrutura_clusters').select('id, name, nome_empresa'),
        tabela('distribuicao_receita').select('id_ordem_servico, id_centro_custo, percentual_rateio'),
        tabela('centros_custo').select('id, codigo, nome'),
      ]);

      return {
        clientes: linhasDe<RawClienteNome>(cliRes, 'clientes'),
        os: linhasDe<RawOsFaturamento>(osRes, 'ordens de serviço'),
        contribuintes: linhasDe<RawContribuinteFaturamento>(contribRes, 'contribuintes'),
        clusters: linhasDe<RawClusterEmpresa>(cluRes, 'empresas de faturamento'),
        rateio: linhasDe<RawRateioOs>(ratRes, 'rateio de receita'),
        centrosCusto: linhasDe<RawCentroCustoOs>(ccRes, 'centros de custo'),
      };
    },
  });

  const linhas = useMemo<LinhaFaturamentoOs[]>(
    () => (query.data ? montarLinhasFaturamentoOs(query.data) : []),
    [query.data],
  );

  return {
    linhas,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
