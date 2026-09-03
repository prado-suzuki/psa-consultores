import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ModeloComContagem } from '@/hooks/useModelosDocumento';

interface EscolhaModeloProps {
  modelos: ModeloComContagem[];
  carregando: boolean;
  modeloId: string | null;
  onEscolher: (id: string) => void;
}

/**
 * Passo 1 do fluxo guiado: grade de cards de modelo (alvos grandes e legíveis,
 * no lugar de um select). O selecionado ganha a barrinha verde-musgo lateral,
 * mesmo realce dos cards da Biblioteca de Modelos.
 */
export const EscolhaModelo = ({ modelos, carregando, modeloId, onEscolher }: EscolhaModeloProps) => {
  const navigate = useNavigate();
  const ativos = modelos.filter((m) => m.ativo);

  if (carregando) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando modelos…
      </div>
    );
  }

  if (ativos.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground">Ainda não há modelos prontos para gerar.</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => navigate('/equipe/osg/work/montagem-documentos')}
        >
          Abrir Montagem de Documentos
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {ativos.map((m, i) => {
        const selecionado = m.id === modeloId;
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={selecionado}
            onClick={() => onEscolher(m.id)}
            className={cn(
              'group relative flex flex-col gap-2 rounded-md border bg-card p-4 pl-5 text-left shadow-sm transition-all duration-200 animate-osg-card-in motion-reduce:animate-none',
              selecionado
                ? 'border-osg-moss/60 shadow-osg-300/40 ring-1 ring-osg-moss/25'
                : 'border-osg-300/60 shadow-osg-300/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-osg-300/30',
            )}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {selecionado && (
              <span
                aria-hidden
                className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-r-full bg-osg-moss"
              />
            )}
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-osg-100 text-osg-600">
                <ScrollText className="h-4 w-4" />
              </div>
              <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground">
                {m.nome}
              </span>
              {selecionado && <CheckCircle2 className="h-4 w-4 shrink-0 text-osg-moss" />}
            </div>
            {m.descricao && <p className="line-clamp-2 text-xs text-muted-foreground">{m.descricao}</p>}
            <span className="text-[11px] text-muted-foreground">
              {m.num_blocos > 0 ? `${m.num_blocos} blocos` : 'sem blocos'}
            </span>
          </button>
        );
      })}
    </div>
  );
};
