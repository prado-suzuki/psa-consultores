import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FamiliaSaidaTab } from './familias/FamiliaSaidaTab';
import type { FamiliaSaida } from '@/hooks/useSaidaIcms';

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
      <TabsList className="grid w-full grid-cols-2 h-10">
        {FAMILIA_TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
            {t.label}
          </TabsTrigger>
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
