import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { useDirtyClose } from '@/components/equipe/osg/useDirtyClose';
import { UnsavedChangesAlert } from '@/components/equipe/osg/UnsavedChangesAlert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { osgTabsListCls, osgTabTriggerCls } from '@/components/equipe/osg/formKit';
import { formScopeCls } from '@/lib/osgFormGrid';
import { DocumentosTab } from '@/components/equipe/osg/documentos/DocumentosTab';
import { useTitularidadesByMatricula, useUpsertMatricula, type MatriculaInsert, type MatriculaRow, type TitularInicial } from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { HistoricoFlutuante } from '@/components/equipe/osg/HistoricoFlutuante';
import { useClienteTemDocumentoGerado } from '@/hooks/useDocumentoGerado';
import { TitularidadesPanel } from '@/components/equipe/osg/diagnostico-patrimonial/TitularidadesPanel';
import { ImpedimentosPanel } from '@/components/equipe/osg/diagnostico-patrimonial/impedimentos/ImpedimentosPanel';
import { MatriculaDadosTab } from '@/components/equipe/osg/diagnostico-patrimonial/matricula/MatriculaDadosTab';
import { TitularInicialSection } from '@/components/equipe/osg/diagnostico-patrimonial/titularidade/TitularInicialSection';
import { emptyMatriculaDraft, emptyTitularInicial, matriculaDraftToValues, matriculaToDraft, parseTitularInicial, type DraftMatricula, type TitularInicialDraft } from '@/lib/diagnosticoPatrimonialModalModels';

/**
 * Rascunho emprestado — ver `PessoaRascunhoExterno` em PessoaModal para o porquê:
 * quem abre já tem o formulário preenchido fora do modal e grava por conta
 * própria (precisa vincular a leva de arquivos junto). Sem esta prop o modal
 * continua autossuficiente, como nas telas que já o usam.
 */
export interface MatriculaRascunhoExterno {
  draft: DraftMatricula;
  titular: TitularInicialDraft;
  /** Substitui o upsert interno: recebe o payload já validado por estas mesmas regras. */
  onSalvar: (values: MatriculaInsert, titular?: TitularInicial) => void;
  /** Devolve o que foi digitado aqui dentro — fechar não pode perder uma letra. */
  onDevolver: (draft: DraftMatricula, titular: TitularInicialDraft) => void;
  /** Rótulo do botão de gravar: quem abriu diz o que o clique vai fazer de verdade. */
  rotuloSalvar: string;
}

interface MatriculaModalProps {
  open: boolean;
  bemId: string | null;
  bemTipo: string | null;
  matricula: MatriculaRow | null;
  pessoasCliente: PessoaRow[];
  matriculasDoBem: MatriculaRow[];
  onClose: () => void;
  rascunhoExterno?: MatriculaRascunhoExterno;
}

export function MatriculaModal({ open, bemId, bemTipo, matricula, pessoasCliente, matriculasDoBem, onClose, rascunhoExterno }: MatriculaModalProps) {
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
  // Lido SÓ na abertura: enquanto está aberto, o modal é o dono do formulário. A
  // ref evita que uma identidade nova do objeto (a cada render de quem abriu)
  // reinicie o que já foi digitado aqui dentro.
  const externoRef = useRef(rascunhoExterno);
  externoRef.current = rascunhoExterno;

  useEffect(() => {
    if (!open) return;
    const defaultTipo = bemTipo === 'IR' || bemTipo === 'IB' ? bemTipo : '';
    // Emprestar rascunho só faz sentido em cadastro novo — editar carrega da linha.
    const emprestado = matricula ? undefined : externoRef.current;
    const nextDraft = matricula ? matriculaToDraft(matricula) : emprestado?.draft ?? emptyMatriculaDraft(defaultTipo);
    const nextTitular = emprestado?.titular ?? emptyTitularInicial();
    setDraft(nextDraft); setTitularInicial(nextTitular); setActiveTab('dados');
    initialDraftRef.current = JSON.stringify(nextDraft);
    initialTitularRef.current = JSON.stringify(nextTitular);
  }, [open, matricula, bemTipo]);

  const isDirty = JSON.stringify(draft) !== initialDraftRef.current || (!isEdit && JSON.stringify(titularInicial) !== initialTitularRef.current);
  const fechar = () => {
    rascunhoExterno?.onDevolver(draft, titularInicial);
    onClose();
  };
  // Com rascunho emprestado nada se perde ao fechar (volta para quem abriu), então
  // o aviso de "descartar alterações?" não tem o que avisar.
  const { requestClose, alertProps } = useDirtyClose({ isDirty: rascunhoExterno ? false : isDirty, onClose: fechar });

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
    if (rascunhoExterno) {
      // Quem abriu grava: criar a matrícula é só metade do que o clique promete.
      rascunhoExterno.onSalvar(matriculaDraftToValues(draft, bemId, matricula, bemTipo), titular);
      fechar();
      return;
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
          {/* `formScopeCls`: as grades do formulário medem ESTE contêiner (848px aqui),
                não a janela — ver formKit. Mantém o modal largo como era. */}
            <div className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 ${formScopeCls}`}>
            <TabsContent value="dados" className="mt-0 focus-visible:ring-0"><MatriculaDadosTab draft={draft} onChange={setDraft} bemTipo={bemTipo} matricula={matricula} matriculasDoBem={matriculasDoBem} /></TabsContent>
            <TabsContent value="titulares" className="mt-0 focus-visible:ring-0">{isEdit && matricula ? <TitularidadesPanel anchor={{ kind: 'matricula', id: matricula.id }} pessoasCliente={pessoasCliente} requireAtLeastOne /> : <TitularInicialSection entity="matrícula" pessoas={pessoasCliente} value={titularInicial} onChange={setTitularInicial} />}</TabsContent>
            <TabsContent value="impedimentos" className="mt-0 focus-visible:ring-0">{isEdit && matricula && <ImpedimentosPanel matriculaId={matricula.id} areaUnidade={matricula.area_unidade} pessoasCliente={pessoasCliente} />}</TabsContent>
            <TabsContent value="documentos" className="mt-0 focus-visible:ring-0">{isEdit && matricula && <DocumentosTab clienteId={clienteId} vinculo={{ matriculaId: matricula.id, bemId: bemId ?? null }} categoriaPadrao="agrarios" nrMatricula={matricula.numero} />}</TabsContent>
          </div>
          <DialogFooter className="shrink-0 rounded-b-lg border-t border-osg-100 bg-background px-6 py-3.5"><Button variant="outline" onClick={requestClose} disabled={upsert.isPending}>Cancelar</Button><Button onClick={handleSave} disabled={upsert.isPending || (!isEdit && semPessoas)} className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90">{upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{rascunhoExterno?.rotuloSalvar ?? (isEdit ? 'Salvar alterações' : 'Cadastrar matrícula')}</Button></DialogFooter>
        </Tabs>
        {mostrarHistorico && matricula && <HistoricoFlutuante entityIds={[matricula.id, ...titularidades.map((item) => item.id)]} />}
      </DialogContent>
    </Dialog>
    <UnsavedChangesAlert {...alertProps} />
  </>;
}
