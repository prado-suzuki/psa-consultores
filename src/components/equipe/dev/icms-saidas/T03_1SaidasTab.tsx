import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, Package } from 'lucide-react';
import { T03_1_FAMILIAS_MOCK } from './mocks';
import { UnclassifiedGrid, type IcmsGroupedItem } from './UnclassifiedGrid';

type StatusFilter = 'all' | 'validated' | 'pending';

interface T03_1SaidasTabProps {
  enabled: boolean;
  contribuinteId: string;
  dataInicio: string;
  dataFim: string;
  groupedItems: IcmsGroupedItem[];
  isLoading: boolean;
  stats: { total: number; validados: number; pendentes: number };
  statusFilter: StatusFilter;
  onStatusFilterChange: (s: StatusFilter) => void;
  onGroupClick: (group: IcmsGroupedItem) => void;
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export const T03_1SaidasTab = ({
  enabled,
  contribuinteId,
  dataInicio,
  dataFim,
  groupedItems,
  isLoading,
  stats,
  statusFilter,
  onStatusFilterChange,
  onGroupClick,
}: T03_1SaidasTabProps) => {
  const { data: familias, isLoading: isLoadingFamilias } = useQuery({
    queryKey: ['icms-saidas-t03-1', contribuinteId, dataInicio, dataFim],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      return T03_1_FAMILIAS_MOCK;
    },
    enabled,
    staleTime: Infinity,
  });

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
      {/* Cards de família */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(familias ?? T03_1_FAMILIAS_MOCK).map((f) => (
          <Card key={f.nome} className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">{f.nome}</CardTitle>
                <Badge variant="secondary" className="text-xs">{f.qtdProdutos} produtos</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Valor Total" value={fmt(f.valorTotal)} bold />
              <Row label="ICMS Normal" value={fmt(f.icmsNormal)} />
              <Row label="Crédito Presumido" value={fmt(f.creditoPresumido)} />
              <Row label="ICMS a Recolher" value={fmt(f.icmsRecolher)} highlight />
              <Row label="FUNDES" value={fmt(f.fundes)} />
              <Row label="FUNDED" value={fmt(f.funded)} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Não classificados */}
      <UnclassifiedGrid
        title="Produtos não classificados"
        groupedItems={groupedItems}
        isLoading={isLoading || isLoadingFamilias}
        stats={stats}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        onGroupClick={onGroupClick}
      />
    </div>
  );
};

const Row = ({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-xs text-slate-500">{label}</span>
    <span
      className={[
        'font-mono text-xs',
        bold ? 'font-bold text-slate-900 dark:text-slate-100' : '',
        highlight ? 'text-teal-700 font-semibold' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {value}
    </span>
  </div>
);
