import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Download, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
// TooltipProvider já envolve a aplicação em App.tsx — aqui só o consumo.
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDomainAuditProdutividade, useDomainOrgTasksProdutividade } from '@/hooks/useDomainAuditLogs';
import { useProfilesNomeMap } from '@/hooks/useDomainProfiles';
import type { AuditArea } from '@/lib/auditAreas';
import {
  agregarProdutividade, agregarProdutoPorPessoa, buildProdutividadeCsv, COLUNAS_POR_VISAO,
  direcaoInicial, formatarHoras, idsTocados, ORDENACAO_INICIAL, ordenarProdutividade,
  resumirProdutividade,
  type ClientePorId, type ColunaProdutividade, type DirecaoOrdenacao,
  type HorasPorId, type LinhaProdutividade, type ResumoProdutividade,
  type StatusPorId, type VinculoPorId, type VisaoProdutividade,
} from '@/lib/auditProdutividade';
import { useAuditPeriodo } from '@/hooks/useAuditPeriodo';
import { triggerCsvDownload } from '@/lib/roiCsv';
import { AuditLimiteAviso } from './AuditLimiteAviso';
import { AuditProdutosDaPessoa } from './AuditProdutosDaPessoa';
import { ENTITY_LABELS } from './auditLabels';

interface AuditProdutividadeTableProps {
  /** Área do módulo, ou 'todas' no consolidado do Board. */
  area: AuditArea;
  /**
   * Qual leitura dos logs esta instância mostra. Produtividade = resultado
   * entregue; Atividade = uso do sistema. Cada aba renderiza a sua, com as
   * colunas e os KPIs dela — ver `COLUNAS_POR_VISAO`.
   */
  visao: VisaoProdutividade;
}

const SEM_HORAS: HorasPorId = {};
const SEM_CLIENTES: ClientePorId = {};
const SEM_VINCULO: VinculoPorId = {};
const SEM_STATUS: StatusPorId = {};
const SEM_NOMES: Record<string, string> = {};

interface DefinicaoColuna {
  label: string;
  numerica: boolean;
  /**
   * Obrigatório: toda coluna explica no hover o que o número significa,
   * inclusive as diferenças que geram dúvida (Registros × Itens distintos,
   * Dias ativos × tempo trabalhado). Se você adicionar coluna aqui, escreva a
   * explicação em linguagem de usuário, não de banco.
   */
  ajuda: string;
  /** Conteúdo da célula; a `<TableCell>` e o alinhamento vêm daqui de fora. */
  render: (linha: LinhaProdutividade) => ReactNode;
  classeCelula?: string;
}

/**
 * Planejado / executado na mesma célula. Vermelho apenas quando os dois valores
 * existem e o executado passou do planejado — sem os dois lados não há estouro
 * a afirmar.
 */
const ConteudoHoras = ({ linha }: { linha: LinhaProdutividade }) => {
  const estourou = linha.horasPlanejadas !== null
    && linha.horasExecutadas !== null
    && linha.horasExecutadas > linha.horasPlanejadas;

  return (
    <>
      <span className="text-muted-foreground">{formatarHoras(linha.horasPlanejadas)}</span>
      <span className="text-slate-300"> / </span>
      <span className={cn('font-medium', estourou ? 'text-red-700' : 'text-foreground')}>
        {formatarHoras(linha.horasExecutadas)}
      </span>
    </>
  );
};

/**
 * "Em aberto / entregue" na mesma célula, com o entregue em destaque porque é
 * por ele que a coluna ordena. Mesma gramática visual das horas: o primeiro
 * número é contexto, o segundo é o resultado.
 */
const ConteudoPar = ({ abertos, entregues }: { abertos: number; entregues: number }) => (
  <>
    <span className="text-muted-foreground">{abertos}</span>
    <span className="text-slate-300"> / </span>
    <span className="font-semibold text-foreground">{entregues}</span>
  </>
);

/**
 * Rótulo, explicação e célula de cada coluna. A ordem de exibição NÃO está
 * aqui: cada aba pega a sua lista em `COLUNAS_POR_VISAO` e cabeçalho e corpo
 * percorrem a mesma lista, então não há como as colunas saírem trocadas.
 */
const COLUNAS: Record<ColunaProdutividade, DefinicaoColuna> = {
  nome: {
    label: 'Colaborador',
    numerica: false,
    ajuda: 'Quem executou as ações. O nome vem do cadastro de usuários — aparece "Desconhecido" quando esse cadastro não está visível para você. Na aba Produtividade, clique na linha para ver em que produtos contratados essa pessoa mexeu.',
    classeCelula: 'font-medium',
    render: linha => linha.nome,
  },
  processosExecutados: {
    label: 'Tarefas abertas/concl.',
    numerica: true,
    ajuda: 'Das tarefas e subtarefas em que ela mexeu no período: quantas seguem em aberto hoje (esquerda) e quantas ela marcou como Concluído no período (direita — é o número do KPI "Processos executados"). Projeto não entra aqui, tem coluna própria. Se ela reabriu e concluiu o mesmo item de novo, conta uma vez só. O crédito vai para quem mudou o status, não para o responsável da tarefa. Ordena pelas concluídas.',
    classeCelula: 'whitespace-nowrap',
    render: linha => (
      <ConteudoPar abertos={linha.tarefasAbertas} entregues={linha.processosExecutados} />
    ),
  },
  projetosFinalizados: {
    label: 'Projetos abertos/finaliz.',
    numerica: true,
    ajuda: 'Dos projetos em que ela mexeu no período: quantos seguem abertos hoje (esquerda) e quantos ela levou para Concluído no período (direita). Ver os dois juntos é o que mostra quem acumulou projetos e não fechou nenhum. É o projeto inteiro, não as tarefas dele. Projeto cancelado não conta em nenhum dos lados, e projeto que outra pessoa finalizou sai dos abertos sem entrar nos finalizados dela. Ordena pelos finalizados.',
    classeCelula: 'whitespace-nowrap',
    render: linha => (
      <ConteudoPar abertos={linha.projetosAbertos} entregues={linha.projetosFinalizados} />
    ),
  },
  clientesDistintos: {
    label: 'Clientes distintos',
    numerica: true,
    ajuda: 'Em quantos clientes diferentes ela trabalhou no período, contando qualquer ação (não só as conclusões). O cliente vem da tarefa; se a tarefa aponta para um CNPJ, ele é convertido no cliente dono — o mesmo cliente nunca conta duas vezes. Item sem cliente vinculado não entra na conta.',
    render: linha => linha.clientesDistintos,
  },
  contribuintesDistintos: {
    label: 'Contribuintes distintos',
    numerica: true,
    ajuda: 'Em quantos contribuintes (CNPJs) diferentes ela trabalhou no período. É a granularidade abaixo de Clientes: um cliente com três CNPJs conta 1 cliente e até 3 contribuintes. Item sem contribuinte vinculado não entra na conta.',
    render: linha => linha.contribuintesDistintos,
  },
  horasExecutadas: {
    label: 'Horas plan./exec.',
    numerica: true,
    ajuda: 'Horas dos itens que ela concluiu no período: primeiro o planejado (estimativa preenchida na tarefa), depois o executado (apontamento de horas realizadas). Fica vermelho quando o executado passou do planejado. "—" significa que o campo não foi preenchido em nenhum item — não que o trabalho foi zero. Ordena pelas horas executadas.',
    classeCelula: 'whitespace-nowrap',
    render: linha => <ConteudoHoras linha={linha} />,
  },
  tempoMedioProcesso: {
    label: 'Tempo médio/processo',
    numerica: true,
    ajuda: 'Quanto tempo, em média, cada item concluído consumiu: horas executadas ÷ quantidade de itens que têm horas apontadas. Só entra na média o item com apontamento, por isso o divisor pode ser menor que Processos executados.',
    render: linha => formatarHoras(linha.tempoMedioProcesso),
  },
  registros: {
    label: 'Registros',
    numerica: true,
    ajuda: 'Total de ações que ela deixou registradas: criações + edições + exclusões. Uma mesma tarefa editada 5 vezes gera 5 registros.',
    render: linha => linha.registros,
  },
  criacoes: {
    label: 'Criações',
    numerica: true,
    ajuda: 'Quantos projetos, tarefas ou subtarefas ela criou no período.',
    classeCelula: 'text-emerald-700',
    render: linha => linha.criacoes,
  },
  edicoes: {
    label: 'Edições',
    numerica: true,
    ajuda: 'Quantas alterações ela fez em itens que já existiam — mudar status, prazo, responsável, descrição e afins.',
    classeCelula: 'text-blue-700',
    render: linha => linha.edicoes,
  },
  exclusoes: {
    label: 'Exclusões',
    numerica: true,
    ajuda: 'Quantos itens ela excluiu no período.',
    classeCelula: 'text-red-700',
    render: linha => linha.exclusoes,
  },
  itensDistintos: {
    label: 'Itens distintos',
    numerica: true,
    ajuda: 'Em quantas tarefas, subtarefas ou projetos diferentes ela mexeu — são itens de trabalho, não clientes (clientes aparecem na aba Produtividade). Não confunda com Registros: 10 edições na mesma tarefa são 10 registros, mas 1 item distinto.',
    render: linha => linha.itensDistintos,
  },
  diasAtivos: {
    label: 'Dias ativos',
    numerica: true,
    ajuda: 'Em quantos dias diferentes ela registrou pelo menos uma ação. Não é tempo trabalhado nem horas — o sistema não mede duração, só em que dias houve registro.',
    render: linha => linha.diasAtivos,
  },
  mediaPorDiaAtivo: {
    label: 'Média/dia ativo',
    numerica: true,
    ajuda: 'Registros ÷ Dias ativos: quantas ações ela faz num dia em que realmente usou o sistema. Divide só pelos dias ativos, então férias e folga não puxam a média para baixo.',
    render: linha => linha.mediaPorDiaAtivo.toFixed(1).replace('.', ','),
  },
  tipoMaisFrequente: {
    label: 'Tipo mais frequente',
    numerica: false,
    ajuda: 'Onde ela mexeu mais no período: Projeto, Tarefa ou Subtarefa.',
    classeCelula: 'text-muted-foreground',
    render: linha => (linha.tipoMaisFrequente
      ? ENTITY_LABELS[linha.tipoMaisFrequente] ?? linha.tipoMaisFrequente
      : '—'),
  },
  ultimoRegistro: {
    label: 'Último registro',
    numerica: false,
    ajuda: 'Data e hora da ação mais recente dela dentro do período selecionado. Serve para ver quem parou de registrar.',
    classeCelula: 'whitespace-nowrap text-muted-foreground',
    render: linha => format(new Date(linha.ultimoRegistro), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
  },
};

interface Kpi {
  label: string;
  valor: string;
  hint: string;
}

/**
 * Os KPIs seguem a aba: em Produtividade o topo responde "quanto saiu"; em
 * Atividade, "quanto se mexeu no sistema". Nenhum número novo é calculado aqui
 * — os dois recortes vêm do mesmo `resumirProdutividade`.
 *
 * Produtividade não mostra nenhuma métrica de uso do sistema (registros,
 * colaboradores ativos, dias com atividade): esse tema é da aba Atividade.
 */
function kpisDaVisao(
  visao: VisaoProdutividade,
  resumo: ResumoProdutividade,
  /** Dias do período que já passaram; `null` em "todo o período". */
  dias: number | null,
): Kpi[] {
  if (visao === 'produtividade') {
    return [
      {
        label: 'Processos executados',
        valor: String(resumo.processosExecutados),
        hint: 'tarefas e subtarefas concluídas',
      },
      {
        label: 'Projetos finalizados',
        valor: String(resumo.projetosFinalizados),
        hint: 'projetos levados a Concluído',
      },
      {
        label: 'Clientes atendidos',
        valor: String(resumo.clientesDistintos),
        hint: 'clientes distintos com trabalho no período',
      },
      {
        label: 'Contribuintes atendidos',
        valor: String(resumo.contribuintesDistintos),
        hint: 'CNPJs distintos com trabalho no período',
      },
    ];
  }

  return [
    { label: 'Registros', valor: String(resumo.registros), hint: 'criações, edições e exclusões' },
    {
      label: 'Colaboradores ativos',
      valor: String(resumo.colaboradoresAtivos),
      hint: 'com pelo menos 1 registro',
    },
    {
      label: 'Itens distintos',
      valor: String(resumo.itensDistintos),
      hint: 'projetos, tarefas e subtarefas tocados',
    },
    {
      label: 'Dias com atividade',
      // Sem denominador conhecido (todo o histórico) mostra só a contagem: razão
      // com total inventado é pior que razão nenhuma.
      valor: dias === null ? String(resumo.diasComAtividade) : `${resumo.diasComAtividade} de ${dias}`,
      hint: dias === null ? 'dias distintos com registro' : 'dias do período com registro',
    },
  ];
}

const KpiCard = ({ label, valor, hint }: Kpi) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{valor}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </CardContent>
  </Card>
);

interface Ordenacao {
  coluna: ColunaProdutividade;
  direcao: DirecaoOrdenacao;
}

const HeaderOrdenavel = ({
  label, numerica, ativa, direcao, ajuda, onClick,
}: {
  label: string;
  numerica: boolean;
  ativa: boolean;
  direcao: DirecaoOrdenacao;
  ajuda: string;
  onClick: () => void;
}) => {
  const Icone = !ativa ? ArrowUpDown : direcao === 'asc' ? ArrowUp : ArrowDown;

  return (
    <TableHead
      className={cn('p-0', numerica && 'text-right')}
      aria-sort={ativa ? (direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            // `aria-description` leva a explicação para leitor de tela, que não
            // recebe o conteúdo do tooltip visual.
            aria-description={ajuda}
            className={cn(
              'flex w-full items-center gap-1 px-4 py-3 text-left transition-colors hover:text-foreground',
              numerica && 'justify-end',
              ativa ? 'font-semibold text-foreground' : 'text-muted-foreground',
            )}
          >
            {/* Sublinhado pontilhado sinaliza que há explicação no hover. */}
            <span className="border-b border-dotted border-border">{label}</span>
            <Icone className={cn('h-3.5 w-3.5 shrink-0', ativa ? 'opacity-100' : 'opacity-40')} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align={numerica ? 'end' : 'start'} className="max-w-xs">
          <p className="text-xs leading-relaxed">{ajuda}</p>
          <p className="mt-1 text-xs italic opacity-70">Clique para ordenar por esta coluna.</p>
        </TooltipContent>
      </Tooltip>
    </TableHead>
  );
};

export const AuditProdutividadeTable = ({ area, visao }: AuditProdutividadeTableProps) => {
  // O período é compartilhado com as outras abas — ver `useAuditPeriodo`.
  const { periodo, setPeriodo, opcoes, janela } = useAuditPeriodo();
  const [ordenacao, setOrdenacao] = useState<Ordenacao>(() => ({
    coluna: ORDENACAO_INICIAL[visao],
    direcao: direcaoInicial(ORDENACAO_INICIAL[visao]),
  }));
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const colunas = COLUNAS_POR_VISAO[visao];
  /** Só a aba de resultado abre o detalhe por produto. */
  const expansivel = visao === 'produtividade';

  const { data: logs = [], isLoading } = useDomainAuditProdutividade(area, janela);
  // `profiles_safe`, não `profiles`: a tabela só tem SELECT para admin, então
  // ler dela deixava a coluna Colaborador como "Desconhecido" para o time.
  const { data: nomes = {} } = useProfilesNomeMap('profiles_safe');

  // Horas e cliente dos itens tocados — a lista de ids sai dos próprios logs.
  const ids = useMemo(() => idsTocados(logs), [logs]);
  const { data: vinculos } = useDomainOrgTasksProdutividade(ids);
  // Fallbacks são constantes de módulo: literais `{}` aqui trocariam de
  // identidade a cada render e invalidariam os useMemo abaixo sem motivo.
  const horas = vinculos?.horas ?? SEM_HORAS;
  const clientePorId = vinculos?.clientePorId ?? SEM_CLIENTES;
  const contribuintePorId = vinculos?.contribuintePorId ?? SEM_VINCULO;
  const statusPorId = vinculos?.statusPorId ?? SEM_STATUS;
  const produtoPorId = vinculos?.produtoPorId ?? SEM_VINCULO;
  const nomePorProduto = vinculos?.nomePorProduto ?? SEM_NOMES;

  const linhas = useMemo(
    () => ordenarProdutividade(
      agregarProdutividade(logs, nomes, horas, clientePorId, contribuintePorId, statusPorId),
      ordenacao.coluna,
      ordenacao.direcao,
    ),
    [logs, nomes, horas, clientePorId, contribuintePorId, statusPorId, ordenacao],
  );
  const resumo = useMemo(
    () => resumirProdutividade(logs, clientePorId, contribuintePorId),
    [logs, clientePorId, contribuintePorId],
  );
  const kpis = kpisDaVisao(visao, resumo, janela.dias);

  // Produtos de cada pessoa, para a linha expandida. O corte por produto da
  // equipe inteira mora na aba Produtos (`AuditProdutosTable`) — aqui a tabela
  // fala de pessoa.
  const produtosPorPessoa = useMemo(
    () => (expansivel
      ? agregarProdutoPorPessoa(logs, horas, produtoPorId, nomePorProduto)
      : {}),
    [expansivel, logs, horas, produtoPorId, nomePorProduto],
  );

  const alternarExpandida = (userId: string) => {
    setExpandidas(atual => {
      const proxima = new Set(atual);
      if (proxima.has(userId)) proxima.delete(userId);
      else proxima.add(userId);
      return proxima;
    });
  };

  /** Mesma coluna inverte a direção; coluna nova começa na direção natural dela. */
  const alternarOrdenacao = (coluna: ColunaProdutividade) => {
    setOrdenacao(atual => atual.coluna === coluna
      ? { coluna, direcao: atual.direcao === 'asc' ? 'desc' : 'asc' }
      : { coluna, direcao: direcaoInicial(coluna) });
  };

  const handleExportCsv = () => {
    triggerCsvDownload(
      buildProdutividadeCsv(linhas, colunas),
      `${visao}-${area}-${janela.slug}.csv`,
    );
  };

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {opcoes.map(p => (
              <SelectItem key={p.valor} value={p.valor}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={isLoading || linhas.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(kpi => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {colunas.map(coluna => (
                  <HeaderOrdenavel
                    key={coluna}
                    label={COLUNAS[coluna].label}
                    numerica={COLUNAS[coluna].numerica}
                    ajuda={COLUNAS[coluna].ajuda}
                    ativa={ordenacao.coluna === coluna}
                    direcao={ordenacao.direcao}
                    onClick={() => alternarOrdenacao(coluna)}
                  />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={colunas.length} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : linhas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colunas.length} className="text-center py-8 text-muted-foreground">
                    Nenhum registro no período
                  </TableCell>
                </TableRow>
              ) : (
                linhas.map(linha => {
                  const aberta = expandidas.has(linha.userId);
                  return (
                    <Fragment key={linha.userId}>
                      <TableRow
                        className={expansivel ? 'cursor-pointer hover:bg-muted' : undefined}
                        onClick={expansivel ? () => alternarExpandida(linha.userId) : undefined}
                      >
                        {colunas.map((coluna, indice) => {
                          const { numerica, classeCelula, render } = COLUNAS[coluna];
                          return (
                            <TableCell
                              key={coluna}
                              className={cn('text-sm', numerica && 'text-right', classeCelula)}
                            >
                              {/* O expandir mora na primeira coluna (Colaborador). */}
                              {indice === 0 && expansivel ? (
                                <span className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    aria-expanded={aberta}
                                    aria-label={`Ver produtos de ${linha.nome}`}
                                    onClick={event => {
                                      event.stopPropagation();
                                      alternarExpandida(linha.userId);
                                    }}
                                    className="text-muted-foreground transition-colors hover:text-foreground"
                                  >
                                    {aberta
                                      ? <ChevronDown className="h-4 w-4" />
                                      : <ChevronRight className="h-4 w-4" />}
                                  </button>
                                  {render(linha)}
                                </span>
                              ) : render(linha)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {expansivel && aberta && (
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableCell colSpan={colunas.length} className="p-4">
                            <AuditProdutosDaPessoa
                              nome={linha.nome}
                              linhas={produtosPorPessoa[linha.userId] ?? []}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AuditLimiteAviso total={logs.length} />

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <strong className="font-medium">Passe o mouse no nome de qualquer coluna</strong> para
        ver o que aquele número significa. Todos os valores são contados dos logs de
        auditoria; o sistema não mede tempo de uso nem tela principal — isso dependeria de
        telemetria de navegação, que ainda não existe.
      </p>
    </div>
  );
};
