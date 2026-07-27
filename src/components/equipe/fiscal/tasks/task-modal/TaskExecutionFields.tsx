import type { UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';
import { AlertCircle, CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RequiredMark } from '@/components/ui/required-mark';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { StatusColorConfig } from '@/lib/taskStatusColors';
import type { TaskFormValues, TaskTeamMember } from '@/lib/orgTaskForm';

interface TaskExecutionFieldsProps {
  form: UseFormReturn<TaskFormValues>;
  /** Já filtrados pelos membros do projeto. */
  teamMembers: TaskTeamMember[];
  /** Já filtrados pelo papel do usuário e pelo status atual da tarefa. */
  statusOptions: StatusColorConfig[];
  onAssigneeChange: (userId: string) => void;
}

/** Seção "Execução": status, prioridade, responsável, horas e prazos. */
export function TaskExecutionFields({
  form,
  teamMembers,
  statusOptions,
  onAssigneeChange,
}: TaskExecutionFieldsProps) {
  const isDone = form.watch('status') === 'done';
  const actualHoursValue = form.watch('actual_hours');
  const actualHoursError = form.formState.errors.actual_hours;
  const needsAttention = isDone && (!actualHoursValue || actualHoursError);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Execução
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Status <RequiredMark />
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.key} value={status.key}>
                      {status.label}
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
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Prioridade <RequiredMark />
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="assigned_to"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Responsável <RequiredMark />
            </FormLabel>
            <Select onValueChange={onAssigneeChange} value={field.value || '_none'}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="_none">Nenhum</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div
        className={cn(
          'rounded-md transition-all',
          needsAttention &&
            'border-2 border-warning bg-warning/5 p-3 dark:bg-warning/20 dark:border-warning',
        )}
      >
        {isDone && (
          <div className="flex items-start gap-2 mb-3 text-sm text-warning dark:text-warning/20">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Tarefa concluída — informe as <strong>horas realizadas</strong> para conseguir salvar.
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="estimated_hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Horas estimadas <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="Ex: 4"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? '' : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="actual_hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  className={cn(
                    needsAttention && 'text-warning dark:text-warning/10 font-semibold',
                  )}
                >
                  Horas realizadas {isDone && <RequiredMark />}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder={isDone ? 'Ex: 4' : 'Disponível ao concluir'}
                    disabled={!isDone}
                    autoFocus={isDone && !actualHoursValue}
                    className={cn(
                      needsAttention &&
                        'border-warning ring-2 ring-warning focus-visible:ring-warning bg-card dark:bg-background',
                    )}
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? '' : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="start_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>
                Data de Início <RequiredMark />
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground',
                      )}
                    >
                      {field.value ? format(field.value, 'dd/MM/yyyy') : <span>Selecione</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar selected={field.value} onSelect={field.onChange} />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="due_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>
                Data de Vencimento <RequiredMark />
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground',
                      )}
                    >
                      {field.value ? format(field.value, 'dd/MM/yyyy') : <span>Selecione</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar selected={field.value} onSelect={field.onChange} />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
