import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, FileText, LogOut, FolderKanban, BarChart3, Download, ExternalLink } from 'lucide-react';

// Interfaces para dados do cliente
interface ClientProject {
  id: string;
  name: string;
  description: string;
  status: 'em_andamento' | 'analise' | 'concluido';
  progress: number;
}

interface ClientDocument {
  id: string;
  type: 'dashboard' | 'documento';
  name: string;
  description: string;
  url?: string;
}

// Dados mock para demonstração
const mockProjects: ClientProject[] = [
  {
    id: '1',
    name: 'Diagnóstico Fiscal 2024',
    description: 'Análise completa da estrutura fiscal e identificação de oportunidades de otimização tributária.',
    status: 'em_andamento',
    progress: 75,
  },
  {
    id: '2',
    name: 'Reestruturação Societária',
    description: 'Revisão e reorganização da estrutura societária para maior eficiência operacional.',
    status: 'analise',
    progress: 30,
  },
];

const mockDocuments: ClientDocument[] = [
  {
    id: '1',
    type: 'dashboard',
    name: 'Dashboard de Acompanhamento Fiscal',
    description: 'Painel interativo com indicadores fiscais em tempo real',
    url: 'https://exemplo.com/dashboard',
  },
  {
    id: '2',
    type: 'documento',
    name: 'Relatório Trimestral Q4/2024',
    description: 'Análise detalhada do período outubro-dezembro 2024',
  },
  {
    id: '3',
    type: 'documento',
    name: 'Manual de Procedimentos Fiscais',
    description: 'Guia completo de procedimentos e boas práticas',
  },
];

const statusConfig = {
  em_andamento: { label: 'Em Andamento', className: 'bg-teal-100 text-teal-700 hover:bg-teal-100' },
  analise: { label: 'Em Análise', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
  concluido: { label: 'Concluído', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
};

export default function ClienteDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[hsl(210_20%_98%)]">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Área do Cliente</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-foreground">
              Bem-vindo à sua Área do Cliente
            </h2>
            <p className="text-lg text-muted-foreground">
              Aqui você pode abrir chamados, acompanhar solicitações e gerenciar seus documentos.
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <Card className="p-8 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/cliente/novo-chamado')}>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Abrir Chamado</h3>
                <p className="text-muted-foreground">
                  Precisa de ajuda? Abra um novo chamado e nossa equipe entrará em contato.
                </p>
                <Button className="w-full bg-teal-600 hover:bg-teal-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Chamado
                </Button>
              </div>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/cliente/chamados')}>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Meus Chamados</h3>
                <p className="text-muted-foreground">
                  Visualize e acompanhe todos os seus chamados abertos e histórico.
                </p>
                <Button variant="outline" className="w-full border-teal-600 text-teal-600 hover:bg-teal-50">
                  <FileText className="mr-2 h-4 w-4" />
                  Ver Chamados
                </Button>
              </div>
            </Card>
          </div>

          {/* Projects and Documents Section */}
          <div className="mt-12">
            <Tabs defaultValue="projects" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted">
                <TabsTrigger value="projects" className="data-[state=active]:bg-background data-[state=active]:text-teal-700">
                  <FolderKanban className="mr-2 h-4 w-4" />
                  Projetos em Andamento
                </TabsTrigger>
                <TabsTrigger value="documents" className="data-[state=active]:bg-background data-[state=active]:text-teal-700">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Dashboards e Documentos
                </TabsTrigger>
              </TabsList>

              {/* Projects Tab */}
              <TabsContent value="projects" className="mt-6">
                {mockProjects.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">Nenhum projeto em andamento no momento.</p>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {mockProjects.map((project) => (
                      <Card key={project.id} className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                            <Badge className={statusConfig[project.status].className}>
                              {statusConfig[project.status].label}
                            </Badge>
                          </div>
                          <CardDescription className="mt-2">
                            {project.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progresso</span>
                              <span className="font-medium text-teal-700">{project.progress}%</span>
                            </div>
                            <Progress value={project.progress} className="h-2 [&>div]:bg-teal-600" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="mt-6">
                {mockDocuments.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">Nenhum documento disponível no momento.</p>
                  </Card>
                ) : (
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Tipo</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead className="hidden md:table-cell">Descrição</TableHead>
                          <TableHead className="text-right w-[120px]">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockDocuments.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <div className="flex items-center">
                                {doc.type === 'dashboard' ? (
                                  <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                                    <BarChart3 className="h-4 w-4 text-teal-600" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                    <FileText className="h-4 w-4 text-slate-600" />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{doc.name}</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">
                              {doc.description}
                            </TableCell>
                            <TableCell className="text-right">
                              {doc.type === 'dashboard' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-teal-600 text-teal-600 hover:bg-teal-50"
                                  onClick={() => doc.url && window.open(doc.url, '_blank')}
                                >
                                  <ExternalLink className="mr-1 h-3 w-3" />
                                  Abrir
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-400 text-slate-600 hover:bg-slate-50"
                                >
                                  <Download className="mr-1 h-3 w-3" />
                                  Baixar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
