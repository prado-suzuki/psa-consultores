import { AlignLeft, Building2, CalendarRange, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredMark } from '@/components/ui/required-mark';
import { SectionHeading } from '@/components/ui/section-heading';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ProjetoEquipeFields } from '@/components/equipe/projetos-cadastro/ProjetoEquipeFields';
import { ProjetoOsProdutoFields } from '@/components/equipe/projetos-cadastro/ProjetoOsProdutoFields';
import { useProjetosCadastro } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';
import { projectStatusList } from '@/lib/projetoStatusColors';
import { cn } from '@/lib/utils';

/**
 * Formulário de criação: coluna única, campos empilhados por seção
 * (identificação → período → equipe → detalhes). Sem cabeçalho de contexto nem
 * faixa de propriedades, que só fazem sentido depois que o projeto existe.
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
    <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
      <DialogHeader className="border-b pb-4">
        <DialogTitle>Novo Projeto</DialogTitle>
        <DialogDescription className="sr-only">Formulário de projeto</DialogDescription>
      </DialogHeader>

      <div className="space-y-6 pt-5">
        <section className="space-y-4">
          <SectionHeading icon={<Building2 className="h-4 w-4 text-primary" />}>
            Identificação
          </SectionHeading>

          <div className="space-y-1.5">
            <Label htmlFor="novo-projeto-cliente">
              Cliente <RequiredMark />
            </Label>
            <Select
              value={formData.external_client_id}
              onValueChange={(value) =>
                setFormData((previous) => ({ ...previous, external_client_id: value }))
              }
            >
              <SelectTrigger id="novo-projeto-cliente">
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

          <ProjetoOsProdutoFields />

          <div className="space-y-1.5">
            <Label htmlFor="novo-projeto-nome">
              Nome do Projeto <RequiredMark />
            </Label>
            <Input
              id="novo-projeto-nome"
              value={formData.name}
              onChange={(event) =>
                setFormData((previous) => ({ ...previous, name: event.target.value }))
              }
              placeholder="Nome do projeto"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="novo-projeto-equipe">
                Equipe <RequiredMark />
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
                <SelectTrigger id="novo-projeto-equipe">
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

            <div className="space-y-1.5">
              <Label htmlFor="novo-projeto-status">
                Status <RequiredMark />
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((previous) => ({ ...previous, status: value }))
                }
              >
                <SelectTrigger id="novo-projeto-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projectStatusList.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      <span className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', option.dot)} />
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading icon={<CalendarRange className="h-4 w-4 text-primary" />}>
            Período
          </SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="novo-projeto-inicio">
                Data de Início <RequiredMark />
              </Label>
              <Input
                id="novo-projeto-inicio"
                type="date"
                value={formData.start_date}
                onChange={(event) =>
                  setFormData((previous) => ({ ...previous, start_date: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="novo-projeto-termino">
                Data de Término <RequiredMark />
              </Label>
              <Input
                id="novo-projeto-termino"
                type="date"
                value={formData.end_date}
                onChange={(event) =>
                  setFormData((previous) => ({ ...previous, end_date: event.target.value }))
                }
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading icon={<Users className="h-4 w-4 text-primary" />}>Equipe</SectionHeading>
          <ProjetoEquipeFields />
        </section>

        <section className="space-y-4">
          <SectionHeading icon={<AlignLeft className="h-4 w-4 text-primary" />}>
            Detalhes
          </SectionHeading>
          <div className="space-y-1.5">
            <Label htmlFor="novo-projeto-descricao">
              Descrição do Projeto <RequiredMark />
            </Label>
            <Textarea
              id="novo-projeto-descricao"
              value={formData.description}
              onChange={(event) =>
                setFormData((previous) => ({ ...previous, description: event.target.value }))
              }
              placeholder="Descrição do projeto"
              rows={3}
              className="resize-none rounded-xl bg-muted/20 leading-6"
            />
          </div>
        </section>

        <div className="sticky -bottom-6 z-20 -mx-6 -mb-6 flex flex-wrap justify-end gap-3 border-t bg-background/95 px-6 py-4 backdrop-blur">
          <Button type="button" variant="outline" onClick={handleCloseModal} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSaving}>
            Criar
          </Button>
        </div>
      </div>
    </div>
  );
}
