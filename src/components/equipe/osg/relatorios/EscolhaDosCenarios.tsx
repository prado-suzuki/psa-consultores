import { Pencil } from 'lucide-react';
import { ButtonTooltip } from '@/components/ui/button-tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { rotuloDaSimulacao } from '@/hooks/useSimulacoesItcmd';
import type { useCenariosParaSlides } from '@/components/equipe/osg/relatorios/useCenariosParaSlides';

/**
 * Os cenários escolhidos na linha da tabela, com um lápis para trocar, no desenho da `EscolhaDaRevisao`.
 * Só a ponta de cada cadeia é opção, e a cadeia vem escrita pelos nomes embaixo dela.
 */
export function EscolhaDosCenarios({ estado }: { estado: ReturnType<typeof useCenariosParaSlides> }) {
  const { descricao, opcoes, escolhidas, alternar, bloqueio } = estado;

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate text-[11px] text-muted-foreground">{descricao}</span>

      {opcoes.length > 0 && (
        <Popover>
          <ButtonTooltip text="Trocar os cenários">
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Trocar as simulações que vão para os slides"
                className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-osg-50 hover:text-osg-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss"
              >
                <Pencil className="h-3 w-3" aria-hidden />
              </button>
            </PopoverTrigger>
          </ButtonTooltip>

          <PopoverContent align="start" className="w-96 space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">Quais simulações viram cenário</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Só simulações aprovadas, até três. Cada uma vira um cenário com o nome dela, e a
                que continua outra leva a cadeia inteira.
              </p>
            </div>

            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {opcoes.map((o) => {
                const marcada = escolhidas.includes(o.simulacao.id);
                const motivo = bloqueio(o.simulacao.id);
                const idCampo = `cenario-${o.simulacao.id}`;
                return (
                  <li key={o.simulacao.id} className="flex items-start gap-2">
                    <Checkbox
                      id={idCampo}
                      checked={marcada}
                      disabled={!marcada && motivo != null}
                      onCheckedChange={() => alternar(o.simulacao.id)}
                      className="mt-0.5"
                    />
                    <label htmlFor={idCampo} className="min-w-0 flex-1 cursor-pointer text-xs">
                      <span className="block text-foreground">{o.rotulo}</span>
                      {o.cadeia.length > 1 && (
                        <span className="block text-[11px] text-muted-foreground">
                          {`Leva junto: ${o.cadeia.slice(0, -1).map(rotuloDaSimulacao).join(' → ')}`}
                        </span>
                      )}
                      {!marcada && motivo && (
                        <span className="block text-[11px] text-amber-700">{motivo}</span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </span>
  );
}
