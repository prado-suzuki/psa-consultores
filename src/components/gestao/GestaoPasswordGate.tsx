import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SESSION_KEY = 'gestao_access_validated';
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

interface GestaoPasswordGateProps {
  children: React.ReactNode;
}

export const GestaoPasswordGate = ({ children }: GestaoPasswordGateProps) => {
  const [isValidated, setIsValidated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = () => {
    try {
      const sessionData = sessionStorage.getItem(SESSION_KEY);
      if (sessionData) {
        const { validatedAt } = JSON.parse(sessionData);
        const now = Date.now();
        if (now - validatedAt < SESSION_DURATION) {
          setIsValidated(true);
        } else {
          sessionStorage.removeItem(SESSION_KEY);
        }
      }
    } catch (error) {
      sessionStorage.removeItem(SESSION_KEY);
    }
    setIsLoading(false);
  };

  const handleValidate = async () => {
    if (!password.trim()) {
      setError('Digite a senha de acesso');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('validate-gestao-password', {
        body: { password },
      });

      if (fnError) throw fnError;

      if (data?.valid) {
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ validatedAt: Date.now() })
        );
        setIsValidated(true);
        toast.success('Acesso liberado');
      } else {
        setError('Senha incorreta');
      }
    } catch (err) {
      console.error('Error validating password:', err);
      setError('Erro ao validar senha. Tente novamente.');
    } finally {
      setIsValidating(false);
      setPassword('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isValidated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full max-w-md p-8">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Área Protegida</h2>
              <p className="text-slate-500 mt-2">
                Digite a senha de acesso para continuar
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">
                  Senha de Acesso
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite a senha"
                    className="pl-10 pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <ShieldAlert className="h-4 w-4" />
                  {error}
                </p>
              )}

              <Button
                onClick={handleValidate}
                disabled={isValidating}
                className="w-full"
              >
                {isValidating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Validando...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Acessar
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-slate-400 text-center mt-6">
              O acesso será válido por 30 minutos
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default GestaoPasswordGate;
