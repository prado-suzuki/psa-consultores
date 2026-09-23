import { useNavigate } from 'react-router-dom';
import { ChevronRight, ClipboardList, FolderKanban, LayoutDashboard, ListChecks, MessagesSquare } from 'lucide-react';

import { JuridicoLayout } from '@/components/equipe/juridico/JuridicoLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Ferramenta {
  id: string;
  titulo: string;
  descricao: string;
  path: string;
  icon: React.ReactNode;
}

const FERRAMENTAS: Ferramenta[] = [
  {
    id: 'dashboard',
    titulo: 'Dashboard',
    descricao: 'Indicadores operacionais da área em tempo real.',
    path: '/equipe/juridico/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    id: 'clientes',
    titulo: 'Clientes',
    descricao: 'Cadastros de clientes e contribuintes.',
    path: '/equipe/juridico/projetos/clientes',
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    id: 'projetos',
    titulo: 'Projetos e tarefas',
    descricao: 'Ordens de serviço, projetos e tarefas por status e responsável.',
    path: '/equipe/juridico/projetos/cadastro',
    icon: <FolderKanban className="h-5 w-5" />,
  },
  {
    id: 'controle',
    titulo: 'Controle de Projetos',
    descricao: 'Onde cada cliente está, um produto contratado por linha.',
    path: '/equipe/juridico/projetos/controle',
    icon: <ListChecks className="h-5 w-5" />,
  },
  {
    id: 'feed',
    titulo: 'Feed',
    descricao: 'Atualizações e conversas dos seus projetos e tarefas.',
    path: '/equipe/juridico/projetos/feed',
    icon: <MessagesSquare className="h-5 w-5" />,
  },
];

const JuridicoBoasVindas = () => {
  const navigate = useNavigate();

  return (
    <JuridicoLayout tela="boasVindas">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FERRAMENTAS.map((f) => (
          <Card
            key={f.id}
            className="cursor-pointer hover:border-primary transition-colors group"
            onClick={() => navigate(f.path)}
          >
            <CardHeader className="pb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                {f.icon}
              </div>
              <CardTitle className="flex items-center justify-between text-base">
                {f.titulo}
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{f.descricao}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </JuridicoLayout>
  );
};

export default JuridicoBoasVindas;
