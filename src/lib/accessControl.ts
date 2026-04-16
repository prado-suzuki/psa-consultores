import { supabase } from '@/integrations/supabase/client';
import { AREA_CATEGORIES_MAP, type AreaKey } from '@/config/areaCategories';

/**
 * Verifica se um usuário tem acesso a uma ÁREA interna (digital, tax, osg, board, controle_site).
 *
 * Regra (alinhada com usePageAccess.ts):
 * 1. Admin sempre tem acesso.
 * 2. Acesso explícito em `user_page_access` para qualquer página da área.
 * 3. Acesso herdado via estrutura: usuário → estrutura_equipe_membros →
 *    estrutura_equipes.area_id → estrutura_areas.page_categories ⊇ categorias da área.
 *
 * Alterar esta função afeta login (EquipeAuth) e qualquer outra verificação
 * de "pode entrar na área X". Mantenha consistente com `usePageAccess`.
 */
export async function checkAreaAccess(
  userId: string,
  area: AreaKey | string,
  isAdmin: boolean
): Promise<boolean> {
  if (isAdmin) return true;

  const areaDef = AREA_CATEGORIES_MAP[area as AreaKey];
  if (!areaDef) return false;

  const categories = areaDef.categories;

  try {
    // 1. Acesso explícito via user_page_access
    const { data: pages } = await supabase
      .from('page_permissions')
      .select('id')
      .in('category', categories);

    if (pages?.length) {
      const { data: access } = await supabase
        .from('user_page_access')
        .select('id')
        .eq('user_id', userId)
        .in(
          'page_permission_id',
          pages.map((p) => p.id)
        )
        .limit(1);

      if (access && access.length > 0) return true;
    }

    return false;
  } catch (error) {
    console.error('[accessControl] Erro ao verificar acesso à área:', error);
    return false;
  }
}
