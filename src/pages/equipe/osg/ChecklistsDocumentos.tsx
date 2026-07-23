import { useState } from 'react';
import { ListChecks, Printer } from 'lucide-react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { ChecklistPendentes } from '@/components/equipe/osg/checklists/ChecklistPendentes';
import { DocumentosClienteChecklist } from '@/components/equipe/osg/checklists/DocumentosClienteChecklist';
import { cn } from '@/lib/utils';

const CHECKLISTS = [
  { value: 'pendentes', label: 'Checklist de Documentos Pendentes' },
  { value: 'planejamento-tributario', label: 'Documentos do Cliente — Planejamento Tributário' },
];

const ChecklistsDocumentos = () => {
  const { clienteId } = useOsgWork();
  const [checklist, setChecklist] = useState(CHECKLISTS[0].value);

  return (
    <OsgLayout
      title="Checklists de Documentos"
      subtitle="Acompanhe os documentos obrigatórios e pendentes de cada cliente"
      headerActions={
        clienteId ? (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="inline-flex w-full rounded-xl border border-osg-200/70 bg-white/70 p-1 shadow-sm sm:w-auto">
          {CHECKLISTS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setChecklist(item.value)}
              className={cn(
                'flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-colors sm:flex-none',
                checklist === item.value ? 'bg-osg-100 text-osg-700 shadow-sm' : 'text-osg-500 hover:bg-osg-50 hover:text-osg-700',
              )}
            >
              {item.value === 'pendentes' ? 'Pendências' : 'Planejamento tributário'}
            </button>
          ))}
        </div>

        {!clienteId ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 py-16 text-center text-muted-foreground">
            <ListChecks className="h-10 w-10 opacity-50" />
            <p className="text-sm">Selecione um cliente na barra acima para ver o checklist de documentos.</p>
          </div>
        ) : checklist === 'pendentes' ? (
          <ChecklistPendentes clienteId={clienteId} />
        ) : checklist === 'planejamento-tributario' ? (
          <DocumentosClienteChecklist clienteId={clienteId} />
        ) : null}
      </div>
    </OsgLayout>
  );
};

export default ChecklistsDocumentos;
