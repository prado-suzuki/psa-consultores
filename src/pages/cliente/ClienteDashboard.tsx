import {
  CATEGORIAS_DE_PROJETO,
  CATEGORIAS_EM_ORDEM,
  classesDaCategoria,
  rotuloDaCategoria,
} from '@/lib/categoriaDoProjeto';
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDomainClienteDashboard } from "@/hooks/useDomainClienteDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  FileText,
  LogOut,
  FolderKanban,
  ArrowLeft,
  FileUp,
} from "lucide-react";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DashboardFilters } from "@/components/cliente/DashboardFilters";
import { ColetaDocumentosCliente } from "@/components/cliente/ColetaDocumentosCliente";
import { useClienteAtual } from "@/hooks/useClienteAtual";
import { useSolicitacaoAtivaCliente } from "@/hooks/useDocumentoArquivo";
import { chamadoStatusConfig } from "@/lib/chamadoStatusColors";

/**
 * Status do projeto no portal do cliente, nos papéis de status da área.
 *
 * ⚠️ NÃO usa `projetoStatusColors`, e a razão é de dado, não de estilo: aquele
 * mapa serve `org_projects`, cuja primeira etapa é `planned`; esta tela lê
 * `projects`, que grava `planning`. As duas colunas são `text` livre no banco,
 * então nada além do código impede os dois vocabulários de existirem. Unificar é
 * migração de dado, e não cabe numa troca de cor.
 */
/**
 * ⚠️ ESTE MAPA ESTAVA APONTADO PARA A COLUNA ERRADA, e o comentário acima é a
 * história de como isso passou despercebido: ele explica por que os
 * vocabulários de `projects` e `org_projects` divergem, e nenhum dos dois é o
 * que a coluna guarda. Medido em produção em 10/09/2026, `projects.status` tem
 * `Melhorias` (10) e `Diagnóstico` (7) — categoria, não ciclo de vida. As
 * quatro chaves de antes (`planning`, `active`, `on_hold`, `completed`) não
 * casavam com uma linha sequer, então todo projeto caía no fallback.
 *
 * Hoje isso é dormente: `client_visible_projects` está VAZIA, então nenhum
 * cliente vê projeto nenhum. Consertar mesmo assim é o que impede o defeito de
 * nascer pronto no dia em que o primeiro vínculo for criado.
 */
const rotuloDeStatus = rotuloDaCategoria;
const classesDeStatus = classesDaCategoria;

const ticketStatusOptions = [
  { value: "aberto", label: "Aberto" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "resolvido", label: "Resolvido" },
  { value: "fechado", label: "Fechado" },
];

/**
 * O filtro de projeto do portal, e ele tinha o MESMO defeito do da equipe: as
 * quatro opções de ciclo de vida contra uma coluna que guarda categoria. Aqui
 * ninguém reclamou porque `client_visible_projects` está vazia — a tela nunca
 * chegou a listar um projeto.
 */
const projectStatusOptions = CATEGORIAS_EM_ORDEM.map(chave => ({
  value: chave,
  label: CATEGORIAS_DE_PROJETO[chave].rotulo,
}));

export default function ClienteDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  /**
   * A aba Documentos existe nas duas fases em que o cliente tem o que fazer:
   * `enviada` (gaveta de envio em lote) e `em_checklist` (o que falta, por
   * entidade, com envio na linha). Qual das duas telas aparece é decisão de
   * ColetaDocumentosCliente.
   *
   * Antes ela aparecia sempre, e sem pedido aberto anunciava "A PSA solicitou
   * estes documentos" sobre quatro gavetas vazias e trancadas: a tela prometia
   * uma lista que não existia. Rascunho e encerrada continuam escondendo, por
   * isso a lista de estados é explícita em vez de "diferente de encerrada".
   */
  const { data: clienteId } = useClienteAtual();
  const { data: pedido } = useSolicitacaoAtivaCliente(clienteId ?? null);
  const statusDoPedido = pedido?.solicitacao?.status;
  const comDocumentos = statusDoPedido === 'enviada' || statusDoPedido === 'em_checklist';
  // Filter states for Chamados
  const [ticketStatus, setTicketStatus] = useState<string>("__all__");
  const [ticketDateFrom, setTicketDateFrom] = useState<Date | undefined>();
  const [ticketDateTo, setTicketDateTo] = useState<Date | undefined>();

  // Filter states for Projetos
  const [projectStatus, setProjectStatus] = useState<string>("__all__");
  const [projectDateFrom, setProjectDateFrom] = useState<Date | undefined>();
  const [projectDateTo, setProjectDateTo] = useState<Date | undefined>();

  const { ticketsQuery, visibleProjectsQuery } = useDomainClienteDashboard(user?.id);
  const { data: tickets = [], isLoading: isLoadingTickets } = ticketsQuery;
  const { data: visibleProjects, isLoading: isLoadingProjects } = visibleProjectsQuery;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Calculate progress based on project status
  /**
   * O progresso de um projeto — e hoje ele NÃO EXISTE, o que é uma resposta.
   *
   * Esta função derivava um número do `status`: 10% para `planning`, 50% para
   * `active`, 100% para `completed`. Duas coisas erradas de uma vez. A primeira
   * é que `projects.status` guarda CATEGORIA (`Melhorias`, `Diagnóstico`) e não
   * ciclo de vida, então nenhuma das chaves casava e todo projeto caía no
   * `default: return 0` — barra zerada para todos, sempre. A segunda é mais
   * funda: mesmo com o vocabulário certo, "está ativo" não é "está pela metade".
   * Aquilo era um número inventado com cara de medida.
   *
   * Devolver `null` faz a barra sumir em vez de mentir. Progresso de verdade
   * precisaria de tarefas, e os 17 projetos desta tabela têm ZERO — as 954
   * tarefas do produto penduram em `org_projects`, que é outra tabela. Ligar as
   * duas é decisão de produto, não conserto de tela.
   */
  const getProjectProgress = (_status: string | null): number | null => null;

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (ticketStatus !== "__all__" && ticket.status !== ticketStatus) return false;
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
      if (projectStatus !== "__all__" && project.status !== projectStatus) return false;
      const startDate = project.start_date ? new Date(project.start_date) : null;
      if (projectDateFrom && startDate && isBefore(startDate, startOfDay(projectDateFrom))) return false;
      if (projectDateTo && startDate && isAfter(startDate, endOfDay(projectDateTo))) return false;
      return true;
    });
  }, [visibleProjects, projectStatus, projectDateFrom, projectDateTo]);

  // Check for active filters
  const hasTicketFilters = ticketStatus !== "__all__" || !!ticketDateFrom || !!ticketDateTo;
  const hasProjectFilters = projectStatus !== "__all__" || !!projectDateFrom || !!projectDateTo;

  return (
    <div className="min-h-screen bg-[hsl(210_20%_98%)]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Área do Cliente</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao site
            </Button>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 flex-1 flex flex-col">
        <div className="flex-1 flex flex-col">
          {/* Tabs at the top */}
          <Tabs defaultValue="chamados" className="flex-1 flex flex-col">
            <TabsList
              className={`grid w-full max-w-3xl bg-muted mb-6 ${comDocumentos ? 'grid-cols-3' : 'grid-cols-2'}`}
            >
              <TabsTrigger
                value="chamados"
                className="data-[state=active]:bg-background data-[state=active]:text-teal-700"
              >
                <FileText className="mr-2 h-4 w-4" />
                Chamados
              </TabsTrigger>
              <TabsTrigger
                value="projects"
                className="data-[state=active]:bg-background data-[state=active]:text-teal-700"
              >
                <FolderKanban className="mr-2 h-4 w-4" />
                Projetos
              </TabsTrigger>
              {comDocumentos && (
                <TabsTrigger
                  value="documents"
                  className="data-[state=active]:bg-background data-[state=active]:text-teal-700"
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  Documentos
                </TabsTrigger>
              )}
            </TabsList>

            {/* Chamados Tab */}
            <TabsContent value="chamados" className="flex-1 flex flex-col mt-0">
              {/* Header with button */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Meus Chamados</h2>
                  <p className="text-sm text-muted-foreground">Acompanhe o status das suas solicitações</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate("/cliente/novo-chamado")}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Abrir Chamado
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
                  setTicketStatus("__all__");
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
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {tickets.length === 0
                      ? "Você ainda não criou nenhum chamado."
                      : "Nenhum chamado corresponde aos filtros selecionados."}
                  </p>
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
                        <Badge className={chamadoStatusConfig(ticket.status).badge}>
                          {chamadoStatusConfig(ticket.status).label}
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
                  setProjectStatus("__all__");
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
                      ? "Nenhum projeto atribuído no momento."
                      : "Nenhum projeto corresponde aos filtros selecionados."}
                  </p>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {filteredProjects.map((item) => {
                    const project = item.projects;
                    if (!project) return null;

                    const progresso = getProjectProgress(project.status);

                    return (
                      <Card key={item.id} className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                            <Badge className={classesDeStatus(project.status ?? '')}>
                              {rotuloDeStatus(project.status)}
                            </Badge>
                          </div>
                          <CardDescription className="mt-2">
                            {project.description || "Sem descrição disponível"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {/* A barra só aparece quando existe progresso para
                              mostrar. Antes ela vinha de `getProjectProgress(status)`,
                              e o status é CATEGORIA — então ela dizia 0% para todo
                              projeto, sempre. Número inventado sobre a tela do
                              cliente é pior que campo ausente. */}
                          {progresso !== null && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Progresso</span>
                                <span className="font-medium text-accent-d">{progresso}%</span>
                              </div>
                              <Progress value={progresso} className="h-2" />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Documents Tab. Em `enviada`, coleta por grupo (4 gavetas com drag
                and drop) e a lista "Enviados"; em `em_checklist`, o checklist com
                envio por documento que falta. As duas entram por
                ColetaDocumentosCliente, que roteia. Ver `comDocumentos`. */}
            {comDocumentos && (
              <TabsContent value="documents" className="flex-1 mt-0">
                <ColetaDocumentosCliente />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
}
