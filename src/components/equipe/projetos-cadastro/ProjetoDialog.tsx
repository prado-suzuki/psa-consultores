import { useMemo, useRef, useState } from 'react';
import { Save } from 'lucide-react';

import { OrgCommentsPanel } from '@/components/comentarios/OrgCommentsPanel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
    teamMembers,
    handleSubmit,
    createProject,
    updateProject,
  } = useProjetosCadastro();
  const dialogContentRef = useRef<HTMLDivElement>(null);
  // Incrementa a cada "Adicionar anexo": o painel de atividade observa o número
  // e leva o foco para o compositor, que é por onde o arquivo sobe.
  const [composerFocusSignal, setComposerFocusSignal] = useState(0);

  const isSaving = createProject.isPending || updateProject.isPending;
  const mentionCandidates = useMemo(
    () =>
      teamMembers.map((profile) => ({
        id: profile.id,
        name: [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim(),
      })),
    [teamMembers],
  );

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
        )}
      >
        <div className="flex min-h-0 flex-col bg-background">
          {editingProject ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ProjetoEditHeader
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
              <ProjetoPropertyBar />
              <ProjetoEditBody
                onAddAttachment={() => setComposerFocusSignal((signal) => signal + 1)}
              />
            </div>
          ) : (
            <ProjetoCreateFields />
          )}
        </div>

        {editingProject && (
          <div className="min-h-[32rem] border-t lg:min-h-0 lg:border-l lg:border-t-0">
            <OrgCommentsPanel
              entityType="org_project"
              entityId={editingProject.id}
              projectId={editingProject.id}
              area={area}
              mentionCandidates={mentionCandidates}
              focusComposerSignal={composerFocusSignal}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
