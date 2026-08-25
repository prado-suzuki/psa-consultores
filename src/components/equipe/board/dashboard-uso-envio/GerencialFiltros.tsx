import { Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OPCOES_PERIODO } from '@/lib/analytics-uso/periodo';
import { rotuloCluster } from '@/lib/analytics-uso/metricas';

const TODOS = 'todos';

interface FiltroOpcao {
  value: string;
  onChange: (value: string) => void;
}

interface GerencialFiltrosProps {
  periodo: FiltroOpcao;
  cluster: FiltroOpcao & { mostrar: boolean; permitirTodos: boolean; opcoes: string[] };
  pessoa: FiltroOpcao & { opcoes: string[] };
  atualizando: boolean;
  temFiltro: boolean;
  atualizadoEm: string;
  podeAtualizar: boolean;
  onLimpar: () => void;
  onAtualizar: () => void;
}

export function GerencialFiltros({
  periodo,
  cluster,
  pessoa,
  atualizando,
  temFiltro,
  atualizadoEm,
  podeAtualizar,
  onLimpar,
  onAtualizar,
}: GerencialFiltrosProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
        <div className="w-full space-y-1.5 sm:w-auto">
          <Label htmlFor="filtro-periodo-uso" className="text-xs text-muted-foreground">
            Período
          </Label>
          <Select value={periodo.value} onValueChange={periodo.onChange}>
            <SelectTrigger id="filtro-periodo-uso" className="h-9 w-full sm:w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPCOES_PERIODO.map((opcao) => (
                <SelectItem key={opcao.id} value={opcao.id}>
                  {opcao.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {cluster.mostrar && (
          <div className="w-full space-y-1.5 sm:max-w-[240px]">
            <Label htmlFor="filtro-cluster-uso" className="text-xs font-medium text-muted-foreground">
              Unidade
            </Label>
            <Select value={cluster.value} onValueChange={cluster.onChange}>
              <SelectTrigger id="filtro-cluster-uso" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cluster.permitirTodos && <SelectItem value={TODOS}>Todas as unidades</SelectItem>}
                {cluster.opcoes.map((item) => (
                  <SelectItem key={item} value={item}>
                    {rotuloCluster(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="w-full space-y-1.5 sm:max-w-[280px]">
          <Label htmlFor="filtro-pessoa-uso" className="text-xs font-medium text-muted-foreground">
            Pessoa
          </Label>
          <Select value={pessoa.value} onValueChange={pessoa.onChange}>
            <SelectTrigger id="filtro-pessoa-uso" className="h-9">
              <SelectValue placeholder="Todas as pessoas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas as pessoas</SelectItem>
              {pessoa.opcoes.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {atualizando && (
          <span
            className="mb-2.5 inline-flex items-center gap-1 text-xs text-[var(--bd-accent-d)]"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Atualizando
          </span>
        )}

        {temFiltro && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-0.5 h-8 gap-1 px-2 text-xs text-muted-foreground"
            onClick={onLimpar}
          >
            <X className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mb-0.5 h-8 gap-1 px-2 text-xs text-muted-foreground"
          onClick={onAtualizar}
          disabled={!podeAtualizar || atualizando}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
      </div>

      <p className="text-right text-xs text-muted-foreground">
        Dados recebidos <strong className="text-foreground">{atualizadoEm}</strong>
      </p>
    </div>
  );
}
