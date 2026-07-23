import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { useDirtyClose } from '@/components/equipe/osg/useDirtyClose';
import { UnsavedChangesAlert } from '@/components/equipe/osg/UnsavedChangesAlert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { osgTabsListCls, osgTabTriggerCls } from '@/components/equipe/osg/formKit';
import { DocumentosTab } from '@/components/equipe/osg/documentos/DocumentosTab';
import { useTitularidadesByMatricula, useUpsertMatricula, type MatriculaRow } from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { HistoricoFlutuante } from '@/components/equipe/osg/HistoricoFlutuante';
import { useClienteTemDocumentoGerado } from '@/hooks/useDocumentoGerado';
import { TitularidadesPanel } from '@/components/equipe/osg/diagnostico-patrimonial/TitularidadesPanel';
import { ImpedimentosPanel } from '@/components/equipe/osg/diagnostico-patrimonial/impedimentos/ImpedimentosPanel';
import { MatriculaDadosTab } from '@/components/equipe/osg/diagnostico-patrimonial/matricula/MatriculaDadosTab';
import { TitularInicialSection } from '@/components/equipe/osg/diagnostico-patrimonial/titularidade/TitularInicialSection';
import { emptyMatriculaDraft, emptyTitularInicial, matriculaDraftToValues, matriculaToDraft, parseTitularInicial, type DraftMatricula } from '@/lib/diagnosticoPatrimonialModalModels';

interface MatriculaModalProps {
  open: boolean;
  bemId: string | null;
  bemTipo: string | null;
  matricula: MatriculaRow | null;
  pessoasCliente: PessoaRow[];
  matriculasDoBem: MatriculaRow[];
  onClose: () => void;
}

export function MatriculaModal({ open, bemId, bemTipo, matricula, pessoasCliente, matriculasDoBem, onClose }: MatriculaModalProps) {
  const [draft, setDraft] = useState<DraftMatricula>(emptyMatriculaDraft);
  const [titularInicial, setTitularInicial] = useState(emptyTitularInicial);
  const [activeTab, setActiveTab] = useState('dados');
  const upsert = useUpsertMatricula();
  const isEdit = !!matricula?.id;
  const semPessoas = pessoasCliente.length === 0;
  const { clienteId } = useOsgWork();
  const { data: temDocumento = false } = useClienteTemDocumentoGerado(isEdit ? clienteId || null : null);
  const mostrarHistorico = isEdit && temDocumento;
  const { data: titularidades = [] } = useTitularidadesByMatricula(mostrarHistorico && matricula ? matricula.id : null);
  const initialDraftRef = useRef('');
  const initialTitularRef = useRef('');

  useEffect(() => {
    if (!open) return;
    const defaultTipo = bemTipo === 'IR' || bemTipo === 'IB' ? bemTipo : '';
    const nextDraft = matricula ? matriculaToDraft(matricula) : emptyMatriculaDraft(defaultTipo);
    const nextTitular = emptyTitularInicial();
    setDraft(nextDraft); setTitularInicial(nextTitular); setActiveTab('dados');
    initialDraftRef.current = JSON.stringify(nextDraft);
    initialTitularRef.current = JSON.stringify(nextTitular);
  }, [open, matricula, bemTipo]);

  const isDirty = JSON.stringify(draft) !== initialDraftRef.current || (!isEdit && JSON.stringify(titularInicial) !== initialTitularRef.current);
  const { requestClose, alertProps } = useDirtyClose({ isDirty, onClose });

  const handleSave = () => {
    if (!draft.numero.trim()) { toast.error('Número da matrícula é obrigatório'); return; }
    if (!draft.cartorio_id) { toast.error('Selecione o cartório'); return; }
    if (!draft.municipio_imovel.trim()) { toast.error('Município do imóvel é obrigatório'); return; }
    if (!draft.uf_imovel) { toast.error('UF do imóvel é obrigatória'); return; }
    if (!draft.area_documento.trim() || Number.isNaN(Number(draft.area_documento))) { toast.error('Área do documento é obrigatória'); return; }
    let titular;
    if (!isEdit) {
      if (!titularInicial.titular_pessoa_id) { setActiveTab('titulares'); toast.error('Selecione o titular inicial da matrícula'); return; }
      titular = parseTitularInicial(titularInicial) ?? undefined;
      if (!titular) { toast.error('Fração do titular deve estar entre 0 e 100'); return; }
    }
    upsert.mutate({ values: matriculaDraftToValues(draft, bemId, matricula, bemTipo), original: matricula, titular }, { onSuccess: onClose });
  };

  return <>
    <Dialog open={open} onOpenChange={(value) => !value && requestClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-visible p-0 sm:[clip-path:none]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 rounded-t-lg bg-background px-6 pt-5">
            <DialogHeader className="mb-4 space-y-0 text-left"><DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              {isEdit ? 'Editar matrícula' : 'Nova matrícula'}
              {isEdit && matricula?.numero && <span className="rounded-md bg-osg-50 px-2 py-0.5 font-mono text-sm font-semibold text-osg-700">{matricula.numero}</span>}
            </DialogTitle></DialogHeader>
            <TabsList className={osgTabsListCls}>
              <TabsTrigger value="dados" className={osgTabTriggerCls}>Dados</TabsTrigger>
              <TabsTrigger value="titulares" className={osgTabTriggerCls}>Titularidade{!isEdit && !titularInicial.titular_pessoa_id && <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5" aria-hidden><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-osg-moss opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-osg-moss" /></span>}</TabsTrigger>
              <TabsTrigger value="impedimentos" disabled={!isEdit} className={osgTabTriggerCls}>Impedimentos</TabsTrigger>
              <TabsTrigger value="documentos" disabled={!isEdit} className={osgTabTriggerCls}>Documentos</TabsTrigger>
            </TabsList>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <TabsContent value="dados" className="mt-0 focus-visible:ring-0"><MatriculaDadosTab draft={draft} onChange={setDraft} bemTipo={bemTipo} matricula={matricula} matriculasDoBem={matriculasDoBem} /></TabsContent>
            <TabsContent value="titulares" className="mt-0 focus-visible:ring-0">{isEdit && matricula ? <TitularidadesPanel anchor={{ kind: 'matricula', id: matricula.id }} pessoasCliente={pessoasCliente} requireAtLeastOne /> : <TitularInicialSection entity="matrícula" pessoas={pessoasCliente} value={titularInicial} onChange={setTitularInicial} />}</TabsContent>
            <TabsContent value="impedimentos" className="mt-0 focus-visible:ring-0">{isEdit && matricula && <ImpedimentosPanel matriculaId={matricula.id} areaUnidade={matricula.area_unidade} pessoasCliente={pessoasCliente} />}</TabsContent>
            <TabsContent value="documentos" className="mt-0 focus-visible:ring-0">{isEdit && matricula && <DocumentosTab clienteId={clienteId} vinculo={{ matriculaId: matricula.id, bemId: bemId ?? null }} categoriaPadrao="agrarios" nrMatricula={matricula.numero} />}</TabsContent>
          </div>
          <DialogFooter className="shrink-0 rounded-b-lg border-t border-osg-100 bg-background px-6 py-3.5"><Button variant="outline" onClick={requestClose} disabled={upsert.isPending}>Cancelar</Button><Button onClick={handleSave} disabled={upsert.isPending || (!isEdit && semPessoas)} className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90">{upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{isEdit ? 'Salvar alterações' : 'Cadastrar matrícula'}</Button></DialogFooter>
        </Tabs>
        {mostrarHistorico && matricula && <HistoricoFlutuante entityIds={[matricula.id, ...titularidades.map((item) => item.id)]} />}
      </DialogContent>
    </Dialog>
    <UnsavedChangesAlert {...alertProps} />
  </>;
}
