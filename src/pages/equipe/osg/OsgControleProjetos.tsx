import { ControleDeProjetos } from '@/components/equipe/controle/ControleDeProjetos';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';

/**
 * Controle de Projetos da OSG — a tela que substitui a planilha
 * `Relação de Projetos - OSG.xlsx` (pasta `05_Controle_de_Projetos` do Drive,
 * que é de onde vem o nome desta tela).
 *
 * O grão é o PRODUTO CONTRATADO da OS, não o projeto: a planilha tem uma linha
 * por engajamento do cliente, e `org_projects` tem uma linha por produto
 * contratado (Di Domenico tem quatro, todas na mesma OS). Medido em produção em
 * 15/09/2026, ler `ordem_servico` alcança 84 clientes da OSG contra 23 por
 * `org_projects`.
 *
 * Fica em Projetos e não em Gerencial de propósito: a Gerencial está atrás da
 * `LiderRoute`, e quem alimenta a planilha hoje não é líder.
 *
 * SEIS das catorze colunas da planilha estão aqui, e as outras dependem de
 * migration — código do oneproject, área líder, área tax e o bloco de
 * governança. O que falta, e por quê, está em
 * `docs/osg/relacao-de-projetos-planilha-x-ferramenta.md`.
 *
 * O MIOLO É COMPARTILHADO com a Tax desde 17/09/2026 (ver `ControleDeProjetos`).
 * Esta página é o invólucro de área: escolhe o layout e passa a área, que é o
 * que resolve o cluster.
 */
const OsgControleProjetos = () => {
  // Onze colunas: a barra recolhe sozinha, como nas outras telas largas.
  useTelaDeTrabalhoLargo();

  return (
    <OsgLayout tela="controleDeProjetos">
      <ControleDeProjetos area="osg" />
    </OsgLayout>
  );
};

export default OsgControleProjetos;
