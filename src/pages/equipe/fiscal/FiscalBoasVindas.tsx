import { useNavigate } from 'react-router-dom';
import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, LayoutDashboard, Users, FolderKanban, History, LifeBuoy, LineChart } from 'lucide-react';

interface FerramentaTax {
  id: string;
  titulo: string;
  descricao: string;
  path: string;
  icon: React.ReactNode;
  /** Card visível apenas para líder ou admin (área Gerencial). */
  requiresLider?: boolean;
  /**
   * URL do manual de uso (abre em nova guia), no padrão dos manuais de Dev.
   * Ainda não publicados — ver a task de criação dos manuais em "TAX · Portal".
   * Enquanto ausente, o card mostra "Manual (em breve)".
   */
  manualUrl?: string;
}

const FERRAMENTAS: FerramentaTax[] = [
  {
    id: 'dashboard',
    titulo: 'Dashboard',
    descricao: 'Painel principal da área Tax, com indicadores e acompanhamento.',
    path: '/equipe/tax/dashboard',
    icon: <LayoutDashboard className="h-5 w-5 text-primary" />,
  },
  {
    id: 'clientes',
    titulo: 'Clientes',
    descricao: 'Cadastro dos clientes da área Tax.',
    path: '/equipe/tax/projetos/clientes',
    icon: <Users className="h-5 w-5 text-primary" />,
  },
  {
    id: 'projetos-tarefas',
    titulo: 'Projetos e tarefas',
    descricao: 'Execução organizada por OS, projeto, tarefa e subtarefa.',
    path: '/equipe/tax/projetos/cadastro',
    icon: <FolderKanban className="h-5 w-5 text-primary" />,
  },
  {
    id: 'gerencial',
    titulo: 'Gerencial',
    descricao: 'Dashboard de Clientes e OS do seu cluster (acesso de líder).',
    path: '/equipe/tax/gerencial',
    icon: <LineChart className="h-5 w-5 text-primary" />,
    requiresLider: true,
  },
  {
    id: 'auditoria',
    titulo: 'Logs de Equipe',
    descricao: 'Histórico, produtividade e acesso do time na área Tax (acesso de líder).',
    path: '/equipe/tax/gerencial/logs-equipe',
    icon: <History className="h-5 w-5 text-primary" />,
    requiresLider: true,
  },
  {
    id: 'chamados',
    titulo: 'Chamados',
    descricao: 'Abertura e acompanhamento de chamados.',
    path: '/equipe/chamados',
    icon: <LifeBuoy className="h-5 w-5 text-primary" />,
  },
];

const FiscalBoasVindas = () => {
  const navigate = useNavigate();
  const { isAdmin, isLider } = useAuth();
  // "Gerencial" só aparece para líder+ (isLider é estrito, não engloba admin).
  const canGerencial = isAdmin || isLider;
  const ferramentas = FERRAMENTAS.filter((f) => !f.requiresLider || canGerencial);

  return (
    <FiscalLayout title="Bem-vindo à área Tax" subtitle="Escolha uma ferramenta para começar">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ferramentas.map((f) => (
          <Card
            key={f.id}
            className="cursor-pointer hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group flex flex-col"
            onClick={() => navigate(f.path)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {f.icon}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
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
                  className="text-sm font-medium text-primary hover:underline"
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
    </FiscalLayout>
  );
};

export default FiscalBoasVindas;
