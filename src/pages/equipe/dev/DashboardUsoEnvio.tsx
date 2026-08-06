/**
 * Dashboard nativo "Controle de uso e envio" — versao TECNICA.
 *
 * A versão gerencial, voltada aos gestores de área, reaproveita os mesmos
 * payloads com recorte por cluster.
 *
 * Os dados vem de `src/lib/analytics-uso/client.ts`. Enquanto
 * VITE_ANALYTICS_USO_FIXTURES=1, sao fixtures gravados de producao por
 * `scripts/dump-analytics-fixtures.ts`; depois, tres endpoints do Cloud Run.
 * Nenhum grafico desta pagina sabe a diferenca.
 *
 * Identidade visual: Manual de Marca PSA (teal/lime/gray e Work Sans).
 */
import { useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CalendarRange,
  FlaskConical,
  Loader2,
  UserRound,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AbaArquivos } from '@/components/equipe/dev/dashboard-uso-envio/AbaArquivos';
import { AbaSaudeApi } from '@/components/equipe/dev/dashboard-uso-envio/AbaSaudeApi';
import { AbaUsoApi } from '@/components/equipe/dev/dashboard-uso-envio/AbaUsoApi';
import { RISCO, dataBR } from '@/components/equipe/dev/dashboard-uso-envio/formatadores';
import {
  useAnalyticsArquivos,
  useAnalyticsFiltros,
  useAnalyticsUsoApi,
  USANDO_FIXTURES,
} from '@/hooks/useAnalyticsUso';
import { usePageAccess } from '@/hooks/usePageAccess';
import type { AnalyticsUsoFiltros } from '@/lib/analytics-uso/types';
import { OPCOES_PERIODO } from '@/lib/analytics-uso/periodo';

const ABA_CLASSES =
  'rounded-md px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors ' +
  'data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm';

const DashboardUsoEnvio = () => {
  const navigate = useNavigate();
  const acessoGerencial = usePageAccess('/equipe/board/uso-envio');
  const [periodoSelecionado, setPeriodoSelecionado] = useState('tudo');
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<string>();
  const [ferramentaSelecionada, setFerramentaSelecionada] = useState<string>();
  const opcoes = useAnalyticsFiltros();
  /** Sentinela: Radix Select nao aceita SelectItem com value vazio. */
  const TODOS = '__todos__';
  // Com fixture o periodo vem congelado no payload; quando o endpoint existir,
  // estes valores passam a ser controlados por um seletor de data.
  const filtros = useMemo<AnalyticsUsoFiltros>(
    () => ({
      inicio: '2026-01-01',
      fim: new Date().toISOString().slice(0, 10),
      usuario: usuarioSelecionado,
      ferramenta: ferramentaSelecionada,
    }),
    [usuarioSelecionado, ferramentaSelecionada],
  );

  const mesesRecorte = OPCOES_PERIODO.find((o) => o.id === periodoSelecionado)?.meses ?? 0;

  const usoApi = useAnalyticsUsoApi(filtros);
  const arquivos = useAnalyticsArquivos(filtros);

  const erro = usoApi.error ?? arquivos.error;
  const periodo = usoApi.data?.periodo ?? arquivos.data?.periodo;

  return (
    <DevLayout
      title="Controle de uso e envio · técnico"
      subtitle="Saúde operacional da API, tráfego e ingestão de documentos"
      headerActions={
        !acessoGerencial.isLoading &&
        acessoGerencial.hasAccess && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate('/equipe/board/uso-envio')}
          >
            <BarChart3 className="h-4 w-4" />
            Visão gerencial
          </Button>
        )
      }
    >
      <div className="mx-auto w-full max-w-[1440px] space-y-3">
        {erro && (
          <div
            className="flex items-start gap-2.5 rounded-xl border-l-[3px] px-4 py-2.5 text-xs"
            style={{ borderLeftColor: RISCO, background: '#FFF1F2', color: '#881337' }}
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: RISCO }} />
            <span>{erro.message}</span>
          </div>
        )}

        <Tabs defaultValue="saude" className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 sm:w-auto">
              <TabsTrigger value="saude" className={ABA_CLASSES}>
                Saúde da API
              </TabsTrigger>
              <TabsTrigger value="uso" className={ABA_CLASSES}>
                Uso da API
              </TabsTrigger>
              <TabsTrigger value="arquivos" className={ABA_CLASSES}>
                Ingestão de arquivos
              </TabsTrigger>
            </TabsList>

            {periodo && (
              <p className="text-xs text-slate-500">
                Período{' '}
                <span className="font-medium text-slate-700">
                  {dataBR(periodo.inicio)} — {dataBR(periodo.fim)}
                </span>
              </p>
            )}
          </div>

          <div className="mt-3">
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
              <CalendarRange className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Período</span>
              <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                <SelectTrigger className="h-8 w-full bg-white text-xs sm:w-[170px]">
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

              <UserRound className="ml-1 h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Pessoa</span>
              <Select
                value={usuarioSelecionado ?? TODOS}
                onValueChange={(v) => setUsuarioSelecionado(v === TODOS ? undefined : v)}
              >
                <SelectTrigger className="h-8 w-full bg-white text-xs sm:w-[240px]">
                  <SelectValue placeholder="Todas as pessoas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS} className="text-xs">
                    Todas as pessoas
                  </SelectItem>
                  {(opcoes.data?.usuariosApi ?? []).map((u) => (
                    <SelectItem key={u.usuario} value={u.usuario} className="text-xs">
                      {u.usuario}
                      {u.automacao ? ' (automação)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="ml-1 text-xs font-medium text-slate-600">Ferramenta</span>
              <Select
                value={ferramentaSelecionada ?? TODOS}
                onValueChange={(v) => setFerramentaSelecionada(v === TODOS ? undefined : v)}
                disabled={Boolean(usuarioSelecionado)}
              >
                <SelectTrigger className="h-8 w-full bg-white text-xs sm:w-[210px]">
                  <SelectValue placeholder="Todas as ferramentas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS} className="text-xs">
                    Todas as ferramentas
                  </SelectItem>
                  {(opcoes.data?.ferramentas ?? []).map((f) => (
                    <SelectItem key={f} value={f} className="text-xs">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(usoApi.isFetching || arquivos.isFetching) && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" aria-label="Atualizando dados" />
              )}

              {usuarioSelecionado && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-teal-800 hover:bg-teal-100 hover:text-teal-950"
                  onClick={() => setUsuarioSelecionado(undefined)}
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
                  className="h-7 gap-1 px-2 text-xs text-teal-800 hover:bg-teal-100 hover:text-teal-950"
                  onClick={() => setFerramentaSelecionada(undefined)}
                >
                  <X className="h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}

              <span className="w-full text-xs text-slate-500 sm:ml-auto sm:w-auto">
                {usuarioSelecionado ? (
                  <>
                    Filtrado por <strong className="text-slate-700">{usuarioSelecionado}</strong> — o
                    recorte por ferramenta fica indisponível enquanto houver pessoa selecionada
                  </>
                ) : ferramentaSelecionada ? (
                  <>
                    API filtrada por <strong className="text-slate-700">{ferramentaSelecionada}</strong>{' '}
                    — a aba de ingestão não tem esse eixo e segue completa
                  </>
                ) : (
                  'Todas as pessoas e contas de automação'
                )}
              </span>
            </div>
            <TabsContent value="saude" className="mt-0">
              <AbaSaudeApi mesesRecorte={mesesRecorte} dados={usoApi.data} carregando={usoApi.isLoading} />
            </TabsContent>
            <TabsContent value="uso" className="mt-0">
              <AbaUsoApi
                mesesRecorte={mesesRecorte}
                dados={usoApi.data}
                carregando={usoApi.isLoading}
                usuarioSelecionado={usuarioSelecionado}
                onSelecionarUsuario={setUsuarioSelecionado}
              />
            </TabsContent>
            <TabsContent value="arquivos" className="mt-0">
              <AbaArquivos
                mesesRecorte={mesesRecorte}
                dados={arquivos.data}
                carregando={arquivos.isLoading}
                usuarioSelecionado={usuarioSelecionado}
                onSelecionarUsuario={setUsuarioSelecionado}
              />
            </TabsContent>
          </div>
        </Tabs>

        {USANDO_FIXTURES && (
          <p className="flex items-center gap-1.5 pt-1 text-xs text-slate-400">
            <FlaskConical className="h-3.5 w-3.5" />
            Modo de homologação: dados de produção congelados; o período ainda não é interativo.
          </p>
        )}
      </div>
    </DevLayout>
  );
};

export default DashboardUsoEnvio;
