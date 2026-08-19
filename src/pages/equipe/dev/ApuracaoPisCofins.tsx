import { DevLayout } from "@/components/equipe/dev/DevLayout";
import { ApuracaoFiltersCard } from "@/components/equipe/dev/pis-cofins/ApuracaoFiltersCard";
import { ApuracaoResults } from "@/components/equipe/dev/pis-cofins/ApuracaoResults";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useApuracaoPisCofinsController } from "@/hooks/useApuracaoPisCofinsController";
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';

const ApuracaoPisCofins = () => {
  // Balancete com duas colunas congeladas e uma coluna por mês em scroll lateral.
  useTelaDeTrabalhoLargo();

  const controller = useApuracaoPisCofinsController();
  return (
    <DevLayout title="Apuração PIS/COFINS" subtitle="Apuração de tributos do cliente com base nos documentos fornecidos">
      <TooltipProvider delayDuration={200}>
        <ApuracaoFiltersCard controller={controller} />
        <ApuracaoResults controller={controller} />
      </TooltipProvider>
    </DevLayout>
  );
};

export default ApuracaoPisCofins;
