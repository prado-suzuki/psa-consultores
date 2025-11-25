import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ClienteDashboard from "./pages/cliente/ClienteDashboard";
import NovoChamado from "./pages/cliente/NovoChamado";
import MeusChamados from "./pages/cliente/MeusChamados";
import DetalhesChamado from "./pages/cliente/DetalhesChamado";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClientes from "./pages/admin/AdminClientes";
import AdminChamados from "./pages/admin/AdminChamados";
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
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
