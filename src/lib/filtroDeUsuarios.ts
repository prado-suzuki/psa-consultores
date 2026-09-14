// Filtro e ordenação da lista de usuários do Controle de Acessos.
// Funções puras — não falam com Supabase, não conhecem React.
//
// Elas nasceram dentro do `useMemo` da aba"Usuários Estrutura". Saíram de lá
// quando a matriz de Papéis passou a precisar do MESMO filtro: com 68 usuários,
// achar as linhas é metade do trabalho, e duas telas filtrando a mesma lista com
// duas cópias da regra é como a divergência começa. O agrupamento por área
// continua em `acessosPorArea.ts` — quem agrupa é só a aba de Usuários.

import type { AppRole } from '@/hooks/useUsersWithRoles';
import { usuarioEstaNaArea, type AreasPorUsuario } from '@/lib/acessosPorArea';

/**
 * Hierarquia de papéis. Ordena a lista e define o papel principal de cada um:
 * quem lidera aparece primeiro, que é por onde a liberação de caminhos costuma
 * começar. `marketing` fica depois de `team_member` porque não é degrau da
 * escada de `has_role_or_higher` — é papel lateral (ver `PapelBadge`).
 */
export const ORDEM_DE_PAPEIS: AppRole[] = [
  'admin', 'lider', 'sublider', 'team_member', 'marketing', 'timecliente', 'client',
];

/** Sem acento e em minúsculas, para a busca por nome casar"Hercio" com"Hércio". */
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** O mínimo que uma linha precisa ter para ser filtrada e ordenada. */
export interface UsuarioFiltravel {
  id: string;
  first_name: string;
  last_name: string;
  roles: AppRole[];
}

export interface FiltroDeUsuarios {
  /** Busca por nome. Vazio não filtra. */
  termo: string;
  /** `'all'` não filtra. */
  papel: AppRole | 'all';
  /** `'all'` não filtra; `SEM_AREA` traz quem não tem vínculo na estrutura. */
  areaId: string;
}

export const FILTRO_VAZIO: FiltroDeUsuarios = { termo: '', papel: 'all', areaId: 'all' };

/** Nenhum filtro ligado — a tela usa para decidir se mostra o botão de limpar. */
export function filtroEstaVazio(filtro: FiltroDeUsuarios): boolean {
  return !filtro.termo.trim() && filtro.papel === 'all' && filtro.areaId === 'all';
}

/**
 * Aplica os três filtros. A busca é só por NOME — o email não entra de
 * propósito: ele é derivado do nome nesta casa (`nome.sobrenome@`), e incluí-lo
 * faria a busca por"lima" trazer quem tem"lima" no email de outra pessoa.
 */
export function filtrarUsuarios<T extends UsuarioFiltravel>(
  usuarios: T[],
  filtro: FiltroDeUsuarios,
  areasPorUsuario: AreasPorUsuario,
): T[] {
  const termo = normalizarTexto(filtro.termo.trim());
  let resultado = usuarios;

  if (termo) {
    resultado = resultado.filter((u) => {
      const nomeCompleto = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
      return normalizarTexto(nomeCompleto).includes(termo);
    });
  }
  if (filtro.papel !== 'all') {
    resultado = resultado.filter((u) => u.roles.includes(filtro.papel as AppRole));
  }
  if (filtro.areaId !== 'all') {
    resultado = resultado.filter((u) => usuarioEstaNaArea(u.id, filtro.areaId, areasPorUsuario));
  }
  return resultado;
}

/** Peso do usuário na hierarquia. Quem não tem papel nenhum vai para o fim. */
export function pesoDoPapel(usuario: UsuarioFiltravel): number {
  const i = ORDEM_DE_PAPEIS.findIndex((papel) => usuario.roles.includes(papel));
  return i === -1 ? ORDEM_DE_PAPEIS.length : i;
}

/** Hierarquia de papel e, dentro dela, nome. Não muta a lista recebida. */
export function ordenarUsuarios<T extends UsuarioFiltravel>(usuarios: T[]): T[] {
  const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
  const nome = (u: T) => `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
  return [...usuarios].sort(
    (a, b) => pesoDoPapel(a) - pesoDoPapel(b) || collator.compare(nome(a), nome(b)),
  );
}

/**
 * Quantos usuários por papel, para o número ao lado de cada opção do seletor.
 *
 * Quem tem dois papéis conta nos dois — a soma pode passar do total, igual já
 * acontece na contagem por área.
 */
export function contarPorPapel(
  usuarios: UsuarioFiltravel[],
): Record<AppRole | 'all', number> {
  const contagem = {
    all: usuarios.length,
    admin: 0, lider: 0, sublider: 0, team_member: 0, client: 0, timecliente: 0, marketing: 0,
  } as Record<AppRole | 'all', number>;
  for (const usuario of usuarios) {
    for (const papel of usuario.roles) {
      if (papel in contagem) contagem[papel] += 1;
    }
  }
  return contagem;
}
