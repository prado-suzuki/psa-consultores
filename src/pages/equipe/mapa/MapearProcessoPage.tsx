// Página única "Mapear processo" — substitui os múltiplos modais antes acessíveis pelo card.
// 4 abas (todas montadas, visibilidade alternada por CSS para carregamento instantâneo):
//   - Entradas / Saídas (visão agregada de documentos)
//   - Como era (view + Editar Etapas)
//   - Como ficou (view + Editar Etapas)
//   - Configurar ROI (wizard inline)
// Histórico de medições fica acessível via botão no header.

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, FileCode2, FileText, GitCompare, Layers, Network, Pencil, Settings2 } from 'lucide-react';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import ChipSelector from '@/components/equipe/mapa/ChipSelector';
import DecimalInput from '@/components/equipe/mapa/DecimalInput';
import Select from '@/components/equipe/mapa/Select';
import StatusBadge from '@/components/equipe/mapa/StatusBadge';
import EmptyStateCadastro from '@/components/equipe/mapa/cadastro/EmptyStateCadastro';
import { Tooltip } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';
import { toast } from 'sonner';
import type { Etapa, DocRef, ResponsavelEtapa } from '@/types';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { etapaMudou } from '@/utils/etapaMudou';
import { resolveVinculoId, resolveSistemaId } from '@/utils/etapaVinculosResolve';
import { formatDecimal } from '@/utils/format';
import { generateSOP, generateSOPComparativo } from '@/utils/pdf/generators';
import { calcularRoi } from '@/utils/roiCalculator';
import { diagnosticarRoi } from '@/utils/diagnosticoRoi';
import { buildProcessDiagram } from '@/utils/processDiagram';
import { slugFilename } from '@/utils/slugify';
import { useMapaExports } from '@/hooks/useMapaExports';
import DiagramViewer from '@/components/equipe/mapa/DiagramViewer';
import NovoDocumentoModal from '@/components/equipe/mapa/cadastros/NovoDocumentoModal';
import NovoSistemaModal from '@/components/equipe/mapa/cadastros/NovoSistemaModal';
import NovoResponsavelModal from '@/components/equipe/mapa/cadastros/NovoResponsavelModal';
import NovoGargaloModal from '@/components/equipe/mapa/cadastros/NovoGargaloModal';
import NovoMelhoriaModal from '@/components/equipe/mapa/cadastros/NovoMelhoriaModal';
import GargalosMelhoriasPanel from '@/components/equipe/mapa/GargalosMelhoriasPanel';
import {
  useProcessoUnico, useEtapasLista, useDocumentosLista, useSistemasLista,
  useResponsaveisLista, useGargalosLista, useMelhoriasLista, useProjetosLista,
} from '@/hooks/useDominioListas';
import { useCreateEtapa, useUpdateEtapa, useDeleteEtapa, useUpsertEtapaToBe } from '@/hooks/useEtapas';
import { useUpdateMelhoria } from '@/hooks/useMelhorias';
import { useUpdateGargalo } from '@/hooks/useGargalos';
import { gargalosDoProcesso, melhoriasDoProcesso } from '@/utils/gargaloMelhorias';
import ProcessoFormModal from '@/components/equipe/mapa/cadastro/ProcessoFormModal';
import TourTrigger from '@/components/equipe/mapa/tour/TourTrigger';

const EXECUCAO_OPCOES = [
  { value: 'manual', label: 'Manual' },
  { value: 'semi_automatica', label: 'Semi-Automática' },
  { value: 'automatica', label: 'Automática' },
];

type Aba = 'como-era' | 'como-ficou';

const ABAS: { id: Aba; label: string }[] = [
  { id: 'como-era',        label: 'Como era' },
  { id: 'como-ficou',      label: 'Como ficou' },
];

// Ordem canônica das etapas (a reordenação é persistida na coluna `ordem`).
const ordenarPorOrdem = (a: Etapa, b: Etapa) => (a.stage_order ?? 0) - (b.stage_order ?? 0);

// Rótulo curto da melhoria = título antes de " — " (mesma lógica do
// GargaloFormModal, pra manter o mesmo rótulo nas duas telas).
function melhoriaLabel(desc: string): string {
  const i = desc.indexOf(' — ');
  if (i > 0) return desc.slice(0, i).trim();
  return desc.length > 50 ? `${desc.slice(0, 50)}…` : desc;
}

// Rascunho do editor de etapas salvo em localStorage (anti-perda de dados).
interface EtapasDraft {
  mode: 'era' | 'ficou';
  list: Etapa[];
  removed: string[];
  activeIndex: number;
  ts: number;
}

export default function MapearProcessoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [aba, setAba] = useState<Aba>('como-era');
  const [editProcessoOpen, setEditProcessoOpen] = useState(false);
  const [diagramaScenario, setDiagramaScenario] = useState<'era' | 'ficou' | null>(null);

  // ── Dados base via hooks (Hook-First) ──────────────────────────────────
  const processoQuery = useProcessoUnico(id);
  const { data: rawEtapas = [] } = useEtapasLista();
  const { data: documentos = [] } = useDocumentosLista();
  const { data: sistemas = [] } = useSistemasLista();
  const { data: responsaveis = [] } = useResponsaveisLista();
  const { data: gargalos = [] } = useGargalosLista();
  const { data: melhorias = [] } = useMelhoriasLista();
  const { data: projetos = [] } = useProjetosLista();
  const processo = processoQuery.data ?? null;
  const loading = processoQuery.isLoading;
  // Etapas hidratadas e filtradas para este processo.
  const etapas = useMemo(() => {
    if (!id) return [] as Etapa[];
    const filtered = rawEtapas.filter(e => e.process_id === id).sort(ordenarPorOrdem);
    return enrichEtapas(filtered, documentos, sistemas, responsaveis);
  }, [id, rawEtapas, documentos, sistemas, responsaveis]);

  // ── Mutations (Hook-First) ─────────────────────────────────────────────
  const createEtapa = useCreateEtapa();
  const updateEtapa = useUpdateEtapa();
  const deleteEtapa = useDeleteEtapa();
  const upsertEtapaToBe = useUpsertEtapaToBe();
  const updateMelhoria = useUpdateMelhoria();
  const updateGargalo = useUpdateGargalo();
  const mapaExports = useMapaExports();

  // Edit Etapas (modal) — usado por "Como era" e "Como ficou"
  const [editEtapasOpen, setEditEtapasOpen] = useState(false);
  const [editEtapasMode, setEditEtapasMode] = useState<'era' | 'ficou'>('era');
  const [editEtapasList, setEditEtapasList] = useState<Etapa[]>([]);
  const [editEtapasActiveIndex, setEditEtapasActiveIndex] = useState(0);
  const [editEtapasSaving, setEditEtapasSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  // IDs de etapas existentes removidas no modal — deletadas no banco ao salvar.
  const [removedEtapaIds, setRemovedEtapaIds] = useState<Set<string>>(new Set());

  // Anti-perda de dados: marca edições não salvas (dirty), rascunho local e
  // confirmação de saída. O rascunho persiste em localStorage e sobrevive a
  // fechar/recarregar; é limpo ao salvar.
  const [editEtapasDirty, setEditEtapasDirty] = useState(false);
  const [confirmSairOpen, setConfirmSairOpen] = useState(false);
  const [rascunhoPendente, setRascunhoPendente] = useState<EtapasDraft | null>(null);
  const draftKey = (mode: 'era' | 'ficou') => `mapa.etapasDraft.${id}.${mode}`;

  // Autosave do rascunho — só dispara após uma edição real (dirty), pra não
  // criar rascunho no mero abrir e não sobrescrever um rascunho anterior.
  useEffect(() => {
    if (!editEtapasOpen || !id || !editEtapasDirty) return;
    try {
      const draft: EtapasDraft = {
        mode: editEtapasMode,
        list: editEtapasList,
        removed: [...removedEtapaIds],
        activeIndex: editEtapasActiveIndex,
        ts: Date.now(),
      };
      localStorage.setItem(draftKey(editEtapasMode), JSON.stringify(draft));
    } catch { /* localStorage indisponível — mantém só em memória */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editEtapasOpen, editEtapasDirty, editEtapasList, removedEtapaIds, editEtapasActiveIndex, editEtapasMode, id]);

  // Cadastro rápido a partir das listas suspensas do editor de etapas —
  // permite criar documento/sistema/responsável sem sair do fluxo. As listas
  // de opções atualizam sozinhas via invalidação do React Query.
  const [cadastroRapido, setCadastroRapido] = useState<'documento' | 'sistema' | 'responsavel' | 'gargalo' | 'melhoria' | null>(null);

  const docNames = useMemo(() => documentos.map(d => d.nome), [documentos]);
  const sisNames = useMemo(() => sistemas.map(s => s.nome), [sistemas]);
  const respNames = useMemo(() => responsaveis.map(r => r.name), [responsaveis]);

  // Mapas nome↔id para resolver os vínculos no save (o editor opera por nome;
  // as junções persistem por id). O nome é a fonte de verdade na UI — o
  // ChipSelector mantém o id antigo ao trocar o nome do chip.
  const docIdByNome = useMemo(() => new Map(documentos.map(d => [d.nome, d.id])), [documentos]);
  const sisIdByNome = useMemo(() => new Map(sistemas.map(s => [s.nome, s.id])), [sistemas]);
  const respIdByNome = useMemo(() => new Map(responsaveis.map(r => [r.name, r.id])), [responsaveis]);
  // id→nome (p/ validar se o id ainda corresponde ao nome exibido — evita colisão de homônimos).
  const docById = useMemo(() => new Map(documentos.map(d => [d.id, d.nome])), [documentos]);
  const respById = useMemo(() => new Map(responsaveis.map(r => [r.id, r.name])), [responsaveis]);
  // Sistema: o nome pode repetir entre clusters → resolve pelo cluster do processo.
  const procClusterId = useMemo(
    () => (processo?.project_id ? (projetos.find(p => p.id === processo.project_id)?.cluster_id ?? null) : null),
    [processo, projetos],
  );
  const sisCandidatosPorNome = useMemo(() => {
    const m = new Map<string, { id: string; cluster_id?: string | null }[]>();
    for (const s of sistemas) { const arr = m.get(s.nome) ?? []; arr.push({ id: s.id, cluster_id: s.cluster_id }); m.set(s.nome, arr); }
    return m;
  }, [sistemas]);
  // Gargalos e melhorias vinculados a ESTE processo (grão = processo).
  const procGargalos = useMemo(() => gargalosDoProcesso(gargalos, id ?? ''), [gargalos, id]);
  const procMelhorias = useMemo(() => melhoriasDoProcesso(melhorias, id ?? ''), [melhorias, id]);

  if (loading) {
    return <div className="loading-container"><div className="spinner" /></div>;
  }
  if (!processo) {
    return (
      <div className="card">
        <h2>Processo não encontrado</h2>
        <p>O processo solicitado não existe ou foi removido.</p>
        <Link to="/equipe/digital/mapa/processos" className="btn-add">Voltar aos processos</Link>
      </div>
    );
  }

  // ============================================================
  //  Handlers — SOP / Diagrama (downloads do processo)
  // ============================================================
  const handleGenerateSOP = async (mode: 'era' | 'ficou') => {
    try {
      const projetoDoProcesso = projetos.find(p => p.id === processo.project_id) || null;
      await generateSOP(processo, etapas, documentos, sistemas, responsaveis, gargalos, melhorias, mode, { projeto: projetoDoProcesso });
    } catch (err) {
      toast.error('Erro ao gerar SOP', { description: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleGenerateSOPComparativo = async () => {
    try {
      // calcularRoi recebe TODAS as melhorias do projeto e elege internamente as
      // relevantes (vínculo direto OU via gargalo). Passar só as filtradas aqui
      // poderia esconder melhorias que resolvem gargalos do processo.
      const roi = calcularRoi({
        processos: [processo],
        etapas,
        responsaveis,
        sistemas,
        gargalos,
        melhorias,
        projetos,
      });
      const diagnostico = diagnosticarRoi(processo, etapas, responsaveis, sistemas, gargalos, melhorias);
      const projetoDoProcesso = projetos.find(p => p.id === processo.project_id) || null;
      await generateSOPComparativo({
        processo,
        etapas,
        sistemas,
        responsaveis,
        gargalos: gargalosDoProcesso(gargalos, processo.id),
        melhorias,
        projeto: projetoDoProcesso,
        roi,
        diagnostico,
        horizonteMeses: 24,
      });
    } catch (err) {
      toast.error('Erro ao gerar SOP Comparativo', { description: err instanceof Error ? err.message : String(err) });
    }
  };

  // Diagrama (Mermaid) — Processo + grupos de ligações. As-Is sempre; To-Be
  // (mesmo modelo, dados do `etapa.ficou`) quando há cenário projetado.
  const diagramaBase = {
    processo,
    etapas,
    documentos,
    sistemas,
    responsaveis,
    gargalos,
    melhorias,
    projeto: projetos.find(p => p.id === processo.project_id) || null,
  };
  const temFicou = etapas.some(e => e.ficou);
  const diagramaCode = buildProcessDiagram({ ...diagramaBase, mode: 'era' });
  const diagramaCodeFicou = temFicou ? buildProcessDiagram({ ...diagramaBase, mode: 'ficou' }) : '';
  const diagramaSlug = slugFilename(processo.name, processo.id);
  const diagramaData = new Date().toISOString().slice(0, 10);
  const diagramaFilename = `Diagrama_${diagramaSlug}_${diagramaData}`;
  const diagramaFilenameFicou = `Diagrama_${diagramaSlug}_COMO_FICOU_${diagramaData}`;

  // ============================================================
  //  Handlers — Editar Etapas (Como era / Como ficou)
  // ============================================================
  const cleanEtapaName = (nome: string): string => {
    const match = nome.match(/^Etapa\s*\d+\s*:\s*/i);
    return match ? nome.slice(match[0].length).trim() : nome;
  };

  // Mantém o vínculo que tem nome OU id resolvido. Só descarta linha realmente
  // vazia (ex.: "+adicionar" clicado sem escolher). Nunca dropar — e portanto
  // deletar do banco — um vínculo real só porque o nome não resolveu na sessão.
  const cleanEtapa = (e: Etapa): Etapa => ({
    ...e,
    docsEntrada: (e.docsEntrada || []).filter(d => d.nome?.trim() || d.documentoId),
    docsSaida: (e.docsSaida || []).filter(d => d.nome?.trim() || d.documentoId),
    executadoPor: (e.executadoPor || []).filter(r => r.nome?.trim() || r.responsavelId),
    sistemas: (e.sistemas || []).filter(s => s?.trim()),
  });

  const openEditEtapas = (mode: 'era' | 'ficou', focusEtapaId?: string) => {
    const snapshotsEtapas = etapas.map(e => cleanEtapa({ ...e, name: cleanEtapaName(e.name) }));
    let prepared: Etapa[];
    if (mode === 'era') {
      prepared = snapshotsEtapas;
    } else {
      // Ficou: se já há projeção salva → carrega ela; senão → clona da era
      // em memória (não persiste até "Salvar todas").
      prepared = snapshotsEtapas.map(eraEtapa => {
        const f = eraEtapa.ficou;
        return {
          ...eraEtapa,
          description: f?.description ?? eraEtapa.description,
          execution: f?.execution ?? eraEtapa.execution,
          lead_time_days: f?.lead_time_days ?? eraEtapa.lead_time_days,
          volume_per_process: f?.volume_per_process ?? eraEtapa.volume_per_process,
          error_rate: f?.error_rate ?? eraEtapa.error_rate,
          rework_rate: f?.rework_rate ?? eraEtapa.rework_rate ?? 0,
          error_cost: f?.error_cost ?? eraEtapa.error_cost,
          error_volume: f?.error_volume ?? eraEtapa.error_volume,
          executadoPor: f?.executadoPor ?? eraEtapa.executadoPor,
          sistemas: f?.sistemas ?? eraEtapa.sistemas,
          docsEntrada: f?.docsEntrada ?? eraEtapa.docsEntrada,
          docsSaida: f?.docsSaida ?? eraEtapa.docsSaida,
        };
      });
    }
    const focoIdx = focusEtapaId ? prepared.findIndex(e => e.id === focusEtapaId) : -1;
    setEditEtapasMode(mode);
    setEditEtapasList(prepared);
    setEditEtapasActiveIndex(focoIdx >= 0 ? focoIdx : 0);
    setRemovedEtapaIds(new Set());
    // Abre "limpo" (sem edições pendentes). Se houver rascunho salvo deste
    // processo+modo, oferece recuperação (não aplica automático).
    setEditEtapasDirty(false);
    setConfirmSairOpen(false);
    let draft: EtapasDraft | null = null;
    try {
      const raw = localStorage.getItem(draftKey(mode));
      if (raw) draft = JSON.parse(raw) as EtapasDraft;
    } catch { draft = null; }
    setRascunhoPendente(draft && Array.isArray(draft.list) && draft.list.length > 0 ? draft : null);
    setEditEtapasOpen(true);
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const list = [...editEtapasList];
    const [moved] = list.splice(draggedIndex, 1);
    list.splice(index, 0, moved);
    setEditEtapasList(list);
    setDraggedIndex(index);
    setEditEtapasActiveIndex(index);
    setEditEtapasDirty(true);
  };
  const handleDrop = () => setDraggedIndex(null);

  const handleUpdateEtapaField = <K extends keyof Etapa>(index: number, field: K, value: Etapa[K]) => {
    setEditEtapasDirty(true);
    setEditEtapasList(prev => {
      const list = [...prev];
      list[index] = { ...list[index], [field]: value };
      return list;
    });
  };

  // Nova etapa em branco — já atrelada ao processo atual (o modal vive dentro
  // de um processo, então process_id é automático).
  const addNovaEtapa = () => {
    const nova = {
      id: `etp-novo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      process_id: processo.id,
      name: '',
      description: '',
      execution: 'manual',
      docsEntrada: [],
      docsSaida: [],
      executadoPor: [],
      volumeMensal: 0,
      sistemas: [],
      rework_rate: 0,
    } as Etapa;
    const novaLista = [...editEtapasList, nova];
    setEditEtapasList(novaLista);
    setEditEtapasActiveIndex(novaLista.length - 1);
    setEditEtapasDirty(true);
  };

  // Remove a etapa ativa da lista do modal. A remoção só é aplicada no banco ao
  // "Salvar todas" (fechar sem salvar desfaz) — por isso não usa window.confirm,
  // que é bloqueado em alguns navegadores embutidos. A última etapa fica protegida.
  const handleExcluirEtapa = (index: number) => {
    const etapa = editEtapasList[index];
    if (!etapa || editEtapasList.length <= 1) return;
    const tamanhoAntes = editEtapasList.length;
    setEditEtapasList(prev => prev.filter((_, i) => i !== index));
    if (etapas.some(e => e.id === etapa.id)) {
      setRemovedEtapaIds(prev => {
        const next = new Set(prev);
        next.add(etapa.id);
        return next;
      });
    }
    setEditEtapasActiveIndex(prev => Math.min(prev, tamanhoAntes - 2));
    setEditEtapasDirty(true);
  };

  // Resolução nome→id dos vínculos no save (helpers puros em @/utils/etapaVinculosResolve).
  const resolverVinculos = (e: Etapa): Etapa => ({
    ...e,
    docsEntrada: (e.docsEntrada || []).map(d => ({ ...d, documentoId: resolveVinculoId(d.nome, d.documentoId, docIdByNome, docById) })),
    docsSaida: (e.docsSaida || []).map(d => ({ ...d, documentoId: resolveVinculoId(d.nome, d.documentoId, docIdByNome, docById) })),
    executadoPor: (e.executadoPor || []).map(r => ({ ...r, responsavelId: resolveVinculoId(r.nome, r.responsavelId, respIdByNome, respById) })),
    sistemas: (e.sistemas || []).map(s => resolveSistemaId(s, sisCandidatosPorNome, procClusterId)),
  });

  const handleSaveEtapas = async () => {
    if (!processo) return;
    setEditEtapasSaving(true);
    const cleaned = editEtapasList.map(cleanEtapa).map(resolverVinculos);
    try {
      const existingIds = new Set(etapas.map(e => e.id));
      // Baseline original com o MESMO tratamento do editor (era OU ficou), p/
      // detectar o que mudou e não re-gravar/reconciliar etapa intocada.
      const mergeFicou = (e: Etapa): Etapa => {
        const f = e.ficou;
        return {
          ...e,
          description: f?.description ?? e.description,
          execution: f?.execution ?? e.execution,
          volume_per_process: f?.volume_per_process ?? e.volume_per_process,
          error_rate: f?.error_rate ?? e.error_rate,
          rework_rate: f?.rework_rate ?? e.rework_rate ?? 0,
          executadoPor: f?.executadoPor ?? e.executadoPor,
          sistemas: f?.sistemas ?? e.sistemas,
          docsEntrada: f?.docsEntrada ?? e.docsEntrada,
          docsSaida: f?.docsSaida ?? e.docsSaida,
        } as Etapa;
      };
      const baselineById = new Map(
        etapas.map(e => [
          e.id,
          resolverVinculos(cleanEtapa({ ...(editEtapasMode === 'ficou' ? mergeFicou(e) : e), name: cleanEtapaName(e.name) })),
        ]),
      );
      for (let i = 0; i < cleaned.length; i++) {
        const e = { ...cleaned[i], stage_order: i + 1 };
        if (editEtapasMode === 'era') {
          if (existingIds.has(e.id)) {
            // 3.3 — só grava (e reconcilia vínculos) se a etapa mudou de fato.
            // Etapa intocada não é reescrita → não perde horas/vínculos.
            if (etapaMudou(baselineById.get(e.id), e)) {
              await updateEtapa.mutateAsync({ id: e.id, patch: e as Partial<Etapa>, old: e });
            }
          } else {
            // Etapa nova: o id local é provisório — o banco gera o uuid.
            const { id: _tempId, ...semId } = e;
            void _tempId;
            await createEtapa.mutateAsync(semId as Partial<Etapa> as never);
          }
        } else {
          // mode === 'ficou' — projeção TO-BE. MESMO guard do AS-IS: só faz upsert
          // (e materializa a projeção) se a etapa mudou vs o baseline "como ficou" —
          // senão abrir "Como ficou" e salvar reescreveria TO-BE de todas as etapas.
          if (!existingIds.has(e.id)) continue;
          if (etapaMudou(baselineById.get(e.id), e)) {
            await upsertEtapaToBe.mutateAsync({ etapa: e, process_id: processo.id });
          }
        }
      }
      // Etapas removidas no modal: deleta do banco (somente as que já existiam).
      if (editEtapasMode === 'era') {
        for (const rid of removedEtapaIds) {
          await deleteEtapa.mutateAsync({ id: rid, old: { id: rid } as Etapa });
        }
      }
      // process_stages pode ter mudado nos onSuccess acima — invalida pra UI refrescar.
      queryClient.invalidateQueries({ queryKey: ['process_stages'] });
      // React Query invalida a lista de etapas (process_stages) nos onSuccess
      // dos hooks — a UI rerenderiza com o estado fresco.
      // Salvou: limpa o rascunho e o estado de edição pendente.
      try { localStorage.removeItem(draftKey(editEtapasMode)); } catch { /* ignora */ }
      setEditEtapasDirty(false);
      setConfirmSairOpen(false);
      setRascunhoPendente(null);
      setEditEtapasOpen(false);
    } catch (err) {
      toast.error('Erro ao salvar etapas', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setEditEtapasSaving(false);
    }
  };

  // Fechamento guardado: se há edições não salvas, pede confirmação (aviso
  // in-app, não window.confirm). O rascunho NÃO é apagado ao sair — fica pra
  // recuperação na próxima abertura; só some no salvar ou no "Descartar".
  const requestCloseEtapas = () => {
    if (editEtapasDirty) setConfirmSairOpen(true);
    else setEditEtapasOpen(false);
  };
  const sairSemSalvar = () => {
    setConfirmSairOpen(false);
    setEditEtapasOpen(false);
  };

  // Recuperação de rascunho (banner na abertura).
  const usarRascunho = () => {
    if (!rascunhoPendente) return;
    setEditEtapasList(rascunhoPendente.list);
    setRemovedEtapaIds(new Set(rascunhoPendente.removed ?? []));
    setEditEtapasActiveIndex(Math.min(rascunhoPendente.activeIndex ?? 0, Math.max(0, (rascunhoPendente.list?.length ?? 1) - 1)));
    setEditEtapasDirty(true);
    setRascunhoPendente(null);
  };
  const descartarRascunho = () => {
    try { localStorage.removeItem(draftKey(editEtapasMode)); } catch { /* ignora */ }
    setRascunhoPendente(null);
  };

  const handleSnapshotCriado = () => {
    // Invalida o processo para refletir `mapeado_em` (atualizado quando a
    // 1ª mensuração é salva). React Query refaz o GET sob demanda.
    if (id) queryClient.invalidateQueries({ queryKey: ['processes', id] });
  };

  // ============================================================
  //  Helpers de visualização
  // ============================================================
  const sumHorasEtapa = (e: Etapa, ficou = false): number => {
    const sum = (arr?: ResponsavelEtapa[]) =>
      (arr || []).reduce((s, r) => s + (r.horas || 0), 0);
    if (!ficou) return sum(e.executadoPor);
    // No ficou, usa os arrays do espelho lateral (com fallback para a era
    // quando não há projeção salva).
    const exec = e.ficou?.executadoPor ?? e.executadoPor;
    return sum(exec);
  };

  const fmtPct = (v: number) => formatDecimal((v || 0) * 100);

  // ============================================================
  //  Render
  // ============================================================
  return (
    <div className="card cadastro-shell mapear-shell">
      <div className="mapear-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          className="mapear-voltar"
          onClick={() => navigate('/equipe/digital/mapa/processos')}
          title="Voltar à listagem de processos"
        >
          <ArrowLeft size={16} strokeWidth={2.2} />
          <span>Processos</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TourTrigger dataTour="help" />
          <button
            className="mapear-voltar"
            onClick={() => setEditProcessoOpen(true)}
            title="Editar este processo"
          >
            <Settings2 size={15} strokeWidth={2.2} />
            <span>Editar processo</span>
          </button>
        </div>
      </div>

      <div className="mapear-header">
        <span className="cadastro-eyebrow">
          <span className="cadastro-eyebrow-dot" aria-hidden="true" />
          Mapeamento
        </span>
        <h1 className="mapear-title">{processo.name}</h1>
        {processo.description && <p className="mapear-desc">{processo.description}</p>}
        <div className="mapear-badges">
          {processo.evaluation_status && processo.evaluation_status !== 'Não avaliado' && (
            <StatusBadge variant="diagnostic">{processo.evaluation_status}</StatusBadge>
          )}
          <span className={`mapear-etapas-chip${etapas.length === 0 ? ' vazio' : ''}`}>
            {etapas.length === 0
              ? 'Sem etapas ainda'
              : `${etapas.length} ${etapas.length === 1 ? 'etapa mapeada' : 'etapas mapeadas'}`}
          </span>
        </div>
      </div>

      {/* Downloads do processo — SOP (era/ficou/comparativo) + Diagrama */}
      <div className="mapear-downloads" role="group" aria-label="Exportar documentos do processo">
        <span className="mapear-downloads-label">Exportar</span>
        <button className="mapear-dl-btn" onClick={() => handleGenerateSOP('era')} title="Baixar SOP — Como Era (cenário atual)">
          <FileText size={15} strokeWidth={2.1} />
          <span>SOP (antes)</span>
        </button>
        <button className="mapear-dl-btn" onClick={() => handleGenerateSOP('ficou')} title="Baixar SOP — Como Ficou (cenário projetado)">
          <FileText size={15} strokeWidth={2.1} />
          <span>SOP (como ficou)</span>
        </button>
        <button className="mapear-dl-btn" onClick={handleGenerateSOPComparativo} title="Baixar SOP comparativo Como Era × Como Ficou, lado a lado, com ganhos por etapa e ROI consolidado">
          <GitCompare size={15} strokeWidth={2.1} />
          <span>SOP (comparativo)</span>
        </button>
        <button className="mapear-dl-btn" onClick={() => mapaExports.exportSopMd(processo.id, 'era')} title="Baixar SOP em Markdown — Como Era (mesmo conteúdo do PDF; ideal para refinar o mapeamento)">
          <FileCode2 size={15} strokeWidth={2.1} />
          <span>SOP MD (antes)</span>
        </button>
        <button className="mapear-dl-btn" onClick={() => mapaExports.exportSopMd(processo.id, 'ficou')} title="Baixar SOP em Markdown — Como Ficou (cenário projetado)">
          <FileCode2 size={15} strokeWidth={2.1} />
          <span>SOP MD (como ficou)</span>
        </button>
        <button className="mapear-dl-btn" onClick={() => mapaExports.exportComparativoMd(processo.id)} title="Baixar SOP comparativo em Markdown (mesmo conteúdo do PDF comparativo)">
          <FileCode2 size={15} strokeWidth={2.1} />
          <span>SOP MD (comparativo)</span>
        </button>
        <button className="mapear-dl-btn" onClick={() => setDiagramaScenario('era')} title="Visualizar e baixar o diagrama de ligações do processo — Como Era (cenário atual)">
          <Network size={15} strokeWidth={2.1} />
          <span>Diagrama (antes)</span>
        </button>
        {temFicou && (
          <button className="mapear-dl-btn" onClick={() => setDiagramaScenario('ficou')} title="Visualizar e baixar o diagrama de ligações do processo — Como Ficou (cenário projetado)">
            <Network size={15} strokeWidth={2.1} />
            <span>Diagrama (como ficou)</span>
          </button>
        )}
      </div>

      {/* Gargalos & Melhorias — grão do PROCESSO (gargalo_processos / melhoria_processos) */}
      <GargalosMelhoriasPanel
        gargalos={procGargalos.map(g => ({ id: g.id, nome: g.nome }))}
        melhorias={procMelhorias.map(m => ({ id: m.id, nome: melhoriaLabel(m.improvement_description) }))}
        gargaloOptions={gargalos.map(g => ({ id: g.id, nome: g.nome }))}
        melhoriaOptions={melhorias.map(m => ({ id: m.id, nome: melhoriaLabel(m.improvement_description) }))}
        onAddGargalo={(gid) => { const g = gargalos.find(x => x.id === gid); if (g) updateGargalo.mutateAsync({ id: gid, old: g, patch: { processos: [...new Set([...(g.processos || []), processo.id])] } }).catch(err => toast.error('Erro ao vincular gargalo', { description: err instanceof Error ? err.message : String(err) })); }}
        onRemoveGargalo={(gid) => { const g = gargalos.find(x => x.id === gid); if (g) updateGargalo.mutateAsync({ id: gid, old: g, patch: { processos: (g.processos || []).filter(p => p !== processo.id) } }).catch(err => toast.error('Erro ao desvincular gargalo', { description: err instanceof Error ? err.message : String(err) })); }}
        onAddMelhoria={(mid) => { const m = melhorias.find(x => x.id === mid); if (m) updateMelhoria.mutateAsync({ id: mid, old: m, patch: { processos: [...new Set([...(m.processos || []), processo.id])] } }).catch(err => toast.error('Erro ao vincular melhoria', { description: err instanceof Error ? err.message : String(err) })); }}
        onRemoveMelhoria={(mid) => { const m = melhorias.find(x => x.id === mid); if (m) updateMelhoria.mutateAsync({ id: mid, old: m, patch: { processos: (m.processos || []).filter(p => p !== processo.id) } }).catch(err => toast.error('Erro ao desvincular melhoria', { description: err instanceof Error ? err.message : String(err) })); }}
        onQuickAddGargalo={() => setCadastroRapido('gargalo')}
        onQuickAddMelhoria={() => setCadastroRapido('melhoria')}
      />

      {/* Navegação por abas — indicador deslizante (framer) */}
      <div className="mapear-tabs" role="tablist" data-tour="mapear-tabs">
        {ABAS.map(a => {
          const ativa = aba === a.id;
          return (
            <button
              key={a.id}
              role="tab"
              aria-selected={ativa}
              className={`mapear-tab${ativa ? ' ativa' : ''}`}
              onClick={() => setAba(a.id)}
            >
              <Tooltip text={dica(
                a.id === 'como-era' ? 'mapear.aba.comoEra' : 'mapear.aba.comoFicou'
              )}>{a.label}</Tooltip>
              {ativa && (
                <motion.span
                  layoutId="mapearTabInd"
                  className="mapear-tab-ind"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Painel das abas */}
      <div className="mapear-painel">
        {/* Aba "Configurar ROI" removida (Fase 4): diagnóstico migrou para o doutor
            no modal do projeto; salvar mensuração volta na Fase 5 (snapshot). */}
        <AnimatePresence mode="wait">
          {aba === 'como-era' && (
            <motion.div
              key="como-era"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <ComoEraView
                etapas={etapas}
                fmtPct={fmtPct}
                sumHorasEtapa={sumHorasEtapa}
                onEditar={() => openEditEtapas('era')}
              />
            </motion.div>
          )}
          {aba === 'como-ficou' && (
            <motion.div
              key="como-ficou"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <ComoFicouView
                etapas={etapas}
                fmtPct={fmtPct}
                sumHorasEtapa={sumHorasEtapa}
                onEditar={() => openEditEtapas('ficou')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Editar Etapas */}
      <Modal isOpen={editEtapasOpen} onClose={requestCloseEtapas}>
        {(() => {
          const active = editEtapasList[editEtapasActiveIndex];
          const isFicou = editEtapasMode === 'ficou';
          // Processo sem etapas (ex.: recém-criado) — em vez de abrir o modal
          // vazio (bug do `return null`), oferece adicionar a primeira etapa
          // (ou orienta a mapear o "Como era" antes, no cenário "Como ficou").
          if (!active) {
            return (
              <div className="modal-etapas edit-modal" style={{ position: 'relative' }}>
                <div className="modal-header">
                  <h2>{isFicou ? 'Editar Etapas — Como Ficou' : 'Editar Etapas — Como Era'}</h2>
                </div>
                <EmptyStateCadastro
                  icone={<Layers size={28} strokeWidth={1.8} />}
                  titulo="Nenhuma etapa ainda"
                  texto={isFicou
                    ? 'Mapeie o "Como era" primeiro para depois projetar o "Como ficou".'
                    : 'Adicione a primeira etapa para começar a mapear como o processo funciona hoje.'}
                  ctaLabel={isFicou ? undefined : 'Adicionar primeira etapa'}
                  onCta={isFicou ? undefined : addNovaEtapa}
                />
              </div>
            );
          }
          return (
            <div className="modal-etapas edit-modal" style={{ position: 'relative' }}>
              {rascunhoPendente && (
                <div className="mapear-rascunho-banner">
                  <span>
                    <strong>Rascunho recuperado</strong> — você tem alterações não salvas deste mapeamento. Pode não refletir mudanças recentes no banco.
                  </span>
                  <span style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button type="button" className="btn-save" onClick={usarRascunho}>Usar rascunho</button>
                    <button type="button" className="btn-cancel" onClick={descartarRascunho}>Descartar</button>
                  </span>
                </div>
              )}
              <div className="modal-header">
                <h2>{isFicou ? 'Editar Etapas — Como Ficou' : 'Editar Etapas — Como Era'}</h2>
                <span className="etapas-count" aria-label={`${editEtapasList.length} etapas`}>
                  {editEtapasList.length} {editEtapasList.length === 1 ? 'etapa' : 'etapas'}
                </span>
              </div>
              <div className="etapas-layout">
                <aside className="etapas-sidebar" aria-label="Lista de etapas do processo">
                  <div className="etapas-sidebar-header">Etapas do processo</div>
                  <ol className="etapas-sidebar-list">
                    {editEtapasList.map((e, i) => {
                      const rotulo = cleanEtapaName(e.name) || 'Nova etapa';
                      const isActive = i === editEtapasActiveIndex;
                      return (
                        <li
                          key={e.id}
                          draggable={editEtapasMode === 'era'}
                          className={`etapas-sidebar-item${isActive ? ' active' : ''}${draggedIndex === i ? ' dragging' : ''}`}
                          onClick={() => setEditEtapasActiveIndex(i)}
                          onDragStart={() => handleDragStart(i)}
                          onDragOver={(ev) => handleDragOver(ev, i)}
                          onDrop={handleDrop}
                          onDragEnd={handleDrop}
                          title={editEtapasMode === 'era' ? 'Arraste para reordenar' : rotulo}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setEditEtapasActiveIndex(i); } }}
                        >
                          {editEtapasMode === 'era' && (
                            <span className="etapas-sidebar-handle" aria-hidden="true" title="Arraste para reordenar">
                              <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                                <circle cx="2" cy="3" r="1.2" fill="currentColor"/>
                                <circle cx="2" cy="7" r="1.2" fill="currentColor"/>
                                <circle cx="2" cy="11" r="1.2" fill="currentColor"/>
                                <circle cx="8" cy="3" r="1.2" fill="currentColor"/>
                                <circle cx="8" cy="7" r="1.2" fill="currentColor"/>
                                <circle cx="8" cy="11" r="1.2" fill="currentColor"/>
                              </svg>
                            </span>
                          )}
                          <span className="etapas-sidebar-num">{i + 1}</span>
                          <span className="etapas-sidebar-name">{rotulo}</span>
                        </li>
                      );
                    })}
                  </ol>
                  {editEtapasMode === 'era' && (
                    <button
                      className="etapas-sidebar-add"
                      onClick={addNovaEtapa}
                      title="Adicionar nova etapa ao final"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Adicionar etapa
                    </button>
                  )}
                </aside>
                <div className="etapas-form-area">
                <div className="modal-section">
                  <div className="modal-section-title"><Tooltip text={dica('mapear.secao.identificacao')}>Identificação</Tooltip></div>
                  <FormField label="Nome" compact tooltip={dica('mapear.etapa.nome')}>
                    <input type="text" value={active.name} onChange={(e) => handleUpdateEtapaField(editEtapasActiveIndex, 'name', e.target.value)} />
                  </FormField>
                  <FormField label="Descrição" compact tooltip={dica('mapear.etapa.descricao')}>
                    <textarea value={active.description} onChange={(e) => handleUpdateEtapaField(editEtapasActiveIndex, 'description', e.target.value)} />
                  </FormField>
                </div>

                <div className="modal-section">
                  <div className="modal-section-title"><Tooltip text={dica('mapear.secao.operacao')}>Operação</Tooltip></div>
                  <div className="form-row">
                    <FormField label="Execução" compact tooltip={dica('mapear.etapa.execution')}>
                      <Select
                        value={active.execution || ''}
                        onChange={(v) => handleUpdateEtapaField(editEtapasActiveIndex, 'execution', v)}
                        options={EXECUCAO_OPCOES}
                        placeholder="Selecione..."
                        compact
                      />
                    </FormField>
                  </div>
                </div>

                <div className="modal-section">
                  <div className="modal-section-title"><Tooltip text={dica('mapear.secao.documentos')}>Documentos</Tooltip></div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 6 }}>
                    O número ao lado de cada documento indica o <strong>volume por execução</strong>.
                  </div>
                  <FormField label="Docs Entrada" compact tooltip={dica('mapear.etapa.docsEntrada')}>
                    <ChipSelector options={docNames} value={active.docsEntrada || []}
                      onChange={(v) => handleUpdateEtapaField(editEtapasActiveIndex, 'docsEntrada', v as DocRef[])} withVolume compact
                      onAddNew={() => setCadastroRapido('documento')} addNewLabel="Cadastrar novo documento" />
                  </FormField>
                  <FormField label="Docs Saída" compact tooltip={dica('mapear.etapa.docsSaida')}>
                    <ChipSelector options={docNames} value={active.docsSaida || []}
                      onChange={(v) => handleUpdateEtapaField(editEtapasActiveIndex, 'docsSaida', v as DocRef[])} withVolume compact
                      onAddNew={() => setCadastroRapido('documento')} addNewLabel="Cadastrar novo documento" />
                  </FormField>
                </div>

                <div className="modal-section">
                  <div className="modal-section-title"><Tooltip text={dica('mapear.secao.equipe')}>Equipe — horas por pessoa</Tooltip></div>
                  <FormField label="Executado por" compact tooltip={dica('mapear.etapa.executadoPor')}>
                    <ChipSelector
                      options={respNames}
                      value={active.executadoPor || []}
                      onChange={(v) => handleUpdateEtapaField(editEtapasActiveIndex, 'executadoPor', v as ResponsavelEtapa[])}
                      withHours
                      compact
                      addLabel="Adicionar executor"
                      onAddNew={() => setCadastroRapido('responsavel')}
                      addNewLabel="Cadastrar novo responsável"
                    />
                  </FormField>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                    Horas gasta por projeto: <strong>{formatDecimal(sumHorasEtapa(active, isFicou), 'h')}</strong>
                  </div>
                </div>

                <div className="modal-section">
                  <div className="modal-section-title"><Tooltip text={dica('mapear.secao.metricas')}>Métricas</Tooltip></div>
                  <div className="form-row">
                    <FormField label="Volume por processo" compact tooltip={dica('mapear.etapa.volume_per_process')}>
                      <DecimalInput value={active.volume_per_process || 0} onChange={(n) => handleUpdateEtapaField(editEtapasActiveIndex, 'volume_per_process', n)} min={0} />
                    </FormField>
                    <FormField label="Taxa Erros (%)" compact tooltip={dica('mapear.etapa.error_rate')}>
                      <DecimalInput
                        value={(active.error_rate ?? 0) * 100}
                        onChange={(n) => handleUpdateEtapaField(editEtapasActiveIndex, 'error_rate', n / 100)}
                        min={0}
                        max={100}
                        placeholder="Ex: 5"
                      />
                    </FormField>
                  </div>
                  <FormField label="Taxa Retrabalho (%)" compact tooltip={dica('mapear.etapa.rework_rate')}>
                    <DecimalInput
                      value={(active.rework_rate || 0) * 100}
                      onChange={(n) => handleUpdateEtapaField(editEtapasActiveIndex, 'rework_rate', n / 100)}
                      min={0}
                      max={100}
                      placeholder="Ex: 15"
                    />
                  </FormField>
                </div>

                <div className="modal-section">
                  <div className="modal-section-title"><Tooltip text={dica('mapear.secao.sistemas')}>Sistemas</Tooltip></div>
                  <FormField label="Sistemas" compact tooltip={dica('mapear.etapa.sistemas')}>
                    <ChipSelector options={sisNames} value={active.sistemas || []}
                      onChange={(v) => handleUpdateEtapaField(editEtapasActiveIndex, 'sistemas', v as string[])} compact
                      onAddNew={() => setCadastroRapido('sistema')} addNewLabel="Cadastrar novo sistema" />
                  </FormField>
                  {(active.sistemas || []).filter(Boolean).length > 0 && (
                    <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#64748b' }}>
                      O rateio (%) do custo por cluster é configurado em <strong>Sistemas → editar sistema → Rateio por cluster</strong>.
                    </div>
                  )}
                </div>


                </div>
              </div>
              <div className="modal-footer">
                {editEtapasMode === 'era' ? (
                  <button
                    className="btn-delete-etapa"
                    onClick={() => handleExcluirEtapa(editEtapasActiveIndex)}
                    disabled={editEtapasList.length <= 1}
                    title={editEtapasList.length <= 1 ? 'O processo precisa de ao menos uma etapa' : 'Excluir esta etapa'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <path d="M10 11v6"/>
                      <path d="M14 11v6"/>
                    </svg>
                    Excluir esta etapa
                  </button>
                ) : <span />}
                <div className="modal-footer-actions">
                  <button className="btn-cancel" onClick={requestCloseEtapas}>Cancelar</button>
                  <button className="btn-save" onClick={handleSaveEtapas} disabled={editEtapasSaving}>{editEtapasSaving ? 'Salvando...' : 'Salvar todas'}</button>
                </div>
              </div>

              {confirmSairOpen && (
                <div className="mapear-confirm-sair" role="alertdialog" aria-modal="true">
                  <div className="mapear-confirm-card">
                    <h3>Sair sem salvar?</h3>
                    <p>Há alterações não salvas neste mapeamento. Elas ficam guardadas como rascunho para a próxima vez, mas não vão para o banco até você clicar em <strong>"Salvar todas"</strong>.</p>
                    <div className="modal-actions">
                      <button type="button" className="btn-cancel" onClick={() => setConfirmSairOpen(false)}>Continuar editando</button>
                      <button type="button" className="btn-save" onClick={sairSemSalvar}>Sair sem salvar</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Diagrama Mermaid do processo */}
      <DiagramViewer
        isOpen={diagramaScenario !== null}
        onClose={() => setDiagramaScenario(null)}
        code={diagramaScenario === 'ficou' ? diagramaCodeFicou : diagramaCode}
        filename={diagramaScenario === 'ficou' ? diagramaFilenameFicou : diagramaFilename}
        title={`Diagrama${diagramaScenario === 'ficou' ? ' · Como Ficou' : ' · Como Era'}: ${processo.name}`}
      />

      {/* Cadastro rápido a partir do editor de etapas */}
      <ProcessoFormModal aberto={editProcessoOpen} processo={processo} onClose={() => setEditProcessoOpen(false)} />
      <NovoDocumentoModal isOpen={cadastroRapido === 'documento'} onClose={() => setCadastroRapido(null)} />
      <NovoSistemaModal isOpen={cadastroRapido === 'sistema'} onClose={() => setCadastroRapido(null)} />
      <NovoResponsavelModal isOpen={cadastroRapido === 'responsavel'} onClose={() => setCadastroRapido(null)} />
      <NovoGargaloModal
        isOpen={cadastroRapido === 'gargalo'}
        onClose={() => setCadastroRapido(null)}
        onCreated={(g) => {
          // grão = processo: vincula o gargalo recém-criado a ESTE processo.
          updateGargalo.mutateAsync({ id: g.id, old: g, patch: { processos: [...new Set([...(g.processos || []), processo.id])] } })
            .catch(err => toast.error('Erro ao vincular gargalo', { description: err instanceof Error ? err.message : String(err) }));
        }}
      />
      <NovoMelhoriaModal
        isOpen={cadastroRapido === 'melhoria'}
        onClose={() => setCadastroRapido(null)}
        clusterIdInicial={procClusterId ?? undefined}
        processIdInicial={processo.id}
        onCreated={(m) => {
          // grão = processo: vincula a melhoria recém-criada a ESTE processo.
          updateMelhoria.mutateAsync({ id: m.id, old: m, patch: { processos: [...new Set([...(m.processos || []), processo.id])] } })
            .catch(err => toast.error('Erro ao vincular melhoria', { description: err instanceof Error ? err.message : String(err) }));
        }}
      />
    </div>
  );
}

// ============================================================
//  Sub-views (puramente apresentacionais)
// ============================================================

const EXEC_LABEL: Record<string, string> = {
  manual: 'Manual',
  semi_automatica: 'Semi-automática',
  automatica: 'Automática',
};
const execLabel = (v?: string) => (v ? (EXEC_LABEL[v] ?? v) : '—');

function docChips(arr?: DocRef[]) {
  const itens = (arr || []).filter(d => d.nome?.trim());
  if (!itens.length) return <span className="mapear-vazio">—</span>;
  return itens.map((d, i) => (
    <span key={`${d.nome}-${i}`} className="mapear-chip">
      {d.nome}{(d.volume || 0) > 0 && <em className="mapear-chip-vol">{formatDecimal(d.volume)}</em>}
    </span>
  ));
}
function pessoaChips(arr?: ResponsavelEtapa[]) {
  const itens = (arr || []).filter(r => r.nome?.trim());
  if (!itens.length) return <span className="mapear-vazio">—</span>;
  return itens.map((r, i) => (
    <span key={`${r.nome}-${i}`} className="mapear-chip teal">
      {r.nome}{r.horas != null && <em className="mapear-chip-vol">{formatDecimal(r.horas || 0, 'h')}</em>}
    </span>
  ));
}
function sistemaChips(arr?: string[]) {
  const itens = (arr || []).filter(Boolean);
  if (!itens.length) return <span className="mapear-vazio">—</span>;
  return itens.map((s, i) => <span key={`${s}-${i}`} className="mapear-chip indigo">{s}</span>);
}

function EtapaCampo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mapear-campo">
      <span className="mapear-campo-label">{label}</span>
      <div className="mapear-chips">{children}</div>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="mapear-metric">
      <span className="mapear-metric-label">{label}</span>
      <strong className="mapear-metric-val">{value}</strong>
    </div>
  );
}
function MapearTabHead({ titulo, subtitulo, onEditar }: { titulo: string; subtitulo: string; onEditar: () => void }) {
  return (
    <div className="mapear-tab-head">
      <div className="mapear-tab-head-txt">
        <h3 className="mapear-tab-titulo">{titulo}</h3>
        <p className="mapear-tab-sub">{subtitulo}</p>
      </div>
      <button className="cadastro-cta" onClick={onEditar} title="Abrir o editor de etapas">
        <Pencil size={15} strokeWidth={2.2} />
        <span>Editar etapas</span>
      </button>
    </div>
  );
}

interface ComoEraProps {
  etapas: Etapa[];
  fmtPct: (v: number) => string;
  sumHorasEtapa: (e: Etapa, ficou?: boolean) => number;
  onEditar: () => void;
}
function ComoEraView({ etapas, fmtPct, sumHorasEtapa, onEditar }: ComoEraProps) {
  return (
    <div className="mapear-tab-content">
      <MapearTabHead titulo="Como era" subtitulo="O retrato atual do processo, etapa por etapa." onEditar={onEditar} />

      {etapas.length === 0 ? (
        <EmptyStateCadastro
          icone={<Layers size={32} strokeWidth={1.8} />}
          titulo="Comece a mapear"
          texto="Este processo ainda não tem etapas. Adicione a primeira e descreva como o trabalho acontece hoje."
          ctaLabel="Mapear primeira etapa"
          onCta={onEditar}
        />
      ) : (
        <ol className="mapear-fluxo list-stagger">
          {etapas.map((e, i) => (
            <li key={e.id} className="mapear-etapa">
              <div className="mapear-etapa-top">
                <span className="mapear-etapa-num">{i + 1}</span>
                <h4 className="mapear-etapa-nome">{e.name}</h4>
                <span className="mapear-exec">{execLabel(e.execution)}</span>
              </div>
              {e.description && <p className="mapear-etapa-desc">{e.description}</p>}
              <div className="mapear-campos">
                <EtapaCampo label="Entrada">{docChips(e.docsEntrada)}</EtapaCampo>
                <EtapaCampo label="Saída">{docChips(e.docsSaida)}</EtapaCampo>
                <EtapaCampo label="Equipe">{pessoaChips(e.executadoPor)}</EtapaCampo>
                <EtapaCampo label="Sistemas">{sistemaChips(e.sistemas)}</EtapaCampo>
              </div>
              <div className="mapear-metrics">
                <Metric label="Horas/projeto" value={formatDecimal(sumHorasEtapa(e), 'h')} />
                <Metric label="Volume" value={formatDecimal(e.volume_per_process || 0)} />
                <Metric label="Erros" value={`${fmtPct(e.error_rate ?? 0)}%`} />
                <Metric label="Retrabalho" value={`${fmtPct(e.rework_rate)}%`} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

interface ComoFicouProps {
  etapas: Etapa[];
  fmtPct: (v: number) => string;
  sumHorasEtapa: (e: Etapa, ficou?: boolean) => number;
  onEditar: () => void;
}
function ComoFicouView({ etapas, fmtPct, sumHorasEtapa, onEditar }: ComoFicouProps) {
  return (
    <div className="mapear-tab-content">
      <MapearTabHead titulo="Como ficou" subtitulo="O cenário projetado depois das melhorias." onEditar={onEditar} />

      {etapas.length === 0 ? (
        <EmptyStateCadastro
          icone={<Layers size={32} strokeWidth={1.8} />}
          titulo="Nada para projetar ainda"
          texto="Mapeie o 'Como era' primeiro. Depois, projete aqui como cada etapa fica após as melhorias."
          ctaLabel="Editar etapas"
          onCta={onEditar}
        />
      ) : (
        <ol className="mapear-fluxo list-stagger">
            {etapas.map((e, i) => {
              // Resolve campos do cenário ficou — usa etapa.ficou.* quando há
              // projeção salva, senão faz fallback para os valores da era.
              const f = e.ficou;
              const descricao  = f?.description        ?? e.description;
              const execution  = f?.execution          ?? e.execution;
              const volProjeto = f?.volume_per_process  ?? e.volume_per_process;
              const taxaRetrab = f?.rework_rate         ?? e.rework_rate;
              const execArr    = f?.executadoPor        ?? e.executadoPor;
              const sistArr    = f?.sistemas            ?? e.sistemas;
              const docsEnt    = f?.docsEntrada         ?? e.docsEntrada;
              const docsSai    = f?.docsSaida           ?? e.docsSaida;
              const horasFuturas = sumHorasEtapa(e, true);
              return (
                <li key={e.id} className="mapear-etapa">
                  <div className="mapear-etapa-top">
                    <span className="mapear-etapa-num">{i + 1}</span>
                    <h4 className="mapear-etapa-nome">{e.name}</h4>
                    <span className="mapear-exec">{execLabel(execution)}</span>
                  </div>
                  {descricao && <p className="mapear-etapa-desc">{descricao}</p>}
                  <div className="mapear-campos">
                    <EtapaCampo label="Entrada">{docChips(docsEnt)}</EtapaCampo>
                    <EtapaCampo label="Saída">{docChips(docsSai)}</EtapaCampo>
                    <EtapaCampo label="Equipe">{pessoaChips(execArr)}</EtapaCampo>
                    <EtapaCampo label="Sistemas">{sistemaChips(sistArr)}</EtapaCampo>
                  </div>
                  <div className="mapear-metrics">
                    <Metric label="Horas/projeto" value={horasFuturas > 0 ? formatDecimal(horasFuturas, 'h') : 'Não definido'} />
                    <Metric label="Volume" value={formatDecimal(volProjeto || 0)} />
                    <Metric label="Retrabalho" value={taxaRetrab != null ? `${fmtPct(taxaRetrab)}%` : 'Não definido'} />
                  </div>
                </li>
              );
            })}
        </ol>
      )}
    </div>
  );
}
