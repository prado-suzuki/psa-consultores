import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator } from 'lucide-react';
import { T03_2_FAMILIAS_MOCK, ST_CFOPS } from './mocks';
import { UnclassifiedGrid, type IcmsGroupedItem } from './UnclassifiedGrid';

interface T03_2SaidasStTabProps {
  enabled: boolean;
  contribuinteId: string;
  dataInicio: string;
  dataFim: string;
  allGroupedItems: IcmsGroupedItem[];
  isLoading: boolean;
  onGroupClick: (group: IcmsGroupedItem) => void;
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtPct = (v: number) => `${v.toFixed(2)}%`;

export const T03_2SaidasStTab = ({
  enabled,
  contribuinteId,
  dataInicio,
  dataFim,
  allGroupedItems,
  isLoading,
  onGroupClick,
}: T03_2SaidasStTabProps) => {
  const { data: familias, isLoading: isLoadingFamilias } = useQuery({
    queryKey: ['icms-saidas-t03-2', contribuinteId, dataInicio, dataFim],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      return T03_2_FAMILIAS_MOCK;
    },
    enabled,
    staleTime: Infinity,
  });

  // Filtra apenas CFOPs ST sobre a lista global de produtos não classificados
  const stItems = useMemo(
    () => allGroupedItems.filter((g) => ST_CFOPS.includes(g.cfop)),
    [allGroupedItems],
  );

  if (!enabled) {
    return (
      <Card className="border-slate-200 border-dashed">
        <CardContent className="p-12 text-center">
          <Calculator className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">Selecione os filtros e clique em Buscar para carregar as saídas ST.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards ST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(familias ?? T03_2_FAMILIAS_MOCK).map((f) => (
          <Card key={f.nome} className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">{f.nome}</CardTitle>
                <Badge variant="secondary" className="text-xs">{f.qtdProdutos} produtos</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Valor Total" value={fmt(f.valorTotal)} bold />
              <Row label="BC ST" value={fmt(f.bcSt)} />
              <Row label="ICMS ST" value={fmt(f.icmsSt)} highlight />
              <Row label="MVA Ponderada" value={fmtPct(f.mvaPonderada)} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Não classificados ST — sem stats cards (filtro ST distorce contagens) */}
      <UnclassifiedGrid
        title="Produtos não classificados ST"
        groupedItems={stItems}
        isLoading={isLoading || isLoadingFamilias}
        showStats={false}
        showStatusFilter={false}
        showActionButtons={false}
        onGroupClick={onGroupClick}
        emptyMessage="Nenhum produto ST pendente"
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
