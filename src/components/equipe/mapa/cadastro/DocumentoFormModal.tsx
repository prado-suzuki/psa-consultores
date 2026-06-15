// Form unificado de Documento (criar/editar) — padrão "Cadastro Puro".
// `documento === null` ⇒ criação; caso contrário, edição pré-preenchida.

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import { dica } from '@/utils/tooltips';
import type { Documento, EstruturacaoDoc } from '@/types';
import { useCreateDocumento, useUpdateDocumento } from '@/hooks/useDocumentos';
import {
  TIPO_OPCOES, ORIGEM_OPCOES, ESTRUTURADO_SELECT_OPCOES, FORMATO_SELECT_OPCOES, deriveEstruturado,
} from '@/components/equipe/mapa/cadastros/documentoOpcoes';

interface Props {
  aberto: boolean;
  documento: Documento | null;
  onClose: () => void;
}

export default function DocumentoFormModal({ aberto, documento, onClose }: Props) {
  const createDoc = useCreateDocumento();
  const updateDoc = useUpdateDocumento();

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [formato, setFormato] = useState('');
  const [origem, setOrigem] = useState('Interno');
  const [estrutura, setEstrutura] = useState('');
  const [estruturado, setEstruturado] = useState<EstruturacaoDoc | ''>('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const tocado = useRef(false);
  useEffect(() => {
    if (!aberto) { tocado.current = false; return; }
    if (tocado.current) return;
    if (documento) {
      setNome(documento.nome);
      setTipo(documento.tipo || '');
      setFormato(documento.formato || '');
      setOrigem(documento.origem || 'Interno');
      setEstrutura(documento.estrutura_entrada || '');
      setEstruturado(documento.estruturado || '');
    } else {
      setNome(''); setTipo(''); setFormato(''); setOrigem('Interno'); setEstrutura(''); setEstruturado('');
    }
    setErro('');
  }, [aberto, documento]);

  const touch = () => { tocado.current = true; };

  const salvar = async () => {
    if (!nome.trim()) { setErro('Preencha o nome do documento.'); return; }
    setErro('');
    setSalvando(true);
    try {
      if (documento) {
        await updateDoc.mutateAsync({
          id: documento.id,
          old: documento,
          patch: {
            nome: nome.trim(),
            tipo: tipo.trim(),
            formato,
            origem,
            estrutura_entrada: (estrutura || undefined) as Documento['estrutura_entrada'],
            estruturado: (estruturado || undefined) as EstruturacaoDoc | undefined,
          },
        });
        toast.success('Documento atualizado');
      } else {
        await createDoc.mutateAsync({
          nome: nome.trim(),
          tipo: tipo.trim(),
          formato,
          origem,
          tempo_minutos: 0,
          estrutura_entrada: (estrutura || undefined) as Documento['estrutura_entrada'],
          estruturado: (estruturado || undefined) as EstruturacaoDoc | undefined,
        });
        toast.success('Documento criado');
      }
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal isOpen={aberto} onClose={onClose} tourId="modal-documento-form">
      <div className="modal modal-wide">
        <h2>{documento ? 'Editar Documento' : 'Novo Documento'}</h2>

        <div className="cadastro-form-secao">Identificação</div>
        <FormField label="Nome" error={erro} required tooltip={dica('documentos.form.nome')} dataTour="modal-campo-1">
          <input
            type="text"
            value={nome}
            onChange={(e) => { touch(); setNome(e.target.value); if (erro) setErro(''); }}
            placeholder="Digite o nome do documento"
          />
        </FormField>
        <div className="cadastro-form-row">
          <FormField label="Tipo" tooltip={dica('documentos.form.tipo')} dataTour="modal-campo-2">
            <Select value={tipo} onChange={(v) => { touch(); setTipo(v); }} options={TIPO_OPCOES} placeholder="Selecione..." />
          </FormField>
          <FormField label="Formato" tooltip={dica('documentos.form.formato')}>
            <Select
              value={formato}
              onChange={(v) => { touch(); setFormato(v); const derivado = deriveEstruturado(v); if (derivado) setEstruturado(derivado); }}
              options={FORMATO_SELECT_OPCOES}
              placeholder="Selecione..."
            />
          </FormField>
        </div>
        <div className="cadastro-form-row">
          <FormField label="Origem" tooltip={dica('documentos.form.origem')}>
            <Select value={origem} onChange={(v) => { touch(); setOrigem(v); }} options={ORIGEM_OPCOES} />
          </FormField>
          <FormField label="Estruturado" tooltip={dica('documentos.form.estruturado')}>
            <Select
              value={estruturado}
              onChange={(v) => { touch(); setEstruturado(v as EstruturacaoDoc | ''); }}
              options={ESTRUTURADO_SELECT_OPCOES}
              placeholder="Selecione..."
            />
          </FormField>
        </div>
        <FormField label="Descrição" tooltip={dica('documentos.form.descricao')}>
          <textarea
            className="cadastro-form-textarea"
            value={estrutura}
            onChange={(e) => { touch(); setEstrutura(e.target.value); }}
            placeholder="Descrição do documento e como é usado no processo"
            rows={4}
          />
        </FormField>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" data-tour="modal-salvar" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </Modal>
  );
}
