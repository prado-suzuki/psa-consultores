import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { origemDoValorDeItr, type TotalDoCenario, type ImovelDoAcervo } from '@/lib/osg/acervoItcmd';
import { CENARIOS, ROTULO_CENARIO, type Cenario } from '@/lib/osg/itcmd/simulacao';
import { origemDoValor } from '@/lib/osg/valoresDoBem';
import { brlDeDecimal, brlDeNumero, TRACO } from '@/components/equipe/osg/calculadora-itcmd/itcmdFmt';

interface AcervoImoveisProps {
  imoveis: ImovelDoAcervo[];
  acervo: Record<Cenario, TotalDoCenario>;
  bensForaDoAcervo: number;
}

/**
 * Passo 1 do FLUXO: os imóveis do cliente com os três valores e os três totais.
 *
 * O valor contábil e o de mercado vêm derivados de `valoresDoBem` (bem com
 * matrícula soma as matrículas). O de ITR sai de `bem.vlr_itr_iptu`, o único
 * campo que existe, e a legenda diz isso em cada célula — a matrícula não tem
 * coluna de ITR e fingir que a mesma regra vale seria falso.
 */
export function AcervoImoveis({ imoveis, acervo, bensForaDoAcervo }: AcervoImoveisProps) {
  if (imoveis.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhum imóvel deste cliente participa da estruturação — sem acervo não há base a apurar.
        {bensForaDoAcervo > 0 && ` (${bensForaDoAcervo} bem/bens fora do acervo de imóveis.)`}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref.</TableHead>
              <TableHead>Denominação</TableHead>
              {CENARIOS.map((c) => (
                <TableHead key={c} className="text-right">{ROTULO_CENARIO[c]}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {imoveis.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-xs">{i.referencia}</TableCell>
                <TableCell className="font-medium">{i.denominacao}</TableCell>
                <TableCell
                  className="text-right font-mono text-xs tabular-nums"
                  title={origemDoValor(i.valores, 'contabil')}
                >
                  {brlDeNumero(i.valores.contabil.valor)}
                </TableCell>
                <TableCell
                  className="text-right font-mono text-xs tabular-nums"
                  title={origemDoValorDeItr(i)}
                >
                  {brlDeNumero(i.vlr_itr_iptu)}
                </TableCell>
                <TableCell
                  className="text-right font-mono text-xs tabular-nums"
                  title={origemDoValor(i.valores, 'mercado')}
                >
                  {brlDeNumero(i.valores.mercado.valor)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-semibold">
                Total do acervo ({imoveis.length} imóvel/imóveis)
              </TableCell>
              {CENARIOS.map((c) => (
                <TableCell key={c} className="text-right font-semibold tabular-nums">
                  {brlDeDecimal(acervo[c].total)}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <div className="flex flex-wrap gap-2">
        {CENARIOS.map((c) => <AvisoDoCenario key={c} cenario={c} total={acervo[c]} />)}
      </div>

      {bensForaDoAcervo > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {bensForaDoAcervo} bem/bens do cliente ficaram fora: só imóvel (rural ou urbano) que
          participa da estruturação compõe o acervo doado. Participação societária entraria
          duas vezes, uma como bem e outra como a própria sociedade.
        </p>
      )}
    </div>
  );
}

/**
 * Um cenário que soma parcial não se apresenta como total. O selo diz quantos
 * imóveis estão sem valor, e "sem valor nenhum" é caso separado de "parcial".
 */
function AvisoDoCenario({ cenario, total }: { cenario: Cenario; total: TotalDoCenario }) {
  if (total.total === null) {
    return (
      <Badge variant="outline" className="border-destructive/40 bg-destructive/5 text-destructive">
        {ROTULO_CENARIO[cenario]}: {TRACO} sem valor em nenhum dos {total.imoveis} imóveis —
        cenário indisponível
      </Badge>
    );
  }
  if (total.semValor > 0) {
    return (
      <Badge variant="outline" className="border-amber-400/60 bg-amber-50 text-amber-800">
        {ROTULO_CENARIO[cenario]}: incompleto — {total.semValor} de {total.imoveis} imóveis
        sem valor, o total é parcial
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-osg-200 bg-osg-50 text-osg-700">
      {ROTULO_CENARIO[cenario]}: completo — {total.comValor} de {total.imoveis} imóveis
    </Badge>
  );
}
