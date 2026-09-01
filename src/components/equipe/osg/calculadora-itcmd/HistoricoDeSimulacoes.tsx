import { ChevronRight } from 'lucide-react';
import OsgWorkLoader from '@/components/equipe/osg/OsgWorkLoader';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CENARIOS, DICA_CENARIO, ROTULO_CENARIO } from '@/lib/osg/itcmd/simulacao';
import { brlDeDecimal, TRACO } from './itcmdFmt';
import { ComDica, ComoDicas, rotuloCls, rotuloDeColunaCls } from './itcmdKit';
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

  /**
   * DE ONDE CADA UMA PARTE. Duas simulações encadeadas pareciam independentes na
   * lista: a cadeia só aparecia dentro da simulação aberta, na terceira aba.
   *
   * O rótulo da origem, e não só um sinal: "parte de" sem dizer DE QUE obriga a abrir
   * as duas para descobrir. Origem fora da lista (filtrada, ou de outro cliente) fica
   * sem nome, e aí o `↳` diz o que sabe — que ela deriva de alguma coisa.
   */
  const porId = new Map(simulacoes.map((s) => [s.id, s]));
  const origemDe = (s: SimulacaoSalva): string | null => {
    if (s.origemSimulacaoId == null) return null;
    const o = porId.get(s.origemSimulacaoId);
    return o == null ? 'outra simulação' : rotuloDaSimulacao(o);
  };

  return (
    <ComoDicas>
    <section className="rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          Simulações
          <span className="ml-2 font-normal text-muted-foreground">
            {visiveis.length === simulacoes.length
              ? `${simulacoes.length}`
              : `${visiveis.length} de ${simulacoes.length}`}
          </span>
        </h2>

        {/* FILTRO DE STATUS da lista: é como se pergunta "quais estão aprovadas". */}
        <div className="flex items-center gap-2">
          <span className={rotuloCls}>
            <ComDica dica="Filtra a lista. Trocar o status de uma simulação é na tela dela.">
              Status
            </ComDica>
          </span>
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
        <div className="flex flex-col items-center gap-2 px-4 py-10">
          <OsgWorkLoader size={40} label="Carregando o histórico" />
          <p className="text-sm text-muted-foreground">Carregando o histórico…</p>
        </div>
      ) : visiveis.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
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
                className={`border-b border-border text-center ${rotuloDeColunaCls}`}
              >
                <ComDica
                  dica={'Doação MAIS instituição de usufruto, quando o ato tiver as '
                    + 'duas. A reserva já está no valor da doação: ela muda a natureza '
                    + 'e a base daquela guia, sem gerar uma própria. Abra a simulação '
                    + 'para ver guia por guia.'}
                >
                  Total do ato
                </ComDica>
              </TableHead>
              <TableHead colSpan={2} />
            </TableRow>
            <TableRow>
              <TableHead className={rotuloDeColunaCls}>
                <ComDica
                  dica={'O nome dado ao cenário, ou a versão quando ele não tem nome. O '
                    + 'sinal ↳ diz de qual simulação este ato parte.'}
                >
                  Simulação
                </ComDica>
              </TableHead>
              <TableHead className={rotuloDeColunaCls}>
                <ComDica dica="Quando a simulação foi gravada. Abrir mostra o retrato daquele momento, sem recalcular nada.">
                  Gerada em
                </ComDica>
              </TableHead>
              <TableHead className={rotuloDeColunaCls}>
                <ComDica dica="O mês da UPF usada na apuração. Competências diferentes não se comparam direto.">
                  Competência
                </ComDica>
              </TableHead>
              <TableHead className={`text-right ${rotuloDeColunaCls}`}>
                <ComDica
                  dica={'A UPF da competência, declarada na simulação. É ela que '
                    + 'converte a isenção de 500 UPF e a dedução da faixa em reais. '
                    + 'Trocar a UPF troca o imposto.'}
                >
                  UPF
                </ComDica>
              </TableHead>
              <TableHead className={rotuloDeColunaCls}>
                <ComDica dica="Quem transmite as quotas. Nome curto; o inteiro está na simulação aberta.">
                  Doa
                </ComDica>
              </TableHead>
              <TableHead className={rotuloDeColunaCls}>
                <ComDica dica="Quem recebe as quotas. Nome curto; o inteiro está na simulação aberta.">
                  Recebe
                </ComDica>
              </TableHead>
              {CENARIOS.map((c) => (
                <TableHead key={c} className={`text-right ${rotuloDeColunaCls}`}>
                  <ComDica dica={DICA_CENARIO[c]}>
                    {ROTULO_CENARIO[c].replace('Valor ', '').replace('de ', '')}
                  </ComDica>
                </TableHead>
              ))}
              <TableHead className={rotuloDeColunaCls}>
                <ComDica dica="O que vale, o que é ensaio e o que saiu do caminho. Quem troca é a simulação aberta.">
                  Status
                </ComDica>
              </TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.map((s) => (
              <TableRow key={s.id} className="cursor-pointer" onClick={() => aoAbrir(s.id)}>
                <TableCell className="font-medium">
                  {rotuloDaSimulacao(s)}
                  {origemDe(s) != null && (
                    <ComDica
                      dica={'O quadro e o acervo desta simulação partem de '
                        + `${origemDe(s)}, e não do quadro societário: é o segundo ato `
                        + 'de uma doação encadeada.'}
                    >
                      <span className="ml-1.5 whitespace-nowrap text-xs font-normal text-muted-foreground">
                        {`↳ ${origemDe(s)}`}
                      </span>
                    </ComDica>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
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
                {/* SEM `title` por célula: eram três por linha, dizendo a mesma coisa,
                    invisíveis para quem não passa o ponteiro. A composição do total
                    agora é dica do CABEÇALHO, uma vez, e a decomposição guia por guia
                    está na simulação aberta, que é onde ela cabe. */}
                {CENARIOS.map((c) => (
                  <TableCell
                    key={c}
                    className="text-right font-mono text-xs font-semibold tabular-nums"
                  >
                    {brlDeDecimal(s.totalPorCenario[c])}
                  </TableCell>
                ))}
                <TableCell>
                  <Etiqueta status={s.status} />
                </TableCell>
                <TableCell className="text-muted-foreground/70">
                  <ChevronRight className="h-4 w-4" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
    </ComoDicas>
  );
}

/**
 * O status como etiqueta. A cor separa as três leituras que importam de longe: o que
 * VALE (aprovada), o que ainda não é decisão (rascunho) e o que saiu do caminho
 * (substituída).
 */
function Etiqueta({ status }: { status: StatusDaSimulacao }) {
  // Os quatro tons saem da paleta de status da OSG (`--status-*`), construída sobre os
  // tokens de marca da área. `gerada` era `sky` — azul do Tailwind, e a OSG não tem
  // azul: numa lista de bege e musgo, era a única coisa fria da tela.
  const cor: Record<StatusDaSimulacao, string> = {
    rascunho: 'border-status-neutro/15 bg-status-neutro-soft/50 text-status-neutro',
    gerada: 'border-status-fila/20 bg-status-fila-soft text-status-fila',
    aprovada: 'border-status-feito/25 bg-status-feito-soft text-status-feito',
    substituida:
      'border-status-neutro/15 bg-status-neutro-soft/50 text-status-neutro line-through',
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${cor[status]}`}
    >
      {ROTULO_DO_STATUS[status]}
    </span>
  );
}
