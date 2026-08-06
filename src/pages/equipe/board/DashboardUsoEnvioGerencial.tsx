import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, FlaskConical, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
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
  dataBR,
  mesLabel,
  useSort,
  num,
  numCurto,
  pct,
} from '@/components/equipe/dev/dashboard-uso-envio/formatadores';
import { OPCOES_PERIODO } from '@/lib/analytics-uso/periodo';
import { TOOLTIP_COLUNA, TOOLTIP_GERENCIAL } from '@/components/equipe/dev/dashboard-uso-envio/tooltips';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAnalyticsArquivos,
  useAnalyticsFiltros,
  useAnalyticsUsoApi,
  USANDO_FIXTURES,
} from '@/hooks/useAnalyticsUso';
import { useAuth } from '@/contexts/AuthContext';
import { usePageAccess } from '@/hooks/usePageAccess';
import { useUserEstrutura } from '@/hooks/useUserEstrutura';
import {
  montarAtividadePessoas,
  resumirGerencial,
  rotuloCluster,
} from '@/lib/analytics-uso/metricas';
import type { AnalyticsUsoFiltros } from '@/lib/analytics-uso/types';

const TODOS = 'todos';

const DashboardUsoEnvioGerencial = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const estrutura = useUserEstrutura();
  const acessoTecnico = usePageAccess('/equipe/dev/gerenciar-dados/uso-envio');
  const [clusterSelecionado, setClusterSelecionado] = useState(TODOS);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(TODOS);
  const [periodoSelecionado, setPeriodoSelecionado] = useState('tudo');
  const filtros = useMemo<AnalyticsUsoFiltros>(
    () => ({
      inicio: '2026-01-01',
      fim: new Date().toISOString().slice(0, 10),
      usuario: usuarioSelecionado === TODOS ? undefined : usuarioSelecionado,
      clusterId: clusterSelecionado === TODOS ? undefined : clusterSelecionado,
    }),
    [clusterSelecionado, usuarioSelecionado],
  );

  const opcoes = useAnalyticsFiltros();
  const clustersDisponiveis = useMemo(
    () =>
      isAdmin ? (opcoes.data?.clusters ?? []) : estrutura.clusters.map((cluster) => cluster.id),
    [estrutura.clusters, isAdmin, opcoes.data?.clusters],
  );

  useEffect(() => {
    if (isAdmin || estrutura.isLoading || clustersDisponiveis.length === 0) return;
    if (!clustersDisponiveis.includes(clusterSelecionado)) {
      setClusterSelecionado(clustersDisponiveis[0]);
    }
  }, [clusterSelecionado, clustersDisponiveis, estrutura.isLoading, isAdmin]);

  const usoApi = useAnalyticsUsoApi(filtros);
  const arquivos = useAnalyticsArquivos(filtros);
  const clusterId = clusterSelecionado === TODOS ? undefined : clusterSelecionado;
  const resumo = resumirGerencial(usoApi.data, arquivos.data, clusterId);
  const mesesRecorte = OPCOES_PERIODO.find((o) => o.id === periodoSelecionado)?.meses ?? 0;

  const atividadePessoas = montarAtividadePessoas(usoApi.data, arquivos.data, clusterId);
  const pessoas = atividadePessoas.map((item) => item.usuario);
  const tabelaPessoas = useSort(atividadePessoas, 'chamadas');
  const pessoasVisiveis = tabelaPessoas.sorted;
  const carregando = usoApi.isLoading || arquivos.isLoading;
  const erro = usoApi.error ?? arquivos.error ?? opcoes.error;
  const apiMes = resumo.apiMes;
  const arquivosMes = resumo.arquivosMes;
  const catalogoFerramentas = opcoes.data?.ferramentas.length ?? resumo.ferramentas.length;

  // Nomear os dois meses: "voltaram no mes seguinte" nao dizia que a queda de
  // 80% para 50% veio de o mes de referencia ter virado agosto parcial.
  const mesAnteriorRotulo =
    resumo.serie.length >= 2 ? mesLabel(resumo.serie[resumo.serie.length - 2].mes) : null;




  const recortarPeriodo = <T,>(itens: T[]) =>
    mesesRecorte > 0 ? itens.slice(-mesesRecorte) : itens;

  const serie = recortarPeriodo(resumo.serie).map((item) => ({
    ...item,
    label: mesLabel(item.mes),
    taxaRetencaoPct: item.taxaRetencao == null ? null : item.taxaRetencao * 100,
  }));
  const ferramentas = resumo.ferramentas
    .slice()
    .sort((a, b) => b.usuariosAtivos - a.usuariosAtivos)
    .slice(0, 5);
  const arquivosSerieBruta = clusterId
    ? (arquivos.data?.gerencial.porClusterMes.filter((item) => item.clusterId === clusterId) ?? [])
    : (arquivos.data?.gerencial.porMes ?? []);
  const serieArquivosFechada = arquivosSerieBruta;
  // Com fixture nao ha carimbo de consulta no payload; o endpoint vai devolver
  // o horario real da query. Ate la, a hora em que a pagina montou.
  const atualizadoEm = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });


  const serieArquivos = recortarPeriodo(serieArquivosFechada).map((item) => ({
    ...item,
    label: mesLabel(item.mes),
    enviadosHumanos: item.enviados - item.enviadosAutomacao,
  }));

  // Tudo abaixo segue o filtro de periodo. Antes vinha de `apiMes` (ultimo mes
  // da serie), entao o cartao mostrava um mes mesmo com "Todo o periodo"
  // selecionado — o que o usuario viu como "grafico filtrando sozinho".
  const pessoasNoPeriodo = atividadePessoas.length;
  const ferramentasNoPeriodo = resumo.ferramentas.filter((f) => f.usuariosAtivos > 0).length;
  const totalAcoes =
    serie.reduce((acc, m) => acc + m.chamadas, 0) +
    serieArquivos.reduce((acc, m) => acc + m.enviadosHumanos, 0);
  const acoesPorPessoa = pessoasNoPeriodo ? totalAcoes / pessoasNoPeriodo : 0;
  const temFiltro = usuarioSelecionado !== TODOS || (isAdmin && clusterSelecionado !== TODOS);
  const atualizando = usoApi.isFetching || arquivos.isFetching;

  return (
    <BoardLayout title="Uso e envio" subtitle="Adoção, engajamento e retenção">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="text-[22px] font-semibold tracking-[-0.01em]"
              style={{ color: 'var(--board-t1)' }}
            >
              Uso e envio
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
              onClick={() => navigate('/equipe/dev/gerenciar-dados/uso-envio')}
            >
              <BarChart3 className="h-4 w-4" />
              Visão técnica
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
              <div className="w-full space-y-1.5 sm:w-auto">
                <Label htmlFor="filtro-periodo-uso" className="text-xs text-slate-600">
                  Período
                </Label>
                <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                  <SelectTrigger id="filtro-periodo-uso" className="h-9 w-full sm:w-[190px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCOES_PERIODO.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            <div className="w-full space-y-1.5 sm:max-w-[280px]">
              <Label htmlFor="filtro-pessoa-uso" className="text-xs font-medium text-slate-600">
                Pessoa
              </Label>
              <Select value={usuarioSelecionado} onValueChange={setUsuarioSelecionado}>
                <SelectTrigger id="filtro-pessoa-uso" className="h-9">
                  <SelectValue placeholder="Todas as pessoas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todas as pessoas</SelectItem>
                  {pessoas.map((pessoa) => (
                    <SelectItem key={pessoa} value={pessoa}>
                      {pessoa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {atualizando && <Loader2 className="mb-2.5 h-4 w-4 animate-spin text-teal-600" />}
            {temFiltro && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mb-0.5 h-8 gap-1 px-2 text-xs text-slate-600"
                onClick={() => {
                  setClusterSelecionado(
                    isAdmin ? TODOS : (clustersDisponiveis[0] ?? clusterSelecionado),
                  );
                  setUsuarioSelecionado(TODOS);
                }}
              >
                <X className="h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            )}
          </div>
          <p className="text-right text-xs text-slate-500">
            Última atualização{' '}
            <strong className="text-slate-700">{atualizadoEm}</strong>
          </p>
        </div>

        {erro && (
          <div className="flex items-start gap-3 rounded-xl border-l-[3px] border-rose-700 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
            <span>{erro.message}</span>
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
              valor: num(pessoasNoPeriodo),
              variacao: {
                valor: num(serie.reduce((acc, m) => acc + m.usuariosNovos, 0)),
                rotulo: 'no primeiro uso observado dentro do período',
              },
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
                          resumo.mesReferenciaParcial ? ' (em curso)' : ''
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
              valor: num(acoesPorPessoa, 1),
              variacao: {
                valor: num(totalAcoes),
                rotulo: 'ações no período',
              },
              tooltip: TOOLTIP_GERENCIAL.engajamento,
            },
            {
              label: 'Ferramentas utilizadas',
              valor: num(ferramentasNoPeriodo),
              variacao: {
                valor: num(catalogoFerramentas),
                rotulo: 'disponíveis no catálogo',
              },
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
            className={COL_PRINCIPAL}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serie} margin={{ top: 6, right: 4, left: 0, bottom: 6 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="label" {...AXIS_STYLE} tickMargin={8} />
                <YAxis {...AXIS_STYLE} padding={{ top: 10 }} allowDecimals={false} width={48} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(valor: number, nome: string) => [num(valor), nome]}
                />
                <Bar
                  dataKey="usuariosAtivos"
                  name="ativos"
                  fill={TEAL[600]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                />
                <Bar
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
            descricao={`Pessoas distintas com ao menos um uso no período, entre ${num(resumo.ferramentas.length)} ferramentas com uso.`}
            tooltip={TOOLTIP_GERENCIAL.pessoasPorFerramenta}
            altura={ALTURA_GRAFICO}
            carregando={carregando}
            className={COL_APOIO}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ferramentas}
                layout="vertical"
                margin={{ top: 8, right: 48, left: 4, bottom: 8 }}
              >
                <CartesianGrid {...GRID_STYLE} horizontal={false} vertical />
                <XAxis
                  type="number"
                  {...AXIS_STYLE}
                />
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
            <Tabela altura={ALTURA_LISTA}>
              <thead>
                <tr>
                  <Th campo="usuario" estado={tabelaPessoas} tooltip={TOOLTIP_COLUNA.pessoa}>Pessoa</Th>
                  <Th campo="ferramentasUsadas" estado={tabelaPessoas} alinhar="right" tooltip={TOOLTIP_COLUNA.ferramentasDistintas}>
                    Ferramentas
                  </Th>
                  <Th campo="diasAtivos" estado={tabelaPessoas} alinhar="right" tooltip={TOOLTIP_COLUNA.diasAtivos}>
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
                  <Th campo="documentosEnviados" estado={tabelaPessoas} alinhar="right" tooltip={TOOLTIP_COLUNA.documentos}>
                    Arquivos enviados
                  </Th>
                </tr>
              </thead>
              <tbody>
                {pessoasVisiveis.map((pessoa) => (
                  <Tr
                    key={pessoa.usuario}
                    onClick={() =>
                      setUsuarioSelecionado(
                        usuarioSelecionado === pessoa.usuario ? TODOS : pessoa.usuario,
                      )
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
                {!carregando && pessoasVisiveis.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
                      Nenhuma atividade humana observada neste recorte.
                    </td>
                  </tr>
                )}
              </tbody>
            </Tabela>
          </Painel>

          <Painel
            titulo="Arquivos enviados por mês"
            descricao={
              <>
                <TermoColorido cor={TEAL[600]}>Arquivos enviados por pessoas</TermoColorido> por mês.
              </>
            }
            tooltip={TOOLTIP_GERENCIAL.evolucaoDocumentos}
            altura={ALTURA_GRAFICO}
            carregando={carregando}
            className={COL_APOIO}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
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
            Modo fixture: dados de produção congelados; filtros de período aguardam os endpoints do
            Cloud Run.
          </p>
        )}
      </div>
    </BoardLayout>
  );
};

export default DashboardUsoEnvioGerencial;
