import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, ArrowLeft, Mail, Lock, ChevronRight, ShieldX } from 'lucide-react';
import logo from '@/assets/logo-psa.png';

interface GestaoAccessGateProps {
  children: React.ReactNode;
}

export const GestaoAccessGate = ({ children }: GestaoAccessGateProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const { signIn, user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Query to check if user has access to gestao area
  const { data: hasAccess, isLoading: accessLoading } = useQuery({
    queryKey: ['gestao-access', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      // Admins always have access
      if (isAdmin) return true;
      
      // Check if user has specific access in user_page_access for any gestao page
      const { data: gestaoPages } = await supabase
        .from('page_permissions')
        .select('id')
        .eq('category', 'gestao');
      
      if (!gestaoPages || gestaoPages.length === 0) return false;
      
      const gestaoPageIds = gestaoPages.map(p => p.id);
      
      const { data: access } = await supabase
        .from('user_page_access')
        .select('id')
        .eq('user_id', user.id)
        .in('page_permission_id', gestaoPageIds)
        .limit(1);
      
      return access && access.length > 0;
    },
    enabled: !!user && !authLoading,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    
    const { error } = await signIn(email, password);
    
    if (error) {
      setLoginError('Email ou senha incorretos');
    }
    
    setIsLoading(false);
  };

  // Show loading while auth is being checked
  if ((authLoading || accessLoading) && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated, show login form
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logo} alt="PSA Consultores" className="h-16 mx-auto mb-4" />
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShieldAlert className="h-6 w-6 text-amber-500" />
              <h1 className="text-2xl font-bold text-white">Área de Gestão</h1>
            </div>
            <p className="text-gray-400">Sistema de Gestão de Conteúdo</p>
          </div>

          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Acesso Restrito</CardTitle>
                  <CardDescription className="text-gray-400">
                    Entre com suas credenciais
                  </CardDescription>
                </div>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-500 text-sm rounded-full">
                  Gestão
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="********"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                      required
                    />
                  </div>
                </div>

                {loginError && (
                  <p className="text-sm text-red-400 flex items-center gap-2">
                    <ShieldX className="h-4 w-4" />
                    {loginError}
                  </p>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? 'Entrando...' : 'Entrar'}
                  {!isLoading && <ChevronRight className="h-4 w-4 ml-2" />}
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-gray-800">
                <Button 
                  variant="ghost" 
                  className="w-full text-gray-400 hover:text-white"
                  onClick={() => navigate('/')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao site
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If authenticated but no access, show access denied
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logo} alt="PSA Consultores" className="h-16 mx-auto mb-4" />
          </div>

          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-lg">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                  <ShieldX className="h-8 w-8 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Acesso Negado</h2>
                  <p className="text-gray-400 text-sm">
                    Você não possui permissão para acessar a área de Gestão.
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    Entre em contato com um administrador para solicitar liberação de acesso.
                  </p>
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  <Button 
                    variant="outline"
                    className="w-full border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                    onClick={() => navigate('/equipe/auth')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Trocar área
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full text-gray-400 hover:text-white"
                    onClick={() => navigate('/')}
                  >
                    Voltar ao site
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // User has access, render children
  return <>{children}</>;
};

export default GestaoAccessGate;
