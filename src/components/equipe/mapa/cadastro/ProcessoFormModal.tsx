// Form unificado de Processo (criar/editar) — padrão "Cadastro Puro".
// `processo === null` ⇒ criação; caso contrário, edição pré-preenchida.
// O mapeamento de etapas/ROI vive em /processos/:id/mapear — aqui só metadados.
//
// Padrão-ouro: react-hook-form + zod + UPDATE por DIFF (só os campos alterados).
// O processo HERDA o cluster do projeto (no create e quando o projeto muda).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import { dica } from '@/utils/tooltips';
import type { Processo, StatusAvaliacao } from '@/types';
import { useProjetosLista } from '@/hooks/useDominioListas';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';
import { useCreateProcesso, useUpdateProcesso, useDeleteProcesso } from '@/hooks/useProcessos';
import {
  STATUS_AVALIACAO_OPCOES, COMPLEXIDADE_OPCOES, normalizarComplexidade,
} from '@/components/equipe/mapa/cadastros/processoOpcoes';
import ConfirmarDescarte from '@/components/equipe/mapa/ConfirmarDescarte';

interface Props {
  aberto: boolean;
  processo: Processo | null;
  /** Código visual do processo (ex.: P5.01) — exibido no cabeçalho, como no detalhe. */
  codigo?: string;
  /** Projeto pré-selecionado ao CRIAR (ex.: abrir a partir do painel do projeto). */
  projetoIdInicial?: string;
  onClose: () => void;
}

const schema = z.object({
  nome: z.string().trim().min(1, 'Preencha o nome do processo.'),
  projetoId: z.string().min(1, 'Vincule o processo a um projeto.'),
  descricao: z.string(),
  volumeAnual: z.string(),
  statusAvaliacao: z.string(),
  complexidade: z.string(),
});
type FormValues = z.infer<typeof schema>;
const EMPTY: FormValues = { nome: '', projetoId: '', descricao: '', volumeAnual: '', statusAvaliacao: 'Não avaliado', complexidade: '' };

export default function ProcessoFormModal({ aberto, processo, codigo, projetoIdInicial, onClose }: Props) {
  const createProcesso = useCreateProcesso();
  const updateProcesso = useUpdateProcesso();
  const deleteProcesso = useDeleteProcesso();
  const { data: projetos = [] } = useProjetosLista();
  const { cluster } = useClusterGlobal();

  const {
    handleSubmit, control, reset, watch, setError,
    formState: { errors, dirtyFields, isDirty, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const [confirmSair, setConfirmSair] = useState(false);
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const hidratado = useRef(false);
  useEffect(() => {
    if (!aberto) { hidratado.current = false; setConfirmSair(false); return; }
    if (hidratado.current) return;
    hidratado.current = true;
    if (processo) {
      reset({
        nome: processo.name,
        projetoId: processo.project_id || '',
        descricao: processo.description || '',
        volumeAnual: processo.volume_executions != null ? String(processo.volume_executions) : '',
        statusAvaliacao: processo.evaluation_status || 'Não avaliado',
        complexidade: normalizarComplexidade(processo.complexity_level),
      });
    } else {
      reset({ ...EMPTY, projetoId: projetoIdInicial || '' });
    }
  }, [aberto, processo, projetoIdInicial, reset]);

  const projetoId = watch('projetoId');
  // Opções de projeto filtradas pelo cluster do ambiente; mantém o projeto já
  // vinculado ao processo em edição mesmo que seja de outro cluster.
  const projetoOpcoes = useMemo(() =>
    projetos
      .filter(p => !cluster || p.cluster_id === cluster || p.id === projetoId)
      .map(p => ({ value: p.id, label: p.name })),
    [projetos, cluster, projetoId],
  );

  const requestClose = () => { if (isDirty) setConfirmSair(true); else onClose(); };

  const excluir = async () => {
    if (!processo) return;
    setExcluindo(true);
    try {
      await deleteProcesso.mutateAsync({ id: processo.id, old: processo });
      toast.success('Processo excluído');
      setConfirmExcluir(false);
      onClose();  // o processo não existe mais: fecha o form junto
    } catch (err) {
      toast.error('Erro ao excluir processo', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setExcluindo(false);
    }
  };

  const onSubmit = async (v: FormValues) => {
    // O processo herda o cluster do projeto (senão nasce sem cluster e some da lista).
    const clusterDoProjeto = projetos.find(p => p.id === v.projetoId)?.cluster_id ?? null;
    // null (não undefined) ao limpar: undefined some do JSON do PATCH e a coluna
    // nunca é zerada no banco (o valor antigo persiste e continua no ROI).
    const volume = v.volumeAnual.trim() !== '' ? Number(v.volumeAnual) : null;
    try {
      if (processo) {
        // UPDATE por DIFF: só os campos alterados. Se o projeto mudou, o cluster acompanha.
        const patch: Partial<Processo> = {};
        if (dirtyFields.nome) patch.name = v.nome.trim();
        if (dirtyFields.descricao) patch.description = v.descricao.trim();
        if (dirtyFields.projetoId) { patch.project_id = v.projetoId; patch.cluster_id = clusterDoProjeto; }
        if (dirtyFields.volumeAnual) patch.volume_executions = volume;
        if (dirtyFields.statusAvaliacao) patch.evaluation_status = v.statusAvaliacao as StatusAvaliacao;
        if (dirtyFields.complexidade) patch.complexity_level = normalizarComplexidade(v.complexidade) || null;
        if (Object.keys(patch).length > 0) {
          await updateProcesso.mutateAsync({ id: processo.id, old: processo, patch });
        }
        toast.success('Processo atualizado');
      } else {
        await createProcesso.mutateAsync({
          name: v.nome.trim(),
          description: v.descricao.trim(),
          project_id: v.projetoId,
          cluster_id: clusterDoProjeto,
          volume_executions: volume,
          evaluation_status: v.statusAvaliacao as StatusAvaliacao,
          complexity_level: normalizarComplexidade(v.complexidade) || null,
        } as never);
        toast.success('Processo criado');
      }
      onClose();
    } catch (err) {
      setError('root', { message: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <Modal isOpen={aberto} onClose={requestClose} tourId="modal-processo-form">
      <form className="modal modal-wide processo-det processo-form" onSubmit={handleSubmit(onSubmit)}>
        <header className="processo-det-head">
          <div className="processo-det-head-main">
            {processo ? (
              <>
                <div className="processo-det-topo">
                  {codigo && <span className="processo-code processo-code-lg">{codigo}</span>}
                  <h2>{processo.name}</h2>
                </div>
                <p className="processo-form-sub">Editar processo</p>
              </>
            ) : (
              <>
                <p className="processo-form-eyebrow">Cadastro</p>
                <h2>Novo Processo</h2>
              </>
            )}
          </div>
          <div className="processo-det-acoes">
            {/* Na edição, o lugar do "Cancelar" é do excluir: o "Sair" do modal
                já fecha. Na criação não há o que excluir, então segue Cancelar. */}
            {processo ? (
              <button
                type="button"
                className="btn-cancel"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  whiteSpace: 'nowrap', color: '#b91c1c', borderColor: '#fecaca',
                }}
                onClick={() => setConfirmExcluir(true)}
              >
                <Trash2 size={14} strokeWidth={2.2} aria-hidden="true" style={{ flexShrink: 0 }} />
                Excluir
              </button>
            ) : (
              <button type="button" className="btn-cancel" onClick={requestClose}>Cancelar</button>
            )}
            <button type="submit" className="cadastro-cta" disabled={isSubmitting} data-tour="modal-salvar">
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </header>

        <div className="processo-det-body">
          <div className="cadastro-form-secao">Identificação</div>
          <FormField label="Nome" error={errors.nome?.message || errors.root?.message} required tooltip={dica('processos.form.nome')} dataTour="modal-campo-1">
            <input type="text" {...control.register('nome')} placeholder="Digite o nome do processo" />
          </FormField>
          <FormField label="Descrição" tooltip={dica('processos.form.descricao')}>
            <textarea className="cadastro-form-textarea" {...control.register('descricao')} placeholder="O que o processo faz e onde se encaixa" rows={4} />
          </FormField>

          <div className="cadastro-form-secao">Classificação</div>
          <FormField label="Projeto" required error={errors.projetoId?.message} tooltip={dica('processos.form.projeto')} dataTour="modal-campo-2">
            <Controller name="projetoId" control={control} render={({ field }) => (
              <Select value={field.value} onChange={field.onChange} options={projetoOpcoes} placeholder="Selecione o projeto..." hasError={!!errors.projetoId} />
            )} />
          </FormField>
          <div className="cadastro-form-row">
            <FormField label="Volume Anual (execuções/ano)" tooltip={dica('processos.form.frequency')}>
              <input type="number" min={0} step="1" {...control.register('volumeAnual')} placeholder="Ex.: 20 (nº de projetos/execuções por ano)" />
            </FormField>
            <FormField label="Complexidade" tooltip={dica('processos.form.complexity_level')}>
              <Controller name="complexidade" control={control} render={({ field }) => (
                <Select value={normalizarComplexidade(field.value)} onChange={(v) => field.onChange(normalizarComplexidade(v))} options={COMPLEXIDADE_OPCOES} />
              )} />
            </FormField>
          </div>
          <div className="cadastro-form-row">
            <FormField label="Status de avaliação" tooltip={dica('processos.form.evaluation_status')}>
              <Controller name="statusAvaliacao" control={control} render={({ field }) => (
                <Select value={field.value} onChange={field.onChange} options={STATUS_AVALIACAO_OPCOES} />
              )} />
            </FormField>
            <div />
          </div>
        </div>
        <ConfirmarDescarte open={confirmSair} onContinuar={() => setConfirmSair(false)} onDescartar={() => { setConfirmSair(false); onClose(); }} />
        {/* Overlay inline (não Modal aninhado) e botões type="button": o Modal
            deste repo não usa portal, então um submit aqui dentro enviaria o form. */}
        {confirmExcluir && processo && (
          <div className="mapear-confirm-sair" role="alertdialog" aria-modal="true">
            <div className="mapear-confirm-card">
              <h3>Excluir processo</h3>
              <p>
                Tem certeza que deseja excluir <strong>{processo.name}</strong>? As etapas e o
                mapeamento (Como Era e Como Ficou) deste processo serão removidos.
                Esta ação não pode ser desfeita.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setConfirmExcluir(false)} disabled={excluindo}>
                  Manter processo
                </button>
                <button type="button" className="btn-save" style={{ background: '#b91c1c' }} onClick={excluir} disabled={excluindo}>
                  {excluindo ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
