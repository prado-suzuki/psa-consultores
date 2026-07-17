// Projetos — página principal do MAPA (padrão "Cadastro Puro").
// Busca + lista enxuta + "Modal da Paz" (detalhe com abas) + form unificado.
// Sem KPIs, sem FiltrosBar, sem grid de cards — escopo por cluster global.

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FolderKanban, SearchX, Search, X } from 'lucide-react';
import CadastroPageShell from '@/components/equipe/mapa/cadastro/CadastroPageShell';
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
import { useMelhoriasLista, useGargalosLista, useResponsaveisLista, useDocumentosLista, useSistemasLista } from '@/hooks/useDominioListas';
import { useEtapasPorCenario } from '@/hooks/useEtapasPorCenario';
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
  const { data: melhorias = [] } = useMelhoriasLista();
  const { data: gargalos = [] } = useGargalosLista();
  const { data: responsaveis = [] } = useResponsaveisLista();
  const { data: documentos = [] } = useDocumentosLista();
  const { data: sistemas = [] } = useSistemasLista();
  const { cluster: fCluster } = useClusterGlobal();
  // Etapas por cenário (enriquecidas + agrupadas por processo) — fonte única do
  // modelo por-cenário (sem `.ficou`). AS-IS p/ readout/status; TO-BE p/ comparativo.
  const { asis: etapas, asisPorProcesso: etapasPorProcesso, tobePorProcesso: tobeEtapasPorProcesso } = useEtapasPorCenario();

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

  // Filtro de status (mesmos chips da página de Processos): um projeto é
  // "mapeado" quando tem ≥1 processo com etapas mapeadas.
  const [fMapeado, setFMapeado] = useState<'todos' | 'mapeados' | 'faltam'>('todos');
  const processosComEtapas = useMemo(() => new Set(etapas.map(e => e.process_id)), [etapas]);
  const projetosMapeadosIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of processos) {
      if (p.project_id && processosComEtapas.has(p.id)) s.add(p.project_id);
    }
    return s;
  }, [processos, processosComEtapas]);
  const nMapeados = useMemo(() => visiveis.filter(p => projetosMapeadosIds.has(p.id)).length, [visiveis, projetosMapeadosIds]);
  const nFaltam = visiveis.length - nMapeados;
  const listaExibida = useMemo(() => {
    if (fMapeado === 'mapeados') return visiveis.filter(p => projetosMapeadosIds.has(p.id));
    if (fMapeado === 'faltam') return visiveis.filter(p => !projetosMapeadosIds.has(p.id));
    return visiveis;
  }, [visiveis, fMapeado, projetosMapeadosIds]);

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

  const processoNomeById = useMemo(() => new Map(processos.map(p => [p.id, p.name])), [processos]);

  const detalheProcessos = detalhe ? processosPorProjeto.get(detalhe.id) || [] : [];
  const detalheBacklog = useMemo(() => {
    if (!detalhe) return [] as Melhoria[];
    const processIds = new Set((processosPorProjeto.get(detalhe.id) || []).map(p => p.id));
    return melhorias
      .filter(m => {
        if ((m.improvement_status || 'Não iniciado') !== 'Backlog') return false;
        if ((m as MelhoriaComProjeto).project_id === detalhe.id) return true;
        return processoIdsDaMelhoria(m).some(pid => processIds.has(pid));
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
        <div className="cadastro-toolbar">
          <label className="cadastro-busca" data-tour="page-search">
            <Search size={15} strokeWidth={2.2} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, cluster ou status..."
              aria-label="Buscar"
            />
            {busca && (
              <button type="button" className="cadastro-busca-limpar" onClick={() => setBusca('')} aria-label="Limpar busca" title="Limpar busca">
                <X size={14} />
              </button>
            )}
          </label>
          <div className="cadastro-tags" data-tour="projetos-tags">
            <button
              type="button"
              className={`cadastro-tag${fMapeado === 'todos' ? ' ativa' : ''}`}
              aria-pressed={fMapeado === 'todos'}
              onClick={() => setFMapeado('todos')}
              title="Mostrar todos os projetos"
            >
              <strong>{visiveis.length}</strong> {visiveis.length === 1 ? 'projeto' : 'projetos'}
            </button>
            <button
              type="button"
              className={`cadastro-tag cadastro-tag-ok${fMapeado === 'mapeados' ? ' ativa' : ''}`}
              aria-pressed={fMapeado === 'mapeados'}
              onClick={() => setFMapeado(m => (m === 'mapeados' ? 'todos' : 'mapeados'))}
              title="Filtrar só os projetos com processos mapeados"
            >
              <strong>{nMapeados}</strong> {nMapeados === 1 ? 'mapeado' : 'mapeados'}
            </button>
            <button
              type="button"
              className={`cadastro-tag cadastro-tag-warn${fMapeado === 'faltam' ? ' ativa' : ''}`}
              aria-pressed={fMapeado === 'faltam'}
              onClick={() => setFMapeado(m => (m === 'faltam' ? 'todos' : 'faltam'))}
              title="Filtrar só os projetos que faltam mapear"
            >
              <strong>{nFaltam}</strong> {nFaltam === 1 ? 'falta' : 'faltam'}
            </button>
          </div>
        </div>
      )}
      <CadastroLista
        vazio={noEscopo.length === 0}
        semResultadoBusca={listaExibida.length === 0}
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
            titulo={
              busca.trim()
                ? `Nenhum projeto para "${busca.trim()}"`
                : fMapeado === 'mapeados'
                  ? 'Nenhum projeto mapeado neste escopo'
                  : fMapeado === 'faltam'
                    ? 'Tudo mapeado neste escopo 🎉'
                    : 'Nenhum projeto neste escopo'
            }
            ctaLabel="Limpar filtros"
            onCta={() => { setBusca(''); setFMapeado('todos'); }}
          />
        }
      >
        {listaExibida.map((p) => (
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
        tobeEtapasPorProcesso={tobeEtapasPorProcesso}
        backlog={detalheBacklog}
        processoNomeById={processoNomeById}
        gargalos={gargalos}
        responsaveis={responsaveis}
        documentos={documentos}
        sistemas={sistemas}
        melhorias={melhorias}
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
