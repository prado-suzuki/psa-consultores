import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { useDirtyClose } from '@/components/equipe/osg/useDirtyClose';
import { UnsavedChangesAlert } from '@/components/equipe/osg/UnsavedChangesAlert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { validarFormulario } from '@/lib/osg/validacaoFormulario';
import { osgTabsListCls, osgTabTriggerCls } from '@/components/equipe/osg/formKit';
import { formScopeCls } from '@/lib/osgFormGrid';
import { useDeleteMatricula, useMatriculasByBem, useSetMatriculaBem, useUpsertBem, type BemInsert, type BemRow, type MatriculaRow, type TitularInicial } from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { HistoricoFlutuante } from '@/components/equipe/osg/HistoricoFlutuante';
import { DocumentosTab } from '@/components/equipe/osg/documentos/DocumentosTab';
import { useClienteTemDocumentoGerado } from '@/hooks/useDocumentoGerado';
import { MatriculaModal } from '@/components/equipe/osg/diagnostico-patrimonial/MatriculaModal';
import { TitularidadesPanel } from '@/components/equipe/osg/diagnostico-patrimonial/TitularidadesPanel';
import { VincularMatriculaDialog } from '@/components/equipe/osg/diagnostico-patrimonial/VincularMatriculaDialog';
import { BemDadosTab } from '@/components/equipe/osg/diagnostico-patrimonial/bem/BemDadosTab';
import { TitularInicialSection } from '@/components/equipe/osg/diagnostico-patrimonial/titularidade/TitularInicialSection';
import { bemDraftToValues, bemToDraft, emptyBemDraft, emptyTitularInicial, parseTitularInicial, type DraftBem, type TitularInicialDraft } from '@/lib/diagnosticoPatrimonialModalModels';

/**
 * Rascunho emprestado — ver `PessoaRascunhoExterno` em PessoaModal para o porquê:
 * quem abre já tem o formulário preenchido fora do modal e grava por conta
 * própria (precisa vincular a leva de arquivos junto). Sem esta prop o modal
 * continua autossuficiente, como nas telas que já o usam.
 */
export interface BemRascunhoExterno {
  draft: DraftBem;
  titular: TitularInicialDraft;
  /** Substitui o upsert interno: recebe o payload já validado por estas mesmas regras. */
  onSalvar: (values: BemInsert, titular?: TitularInicial) => void;
  /** Devolve o que foi digitado aqui dentro — fechar não pode perder uma letra. */
  onDevolver: (draft: DraftBem, titular: TitularInicialDraft) => void;
  /** Rótulo do botão de gravar: quem abriu diz o que o clique vai fazer de verdade. */
  rotuloSalvar: string;
}

interface BemModalProps { open: boolean; clienteId: string; bem: BemRow | null; pessoasCliente: PessoaRow[]; onClose: () => void; rascunhoExterno?: BemRascunhoExterno; }

export function BemModal({ open, clienteId, bem, pessoasCliente, onClose, rascunhoExterno }: BemModalProps) {
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
  // Lido SÓ na abertura: enquanto está aberto, o modal é o dono do formulário. A
  // ref evita que uma identidade nova do objeto (a cada render de quem abriu)
  // reinicie o que já foi digitado aqui dentro.
  const externoRef = useRef(rascunhoExterno);
  externoRef.current = rascunhoExterno;

  useEffect(() => {
    if (!open) return;
    // Emprestar rascunho só faz sentido em cadastro novo — editar carrega da linha.
    const emprestado = bem ? undefined : externoRef.current;
    const nextDraft = bem ? bemToDraft(bem) : emprestado?.draft ?? emptyBemDraft();
    const nextTitular = emprestado?.titular ?? emptyTitularInicial();
    setDraft(nextDraft); setTitularInicial(nextTitular); setActiveTab('dados');
    initialDraftRef.current = JSON.stringify(nextDraft);
    initialTitularRef.current = JSON.stringify(nextTitular);
  }, [open, bem]);

  const isDirty = JSON.stringify(draft) !== initialDraftRef.current || (!isEdit && temTitularidade && JSON.stringify(titularInicial) !== initialTitularRef.current);
  const fechar = () => {
    rascunhoExterno?.onDevolver(draft, titularInicial);
    onClose();
  };
  // Com rascunho emprestado nada se perde ao fechar (volta para quem abriu), então
  // o aviso de "descartar alterações?" não tem o que avisar.
  const { requestClose, alertProps } = useDirtyClose({ isDirty: rascunhoExterno ? false : isDirty, onClose: fechar });
  const handleSave = () => {
    const exigeTitularInicial = temTitularidade && !isEdit;
    const titularEscolhido = exigeTitularInicial ? parseTitularInicial(titularInicial) : null;
    // Uma trilha só de falha: a regra diz o que falta, o utilitário avisa, abre a
    // aba onde o campo mora e leva o foco até ele (ver @/lib/osg/validacaoFormulario).
    const ok = validarFormulario([
      { invalido: !draft.referencia_dp.trim(), mensagem: 'Informe a Referência DP do bem.', aba: 'dados', campo: 'referencia_dp' },
      { invalido: !draft.denominacao.trim(), mensagem: 'Informe a denominação do bem.', aba: 'dados', campo: 'denominacao' },
      { invalido: draft.tipo_bem === 'OU' && !draft.descricao_outros.trim(), mensagem: 'Especifique o tipo de bem.', aba: 'dados', campo: 'descricao_outros' },
      { invalido: !isImovel && (!draft.vlr_contabil.trim() || Number.isNaN(Number(draft.vlr_contabil))), mensagem: 'Informe o valor contábil do bem.', aba: 'dados', campo: 'vlr_contabil' },
      { invalido: exigeTitularInicial && !titularInicial.titular_pessoa_id, mensagem: 'Selecione o titular inicial do bem, na aba Titularidade.', aba: 'titulares', campo: 'titular_pessoa_id' },
      { invalido: exigeTitularInicial && !!titularInicial.titular_pessoa_id && !titularEscolhido, mensagem: 'A fração do titular deve estar entre 0 e 100.', aba: 'titulares', campo: 'titular_fracao' },
    ], { abrirAba: setActiveTab });
    if (!ok) return;
    const titular = titularEscolhido ?? undefined;
    if (rascunhoExterno) {
      // Quem abriu grava: criar o bem é só metade do que o clique promete.
      rascunhoExterno.onSalvar(bemDraftToValues(draft, clienteId), titular);
      fechar();
      return;
    }
    upsert.mutate({ values: bemDraftToValues(draft, clienteId), original: bem, titular }, { onSuccess: onClose });
  };

  return <>
    <Dialog open={open} onOpenChange={(value) => !value && requestClose()}><DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-visible p-0 sm:[clip-path:none]">
      <Tabs value={mostrarTabsList ? activeTab : 'dados'} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 rounded-t-lg bg-background px-6 pt-5"><DialogHeader className="mb-4 space-y-0 text-left"><DialogTitle className="flex items-center gap-2.5 text-base font-semibold">{isEdit ? 'Editar bem' : 'Novo bem'}{isEdit && bem?.referencia_dp && <span className="rounded-md bg-osg-50 px-2 py-0.5 font-mono text-sm font-semibold text-osg-700">{bem.referencia_dp}</span>}</DialogTitle></DialogHeader>
          {mostrarTabsList && <TabsList className={`${osgTabsListCls}${temTitularidade ? ' animate-in fade-in slide-in-from-top-2 duration-300' : ''}`}><TabsTrigger value="dados" className={osgTabTriggerCls}>Dados</TabsTrigger>{temTitularidade && <TabsTrigger value="titulares" className={osgTabTriggerCls}>Titularidade{!isEdit && !titularInicial.titular_pessoa_id && <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5" aria-hidden><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-osg-moss opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-osg-moss" /></span>}</TabsTrigger>}<TabsTrigger value="documentos" disabled={!isEdit} className={osgTabTriggerCls}>Documentos</TabsTrigger></TabsList>}
        </div>
        {/* `formScopeCls`: as grades do formulário medem ESTE contêiner (848px aqui),
                não a janela — ver formKit. Mantém o modal largo como era. */}
            <div className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 ${formScopeCls}`}>
          <TabsContent value="dados" className="mt-0 focus-visible:ring-0"><BemDadosTab draft={draft} onChange={setDraft} pessoas={pessoasCliente} isEdit={isEdit} loadingMatriculas={loadingMatriculas} matriculas={matriculas} onLink={() => setVincularOpen(true)} onAdd={() => setMatriculaModal({ open: true, matricula: null })} onEdit={(matricula) => setMatriculaModal({ open: true, matricula })} onUnlink={(matricula) => setMatriculaBem.mutate({ matricula, bemId: null })} onDelete={(matricula) => deleteMatricula.mutate(matricula)} /></TabsContent>
          <TabsContent value="titulares" className="mt-0 focus-visible:ring-0">{isEdit && bem ? <TitularidadesPanel anchor={{ kind: 'bem', id: bem.id }} pessoasCliente={pessoasCliente} requireAtLeastOne /> : <TitularInicialSection entity="bem" pessoas={pessoasCliente} value={titularInicial} onChange={setTitularInicial} />}</TabsContent>
          <TabsContent value="documentos" className="mt-0 focus-visible:ring-0">{isEdit && bem?.id && <DocumentosTab clienteId={clienteId} vinculo={{ bemId: bem.id }} categoriaPadrao="bens_direitos" />}</TabsContent>
        </div>
        <DialogFooter className="shrink-0 rounded-b-lg border-t border-osg-100 bg-background px-6 py-3.5"><Button variant="outline" onClick={requestClose} disabled={upsert.isPending}>Cancelar</Button><Button onClick={handleSave} disabled={upsert.isPending || (temTitularidade && !isEdit && semPessoas)} className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90">{upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{rascunhoExterno?.rotuloSalvar ?? (isEdit ? 'Salvar alterações' : 'Cadastrar bem')}</Button></DialogFooter>
      </Tabs>{mostrarHistorico && bem && <HistoricoFlutuante entityIds={[bem.id]} />}
    </DialogContent></Dialog>
    {bem && <MatriculaModal open={matriculaModal.open} bemId={bem.id} bemTipo={bem.tipo_bem} matricula={matriculaModal.matricula} pessoasCliente={pessoasCliente} matriculasDoBem={matriculas} onClose={() => setMatriculaModal({ open: false, matricula: null })} />}
    {bem && <VincularMatriculaDialog open={vincularOpen} bemId={bem.id} clienteId={clienteId} onClose={() => setVincularOpen(false)} />}
    <UnsavedChangesAlert {...alertProps} />
  </>;
}
