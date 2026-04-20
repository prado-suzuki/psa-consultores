import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Info, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RequiredMark } from "@/components/ui/required-mark";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * Schema do formulário de filtros padrão.
 *
 * As datas são tipadas como `z.date().optional()` no schema base para que
 * `defaultValues = undefined` não quebre o TypeScript em strict mode.
 * A obrigatoriedade é garantida pelo `superRefine` abaixo, que produz erros
 * de validação quando ausentes — react-hook-form bloqueia o submit normalmente.
 */
const filterSchema = z
  .object({
    clienteId: z.string().min(1, "Selecione um cliente"),
    contribuinteId: z.string().min(1, "Selecione um contribuinte"),
    dataInicio: z.date().optional(),
    dataFim: z.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.dataInicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dataInicio"],
        message: "Data inicial é obrigatória",
      });
    }
    if (!data.dataFim) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dataFim"],
        message: "Data final é obrigatória",
      });
    }
    if (data.dataInicio && data.dataFim && data.dataFim < data.dataInicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dataFim"],
        message: "Data final deve ser maior ou igual à inicial",
      });
    }
  });

export type DevFilterFormValues = z.infer<typeof filterSchema>;

/** Após validação, datas são garantidamente definidas. */
export interface DevFilterSubmitValues {
  clienteId: string;
  contribuinteId: string;
  dataInicio: Date;
  dataFim: Date;
}

interface SelectOption {
  id: string;
  nome: string;
}

interface DevFilterFormPatternProps {
  clientes: SelectOption[];
  contribuintes: SelectOption[];
  loadingContribuintes?: boolean;
  onSubmit: (values: DevFilterSubmitValues) => void;
  onClienteChange?: (clienteId: string) => void;
}

/**
 * Padrão de formulário de filtros para ferramentas Dev.
 * - Validação rigorosa via zod + react-hook-form
 * - Erros inline em cada campo (FormMessage)
 * - Toast global em caso de submit inválido (sem alert())
 * - Tooltip no label de campo complexo (Contribuinte)
 *
 * Componente puro de apresentação: não acessa Supabase. Os dados de
 * clientes/contribuintes são fornecidos via props pelo container pai.
 */
export const DevFilterFormPattern = ({
  clientes,
  contribuintes,
  loadingContribuintes = false,
  onSubmit,
  onClienteChange,
}: DevFilterFormPatternProps) => {
  const { toast } = useToast();

  const form = useForm<DevFilterFormValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      clienteId: "",
      contribuinteId: "",
      dataInicio: undefined,
      dataFim: undefined,
    },
  });

  const handleValid = (values: DevFilterFormValues) => {
    // Após validação, as datas estão garantidas pelo superRefine.
    onSubmit(values as DevFilterSubmitValues);
  };

  const handleInvalid = () => {
    toast({
      variant: "destructive",
      title: "Campos obrigatórios",
      description: "Preencha todos os campos destacados antes de buscar.",
    });
  };

  const handleClear = () => {
    form.reset({
      clienteId: "",
      contribuinteId: "",
      dataInicio: undefined,
      dataFim: undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Filtros de Busca</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleValid, handleInvalid)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Cliente */}
              <FormField
                control={form.control}
                name="clienteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Cliente
                      <RequiredMark />
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("contribuinteId", "");
                        onClienteChange?.(value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientes.map((c) => (
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

              {/* Contribuinte (com Tooltip explicativo) */}
              <FormField
                control={form.control}
                name="contribuinteId"
                render={({ field }) => {
                  const clienteId = form.watch("clienteId");
                  const disabled = !clienteId || loadingContribuintes;
                  return (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <span>
                          Contribuinte
                          <RequiredMark />
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label="Sobre o campo contribuinte"
                              className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            Contribuinte é a inscrição estadual associada ao cliente.
                            Selecione um cliente primeiro para listar os contribuintes
                            disponíveis.
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={disabled}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !clienteId
                                  ? "Selecione um cliente primeiro"
                                  : loadingContribuintes
                                    ? "Carregando..."
                                    : "Selecione um contribuinte"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contribuintes.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Data Início */}
              <FormField
                control={form.control}
                name="dataInicio"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      Data Inicial
                      <RequiredMark />
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(field.value, "dd/MM/yyyy", { locale: ptBR })
                              : "Selecione"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          selected={field.value}
                          onSelect={field.onChange}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Data Fim */}
              <FormField
                control={form.control}
                name="dataFim"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      Data Final
                      <RequiredMark />
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(field.value, "dd/MM/yyyy", { locale: ptBR })
                              : "Selecione"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          selected={field.value}
                          onSelect={field.onChange}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClear}>
                <X className="h-4 w-4 mr-1.5" />
                Limpar
              </Button>
              <Button type="submit">
                <Search className="h-4 w-4 mr-1.5" />
                Buscar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default DevFilterFormPattern;
