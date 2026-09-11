import { useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Vote } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { SocioDoQuadro } from '@/hooks/useMovimentacaoQuotas';
import { useOnusDaEmpresa } from '@/hooks/useDoacaoDeQuotas';
import { GRAVAMES, montarQuadroDeVoto, type Gravame } from '@/lib/osg/doacaoDeQuotas';
import type { ConcessaoDeUsufruto, LinhaDoUsufruto, TotaisDoUsufruto } from '@/lib/osg/usufrutoDoAto';
import { AjudaSocietaria } from './AjudaSocietaria';
import { SecaoRecolhivel } from './SecaoRecolhivel';

// A tabela de USUFRUTO E VOTO: quem tem a quota e quem vota por ela.
//
// O quadro societário responde "quem é sócio". Depois de uma doação com reserva
// de usufruto ele passa a responder só metade da pergunta: as filhas têm as
// quotas, os pais votam. É a tabela da cláusula de nua-propriedade da 3ª
// alteração da MMS Participações (plena · nua propriedade · usufruto estendido
// ao voto · %), e o percentual é do VOTO, não do capital: os usufrutuários somam
// 100% do voto com 0% da propriedade.

const fmtQ = (q: bigint) => q.toLocaleString('pt-BR');
/** '66.0053' → '66,01%'. O domínio dá 4 casas; a tela mostra 2, como o instrumento. */
const fmtPct4 = (p: string) => `${Number(p).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const traco = (q: bigint) => (q === 0n ? '—' : fmtQ(q));

interface TabelaUsufrutoEVotoProps {
  linhas: LinhaDoUsufruto[];
  totais: TotaisDoUsufruto;
  /** Gravames sobre as quotas de cada nu-proprietário, para o selo sob o nome. */
  gravamesPorPessoa?: ReadonlyMap<string, readonly Gravame[]>;
  compacta?: boolean;
}

export const TabelaUsufrutoEVoto = ({ linhas, totais, gravamesPorPessoa, compacta }: TabelaUsufrutoEVotoProps) => (
  <div className="rounded-md border overflow-x-auto">
    <Table className={cn(compacta && 'text-xs')}>
      <TableHeader>
        <TableRow>
          <TableHead>Sócio / usufrutuário</TableHead>
          <TableHead className="text-right">Quotas</TableHead>
          <TableHead className="text-right">Propriedade plena</TableHead>
          <TableHead className="text-right">
            <span className="inline-flex items-center gap-1">
              Nua propriedade
              <AjudaSocietaria chave="nuaPropriedade" rotulo="nua propriedade" />
            </span>
          </TableHead>
          <TableHead className="text-right">
            <span className="inline-flex items-center gap-1">
              Usufruto (voto)
              <AjudaSocietaria chave="usufrutoComVoto" rotulo="usufruto estendido ao voto" />
            </span>
          </TableHead>
          <TableHead className="text-right">Voz e voto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.map((l) => {
          const gravames = gravamesPorPessoa?.get(l.pessoaId) ?? [];
          return (
            <TableRow key={l.pessoaId}>
              <TableCell>
                <p className={cn('font-medium', compacta ? 'text-xs' : 'text-sm')}>{l.nome}</p>
                {l.concedePara.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    usufruto em favor de {l.concedePara.join(' e ')}
                  </p>
                )}
                {gravames.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {gravames.map((g) => (
                      <span key={g} className="rounded bg-osg-50 px-1.5 py-0.5 text-[10px] font-medium text-osg-700">
                        {GRAVAMES[g].label.toLowerCase()}
                      </span>
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{traco(l.quotas)}</TableCell>
              <TableCell className="text-right tabular-nums">{traco(l.plena)}</TableCell>
              <TableCell className="text-right tabular-nums">{traco(l.nua)}</TableCell>
              <TableCell className="text-right tabular-nums">{traco(l.usufruto)}</TableCell>
              <TableCell className="text-right">
                <span className={cn(
                  'rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums',
                  l.vozEVoto > 0n ? 'bg-osg-50 text-osg-700' : 'text-muted-foreground',
                )}>
                  {fmtPct4(l.pctVozEVoto)}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-semibold">Total</TableCell>
          <TableCell className="text-right font-semibold tabular-nums">{fmtQ(totais.quotas)}</TableCell>
          <TableCell className="text-right font-semibold tabular-nums">{traco(totais.plena)}</TableCell>
          <TableCell className="text-right font-semibold tabular-nums">{traco(totais.nua)}</TableCell>
          <TableCell className="text-right font-semibold tabular-nums">{traco(totais.usufruto)}</TableCell>
          <TableCell className="text-right font-semibold tabular-nums">{fmtPct4(totais.pctVozEVoto)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  </div>
);

interface UsufrutoEVotoCardProps {
  empresa: PessoaRow;
  quadro: SocioDoQuadro[];
  /** Pessoas do cliente: o nome de quem usufrui sem ter quota (o doador que zerou). */
  pessoasCliente: PessoaRow[];
}

/**
 * O card na página do quadro: só aparece quando há ônus vigente sobre as quotas
 * da empresa. Lê `onus_quotas` e monta a tabela sobre o SALDO de hoje, que é o
 * mesmo objeto que a consolidação vai reimprimir.
 */
export const UsufrutoEVotoCard = ({ empresa, quadro, pessoasCliente }: UsufrutoEVotoCardProps) => {
  const { data: onus = [] } = useOnusDaEmpresa(empresa.id);

  const tabela = useMemo(() => {
    if (onus.length === 0) return null;
    const nomes = new Map(pessoasCliente.map((p) => [p.id, p.denominacao ?? '—']));
    const concessoes: ConcessaoDeUsufruto[] = onus
      .filter((o) => o.usufrutuarioIds.length > 0)
      .map((o) => ({
        deId: o.nuProprietarioId,
        paraIds: o.usufrutuarioIds,
        quotas: BigInt(o.quotas),
        origem: o.usufrutoOrigem ?? 'reserva',
        comVoto: o.comVoto,
      }));
    const gravamesPorPessoa = new Map<string, Gravame[]>();
    for (const o of onus) {
      const atuais = gravamesPorPessoa.get(o.nuProprietarioId) ?? [];
      gravamesPorPessoa.set(o.nuProprietarioId, [...new Set([...atuais, ...o.gravames])]);
    }
    return { ...montarQuadroDeVoto(quadro, concessoes, nomes), gravamesPorPessoa };
  }, [onus, quadro, pessoasCliente]);

  if (!tabela) return null;

  // O card aparece com QUALQUER ônus vigente, inclusive só gravames e usufruto
  // sem voto. A frase antiga afirmava que uso, gozo e voto seguem com o
  // usufrutuário — descrição do caso padrão, não do que está gravado: com
  // `comVoto` falso o voto fica com o titular, e um ônus só de gravame não
  // desloca voto nenhum. A frase resumida diz o que sempre vale; a divisão
  // exata está na tabela.
  return (
    <SecaoRecolhivel
      icone={<Vote className="h-4 w-4 text-muted-foreground" />}
      titulo="Usufruto, voto e gravames"
      resumo="Há ônus vigentes sobre as quotas. Participação no capital e voto podem diferir."
      rotuloAbrir="Ver detalhes"
      rotuloFechar="Ocultar detalhes"
      delay={210}
    >
      <TabelaUsufrutoEVoto
        linhas={tabela.linhas}
        totais={tabela.totais}
        gravamesPorPessoa={tabela.gravamesPorPessoa}
      />
    </SecaoRecolhivel>
  );
};
