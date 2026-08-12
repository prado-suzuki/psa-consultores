import { useState, type ReactNode } from 'react';
import {
  Building2,
  ChevronDown,
  FileText,
  FolderKanban,
  Package,
  Settings2,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { ModalTopBar } from '@/components/ui/modal-top-bar';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProjetoOsProdutoFields } from '@/components/equipe/projetos-cadastro/ProjetoOsProdutoFields';
import { useProjetosCadastro } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';
import { cn } from '@/lib/utils';

interface ProjetoEditHeaderProps {
  /** Botões de ação (salvar), renderizados na barra do topo. */
  actions: ReactNode;
}

/**
 * Cabeçalho do modo edição: o nome do projeto é o próprio campo, e o contexto
 * (cliente, OS, produto, equipe) aparece como texto.
 *
 * Trocar o cliente ou a OS de um projeto que já existe é raro — e mexer na
 * equipe zera líderes e membros —, então esses campos ficam atrás de "Alterar
 * contexto", no mesmo padrão do modal de tarefa.
 */
export function ProjetoEditHeader({ actions }: ProjetoEditHeaderProps) {
  const {
    formData,
    setFormData,
    editingProject,
    externalClients,
    equipesOptions,
    clienteOS,
    selectedOsId,
    selectedOsProdutos,
    selectedProdutoId,
  } = useProjetosCadastro();
  const [contextOpen, setContextOpen] = useState(false);

  const cliente = externalClients.find((client) => client.id === formData.external_client_id);
  const os = clienteOS.find((item) => item.id === selectedOsId);
  const produto = selectedOsProdutos.find(
    (item) => item.produto_segmento_id === selectedProdutoId,
  );
  // O rótulo sai dos produtos da OS enquanto a escolha estiver lá. Quando o
  // produto gravado não está mais contratado na OS (ou a lista ainda não
  // chegou), cai no rótulo que a lista de projetos já resolveu — sem isso o
  // modal dizia "Não informado" para um projeto que TEM produto.
  const produtoLabel = produto
    ? [produto.produto_codigo, produto.produto_nome].filter(Boolean).join(' — ')
    : (selectedProdutoId && selectedProdutoId === editingProject?.produto_segmento_id
      ? editingProject?.servico_contratado
      : null);
  const equipe = equipesOptions.find((item) => item.id === formData.equipe_id);

  return (
    <div className="px-6">
      <ModalTopBar
        icon={<FolderKanban className="h-3.5 w-3.5" />}
        title="Editar Projeto"
        description="Formulário de projeto"
        actions={actions}
      />

      <div className="mt-3">
        <Label htmlFor="projeto-nome" className="sr-only">
          Nome do Projeto
        </Label>
        <Input
          id="projeto-nome"
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

      <Collapsible open={contextOpen} onOpenChange={setContextOpen} className="mt-2.5 pb-2.5">
        {/* Cartão de contexto: duas colunas de duas linhas (cliente/OS acima,
            produto/equipe abaixo). Rótulo em cima, valor destacado embaixo — a
            lista corrida deixava a informação com pouco peso na tela. */}
        <dl className="grid gap-x-8 gap-y-2 rounded-xl border bg-muted/30 px-4 py-3 sm:grid-cols-2">
          <ContextRow
            icon={<Building2 className="h-4 w-4" />}
            label="Cliente"
            value={cliente?.nome}
          />
          <ContextRow
            icon={<FileText className="h-4 w-4" />}
            label="OS"
            value={os && `Nº ${os.numero_os || 'sem número'}`}
          />
          <ContextRow
            icon={<Package className="h-4 w-4" />}
            label="Produto"
            value={produtoLabel}
          />
          <ContextRow
            icon={<Users className="h-4 w-4" />}
            label="Equipe"
            value={equipe && [equipe.name, equipe.area_name].filter(Boolean).join(' · ')}
          />
        </dl>

        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-7 gap-1.5 px-2 text-xs text-muted-foreground"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Alterar contexto
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', contextOpen && 'rotate-180')}
            />
          </Button>
        </CollapsibleTrigger>

        {/* O `display` das classes fica no filho: aplicado no próprio
            CollapsibleContent, venceria o `hidden` do estado fechado. */}
        <CollapsibleContent>
          <div className="mt-3 space-y-4 rounded-xl border bg-muted/20 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="projeto-cliente" className="text-xs font-medium text-muted-foreground">
                  Cliente
                </Label>
                <Select
                  value={formData.external_client_id}
                  onValueChange={(value) =>
                    setFormData((previous) => ({ ...previous, external_client_id: value }))
                  }
                >
                  <SelectTrigger id="projeto-cliente" className="h-9 bg-background text-sm">
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
                <Label htmlFor="projeto-equipe" className="text-xs font-medium text-muted-foreground">
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
                  <SelectTrigger id="projeto-equipe" className="h-9 bg-background text-sm">
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function ContextRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className={cn('mt-0.5 shrink-0', value ? 'text-primary' : 'text-warning')} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </dt>
        <dd
          className={cn(
            'truncate text-sm font-medium',
            value ? 'text-foreground' : 'text-warning',
          )}
        >
          {value || 'Não informado'}
        </dd>
      </div>
    </div>
  );
}
