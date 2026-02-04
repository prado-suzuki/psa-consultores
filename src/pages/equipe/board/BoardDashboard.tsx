import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Users, FileText, TrendingUp } from 'lucide-react';

const BoardDashboard = () => {
  const stats = [
    { label: 'Itens Ativos', value: '0', icon: LayoutDashboard, color: 'text-blue-600 bg-blue-500/10' },
    { label: 'Membros', value: '0', icon: Users, color: 'text-emerald-600 bg-emerald-500/10' },
    { label: 'Documentos', value: '0', icon: FileText, color: 'text-amber-600 bg-amber-500/10' },
    { label: 'Progresso', value: '0%', icon: TrendingUp, color: 'text-purple-600 bg-purple-500/10' },
  ];

  return (
    <BoardLayout title="Dashboard" subtitle="Visão geral da área Board">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-white border-slate-200/60">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Welcome Card */}
        <Card className="bg-white border-slate-200/60">
          <CardHeader>
            <CardTitle className="text-slate-900">Bem-vindo à área Board</CardTitle>
            <CardDescription>
              Esta área está em desenvolvimento. Em breve você terá acesso a todas as funcionalidades.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              A área Board será utilizada para gerenciar atividades e projetos específicos da equipe.
            </p>
          </CardContent>
        </Card>
      </div>
    </BoardLayout>
  );
};

export default BoardDashboard;
