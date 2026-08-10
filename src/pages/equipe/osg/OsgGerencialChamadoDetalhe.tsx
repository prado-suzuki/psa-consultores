import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { ChamadoDetalheContent } from '@/pages/gestao/GestaoDetalhesChamado';

/** Detalhe do chamado dentro da Gerencial da OSG. Ver a versão da Tax. */
const OsgGerencialChamadoDetalhe = () => (
  <OsgLayout title="Detalhes do Chamado" subtitle="Chamado do cliente">
    <ChamadoDetalheContent listaPath="/equipe/osg/gerencial/chamados" />
  </OsgLayout>
);

export default OsgGerencialChamadoDetalhe;
