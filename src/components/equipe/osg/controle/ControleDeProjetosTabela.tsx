import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { parseDate } from '@/lib/dateUtils';
import { situacaoLabel, type LinhaDoControle } from '@/lib/osgControleDeProjetos';
import { getRegiaoLabel } from '@/lib/regioes';
import { cn } from '@/lib/utils';

/**
 * Cor da situação da OS, pelo PAPEL e não pelo tom: quem resolve o matiz é o
 * tema da área, no `<html>`. Os papéis são os mesmos que o projeto já usa em
 * `projetoStatusColors.ts`, porque na mesma tela a mesma ideia não pode ter
 * duas cores.
 */
const SITUACAO_BADGE: Record<string, string> = {
  em_andamento: 'bg-status-andamento-soft text-status-andamento border-status-andamento/15',
  suspenso: 'bg-status-espera-soft text-status-espera border-status-espera/15',
  concluido: 'bg-status-feito-soft text-status-feito border-status-feito/15',
  cancelado: 'bg-status-ajuste-soft text-status-ajuste border-status-ajuste/15',
};

function data(valor: string | null): string {
  if (!valor) return '—';
  return format(parseDate(valor), 'dd/MM/yyyy');
}

function Situacao({ situacao }: { situacao: string | null }) {
  const classe = situacao ? SITUACAO_BADGE[situacao] : undefined;
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap font-normal', classe)}>
      {situacaoLabel(situacao)}
    </Badge>
  );
}

/**
 * O prazo, com o aviso de vencido ao lado.
 *
 * A data continua legível quando está vencida: tingir a data inteira de
 * vermelho custaria contraste sem dizer mais do que o ícone já diz, e o ícone
 * carrega o texto acessível que a cor sozinha não carrega.
 */
function Prazo({ linha }: { linha: LinhaDoControle }) {
  if (!linha.prazoVencido) return <>{data(linha.dataFim)}</>;
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      {data(linha.dataFim)}
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertTriangle
            className="h-3.5 w-3.5 shrink-0 text-destructive"
            aria-label="Prazo vencido"
          />
        </TooltipTrigger>
        <TooltipContent>Prazo vencido e a OS continua aberta</TooltipContent>
      </Tooltip>
    </span>
  );
}

/**
 * A observação, que é a coluna N da planilha.
 *
 * Fica em duas linhas com o texto inteiro no hover. Em produção a maior tem 486
 * caracteres, e deixar a célula crescer faria uma linha empurrar a tabela toda;
 * cortar sem oferecer o resto esconderia justamente o motivo de o trabalho estar
 * parado, que é para o que a equipe lê esta coluna.
 */
function Observacao({ texto }: { texto: string | null }) {
  if (!texto) return <span className="text-muted-foreground">—</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="line-clamp-2 cursor-default text-left">{texto}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-md whitespace-pre-line">{texto}</TooltipContent>
    </Tooltip>
  );
}

export function ControleDeProjetosTabela({ linhas }: { linhas: LinhaDoControle[] }) {
  if (linhas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma ordem de serviço da OSG com esses filtros.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ width: '16%' }}>Cliente</TableHead>
            <TableHead style={{ width: '8%' }} className="whitespace-nowrap">
              OS
            </TableHead>
            <TableHead style={{ width: '7%' }}>Região</TableHead>
            <TableHead style={{ width: '10%' }}>Situação</TableHead>
            <TableHead style={{ width: '9%' }} className="whitespace-nowrap">
              Início
            </TableHead>
            <TableHead style={{ width: '9%' }} className="whitespace-nowrap">
              Prazo
            </TableHead>
            <TableHead style={{ width: '14%' }}>Produtos</TableHead>
            <TableHead style={{ width: '12%' }}>Responsáveis</TableHead>
            <TableHead style={{ width: '15%' }}>Observação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((linha) => (
            <TableRow key={linha.osId}>
              <TableCell className="whitespace-normal break-words font-medium">
                {linha.clienteNome}
                {!linha.clienteAtivo && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">(inativo)</span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">{linha.numeroOs || '—'}</TableCell>
              <TableCell className="text-sm">
                {linha.regiao ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-default">{linha.regiao}</span>
                    </TooltipTrigger>
                    <TooltipContent>{getRegiaoLabel(linha.regiao)}</TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <Situacao situacao={linha.situacao} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">{data(linha.dataInicio)}</TableCell>
              <TableCell className="text-sm">
                <Prazo linha={linha} />
              </TableCell>
              <TableCell className="whitespace-normal break-words text-sm">
                {linha.produtos.length > 0 ? (
                  linha.produtos.join(', ')
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="whitespace-normal break-words text-sm">
                {linha.responsaveis.length > 0 ? (
                  linha.responsaveis.join(', ')
                ) : (
                  // OS sem projeto criado. É informação, e não falha: em
                  // produção, 61 dos 84 clientes da OSG com OS estão assim.
                  <span className="text-muted-foreground">Sem projeto</span>
                )}
              </TableCell>
              <TableCell className="whitespace-normal break-words text-sm">
                <Observacao texto={linha.observacoes} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
