import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UserPlus, RefreshCw, CheckCircle2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { type AreaKey } from '@/config/areaCategories';
import { useCreateTeamMember, type CreateTeamMemberInput } from '@/hooks/useTeamMemberMutations';
import { AreasDeAcessoField, PapeisDoUsuarioField } from './PapeisEAreasDoUsuario';
import { EquipesEstruturaField } from './EquipesEstruturaField';

// Senha temporária é gerada aleatoriamente pelo edge function `create-team-member`
// e retornada uma única vez para o admin compartilhar com o novo usuário.

const EMPTY_FORM: Omit<CreateTeamMemberInput, 'password'> = {
  first_name: '',
  last_name: '',
  email: '',
  roles: [],
  areas: [],
  equipe_ids: [],
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('Copiado para área de transferência');
};

/**
 * Dialog de criação de novo usuário da equipe.
 * Senha fixa 'trocarsenha' — usuário troca no primeiro acesso.
 */
export const CreateUserDialog = () => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<CreateTeamMemberInput, 'password'>>(EMPTY_FORM);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const createUser = useCreateTeamMember();

  const handleClose = () => {
    setOpen(false);
    setCreatedCredentials(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.email) {
      toast.error('Preencha nome e email');
      return;
    }
    try {
      const result = await createUser.mutateAsync({ ...form });
      setCreatedCredentials({ email: form.email, password: result.temporary_password || '' });
    } catch {
      /* toast já emitido pelo hook */
    }
  };

  const hasInternalRole =
    form.roles.includes('team_member') ||
    form.roles.includes('lider') ||
    form.roles.includes('sublider');

  /** Equipe escolhida já marca a área de acesso dela — sem pedir duas vezes. */
  const marcarAreasDaEquipe = (areasImplicadas: AreaKey[]) => {
    if (!areasImplicadas.length) return;
    setForm((prev) => ({
      ...prev,
      areas: [...new Set([...prev.areas, ...areasImplicadas])],
    }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Criar Novo Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg border-border max-h-[85vh] overflow-y-auto">
        {createdCredentials ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Usuário Criado!
              </DialogTitle>
              <DialogDescription>
                Compartilhe as credenciais abaixo com o novo usuário
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted rounded-lg p-4 space-y-3 border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-muted-foreground text-xs">Email</Label>
                    <p className="text-foreground font-mono text-sm">{createdCredentials.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => copyToClipboard(createdCredentials.email)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-muted-foreground text-xs">Senha temporária</Label>
                    <p className="text-foreground font-mono text-sm">{createdCredentials.password}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => copyToClipboard(createdCredentials.password)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                O usuário deve trocar a senha no primeiro acesso
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={handleClose}
                className="w-full"
              >
                Fechar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-foreground">Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo membro da equipe
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-foreground">Nome *</Label>
                  <Input
                    id="first_name"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="text-foreground"
                    placeholder="Nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-foreground">Sobrenome</Label>
                  <Input
                    id="last_name"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="text-foreground"
                    placeholder="Sobrenome"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="text-foreground"
                  placeholder="email@exemplo.com"
                />
              </div>

              <PapeisDoUsuarioField
                value={form.roles}
                onChange={(roles) => setForm((prev) => ({ ...prev, roles }))}
                idPrefix="role_"
              />

              {hasInternalRole && (
                <EquipesEstruturaField
                  value={form.equipe_ids ?? []}
                  onChange={(equipe_ids) => setForm((prev) => ({ ...prev, equipe_ids }))}
                  onAreasImplicadas={marcarAreasDaEquipe}
                />
              )}

              {hasInternalRole && (
                <AreasDeAcessoField
                  value={form.areas}
                  onChange={(areas) => setForm((prev) => ({ ...prev, areas }))}
                  idPrefix="area_"
                />
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="border-border text-muted-foreground hover:bg-foreground/[0.03]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createUser.isPending}
              >
                {createUser.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Usuário'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
