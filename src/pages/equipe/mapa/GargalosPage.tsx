// Gargalos — página auxiliar de cadastro (padrão "Cadastro Puro", onda 1).
// Só cadastro: busca + lista enxuta + form modal + confirmação de exclusão.
// Zero números/relatórios — a análise (horas, processos afetados, cascata)
// vive no Dashboard ROI e na CascataPage. Cada linha mostra apenas a
// identidade do gargalo, ancorada por um orb colorido pela origem.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Building2, Cpu, Globe, SearchX, Users, Workflow } from 'lucide-react';
import CadastroPageShell from '@/components/equipe/mapa/cadastro/CadastroPageShell';
import CadastroToolbar from '@/components/equipe/mapa/cadastro/CadastroToolbar';
import CadastroLista from '@/components/equipe/mapa/cadastro/CadastroLista';
import CadastroItem from '@/components/equipe/mapa/cadastro/CadastroItem';
import EmptyStateCadastro from '@/components/equipe/mapa/cadastro/EmptyStateCadastro';
import ConfirmDeleteModal from '@/components/equipe/mapa/cadastro/ConfirmDeleteModal';
import GargaloFormModal from '@/components/equipe/mapa/cadastro/GargaloFormModal';
import { canon } from '@/utils/cascataEngine';
import { useFocusParam } from '@/utils/useFocusParam';
import type { Gargalo } from '@/types';
import { useGargalos, useDeleteGargalo } from '@/hooks/useGargalos';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';

// Ícone do orb por origem — o orb é cinza em repouso e fica verde no hover.
const ORIGEM_ICONE: Record<string, ReactNode> = {
  Processo: <Workflow size={20} strokeWidth={2} />,
  Sistema: <Cpu size={20} strokeWidth={2} />,
  Pessoas: <Users size={20} strokeWidth={2} />,
  Cliente: <Building2 size={20} strokeWidth={2} />,
  Externo: <Globe size={20} strokeWidth={2} />,
};

export default function GargalosPage() {
  const { data: items = [], isLoading } = useGargalos();
  const deleteGargalo = useDeleteGargalo();
  const { cluster: fCluster } = useClusterGlobal();

  const [busca, setBusca] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Gargalo | null>(null);
  const [confirmDel, setConfirmDel] = useState<Gargalo | null>(null);

  const noEscopo = useMemo(
    () => items.filter(g => !fCluster || g.cluster_id === fCluster),
    [items, fCluster]
  );
  const visiveis = useMemo(() => {
    const q = canon(busca.trim());
    if (!q) return noEscopo;
    return noEscopo.filter(g =>
      canon(g.nome).includes(q) || canon(g.descricao).includes(q) || canon(g.origem).includes(q)
    );
  }, [noEscopo, busca]);

  const abrirCriar = () => { setEmEdicao(null); setFormAberto(true); };
  const abrirEditar = (g: Gargalo) => { setEmEdicao(g); setFormAberto(true); };

  // ?focus= (ex.: "ver erro" no diagnóstico ROI) abre a edição do item, uma
  // única vez — o guard evita reabrir o modal a cada refetch da lista.
  const focusId = useFocusParam();
  const focusConsumido = useRef(false);
  useEffect(() => {
    if (focusConsumido.current || isLoading || !focusId) return;
    const g = items.find(x => x.id === focusId);
    if (g) {
      focusConsumido.current = true;
      setEmEdicao(g);
      setFormAberto(true);
    }
  }, [isLoading, focusId, items]);

  return (
    <CadastroPageShell
      eyebrow="Mapa · Digital"
      titulo="Gargalos"
      subtitulo="Dê nome aos pontos de atrito que travam seus processos — um de cada vez, com calma."
      ctaLabel="Novo gargalo"
      onCta={abrirCriar}
      carregando={isLoading}
    >
      {noEscopo.length > 0 && (
        <CadastroToolbar
          busca={busca}
          onBusca={setBusca}
          total={noEscopo.length}
          visiveis={visiveis.length}
          substantivo={['gargalo', 'gargalos']}
          placeholder="Buscar por nome, descrição ou origem..."
        />
      )}
      <CadastroLista
        vazio={noEscopo.length === 0}
        semResultadoBusca={visiveis.length === 0}
        emptyState={
          <EmptyStateCadastro
            icone={<AlertTriangle size={32} strokeWidth={1.8} />}
            titulo="Nenhum gargalo cadastrado"
            texto="Gargalos são os pontos de atrito que travam seus processos. Comece registrando o primeiro — leva só alguns segundos."
            ctaLabel="Cadastrar primeiro gargalo"
            onCta={abrirCriar}
          />
        }
        semResultados={
          <EmptyStateCadastro
            compacto
            icone={<SearchX size={20} />}
            titulo={`Nenhum gargalo para "${busca.trim()}"`}
            ctaLabel="Limpar busca"
            onCta={() => setBusca('')}
          />
        }
      >
        {visiveis.map((g) => (
          <CadastroItem
            key={g.id}
            titulo={g.nome}
            descricao={g.descricao || undefined}
            leading={ORIGEM_ICONE[g.origem] ?? <AlertTriangle size={20} strokeWidth={2} />}
            badge={g.origem ? { label: g.origem } : undefined}
            onOpen={() => abrirEditar(g)}
            onEdit={() => abrirEditar(g)}
            onDelete={() => setConfirmDel(g)}
          />
        ))}
      </CadastroLista>

      <GargaloFormModal
        aberto={formAberto}
        gargalo={emEdicao}
        onClose={() => setFormAberto(false)}
      />

      <ConfirmDeleteModal
        aberto={!!confirmDel}
        nomeItem={confirmDel?.nome ?? ''}
        substantivo="gargalo"
        onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          if (!confirmDel) return;
          await deleteGargalo.mutateAsync({ id: confirmDel.id, old: confirmDel });
          toast.success('Gargalo excluído');
        }}
      />
    </CadastroPageShell>
  );
}
