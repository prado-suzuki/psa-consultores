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
} from '@/components/ui/select';
import { CHIP_BUTTON, CHIP_LABEL, CHIP_TRIGGER } from '@/lib/modalChipStyles';
import { taskPriorityColors, taskPriorityList } from '@/lib/taskPriorityColors';
import type { TaskFieldOptions, TaskFormValues } from '@/lib/orgTaskForm';
import { cn } from '@/lib/utils';

interface TaskPropertyBarProps {
  form: UseFormReturn<TaskFormValues>;
  options: TaskFieldOptions;
  onAssigneeChange: (userId: string) => void;
  /** Revisor delegado só lê os campos da tarefa. */
  disabled?: boolean;
}

/**
 * Faixa de propriedades do modo edição: status, prioridade, responsável, datas
 * e esforço em controles compactos, lado a lado.
 *
 * É uma segunda apresentação dos mesmos campos de `TaskExecutionFields` (que
 * segue servindo o formulário de criação, empilhado). Os dois convivem de
 * propósito: aqui o controle é uma pílula de leitura rápida, lá é um campo de
 * formulário com rótulo completo.
 */
export function TaskPropertyBar({
  form,
  options,
  onAssigneeChange,
  disabled,
}: TaskPropertyBarProps) {
  const { teamMembers, statusOptions } = options;
  const status = form.watch('status');
  const priority = form.watch('priority');
  const assignedTo = form.watch('assigned_to');
  const isDone = status === 'done';
  const actualHoursValue = form.watch('actual_hours');
  const needsAttention = isDone && (!actualHoursValue || !!form.formState.errors.actual_hours);

  const assignee = teamMembers.find((member) => member.id === assignedTo);

  return (
    <div className="border-y bg-muted/20 px-6 py-4">
      <fieldset disabled={disabled} className="contents">
        <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="min-w-0 space-y-1.5">
                <FormLabel className={CHIP_LABEL}>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className={CHIP_TRIGGER}>
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            'h-2 w-2 shrink-0 rounded-full',
                            statusOptions.find((option) => option.key === status)?.bgSolid ??
                              'bg-muted-foreground',
                          )}
                        />
                        <span className="truncate">
                          {statusOptions.find((option) => option.key === status)?.label ??
                            'Selecione'}
                        </span>
                      </span>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        <span className="flex items-center gap-2">
                          <span className={cn('h-2 w-2 rounded-full', option.bgSolid)} />
                          {option.label}
                        </span>
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
              <FormItem className="min-w-0 space-y-1.5">
                <FormLabel className={CHIP_LABEL}>Prioridade</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger
                      className={cn(CHIP_TRIGGER, 'border', taskPriorityColors[priority].badge)}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            'h-2 w-2 shrink-0 rounded-full',
                            taskPriorityColors[priority].dot,
                          )}
                        />
                        <span className="truncate">{taskPriorityColors[priority].label}</span>
                      </span>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {taskPriorityList.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        <span className="flex items-center gap-2">
                          <span className={cn('h-2 w-2 rounded-full', option.dot)} />
                          {option.label}
                        </span>
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
            name="assigned_to"
            render={({ field }) => (
              <FormItem className="min-w-0 space-y-1.5">
                <FormLabel className={CHIP_LABEL}>Responsável</FormLabel>
                <Select onValueChange={onAssigneeChange} value={field.value || '_none'}>
                  <FormControl>
                    <SelectTrigger className={CHIP_TRIGGER}>
                      <span className="flex min-w-0 items-center">
                        <span className={cn('truncate', !assignee && 'text-muted-foreground')}>
                          {assignee?.name ?? 'Selecione'}
                        </span>
                      </span>
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

          <DateChip form={form} name="start_date" label="Início" />
          <DateChip form={form} name="due_date" label="Vencimento" />

          <div className="min-w-0 space-y-1.5">
            <p className={CHIP_LABEL}>Esforço</p>
            <div className="flex items-center gap-1.5">
              <HoursField
                form={form}
                name="estimated_hours"
                label="Horas estimadas"
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground">/</span>
              <HoursField
                form={form}
                name="actual_hours"
                label="Horas realizadas"
                placeholder={isDone ? '0' : '—'}
                disabled={!isDone}
                autoFocus={isDone && !actualHoursValue}
                required={isDone}
                highlight={needsAttention}
              />
              <span className="text-xs text-muted-foreground">h</span>
            </div>
          </div>
        </div>

        {isDone && (
          <div className="mt-3 flex items-start gap-2 text-xs text-warning">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Tarefa concluída — informe as <strong>horas realizadas</strong> para conseguir salvar.
            </span>
          </div>
        )}
      </fieldset>
    </div>
  );
}

function DateChip({
  form,
  name,
  label,
}: {
  form: UseFormReturn<TaskFormValues>;
  name: 'start_date' | 'due_date';
  label: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="min-w-0 space-y-1.5">
          <FormLabel className={CHIP_LABEL}>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(CHIP_BUTTON, !field.value && 'font-normal text-muted-foreground')}
                >
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  {field.value ? format(field.value, 'dd/MM/yyyy') : 'Selecione'}
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
  );
}

function HoursField({
  form,
  name,
  label,
  placeholder,
  disabled,
  autoFocus,
  required,
  highlight,
}: {
  form: UseFormReturn<TaskFormValues>;
  name: 'estimated_hours' | 'actual_hours';
  label: string;
  placeholder: string;
  disabled?: boolean;
  autoFocus?: boolean;
  required?: boolean;
  highlight?: boolean;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1">
          <FormLabel className="sr-only">
            {label} {required && <RequiredMark />}
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              step="0.5"
              min="0"
              placeholder={placeholder}
              disabled={disabled}
              autoFocus={autoFocus}
              className={cn(
                'h-9 w-[3.25rem] rounded-lg border-transparent bg-background px-1.5 text-center text-sm font-medium shadow-sm md:text-sm disabled:cursor-default disabled:opacity-60',
                highlight && 'border-warning ring-1 ring-warning focus-visible:ring-warning',
              )}
              {...field}
              value={field.value ?? ''}
              onChange={(event) =>
                field.onChange(event.target.value === '' ? '' : Number(event.target.value))
              }
            />
          </FormControl>
          <FormMessage className="max-w-[8rem] text-[11px] leading-tight" />
        </FormItem>
      )}
    />
  );
}
