import { useNavigate } from 'react-router-dom';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, Users, Landmark, FileSearch, FileText, PieChart, Rocket } from 'lucide-react';

interface Ferramenta {
  id: string;
  titulo: string;
  descricao: string;
  path: string;
  icon: React.ReactNode;
}

const FERRAMENTAS: Ferramenta[] = [
  {
    id: 'onboarding',
    titulo: 'Solicitação Inicial',
    descricao: 'Preparação da solicitação inicial de documentos conforme os produtos contratados.',
    path: '/equipe/osg/work/onboarding',
    icon: <Rocket className="h-5 w-5 text-osg-600" />,
  },
  {
    id: 'cadastro-por-documento',
    titulo: 'Cadastro por Documento',
    descricao: 'Abertura dos arquivos recebidos para cadastrar a entidade a partir deles.',
    path: '/equipe/osg/work/onboarding/cadastro',
    icon: <FileSearch className="h-5 w-5 text-osg-600" />,
  },
  {
    id: 'qualificacao-das-partes',
    titulo: 'Qualificação das Partes',
    descricao: 'Cadastro de sócios (PF/PJ) e vínculos de parentesco por cliente.',
    path: '/equipe/osg/work/qualificacao-das-partes',
    icon: <Users className="h-5 w-5 text-osg-600" />,
  },
  {
    id: 'diagnostico-patrimonial',
    titulo: 'Diagnóstico Patrimonial',
    descricao: 'Cadastro de bens, matrículas, titulares e impedimentos por cliente.',
    path: '/equipe/osg/work/diagnostico-patrimonial',
    icon: <Landmark className="h-5 w-5 text-osg-600" />,
  },
  {
    id: 'controle-matriculas',
    titulo: 'Controle de Matrículas',
    descricao: 'Registro de todas as matrículas, vinculadas ou órfãs, e seus vínculos com bens.',
    path: '/equipe/osg/work/controle-matriculas',
    icon: <FileText className="h-5 w-5 text-osg-600" />,
  },
  {
    id: 'quadro-societario',
    titulo: 'Quadro Societário',
    descricao: 'Distribuição de quotas e participação dos sócios das empresas do cliente.',
    path: '/equipe/osg/work/quadro-societario',
    icon: <PieChart className="h-5 w-5 text-osg-600" />,
  },
];

const OsgWorkDashboard = () => {
  const navigate = useNavigate();

  return (
    <OsgLayout title="OSG Work" subtitle="Ferramentas e aplicações da área OSG">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FERRAMENTAS.map((f) => (
          <Card
            key={f.id}
            className="cursor-pointer hover:border-osg-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-osg-900/5 transition-all duration-200 group"
            onClick={() => navigate(f.path)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-osg-100 flex items-center justify-center">
                  {f.icon}
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-osg-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <CardTitle className="text-base mt-3">{f.titulo}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{f.descricao}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </OsgLayout>
  );
};

export default OsgWorkDashboard;
