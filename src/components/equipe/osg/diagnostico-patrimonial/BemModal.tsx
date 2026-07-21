import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { useDirtyClose } from '@/components/equipe/osg/useDirtyClose';
import { UnsavedChangesAlert } from '@/components/equipe/osg/UnsavedChangesAlert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { osgTabsListCls, osgTabTriggerCls } from '@/components/equipe/osg/formKit';
import { useDeleteMatricula, useMatriculasByBem, useSetMatriculaBem, useUpsertBem, type BemRow, type MatriculaRow } from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { HistoricoFlutuante } from '@/components/equipe/osg/HistoricoFlutuante';
import { DocumentosTab } from '@/components/equipe/osg/documentos/DocumentosTab';
import { useClienteTemDocumentoGerado } from '@/hooks/useDocumentoGerado';
import { MatriculaModal } from '@/components/equipe/osg/diagnostico-patrimonial/MatriculaModal';
import { TitularidadesPanel } from '@/components/equipe/osg/diagnostico-patrimonial/TitularidadesPanel';
import { VincularMatriculaDialog } from '@/components/equipe/osg/diagnostico-patrimonial/VincularMatriculaDialog';
import { BemDadosTab } from '@/components/equipe/osg/diagnostico-patrimonial/bem/BemDadosTab';
import { TitularInicialSection } from '@/components/equipe/osg/diagnostico-patrimonial/titularidade/TitularInicialSection';
import { bemDraftToValues, bemToDraft, emptyBemDraft, emptyTitularInicial, parseTitularInicial, type DraftBem } from '@/lib/diagnosticoPatrimonialModalModels';

interface BemModalProps { open: boolean; clienteId: string; bem: BemRow | null; pessoasCliente: PessoaRow[]; onClose: () => void; }

export function BemModal({ open, clienteId, bem, pessoasCliente, onClose }: BemModalProps) {
  const [draft, setDraft] = useState<DraftBem>(emptyBemDraft);
  const [titularInicial, setTitularInicial] = useState(emptyTitularInicial);
  const [activeTab, setActiveTab] = useState('dados');
  const [matriculaModal, setMatriculaModal] = useState<{ open: boolean; matricula: MatriculaRow | null }>({ open: false, matricula: null });
  const [vincularOpen, setVincularOpen] = useState(false);
  const upsert = useUpsertBem();
  const { data: matriculas = [], isLoading: loadingMatriculas } = useMatriculasByBem(bem?.id ?? null);
  const deleteMatricula = useDeleteMatricula();
  const setMatriculaBem = useSetMatriculaBem();
  const isEdit = !!bem?.id;
  const isImovel = draft.tipo_bem === 'IR' || draft.tipo_bem === 'IB';
  const temTitularidade = !isImovel;
  const semPessoas = pessoasCliente.length === 0;
  const { data: temDocumento = false } = useClienteTemDocumentoGerado(isEdit ? clienteId : null);
  const mostrarHistorico = isEdit && temDocumento;
  const mostrarTabsList = temTitularidade || isEdit;
  const initialDraftRef = useRef('');
  const initialTitularRef = useRef('');

  useEffect(() => {
    if (!open) return;
    const nextDraft = bem ? bemToDraft(bem) : emptyBemDraft();
    const nextTitular = emptyTitularInicial();
    setDraft(nextDraft); setTitularInicial(nextTitular); setActiveTab('dados');
    initialDraftRef.current = JSON.stringify(nextDraft);
    initialTitularRef.current = JSON.stringify(nextTitular);
  }, [open, bem]);

  const isDirty = JSON.stringify(draft) !== initialDraftRef.current || (!isEdit && temTitularidade && JSON.stringify(titularInicial) !== initialTitularRef.current);
  const { requestClose, alertProps } = useDirtyClose({ isDirty, onClose });
  const handleSave = () => {
    if (!draft.referencia_dp.trim()) { toast.error('Referência DP é obrigatória'); return; }
    if (!draft.denominacao.trim()) { toast.error('Denominação é obrigatória'); return; }
    if (draft.tipo_bem === 'OU' && !draft.descricao_outros.trim()) { toast.error('Especifique o tipo de bem'); return; }
    if (!isImovel && (!draft.vlr_contabil.trim() || Number.isNaN(Number(draft.vlr_contabil)))) { toast.error('Valor contábil é obrigatório'); return; }
    let titular;
    if (temTitularidade && !isEdit) {
      if (!titularInicial.titular_pessoa_id) { setActiveTab('titulares'); toast.error('Selecione o titular inicial do bem'); return; }
      titular = parseTitularInicial(titularInicial) ?? undefined;
      if (!titular) { toast.error('Fração do titular deve estar entre 0 e 100'); return; }
    }
    upsert.mutate({ values: bemDraftToValues(draft, clienteId), original: bem, titular }, { onSuccess: onClose });
  };

  return <>
    <Dialog open={open} onOpenChange={(value) => !value && requestClose()}><DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-visible p-0 sm:[clip-path:none]">
      <Tabs value={mostrarTabsList ? activeTab : 'dados'} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 rounded-t-lg bg-background px-6 pt-5"><DialogHeader className="mb-4 space-y-0 text-left"><DialogTitle className="flex items-center gap-2.5 text-base font-semibold">{isEdit ? 'Editar bem' : 'Novo bem'}{isEdit && bem?.referencia_dp && <span className="rounded-md bg-osg-50 px-2 py-0.5 font-mono text-sm font-semibold text-osg-700">{bem.referencia_dp}</span>}</DialogTitle></DialogHeader>
          {mostrarTabsList && <TabsList className={`${osgTabsListCls}${temTitularidade ? ' animate-in fade-in slide-in-from-top-2 duration-300' : ''}`}><TabsTrigger value="dados" className={osgTabTriggerCls}>Dados</TabsTrigger>{temTitularidade && <TabsTrigger value="titulares" className={osgTabTriggerCls}>Titularidade{!isEdit && !titularInicial.titular_pessoa_id && <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5" aria-hidden><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-osg-moss opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-osg-moss" /></span>}</TabsTrigger>}<TabsTrigger value="documentos" disabled={!isEdit} className={osgTabTriggerCls}>Documentos</TabsTrigger></TabsList>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <TabsContent value="dados" className="mt-0 focus-visible:ring-0"><BemDadosTab draft={draft} onChange={setDraft} pessoas={pessoasCliente} isEdit={isEdit} loadingMatriculas={loadingMatriculas} matriculas={matriculas} onLink={() => setVincularOpen(true)} onAdd={() => setMatriculaModal({ open: true, matricula: null })} onEdit={(matricula) => setMatriculaModal({ open: true, matricula })} onUnlink={(matricula) => setMatriculaBem.mutate({ matricula, bemId: null })} onDelete={(matricula) => deleteMatricula.mutate(matricula)} /></TabsContent>
          <TabsContent value="titulares" className="mt-0 focus-visible:ring-0">{isEdit && bem ? <TitularidadesPanel anchor={{ kind: 'bem', id: bem.id }} pessoasCliente={pessoasCliente} requireAtLeastOne /> : <TitularInicialSection entity="bem" pessoas={pessoasCliente} value={titularInicial} onChange={setTitularInicial} />}</TabsContent>
          <TabsContent value="documentos" className="mt-0 focus-visible:ring-0">{isEdit && bem?.id && <DocumentosTab clienteId={clienteId} vinculo={{ bemId: bem.id }} categoriaPadrao="bens_direitos" />}</TabsContent>
        </div>
        <DialogFooter className="shrink-0 rounded-b-lg border-t border-osg-100 bg-background px-6 py-3.5"><Button variant="outline" onClick={requestClose} disabled={upsert.isPending}>Cancelar</Button><Button onClick={handleSave} disabled={upsert.isPending || (temTitularidade && !isEdit && semPessoas)} className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90">{upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{isEdit ? 'Salvar alterações' : 'Cadastrar bem'}</Button></DialogFooter>
      </Tabs>{mostrarHistorico && bem && <HistoricoFlutuante entityIds={[bem.id]} />}
    </DialogContent></Dialog>
    {bem && <MatriculaModal open={matriculaModal.open} bemId={bem.id} bemTipo={bem.tipo_bem} matricula={matriculaModal.matricula} pessoasCliente={pessoasCliente} matriculasDoBem={matriculas} onClose={() => setMatriculaModal({ open: false, matricula: null })} />}
    {bem && <VincularMatriculaDialog open={vincularOpen} bemId={bem.id} clienteId={clienteId} onClose={() => setVincularOpen(false)} />}
    <UnsavedChangesAlert {...alertProps} />
  </>;
}
