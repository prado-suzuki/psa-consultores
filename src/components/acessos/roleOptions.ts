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

/* A classe de cor por papel saiu daqui em 11/09/2026.
   Quem pinta papel é `@/components/ui/PapelBadge`, que é COMPONENTE e não mapa
   — mapa de cor por papel já tinha virado duas cópias divergentes, uma delas
   reprovando AA. O porquê da cor está no docstring de lá. */
