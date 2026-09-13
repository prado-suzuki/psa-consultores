import { ListChecks, Printer } from 'lucide-react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { ChecklistPendentes } from '@/components/equipe/osg/checklists/ChecklistPendentes';

/**
 * O checklist da solicitação. UMA tela, sem seletor de aba.
 *
 * A segunda aba, "Planejamento tributário", saiu em 10/09/2026 depois de
 * auditada. Ela era um checklist FIXO de nove requisitos fiscais, escrito no
 * código, que casava documento por palavra-chave no nome do arquivo — coisa
 * nenhuma da solicitação ou do checklist alimentava aquilo, e o cliente nunca a
 * viu (rota da equipe). O que a auditoria mediu em produção:
 *
 *   - nenhum arquivo anexado por ela. O upload dela renomeia para
 *     "{assunto} - {arquivo}", e essa assinatura não existe em `documento_arquivo`
 *   - nenhum projeto criado por ela. O botão gerava "{cliente} - Planejamento
 *     Tributário" com uma descrição própria; os 23 projetos com esse nome se
 *     chamam só "Planejamento Tributário", sem prefixo, e nenhum tem a descrição
 *   - os 9 requisitos dela existem TODOS no catálogo `documento_tipo`, que é o
 *     que alimenta a solicitação: DIRPF, Livro-caixa do Produtor Rural, Contrato
 *     de exploração rural, Relatório de bens/dívidas da atividade rural,
 *     Projeção de investimentos, Contrato social e alterações, Balancete e DRE
 *
 * Ou seja: duplicava por fora, à mão, o que a solicitação já faz pelo catálogo —
 * e sem uso registrado. Se um dia a coleta do planejamento tributário precisar
 * de tela própria, ela nasce da solicitação, não de uma lista no código.
 */
const ChecklistsDocumentos = () => {
  const { clienteId } = useOsgWork();

  return (
    <OsgLayout
      /* Singular desde que a aba saiu, e caixa baixa como no menu lateral. */
      title="Checklist de documentos"
      /* Texto da Patrícia (11/09/2026): usa os mesmos termos dos status logo
         abaixo — solicitados, recebidos, pendentes. */
      subtitle="Acompanhe os documentos solicitados, recebidos e ainda pendentes de cada cliente."
      headerActions={
        clienteId ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            title="Abre a janela de impressão do navegador com o checklist desta tela."
          >
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {!clienteId ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 py-16 text-center text-muted-foreground">
            <ListChecks className="h-10 w-10 opacity-50" />
            <p className="text-sm">Selecione um cliente na barra acima para ver o checklist de documentos.</p>
          </div>
        ) : (
          <ChecklistPendentes clienteId={clienteId} />
        )}
      </div>
    </OsgLayout>
  );
};

export default ChecklistsDocumentos;
