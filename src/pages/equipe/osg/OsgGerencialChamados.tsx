import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { ChamadosGestaoContent } from '@/pages/gestao/GestaoChamados';

/**
 * Gestão de Chamados dentro da Gerencial da OSG.
 *
 * Espelha a montagem da Tax, com a moldura da OSG. O miolo é o mesmo arquivo.
 *
 * Hoje esta tela nasce vazia, e isso é esperado: não existe nenhum chamado com
 * cluster OSG (os 329 classificados estão todos no TAX). Verificado em
 * 07/08/2026 e confirmado pelo usuário.
 */
const OsgGerencialChamados = () => (
  <OsgLayout title="Gestão de Chamados" subtitle="Chamados dos clientes do seu cluster">
    <ChamadosGestaoContent basePath="/equipe/osg/gerencial/chamados" />
  </OsgLayout>
);

export default OsgGerencialChamados;
