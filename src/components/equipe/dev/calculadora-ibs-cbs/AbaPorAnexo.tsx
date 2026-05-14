import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';
import { useCalculadoraPorAnexo } from '@/hooks/useCalculadoraIbsCbs';
import type { ApuracaoFiltros } from '@/lib/ibs-cbs/types';
import { fmtBRL, fmtBRLCompact, fmtInt, fmtPct } from '@/lib/ibs-cbs/formatters';
import { BASE_LEGAL } from '@/lib/ibs-cbs/baseLegal';
import {
  NotasMetodologicas,
  NOTA_TRIBUTO_ANTES,
  NOTA_TRIBUTO_DEPOIS,
  NOTA_BASE_SAIDAS,
  NOTA_SEM_ANEXO,
} from './NotasMetodologicas';

const PALETA = ['#0D9488', '#65A30D', '#F2810A', '#3478F5', '#6B46E8', '#0A9BB5', '#E0404A'];

function HeaderTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="underline decoration-dotted decoration-slate-400 underline-offset-2 cursor-help">
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

interface AbaPorAnexoProps {
  filtros: ApuracaoFiltros;
  idContribuinte: string;
}

export function AbaPorAnexo({ filtros, idContribuinte }: AbaPorAnexoProps) {
  const { isLoading, error, data } = useCalculadoraPorAnexo(idContribuinte, filtros);
  const porAnexo = useMemo(() => data?.porAnexo ?? [], [data?.porAnexo]);
  const faturamentoTotal = data?.faturamentoTotal ?? 0;
  const anexoRows = useMemo(
    () =>
      porAnexo.map((a) => {
        return {
          ...a,
          tributoDepoisIbsCbs: a.tributoDepoisIbsCbs,
          cargaDepoisIbsCbs: a.cargaPctIbsCbs,
        };
      }),
    [porAnexo],
  );

  const barData = useMemo(
    () =>
      anexoRows
        .filter((a) => a.tributoDepoisIbsCbs > 0 || a.faturamento > 0)
        .map((a, i) => ({
          name: a.anexo,
          tributoDepois: a.tributoDepoisIbsCbs,
          faturamento: a.faturamento,
          fill: PALETA[i % PALETA.length],
        }))
        .sort((a, b) => b.tributoDepois - a.tributoDepois),
    [anexoRows],
  );

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Falha ao carregar: {(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-900 text-xs">
          Agrupamento por <strong>regra_reducao</strong> (Anexos da LC 214/2025). Cálculo sobre
          saídas — não considera créditos.
        </AlertDescription>
      </Alert>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="underline decoration-dotted decoration-slate-400 underline-offset-2 cursor-help">
                  Apuração por anexo
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-md text-xs leading-relaxed">
                <p className="font-semibold mb-1">Como ler esta tabela</p>
                <p className="mb-1">
                  As notas de saída são agrupadas pelo anexo da Lei Complementar 214/2025 (regra de
                  redução de IBS/CBS). "Sem anexo" = operação sob regra geral (alíquota cheia de
                  27,5%).
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>
                    <strong>Faturamento</strong>: Σ valor bruto das notas do anexo.
                  </li>
                  <li>
                    <strong>% fat.</strong>: participação do anexo no faturamento total.
                  </li>
                  <li>
                    <strong>Alíq. efetiva</strong>: alíquota IBS/CBS já após a redução.
                  </li>
                  <li>
                    <strong>Redução média</strong>: % de desconto sobre a alíquota cheia.
                  </li>
                  <li>
                    <strong>Trib. ANTES</strong>: PIS + COFINS + ICMS + IPI atuais.
                  </li>
                  <li>
                    <strong>Trib. DEPOIS</strong>: somente IBS + CBS.
                  </li>
                  <li>
                    <strong>Carga DEPOIS</strong>: Trib. DEPOIS ÷ Faturamento.
                  </li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead>Anexo</TableHead>
                  <TableHead className="text-right">
                    <HeaderTip label="Faturamento">
                      Soma do valor bruto das notas fiscais de saída do anexo no período.
                    </HeaderTip>
                  </TableHead>
                  <TableHead className="text-right">
                    <HeaderTip label="% fat.">
                      Participação do anexo no faturamento total (Faturamento do anexo ÷ Faturamento
                      total).
                    </HeaderTip>
                  </TableHead>
                  <TableHead className="text-right">
                    <HeaderTip label="Alíq. efetiva">
                      Alíquota IBS/CBS já após a redução do anexo. Quando há ICMS monofásico (ex.:
                      Seção VI), o dashboard agora exibe apenas a parcela de IBS/CBS.
                    </HeaderTip>
                  </TableHead>
                  <TableHead className="text-right">
                    <HeaderTip label="Redução média">
                      Percentual médio de desconto aplicado sobre a alíquota cheia (27,5%) das notas
                      do anexo.
                    </HeaderTip>
                  </TableHead>
                  <TableHead className="text-right">
                    <HeaderTip label="Trib. ANTES">
                      Carga tributária no regime atual: PIS + COFINS + ICMS + IPI das notas do
                      anexo.
                    </HeaderTip>
                  </TableHead>
                  <TableHead className="text-right">
                    <HeaderTip label="Trib. DEPOIS">
                      Carga tributária na reforma exibida no dashboard: somente IBS + CBS.
                    </HeaderTip>
                  </TableHead>
                  <TableHead className="text-right">
                    <HeaderTip label="Carga DEPOIS">
                      Carga efetiva pós-reforma: Trib. DEPOIS ÷ Faturamento do anexo.
                    </HeaderTip>
                  </TableHead>
                  <TableHead className="text-right">
                    <HeaderTip label="NFs">
                      Quantidade de notas fiscais de saída agrupadas no anexo.
                    </HeaderTip>
                  </TableHead>
                  <TableHead className="text-right">
                    <HeaderTip label="Itens">
                      Quantidade de itens (linhas de produto) das notas do anexo.
                    </HeaderTip>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porAnexo.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-400">
                      Sem dados no período
                    </TableCell>
                  </TableRow>
                ) : (
                  anexoRows.map((a, i) => {
                    const base = BASE_LEGAL[a.anexo];
                    const trigger = (
                      <div className="flex items-center gap-2 w-fit">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: PALETA[i % PALETA.length] }}
                        />
                        <span
                          className={`font-medium ${
                            base
                              ? 'underline decoration-dotted decoration-slate-400 underline-offset-2 cursor-help'
                              : ''
                          }`}
                        >
                          {a.anexo}
                        </span>
                      </div>
                    );
                    return (
                      <TableRow key={a.anexo}>
                        <TableCell>
                          {base ? (
                            <Tooltip>
                              <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                              <TooltipContent
                                side="right"
                                className="max-w-sm text-xs leading-relaxed"
                              >
                                <div className="font-semibold mb-1">
                                  {a.anexo} — {base.artigo}
                                </div>
                                <div className="text-slate-900 whitespace-pre-line">
                                  {base.texto}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            trigger
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtBRL(a.faturamento)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtPct(faturamentoTotal > 0 ? a.faturamento / faturamentoTotal : 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {a.aliqMedia.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {(a.reducaoMedia * 100).toFixed(0)}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-orange-700">
                          {fmtBRL(a.tributoAntes)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-teal-700 font-medium">
                          {fmtBRL(a.tributoDepoisIbsCbs)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-700 font-medium"
                          >
                            {fmtPct(a.cargaDepoisIbsCbs)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtInt(a.qtdNFs)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtInt(a.qtdItens)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Tributo IBS/CBS por anexo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {barData.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={barData} margin={{ left: 12, right: 24, top: 8, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F0" vertical={false} />
                <XAxis
                  type="category"
                  dataKey="name"
                  stroke="#7A8899"
                  fontSize={12}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  type="number"
                  tickFormatter={(v) => fmtBRLCompact(v)}
                  stroke="#7A8899"
                  fontSize={12}
                />
                <ChartTooltip
                  formatter={(
                    _value: number,
                    _name: unknown,
                    item: {
                      payload?: { tributoDepois: number; faturamento: number; name: string };
                    },
                  ) => {
                    const p = item.payload;
                    if (!p) return ['', ''];
                    return [
                      `Trib. depois: ${fmtBRL(p.tributoDepois)} · Fat: ${fmtBRL(p.faturamento)}`,
                      p.name,
                    ];
                  }}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E4E9F0' }}
                />
                <Bar dataKey="tributoDepois" maxBarSize={56} radius={[4, 4, 0, 0]}>
                  {barData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <NotasMetodologicas
        notas={[
          {
            titulo: "Anexo (regra de redução)",
            texto: (
              <>
                Cada item é classificado pelo backend conforme regras da LC 214/2025: Anexo I
                (cesta básica — alíquota zero), Anexo IX (defensivos — redução 60%), Anexo XV
                (alíquota zero específica), entre outros. A coluna <code className="font-mono">
                regra_reducao</code> do CSV identifica o anexo.
              </>
            ),
          },
          NOTA_SEM_ANEXO,
          {
            titulo: "Alíq. efetiva × Redução média",
            texto: (
              <>
                <strong>Alíq. efetiva</strong> é a alíquota IBS/CBS já após a redução (ex.: 11%
                para Anexo IX = 27,5% × 0,4). <strong>Redução média</strong> é a % média de
                desconto aplicada sobre a alíquota cheia (ex.: 60% para Anexo IX).
              </>
            ),
          },
          NOTA_TRIBUTO_ANTES,
          NOTA_TRIBUTO_DEPOIS,
          NOTA_BASE_SAIDAS,
        ]}
      />
    </div>
  );
}
