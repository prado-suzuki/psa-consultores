import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isTeamMember: boolean;
  mustChangePassword: boolean;
  loading: boolean;
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
  const [loading, setLoading] = useState(true);

  // Refs to compare identity before triggering state updates
  const userIdRef = useRef<string | null>(null);
  const rolesCheckedRef = useRef(false);

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
        return;
      }

      if (event === 'SIGNED_IN') {
        // Only do a full state update if the user actually changed
        const userChanged = newUserId !== userIdRef.current;
        userIdRef.current = newUserId;

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
        userIdRef.current = null;
        rolesCheckedRef.current = false;
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setIsTeamMember(false);
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
        const roles = data.map(r => r.role);
        setIsAdmin(roles.includes('admin'));
        setIsTeamMember(roles.includes('team_member'));
        return;
      }

      setIsAdmin(false);
      setIsTeamMember(false);
    } catch (error) {
      console.error('Error checking roles:', error);
      setIsAdmin(false);
      setIsTeamMember(false);
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
      
      // Limpa estado local ANTES do signOut para garantir que a UI atualize
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setIsTeamMember(false);
      
      // Faz o signOut no Supabase com scope global para invalidar no servidor também
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('[Auth] Erro ao fazer logout:', error);
      } else {
        console.log('[Auth] Logout realizado com sucesso');
      }
      
      // Força limpeza do localStorage como fallback
      localStorage.removeItem('sb-zwoainzzqhudmmknuycq-auth-token');
      
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta.",
      });
    } catch (error) {
      console.error('[Auth] Erro ao fazer logout:', error);
      // Força limpeza mesmo com erro
      localStorage.removeItem('sb-zwoainzzqhudmmknuycq-auth-token');
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setIsTeamMember(false);
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta.",
      });
    }
  };

  const refreshSession = async (): Promise<Session | null> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Erro ao renovar sessão:', error);
        return null;
      }
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      return data.session;
    } catch (error) {
      console.error('Erro ao renovar sessão:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isTeamMember, mustChangePassword: user?.user_metadata?.must_change_password === true, loading, signIn, signUp, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
