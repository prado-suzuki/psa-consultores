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
import { ErrorBoundary } from "./components/ErrorBoundary";
import { queryClient } from "./lib/queryClient";

// Rotas com import estático — todas as 86 rotas carregam no bundle inicial.
// Decisão: o lazy-loading (PR anterior) adicionava latência ruim por primeira
// navegação no ambiente dev do Lovable (Vite compila chunk on-demand).
// O ErrorBoundary + queryClient centralizado continuam ativos.

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Público / Auth
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PrimeiroAcesso from "./pages/PrimeiroAcesso";
import Missao from "./pages/Missao";
import Novidades from "./pages/Novidades";
import Ajuda from "./pages/Ajuda";

// Portal do Cliente
import ClienteDashboard from "./pages/cliente/ClienteDashboard";
import NovoChamado from "./pages/cliente/NovoChamado";
import MeusChamados from "./pages/cliente/MeusChamados";
import DetalhesChamado from "./pages/cliente/DetalhesChamado";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClientes from "./pages/admin/AdminClientes";
import AdminChamados from "./pages/admin/AdminChamados";
import AdminDetalhesChamado from "./pages/admin/AdminDetalhesChamado";

// Equipe (core)
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
import EquipeProcessos from "./pages/equipe/EquipeProcessos";
import EquipeBiblioteca from "./pages/equipe/EquipeBiblioteca";
import EquipeBacklog from "./pages/equipe/EquipeBacklog";
import EquipeRelatorios from "./pages/equipe/EquipeRelatorios";
import EquipeControleAcessos from "./pages/equipe/EquipeControleAcessos";
import DigitalAreaSelector from "./pages/equipe/DigitalAreaSelector";

// Equipe > Dev
import DevDashboard from "./pages/equipe/dev/DevDashboard";
import NovaFerramenta from "./pages/equipe/dev/NovaFerramenta";
import DetalheFerramenta from "./pages/equipe/dev/DetalheFerramenta";
import ConsultaXMLs from "./pages/equipe/dev/ConsultaXMLs";
import ConsultaEFD from "./pages/equipe/dev/ConsultaEFD";
import ConsultaEFDICMS from "./pages/equipe/dev/ConsultaEFDICMS";
import ConsultaECD from "./pages/equipe/dev/ConsultaECD";
import ConsultaECF from "./pages/equipe/dev/ConsultaECF";
import GerenciarDados from "./pages/equipe/dev/GerenciarDados";
import ProcessoDifal from "./pages/equipe/dev/ProcessoDifal";
import ControlePerdcomp from "./pages/equipe/dev/ControlePerdcomp";
import CalculadoraIbsCbs from "./pages/equipe/dev/CalculadoraIbsCbs";
import ControleBalancetes from "./pages/equipe/dev/ControleBalancetes";
import ApuracaoPisCofins from "./pages/equipe/dev/ApuracaoPisCofins";
import MapaNCMPisCofins from "./pages/equipe/dev/MapaNCMPisCofins";
import AuditoriaCruzada from "./pages/equipe/dev/AuditoriaCruzada";
import CorrecoesSped from "./pages/equipe/dev/CorrecoesSped";
import ProcedimentosDev from "./pages/equipe/dev/ProcedimentosDev";

// Equipe > Fiscal / Tax
import FiscalDashboard from "./pages/equipe/fiscal/FiscalDashboard";
import FiscalDemandasTarefas from "./pages/equipe/fiscal/FiscalDemandasTarefas";
import FiscalProjetosCadastro from "./pages/equipe/fiscal/FiscalProjetosCadastro";
import FiscalAuditoria from "./pages/equipe/fiscal/FiscalAuditoria";
import FiscalCadastrosClientes from "./pages/equipe/fiscal/FiscalCadastrosClientes";
import GestaoClientes from "./pages/equipe/fiscal/GestaoClientes";

// Equipe > OSG / Board
import OsgDashboard from "./pages/equipe/osg/OsgDashboard";
import OsgAuditoria from "./pages/equipe/osg/OsgAuditoria";
import BoardDashboard from "./pages/equipe/board/BoardDashboard";

// Gestão
import GestaoNovidades from "./pages/gestao/GestaoNovidades";
import GestaoChamados from "./pages/gestao/GestaoChamados";
import GestaoDetalhesChamado from "./pages/gestao/GestaoDetalhesChamado";
import GestaoContatos from "./pages/gestao/GestaoContatos";
import GestaoAcessos from "./pages/gestao/GestaoAcessos";

// Gerencial > Desempenho
import DesempenhoVisaoGeral from "./pages/gerencial/desempenho/DesempenhoVisaoGeral";
import DesempenhoCiclos from "./pages/gerencial/desempenho/DesempenhoCiclos";
import DesempenhoMetas from "./pages/gerencial/desempenho/DesempenhoMetas";
import DesempenhoFeedbacks from "./pages/gerencial/desempenho/DesempenhoFeedbacks";
import DesempenhoReunioes1a1 from "./pages/gerencial/desempenho/DesempenhoReunioes1a1";
import DesempenhoEvolucao from "./pages/gerencial/desempenho/DesempenhoEvolucao";
import DesempenhoDecisoes from "./pages/gerencial/desempenho/DesempenhoDecisoes";
import DesempenhoRelatorios from "./pages/gerencial/desempenho/DesempenhoRelatorios";
import MinhaEvolucao from "./pages/gerencial/desempenho/MinhaEvolucao";

// Gerencial > Performance
import PerformanceDashboard from "./pages/gerencial/performance/PerformanceDashboard";

const App = () => (
  <ErrorBoundary scope="Root">
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
              <Route path="/equipe/dashboard" element={<TeamRoute><PageAccessGate pagePath="/equipe/dashboard"><EquipeDashboard /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/relatorios" element={<TeamRoute><PageAccessGate pagePath="/equipe/relatorios"><EquipeRelatorios /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/kanban" element={<TeamRoute><PageAccessGate pagePath="/equipe/kanban"><EquipeKanban /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/sprints" element={<TeamRoute><PageAccessGate pagePath="/equipe/sprints"><EquipeSprints /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/sprints/:id" element={<TeamRoute><PageAccessGate pagePath="/equipe/sprints"><EquipeSprintDetalhes /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/daily" element={<TeamRoute><PageAccessGate pagePath="/equipe/daily"><EquipeDaily /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/rotinas" element={<TeamRoute><PageAccessGate pagePath="/equipe/rotinas"><EquipeRotinas /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/tarefas" element={<TeamRoute><PageAccessGate pagePath="/equipe/tarefas"><EquipeTarefas /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/tarefas/nova" element={<TeamRoute><PageAccessGate pagePath="/equipe/tarefas/nova"><EquipeNovaTarefa /></PageAccessGate></TeamRoute>} />

              <Route path="/equipe/processos" element={<TeamRoute><PageAccessGate pagePath="/equipe/processos"><EquipeProcessos /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/projetos" element={<TeamRoute><PageAccessGate pagePath="/equipe/projetos"><EquipeProjetos /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/biblioteca" element={<TeamRoute><PageAccessGate pagePath="/equipe/biblioteca"><EquipeBiblioteca /></PageAccessGate></TeamRoute>} />
              <Route path="/equipe/backlog" element={<TeamRoute><PageAccessGate pagePath="/equipe/backlog"><EquipeBacklog /></PageAccessGate></TeamRoute>} />
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
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
