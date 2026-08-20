import { useEffect, useState } from 'react';
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
} from '@/components/ui/dialog';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AREA_CATEGORIES_MAP, type AreaKey } from '@/config/areaCategories';
import { useUpdateTeamMember } from '@/hooks/useTeamMemberMutations';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useUserPageAccess } from '@/hooks/useUserPageAccess';
import { useEstruturaMembros } from '@/hooks/useEstruturaManager';
import { equipesDoUsuario } from '@/lib/equipesDaEstrutura';
import type { UserWithRoles } from '@/hooks/useUsersWithRoles';
import { ROLE_OPTIONS } from './roleOptions';
import { EquipesEstruturaField } from './EquipesEstruturaField';

export interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Usuário sendo editado. Quando null, o dialog não inicializa seu state. */
  user: UserWithRoles | null;
}

interface EditForm {
  first_name: string;
  last_name: string;
  email: string;
  roles: string[];
  areas: string[];
  equipe_ids: string[];
}

/**
 * Dialog de edição de usuário. Recebe o `user` via props e inicializa
 * seu state ao abrir, inferindo as áreas atuais a partir de user_page_access.
 */
export const EditUserDialog = ({ open, onOpenChange, user }: EditUserDialogProps) => {
  const { data: pages } = usePagePermissions();
  const { data: userAccess } = useUserPageAccess(user?.id ?? null);
  const { data: membros = [] } = useEstruturaMembros();
  const updateUser = useUpdateTeamMember();

  const [form, setForm] = useState<EditForm>({
    first_name: '',
    last_name: '',
    email: '',
    roles: [],
    areas: [],
    equipe_ids: [],
  });

  // Ao abrir, inicializa o form com dados do usuário + inferência de áreas.
  useEffect(() => {
    if (!open || !user) return;

    const userAccessIds =
      userAccess?.filter((a) => a.user_id === user.id).map((a) => a.page_permission_id) ?? [];
    const userPageCategories = new Set(
      pages?.filter((p) => userAccessIds.includes(p.id)).map((p) => p.category) ?? []
    );

    // Área é considerada marcada se o usuário tem acesso a PELO MENOS UMA página
    // de suas categorias — `every()` quebraria quando há categorias sem páginas.
    const inferredAreas: string[] = [];
    for (const [areaKey, areaDef] of Object.entries(AREA_CATEGORIES_MAP)) {
      if (areaDef.categories.some((cat) => userPageCategories.has(cat))) {
        inferredAreas.push(areaKey);
      }
    }

    setForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email || '',
      roles: [...user.roles],
      areas: inferredAreas,
      equipe_ids: equipesDoUsuario(user.id, membros),
    });
  }, [open, user, pages, userAccess, membros]);

  const hasInternalRole =
    form.roles.includes('team_member') ||
    form.roles.includes('lider') ||
    form.roles.includes('sublider');

  /** Equipe escolhida já marca a área de acesso dela — sem pedir duas vezes. */
  const marcarAreasDaEquipe = (areasImplicadas: AreaKey[]) => {
    if (!areasImplicadas.length) return;
    setForm((prev) => ({ ...prev, areas: [...new Set([...prev.areas, ...areasImplicadas])] }));
  };

  /**
   * O campo de equipe aparece para quem é interno e também para quem já está
   * numa equipe — é por ele que se desvincula, então esconder de quem perdeu o
   * papel deixaria o vínculo preso sem tela para removê-lo.
   */
  const mostrarEquipes = hasInternalRole || form.equipe_ids.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.first_name || !form.last_name || !form.email) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    try {
      await updateUser.mutateAsync({ userId: user.id, ...form });
      onOpenChange(false);
    } catch {
      /* toast já emitido pelo hook */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white border-slate-200 max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-slate-900">Editar Usuário</DialogTitle>
            <DialogDescription className="text-slate-500">
              Altere os dados e papéis do usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_first_name" className="text-slate-700">Nome *</Label>
                <Input
                  id="edit_first_name"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="bg-white border-slate-200 text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_last_name" className="text-slate-700">Sobrenome *</Label>
                <Input
                  id="edit_last_name"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="bg-white border-slate-200 text-slate-900"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email" className="text-slate-700">Email *</Label>
              <Input
                id="edit_email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-white border-slate-200 text-slate-900"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-slate-700 text-sm font-medium">Papéis do usuário</Label>
              {ROLE_OPTIONS.map((role) => (
                <div
                  key={role.value}
                  className="flex items-start space-x-3 p-2 rounded-lg bg-muted border border-slate-100"
                >
                  <Checkbox
                    id={`edit_role_${role.value}`}
                    checked={form.roles.includes(role.value)}
                    onCheckedChange={(checked) => {
                      setForm((prev) => ({
                        ...prev,
                        roles: checked
                          ? [...prev.roles, role.value]
                          : prev.roles.filter((r) => r !== role.value),
                      }));
                    }}
                    className="border-slate-300  mt-0.5"
                  />
                  <div>
                    <Label
                      htmlFor={`edit_role_${role.value}`}
                      className="text-slate-900 text-sm font-medium cursor-pointer"
                    >
                      {role.label}
                    </Label>
                    <p className="text-xs text-slate-500">{role.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {mostrarEquipes && (
              <EquipesEstruturaField
                value={form.equipe_ids}
                onChange={(equipe_ids) => setForm((prev) => ({ ...prev, equipe_ids }))}
                onAreasImplicadas={marcarAreasDaEquipe}
              />
            )}

            {hasInternalRole && (
              <div className="space-y-3">
                <Label className="text-slate-700 text-sm font-medium">Áreas de Acesso</Label>
                <p className="text-xs text-slate-500">
                  Selecione as áreas que o membro terá acesso
                </p>
                {Object.entries(AREA_CATEGORIES_MAP).map(([key, area]) => (
                  <div
                    key={key}
                    className="flex items-start space-x-3 p-2 rounded-lg bg-muted border border-slate-100"
                  >
                    <Checkbox
                      id={`edit_area_${key}`}
                      checked={form.areas.includes(key)}
                      onCheckedChange={(checked) => {
                        setForm((prev) => ({
                          ...prev,
                          areas: checked
                            ? [...prev.areas, key]
                            : prev.areas.filter((a) => a !== key),
                        }));
                      }}
                      className="border-slate-300  mt-0.5"
                    />
                    <div>
                      <Label
                        htmlFor={`edit_area_${key}`}
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
              onClick={() => onOpenChange(false)}
              className="border-slate-200 text-slate-600 hover:bg-foreground/[0.03]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateUser.isPending}
            >
              {updateUser.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
