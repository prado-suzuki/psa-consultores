import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import ReautenticacaoDialog from '@/components/auth/ReautenticacaoDialog';
import { estadoDaSessao, refreshFalhouDefinitivamente } from '@/lib/sessaoExpiracao';

let refreshSessionPromise: Promise<Session | null> | null = null;

/** De quanto em quanto tempo o relógio da sessão é conferido. */
const INTERVALO_VIGIA_MS = 30_000;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isTeamMember: boolean;
  isLider: boolean;
  isSublider: boolean;
  /**
   * Papel `marketing`: gerencia as novidades do site.
   *
   * Fica separado de `isTeamMember` de propósito. É um papel LATERAL, que no
   * banco não entra na hierarquia de `has_role_or_higher` — juntá-lo aos outros
   * aqui faria a tela dizer "é da equipe" para quem o banco trata como de fora,
   * e as duas verdades precisam bater.
   */
  isMarketing: boolean;
  mustChangePassword: boolean;
  loading: boolean;
  /**
   * A sessão morreu e o app está pedindo reautenticação SEM desmontar nada.
   *
   * Exposto para quem quiser suspender polling/salvamento automático enquanto o
   * diálogo está aberto. Ninguém precisa reagir: o padrão já é não destrutivo.
   */
  sessaoExpirada: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<Session | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [isLider, setIsLider] = useState(false);
  const [isSublider, setIsSublider] = useState(false);
  const [isMarketing, setIsMarketing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessaoExpirada, setSessaoExpirada] = useState(false);

  // Refs to compare identity before triggering state updates
  const userIdRef = useRef<string | null>(null);
  const rolesCheckedRef = useRef(false);
  /**
   * O logout foi pedido pela pessoa (botão Sair) ou aconteceu com ela?
   *
   * `SIGNED_OUT` chega igual nos dois casos, e tratar os dois igual era metade
   * do B21: um token que expirou zerava o usuário, o `ProtectedRoute` mandava
   * para o login e o formulário aberto ia junto. Saída pedida limpa tudo; sessão
   * que caiu abre o diálogo de reautenticação e não desmonta nada.
   */
  const saidaVoluntariaRef = useRef(false);
  /** `expires_at` para o qual o aviso de "vai expirar" já foi dado. */
  const avisoDadoParaRef = useRef<number | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        setSession(session);
        setUser(session?.user ?? null);
        userIdRef.current = session?.user?.id ?? null;

        if (session?.user) {
          await checkRoles(session.user.id);
          rolesCheckedRef.current = true;
        } else {
          setIsAdmin(false);
          setIsTeamMember(false);
          setIsLider(false);
          setIsSublider(false);
          setIsMarketing(false);
        }
      } finally {
        setLoading(false);
      }
    };

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      const newUserId = newSession?.user?.id ?? null;

      if (event === 'TOKEN_REFRESHED') {
        // Token refreshed (e.g. tab refocus) — update session ref silently.
        // Do NOT re-check roles, do NOT touch loading, do NOT update user state.
        // This prevents the entire component tree from remounting.
        setSession(newSession);
        setSessaoExpirada(false);
        avisoDadoParaRef.current = null;
        return;
      }

      if (event === 'SIGNED_IN') {
        // Only do a full state update if the user actually changed
        const userChanged = newUserId !== userIdRef.current;
        userIdRef.current = newUserId;
        setSessaoExpirada(false);
        saidaVoluntariaRef.current = false;
        avisoDadoParaRef.current = null;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user && (userChanged || !rolesCheckedRef.current)) {
          setLoading(true);
          void checkRoles(newSession.user.id).finally(() => {
            rolesCheckedRef.current = true;
            setLoading(false);
          });
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        // Sessão que caiu sozinha (refresh token recusado, revogação remota):
        // NÃO zera o usuário. Zerar faz o ProtectedRoute redirecionar e leva
        // junto o formulário aberto — o prejuízo do B21. Sem token o RLS já
        // recusa qualquer leitura ou escrita, então o que fica na tela é a tela,
        // não permissão: o diálogo de reautenticação cobre tudo até voltar.
        if (!saidaVoluntariaRef.current) {
          setSessaoExpirada(true);
          setLoading(false);
          return;
        }
        userIdRef.current = null;
        rolesCheckedRef.current = false;
        setSessaoExpirada(false);
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setIsTeamMember(false);
        setIsLider(false);
        setIsSublider(false);
        setIsMarketing(false);
        setLoading(false);
        return;
      }

      // For any other event (INITIAL_SESSION, USER_UPDATED, etc.)
      // update session but avoid unnecessary user state changes
      setSession(newSession);
      if (newUserId !== userIdRef.current) {
        userIdRef.current = newUserId;
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          void checkRoles(newSession.user.id);
        }
      }
    });

    void initializeAuth();

    return () => subscription.unsubscribe();
  }, []);

  const checkRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (!error && data) {
        // `string[]` e não o enum gerado: `src/integrations/supabase/types.ts` é
        // autogerado e ainda não conhece `marketing`. O banco já aceita o valor
        // (migração 20260806190000) e o arquivo é regerado fora daqui.
        const roles: string[] = data.map(r => r.role);
        setIsAdmin(roles.includes('admin'));
        // isTeamMember é transitivo: admin/lider/sublider também são membros internos.
        setIsTeamMember(
          roles.includes('team_member') ||
          roles.includes('sublider') ||
          roles.includes('lider') ||
          roles.includes('admin')
        );
        setIsLider(roles.includes('lider'));
        setIsSublider(roles.includes('sublider'));
        setIsMarketing(roles.includes('marketing'));
        return;
      }

      setIsAdmin(false);
      setIsTeamMember(false);
      setIsLider(false);
      setIsSublider(false);
      setIsMarketing(false);
    } catch (error) {
      console.error('Error checking roles:', error);
      setIsAdmin(false);
      setIsTeamMember(false);
      setIsLider(false);
      setIsSublider(false);
      setIsMarketing(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          title: "Erro ao fazer login",
          description: error.message,
          variant: "destructive",
        });
      }
      
      return { error };
    } catch (error: any) {
      console.error('SignIn error:', error);
      const errorMessage = error?.message || 'Falha na conexão. Verifique sua internet e tente novamente.';
      toast({
        title: "Erro ao fazer login",
        description: errorMessage,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });
      
      if (error) {
        toast({
          title: "Erro ao criar conta",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Conta criada com sucesso!",
          description: "Você já pode fazer login.",
        });
      }
      
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('[Auth] Iniciando logout...');
      // Marca a saída como pedida, para o listener saber que este `SIGNED_OUT`
      // pode limpar tudo (o involuntário não pode — ver o listener).
      saidaVoluntariaRef.current = true;
      setSessaoExpirada(false);

      // Limpa estado local ANTES do signOut para garantir que a UI atualize
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setIsTeamMember(false);
      setIsLider(false);
      setIsSublider(false);
      setIsMarketing(false);
      
      // Faz o signOut no Supabase com scope global para invalidar no servidor também
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('[Auth] Erro ao fazer logout:', error);
      } else {
        console.log('[Auth] Logout realizado com sucesso');
      }
      
      // Força limpeza do localStorage como fallback
      localStorage.removeItem(`sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`);
      
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta.",
      });
    } catch (error) {
      console.error('[Auth] Erro ao fazer logout:', error);
      // Força limpeza mesmo com erro
      localStorage.removeItem(`sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`);
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setIsTeamMember(false);
      setIsLider(false);
      setIsSublider(false);
      setIsMarketing(false);
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta.",
      });
    }
  };

  const refreshSession = async (): Promise<Session | null> => {
    if (refreshSessionPromise) return refreshSessionPromise;

    refreshSessionPromise = supabase.auth.refreshSession()
      .then(({ data, error }) => {
      if (error) {
        console.error('Erro ao renovar sessão:', error);
        // Só um veredito do servidor sobre o refresh token encerra a sessão. Wi-Fi
        // caído e 5xx devolvem null (quem chamou tenta de novo) sem interromper
        // ninguém — ver `refreshFalhouDefinitivamente`.
        if (refreshFalhouDefinitivamente(error)) setSessaoExpirada(true);
        return null;
      }
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        setSessaoExpirada(false);
        avisoDadoParaRef.current = null;
      }
      return data.session ?? null;
    })
      .catch((error) => {
        console.error('Erro ao renovar sessão:', error);
        if (refreshFalhouDefinitivamente(error)) setSessaoExpirada(true);
        return null;
      })
      .finally(() => {
        refreshSessionPromise = null;
      });

    return refreshSessionPromise;
  };

  /**
   * Login de volta, sem o toast de erro do `signIn`.
   *
   * O diálogo de reautenticação mostra a falha dentro dele, ao lado do campo de
   * senha. Um toast por cima diria a mesma coisa duas vezes, em dois lugares.
   */
  const reautenticar = async (senha: string): Promise<{ error: unknown }> => {
    const email = user?.email;
    if (!email) return { error: new Error('Sessão sem e-mail para reautenticar') };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      return { error };
    } catch (error) {
      console.error('[Auth] Falha ao reautenticar:', error);
      return { error };
    }
  };

  /**
   * Vigia do prazo da sessão.
   *
   * Antes, expirar era descoberto pela falha: a pessoa clicava em "Salvar" e o
   * app a mandava para o login. Aqui a expiração vira um aviso com cinco minutos
   * de antecedência (`JANELA_AVISO_SEGUNDOS`) e uma tentativa silenciosa de
   * renovação; se a renovação der certo, ninguém fica sabendo de nada. Só quando
   * o prazo passa de verdade é que o diálogo de reautenticação aparece — e ele
   * não desmonta a tela.
   */
  useEffect(() => {
    if (!session) return;
    const conferir = () => {
      const estado = estadoDaSessao(session.expires_at, Date.now());
      if (estado === 'valida') return;

      if (estado === 'expirando') {
        if (avisoDadoParaRef.current === session.expires_at) return;
        avisoDadoParaRef.current = session.expires_at ?? null;
        // A renovação silenciosa resolve o caso comum; o aviso existe para o
        // caso em que ela não resolve, e serve de deixa para salvar o que está
        // aberto antes de precisar reautenticar.
        void refreshSession().then((renovada) => {
          if (renovada) return;
          toast({
            title: 'Sua sessão está perto de expirar',
            description: 'Salve o que estiver aberto. Se ela cair, você poderá entrar de novo sem perder a tela.',
          });
        });
        return;
      }

      setSessaoExpirada(true);
    };

    conferir();
    const id = window.setInterval(conferir, INTERVALO_VIGIA_MS);
    return () => window.clearInterval(id);
    // A dependência é a sessão vigiada; `refreshSession` é recriado a cada
    // render mas fecha só sobre setters e sobre o promise de módulo, então
    // reinstalar o intervalo por causa dele seria trabalho à toa.
  }, [session]);

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isTeamMember, isLider, isSublider, isMarketing, mustChangePassword: user?.user_metadata?.must_change_password === true, loading, sessaoExpirada, signIn, signUp, signOut, refreshSession }}>
      {children}
      {/*
        Irmão de `children`, nunca substituto: é isso que faz a expiração deixar
        de ser destrutiva. O formulário que estava aberto continua montado atrás
        do diálogo e reencontra a sessão nova quando a pessoa volta.
      */}
      <ReautenticacaoDialog
        open={sessaoExpirada}
        email={user?.email}
        onEntrar={reautenticar}
        onSair={() => { void signOut(); }}
      />
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
