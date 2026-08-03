import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { HistoricoFlutuante } from '@/components/equipe/osg/HistoricoFlutuante';
import { UnsavedChangesAlert } from '@/components/equipe/osg/UnsavedChangesAlert';
import { DocumentosTab } from '@/components/equipe/osg/documentos/DocumentosTab';
import { osgTabsListCls, osgTabTriggerCls } from '@/components/equipe/osg/formKit';
import { formScopeCls } from '@/lib/osgFormGrid';
import { AdministracaoPanel } from '@/components/equipe/osg/qualificacao-das-partes/pessoa/AdministracaoPanel';
import {
  PessoaDadosTab,
  type ParentescoDraft,
} from '@/components/equipe/osg/qualificacao-das-partes/pessoa/PessoaDadosTab';
import { useDirtyClose } from '@/components/equipe/osg/useDirtyClose';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClienteTemDocumentoGerado } from '@/hooks/useDocumentoGerado';
import {
  useDeleteParentesco,
  useParentescosByCliente,
  useUpsertParentesco,
  useUpsertPessoa,
  type PessoaRow,
  type TipoPessoa,
} from '@/hooks/useQualificacaoDasPartes';
import {
  buildPessoaPayload,
  emptyPessoaDraft,
  pessoaToDraft,
  type PessoaDraft,
} from '@/lib/pessoaModalModel';

interface PessoaModalProps {
  open: boolean;
  clienteId: string;
  pessoa: PessoaRow | null;
  pessoasCliente: PessoaRow[];
  defaultTipo?: TipoPessoa;
  onClose: () => void;
}

const emptyParentesco = (): ParentescoDraft => ({ parenteId: '', tipo: '', natureza: '' });

export function PessoaModal({ open, clienteId, pessoa, pessoasCliente, defaultTipo, onClose }: PessoaModalProps) {
  const [draft, setDraft] = useState<PessoaDraft>(emptyPessoaDraft);
  const [parentescoDraft, setParentescoDraft] = useState<ParentescoDraft>(emptyParentesco);
  const [activeTab, setActiveTab] = useState('dados');
  const initialDraftRef = useRef('');
  const initialParentescoRef = useRef('');
  const upsert = useUpsertPessoa();
  const upsertParentesco = useUpsertParentesco();
  const deleteParentesco = useDeleteParentesco();
  const { data: parentescosCliente = [] } = useParentescosByCliente(open ? clienteId : null);
  const isPF = draft.tipo_pessoa === 'PF';
  const isEdit = Boolean(pessoa?.id);
  const parentescoAtual = pessoa?.id
    ? parentescosCliente.find((vinculo) => vinculo.pessoa_id === pessoa.id) ?? null
    : null;
  const { data: temDocumento = false } = useClienteTemDocumentoGerado(isEdit ? clienteId : null);

  useEffect(() => {
    if (!open) return;
    const initial = pessoa
      ? pessoaToDraft(pessoa)
      : { ...emptyPessoaDraft(), tipo_pessoa: defaultTipo ?? 'PF' };
    setDraft(initial);
    initialDraftRef.current = JSON.stringify(initial);
    setActiveTab('dados');
  }, [open, pessoa, defaultTipo]);

  useEffect(() => {
    if (!open) return;
    const initial = parentescoAtual ? {
      parenteId: parentescoAtual.parente_pessoa_id,
      tipo: parentescoAtual.tipo ?? '',
      natureza: parentescoAtual.natureza ?? '',
    } : emptyParentesco();
    setParentescoDraft(initial);
    initialParentescoRef.current = JSON.stringify(initial);
    // O id identifica a versão carregada do vínculo sem reagir a novas identidades do array da query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pessoa?.id, parentescoAtual?.id]);

  const isDirty = JSON.stringify(draft) !== initialDraftRef.current
    || JSON.stringify(parentescoDraft) !== initialParentescoRef.current;
  const { requestClose, alertProps } = useDirtyClose({ isDirty, onClose });

  const reconcileParentesco = async (pessoaId: string) => {
    if (parentescoDraft.parenteId) {
      await upsertParentesco.mutateAsync({
        values: {
          pessoa_id: pessoaId,
          parente_pessoa_id: parentescoDraft.parenteId,
          tipo: parentescoDraft.tipo || null,
          natureza: parentescoDraft.natureza || null,
        },
        original: parentescoAtual,
        clienteId,
      });
    } else if (parentescoAtual) {
      await deleteParentesco.mutateAsync({ row: parentescoAtual, clienteId });
    }
  };

  const handleSave = () => {
    if (!draft.denominacao.trim()) {
      toast.error(isPF ? 'Nome completo é obrigatório' : 'Razão social é obrigatória');
      return;
    }
    const documentDigits = draft.cpf_cnpj.replace(/\D/g, '');
    if (documentDigits && isPF && documentDigits.length !== 11) {
      toast.error('CPF deve ter 11 dígitos');
      return;
    }
    if (documentDigits && !isPF && documentDigits.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos');
      return;
    }
    upsert.mutate(
      { values: buildPessoaPayload(draft, clienteId), original: pessoa },
      { onSuccess: async (result) => {
        if (isPF) await reconcileParentesco(result.row.id);
        onClose();
      } },
    );
  };

  const pessoaCandidates = pessoasCliente.filter((candidate) => candidate.tipo_pessoa === 'PF' && candidate.id !== pessoa?.id);
  const parenteCandidates = pessoaCandidates.filter((candidate) => candidate.is_fundador || candidate.id === parentescoDraft.parenteId);
  const mostrarTabsList = !isPF || isEdit;
  const pending = upsert.isPending || upsertParentesco.isPending || deleteParentesco.isPending;
  const historyIds = [pessoa?.id, parentescoAtual?.id].filter((id): id is string => Boolean(id));

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && requestClose()}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-visible p-0 sm:[clip-path:none]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 rounded-t-lg bg-background px-6 pt-5">
              <DialogHeader className={`space-y-0 text-left ${mostrarTabsList ? 'mb-4' : ''}`}>
                <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
                  {isEdit ? 'Editar pessoa' : 'Nova pessoa'}
                  <span className="rounded-md bg-osg-50 px-2 py-0.5 text-xs font-semibold text-osg-700">{isPF ? 'Pessoa Física' : 'Pessoa Jurídica'}</span>
                </DialogTitle>
              </DialogHeader>
              {mostrarTabsList && (
                <TabsList className={osgTabsListCls}>
                  <TabsTrigger value="dados" className={osgTabTriggerCls}>Dados</TabsTrigger>
                  {!isPF && <TabsTrigger value="administracao" disabled={!isEdit} className={osgTabTriggerCls}>Administração</TabsTrigger>}
                  <TabsTrigger value="documentos" disabled={!isEdit} className={osgTabTriggerCls}>Documentos</TabsTrigger>
                </TabsList>
              )}
            </div>
            {/* `formScopeCls`: as grades do formulário medem ESTE contêiner (848px aqui),
                não a janela — ver formKit. Mantém o modal largo como era. */}
            <div className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 ${formScopeCls}`}>
              <TabsContent value="dados" className="mt-0 focus-visible:ring-0">
                <PessoaDadosTab
                  draft={draft}
                  setDraft={setDraft}
                  pessoaCandidates={pessoaCandidates}
                  parenteCandidates={parenteCandidates}
                  parentesco={parentescoDraft}
                  setParentesco={setParentescoDraft}
                />
              </TabsContent>
              <TabsContent value="administracao" className="mt-0 focus-visible:ring-0">
                {!isPF && isEdit && pessoa && <AdministracaoPanel pjPessoaId={pessoa.id} pessoasCliente={pessoasCliente} />}
              </TabsContent>
              <TabsContent value="documentos" className="mt-0 focus-visible:ring-0">
                {isEdit && pessoa?.id && <DocumentosTab clienteId={clienteId} vinculo={{ pessoaId: pessoa.id }} categoriaPadrao="pessoais" />}
              </TabsContent>
            </div>
            <DialogFooter className="shrink-0 rounded-b-lg border-t border-osg-100 bg-background px-6 py-3.5">
              <Button variant="outline" onClick={requestClose} disabled={upsert.isPending}>Cancelar</Button>
              <Button onClick={handleSave} disabled={pending} className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90">
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEdit ? 'Salvar alterações' : 'Cadastrar pessoa'}
              </Button>
            </DialogFooter>
          </Tabs>
          {isEdit && temDocumento && <HistoricoFlutuante entityIds={historyIds} />}
        </DialogContent>
      </Dialog>
      <UnsavedChangesAlert {...alertProps} />
    </>
  );
}
