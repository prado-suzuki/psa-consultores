// A sessão expirou e o trabalho continua na tela.
//
// B21: até aqui, expirar era destrutivo — o app navegava para /equipe, a árvore
// desmontava e o formulário aberto (um cadastro de cliente com quatro abas
// preenchidas, por exemplo) ia junto. Este diálogo troca a saída forçada por uma
// porta: quem estava trabalhando digita a senha, volta a ter sessão e reencontra
// exatamente a tela que deixou, porque nada foi desmontado.
//
// Ele é renderizado ao lado de `children` dentro do AuthProvider, nunca no lugar
// deles. Essa é a peça toda: se substituísse a árvore, seria o mesmo defeito com
// outra roupa.
import { useEffect, useState } from 'react';
import { LogOut, ShieldAlert } from 'lucide-react';
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface ReautenticacaoDialogProps {
  open: boolean;
  /** E-mail da sessão que caiu, só para a pessoa confirmar quem está voltando. */
  email?: string | null;
  /** Reautentica. Devolve `{ error }` no mesmo formato de `signIn`. */
  onEntrar: (senha: string) => Promise<{ error: unknown }>;
  /** Desiste e sai de verdade (aí sim descarta o que estava aberto). */
  onSair: () => void;
}

export default function ReautenticacaoDialog({
  open, email, onEntrar, onSair,
}: ReautenticacaoDialogProps) {
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // A senha não sobrevive ao fechamento: reabrir o diálogo começa do zero.
  useEffect(() => {
    if (!open) {
      setSenha('');
      setErro(null);
      setEntrando(false);
    }
  }, [open]);

  const entrar = async () => {
    if (!senha || entrando) return;
    setEntrando(true);
    setErro(null);
    const { error } = await onEntrar(senha);
    setEntrando(false);
    if (error) {
      setErro('Não foi possível entrar. Confira a senha e tente de novo.');
      return;
    }
    setSenha('');
  };

  return (
    // Sem `onOpenChange`: Esc e clique fora não fecham. Sair é uma decisão
    // explícita, porque é ela que descarta o trabalho em aberto.
    <AlertDialog open={open}>
      <AlertDialogContent
        className="max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" aria-hidden />
            Sua sessão expirou
          </AlertDialogTitle>
          <AlertDialogDescription>
            Nada do que está na tela foi perdido. Entre de novo para continuar de onde parou
            {email ? <> — a conta é <strong>{email}</strong>.</> : '.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => { e.preventDefault(); void entrar(); }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reautenticacao-senha" className="text-xs font-semibold text-muted-foreground">
              Senha
            </Label>
            <Input
              id="reautenticacao-senha"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={entrando}
              aria-invalid={!!erro || undefined}
            />
            {erro && <p className="text-xs text-destructive">{erro}</p>}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onSair} disabled={entrando} className="gap-2">
              <LogOut className="h-4 w-4" /> Sair e descartar
            </Button>
            <Button type="submit" disabled={!senha || entrando}>
              {entrando ? 'Entrando…' : 'Continuar trabalhando'}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
