import { Pencil } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fmtDataDaRevisao,
  type useRevisaoParaSlides,
} from '@/components/equipe/osg/relatorios/useRevisaoParaSlides';

/**
 * A revisão escolhida, na própria linha da tabela — com um lápis para trocar.
 *
 * Onde as outras peças dizem de ONDE vêm os dados, esta diz QUAL revisão vai,
 * que é a escolha que ela tem. O lápis abre os dois seletores num popover; o
 * resto do que o painel antigo mostrava (o histórico de arquivos gerados) vive
 * no Gerador de Slides, no Digital Dev, e é dito ali dentro.
 *
 * Sem revisão importada não há lápis: não há o que trocar, e o botão existiria
 * só para abrir uma lista vazia.
 */
export function EscolhaDaRevisao({ estado }: { estado: ReturnType<typeof useRevisaoParaSlides> }) {
  const { descricao, estudos, estudoEscolhido, setEstudoId, revisoes, revisaoEscolhida, setRevisaoId } = estado;

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate text-[11px] text-muted-foreground">{descricao}</span>

      {revisoes.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Trocar a revisão que vai para os slides"
              title="Trocar a revisão"
              className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-osg-50 hover:text-osg-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss"
            >
              <Pencil className="h-3 w-3" aria-hidden />
            </button>
          </PopoverTrigger>

          <PopoverContent align="start" className="w-80 space-y-3">
            <p className="text-xs font-semibold text-foreground">Qual revisão vai para os slides</p>

            {/* Um estudo só é o caso normal, e um seletor com uma opção é ruído. */}
            {estudos.length > 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="rev-estudo" className="text-xs">Ordem de serviço</Label>
                <Select value={estudoEscolhido} onValueChange={setEstudoId}>
                  <SelectTrigger id="rev-estudo" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {estudos.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.descricao ?? `Planejamento de ${fmtDataDaRevisao(e.created_at)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="rev-revisao" className="text-xs">Revisão</Label>
              <Select value={revisaoEscolhida} onValueChange={setRevisaoId}>
                <SelectTrigger id="rev-revisao" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {revisoes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      Revisão {r.versao} · {fmtDataDaRevisao(r.created_at)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              O histórico de arquivos já gerados fica no Gerador de Slides, no Digital Dev.
            </p>
          </PopoverContent>
        </Popover>
      )}
    </span>
  );
}
