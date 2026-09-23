import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, ClipboardCheck, Scale, Wrench } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { usePageAccess } from '@/hooks/usePageAccess';
import { useUserAccessibleCategories } from '@/hooks/useUserAccessibleCategories';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo-psa.png';
import { AREAS } from '@/lib/nomeDaArea';

const SLIDE_DURATION_MS = 280;

interface CartaoDeAmbiente {
  id: string;
  label: string;
  description: string;
  path: string;
  iconNode: React.ReactNode;
  visivel: boolean;
}

// O gradiente sai de `--primary`, que sob esta rota ja e a ancora da area.
// Cor de estoque do Tailwind aqui quebra a catraca das familias cruas.
const CAIXA_DO_SELO = 'bg-gradient-to-br from-[#953766] to-[#7b2d54] ring-1 ring-[#953766]/40';

const JuridicoAreaSelector = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { categories, isLoading: carregandoCategorias } = useUserAccessibleCategories();
  const { hasAccess: podeVerOWork, isLoading: carregandoWork } = usePageAccess('/equipe/juridico/work');
  const [slide, setSlide] = useState<'left' | 'right' | null>(null);

  const isLoading = carregandoCategorias || carregandoWork;

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

  const todos: CartaoDeAmbiente[] = [
    {
      id: 'projects',
      label: AREAS.juridicoProjects.nome,
      description: 'Projetos, tarefas e clientes da área Jurídica',
      path: '/equipe/juridico/inicio',
      iconNode: <Scale className="h-6 w-6 text-primary-foreground" />,
      visivel: isAdmin || !!categories?.includes('juridico'),
    },
    {
      id: 'work',
      label: AREAS.juridicoWork.nome,
      description: 'Ferramentas e aplicações desenvolvidas para o Jurídico',
      path: '/equipe/juridico/work',
      iconNode: <Wrench className="h-6 w-6 text-primary-foreground" />,
      visivel: podeVerOWork,
    },
  ];

  const areas = todos.filter((area) => area.visivel);
  const gridCols = areas.length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' : 'md:grid-cols-2';

  return (
    <div className="min-h-screen dark bg-background text-foreground flex items-center justify-center p-4 overflow-hidden">
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
          <h1 className="text-2xl font-bold mb-2">{AREAS.juridico.subtitulo}</h1>
          <p className="text-muted-foreground">Selecione o ambiente de trabalho</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : areas.length === 0 ? (
          <Card className="backdrop-blur-lg max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Nenhum ambiente disponivel</CardTitle>
              <CardDescription className="text-muted-foreground">
                Você ainda não possui acesso a nenhum ambiente desta área.
                Solicite a um administrador a liberação dos acessos necessários.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className={`grid gap-4 ${gridCols}`}>
            {areas.map((area, idx) => (
              <Card
                key={area.id}
                className="backdrop-blur-lg cursor-pointer hover:border-primary transition-all duration-300 group"
                onClick={() => handleAreaClick(area.path, idx, areas.length)}
              >
                <CardHeader className="pb-2">
                  <div className={`w-12 h-12 rounded-lg ${CAIXA_DO_SELO} flex items-center justify-center mb-3`}>
                    {area.iconNode}
                  </div>
                  <CardTitle className="flex items-center justify-between">
                    {area.label}
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
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
            className="text-muted-foreground hover:text-foreground"
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

export default JuridicoAreaSelector;
