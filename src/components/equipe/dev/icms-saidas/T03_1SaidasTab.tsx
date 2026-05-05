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
  dataInicio: string;
  dataFim: string;
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
  dataInicio,
  dataFim,
}: T03_1SaidasTabProps) => {
  const [familia, setFamilia] = useState<FamiliaSaida>('acucar');

  return (
    <Tabs value={familia} onValueChange={(v) => setFamilia(v as FamiliaSaida)} className="w-full">
      <TabsList className="grid w-full grid-cols-6 h-11 p-0 bg-transparent border-b border-slate-200 dark:border-slate-700 rounded-none gap-1">
        {FAMILIA_TABS.map((t) => (
          <InlineTooltip key={t.value} content={ICMS_FAMILIA_TAB_TOOLTIPS[t.value]}>
            <TabsTrigger
              value={t.value}
              className={cn(
                'relative h-11 text-xs sm:text-sm font-medium rounded-none bg-transparent shadow-none',
                'text-slate-500 dark:text-slate-400',
                'transition-all duration-300 ease-out',
                'hover:text-primary hover:bg-primary/5',
                'data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold',
                'data-[state=active]:shadow-none',
                'after:content-[""] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[2px] after:rounded-full',
                'after:bg-primary after:scale-x-0 after:origin-center after:transition-transform after:duration-300',
                'data-[state=active]:after:scale-x-100',
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
