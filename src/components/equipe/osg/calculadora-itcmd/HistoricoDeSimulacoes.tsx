import { ChevronRight } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CENARIOS, ROTULO_CENARIO } from '@/lib/osg/itcmd/simulacao';
import { brlDeDecimal, TRACO } from './itcmdFmt';
import { nomesCurtos } from '@/lib/osg/nomeCurto';
import {
  ROTULO_DO_STATUS, STATUS_DA_SIMULACAO, rotuloDaSimulacao,
  type SimulacaoSalva, type StatusDaSimulacao,
} from '@/hooks/useSimulacoesItcmd';

/**
 * O HISTÓRICO DE SIMULAÇÕES, no formato das outras listas da OSG: tabela dentro de
 * card, linha clicável, filtro no cabeçalho.
 *
 * A LISTA É LISTA. Clicar ABRE a simulação, e ela abre inteira, com o quadro da
 * doação, o do usufruto e o cálculo em abas. Antes a linha expandia para baixo: o
 * quadro e os três cenários entravam numa célula com `colSpan`, comprimidos na largura
 * da lista, e abrir a segunda empurrava a primeira para fora da tela.
 *
 * O STATUS aqui é LEITURA — quem troca é a tela aberta, onde a decisão tem contexto.
 * Um seletor por linha punha a mudança de status no mesmo lugar em que se procura
 * qual simulação abrir, e aprovar é decisão de quem leu o cenário, não de quem
 * passou o olho na lista.
 */
export function HistoricoDeSimulacoes({
  simulacoes, carregando, statusFiltrado, aoFiltrarStatus, aoAbrir,
}: {
  simulacoes: SimulacaoSalva[];
  carregando: boolean;
  /** `null` = todas. Filtro da LISTA, não da simulação. */
  statusFiltrado: StatusDaSimulacao | null;
  aoFiltrarStatus: (s: StatusDaSimulacao | null) => void;
  aoAbrir: (id: string) => void;
}) {
  const visiveis = statusFiltrado == null
    ? simulacoes
    : simulacoes.filter((s) => s.status === statusFiltrado);

  // NOME CURTO na lista: o cadastro guarda "CRISTINA KIELBA BOCOLLI BORDIGNON", e duas
  // dessas em Doa/Recebe consomem a largura das colunas de dinheiro. A desambiguacao e
  // por id, entao o mapa se monta com TODAS as pessoas de TODAS as simulacoes.
  const curto = nomesCurtos(simulacoes.flatMap((s) => [
    ...s.doadores.map((d) => ({ id: d.pessoaId, nome: d.nome })),
    ...s.donatarios.map((d) => ({ id: d.pessoaId, nome: d.nome })),
  ]));
  const listar = (ps: Array<{ pessoaId: string; nome: string }>) =>
    ps.map((x) => curto.get(x.pessoaId) ?? x.nome).join(', ') || TRACO;

  return (
    <section className="rounded-lg border border-slate-200 bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-700">
          Simulações
          <span className="ml-2 font-normal text-slate-500">
            {visiveis.length === simulacoes.length
              ? `${simulacoes.length}`
              : `${visiveis.length} de ${simulacoes.length}`}
          </span>
        </h2>

        {/* FILTRO DE STATUS da lista: é como se pergunta "quais estão aprovadas". */}
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">Status</span>
          <Select
            value={statusFiltrado ?? 'todas'}
            onValueChange={(v) => aoFiltrarStatus(v === 'todas' ? null : v as StatusDaSimulacao)}
          >
            <SelectTrigger className="h-9 w-[170px]" aria-label="Filtrar por status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {STATUS_DA_SIMULACAO.map((s) => (
                <SelectItem key={s} value={s}>{ROTULO_DO_STATUS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {carregando ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">
          Carregando o histórico…
        </p>
      ) : visiveis.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-600">
          {simulacoes.length === 0
            ? 'Nenhuma simulação gravada para este cliente ainda.'
            : `Nenhuma simulação com status ${
              ROTULO_DO_STATUS[statusFiltrado as StatusDaSimulacao]
            }.`}
        </p>
      ) : (
        <Table>
          {/* CABECALHO EM DUAS LINHAS. Os tres valores sao o total DO ATO — a doacao
              mais as guias de instituicao de usufruto —, e tres colunas de dinheiro
              lado a lado sem dizer isso pareceriam tres impostos diferentes.

              Era uma coluna so, "Imposto contabil", que deixava de fora os outros dois
              cenarios e a instituicao. A reserva ja estava dentro: ela nao tem guia
              propria, ela reduz a base da guia da doacao. */}
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead colSpan={6} />
              <TableHead
                colSpan={3}
                className="border-b border-osg-100 text-center text-[11px] uppercase tracking-wide"
                title={'Doação + instituição de usufruto. A reserva já está no valor da '
                  + 'doação: ela não tem guia própria, ela reduz a base daquela.'}
              >
                Total do ato
              </TableHead>
              <TableHead colSpan={2} />
            </TableRow>
            <TableRow>
              <TableHead>Simulação</TableHead>
              <TableHead>Gerada em</TableHead>
              <TableHead>Competência</TableHead>
              <TableHead className="text-right">UPF</TableHead>
              <TableHead>Doa</TableHead>
              <TableHead>Recebe</TableHead>
              {CENARIOS.map((c) => (
                <TableHead key={c} className="text-right">
                  {ROTULO_CENARIO[c].replace('Valor ', '').replace('de ', '')}
                </TableHead>
              ))}
              <TableHead>Status</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.map((s) => (
              <TableRow key={s.id} className="cursor-pointer" onClick={() => aoAbrir(s.id)}>
                <TableCell className="font-medium">{rotuloDaSimulacao(s)}</TableCell>
                <TableCell className="text-xs text-slate-600">
                  {new Date(s.criadaEm).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums">
                  {s.competencia}
                </TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums">
                  {brlDeDecimal(s.upf)}
                </TableCell>
                <TableCell className="text-xs">{listar(s.doadores)}</TableCell>
                <TableCell className="text-xs">{listar(s.donatarios)}</TableCell>
                {CENARIOS.map((c) => (
                  <TableCell
                    key={c}
                    className="text-right font-mono text-xs tabular-nums font-semibold"
                    title={s.concessoes.some((x) => x.origem === 'instituicao')
                      ? 'Doação + instituição de usufruto.'
                      : 'Só a doação: este ato não tem guia de instituição de usufruto.'}
                  >
                    {brlDeDecimal(s.totalPorCenario[c])}
                  </TableCell>
                ))}
                <TableCell>
                  <Etiqueta status={s.status} />
                </TableCell>
                <TableCell className="text-slate-400">
                  <ChevronRight className="h-4 w-4" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

/**
 * O status como etiqueta. A cor separa as três leituras que importam de longe: o que
 * VALE (aprovada), o que ainda não é decisão (rascunho) e o que saiu do caminho
 * (substituída).
 */
function Etiqueta({ status }: { status: StatusDaSimulacao }) {
  const cor: Record<StatusDaSimulacao, string> = {
    rascunho: 'border-slate-200 bg-slate-50 text-slate-600',
    gerada: 'border-sky-200 bg-sky-50 text-sky-700',
    aprovada: 'border-osg-200 bg-osg-50 text-osg-800',
    substituida: 'border-slate-200 bg-slate-100 text-slate-500 line-through',
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${cor[status]}`}
    >
      {ROTULO_DO_STATUS[status]}
    </span>
  );
}
