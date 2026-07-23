import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import DocumentoFormModal from '@/components/equipe/mapa/cadastro/DocumentoFormModal';
import GargaloFormModal from '@/components/equipe/mapa/cadastro/GargaloFormModal';
import MelhoriaFormModal from '@/components/equipe/mapa/cadastro/MelhoriaFormModal';
import ProcessoFormModal from '@/components/equipe/mapa/cadastro/ProcessoFormModal';
import ResponsavelFormModal from '@/components/equipe/mapa/cadastro/ResponsavelFormModal';
import SistemaFormModal from '@/components/equipe/mapa/cadastro/SistemaFormModal';
import { useUpdateGargalo } from '@/hooks/useGargalos';
import { useUpdateMelhoria } from '@/hooks/useMelhorias';
import type { Documento, Processo, Responsavel, Sistema } from '@/types';
import type { EtapasEditorController } from '@/components/equipe/mapa/mapear-processo/useEtapasEditor';

interface Props {
  processo: Processo;
  procClusterId: string | null;
  editProcessoOpen: boolean;
  onCloseProcesso: () => void;
  editor: EtapasEditorController;
}

export function QuickCadastros({ processo, procClusterId, editProcessoOpen, onCloseProcesso, editor }: Props) {
  const queryClient = useQueryClient();
  const updateGargalo = useUpdateGargalo();
  const updateMelhoria = useUpdateMelhoria();
  return <>
    <ProcessoFormModal aberto={editProcessoOpen} processo={processo} onClose={onCloseProcesso} />
    <DocumentoFormModal aberto={editor.cadastroRapido === 'documento'} documento={null} onClose={editor.closeQuick} clusterIdInicial={procClusterId ?? undefined}
      onCreated={documento => {
        if (editor.quickAddCampo === 'docsEntrada' || editor.quickAddCampo === 'docsSaida') editor.fillCreated(editor.quickAddCampo, documento.nome, documento.id);
        queryClient.setQueryData<Documento[]>(['documentos_processo'], old => old && !old.some(item => item.id === documento.id) ? [...old, documento] : old);
      }} />
    <SistemaFormModal aberto={editor.cadastroRapido === 'sistema'} sistema={null} onClose={editor.closeQuick} clusterIdInicial={procClusterId ?? undefined}
      onCreated={sistema => {
        if (editor.quickAddCampo === 'sistemas') editor.fillCreated('sistemas', sistema.nome, sistema.id);
        queryClient.setQueryData<Sistema[]>(['sistemas_processo'], old => old && !old.some(item => item.id === sistema.id) ? [...old, sistema] : old);
      }} />
    <ResponsavelFormModal aberto={editor.cadastroRapido === 'responsavel'} responsavel={null} onClose={editor.closeQuick} clusterIdInicial={procClusterId ?? undefined}
      onCreated={responsavel => {
        if (editor.quickAddCampo === 'executadoPor') editor.fillCreated('executadoPor', responsavel.name, responsavel.id);
        queryClient.setQueryData<Responsavel[]>(['job_roles'], old => old && !old.some(item => item.id === responsavel.id) ? [...old, responsavel] : old);
      }} />
    <GargaloFormModal aberto={editor.cadastroRapido === 'gargalo'} gargalo={null} clusterIdInicial={procClusterId ?? undefined} onClose={() => editor.setCadastroRapido(null)}
      onCreated={gargalo => updateGargalo.mutateAsync({ id: gargalo.id, old: gargalo, patch: { processos: [...new Set([...(gargalo.processos || []), processo.id])] } }).catch(error => toast.error('Erro ao vincular gargalo', { description: error instanceof Error ? error.message : String(error) }))} />
    <MelhoriaFormModal aberto={editor.cadastroRapido === 'melhoria'} melhoria={null} clusterIdInicial={procClusterId ?? undefined} onClose={() => editor.setCadastroRapido(null)}
      onCreated={melhoria => updateMelhoria.mutateAsync({ id: melhoria.id, old: melhoria, patch: { processos: [...new Set([...(melhoria.processos || []), processo.id])] } }).catch(error => toast.error('Erro ao vincular melhoria', { description: error instanceof Error ? error.message : String(error) }))} />
  </>;
}
