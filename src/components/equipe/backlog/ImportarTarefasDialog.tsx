import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, ArrowLeft, FileUp, Loader2, Upload } from 'lucide-react';
import { ImportarTarefasAjuda } from '@/components/equipe/backlog/ImportarTarefasAjuda';
import { useCriarDemandasBacklog } from '@/hooks/useCriarDemandasBacklog';
import { casarProjeto, ehIndiceDaSprint, lerArquivoDeTarefas, type PrioridadeImportada, type TarefaImportada } from '@/lib/importarTarefasBacklog';

const NONE = '__none__';

interface Projeto {
  id: string;
  name: string;
}

interface TarefaEmRevisao extends TarefaImportada {
  project_id: string;
  selecionada: boolean;
}

interface ImportarTarefasBotaoProps {
  projects: Projeto[];
}

/** Botão "Importar tarefas" do backlog: lê .md, mostra para revisão e grava só o que ficou marcado. */
export function ImportarTarefasBotao({ projects }: ImportarTarefasBotaoProps) {
  const { salvar, isSaving } = useCriarDemandasBacklog();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [itens, setItens] = useState<TarefaEmRevisao[] | null>(null);
  const [semTarefa, setSemTarefa] = useState<string[]>([]);

  const limpar = () => {
    setItens(null);
    setSemTarefa([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) limpar();
    setOpen(next);
  };

  const lerArquivos = async (files: FileList | null) => {
    if (!files?.length) return;
    setLendo(true);
    try {
      const lidos = await Promise.all(
        Array.from(files).map(async (f) => ({ nome: f.name, tarefas: lerArquivoDeTarefas(f.name, await f.text()) })),
      );
      setSemTarefa(lidos.filter((l) => l.tarefas.length === 0 && !ehIndiceDaSprint(l.nome)).map((l) => l.nome));
      setItens(
        lidos.flatMap((l) => l.tarefas).map((t) => {
          const project_id = casarProjeto(t.projeto_nome, projects) ?? '';
          const avisos = t.projeto_nome && !project_id
            ? [...t.avisos, `Projeto "${t.projeto_nome}" não encontrado; escolha abaixo.`]
            : t.avisos;
          return { ...t, avisos, project_id, selecionada: t.sugerida };
        }),
      );
    } finally {
      setLendo(false);
    }
  };

  const atualizar = (index: number, patch: Partial<TarefaEmRevisao>) => {
    setItens((prev) => prev?.map((it, i) => (i === index ? { ...it, ...patch } : it)) ?? null);
  };

  const selecionadas = itens?.filter((it) => it.selecionada && it.title.trim()) ?? [];

  const handleSalvar = async () => {
    const ok = await salvar(
      selecionadas.map((it) => ({
        title: it.title.trim(),
        description: it.description,
        priority: it.priority,
        estimated_hours: it.estimated_hours,
        justificativa: it.arquivo,
        project_id: it.project_id || null,
      })),
      { origem: 'Importada de arquivo' },
    );
    if (ok) handleOpenChange(false);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-2" /> Importar tarefas
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importar tarefas</DialogTitle>
            <DialogDescription>
              {itens
                ? 'Revise, ajuste e desmarque o que não deve entrar. Nada é gravado antes de você confirmar.'
                : 'Escolha os arquivos e revise antes de gravar. Veja abaixo como o arquivo deve estar.'}
            </DialogDescription>
          </DialogHeader>

          {!itens ? (
            <div className="space-y-4 py-2">
              <input
                ref={inputRef}
                type="file"
                accept=".md,.markdown,.txt"
                multiple
                className="hidden"
                onChange={(e) => void lerArquivos(e.target.files)}
              />
              <Button variant="outline" className="w-full h-20 border-dashed" disabled={lendo} onClick={() => inputRef.current?.click()}>
                {lendo ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <FileUp className="h-5 w-5 mr-2" />}
                Escolher arquivos
              </Button>
              <ImportarTarefasAjuda />
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                {selecionadas.length} de {itens.length} selecionadas
              </p>
              {semTarefa.length > 0 && (
                <p className="text-sm text-warning bg-warning/10 border border-warning/40 rounded-md px-3 py-2">
                  Nenhuma tarefa encontrada em {semTarefa.join(', ')}: o arquivo precisa ter um título <code>#</code> ou <code>##</code>.
                </p>
              )}
              <ScrollArea className="h-[420px] pr-3">
                <div className="space-y-2">
                  {itens.map((item, index) => (
                    <div
                      key={index}
                      className={`rounded-lg border p-3 ${item.selecionada ? 'border-primary/30 bg-primary/5' : 'border-border opacity-60'}`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={item.selecionada}
                          onCheckedChange={(c) => atualizar(index, { selecionada: !!c })}
                          className="mt-2"
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                          <Input value={item.title} onChange={(e) => atualizar(index, { title: e.target.value })} className="font-medium" />
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-line">{item.description}</p>
                          )}
                          {item.avisos.map((aviso) => (
                            <p key={aviso} className="text-xs text-warning flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 shrink-0" /> {aviso}
                            </p>
                          ))}
                          <div className="flex flex-wrap items-center gap-3 pt-1">
                            <div className="flex items-center gap-1.5">
                              <Label className="text-xs text-muted-foreground">Horas</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={item.estimated_hours ?? ''}
                                onChange={(e) => atualizar(index, { estimated_hours: e.target.value === '' ? null : parseFloat(e.target.value) })}
                                className="h-8 w-20"
                              />
                            </div>
                            <Select value={item.priority} onValueChange={(v) => atualizar(index, { priority: v as PrioridadeImportada })}>
                              <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Baixa</SelectItem>
                                <SelectItem value="medium">Média</SelectItem>
                                <SelectItem value="high">Alta</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select value={item.project_id || NONE} onValueChange={(v) => atualizar(index, { project_id: v === NONE ? '' : v })}>
                              <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Projeto" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NONE}>Sem projeto</SelectItem>
                                {projects.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-xs text-muted-foreground truncate">{item.arquivo}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter>
            {!itens ? (
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={limpar} disabled={isSaving}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
                <Button onClick={handleSalvar} disabled={isSaving || selecionadas.length === 0}>
                  {isSaving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                  ) : (
                    `Adicionar ${selecionadas.length} ao backlog`
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
