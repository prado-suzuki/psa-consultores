import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { fieldCls, labelCls } from '@/components/equipe/osg/formKit';
import type { SocioEnriched } from '@/hooks/useQuadroSocietario';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { quotasDeBigint, TRACO } from '@/components/equipe/osg/calculadora-itcmd/itcmdFmt';

interface SociedadeEQuotasProps {
  empresas: PessoaRow[];
  empresa: PessoaRow | null;
  onEscolherEmpresa: (id: string) => void;
  socios: SocioEnriched[];
  totalDeQuotas: bigint;
}

/**
 * Passo 2: a sociedade cujas quotas serão doadas, com o universo de quotas e os
 * sócios. O cálculo é por PERCENTUAL de participação, não por valor de quota:
 * se a quota valer R$ 1,00 ou R$ 2,00 o imposto é o mesmo (SPEC §5, passo 3). O
 * capital social por isso não aparece aqui — não entra em conta nenhuma.
 */
export function SociedadeEQuotas({
  empresas, empresa, onEscolherEmpresa, socios, totalDeQuotas,
}: SociedadeEQuotasProps) {
  if (empresas.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Este cliente não tem empresa Proprietária (PR) ou Controladora (CN) cadastrada.
        Sem sociedade não há quotas a doar.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="max-w-md space-y-1.5">
        <Label className={labelCls}>Sociedade</Label>
        <Select value={empresa?.id ?? undefined} onValueChange={onEscolherEmpresa}>
          <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
          <SelectContent>
            {empresas.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.denominacao}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {socios.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          Nenhum sócio vinculado a esta empresa no Quadro Societário — sem quotas não há
          percentual a apurar.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sócio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Quotas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {socios.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.socio_denominacao}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {s.socio_tipo_pessoa ?? TRACO}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {s.quotas != null ? quotasDeBigint(BigInt(s.quotas)) : TRACO}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-semibold">Universo de quotas</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {quotasDeBigint(totalDeQuotas)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  );
}
