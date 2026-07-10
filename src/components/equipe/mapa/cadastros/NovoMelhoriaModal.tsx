// Modal de cadastro rápido de Melhoria — usado no editor de etapas (Mapear
// processo) para criar uma melhoria sem sair do fluxo, no padrão dos modais
// NovoDocumento/NovoSistema/NovoResponsavel/NovoGargalo. Só identidade: o
// vínculo com o processo é feito pelo chamador via onCreated.
//
// O cluster é obrigatório de propósito: a listagem do MAPA (useMelhorias)
// esconde rows com cluster_id nulo (Digital Rotina), então uma melhoria sem
// cluster seria criada mas ficaria invisível no seletor.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import { dica } from '@/utils/tooltips';
import type { Melhoria, MelhoriaStatus } from '@/types';
import { MELHORIA_STATUSES } from '@/types';
import { useCreateMelhoria } from '@/hooks/useMelhorias';
import { useClusterCadastroOpcoes } from '@/hooks/useClusters';

interface NovoMelhoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Cluster pré-selecionado (opcional) — ex.: herdado do contexto. */
  clusterIdInicial?: string;
  /** Processo de origem — vira o 1º vínculo (e o process_id legado) no create. */
  processIdInicial?: string;
  /** Chamado com a melhoria criada (ex.: pra pré-selecionar no processo). */
  onCreated?: (melhoria: Melhoria) => void;
}

export default function NovoMelhoriaModal({ isOpen, onClose, clusterIdInicial, processIdInicial, onCreated }: NovoMelhoriaModalProps) {
  const createMelhoria = useCreateMelhoria();
  const CLUSTER_OPCOES = useClusterCadastroOpcoes();
  const [nome, setNome] = useState('');
  const [status, setStatus] = useState<MelhoriaStatus>('Não iniciado');
  const [clusterId, setClusterId] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const statusOptions = MELHORIA_STATUSES.map(s => ({ value: s, label: s }));

  useEffect(() => {
    if (!isOpen) return;
    setNome(''); setStatus('Não iniciado'); setClusterId(clusterIdInicial || '');
    setError('');
  }, [isOpen, clusterIdInicial]);

  const handleSave = async () => {
    if (!nome.trim()) { setError('Preencha o nome da melhoria.'); return; }
    if (!clusterId) { setError('Selecione um cluster (sem ele a melhoria não aparece no MAPA).'); return; }
    setError('');
    setIsSaving(true);
    try {
      const created = await createMelhoria.mutateAsync({
        improvement_description: nome.trim(),
        improvement_status: status,
        cluster_id: clusterId,
        processos: processIdInicial ? [processIdInicial] : undefined,
      });
      toast.success('Melhoria criada');
      onCreated?.(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="modal">
        <h2>Nova Melhoria</h2>
        <FormField label="Nome" error={error} required tooltip={dica('melhorias.form.nome')}>
          <input type="text" value={nome} onChange={(e) => { setNome(e.target.value); if (error) setError(''); }} placeholder="Digite o nome da melhoria" />
        </FormField>
        <FormField label="Status" tooltip={dica('melhorias.form.status')}>
          <Select value={status} onChange={(v) => setStatus(v as MelhoriaStatus)} options={statusOptions} />
        </FormField>
        <FormField label="Cluster" required tooltip={dica('melhorias.form.cluster')}>
          <Select value={clusterId} onChange={(v) => { setClusterId(v); if (error) setError(''); }} options={CLUSTER_OPCOES} placeholder="Selecione..." />
        </FormField>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </Modal>
  );
}
