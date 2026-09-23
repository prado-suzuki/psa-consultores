import { ControleDeProjetos } from '@/components/equipe/controle/ControleDeProjetos';
import { JuridicoLayout } from '@/components/equipe/juridico/JuridicoLayout';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';

const JuridicoControleProjetos = () => {
  useTelaDeTrabalhoLargo();

  return (
    <JuridicoLayout tela="controleDeProjetos">
      <ControleDeProjetos area="juridico" />
    </JuridicoLayout>
  );
};

export default JuridicoControleProjetos;
