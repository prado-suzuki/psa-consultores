import type { UseFormReturn } from 'react-hook-form';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RequiredMark } from '@/components/ui/required-mark';
import { cn } from '@/lib/utils';
import { normalizeProcessNumber } from '@/lib/perdcompUtils';
import {
  formatCurrencyDisplay,
  formatDcompNumber,
  parseCurrencyToNumber,
  type DcompFormData,
  type DcompOption,
} from '@/lib/dcompForm';

interface DcompFieldsProps {
  form: UseFormReturn<DcompFormData>;
  isEditing: boolean;
  dcompsVigentesParaRetificar: DcompOption[];
  dtEnvioPopoverOpen: boolean;
  onDtEnvioPopoverOpenChange: (open: boolean) => void;
  currencyDisplay: string;
  onCurrencyDisplayChange: (value: string) => void;
  porcentagemPsaPer: number;
  vlrCompensado: number;
  vlrCompensadoExcedeMax: boolean;
  valorAtualizadoSelicMax: number | null;
  dtSolicitadaPer: string | null;
  dtEnvio: string;
  proporcaoOriginal: number;
  emCarenciaNaDtEnvio: boolean;
  selicLoading: boolean;
  selicIndisponivel: boolean;
  selicErrorMessage?: string;
  fatorSelic: number;
}

export function DcompFields({
  form,
  isEditing,
  dcompsVigentesParaRetificar,
  dtEnvioPopoverOpen,
  onDtEnvioPopoverOpenChange,
  currencyDisplay,
  onCurrencyDisplayChange,
  porcentagemPsaPer,
  vlrCompensado,
  vlrCompensadoExcedeMax,
  valorAtualizadoSelicMax,
  dtSolicitadaPer,
  dtEnvio,
  proporcaoOriginal,
  emCarenciaNaDtEnvio,
  selicLoading,
  selicIndisponivel,
  selicErrorMessage,
  fatorSelic,
}: DcompFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="nr_documento"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Número do Documento <RequiredMark />
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                disabled={isEditing}
                placeholder="00000.00000.000000.0.0.00-0000"
                onChange={(e) => field.onChange(formatDcompNumber(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {!isEditing && dcompsVigentesParaRetificar.length > 0 && (
        <FormField
          control={form.control}
          name="nr_dcomp_ret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>DCOMP a Retificar (opcional)</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                value={field.value || '__none__'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum (original)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum (original)</SelectItem>
                  {dcompsVigentesParaRetificar.map((dcomp) => (
                    <SelectItem key={dcomp.nr_documento} value={dcomp.nr_documento}>
                      {normalizeProcessNumber(dcomp.nr_documento)} ({dcomp.mes_ano_exercicio})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="dt_envio"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>
              Data de Envio <RequiredMark />
            </FormLabel>
            <Popover open={dtEnvioPopoverOpen} onOpenChange={onDtEnvioPopoverOpenChange}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full pl-3 text-left font-normal',
                      !field.value && 'text-muted-foreground',
                    )}
                  >
                    {field.value ? (
                      format(new Date(field.value + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                    ) : (
                      <span>Selecione...</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  selected={field.value ? new Date(field.value + 'T00:00:00') : undefined}
                  onSelect={(d) => {
                    field.onChange(d ? format(d, 'yyyy-MM-dd') : '');
                    onDtEnvioPopoverOpenChange(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="vlr_compensado"
        render={() => (
          <FormItem>
            <FormLabel>
              Valor Compensado (R$) <RequiredMark />
            </FormLabel>
            <FormControl>
              <Input
                type="text"
                inputMode="numeric"
                value={currencyDisplay}
                onChange={(e) => {
                  const numericValue = parseCurrencyToNumber(e.target.value);
                  form.setValue('vlr_compensado', numericValue);
                  onCurrencyDisplayChange(formatCurrencyDisplay(numericValue));
                }}
              />
            </FormControl>
            <FormMessage />
            {porcentagemPsaPer > 0 && vlrCompensado > 0 && (
              <p className="text-xs text-muted-foreground">
                Valor PSA ({porcentagemPsaPer.toFixed(2).replace('.', ',')}%):{' '}
                <strong className="font-mono text-foreground">
                  {formatCurrencyDisplay((vlrCompensado * porcentagemPsaPer) / 100)}
                </strong>
              </p>
            )}
            {vlrCompensadoExcedeMax && valorAtualizadoSelicMax != null && (
              <p className="text-sm text-destructive">
                O valor compensado ({formatCurrencyDisplay(vlrCompensado)}) ultrapassa o Valor
                Atualizado SELIC do PER ({formatCurrencyDisplay(valorAtualizadoSelicMax)}).
              </p>
            )}
            {/* Decomposição do Valor Compensado: parte original (sai do saldo) + atualização SELIC. */}
            {dtSolicitadaPer &&
              dtEnvio &&
              vlrCompensado > 0 &&
              (() => {
                const valorOriginalTotal = vlrCompensado * proporcaoOriginal;
                const parcelaSelic = vlrCompensado - valorOriginalTotal;
                return (
                  <div className="mt-2 rounded-md border bg-muted/30 p-2 text-xs">
                    {emCarenciaNaDtEnvio ? (
                      <p className="text-muted-foreground">
                        Em carência na data de envio (
                        {format(new Date(dtEnvio + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}) —
                        sem parcela SELIC. Valor Original = Valor Compensado ={' '}
                        <strong>{formatCurrencyDisplay(vlrCompensado)}</strong>.
                      </p>
                    ) : selicLoading ? (
                      <p className="text-muted-foreground">
                        Calculando SELIC para a data de envio…
                      </p>
                    ) : selicIndisponivel ? (
                      <p className="text-destructive">
                        SELIC indisponível: {selicErrorMessage ?? 'sem dados da API'}
                      </p>
                    ) : fatorSelic > 0 ? (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                        <span>
                          Fator SELIC (
                          {format(new Date(dtEnvio + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                          ):{' '}
                          <strong className="text-foreground">
                            {(fatorSelic * 100).toFixed(4)}%
                          </strong>
                        </span>
                        <span>
                          Atualização SELIC desta DCOMP:{' '}
                          <strong className="text-blue-600">
                            {formatCurrencyDisplay(parcelaSelic)}
                          </strong>
                        </span>
                        <span>
                          Valor Original (sai do saldo):{' '}
                          <strong className="text-foreground">
                            {formatCurrencyDisplay(valorOriginalTotal)}
                          </strong>
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })()}
          </FormItem>
        )}
      />
    </>
  );
}
