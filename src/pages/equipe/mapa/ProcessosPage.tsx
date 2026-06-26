// Processos/Etapas — tela principal do MAPA (padrão "Cadastro Puro").
// Foco puro em cadastro: busca + lista enxuta + form unificado. Clicar numa
// linha vai DIRETO para o mapeamento de sub-etapas (/processos/:id/mapear).
// O ROI/análise vive no Dashboard ROI e na própria página de mapeamento.

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronDown, Eye, Search, SearchX, Workflow, X } from 'lucide-react';
import Select from '@/components/equipe/mapa/Select';
import { IconTooltip } from '@/components/equipe/mapa/Tooltip';
import CadastroPageShell from '@/components/equipe/mapa/cadastro/CadastroPageShell';
import CadastroLista from '@/components/equipe/mapa/cadastro/CadastroLista';
import EmptyStateCadastro from '@/components/equipe/mapa/cadastro/EmptyStateCadastro';
import ConfirmDeleteModal from '@/components/equipe/mapa/cadastro/ConfirmDeleteModal';
import ProcessoItem from '@/components/equipe/mapa/cadastro/ProcessoItem';
import ProcessoReorderGroup from '@/components/equipe/mapa/cadastro/ProcessoReorderGroup';
import ProcessoFormModal from '@/components/equipe/mapa/cadastro/ProcessoFormModal';
import ProjetoDetalheModal from '@/components/equipe/mapa/cadastro/ProjetoDetalheModal';
import ProjetoFormModal from '@/components/equipe/mapa/cadastro/ProjetoFormModal';
import MelhoriaFormModal from '@/components/equipe/mapa/cadastro/MelhoriaFormModal';
import { canon } from '@/utils/cascataEngine';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { normalizarComplexidade } from '@/components/equipe/mapa/cadastros/processoOpcoes';
import type { Etapa, Melhoria, Processo, Projeto } from '@/types';
import {
  useEtapasLista, useMelhoriasLista, useProjetosLista,
  useDocumentosLista, useSistemasLista, useResponsaveisLista, useGargalosLista,
} from '@/hooks/useDominioListas';
import { useProcessos, useDeleteProcesso, useReorderProcessos } from '@/hooks/useProcessos';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';
import { processoIdsDaMelhoria } from '@/utils/gargaloMelhorias';

function getProjectCode(projectName?: string): string | null {
  const match = projectName?.trim().match(/^(P\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

export default function ProcessosPage() {
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useProcessos();
  const deleteProcesso = useDeleteProcesso();
  const reorderProcessos = useReorderProcessos();
  const { data: projetos = [] } = useProjetosLista();
  const { cluster: fCluster } = useClusterGlobal();

  // Dados de apoio (etapas enriquecidas + backlog do detalhe do projeto).
  const { data: rawEtapas = [] } = useEtapasLista();
  const { data: documentos = [] } = useDocumentosLista();
  const { data: sistemas = [] } = useSistemasLista();
  const { data: responsaveis = [] } = useResponsaveisLista();
  const { data: melhorias = [] } = useMelhoriasLista();
  const { data: gargalos = [] } = useGargalosLista();

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
  // Sub-etapas (process_stages) por etapa (process_id) — usado no detalhe do projeto.
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
  const processoNomeById = useMemo(() => new Map(items.map(p => [p.id, p.name])), [items]);

  const [busca, setBusca] = useState('');
  const [fProjeto, setFProjeto] = useState('');
  const [fMapeado, setFMapeado] = useState<'todos' | 'mapeados' | 'faltam'>('todos');
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Processo | null>(null);
  const [confirmDel, setConfirmDel] = useState<Processo | null>(null);
  // Detalhe do projeto (rótulo "processo") aberto pelo card de agrupamento.
  const [projetoDetalhe, setProjetoDetalhe] = useState<Projeto | null>(null);
  // Grupos (processos) expandidos. Vazio = todos recolhidos por padrão, para
  // não despejar todas as etapas de uma vez.
  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(new Set());
  const toggleGrupo = (pid: string) => setGruposAbertos(prev => {
    const next = new Set(prev);
    if (next.has(pid)) next.delete(pid); else next.add(pid);
    return next;
  });

  // Edição cruzada disparada pelo detalhe do projeto (projeto e melhorias).
  const [projEmEdicao, setProjEmEdicao] = useState<Projeto | null>(null);
  const [melEmEdicao, setMelEmEdicao] = useState<Melhoria | null>(null);

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

  // Escopo após cluster + projeto + busca (base das contagens das tags).
  const baseVisiveis = useMemo(() => {
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

  const total = baseVisiveis.length;
  const nMapeados = useMemo(
    () => baseVisiveis.filter(p => processosComEtapas.has(p.id)).length,
    [baseVisiveis, processosComEtapas],
  );
  const nFaltam = total - nMapeados;

  // Lista exibida = base + filtro dinâmico das tags (todos/mapeados/faltam).
  const visiveis = useMemo(() => {
    if (fMapeado === 'mapeados') return baseVisiveis.filter(p => processosComEtapas.has(p.id));
    if (fMapeado === 'faltam') return baseVisiveis.filter(p => !processosComEtapas.has(p.id));
    return baseVisiveis;
  }, [baseVisiveis, fMapeado, processosComEtapas]);

  // Opções do filtro de projeto — só projetos com processos no escopo do cluster.
  const projetoOpcoes = useMemo(() => {
    const ids = [...new Set(noEscopo.map(p => p.project_id).filter((x): x is string => Boolean(x)))];
    const opts = ids
      .map(id => ({ value: id, label: projetoNomePorId.get(id) || id }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: '', label: 'Todos os projetos' }, ...opts];
  }, [noEscopo, projetoNomePorId]);

  const abrirCriar = () => { setEmEdicao(null); setFormAberto(true); };
  const abrirEditar = (p: Processo) => { setEmEdicao(p); setFormAberto(true); };

  const metaDe = (p: Processo): string | undefined => {
    const proj = p.project_id ? projetoNomePorId.get(p.project_id) : undefined;
    const vol = p.volume_executions != null ? `${p.volume_executions} exec./ano` : undefined;
    return [proj, vol].filter(Boolean).join(' · ') || undefined;
  };

  const mapearUrl = (p: Processo) => `/equipe/digital/mapa/processos/${encodeURIComponent(p.id)}/mapear`;

  // Detalhe do projeto (processo): suas etapas (process) + backlog de melhorias.
  const detalheProjProcessos = useMemo(
    () => (projetoDetalhe
      ? items.filter(p => p.project_id === projetoDetalhe.id)
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.name.localeCompare(b.name))
      : []),
    [projetoDetalhe, items],
  );
  const detalheProjBacklog = useMemo(() => {
    if (!projetoDetalhe) return [] as Melhoria[];
    const pids = new Set(items.filter(p => p.project_id === projetoDetalhe.id).map(p => p.id));
    return melhorias
      .filter(m => {
        if ((m.improvement_status || 'Não iniciado') !== 'Backlog') return false;
        if ((m as Melhoria & { project_id?: string | null }).project_id === projetoDetalhe.id) return true;
        return processoIdsDaMelhoria(m).some(pid => pids.has(pid));
      })
      .sort((a, b) => a.improvement_description.localeCompare(b.improvement_description));
  }, [projetoDetalhe, items, melhorias, gargalos]);

  // Clicar na linha vai direto para o mapeamento de sub-etapas.
  // `codigo` opcional: o grupo arrastável injeta o código recomputado ao vivo
  // pela posição local; fora dele, cai no codigoDe (ordem global persistida).
  const renderItem = (p: Processo, codigo?: string) => (
    <ProcessoItem
      key={p.id}
      codigo={codigo ?? codigoDe(p)}
      nome={p.name}
      meta={metaDe(p)}
      badge={normalizarComplexidade(p.complexity_level) || undefined}
      mapearTo={mapearUrl(p)}
      mapeado={processosComEtapas.has(p.id)}
      onOpen={() => navigate(mapearUrl(p))}
      onEdit={() => abrirEditar(p)}
      onDelete={() => setConfirmDel(p)}
    />
  );

  const persistOrdem = (ordered: { id: string; order_index: number }[]) => {
    reorderProcessos.mutate(ordered);
  };

  // Cabeçalho recolhível de um grupo (projeto). Extraído para reuso entre os
  // ramos com/sem arraste do renderLista.
  const renderGrupoHeader = (pid: string, proj: Projeto | undefined, nome: string, totalGrupo: number, aberto: boolean): ReactNode => (
    <div
      key={`grp-${pid}`}
      className="cadastro-grupo-titulo"
      style={{ background: 'var(--accent-50)', borderLeft: '3px solid var(--accent-color)', borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}
    >
      <button
        type="button"
        onClick={() => toggleGrupo(pid)}
        aria-expanded={aberto}
        title={aberto ? 'Recolher processos' : 'Expandir processos'}
        style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left' }}
      >
        <ChevronDown
          size={16}
          style={{ flexShrink: 0, transition: 'transform .15s ease', transform: aberto ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          aria-hidden="true"
        />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</span>
        <span className="cadastro-grupo-count">{totalGrupo}</span>
      </button>
      {proj && (
        <IconTooltip label={`Ver projeto "${nome}"`} side="left">
          <button
            type="button"
            className="processo-mapear"
            style={{ cursor: 'pointer', flexShrink: 0 }}
            onClick={(e) => { e.stopPropagation(); setProjetoDetalhe(proj); }}
            aria-label={`Ver detalhes do projeto ${nome}`}
            title={`Ver detalhes do projeto ${nome}`}
          >
            <Eye size={15} strokeWidth={2.2} />
            <span>Ver projeto</span>
          </button>
        </IconTooltip>
      )}
    </div>
  );

  // Lista: agrupada por processo (recolhível) quando "Todos os processos";
  // plana quando filtrada por um processo. Busca/filtro ativos forçam a
  // expansão para os resultados aparecerem.
  //
  // Arraste para reordenar SÓ quando a lista exibida == grupo completo: com
  // busca ou filtro de status ativos vê-se um subconjunto, e renumerar isso
  // embaralharia os ocultos. Nesses casos cai no render plano (não arrastável).
  const renderLista = (): ReactNode => {
    const reordenavel = busca.trim() === '' && fMapeado === 'todos';

    if (fProjeto) {
      if (!reordenavel) return visiveis.map(p => renderItem(p));
      const proj = projetos.find(x => x.id === fProjeto);
      return (
        <ProcessoReorderGroup
          processos={visiveis}
          codePrefix={getProjectCode(proj?.name)}
          onPersist={persistOrdem}
          renderItem={renderItem}
        />
      );
    }

    const forcarAberto = busca.trim() !== '' || fMapeado !== 'todos';
    const out: ReactNode[] = [];
    let i = 0;
    while (i < visiveis.length) {
      const pid = visiveis[i].project_id || '__sem__';
      const grupo: Processo[] = [];
      while (i < visiveis.length && (visiveis[i].project_id || '__sem__') === pid) {
        grupo.push(visiveis[i]);
        i++;
      }
      const proj = pid !== '__sem__' ? projetos.find(x => x.id === pid) : undefined;
      const nome = proj?.name || (pid !== '__sem__' ? projetoNomePorId.get(pid) || pid : 'Sem processo');
      const aberto = forcarAberto || gruposAbertos.has(pid);
      out.push(renderGrupoHeader(pid, proj, nome, grupo.length, aberto));
      if (!aberto) continue;
      if (reordenavel) {
        out.push(
          <ProcessoReorderGroup
            key={`grp-items-${pid}`}
            processos={grupo}
            codePrefix={getProjectCode(proj?.name)}
            onPersist={persistOrdem}
            renderItem={renderItem}
          />,
        );
      } else {
        grupo.forEach(p => out.push(renderItem(p)));
      }
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
          <label className="cadastro-busca" data-tour="page-search">
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
          <div className="cadastro-toolbar-projeto" data-tour="processos-filtro-projeto">
            <Select value={fProjeto} onChange={setFProjeto} options={projetoOpcoes} compact ariaLabel="Agrupar / filtrar por projeto" />
          </div>
          <div className="cadastro-tags" data-tour="processos-tags">
            <button
              type="button"
              className={`cadastro-tag${fMapeado === 'todos' ? ' ativa' : ''}`}
              aria-pressed={fMapeado === 'todos'}
              onClick={() => setFMapeado('todos')}
              title="Mostrar todos os processos"
            >
              <strong>{total}</strong> {total === 1 ? 'processo' : 'processos'}
            </button>
            <button
              type="button"
              className={`cadastro-tag cadastro-tag-ok${fMapeado === 'mapeados' ? ' ativa' : ''}`}
              aria-pressed={fMapeado === 'mapeados'}
              onClick={() => setFMapeado(m => (m === 'mapeados' ? 'todos' : 'mapeados'))}
              title="Filtrar só os processos mapeados"
            >
              <strong>{nMapeados}</strong> {nMapeados === 1 ? 'mapeado' : 'mapeados'}
            </button>
            <button
              type="button"
              className={`cadastro-tag cadastro-tag-warn${fMapeado === 'faltam' ? ' ativa' : ''}`}
              aria-pressed={fMapeado === 'faltam'}
              onClick={() => setFMapeado(m => (m === 'faltam' ? 'todos' : 'faltam'))}
              title="Filtrar só os que faltam mapear"
            >
              <strong>{nFaltam}</strong> {nFaltam === 1 ? 'falta' : 'faltam'}
            </button>
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
            titulo={
              busca.trim()
                ? `Nenhum processo para "${busca.trim()}"`
                : fMapeado === 'mapeados'
                  ? 'Nenhum processo mapeado neste escopo'
                  : fMapeado === 'faltam'
                    ? 'Tudo mapeado neste escopo 🎉'
                    : 'Nenhum processo neste projeto'
            }
            ctaLabel="Limpar filtros"
            onCta={() => { setBusca(''); setFProjeto(''); setFMapeado('todos'); }}
          />
        }
      >
        {renderLista()}
      </CadastroLista>

      {/* Detalhe do projeto — aberto pelo botão "Ver projeto" do card de grupo */}
      <ProjetoDetalheModal
        aberto={!!projetoDetalhe}
        projeto={projetoDetalhe}
        processos={detalheProjProcessos}
        etapasPorProcesso={etapasPorProcesso}
        backlog={detalheProjBacklog}
        processoNomeById={processoNomeById}
        gargalos={gargalos}
        responsaveis={responsaveis}
        onClose={() => setProjetoDetalhe(null)}
        onEditar={() => { const pj = projetoDetalhe; setProjetoDetalhe(null); if (pj) setProjEmEdicao(pj); }}
      />

      {/* Modais de edição cruzada disparados pelo detalhe do projeto */}
      <ProjetoFormModal aberto={!!projEmEdicao} projeto={projEmEdicao} onClose={() => setProjEmEdicao(null)} />
      <MelhoriaFormModal aberto={!!melEmEdicao} melhoria={melEmEdicao} onClose={() => setMelEmEdicao(null)} />

      <ProcessoFormModal
        aberto={formAberto}
        processo={emEdicao}
        codigo={emEdicao ? codigoDe(emEdicao) : undefined}
        onClose={() => setFormAberto(false)}
      />

      <ConfirmDeleteModal
        aberto={!!confirmDel}
        nomeItem={confirmDel?.name ?? ''}
        substantivo="etapa"
        aviso="Todas as sub-etapas e mapeamentos (Como Era e Como Ficou) desta etapa serão removidos."
        onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          if (!confirmDel) return;
          await deleteProcesso.mutateAsync({ id: confirmDel.id, old: confirmDel });
          toast.success('Etapa excluída');
        }}
      />
    </CadastroPageShell>
  );
}
