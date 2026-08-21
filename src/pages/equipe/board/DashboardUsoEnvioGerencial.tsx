import { useCallback, useEffect, useMemo } from 'react';
import { AlertCircle, BarChart3, FlaskConical, RefreshCw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import {
  ALTURA_GRAFICO,
  ALTURA_LISTA,
  COL_APOIO,
  COL_PRINCIPAL,
  GRADE_TOPO,
} from '@/components/equipe/dev/dashboard-uso-envio/layout';
import {
  BotaoExpandir,
  Th,
  TermoColorido,
  FaixaResumo,
  Painel,
  Tabela,
  Td,
  Tr,
} from '@/components/equipe/dev/dashboard-uso-envio/primitivos';
import {
  AXIS_STYLE,
  GRAY,
  GRID_STYLE,
  LIME,
  TEAL,
  TOOLTIP_STYLE,
  mesLabel,
  useSort,
  num,
  numCurto,
  pct,
  useTopN,
} from '@/components/equipe/dev/dashboard-uso-envio/formatadores';
import { OPCOES_PERIODO, resolverIntervaloPeriodo } from '@/lib/analytics-uso/periodo';
import {
  TOOLTIP_COLUNA,
  TOOLTIP_GERENCIAL,
} from '@/components/equipe/dev/dashboard-uso-envio/tooltips';
import { Button } from '@/components/ui/button';
import { GerencialFiltros } from '@/components/equipe/board/dashboard-uso-envio/GerencialFiltros';
import {
  useAnalyticsCatalogo,
  useAnalyticsGerencial,
  USANDO_FIXTURES,
} from '@/hooks/useAnalyticsUso';
import { useAuth } from '@/contexts/AuthContext';
import { usePageAccess } from '@/hooks/usePageAccess';
import { useUserEstrutura } from '@/hooks/useUserEstrutura';
import { rotuloCluster } from '@/lib/analytics-uso/metricas';
import type { AnalyticsUsoFiltros } from '@/lib/analytics-uso/types';
import { prepararGerencialViewModel } from '@/lib/analytics-uso/viewModels';

const TODOS = 'todos';
const periodoValido = (valor: string | null) =>
  OPCOES_PERIODO.some((opcao) => opcao.id === valor) ? valor! : 'tudo';

const DashboardUsoEnvioGerencial = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const estrutura = useUserEstrutura();
  // A visão técnica vive na página de Dashboards do Estratégico e herda o
  // gate dela, o mesmo do painel da equipe.
  const acessoTecnico = usePageAccess('/equipe/dashboard');
  const clusterSelecionado = searchParams.get('cluster') || TODOS;
  const usuarioSelecionado = searchParams.get('usuario') || TODOS;
  const periodoSelecionado = periodoValido(searchParams.get('periodo'));
  const atualizarUrl = useCallback(
    (alteracoes: Record<string, string | undefined>, options?: { replace?: boolean }) => {
      const proximos = new URLSearchParams(searchParams);
      for (const [chave, valor] of Object.entries(alteracoes)) {
        if (valor && valor !== TODOS && valor !== 'tudo') proximos.set(chave, valor);
        else proximos.delete(chave);
      }
      setSearchParams(proximos, options);
    },
    [searchParams, setSearchParams],
  );
  const intervalo = useMemo(
    () => resolverIntervaloPeriodo(periodoSelecionado),
    [periodoSelecionado],
  );
  const filtros = useMemo<AnalyticsUsoFiltros>(
    () => ({
      inicio: intervalo.inicio,
      fim: intervalo.fim,
      usuario: usuarioSelecionado === TODOS ? undefined : usuarioSelecionado,
      clusterId: clusterSelecionado === TODOS ? undefined : clusterSelecionado,
    }),
    [clusterSelecionado, intervalo.fim, intervalo.inicio, usuarioSelecionado],
  );

  const catalogo = useAnalyticsCatalogo();
  const clustersDisponiveis = useMemo(
    () =>
      isAdmin ? (catalogo.data?.clusters ?? []) : estrutura.clusters.map((cluster) => cluster.id),
    [catalogo.data?.clusters, estrutura.clusters, isAdmin],
  );

  useEffect(() => {
    if (isAdmin || estrutura.isLoading || clustersDisponiveis.length === 0) return;
    if (!clustersDisponiveis.includes(clusterSelecionado)) {
      atualizarUrl({ cluster: clustersDisponiveis[0], usuario: undefined }, { replace: true });
    }
  }, [atualizarUrl, clusterSelecionado, clustersDisponiveis, estrutura.isLoading, isAdmin]);

  const escopoPronto =
    isAdmin ||
    (!estrutura.isLoading &&
      clusterSelecionado !== TODOS &&
      clustersDisponiveis.includes(clusterSelecionado));
  const gerencial = useAnalyticsGerencial(filtros, { enabled: escopoPronto });
  const clusterId = clusterSelecionado === TODOS ? undefined : clusterSelecionado;
  const viewModel = useMemo(() => prepararGerencialViewModel(gerencial.data), [gerencial.data]);
  const { totais, apiMes, mesReferenciaParcial, atividadePessoas, pessoas, ferramentas } =
    viewModel;
  const tabelaPessoas = useSort(atividadePessoas, 'chamadas');
  const pessoasVisiveis = useTopN(tabelaPessoas.sorted, 20);
  const carregando = !escopoPronto || gerencial.isLoading;
  const erro = gerencial.error ?? catalogo.error;
  const catalogoFerramentas =
    catalogo.data?.ferramentas.length ?? gerencial.data?.porFerramenta.length;

  // Nomear os dois meses: "voltaram no mes seguinte" nao dizia que a queda de
  // 80% para 50% veio de o mes de referencia ter virado agosto parcial.
  const mesAnteriorRotulo =
    viewModel.serie.length >= 2 ? mesLabel(viewModel.serie[viewModel.serie.length - 2].mes) : null;

  const serie = useMemo(
    () =>
      viewModel.serie.map((item) => ({
        ...item,
        label: mesLabel(item.mes),
        taxaRetencaoPct: item.taxaRetencao == null ? null : item.taxaRetencao * 100,
      })),
    [viewModel.serie],
  );
  const atualizadoEmMs = gerencial.dataUpdatedAt;
  const atualizadoEm =
    atualizadoEmMs > 0
      ? new Date(atualizadoEmMs).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';
  const serieArquivos = useMemo(
    () =>
      viewModel.serie.map((item) => ({
        ...item,
        label: mesLabel(item.mes),
        enviadosHumanos: item.arquivosEnviadosHumanos,
      })),
    [viewModel.serie],
  );
  const temFiltro = usuarioSelecionado !== TODOS || (isAdmin && clusterSelecionado !== TODOS);
  const atualizando = gerencial.isFetching;

  return (
    <BoardLayout title="Ferramentas" subtitle="Adoção, engajamento e retenção">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="text-[22px] font-semibold tracking-[-0.01em]"
              style={{ color: 'var(--board-t1)' }}
            >
              Ferramentas
            </h1>
            <p className="mt-0.5 text-[13px]" style={{ color: 'var(--board-t3)' }}>
              Adoção, engajamento e retenção das ferramentas internas.
            </p>
          </div>
          {!acessoTecnico.isLoading && acessoTecnico.hasAccess && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate('/equipe/dashboards?painel=controle-uso-envio')}
            >
              <BarChart3 className="h-4 w-4" />
              Visão técnica
            </Button>
          )}
        </div>
        <GerencialFiltros
          periodo={{
            value: periodoSelecionado,
            onChange: (valor) => atualizarUrl({ periodo: valor }),
          }}
          cluster={{
            value: clusterSelecionado,
            mostrar: isAdmin || clustersDisponiveis.length > 1,
            permitirTodos: isAdmin,
            opcoes: clustersDisponiveis,
            onChange: (valor) => atualizarUrl({ cluster: valor, usuario: undefined }),
          }}
          pessoa={{
            value: usuarioSelecionado,
            opcoes: pessoas,
            onChange: (valor) => atualizarUrl({ usuario: valor }),
          }}
          atualizando={atualizando}
          temFiltro={temFiltro}
          atualizadoEm={atualizadoEm}
          podeAtualizar={escopoPronto}
          onLimpar={() =>
            atualizarUrl({
              cluster: isAdmin ? undefined : clustersDisponiveis[0],
              usuario: undefined,
            })
          }
          onAtualizar={() => {
            void gerencial.refetch();
          }}
        />

        {erro && (
          <div
            className="flex items-start gap-3 rounded-xl border-l-[3px] border-rose-700 bg-rose-50 px-4 py-3 text-sm text-rose-900"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
            <span className="flex-1">{erro.message}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-rose-800 hover:bg-rose-100"
              onClick={() => {
                if (catalogo.error) void catalogo.refetch();
                if (gerencial.error) void gerencial.refetch();
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Tentar novamente
            </Button>
          </div>
        )}

        <p className="text-xs text-slate-500">
          Escopo:{' '}
          <strong className="text-slate-700">
            {clusterId ? rotuloCluster(clusterId) : 'consolidado, todas as unidades'}
          </strong>
        </p>

        <FaixaResumo
          carregando={carregando}
          colunas={4}
          itens={[
            {
              label: 'Pessoas usando',
              valor: gerencial.data ? num(totais?.pessoasAtivas) : '—',
              variacao: gerencial.data
                ? {
                    valor: num(totais?.usuariosNovos),
                    rotulo: 'no primeiro uso observado dentro do período',
                  }
                : undefined,
              tooltip: TOOLTIP_GERENCIAL.usuariosAtivos,
            },
            {
              label: 'Uso recorrente',
              valor: pct(apiMes?.taxaRetencao),
              variacao: apiMes
                ? {
                    valor: `${num(apiMes.usuariosRetidos)} de ${num(apiMes.usuariosBaseRetencao)}`,
                    rotulo: mesAnteriorRotulo
                      ? `de ${mesAnteriorRotulo} voltaram em ${mesLabel(apiMes.mes)}${
                          mesReferenciaParcial ? ' (em curso)' : ''
                        }`
                      : 'voltaram no mês seguinte',
                  }
                : undefined,
              tooltip: TOOLTIP_GERENCIAL.retencao,
              tom: (apiMes?.taxaRetencao ?? 0) >= 0.8 ? 'positivo' : 'alerta',
            },
            {
              // Acao = qualquer coisa que a pessoa fez na plataforma. O gestor
              // decide com o total; o tipo (consulta, download, envio) e detalhe
              // tecnico e vive na outra visao.
              label: 'Ações por pessoa',
              valor: gerencial.data ? num(totais?.acoesPorPessoa, 1) : '—',
              variacao: gerencial.data
                ? {
                    valor: num(totais?.totalAcoes),
                    rotulo: 'ações no período',
                  }
                : undefined,
              tooltip: TOOLTIP_GERENCIAL.engajamento,
            },
            {
              label: 'Ferramentas utilizadas',
              valor: gerencial.data ? num(totais?.ferramentasUtilizadas) : '—',
              variacao: gerencial.data
                ? {
                    valor: num(catalogoFerramentas),
                    rotulo: 'disponíveis no catálogo',
                  }
                : undefined,
              tooltip: TOOLTIP_GERENCIAL.ferramentasAtivas,
            },
          ]}
        />

        <div className={GRADE_TOPO}>
          <Painel
            titulo="Pessoas ativas e novas por mês"
            descricao={
              <>
                <TermoColorido cor={TEAL[600]}>Ativas</TermoColorido> e{' '}
                <TermoColorido cor={LIME[500]}>novas no mês</TermoColorido>.
              </>
            }
            tooltip={TOOLTIP_GERENCIAL.evolucao}
            altura={ALTURA_GRAFICO}
            carregando={carregando}
            vazio={serie.length === 0}
            className={COL_PRINCIPAL}
          >
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <ComposedChart
                accessibilityLayer
                data={serie}
                margin={{ top: 6, right: 4, left: 0, bottom: 6 }}
              >
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="label" {...AXIS_STYLE} tickMargin={8} />
                <YAxis {...AXIS_STYLE} padding={{ top: 10 }} allowDecimals={false} width={48} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(valor: number, nome: string) => [num(valor), nome]}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="usuariosAtivos"
                  name="ativos"
                  fill={TEAL[600]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="usuariosNovos"
                  name="novos"
                  fill={LIME[500]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={26}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Painel>

          <Painel
            titulo="As 5 ferramentas com mais pessoas usando"
            descricao={`Pessoas distintas com ao menos um uso no período, entre ${num(totais?.ferramentasUtilizadas)} ferramentas com uso.`}
            tooltip={TOOLTIP_GERENCIAL.pessoasPorFerramenta}
            altura={ALTURA_GRAFICO}
            carregando={carregando}
            vazio={ferramentas.length === 0}
            className={COL_APOIO}
          >
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <BarChart
                accessibilityLayer
                data={ferramentas}
                layout="vertical"
                margin={{ top: 8, right: 48, left: 4, bottom: 8 }}
              >
                <CartesianGrid {...GRID_STYLE} horizontal={false} vertical />
                <XAxis type="number" {...AXIS_STYLE} />
                <YAxis
                  type="category"
                  dataKey="ferramenta"
                  width={150}
                  {...AXIS_STYLE}
                  tick={{ ...AXIS_STYLE.tick, fontSize: 10 }}
                />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(v: number) => [`${num(v)} ${v === 1 ? 'pessoa' : 'pessoas'}`, '']}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="usuariosAtivos"
                  fill={TEAL[600]}
                  radius={[0, 3, 3, 0]}
                  maxBarSize={18}
                >
                  <LabelList
                    dataKey="usuariosAtivos"
                    position="right"
                    formatter={(v: number) => num(v)}
                    style={{
                      fontSize: 11,
                      fill: GRAY[600],
                      fontFamily: "'Work Sans', sans-serif",
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Painel>
        </div>

        <div className={GRADE_TOPO}>
          <Painel
            titulo="Uso das ferramentas por pessoa"
            descricao="Detalhe da própria equipe; clique em uma pessoa para filtrar todo o relatório."
            tooltip={TOOLTIP_GERENCIAL.atividadeEquipe}
            carregando={carregando}
            className={COL_PRINCIPAL}
          >
            <>
              <Tabela altura={ALTURA_LISTA} caption="Uso das ferramentas por pessoa">
                <thead>
                  <tr>
                    <Th campo="usuario" estado={tabelaPessoas} tooltip={TOOLTIP_COLUNA.pessoa}>
                      Pessoa
                    </Th>
                    <Th
                      campo="ferramentasUsadas"
                      estado={tabelaPessoas}
                      alinhar="right"
                      tooltip={TOOLTIP_COLUNA.ferramentasDistintas}
                    >
                      Ferramentas
                    </Th>
                    <Th
                      campo="diasAtivos"
                      estado={tabelaPessoas}
                      alinhar="right"
                      tooltip={TOOLTIP_COLUNA.diasAtivos}
                    >
                      Dias com uso
                    </Th>
                    <Th
                      campo="acoesConsulta"
                      estado={tabelaPessoas}
                      alinhar="right"
                      tooltip={TOOLTIP_COLUNA.consultas}
                    >
                      Consultas
                    </Th>
                    <Th
                      campo="acoesDownload"
                      estado={tabelaPessoas}
                      alinhar="right"
                      tooltip={TOOLTIP_COLUNA.downloads}
                    >
                      Downloads
                    </Th>
                    <Th
                      campo="documentosEnviados"
                      estado={tabelaPessoas}
                      alinhar="right"
                      tooltip={TOOLTIP_COLUNA.documentos}
                    >
                      Arquivos enviados
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {pessoasVisiveis.visiveis.map((pessoa) => (
                    <Tr
                      key={pessoa.usuario}
                      onClick={() =>
                        atualizarUrl({
                          usuario:
                            usuarioSelecionado === pessoa.usuario ? undefined : pessoa.usuario,
                        })
                      }
                      selecionado={usuarioSelecionado === pessoa.usuario}
                      rotuloInteracao={`Filtrar todo o dashboard por ${pessoa.usuario}`}
                    >
                      <Td className="font-medium text-slate-800">{pessoa.usuario}</Td>
                      <Td alinhar="right">{num(pessoa.ferramentasUsadas)}</Td>
                      <Td alinhar="right">{num(pessoa.diasAtivos)}</Td>
                      <Td alinhar="right">{num(pessoa.acoesConsulta)}</Td>
                      <Td alinhar="right">{num(pessoa.acoesDownload)}</Td>
                      <Td alinhar="right">{num(pessoa.documentosEnviados)}</Td>
                    </Tr>
                  ))}
                  {!carregando && pessoasVisiveis.visiveis.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
                        Nenhuma atividade humana observada neste recorte.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Tabela>
              {pessoasVisiveis.temMais && (
                <BotaoExpandir
                  expandido={pessoasVisiveis.expandido}
                  total={pessoasVisiveis.total}
                  limite={20}
                  onClick={() => pessoasVisiveis.setExpandido((valor) => !valor)}
                />
              )}
            </>
          </Painel>

          <Painel
            titulo="Arquivos enviados por mês"
            descricao={
              <>
                <TermoColorido cor={TEAL[600]}>Arquivos enviados por pessoas</TermoColorido> por
                mês.
              </>
            }
            tooltip={TOOLTIP_GERENCIAL.evolucaoDocumentos}
            altura={ALTURA_GRAFICO}
            carregando={carregando}
            vazio={serieArquivos.length === 0}
            className={COL_APOIO}
          >
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <ComposedChart
                accessibilityLayer
                data={serieArquivos}
                margin={{ top: 6, right: 4, left: 0, bottom: 6 }}
              >
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="label" {...AXIS_STYLE} tickMargin={8} />
                <YAxis {...AXIS_STYLE} padding={{ top: 10 }} tickFormatter={numCurto} width={58} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(valor: number, nome: string) => [num(valor), nome]}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="enviadosHumanos"
                  name="arquivos"
                  fill={TEAL[600]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Painel>
        </div>

        {USANDO_FIXTURES && (
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <FlaskConical className="h-3.5 w-3.5" />
            Modo fixture: o período recorta a série e os totais aditivos; pessoas e ferramentas
            permanecem no período completo do fixture.
          </p>
        )}
      </div>
    </BoardLayout>
  );
};

export default DashboardUsoEnvioGerencial;
