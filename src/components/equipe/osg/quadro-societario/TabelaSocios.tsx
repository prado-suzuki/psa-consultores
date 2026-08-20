import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search } from 'lucide-react';
import { fmtBRL, fmtInt, fmtPct, iniciais } from './quadroFmt';

// Tabela de sócios do Quadro Societário, com busca e linha de total. Serve a
// proposta ainda não gravada e o quadro já gravado: as duas são a mesma lista,
// e a diferença entre elas é o cabeçalho do cartão, não o corpo.

export interface LinhaSocio {
  pessoaId: string | null;
  denominacao: string;
  tipoPessoa: string | null;
  cpfCnpj: string | null;
  quotas: number;
  valor: number;
  percentual: number;
}

interface TabelaSociosProps {
  linhas: LinhaSocio[];
  totalQuotas: number;
  capital: number;
  vazio: React.ReactNode;
  /**
   * Ação por sócio (movimentar as quotas dele). Quando ausente, a tabela é só
   * leitura e a coluna de ação não existe. É o estado da proposta da PR, que
   * ainda não tem sócio no banco para movimentar.
   */
  acaoDoSocio?: (linha: LinhaSocio) => React.ReactNode;
}

export const TabelaSocios = ({ linhas, totalQuotas, capital, vazio, acaoDoSocio }: TabelaSociosProps) => {
  const [busca, setBusca] = useState('');
  const buscaAtiva = busca.trim().length > 0;

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return linhas;
    return linhas.filter(
      (l) =>
        l.denominacao.toLowerCase().includes(q) ||
        (l.cpfCnpj ?? '').toLowerCase().includes(q),
    );
  }, [linhas, busca]);

  if (linhas.length === 0) return <>{vazio}</>;

  return (
    <div className="space-y-3">
      <div className="relative w-56">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar sócio..."
          className="h-9 pl-8"
        />
      </div>

      {filtradas.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nenhum sócio encontrado.</p>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sócio</TableHead>
                <TableHead className="text-right">Quotas</TableHead>
                <TableHead className="text-right">Valor (R$)</TableHead>
                <TableHead className="w-44">Participação</TableHead>
                {acaoDoSocio && <TableHead className="w-24 text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((l, i) => {
                // Stagger limitado: depois da 15ª linha entram todas juntas.
                const delay = Math.min(i, 15) * 30;
                return (
                  <TableRow
                    key={l.pessoaId ?? l.denominacao}
                    className="animate-osg-rise motion-reduce:animate-none"
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-md bg-osg-100 flex items-center justify-center shrink-0 text-[11px] font-bold text-osg-700">
                          {iniciais(l.denominacao)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{l.denominacao}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {l.tipoPessoa ?? '—'}{l.cpfCnpj ? ` · ${l.cpfCnpj}` : ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtInt.format(l.quotas)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtBRL.format(l.valor)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-osg-100 overflow-hidden shrink-0">
                          <div
                            className="h-full rounded-full bg-osg-moss origin-left animate-osg-bar-grow motion-reduce:animate-none"
                            style={{
                              width: `${Math.min(l.percentual, 100)}%`,
                              // Barra cresce logo depois da linha assentar.
                              animationDelay: `${delay + 120}ms`,
                            }}
                          />
                        </div>
                        <span className="rounded-md bg-osg-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-osg-700">
                          {fmtPct(l.percentual)}
                        </span>
                      </div>
                    </TableCell>
                    {acaoDoSocio && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">{acaoDoSocio(l)}</div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
            {!buscaAtiva && (
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {fmtInt.format(totalQuotas)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {fmtBRL.format(capital)}
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums">{fmtPct(100)}</TableCell>
                  {acaoDoSocio && <TableCell />}
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      )}
    </div>
  );
};
