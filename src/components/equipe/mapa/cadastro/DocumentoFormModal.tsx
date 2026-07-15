// Form unificado de Documento (criar/editar) — padrão "Cadastro Puro".
// `documento === null` ⇒ criação; caso contrário, edição pré-preenchida.
// Padrão-ouro: react-hook-form + zod + UPDATE por DIFF (só os campos alterados).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import { dica } from '@/utils/tooltips';
import type { Documento, EstruturacaoDoc } from '@/types';
import { useCreateDocumento, useUpdateDocumento, useDocumentos } from '@/hooks/useDocumentos';
import { useClusters } from '@/hooks/useClusters';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';
import { clusterInicial } from '@/utils/etapaEditor';
import {
  TIPO_OPCOES, ORIGEM_OPCOES, ESTRUTURADO_SELECT_OPCOES, FORMATO_SELECT_OPCOES, deriveEstruturado,
} from '@/components/equipe/mapa/cadastros/documentoOpcoes';
import ConfirmarDescarte from '@/components/equipe/mapa/ConfirmarDescarte';

interface Props {
  aberto: boolean;
  documento: Documento | null;
  /** Cluster sugerido de início ao CRIAR (ex.: o cluster DO PROCESSO em edição). */
  clusterIdInicial?: string;
  /** Chamado com o documento criado (ex.: pra pré-selecionar no cadastro rápido). */
  onCreated?: (doc: Documento) => void;
  onClose: () => void;
}

const schema = z.object({
  nome: z.string().trim().min(1, 'Preencha o nome do documento.'),
  clusterId: z.string().min(1, 'Selecione o cluster do documento.'),
  tipo: z.string(),
  formato: z.string(),
  origem: z.string(),
  estrutura: z.string(),
  estruturado: z.string(),
});
type FormValues = z.infer<typeof schema>;
const EMPTY: FormValues = { nome: '', clusterId: '', tipo: '', formato: '', origem: 'Interno', estrutura: '', estruturado: '' };

export default function DocumentoFormModal({ aberto, documento, clusterIdInicial, onCreated, onClose }: Props) {
  const createDoc = useCreateDocumento();
  const updateDoc = useUpdateDocumento();
  const { data: clustersList = [] } = useClusters();
  const { cluster: fCluster } = useClusterGlobal();
  const { data: documentos = [] } = useDocumentos();
  const CLUSTER_OPCOES = useMemo(() => clustersList.filter(c => c.ativo).map(c => ({ value: c.id, label: c.nome })), [clustersList]);

  const {
    register, handleSubmit, control, reset, watch, setValue, setError,
    formState: { errors, dirtyFields, isDirty, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const [confirmSair, setConfirmSair] = useState(false);

  const hidratado = useRef(false);
  useEffect(() => {
    if (!aberto) { hidratado.current = false; setConfirmSair(false); return; }
    if (hidratado.current) return;
    hidratado.current = true;
    if (documento) {
      reset({
        nome: documento.nome, clusterId: documento.cluster_id || '', tipo: documento.tipo || '',
        formato: documento.formato || '', origem: documento.origem || 'Interno',
        estrutura: documento.estrutura_entrada || '', estruturado: documento.estruturado || '',
      });
    } else {
      reset({ ...EMPTY, clusterId: clusterInicial(clusterIdInicial, fCluster) });
    }
  }, [aberto, documento, clusterIdInicial, fCluster, reset]);

  const nome = watch('nome');
  const clusterId = watch('clusterId');

  const duplicado = useMemo(() => {
    const n = (nome || '').trim().toLowerCase();
    if (!n) return null;
    return documentos.find(d =>
      d.id !== documento?.id &&
      (d.nome || '').trim().toLowerCase() === n &&
      (d.cluster_id ?? null) === (clusterId || null),
    ) || null;
  }, [documentos, nome, clusterId, documento]);

  const requestClose = () => { if (isDirty) setConfirmSair(true); else onClose(); };

  const onSubmit = async (v: FormValues) => {
    if (duplicado) { setError('nome', { message: `Já existe "${duplicado.nome}" neste cluster.` }); return; }
    try {
      if (documento) {
        // UPDATE por DIFF: só os campos alterados. Nada mudou → nem chama o banco.
        const patch: Partial<Documento> = {};
        if (dirtyFields.nome) patch.nome = v.nome.trim();
        if (dirtyFields.tipo) patch.tipo = v.tipo.trim();
        if (dirtyFields.formato) patch.formato = v.formato;
        if (dirtyFields.origem) patch.origem = v.origem;
        if (dirtyFields.clusterId) patch.cluster_id = v.clusterId;
        if (dirtyFields.estrutura) patch.estrutura_entrada = (v.estrutura || undefined) as Documento['estrutura_entrada'];
        if (dirtyFields.estruturado) patch.estruturado = (v.estruturado || undefined) as EstruturacaoDoc | undefined;
        if (Object.keys(patch).length > 0) {
          await updateDoc.mutateAsync({ id: documento.id, old: documento, patch });
        }
        toast.success('Documento atualizado');
      } else {
        const created = await createDoc.mutateAsync({
          nome: v.nome.trim(), tipo: v.tipo.trim(), formato: v.formato, origem: v.origem, tempo_minutos: 0,
          cluster_id: v.clusterId,
          estrutura_entrada: (v.estrutura || undefined) as Documento['estrutura_entrada'],
          estruturado: (v.estruturado || undefined) as EstruturacaoDoc | undefined,
        });
        toast.success('Documento criado');
        onCreated?.(created);
      }
      onClose();
    } catch (err) {
      setError('root', { message: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <Modal isOpen={aberto} onClose={requestClose} tourId="modal-documento-form">
      <form className="modal modal-wide" onSubmit={handleSubmit(onSubmit)}>
        <h2>{documento ? 'Editar Documento' : 'Novo Documento'}</h2>

        <div className="cadastro-form-secao">Identificação</div>
        <FormField label="Nome" error={errors.nome?.message || errors.root?.message} required tooltip={dica('documentos.form.nome')} dataTour="modal-campo-1">
          <input type="text" {...register('nome')} placeholder="Digite o nome do documento" />
        </FormField>
        {duplicado && (
          <div role="alert" style={{ color: '#b45309', fontSize: '0.8rem', margin: '-4px 0 8px' }}>
            Já existe <strong>{duplicado.nome}</strong> neste cluster — talvez você queira usar o existente em vez de criar outro.
          </div>
        )}
        <div className="cadastro-form-row">
          <FormField label="Cluster" required error={errors.clusterId?.message}>
            <Controller name="clusterId" control={control} render={({ field }) => (
              <Select value={field.value} onChange={field.onChange} options={CLUSTER_OPCOES} placeholder="Selecione o cluster..." hasError={!!errors.clusterId} />
            )} />
          </FormField>
          <div />
        </div>
        <div className="cadastro-form-row">
          <FormField label="Tipo" tooltip={dica('documentos.form.tipo')} dataTour="modal-campo-2">
            <Controller name="tipo" control={control} render={({ field }) => (
              <Select value={field.value} onChange={field.onChange} options={TIPO_OPCOES} placeholder="Selecione..." />
            )} />
          </FormField>
          <FormField label="Formato" tooltip={dica('documentos.form.formato')}>
            <Controller name="formato" control={control} render={({ field }) => (
              <Select
                value={field.value}
                onChange={(vv) => { field.onChange(vv); const d = deriveEstruturado(vv); if (d) setValue('estruturado', d, { shouldDirty: true }); }}
                options={FORMATO_SELECT_OPCOES}
                placeholder="Selecione..."
              />
            )} />
          </FormField>
        </div>
        <div className="cadastro-form-row">
          <FormField label="Origem" tooltip={dica('documentos.form.origem')}>
            <Controller name="origem" control={control} render={({ field }) => (
              <Select value={field.value} onChange={field.onChange} options={ORIGEM_OPCOES} />
            )} />
          </FormField>
          <FormField label="Estruturado" tooltip={dica('documentos.form.estruturado')}>
            <Controller name="estruturado" control={control} render={({ field }) => (
              <Select value={field.value} onChange={field.onChange} options={ESTRUTURADO_SELECT_OPCOES} placeholder="Selecione..." />
            )} />
          </FormField>
        </div>
        <FormField label="Descrição" tooltip={dica('documentos.form.descricao')}>
          <textarea className="cadastro-form-textarea" {...register('estrutura')} placeholder="Descrição do documento e como é usado no processo" rows={4} />
        </FormField>

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={requestClose}>Cancelar</button>
          <button type="submit" className="btn-save" data-tour="modal-salvar" disabled={isSubmitting || !!duplicado}>{isSubmitting ? 'Salvando...' : 'Salvar'}</button>
        </div>
        <ConfirmarDescarte open={confirmSair} onContinuar={() => setConfirmSair(false)} onDescartar={() => { setConfirmSair(false); onClose(); }} />
      </form>
    </Modal>
  );
}
