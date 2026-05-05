import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FamiliaSaidaTab } from './familias/FamiliaSaidaTab';
import type { FamiliaSaida } from '@/hooks/useSaidaIcms';
import { ICMS_FAMILIA_TAB_TOOLTIPS } from './tooltipContent';
import { InlineTooltip } from './tooltipHelpers';
import { cn } from '@/lib/utils';

interface T03_2SaidasStTabProps {
  enabled: boolean;
  contribuinteId: string;
  dataInicio: string;
  dataFim: string;
}

type FamiliaSaidaSt = Extract<FamiliaSaida, 'acucar_st' | 'etanol_interestado_st'>;

const FAMILIA_TABS: { value: FamiliaSaidaSt; label: string }[] = [
  { value: 'acucar_st', label: 'Açúcar ST' },
  { value: 'etanol_interestado_st', label: 'Etanol Interestadual ST' },
];

export const T03_2SaidasStTab = ({
  enabled,
  contribuinteId,
  dataInicio,
  dataFim,
}: T03_2SaidasStTabProps) => {
  const [familia, setFamilia] = useState<FamiliaSaidaSt>('acucar_st');

  return (
    <Tabs value={familia} onValueChange={(v) => setFamilia(v as FamiliaSaidaSt)} className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm">
        {FAMILIA_TABS.map((t) => (
          <InlineTooltip key={t.value} content={ICMS_FAMILIA_TAB_TOOLTIPS[t.value]}>
            <TabsTrigger
              value={t.value}
              className={cn(
                'relative h-8 text-xs sm:text-sm font-medium rounded-sm bg-transparent',
                'text-slate-600 dark:text-slate-300',
                'transition-all duration-300 ease-out',
                'hover:bg-primary hover:text-primary-foreground hover:shadow-sm hover:shadow-primary/20',
                'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold',
                'data-[state=active]:shadow-sm data-[state=active]:shadow-primary/30',
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
              dataInicio={dataInicio}
              dataFim={dataFim}
            />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
};
