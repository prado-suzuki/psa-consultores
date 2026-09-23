import { ControleDeProjetos } from '@/components/equipe/controle/ControleDeProjetos';
import { AuditoriaLayout } from '@/components/equipe/auditoria/AuditoriaLayout';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';

const AuditoriaControleProjetos = () => {
  useTelaDeTrabalhoLargo();

  return (
    <AuditoriaLayout tela="controleDeProjetos">
      <ControleDeProjetos area="auditoria" />
    </AuditoriaLayout>
  );
};

export default AuditoriaControleProjetos;
