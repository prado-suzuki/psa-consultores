import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FamiliaSaidaTab } from './familias/FamiliaSaidaTab';
import type { FamiliaSaida } from '@/hooks/useSaidaIcms';
import { ICMS_FAMILIA_TAB_TOOLTIPS } from './tooltipContent';
import { InlineTooltip } from './tooltipHelpers';
import { cn } from '@/lib/utils';

interface T03_1SaidasTabProps {
  enabled: boolean;
  contribuinteId: string;
  start_date: string;
  end_date: string;
}

const FAMILIA_TABS: { value: FamiliaSaida; label: string }[] = [
  { value: 'acucar', label: 'Açúcar' },
  { value: 'etanol_interno', label: 'Etanol Interno' },
  { value: 'etanol_interestado', label: 'Etanol Interestadual' },
  { value: 'residuos_producao', label: 'Resíduos Produção' },
  { value: 'sucata', label: 'Sucata' },
  { value: 'biodiesel', label: 'Biodiesel' },
];

export const T03_1SaidasTab = ({
  enabled,
  contribuinteId,
  start_date,
  end_date,
}: T03_1SaidasTabProps) => {
  const [familia, setFamilia] = useState<FamiliaSaida>('acucar');

  return (
    <Tabs value={familia} onValueChange={(v) => setFamilia(v as FamiliaSaida)} className="w-full">
      <TabsList className="grid w-full grid-cols-6 h-10 p-1 bg-white border border-slate-200 rounded-md shadow-sm">
        {FAMILIA_TABS.map((t) => (
          <InlineTooltip key={t.value} content={ICMS_FAMILIA_TAB_TOOLTIPS[t.value]}>
            <TabsTrigger
              value={t.value}
              className={cn(
                'relative isolate h-8 overflow-hidden text-xs sm:text-sm font-medium rounded-sm border border-transparent bg-transparent',
                'text-slate-600',
                'transition-all duration-300 ease-out',
                'hover:-translate-y-0.5 hover:border-primary/10 hover:bg-primary/10 hover:text-primary hover:shadow-sm hover:shadow-primary/10',
                t.value === familia
                  ? 'bg-primary/10 text-primary font-semibold shadow-sm shadow-primary/15 border-primary/15 -translate-y-0.5'
                  : 'bg-transparent',
              )}
            >
              {t.label}
            </TabsTrigger>
          </InlineTooltip>
        ))}
      </TabsList>

      {FAMILIA_TABS.map((t) => (
        <TabsContent key={t.value} value={t.value} className="mt-4">
          {familia === t.value && (
            <FamiliaSaidaTab
              familia={t.value}
              enabled={enabled}
              contribuinteId={contribuinteId}
              start_date={start_date}
              end_date={end_date}
            />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
};
