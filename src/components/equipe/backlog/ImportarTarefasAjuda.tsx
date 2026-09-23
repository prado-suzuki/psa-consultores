import { Button } from '@/components/ui/button';
import { ChevronRight, Download, FolderOpen } from 'lucide-react';

const MODELO: Array<{ linha: string; nota: string }> = [
  { linha: '## Lista geral de solicitações', nota: 'título da tarefa' },
  { linha: 'prioridade: alta', nota: 'baixa, média ou alta (opcional)' },
  { linha: 'horas: 8', nota: 'estimativa em horas (opcional)' },
  { linha: 'projeto: OSG Work', nota: 'nome do projeto (opcional)' },
  { linha: '', nota: 'linha em branco' },
  { linha: 'Não existe tela com todas as solicitações.', nota: 'descrição' },
  { linha: '', nota: '' },
  { linha: '## Painel de notificações enviadas', nota: 'próxima tarefa' },
  { linha: '', nota: '' },
  { linha: 'Mostrar o que saiu, quando e para quem.', nota: '' },
];

function baixarModelo() {
  const texto = MODELO.map((m) => m.linha).join('\n') + '\n';
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo-tarefas.md';
  a.click();
  URL.revokeObjectURL(url);
}

/** Explica os dois formatos aceitos pelo importador; as regras vivem em `lib/importarTarefasBacklog`. */
export function ImportarTarefasAjuda() {
  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
        <p className="font-medium flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-primary" /> Tarefas da sprint, do jeito que estão no repositório
        </p>
        <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
          <li>
            Clique em <strong className="text-foreground">Escolher arquivos</strong> e abra a pasta da sprint no repositório,
            por exemplo <code>docs/sprints/sprint-14</code>.
          </li>
          <li>
            Selecione todos os arquivos com <kbd className="rounded border px-1 text-xs">Ctrl</kbd>+<kbd className="rounded border px-1 text-xs">A</kbd>.
            Pode incluir o <code>README.md</code>: ele é o índice e fica de fora sozinho.
          </li>
          <li>
            Cada arquivo vira <strong className="text-foreground">uma tarefa</strong>, com o título do arquivo e o resumo do topo.
            Tarefa marcada como aposentada vem desmarcada.
          </li>
        </ol>
        <p className="text-xs text-muted-foreground">Não precisa mudar nada nos arquivos.</p>
      </div>

      <details className="group rounded-lg border p-3">
        <summary className="cursor-pointer list-none font-medium flex items-center gap-2">
          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          Quer escrever uma lista de tarefas à mão?
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-muted-foreground">
            Num arquivo <code>.md</code>, cada tarefa começa com uma linha <code>##</code>. Baixe o modelo e siga o exemplo:
          </p>
          <div className="rounded-md bg-muted p-2 font-mono text-xs overflow-x-auto">
            {MODELO.map((m, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3 min-h-[1.25rem]">
                <span className="whitespace-pre text-foreground">{m.linha}</span>
                <span className="font-sans text-muted-foreground">{m.nota && `← ${m.nota}`}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Não ponha título com um <code>#</code> só no topo: aí o arquivo inteiro vira uma tarefa, como os da sprint.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={baixarModelo}>
            <Download className="h-4 w-4 mr-2" /> Baixar modelo
          </Button>
        </div>
      </details>
    </div>
  );
}
