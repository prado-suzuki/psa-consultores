import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { T03_1_RESUMO_MOCK, T03_1_LINHAS_MOCK, compIndex, type T031Linha } from './mocks';

interface T03_1SaidasTabProps {
  enabled: boolean;
  contribuinteId: string;
  dataInicio: string;
  dataFim: string;
  onLineClick: (linha: T031Linha) => void;
}

const fmt = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtPct = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
const dash = (v: string | null | undefined) => (v && v.length ? v : '—');

const FAMILIAS_T031 = ['Açúcar', 'Etanol Interno', 'Etanol Interestadual', 'Biodiesel'];
const SEM_CLASS = '__SEM_CLASSIFICACAO__';

export const T03_1SaidasTab = ({ enabled, onLineClick }: T03_1SaidasTabProps) => {
  const linhas = T03_1_LINHAS_MOCK;

  const sortedLinhas = useMemo(() => {
    const parseData = (d: string) => {
      const [dd, mm, yyyy] = d.split('/');
      return new Date(`${yyyy}-${mm}-${dd}`).getTime();
    };
    return [...linhas].sort((a, b) => {
      const c = compIndex(a.competencia) - compIndex(b.competencia);
      if (c !== 0) return c;
      return parseData(a.data) - parseData(b.data);
    });
  }, [linhas]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { TODOS: linhas.length, [SEM_CLASS]: 0 };
    FAMILIAS_T031.forEach((f) => (map[f] = 0));
    linhas.forEach((l) => {
      if (l.familia === null) map[SEM_CLASS] += 1;
      else if (map[l.familia] !== undefined) map[l.familia] += 1;
    });
    return map;
  }, [linhas]);

  const [familiaFiltro, setFamiliaFiltro] = useMemoState('TODOS');
  const linhasFiltradas = useMemo(() => {
    if (familiaFiltro === 'TODOS') return sortedLinhas;
    if (familiaFiltro === SEM_CLASS) return sortedLinhas.filter((l) => l.familia === null);
    return sortedLinhas.filter((l) => l.familia === familiaFiltro);
  }, [sortedLinhas, familiaFiltro]);

  const totais = useMemo(() => {
    return T03_1_RESUMO_MOCK.reduce(
      (acc, r) => ({
        icmsNormal: acc.icmsNormal + r.icmsNormal,
        icmsRecolher: acc.icmsRecolher + r.icmsRecolher,
        fundes: acc.fundes + r.fundes,
        funded: acc.funded + r.funded,
      }),
      { icmsNormal: 0, icmsRecolher: 0, fundes: 0, funded: 0 },
    );
  }, []);

  if (!enabled) {
    return (
      <Card className="border-slate-200 border-dashed">
        <CardContent className="p-12 text-center">
          <Calculator className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">Selecione os filtros e clique em Buscar para carregar as saídas recalculadas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo mensal */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Resumo Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead>Competência</TableHead>
                  <TableHead className="text-right">ICMS Normal</TableHead>
                  <TableHead className="text-right">ICMS a Recolher</TableHead>
                  <TableHead className="text-right">FUNDES</TableHead>
                  <TableHead className="text-right">FUNDED</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {T03_1_RESUMO_MOCK.map((r) => (
                  <TableRow key={r.competencia}>
                    <TableCell className="font-medium">{r.competencia}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.icmsNormal)}</TableCell>
                    <TableCell className="text-right font-mono text-teal-700">{fmt(r.icmsRecolher)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.fundes)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.funded)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-100 hover:bg-slate-100 border-t-2 border-slate-300">
                  <TableCell className="font-bold">TOTAL</TableCell>
                  <TableCell className="text-right font-mono font-bold">{fmt(totais.icmsNormal)}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-teal-700">{fmt(totais.icmsRecolher)}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{fmt(totais.fundes)}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{fmt(totais.funded)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pills de família */}
      <div className="flex flex-wrap gap-2">
        <PillButton active={familiaFiltro === 'TODOS'} onClick={() => setFamiliaFiltro('TODOS')}>
          Todos <span className="ml-1.5 opacity-70">({counts.TODOS})</span>
        </PillButton>
        {FAMILIAS_T031.map((f) => (
          <PillButton key={f} active={familiaFiltro === f} onClick={() => setFamiliaFiltro(f)}>
            {f} <span className="ml-1.5 opacity-70">({counts[f]})</span>
          </PillButton>
        ))}
        <PillButton
          active={familiaFiltro === SEM_CLASS}
          onClick={() => setFamiliaFiltro(SEM_CLASS)}
          variant="warning"
        >
          Não classificados <span className="ml-1.5 opacity-70">({counts[SEM_CLASS]})</span>
        </PillButton>
      </div>

      {/* Tabela principal */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-[160px]">Família</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>NF</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>CFOP</TableHead>
                  <TableHead>NCM</TableHead>
                  <TableHead>Cód. Produto</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Valor Mercadoria</TableHead>
                  <TableHead>Incidência ICMS</TableHead>
                  <TableHead className="text-right">BC</TableHead>
                  <TableHead className="text-right">Alíquota</TableHead>
                  <TableHead className="text-right">ICMS Normal</TableHead>
                  <TableHead className="text-right">% Benefício</TableHead>
                  <TableHead className="text-right">Valor Crédito</TableHead>
                  <TableHead className="text-right">ICMS a Recolher</TableHead>
                  <TableHead className="text-right">FUNDES</TableHead>
                  <TableHead className="text-right">FUNDED</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={19} className="text-center text-slate-500 py-8">
                      Nenhuma linha para o filtro selecionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  linhasFiltradas.map((l, idx) => {
                    const naoClass = l.familia === null;
                    return (
                      <TableRow
                        key={`${l.nf}-${l.codProduto}-${idx}`}
                        className={cn(
                          'cursor-pointer',
                          naoClass ? 'bg-amber-50/40 hover:bg-amber-100/60' : 'hover:bg-slate-50',
                        )}
                        onClick={() => onLineClick(l)}
                      >
                        <TableCell>
                          {naoClass ? (
                            <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                              Não classificado
                            </Badge>
                          ) : (
                            <span className="text-sm font-medium text-slate-700">{l.familia}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{l.competencia}</TableCell>
                        <TableCell className="font-mono text-xs">{l.nf}</TableCell>
                        <TableCell className="text-sm">{l.data}</TableCell>
                        <TableCell><Badge variant="outline" className="font-mono">{l.cfop}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{l.ncm}</TableCell>
                        <TableCell className="font-mono text-xs">{l.codProduto}</TableCell>
                        <TableCell className="text-xs text-slate-600 max-w-[200px] truncate">{l.descricao}</TableCell>
                        <TableCell className="text-sm font-medium text-slate-900 max-w-[240px] truncate">{l.produto}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(l.valorMercadoria)}</TableCell>
                        <TableCell className="text-sm">{dash(l.incidencia)}</TableCell>
                        <Cell muted={naoClass}>{fmt(l.bc)}</Cell>
                        <Cell muted={naoClass}>{fmtPct(l.aliquota)}</Cell>
                        <Cell muted={naoClass}>{fmt(l.icmsNormal)}</Cell>
                        <Cell muted={naoClass}>{fmtPct(l.percBeneficio)}</Cell>
                        <Cell muted={naoClass}>{fmt(l.valorCredito)}</Cell>
                        <Cell muted={naoClass} className="text-teal-700 font-semibold">{fmt(l.icmsRecolher)}</Cell>
                        <Cell muted={naoClass}>{fmt(l.fundes)}</Cell>
                        <Cell muted={naoClass}>{fmt(l.funded)}</Cell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper hook (useState wrapper to keep file self-contained)
import { useState } from 'react';
function useMemoState<T>(initial: T) {
  return useState<T>(initial);
}

const PillButton = ({
  active,
  onClick,
  children,
  variant = 'default',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'warning';
}) => (
  <Button
    type="button"
    size="sm"
    variant={active ? 'default' : 'outline'}
    onClick={onClick}
    className={cn(
      'h-8',
      !active && variant === 'warning' && 'border-amber-300 text-amber-700 hover:bg-amber-50',
      active && variant === 'warning' && 'bg-amber-600 hover:bg-amber-700',
    )}
  >
    {children}
  </Button>
);

const Cell = ({
  children,
  muted,
  className,
}: {
  children: React.ReactNode;
  muted?: boolean;
  className?: string;
}) => (
  <TableCell
    className={cn(
      'text-right font-mono text-sm',
      muted && 'text-slate-400',
      className,
    )}
  >
    {children}
  </TableCell>
);
