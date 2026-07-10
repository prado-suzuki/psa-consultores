// Modal de cadastro de Sistema — extraído da SistemasPage para ser
// reutilizado também no editor de etapas (Mapear processo).

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import { dica } from '@/utils/tooltips';
import { parseMoeda } from '@/utils/format';
import type { Sistema } from '@/types';
import { useCreateSistema, useSistemas } from '@/hooks/useSistemas';
import { useClusters } from '@/hooks/useClusters';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';
import { ORIGEM_OPCOES } from '@/components/equipe/mapa/cadastros/sistemaOpcoes';

interface NovoSistemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado com o sistema criado (ex.: pra pré-selecionar no campo de origem). */
  onCreated?: (sistema: Sistema) => void;
}

export default function NovoSistemaModal({ isOpen, onClose, onCreated }: NovoSistemaModalProps) {
  const createSistema = useCreateSistema();
  const { data: clustersList = [] } = useClusters();
  const { cluster: fCluster } = useClusterGlobal();
  const { data: sistemas = [] } = useSistemas();
  const CLUSTER_OPCOES = useMemo(
    () => clustersList.filter(c => c.ativo).map(c => ({ value: c.id, label: c.nome })),
    [clustersList],
  );
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [origem, setOrigem] = useState('Interno');
  const [variavel, setVariavel] = useState('');
  const [clusterId, setClusterId] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setNome(''); setDescricao(''); setOrigem('Interno'); setVariavel('');
    setClusterId(fCluster || '');   // pré-carrega o cluster do filtro global (editável)
    setError('');
  }, [isOpen, fCluster]);

  // 3.5 — duplicidade detectada ao vivo (mesmo nome no mesmo cluster).
  const duplicado = useMemo(() => {
    const n = nome.trim().toLowerCase();
    if (!n) return null;
    return sistemas.find(s =>
      (s.nome || '').trim().toLowerCase() === n &&
      (s.cluster_id ?? null) === (clusterId || null),
    ) || null;
  }, [sistemas, nome, clusterId]);

  const handleSave = async () => {
    if (!nome.trim()) { setError('Preencha o nome do sistema.'); return; }
    if (!clusterId) { setError('Selecione o cluster do sistema.'); return; }
    if (duplicado) { setError(`Já existe "${duplicado.nome}" neste cluster.`); return; }
    setError('');
    setIsSaving(true);
    try {
      const created = await createSistema.mutateAsync({
        nome: nome.trim(),
        descricao: descricao.trim(),
        origem,
        custo_licenca_mensal: 0,
        custo_variavel_por_uso: parseMoeda(variavel),
        cluster_id: clusterId,
      });
      toast.success('Sistema criado');
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
        <h2>Novo Sistema</h2>
        <FormField label="Nome do Sistema" error={error} required tooltip={dica('sistemas.form.nome')}>
          <input type="text" value={nome} onChange={(e) => { setNome(e.target.value); if (error) setError(''); }} placeholder="Digite o nome do sistema" />
        </FormField>
        {duplicado && (
          <div role="alert" style={{ color: '#b45309', fontSize: '0.8rem', margin: '-4px 0 8px' }}>
            Já existe <strong>{duplicado.nome}</strong> neste cluster — talvez você queira usar o existente.
          </div>
        )}
        <FormField label="Descrição" tooltip={dica('sistemas.form.descricao')}>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Digite a descrição do sistema" />
        </FormField>
        <FormField label="Origem" tooltip={dica('sistemas.form.origem')}>
          <Select value={origem} onChange={setOrigem} options={ORIGEM_OPCOES} />
        </FormField>
        <FormField label="Cluster" required>
          <Select
            value={clusterId}
            onChange={setClusterId}
            options={CLUSTER_OPCOES}
            placeholder="Selecione o cluster..."
            hasError={!clusterId && !!error}
          />
        </FormField>
        <FormField label="Custo mensal" tooltip={dica('sistemas.form.custoVariavel')}>
          <input type="text" value={variavel} onChange={(e) => setVariavel(e.target.value)} placeholder="Ex: R$ 500,00 / mês" />
        </FormField>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleSave} disabled={isSaving || !!duplicado}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </Modal>
  );
}
