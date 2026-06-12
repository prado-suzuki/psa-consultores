// Responsáveis — página de cadastro (padrão "Cadastro Puro").
// Só cadastro: busca + lista enxuta + form modal + confirmação de exclusão.
// Sem KPIs/horas/relatórios — a carga e os vínculos vivem no Dashboard ROI.
// job_roles é um catálogo compartilhado: com cluster ativo, mostra os daquele
// cluster + os sem cluster (globais).

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { SearchX, UserCog, UserRound, Users } from 'lucide-react';
import CadastroPageShell from '@/components/equipe/mapa/cadastro/CadastroPageShell';
import CadastroToolbar from '@/components/equipe/mapa/cadastro/CadastroToolbar';
import CadastroLista from '@/components/equipe/mapa/cadastro/CadastroLista';
import CadastroItem from '@/components/equipe/mapa/cadastro/CadastroItem';
import EmptyStateCadastro from '@/components/equipe/mapa/cadastro/EmptyStateCadastro';
import ConfirmDeleteModal from '@/components/equipe/mapa/cadastro/ConfirmDeleteModal';
import ResponsavelFormModal from '@/components/equipe/mapa/cadastro/ResponsavelFormModal';
import { canon } from '@/utils/cascataEngine';
import { useFocusParam } from '@/utils/useFocusParam';
import type { Responsavel } from '@/types';
import { useResponsaveis, useDeleteResponsavel } from '@/hooks/useResponsaveis';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';

const TIPO_ICONE: Record<string, ReactNode> = {
  Interno: <UserRound size={20} strokeWidth={2} />,
  Externo: <UserCog size={20} strokeWidth={2} />,
};
const tipoDe = (r: { type?: string | null }): string => (r.type === 'Externo' ? 'Externo' : 'Interno');

export default function ResponsaveisPage() {
  const { data: items = [], isLoading } = useResponsaveis();
  const deleteResp = useDeleteResponsavel();
  const { cluster: fCluster } = useClusterGlobal();

  const [busca, setBusca] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Responsavel | null>(null);
  const [confirmDel, setConfirmDel] = useState<Responsavel | null>(null);

  const noEscopo = useMemo(
    () => items.filter(r => !fCluster || !r.cluster_id || r.cluster_id === fCluster),
    [items, fCluster],
  );
  const visiveis = useMemo(() => {
    const q = canon(busca.trim());
    if (!q) return noEscopo;
    return noEscopo.filter(r =>
      canon(r.name).includes(q) || canon(r.level || '').includes(q) ||
      canon(r.category || '').includes(q) || canon(tipoDe(r)).includes(q)
    );
  }, [noEscopo, busca]);

  const abrirCriar = () => { setEmEdicao(null); setFormAberto(true); };
  const abrirEditar = (r: Responsavel) => { setEmEdicao(r); setFormAberto(true); };

  const focusId = useFocusParam();
  const focusConsumido = useRef(false);
  useEffect(() => {
    if (focusConsumido.current || isLoading || !focusId) return;
    const r = items.find(x => x.id === focusId);
    if (r) { focusConsumido.current = true; setEmEdicao(r); setFormAberto(true); }
  }, [isLoading, focusId, items]);

  const descricaoDe = (r: Responsavel) => [r.level, r.category].filter(Boolean).join(' · ') || undefined;

  return (
    <CadastroPageShell
      eyebrow="Mapa · Digital"
      titulo="Responsáveis"
      subtitulo="Cadastre as pessoas e papéis por trás de cada entrega."
      ctaLabel="Adicionar Responsável"
      onCta={abrirCriar}
      carregando={isLoading}
    >
      {noEscopo.length > 0 && (
        <CadastroToolbar
          busca={busca}
          onBusca={setBusca}
          total={noEscopo.length}
          visiveis={visiveis.length}
          substantivo={['responsável', 'responsáveis']}
          placeholder="Buscar por nome, cargo ou tipo..."
        />
      )}
      <CadastroLista
        vazio={noEscopo.length === 0}
        semResultadoBusca={visiveis.length === 0}
        emptyState={
          <EmptyStateCadastro
            icone={<Users size={32} strokeWidth={1.8} />}
            titulo="Nenhum responsável cadastrado"
            texto="Responsáveis são as pessoas e papéis que executam as etapas. Cadastre o primeiro para atribuí-lo aos processos."
            ctaLabel="Cadastrar primeiro responsável"
            onCta={abrirCriar}
          />
        }
        semResultados={
          <EmptyStateCadastro
            compacto
            icone={<SearchX size={20} />}
            titulo={`Nenhum responsável para "${busca.trim()}"`}
            ctaLabel="Limpar busca"
            onCta={() => setBusca('')}
          />
        }
      >
        {visiveis.map((r) => (
          <CadastroItem
            key={r.id}
            titulo={r.name}
            descricao={descricaoDe(r)}
            leading={TIPO_ICONE[tipoDe(r)] ?? <UserRound size={20} strokeWidth={2} />}
            badge={{ label: tipoDe(r) }}
            onOpen={() => abrirEditar(r)}
            onEdit={() => abrirEditar(r)}
            onDelete={() => setConfirmDel(r)}
          />
        ))}
      </CadastroLista>

      <ResponsavelFormModal
        aberto={formAberto}
        responsavel={emEdicao}
        onClose={() => setFormAberto(false)}
      />

      <ConfirmDeleteModal
        aberto={!!confirmDel}
        nomeItem={confirmDel?.name ?? ''}
        substantivo="responsável"
        aviso="Ele será removido das etapas e melhorias que o referenciam."
        onClose={() => setConfirmDel(null)}
        onConfirm={async () => {
          if (!confirmDel) return;
          await deleteResp.mutateAsync({ id: confirmDel.id, old: confirmDel });
          toast.success('Responsável excluído');
        }}
      />
    </CadastroPageShell>
  );
}
