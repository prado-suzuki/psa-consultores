// Porta de entrada da equipe (`/equipe`).
//
// A ordem das duas etapas foi invertida. Antes a tela abria pedindo a área, com
// as cinco listadas para qualquer visitante, e só depois pedia as credenciais:
// quem clicasse no ícone da equipe no site via a divisão interna da empresa sem
// ter conta nenhuma. Agora o login vem primeiro, e a lista de áreas só existe
// depois da sessão — trazendo apenas as áreas daquela pessoa.
//
// A tela também é o "Trocar área" de quem já está dentro (ver AdminLayout e
// GestaoLayout), então para sessão ativa ela abre direto no seletor.
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ArrowLeft, Mail, Lock, ChevronRight, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo-psa.png';
import { AREA_ROUTES, type AreaKey } from '@/config/areaCategories';
import { useUserAccessibleCategories } from '@/hooks/useUserAccessibleCategories';
import { areasDoUsuario } from '@/lib/areasDoUsuario';
import { checkAreaAccess } from '@/lib/accessControl';

const EquipeAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [areaEmVerificacao, setAreaEmVerificacao] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { signIn, signOut, user, isTeamMember, isAdmin, isLider, isSublider, isMarketing, mustChangePassword, loading } = useAuth();
  const navigate = useNavigate();
  /**
   * Quem passa da portaria de `/equipe`.
   *
   * `marketing` entra aqui para poder existir sozinho. Antes, dar acesso à área
   * de Marketing exigia empilhar um papel da hierarquia (era o `sublider` do
   * usuário mkt@), e isso abre 250 políticas em 114 tabelas no banco só para a
   * pessoa atravessar uma porta.
   *
   * Passar da portaria não concede área nenhuma: o seletor logo adiante só
   * mostra o que a permissão de página liberar, e cada rota mantém o seu guarda.
   */
  const isInternalUser = isTeamMember || isAdmin || isLider || isSublider || isMarketing;

  const {
    categories,
    isLoading: carregandoAreas,
    isError: erroAoCarregarAreas,
    refetch: recarregarAreas,
  } = useUserAccessibleCategories();
  const areasVisiveis = useMemo(() => areasDoUsuario(categories), [categories]);

  // Senha provisória tem prioridade sobre qualquer área: trocar a senha é o
  // único caminho para frente.
  useEffect(() => {
    if (!loading && user && mustChangePassword) {
      navigate('/primeiro-acesso', { replace: true });
    }
  }, [loading, user, mustChangePassword, navigate]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Sem navegação aqui: assim que o AuthContext confirmar a sessão, a
      // própria tela troca para o seletor de áreas.
      await signIn(email, password);
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Falha na conexão. Verifique sua internet e tente novamente.', {
        position: 'bottom-right',
        duration: 4000,
      });
    }
    setIsLoading(false);
  };

  /**
   * A lista já vem filtrada, mas a checagem de acesso continua no clique.
   * Filtro é o que se vê; `checkAreaAccess` é o que se pode. Se os dois um dia
   * divergirem, a pessoa recebe um aviso claro em vez de cair na tela de
   * "Acesso Negado" do guard de rota.
   */
  const handleAreaSelect = async (area: AreaKey) => {
    if (!user) return;
    setAreaEmVerificacao(area);
    const hasAccess = await checkAreaAccess(user.id, area, isAdmin);
    setAreaEmVerificacao(null);

    if (!hasAccess) {
      toast.error('Você não possui acesso a esta área', { position: 'bottom-right', duration: 3000 });
      return;
    }
    navigate(AREA_ROUTES[area] || '/equipe/dashboard');
  };

  const handleSair = async () => {
    await signOut();
    setEmail('');
    setPassword('');
  };

  const voltarAoSite = (
    <Button variant="ghost" className="w-full text-gray-400 hover:text-white" onClick={() => navigate('/')}>
      <ArrowLeft className="h-4 w-4 mr-2" />
      Voltar ao site
    </Button>
  );

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

        {/*
          Enquanto a sessão é resolvida, só o cartão espera: a marca e o título
          já estão pintados. Antes a tela inteira ficava preta com um giro no
          meio, e a espera parecia bem maior do que era.
        */}
        {loading ? (
          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-lg">
            <CardContent className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </CardContent>
          </Card>
        ) : !user ? (
          // ─── Etapa 1: credenciais ──────────────────────────────────────────
          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="text-white">Acesso Restrito</CardTitle>
              <CardDescription className="text-gray-400">
                Entre com suas credenciais de membro da equipe
              </CardDescription>
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

              <div className="mt-6 pt-4 border-t border-gray-800">{voltarAoSite}</div>
            </CardContent>
          </Card>
        ) : !isInternalUser ? (
          // ─── Sessão de cliente tentando a porta da equipe ──────────────────
          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="text-white">Acesso restrito à equipe</CardTitle>
              <CardDescription className="text-gray-400">
                Esta conta não é de um membro da equipe. Entre com uma conta da equipe ou volte para a área do cliente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full text-gray-400 hover:text-white" onClick={handleSair}>
                <LogOut className="h-4 w-4 mr-2" />
                Entrar com outra conta
              </Button>
              {voltarAoSite}
            </CardContent>
          </Card>
        ) : (
          // ─── Etapa 2: as áreas dessa pessoa ────────────────────────────────
          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="text-white">Selecione sua área</CardTitle>
              <CardDescription className="text-gray-400">
                {user.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {carregandoAreas ? (
                <p className="text-sm text-gray-400 py-2">Carregando suas áreas...</p>
              ) : erroAoCarregarAreas ? (
                // Falha de consulta não pode ser confundida com falta de
                // permissão: as duas chegam aqui como lista vazia, e dizer
                // "fale com um administrador" para quem só caiu a internet
                // manda a pessoa para o caminho errado.
                <div className="space-y-3 py-2">
                  <p className="text-sm text-gray-400">
                    Não foi possível carregar suas áreas. Verifique sua conexão.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-gray-700 text-gray-200 hover:bg-gray-800"
                    onClick={() => recarregarAreas()}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : areasVisiveis.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">
                  Nenhuma área liberada para este acesso. Fale com um administrador.
                </p>
              ) : (
                <div className="space-y-2">
                  {areasVisiveis.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      disabled={areaEmVerificacao !== null}
                      onClick={() => handleAreaSelect(area.id)}
                      className="w-full flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-left text-white transition-colors hover:border-primary hover:bg-primary/10 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span className="font-medium">{area.label}</span>
                      {areaEmVerificacao === area.id ? (
                        <span className="text-xs text-gray-400">Verificando...</span>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-gray-800 space-y-2">
                <Button variant="ghost" className="w-full text-gray-400 hover:text-white" onClick={handleSair}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
                {voltarAoSite}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EquipeAuth;
