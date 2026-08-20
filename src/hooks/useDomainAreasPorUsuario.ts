import { useMemo } from 'react';
import {
  useEstruturaAreas,
  useEstruturaEquipes,
  useEstruturaMembros,
} from '@/hooks/useEstruturaManager';
import {
  resolverAreasPorUsuario,
  type AreaResumo,
  type AreasPorUsuario,
} from '@/lib/acessosPorArea';

/**
 * Classificação dos usuários por área da estrutura, para o filtro do Controle
 * de Acessos.
 *
 * Reaproveita as três queries de estrutura que já existem (mesmas query keys,
 * mesmo cache das telas de Estrutura/Pessoas) — nenhuma tabela nova. As três
 * são de catálogo, com leitura interna liberada, então isso funciona para
 * qualquer papel que já enxerga a tela.
 */
export function useDomainAreasPorUsuario(): {
  /** userId → áreas em que a pessoa está (membro ou gestora). */
  areasPorUsuario: AreasPorUsuario;
  /** Áreas ativas, em ordem alfabética — alimenta os chips do filtro. */
  areas: AreaResumo[];
  isLoading: boolean;
} {
  const { data: areasEstrutura = [], isLoading: loadingAreas } = useEstruturaAreas();
  const { data: equipes = [], isLoading: loadingEquipes } = useEstruturaEquipes();
  const { data: membros = [], isLoading: loadingMembros } = useEstruturaMembros();

  const areasPorUsuario = useMemo(
    () => resolverAreasPorUsuario(membros, equipes, areasEstrutura),
    [membros, equipes, areasEstrutura],
  );

  const areas = useMemo(
    () =>
      areasEstrutura
        .map((area): AreaResumo => ({ id: area.id, name: area.name, color: area.color ?? null, color_index: area.color_index ?? null }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [areasEstrutura],
  );

  return {
    areasPorUsuario,
    areas,
    isLoading: loadingAreas || loadingEquipes || loadingMembros,
  };
}
