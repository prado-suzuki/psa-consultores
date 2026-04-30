import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FamiliaSaidaTab } from './familias/FamiliaSaidaTab';
import type { FamiliaSaida } from '@/hooks/useSaidaIcms';

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
      <TabsList className="grid w-full grid-cols-6 h-10">
        {FAMILIA_TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {FAMILIA_TABS.map((t) => (
        <TabsContent key={t.value} value={t.value} className="mt-4">
          {/* Renderiza só quando aba está ativa para não disparar fetches em paralelo */}
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
