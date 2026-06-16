// Melhorias — página de cadastro (padrão "Cadastro Puro").
// Só cadastro: busca + lista enxuta + form modal + confirmação de exclusão.
// Sem KPIs/relatórios — horas, custos e ações TD vivem no form; análise no
// Dashboard ROI. O orb é colorido pelo status da melhoria.

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Lightbulb, SearchX, Sparkles } from 'lucide-react';
import CadastroPageShell from '@/components/equipe/mapa/cadastro/CadastroPageShell';
import CadastroToolbar from '@/components/equipe/mapa/cadastro/CadastroToolbar';
import CadastroLista from '@/components/equipe/mapa/cadastro/CadastroLista';
import CadastroItem from '@/components/equipe/mapa/cadastro/CadastroItem';
import EmptyStateCadastro from '@/components/equipe/mapa/cadastro/EmptyStateCadastro';
import ConfirmDeleteModal from '@/components/equipe/mapa/cadastro/ConfirmDeleteModal';
import MelhoriaFormModal from '@/components/equipe/mapa/cadastro/MelhoriaFormModal';
import GargaloFormModal from '@/components/equipe/mapa/cadastro/GargaloFormModal';
import { canon } from '@/utils/cascataEngine';
import { useFocusParam } from '@/utils/useFocusParam';
import type { Gargalo, Melhoria, MelhoriaStatus } from '@/types';
import { useMelhorias, useDeleteMelhoria } from '@/hooks/useMelhorias';
import { useGargalosLista } from '@/hooks/useDominioListas';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';

export default function MelhoriasPage() {
  const { data: items = [], isLoading } = useMelhorias();
  const { data: gargalos = [] } = useGargalosLista();
  const deleteMelhoria = useDeleteMelhoria();
  const { cluster: fCluster } = useClusterGlobal();

  const [busca, setBusca] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Melhoria | null>(null);
  const [confirmDel, setConfirmDel] = useState<Melhoria | null>(null);
  // Edição cruzada: gargalos resolvidos (leitura no form) abrem o modal de gargalo.
  const [gargEmEdicao, setGargEmEdicao] = useState<Gargalo | null>(null);

  const statusDe = (m: Melhoria): MelhoriaStatus => (m.improvement_status as MelhoriaStatus) || 'Não iniciado';

  const noEscopo = useMemo(
    () => items.filter(m => !fCluster || m.cluster_id === fCluster),
    [items, fCluster],
  );
  // Busca por melhoria (nome + status) — não por processo.
  const visiveis = useMemo(() => {
    const q = canon(busca.trim());
    if (!q) return noEscopo;
    return noEscopo.filter(m =>
      canon(m.improvement_description).includes(q) || canon(statusDe(m)).includes(q)
    );
  }, [noEscopo, busca]);

  const abrirCriar = () => { setEmEdicao(null); setFormAberto(true); };
  const abrirEditar = (m: Melhoria) => { setEmEdicao(m); setFormAberto(true); };

  const focusId = useFocusParam();
  const focusConsumido = useRef(false);
  useEffect(() => {
    if (focusConsumido.current || isLoading || !focusId) return;
    const m = items.find(x => x.id === focusId);
    if (m) { focusConsumido.current = true; setEmEdicao(m); setFormAberto(true); }
  }, [isLoading, focusId, items]);

  return (
    <CadastroPageShell
      eyebrow="Mapa · Digital"
      titulo="Melhorias"
      subtitulo="Registre e avalie as melhorias do seu mapa."
      ctaLabel="Avaliar Melhorias"
      onCta={abrirCriar}
      carregando={isLoading}
    >
      {noEscopo.length > 0 && (
        <CadastroToolbar
          busca={busca}
          onBusca={setBusca}
          total={noEscopo.length}
          visiveis={visiveis.length}
          substantivo={['melhoria', 'melhorias']}
          placeholder="Buscar por nome ou status..."
        />
      )}
      <CadastroLista
        vazio={noEscopo.length === 0}
        semResultadoBusca={visiveis.length === 0}
        emptyState={
          <EmptyStateCadastro
            icone={<Lightbulb size={32} strokeWidth={1.8} />}
            titulo="Nenhuma melhoria cadastrada"
            texto="Melhorias são as iniciativas que transformam seus processos. Cadastre a primeira para medir o impacto no Dashboard ROI."
            ctaLabel="Avaliar primeira melhoria"
            onCta={abrirCriar}
          />
        }
        semResultados={
          <EmptyStateCadastro
            compacto
            icone={<SearchX size={20} />}
            titulo={`Nenhuma melhoria para "${busca.trim()}"`}
            ctaLabel="Limpar busca"
            onCta={() => setBusca('')}
          />
        }
      >
        {visiveis.map((m) => (
          <CadastroItem
            key={m.id}
            titulo={m.improvement_description}
            leading={<Sparkles size={20} strokeWidth={2} />}
            badge={{ label: statusDe(m) }}
            onOpen={() => abrirEditar(m)}
            onEdit={() => abrirEditar(m)}
            onDelete={() => setConfirmDel(m)}
          />
        ))}
      </CadastroLista>

      <MelhoriaFormModal
        aberto={formAberto}
        melhoria={emEdicao}
        onClose={() => setFormAberto(false)}
        onEditarGargalo={(gid) => { const g = gargalos.find(x => x.id === gid); if (g) setGargEmEdicao(g); }}
      />

      {/* Edição cruzada — gargalo resolvido editado de dentro do form de melhoria */}
      <GargaloFormModal aberto={!!gargEmEdicao} gargalo={gargEmEdicao} onClose={() => setGargEmEdicao(null)} />

      <ConfirmDeleteModal
        aberto={!!confirmDel}
        nomeItem={confirmDel?.improvement_description ?? ''}
        substantivo="melhoria"
        onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          if (!confirmDel) return;
          await deleteMelhoria.mutateAsync({ id: confirmDel.id, old: confirmDel });
          toast.success('Melhoria excluída');
        }}
      />
    </CadastroPageShell>
  );
}
