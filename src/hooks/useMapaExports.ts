// Hook único de exports do MAPA (SOP PDF/MD, Diagrama .mmd, ZIP de projeto).
// Centraliza a montagem dos dados a partir das listas de domínio para que os
// botões em qualquer nível (etapas / processo / projeto) chamem a MESMA lógica.

import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { Etapa, Processo } from '@/types';
import {
  useEtapasLista, useDocumentosLista, useSistemasLista, useResponsaveisLista,
  useGargalosLista, useMelhoriasLista, useProcessosLista, useProjetosLista,
} from '@/hooks/useDominioListas';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { gargalosDoProcesso } from '@/utils/gargaloMelhorias';
import { calcularRoi } from '@/utils/roiCalculator';
import { diagnosticarRoi } from '@/utils/diagnosticoRoi';
import {
  generateSOP, generateSOPComparativo, generateSopMarkdown,
  generateSopComparativoMarkdown, generateDiagramaMmd, generateProjetoZip,
  type SOPMode,
} from '@/utils/pdf/generators';

const ordenarPorOrdem = (a: Etapa, b: Etapa) => (a.stage_order ?? 0) - (b.stage_order ?? 0);

export function useMapaExports() {
  const { data: rawEtapas = [] } = useEtapasLista();
  const { data: documentos = [] } = useDocumentosLista();
  const { data: sistemas = [] } = useSistemasLista();
  const { data: responsaveis = [] } = useResponsaveisLista();
  const { data: gargalos = [] } = useGargalosLista();
  const { data: melhorias = [] } = useMelhoriasLista();
  const { data: processos = [] } = useProcessosLista();
  const { data: projetos = [] } = useProjetosLista();

  const etapasDoProcesso = useCallback((processoId: string): Etapa[] => {
    const filtered = rawEtapas.filter(e => e.process_id === processoId).sort(ordenarPorOrdem);
    return enrichEtapas(filtered, documentos, sistemas, responsaveis);
  }, [rawEtapas, documentos, sistemas, responsaveis]);

  const projetoDoProcesso = useCallback(
    (processo: Processo) => projetos.find(p => p.id === processo.project_id) || null,
    [projetos],
  );

  const getProcesso = useCallback(
    (processoId: string) => processos.find(p => p.id === processoId) || null,
    [processos],
  );

  const wrap = async (label: string, fn: () => void | Promise<void>) => {
    try { await fn(); } catch (err) {
      toast.error(label, { description: err instanceof Error ? err.message : String(err) });
    }
  };

  const exportSopPdf = useCallback((processoId: string, mode: SOPMode) =>
    wrap('Erro ao gerar SOP', async () => {
      const processo = getProcesso(processoId);
      if (!processo) throw new Error('Processo não encontrado.');
      const etapas = etapasDoProcesso(processoId);
      await generateSOP(processo, etapas, documentos, sistemas, responsaveis, gargalos, melhorias, mode, { projeto: projetoDoProcesso(processo) });
    }), [getProcesso, etapasDoProcesso, documentos, sistemas, responsaveis, gargalos, melhorias, projetoDoProcesso]);

  const exportSopMd = useCallback((processoId: string, mode: SOPMode) =>
    wrap('Erro ao gerar SOP (Markdown)', async () => {
      const processo = getProcesso(processoId);
      if (!processo) throw new Error('Processo não encontrado.');
      const etapas = etapasDoProcesso(processoId);
      generateSopMarkdown({ processo, etapas, documentos, sistemas, responsaveis, gargalos, melhorias, projeto: projetoDoProcesso(processo), mode });
    }), [getProcesso, etapasDoProcesso, documentos, sistemas, responsaveis, gargalos, melhorias, projetoDoProcesso]);

  const comparativoInput = useCallback((processo: Processo) => {
    const etapas = etapasDoProcesso(processo.id);
    const roi = calcularRoi({ processos: [processo], etapas, responsaveis, sistemas, gargalos, melhorias, projetos });
    const diagnostico = diagnosticarRoi(processo, etapas, responsaveis, sistemas, gargalos, melhorias);
    return {
      processo, etapas, sistemas, responsaveis,
      gargalos: gargalosDoProcesso(gargalos, processo.id),
      melhorias, projeto: projetoDoProcesso(processo), roi, diagnostico, horizonteMeses: 24,
    };
  }, [etapasDoProcesso, responsaveis, sistemas, gargalos, melhorias, projetos, projetoDoProcesso]);

  const exportComparativoPdf = useCallback((processoId: string) =>
    wrap('Erro ao gerar SOP Comparativo', async () => {
      const processo = getProcesso(processoId);
      if (!processo) throw new Error('Processo não encontrado.');
      await generateSOPComparativo(comparativoInput(processo));
    }), [getProcesso, comparativoInput]);

  const exportComparativoMd = useCallback((processoId: string) =>
    wrap('Erro ao gerar SOP Comparativo (Markdown)', async () => {
      const processo = getProcesso(processoId);
      if (!processo) throw new Error('Processo não encontrado.');
      generateSopComparativoMarkdown(comparativoInput(processo));
    }), [getProcesso, comparativoInput]);

  const exportDiagramaMmd = useCallback((processoId: string, mode: SOPMode = 'era') =>
    wrap('Erro ao gerar diagrama', async () => {
      const processo = getProcesso(processoId);
      if (!processo) throw new Error('Processo não encontrado.');
      const etapas = etapasDoProcesso(processoId);
      generateDiagramaMmd({ processo, etapas, documentos, sistemas, responsaveis, gargalos, melhorias, projeto: projetoDoProcesso(processo), mode });
    }), [getProcesso, etapasDoProcesso, documentos, sistemas, responsaveis, gargalos, melhorias, projetoDoProcesso]);

  const exportProjetoZip = useCallback((projetoId: string) =>
    wrap('Erro ao exportar projeto', async () => {
      const projeto = projetos.find(p => p.id === projetoId);
      if (!projeto) throw new Error('Projeto não encontrado.');
      const procs = processos.filter(p => p.project_id === projetoId);
      if (procs.length === 0) throw new Error('Projeto sem processos para exportar.');
      const etapasByProcesso = new Map<string, Etapa[]>(procs.map(p => [p.id, etapasDoProcesso(p.id)]));
      toast.message('Gerando pacote do projeto…', { description: `${procs.length} processo(s).` });
      await generateProjetoZip({ projeto, processos: procs, etapasByProcesso, documentos, sistemas, responsaveis, gargalos, melhorias, projetos });
    }), [projetos, processos, etapasDoProcesso, documentos, sistemas, responsaveis, gargalos, melhorias]);

  return useMemo(() => ({
    exportSopPdf, exportSopMd, exportComparativoPdf, exportComparativoMd,
    exportDiagramaMmd, exportProjetoZip,
  }), [exportSopPdf, exportSopMd, exportComparativoPdf, exportComparativoMd, exportDiagramaMmd, exportProjetoZip]);
}
