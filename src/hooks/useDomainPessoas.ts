import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AREA_CATEGORIES_MAP, type AreaKey } from '@/config/areaCategories';
import { AUDIT_AREAS_MODULO } from '@/lib/auditAreas';
import {
  agregarCargaPessoas, idsDasAreas, pessoasDasAreas, resolverEstruturaPessoas,
  type CargaPorPessoa, type EstruturaPorPessoa,
} from '@/lib/auditPessoas';

export interface EstruturaPessoas {
  /** Área e equipe de todo mundo que está na estrutura. */
  estrutura: EstruturaPorPessoa;
  /** Time lotado nas equipes desta área — entra na lista mesmo sem registro. */
  roster: string[];
}

/**
 * Lotação do time a partir da estrutura organizacional.
 *
 * O elo entre a área da tela (`tax`/`osg`) e `estrutura_areas` é
 * `page_categories`, a mesma convenção de `AREA_CATEGORIES_MAP` usada no login
 * e no controle de acessos — nenhum mapeamento novo por nome de área.
 *
 * As três tabelas são de catálogo (leitura interna liberada), então isso
 * funciona para qualquer papel do time, não só admin.
 *
 * `'todas'` é o escopo do Board: o roster vira a soma das áreas de módulo, para
 * a aba Pessoas listar quem está lotado no Tax OU na OSG.
 */
export function useDomainPessoasEstrutura(area: AreaKey | 'todas') {
  const categorias = area === 'todas'
    ? AUDIT_AREAS_MODULO.flatMap((modulo) => AREA_CATEGORIES_MAP[modulo].categories)
    : AREA_CATEGORIES_MAP[area].categories;

  return useQuery<EstruturaPessoas>({
    queryKey: ['pessoas-estrutura', area],
    queryFn: async () => {
      const [
        { data: membros, error: erroMembros },
        { data: equipes, error: erroEquipes },
        { data: areas, error: erroAreas },
      ] = await Promise.all([
        supabase.from('estrutura_equipe_membros').select('user_id, equipe_id'),
        supabase.from('estrutura_equipes').select('id, name, area_id, gestor_id').eq('is_active', true),
        supabase.from('estrutura_areas').select('id, name, page_categories').eq('is_active', true),
      ]);

      if (erroMembros) throw erroMembros;
      if (erroEquipes) throw erroEquipes;
      if (erroAreas) throw erroAreas;

      const listaMembros = membros ?? [];
      const listaEquipes = equipes ?? [];
      const listaAreas = areas ?? [];

      return {
        estrutura: resolverEstruturaPessoas(listaMembros, listaEquipes, listaAreas),
        roster: pessoasDasAreas(listaMembros, listaEquipes, idsDasAreas(listaAreas, categorias)),
      };
    },
  });
}

/**
 * Último login de cada pessoa (`profiles.last_sign_in_at`, que um trigger em
 * `auth.users` mantém atualizado).
 *
 * `profiles` só tem SELECT para admin (política `rls_profiles_select_admin`),
 * por isso a query fica desligada para os demais papéis em vez de devolver uma
 * coluna vazia — quem chama decide se mostra a coluna. Liberar isso para o time
 * exigiria expor a coluna numa view, ou seja, migração.
 */
export function useDomainPessoasUltimoAcesso(enabled: boolean) {
  return useQuery<Record<string, string | null>>({
    queryKey: ['pessoas-ultimo-acesso'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, last_sign_in_at');
      if (error) throw error;

      const acessoPorId: Record<string, string | null> = {};
      for (const perfil of data ?? []) acessoPorId[perfil.id] = perfil.last_sign_in_at;
      return acessoPorId;
    },
  });
}

/**
 * Tarefas abertas e atrasadas por responsável.
 *
 * Traz só o que não está concluído — é o que a coluna mostra, e filtrar no
 * banco evita puxar o histórico inteiro de `org_tasks`. O RLS de projeto decide
 * o que cada pessoa enxerga, então a contagem cobre as tarefas visíveis a quem
 * está olhando, de qualquer área.
 *
 * `hoje` (YYYY-MM-DD) entra na query key para o "atrasada" virar na virada do
 * dia sem depender de refetch manual.
 */
export function useDomainPessoasCarga(hoje: string) {
  return useQuery<CargaPorPessoa>({
    queryKey: ['pessoas-carga', hoje],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_tasks')
        .select('assigned_to, status, due_date')
        .not('assigned_to', 'is', null)
        .neq('status', 'done');

      if (error) throw error;
      return agregarCargaPessoas(data ?? [], hoje);
    },
  });
}
