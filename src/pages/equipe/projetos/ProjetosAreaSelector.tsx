import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calculator, Building, ChevronRight } from 'lucide-react';
import logo from '@/assets/logo-psa.png';

interface AreaCard {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
}

const ProjetosAreaSelector = () => {
  const navigate = useNavigate();

  const areas: AreaCard[] = [
    {
      id: 'fiscal',
      label: 'Fiscal',
      description: 'Projetos de Felipe, Washington e Ricardo (ambiente compartilhado)',
      icon: Calculator,
      path: '/equipe/projetos/fiscal/dashboard',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      id: 'fixos',
      label: 'Fixos',
      description: 'Ambiente de projetos fixos da equipe',
      icon: Building,
      path: '/equipe/projetos/fixos/dashboard',
      color: 'from-blue-500 to-indigo-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <img src={logo} alt="PSA Consultores" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Área de Projetos</h1>
          <p className="text-gray-400">Selecione o ambiente de trabalho</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {areas.map((area) => (
            <Card
              key={area.id}
              className="bg-gray-900/50 border-gray-800 backdrop-blur-lg cursor-pointer hover:border-gray-600 transition-all duration-300 group"
              onClick={() => navigate(area.path)}
            >
              <CardHeader className="pb-2">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${area.color} flex items-center justify-center mb-3`}>
                  <area.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-white flex items-center justify-between">
                  {area.label}
                  <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400">
                  {area.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Button 
            variant="ghost" 
            className="text-gray-400 hover:text-white"
            onClick={() => navigate('/equipe')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Trocar de área
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjetosAreaSelector;
