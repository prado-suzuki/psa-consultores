import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";

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
import IcmsSaidas from "./pages/equipe/dev/IcmsSaidas";

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
              <Route path="/equipe/chamados" element={<PageAccessGate pagePath="/equipe/chamados"><EquipeChamados /></PageAccessGate>} />
              <Route path="/equipe/chamados/:id" element={<PageAccessGate pagePath="/equipe/chamados"><EquipeDetalhesChamado /></PageAccessGate>} />
              <Route path="/equipe/dashboard" element={<PageAccessGate pagePath="/equipe/dashboard"><EquipeDashboard /></PageAccessGate>} />
              <Route path="/equipe/relatorios" element={<PageAccessGate pagePath="/equipe/relatorios"><EquipeRelatorios /></PageAccessGate>} />
              <Route path="/equipe/kanban" element={<PageAccessGate pagePath="/equipe/kanban"><EquipeKanban /></PageAccessGate>} />
              <Route path="/equipe/sprints" element={<PageAccessGate pagePath="/equipe/sprints"><EquipeSprints /></PageAccessGate>} />
              <Route path="/equipe/sprints/:id" element={<PageAccessGate pagePath="/equipe/sprints"><EquipeSprintDetalhes /></PageAccessGate>} />
              <Route path="/equipe/daily" element={<PageAccessGate pagePath="/equipe/daily"><EquipeDaily /></PageAccessGate>} />
              <Route path="/equipe/rotinas" element={<PageAccessGate pagePath="/equipe/rotinas"><EquipeRotinas /></PageAccessGate>} />
              <Route path="/equipe/tarefas" element={<PageAccessGate pagePath="/equipe/tarefas"><EquipeTarefas /></PageAccessGate>} />
              <Route path="/equipe/tarefas/nova" element={<PageAccessGate pagePath="/equipe/tarefas/nova"><EquipeNovaTarefa /></PageAccessGate>} />

              <Route path="/equipe/processos" element={<PageAccessGate pagePath="/equipe/processos"><EquipeProcessos /></PageAccessGate>} />
              <Route path="/equipe/projetos" element={<PageAccessGate pagePath="/equipe/projetos"><EquipeProjetos /></PageAccessGate>} />
              <Route path="/equipe/biblioteca" element={<PageAccessGate pagePath="/equipe/biblioteca"><EquipeBiblioteca /></PageAccessGate>} />
              <Route path="/equipe/backlog" element={<PageAccessGate pagePath="/equipe/backlog"><EquipeBacklog /></PageAccessGate>} />
              <Route path="/equipe/digital" element={<DigitalAreaSelector />} />
              <Route path="/equipe/dev" element={<PageAccessGate pagePath="/equipe/dev"><DevDashboard /></PageAccessGate>} />
              <Route path="/equipe/dev/nova-ferramenta" element={<PageAccessGate pagePath="/equipe/dev/nova-ferramenta"><NovaFerramenta /></PageAccessGate>} />
              <Route path="/equipe/dev/ferramenta/:id" element={<PageAccessGate pagePath="/equipe/dev/ferramenta"><DetalheFerramenta /></PageAccessGate>} />
              <Route path="/equipe/dev/consulta-xmls" element={<PageAccessGate pagePath="/equipe/dev/consulta-xmls"><ConsultaXMLs /></PageAccessGate>} />
              <Route path="/equipe/dev/consulta-efd" element={<PageAccessGate pagePath="/equipe/dev/consulta-efd"><ConsultaEFD /></PageAccessGate>} />
              <Route path="/equipe/dev/consulta-efd-icms" element={<PageAccessGate pagePath="/equipe/dev/consulta-efd-icms"><ConsultaEFDICMS /></PageAccessGate>} />
              <Route path="/equipe/dev/consulta-ecd" element={<PageAccessGate pagePath="/equipe/dev/consulta-ecd"><ConsultaECD /></PageAccessGate>} />
              <Route path="/equipe/dev/consulta-ecf" element={<PageAccessGate pagePath="/equipe/dev/consulta-ecf"><ConsultaECF /></PageAccessGate>} />
              <Route path="/equipe/dev/gerenciar-dados" element={<PageAccessGate pagePath="/equipe/dev/gerenciar-dados"><GerenciarDados /></PageAccessGate>} />
              <Route path="/equipe/dev/processo-difal" element={<PageAccessGate pagePath="/equipe/dev/processo-difal"><ProcessoDifal /></PageAccessGate>} />
              <Route path="/equipe/dev/controle-perdcomp" element={<PageAccessGate pagePath="/equipe/dev/controle-perdcomp"><ControlePerdcomp /></PageAccessGate>} />
              <Route path="/equipe/dev/controle-balancetes" element={<PageAccessGate pagePath="/equipe/dev/controle-balancetes"><ControleBalancetes /></PageAccessGate>} />
              {/* Redirect legacy route */}
              <Route path="/equipe/dev/gestao-clientes" element={<PageAccessGate pagePath="/equipe/dev/gestao-clientes"><GestaoClientes /></PageAccessGate>} />
              <Route path="/equipe/dev/calculadora-ibs-cbs" element={<PageAccessGate pagePath="/equipe/dev/calculadora-ibs-cbs"><CalculadoraIbsCbs /></PageAccessGate>} />
              <Route path="/equipe/dev/apuracao-pis-cofins" element={<PageAccessGate pagePath="/equipe/dev/apuracao-pis-cofins"><ApuracaoPisCofins /></PageAccessGate>} />
              <Route path="/equipe/dev/mapa-ncm-pis-cofins" element={<PageAccessGate pagePath="/equipe/dev/mapa-ncm-pis-cofins"><MapaNCMPisCofins /></PageAccessGate>} />
              <Route path="/equipe/dev/cruzamento-dados" element={<PageAccessGate pagePath="/equipe/dev/cruzamento-dados"><AuditoriaCruzada /></PageAccessGate>} />
              <Route path="/equipe/dev/correcoes-sped" element={<PageAccessGate pagePath="/equipe/dev/correcoes-sped"><CorrecoesSped /></PageAccessGate>} />
              <Route path="/equipe/dev/procedimentos" element={<PageAccessGate pagePath="/equipe/dev/procedimentos"><ProcedimentosDev /></PageAccessGate>} />
              <Route path="/equipe/dev/apuracao-difal/icms-saidas" element={<PageAccessGate pagePath="/equipe/dev/apuracao-difal/icms-saidas"><IcmsSaidas /></PageAccessGate>} />
              <Route path="/equipe/acessos" element={<AdminRoute><EquipeControleAcessos /></AdminRoute>} />

              {/* Gestão Routes - Protected by access gate (admin or with explicit permission) */}
              <Route path="/gestao" element={<GestaoAccessGate><GestaoNovidades /></GestaoAccessGate>} />
              <Route path="/gestao/chamados" element={<GestaoAccessGate><GestaoChamados /></GestaoAccessGate>} />
              <Route path="/gestao/chamados/:id" element={<GestaoAccessGate><GestaoDetalhesChamado /></GestaoAccessGate>} />
              <Route path="/gestao/contatos" element={<GestaoAccessGate><GestaoContatos /></GestaoAccessGate>} />
              <Route path="/gestao/acessos" element={<GestaoAccessGate><GestaoAcessos /></GestaoAccessGate>} />

              {/* Tax (Fiscal) Routes */}
              <Route path="/equipe/tax/dashboard" element={<PageAccessGate pagePath="/equipe/tax/dashboard"><FiscalDashboard /></PageAccessGate>} />
              <Route path="/equipe/tax/projetos/clientes" element={<PageAccessGate pagePath="/equipe/tax/projetos/clientes"><FiscalCadastrosClientes /></PageAccessGate>} />
              <Route path="/equipe/tax/projetos/cadastro" element={<PageAccessGate pagePath="/equipe/tax/projetos/cadastro"><FiscalProjetosCadastro /></PageAccessGate>} />
              <Route path="/equipe/tax/projetos/tarefas" element={<PageAccessGate pagePath="/equipe/tax/projetos/tarefas"><FiscalDemandasTarefas /></PageAccessGate>} />

              {/* Tax Auditoria */}
              <Route path="/equipe/tax/auditoria" element={<PageAccessGate pagePath="/equipe/tax/auditoria"><FiscalAuditoria /></PageAccessGate>} />

              {/* OSG Routes */}
              <Route path="/equipe/osg/dashboard" element={<PageAccessGate pagePath="/equipe/osg/dashboard"><OsgDashboard /></PageAccessGate>} />
              <Route path="/equipe/osg/auditoria" element={<PageAccessGate pagePath="/equipe/osg/auditoria"><OsgAuditoria /></PageAccessGate>} />

              {/* Board Routes */}
              <Route path="/equipe/board/dashboard" element={<PageAccessGate pagePath="/equipe/board/dashboard"><BoardDashboard /></PageAccessGate>} />

              {/* Performance & Desempenho Routes (inside Board) */}
              <Route path="/equipe/board/performance" element={<DesempenhoAccessGate><PerformanceDashboard /></DesempenhoAccessGate>} />
              <Route path="/equipe/board/desempenho" element={<DesempenhoAccessGate><DesempenhoVisaoGeral /></DesempenhoAccessGate>} />
              <Route path="/equipe/board/desempenho/ciclos" element={<DesempenhoAccessGate><DesempenhoCiclos /></DesempenhoAccessGate>} />
              <Route path="/equipe/board/desempenho/metas" element={<DesempenhoAccessGate><DesempenhoMetas /></DesempenhoAccessGate>} />
              <Route path="/equipe/board/desempenho/feedbacks" element={<DesempenhoAccessGate><DesempenhoFeedbacks /></DesempenhoAccessGate>} />
              <Route path="/equipe/board/desempenho/1a1" element={<DesempenhoAccessGate><DesempenhoReunioes1a1 /></DesempenhoAccessGate>} />
              <Route path="/equipe/board/desempenho/evolucao" element={<DesempenhoAccessGate><DesempenhoEvolucao /></DesempenhoAccessGate>} />
              <Route path="/equipe/board/desempenho/decisoes" element={<DesempenhoAccessGate><DesempenhoDecisoes /></DesempenhoAccessGate>} />
              <Route path="/equipe/board/desempenho/relatorios" element={<DesempenhoAccessGate><DesempenhoRelatorios /></DesempenhoAccessGate>} />
              <Route path="/equipe/board/desempenho/minha-evolucao" element={<MinhaEvolucao />} />

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
