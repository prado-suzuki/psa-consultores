// Modal de cadastro de Sistema — extraído da SistemasPage para ser
// reutilizado também no editor de etapas (Mapear processo).

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import { dica } from '@/utils/tooltips';
import { parseMoeda } from '@/utils/format';
import type { Sistema } from '@/types';
import { useCreateSistema } from '@/hooks/useSistemas';
import { ORIGEM_OPCOES } from '@/components/equipe/mapa/cadastros/sistemaOpcoes';

interface NovoSistemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado com o sistema criado (ex.: pra pré-selecionar no campo de origem). */
  onCreated?: (sistema: Sistema) => void;
}

export default function NovoSistemaModal({ isOpen, onClose, onCreated }: NovoSistemaModalProps) {
  const createSistema = useCreateSistema();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [origem, setOrigem] = useState('Interno');
  const [variavel, setVariavel] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setNome(''); setDescricao(''); setOrigem('Interno'); setVariavel('');
    setError('');
  }, [isOpen]);

  const handleSave = async () => {
    if (!nome.trim()) { setError('Preencha o nome do sistema.'); return; }
    setError('');
    setIsSaving(true);
    try {
      const created = await createSistema.mutateAsync({
        nome: nome.trim(),
        descricao: descricao.trim(),
        origem,
        custo_licenca_mensal: 0,
        custo_variavel_por_uso: parseMoeda(variavel),
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
        <FormField label="Descrição" tooltip={dica('sistemas.form.descricao')}>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Digite a descrição do sistema" />
        </FormField>
        <FormField label="Origem" tooltip={dica('sistemas.form.origem')}>
          <Select value={origem} onChange={setOrigem} options={ORIGEM_OPCOES} />
        </FormField>
        <FormField label="Custo mensal" tooltip={dica('sistemas.form.custoVariavel')}>
          <input type="text" value={variavel} onChange={(e) => setVariavel(e.target.value)} placeholder="Ex: R$ 500,00 / mês" />
        </FormField>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </Modal>
  );
}
