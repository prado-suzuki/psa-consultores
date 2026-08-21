import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  bucketDePageCategories, entregaNoPrazo, resumoPorAreaCadastro, mesclarResumoAreaCadastro,
  type AreaCadastro, type ResumoAreaCadastro, type TarefaConcluida,
} from '@/lib/boardExecutivo';
import { useDomainTrabalhoDigital } from '@/hooks/useDomainTrabalhoDigital';
import { resumoDigital } from '@/lib/trabalhoDigital';

const STALE_TIME = 5 * 60 * 1000;

/** Linha de `estrutura_areas`, com `page_categories` pra achar a área Digital. */
interface AreaCadastroBruta extends AreaCadastro {
  page_categories: string[] | null;
}

interface ProjetoComAreaId {
  id: string;
  estrutura_area_id: string | null;
  computed_status: 'em_dia' | 'em_risco' | 'atrasado';
}

interface UseBoardRollupAreasParams {
  /** Projetos JÁ recortados pela empresa global. */
  projetos: ProjetoComAreaId[];
  /** Tarefas concluídas já recortadas pelos mesmos projetos. */
  tarefas: TarefaConcluida[];
  desdeISO: string;
  ateISO: string;
  /** Empresa selecionada na barra global; '' = todas. */
  cluster: string;
}

export interface RollupAreas {
  areas: ResumoAreaCadastro[];
  /** Ressalvas de rodapé: fontes somadas, acesso negado, dado incompleto. */
  nota: string;
}

/**
 * O rollup "Áreas em um olhar" — uma linha por área do CADASTRO, sempre
 * (Bloco E, 21/08). Antes era uma linha por BUCKET de 4 categorias
 * (tax/osg/dev/outros); o propósito do bloco — o dono ver todas as áreas
 * sem entrar em cada uma — só se cumpre listando o nome real de
 * `estrutura_areas`, com zero explícito para quem não teve movimento. Área
 * ausente da lista parece que não existe; área com zero é informação.
 *
 * Só áreas ATIVAS (ver `resumoPorAreaCadastro`). Trabalho da Digital
 * (`sprint_deliverables`) não tem como resolver `estrutura_area_id` — é
 * mesclado por inteiro na área cujo `page_categories` contém `'dev'`
 * (Bloco E3, decisão registrada: sem migration por ora, 100% do trabalho de
 * sprint é da Digital hoje). Tarefa de projeto sem área própria vira a linha
 * "Sem área atribuída", visível só quando > 0 — nunca um "Outros" que
 * pareceria uma área da empresa.
 */
export function useBoardRollupAreas({
  projetos,
  tarefas,
  desdeISO,
  ateISO,
  cluster,
}: UseBoardRollupAreasParams): RollupAreas {
  const janela = useMemo(() => ({ desdeISO, ateISO }), [desdeISO, ateISO]);
  const { snapshotQuery } = useDomainTrabalhoDigital({ janela });
  const digital = snapshotQuery.data;

  // Não filtra por page_categories na query: Prado Advogados/TAX LEGAL não
  // têm tax/osg/dev e ainda assim precisam aparecer (Bloco E2).
  const areasQuery = useQuery<AreaCadastroBruta[]>({
    queryKey: ['board-areas-cadastro'],
    staleTime: STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_areas')
        .select('id, name, is_active, page_categories')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as AreaCadastroBruta[];
    },
  });
  const areasCadastro = useMemo(() => areasQuery.data ?? [], [areasQuery.data]);

  const areaDigitalId = useMemo(
    () => areasCadastro.find((a) => bucketDePageCategories(a.page_categories) === 'dev')?.id ?? null,
    [areasCadastro],
  );

  // `resumoDigital` devolve por BUCKET (tax/osg/dev/outros); o total aqui é
  // a SOMA dos quatro -- o Bloco E3 decidiu tratar 100% do trabalho de
  // sprint como Digital, sem depender da resolução por bucket.
  const totalDigital = useMemo(() => {
    if (!digital) return null;
    const linhas = resumoDigital({ ...digital, janela });
    const concluidas = linhas.reduce((s, l) => s + l.concluidas, 0);
    const comPrazo = linhas.reduce((s, l) => s + (l.comPrazo ?? 0), 0);
    const noPrazo = linhas.reduce(
      (s, l) => s + (l.pontualidade !== null && l.comPrazo ? Math.round((l.pontualidade * l.comPrazo) / 100) : 0),
      0,
    );
    if (concluidas === 0) return null;
    return {
      concluidas,
      comPrazo,
      pontualidade: comPrazo > 0 ? Math.round((noPrazo / comPrazo) * 100) : null,
    };
  }, [digital, janela]);

  const areas = useMemo(() => {
    if (areasCadastro.length === 0) return [];
    let linhas = resumoPorAreaCadastro(areasCadastro, projetos, tarefas);

    // `sprint_deliverables` não tem cluster: com empresa selecionada, a fonte
    // da Digital entraria inteira, somando trabalho de outras empresas na
    // linha Digital. Fora do recorte é melhor ausente que errada.
    if (!cluster && areaDigitalId && totalDigital) {
      linhas = mesclarResumoAreaCadastro(linhas, areaDigitalId, totalDigital);
    }

    // Bloco E3: tarefa cujo projeto não tem estrutura_area_id vira "Sem área
    // atribuída" -- nunca some, nunca se disfarça de "Outros".
    const idsSemArea = new Set(projetos.filter((p) => !p.estrutura_area_id).map((p) => p.id));
    let semAreaConcluidas = 0, semAreaComPrazo = 0, semAreaNoPrazo = 0;
    for (const t of tarefas) {
      if (!t.project_id || !idsSemArea.has(t.project_id)) continue;
      semAreaConcluidas += 1;
      if (t.due_date) {
        semAreaComPrazo += 1;
        if (entregaNoPrazo(t.updated_at, t.due_date)) semAreaNoPrazo += 1;
      }
    }
    if (semAreaConcluidas > 0) {
      linhas = [...linhas, {
        id: 'SEM_AREA',
        label: 'Sem área atribuída',
        projetos: 0,
        emDia: 0,
        emRisco: 0,
        atrasados: 0,
        pontualidade: semAreaComPrazo > 0 ? Math.round((semAreaNoPrazo / semAreaComPrazo) * 100) : null,
        concluidas: semAreaConcluidas,
        comPrazo: semAreaComPrazo,
        unidade: 'tarefas',
      }];
    }

    // Por volume de entregas, decrescente; zeradas no fim, em ordem alfabética
    // (empatam em 0 e o `localeCompare` resolve).
    return [...linhas].sort((a, b) => {
      if (b.concluidas !== a.concluidas) return b.concluidas - a.concluidas;
      return a.label.localeCompare(b.label, 'pt-BR');
    });
  }, [areasCadastro, projetos, tarefas, cluster, areaDigitalId, totalDigital]);

  const nota = useMemo(() => {
    if (cluster) {
      return 'Só tarefas de projeto (Tax/OSG): os entregáveis de sprint da Digital não têm cluster e ficam fora quando há uma empresa selecionada.';
    }
    const partes = ['Cada linha é uma área do cadastro, sempre presente, mesmo zerada. A unidade de entrega está ao lado do número — tarefa de projeto e entregável de sprint não são a mesma coisa.'];
    if (snapshotQuery.data && !snapshotQuery.data.podeLerEntregaveis) {
      partes.push('Sem permissão para ler os entregáveis da Digital — a linha dela não reflete o trabalho completo.');
    } else if (snapshotQuery.data?.entregaveisTruncados) {
      partes.push('Entregáveis da Digital truncados no limite de leitura: a linha dela está sobre uma fatia.');
    }
    if (snapshotQuery.isError) {
      partes.push('Falha ao carregar a fonte da Digital.');
    }
    return partes.join(' ');
  }, [cluster, snapshotQuery.data, snapshotQuery.isError]);

  return { areas, nota };
}
