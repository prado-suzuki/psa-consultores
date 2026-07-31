import { AlignLeft, Paperclip, Plus, Users } from 'lucide-react';

import { OrgEntityAttachments } from '@/components/comentarios/OrgCommentAttachments';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SectionHeading } from '@/components/ui/section-heading';
import { Textarea } from '@/components/ui/textarea';
import {
  MultidisciplinarToggle,
  ProjetoEquipeFields,
} from '@/components/equipe/projetos-cadastro/ProjetoEquipeFields';
import { useProjetosCadastro } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';

interface ProjetoEditBodyProps {
  /** Leva o foco para o compositor de comentários, onde o anexo é enviado. */
  onAddAttachment: () => void;
}

/**
 * Corpo do modo edição: equipe, descrição e os anexos já enviados na conversa,
 * empilhados em largura cheia.
 *
 * Os espaçamentos aqui são apertados de propósito: junto com o cabeçalho e a
 * faixa de propriedades, tudo precisa caber na altura do diálogo sem rolagem.
 */
export function ProjetoEditBody({ onAddAttachment }: ProjetoEditBodyProps) {
  const { area, editingProject, formData, setFormData } = useProjetosCadastro();

  return (
    <div className="space-y-3.5 px-6 pb-3 pt-3">
      <section>
        <SectionHeading
          icon={<Users className="h-4 w-4 text-primary" />}
          action={<MultidisciplinarToggle />}
        >
          Equipe
        </SectionHeading>
        <div className="mt-2">
          {/* Responsável executor e multidisciplinar já aparecem acima. */}
          <ProjetoEquipeFields withResponsavel={false} withMultidisciplinar={false} />
        </div>
      </section>

      <section>
        <SectionHeading icon={<AlignLeft className="h-4 w-4 text-primary" />}>
          Descrição
        </SectionHeading>
        <Label htmlFor="projeto-descricao" className="sr-only">
          Descrição do Projeto
        </Label>
        <Textarea
          id="projeto-descricao"
          value={formData.description}
          onChange={(event) =>
            setFormData((previous) => ({ ...previous, description: event.target.value }))
          }
          placeholder="Descreva o projeto..."
          rows={3}
          className="mt-2 resize-none rounded-xl bg-muted/20 leading-6"
        />
      </section>

      <section>
        <SectionHeading
          icon={<Paperclip className="h-4 w-4 text-primary" />}
          action={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              onClick={onAddAttachment}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          }
        >
          Anexos
        </SectionHeading>
        {editingProject && (
          <OrgEntityAttachments
            entityType="org_project"
            entityId={editingProject.id}
            projectId={editingProject.id}
            area={area}
            className="mt-2"
            // Mesmo recorte do painel de atividade: os anexos do projeto são os
            // dele e os das tarefas vinculadas.
            consolidarTarefas
          />
        )}
      </section>
    </div>
  );
}
