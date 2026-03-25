import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { TeamRoute } from "@/components/auth/TeamRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import ClienteDashboard from "./pages/cliente/ClienteDashboard";
import NovoChamado from "./pages/cliente/NovoChamado";
import MeusChamados from "./pages/cliente/MeusChamados";
import DetalhesChamado from "./pages/cliente/DetalhesChamado";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClientes from "./pages/admin/AdminClientes";
import AdminChamados from "./pages/admin/AdminChamados";
import AdminDetalhesChamado from "./pages/admin/AdminDetalhesChamado";
import EquipeAuth from "./pages/equipe/EquipeAuth";
import EquipeChamados from "./pages/equipe/EquipeChamados";
import EquipeDetalhesChamado from "./pages/equipe/EquipeDetalhesChamado";
import EquipeDashboard from "./pages/equipe/EquipeDashboard";
import EquipeProjetos from "./pages/equipe/EquipeProjetos";
import EquipeKanban from "./pages/equipe/EquipeKanban";
import EquipeSprints from "./pages/equipe/EquipeSprints";

import EquipeSprintDetalhes from "./pages/equipe/EquipeSprintDetalhes";
import EquipeDaily from "./pages/equipe/EquipeDaily";
import EquipeRotinas from "./pages/equipe/EquipeRotinas";
import EquipeTarefas from "./pages/equipe/EquipeTarefas";
import EquipeNovaTarefa from "./pages/equipe/EquipeNovaTarefa";
// import EquipeDemandas from "./pages/equipe/EquipeDemandas"; // OCULTO

import EquipeProcessos from "./pages/equipe/EquipeProcessos";
import EquipeBiblioteca from "./pages/equipe/EquipeBiblioteca";
import EquipeBacklog from "./pages/equipe/EquipeBacklog";
import DigitalAreaSelector from "./pages/equipe/DigitalAreaSelector";
import DevDashboard from "./pages/equipe/dev/DevDashboard";
import NovaFerramenta from "./pages/equipe/dev/NovaFerramenta";
import DetalheFerramenta from "./pages/equipe/dev/DetalheFerramenta";
import ConsultaXMLs from "./pages/equipe/dev/ConsultaXMLs";
import ConsultaEFD from "./pages/equipe/dev/ConsultaEFD";
import ConsultaEFDICMS from "./pages/equipe/dev/ConsultaEFDICMS";
import ConsultaECD from "./pages/equipe/dev/ConsultaECD";
import ConsultaECF from "./pages/equipe/dev/ConsultaECF";
import GerenciarDados from "./pages/equipe/dev/GerenciarDados";
import AuditoriaFiscal from "./pages/equipe/dev/AuditoriaFiscal";
import ControlePerdcomp from "./pages/equipe/dev/ControlePerdcomp";
import GestaoClientes from "./pages/equipe/fiscal/GestaoClientes";
import CalculadoraIbsCbs from "./pages/equipe/dev/CalculadoraIbsCbs";
import ControleBalancetes from "./pages/equipe/dev/ControleBalancetes";
import ApuracaoPisCofins from "./pages/equipe/dev/ApuracaoPisCofins";
import MapaNCMPisCofins from "./pages/equipe/dev/MapaNCMPisCofins";
import AuditoriaCruzada from "./pages/equipe/dev/AuditoriaCruzada";
import CorrecoesSped from "./pages/equipe/dev/CorrecoesSped";
import ProcedimentosDev from "./pages/equipe/dev/ProcedimentosDev";
import GestaoNovidades from "./pages/gestao/GestaoNovidades";
import GestaoChamados from "./pages/gestao/GestaoChamados";
import GestaoDetalhesChamado from "./pages/gestao/GestaoDetalhesChamado";
import GestaoContatos from "./pages/gestao/GestaoContatos";
import GestaoAcessos from "./pages/gestao/GestaoAcessos";
import Novidades from "./pages/Novidades";
import Ajuda from "./pages/Ajuda";
import Missao from "./pages/Missao";
import NotFound from "./pages/NotFound";
import PrimeiroAcesso from "./pages/PrimeiroAcesso";
import EquipeControleAcessos from "./pages/equipe/EquipeControleAcessos";
import EquipeRelatorios from "./pages/equipe/EquipeRelatorios";
import { GestaoAccessGate } from "./components/gestao/GestaoAccessGate";
import { PageAccessGate } from "./components/auth/PageAccessGate";
import { DesempenhoAccessGate } from "./components/desempenho/DesempenhoAccessGate";

// Desempenho pages
import DesempenhoVisaoGeral from "./pages/gerencial/desempenho/DesempenhoVisaoGeral";
import DesempenhoCiclos from "./pages/gerencial/desempenho/DesempenhoCiclos";
import DesempenhoMetas from "./pages/gerencial/desempenho/DesempenhoMetas";
import DesempenhoFeedbacks from "./pages/gerencial/desempenho/DesempenhoFeedbacks";
import DesempenhoReunioes1a1 from "./pages/gerencial/desempenho/DesempenhoReunioes1a1";
import DesempenhoEvolucao from "./pages/gerencial/desempenho/DesempenhoEvolucao";

// Performance page
import PerformanceDashboard from "./pages/gerencial/performance/PerformanceDashboard";

// New Area Dashboards
import FiscalDashboard from "./pages/equipe/fiscal/FiscalDashboard";
import FiscalDemandasTarefas from "./pages/equipe/fiscal/FiscalDemandasTarefas";
import FiscalProjetosCadastro from "./pages/equipe/fiscal/FiscalProjetosCadastro";
import OsgDashboard from "./pages/equipe/osg/OsgDashboard";
import OsgAuditoria from "./pages/equipe/osg/OsgAuditoria";
import FiscalAuditoria from "./pages/equipe/fiscal/FiscalAuditoria";
import FiscalCadastrosClientes from "./pages/equipe/fiscal/FiscalCadastrosClientes";
import BoardDashboard from "./pages/equipe/board/BoardDashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
            {/* <Route path="/equipe/demandas" element={<TeamRoute><EquipeDemandas /></TeamRoute>} /> OCULTO */}
            
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
            <Route path="/equipe/dev/auditoria-fiscal" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/auditoria-fiscal"><AuditoriaFiscal /></PageAccessGate></TeamRoute>} />
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

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
