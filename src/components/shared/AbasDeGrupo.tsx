import { cn } from '@/lib/utils';

export interface GrupoAba {
  key: string;
  label: string;
  total: number;
  /** Grupo de segunda linha (ex.: cluster inativo) — fica em cinza claro. */
  atenuado?: boolean;
}

interface AbasDeGrupoProps {
  grupos: GrupoAba[];
  selecionado: string;
  onSelecionar: (key: string) => void;
  /** Nenhuma aba fica ativa (ex.: durante uma busca que varre todos os grupos). */
  inativo?: boolean;
  className?: string;
}

/**
 * Navegação por grupo — o padrão desta base para lista agrupada.
 *
 * Grupos empilhados viram rolagem: para ver o último, passa-se por todos os
 * anteriores. Aqui cada grupo é uma aba com a sua contagem, e a lista mostra
 * só o grupo escolhido. Quem faz busca deve varrer todos os grupos e passar
 * `inativo`, senão o item de outra aba "não existe".
 */
export default function AbasDeGrupo({
  grupos, selecionado, onSelecionar, inativo = false, className,
}: AbasDeGrupoProps) {
  if (grupos.length === 0) return null;

  return (
    <div className={cn('flex gap-1 overflow-x-auto', className)}>
      {grupos.map(grupo => {
        const ativa = !inativo && selecionado === grupo.key;
        return (
          <button
            key={grupo.key}
            type="button"
            onClick={() => onSelecionar(grupo.key)}
            aria-pressed={ativa}
            className={cn(
              'shrink-0 whitespace-nowrap border-b-2 px-2.5 pb-1.5 text-sm transition-colors',
              ativa
                ? 'border-teal-500 font-medium text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700',
              grupo.atenuado && !ativa && 'text-slate-400',
            )}
          >
            {grupo.label}
            <span className={cn('ml-1 text-xs', ativa ? 'text-teal-600/70' : 'text-slate-400')}>
              {grupo.total}
            </span>
          </button>
        );
      })}
    </div>
  );
}
