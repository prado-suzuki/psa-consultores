import { useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCreateEtapa, useDeleteEtapa, useUpdateEtapa, useUpsertEtapaToBe } from '@/hooks/useEtapas';
import type { Documento, DocRef, Etapa, Processo, Responsavel, ResponsavelEtapa, Sistema } from '@/types';
import { inserirVinculoCriado, primeiraEtapaSemNome } from '@/utils/etapaEditor';
import type { CampoVinculo } from '@/utils/etapaEditor';
import { etapaMudou } from '@/utils/etapaMudou';
import {
  cleanEtapa, criarEtapaVazia, draftKey, prepararEtapas, resolverVinculos,
  type EtapasDraft, type MapearScenario, type VinculoMaps, type VinculoValue,
} from '@/lib/mapearProcessoModel';

interface Params {
  processo: Processo;
  etapas: Etapa[];
  documentos: Documento[];
  sistemas: Sistema[];
  responsaveis: Responsavel[];
  procClusterId: string | null;
}

export type CadastroRapido = 'documento' | 'sistema' | 'responsavel' | 'gargalo' | 'melhoria' | null;
export type QuickAddCampo = CampoVinculo | null;

export function useEtapasEditor({ processo, etapas, documentos, sistemas, responsaveis, procClusterId }: Params) {
  const queryClient = useQueryClient();
  const createEtapa = useCreateEtapa();
  const updateEtapa = useUpdateEtapa();
  const deleteEtapa = useDeleteEtapa();
  const upsertEtapaToBe = useUpsertEtapaToBe();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<MapearScenario>('era');
  const [list, setList] = useState<Etapa[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<EtapasDraft | null>(null);
  const [cadastroRapido, setCadastroRapido] = useState<CadastroRapido>(null);
  const [quickAddCampo, setQuickAddCampo] = useState<QuickAddCampo>(null);

  useEffect(() => {
    if (!open || !dirty) return;
    try {
      localStorage.setItem(draftKey(processo.id, mode), JSON.stringify({ mode, list, removed: [...removedIds], activeIndex, ts: Date.now() } satisfies EtapasDraft));
    } catch { /* mantém o rascunho apenas em memória */ }
  }, [open, dirty, list, removedIds, activeIndex, mode, processo.id]);

  const maps = useMemo<VinculoMaps>(() => {
    const candidatos = new Map<string, { id: string; cluster_id?: string | null }[]>();
    for (const sistema of sistemas) {
      const itens = candidatos.get(sistema.nome) ?? [];
      itens.push({ id: sistema.id, cluster_id: sistema.cluster_id });
      candidatos.set(sistema.nome, itens);
    }
    return {
      docIdByNome: new Map(documentos.map(item => [item.nome, item.id])),
      docById: new Map(documentos.map(item => [item.id, item.nome])),
      respIdByNome: new Map(responsaveis.map(item => [item.name, item.id])),
      respById: new Map(responsaveis.map(item => [item.id, item.name])),
      sisCandidatosPorNome: candidatos,
      procClusterId,
    };
  }, [documentos, sistemas, responsaveis, procClusterId]);

  const openEditor = (nextMode: MapearScenario, focusId?: string) => {
    const prepared = prepararEtapas(etapas, nextMode);
    const focusIndex = focusId ? prepared.findIndex(item => item.id === focusId) : -1;
    setMode(nextMode); setList(prepared); setActiveIndex(focusIndex >= 0 ? focusIndex : 0);
    setRemovedIds(new Set()); setDirty(false); setConfirmClose(false);
    let draft: EtapasDraft | null = null;
    try { const raw = localStorage.getItem(draftKey(processo.id, nextMode)); if (raw) draft = JSON.parse(raw) as EtapasDraft; } catch { draft = null; }
    setPendingDraft(draft && Array.isArray(draft.list) && draft.list.length > 0 ? draft : null);
    setOpen(true);
  };

  const updateField = <K extends keyof Etapa>(index: number, field: K, value: Etapa[K]) => {
    setDirty(true);
    setList(previous => { const next = [...previous]; next[index] = { ...next[index], [field]: value }; return next; });
  };

  const add = () => { const next = [...list, criarEtapaVazia(processo.id)]; setList(next); setActiveIndex(next.length - 1); setDirty(true); };
  const remove = (index: number) => {
    const etapa = list[index]; if (!etapa || list.length <= 1) return;
    const previousLength = list.length; setList(items => items.filter((_, itemIndex) => itemIndex !== index));
    if (etapas.some(item => item.id === etapa.id)) setRemovedIds(previous => new Set(previous).add(etapa.id));
    setActiveIndex(previous => Math.min(previous, previousLength - 2)); setDirty(true);
  };
  const dragStart = (index: number) => setDraggedIndex(index);
  const dragOver = (event: DragEvent, index: number) => {
    event.preventDefault(); if (mode !== 'era' || draggedIndex === null || draggedIndex === index) return;
    const next = [...list]; const [moved] = next.splice(draggedIndex, 1); next.splice(index, 0, moved);
    setList(next); setDraggedIndex(index); setActiveIndex(index); setDirty(true);
  };
  const drop = () => setDraggedIndex(null);

  const fillCreated = (campo: CampoVinculo, nome: string, itemId: string) => {
    const index = activeIndex; setDirty(true);
    setList(previous => {
      const etapa = previous[index]; if (!etapa) return previous;
      const atual = (etapa[campo] as VinculoValue[]) || []; const next = [...previous];
      next[index] = { ...etapa, [campo]: inserirVinculoCriado(atual, campo, nome, itemId) } as Etapa;
      return next;
    });
  };

  const closeQuick = () => {
    const campo = quickAddCampo;
    if (campo) setList(previous => {
      const etapa = previous[activeIndex]; if (!etapa) return previous;
      const atual = (etapa[campo] as VinculoValue[]) || [];
      const limpo = atual.filter(item => ((typeof item === 'string' ? item : item.nome) || '').trim());
      if (limpo.length === atual.length) return previous;
      const next = [...previous]; next[activeIndex] = { ...etapa, [campo]: limpo } as Etapa; return next;
    });
    setCadastroRapido(null); setQuickAddCampo(null);
  };

  const save = async () => {
    const semNome = primeiraEtapaSemNome(list);
    if (semNome >= 0) { setActiveIndex(semNome); toast.error(`A etapa ${semNome + 1} está sem nome`, { description: 'Toda etapa precisa de um nome antes de salvar.' }); return; }
    setSaving(true);
    const cleaned = list.map(cleanEtapa).map(item => resolverVinculos(item, maps));
    try {
      const existingIds = new Set(etapas.map(item => item.id));
      const baselineById = new Map(etapas.map(item => [item.id, resolverVinculos(cleanEtapa(prepararEtapas([item], mode)[0]), maps)]));
      for (let index = 0; index < cleaned.length; index++) {
        const etapa = { ...cleaned[index], stage_order: index + 1 };
        try {
          if (mode === 'era') {
            if (existingIds.has(etapa.id)) { if (etapaMudou(baselineById.get(etapa.id), etapa)) await updateEtapa.mutateAsync({ id: etapa.id, patch: etapa as Partial<Etapa>, old: etapa }); }
            else { const { id: _tempId, ...semId } = etapa; void _tempId; await createEtapa.mutateAsync(semId as Partial<Etapa> as never); }
          } else if (existingIds.has(etapa.id) && etapaMudou(baselineById.get(etapa.id), etapa)) await upsertEtapaToBe.mutateAsync({ etapa, process_id: processo.id });
        } catch (error) { throw new Error(`Etapa ${index + 1}${etapa.name ? ` ("${etapa.name}")` : ''}: ${error instanceof Error ? error.message : String(error)}`); }
      }
      if (mode === 'era') for (const id of removedIds) await deleteEtapa.mutateAsync({ id, old: { id } as Etapa });
      queryClient.invalidateQueries({ queryKey: ['process_stages'] });
      try { localStorage.removeItem(draftKey(processo.id, mode)); } catch { /* ignora */ }
      setDirty(false); setConfirmClose(false); setPendingDraft(null); setOpen(false);
    } catch (error) { toast.error('Erro ao salvar etapas', { description: error instanceof Error ? error.message : String(error) }); }
    finally { setSaving(false); }
  };

  const requestClose = () => dirty ? setConfirmClose(true) : setOpen(false);
  const useDraft = () => { if (!pendingDraft) return; setList(pendingDraft.list); setRemovedIds(new Set(pendingDraft.removed ?? [])); setActiveIndex(Math.min(pendingDraft.activeIndex ?? 0, Math.max(0, (pendingDraft.list?.length ?? 1) - 1))); setDirty(true); setPendingDraft(null); };
  const discardDraft = () => { try { localStorage.removeItem(draftKey(processo.id, mode)); } catch { /* ignora */ } setPendingDraft(null); };

  return { open, mode, list, activeIndex, saving, draggedIndex, confirmClose, pendingDraft, cadastroRapido, quickAddCampo,
    setActiveIndex, setConfirmClose, setOpen, setCadastroRapido, setQuickAddCampo, openEditor, updateField, add, remove,
    dragStart, dragOver, drop, fillCreated, closeQuick, save, requestClose, useDraft, discardDraft,
    leaveWithoutSaving: () => { setConfirmClose(false); setOpen(false); } };
}

export type EtapasEditorController = ReturnType<typeof useEtapasEditor>;
