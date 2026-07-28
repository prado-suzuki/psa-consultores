import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RequiredMark } from '@/components/ui/required-mark';
import type { TaskFormValues } from '@/lib/orgTaskForm';

export type TaskContextSelectName =
  | 'client_id'
  | 'project_id'
  | 'contribuinte_id'
  | 'parent_task_id';

/**
 * Select do cartão de contexto da tarefa (cliente, projeto, contribuinte,
 * tarefa-pai), usado tanto na criação quanto atrás de "Alterar contexto" na
 * edição.
 *
 * `emptyValue` guarda a diferença que o formulário já fazia: projeto limpa para
 * `''` (obrigatório no schema), os outros para `undefined`.
 */
export function TaskContextSelect({
  form,
  name,
  label,
  icon,
  required,
  placeholder,
  options,
  emptyValue,
  emptyLabel = 'Nenhum',
  disabled,
}: {
  form: UseFormReturn<TaskFormValues>;
  name: TaskContextSelectName;
  label: string;
  /** Ícone discreto antes do rótulo — usado no formulário de criação. */
  icon?: ReactNode;
  required?: boolean;
  placeholder: string;
  options: { value: string; label: string }[];
  emptyValue: '' | undefined;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="min-w-0 space-y-1.5">
          <FormLabel className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {icon}
            {label} {required && <RequiredMark />}
          </FormLabel>
          <Select
            onValueChange={(value) => field.onChange(value === '_none' ? emptyValue : value)}
            value={field.value || '_none'}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger className="h-9 bg-background text-sm">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="_none">{emptyLabel}</SelectItem>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
