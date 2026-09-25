import { useEffect, useRef } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ButtonTooltip } from '@/components/ui/button-tooltip';
import { useDitado, type EstadoDitado, type TarefaSugeridaDoDitado } from '@/hooks/useDitado';
import { cn } from '@/lib/utils';

export interface AlvoDitado {
  inserirTexto: (texto: string) => void;
}

interface BotaoDitadoProps {
  ditado: string;
  alvo: AlvoDitado;
  disabled?: boolean;
  onTarefaSugerida?: (tarefa: TarefaSugeridaDoDitado) => void;
  onEstadoChange?: (estado: EstadoDitado) => void;
}

function tempo(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  return `${minutos}:${String(segundos % 60).padStart(2, '0')}`;
}

export function BotaoDitado({
  ditado,
  alvo,
  disabled,
  onTarefaSugerida,
  onEstadoChange,
}: BotaoDitadoProps) {
  const onEstadoChangeRef = useRef(onEstadoChange);
  onEstadoChangeRef.current = onEstadoChange;
  const { estado, segundos, erro, iniciar } = useDitado({
    ditado,
    onResultado: (resultado) => {
      if (resultado.acao?.tipo === 'abrir_tarefa' && onTarefaSugerida) {
        onTarefaSugerida({
          titulo: resultado.acao.titulo,
          descricao: resultado.acao.descricao,
          responsavel_mencionado: resultado.acao.responsavel_mencionado,
          cliente_mencionado: resultado.acao.cliente_mencionado,
          projeto_mencionado: resultado.acao.projeto_mencionado,
          horas_estimadas: resultado.acao.horas_estimadas,
          transcricaoOriginal: resultado.texto,
          classificacao: resultado.acao.classificacao,
        });
        return;
      }
      alvo.inserirTexto(resultado.texto);
    },
  });

  useEffect(() => onEstadoChangeRef.current?.(estado), [estado]);
  useEffect(() => {
    if (erro) toast.error(erro);
  }, [erro]);

  const gravando = estado === 'gravando';
  const transcrevendo = estado === 'transcrevendo';
  const rotulo = gravando
    ? `Parar gravação (${tempo(segundos)})`
    : transcrevendo
      ? 'Transcrevendo áudio'
      : 'Ditar comentário';

  return (
    <div className="flex items-center">
      <ButtonTooltip text={rotulo}>
        <span className="inline-flex">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || transcrevendo}
            className={cn(
              'h-8 w-8 text-muted-foreground',
              gravando &&
                'bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive',
            )}
            aria-label={rotulo}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void iniciar()}
          >
            {transcrevendo ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : gravando ? (
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
            ) : (
              <Mic className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </span>
      </ButtonTooltip>
      {gravando && (
        <span
          className="pr-1 text-[11px] font-medium tabular-nums text-destructive"
          aria-live="polite"
        >
          {tempo(segundos)}
        </span>
      )}
    </div>
  );
}
