// Sistemas — página de cadastro (padrão "Cadastro Puro").
// Só cadastro: busca + lista enxuta + form modal + confirmação de exclusão.
// Sem KPIs/relatórios — custo e rateio vivem no form; análise no Dashboard ROI.
// O escopo por cluster (quais sistemas aparecem) é preservado do fluxo legado:
// sistemas usados em etapas de processos do cluster, ou com rateio para ele.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { Cloud, MonitorCog, SearchX, Server } from 'lucide-react';
import CadastroPageShell from '@/components/equipe/mapa/cadastro/CadastroPageShell';
import CadastroToolbar from '@/components/equipe/mapa/cadastro/CadastroToolbar';
import CadastroLista from '@/components/equipe/mapa/cadastro/CadastroLista';
import CadastroItem from '@/components/equipe/mapa/cadastro/CadastroItem';
import EmptyStateCadastro from '@/components/equipe/mapa/cadastro/EmptyStateCadastro';
import ConfirmDeleteModal from '@/components/equipe/mapa/cadastro/ConfirmDeleteModal';
import SistemaFormModal from '@/components/equipe/mapa/cadastro/SistemaFormModal';
import { canon } from '@/utils/cascataEngine';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { useFocusParam } from '@/utils/useFocusParam';
import type { Sistema } from '@/types';
import { useEtapasLista, useDocumentosLista, useProcessosLista, useProjetosLista } from '@/hooks/useDominioListas';
import { useSistemas, useDeleteSistema } from '@/hooks/useSistemas';
import { useClusters } from '@/hooks/useClusters';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';

const ORIGEM_ICONE: Record<string, ReactNode> = {
  Interno: <Server size={20} strokeWidth={2} />,
  Externo: <Cloud size={20} strokeWidth={2} />,
};

// Rateio do sistema no cluster — entradas antigas guardam o nome do cluster,
// as novas o id; o match aceita os dois.
const rateioNoCluster = (s: Sistema, fCluster: string, clusterNome: string) =>
  (s.clustersRateio || []).find(c => c.cluster === clusterNome || c.cluster === fCluster);

export default function SistemasPage() {
  const { data: items = [], isLoading } = useSistemas();
  const deleteSistema = useDeleteSistema();
  const { data: clustersList = [] } = useClusters();
  const { cluster: fCluster } = useClusterGlobal();

  const [busca, setBusca] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Sistema | null>(null);
  const [confirmDel, setConfirmDel] = useState<Sistema | null>(null);

  // --- Escopo por cluster (preservado do fluxo legado) ---
  const { data: rawEtapas = [] } = useEtapasLista();
  const { data: docs = [] } = useDocumentosLista();
  const { data: processos = [] } = useProcessosLista();
  const { data: projetos = [] } = useProjetosLista();
  const etapas = useMemo(() => enrichEtapas(rawEtapas, docs, items, []), [rawEtapas, docs, items]);
  const clusterIdPorProjeto = useMemo(
    () => new Map(projetos.map(p => [p.id, p.cluster_id || ''])),
    [projetos],
  );
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
  const nomesSistemasDoEscopo = useMemo(() => {
    if (!fCluster) return null;
    const nomes = new Set<string>();
    for (const etapa of etapasDoEscopo) {
      for (const nome of etapa.sistemas || []) nomes.add(nome);
      for (const nome of etapa.ficou?.sistemas || []) nomes.add(nome);
    }
    return nomes;
  }, [fCluster, etapasDoEscopo]);
  const clusterSelecionado = useMemo(
    () => clustersList.find(c => c.id === fCluster),
    [clustersList, fCluster],
  );

  const noEscopo = useMemo(() => items.filter(s =>
    !fCluster || nomesSistemasDoEscopo?.has(s.nome) ||
    (!!clusterSelecionado && !!rateioNoCluster(s, fCluster, clusterSelecionado.nome))
  ), [items, fCluster, nomesSistemasDoEscopo, clusterSelecionado]);

  const visiveis = useMemo(() => {
    const q = canon(busca.trim());
    if (!q) return noEscopo;
    return noEscopo.filter(s =>
      canon(s.nome).includes(q) || canon(s.descricao || '').includes(q) || canon(s.origem || '').includes(q)
    );
  }, [noEscopo, busca]);

  const abrirCriar = () => { setEmEdicao(null); setFormAberto(true); };
  const abrirEditar = (s: Sistema) => { setEmEdicao(s); setFormAberto(true); };

  const focusId = useFocusParam();
  const focusConsumido = useRef(false);
  useEffect(() => {
    if (focusConsumido.current || isLoading || !focusId) return;
    const s = items.find(x => x.id === focusId);
    if (s) { focusConsumido.current = true; setEmEdicao(s); setFormAberto(true); }
  }, [isLoading, focusId, items]);

  return (
    <CadastroPageShell
      eyebrow="Mapa · Digital"
      titulo="Sistemas"
      subtitulo="Cadastre os sistemas e ferramentas que sustentam o seu trabalho."
      ctaLabel="Adicionar Sistema"
      onCta={abrirCriar}
      carregando={isLoading}
    >
      {noEscopo.length > 0 && (
        <CadastroToolbar
          busca={busca}
          onBusca={setBusca}
          total={noEscopo.length}
          visiveis={visiveis.length}
          substantivo={['sistema', 'sistemas']}
          placeholder="Buscar por nome, descrição ou origem..."
        />
      )}
      <CadastroLista
        vazio={noEscopo.length === 0}
        semResultadoBusca={visiveis.length === 0}
        emptyState={
          <EmptyStateCadastro
            icone={<MonitorCog size={32} strokeWidth={1.8} />}
            titulo="Nenhum sistema cadastrado"
            texto="Sistemas são as ferramentas que apoiam seus processos. Cadastre o primeiro para mapear custos e vínculos."
            ctaLabel="Cadastrar primeiro sistema"
            onCta={abrirCriar}
          />
        }
        semResultados={
          <EmptyStateCadastro
            compacto
            icone={<SearchX size={20} />}
            titulo={`Nenhum sistema para "${busca.trim()}"`}
            ctaLabel="Limpar busca"
            onCta={() => setBusca('')}
          />
        }
      >
        {visiveis.map((s) => (
          <CadastroItem
            key={s.id}
            titulo={s.nome}
            descricao={s.descricao || undefined}
            leading={ORIGEM_ICONE[s.origem || ''] ?? <Server size={20} strokeWidth={2} />}
            badge={s.origem ? { label: s.origem } : undefined}
            onOpen={() => abrirEditar(s)}
            onEdit={() => abrirEditar(s)}
            onDelete={() => setConfirmDel(s)}
          />
        ))}
      </CadastroLista>

      <SistemaFormModal
        aberto={formAberto}
        sistema={emEdicao}
        onClose={() => setFormAberto(false)}
      />

      <ConfirmDeleteModal
        aberto={!!confirmDel}
        nomeItem={confirmDel?.nome ?? ''}
        substantivo="sistema"
        aviso="Ele será removido das etapas e melhorias que o utilizam."
        onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          if (!confirmDel) return;
          await deleteSistema.mutateAsync({ id: confirmDel.id, old: confirmDel });
          toast.success('Sistema excluído');
        }}
      />
    </CadastroPageShell>
  );
}
