import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search } from 'lucide-react';
import { fmtBRL, fmtInt, fmtPct } from './quadroFmt';

// Tabela de sócios do Quadro Societário, com busca e linha de total. Serve a
// proposta ainda não gravada e o quadro já gravado: as duas são a mesma lista,
// e a diferença entre elas é o cabeçalho do cartão, não o corpo.
//
// Saíram daqui, na reorganização da interface: o avatar de iniciais, a barra de
// participação, o selo colorido do percentual e a coluna de Ações. Os três
// primeiros eram decoração repetida linha a linha sobre dados que já estavam
// escritos ao lado; o quarto abria o movimento avulso já em Cessão, o que fazia
// um clique na linha significar um gesto que ninguém escolheu. O que a tabela
// mostra é o SALDO e de onde ele veio.

export interface LinhaSocio {
  pessoaId: string | null;
  denominacao: string;
  tipoPessoa: string | null;
  cpfCnpj: string | null;
  quotas: number;
  valor: number;
  percentual: number;
  /**
   * De onde vem o saldo desta linha: "Constituição", o nome do ato, a forma do
   * movimento avulso. Vazio na proposta ainda não gravada, que não tem
   * movimento no livro a nomear.
   */
  procedencia?: string[];
}

interface TabelaSociosProps {
  linhas: LinhaSocio[];
  totalQuotas: number;
  capital: number;
  vazio: React.ReactNode;
}

/**
 * A procedência do saldo: a primeira origem sempre à vista, as demais atrás de
 * um comando textual. Um sócio com muitos atos rendia uma pilha de selos mais
 * alta que a própria linha, e o vínculo com o ledger não pode sumir por isso.
 * Não é o histórico completo dos movimentos: é de que atos este SALDO veio.
 */
const Procedencia = ({ origens }: { origens: string[] }) => {
  const [tudo, setTudo] = useState(false);
  const visiveis = tudo ? origens : origens.slice(0, 1);

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {visiveis.map((origem) => (
        <span
          key={origem}
          className="rounded bg-osg-50 px-1.5 py-0.5 text-[10px] font-medium text-osg-700"
        >
          {origem}
        </span>
      ))}
      {origens.length > 1 && (
        <button
          type="button"
          onClick={() => setTudo((v) => !v)}
          className="text-[10px] font-medium text-osg-700 underline-offset-2 hover:underline"
        >
          {tudo ? 'Ocultar procedência' : `Ver procedência (${origens.length})`}
        </button>
      )}
    </div>
  );
};

export const TabelaSocios = ({ linhas, totalQuotas, capital, vazio }: TabelaSociosProps) => {
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
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sócio</TableHead>
                <TableHead className="text-right">Quotas</TableHead>
                {/* Os títulos dizem de QUE valor e de QUE participação se trata:
                    a coluna é capital ao nominal, não preço, e o percentual é
                    do capital, não do voto — que pode divergir e tem tabela
                    própria. */}
                <TableHead className="text-right">Valor de capital (R$)</TableHead>
                <TableHead className="text-right">Participação no capital</TableHead>
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
                      <p className="text-sm font-medium">{l.denominacao}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {l.tipoPessoa ?? '—'}{l.cpfCnpj ? ` · ${l.cpfCnpj}` : ''}
                      </p>
                      {(l.procedencia?.length ?? 0) > 0 && <Procedencia origens={l.procedencia!} />}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtInt.format(l.quotas)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtBRL.format(l.valor)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {fmtPct(l.percentual)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            {/* O total some com qualquer busca ativa: somar um subconjunto
                filtrado e chamá-lo de Total seria mentir sobre o capital. */}
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
                  <TableCell className="text-right font-semibold tabular-nums">{fmtPct(100)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      )}
    </div>
  );
};
