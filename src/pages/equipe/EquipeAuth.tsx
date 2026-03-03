import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, ArrowLeft, Mail, Lock, Building2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo-psa.png';

const areas = [
  { id: 'board', label: 'Gerencial' },
  { id: 'controle_site', label: 'Chamados' },
  { id: 'digital', label: 'Digital' },
  { id: 'osg', label: 'OSG' },
  { id: 'tax', label: 'Tax' },
];

// Verifica se o usuário tem acesso à área específica
const checkAreaAccess = async (userId: string, area: string, isAdmin: boolean): Promise<boolean> => {
  // Admins têm acesso a todas as áreas
  if (isAdmin) return true;

  try {
    // Mapeia as áreas para suas categorias de permissão
    const areaCategories: Record<string, string[]> = {
      digital: ['rotina', 'dev'],
      tax: ['tax', 'projetos', 'fiscal'],
      osg: ['osg'],
      controle_site: ['gestao'],
      board: ['board'],
    };

    const categories = areaCategories[area];
    if (!categories) return false;

    // Buscar páginas da categoria
    const { data: pages } = await supabase
      .from('page_permissions')
      .select('id')
      .in('category', categories);

    if (!pages?.length) return false;

    const { data: access } = await supabase
      .from('user_page_access')
      .select('id')
      .eq('user_id', userId)
      .in('page_permission_id', pages.map(p => p.id))
      .limit(1);

    return access !== null && access.length > 0;
  } catch (error) {
    console.error('Erro ao verificar acesso:', error);
    return false;
  }
};

const navigateToArea = (navigate: ReturnType<typeof useNavigate>, area: string) => {
  const areaRoutes: Record<string, string> = {
    digital: '/equipe/digital',
    tax: '/equipe/tax/dashboard',
    osg: '/equipe/osg/dashboard',
    controle_site: '/gestao',
    board: '/equipe/board/dashboard',
  };
  
  navigate(areaRoutes[area] || '/equipe/dashboard');
};

const EquipeAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [pendingArea, setPendingArea] = useState<string | null>(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { signIn, user, isTeamMember, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  // Navegação reativa: só navega quando AuthContext confirma user + roles
  useEffect(() => {
    if (pendingArea && !loading && user && (isTeamMember || isAdmin)) {
      if (user.user_metadata?.must_change_password === true) {
        navigate('/primeiro-acesso', { replace: true });
        setPendingArea(null);
        return;
      }
      navigateToArea(navigate, pendingArea);
      setPendingArea(null);
    }
  }, [pendingArea, loading, user, isTeamMember, isAdmin, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Digite seu email');
      return;
    }
    setForgotLoading(true);
    await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    toast.success('Se esse email estiver cadastrado, você receberá um link de redefinição.');
    setShowForgotPassword(false);
    setForgotEmail('');
  };

  const handleAreaSelect = async (area: string) => {
    setSelectedArea(area);
    
    // Se usuário já autenticado, verificar acesso antes de navegar
    if (user && (isTeamMember || isAdmin)) {
      setIsCheckingAccess(true);
      
      const hasAccess = await checkAreaAccess(user.id, area, isAdmin);
      
      if (!hasAccess) {
        // Resetar seleção e mostrar toast discreto
        setSelectedArea('');
        toast.error('Você não possui acesso a esta área', {
          position: 'bottom-right',
          duration: 3000,
        });
        setIsCheckingAccess(false);
        return;
      }
      
      // Tem acesso, pode navegar
      setIsCheckingAccess(false);
      navigateToArea(navigate, area);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await signIn(email, password);
      
      if (!error) {
        // Buscar a sessão recém criada para obter o user ID
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Verificar roles do usuário
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id);
          
          const userIsAdmin = roles?.some(r => r.role === 'admin') || false;
          const userIsTeamMember = roles?.some(r => r.role === 'team_member') || false;
          
          // Verificar se é membro da equipe
          if (!userIsAdmin && !userIsTeamMember) {
            toast.error('Acesso restrito a membros da equipe', {
              position: 'bottom-right',
              duration: 3000,
            });
            setIsLoading(false);
            return;
          }
          
          // Verificar acesso à área selecionada
          const hasAccess = await checkAreaAccess(session.user.id, selectedArea, userIsAdmin);
          
          if (!hasAccess) {
            setSelectedArea('');
            toast.error('Você não possui acesso a esta área', {
              position: 'bottom-right',
              duration: 3000,
            });
            setIsLoading(false);
            return;
          }
          
          // Verificar se precisa trocar senha
          if (session.user.user_metadata?.must_change_password === true) {
            navigate('/primeiro-acesso', { replace: true });
            setIsLoading(false);
            return;
          }
          
          // Tem acesso, pode navegar
          navigateToArea(navigate, selectedArea);
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error('Falha na conexão. Verifique sua internet e tente novamente.', {
        position: 'bottom-right',
        duration: 4000,
      });
    }
    
    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logo} alt="PSA Consultores" className="h-16 mx-auto mb-4" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-white">Área da Equipe</h1>
          </div>
          <p className="text-gray-400">Sistema de Gestão de Demandas</p>
        </div>

        {!selectedArea ? (
          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-400" />
                Selecione sua área
              </CardTitle>
              <CardDescription className="text-gray-400">
                Escolha a área de atuação antes de continuar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedArea} onValueChange={handleAreaSelect} disabled={isCheckingAccess}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder={isCheckingAccess ? "Verificando acesso..." : "Escolha sua área"} />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {areas.map((area) => (
                    <SelectItem 
                      key={area.id} 
                      value={area.id}
                      className="text-gray-100 hover:bg-primary/20 focus:bg-primary/20 focus:text-white"
                    >
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="pt-4 border-t border-gray-800">
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
        ) : (
          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Acesso Restrito</CardTitle>
                  <CardDescription className="text-gray-400">
                    Entre com suas credenciais de membro da equipe
                  </CardDescription>
                </div>
                <Badge area={selectedArea} />
              </div>
            </CardHeader>
            <CardContent>
              {showForgotPassword ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-sm text-gray-400">
                    Informe seu email e enviaremos um link para redefinir sua senha.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-gray-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={forgotLoading}>
                    {forgotLoading ? 'Enviando...' : 'Enviar link de redefinição'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="text-sm text-primary hover:underline w-full text-center"
                  >
                    Voltar ao login
                  </button>
                </form>
              ) : (
                <>
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

                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Verificando...' : 'Entrar'}
                      {!isLoading && <ChevronRight className="h-4 w-4 ml-2" />}
                    </Button>
                  </form>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-gray-400 hover:text-white hover:underline w-full text-center mt-3"
                  >
                    Esqueci minha senha
                  </button>
                </>
              )}

              <div className="mt-6 pt-4 border-t border-gray-800 space-y-2">
                <Button 
                  variant="ghost" 
                  className="w-full text-gray-400 hover:text-white"
                  onClick={() => setSelectedArea('')}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Trocar área
                </Button>
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
        )}
      </div>
    </div>
  );
};

const Badge = ({ area }: { area: string }) => {
  const areaLabel = areas.find(a => a.id === area)?.label || area;
  return (
    <span className="px-3 py-1 bg-primary/20 text-primary text-sm rounded-full">
      {areaLabel}
    </span>
  );
};

export default EquipeAuth;
