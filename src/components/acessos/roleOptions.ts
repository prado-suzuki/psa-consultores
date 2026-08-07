/**
 * Opções de papéis exibidas nos dialogs de criar/editar usuário.
 * Ordem importa (define a ordem visual dos checkboxes).
 *
 * Compartilhado entre CreateUserDialog e EditUserDialog para evitar divergência.
 */
export interface RoleOption {
  value: string;
  label: string;
  desc: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  { value: 'admin',       label: 'Administrador', desc: 'Acesso total ao sistema' },
  { value: 'team_member', label: 'Membro',        desc: 'Acesso às áreas da equipe' },
  { value: 'lider',       label: 'Líder Geral',   desc: 'Visibilidade global de projetos e tarefas' },
  { value: 'sublider',    label: 'Sublíder',      desc: 'Apoio à liderança com visibilidade ampliada' },
  { value: 'client',      label: 'Cliente',       desc: 'Acesso ao portal do cliente' },
  { value: 'timecliente', label: 'Time Cliente',  desc: 'Membro da equipe do cliente' },
  // Papel lateral: não entra na hierarquia de `has_role_or_higher` e por isso
  // não abre nada sozinho. Quem tem só ele precisa da liberação da página
  // /gestao (Novidades) na árvore de permissões, item a item — marcar a área
  // inteira concederia chamados, contatos e acessos junto.
  { value: 'marketing',   label: 'Marketing',     desc: 'Gerencia as novidades do site' },
];

/** Rótulos curtos usados em badges nos cards de usuário. */
export const ROLE_SHORT_LABELS: Record<string, string> = {
  admin: 'Admin',
  team_member: 'Membro',
  lider: 'Líder Geral',
  sublider: 'Sublíder',
  client: 'Cliente',
  timecliente: 'Time Cliente',
  marketing: 'Marketing',
};

/** Classes de Tailwind por role para os badges na lista de usuários. */
export const ROLE_BADGE_CLASSES: Record<string, string> = {
  admin:       'border-red-200 text-red-600 bg-red-50',
  lider:       'border-amber-200 text-amber-600 bg-amber-50',
  sublider:    'border-orange-200 text-orange-600 bg-orange-50',
  team_member: 'border-teal-200 text-teal-600 bg-teal-50',
  timecliente: 'border-cyan-200 text-cyan-600 bg-cyan-50',
  client:      'border-slate-200 text-slate-600 bg-slate-50',
  marketing:   'border-violet-200 text-violet-600 bg-violet-50',
};
