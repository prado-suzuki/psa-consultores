import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import logo from '@/assets/logo-psa.png';

const resetSchema = z.object({
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      resetSchema.parse({ password, confirmPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[String(err.path[0])] = err.message;
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error('Erro ao redefinir senha: ' + error.message);
    } else {
      toast.success('Senha redefinida com sucesso!');
      await supabase.auth.signOut();
      navigate('/auth');
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-8">
        <div className="w-full max-w-md text-center space-y-6">
          <img src={logo} alt="PSA Consultores" className="h-16 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Redefinição de Senha</h2>
            <p className="text-gray-400">
              Verificando seu link de redefinição... Se nada acontecer, o link pode ter expirado.
            </p>
          </div>
          <Button
            variant="ghost"
            className="text-primary hover:underline"
            onClick={() => navigate('/auth')}
          >
            Voltar ao login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src={logo} alt="PSA Consultores" className="h-16 mx-auto mb-6" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <KeyRound className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-white">Nova Senha</h2>
          </div>
          <p className="text-gray-400">Digite sua nova senha abaixo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-gray-300">Nova Senha</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 ${errors.password ? 'border-destructive' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-gray-300">Confirmar Senha</Label>
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 ${errors.confirmPassword ? 'border-destructive' : ''}`}
            />
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Redefinindo...
              </span>
            ) : (
              'Redefinir Senha'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
