import { AlertTriangle, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CurrencyInput } from '@/components/equipe/osg/CurrencyInput';
import { fieldCls } from '@/components/equipe/osg/formKit';
import type { CalculadoraItcmd } from '@/hooks/useCalculadoraItcmdController';
import { quotasDeBigint } from '@/components/equipe/osg/calculadora-itcmd/itcmdFmt';

interface DistribuicaoDasQuotasProps {
  calc: CalculadoraItcmd;
}

/**
 * Passos 4 e 5 juntos, porque são a mesma linha da tabela: por donatário, quanto
 * ele já recebeu antes e quanto da disponível recebe agora.
 *
 * A **legítima é calculada** e não se digita: metade do patrimônio de cada
 * doador, dividida entre os herdeiros, com teto ao inteiro por doador e por
 * herdeiro (SPEC §6.1). A **disponível é entrada**: o destino dela é escolha do
 * doador, caso a caso — igualar a participação final é um uso possível, não a
 * regra (§6.3).
 *
 * A **doação anterior é declarada**, nunca derivada do quadro societário: o
 * quadro é foto do estado, não histórico, e deduzir dele conta duas vezes
 * (§4 e o caminho errado N5).
 */
export function DistribuicaoDasQuotas({ calc }: DistribuicaoDasQuotasProps) {
  const { distribuicao, donatarios } = calc;

  if (!distribuicao) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Confirme ao menos um doador e um donatário para a legítima ser calculada.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
        <Resumo
          titulo="Legítima por herdeiro"
          valor={quotasDeBigint(distribuicao.legitimaPorHerdeiro)}
          detalhe={distribuicao.porDoador
            .map((d) => `${calc.nomeDaPessoa(d.doadorId)}: ${quotasDeBigint(d.legitimaPorHerdeiro)}`)
            .join(' + ')}
        />
        <Resumo
          titulo="Legítima total"
          valor={quotasDeBigint(distribuicao.legitimaTotal)}
          detalhe={`${quotasDeBigint(distribuicao.legitimaPorHerdeiro)} × ${donatarios.length} herdeiro(s)`}
        />
        <Resumo
          titulo="Disponível a distribuir"
          valor={quotasDeBigint(calc.disponivelTotal)}
          detalhe={`Patrimônio doado ${quotasDeBigint(distribuicao.patrimonioDoado)} − legítima total`}
        />
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Donatário</TableHead>
              <TableHead className="text-right">Legítima (quotas)</TableHead>
              <TableHead className="w-40">Disponível (quotas)</TableHead>
              <TableHead className="text-right">Total recebido</TableHead>
              <TableHead className="w-44">Doação anterior (R$)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {donatarios.map((d) => (
              <TableRow key={d.pessoaId}>
                <TableCell className="font-medium">{d.denominacao}</TableCell>
                <TableCell
                  className="text-right font-mono text-xs tabular-nums"
                  title="Calculada: metade do patrimônio de cada doador ÷ nº de herdeiros, com teto ao inteiro"
                >
                  {quotasDeBigint(distribuicao.legitimaPorHerdeiro)}
                </TableCell>
                <TableCell>
                  <Input
                    aria-label={`Disponível para ${d.denominacao}`}
                    className={`${fieldCls} text-right font-mono text-xs`}
                    inputMode="numeric"
                    value={calc.disponivelDigitada(d.pessoaId)}
                    onChange={(e) => calc.setDisponivel(
                      d.pessoaId, e.target.value.replace(/\D/g, ''),
                    )}
                    placeholder="0"
                  />
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold tabular-nums">
                  {quotasDeBigint(d.quotas)}
                </TableCell>
                <TableCell>
                  <CurrencyInput
                    aria-label={`Doação anterior de ${d.denominacao}`}
                    className={`${fieldCls} text-right font-mono text-xs`}
                    value={d.doacaoAnterior}
                    onChange={(raw) => calc.setDoacaoAnterior(d.pessoaId, raw)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Total</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {quotasDeBigint(distribuicao.legitimaTotal)}
              </TableCell>
              <TableCell className="font-semibold tabular-nums">
                {quotasDeBigint(calc.disponivelDistribuida)}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {quotasDeBigint(distribuicao.legitimaTotal + calc.disponivelDistribuida)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {calc.distribuicaoFecha ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-osg-700">
          <Check className="h-3.5 w-3.5" />
          A disponível fecha: {quotasDeBigint(calc.disponivelTotal)} quotas distribuídas.
        </p>
      ) : (
        <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          {calc.disponivelRestante > 0n
            ? `Faltam ${quotasDeBigint(calc.disponivelRestante)} quotas da parte disponível.`
            : `Distribuídas ${quotasDeBigint(-calc.disponivelRestante)} quotas além da parte disponível.`}
          {' '}O quadro de saída só aparece quando a distribuição fecha.
        </p>
      )}
    </div>
  );
}

function Resumo({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe: string }) {
  return (
    <div className="rounded-md border border-osg-200/80 bg-osg-50/40 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-osg-700">{titulo}</p>
      <p className="mt-1 font-mono text-sm font-semibold tabular-nums">{valor}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{detalhe}</p>
    </div>
  );
}
