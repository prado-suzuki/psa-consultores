import { useMemo, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/contexts/AuthContext';
import { useDomainAuditProdutividade } from '@/hooks/useDomainAuditLogs';
import {
  useDomainPessoasCarga, useDomainPessoasEstrutura, useDomainPessoasUltimoAcesso,
  type EstruturaPessoas,
} from '@/hooks/useDomainPessoas';
import { useProfilesNomeMap } from '@/hooks/useDomainProfiles';
import {
  agregarPessoas, buildPessoasCsv, colunasPessoas, direcaoInicialPessoa, DIAS_PARA_PAROU,
  ORDENACAO_INICIAL_PESSOAS, ordenarPessoas, resumirPessoas, rotuloDiasSemRegistro,
  SITUACAO_LABELS,
  type CargaPorPessoa, type ColunaPessoa, type LinhaPessoa, type SituacaoPessoa,
} from '@/lib/auditPessoas';
import { useAuditPeriodo } from '@/hooks/useAuditPeriodo';
import type { AuditArea } from '@/lib/auditAreas';
import type { DirecaoOrdenacao } from '@/lib/auditProdutividade';
import { triggerCsvDownload } from '@/lib/roiCsv';
import { AuditLimiteAviso } from './AuditLimiteAviso';

interface AuditPessoasTableProps {
  /** Área do módulo, ou 'todas' no consolidado do Board. */
  area: AuditArea;
}

const SEM_ESTRUTURA: EstruturaPessoas = { estrutura: {}, roster: [] };
const SEM_CARGA: CargaPorPessoa = {};

interface DefinicaoColuna {
  label: string;
  numerica: boolean;
  /**
   * Centraliza cabeçalho e célula.
   *
   * Existe para a coluna de selo: o rótulo varia de "Ativo" a "Sem registro no
   * período", e encostado à esquerda a coluna fica visualmente torta, com os
   * selos de larguras diferentes começando no mesmo ponto e terminando em
   * lugares distantes. `numerica` só sabia dizer esquerda ou direita.
   */
  centralizada?: boolean;
  /** Toda coluna explica no hover o que mostra, em linguagem de usuário. */
  ajuda: string;
  render: (linha: LinhaPessoa) => ReactNode;
  classeCelula?: string;
}

/**
 * A situação de registro da pessoa, nos papéis de status da área.
 *
 * `sem_registro` NÃO é `ajuste`: como o texto de ajuda da coluna faz questão de
 * dizer, isto é sobre registro no sistema e não sobre o trabalho da pessoa —
 * ausência de dado na janela escolhida não é falha de ninguém, e vermelho ali
 * acusaria. Fica `neutro`. `parou` é `alerta` porque é o único dos três em que a
 * urgência sobe com o tempo.
 */
const CORES_SITUACAO: Record<SituacaoPessoa, string> = {
  ativo: 'bg-status-andamento-soft text-status-andamento',
  parou: 'bg-status-alerta-soft text-status-alerta',
  sem_registro: 'bg-status-neutro-soft text-status-neutro',
};

/** Data e hora curtas; `—` quando não há valor a mostrar. */
function dataHora(iso: string | null): string {
  return iso ? format(new Date(iso), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '—';
}

/**
 * Último registro com o "há quantos dias" do lado: a data responde quando, o
 * relativo responde se isso é recente — junto, dispensa a conta de cabeça.
 */
const ConteudoUltimoRegistro = ({ linha }: { linha: LinhaPessoa }) => (
  <>
    <span>{dataHora(linha.ultimoRegistro)}</span>
    {linha.ultimoRegistro && (
      <span className="ml-2 text-xs text-muted-foreground">
        {rotuloDiasSemRegistro(linha.diasSemRegistro)}
      </span>
    )}
  </>
);

const COLUNAS: Record<ColunaPessoa, DefinicaoColuna> = {
  nome: {
    label: 'Colaborador',
    numerica: false,
    ajuda: 'Quem é a pessoa. O nome vem do cadastro de usuários; aparece "Desconhecido" quando o cadastro não está visível para você.',
    classeCelula: 'font-medium',
    render: linha => linha.nome,
  },
  areaEquipe: {
    label: 'Área / Equipe',
    numerica: false,
    ajuda: 'Onde a pessoa está lotada na estrutura da empresa. Quem está em mais de uma equipe aparece com as duas. "—" significa que ela não está em nenhuma equipe cadastrada — não que não tenha área.',
    classeCelula: 'text-muted-foreground',
    render: linha => (linha.area || linha.equipe
      ? [linha.area, linha.equipe].filter(Boolean).join(' / ')
      : '—'),
  },
  ultimoAcesso: {
    label: 'Último acesso',
    numerica: false,
    ajuda: 'Data do último login no sistema. É entrada, não tempo de uso: o sistema não mede quanto tempo a pessoa ficou dentro nem em que tela. "—" significa que ela nunca logou. Visível apenas para administradores.',
    classeCelula: 'whitespace-nowrap text-muted-foreground',
    render: linha => dataHora(linha.ultimoAcesso),
  },
  ultimoRegistro: {
    label: 'Último registro',
    numerica: false,
    ajuda: 'Quando a pessoa gravou a última ação nesta área — criar, editar ou excluir. Diferente de Último acesso: dá para entrar no sistema todo dia e não registrar nada, e é justamente esse par que mostra quem está só olhando.',
    classeCelula: 'whitespace-nowrap',
    render: linha => <ConteudoUltimoRegistro linha={linha} />,
  },
  diasAtivos: {
    label: 'Dias ativos',
    numerica: true,
    ajuda: 'Em quantos dias diferentes do período ela registrou pelo menos uma ação. Não é tempo trabalhado: o sistema conta dias com registro, não horas.',
    render: linha => linha.diasAtivos,
  },
  tarefasAbertas: {
    label: 'Tarefas abertas',
    numerica: true,
    ajuda: 'Quantas tarefas atribuídas a ela ainda não estão concluídas, agora — não é do período. Conta as tarefas que você tem permissão para ver, de qualquer área.',
    render: linha => linha.tarefasAbertas,
  },
  tarefasAtrasadas: {
    label: 'Atrasadas',
    numerica: true,
    ajuda: 'Das tarefas abertas dela, quantas já passaram do prazo. Tarefa sem prazo preenchido nunca conta como atrasada.',
    // A cor sai do `classeCelula`, que pintava a coluna inteira: em vermelho
    // estático, "0 atrasadas" também aparecia em vermelho, afirmando problema onde
    // não há nenhum. Agora só marca quando há atraso — a mesma regra do estouro de
    // horas em `AuditProdutividadeTable`.
    render: linha => (
      <span className={cn(linha.tarefasAtrasadas > 0 && 'font-medium text-status-ajuste')}>
        {linha.tarefasAtrasadas}
      </span>
    ),
  },
  situacao: {
    label: 'Situação',
    numerica: false,
    centralizada: true,
    ajuda: `Leitura rápida do registro: "Ativo" registrou algo nos últimos ${DIAS_PARA_PAROU} dias; "Parou de registrar" passou disso; "Sem registro no período" não gravou nada na janela escolhida. É sobre registro no sistema, não sobre o trabalho da pessoa.`,
    render: linha => (
      <Badge variant="secondary" className={cn('font-normal', CORES_SITUACAO[linha.situacao])}>
        {SITUACAO_LABELS[linha.situacao]}
      </Badge>
    ),
  },
};

interface Kpi {
  label: string;
  valor: string;
  hint: string;
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
  coluna: ColunaPessoa;
  direcao: DirecaoOrdenacao;
}

const HeaderOrdenavel = ({
  label, numerica, centralizada, ativa, direcao, ajuda, onClick,
}: {
  label: string;
  numerica: boolean;
  centralizada?: boolean;
  ativa: boolean;
  direcao: DirecaoOrdenacao;
  ajuda: string;
  onClick: () => void;
}) => {
  const Icone = !ativa ? ArrowUpDown : direcao === 'asc' ? ArrowUp : ArrowDown;

  return (
    <TableHead
      className={cn('p-0', numerica && 'text-right', centralizada && 'text-center')}
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
              centralizada && 'justify-center',
              ativa ? 'font-semibold text-foreground' : 'text-muted-foreground',
            )}
          >
            <span className="border-b border-dotted border-border">{label}</span>
            <Icone className={cn('h-3.5 w-3.5 shrink-0', ativa ? 'opacity-100' : 'opacity-40')} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align={numerica ? 'end' : centralizada ? 'center' : 'start'} className="max-w-xs">
          <p className="text-xs leading-relaxed">{ajuda}</p>
          <p className="mt-1 text-xs italic opacity-70">Clique para ordenar por esta coluna.</p>
        </TooltipContent>
      </Tooltip>
    </TableHead>
  );
};

/**
 * Aba Pessoas: quem é, onde está, quando acessou e quando registrou algo.
 *
 * A lista é o time lotado nas equipes da área mais quem registrou algo no
 * período — assim quem sumiu aparece com "Sem registro no período" em vez de
 * simplesmente não existir na tela.
 *
 * "Último acesso" só existe para admin: `profiles` tem SELECT restrito a admin
 * e liberar a coluna para o time exigiria migração de view. Ver
 * `useDomainPessoasUltimoAcesso`.
 */
export const AuditPessoasTable = ({ area }: AuditPessoasTableProps) => {
  const { isAdmin } = useAuth();
  const [ordenacao, setOrdenacao] = useState<Ordenacao>(ORDENACAO_INICIAL_PESSOAS);
  const colunas = useMemo(() => colunasPessoas(isAdmin), [isAdmin]);

  // O período é compartilhado com as outras abas; `hoje` também é a referência do
  // "atrasada" e do "há quantos dias" — ver `useAuditPeriodo`.
  const { periodo, setPeriodo, opcoes, janela, hoje } = useAuditPeriodo();

  const { data: logs = [], isLoading } = useDomainAuditProdutividade(area, janela);
  const { data: nomes = {} } = useProfilesNomeMap('profiles_safe');
  const { data: estruturaPessoas = SEM_ESTRUTURA } = useDomainPessoasEstrutura(area);
  const { data: ultimoAcessoPorId } = useDomainPessoasUltimoAcesso(isAdmin);
  const { data: carga = SEM_CARGA } = useDomainPessoasCarga(hoje);

  const linhas = useMemo(
    () => ordenarPessoas(
      agregarPessoas({
        logs,
        nomePorId: nomes,
        estrutura: estruturaPessoas.estrutura,
        ultimoAcessoPorId,
        carga,
        incluirSemRegistro: estruturaPessoas.roster,
        hoje,
      }),
      ordenacao.coluna,
      ordenacao.direcao,
    ),
    [logs, nomes, estruturaPessoas, ultimoAcessoPorId, carga, hoje, ordenacao],
  );

  const resumo = useMemo(() => resumirPessoas(linhas, isAdmin), [linhas, isAdmin]);

  const kpis: Kpi[] = [
    {
      label: 'Pessoas',
      valor: String(resumo.pessoas),
      hint: 'time da área + quem registrou no período',
    },
    {
      label: 'Sem registrar',
      valor: String(resumo.paradas),
      hint: `${DIAS_PARA_PAROU}+ dias sem gravar nada`,
    },
    ...(resumo.semAcesso === null ? [] : [{
      label: 'Nunca acessaram',
      valor: String(resumo.semAcesso),
      hint: 'sem nenhum login registrado',
    }]),
  ];

  /** Mesma coluna inverte a direção; coluna nova começa na direção natural dela. */
  const alternarOrdenacao = (coluna: ColunaPessoa) => {
    setOrdenacao(atual => atual.coluna === coluna
      ? { coluna, direcao: atual.direcao === 'asc' ? 'desc' : 'asc' }
      : { coluna, direcao: direcaoInicialPessoa(coluna) });
  };

  const handleExportCsv = () => {
    triggerCsvDownload(buildPessoasCsv(linhas, colunas), `pessoas-${area}-${janela.slug}.csv`);
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                    centralizada={COLUNAS[coluna].centralizada}
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
                    Nenhuma pessoa com registro no período
                  </TableCell>
                </TableRow>
              ) : (
                linhas.map(linha => (
                  <TableRow key={linha.userId}>
                    {colunas.map(coluna => {
                      const { numerica, centralizada, classeCelula, render } = COLUNAS[coluna];
                      return (
                        <TableCell
                          key={coluna}
                          className={cn('text-sm', numerica && 'text-right', centralizada && 'text-center', classeCelula)}
                        >
                          {render(linha)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AuditLimiteAviso total={logs.length} />

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <strong className="font-medium">Passe o mouse no nome de qualquer coluna</strong> para
          ver o que ela mostra. Último acesso é o login; o sistema não mede tempo de uso, sessão
          nem tela mais usada — isso dependeria de telemetria de navegação, que ainda não existe.
          {!isAdmin && ' A coluna Último acesso aparece somente para administradores.'}
        </span>
      </p>
    </div>
  );
};
