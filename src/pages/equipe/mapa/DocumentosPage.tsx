// Documentos — página de cadastro (padrão "Cadastro Puro").
// Cadastro: busca + lista enxuta + form modal + confirmação de exclusão.
// Sem KPIs/tempo/relatórios — a análise vive no Dashboard ROI. O escopo por
// cluster (quais documentos aparecem) é preservado do fluxo legado: documentos
// usados como entrada/saída em etapas de processos do cluster.
//
// A lista é AGRUPADA POR PROJETO (mesmo layout/design dos Processos). Documento
// não tem FK direta para projeto/processo: o vínculo vem da junção
// `etapa_documentos` → etapa → `process_id` → `processes.project_id`. Como é
// N:N, um documento pode aparecer em mais de um projeto (e em vários processos).
// Documentos sem vínculo caem no grupo "Sem projeto". Filtros de Processo e
// Origem refinam a lista, além da busca textual já existente.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { ChevronDown, FileStack, FileText, Search, SearchX, X } from 'lucide-react';
import Select from '@/components/equipe/mapa/Select';
import CadastroPageShell from '@/components/equipe/mapa/cadastro/CadastroPageShell';
import CadastroLista from '@/components/equipe/mapa/cadastro/CadastroLista';
import CadastroItem from '@/components/equipe/mapa/cadastro/CadastroItem';
import EmptyStateCadastro from '@/components/equipe/mapa/cadastro/EmptyStateCadastro';
import ConfirmDeleteModal from '@/components/equipe/mapa/cadastro/ConfirmDeleteModal';
import DocumentoFormModal from '@/components/equipe/mapa/cadastro/DocumentoFormModal';
import { canon } from '@/utils/cascataEngine';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { useFocusParam } from '@/utils/useFocusParam';
import type { Documento, DocRef } from '@/types';
import { useEtapasLista, useSistemasLista, useResponsaveisLista, useProcessosLista, useProjetosLista } from '@/hooks/useDominioListas';
import { useDocumentos, useDeleteDocumento } from '@/hooks/useDocumentos';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';

const SEM_PROJETO = '__sem__';

export default function DocumentosPage() {
  const { data: items = [], isLoading } = useDocumentos();
  const deleteDoc = useDeleteDocumento();
  const { cluster: fCluster } = useClusterGlobal();

  const [busca, setBusca] = useState('');
  const [fProcesso, setFProcesso] = useState('');
  const [fOrigem, setFOrigem] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Documento | null>(null);
  const [confirmDel, setConfirmDel] = useState<Documento | null>(null);
  // Grupos (projetos) expandidos. Vazio = todos recolhidos por padrão.
  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(new Set());
  const toggleGrupo = (pid: string) => setGruposAbertos(prev => {
    const next = new Set(prev);
    if (next.has(pid)) next.delete(pid); else next.add(pid);
    return next;
  });

  // --- Dados de apoio (vínculos doc↔processo↔projeto via etapas) ---
  const { data: rawEtapas = [] } = useEtapasLista();
  const { data: sis = [] } = useSistemasLista();
  const { data: resps = [] } = useResponsaveisLista();
  const { data: processos = [] } = useProcessosLista();
  const { data: projetos = [] } = useProjetosLista();
  const etapas = useMemo(() => enrichEtapas(rawEtapas, items, sis, resps), [rawEtapas, items, sis, resps]);

  const projetoNomePorId = useMemo(() => new Map(projetos.map(p => [p.id, p.name])), [projetos]);
  const processoById = useMemo(() => new Map(processos.map(p => [p.id, p])), [processos]);
  const processoNomePorId = useMemo(() => new Map(processos.map(p => [p.id, p.name])), [processos]);
  const clusterIdPorProjeto = useMemo(
    () => new Map(projetos.map(p => [p.id, p.cluster_id || ''])),
    [projetos],
  );
  // Nome canônico → id (resolve refs legadas que só guardam o nome do documento).
  const docIdPorNome = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of items) m.set(canon(d.nome), d.id);
    return m;
  }, [items]);

  // Vínculos derivados da junção `etapa_documentos`: para cada documento, o
  // conjunto de processos e de projetos onde ele entra ou sai. Cobre AS-IS e
  // o cenário "Como Ficou". Resolve o documento por id (quando hidratado) ou,
  // como fallback, pelo nome.
  const { processosPorDoc, projetosPorDoc } = useMemo(() => {
    const porProcesso = new Map<string, Set<string>>();
    const porProjeto = new Map<string, Set<string>>();
    const add = (map: Map<string, Set<string>>, key: string, val: string) => {
      const set = map.get(key) ?? new Set<string>();
      set.add(val);
      map.set(key, set);
    };
    const registrar = (refs: DocRef[] | undefined, processId: string, projectId: string | null) => {
      for (const ref of refs || []) {
        const docId = ref.documentoId || (ref.nome ? docIdPorNome.get(canon(ref.nome)) : undefined);
        if (!docId) continue;
        add(porProcesso, docId, processId);
        if (projectId) add(porProjeto, docId, projectId);
      }
    };
    for (const e of etapas) {
      const proc = processoById.get(e.process_id);
      const projectId = proc?.project_id || null;
      registrar(e.docsEntrada, e.process_id, projectId);
      registrar(e.docsSaida, e.process_id, projectId);
      registrar(e.ficou?.docsEntrada, e.process_id, projectId);
      registrar(e.ficou?.docsSaida, e.process_id, projectId);
    }
    return { processosPorDoc: porProcesso, projetosPorDoc: porProjeto };
  }, [etapas, processoById, docIdPorNome]);

  // Projetos de um documento como array, com sentinela "Sem projeto" quando
  // o documento não está vinculado a nenhum projeto.
  const projetosDoDoc = (id: string): string[] => {
    const set = projetosPorDoc.get(id);
    return set && set.size > 0 ? [...set] : [SEM_PROJETO];
  };

  // --- Escopo por cluster (preservado do fluxo legado) ---
  const processoIdsDoEscopo = useMemo(
    () => new Set(
      processos
        .filter(p => !fCluster || (p.project_id ? clusterIdPorProjeto.get(p.project_id) || '' : '') === fCluster)
        .map(p => p.id),
    ),
    [processos, fCluster, clusterIdPorProjeto],
  );
  const etapasDoEscopo = useMemo(
    () => etapas.filter(e => !fCluster || processoIdsDoEscopo.has(e.process_id)),
    [etapas, fCluster, processoIdsDoEscopo],
  );
  const nomesDocumentosDoEscopo = useMemo(() => {
    if (!fCluster) return null;
    const nomes = new Set<string>();
    const addRefs = (refs?: ({ nome?: string } | string)[]) => {
      for (const ref of refs || []) {
        if (typeof ref === 'string') nomes.add(ref);
        else if (ref?.nome) nomes.add(ref.nome);
      }
    };
    for (const etapa of etapasDoEscopo) {
      addRefs(etapa.docsEntrada);
      addRefs(etapa.docsSaida);
      addRefs(etapa.ficou?.docsEntrada);
      addRefs(etapa.ficou?.docsSaida);
    }
    return nomes;
  }, [fCluster, etapasDoEscopo]);

  const noEscopo = useMemo(
    // uso-por-nome só puxa documento SEM cluster próprio (global) — senão um doc de
    // OUTRO cluster com nome igual vazaria pra este filtro.
    () => items.filter(d => !fCluster || d.cluster_id === fCluster || (!d.cluster_id && nomesDocumentosDoEscopo?.has(d.nome))),
    [items, fCluster, nomesDocumentosDoEscopo],
  );

  // Documentos após busca + filtros de processo/origem (distintos).
  const filtrados = useMemo(() => {
    const q = canon(busca.trim());
    return noEscopo.filter(d => {
      if (q && !(
        canon(d.nome).includes(q) || canon(d.tipo || '').includes(q) || canon(d.formato || '').includes(q) ||
        canon(d.origem || '').includes(q) || canon(d.estrutura_entrada || '').includes(q)
      )) return false;
      if (fProcesso && !processosPorDoc.get(d.id)?.has(fProcesso)) return false;
      if (fOrigem && (d.origem || '') !== fOrigem) return false;
      return true;
    });
  }, [noEscopo, busca, fProcesso, fOrigem, processosPorDoc]);

  // Opções do filtro de processo — processos com documentos no escopo.
  const processoOpcoes = useMemo(() => {
    const ids = new Set<string>();
    for (const d of noEscopo) {
      const procs = processosPorDoc.get(d.id);
      if (!procs) continue;
      for (const pid of procs) ids.add(pid);
    }
    const opts = [...ids]
      .map(id => ({ value: id, label: processoNomePorId.get(id) || id }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: '', label: 'Todos os processos' }, ...opts];
  }, [noEscopo, processosPorDoc, processoNomePorId]);

  // Opções do filtro de origem — valores distintos entre os documentos no escopo.
  const origemOpcoes = useMemo(() => {
    const vals = [...new Set(noEscopo.map(d => d.origem).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return [{ value: '', label: 'Todas as origens' }, ...vals.map(v => ({ value: v, label: v }))];
  }, [noEscopo]);

  // Limpa o filtro de processo se ele deixar de existir nas opções (ex.: troca
  // de projeto que não contém aquele processo).
  useEffect(() => {
    if (fProcesso && !processoOpcoes.some(o => o.value === fProcesso)) setFProcesso('');
  }, [fProcesso, processoOpcoes]);

  // Agrupamento por projeto: um documento aparece em cada projeto a que está
  // vinculado (N:N).
  const grupos = useMemo(() => {
    const porProjeto = new Map<string, Documento[]>();
    for (const d of filtrados) {
      for (const projId of projetosDoDoc(d.id)) {
        const arr = porProjeto.get(projId) ?? [];
        arr.push(d);
        porProjeto.set(projId, arr);
      }
    }
    const lista = [...porProjeto.entries()].map(([projId, docs]) => ({
      projId,
      nome: projId === SEM_PROJETO ? 'Sem projeto' : (projetoNomePorId.get(projId) || projId),
      docs: docs.sort((a, b) => a.nome.localeCompare(b.nome)),
    }));
    // Projetos em ordem alfabética; "Sem projeto" sempre por último.
    lista.sort((a, b) => {
      if (a.projId === SEM_PROJETO) return 1;
      if (b.projId === SEM_PROJETO) return -1;
      return a.nome.localeCompare(b.nome);
    });
    return lista;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrados, projetosPorDoc, projetoNomePorId]);

  const abrirCriar = () => { setEmEdicao(null); setFormAberto(true); };
  const abrirEditar = (d: Documento) => { setEmEdicao(d); setFormAberto(true); };

  const focusId = useFocusParam();
  const focusConsumido = useRef(false);
  useEffect(() => {
    if (focusConsumido.current || isLoading || !focusId) return;
    const d = items.find(x => x.id === focusId);
    if (d) { focusConsumido.current = true; setEmEdicao(d); setFormAberto(true); }
  }, [isLoading, focusId, items]);

  // Selos do documento: formato (ex.: "PDF") e origem (ex.: "Interno"), lado a lado.
  const badgesDe = (d: Documento): { label: string }[] =>
    [d.formato, d.origem].filter(Boolean).map(label => ({ label }));

  const limparFiltros = () => { setBusca(''); setFProcesso(''); setFOrigem(''); };
  const temFiltro = Boolean(busca.trim() || fProcesso || fOrigem);
  const forcarAberto = temFiltro;

  const renderItem = (d: Documento): ReactNode => (
    <CadastroItem
      key={d.id}
      titulo={d.nome}
      descricao={d.estrutura_entrada || undefined}
      leading={<FileText size={20} strokeWidth={2} />}
      badges={badgesDe(d)}
      onOpen={() => abrirEditar(d)}
      onEdit={() => abrirEditar(d)}
      onDelete={() => setConfirmDel(d)}
    />
  );

  const renderGrupoHeader = (projId: string, nome: string, totalGrupo: number, aberto: boolean): ReactNode => (
    <div
      key={`grp-${projId}`}
      className="cadastro-grupo-titulo"
      style={{ background: 'var(--accent-50)', borderLeft: '3px solid var(--accent-color)', borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}
    >
      <button
        type="button"
        onClick={() => toggleGrupo(projId)}
        aria-expanded={aberto}
        title={aberto ? 'Recolher documentos' : 'Expandir documentos'}
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
    </div>
  );

  const renderLista = (): ReactNode => {
    const out: ReactNode[] = [];
    for (const g of grupos) {
      const aberto = forcarAberto || gruposAbertos.has(g.projId);
      out.push(renderGrupoHeader(g.projId, g.nome, g.docs.length, aberto));
      if (aberto) g.docs.forEach(d => out.push(renderItem(d)));
    }
    return out;
  };

  return (
    <CadastroPageShell
      eyebrow="Mapa · Digital"
      titulo="Documentos"
      subtitulo="Cadastre os documentos que entram e saem do seu dia a dia — agrupados por projeto."
      ctaLabel="Adicionar Documento"
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
              placeholder="Buscar por nome, tipo, formato ou origem..."
              aria-label="Buscar"
            />
            {busca && (
              <button type="button" className="cadastro-busca-limpar" onClick={() => setBusca('')} aria-label="Limpar busca" title="Limpar busca">
                <X size={14} />
              </button>
            )}
          </label>
          <div className="cadastro-toolbar-projeto">
            <Select value={fProcesso} onChange={setFProcesso} options={processoOpcoes} compact ariaLabel="Filtrar por processo" />
          </div>
          <div className="cadastro-toolbar-projeto">
            <Select value={fOrigem} onChange={setFOrigem} options={origemOpcoes} compact ariaLabel="Filtrar por origem" />
          </div>
        </div>
      )}
      <CadastroLista
        vazio={noEscopo.length === 0}
        semResultadoBusca={filtrados.length === 0}
        emptyState={
          <EmptyStateCadastro
            icone={<FileStack size={32} strokeWidth={1.8} />}
            titulo="Nenhum documento cadastrado"
            texto="Documentos são as entradas e saídas das suas etapas. Cadastre o primeiro para vinculá-lo aos processos."
            ctaLabel="Cadastrar primeiro documento"
            onCta={abrirCriar}
          />
        }
        semResultados={
          <EmptyStateCadastro
            compacto
            icone={<SearchX size={20} />}
            titulo={
              busca.trim()
                ? `Nenhum documento para "${busca.trim()}"`
                : 'Nenhum documento neste filtro'
            }
            ctaLabel="Limpar filtros"
            onCta={limparFiltros}
          />
        }
      >
        {renderLista()}
      </CadastroLista>

      <DocumentoFormModal
        aberto={formAberto}
        documento={emEdicao}
        onClose={() => setFormAberto(false)}
      />

      <ConfirmDeleteModal
        aberto={!!confirmDel}
        nomeItem={confirmDel?.nome ?? ''}
        substantivo="documento"
        aviso="Ele será removido das etapas que o referenciam."
        onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          if (!confirmDel?.id) return;
          await deleteDoc.mutateAsync({ id: confirmDel.id, old: confirmDel });
          toast.success('Documento excluído');
        }}
      />
    </CadastroPageShell>
  );
}
