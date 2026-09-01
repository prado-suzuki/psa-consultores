import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  formatarHoras, PRODUTO_SEM_VINCULO, type LinhaProdutoPessoa,
} from '@/lib/auditProdutividade';

interface AuditProdutosDaPessoaProps {
  nome: string;
  linhas: LinhaProdutoPessoa[];
}

/**
 * Conteúdo da linha expandida de um colaborador: os produtos contratados em que
 * ele mexeu no período.
 *
 * "Tocados" inclui o que ainda não foi concluído — é o que mostra em que a
 * pessoa está trabalhando agora. As horas saem só dos itens concluídos, para
 * bater com a coluna de horas da linha dela.
 */
export const AuditProdutosDaPessoa = ({ nome, linhas }: AuditProdutosDaPessoaProps) => {
  if (linhas.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhum produto identificado no período.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Produtos em que {nome} mexeu no período
      </p>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-8 text-xs">Produto</TableHead>
            <TableHead className="h-8 text-right text-xs">Tocados</TableHead>
            <TableHead className="h-8 text-right text-xs">Concluídos</TableHead>
            <TableHead className="h-8 text-right text-xs">Horas plan./exec.</TableHead>
            <TableHead className="h-8 text-right text-xs">Tempo médio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map(linha => (
            <TableRow key={linha.produtoId} className="hover:bg-transparent">
              <TableCell
                className={cn(
                  'py-1.5 text-xs',
                  linha.produtoId === PRODUTO_SEM_VINCULO
                    ? 'italic text-muted-foreground'
                    : 'font-medium text-foreground',
                )}
              >
                {linha.nome}
              </TableCell>
              <TableCell className="py-1.5 text-right text-xs">{linha.itensTocados}</TableCell>
              <TableCell className="py-1.5 text-right text-xs">{linha.concluidos}</TableCell>
              <TableCell className="whitespace-nowrap py-1.5 text-right text-xs">
                <span className="text-muted-foreground">{formatarHoras(linha.horasPlanejadas)}</span>
                <span className="text-slate-300"> / </span>
                <span className="font-medium text-foreground">
                  {formatarHoras(linha.horasExecutadas)}
                </span>
              </TableCell>
              <TableCell className="py-1.5 text-right text-xs font-semibold">
                {formatarHoras(linha.tempoMedio)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
