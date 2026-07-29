import { useNavigate } from 'react-router-dom';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, LayoutDashboard, Users, FolderKanban, Shield, MessageSquare, LineChart } from 'lucide-react';

interface FerramentaOsg {
  id: string;
  titulo: string;
  descricao: string;
  path: string;
  icon: React.ReactNode;
  /** Card visível apenas para líder ou admin (área Gerencial). */
  requiresLider?: boolean;
  /**
   * URL do manual de uso (abre em nova guia), no padrão dos manuais de Dev.
   * Ainda não publicados — enquanto ausente, o card mostra "Manual (em breve)".
   */
  manualUrl?: string;
}

const FERRAMENTAS: FerramentaOsg[] = [
  {
    id: 'dashboard',
    titulo: 'Dashboard',
    descricao: 'Painel principal da área OSG Projects, com indicadores e acompanhamento.',
    path: '/equipe/osg/dashboard',
    icon: <LayoutDashboard className="h-5 w-5 text-osg-600" />,
  },
  {
    id: 'clientes',
    titulo: 'Clientes',
    descricao: 'Cadastro dos clientes da área OSG.',
    path: '/equipe/osg/projetos/clientes',
    icon: <Users className="h-5 w-5 text-osg-600" />,
  },
  {
    id: 'projetos-tarefas',
    titulo: 'Projetos e tarefas',
    descricao: 'Execução organizada por OS, projeto, tarefa e subtarefa.',
    path: '/equipe/osg/projetos/cadastro',
    icon: <FolderKanban className="h-5 w-5 text-osg-600" />,
  },
  {
    id: 'gerencial',
    titulo: 'Gerencial',
    descricao: 'Dashboard de Clientes e OS do seu cluster (acesso de líder).',
    path: '/equipe/osg/gerencial',
    icon: <LineChart className="h-5 w-5 text-osg-600" />,
    requiresLider: true,
  },
  {
    id: 'auditoria',
    titulo: 'Auditoria',
    descricao: 'Histórico, produtividade e acesso do time na área OSG (acesso de líder).',
    path: '/equipe/osg/auditoria',
    icon: <Shield className="h-5 w-5 text-osg-600" />,
    requiresLider: true,
  },
  {
    id: 'chamados',
    titulo: 'Chamados',
    descricao: 'Abertura e acompanhamento de chamados.',
    path: '/equipe/chamados',
    icon: <MessageSquare className="h-5 w-5 text-osg-600" />,
  },
];

const OsgBoasVindas = () => {
  const navigate = useNavigate();
  const { isAdmin, isLider } = useAuth();
  // "Gerencial" só aparece para líder+ (isLider é estrito, não engloba admin).
  const canGerencial = isAdmin || isLider;
  const ferramentas = FERRAMENTAS.filter((f) => !f.requiresLider || canGerencial);

  return (
    <OsgLayout title="Bem-vindo à área OSG" subtitle="Escolha uma ferramenta para começar">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ferramentas.map((f) => (
          <Card
            key={f.id}
            className="cursor-pointer hover:border-osg-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-osg-900/5 transition-all duration-200 group flex flex-col"
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
            <CardContent className="flex-1">
              <CardDescription>{f.descricao}</CardDescription>
            </CardContent>
            {/* Manual no canto inferior esquerdo, no estilo dos manuais de Dev */}
            <div className="px-6 pb-4">
              {f.manualUrl ? (
                <a
                  href={f.manualUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm font-medium text-osg-700 hover:underline"
                >
                  Manual
                </a>
              ) : (
                <span
                  className="text-sm font-medium text-muted-foreground/60 cursor-default"
                  title="Manual em breve"
                  onClick={(e) => e.stopPropagation()}
                >
                  Manual (em breve)
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </OsgLayout>
  );
};

export default OsgBoasVindas;
