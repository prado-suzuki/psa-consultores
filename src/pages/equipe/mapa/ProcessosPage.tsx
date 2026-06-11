// Processos — tela principal do MAPA (padrão "Cadastro Puro").
// Foco puro em mapeamento e cadastro: busca + lista enxuta + "Modal da Paz"
// (detalhe com progressive disclosure) + form unificado. Sem KPIs, sem filtros
// de dashboard, sem sopa de botões — a ação primária (Mapear etapas) vive na
// linha e no modal; o ROI/análise vive no Dashboard ROI e em /mapear.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { Search, SearchX, Workflow, X } from 'lucide-react';
import Select from '@/components/equipe/mapa/Select';
import CadastroPageShell from '@/components/equipe/mapa/cadastro/CadastroPageShell';
import CadastroLista from '@/components/equipe/mapa/cadastro/CadastroLista';
import EmptyStateCadastro from '@/components/equipe/mapa/cadastro/EmptyStateCadastro';
import ConfirmDeleteModal from '@/components/equipe/mapa/cadastro/ConfirmDeleteModal';
import ProcessoItem from '@/components/equipe/mapa/cadastro/ProcessoItem';
import ProcessoFormModal from '@/components/equipe/mapa/cadastro/ProcessoFormModal';
import ProcessoDetalheModal from '@/components/equipe/mapa/cadastro/ProcessoDetalheModal';
import { canon } from '@/utils/cascataEngine';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { melhoriaIdsDoGargalo } from '@/utils/gargaloMelhorias';
import { useFocusParam } from '@/utils/useFocusParam';
import { normalizarComplexidade } from '@/components/equipe/mapa/cadastros/processoOpcoes';
import type { Processo } from '@/types';
import {
  useEtapasLista, useGargalosLista, useMelhoriasLista, useProjetosLista,
  useDocumentosLista, useSistemasLista, useResponsaveisLista,
} from '@/hooks/useDominioListas';
import { useProcessos, useDeleteProcesso } from '@/hooks/useProcessos';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';

const STATUS_CORES: Record<string, string> = {
  'Avaliado': '#0d9488',
  'Em avaliação': '#d97706',
  'Não avaliado': '#64748b',
};

function getProjectCode(projectName?: string): string | null {
  const match = projectName?.trim().match(/^(P\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

export default function ProcessosPage() {
  const { data: items = [], isLoading } = useProcessos();
  const deleteProcesso = useDeleteProcesso();
  const { data: projetos = [] } = useProjetosLista();
  const { cluster: fCluster } = useClusterGlobal();

  // Dados de apoio para a "Modal da Paz" (etapas enriquecidas + vínculos).
  const { data: rawEtapas = [] } = useEtapasLista();
  const { data: documentos = [] } = useDocumentosLista();
  const { data: sistemas = [] } = useSistemasLista();
  const { data: responsaveis = [] } = useResponsaveisLista();
  const { data: gargalos = [] } = useGargalosLista();
  const { data: melhorias = [] } = useMelhoriasLista();

  const etapas = useMemo(
    () => enrichEtapas(rawEtapas, documentos, sistemas, responsaveis),
    [rawEtapas, documentos, sistemas, responsaveis],
  );

  const clusterIdPorProjeto = useMemo(
    () => new Map(projetos.map(p => [p.id, p.cluster_id || ''])),
    [projetos],
  );
  const projetoNomePorId = useMemo(
    () => new Map(projetos.map(p => [p.id, p.name])),
    [projetos],
  );

  const [busca, setBusca] = useState('');
  const [fProjeto, setFProjeto] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Processo | null>(null);
  const [detalhe, setDetalhe] = useState<Processo | null>(null);
  const [confirmDel, setConfirmDel] = useState<Processo | null>(null);

  // Escopo por cluster (derivado do projeto do processo).
  const noEscopo = useMemo(() => items.filter(p =>
    !fCluster || (p.project_id ? clusterIdPorProjeto.get(p.project_id) || '' : '') === fCluster
  ), [items, fCluster, clusterIdPorProjeto]);

  // Ordem visual por processo (1-based dentro do projeto) — código tipo P5.01.
  const ordemVisualPorProcesso = useMemo(() => {
    const porProjeto = new Map<string, Processo[]>();
    const semProjeto: Processo[] = [];
    for (const p of noEscopo) {
      if (!p.project_id) { semProjeto.push(p); continue; }
      const lista = porProjeto.get(p.project_id) ?? [];
      lista.push(p);
      porProjeto.set(p.project_id, lista);
    }
    const ordem = new Map<string, number>();
    const ordenarEAtribuir = (lista: Processo[]) => {
      lista
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.name.localeCompare(b.name))
        .forEach((p, i) => ordem.set(p.id, i + 1));
    };
    porProjeto.forEach(ordenarEAtribuir);
    ordenarEAtribuir(semProjeto);
    return ordem;
  }, [noEscopo]);

  const codigoDe = (p: Processo): string => {
    const ordem = ordemVisualPorProcesso.get(p.id) ?? 0;
    const ordemFmt = String(ordem).padStart(2, '0');
    const projCode = getProjectCode(p.project_id ? projetoNomePorId.get(p.project_id) : undefined);
    return projCode ? `${projCode}.${ordemFmt}` : `#${ordemFmt}`;
  };

  // Processos "mapeados" = que já têm ao menos uma etapa.
  const processosComEtapas = useMemo(() => new Set(etapas.map(e => e.process_id)), [etapas]);

  const visiveis = useMemo(() => {
    const q = canon(busca.trim());
    const filtrados = noEscopo.filter(p =>
      (!fProjeto || p.project_id === fProjeto) &&
      (!q ||
        canon(p.name).includes(q) ||
        canon(projetoNomePorId.get(p.project_id || '') || '').includes(q) ||
        canon(p.description || '').includes(q))
    );
    // Mantém processos do mesmo projeto adjacentes e na ordem visual.
    return [...filtrados].sort((a, b) => {
      const pa = projetoNomePorId.get(a.project_id || '') || '~';
      const pb = projetoNomePorId.get(b.project_id || '') || '~';
      return pa.localeCompare(pb)
        || (ordemVisualPorProcesso.get(a.id) ?? 0) - (ordemVisualPorProcesso.get(b.id) ?? 0)
        || a.name.localeCompare(b.name);
    });
  }, [noEscopo, busca, fProjeto, projetoNomePorId, ordemVisualPorProcesso]);

  const nMapeados = useMemo(
    () => visiveis.filter(p => processosComEtapas.has(p.id)).length,
    [visiveis, processosComEtapas],
  );

  // Opções do filtro de projeto — só projetos com processos no escopo do cluster.
  const projetoOpcoes = useMemo(() => {
    const ids = [...new Set(noEscopo.map(p => p.project_id).filter((x): x is string => Boolean(x)))];
    const opts = ids
      .map(id => ({ value: id, label: projetoNomePorId.get(id) || id }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: '', label: 'Todos os projetos' }, ...opts];
  }, [noEscopo, projetoNomePorId]);

  // ── Vínculos por processo (para a Modal da Paz) ──
  const etapasDoProcesso = (pid: string) =>
    etapas.filter(e => e.process_id === pid).sort((a, b) => (a.stage_order ?? 0) - (b.stage_order ?? 0));
  const gargalosDoProcesso = (pid: string) =>
    gargalos.filter(g => (g.processos || []).includes(pid));
  const melhoriasDoProcesso = (pid: string) => {
    const idsViaGargalos = new Set(gargalosDoProcesso(pid).flatMap(g => melhoriaIdsDoGargalo(g)));
    return melhorias.filter(m => (m.processos || []).includes(pid) || idsViaGargalos.has(m.id));
  };

  const abrirCriar = () => { setEmEdicao(null); setFormAberto(true); };
  const abrirEditar = (p: Processo) => { setEmEdicao(p); setFormAberto(true); };

  // ?focus= abre o detalhe do processo (uma vez).
  const focusId = useFocusParam();
  const focusConsumido = useRef(false);
  useEffect(() => {
    if (focusConsumido.current || isLoading || !focusId) return;
    const p = items.find(x => x.id === focusId);
    if (p) { focusConsumido.current = true; setDetalhe(p); }
  }, [isLoading, focusId, items]);

  const metaDe = (p: Processo): string | undefined => {
    const proj = p.project_id ? projetoNomePorId.get(p.project_id) : undefined;
    return [proj, p.frequency].filter(Boolean).join(' · ') || undefined;
  };

  const detalheEtapas = detalhe ? etapasDoProcesso(detalhe.id) : [];
  const detalheGargalos = detalhe ? gargalosDoProcesso(detalhe.id).map(g => ({ id: g.id, nome: g.nome })) : [];
  const detalheMelhorias = detalhe ? melhoriasDoProcesso(detalhe.id).map(m => ({ id: m.id, nome: m.improvement_description })) : [];
  const mapearUrl = (p: Processo) => `/equipe/digital/mapa/processos/${encodeURIComponent(p.id)}/mapear`;

  const renderItem = (p: Processo) => (
    <ProcessoItem
      key={p.id}
      codigo={codigoDe(p)}
      nome={p.name}
      meta={metaDe(p)}
      accent={STATUS_CORES[p.evaluation_status || 'Não avaliado'] ?? '#64748b'}
      badge={normalizarComplexidade(p.complexity_level) || undefined}
      mapearTo={mapearUrl(p)}
      mapeado={processosComEtapas.has(p.id)}
      onOpen={() => setDetalhe(p)}
      onEdit={() => abrirEditar(p)}
      onDelete={() => setConfirmDel(p)}
    />
  );

  // Lista: agrupada por projeto quando "Todos os projetos"; plana quando filtrada.
  const renderLista = (): ReactNode => {
    if (fProjeto) return visiveis.map(renderItem);
    const out: ReactNode[] = [];
    let grupoAtual: string | null = null;
    for (const p of visiveis) {
      const pid = p.project_id || '__sem__';
      if (pid !== grupoAtual) {
        grupoAtual = pid;
        const nome = p.project_id ? (projetoNomePorId.get(p.project_id) || p.project_id) : 'Sem projeto';
        const total = visiveis.filter(x => (x.project_id || '__sem__') === pid).length;
        out.push(
          <div key={`grp-${pid}`} className="cadastro-grupo-titulo">
            {nome}<span className="cadastro-grupo-count">{total}</span>
          </div>,
        );
      }
      out.push(renderItem(p));
    }
    return out;
  };

  return (
    <CadastroPageShell
      eyebrow="Mapa · Digital"
      titulo="Processos"
      subtitulo="Mapeie cada processo: abra para ver a composição ou vá direto mapear as etapas."
      ctaLabel="Adicionar Processo"
      onCta={abrirCriar}
      carregando={isLoading}
    >
      {noEscopo.length > 0 && (
        <div className="cadastro-toolbar">
          <label className="cadastro-busca">
            <Search size={15} strokeWidth={2.2} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, projeto ou descrição..."
              aria-label="Buscar"
            />
            {busca && (
              <button type="button" className="cadastro-busca-limpar" onClick={() => setBusca('')} aria-label="Limpar busca" title="Limpar busca">
                <X size={14} />
              </button>
            )}
          </label>
          <div className="cadastro-toolbar-projeto">
            <Select value={fProjeto} onChange={setFProjeto} options={projetoOpcoes} compact ariaLabel="Agrupar / filtrar por projeto" />
          </div>
          <div className="cadastro-tags">
            <span className="cadastro-tag"><strong>{visiveis.length}</strong> {visiveis.length === 1 ? 'processo' : 'processos'}</span>
            <span className="cadastro-tag cadastro-tag-ok"><strong>{nMapeados}</strong> {nMapeados === 1 ? 'mapeado' : 'mapeados'}</span>
          </div>
        </div>
      )}
      <CadastroLista
        vazio={noEscopo.length === 0}
        semResultadoBusca={visiveis.length === 0}
        emptyState={
          <EmptyStateCadastro
            icone={<Workflow size={32} strokeWidth={1.8} />}
            titulo="Nenhum processo cadastrado"
            texto="Processos são o coração do mapa. Cadastre o primeiro e comece a mapear suas etapas."
            ctaLabel="Cadastrar primeiro processo"
            onCta={abrirCriar}
          />
        }
        semResultados={
          <EmptyStateCadastro
            compacto
            icone={<SearchX size={20} />}
            titulo={busca.trim() ? `Nenhum processo para "${busca.trim()}"` : 'Nenhum processo neste projeto'}
            ctaLabel="Limpar filtros"
            onCta={() => { setBusca(''); setFProjeto(''); }}
          />
        }
      >
        {renderLista()}
      </CadastroLista>

      <ProcessoDetalheModal
        aberto={!!detalhe}
        processo={detalhe}
        codigo={detalhe ? codigoDe(detalhe) : ''}
        projetoNome={detalhe?.project_id ? projetoNomePorId.get(detalhe.project_id) : undefined}
        etapas={detalheEtapas}
        gargalos={detalheGargalos}
        melhorias={detalheMelhorias}
        mapearTo={detalhe ? mapearUrl(detalhe) : '#'}
        onClose={() => setDetalhe(null)}
        onEditar={() => { const p = detalhe; setDetalhe(null); if (p) abrirEditar(p); }}
      />

      <ProcessoFormModal
        aberto={formAberto}
        processo={emEdicao}
        codigo={emEdicao ? codigoDe(emEdicao) : undefined}
        onClose={() => setFormAberto(false)}
      />

      <ConfirmDeleteModal
        aberto={!!confirmDel}
        nomeItem={confirmDel?.name ?? ''}
        substantivo="processo"
        aviso="Todas as etapas e mapeamentos (Como Era e Como Ficou) deste processo serão removidos."
        onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          if (!confirmDel) return;
          await deleteProcesso.mutateAsync({ id: confirmDel.id, old: confirmDel });
          toast.success('Processo excluído');
        }}
      />
    </CadastroPageShell>
  );
}
