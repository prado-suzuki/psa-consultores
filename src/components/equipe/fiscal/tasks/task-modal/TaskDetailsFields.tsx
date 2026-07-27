import type { UseFormReturn } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RequiredMark } from '@/components/ui/required-mark';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { TaskFormValues } from '@/lib/orgTaskForm';

interface TaskDetailsFieldsProps {
  form: UseFormReturn<TaskFormValues>;
  /** Já filtradas pelo projeto selecionado. */
  parentTasks: { id: string; title: string }[];
}

/** Seção "Tarefa": o que é a tarefa e de quem ela é subtarefa. */
export function TaskDetailsFields({ form, parentTasks }: TaskDetailsFieldsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Tarefa
      </h3>

      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Título <RequiredMark />
            </FormLabel>
            <FormControl>
              <Input placeholder="Título da tarefa" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Descrição <RequiredMark />
            </FormLabel>
            <FormControl>
              <Textarea placeholder="Descreva a tarefa..." rows={2} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="parent_task_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tarefa Pai (subtarefa de)</FormLabel>
            <Select
              onValueChange={(v) => field.onChange(v === '_none' ? undefined : v)}
              value={field.value || '_none'}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma (tarefa principal)" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="_none">Nenhuma</SelectItem>
                {parentTasks.map((pt) => (
                  <SelectItem key={pt.id} value={pt.id}>
                    {pt.title}
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
