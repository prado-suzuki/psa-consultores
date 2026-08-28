import { X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { ChamadoPrazoRow, RecortePrazo } from '@/lib/gestaoChamadosDashboardAnalytics';

interface DashboardPrazoDetalheProps {
  recorte: RecortePrazo;
  onRecorteChange: (recorte: RecortePrazo) => void;
  onClose: () => void;
  foraDoPrazo: ChamadoPrazoRow[];
  semResposta: ChamadoPrazoRow[];
  onNavigate: (ticketId: string) => void;
}

const vazioPorRecorte: Record<RecortePrazo, string> = {
  fora: 'Nenhum chamado respondido fora do prazo neste recorte.',
  sem_resposta: 'Todos os chamados deste recorte já tiveram primeira resposta.',
};

function dia(valor: string | Date) {
  return format(typeof valor === 'string' ? new Date(valor) : valor, 'dd/MM/yy');
}

/**
 * Atraso em relação ao prazo. Positivo é estouro; negativo é o que ainda resta,
 * caso que só aparece na aba de sem resposta — lá o chamado pode estar em dia.
 */
function atraso(dias: number) {
  const absoluto = Math.abs(dias);
  const texto = absoluto < 1 ? `${Math.round(absoluto * 24)}h` : `${absoluto.toFixed(1)}d`;
  return dias > 0 ? `+${texto}` : `−${texto}`;
}

function TabelaPrazo({
  linhas,
  recorte,
  onNavigate,
}: {
  linhas: ChamadoPrazoRow[];
  recorte: RecortePrazo;
  onNavigate: (ticketId: string) => void;
}) {
  if (linhas.length === 0)
    return <p className="py-8 text-center text-sm text-muted-foreground">{vazioPorRecorte[recorte]}</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[220px]">Chamado</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Aberto</TableHead>
          <TableHead>Prazo</TableHead>
          <TableHead>Respondido</TableHead>
          <TableHead>{recorte === 'fora' ? 'Respondido por' : 'Responsável'}</TableHead>
          <TableHead className="text-right">
            {recorte === 'fora' ? 'Atraso' : 'Vencido há'}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.map((linha) => (
          <TableRow key={linha.id}>
            <TableCell>
              <button
                onClick={() => onNavigate(linha.id)}
                className="text-left font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {linha.titulo}
              </button>
            </TableCell>
            <TableCell className="text-sm">{linha.cliente}</TableCell>
            <TableCell className="text-sm tabular-nums">{dia(linha.abertoEm)}</TableCell>
            <TableCell className="text-sm tabular-nums">{dia(linha.prazo)}</TableCell>
            <TableCell className="text-sm tabular-nums">
              {linha.respondidoEm ? dia(linha.respondidoEm) : '—'}
            </TableCell>
            <TableCell className="whitespace-nowrap text-sm">{linha.responsavel}</TableCell>
            <TableCell
              className={cn(
                'text-right text-sm font-medium tabular-nums',
                linha.atrasoDias > 0 ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {atraso(linha.atrasoDias)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Os chamados por trás dos KPIs de prazo, abertos ao clicar no card.
 *
 * Existe porque a tabela da LISTA de chamados não responde esta pergunta: ela
 * mostra o `PrazoBadge`, que é um cálculo ao vivo e devolve "Concluído" para
 * todo chamado encerrado — um chamado respondido com dias de atraso e depois
 * fechado some do radar por lá. Aqui as colunas são as da apuração de SLA:
 * contra que data a resposta deveria ter chegado, e quando chegou.
 */
export function DashboardPrazoDetalhe({
  recorte,
  onRecorteChange,
  onClose,
  foraDoPrazo,
  semResposta,
  onNavigate,
}: DashboardPrazoDetalheProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-base">Chamados por prazo</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar detalhamento">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={recorte} onValueChange={(valor) => onRecorteChange(valor as RecortePrazo)}>
          <TabsList>
            <TabsTrigger value="fora">Fora do prazo ({foraDoPrazo.length})</TabsTrigger>
            <TabsTrigger value="sem_resposta">Sem resposta ({semResposta.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="fora" className="mt-4">
            <TabelaPrazo linhas={foraDoPrazo} recorte="fora" onNavigate={onNavigate} />
          </TabsContent>
          <TabsContent value="sem_resposta" className="mt-4">
            <TabelaPrazo linhas={semResposta} recorte="sem_resposta" onNavigate={onNavigate} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
