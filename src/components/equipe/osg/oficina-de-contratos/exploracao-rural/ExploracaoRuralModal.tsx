import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { osgTabsListCls, osgTabTriggerCls } from '@/components/equipe/osg/formKit';
import { formScopeCls } from '@/lib/osgFormGrid';
import type { MatriculaRow } from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { ExploracaoRuralDraft } from '@/previews/contratosExploracaoModel';
import { ExploracaoRuralDadosTab } from './ExploracaoRuralDadosTab';
import { ExploracaoRuralImoveisTab } from './ExploracaoRuralImoveisTab';

// Modal de cadastro de exploração rural — mesma composição de MatriculaModal.tsx
// (Dialog/DialogContent/Tabs/DialogFooter reais, formScopeCls no contêiner que
// rola o formulário). Diferença deliberada: SEM hook de leitura/escrita. "Salvar"
// só devolve o rascunho pra quem abriu (o preview) e fecha — nada é persistido,
// por desenho da ALE-3 (ver docs/osg/levantamento-contratos-rurais.md).
//
// Se a ALE-3 for aprovada, este é o componente que a próxima sprint pluga a um
// hook real (useUpsertExploracaoRural, a criar) — a estrutura de abas e campos
// não muda, só passa a receber `matriculas`/`pessoas` de um hook em vez de fixture.

interface Props {
  open: boolean;
  isEdit: boolean;
  refCodigo: string;
  draft: ExploracaoRuralDraft;
  onChange: (draft: ExploracaoRuralDraft) => void;
  matriculas: MatriculaRow[];
  pessoas: PessoaRow[];
  instrumentosDeOrigem: { ref: string; label: string }[];
  avisoParaMatricula?: (matriculaId: string, refAtual: string) => { percentualUsado: number; detalhe: string } | null;
  onClose: () => void;
}

export function ExploracaoRuralModal({ open, isEdit, refCodigo, draft, onChange, matriculas, pessoas, instrumentosDeOrigem, avisoParaMatricula, onClose }: Props) {
  const [activeTab, setActiveTab] = useState('dados');

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-visible p-0 sm:[clip-path:none]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 rounded-t-lg bg-background px-6 pt-5">
            <DialogHeader className="mb-4 space-y-0 text-left">
              <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
                {isEdit ? 'Editar exploração rural' : 'Nova exploração rural'}
                <span className="rounded-md bg-osg-50 px-2 py-0.5 font-mono text-sm font-semibold text-osg-700">{refCodigo}</span>
              </DialogTitle>
            </DialogHeader>
            <TabsList className={osgTabsListCls}>
              <TabsTrigger value="dados" className={osgTabTriggerCls}>Dados</TabsTrigger>
              <TabsTrigger value="imoveis" className={osgTabTriggerCls}>Imóveis e origens</TabsTrigger>
            </TabsList>
          </div>
          <div className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 ${formScopeCls}`}>
            <TabsContent value="dados" className="mt-0 focus-visible:ring-0">
              <ExploracaoRuralDadosTab
                draft={draft}
                onChange={onChange}
                pessoas={pessoas}
              />
            </TabsContent>
            <TabsContent value="imoveis" className="mt-0 focus-visible:ring-0">
              <ExploracaoRuralImoveisTab
                tipo={draft.tipo}
                imoveis={draft.imoveis}
                onChange={(imoveis) => onChange({ ...draft, imoveis })}
                matriculas={matriculas}
                instrumentosDeOrigem={instrumentosDeOrigem}
                avisoParaMatricula={avisoParaMatricula ? (matriculaId: string) => avisoParaMatricula(matriculaId, refCodigo) : undefined}
              />
            </TabsContent>
          </div>
          <DialogFooter className="shrink-0 rounded-b-lg border-t border-osg-100 bg-background px-6 py-3.5">
            <span className="mr-auto text-[11px] text-muted-foreground">Mockup da ALE-3 — nenhum dado é salvo, sem consulta ao banco.</span>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={onClose} className="bg-osg-moss text-white hover:bg-osg-moss/90">{isEdit ? 'Salvar alterações' : 'Cadastrar exploração'}</Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
