import { cn } from '@/lib/utils';
import { listRowAria, listRowClasses, listRowFocusClasses } from '@/lib/listRowStates';

export interface ProdutoLinhaProps {
  codigo: string | null;
  nome: string | null;
  /** Serviços vinculados a este produto. */
  vinculados: number;
  /** Total de serviços cadastrados — o denominador do contador. */
  total: number;
  ativo: boolean;
  selecionado: boolean;
  onSelecionar: () => void;
}

/**
 * Linha da lista de produtos: TRÊS BLOCOS EMPILHADOS, cada um com a largura
 * toda.
 *
 * O empilhamento é a regra, não o gosto. Tentativas anteriores puseram o código
 * ou o contador ao lado do nome, e o nome — que é a única coisa que identifica
 * o produto — ficou com metade da coluna e truncou em duas palavras. Aqui nada
 * divide a linha com ele: ele quebra em até duas linhas e só então trunca.
 *
 * O contador é SEMPRE `x/y`. Número solto ("16") não diz se é muito ou pouco;
 * "16/67" diz.
 *
 * Selecionado usa o papel `vinculado` do `listRowStates` — nesta lista não há
 * seleção múltipla, e o item aberto no detalhe é justamente o estado que leva o
 * acento.
 */
export default function ProdutoLinha({
  codigo, nome, vinculados, total, ativo, selecionado, onSelecionar,
}: ProdutoLinhaProps) {
  const estado = { vinculado: selecionado };
  const semVinculo = vinculados === 0;
  const proporcao = total > 0 ? Math.min(100, (vinculados / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onSelecionar}
      {...listRowAria(estado)}
      className={cn(
        listRowClasses(estado),
        // Faixa de largura inteira, empilhada — o helper manda na cor do estado,
        // a forma é daqui.
        'w-full flex-col items-stretch gap-1.5 px-2.5 py-2 text-left',
        listRowFocusClasses(),
      )}
    >
      {/* 1 — chip do código, largura fixa. Os códigos reais têm de 2 a 4
          letras (ADA, CC, CHA, DSSG); a largura fixa alinha a coluna toda. */}
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            'inline-block w-[52px] shrink-0 truncate rounded border px-1 py-0.5 text-center font-mono text-[11px] leading-none',
            selecionado
              ? 'border-primary/40 bg-background text-primary'
              : 'border-border bg-muted text-muted-foreground',
          )}
        >
          {codigo || '—'}
        </span>
        {!ativo && (
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">inativo</span>
        )}
      </span>

      {/* 2 — o nome, sozinho na largura toda. Nada pode entrar nesta linha. */}
      <span
        className={cn(
          'line-clamp-2 w-full text-[13px] leading-snug',
          selecionado ? 'font-semibold text-foreground' : 'text-foreground',
          !ativo && 'text-muted-foreground',
        )}
      >
        {nome || '(sem nome)'}
      </span>

      {/* 3 — progresso + contador, sempre x/y. */}
      <span className="flex items-center gap-2">
        <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <span
            className={cn(
              'block h-full rounded-full',
              semVinculo ? 'bg-warning' : selecionado ? 'bg-primary' : 'bg-muted-foreground/40',
            )}
            style={{ width: `${proporcao}%` }}
          />
        </span>
        <span
          className={cn(
            'shrink-0 font-mono text-[10px] tabular-nums',
            semVinculo ? 'text-warning' : 'text-muted-foreground',
          )}
          title={semVinculo
            ? 'Sem serviço vinculado: nenhum projeto pode ser cadastrado para este produto'
            : `${vinculados} de ${total} serviços vinculados`}
        >
          {vinculados}/{total}
        </span>
      </span>
    </button>
  );
}
