import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatarHoras, PRODUTO_SEM_VINCULO, type LinhaProduto } from '@/lib/auditProdutividade';

interface AuditTempoMedioProdutoProps {
  linhas: LinhaProduto[];
  isLoading: boolean;
}

interface ColunaProduto {
  label: string;
  numerica: boolean;
  ajuda: string;
}

const COLUNAS: ColunaProduto[] = [
  {
    label: 'Produto',
    numerica: false,
    ajuda: 'O produto contratado na OS do projeto (código — nome), o mesmo que aparece no cadastro do projeto. É identificado cruzando o serviço da tarefa com os produtos daquela OS; quando a OS tem um único produto contratado, é ele. "Sem produto identificado" são as tarefas concluídas cujo projeto não tem OS ou cujo serviço não casa com nenhum produto contratado — não é um produto, é cadastro faltando.',
  },
  {
    label: 'Concluídos',
    numerica: true,
    ajuda: 'Quantas tarefas e subtarefas desse produto a equipe concluiu no período — a equipe toda, não uma pessoa.',
  },
  {
    label: 'Horas plan./exec.',
    numerica: true,
    ajuda: 'Soma das horas dos itens concluídos desse produto: planejado (estimativa) e executado (apontamento). Item sem o campo preenchido fica fora da soma.',
  },
  {
    label: 'Com apontamento',
    numerica: true,
    ajuda: 'Quantos dos itens concluídos têm horas realizadas apontadas. É o divisor do tempo médio — se está bem abaixo de Concluídos, a média fala de uma amostra pequena.',
  },
  {
    label: 'Tempo médio',
    numerica: true,
    ajuda: 'Horas executadas ÷ itens com apontamento: quanto tempo esse tipo de produto consome, em média, por item entregue. A tabela vem ordenada por aqui, do mais demorado para o mais rápido.',
  },
];

/**
 * Tempo médio por tipo de produto, sobre o que a equipe concluiu no período.
 *
 * É um corte por produto, não por pessoa: a mesma base de itens concluídos da
 * tabela de cima, agrupada por serviço prestado. A ordem é fixa (tempo médio
 * decrescente) porque é a pergunta que a tabela responde.
 */
export const AuditTempoMedioProduto = ({ linhas, isLoading }: AuditTempoMedioProdutoProps) => (
  <div className="space-y-2">
    <div>
      <h3 className="text-sm font-semibold text-slate-900">Tempo médio por tipo de produto</h3>
      <p className="text-xs text-slate-500">
        Itens concluídos no período agrupados pelo produto contratado na OS — soma da equipe.
      </p>
    </div>

    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUNAS.map(({ label, numerica, ajuda }) => (
                <TableHead key={label} className={cn(numerica && 'text-right')}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="border-b border-dotted border-slate-300"
                        aria-description={ajuda}
                      >
                        {label}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" align={numerica ? 'end' : 'start'} className="max-w-xs">
                      <p className="text-xs leading-relaxed">{ajuda}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={COLUNAS.length} className="py-8 text-center text-slate-500">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : linhas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUNAS.length} className="py-8 text-center text-slate-500">
                  Nenhum item concluído no período
                </TableCell>
              </TableRow>
            ) : (
              linhas.map(linha => {
                const semVinculo = linha.produtoId === PRODUTO_SEM_VINCULO;
                return (
                  <TableRow key={linha.produtoId}>
                    <TableCell
                      className={cn('text-sm', semVinculo ? 'italic text-slate-400' : 'font-medium')}
                    >
                      {linha.nome}
                    </TableCell>
                    <TableCell className="text-right text-sm">{linha.concluidos}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm">
                      <span className="text-slate-500">{formatarHoras(linha.horasPlanejadas)}</span>
                      <span className="text-slate-300"> / </span>
                      <span className="font-medium text-slate-900">
                        {formatarHoras(linha.horasExecutadas)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-500">
                      {linha.itensComHorasExecutadas} de {linha.concluidos}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">
                      {formatarHoras(linha.tempoMedio)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
);
