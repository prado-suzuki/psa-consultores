import { FileText, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { revisaoArquivoColors } from '@/lib/estadoDocumentoColors';
import type { ArquivoDaPendencia } from '@/hooks/useDomainPendenciasCliente';
import { FOCO } from './checklistKit';

/**
 * Um arquivo que o cliente já mandou, com o que aconteceu com ele.
 *
 * O botão de remover só some quando a PSA aprovou: antes disso o arquivo é do
 * cliente, e mandar errado tem conserto sem precisar pedir. Depois da aprovação
 * ele vira insumo de trabalho interno, e a RPC recusa a remoção mesmo que alguém
 * chame por fora — aqui a ausência do botão é só a versão educada da mesma regra.
 */
export function ArquivoEnviado({ arquivo, somenteLeitura, onRemover }: {
  arquivo: ArquivoDaPendencia;
  somenteLeitura: boolean;
  onRemover: (arquivo: ArquivoDaPendencia) => void;
}) {
  const recusado = arquivo.revisao === 'recusado';
  const aprovado = arquivo.revisao === 'aprovado';
  const cor = revisaoArquivoColors[arquivo.revisao];

  return (
    <li className={cn(
      'rounded-xl border px-3 py-2',
      // Só a linha recusada se colore: ela é a única que pede ação do cliente.
      // Arquivo em análise ou aprovado fica neutro para a lista não gritar.
      recusado ? cor.linha : 'border-border/80 bg-muted/60',
    )}>
      <div className="flex items-center gap-2">
        <FileText className={cn('h-3.5 w-3.5 shrink-0', recusado ? cor.texto : 'text-muted-foreground')} />
        <span className={cn(
          'min-w-0 flex-1 truncate text-xs font-medium',
          recusado ? cn(cor.texto, 'line-through') : 'text-muted-foreground',
        )}>
          {arquivo.nome}
        </span>
        <span className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]',
          cor.pilula,
        )}>
          {recusado ? 'Recusado' : aprovado ? 'Aprovado' : 'Em análise'}
        </span>
        {!aprovado && !somenteLeitura && (
          <button
            type="button"
            onClick={() => onRemover(arquivo)}
            title="Remover este arquivo"
            className={cn(
              'shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive',
              FOCO,
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">Remover {arquivo.nome}</span>
          </button>
        )}
      </div>
      {recusado && arquivo.motivo && (
        <p className={cn('mt-1 pl-5 text-xs leading-relaxed', cor.texto)}>{arquivo.motivo}</p>
      )}
    </li>
  );
}
