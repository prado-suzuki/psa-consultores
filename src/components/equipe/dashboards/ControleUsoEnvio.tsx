/**
 * Dashboard "Controle de uso e envio" — versao TECNICA.
 *
 * Este componente e o CONTEUDO do dashboard, sem shell de layout: quem o
 * monta e a pagina `/equipe/dashboards`, que ja fornece cabecalho, titulo e
 * o seletor de dashboards. Manter o layout fora daqui e o que permite
 * registrar outros dashboards no mesmo lugar sem duplicar moldura.
 *
 * A versão gerencial, voltada aos gestores de área, reaproveita os mesmos
 * payloads com recorte por cluster e vive no Board.
 *
 * Os dados vem de `src/lib/analytics-uso/client.ts`. Enquanto
 * VITE_ANALYTICS_USO_FIXTURES=1, sao fixtures gravados de producao por
 * `scripts/dump-analytics-fixtures.ts`; depois, dois endpoints do Cloud Run.
 * Nenhum grafico desta pagina sabe a diferenca.
 *
 * Identidade visual: Manual de Marca PSA (teal/lime/gray e Work Sans).
 */
import { lazy, Suspense, useCallback, useMemo } from 'react';
import {
  AlertCircle,
  BarChart3,
  CalendarRange,
  FlaskConical,
  Loader2,
  RefreshCw,
  UserRound,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AbaSaudeApi } from '@/components/equipe/dev/dashboard-uso-envio/AbaSaudeApi';
import { RISCO, dataBR } from '@/components/equipe/dev/dashboard-uso-envio/formatadores';
import {
  useAnalyticsArquivos,
  useAnalyticsCatalogo,
  useAnalyticsUsoApi,
  USANDO_FIXTURES,
} from '@/hooks/useAnalyticsUso';
import { usePageAccess } from '@/hooks/usePageAccess';
import type { AnalyticsUsoFiltros } from '@/lib/analytics-uso/types';
import { OPCOES_PERIODO, resolverIntervaloPeriodo } from '@/lib/analytics-uso/periodo';

const ABA_CLASSES =
  'rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors ' +
  'data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm';

const TODOS = '__todos__';
const ABAS = ['saude', 'uso', 'arquivos'] as const;
type AbaTecnica = (typeof ABAS)[number];

const carregarAbaUsoApi = () =>
  import('@/components/equipe/dev/dashboard-uso-envio/AbaUsoApi').then((modulo) => ({
    default: modulo.AbaUsoApi,
  }));
const carregarAbaArquivos = () =>
  import('@/components/equipe/dev/dashboard-uso-envio/AbaArquivos').then((modulo) => ({
    default: modulo.AbaArquivos,
  }));
const AbaUsoApi = lazy(carregarAbaUsoApi);
const AbaArquivos = lazy(carregarAbaArquivos);

const AbaFallback = () => (
  <div className="flex min-h-[320px] items-center justify-center text-xs text-muted-foreground">
    Carregando visualização…
  </div>
);

const abaValida = (valor: string | null): valor is AbaTecnica => ABAS.includes(valor as AbaTecnica);

const periodoValido = (valor: string | null) =>
  OPCOES_PERIODO.some((opcao) => opcao.id === valor) ? valor! : 'tudo';

export const ControleUsoEnvio = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const acessoGerencial = usePageAccess('/equipe/board/uso-envio');
  const abaParam = searchParams.get('aba');
  const aba: AbaTecnica = abaValida(abaParam) ? abaParam : 'saude';
  const periodoSelecionado = periodoValido(searchParams.get('periodo'));
  const usuarioSelecionado = searchParams.get('usuario') || undefined;
  const ferramentaSelecionada = usuarioSelecionado
    ? undefined
    : searchParams.get('ferramenta') || undefined;
  const catalogo = useAnalyticsCatalogo();
  const usuariosFiltro = useMemo(() => {
    const usuarios = new Map<string, boolean>();
    for (const item of catalogo.data?.usuariosApi ?? []) usuarios.set(item.usuario, item.automacao);
    for (const item of catalogo.data?.usuariosArquivos ?? []) {
      usuarios.set(item.usuario, usuarios.get(item.usuario) ?? item.automacao);
    }
    return [...usuarios.entries()]
      .map(([usuario, automacao]) => ({ usuario, automacao }))
      .sort((a, b) => a.usuario.localeCompare(b.usuario, 'pt-BR'));
  }, [catalogo.data]);
  const intervalo = useMemo(
    () => resolverIntervaloPeriodo(periodoSelecionado),
    [periodoSelecionado],
  );

  const atualizarUrl = useCallback(
    (alteracoes: Record<string, string | undefined>) => {
      const proximos = new URLSearchParams(searchParams);
      for (const [chave, valor] of Object.entries(alteracoes)) {
        if (valor) proximos.set(chave, valor);
        else proximos.delete(chave);
      }
      setSearchParams(proximos);
    },
    [searchParams, setSearchParams],
  );

  const selecionarUsuario = useCallback(
    (usuario?: string) => atualizarUrl({ usuario, ferramenta: undefined }),
    [atualizarUrl],
  );

  const filtros = useMemo<AnalyticsUsoFiltros>(
    () => ({
      inicio: intervalo.inicio,
      fim: intervalo.fim,
      usuario: usuarioSelecionado,
      ferramenta: ferramentaSelecionada,
    }),
    [ferramentaSelecionada, intervalo.fim, intervalo.inicio, usuarioSelecionado],
  );
  const filtrosArquivos = useMemo<AnalyticsUsoFiltros>(
    () => ({
      inicio: intervalo.inicio,
      fim: intervalo.fim,
      usuario: usuarioSelecionado,
    }),
    [intervalo.fim, intervalo.inicio, usuarioSelecionado],
  );

  const mesesRecorte = USANDO_FIXTURES ? intervalo.mesesRecorte : 0;

  const usoApi = useAnalyticsUsoApi(filtros, { enabled: aba !== 'arquivos' });
  const arquivos = useAnalyticsArquivos(filtrosArquivos, { enabled: aba === 'arquivos' });

  const erro = catalogo.error ?? usoApi.error ?? (aba === 'arquivos' ? arquivos.error : null);
  const periodo = aba === 'arquivos' ? arquivos.data?.periodo : usoApi.data?.periodo;
  const periodoExibido = USANDO_FIXTURES ? intervalo : (periodo ?? intervalo);
  const consultaAtual = aba === 'arquivos' ? arquivos : usoApi;
  const atualizadoEm = consultaAtual.dataUpdatedAt
    ? new Date(consultaAtual.dataUpdatedAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-3">
      {erro && (
        <div
          className="flex items-start gap-2.5 rounded-xl border-l-[3px] px-4 py-2.5 text-xs"
          style={{ borderLeftColor: RISCO, background: '#FFF1F2', color: '#881337' }}
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: RISCO }} />
          <span className="flex-1">{erro.message}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs text-rose-800 hover:bg-rose-100"
            onClick={() => {
              if (catalogo.error) void catalogo.refetch();
              if (usoApi.error) void usoApi.refetch();
              if (arquivos.error && aba === 'arquivos') void arquivos.refetch();
            }}
          >
            <RefreshCw className="h-3 w-3" />
            Tentar novamente
          </Button>
        </div>
      )}

      <Tabs
        value={aba}
        onValueChange={(valor) => abaValida(valor) && atualizarUrl({ aba: valor })}
        className="w-full"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-lg p-1 sm:w-auto">
            <TabsTrigger value="saude" className={ABA_CLASSES}>
              Saúde da API
            </TabsTrigger>
            <TabsTrigger
              value="uso"
              className={ABA_CLASSES}
              onMouseEnter={() => void carregarAbaUsoApi()}
              onFocus={() => void carregarAbaUsoApi()}
            >
              Uso da API
            </TabsTrigger>
            <TabsTrigger
              value="arquivos"
              className={ABA_CLASSES}
              onMouseEnter={() => void carregarAbaArquivos()}
              onFocus={() => void carregarAbaArquivos()}
            >
              Ingestão de arquivos
            </TabsTrigger>
          </TabsList>

          <p className="text-xs text-muted-foreground">
            Período{' '}
            <span className="font-medium text-foreground">
              {dataBR(periodoExibido.inicio)} — {dataBR(periodoExibido.fim)}
            </span>
          </p>
        </div>

        <div className="mt-3">
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/70 px-3 py-2">
            <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Período</span>
            <Select
              value={periodoSelecionado}
              onValueChange={(valor) =>
                atualizarUrl({ periodo: valor === 'tudo' ? undefined : valor })
              }
            >
              <SelectTrigger className="h-8 w-full text-xs sm:w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPCOES_PERIODO.map((o) => (
                  <SelectItem key={o.id} value={o.id} className="text-xs">
                    {o.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <UserRound className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Pessoa</span>
            <Select
              value={usuarioSelecionado ?? TODOS}
              onValueChange={(valor) => selecionarUsuario(valor === TODOS ? undefined : valor)}
            >
              <SelectTrigger className="h-8 w-full text-xs sm:w-[240px]">
                <SelectValue placeholder="Todas as pessoas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS} className="text-xs">
                  Todas as pessoas
                </SelectItem>
                {usuariosFiltro.map((u) => (
                  <SelectItem key={u.usuario} value={u.usuario} className="text-xs">
                    {u.usuario}
                    {u.automacao ? ' (automação)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="ml-1 text-xs font-medium text-muted-foreground">Ferramenta</span>
            <Select
              value={ferramentaSelecionada ?? TODOS}
              onValueChange={(valor) =>
                atualizarUrl({
                  ferramenta: valor === TODOS ? undefined : valor,
                  usuario: undefined,
                })
              }
              disabled={Boolean(usuarioSelecionado)}
            >
              <SelectTrigger className="h-8 w-full text-xs sm:w-[210px]">
                <SelectValue placeholder="Todas as ferramentas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS} className="text-xs">
                  Todas as ferramentas
                </SelectItem>
                {(catalogo.data?.ferramentas ?? []).map((f) => (
                  <SelectItem key={f} value={f} className="text-xs">
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(consultaAtual.isFetching || catalogo.isFetching) && (
              <span
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Atualizando
              </span>
            )}

            {usuarioSelecionado && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-primary hover:bg-accent/10"
                onClick={() => selecionarUsuario(undefined)}
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
            {!usuarioSelecionado && ferramentaSelecionada && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-primary hover:bg-accent/10"
                onClick={() => atualizarUrl({ ferramenta: undefined })}
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </Button>
            )}

            <span className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto">
              {usuarioSelecionado ? (
                <>
                  Filtrado por <strong className="text-foreground">{usuarioSelecionado}</strong> — o
                  recorte por ferramenta fica indisponível enquanto houver pessoa selecionada
                </>
              ) : ferramentaSelecionada ? (
                <>
                  API filtrada por{' '}
                  <strong className="text-foreground">{ferramentaSelecionada}</strong> — a aba de
                  ingestão não tem esse eixo e segue completa
                </>
              ) : (
                'Todas as pessoas e contas de automação'
              )}
            </span>

            {!acessoGerencial.isLoading && acessoGerencial.hasAccess && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => navigate('/equipe/board/uso-envio')}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Visão gerencial
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              onClick={() => void consultaAtual.refetch()}
              disabled={consultaAtual.isFetching}
              aria-label="Atualizar dados da aba atual"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </Button>
          </div>
          {atualizadoEm && (
            <p className="mb-3 text-right text-[11px] text-slate-400">
              Dados recebidos em {atualizadoEm}
            </p>
          )}
          <TabsContent value="saude" className="mt-0">
            <AbaSaudeApi
              mesesRecorte={mesesRecorte}
              dados={usoApi.data}
              carregando={usoApi.isLoading}
            />
          </TabsContent>
          <TabsContent value="uso" className="mt-0">
            <Suspense fallback={<AbaFallback />}>
              <AbaUsoApi
                mesesRecorte={mesesRecorte}
                dados={usoApi.data}
                carregando={usoApi.isLoading}
                usuarioSelecionado={usuarioSelecionado}
                onSelecionarUsuario={selecionarUsuario}
              />
            </Suspense>
          </TabsContent>
          <TabsContent value="arquivos" className="mt-0">
            <Suspense fallback={<AbaFallback />}>
              <AbaArquivos
                mesesRecorte={mesesRecorte}
                dados={arquivos.data}
                carregando={arquivos.isLoading}
                usuarioSelecionado={usuarioSelecionado}
                onSelecionarUsuario={selecionarUsuario}
              />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>

      {USANDO_FIXTURES && (
        <p className="flex items-center gap-1.5 pt-1 text-xs text-slate-400">
          <FlaskConical className="h-3.5 w-3.5" />
          Modo de homologação: o período recorta apenas as séries mensais; rankings e tabelas
          permanecem no período completo do fixture.
        </p>
      )}
    </div>
  );
};

export default ControleUsoEnvio;
