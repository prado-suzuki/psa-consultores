import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  formatarHoras, PRODUTO_SEM_VINCULO,
  type ClientesDoProduto, type LinhaPessoaProduto, type LinhaProduto,
} from '@/lib/auditProdutividade';
import { AuditClientesDoProduto } from './AuditClientesDoProduto';

interface AuditTempoMedioProdutoProps {
  linhas: LinhaProduto[];
  isLoading: boolean;
  /** Quem mexeu em cada produto, por `produtoId` — aba "Colaboradores" do painel. */
  pessoasPorProduto: Record<string, LinhaPessoaProduto[]>;
  /** Clientes de cada produto e quem executou neles — aba "Clientes" do painel. */
  clientesPorProduto: Record<string, ClientesDoProduto>;
}

const SEM_CLIENTES: ClientesDoProduto = { clientes: [], pessoasPorCliente: {} };

interface ColunaProduto {
  label: string;
  numerica: boolean;
  ajuda: string;
}

const COLUNAS: ColunaProduto[] = [
  {
    label: 'Produto',
    numerica: false,
    ajuda: 'O produto contratado na OS do projeto (código — nome), o mesmo que aparece no cadastro do projeto. É identificado cruzando o serviço da tarefa com os produtos daquela OS; quando a OS tem um único produto contratado, é ele. "Sem produto identificado" são as tarefas concluídas cujo projeto não tem OS ou cujo serviço não casa com nenhum produto contratado — não é um produto, é cadastro faltando. Clique na linha para ver em quais clientes as horas desse produto foram gastas e, dentro de cada cliente, quem executou.',
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
 *
 * Clicar na linha abre para onde as horas do produto foram: primeiro por
 * cliente, e dentro do cliente por quem executou — com um atalho para a lista de
 * colaboradores do produto inteiro, que é o inverso da aba Produtividade, onde a
 * linha expandida da pessoa mostra os produtos dela.
 */
export const AuditTempoMedioProduto = ({
  linhas, isLoading, pessoasPorProduto, clientesPorProduto,
}: AuditTempoMedioProdutoProps) => {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const alternar = (produtoId: string) => {
    setExpandidos(atual => {
      const proxima = new Set(atual);
      if (proxima.has(produtoId)) proxima.delete(produtoId);
      else proxima.add(produtoId);
      return proxima;
    });
  };

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Tempo médio por tipo de produto</h3>
        <p className="text-xs text-muted-foreground">
          Itens concluídos no período agrupados pelo produto contratado na OS — soma da equipe.
          Clique num produto para ver os clientes dele e, dentro do cliente, quem está executando.
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
                          className="border-b border-dotted border-border"
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
                  <TableCell colSpan={COLUNAS.length} className="py-8 text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : linhas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUNAS.length} className="py-8 text-center text-muted-foreground">
                    Nenhum item concluído no período
                  </TableCell>
                </TableRow>
              ) : (
                linhas.map(linha => {
                  const semVinculo = linha.produtoId === PRODUTO_SEM_VINCULO;
                  const aberta = expandidos.has(linha.produtoId);
                  return (
                    <Fragment key={linha.produtoId}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => alternar(linha.produtoId)}
                      >
                        <TableCell
                          className={cn('text-sm', semVinculo ? 'italic text-slate-400' : 'font-medium')}
                        >
                          <span className="flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-expanded={aberta}
                              aria-label={`Ver os clientes de ${linha.nome}`}
                              onClick={event => {
                                event.stopPropagation();
                                alternar(linha.produtoId);
                              }}
                              className="text-slate-400 transition-colors hover:text-slate-700"
                            >
                              {aberta
                                ? <ChevronDown className="h-4 w-4" />
                                : <ChevronRight className="h-4 w-4" />}
                            </button>
                            {linha.nome}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">{linha.concluidos}</TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm">
                          <span className="text-muted-foreground">{formatarHoras(linha.horasPlanejadas)}</span>
                          <span className="text-slate-300"> / </span>
                          <span className="font-medium text-foreground">
                            {formatarHoras(linha.horasExecutadas)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {linha.itensComHorasExecutadas} de {linha.concluidos}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          {formatarHoras(linha.tempoMedio)}
                        </TableCell>
                      </TableRow>
                      {aberta && (
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableCell colSpan={COLUNAS.length} className="p-4">
                            <AuditClientesDoProduto
                              produto={linha.nome}
                              {...(clientesPorProduto[linha.produtoId] ?? SEM_CLIENTES)}
                              pessoasDoProduto={pessoasPorProduto[linha.produtoId] ?? []}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
