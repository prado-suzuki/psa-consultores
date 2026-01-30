import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FileText, LogOut, FolderKanban, BarChart3, Download, ExternalLink } from 'lucide-react';

const statusConfig = {
  planning: { label: 'Planejamento', className: 'bg-slate-100 text-slate-700 hover:bg-slate-100' },
  active: { label: 'Em Andamento', className: 'bg-teal-100 text-teal-700 hover:bg-teal-100' },
  on_hold: { label: 'Em Pausa', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
  completed: { label: 'Concluído', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
} as const;

export default function ClienteDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // Fetch visible projects for this client
  const { data: visibleProjects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['client-visible-projects', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('client_visible_projects')
        .select(`
          id,
          visible_since,
          notes,
          projects (
            id,
            name,
            description,
            status,
            start_date,
            end_date
          )
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch documents for this client
  const { data: clientDocuments, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['client-documents', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('client_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Calculate progress based on project status
  const getProjectProgress = (status: string | null) => {
    switch (status) {
      case 'planning': return 10;
      case 'active': return 50;
      case 'on_hold': return 30;
      case 'completed': return 100;
      default: return 0;
    }
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
                {isLoadingProjects ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    {[1, 2].map((i) => (
                      <Card key={i} className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full mt-2" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-2 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : !visibleProjects || visibleProjects.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">Nenhum projeto atribuído no momento.</p>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {visibleProjects.map((item) => {
                      const project = item.projects;
                      if (!project) return null;
                      
                      const status = (project.status as keyof typeof statusConfig) || 'planning';
                      const progress = getProjectProgress(project.status);
                      
                      return (
                        <Card key={item.id} className="overflow-hidden">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-lg">{project.name}</CardTitle>
                              <Badge className={statusConfig[status]?.className || statusConfig.planning.className}>
                                {statusConfig[status]?.label || 'Em Planejamento'}
                              </Badge>
                            </div>
                            <CardDescription className="mt-2">
                              {project.description || 'Sem descrição disponível'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Progresso</span>
                                <span className="font-medium text-teal-700">{progress}%</span>
                              </div>
                              <Progress value={progress} className="h-2 [&>div]:bg-teal-600" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="mt-6">
                {isLoadingDocuments ? (
                  <Card>
                    <div className="p-4 space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="h-8 w-20" />
                        </div>
                      ))}
                    </div>
                  </Card>
                ) : !clientDocuments || clientDocuments.length === 0 ? (
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
                        {clientDocuments.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <div className="flex items-center">
                                {doc.document_type === 'dashboard' ? (
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
                              {doc.description || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {doc.document_type === 'dashboard' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-teal-600 text-teal-600 hover:bg-teal-50"
                                  onClick={() => doc.url && window.open(doc.url, '_blank')}
                                  disabled={!doc.url}
                                >
                                  <ExternalLink className="mr-1 h-3 w-3" />
                                  Abrir
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-400 text-slate-600 hover:bg-slate-50"
                                  disabled={!doc.file_path}
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
