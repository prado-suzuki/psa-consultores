import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OsgWorkProvider } from "@/contexts/OsgWorkContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { LiderRoute } from "@/components/auth/LiderRoute";

import { GestaoAccessGate } from "./components/gestao/GestaoAccessGate";
import { RedirecionaChamadoAntigo } from "./components/auth/RedirecionaChamadoAntigo";
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
import NovidadeDetalhe from "./pages/NovidadeDetalhe";
import Ajuda from "./pages/Ajuda";

// Portal do Cliente
import ClienteDashboard from "./pages/cliente/ClienteDashboard";
import NovoChamado from "./pages/cliente/NovoChamado";
import MeusChamados from "./pages/cliente/MeusChamados";
import DetalhesChamado from "./pages/cliente/DetalhesChamado";


// Equipe (core)
import EquipeAuth from "./pages/equipe/EquipeAuth";
import EquipeChamados from "./pages/equipe/EquipeChamados";
import EquipeDetalhesChamado from "./pages/equipe/EquipeDetalhesChamado";
import EquipeDashboard from "./pages/equipe/EquipeDashboard";
import AnaliseInteligente from "./pages/equipe/dashboards/AnaliseInteligente";
import Dashboards from "./pages/equipe/dashboards/Dashboards";
import EquipeProjetos from "./pages/equipe/EquipeProjetos";
import EquipeKanban from "./pages/equipe/EquipeKanban";
import EquipeSprints from "./pages/equipe/EquipeSprints";
import EquipeSprintDetalhes from "./pages/equipe/EquipeSprintDetalhes";
import EquipeDaily from "./pages/equipe/EquipeDaily";
import EquipeRotinas from "./pages/equipe/EquipeRotinas";
import EquipeProcessos from "./pages/equipe/EquipeProcessos";
import EquipeMapeamento from "./pages/equipe/EquipeMapeamento";
import EquipeBiblioteca from "./pages/equipe/EquipeBiblioteca";
import EquipeBacklog from "./pages/equipe/EquipeBacklog";
import EquipeRelatorios from "./pages/equipe/EquipeRelatorios";
import EquipeControleAcessos from "./pages/equipe/EquipeControleAcessos";
import DigitalAreaSelector from "./pages/equipe/DigitalAreaSelector";
import MapaRoutes from "./pages/equipe/mapa/MapaRoutes";

// Equipe > Dev
import DevDashboard from "./pages/equipe/dev/DevDashboard";
import NovaFerramenta from "./pages/equipe/dev/NovaFerramenta";
import DetalheFerramenta from "./pages/equipe/dev/DetalheFerramenta";
import ConsultaXMLs from "./pages/equipe/dev/ConsultaXMLs";
import ConsultaSpedHub from "./pages/equipe/dev/ConsultaSpedHub";
import ConsultaEFD from "./pages/equipe/dev/ConsultaEFD";
import ConsultaEFDICMS from "./pages/equipe/dev/ConsultaEFDICMS";
import ConsultaECD from "./pages/equipe/dev/ConsultaECD";
import ConsultaECF from "./pages/equipe/dev/ConsultaECF";
import GerenciarDados from "./pages/equipe/dev/GerenciarDados";
import GerenciarDadosHub from "./pages/equipe/dev/GerenciarDadosHub";
import GerenciarDadosDashboards from "./pages/equipe/dev/GerenciarDadosDashboards";
import AnaliseIcmsHub from "./pages/equipe/dev/AnaliseIcmsHub";
import PerdcompHub from "./pages/equipe/dev/PerdcompHub";
import PerdcompDashboard from "./pages/equipe/dev/PerdcompDashboard";
import ProcessoDifal from "./pages/equipe/dev/ProcessoDifal";
import ControlePerdcomp from "./pages/equipe/dev/ControlePerdcomp";
import CalculadoraIbsCbs from "./pages/equipe/dev/CalculadoraIbsCbs";
import ControleBalancetes from "./pages/equipe/dev/ControleBalancetes";
import ApuracaoPisCofins from "./pages/equipe/dev/ApuracaoPisCofins";
import LevantamentoPisCofinsHub from "./pages/equipe/dev/LevantamentoPisCofinsHub";
import MapaNCMPisCofins from "./pages/equipe/dev/MapaNCMPisCofins";
import AuditoriaCruzada from "./pages/equipe/dev/AuditoriaCruzada";
import CorrecoesSped from "./pages/equipe/dev/CorrecoesSped";
import ProcedimentosDev from "./pages/equipe/dev/ProcedimentosDev";
import IcmsSaidas from "./pages/equipe/dev/IcmsSaidas";

// Equipe > Fiscal / Tax
import FiscalBoasVindas from "./pages/equipe/fiscal/FiscalBoasVindas";
import FiscalDashboard from "./pages/equipe/fiscal/FiscalDashboard";
import FiscalDemandasTarefas from "./pages/equipe/fiscal/FiscalDemandasTarefas";
import FiscalFeed from "./pages/equipe/fiscal/FiscalFeed";
import FiscalProjetosCadastro from "./pages/equipe/fiscal/FiscalProjetosCadastro";
import FiscalProjetosLote from "./pages/equipe/fiscal/FiscalProjetosLote";
import FiscalAuditoria from "./pages/equipe/fiscal/FiscalAuditoria";
import FiscalCadastrosClientes from "./pages/equipe/fiscal/FiscalCadastrosClientes";
import GestaoClientes from "./pages/equipe/fiscal/GestaoClientes";
import FiscalGerencial from "./pages/equipe/fiscal/FiscalGerencial";
import FiscalGerencialChamados from "./pages/equipe/fiscal/FiscalGerencialChamados";
import FiscalGerencialChamadosDashboard from "./pages/equipe/fiscal/FiscalGerencialChamadosDashboard";
import FiscalGerencialChamadoDetalhe from "./pages/equipe/fiscal/FiscalGerencialChamadoDetalhe";
import OsgGerencialChamados from "./pages/equipe/osg/OsgGerencialChamados";
import OsgGerencialChamadosDashboard from "./pages/equipe/osg/OsgGerencialChamadosDashboard";
import OsgGerencialChamadoDetalhe from "./pages/equipe/osg/OsgGerencialChamadoDetalhe";

// Equipe > OSG / Board
import OsgAreaSelector from "./pages/equipe/osg/OsgAreaSelector";
import OsgBoasVindas from "./pages/equipe/osg/OsgBoasVindas";
import OsgGerencial from "./pages/equipe/osg/OsgGerencial";
import OsgDashboard from "./pages/equipe/osg/OsgDashboard";
import OsgTarefas from "./pages/equipe/osg/OsgTarefas";
import OsgFeed from "./pages/equipe/osg/OsgFeed";
import OsgClientes from "./pages/equipe/osg/OsgClientes";
import OsgProjetos from "./pages/equipe/osg/OsgProjetos";
import OsgProjetosLote from "./pages/equipe/osg/OsgProjetosLote";
import OsgWorkDashboard from "./pages/equipe/osg/OsgWorkDashboard";
import Onboarding from "./pages/equipe/osg/Onboarding";
import CadastroPorDocumento from "./pages/equipe/osg/CadastroPorDocumento";
import QualificacaoDasPartes from "./pages/equipe/osg/QualificacaoDasPartes";
import DiagnosticoPatrimonial from "./pages/equipe/osg/DiagnosticoPatrimonial";
import ControleMatriculas from "./pages/equipe/osg/ControleMatriculas";
import BibliotecaModelos from "./pages/equipe/osg/BibliotecaModelos";
import MontagemDocumentos from "./pages/equipe/osg/MontagemDocumentos";
import GerarDocumento from "./pages/equipe/osg/GerarDocumento";
import QuadroSocietario from "./pages/equipe/osg/QuadroSocietario";
import DocumentosCliente from "./pages/equipe/osg/DocumentosCliente";
import ChecklistsDocumentos from "./pages/equipe/osg/ChecklistsDocumentos";
import Relatorios from "./pages/equipe/osg/Relatorios";
import OsgAuditoria from "./pages/equipe/osg/OsgAuditoria";
import BoardDashboard from "./pages/equipe/board/BoardDashboard";
import BoardRelatorios from "./pages/equipe/board/BoardRelatorios";
import BoardDashboardClientesOs from "./pages/equipe/board/BoardDashboardClientesOs";
import BoardClientes from "./pages/equipe/board/BoardClientes";
import DashboardUsoEnvioGerencial from "./pages/equipe/board/DashboardUsoEnvioGerencial";

// Gestão
import GestaoNovidades from "./pages/gestao/GestaoNovidades";
import GestaoChamados from "./pages/gestao/GestaoChamados";
import GestaoChamadosDashboard from "./pages/gestao/GestaoChamadosDashboard";
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
              <Route path="/novidades/:slug" element={<NovidadeDetalhe />} />
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
              <Route path="/admin" element={<Navigate to="/gestao" replace />} />

              {/* Equipe Routes */}
              <Route path="/equipe" element={<EquipeAuth />} />
              <Route path="/equipe/chamados" element={<PageAccessGate pagePath="/equipe/chamados"><EquipeChamados /></PageAccessGate>} />
              <Route path="/equipe/chamados/:id" element={<PageAccessGate pagePath="/equipe/chamados"><EquipeDetalhesChamado /></PageAccessGate>} />
              <Route path="/equipe/dashboard" element={<PageAccessGate pagePath="/equipe/dashboard"><EquipeDashboard /></PageAccessGate>} />
              <Route path="/equipe/dashboards" element={<PageAccessGate pagePath="/equipe/dashboard"><Dashboards /></PageAccessGate>} />
              <Route path="/equipe/dashboards/analise-inteligente" element={<PageAccessGate pagePath="/equipe/dashboard"><AnaliseInteligente /></PageAccessGate>} />
              <Route path="/equipe/relatorios" element={<PageAccessGate pagePath="/equipe/relatorios"><EquipeRelatorios /></PageAccessGate>} />
              <Route path="/equipe/kanban" element={<PageAccessGate pagePath="/equipe/kanban"><EquipeKanban /></PageAccessGate>} />
              <Route path="/equipe/sprints" element={<PageAccessGate pagePath="/equipe/sprints"><EquipeSprints /></PageAccessGate>} />
              <Route path="/equipe/sprints/:id" element={<PageAccessGate pagePath="/equipe/sprints"><EquipeSprintDetalhes /></PageAccessGate>} />
              <Route path="/equipe/daily" element={<PageAccessGate pagePath="/equipe/daily"><EquipeDaily /></PageAccessGate>} />
              <Route path="/equipe/rotinas" element={<PageAccessGate pagePath="/equipe/rotinas"><EquipeRotinas /></PageAccessGate>} />
              {/* Rotas aposentadas (T1 — unificação de tarefa): a tela "Tarefas"/"Nova Tarefa"
                  gravava na tabela órfã `tasks`, que o Kanban/Sprints não leem. Redirecionadas
                  para o Kanban (fonte única `sprint_deliverables`). Remover as telas/tabela é a
                  migração delegável. */}
              <Route path="/equipe/tarefas" element={<Navigate to="/equipe/kanban" replace />} />
              <Route path="/equipe/tarefas/nova" element={<Navigate to="/equipe/kanban" replace />} />

              <Route path="/equipe/mapeamento" element={<PageAccessGate pagePath="/equipe/mapeamento"><EquipeMapeamento /></PageAccessGate>} />
              <Route path="/equipe/processos" element={<PageAccessGate pagePath="/equipe/processos"><EquipeProcessos /></PageAccessGate>} />
              <Route path="/equipe/projetos" element={<PageAccessGate pagePath="/equipe/projetos"><EquipeProjetos /></PageAccessGate>} />
              <Route path="/equipe/biblioteca" element={<PageAccessGate pagePath="/equipe/biblioteca"><EquipeBiblioteca /></PageAccessGate>} />
              <Route path="/equipe/backlog" element={<PageAccessGate pagePath="/equipe/backlog"><EquipeBacklog /></PageAccessGate>} />
              <Route path="/equipe/digital" element={<ProtectedRoute><DigitalAreaSelector /></ProtectedRoute>} />
              <Route path="/equipe/digital/mapa/*" element={<ProtectedRoute><MapaRoutes /></ProtectedRoute>} />
              <Route path="/equipe/dev" element={<PageAccessGate pagePath="/equipe/dev"><DevDashboard /></PageAccessGate>} />
              <Route path="/equipe/dev/nova-ferramenta" element={<PageAccessGate pagePath="/equipe/dev/nova-ferramenta"><NovaFerramenta /></PageAccessGate>} />
              <Route path="/equipe/dev/ferramenta/:id" element={<PageAccessGate pagePath="/equipe/dev/ferramenta"><DetalheFerramenta /></PageAccessGate>} />
              <Route path="/equipe/dev/consulta-xmls" element={<PageAccessGate pagePath="/equipe/dev/consulta-xmls"><ConsultaXMLs /></PageAccessGate>} />
              <Route path="/equipe/dev/consulta-sped" element={<PageAccessGate pagePath="/equipe/dev/consulta-sped"><ConsultaSpedHub /></PageAccessGate>} />
              <Route path="/equipe/dev/consulta-efd" element={<PageAccessGate pagePath="/equipe/dev/consulta-efd"><ConsultaEFD /></PageAccessGate>} />
              <Route path="/equipe/dev/consulta-efd-icms" element={<PageAccessGate pagePath="/equipe/dev/consulta-efd-icms"><ConsultaEFDICMS /></PageAccessGate>} />
              <Route path="/equipe/dev/consulta-ecd" element={<PageAccessGate pagePath="/equipe/dev/consulta-ecd"><ConsultaECD /></PageAccessGate>} />
              <Route path="/equipe/dev/consulta-ecf" element={<PageAccessGate pagePath="/equipe/dev/consulta-ecf"><ConsultaECF /></PageAccessGate>} />
              <Route path="/equipe/dev/gerenciar-dados" element={<PageAccessGate pagePath="/equipe/dev/gerenciar-dados"><GerenciarDadosHub /></PageAccessGate>} />
              <Route path="/equipe/dev/carregar-dados" element={<PageAccessGate pagePath="/equipe/dev/carregar-dados"><GerenciarDados /></PageAccessGate>} />
              <Route path="/equipe/dev/gerenciar-dados/dashboards" element={<PageAccessGate pagePath="/equipe/dev/gerenciar-dados/dashboards"><GerenciarDadosDashboards /></PageAccessGate>} />
              <Route path="/equipe/dev/levantamento-pis-cofins" element={<PageAccessGate pagePath="/equipe/dev/levantamento-pis-cofins"><LevantamentoPisCofinsHub /></PageAccessGate>} />
              <Route path="/equipe/dev/perdcomp" element={<PageAccessGate pagePath="/equipe/dev/perdcomp"><PerdcompHub /></PageAccessGate>} />
              <Route path="/equipe/dev/perdcomp/dashboard" element={<PageAccessGate pagePath="/equipe/dev/perdcomp/dashboard"><PerdcompDashboard /></PageAccessGate>} />
              <Route path="/equipe/dev/analise-icms" element={<PageAccessGate pagePath="/equipe/dev/analise-icms"><AnaliseIcmsHub /></PageAccessGate>} />
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
              {/* Chamados saiu da área de Marketing e passou para a Gerencial da Tax
                  e da OSG. Os endereços antigos redirecionam por causa de link salvo
                  e notificação antiga; quem não for líder+ é barrado no destino, que
                  é o comportamento correto agora. */}
              <Route path="/gestao/chamados" element={<Navigate to="/equipe/tax/gerencial/chamados" replace />} />
              <Route path="/gestao/chamados/dashboard" element={<Navigate to="/equipe/tax/gerencial/chamados/dashboard" replace />} />
              <Route path="/gestao/chamados/:id" element={<RedirecionaChamadoAntigo />} />
              <Route path="/gestao/contatos" element={<GestaoAccessGate><GestaoContatos /></GestaoAccessGate>} />
              <Route path="/gestao/acessos" element={<GestaoAccessGate><GestaoAcessos /></GestaoAccessGate>} />

              {/* Tax (Fiscal) Routes */}
              <Route path="/equipe/tax" element={<ProtectedRoute><FiscalBoasVindas /></ProtectedRoute>} />
              <Route path="/equipe/tax/dashboard" element={<PageAccessGate pagePath="/equipe/tax/dashboard"><FiscalDashboard /></PageAccessGate>} />
              <Route path="/equipe/tax/projetos/clientes" element={<PageAccessGate pagePath="/equipe/tax/projetos/clientes"><FiscalCadastrosClientes /></PageAccessGate>} />
              <Route path="/equipe/tax/projetos/cadastro" element={<PageAccessGate pagePath="/equipe/tax/projetos/cadastro"><FiscalProjetosCadastro /></PageAccessGate>} />
              <Route path="/equipe/tax/projetos/cadastro-lote" element={<PageAccessGate pagePath="/equipe/tax/projetos/cadastro-lote"><FiscalProjetosLote /></PageAccessGate>} />
              <Route path="/equipe/tax/projetos/tarefas" element={<PageAccessGate pagePath="/equipe/tax/projetos/tarefas"><FiscalDemandasTarefas /></PageAccessGate>} />
              <Route path="/equipe/tax/projetos/feed" element={<PageAccessGate pagePath="/equipe/tax/projetos/feed"><FiscalFeed /></PageAccessGate>} />

              {/* Tax Gerencial — restrita a líder+ (dashboard nativo de Clientes e OS) */}
              <Route path="/equipe/tax/gerencial" element={<LiderRoute><FiscalGerencial /></LiderRoute>} />

              {/* Gestão de Chamados dentro da Gerencial da Tax. A mesma tela da área
                  de Gestão, montada no FiscalLayout. Só líder+: é o critério da
                  Gerencial inteira, e substitui a permissão nominal que a antiga
                  /gestao/chamados exigia. */}
              <Route path="/equipe/tax/gerencial/chamados" element={<LiderRoute><FiscalGerencialChamados /></LiderRoute>} />
              {/* A estática vem antes da dinâmica: `dashboard` não pode cair no `:id`. */}
              <Route path="/equipe/tax/gerencial/chamados/dashboard" element={<LiderRoute><FiscalGerencialChamadosDashboard /></LiderRoute>} />
              <Route path="/equipe/tax/gerencial/chamados/:id" element={<LiderRoute><FiscalGerencialChamadoDetalhe /></LiderRoute>} />

              {/* Logs de Equipe (ex-Auditoria) — líder+ e permissão nominal, como antes.
                  O endereço antigo redireciona para não quebrar link salvo. */}
              <Route path="/equipe/tax/gerencial/logs-equipe" element={<LiderRoute><PageAccessGate pagePath="/equipe/tax/gerencial/logs-equipe"><FiscalAuditoria /></PageAccessGate></LiderRoute>} />
              <Route path="/equipe/tax/auditoria" element={<Navigate to="/equipe/tax/gerencial/logs-equipe" replace />} />

              {/* OSG Routes */}
              <Route path="/equipe/osg" element={<ProtectedRoute><OsgAreaSelector /></ProtectedRoute>} />
              <Route path="/equipe/osg/inicio" element={<ProtectedRoute><OsgBoasVindas /></ProtectedRoute>} />
              <Route path="/equipe/osg/dashboard" element={<PageAccessGate pagePath="/equipe/osg/dashboard"><OsgDashboard /></PageAccessGate>} />
              <Route path="/equipe/osg/projetos/clientes" element={<PageAccessGate pagePath="/equipe/osg/projetos/clientes"><OsgClientes /></PageAccessGate>} />
              <Route path="/equipe/osg/projetos/cadastro" element={<PageAccessGate pagePath="/equipe/osg/projetos/cadastro"><OsgProjetos /></PageAccessGate>} />
              <Route path="/equipe/osg/projetos/cadastro-lote" element={<PageAccessGate pagePath="/equipe/osg/projetos/cadastro-lote"><OsgProjetosLote /></PageAccessGate>} />
              <Route path="/equipe/osg/projetos/tarefas" element={<PageAccessGate pagePath="/equipe/osg/projetos/tarefas"><OsgTarefas /></PageAccessGate>} />
              <Route path="/equipe/osg/projetos/feed" element={<PageAccessGate pagePath="/equipe/osg/projetos/feed"><OsgFeed /></PageAccessGate>} />
              {/* OSG Gerencial — restrita a líder+ (dashboard nativo de Clientes e OS) */}
              <Route path="/equipe/osg/gerencial" element={<LiderRoute><OsgGerencial /></LiderRoute>} />
              <Route element={<OsgWorkProvider><Outlet /></OsgWorkProvider>}>
                <Route path="/equipe/osg/work" element={<PageAccessGate pagePath="/equipe/osg/work"><OsgWorkDashboard /></PageAccessGate>} />
                <Route path="/equipe/osg/work/onboarding" element={<PageAccessGate pagePath="/equipe/osg/work/onboarding"><Onboarding /></PageAccessGate>} />
                <Route path="/equipe/osg/work/onboarding/cadastro" element={<ProtectedRoute><CadastroPorDocumento /></ProtectedRoute>} />
                <Route path="/equipe/osg/work/qualificacao-das-partes" element={<PageAccessGate pagePath="/equipe/osg/work/qualificacao-das-partes"><QualificacaoDasPartes /></PageAccessGate>} />
                <Route path="/equipe/osg/work/diagnostico-patrimonial" element={<PageAccessGate pagePath="/equipe/osg/work/diagnostico-patrimonial"><DiagnosticoPatrimonial /></PageAccessGate>} />
                <Route path="/equipe/osg/work/controle-matriculas" element={<PageAccessGate pagePath="/equipe/osg/work/controle-matriculas"><ControleMatriculas /></PageAccessGate>} />
                <Route path="/equipe/osg/work/gerar-documento" element={<ProtectedRoute><GerarDocumento /></ProtectedRoute>} />
                <Route path="/equipe/osg/work/biblioteca-modelos" element={<ProtectedRoute><BibliotecaModelos /></ProtectedRoute>} />
                <Route path="/equipe/osg/work/montagem-documentos" element={<ProtectedRoute><MontagemDocumentos /></ProtectedRoute>} />
                <Route path="/equipe/osg/work/quadro-societario" element={<PageAccessGate pagePath="/equipe/osg/work/quadro-societario"><QuadroSocietario /></PageAccessGate>} />
                <Route path="/equipe/osg/work/documentos" element={<ProtectedRoute><DocumentosCliente /></ProtectedRoute>} />
                <Route path="/equipe/osg/work/checklists" element={<ProtectedRoute><ChecklistsDocumentos /></ProtectedRoute>} />
                <Route path="/equipe/osg/work/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
              </Route>
              {/* Gestão de Chamados dentro da Gerencial da OSG. Espelha a Tax. Hoje
                  nasce vazia: não há chamado com cluster OSG. */}
              <Route path="/equipe/osg/gerencial/chamados" element={<LiderRoute fallbackPath="/equipe/osg"><OsgGerencialChamados /></LiderRoute>} />
              <Route path="/equipe/osg/gerencial/chamados/dashboard" element={<LiderRoute fallbackPath="/equipe/osg"><OsgGerencialChamadosDashboard /></LiderRoute>} />
              <Route path="/equipe/osg/gerencial/chamados/:id" element={<LiderRoute fallbackPath="/equipe/osg"><OsgGerencialChamadoDetalhe /></LiderRoute>} />

              {/* Logs de Equipe (ex-Auditoria) — líder+, igual à Tax; quem não é volta para a home do OSG. */}
              <Route path="/equipe/osg/gerencial/logs-equipe" element={<LiderRoute fallbackPath="/equipe/osg"><PageAccessGate pagePath="/equipe/osg/gerencial/logs-equipe"><OsgAuditoria /></PageAccessGate></LiderRoute>} />
              <Route path="/equipe/osg/auditoria" element={<Navigate to="/equipe/osg/gerencial/logs-equipe" replace />} />

              {/* Board Routes */}
              {/* Raiz da área Gerencial: o breadcrumb "Board" e links externos
                  apontavam para /equipe/board, que caía no NotFound. */}
              <Route path="/equipe/board" element={<Navigate to="/equipe/board/dashboard" replace />} />
              <Route path="/equipe/board/dashboard" element={<PageAccessGate pagePath="/equipe/board/dashboard"><BoardDashboard /></PageAccessGate>} />
              <Route path="/equipe/board/relatorios" element={<PageAccessGate pagePath="/equipe/board/relatorios"><BoardRelatorios /></PageAccessGate>} />
              <Route path="/equipe/board/uso-envio" element={<PageAccessGate pagePath="/equipe/board/uso-envio"><DashboardUsoEnvioGerencial /></PageAccessGate>} />
              <Route path="/equipe/board/dashboard-clientes-os" element={<PageAccessGate pagePath="/equipe/board/dashboard-clientes-os"><BoardDashboardClientesOs /></PageAccessGate>} />
              <Route path="/equipe/board/clientes" element={<PageAccessGate pagePath="/equipe/board/clientes"><BoardClientes /></PageAccessGate>} />

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
              <Route path="/equipe/board/desempenho/minha-evolucao" element={<ProtectedRoute><MinhaEvolucao /></ProtectedRoute>} />

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
