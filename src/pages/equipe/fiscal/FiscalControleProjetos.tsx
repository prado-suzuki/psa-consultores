import { ControleDeProjetos } from '@/components/equipe/controle/ControleDeProjetos';
import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';

/**
 * Controle de Projetos da Tax: onde cada cliente está, uma linha por produto
 * contratado da OS.
 *
 * O MIOLO É O MESMO DA OSG (ver `ControleDeProjetos`), e não uma cópia: a única
 * diferença entre as duas telas é a área, que resolve o cluster pelo qual as OS
 * entram. A tela nasceu na OSG, onde substitui uma planilha; aqui ela não
 * substitui nada — é a primeira leitura desse recorte que a Tax tem.
 */
const FiscalControleProjetos = () => {
  // Onze colunas: a barra recolhe sozinha, como nas outras telas largas.
  useTelaDeTrabalhoLargo();

  return (
    <FiscalLayout tela="controleDeProjetos">
      <ControleDeProjetos area="tax" />
    </FiscalLayout>
  );
};

export default FiscalControleProjetos;
