// Gargalos — página auxiliar de cadastro (padrão "Cadastro Puro", onda 1).
// Só cadastro: busca + lista compacta + form modal + confirmação de exclusão.
// Análise (horas, processos afetados, cascata) vive no Dashboard ROI e na
// CascataPage; aqui cada linha mostra apenas indicadores discretos de vínculo.

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, GitBranch, SearchX, Sparkles, Zap } from 'lucide-react';
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

const ORIGEM_CORES: Record<string, string> = {
  Processo: '#0d9488',
  Sistema: '#6366f1',
  Pessoas: '#d97706',
  Cliente: '#db2777',
  Externo: '#64748b',
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
      titulo="Gargalos"
      subtitulo="Cadastre os gargalos que afetam seus processos. Eles alimentam a Cascata e o Dashboard ROI."
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
            icone={<AlertTriangle size={26} />}
            titulo="Nenhum gargalo cadastrado"
            texto="Gargalos são pontos de atrito nos seus processos. Cadastre-os para mapear impactos na Cascata e calcular o ROI das melhorias."
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
        {visiveis.map((g) => {
          const nProc = (g.processos || []).length;
          const nEtapas = (g.etapasOrigem || []).length;
          const nMelhorias = (g.melhorias || []).length;
          return (
            <CadastroItem
              key={g.id}
              titulo={g.nome}
              descricao={g.descricao || undefined}
              badge={g.origem ? { label: g.origem, cor: ORIGEM_CORES[g.origem] } : undefined}
              metas={[
                { icone: <GitBranch size={13} />, valor: nProc, hint: `${nProc} ${nProc === 1 ? 'processo afetado' : 'processos afetados'}` },
                { icone: <Zap size={13} />, valor: nEtapas, hint: `${nEtapas} ${nEtapas === 1 ? 'etapa-origem (gera cascata)' : 'etapas-origem (geram cascata)'}` },
                { icone: <Sparkles size={13} />, valor: nMelhorias, hint: `${nMelhorias} ${nMelhorias === 1 ? 'melhoria vinculada' : 'melhorias vinculadas'}` },
              ]}
              onOpen={() => abrirEditar(g)}
              onEdit={() => abrirEditar(g)}
              onDelete={() => setConfirmDel(g)}
            />
          );
        })}
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
