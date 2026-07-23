import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserAccessibleCategories } from '@/hooks/useUserAccessibleCategories';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo-psa.png';
import OsgWorkIcon from '@/components/equipe/osg/OsgWorkIcon';
import OsgProjectsIcon from '@/components/equipe/osg/OsgProjectsIcon';

const SLIDE_DURATION_MS = 280;

interface AreaCard {
  id: string;
  label: string;
  description: string;
  path: string;
  color: string;
  category?: string;
  iconNode: React.ReactNode;
}

const OsgAreaSelector = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { categories, isLoading } = useUserAccessibleCategories();
  const [slide, setSlide] = useState<'left' | 'right' | null>(null);

  const handleAreaClick = (path: string, index: number, total: number) => {
    if (slide) return;
    const direction: 'left' | 'right' = total <= 1
      ? 'right'
      : index < total / 2
        ? 'right'
        : 'left';
    setSlide(direction);
    window.setTimeout(() => navigate(path), SLIDE_DURATION_MS);
  };

  const allAreas: AreaCard[] = [
    {
      id: 'projects',
      label: 'OSG Projects',
      description: 'Gestão de projetos, auditoria e operações da área OSG',
      path: '/equipe/osg/inicio',
      color: 'from-[#0a1024] to-[#141a36] ring-1 ring-[#c49a6c]/30',
      category: 'osg',
      iconNode: <OsgProjectsIcon size={46} className="rounded-md" />,
    },
    {
      id: 'work',
      label: 'OSG Work',
      description: 'Ferramentas e aplicações desenvolvidas para a área OSG',
      path: '/equipe/osg/work',
      color: 'from-[#141a36] to-[#0a1024] ring-1 ring-[#c49a6c]/30',
      category: 'osg',
      iconNode: <OsgWorkIcon size={46} className="rounded-md" />,
    },
  ];

  const areas = allAreas.filter(area => {
    if (isAdmin) return true;
    if (!area.category) return true;
    return categories?.includes(area.category);
  });

  const gridCols =
    areas.length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' : 'md:grid-cols-2';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4 overflow-hidden">
      <div
        className={cn(
          'w-full max-w-4xl transition-all ease-in',
          slide === 'left' && '-translate-x-[120%] opacity-0',
          slide === 'right' && 'translate-x-[120%] opacity-0',
        )}
        style={{ transitionDuration: `${SLIDE_DURATION_MS}ms` }}
      >
        <div className="text-center mb-8">
          <img src={logo} alt="PSA Consultores" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Área OSG</h1>
          <p className="text-gray-400">Selecione o ambiente de trabalho</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-40 rounded-xl bg-gray-800/50" />
            ))}
          </div>
        ) : areas.length === 0 ? (
          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-lg max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-white">Nenhuma área disponível</CardTitle>
              <CardDescription className="text-gray-400">
                Você ainda não possui acesso a nenhum ambiente da área OSG.
                Solicite a um administrador a liberação dos acessos necessários.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className={`grid gap-4 ${gridCols}`}>
            {areas.map((area, idx) => (
              <Card
                key={area.id}
                className="bg-gray-900/50 border-gray-800 backdrop-blur-lg cursor-pointer hover:border-gray-600 transition-all duration-300 group"
                onClick={() => handleAreaClick(area.path, idx, areas.length)}
              >
                <CardHeader className="pb-2">
                  <div className={`dark w-12 h-12 rounded-lg bg-gradient-to-br ${area.color} flex items-center justify-center mb-3 overflow-hidden`}>
                    {area.iconNode}
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
        )}

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

export default OsgAreaSelector;
