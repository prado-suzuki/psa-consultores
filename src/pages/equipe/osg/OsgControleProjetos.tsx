import { OsgLayout } from '@/components/equipe/osg/OsgLayout';

/**
 * Controle de Projetos da OSG — a tela que substitui a planilha
 * `Relação de Projetos - OSG.xlsx` (pasta `05_Controle_de_Projetos` do Drive,
 * que é de onde vem o nome desta tela).
 *
 * O grão é a ORDEM DE SERVIÇO, não o projeto: a planilha tem uma linha por
 * engajamento do cliente, e `org_projects` tem uma linha por produto contratado
 * (Di Domenico tem quatro, todas na mesma OS). Medido em produção em 15/09/2026,
 * ler `ordem_servico` alcança 84 clientes da OSG contra 23 por `org_projects`.
 *
 * Fica em Projetos e não em Gerencial de propósito: a Gerencial está atrás da
 * `LiderRoute`, e quem alimenta a planilha hoje não é líder.
 *
 * Análise e o que ainda depende de migration: `docs/osg/relacao-de-projetos-planilha-x-ferramenta.md`.
 */
const OsgControleProjetos = () => (
  <OsgLayout title="Controle de Projetos" subtitle="Onde cada cliente está, por ordem de serviço">
    <div />
  </OsgLayout>
);

export default OsgControleProjetos;
