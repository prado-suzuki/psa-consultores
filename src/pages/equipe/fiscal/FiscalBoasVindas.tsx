import { useNavigate } from 'react-router-dom';
import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, LayoutDashboard, Users, FolderKanban, LifeBuoy, LineChart } from 'lucide-react';
import { linkEspelhado } from '@/lib/areaTheme';

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

/**
 * Os cartões da entrada da Tax.
 *
 * AS DESCRIÇÕES são as da revisão de conteúdo da coordenação (14/09/2026), pela
 * régua "o subtítulo responde, de forma concreta, o que o usuário encontra ou faz
 * naquela tela". O que elas corrigem, uma a uma, está no motivo de cada linha do
 * plano em `docs/sprints/sprint-13/PLANO_ajustes-area-tax.md`.
 *
 * LOGS DE USO SAIU DAQUI. Ele abria a mesma tela que o item "Logs de Uso" dentro
 * de Gerencial — dois caminhos equivalentes, sem hierarquia, fazendo parecer duas
 * funções diferentes. A coordenação pediu uma localização principal, e escolheu
 * Gerencial. A rota `/equipe/tax/gerencial/logs-equipe` continua igual.
 */
const FERRAMENTAS: FerramentaTax[] = [
  {
    id: 'dashboard',
    titulo: 'Dashboard',
    descricao: 'Acompanhe os principais indicadores operacionais da área Tax.',
    path: '/equipe/tax/dashboard',
    icon: <LayoutDashboard className="h-5 w-5 text-primary" />,
  },
  {
    id: 'clientes',
    titulo: 'Clientes',
    descricao: 'Consulte e gerencie os cadastros de clientes e contribuintes.',
    path: '/equipe/tax/projetos/clientes',
    icon: <Users className="h-5 w-5 text-primary" />,
  },
  {
    id: 'projetos-tarefas',
    titulo: 'Projetos e tarefas',
    // "ordem de serviço" por extenso: é a primeira ocorrência da sigla na área, e
    // a coordenação pede expandi-la antes de usar "OS" solto.
    descricao: 'Acompanhe a execução por ordem de serviço, projeto, tarefa e subtarefa.',
    path: '/equipe/tax/projetos/cadastro',
    icon: <FolderKanban className="h-5 w-5 text-primary" />,
  },
  {
    id: 'gerencial',
    titulo: 'Gerencial',
    descricao: 'Acompanhe clientes, ordens de serviço, chamados e atividades do seu cluster.',
    path: '/equipe/tax/gerencial',
    icon: <LineChart className="h-5 w-5 text-primary" />,
    requiresLider: true,
  },
  {
    id: 'chamados',
    titulo: 'Chamados',
    descricao: 'Consulte os chamados da equipe, acompanhe o status e atribua responsáveis.',
    // Espelhada: leva a cor E a lista desta área. Ver `src/lib/areaTheme.ts`.
    path: linkEspelhado('/equipe/chamados', 'tax'),
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
    <FiscalLayout tela="boasVindas">
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
            {/* Manual no canto inferior esquerdo, no estilo dos manuais de Dev.
                SÓ APARECE QUANDO EXISTE, decisão da coordenação em 14/09/2026:
                nenhum card tem `manualUrl` hoje, então os cinco mostravam
                "Manual (em breve)" — item recorrente que ocupa espaço e promete
                uma ação que não pode ser concluída. Some o BLOCO inteiro, não só
                o texto: deixar o `div` vazio manteria o respiro no rodapé do
                cartão. Volta sozinho quando o primeiro manual for publicado. */}
            {f.manualUrl && (
              <div className="px-6 pb-4">
                <a
                  href={f.manualUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Manual
                </a>
              </div>
            )}
          </Card>
        ))}
      </div>
    </FiscalLayout>
  );
};

export default FiscalBoasVindas;
