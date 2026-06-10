// Modal de cadastro de Responsável — extraído da ResponsaveisPage para ser
// reutilizado também no editor de etapas (Mapear processo).

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import { dica } from '@/utils/tooltips';
import { parseMoeda } from '@/utils/format';
import type { Responsavel } from '@/types';
import { useCreateResponsavel } from '@/hooks/useResponsaveis';
import { useClusterCadastroOpcoes } from '@/hooks/useClusters';

export const TIPO_OPCOES = [
  { value: 'Interno', label: 'Interno' },
  { value: 'Externo', label: 'Externo' },
];

interface NovoResponsavelModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado com o responsável criado (ex.: pra pré-selecionar no campo de origem). */
  onCreated?: (resp: Responsavel) => void;
}

export default function NovoResponsavelModal({ isOpen, onClose, onCreated }: NovoResponsavelModalProps) {
  const createResp = useCreateResponsavel();
  const CLUSTER_OPCOES = useClusterCadastroOpcoes();
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [custoHora, setCustoHora] = useState('');
  const [tipo, setTipo] = useState('Interno');
  const [clusterId, setClusterId] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setNome(''); setCargo(''); setCategoria(''); setCustoHora(''); setTipo('Interno'); setClusterId('');
    setError('');
  }, [isOpen]);

  const handleSave = async () => {
    if (!nome.trim()) { setError('Preencha o nome do responsável.'); return; }
    setError('');
    setIsSaving(true);
    try {
      const created = await createResp.mutateAsync({
        name: nome.trim(),
        level: cargo.trim(),
        category: categoria.trim() || undefined,
        hourly_rate: parseMoeda(custoHora),
        type: tipo,
        cluster_id: clusterId || undefined,
      });
      toast.success('Responsável criado');
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
        <h2>Novo Responsável</h2>
        <FormField label="Nome" error={error} required tooltip={dica('responsaveis.form.nome')}>
          <input type="text" value={nome} onChange={(e) => { setNome(e.target.value); if (error) setError(''); }} placeholder="Digite o nome do responsável" />
        </FormField>
        <FormField label="Cargo" tooltip={dica('responsaveis.form.cargo')}>
          <input type="text" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Digite o cargo" />
        </FormField>
        <FormField label="Categoria" tooltip="Senioridade do cargo (ex.: Pleno, Júnior, Sênior).">
          <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex: Pleno, Júnior, Sênior" />
        </FormField>
        <FormField label="Tipo" tooltip={dica('responsaveis.form.tipo')}>
          <Select value={tipo} onChange={setTipo} options={TIPO_OPCOES} />
        </FormField>
        <FormField label="Cluster" tooltip={dica('responsaveis.form.cluster')}>
          <Select value={clusterId} onChange={setClusterId} options={CLUSTER_OPCOES} />
        </FormField>
        <FormField label="Custo por Hora Trabalhada (R$)" tooltip={dica('responsaveis.form.hourly_rate')}>
          <input type="text" value={custoHora} onChange={(e) => setCustoHora(e.target.value)} placeholder="Ex: 90,00" />
        </FormField>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </Modal>
  );
}
