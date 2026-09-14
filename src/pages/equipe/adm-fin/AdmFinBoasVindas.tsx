import { ChevronRight, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AdmFinLayout } from '@/components/equipe/adm-fin/AdmFinLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Porta de entrada da Adm & Fin, no padrão do `FiscalBoasVindas`.
 *
 * Um cartão só, e isso é estado do mundo, não descuido: a área nasce com a tela
 * de Clientes. A de Controle de Faturamento entra aqui quando existir, e o
 * grid já está em três colunas para recebê-la.
 */

interface FerramentaAdmFin {
  id: string;
  titulo: string;
  descricao: string;
  path: string;
  icon: React.ReactNode;
}

const FERRAMENTAS: FerramentaAdmFin[] = [
  {
    id: 'clientes',
    titulo: 'Clientes',
    descricao:
      'Cadastro de clientes, contribuintes, OS e faturamento. Sem recorte de cluster: a Adm & Fin enxerga o grupo inteiro.',
    path: '/equipe/adm-fin/clientes',
    icon: <Users className="h-5 w-5 text-primary" />,
  },
];

const AdmFinBoasVindas = () => {
  const navigate = useNavigate();

  return (
    <AdmFinLayout
      title="Bem-vindo à área Adm & Fin"
      subtitle="Escolha uma ferramenta para começar"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FERRAMENTAS.map((f) => (
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
          </Card>
        ))}
      </div>
    </AdmFinLayout>
  );
};

export default AdmFinBoasVindas;
