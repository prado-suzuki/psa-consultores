import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { TotalDoCenario } from '@/lib/osg/acervoItcmd';
import { CENARIOS, ROTULO_CENARIO, type Cenario, type SaidaSimulacao } from '@/lib/osg/itcmd/simulacao';
import {
  brlDeDecimal, pctDeDecimal, quotasDeBigint, TRACO,
} from '@/components/equipe/osg/calculadora-itcmd/itcmdFmt';

interface QuadroDeSaidaProps {
  saida: SaidaSimulacao | null;
  erro: string | null;
  acervo: Record<Cenario, TotalDoCenario>;
  distribuicaoFecha: boolean;
}

/**
 * Passo 6 do FLUXO: uma linha por donatário, uma coluna por cenário.
 *
 * Os três cenários não são alternativas a escolher: contábil é a base que vai na
 * escritura, ITR é o que a SEFAZ pode exigir se olhar o valor declarado no
 * imposto rural, e mercado é o teto do risco se ela reavaliar. Servem para o
 * cliente dimensionar exposição antes de assinar — a SEFAZ tem cinco anos para
 * revisar e a multa por subavaliação é de 100% da diferença.
 *
 * Cenário sem valor no cadastro aparece como `—` e marcado, nunca como R$ 0,00.
 */
export function QuadroDeSaida({ saida, erro, acervo, distribuicaoFecha }: QuadroDeSaidaProps) {
  if (erro) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{erro}</span>
      </div>
    );
  }
  if (!saida) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {distribuicaoFecha
          ? 'Complete os passos anteriores para o quadro ser apurado.'
          : 'O quadro aparece quando a parte disponível estiver inteiramente distribuída.'}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Donatário</TableHead>
              <TableHead className="text-right">Quotas</TableHead>
              <TableHead className="text-right">Participação</TableHead>
              {CENARIOS.map((c) => (
                <TableHead key={`base-${c}`} className="text-right">
                  Base — {ROTULO_CENARIO[c]}
                </TableHead>
              ))}
              {CENARIOS.map((c) => (
                <TableHead key={`itcd-${c}`} className="text-right">
                  ITCD — {ROTULO_CENARIO[c]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {saida.linhas.map((l) => (
              <TableRow key={l.donatarioId}>
                <TableCell className="font-medium">
                  {l.nome}
                  {l.doacaoAnterior && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground">
                      (acumula {brlDeDecimal(l.doacaoAnterior)} de doação anterior)
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums">
                  {quotasDeBigint(BigInt(l.quotasRecebidas))}
                </TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums">
                  {pctDeDecimal(l.percentual)}
                </TableCell>
                {CENARIOS.map((c) => (
                  <TableCell key={`base-${c}`} className="text-right font-mono text-xs tabular-nums">
                    {brlDeDecimal(l.porCenario[c]?.base ?? null)}
                  </TableCell>
                ))}
                {CENARIOS.map((c) => (
                  <TableCell
                    key={`itcd-${c}`}
                    className="text-right font-mono text-xs font-semibold tabular-nums"
                  >
                    {brlDeDecimal(l.porCenario[c]?.imposto ?? null)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="font-semibold">
                Total ({saida.linhas.length} donatário(s))
              </TableCell>
              {CENARIOS.map((c) => (
                <TableCell key={`tb-${c}`} className="text-right font-semibold tabular-nums">
                  {brlDeDecimal(saida.basesPorCenario[c])}
                </TableCell>
              ))}
              {CENARIOS.map((c) => (
                <TableCell key={`ti-${c}`} className="text-right font-semibold tabular-nums">
                  {brlDeDecimal(saida.totaisPorCenario[c])}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-osg-200 bg-osg-50 text-osg-700">
          UPF de {saida.competencia}: {brlDeDecimal(saida.upf)}
        </Badge>
        <Badge variant="outline" className="border-osg-200 bg-osg-50 text-osg-700">
          Universo de {quotasDeBigint(BigInt(saida.totalDeQuotas))} quotas
        </Badge>
        {saida.cenariosIndisponiveis.map((c) => (
          <Badge
            key={c}
            variant="outline"
            className="border-destructive/40 bg-destructive/5 text-destructive"
          >
            {ROTULO_CENARIO[c]}: {TRACO} cenário incompleto, sem valor em nenhum dos{' '}
            {acervo[c].imoveis} imóveis
          </Badge>
        ))}
        {CENARIOS.filter((c) => acervo[c].total !== null && acervo[c].semValor > 0).map((c) => (
          <Badge
            key={`parcial-${c}`}
            variant="outline"
            className="border-amber-400/60 bg-amber-50 text-amber-800"
          >
            {ROTULO_CENARIO[c]}: cenário incompleto — a base saiu de {acervo[c].comValor} de{' '}
            {acervo[c].imoveis} imóveis
          </Badge>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        A base é integral (100%): existe a opção de doar com reserva de usufruto e recolher 70%
        agora, mas isso obriga a mais 70% na extinção — 140% no total. Cada donatário é
        arredondado uma única vez e os totais são a soma dos arredondados.
      </p>
    </div>
  );
}
