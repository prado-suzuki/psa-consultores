import { useMemo } from 'react';
import {
  BOARD_AREAS, resumoPorArea, mesclarResumoArea,
  type BoardAreaKey, type ResumoArea, type ProjetoResumo, type TarefaConcluida,
} from '@/lib/boardExecutivo';
import { useDomainTrabalhoDigital } from '@/hooks/useDomainTrabalhoDigital';
import { resumoDigital, diagnosticoDigital } from '@/lib/trabalhoDigital';

interface UseBoardRollupAreasParams {
  /** Projetos JÁ recortados pela empresa global. */
  projetos: ProjetoResumo[];
  /** Tarefas concluídas já recortadas pelos mesmos projetos. */
  tarefas: TarefaConcluida[];
  desdeISO: string;
  ateISO: string;
  /** Empresa selecionada na barra global; '' = todas. */
  cluster: string;
}

export interface RollupAreas {
  areas: ResumoArea[];
  /** Ressalvas de rodapé: fontes somadas, acesso negado, dado incompleto. */
  nota: string;
}

/**
 * O rollup "Áreas em um olhar" — uma linha por área, somando DUAS fontes.
 *
 * Vive num hook porque não é só derivação: ele carrega a fonte da Digital. Tax e
 * OSG trabalham em `org_projects`/`org_tasks`; a Digital cadastra em `projects`
 * (antiga) + `sprint_deliverables`. Sem a segunda fonte a linha "Dev" apareceria
 * vazia — e vazio, aqui, seria lido como "não produziu".
 *
 * Extraído de `BoardDashboard` para a página voltar ao teto de fachada (<400
 * linhas, AGENTS.md): é a única parte dela que junta query + regra de negócio.
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

  // `resumoDigital` devolve TODOS os buckets que achou: um entregável pode
  // pertencer a projeto de mapeamento do Tax/OSG, e o que não resolve área cai
  // em "outros". Levamos TODOS — filtrar só 'dev' faria o trabalho de sprint sem
  // área vinculada desaparecer da tela. As fontes são tabelas distintas de
  // `org_*`, então mesclar soma, não duplica.
  const linhasDigital = useMemo<ResumoArea[]>(
    () => (digital ? resumoDigital({ ...digital, janela }) : []),
    [digital, janela],
  );

  const diag = useMemo(
    () => (digital ? diagnosticoDigital({ ...digital, janela }) : null),
    [digital, janela],
  );

  const areas = useMemo(() => {
    const porArea = new Map<BoardAreaKey, ResumoArea>(
      resumoPorArea(projetos, tarefas).map((r) => [r.area, r]),
    );
    // `sprint_deliverables` não tem cluster: com empresa selecionada a fonte da
    // Digital entraria inteira, somando trabalho de outras empresas na linha
    // Dev. Fora do recorte é melhor ausente que errada — a nota avisa.
    if (!cluster) {
      for (const linha of linhasDigital) {
        const existente = porArea.get(linha.area);
        porArea.set(linha.area, existente ? mesclarResumoArea(existente, linha) : linha);
      }
    }
    return [...porArea.values()]
      // Ordem canônica das áreas, independente de qual fonte chegou primeiro.
      .sort((a, b) => BOARD_AREAS.indexOf(a.area) - BOARD_AREAS.indexOf(b.area));
  }, [projetos, tarefas, linhasDigital, cluster]);

  const nota = useMemo(() => {
    if (cluster) {
      return 'Só tarefas de projeto (Tax/OSG): os entregáveis de sprint da Digital não têm cluster e ficam fora quando há uma empresa selecionada.';
    }
    const partes = ['Fontes somadas: tarefas de projeto (Tax/OSG) + entregáveis de sprint (Digital). Unidades de trabalho diferentes.'];
    if (diag && diag.semVinculoDeProjeto > 0) {
      partes.push(`${diag.semVinculoDeProjeto} entregáveis de sprint sem projeto vinculado entraram em "Outros".`);
    }
    if (digital && !digital.podeLerEntregaveis) {
      partes.push('Sem permissão para ler os entregáveis da Digital — a linha Dev não reflete o trabalho dela.');
    } else if (digital?.entregaveisTruncados) {
      partes.push('Entregáveis da Digital truncados no limite de leitura: a linha Dev está sobre uma fatia.');
    } else if (diag && diag.concluidosSemCompletedAt > 0) {
      partes.push(`${diag.concluidosSemCompletedAt} entregáveis concluídos sem data de conclusão ficaram fora da conta.`);
    }
    if (snapshotQuery.isError) {
      partes.push('Falha ao carregar a fonte da Digital.');
    }
    return partes.join(' ');
  }, [digital, diag, snapshotQuery.isError, cluster]);

  return { areas, nota };
}
