/**
 * Aba "Saude da API" — latencia, taxa de erro e ranking de endpoints.
 * Fonte: GET /api/v1/analytics/uso/api-consumo (hoje: fixture).
 *
 * Usa o padrão RED: volume, taxa de erro e latências p50/p95 sobre todo o
 * tráfego. O ranking de lentidão exige um piso mínimo de chamadas.
 */
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Timer } from 'lucide-react';
import type { AnalyticsUsoApiResponse } from '@/lib/analytics-uso/types';
import {
  BotaoExpandir,
  CelulaBarra,
  FaixaResumo,
  RotuloFinalLinha,
  TermoColorido,
  FraseInsight,
  Painel,
  Tabela,
  Td,
  TextoComTooltip,
  Th,
  Tr,
} from './primitivos';
import {
  ALERTA,
  AXIS_STYLE,
  COR_ERRO,
  GRAY,
  GRID_STYLE,
  RISCO,
  TEAL,
  TOOLTIP_STYLE,
  mesLabel,
  ms,
  num,
  pct,
  tickPct,
  tickSeg,
  useSort,
} from './formatadores';
import { TOOLTIP_COLUNA, TOOLTIP_TECNICO } from './tooltips';
import { compararPeriodo, maximo, recortarSerie, somar } from '@/lib/analytics-uso/periodo';
import {
  ALTURA_GRAFICO,
  ALTURA_LISTA,
  COL_APOIO,
  COL_PRINCIPAL,
  GRADE_TOPO,
} from './layout';

import { insightConcentracao, insightPiorMes } from '@/lib/analytics-uso/insights';
import {
  META_P95_MS,
  META_TAXA_ERRO_API,
  mesEstaParcial,
} from '@/lib/analytics-uso/metricas';

/** Piso para destacar taxa alta em vermelho: 100% sobre 3 chamadas nao e incidente. */
const MIN_CHAMADAS_ALERTA = 20;
/** p95 acima disso ja incomoda o usuario da ferramenta. */
const P95_LENTO_MS = 10000;


interface Props {
  dados?: AnalyticsUsoApiResponse;
  carregando: boolean;
  /** 0 = todo o período. Recorta a série mensal no cliente (modo fixture). */
  mesesRecorte?: number;
}

export const AbaSaudeApi = ({ dados, carregando, mesesRecorte = 0 }: Props) => {
  const totaisBrutos = dados?.totais;
  const serieCompleta = dados?.porMes ?? [];
  const recorteAtivo = mesesRecorte > 0;
  const recorte = recortarSerie(serieCompleta, mesesRecorte);
  const porMes = recorte.serie;
  const porStatus = dados?.porStatus ?? [];
  const porEndpoint = dados?.porEndpoint ?? [];


  // Troubleshooting comeca pelo que quebrou, nao pelo que tem mais volume.
  const tabela = useSort(porEndpoint, 'erros5xx');
  const maxChamadas = porEndpoint.reduce((m, e) => Math.max(m, e.chamadas), 0);
  const max5xx = porEndpoint.reduce((m, e) => Math.max(m, e.erros5xx), 0);
  const max4xx = porEndpoint.reduce((m, e) => Math.max(m, e.erros4xx), 0);

  const fimPeriodo = dados?.periodo.fim ?? '';
  const serieMes = porMes.map((m) => ({
    ...m,
    label: `${mesLabel(m.mes)}${mesEstaParcial(m.mes, fimPeriodo) ? '*' : ''}`,
    taxaErroPct: m.taxaErro * 100,
  }));
  // Variacao sempre entre meses FECHADOS — o mes corrente tem menos dias e
  // produziria uma queda que e calendario, nao operacao.
  const mesChamadas = compararPeriodo(serieCompleta, (m) => m.chamadas, mesesRecorte);
  const mesP95 = compararPeriodo(serieCompleta, (m) => m.latP95Ms, mesesRecorte);

  // O painel de status virou detalhe do KPI: 94% e 2xx, entao um grafico
  // proprio gastava um quinto da tela para dizer "quase tudo deu certo".
  const resumoStatus = porStatus
    .slice(0, 6)
    .map((st) => `${st.statusCode}: ${num(st.chamadas)}`)
    .join(' · ');


  // Triagem: o que o dev de plantao precisa abrir. Endpoint com falha de
  // servidor ou p95 alto, com volume suficiente para nao ser ruido.
  // Com recorte, contagem vem da soma dos meses. p95 NAO se soma nem se
  // promedia: exibe o pior mes do recorte, e o rotulo diz isso.
  const t = recorteAtivo
    ? {
        ...totaisBrutos!,
        chamadas: somar(porMes, (m) => m.chamadas),
        erros: somar(porMes, (m) => m.erros),
        latP95Ms: maximo(porMes, (m) => m.latP95Ms),
        taxaErro:
          somar(porMes, (m) => m.chamadas) > 0
            ? somar(porMes, (m) => m.erros) / somar(porMes, (m) => m.chamadas)
            : 0,
      }
    : totaisBrutos;

  const insightErroMes = insightPiorMes(
    porMes,
    (m) => m.taxaErro,
    (v) => pct(v, 1),
    'taxa de erro',
  );
  const insightP95Mes = insightPiorMes(porMes, (m) => m.latP95Ms, ms, 'latência p95');
  const insightEndpoint = insightConcentracao(
    porEndpoint,
    (e) => e.erros5xx,
    (e) => e.endpoint,
    'falhas de servidor',
    { tom: 'risco', piso: 0.3 },
  );

  const precisaAtencao = (e: (typeof porEndpoint)[number]) =>
    e.chamadas >= MIN_CHAMADAS_ALERTA && (e.erros5xx > 0 || e.latP95Ms >= P95_LENTO_MS);

  const precisaAcao = porEndpoint
    .filter((e) => e.chamadas >= MIN_CHAMADAS_ALERTA && (e.erros5xx > 0 || e.latP95Ms >= P95_LENTO_MS))
    .sort((a, b) => b.erros5xx - a.erros5xx || b.latP95Ms - a.latP95Ms)
    .slice(0, 5);

  return (
    <div className="space-y-3">
      <FaixaResumo
        colunas={3}
        carregando={carregando}
        itens={[
          {
            label: 'Requisições no período',
            valor: num(t?.chamadas),
            variacao:
              mesChamadas.anterior != null
                ? {
                    pct: mesChamadas.pct ?? undefined,
                    valor: num(mesChamadas.anterior),
                    rotulo: `período anterior · ${mesChamadas.rotulo}`,
                    melhorQuando: 'sobe',
                  }
                : undefined,
            tooltip: TOOLTIP_TECNICO.chamadas,
          },
          {
            label: 'Requisições com erro',
            valor: pct(t?.taxaErro),
            variacao: {
              valor: `${num(t?.erros5xx)} · 5xx`,
              rotulo: `${num(t?.erros4xx)} · 4xx`,
            },
            tooltip: TOOLTIP_TECNICO.taxaErro,
            tom: (t?.taxaErro ?? 0) > META_TAXA_ERRO_API ? 'risco' : 'positivo',
          },
          {
            label: 'Latência p95',
            valor: ms(t?.latP95Ms),
            variacao:
              mesP95.anterior != null
                ? {
                    pct: mesP95.pct ?? undefined,
                    valor: ms(mesP95.anterior),
                    rotulo: `período anterior · ${mesP95.rotulo}`,
                    melhorQuando: 'desce',
                  }
                : undefined,
            tooltip: TOOLTIP_TECNICO.p95,
            tom: (t?.latP95Ms ?? 0) > META_P95_MS ? 'risco' : 'neutro',
          },
        ]}
      />

      <div className={GRADE_TOPO}>
        {/* Dois graficos lado a lado, cada um com seu proprio eixo, em vez de um
            eixo duplo. Eixo duplo faz a barra "cruzar" a linha por causa da
            escala arbitraria e sugere correlacao que o dado nao sustenta. */}
        <Painel
            className={COL_PRINCIPAL}
            titulo="Taxa de erro por mês"
            resumo={<FraseInsight insight={insightErroMes} />}
            descricao={
              <>
                <TermoColorido cor={COR_ERRO}>Taxa de erro</TermoColorido> por mês. * mês parcial.
              </>
            }
            tooltip={TOOLTIP_TECNICO.taxaErro}
            altura={ALTURA_GRAFICO}
            carregando={carregando}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serieMes} margin={{ top: 6, right: 34, left: 0, bottom: 6 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="label" {...AXIS_STYLE} tickMargin={8} />
                <YAxis {...AXIS_STYLE} padding={{ top: 10 }} tickFormatter={tickPct} width={48} domain={[0, "auto"]} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(v: number) => [`${v.toFixed(2).replace('.', ',')}%`, 'taxa de erro']}
                />
                <Bar
                  dataKey="taxaErroPct"
                  name="taxa de erro"
                  fill={COR_ERRO}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={26}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Painel>

        <Painel
            className={COL_APOIO}
            titulo="Tempo de resposta por mês"
            resumo={<FraseInsight insight={insightP95Mes} />}
            descricao={
              <>
                <TermoColorido cor={GRAY[500]}>p50</TermoColorido> é a mediana;{' '}
                <TermoColorido cor={GRAY[900]}>p95</TermoColorido> é a cauda lenta. * mês parcial.
              </>
            }
            tooltip={TOOLTIP_TECNICO.latencias}
            altura={ALTURA_GRAFICO}
            carregando={carregando}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serieMes} margin={{ top: 6, right: 34, left: 0, bottom: 6 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="label" {...AXIS_STYLE} tickMargin={8} />
                <YAxis
                  {...AXIS_STYLE}
                  tickFormatter={tickSeg}
                  width={54}
                />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, n: string) => [ms(v), n]} />
                <Line
                  type="monotone"
                  dataKey="latP50Ms"
                  name="p50 (mediana)"
                  stroke={GRAY[400]}
                  strokeDasharray="5 3"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: GRAY[400], strokeWidth: 0 }}
                  label={RotuloFinalLinha('p50', GRAY[500], serieMes.length)}
                />
                <Line
                  type="monotone"
                  dataKey="latP95Ms"
                  name="p95"
                  stroke={GRAY[900]}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: GRAY[900], strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  label={RotuloFinalLinha('p95', GRAY[900], serieMes.length)}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Painel>
      </div>

      <Painel
        titulo="Requisições e falhas por endpoint"
        resumo={<FraseInsight insight={insightEndpoint} />}
        descricao={`${num(porEndpoint.length)} endpoints no período.`}
        carregando={carregando}
      >
        <Tabela altura={ALTURA_LISTA}>
          <thead>
            <tr>
              <Th campo="endpoint" estado={tabela} tooltip={TOOLTIP_TECNICO.endpointColuna}>
                Endpoint
              </Th>
              <Th
                campo="ferramenta"
                estado={tabela}
                className="hidden lg:table-cell"
                tooltip={TOOLTIP_COLUNA.ferramentaDoEndpoint}
              >
                Ferramenta
              </Th>
              <Th campo="chamadas" estado={tabela} alinhar="right" tooltip={TOOLTIP_COLUNA.chamadas}>
                Chamadas
              </Th>
              <Th campo="erros5xx" estado={tabela} alinhar="right" tooltip={TOOLTIP_TECNICO.erros5xx}>
                5xx
              </Th>
              <Th
                campo="taxa5xx"
                estado={tabela}
                alinhar="right"
                tooltip={TOOLTIP_COLUNA.taxa5xx}
              >
                Taxa 5xx
              </Th>
              <Th campo="erros4xx" estado={tabela} alinhar="right" tooltip={TOOLTIP_TECNICO.erros4xx}>
                4xx
              </Th>
              <Th campo="latP95Ms" estado={tabela} alinhar="right" tooltip={TOOLTIP_TECNICO.p95}>
                p95
              </Th>
            </tr>
          </thead>
          <tbody>
            {tabela.sorted.map((e) => (
              <Tr key={e.endpoint}>
                <Td className="max-w-[300px] truncate font-mono text-xs text-slate-800">
                  {precisaAtencao(e) && (
                    <span
                      className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                      style={{ background: RISCO }}
                      aria-label="precisa de atenção"
                    />
                  )}
                  <TextoComTooltip texto={e.endpoint}>{e.endpoint}</TextoComTooltip>
                </Td>
                <Td className="hidden whitespace-nowrap text-xs text-slate-500 lg:table-cell">
                  {e.ferramenta ?? '—'}
                </Td>
                <Td alinhar="right">
                  <CelulaBarra valor={e.chamadas} max={maxChamadas} rotulo={num(e.chamadas)} />
                </Td>
                <Td alinhar="right">
                  {e.erros5xx > 0 ? (
                    <CelulaBarra
                      valor={e.erros5xx}
                      max={max5xx}
                      cor={RISCO}
                      rotulo={num(e.erros5xx)}
                    />
                  ) : (
                    <span className="text-slate-300">0</span>
                  )}
                </Td>
                <Td alinhar="right">
                  {/* Badge vermelho so com volume: 100% sobre 3 chamadas nao tem
                      a mesma gravidade que 65% sobre 344. */}
                  {e.taxa5xx >= 0.2 && e.chamadas >= MIN_CHAMADAS_ALERTA ? (
                    <span
                      className="rounded px-1.5 py-0.5 text-xs font-semibold"
                      style={{ background: '#FFF1F2', color: RISCO }}
                    >
                      {pct(e.taxa5xx)}
                    </span>
                  ) : (
                    <span className={e.taxa5xx === 0 ? 'text-slate-300' : 'text-slate-600'}>
                      {pct(e.taxa5xx)}
                    </span>
                  )}
                </Td>
                <Td alinhar="right">
                  {e.erros4xx > 0 ? (
                    <CelulaBarra
                      valor={e.erros4xx}
                      max={max4xx}
                      cor={ALERTA}
                      rotulo={num(e.erros4xx)}
                    />
                  ) : (
                    <span className="text-slate-300">0</span>
                  )}
                </Td>
                <Td alinhar="right">
                  {e.latP95Ms >= 10000 ? (
                    <span className="font-semibold" style={{ color: ALERTA }}>
                      {ms(e.latP95Ms)}
                    </span>
                  ) : (
                    <span className="text-slate-600">{ms(e.latP95Ms)}</span>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Tabela>
      </Painel>
    </div>
  );
};
