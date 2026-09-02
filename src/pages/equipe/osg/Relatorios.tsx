import { useState } from 'react';
import { FolderArchive, Printer } from 'lucide-react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { DiagnosticoPatrimonialReport } from '@/components/equipe/osg/relatorios/DiagnosticoPatrimonialReport';
import { SocietarioReport } from '@/components/equipe/osg/relatorios/SocietarioReport';
import { FiscalReport } from '@/components/equipe/osg/relatorios/FiscalReport';
import { GerarApresentacaoMenu } from '@/components/equipe/osg/relatorios/GerarApresentacao';

const RELATORIOS = [
  { value: 'dp', label: 'Diagnóstico Patrimonial' },
  { value: 'societario', label: 'Quadro Societário / Organograma' },
  { value: 'fiscal', label: 'Abertura de Demanda — Planejamento Tributário' },
];

const Relatorios = () => {
  const { clienteId } = useOsgWork();
  const [relatorio, setRelatorio] = useState(RELATORIOS[0].value);

  return (
    <OsgLayout
      title="Relatórios"
      subtitle="Relatórios da área OSG Work, por cliente"
      headerActions={
        clienteId ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
            <GerarApresentacaoMenu clienteId={clienteId} />
          </div>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Label className="text-sm font-semibold text-muted-foreground sm:w-24">Relatório</Label>
          <Select value={relatorio} onValueChange={setRelatorio}>
            <SelectTrigger className="w-full sm:max-w-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RELATORIOS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {!clienteId ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 py-16 text-center text-muted-foreground">
            <FolderArchive className="h-10 w-10 opacity-50" />
            <p className="text-sm">Selecione um cliente na barra acima para gerar o relatório.</p>
          </div>
        ) : relatorio === 'dp' ? (
          <DiagnosticoPatrimonialReport clienteId={clienteId} />
        ) : relatorio === 'societario' ? (
          <SocietarioReport clienteId={clienteId} />
        ) : relatorio === 'fiscal' ? (
          <FiscalReport clienteId={clienteId} />
        ) : null}
      </div>
    </OsgLayout>
  );
};

export default Relatorios;
