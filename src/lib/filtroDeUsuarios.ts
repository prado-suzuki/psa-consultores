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
  /** Só a ordenação por e-mail usa; o filtro não olha (busca é por nome). */
  email?: string | null;
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

/* ── Ordenação clicável ──────────────────────────────────────────────────
 *
 * A ordem padrão (hierarquia de papel, depois nome) continua sendo a de
 * chegada, e continua sendo para onde o terceiro clique volta: uma tabela que
 * não tem como desfazer a ordenação obriga a recarregar a página para recuperar
 * a leitura original.
 *
 * ## O clique numa COLUNA DA MATRIZ é o que essa ordenação tem de diferente
 *
 * Ordenar por nome ou por e-mail é conveniência. Ordenar pela coluna "Admin"
 * junta os cinco administradores no topo de uma lista de 68 — é a pergunta"quem
 * tem isto?" respondida sem filtrar, e ela vale igual para papel, área e equipe.
 *
 * ## Todo critério desempata por NOME
 *
 * Sem isso, ordenar por uma coluna booleana deixaria a ordem de dentro de cada
 * bloco à mercê do que o banco devolveu — as mesmas 68 linhas apareceriam em
 * ordem diferente a cada carga, e a tabela pareceria instável sem estar.
 */

/** O que está ordenando a matriz agora. */
export interface OrdemDaMatriz {
  /** `'padrao'` = hierarquia de papel e depois nome. */
  campo: 'padrao' | 'nome' | 'email' | 'coluna';
  /** Qual coluna, quando `campo === 'coluna'`. */
  coluna?: string;
  ascendente: boolean;
}

export const ORDEM_PADRAO: OrdemDaMatriz = { campo: 'padrao', ascendente: true };

/**
 * O próximo estado do clique num cabeçalho: **crescente → decrescente → padrão**.
 *
 * Clicar numa coluna diferente recomeça o ciclo nela, em vez de herdar o sentido
 * da anterior — herdar faria o primeiro clique numa coluna nova cair em
 * decrescente sem ninguém ter pedido.
 *
 * Numa coluna da matriz, "crescente" é **quem tem no topo**. Parece invertido
 * ao lado de A→Z, e é deliberado: o primeiro clique tem de responder a pergunta
 * que levou a pessoa a clicar ali, que é"quem tem isto".
 */
export function proximaOrdem(
  atual: OrdemDaMatriz,
  campo: OrdemDaMatriz['campo'],
  coluna?: string,
): OrdemDaMatriz {
  const mesma = atual.campo === campo && atual.coluna === coluna;
  if (!mesma) return { campo, coluna, ascendente: true };
  if (atual.ascendente) return { campo, coluna, ascendente: false };
  return ORDEM_PADRAO;
}

/**
 * Ordena pela `ordem` pedida, desempatando sempre por nome.
 *
 * `ligada` fica por conta de quem chama: é ela que sabe se a pessoa tem aquele
 * papel, aquela área ou aquela equipe, e manter essa pergunta fora daqui é o que
 * permite as três dimensões usarem a MESMA ordenação.
 */
export function ordenarUsuariosPor<T extends UsuarioFiltravel>(
  usuarios: T[],
  ordem: OrdemDaMatriz,
  ligada: (usuario: T, coluna: string) => boolean,
): T[] {
  if (ordem.campo === 'padrao') return ordenarUsuarios(usuarios);

  const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
  const nome = (u: T) => `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
  const sentido = ordem.ascendente ? 1 : -1;

  const comparar = (a: T, b: T): number => {
    if (ordem.campo === 'nome') return sentido * collator.compare(nome(a), nome(b));
    if (ordem.campo === 'email') {
      // Quem não tem e-mail vai para o fim nos DOIS sentidos: linha sem dado não
      // é"menor", é ausente, e alternar o sentido não deveria promovê-la ao topo.
      const ea = a.email ?? '';
      const eb = b.email ?? '';
      if (!ea && !eb) return 0;
      if (!ea) return 1;
      if (!eb) return -1;
      return sentido * collator.compare(ea, eb);
    }
    const temA = ligada(a, ordem.coluna ?? '');
    const temB = ligada(b, ordem.coluna ?? '');
    if (temA !== temB) return sentido * (temA ? -1 : 1);
    return 0;
  };

  return [...usuarios].sort((a, b) => comparar(a, b) || collator.compare(nome(a), nome(b)));
}

/** O que o `aria-sort` do cabeçalho deve dizer. */
export function ariaSortDe(
  ordem: OrdemDaMatriz,
  campo: OrdemDaMatriz['campo'],
  coluna?: string,
): 'ascending' | 'descending' | 'none' {
  if (ordem.campo !== campo || ordem.coluna !== coluna) return 'none';
  return ordem.ascendente ? 'ascending' : 'descending';
}
