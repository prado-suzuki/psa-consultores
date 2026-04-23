import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { AREA_CATEGORIES_MAP } from '@/config/areaCategories';
import { useCreateTeamMember, type CreateTeamMemberInput } from '@/hooks/useTeamMemberMutations';
import { ROLE_OPTIONS } from './roleOptions';

const FIXED_PASSWORD = 'trocarsenha';

const EMPTY_FORM: Omit<CreateTeamMemberInput, 'password'> = {
  first_name: '',
  last_name: '',
  email: '',
  roles: [],
  areas: [],
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
      await createUser.mutateAsync({ ...form, password: FIXED_PASSWORD });
      setCreatedCredentials({ email: form.email, password: FIXED_PASSWORD });
    } catch {
      /* toast já emitido pelo hook */
    }
  };

  const hasInternalRole =
    form.roles.includes('team_member') ||
    form.roles.includes('lider') ||
    form.roles.includes('sublider');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
          <UserPlus className="h-4 w-4" />
          Criar Novo Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-white border-slate-200 max-h-[85vh] overflow-y-auto">
        {createdCredentials ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-teal-600" />
                Usuário Criado!
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Compartilhe as credenciais abaixo com o novo usuário
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-slate-500 text-xs">Email</Label>
                    <p className="text-slate-900 font-mono text-sm">{createdCredentials.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-teal-600"
                    onClick={() => copyToClipboard(createdCredentials.email)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-slate-500 text-xs">Senha temporária</Label>
                    <p className="text-slate-900 font-mono text-sm">{createdCredentials.password}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-teal-600"
                    onClick={() => copyToClipboard(createdCredentials.password)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500 text-center">
                O usuário deve trocar a senha no primeiro acesso
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={handleClose}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              >
                Fechar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-slate-900">Criar Novo Usuário</DialogTitle>
              <DialogDescription className="text-slate-500">
                Preencha os dados para criar um novo membro da equipe
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-slate-700">Nome *</Label>
                  <Input
                    id="first_name"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="bg-white border-slate-200 text-slate-900"
                    placeholder="Nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-slate-700">Sobrenome</Label>
                  <Input
                    id="last_name"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="bg-white border-slate-200 text-slate-900"
                    placeholder="Sobrenome"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-white border-slate-200 text-slate-900"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-slate-700 text-sm font-medium">Papéis do usuário</Label>
                {ROLE_OPTIONS.map((role) => (
                  <div
                    key={role.value}
                    className="flex items-start space-x-3 p-2 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <Checkbox
                      id={`role_${role.value}`}
                      checked={form.roles.includes(role.value)}
                      onCheckedChange={(checked) => {
                        setForm((prev) => ({
                          ...prev,
                          roles: checked
                            ? [...prev.roles, role.value]
                            : prev.roles.filter((r) => r !== role.value),
                        }));
                      }}
                      className="border-slate-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 mt-0.5"
                    />
                    <div>
                      <Label
                        htmlFor={`role_${role.value}`}
                        className="text-slate-900 text-sm font-medium cursor-pointer"
                      >
                        {role.label}
                      </Label>
                      <p className="text-xs text-slate-500">{role.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {hasInternalRole && (
                <div className="space-y-3">
                  <Label className="text-slate-700 text-sm font-medium">Áreas de Acesso</Label>
                  <p className="text-xs text-slate-500">
                    Selecione as áreas que o membro terá acesso
                  </p>
                  {Object.entries(AREA_CATEGORIES_MAP).map(([key, area]) => (
                    <div
                      key={key}
                      className="flex items-start space-x-3 p-2 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <Checkbox
                        id={`area_${key}`}
                        checked={form.areas.includes(key)}
                        onCheckedChange={(checked) => {
                          setForm((prev) => ({
                            ...prev,
                            areas: checked
                              ? [...prev.areas, key]
                              : prev.areas.filter((a) => a !== key),
                          }));
                        }}
                        className="border-slate-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 mt-0.5"
                      />
                      <div>
                        <Label
                          htmlFor={`area_${key}`}
                          className="text-slate-900 text-sm font-medium cursor-pointer"
                        >
                          {area.label}
                        </Label>
                        <p className="text-xs text-slate-500">{area.categories.join(', ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createUser.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white"
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
