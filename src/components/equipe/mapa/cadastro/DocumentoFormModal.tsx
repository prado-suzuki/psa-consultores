// Form unificado de Documento (criar/editar) — padrão "Cadastro Puro".
// `documento === null` ⇒ criação; caso contrário, edição pré-preenchida.

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import { dica } from '@/utils/tooltips';
import type { Documento, EstruturacaoDoc } from '@/types';
import { useCreateDocumento, useUpdateDocumento, useDocumentos } from '@/hooks/useDocumentos';
import { useClusters } from '@/hooks/useClusters';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';
import {
  TIPO_OPCOES, ORIGEM_OPCOES, ESTRUTURADO_SELECT_OPCOES, FORMATO_SELECT_OPCOES, deriveEstruturado,
} from '@/components/equipe/mapa/cadastros/documentoOpcoes';
import ConfirmarDescarte from '@/components/equipe/mapa/ConfirmarDescarte';

interface Props {
  aberto: boolean;
  documento: Documento | null;
  onClose: () => void;
}

export default function DocumentoFormModal({ aberto, documento, onClose }: Props) {
  const createDoc = useCreateDocumento();
  const updateDoc = useUpdateDocumento();
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
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [confirmSair, setConfirmSair] = useState(false);

  const tocado = useRef(false);
  useEffect(() => {
    if (!aberto) { tocado.current = false; setConfirmSair(false); return; }
    if (tocado.current) return;
    if (documento) {
      setNome(documento.nome);
      setTipo(documento.tipo || '');
      setFormato(documento.formato || '');
      setOrigem(documento.origem || 'Interno');
      setEstrutura(documento.estrutura_entrada || '');
      setEstruturado(documento.estruturado || '');
      setClusterId(documento.cluster_id || '');
    } else {
      setNome(''); setTipo(''); setFormato(''); setOrigem('Interno'); setEstrutura(''); setEstruturado('');
      setClusterId(fCluster || '');   // pré-carrega o cluster do filtro global (editável)
    }
    setErro('');
  }, [aberto, documento, fCluster]);

  const touch = () => { tocado.current = true; };
  const requestClose = () => { if (tocado.current) setConfirmSair(true); else onClose(); };

  // Duplicidade ao vivo: mesmo nome no mesmo cluster (ignora o próprio na edição).
  const duplicado = useMemo(() => {
    const n = nome.trim().toLowerCase();
    if (!n) return null;
    return documentos.find(d =>
      d.id !== documento?.id &&
      (d.nome || '').trim().toLowerCase() === n &&
      (d.cluster_id ?? null) === (clusterId || null),
    ) || null;
  }, [documentos, nome, clusterId, documento]);

  const salvar = async () => {
    if (!nome.trim()) { setErro('Preencha o nome do documento.'); return; }
    if (!clusterId) { setErro('Selecione o cluster do documento.'); return; }
    if (duplicado) { setErro(`Já existe "${duplicado.nome}" neste cluster.`); return; }
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
            cluster_id: clusterId,
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
          cluster_id: clusterId,
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
    <Modal isOpen={aberto} onClose={requestClose} tourId="modal-documento-form">
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
        {duplicado && (
          <div role="alert" style={{ color: '#b45309', fontSize: '0.8rem', margin: '-4px 0 8px' }}>
            Já existe <strong>{duplicado.nome}</strong> neste cluster — talvez você queira usar o existente em vez de criar outro.
          </div>
        )}
        <div className="cadastro-form-row">
          <FormField label="Cluster" required>
            <Select
              value={clusterId}
              onChange={(v) => { touch(); setClusterId(v); }}
              options={CLUSTER_OPCOES}
              placeholder="Selecione o cluster..."
              hasError={!clusterId && !!erro}
            />
          </FormField>
          <div />
        </div>
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
          <button className="btn-cancel" onClick={requestClose}>Cancelar</button>
          <button className="btn-save" data-tour="modal-salvar" onClick={salvar} disabled={salvando || !!duplicado}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        </div>
        <ConfirmarDescarte open={confirmSair} onContinuar={() => setConfirmSair(false)} onDescartar={() => { setConfirmSair(false); onClose(); }} />
      </div>
    </Modal>
  );
}
