import { useState, useMemo } from 'react';
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
import { Plus, FileText, LogOut, FolderKanban, BarChart3, Download, ExternalLink, MessageSquare } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardFilters } from '@/components/cliente/DashboardFilters';

const statusConfig = {
  planning: { label: 'Planejamento', className: 'bg-slate-100 text-slate-700 hover:bg-slate-100' },
  active: { label: 'Em Andamento', className: 'bg-teal-100 text-teal-700 hover:bg-teal-100' },
  on_hold: { label: 'Em Pausa', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
  completed: { label: 'Concluído', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
} as const;

const ticketStatusColors: Record<string, string> = {
  aberto: 'bg-blue-100 text-blue-700',
  em_andamento: 'bg-amber-100 text-amber-700',
  resolvido: 'bg-emerald-100 text-emerald-700',
  fechado: 'bg-slate-100 text-slate-700',
};

const ticketStatusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};

const ticketStatusOptions = [
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'resolvido', label: 'Resolvido' },
  { value: 'fechado', label: 'Fechado' },
];

const projectStatusOptions = [
  { value: 'planning', label: 'Planejamento' },
  { value: 'active', label: 'Em Andamento' },
  { value: 'on_hold', label: 'Em Pausa' },
  { value: 'completed', label: 'Concluído' },
];

const documentTypeOptions = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'report', label: 'Relatório' },
  { value: 'document', label: 'Documento' },
];

export default function ClienteDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // Filter states for Chamados
  const [ticketStatus, setTicketStatus] = useState<string>('__all__');
  const [ticketDateFrom, setTicketDateFrom] = useState<Date | undefined>();
  const [ticketDateTo, setTicketDateTo] = useState<Date | undefined>();

  // Filter states for Projetos
  const [projectStatus, setProjectStatus] = useState<string>('__all__');
  const [projectDateFrom, setProjectDateFrom] = useState<Date | undefined>();
  const [projectDateTo, setProjectDateTo] = useState<Date | undefined>();

  // Filter states for Documentos
  const [docType, setDocType] = useState<string>('__all__');
  const [docDateFrom, setDocDateFrom] = useState<Date | undefined>();
  const [docDateTo, setDocDateTo] = useState<Date | undefined>();

  // Fetch tickets for this client
  const { data: tickets = [], isLoading: isLoadingTickets } = useQuery({
    queryKey: ['client-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

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

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (ticketStatus !== '__all__' && ticket.status !== ticketStatus) return false;
      const createdAt = new Date(ticket.created_at);
      if (ticketDateFrom && isBefore(createdAt, startOfDay(ticketDateFrom))) return false;
      if (ticketDateTo && isAfter(createdAt, endOfDay(ticketDateTo))) return false;
      return true;
    });
  }, [tickets, ticketStatus, ticketDateFrom, ticketDateTo]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    if (!visibleProjects) return [];
    return visibleProjects.filter((item) => {
      const project = item.projects;
      if (!project) return false;
      if (projectStatus !== '__all__' && project.status !== projectStatus) return false;
      const startDate = project.start_date ? new Date(project.start_date) : null;
      if (projectDateFrom && startDate && isBefore(startDate, startOfDay(projectDateFrom))) return false;
      if (projectDateTo && startDate && isAfter(startDate, endOfDay(projectDateTo))) return false;
      return true;
    });
  }, [visibleProjects, projectStatus, projectDateFrom, projectDateTo]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    if (!clientDocuments) return [];
    return clientDocuments.filter((doc) => {
      if (docType !== '__all__' && doc.document_type !== docType) return false;
      const createdAt = doc.created_at ? new Date(doc.created_at) : null;
      if (docDateFrom && createdAt && isBefore(createdAt, startOfDay(docDateFrom))) return false;
      if (docDateTo && createdAt && isAfter(createdAt, endOfDay(docDateTo))) return false;
      return true;
    });
  }, [clientDocuments, docType, docDateFrom, docDateTo]);

  // Check for active filters
  const hasTicketFilters = ticketStatus !== '__all__' || !!ticketDateFrom || !!ticketDateTo;
  const hasProjectFilters = projectStatus !== '__all__' || !!projectDateFrom || !!projectDateTo;
  const hasDocFilters = docType !== '__all__' || !!docDateFrom || !!docDateTo;

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
      <main className="container mx-auto px-4 py-6 flex-1 flex flex-col">
        <div className="flex-1 flex flex-col">
          {/* Tabs at the top */}
          <Tabs defaultValue="chamados" className="flex-1 flex flex-col">
            <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-muted mb-6">
              <TabsTrigger value="chamados" className="data-[state=active]:bg-background data-[state=active]:text-teal-700">
                <FileText className="mr-2 h-4 w-4" />
                Chamados
              </TabsTrigger>
              <TabsTrigger value="projects" className="data-[state=active]:bg-background data-[state=active]:text-teal-700">
                <FolderKanban className="mr-2 h-4 w-4" />
                Projetos
              </TabsTrigger>
              <TabsTrigger value="documents" className="data-[state=active]:bg-background data-[state=active]:text-teal-700">
                <BarChart3 className="mr-2 h-4 w-4" />
                Documentos
              </TabsTrigger>
            </TabsList>

            {/* Chamados Tab */}
            <TabsContent value="chamados" className="flex-1 flex flex-col mt-0">
              {/* Header with button */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Meus Chamados</h2>
                  <p className="text-sm text-muted-foreground">Acompanhe o status das suas solicitações</p>
                </div>
                <Button onClick={() => navigate('/cliente/novo-chamado')} className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Chamado
                </Button>
              </div>

              {/* Filters */}
              <DashboardFilters
                statusOptions={ticketStatusOptions}
                statusValue={ticketStatus}
                onStatusChange={setTicketStatus}
                statusLabel="Status"
                dateFrom={ticketDateFrom}
                dateTo={ticketDateTo}
                onDateFromChange={setTicketDateFrom}
                onDateToChange={setTicketDateTo}
                onClearFilters={() => {
                  setTicketStatus('__all__');
                  setTicketDateFrom(undefined);
                  setTicketDateTo(undefined);
                }}
                hasActiveFilters={hasTicketFilters}
              />

              {/* Tickets list */}
              {isLoadingTickets ? (
                <Card>
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    ))}
                  </div>
                </Card>
              ) : filteredTickets.length === 0 ? (
                <Card className="p-12 text-center">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {tickets.length === 0 ? 'Nenhum chamado encontrado' : 'Nenhum resultado'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {tickets.length === 0 
                      ? 'Você ainda não criou nenhum chamado.' 
                      : 'Nenhum chamado corresponde aos filtros selecionados.'}
                  </p>
                  {tickets.length === 0 && (
                    <Button onClick={() => navigate('/cliente/novo-chamado')} className="bg-teal-600 hover:bg-teal-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Abrir Primeiro Chamado
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => (
                    <Card
                      key={ticket.id}
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/cliente/chamados/${ticket.id}`)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate">{ticket.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{ticket.description}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge className={ticketStatusColors[ticket.status] || 'bg-slate-100 text-slate-700'}>
                          {ticketStatusLabels[ticket.status] || ticket.status}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Projects Tab */}
            <TabsContent value="projects" className="flex-1 mt-0">
              {/* Filters */}
              <DashboardFilters
                statusOptions={projectStatusOptions}
                statusValue={projectStatus}
                onStatusChange={setProjectStatus}
                statusLabel="Status"
                dateFrom={projectDateFrom}
                dateTo={projectDateTo}
                onDateFromChange={setProjectDateFrom}
                onDateToChange={setProjectDateTo}
                onClearFilters={() => {
                  setProjectStatus('__all__');
                  setProjectDateFrom(undefined);
                  setProjectDateTo(undefined);
                }}
                hasActiveFilters={hasProjectFilters}
              />

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
              ) : filteredProjects.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {!visibleProjects || visibleProjects.length === 0 
                      ? 'Nenhum projeto atribuído no momento.' 
                      : 'Nenhum projeto corresponde aos filtros selecionados.'}
                  </p>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {filteredProjects.map((item) => {
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
            <TabsContent value="documents" className="flex-1 mt-0">
              {/* Filters */}
              <DashboardFilters
                statusOptions={documentTypeOptions}
                statusValue={docType}
                onStatusChange={setDocType}
                statusLabel="Tipo"
                dateFrom={docDateFrom}
                dateTo={docDateTo}
                onDateFromChange={setDocDateFrom}
                onDateToChange={setDocDateTo}
                onClearFilters={() => {
                  setDocType('__all__');
                  setDocDateFrom(undefined);
                  setDocDateTo(undefined);
                }}
                hasActiveFilters={hasDocFilters}
              />

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
              ) : filteredDocuments.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {!clientDocuments || clientDocuments.length === 0 
                      ? 'Nenhum documento disponível no momento.' 
                      : 'Nenhum documento corresponde aos filtros selecionados.'}
                  </p>
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
                      {filteredDocuments.map((doc) => (
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
      </main>
    </div>
  );
}
