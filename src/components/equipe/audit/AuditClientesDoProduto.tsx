import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  CLIENTE_SEM_VINCULO, formatarHoras,
  type LinhaClienteProduto, type LinhaPessoaProduto,
} from '@/lib/auditProdutividade';
import { AuditPessoasDoProduto } from './AuditPessoasDoProduto';

interface AuditClientesDoProdutoProps {
  produto: string;
  clientes: LinhaClienteProduto[];
  /** `clienteId` → quem executou naquele cliente, dentro deste produto. */
  pessoasPorCliente: Record<string, LinhaPessoaProduto[]>;
  /** Todo mundo que mexeu no produto, sem quebrar por cliente. */
  pessoasDoProduto: LinhaPessoaProduto[];
}

/**
 * Painel da linha expandida de um produto: para onde foram as horas dele.
 *
 * São três telas no mesmo espaço, e não três níveis empilhados na tabela — o
 * aninhamento de produto → cliente → pessoa dentro da mesma tabela deixa de dar
 * para ler depois do segundo produto aberto:
 * 1. "Clientes" (padrão): quais clientes têm esse produto e qual está pesando;
 * 2. clicar num cliente troca o painel por quem executou ALI, com trilha de volta;
 * 3. "Colaboradores": quem mexeu no produto todo — a leitura que já existia.
 *
 * O estado vive aqui de propósito: fechar o produto desmonta o painel e a
 * próxima abertura recomeça em "Clientes", que é a pergunta de entrada.
 */
export const AuditClientesDoProduto = ({
  produto, clientes, pessoasPorCliente, pessoasDoProduto,
}: AuditClientesDoProdutoProps) => {
  const [aba, setAba] = useState('clientes');
  const [clienteId, setClienteId] = useState<string | null>(null);

  const clienteAberto = clienteId
    ? clientes.find(c => c.clienteId === clienteId) ?? null
    : null;

  // Nível 2: quem executou dentro de um cliente. Substitui o painel inteiro para
  // não empilhar mais uma tabela dentro da outra.
  if (clienteAberto) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setClienteId(null)}
            className="flex items-center gap-0.5 rounded text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Clientes
          </button>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-foreground">{clienteAberto.nome}</span>
          <span className="text-slate-400">em {produto}</span>
        </div>
        <AuditPessoasDoProduto
          linhas={pessoasPorCliente[clienteAberto.clienteId] ?? []}
          vazio="Ninguém registrou ação neste cliente no período."
        />
      </div>
    );
  }

  return (
    <Tabs value={aba} onValueChange={setAba} className="space-y-2">
      <TabsList className="h-8">
        <TabsTrigger value="clientes" className="text-xs">Clientes</TabsTrigger>
        <TabsTrigger value="pessoas" className="text-xs">Colaboradores</TabsTrigger>
      </TabsList>

      <TabsContent value="clientes" className="mt-0">
        {clientes.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum cliente com registro neste produto no período.</p>
        ) : (
          <>
            <p className="mb-1 text-xs text-muted-foreground">
              Clique num cliente para ver quem está executando nele.
            </p>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 text-xs">Cliente</TableHead>
                  <TableHead className="h-8 text-right text-xs">Tocados</TableHead>
                  <TableHead className="h-8 text-right text-xs">Concluídos</TableHead>
                  <TableHead className="h-8 text-right text-xs">Horas plan./exec.</TableHead>
                  <TableHead className="h-8 text-right text-xs">Tempo médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map(linha => {
                  const semVinculo = linha.clienteId === CLIENTE_SEM_VINCULO;
                  return (
                    <TableRow
                      key={linha.clienteId}
                      className="cursor-pointer"
                      onClick={() => setClienteId(linha.clienteId)}
                    >
                      <TableCell className="py-1.5 text-xs">
                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation();
                            setClienteId(linha.clienteId);
                          }}
                          className={cn(
                            'flex items-center gap-1 text-left',
                            semVinculo ? 'italic text-slate-400' : 'font-medium text-foreground',
                          )}
                        >
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          {linha.nome}
                        </button>
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
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </TabsContent>

      <TabsContent value="pessoas" className="mt-0">
        <AuditPessoasDoProduto
          linhas={pessoasDoProduto}
          vazio="Ninguém registrou ação neste produto no período."
        />
      </TabsContent>
    </Tabs>
  );
};
