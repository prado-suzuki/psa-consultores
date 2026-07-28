import { AlignLeft, Building2, FolderKanban, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModalTopBar } from '@/components/ui/modal-top-bar';
import { SectionHeading } from '@/components/ui/section-heading';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  MultidisciplinarToggle,
  ProjetoEquipeFields,
} from '@/components/equipe/projetos-cadastro/ProjetoEquipeFields';
import { ProjetoOsProdutoFields } from '@/components/equipe/projetos-cadastro/ProjetoOsProdutoFields';
import { ProjetoPropertyBar } from '@/components/equipe/projetos-cadastro/projeto-modal/ProjetoPropertyBar';
import { useProjetosCadastro } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';

/**
 * Formulário de criação com a mesma anatomia da edição: nome em corpo grande,
 * cartão de contexto (cliente, equipe, OS), faixa de propriedades em pílulas e,
 * por último, equipe e descrição.
 *
 * A diferença é que aqui o contexto nasce vazio, então os selects aparecem
 * abertos — não faz sentido esconder atrás de "Alterar contexto" o que ainda
 * precisa ser escolhido. As ações vivem na barra do topo, como na edição.
 */
export function ProjetoCreateFields() {
  const {
    formData,
    setFormData,
    externalClients,
    equipesOptions,
    handleCloseModal,
    handleSubmit,
    createProject,
    updateProject,
  } = useProjetosCadastro();
  const isSaving = createProject.isPending || updateProject.isPending;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="px-6">
        <ModalTopBar
          icon={<FolderKanban className="h-3.5 w-3.5" />}
          title="Novo Projeto"
          description="Formulário de projeto"
          actions={
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCloseModal}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={handleSubmit} disabled={isSaving}>
                Criar
              </Button>
            </>
          }
        />

        <div className="mt-3">
          <Label htmlFor="novo-projeto-nome" className="sr-only">
            Nome do Projeto
          </Label>
          <Input
            id="novo-projeto-nome"
            placeholder="Nome do projeto"
            value={formData.name}
            onChange={(event) =>
              setFormData((previous) => ({ ...previous, name: event.target.value }))
            }
            // `md:text-[1.6rem]` é obrigatório: o Input traz `md:text-sm` na base
            // e a media query venceria o tamanho sem variante.
            className="h-auto rounded-none border-0 bg-transparent px-0 py-0 text-[1.6rem] font-semibold leading-tight tracking-tight shadow-none placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 md:text-[1.6rem]"
          />
        </div>

        {/* Cartão de contexto: mesma moldura que na edição mostra cliente/OS/
            produto/equipe como texto — na criação ela guarda os próprios
            seletores, e a OS só entra depois que há cliente. */}
        <div className="mt-3 space-y-4 rounded-xl border bg-muted/30 px-4 py-3.5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="novo-projeto-cliente"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              >
                <Building2 className="h-3.5 w-3.5" />
                Cliente
              </Label>
              <Select
                value={formData.external_client_id}
                onValueChange={(value) =>
                  setFormData((previous) => ({ ...previous, external_client_id: value }))
                }
              >
                <SelectTrigger id="novo-projeto-cliente" className="h-9 bg-background text-sm">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {externalClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="novo-projeto-equipe"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              >
                <Users className="h-3.5 w-3.5" />
                Equipe
              </Label>
              <Select
                value={formData.equipe_id}
                onValueChange={(value) => {
                  const team = equipesOptions.find((item) => item.id === value);
                  setFormData((previous) => ({
                    ...previous,
                    equipe_id: value,
                    estrutura_area_id: team?.area_id || previous.estrutura_area_id,
                  }));
                }}
              >
                <SelectTrigger id="novo-projeto-equipe" className="h-9 bg-background text-sm">
                  <SelectValue placeholder="Selecione a equipe" />
                </SelectTrigger>
                <SelectContent>
                  {equipesOptions.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                      {team.area_name ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          — {team.area_name}
                        </span>
                      ) : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ProjetoOsProdutoFields />
        </div>
      </div>

      <div className="mt-4">
        <ProjetoPropertyBar />
      </div>

      <div className="space-y-4 px-6 pb-5 pt-4">
        <section>
          <SectionHeading
            icon={<Users className="h-4 w-4 text-primary" />}
            action={<MultidisciplinarToggle />}
          >
            Equipe
          </SectionHeading>
          <div className="mt-2">
            {/* Responsável executor já aparece na faixa de propriedades. */}
            <ProjetoEquipeFields withResponsavel={false} withMultidisciplinar={false} />
          </div>
        </section>

        <section>
          <SectionHeading icon={<AlignLeft className="h-4 w-4 text-primary" />}>
            Descrição
          </SectionHeading>
          <Label htmlFor="novo-projeto-descricao" className="sr-only">
            Descrição do Projeto
          </Label>
          <Textarea
            id="novo-projeto-descricao"
            value={formData.description}
            onChange={(event) =>
              setFormData((previous) => ({ ...previous, description: event.target.value }))
            }
            placeholder="Descreva o projeto..."
            rows={3}
            className="mt-2 resize-none rounded-xl bg-muted/20 leading-6"
          />
        </section>
      </div>
    </div>
  );
}
