// Projetos — página principal do MAPA (padrão "Cadastro Puro").
// Busca + lista enxuta + "Modal da Paz" (detalhe com abas) + form unificado.
// Sem KPIs, sem FiltrosBar, sem grid de cards — escopo por cluster global.

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FolderKanban, SearchX } from 'lucide-react';
import CadastroPageShell from '@/components/equipe/mapa/cadastro/CadastroPageShell';
import CadastroToolbar from '@/components/equipe/mapa/cadastro/CadastroToolbar';
import CadastroLista from '@/components/equipe/mapa/cadastro/CadastroLista';
import CadastroItem from '@/components/equipe/mapa/cadastro/CadastroItem';
import EmptyStateCadastro from '@/components/equipe/mapa/cadastro/EmptyStateCadastro';
import ConfirmDeleteModal from '@/components/equipe/mapa/cadastro/ConfirmDeleteModal';
import ProjetoFormModal from '@/components/equipe/mapa/cadastro/ProjetoFormModal';
import ProjetoDetalheModal from '@/components/equipe/mapa/cadastro/ProjetoDetalheModal';
import { canon } from '@/utils/cascataEngine';
import { useFocusParam } from '@/utils/useFocusParam';
import type { Etapa, Melhoria, Processo, Projeto } from '@/types';
import { useProjetos, useDeleteProjeto } from '@/hooks/useProjetos';
import { useProcessos } from '@/hooks/useProcessos';
import { useEtapasLista, useMelhoriasLista, useGargalosLista } from '@/hooks/useDominioListas';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';
import { processoIdsDaMelhoria } from '@/utils/gargaloMelhorias';

type MelhoriaComProjeto = Melhoria & { project_id?: string | null };

// Ordena por prefixo "P<n>" e depois alfabético (mesma regra do design antigo).
const getProjetoOrder = (name: string) => {
  const normalized = name.normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const match = normalized.match(/^p\s*(\d+)/i);
  return { prefix: match ? Number(match[1]) : Number.MAX_SAFE_INTEGER, normalized };
};
const compareProjetosPorOrdem = (a: Projeto, b: Projeto) => {
  const oa = getProjetoOrder(a.name);
  const ob = getProjetoOrder(b.name);
  return oa.prefix - ob.prefix
    || oa.normalized.localeCompare(ob.normalized, 'pt-BR', { numeric: true, sensitivity: 'base' });
};

export default function ProjetosPage() {
  const { data: items = [], isLoading } = useProjetos();
  const deleteMut = useDeleteProjeto();
  const { data: processos = [] } = useProcessos();
  const { data: etapas = [] } = useEtapasLista();
  const { data: melhorias = [] } = useMelhoriasLista();
  const { data: gargalos = [] } = useGargalosLista();
  const { cluster: fCluster } = useClusterGlobal();

  const [busca, setBusca] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Projeto | null>(null);
  const [detalhe, setDetalhe] = useState<Projeto | null>(null);
  const [confirmDel, setConfirmDel] = useState<Projeto | null>(null);

  const noEscopo = useMemo(
    () => items.filter(p => !fCluster || p.cluster_id === fCluster).sort(compareProjetosPorOrdem),
    [items, fCluster],
  );
  const visiveis = useMemo(() => {
    const q = canon(busca.trim());
    if (!q) return noEscopo;
    return noEscopo.filter(p =>
      canon(p.name).includes(q) || canon(p.clusterName || '').includes(q) ||
      canon(p.status || '').includes(q) || canon(p.description || '').includes(q)
    );
  }, [noEscopo, busca]);

  // --- Dados de apoio para a Modal da Paz ---
  const processosPorProjeto = useMemo(() => {
    const map = new Map<string, Processo[]>();
    for (const p of processos) {
      if (!p.project_id) continue;
      const arr = map.get(p.project_id) || [];
      arr.push(p);
      map.set(p.project_id, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.name.localeCompare(b.name));
    }
    return map;
  }, [processos]);

  const etapasPorProcesso = useMemo(() => {
    const map = new Map<string, Etapa[]>();
    for (const e of etapas) {
      const arr = map.get(e.process_id) || [];
      arr.push(e);
      map.set(e.process_id, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.stage_order ?? 0) - (b.stage_order ?? 0) || a.name.localeCompare(b.name));
    }
    return map;
  }, [etapas]);

  const processoNomeById = useMemo(() => new Map(processos.map(p => [p.id, p.name])), [processos]);

  const detalheProcessos = detalhe ? processosPorProjeto.get(detalhe.id) || [] : [];
  const detalheBacklog = useMemo(() => {
    if (!detalhe) return [] as Melhoria[];
    const processIds = new Set((processosPorProjeto.get(detalhe.id) || []).map(p => p.id));
    return melhorias
      .filter(m => {
        if ((m.improvement_status || 'Não iniciado') !== 'Backlog') return false;
        if ((m as MelhoriaComProjeto).project_id === detalhe.id) return true;
        return processoIdsDaMelhoria(m.id, gargalos).some(pid => processIds.has(pid));
      })
      .sort((a, b) => a.improvement_description.localeCompare(b.improvement_description));
  }, [detalhe, processosPorProjeto, melhorias, gargalos]);

  const abrirCriar = () => { setEmEdicao(null); setFormAberto(true); };
  const abrirEditar = (p: Projeto) => { setEmEdicao(p); setFormAberto(true); };

  // ?focus= abre o detalhe do projeto (uma vez).
  const focusId = useFocusParam();
  const focusConsumido = useRef(false);
  useEffect(() => {
    if (focusConsumido.current || isLoading || !focusId) return;
    const p = items.find(x => x.id === focusId);
    if (p) { focusConsumido.current = true; setDetalhe(p); }
  }, [isLoading, focusId, items]);

  return (
    <CadastroPageShell
      eyebrow="Mapa · Digital"
      titulo="Projetos"
      subtitulo="Cadastre e acompanhe os projetos do seu mapa."
      ctaLabel="Adicionar Projeto"
      onCta={abrirCriar}
      carregando={isLoading}
    >
      {noEscopo.length > 0 && (
        <CadastroToolbar
          busca={busca}
          onBusca={setBusca}
          total={noEscopo.length}
          visiveis={visiveis.length}
          substantivo={['projeto', 'projetos']}
          placeholder="Buscar por nome, cluster ou status..."
        />
      )}
      <CadastroLista
        vazio={noEscopo.length === 0}
        semResultadoBusca={visiveis.length === 0}
        emptyState={
          <EmptyStateCadastro
            icone={<FolderKanban size={32} strokeWidth={1.8} />}
            titulo="Nenhum projeto cadastrado"
            texto="Projetos organizam o mapa por frente de trabalho. Cadastre o primeiro para começar a agrupar processos."
            ctaLabel="Cadastrar primeiro projeto"
            onCta={abrirCriar}
          />
        }
        semResultados={
          <EmptyStateCadastro
            compacto
            icone={<SearchX size={20} />}
            titulo={`Nenhum projeto para "${busca.trim()}"`}
            ctaLabel="Limpar busca"
            onCta={() => setBusca('')}
          />
        }
      >
        {visiveis.map((p) => (
          <CadastroItem
            key={p.id}
            titulo={p.name}
            descricao={p.clusterName || undefined}
            leading={<FolderKanban size={20} strokeWidth={2} />}
            badge={{ label: p.status || 'Mapeamento' }}
            onOpen={() => setDetalhe(p)}
            onEdit={() => abrirEditar(p)}
            onDelete={() => setConfirmDel(p)}
          />
        ))}
      </CadastroLista>

      <ProjetoDetalheModal
        aberto={!!detalhe}
        projeto={detalhe}
        processos={detalheProcessos}
        etapasPorProcesso={etapasPorProcesso}
        backlog={detalheBacklog}
        processoNomeById={processoNomeById}
        gargalos={gargalos}
        onClose={() => setDetalhe(null)}
        onEditar={() => { const p = detalhe; setDetalhe(null); if (p) abrirEditar(p); }}
      />

      <ProjetoFormModal
        aberto={formAberto}
        projeto={emEdicao}
        onClose={() => setFormAberto(false)}
      />

      <ConfirmDeleteModal
        aberto={!!confirmDel}
        nomeItem={confirmDel?.name ?? ''}
        substantivo="projeto"
        aviso="Os processos vinculados a ele ficarão sem projeto associado."
        onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          if (!confirmDel) return;
          await deleteMut.mutateAsync({ id: confirmDel.id, old: confirmDel });
          toast.success('Projeto excluído');
        }}
      />
    </CadastroPageShell>
  );
}
