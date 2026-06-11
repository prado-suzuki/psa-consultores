// Modal de cadastro rápido de Gargalo — usado no editor de etapas (Mapear
// processo) para criar um gargalo sem sair do fluxo, no padrão dos modais
// NovoDocumento/NovoSistema/NovoResponsavel. Só identidade: o vínculo com a
// etapa é feito pelo chamador via onCreated.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import { dica } from '@/utils/tooltips';
import type { Gargalo } from '@/types';
import { useCreateGargalo } from '@/hooks/useGargalos';
import { useClusterCadastroOpcoes } from '@/hooks/useClusters';
import { GARGALO_ORIGEM_OPCOES } from '@/components/equipe/mapa/cadastros/gargaloOpcoes';

interface NovoGargaloModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado com o gargalo criado (ex.: pra pré-selecionar na etapa). */
  onCreated?: (gargalo: Gargalo) => void;
}

export default function NovoGargaloModal({ isOpen, onClose, onCreated }: NovoGargaloModalProps) {
  const createGargalo = useCreateGargalo();
  const CLUSTER_OPCOES = useClusterCadastroOpcoes();
  const [nome, setNome] = useState('');
  const [origem, setOrigem] = useState('');
  const [descricao, setDescricao] = useState('');
  const [clusterId, setClusterId] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setNome(''); setOrigem(''); setDescricao(''); setClusterId('');
    setError('');
  }, [isOpen]);

  const handleSave = async () => {
    if (!nome.trim()) { setError('Preencha o nome do gargalo.'); return; }
    setError('');
    setIsSaving(true);
    try {
      const created = await createGargalo.mutateAsync({
        nome: nome.trim(),
        descricao: descricao.trim(),
        origem: origem.trim(),
        cluster_id: clusterId || undefined,
      });
      toast.success('Gargalo criado');
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
        <h2>Novo Gargalo</h2>
        <FormField label="Nome" error={error} required tooltip={dica('gargalos.form.nome')}>
          <input type="text" value={nome} onChange={(e) => { setNome(e.target.value); if (error) setError(''); }} placeholder="Digite o nome do gargalo" />
        </FormField>
        <FormField label="Origem" tooltip={dica('gargalos.form.origem')}>
          <Select value={origem} onChange={setOrigem} options={GARGALO_ORIGEM_OPCOES} placeholder="Selecione..." />
        </FormField>
        <FormField label="Cluster" tooltip={dica('gargalos.form.cluster')}>
          <Select value={clusterId} onChange={setClusterId} options={CLUSTER_OPCOES} />
        </FormField>
        <FormField label="Descrição" tooltip={dica('gargalos.form.descricao')}>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o gargalo" rows={3} />
        </FormField>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </Modal>
  );
}
