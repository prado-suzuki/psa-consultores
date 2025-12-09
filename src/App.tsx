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
import EquipeAuth from "./pages/equipe/EquipeAuth";
import EquipeDashboard from "./pages/equipe/EquipeDashboard";
import EquipeProjetos from "./pages/equipe/EquipeProjetos";
import EquipeKanban from "./pages/equipe/EquipeKanban";
import EquipeSprints from "./pages/equipe/EquipeSprints";
import EquipeSprintDetalhes from "./pages/equipe/EquipeSprintDetalhes";
import EquipeDaily from "./pages/equipe/EquipeDaily";
import EquipeTarefas from "./pages/equipe/EquipeTarefas";
import EquipeNovaTarefa from "./pages/equipe/EquipeNovaTarefa";
import EquipeRotina from "./pages/equipe/EquipeRotina";
import EquipeUsuarios from "./pages/equipe/EquipeUsuarios";
import NotFound from "./pages/NotFound";

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
            
            {/* Equipe Routes */}
            <Route path="/equipe" element={<EquipeAuth />} />
            <Route path="/equipe/dashboard" element={<TeamRoute><EquipeDashboard /></TeamRoute>} />
            <Route path="/equipe/projetos" element={<TeamRoute><EquipeProjetos /></TeamRoute>} />
            <Route path="/equipe/kanban" element={<TeamRoute><EquipeKanban /></TeamRoute>} />
            <Route path="/equipe/sprints" element={<TeamRoute><EquipeSprints /></TeamRoute>} />
            <Route path="/equipe/sprints/:id" element={<TeamRoute><EquipeSprintDetalhes /></TeamRoute>} />
            <Route path="/equipe/daily" element={<TeamRoute><EquipeDaily /></TeamRoute>} />
            <Route path="/equipe/tarefas" element={<TeamRoute><EquipeTarefas /></TeamRoute>} />
            <Route path="/equipe/tarefas/nova" element={<TeamRoute><EquipeNovaTarefa /></TeamRoute>} />
            <Route path="/equipe/rotina" element={<TeamRoute><EquipeRotina /></TeamRoute>} />
            <Route path="/equipe/usuarios" element={<TeamRoute><EquipeUsuarios /></TeamRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
