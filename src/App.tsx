import { lazy, Suspense } from "react";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AreaThemeProvider } from "@/components/AreaThemeProvider";
import { AgenteProvider } from "@/contexts/AgenteProvider";
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
import { PageLoader } from "./components/PageLoader";
import { PrefetchDeRotas } from "./components/PrefetchDeRotas";
import { queryClient } from "./lib/queryClient";

// Cada rota é um chunk próprio — e este arquivo já esteve nos dois lados dessa
// decisão, então a razão importa mais que a escolha.
//
// HISTÓRIA. Um PR converteu as rotas para `lazy` e o commit `ba0c461b` (15/04)
// desfez tudo, com motivo escrito: cada primeira navegação passou a esperar o
// Vite compilar o chunk SOB DEMANDA no preview do Lovable — "demora ao mudar de
// página", "telas em branco". O trade-off assumido foi bundle inicial de ~3,9 MB
// em troca de navegação instantânea.
//
// POR QUE VOLTOU. Duas coisas mudaram. A primeira é a premissa: o bundle não
// ficou em 3,9 MB. A segunda, e é a que resolve, é que a reclamação era do DEV
// SERVER, não do app publicado — em produção o chunk já está compilado e
// buscá-lo é um GET pequeno. As duas pontas do problema original estão tratadas
// fora daqui, e sem elas esta mudança merece ser revertida de novo:
//
//   · `PrefetchDeRotas`, abaixo, que traz o grafo DEPOIS do primeiro paint —
//     em produção e em dev. É esta a peça que responde pela navegação.
//   · `vite.config.ts` → `server.warmup`, complemento: pré-transforma as
//     páginas no start, para a página em si nunca ser o gargalo. Não desce na
//     subárvore, então sozinho ele não resolveria 15/04.
//
// NÃO reintroduza `manualChunks` junto: o TDZ que ele causou (ver
// `vite.config.ts`) veio de FORÇAR agrupamento de vendor, não de dividir por
// rota. Aqui o Rollup segue os limites naturais do grafo, que é outro caminho.
//
// O `Suspense` fica em volta de `<Routes>`, com o `PageLoader` de tela cheia —
// era ele o "tela em branco" de 15/04, que existia sem ninguém usar.
//
// Para ver a divisão de hoje:  bun run build  (e olhar dist/assets)

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Público / Auth
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PrimeiroAcesso = lazy(() => import("./pages/PrimeiroAcesso"));
const Missao = lazy(() => import("./pages/Missao"));
const Novidades = lazy(() => import("./pages/Novidades"));
const NovidadeDetalhe = lazy(() => import("./pages/NovidadeDetalhe"));
const Ajuda = lazy(() => import("./pages/Ajuda"));

// Portal do Cliente
const ClienteDashboard = lazy(() => import("./pages/cliente/ClienteDashboard"));
const NovoChamado = lazy(() => import("./pages/cliente/NovoChamado"));
const MeusChamados = lazy(() => import("./pages/cliente/MeusChamados"));
const DetalhesChamado = lazy(() => import("./pages/cliente/DetalhesChamado"));


// Equipe (core)
const EquipeAuth = lazy(() => import("./pages/equipe/EquipeAuth"));
const EquipeChamados = lazy(() => import("./pages/equipe/EquipeChamados"));
const EquipeDetalhesChamado = lazy(() => import("./pages/equipe/EquipeDetalhesChamado"));
const EquipeDashboard = lazy(() => import("./pages/equipe/EquipeDashboard"));
const AnaliseInteligente = lazy(() => import("./pages/equipe/dashboards/AnaliseInteligente"));
const Dashboards = lazy(() => import("./pages/equipe/dashboards/Dashboards"));
const EquipeProjetos = lazy(() => import("./pages/equipe/EquipeProjetos"));
const EquipeKanban = lazy(() => import("./pages/equipe/EquipeKanban"));
const EquipeSprints = lazy(() => import("./pages/equipe/EquipeSprints"));
const EquipeSprintDetalhes = lazy(() => import("./pages/equipe/EquipeSprintDetalhes"));
const EquipeDaily = lazy(() => import("./pages/equipe/EquipeDaily"));
const EquipeRotinas = lazy(() => import("./pages/equipe/EquipeRotinas"));
const EquipeProcessos = lazy(() => import("./pages/equipe/EquipeProcessos"));
const EquipeMapeamento = lazy(() => import("./pages/equipe/EquipeMapeamento"));
const EquipeBiblioteca = lazy(() => import("./pages/equipe/EquipeBiblioteca"));
const EquipeBacklog = lazy(() => import("./pages/equipe/EquipeBacklog"));
const EquipeRelatorios = lazy(() => import("./pages/equipe/EquipeRelatorios"));
const EquipeControleAcessos = lazy(() => import("./pages/equipe/EquipeControleAcessos"));
const DigitalAreaSelector = lazy(() => import("./pages/equipe/DigitalAreaSelector"));
const MapaRoutes = lazy(() => import("./pages/equipe/mapa/MapaRoutes"));

// Equipe > Dev
const DevDashboard = lazy(() => import("./pages/equipe/dev/DevDashboard"));
const NovaFerramenta = lazy(() => import("./pages/equipe/dev/NovaFerramenta"));
const DetalheFerramenta = lazy(() => import("./pages/equipe/dev/DetalheFerramenta"));
const ConsultaXMLs = lazy(() => import("./pages/equipe/dev/ConsultaXMLs"));
const ConsultaSpedHub = lazy(() => import("./pages/equipe/dev/ConsultaSpedHub"));
const ConsultaEFD = lazy(() => import("./pages/equipe/dev/ConsultaEFD"));
const ConsultaEFDICMS = lazy(() => import("./pages/equipe/dev/ConsultaEFDICMS"));
const ConsultaECD = lazy(() => import("./pages/equipe/dev/ConsultaECD"));
const ConsultaECF = lazy(() => import("./pages/equipe/dev/ConsultaECF"));
const GerenciarDados = lazy(() => import("./pages/equipe/dev/GerenciarDados"));
const GerenciarDadosHub = lazy(() => import("./pages/equipe/dev/GerenciarDadosHub"));
const GerenciarDadosDashboards = lazy(() => import("./pages/equipe/dev/GerenciarDadosDashboards"));
const AnaliseIcmsHub = lazy(() => import("./pages/equipe/dev/AnaliseIcmsHub"));
const PerdcompHub = lazy(() => import("./pages/equipe/dev/PerdcompHub"));
const PerdcompDashboard = lazy(() => import("./pages/equipe/dev/PerdcompDashboard"));
const ProcessoDifal = lazy(() => import("./pages/equipe/dev/ProcessoDifal"));
const ControlePerdcomp = lazy(() => import("./pages/equipe/dev/ControlePerdcomp"));
const CalculadoraIbsCbs = lazy(() => import("./pages/equipe/dev/CalculadoraIbsCbs"));
const ControleBalancetes = lazy(() => import("./pages/equipe/dev/ControleBalancetes"));
const ApuracaoPisCofins = lazy(() => import("./pages/equipe/dev/ApuracaoPisCofins"));
const LevantamentoPisCofinsHub = lazy(() => import("./pages/equipe/dev/LevantamentoPisCofinsHub"));
const MapaNCMPisCofins = lazy(() => import("./pages/equipe/dev/MapaNCMPisCofins"));
const AuditoriaCruzada = lazy(() => import("./pages/equipe/dev/AuditoriaCruzada"));
const CorrecoesSped = lazy(() => import("./pages/equipe/dev/CorrecoesSped"));
const ProcedimentosDev = lazy(() => import("./pages/equipe/dev/ProcedimentosDev"));
const IcmsSaidas = lazy(() => import("./pages/equipe/dev/IcmsSaidas"));

// Equipe > Fiscal / Tax
const FiscalBoasVindas = lazy(() => import("./pages/equipe/fiscal/FiscalBoasVindas"));
const FiscalDashboard = lazy(() => import("./pages/equipe/fiscal/FiscalDashboard"));
const FiscalDemandasTarefas = lazy(() => import("./pages/equipe/fiscal/FiscalDemandasTarefas"));
const FiscalFeed = lazy(() => import("./pages/equipe/fiscal/FiscalFeed"));
const FiscalProjetosCadastro = lazy(() => import("./pages/equipe/fiscal/FiscalProjetosCadastro"));
const FiscalProjetosLote = lazy(() => import("./pages/equipe/fiscal/FiscalProjetosLote"));
const FiscalAuditoria = lazy(() => import("./pages/equipe/fiscal/FiscalAuditoria"));
const FiscalCadastrosClientes = lazy(() => import("./pages/equipe/fiscal/FiscalCadastrosClientes"));
const GestaoClientes = lazy(() => import("./pages/equipe/fiscal/GestaoClientes"));
const FiscalGerencial = lazy(() => import("./pages/equipe/fiscal/FiscalGerencial"));
const FiscalGerencialChamados = lazy(() => import("./pages/equipe/fiscal/FiscalGerencialChamados"));
const FiscalGerencialChamadosDashboard = lazy(() => import("./pages/equipe/fiscal/FiscalGerencialChamadosDashboard"));
const FiscalGerencialChamadoDetalhe = lazy(() => import("./pages/equipe/fiscal/FiscalGerencialChamadoDetalhe"));
const OsgGerencialChamados = lazy(() => import("./pages/equipe/osg/OsgGerencialChamados"));
const OsgGerencialChamadosDashboard = lazy(() => import("./pages/equipe/osg/OsgGerencialChamadosDashboard"));
const OsgGerencialChamadoDetalhe = lazy(() => import("./pages/equipe/osg/OsgGerencialChamadoDetalhe"));

// Equipe > OSG / Board
const OsgAreaSelector = lazy(() => import("./pages/equipe/osg/OsgAreaSelector"));
const OsgBoasVindas = lazy(() => import("./pages/equipe/osg/OsgBoasVindas"));
const OsgGerencial = lazy(() => import("./pages/equipe/osg/OsgGerencial"));
const OsgDashboard = lazy(() => import("./pages/equipe/osg/OsgDashboard"));
const OsgTarefas = lazy(() => import("./pages/equipe/osg/OsgTarefas"));
const OsgFeed = lazy(() => import("./pages/equipe/osg/OsgFeed"));
const OsgClientes = lazy(() => import("./pages/equipe/osg/OsgClientes"));
const OsgProjetos = lazy(() => import("./pages/equipe/osg/OsgProjetos"));
const OsgProjetosLote = lazy(() => import("./pages/equipe/osg/OsgProjetosLote"));
const OsgWorkDashboard = lazy(() => import("./pages/equipe/osg/OsgWorkDashboard"));
const Onboarding = lazy(() => import("./pages/equipe/osg/Onboarding"));
const CadastroPorDocumento = lazy(() => import("./pages/equipe/osg/CadastroPorDocumento"));
const QualificacaoDasPartes = lazy(() => import("./pages/equipe/osg/QualificacaoDasPartes"));
const DiagnosticoPatrimonial = lazy(() => import("./pages/equipe/osg/DiagnosticoPatrimonial"));
const ControleMatriculas = lazy(() => import("./pages/equipe/osg/ControleMatriculas"));
const BibliotecaModelos = lazy(() => import("./pages/equipe/osg/BibliotecaModelos"));
const MontagemDocumentos = lazy(() => import("./pages/equipe/osg/MontagemDocumentos"));
const GerarDocumento = lazy(() => import("./pages/equipe/osg/GerarDocumento"));
const QuadroSocietario = lazy(() => import("./pages/equipe/osg/QuadroSocietario"));
const ExploracaoRural = lazy(() => import("./pages/equipe/osg/ExploracaoRural"));
const CalculadoraItcmd = lazy(() => import("./pages/equipe/osg/CalculadoraItcmd"));
const DocumentosCliente = lazy(() => import("./pages/equipe/osg/DocumentosCliente"));
const ChecklistsDocumentos = lazy(() => import("./pages/equipe/osg/ChecklistsDocumentos"));
const Relatorios = lazy(() => import("./pages/equipe/osg/Relatorios"));
const OsgAuditoria = lazy(() => import("./pages/equipe/osg/OsgAuditoria"));
import { BoardClusterProvider } from "./contexts/BoardClusterContext";
const BoardDashboard = lazy(() => import("./pages/equipe/board/BoardDashboard"));
const BoardRelatorios = lazy(() => import("./pages/equipe/board/BoardRelatorios"));
const BoardDashboardClientesOs = lazy(() => import("./pages/equipe/board/BoardDashboardClientesOs"));
const BoardClientes = lazy(() => import("./pages/equipe/board/BoardClientes"));
const BoardChamados = lazy(() => import("./pages/equipe/board/BoardChamados"));
const BoardChamadosDashboard = lazy(() => import("./pages/equipe/board/BoardChamadosDashboard"));
const BoardChamadoDetalhe = lazy(() => import("./pages/equipe/board/BoardChamadoDetalhe"));
const BoardCapacidade = lazy(() => import("./pages/equipe/board/BoardCapacidade"));
const BoardLogsEquipe = lazy(() => import("./pages/equipe/board/BoardLogsEquipe"));
const DashboardUsoEnvioGerencial = lazy(() => import("./pages/equipe/board/DashboardUsoEnvioGerencial"));

// Gestão
const GestaoNovidades = lazy(() => import("./pages/gestao/GestaoNovidades"));
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
            {/* O tema da área vem da ROTA, e é aplicado aqui — acima de
                <Routes> e, portanto, acima de todo gate de acesso. Dentro dos
                gates não serve: LiderRoute devolve `null` enquanto carrega o
                papel do usuário, e nesse intervalo a tela ficaria sem tema. */}
            <AreaThemeProvider>
            {/* Agente PSA: o Provider e global, o BALAO nao. Ele so aparece na
                tela que publica contexto (`useRegistrarContextoAgente`) -- e por
                isso pode morar aqui, acima das rotas, sem vazar para a home
                publica nem para o portal do cliente. Hoje: Board > Estrategico. */}
            <AgenteProvider>
            <PrefetchDeRotas />
            <Suspense fallback={<PageLoader />}>
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
              <Route path="/equipe/tax/gerencial/chamados" element={<LiderRoute><PageAccessGate pagePath="/equipe/tax/gerencial/chamados"><FiscalGerencialChamados /></PageAccessGate></LiderRoute>} />
              {/* A estática vem antes da dinâmica: `dashboard` não pode cair no `:id`. */}
              <Route path="/equipe/tax/gerencial/chamados/dashboard" element={<LiderRoute><PageAccessGate pagePath="/equipe/tax/gerencial/chamados/dashboard"><FiscalGerencialChamadosDashboard /></PageAccessGate></LiderRoute>} />
              {/* O detalhe usa a permissão da LISTA: rota com parâmetro não se
                  cadastra, e quem pode ver a lista pode abrir um item dela. */}
              <Route path="/equipe/tax/gerencial/chamados/:id" element={<LiderRoute><PageAccessGate pagePath="/equipe/tax/gerencial/chamados"><FiscalGerencialChamadoDetalhe /></PageAccessGate></LiderRoute>} />

              {/* Logs de Uso (ex-Auditoria, ex-Logs de Equipe) — líder+ e permissão nominal, como antes.
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
                <Route path="/equipe/osg/work/exploracao-rural" element={<PageAccessGate pagePath="/equipe/osg/work/exploracao-rural"><ExploracaoRural /></PageAccessGate>} />
                <Route path="/equipe/osg/work/calculadora-itcmd" element={<PageAccessGate pagePath="/equipe/osg/work/calculadora-itcmd"><CalculadoraItcmd /></PageAccessGate>} />
                <Route path="/equipe/osg/work/documentos" element={<ProtectedRoute><DocumentosCliente /></ProtectedRoute>} />
                <Route path="/equipe/osg/work/checklists" element={<ProtectedRoute><ChecklistsDocumentos /></ProtectedRoute>} />
                <Route path="/equipe/osg/work/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
              </Route>
              {/* Gestão de Chamados dentro da Gerencial da OSG. Espelha a Tax. Hoje
                  nasce vazia: não há chamado com cluster OSG. */}
              <Route path="/equipe/osg/gerencial/chamados" element={<LiderRoute fallbackPath="/equipe/osg"><PageAccessGate pagePath="/equipe/osg/gerencial/chamados"><OsgGerencialChamados /></PageAccessGate></LiderRoute>} />
              <Route path="/equipe/osg/gerencial/chamados/dashboard" element={<LiderRoute fallbackPath="/equipe/osg"><PageAccessGate pagePath="/equipe/osg/gerencial/chamados/dashboard"><OsgGerencialChamadosDashboard /></PageAccessGate></LiderRoute>} />
              <Route path="/equipe/osg/gerencial/chamados/:id" element={<LiderRoute fallbackPath="/equipe/osg"><PageAccessGate pagePath="/equipe/osg/gerencial/chamados"><OsgGerencialChamadoDetalhe /></PageAccessGate></LiderRoute>} />

              {/* Logs de Uso (ex-Auditoria, ex-Logs de Equipe) — líder+, igual à Tax; quem não é volta para a home do OSG. */}
              <Route path="/equipe/osg/gerencial/logs-equipe" element={<LiderRoute fallbackPath="/equipe/osg"><PageAccessGate pagePath="/equipe/osg/gerencial/logs-equipe"><OsgAuditoria /></PageAccessGate></LiderRoute>} />
              <Route path="/equipe/osg/auditoria" element={<Navigate to="/equipe/osg/gerencial/logs-equipe" replace />} />

              {/* Board Routes */}
              {/* Rota sem path só para o Provider: o seletor global de cliente
                  precisa estar ACIMA das páginas. Cada página do Board renderiza
                  o próprio <BoardLayout>, então um Provider dentro do layout
                  ficaria abaixo dos hooks da página e ela não enxergaria nada. */}
              <Route element={<BoardClusterProvider><Outlet /></BoardClusterProvider>}>
              {/* Raiz da área Gerencial: o breadcrumb "Board" e links externos
                  apontavam para /equipe/board, que caía no NotFound. */}
              <Route path="/equipe/board" element={<Navigate to="/equipe/board/dashboard" replace />} />
              <Route path="/equipe/board/dashboard" element={<PageAccessGate pagePath="/equipe/board/dashboard"><BoardDashboard /></PageAccessGate>} />
              {/* REMOVIDO DA DIRETORIA (reunião 17/08): relatórios do Looker Studio saem
                  do board. Item de menu já saiu em BoardLayout.tsx; rota desativada
                  aqui, arquivo BoardRelatorios.tsx intacto.
              <Route path="/equipe/board/relatorios" element={<PageAccessGate pagePath="/equipe/board/relatorios"><BoardRelatorios /></PageAccessGate>} />
              */}
              <Route path="/equipe/board/uso-envio" element={<PageAccessGate pagePath="/equipe/board/uso-envio"><DashboardUsoEnvioGerencial /></PageAccessGate>} />
              <Route path="/equipe/board/dashboard-clientes-os" element={<PageAccessGate pagePath="/equipe/board/dashboard-clientes-os"><BoardDashboardClientesOs /></PageAccessGate>} />
              <Route path="/equipe/board/clientes" element={<PageAccessGate pagePath="/equipe/board/clientes"><BoardClientes /></PageAccessGate>} />

              {/* Chamados no Board — o consolidado das mesmas telas que a Gerencial
                  da Tax e da OSG montam. Só o escopo muda, e ele vem da RLS de
                  `tickets`, não daqui.

                  Duas travas, iguais às da Gerencial: papel (LiderRoute) e permissão
                  nominal. A trava de papel importa antes do sincronizador de
                  `/equipe/acessos` rodar — página ainda não cadastrada é tratada como
                  livre pelo `usePageAccess`, e esta é a visão da empresa inteira.
                  `fallbackPath` é a home do portal: quem não é líder+ não tem Board. */}
              <Route path="/equipe/board/chamados" element={<LiderRoute fallbackPath="/equipe"><PageAccessGate pagePath="/equipe/board/chamados"><BoardChamados /></PageAccessGate></LiderRoute>} />
              {/* REMOVIDO DA DIRETORIA (reunião 17/08): item de menu já saiu em
                  BoardLayout.tsx. Volta depois como recorte estratégico dentro de
                  Clientes; rota desativada aqui, arquivo BoardChamadosDashboard.tsx
                  intacto. A estática vinha antes da dinâmica porque `dashboard` não
                  pode cair no `:id` -- vale de novo se esta rota voltar.
              <Route path="/equipe/board/chamados/dashboard" element={<LiderRoute fallbackPath="/equipe"><PageAccessGate pagePath="/equipe/board/chamados/dashboard"><BoardChamadosDashboard /></PageAccessGate></LiderRoute>} />
              */}
              {/* O detalhe usa a permissão da LISTA, como na Tax: rota com parâmetro
                  não se cadastra, e quem vê a lista pode abrir um item dela. */}
              <Route path="/equipe/board/chamados/:id" element={<LiderRoute fallbackPath="/equipe"><PageAccessGate pagePath="/equipe/board/chamados"><BoardChamadoDetalhe /></PageAccessGate></LiderRoute>} />

              {/* Capacidade e Logs de Equipe — dashboard de área e auditoria das
                  áreas somadas, nos mesmos componentes do Tax e da OSG. Líder+ pelo
                  mesmo motivo das originais: é leitura sobre o time todo.

                  "Capacidade" saiu do menu (BoardLayout.tsx), mas a rota fica ATIVA
                  de propósito, como a do Operacional: o alerta "projetos que não
                  cabem no prazo do contrato" da faixa do Estratégico navega para
                  ela (`boardEstrategico.ts`). Desativá-la quebraria esse link. */}
              <Route path="/equipe/board/capacidade" element={<LiderRoute fallbackPath="/equipe"><PageAccessGate pagePath="/equipe/board/capacidade"><BoardCapacidade /></PageAccessGate></LiderRoute>} />
              <Route path="/equipe/board/logs-equipe" element={<LiderRoute fallbackPath="/equipe"><PageAccessGate pagePath="/equipe/board/logs-equipe"><BoardLogsEquipe /></PageAccessGate></LiderRoute>} />

              {/* Performance & Desempenho Routes (inside Board) */}
              {/* "Operacional" saiu do menu de Gestão de Time (reunião 17/08,
                  BoardLayout.tsx), mas a rota fica ATIVA de propósito: "Áreas em um
                  olhar" e "Acompanhamento de execução" no Estratégico, e um card da
                  faixa de KPIs, navegam para aqui como detalhe. */}
              <Route path="/equipe/board/performance" element={<DesempenhoAccessGate><PerformanceDashboard /></DesempenhoAccessGate>} />
              {/* REMOVIDO DO BOARD: a aba "Desempenho" e seus oito submenus sairam
                  do menu (BoardLayout.tsx) e as rotas estao desativadas aqui.
                  Os arquivos das paginas ficam intactos em
                  src/pages/gerencial/desempenho/, como ja foi feito com
                  "Dashboards" e "Chamados" (reuniao 17/08). O
                  DesempenhoAccessGate continua em uso: e ele que protege
                  /equipe/board/performance, logo acima.
              <Route path="/equipe/board/desempenho" element={<DesempenhoAccessGate><DesempenhoVisaoGeral /></DesempenhoAccessGate>} />
              <Route path="/equipe/board/desempenho/ciclos" element={<DesempenhoAccessGate><DesempenhoCiclos /></DesempenhoAccessGate>} />
              <Route path="/equipe/board/desempenho/metas" element={<DesempenhoAccessGate><DesempenhoMetas /></DesempenhoAccessGate>} />
              <Route path="/equipe/board/desempenho/feedbacks" element={<DesempenhoAccessGate><DesempenhoFeedbacks /></DesempenhoAccessGate>} />
              <Route path="/equipe/board/desempenho/1a1" element={<DesempenhoAccessGate><DesempenhoReunioes1a1 /></DesempenhoAccessGate>} />
              <Route path="/equipe/board/desempenho/evolucao" element={<DesempenhoAccessGate><DesempenhoEvolucao /></DesempenhoAccessGate>} />
              <Route path="/equipe/board/desempenho/decisoes" element={<DesempenhoAccessGate><DesempenhoDecisoes /></DesempenhoAccessGate>} />
              <Route path="/equipe/board/desempenho/relatorios" element={<DesempenhoAccessGate><DesempenhoRelatorios /></DesempenhoAccessGate>} />
              */}
              {/* REMOVIDO DO BOARD: a secao "Minha Area" saiu da barra lateral junto
                  com a aba Desempenho, e esta era a unica tela dela. Rota
                  desativada; MinhaEvolucao.tsx fica intacto.
              <Route path="/equipe/board/desempenho/minha-evolucao" element={<ProtectedRoute><MinhaEvolucao /></ProtectedRoute>} />
              */}
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </AgenteProvider>
            </AreaThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
