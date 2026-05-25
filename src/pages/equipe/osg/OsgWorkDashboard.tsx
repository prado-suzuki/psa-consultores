import { useNavigate } from 'react-router-dom';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, Users } from 'lucide-react';

interface Ferramenta {
  id: string;
  titulo: string;
  descricao: string;
  path: string;
  icon: React.ReactNode;
}

const FERRAMENTAS: Ferramenta[] = [
  {
    id: 'quadro-societario',
    titulo: 'Quadro Societário',
    descricao: 'Cadastro de sócios (PF/PJ) e vínculos de parentesco por cliente.',
    path: '/equipe/osg/work/quadro-societario',
    icon: <Users className="h-5 w-5 text-orange-600" />,
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
            className="cursor-pointer hover:border-orange-300 hover:shadow-md transition-all group"
            onClick={() => navigate(f.path)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  {f.icon}
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all" />
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
