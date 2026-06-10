// Modal de cadastro de Documento — extraído da DocumentosPage para ser
// reutilizado também no editor de etapas (Mapear processo), permitindo
// cadastrar um documento na hora sem sair do fluxo.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import { dica } from '@/utils/tooltips';
import type { Documento, EstruturacaoDoc } from '@/types';
import { useCreateDocumento } from '@/hooks/useDocumentos';

export const ESTRUTURADO_OPCOES: EstruturacaoDoc[] = ['Não Estruturado', 'Semi Estruturado', 'Estruturado'];
export const FORMATO_OPCOES_LIST = ['PDF', 'Word', 'Excel', 'PowerPoint', 'Markdown', 'Texto'];
export const TIPO_OPCOES = [
  { value: 'Planilha', label: 'Planilha' },
  { value: 'Registro digital', label: 'Registro digital' },
  { value: 'Protocolo', label: 'Protocolo' },
  { value: 'Relatório', label: 'Relatório' },
  { value: 'Comprovante', label: 'Comprovante' },
];
export const ORIGEM_OPCOES = [
  { value: 'Interno', label: 'Interno' },
  { value: 'Cliente', label: 'Cliente' },
];
export const ESTRUTURADO_SELECT_OPCOES = ESTRUTURADO_OPCOES.map((o) => ({ value: o, label: o }));
const FORMATO_SELECT_OPCOES = FORMATO_OPCOES_LIST.map(f => ({ value: f, label: f }));

// Condicionamento da estrutura derivado do formato do documento.
export const deriveEstruturado = (formato: string): EstruturacaoDoc | '' => {
  if (formato === 'Excel') return 'Estruturado';
  if (formato === 'Word' || formato === 'Texto') return 'Semi Estruturado';
  if (formato === 'PDF' || formato === 'PowerPoint' || formato === 'Markdown') return 'Não Estruturado';
  return '';
};

interface NovoDocumentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado com o documento criado (ex.: pra pré-selecionar no campo de origem). */
  onCreated?: (doc: Documento) => void;
}

export default function NovoDocumentoModal({ isOpen, onClose, onCreated }: NovoDocumentoModalProps) {
  const createDoc = useCreateDocumento();
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [formato, setFormato] = useState('');
  const [origem, setOrigem] = useState('Interno');
  const [estrutura, setEstrutura] = useState('');
  const [estruturado, setEstruturado] = useState<EstruturacaoDoc | ''>('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setNome(''); setTipo(''); setFormato(''); setOrigem('Interno'); setEstrutura(''); setEstruturado('');
    setError('');
  }, [isOpen]);

  const handleSave = async () => {
    if (!nome.trim()) { setError('Preencha o nome do documento.'); return; }
    setError('');
    setIsSaving(true);
    try {
      const created = await createDoc.mutateAsync({
        nome: nome.trim(),
        tipo: tipo.trim(),
        formato,
        origem,
        tempo_minutos: 0,
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
          <button className="btn-save" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </Modal>
  );
}
