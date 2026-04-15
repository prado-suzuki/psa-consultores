import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { TeamRoute } from "@/components/auth/TeamRoute";
import { GestaoAccessGate } from "./components/gestao/GestaoAccessGate";
import { PageAccessGate } from "./components/auth/PageAccessGate";
import { DesempenhoAccessGate } from "./components/desempenho/DesempenhoAccessGate";
import { PageLoader } from "./components/PageLoader";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { queryClient } from "./lib/queryClient";

// Rotas públicas mais visitadas — mantidas como import estático para garantir
// primeiro paint rápido na landing e no fluxo de 404.
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Todas as demais rotas são carregadas sob demanda via React.lazy, gerando
// chunks separados no build. Isso reduz significativamente o bundle inicial
// (antes: ~3.9 MB single chunk) e ativa o code-splitting automático do Vite.

// Público / Auth
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PrimeiroAcesso = lazy(() => import("./pages/PrimeiroAcesso"));
const Missao = lazy(() => import("./pages/Missao"));
const Novidades = lazy(() => import("./pages/Novidades"));
const Ajuda = lazy(() => import("./pages/Ajuda"));

// Portal do Cliente
const ClienteDashboard = lazy(() => import("./pages/cliente/ClienteDashboard"));
const NovoChamado = lazy(() => import("./pages/cliente/NovoChamado"));
const MeusChamados = lazy(() => import("./pages/cliente/MeusChamados"));
const DetalhesChamado = lazy(() => import("./pages/cliente/DetalhesChamado"));

// Admin
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminClientes = lazy(() => import("./pages/admin/AdminClientes"));
const AdminChamados = lazy(() => import("./pages/admin/AdminChamados"));
const AdminDetalhesChamado = lazy(() => import("./pages/admin/AdminDetalhesChamado"));

// Equipe (core)
const EquipeAuth = lazy(() => import("./pages/equipe/EquipeAuth"));
const EquipeChamados = lazy(() => import("./pages/equipe/EquipeChamados"));
const EquipeDetalhesChamado = lazy(() => import("./pages/equipe/EquipeDetalhesChamado"));
const EquipeDashboard = lazy(() => import("./pages/equipe/EquipeDashboard"));
const EquipeProjetos = lazy(() => import("./pages/equipe/EquipeProjetos"));
const EquipeKanban = lazy(() => import("./pages/equipe/EquipeKanban"));
const EquipeSprints = lazy(() => import("./pages/equipe/EquipeSprints"));
const EquipeSprintDetalhes = lazy(() => import("./pages/equipe/EquipeSprintDetalhes"));
const EquipeDaily = lazy(() => import("./pages/equipe/EquipeDaily"));
const EquipeRotinas = lazy(() => import("./pages/equipe/EquipeRotinas"));
const EquipeTarefas = lazy(() => import("./pages/equipe/EquipeTarefas"));
const EquipeNovaTarefa = lazy(() => import("./pages/equipe/EquipeNovaTarefa"));
const EquipeProcessos = lazy(() => import("./pages/equipe/EquipeProcessos"));
const EquipeBiblioteca = lazy(() => import("./pages/equipe/EquipeBiblioteca"));
const EquipeBacklog = lazy(() => import("./pages/equipe/EquipeBacklog"));
const EquipeRelatorios = lazy(() => import("./pages/equipe/EquipeRelatorios"));
const EquipeControleAcessos = lazy(() => import("./pages/equipe/EquipeControleAcessos"));
const DigitalAreaSelector = lazy(() => import("./pages/equipe/DigitalAreaSelector"));

// Equipe > Dev
const DevDashboard = lazy(() => import("./pages/equipe/dev/DevDashboard"));
const NovaFerramenta = lazy(() => import("./pages/equipe/dev/NovaFerramenta"));
const DetalheFerramenta = lazy(() => import("./pages/equipe/dev/DetalheFerramenta"));
const ConsultaXMLs = lazy(() => import("./pages/equipe/dev/ConsultaXMLs"));
const ConsultaEFD = lazy(() => import("./pages/equipe/dev/ConsultaEFD"));
const ConsultaEFDICMS = lazy(() => import("./pages/equipe/dev/ConsultaEFDICMS"));
const ConsultaECD = lazy(() => import("./pages/equipe/dev/ConsultaECD"));
const ConsultaECF = lazy(() => import("./pages/equipe/dev/ConsultaECF"));
const GerenciarDados = lazy(() => import("./pages/equipe/dev/GerenciarDados"));
const ProcessoDifal = lazy(() => import("./pages/equipe/dev/ProcessoDifal"));
const ControlePerdcomp = lazy(() => import("./pages/equipe/dev/ControlePerdcomp"));
const CalculadoraIbsCbs = lazy(() => import("./pages/equipe/dev/CalculadoraIbsCbs"));
const ControleBalancetes = lazy(() => import("./pages/equipe/dev/ControleBalancetes"));
const ApuracaoPisCofins = lazy(() => import("./pages/equipe/dev/ApuracaoPisCofins"));
const MapaNCMPisCofins = lazy(() => import("./pages/equipe/dev/MapaNCMPisCofins"));
const AuditoriaCruzada = lazy(() => import("./pages/equipe/dev/AuditoriaCruzada"));
const CorrecoesSped = lazy(() => import("./pages/equipe/dev/CorrecoesSped"));
const ProcedimentosDev = lazy(() => import("./pages/equipe/dev/ProcedimentosDev"));

// Equipe > Fiscal / Tax
const FiscalDashboard = lazy(() => import("./pages/equipe/fiscal/FiscalDashboard"));
const FiscalDemandasTarefas = lazy(() => import("./pages/equipe/fiscal/FiscalDemandasTarefas"));
const FiscalProjetosCadastro = lazy(() => import("./pages/equipe/fiscal/FiscalProjetosCadastro"));
const FiscalAuditoria = lazy(() => import("./pages/equipe/fiscal/FiscalAuditoria"));
const FiscalCadastrosClientes = lazy(() => import("./pages/equipe/fiscal/FiscalCadastrosClientes"));
const GestaoClientes = lazy(() => import("./pages/equipe/fiscal/GestaoClientes"));

// Equipe > OSG / Board
const OsgDashboard = lazy(() => import("./pages/equipe/osg/OsgDashboard"));
const OsgAuditoria = lazy(() => import("./pages/equipe/osg/OsgAuditoria"));
const BoardDashboard = lazy(() => import("./pages/equipe/board/BoardDashboard"));

// Gestão
const GestaoNovidades = lazy(() => import("./pages/gestao/GestaoNovidades"));
const GestaoChamados = lazy(() => import("./pages/gestao/GestaoChamados"));
const GestaoDetalhesChamado = lazy(() => import("./pages/gestao/GestaoDetalhesChamado"));
const GestaoContatos = lazy(() => import("./pages/gestao/GestaoContatos"));
const GestaoAcessos = lazy(() => import("./pages/gestao/GestaoAcessos"));

// Gerencial > Desempenho
const DesempenhoVisaoGeral = lazy(() => import("./pages/gerencial/desempenho/DesempenhoVisaoGeral"));
const DesempenhoCiclos = lazy(() => import("./pages/gerencial/desempenho/DesempenhoCiclos"));
const DesempenhoMetas = lazy(() => import("./pages/gerencial/desempenho/DesempenhoMetas"));
const DesempenhoFeedbacks = lazy(() => import("./pages/gerencial/desempenho/DesempenhoFeedbacks"));
const DesempenhoReunioes1a1 = lazy(() => import("./pages/gerencial/desempenho/DesempenhoReunioes1a1"));
const DesempenhoEvolucao = lazy(() => import("./pages/gerencial/desempenho/DesempenhoEvolucao"));
const DesempenhoDecisoes = lazy(() => import("./pages/gerencial/desempenho/DesempenhoDecisoes"));
const DesempenhoRelatorios = lazy(() => import("./pages/gerencial/desempenho/DesempenhoRelatorios"));
const MinhaEvolucao = lazy(() => import("./pages/gerencial/desempenho/MinhaEvolucao"));

// Gerencial > Performance
const PerformanceDashboard = lazy(() => import("./pages/gerencial/performance/PerformanceDashboard"));

const App = () => (
  <ErrorBoundary scope="Root">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/missao" element={<Missao />} />
              <Route path="/novidades" element={<Novidades />} />
              <Route path="/ajuda" element={<Ajuda />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/primeiro-acesso" element={<PrimeiroAcesso />} />

              {/* Cliente Routes */}
              <Route path="/cliente" element={<ProtectedRoute><ClienteDashboard /></ProtectedRoute>} />
              <Route path="/cliente/novo-chamado" element={<ProtectedRoute><NovoChamado /></ProtectedRoute>} />
              <Route path="/cliente/chamados" element={<ProtectedRoute><MeusChamados /></ProtectedRoute>} />
              <Route path="/cliente/chamados/:id" element={<ProtectedRoute><DetalhesChamado /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/clientes" element={<AdminRoute><AdminClientes /></AdminRoute>} />
              <Route path="/admin/chamados" element={<AdminRoute><AdminChamados /></AdminRoute>} />
              <Route path="/admin/chamados/:id" element={<AdminRoute><AdminDetalhesChamado /></AdminRoute>} />

              {/* Equipe Routes */}
              <Route path="/equipe" element={<EquipeAuth />} />
              <Route path="/equipe/chamados" element={<TeamRoute><PageAccessGate pagePath="/equipe/chamados"><EquipeChamados /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/chamados/:id" element={<TeamRoute><PageAccessGate pagePath="/equipe/chamados"><EquipeDetalhesChamado /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dashboard" element={<TeamRoute><EquipeDashboard /></TeamRoute>} />
              <Route path="/equipe/relatorios" element={<TeamRoute><EquipeRelatorios /></TeamRoute>} />
              <Route path="/equipe/kanban" element={<TeamRoute><EquipeKanban /></TeamRoute>} />
              <Route path="/equipe/sprints" element={<TeamRoute><EquipeSprints /></TeamRoute>} />
              <Route path="/equipe/sprints/:id" element={<TeamRoute><EquipeSprintDetalhes /></TeamRoute>} />
              <Route path="/equipe/daily" element={<TeamRoute><EquipeDaily /></TeamRoute>} />
              <Route path="/equipe/rotinas" element={<TeamRoute><EquipeRotinas /></TeamRoute>} />
              <Route path="/equipe/tarefas" element={<TeamRoute><EquipeTarefas /></TeamRoute>} />
              <Route path="/equipe/tarefas/nova" element={<TeamRoute><EquipeNovaTarefa /></TeamRoute>} />

              <Route path="/equipe/processos" element={<TeamRoute><EquipeProcessos /></TeamRoute>} />
              <Route path="/equipe/projetos" element={<TeamRoute><EquipeProjetos /></TeamRoute>} />
              <Route path="/equipe/biblioteca" element={<TeamRoute><EquipeBiblioteca /></TeamRoute>} />
              <Route path="/equipe/backlog" element={<TeamRoute><EquipeBacklog /></TeamRoute>} />
              <Route path="/equipe/digital" element={<TeamRoute><DigitalAreaSelector /></TeamRoute>} />
              <Route path="/equipe/dev" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev"><DevDashboard /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dev/nova-ferramenta" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/nova-ferramenta"><NovaFerramenta /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dev/ferramenta/:id" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/ferramenta"><DetalheFerramenta /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dev/consulta-xmls" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/consulta-xmls"><ConsultaXMLs /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dev/consulta-efd" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/consulta-efd"><ConsultaEFD /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dev/consulta-efd-icms" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/consulta-efd-icms"><ConsultaEFDICMS /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dev/consulta-ecd" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/consulta-ecd"><ConsultaECD /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dev/consulta-ecf" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/consulta-ecf"><ConsultaECF /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dev/gerenciar-dados" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/gerenciar-dados"><GerenciarDados /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dev/processo-difal" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/processo-difal"><ProcessoDifal /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dev/controle-perdcomp" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/controle-perdcomp"><ControlePerdcomp /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dev/controle-balancetes" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/controle-balancetes"><ControleBalancetes /></PageAccessGate></TeamRoute>} />
              {/* Redirect legacy route */}
              <Route path="/equipe/dev/gestao-clientes" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/gestao-clientes"><GestaoClientes /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dev/calculadora-ibs-cbs" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/calculadora-ibs-cbs"><CalculadoraIbsCbs /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dev/apuracao-pis-cofins" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/apuracao-pis-cofins"><ApuracaoPisCofins /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dev/mapa-ncm-pis-cofins" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/mapa-ncm-pis-cofins"><MapaNCMPisCofins /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dev/cruzamento-dados" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/cruzamento-dados"><AuditoriaCruzada /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dev/correcoes-sped" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/correcoes-sped"><CorrecoesSped /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/dev/procedimentos" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/procedimentos"><ProcedimentosDev /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/acessos" element={<AdminRoute><EquipeControleAcessos /></AdminRoute>} />

              {/* Gestão Routes - Protected by access gate (admin or with explicit permission) */}
              <Route path="/gestao" element={<GestaoAccessGate><GestaoNovidades /></GestaoAccessGate>} />
              <Route path="/gestao/chamados" element={<GestaoAccessGate><GestaoChamados /></GestaoAccessGate>} />
              <Route path="/gestao/chamados/:id" element={<GestaoAccessGate><GestaoDetalhesChamado /></GestaoAccessGate>} />
              <Route path="/gestao/contatos" element={<GestaoAccessGate><GestaoContatos /></GestaoAccessGate>} />
              <Route path="/gestao/acessos" element={<GestaoAccessGate><GestaoAcessos /></GestaoAccessGate>} />

              {/* Tax (Fiscal) Routes */}
              <Route path="/equipe/tax/dashboard" element={<TeamRoute><PageAccessGate pagePath="/equipe/tax/dashboard"><FiscalDashboard /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/tax/projetos/clientes" element={<TeamRoute><PageAccessGate pagePath="/equipe/tax/projetos/clientes"><FiscalCadastrosClientes /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/tax/projetos/cadastro" element={<TeamRoute><PageAccessGate pagePath="/equipe/tax/projetos/cadastro"><FiscalProjetosCadastro /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/tax/projetos/tarefas" element={<TeamRoute><PageAccessGate pagePath="/equipe/tax/projetos/tarefas"><FiscalDemandasTarefas /></PageAccessGate></TeamRoute>} />

              {/* Tax Auditoria */}
              <Route path="/equipe/tax/auditoria" element={<TeamRoute><PageAccessGate pagePath="/equipe/tax/auditoria"><FiscalAuditoria /></PageAccessGate></TeamRoute>} />

              {/* OSG Routes */}
              <Route path="/equipe/osg/dashboard" element={<TeamRoute><PageAccessGate pagePath="/equipe/osg/dashboard"><OsgDashboard /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/osg/auditoria" element={<TeamRoute><PageAccessGate pagePath="/equipe/osg/auditoria"><OsgAuditoria /></PageAccessGate></TeamRoute>} />

              {/* Board Routes */}
              <Route path="/equipe/board/dashboard" element={<TeamRoute><PageAccessGate pagePath="/equipe/board/dashboard"><BoardDashboard /></PageAccessGate></TeamRoute>} />

              {/* Performance & Desempenho Routes (inside Board) */}
              <Route path="/equipe/board/performance" element={<TeamRoute><DesempenhoAccessGate><PerformanceDashboard /></DesempenhoAccessGate></TeamRoute>} />
              <Route path="/equipe/board/desempenho" element={<TeamRoute><DesempenhoAccessGate><DesempenhoVisaoGeral /></DesempenhoAccessGate></TeamRoute>} />
              <Route path="/equipe/board/desempenho/ciclos" element={<TeamRoute><DesempenhoAccessGate><DesempenhoCiclos /></DesempenhoAccessGate></TeamRoute>} />
              <Route path="/equipe/board/desempenho/metas" element={<TeamRoute><DesempenhoAccessGate><DesempenhoMetas /></DesempenhoAccessGate></TeamRoute>} />
              <Route path="/equipe/board/desempenho/feedbacks" element={<TeamRoute><DesempenhoAccessGate><DesempenhoFeedbacks /></DesempenhoAccessGate></TeamRoute>} />
              <Route path="/equipe/board/desempenho/1a1" element={<TeamRoute><DesempenhoAccessGate><DesempenhoReunioes1a1 /></DesempenhoAccessGate></TeamRoute>} />
              <Route path="/equipe/board/desempenho/evolucao" element={<TeamRoute><DesempenhoAccessGate><DesempenhoEvolucao /></DesempenhoAccessGate></TeamRoute>} />
              <Route path="/equipe/board/desempenho/decisoes" element={<TeamRoute><DesempenhoAccessGate><DesempenhoDecisoes /></DesempenhoAccessGate></TeamRoute>} />
              <Route path="/equipe/board/desempenho/relatorios" element={<TeamRoute><DesempenhoAccessGate><DesempenhoRelatorios /></DesempenhoAccessGate></TeamRoute>} />
              <Route path="/equipe/board/desempenho/minha-evolucao" element={<TeamRoute><MinhaEvolucao /></TeamRoute>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
