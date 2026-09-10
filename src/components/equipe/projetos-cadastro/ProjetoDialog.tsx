import { useEffect, useRef, useState } from 'react';
import { FolderKanban, Save } from 'lucide-react';

import { OrgCommentsPanel } from '@/components/comentarios/OrgCommentsPanel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ModalTopBar } from '@/components/ui/modal-top-bar';
import { ProjetoCreateFields } from '@/components/equipe/projetos-cadastro/projeto-modal/ProjetoCreateFields';
import { ProjetoEditBody } from '@/components/equipe/projetos-cadastro/projeto-modal/ProjetoEditBody';
import { ProjetoEditHeader } from '@/components/equipe/projetos-cadastro/projeto-modal/ProjetoEditHeader';
import { ProjetoPropertyBar } from '@/components/equipe/projetos-cadastro/projeto-modal/ProjetoPropertyBar';
import { useProjetosCadastro } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';
import { cn } from '@/lib/utils';

/**
 * Modal de projeto — fachada.
 *
 * Na edição são duas colunas: à esquerda o projeto (cabeçalho com o nome,
 * propriedades e corpo), à direita a thread de atividade (comentários, menções e
 * anexos). Na criação é a mesma anatomia em coluna única — nome, contexto,
 * propriedades, equipe e descrição —, sem a thread, que só existe depois que o
 * projeto existe. Mesma divisão do modal de tarefa.
 */
export function ProjetoDialog() {
  const {
    area,
    isModalOpen,
    setIsModalOpen,
    editingProject,
    handleSubmit,
    createProject,
    updateProject,
  } = useProjetosCadastro();
  const dialogContentRef = useRef<HTMLDivElement>(null);
  // Incrementa a cada "Adicionar anexo": o painel de atividade observa o número
  // e leva o foco para o compositor, que é por onde o arquivo sobe.
  const [composerFocusSignal, setComposerFocusSignal] = useState(0);
  /**
   * Qual das duas metades a tela estreita mostra. Mesmo desenho do modal de
   * tarefa: abaixo de `lg` não há duas colunas, e repartir a altura entre as
   * duas não serve — o compositor de comentário come a Atividade e a moldura do
   * modal sai da tela. Os dois lados ficam montados; quem sai é escondido.
   */
  const [abaEstreita, setAbaEstreita] = useState<'projeto' | 'atividade'>('projeto');

  // Abrir um projeto começa pelo projeto, não pela aba em que o último ficou.
  useEffect(() => {
    if (isModalOpen) setAbaEstreita('projeto');
  }, [isModalOpen]);

  const isSaving = createProject.isPending || updateProject.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setComposerFocusSignal(0);
    setIsModalOpen(nextOpen);
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        ref={dialogContentRef}
        // O primeiro elemento focável é um botão da barra do topo, e um Enter
        // logo após abrir salvaria ou fecharia o modal sem intenção. Na edição o
        // foco vai para o próprio diálogo (tabIndex -1 do Radix); na criação,
        // para o nome do projeto, que é por onde o cadastro começa.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (editingProject) {
            dialogContentRef.current?.focus();
            return;
          }
          dialogContentRef.current?.querySelector<HTMLInputElement>('#novo-projeto-nome')?.focus();
        }}
        className={cn(
          // `[&>button]:hidden` esconde o X padrão do DialogContent: nos dois
          // modos ele é renderizado dentro da barra do topo, junto das ações.
          'max-h-[94vh] gap-0 overflow-hidden p-0 [&>button]:hidden',
          editingProject
            ? 'h-[min(94vh,54rem)] w-[calc(100vw-1rem)] max-w-[78rem] lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(22rem,0.9fr)]'
            : 'max-w-3xl',
          // Abaixo de `lg` este modal tinha o MESMO defeito que o de tarefa: as
          // duas metades viravam linhas `auto` de uma grade de altura fixa, a
          // Atividade levava os `min-h-[32rem]` que pedia, e o formulário — que
          // é quem carrega o Salvar e o fechar — era empurrado para fora e
          // recortado pelo `overflow-hidden`. Em tela baixa não sobrava saída:
          // "quando a tela fica muito pequena eu não consigo sair de atividade",
          // "só se eu clicar bem no cantinho" (o cantinho era o overlay, fora do
          // modal).
          //
          // Mesmo remédio da fase 4: coluna flexível, uma metade por vez com o
          // modal inteiro, e a moldura (Salvar, fechar, seletor) sempre montada.
          editingProject && 'max-lg:flex max-lg:flex-col',
        )}
      >
        <div
          className={cn(
            'flex min-h-0 flex-col bg-background',
            editingProject && abaEstreita === 'projeto' && 'max-lg:flex-1',
          )}
        >
          {editingProject ? (
            <>
              {/* Fora da área que rola: é aqui que ficam o Salvar e o fechar, e
                  eles não podem sair da vista. */}
              <div className="px-6">
                <ModalTopBar
                  icon={<FolderKanban className="h-3.5 w-3.5" />}
                  title="Editar Projeto"
                  description="Formulário de projeto"
                  actions={
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2"
                      disabled={isSaving}
                      onClick={handleSubmit}
                    >
                      <Save className="h-4 w-4" />
                      Salvar
                    </Button>
                  }
                />
              </div>

              {/* O seletor vem DEPOIS da moldura: ele navega o conteúdo, não o
                  modal. Mesmo desenho do modal de tarefa, de propósito — dois
                  modais irmãos não devem ensinar gestos diferentes. */}
              <div
                role="group"
                aria-label="O que mostrar do projeto"
                className="flex gap-1 border-b bg-muted/40 p-1 lg:hidden"
              >
                {(
                  [
                    ['projeto', 'Projeto'],
                    ['atividade', 'Atividade'],
                  ] as const
                ).map(([chave, rotulo]) => (
                  <button
                    key={chave}
                    type="button"
                    aria-pressed={abaEstreita === chave}
                    onClick={() => setAbaEstreita(chave)}
                    className={cn(
                      'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      abaEstreita === chave
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>

              <div
                className={cn(
                  'min-h-0 flex-1 overflow-y-auto',
                  abaEstreita !== 'projeto' && 'max-lg:hidden',
                )}
              >
                <ProjetoEditHeader />
                <ProjetoPropertyBar />
                <ProjetoEditBody
                  onAddAttachment={() => setComposerFocusSignal((signal) => signal + 1)}
                />
              </div>
            </>
          ) : (
            <ProjetoCreateFields />
          )}
        </div>

        {/* O piso de `32rem` saiu: quem dá altura ao painel agora é o `flex-1`
            da metade escolhida. Era esse piso que empurrava a moldura para fora
            da tela. */}
        {editingProject && (
          <div
            className={cn(
              'min-h-0 border-t lg:border-l lg:border-t-0',
              abaEstreita === 'atividade' ? 'max-lg:flex-1' : 'max-lg:hidden',
            )}
          >
            <OrgCommentsPanel
              entityType="org_project"
              entityId={editingProject.id}
              projectId={editingProject.id}
              area={area}
              focusComposerSignal={composerFocusSignal}
              // A conversa do projeto é a soma das conversas dele: o que foi dito
              // aqui e o que foi dito nas tarefas vinculadas.
              consolidarTarefas
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
