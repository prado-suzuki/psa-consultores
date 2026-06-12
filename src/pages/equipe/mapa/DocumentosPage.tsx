// Documentos — página de cadastro (padrão "Cadastro Puro").
// Só cadastro: busca + lista enxuta + form modal + confirmação de exclusão.
// Sem KPIs/tempo/relatórios — a análise vive no Dashboard ROI. O escopo por
// cluster (quais documentos aparecem) é preservado do fluxo legado: documentos
// usados como entrada/saída em etapas de processos do cluster.

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileStack, FileText, SearchX } from 'lucide-react';
import CadastroPageShell from '@/components/equipe/mapa/cadastro/CadastroPageShell';
import CadastroToolbar from '@/components/equipe/mapa/cadastro/CadastroToolbar';
import CadastroLista from '@/components/equipe/mapa/cadastro/CadastroLista';
import CadastroItem from '@/components/equipe/mapa/cadastro/CadastroItem';
import EmptyStateCadastro from '@/components/equipe/mapa/cadastro/EmptyStateCadastro';
import ConfirmDeleteModal from '@/components/equipe/mapa/cadastro/ConfirmDeleteModal';
import DocumentoFormModal from '@/components/equipe/mapa/cadastro/DocumentoFormModal';
import { canon } from '@/utils/cascataEngine';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { useFocusParam } from '@/utils/useFocusParam';
import type { Documento } from '@/types';
import { useEtapasLista, useSistemasLista, useResponsaveisLista, useProcessosLista, useProjetosLista } from '@/hooks/useDominioListas';
import { useDocumentos, useDeleteDocumento } from '@/hooks/useDocumentos';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';

export default function DocumentosPage() {
  const { data: items = [], isLoading } = useDocumentos();
  const deleteDoc = useDeleteDocumento();
  const { cluster: fCluster } = useClusterGlobal();

  const [busca, setBusca] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Documento | null>(null);
  const [confirmDel, setConfirmDel] = useState<Documento | null>(null);

  // --- Escopo por cluster (preservado do fluxo legado) ---
  const { data: rawEtapas = [] } = useEtapasLista();
  const { data: sis = [] } = useSistemasLista();
  const { data: resps = [] } = useResponsaveisLista();
  const { data: processos = [] } = useProcessosLista();
  const { data: projetos = [] } = useProjetosLista();
  const etapas = useMemo(() => enrichEtapas(rawEtapas, items, sis, resps), [rawEtapas, items, sis, resps]);
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
    () => items.filter(d => !fCluster || nomesDocumentosDoEscopo?.has(d.nome)),
    [items, fCluster, nomesDocumentosDoEscopo],
  );
  const visiveis = useMemo(() => {
    const q = canon(busca.trim());
    if (!q) return noEscopo;
    return noEscopo.filter(d =>
      canon(d.nome).includes(q) || canon(d.tipo || '').includes(q) || canon(d.formato || '').includes(q) ||
      canon(d.origem || '').includes(q) || canon(d.estrutura_entrada || '').includes(q)
    );
  }, [noEscopo, busca]);

  const abrirCriar = () => { setEmEdicao(null); setFormAberto(true); };
  const abrirEditar = (d: Documento) => { setEmEdicao(d); setFormAberto(true); };

  const focusId = useFocusParam();
  const focusConsumido = useRef(false);
  useEffect(() => {
    if (focusConsumido.current || isLoading || !focusId) return;
    const d = items.find(x => x.id === focusId);
    if (d) { focusConsumido.current = true; setEmEdicao(d); setFormAberto(true); }
  }, [isLoading, focusId, items]);

  const badgeDe = (d: Documento): { label: string } | undefined =>
    d.formato ? { label: d.formato } : (d.tipo ? { label: d.tipo } : undefined);

  return (
    <CadastroPageShell
      eyebrow="Mapa · Digital"
      titulo="Documentos"
      subtitulo="Cadastre os documentos que entram e saem do seu dia a dia."
      ctaLabel="Adicionar Documento"
      onCta={abrirCriar}
      carregando={isLoading}
    >
      {noEscopo.length > 0 && (
        <CadastroToolbar
          busca={busca}
          onBusca={setBusca}
          total={noEscopo.length}
          visiveis={visiveis.length}
          substantivo={['documento', 'documentos']}
          placeholder="Buscar por nome, tipo, formato ou origem..."
        />
      )}
      <CadastroLista
        vazio={noEscopo.length === 0}
        semResultadoBusca={visiveis.length === 0}
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
            titulo={`Nenhum documento para "${busca.trim()}"`}
            ctaLabel="Limpar busca"
            onCta={() => setBusca('')}
          />
        }
      >
        {visiveis.map((d) => (
          <CadastroItem
            key={d.id}
            titulo={d.nome}
            descricao={d.estrutura_entrada || undefined}
            leading={<FileText size={20} strokeWidth={2} />}
            badge={badgeDe(d)}
            onOpen={() => abrirEditar(d)}
            onEdit={() => abrirEditar(d)}
            onDelete={() => setConfirmDel(d)}
          />
        ))}
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
