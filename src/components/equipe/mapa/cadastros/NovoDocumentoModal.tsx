// Modal de cadastro de Documento — extraído da DocumentosPage para ser
// reutilizado também no editor de etapas (Mapear processo), permitindo
// cadastrar um documento na hora sem sair do fluxo.

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import { dica } from '@/utils/tooltips';
import type { Documento, EstruturacaoDoc } from '@/types';
import { useCreateDocumento, useDocumentos } from '@/hooks/useDocumentos';
import { useClusters } from '@/hooks/useClusters';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';
import {
  TIPO_OPCOES, ORIGEM_OPCOES, ESTRUTURADO_SELECT_OPCOES, FORMATO_SELECT_OPCOES, deriveEstruturado,
} from '@/components/equipe/mapa/cadastros/documentoOpcoes';

interface NovoDocumentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado com o documento criado (ex.: pra pré-selecionar no campo de origem). */
  onCreated?: (doc: Documento) => void;
}

export default function NovoDocumentoModal({ isOpen, onClose, onCreated }: NovoDocumentoModalProps) {
  const createDoc = useCreateDocumento();
  const { data: clustersList = [] } = useClusters();
  const { cluster: fCluster } = useClusterGlobal();
  const { data: documentos = [] } = useDocumentos();
  const CLUSTER_OPCOES = useMemo(
    () => clustersList.filter(c => c.ativo).map(c => ({ value: c.id, label: c.nome })),
    [clustersList],
  );
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [formato, setFormato] = useState('');
  const [origem, setOrigem] = useState('Interno');
  const [estrutura, setEstrutura] = useState('');
  const [estruturado, setEstruturado] = useState<EstruturacaoDoc | ''>('');
  const [clusterId, setClusterId] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setNome(''); setTipo(''); setFormato(''); setOrigem('Interno'); setEstrutura(''); setEstruturado('');
    setClusterId(fCluster || '');   // pré-carrega o cluster do filtro global (editável)
    setError('');
  }, [isOpen, fCluster]);

  // Duplicidade ao vivo: mesmo nome no mesmo cluster.
  const duplicado = useMemo(() => {
    const n = nome.trim().toLowerCase();
    if (!n) return null;
    return documentos.find(d =>
      (d.nome || '').trim().toLowerCase() === n &&
      (d.cluster_id ?? null) === (clusterId || null),
    ) || null;
  }, [documentos, nome, clusterId]);

  const handleSave = async () => {
    if (!nome.trim()) { setError('Preencha o nome do documento.'); return; }
    if (!clusterId) { setError('Selecione o cluster do documento.'); return; }
    if (duplicado) { setError(`Já existe "${duplicado.nome}" neste cluster.`); return; }
    setError('');
    setIsSaving(true);
    try {
      const created = await createDoc.mutateAsync({
        nome: nome.trim(),
        tipo: tipo.trim(),
        formato,
        origem,
        tempo_minutos: 0,
        cluster_id: clusterId,
        estrutura_entrada: (estrutura || undefined) as Documento['estrutura_entrada'],
        estruturado: (estruturado || undefined) as EstruturacaoDoc | undefined,
      });
      toast.success('Documento criado');
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
        <h2>Novo Documento</h2>
        <FormField label="Nome do Documento" error={error} required tooltip={dica('documentos.form.nome')}>
          <input type="text" value={nome} onChange={(e) => { setNome(e.target.value); if (error) setError(''); }} placeholder="Digite o nome" />
        </FormField>
        {duplicado && (
          <div role="alert" style={{ color: '#b45309', fontSize: '0.8rem', margin: '-4px 0 8px' }}>
            Já existe <strong>{duplicado.nome}</strong> neste cluster — talvez você queira usar o existente.
          </div>
        )}
        <FormField label="Cluster" required>
          <Select
            value={clusterId}
            onChange={setClusterId}
            options={CLUSTER_OPCOES}
            placeholder="Selecione o cluster..."
            hasError={!clusterId && !!error}
          />
        </FormField>
        <FormField label="Tipo" tooltip={dica('documentos.form.tipo')}>
          <Select value={tipo} onChange={setTipo} options={TIPO_OPCOES} placeholder="Selecione..." />
        </FormField>
        <FormField label="Formato" tooltip={dica('documentos.form.formato')}>
          <Select
            value={formato}
            onChange={(v) => { setFormato(v); const derivado = deriveEstruturado(v); if (derivado) setEstruturado(derivado); }}
            options={FORMATO_SELECT_OPCOES}
            placeholder="Selecione..."
          />
        </FormField>
        <FormField label="Origem" tooltip={dica('documentos.form.origem')}>
          <Select value={origem} onChange={setOrigem} options={ORIGEM_OPCOES} />
        </FormField>
        <FormField label="Estruturado" tooltip={dica('documentos.form.estruturado')}>
          <Select
            value={estruturado}
            onChange={(v) => setEstruturado(v as EstruturacaoDoc | '')}
            options={ESTRUTURADO_SELECT_OPCOES}
            placeholder="Selecione..."
          />
        </FormField>
        <FormField label="Descrição" tooltip={dica('documentos.form.descricao')}>
          <textarea
            value={estrutura}
            onChange={(e) => setEstrutura(e.target.value)}
            placeholder="Descrição do documento e como é usado no processo"
            rows={3}
          />
        </FormField>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleSave} disabled={isSaving || !!duplicado}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </Modal>
  );
}
