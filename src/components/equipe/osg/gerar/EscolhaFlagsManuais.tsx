import { Loader2, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { FlagRow } from '@/hooks/useBibliotecaModelos';

interface EscolhaFlagsManuaisProps {
  /** Flags de tipo 'manual' que ESTE modelo referencia (as demais não aparecem). */
  flags: FlagRow[];
  /** Valor gravado em projeto_flag_valor, por flag_id. Ausente = desligada. */
  valorPorFlagId: Map<string, boolean>;
  onAlternar: (flagId: string, valor: boolean) => void;
  onConcluir: () => void;
  salvando: boolean;
}

/**
 * Passo das condições MANUAIS: o que não dá para derivar do cadastro e por isso o
 * consultor marca na mão (numa alteração contratual, o evento que ela registra).
 * Cada interruptor liga uma flag do catálogo, e é a flag que decide se a cláusula
 * correspondente entra no documento.
 */
export const EscolhaFlagsManuais = ({
  flags,
  valorPorFlagId,
  onAlternar,
  onConcluir,
  salvando,
}: EscolhaFlagsManuaisProps) => (
  <div className="space-y-4">
    <div className="space-y-2.5">
      {flags.map((flag, i) => {
        const ligada = valorPorFlagId.get(flag.id) === true;
        return (
          <div
            key={flag.id}
            className={cn(
              'flex items-center gap-3 rounded-md border bg-card p-3 pl-4 transition-colors duration-200 animate-osg-card-in motion-reduce:animate-none',
              ligada ? 'border-osg-moss/50 bg-osg-moss/[0.04]' : 'border-osg-200/80',
            )}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <ToggleRight
              aria-hidden
              className={cn('h-4 w-4 shrink-0', ligada ? 'text-osg-moss' : 'text-slate-300')}
            />
            <Label
              htmlFor={`flag-manual-${flag.id}`}
              className="min-w-0 flex-1 cursor-pointer text-sm font-medium text-slate-800"
            >
              {flag.descricao || flag.nome}
            </Label>
            <Switch
              id={`flag-manual-${flag.id}`}
              checked={ligada}
              disabled={salvando}
              onCheckedChange={(v) => onAlternar(flag.id, v)}
            />
          </div>
        );
      })}
    </div>

    {/* Marcar nada é resposta legítima ("não houve nenhum destes eventos"), então
        o passo só fecha quando o consultor diz que terminou. */}
    <Button onClick={onConcluir} disabled={salvando} className="w-full sm:w-auto">
      {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Concluir
    </Button>
  </div>
);
