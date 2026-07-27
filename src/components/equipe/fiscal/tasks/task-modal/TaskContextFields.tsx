import type { UseFormReturn } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RequiredMark } from '@/components/ui/required-mark';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TaskClientOption, TaskFormValues } from '@/lib/orgTaskForm';

interface TaskContextFieldsProps {
  form: UseFormReturn<TaskFormValues>;
  clients: TaskClientOption[];
  projects: { id: string; name: string }[];
  contribuintes: { id: string; nome_razao_social: string; cpf_cnpj?: string | null }[];
}

/**
 * Seção "Contexto": a quem a tarefa pertence (cliente → projeto →
 * contribuinte). O contribuinte só abre depois que há cliente.
 */
export function TaskContextFields({
  form,
  clients,
  projects,
  contribuintes,
}: TaskContextFieldsProps) {
  const clientId = form.watch('client_id');

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Contexto
      </h3>

      <FormField
        control={form.control}
        name="client_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Cliente <RequiredMark />
            </FormLabel>
            <Select
              onValueChange={(v) => field.onChange(v === '_none' ? undefined : v)}
              value={field.value || '_none'}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="_none">Nenhum</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="project_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Projeto <RequiredMark />
            </FormLabel>
            <Select
              onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
              value={field.value || '_none'}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="_none">Nenhum</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="contribuinte_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Contribuinte <RequiredMark />
            </FormLabel>
            <Select
              onValueChange={(v) => field.onChange(v === '_none' ? undefined : v)}
              value={field.value || '_none'}
              disabled={!clientId}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      clientId ? 'Selecione o contribuinte' : 'Selecione um cliente primeiro'
                    }
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="_none">Nenhum</SelectItem>
                {contribuintes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome_razao_social} {c.cpf_cnpj && `(${c.cpf_cnpj})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
