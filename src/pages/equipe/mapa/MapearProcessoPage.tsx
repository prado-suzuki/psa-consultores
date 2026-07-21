import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import DiagramViewer from '@/components/equipe/mapa/DiagramViewer';
import GargalosMelhoriasPanel from '@/components/equipe/mapa/GargalosMelhoriasPanel';
import { ProcessHeader } from '@/components/equipe/mapa/mapear-processo/ProcessHeader';
import { ScenarioTabs, type MapearAba } from '@/components/equipe/mapa/mapear-processo/ScenarioTabs';
import { ScenarioView } from '@/components/equipe/mapa/mapear-processo/ScenarioViews';
import { EtapasEditorModal } from '@/components/equipe/mapa/mapear-processo/EtapasEditorModal';
import { QuickCadastros } from '@/components/equipe/mapa/mapear-processo/QuickCadastros';
import { useEtapasEditor } from '@/components/equipe/mapa/mapear-processo/useEtapasEditor';
import {
  useDocumentosLista, useEtapasLista, useGargalosLista, useMelhoriasLista,
  useProcessoUnico, useProjetosLista, useResponsaveisLista, useSistemasLista,
} from '@/hooks/useDominioListas';
import { useMapaExports } from '@/hooks/useMapaExports';
import { useUpdateGargalo } from '@/hooks/useGargalos';
import { useUpdateMelhoria } from '@/hooks/useMelhorias';
import { calcularRoi } from '@/utils/roiCalculator';
import { diagnosticarRoi } from '@/utils/diagnosticoRoi';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { gargalosDoProcesso, melhoriasDoProcesso } from '@/utils/gargaloMelhorias';
import { generateSOP, generateSOPComparativo } from '@/utils/pdf/generators';
import { buildProcessDiagram } from '@/utils/processDiagram';
import { slugFilename } from '@/utils/slugify';
import { melhoriaLabel, ordenarEtapas } from '@/lib/mapearProcessoModel';

export default function MapearProcessoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [aba, setAba] = useState<MapearAba>('como-era');
  const [editProcessoOpen, setEditProcessoOpen] = useState(false);
  const [diagramaScenario, setDiagramaScenario] = useState<'era' | 'ficou' | null>(null);
  const processoQuery = useProcessoUnico(id);
  const { data: rawEtapas = [] } = useEtapasLista();
  const { data: documentos = [] } = useDocumentosLista();
  const { data: sistemas = [] } = useSistemasLista();
  const { data: responsaveis = [] } = useResponsaveisLista();
  const { data: gargalos = [] } = useGargalosLista();
  const { data: melhorias = [] } = useMelhoriasLista();
  const { data: projetos = [] } = useProjetosLista();
  const processo = processoQuery.data ?? null;
  const mapaExports = useMapaExports();
  const updateMelhoria = useUpdateMelhoria();
  const updateGargalo = useUpdateGargalo();
  const etapas = useMemo(() => id
    ? enrichEtapas(rawEtapas.filter(etapa => etapa.process_id === id).sort(ordenarEtapas), documentos, sistemas, responsaveis)
    : [], [id, rawEtapas, documentos, sistemas, responsaveis]);
  const procClusterId = useMemo(() => processo?.project_id
    ? (projetos.find(projeto => projeto.id === processo.project_id)?.cluster_id ?? null)
    : null, [processo, projetos]);

  if (processoQuery.isLoading) return <div className="loading-container"><div className="spinner" /></div>;
  if (!processo) return <div className="card"><h2>Processo não encontrado</h2><p>O processo solicitado não existe ou foi removido.</p><Link to="/equipe/digital/mapa/processos" className="btn-add">Voltar aos processos</Link></div>;

  return <MapearProcessoContent
    processo={processo} etapas={etapas} documentos={documentos} sistemas={sistemas} responsaveis={responsaveis}
    gargalos={gargalos} melhorias={melhorias} projetos={projetos} procClusterId={procClusterId}
    aba={aba} setAba={setAba} editProcessoOpen={editProcessoOpen} setEditProcessoOpen={setEditProcessoOpen}
    diagramaScenario={diagramaScenario} setDiagramaScenario={setDiagramaScenario} navigateBack={() => navigate('/equipe/digital/mapa/processos')}
    mapaExports={mapaExports} updateGargalo={updateGargalo} updateMelhoria={updateMelhoria}
  />;
}

type ContentProps = {
  processo: NonNullable<ReturnType<typeof useProcessoUnico>['data']>;
  etapas: ReturnType<typeof enrichEtapas>;
  documentos: ReturnType<typeof useDocumentosLista>['data'] extends infer T ? NonNullable<T> : never;
  sistemas: ReturnType<typeof useSistemasLista>['data'] extends infer T ? NonNullable<T> : never;
  responsaveis: ReturnType<typeof useResponsaveisLista>['data'] extends infer T ? NonNullable<T> : never;
  gargalos: ReturnType<typeof useGargalosLista>['data'] extends infer T ? NonNullable<T> : never;
  melhorias: ReturnType<typeof useMelhoriasLista>['data'] extends infer T ? NonNullable<T> : never;
  projetos: ReturnType<typeof useProjetosLista>['data'] extends infer T ? NonNullable<T> : never;
  procClusterId: string | null; aba: MapearAba; setAba: (aba: MapearAba) => void;
  editProcessoOpen: boolean; setEditProcessoOpen: (open: boolean) => void;
  diagramaScenario: 'era' | 'ficou' | null; setDiagramaScenario: (scenario: 'era' | 'ficou' | null) => void;
  navigateBack: () => void; mapaExports: ReturnType<typeof useMapaExports>;
  updateGargalo: ReturnType<typeof useUpdateGargalo>; updateMelhoria: ReturnType<typeof useUpdateMelhoria>;
};

function MapearProcessoContent({ processo, etapas, documentos, sistemas, responsaveis, gargalos, melhorias, projetos, procClusterId, aba, setAba, editProcessoOpen, setEditProcessoOpen, diagramaScenario, setDiagramaScenario, navigateBack, mapaExports, updateGargalo, updateMelhoria }: ContentProps) {
  const editor = useEtapasEditor({ processo, etapas, documentos, sistemas, responsaveis, procClusterId });
  const procGargalos = useMemo(() => gargalosDoProcesso(gargalos, processo.id), [gargalos, processo.id]);
  const procMelhorias = useMemo(() => melhoriasDoProcesso(melhorias, processo.id), [melhorias, processo.id]);
  const projeto = projetos.find(item => item.id === processo.project_id) || null;
  const temFicou = etapas.some(etapa => etapa.ficou);
  const diagramBase = { processo, etapas, documentos, sistemas, responsaveis, gargalos, melhorias, projeto };
  const diagramaCode = buildProcessDiagram({ ...diagramBase, mode: 'era' });
  const diagramaCodeFicou = temFicou ? buildProcessDiagram({ ...diagramBase, mode: 'ficou' }) : '';
  const slug = slugFilename(processo.name, processo.id);
  const data = new Date().toISOString().slice(0, 10);

  const generate = async (mode: 'era' | 'ficou') => {
    try { await generateSOP(processo, etapas, documentos, sistemas, responsaveis, gargalos, melhorias, mode, { projeto }); }
    catch (error) { toast.error('Erro ao gerar SOP', { description: error instanceof Error ? error.message : String(error) }); }
  };
  const generateComparativo = async () => {
    try {
      const roi = calcularRoi({ processos: [processo], etapas, responsaveis, sistemas, gargalos, melhorias, projetos });
      const diagnostico = diagnosticarRoi(processo, etapas, responsaveis, sistemas, gargalos, melhorias);
      await generateSOPComparativo({ processo, etapas, sistemas, responsaveis, gargalos: gargalosDoProcesso(gargalos, processo.id), melhorias, projeto, roi, diagnostico, horizonteMeses: 24 });
    } catch (error) { toast.error('Erro ao gerar SOP Comparativo', { description: error instanceof Error ? error.message : String(error) }); }
  };
  const mutationError = (message: string, error: unknown) => toast.error(message, { description: error instanceof Error ? error.message : String(error) });

  return <div className="card cadastro-shell mapear-shell">
    <ProcessHeader processo={processo} etapasCount={etapas.length} temFicou={temFicou} onVoltar={navigateBack} onEditarProcesso={() => setEditProcessoOpen(true)}
      onSop={generate} onComparativo={generateComparativo} onMarkdown={(mode) => mapaExports.exportSopMd(processo.id, mode)} onMarkdownComparativo={() => mapaExports.exportComparativoMd(processo.id)} onDiagrama={setDiagramaScenario} />
    <GargalosMelhoriasPanel
      gargalos={procGargalos.map(item => ({ id: item.id, nome: item.nome }))} melhorias={procMelhorias.map(item => ({ id: item.id, nome: melhoriaLabel(item.improvement_description) }))}
      gargaloOptions={gargalos.map(item => ({ id: item.id, nome: item.nome }))} melhoriaOptions={melhorias.map(item => ({ id: item.id, nome: melhoriaLabel(item.improvement_description) }))}
      onAddGargalo={gid => { const item = gargalos.find(value => value.id === gid); if (item) updateGargalo.mutateAsync({ id: gid, old: item, patch: { processos: [...new Set([...(item.processos || []), processo.id])] } }).catch(error => mutationError('Erro ao vincular gargalo', error)); }}
      onRemoveGargalo={gid => { const item = gargalos.find(value => value.id === gid); if (item) updateGargalo.mutateAsync({ id: gid, old: item, patch: { processos: (item.processos || []).filter(id => id !== processo.id) } }).catch(error => mutationError('Erro ao desvincular gargalo', error)); }}
      onAddMelhoria={mid => { const item = melhorias.find(value => value.id === mid); if (item) updateMelhoria.mutateAsync({ id: mid, old: item, patch: { processos: [...new Set([...(item.processos || []), processo.id])] } }).catch(error => mutationError('Erro ao vincular melhoria', error)); }}
      onRemoveMelhoria={mid => { const item = melhorias.find(value => value.id === mid); if (item) updateMelhoria.mutateAsync({ id: mid, old: item, patch: { processos: (item.processos || []).filter(id => id !== processo.id) } }).catch(error => mutationError('Erro ao desvincular melhoria', error)); }}
      onQuickAddGargalo={() => editor.setCadastroRapido('gargalo')} onQuickAddMelhoria={() => editor.setCadastroRapido('melhoria')} />
    <ScenarioTabs aba={aba} onAba={setAba} />
    <div className="mapear-painel"><AnimatePresence mode="wait">
      {aba === 'como-era' && <motion.div key="como-era" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}><ScenarioView scenario="era" etapas={etapas} onEditar={id => editor.openEditor('era', id)} /></motion.div>}
      {aba === 'como-ficou' && <motion.div key="como-ficou" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}><ScenarioView scenario="ficou" etapas={etapas} onEditar={id => editor.openEditor('ficou', id)} /></motion.div>}
    </AnimatePresence></div>
    <EtapasEditorModal editor={editor} docNames={documentos.map(item => item.nome)} sisNames={sistemas.map(item => item.nome)} respNames={responsaveis.map(item => item.name)} />
    <DiagramViewer isOpen={diagramaScenario !== null} onClose={() => setDiagramaScenario(null)} code={diagramaScenario === 'ficou' ? diagramaCodeFicou : diagramaCode}
      filename={diagramaScenario === 'ficou' ? `Diagrama_${slug}_COMO_FICOU_${data}` : `Diagrama_${slug}_${data}`} title={`Diagrama${diagramaScenario === 'ficou' ? ' · Como Ficou' : ' · Como Era'}: ${processo.name}`} />
    <QuickCadastros processo={processo} procClusterId={procClusterId} editProcessoOpen={editProcessoOpen} onCloseProcesso={() => setEditProcessoOpen(false)} editor={editor} />
  </div>;
}
