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
import EquipeTarefas from "./pages/equipe/EquipeTarefas";
import EquipeNovaTarefa from "./pages/equipe/EquipeNovaTarefa";
import EquipeDemandas from "./pages/equipe/EquipeDemandas";

import EquipeProcessos from "./pages/equipe/EquipeProcessos";
import EquipeBiblioteca from "./pages/equipe/EquipeBiblioteca";
import EquipeBacklog from "./pages/equipe/EquipeBacklog";
import DigitalAreaSelector from "./pages/equipe/DigitalAreaSelector";
import DevDashboard from "./pages/equipe/dev/DevDashboard";
import NovaFerramenta from "./pages/equipe/dev/NovaFerramenta";
import DetalheFerramenta from "./pages/equipe/dev/DetalheFerramenta";
import ConsultaXMLs from "./pages/equipe/dev/ConsultaXMLs";
import GerenciarDados from "./pages/equipe/dev/GerenciarDados";
import GestaoNovidades from "./pages/gestao/GestaoNovidades";
import GestaoChamados from "./pages/gestao/GestaoChamados";
import Novidades from "./pages/Novidades";
import NotFound from "./pages/NotFound";
import EquipeControleAcessos from "./pages/equipe/EquipeControleAcessos";
import { GestaoPasswordGate } from "./components/gestao/GestaoPasswordGate";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/novidades" element={<Novidades />} />
            <Route path="/auth" element={<Auth />} />
            
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
            <Route path="/equipe/chamados" element={<TeamRoute><EquipeChamados /></TeamRoute>} />
            <Route path="/equipe/chamados/:id" element={<TeamRoute><EquipeDetalhesChamado /></TeamRoute>} />
            <Route path="/equipe/dashboard" element={<TeamRoute><EquipeDashboard /></TeamRoute>} />
            <Route path="/equipe/projetos" element={<TeamRoute><EquipeProjetos /></TeamRoute>} />
            <Route path="/equipe/kanban" element={<TeamRoute><EquipeKanban /></TeamRoute>} />
            <Route path="/equipe/sprints" element={<TeamRoute><EquipeSprints /></TeamRoute>} />
            <Route path="/equipe/sprints/:id" element={<TeamRoute><EquipeSprintDetalhes /></TeamRoute>} />
            <Route path="/equipe/daily" element={<TeamRoute><EquipeDaily /></TeamRoute>} />
            <Route path="/equipe/tarefas" element={<TeamRoute><EquipeTarefas /></TeamRoute>} />
            <Route path="/equipe/tarefas/nova" element={<TeamRoute><EquipeNovaTarefa /></TeamRoute>} />
            <Route path="/equipe/demandas" element={<TeamRoute><EquipeDemandas /></TeamRoute>} />
            
            <Route path="/equipe/processos" element={<TeamRoute><EquipeProcessos /></TeamRoute>} />
            <Route path="/equipe/biblioteca" element={<TeamRoute><EquipeBiblioteca /></TeamRoute>} />
            <Route path="/equipe/backlog" element={<TeamRoute><EquipeBacklog /></TeamRoute>} />
            <Route path="/equipe/digital" element={<TeamRoute><DigitalAreaSelector /></TeamRoute>} />
            <Route path="/equipe/dev" element={<TeamRoute><DevDashboard /></TeamRoute>} />
            <Route path="/equipe/dev/nova-ferramenta" element={<TeamRoute><NovaFerramenta /></TeamRoute>} />
            <Route path="/equipe/dev/ferramenta/:id" element={<TeamRoute><DetalheFerramenta /></TeamRoute>} />
            <Route path="/equipe/dev/consulta-xmls" element={<TeamRoute><ConsultaXMLs /></TeamRoute>} />
            <Route path="/equipe/dev/gerenciar-dados" element={<TeamRoute><GerenciarDados /></TeamRoute>} />
            <Route path="/equipe/acessos" element={<AdminRoute><EquipeControleAcessos /></AdminRoute>} />
            
            {/* Gestão Routes - Protected by password gate */}
            <Route path="/gestao" element={<AdminRoute><GestaoPasswordGate><GestaoNovidades /></GestaoPasswordGate></AdminRoute>} />
            <Route path="/gestao/chamados" element={<AdminRoute><GestaoPasswordGate><GestaoChamados /></GestaoPasswordGate></AdminRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
