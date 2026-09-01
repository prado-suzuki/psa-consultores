import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpRight, CheckCircle2, Download, Info } from 'lucide-react';
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
import { useDomainAuditProdutividade, useDomainOrgTasksProdutividade } from '@/hooks/useDomainAuditLogs';
import { useProfilesNomeMap } from '@/hooks/useDomainProfiles';
import type { AuditArea } from '@/lib/auditAreas';
import {
  agregarPendencias, buildPendenciasCsv, destinoPendencia, MOTIVO_COMO_RESOLVER, MOTIVO_LABELS,
  MOTIVOS_POR_SEVERIDADE,
  type MotivoPendencia,
} from '@/lib/auditPendencias';
import { useAuditPeriodo } from '@/hooks/useAuditPeriodo';
import { idsTocados, type ClientePorId, type VinculoPorId } from '@/lib/auditProdutividade';
import { triggerCsvDownload } from '@/lib/roiCsv';
import { AuditLimiteAviso } from './AuditLimiteAviso';
import { ENTITY_LABELS } from './auditLabels';

interface AuditPendenciasTableProps {
  /** Área do módulo, ou 'todas' no consolidado do Board. */
  area: AuditArea;
}

const SEM_EXISTE: Record<string, true> = {};
const SEM_VINCULO: VinculoPorId = {};
const SEM_CLIENTES: ClientePorId = {};
const SEM_LISTAS: Record<string, string[]> = {};
const SEM_NOMES: Record<string, string> = {};

const TODOS = 'todos';

/** Cor por severidade: quanto mais em cima na fila, mais forte o aviso. */
const CORES_MOTIVO: Record<MotivoPendencia, string> = {
  sem_projeto: 'bg-red-100 text-red-700',
  sem_cliente: 'bg-red-100 text-red-700',
  sem_os: 'bg-amber-100 text-amber-700',
  os_sem_produto: 'bg-amber-100 text-amber-700',
  sem_servico: 'bg-muted text-slate-700',
  servico_fora_da_os: 'bg-muted text-slate-700',
};

const KpiCard = ({ label, valor, hint }: { label: string; valor: string; hint: string }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{valor}</p>
      <p className="text-xs text-slate-400">{hint}</p>
    </CardContent>
  </Card>
);

/**
 * Aba "Não resolvidos": o que o sistema não conseguiu ligar e por isso não
 * consegue medir.
 *
 * As outras abas mostram o resultado; esta mostra o que está furando o
 * resultado. Cada linha é um item tocado no período com um vínculo faltando —
 * "Sem produto identificado" na aba Produtos e cliente subcontado na aba
 * Produtividade saem exatamente daqui. Nenhum dado novo: os mesmos mapas que a
 * hook já resolve, lidos ao contrário.
 */
export const AuditPendenciasTable = ({ area }: AuditPendenciasTableProps) => {
  const navigate = useNavigate();
  // O período é compartilhado com as outras abas — ver `useAuditPeriodo`.
  const { periodo, setPeriodo, opcoes, janela } = useAuditPeriodo();
  const [motivoFiltro, setMotivoFiltro] = useState<string>(TODOS);

  const { data: logs = [], isLoading } = useDomainAuditProdutividade(area, janela);
  const { data: nomesPessoas = {} } = useProfilesNomeMap('profiles_safe');

  const ids = useMemo(() => idsTocados(logs), [logs]);
  const { data: vinculos } = useDomainOrgTasksProdutividade(ids);
  // Fallbacks são constantes de módulo: literais `{}` aqui trocariam de
  // identidade a cada render e invalidariam o useMemo abaixo sem motivo.
  const existePorId = vinculos?.existePorId ?? SEM_EXISTE;
  const clientePorId = vinculos?.clientePorId ?? SEM_CLIENTES;
  const servicoPorId = vinculos?.servicoPorId ?? SEM_VINCULO;
  const osPorId = vinculos?.osPorId ?? SEM_VINCULO;
  const produtoPorId = vinculos?.produtoPorId ?? SEM_VINCULO;
  const projetoPorItem = vinculos?.projetoPorItem ?? SEM_VINCULO;
  const produtosPorOs = vinculos?.produtosPorOs ?? SEM_LISTAS;
  const nomePorCliente = vinculos?.nomePorCliente ?? SEM_NOMES;
  const nomePorProjeto = vinculos?.nomePorProjeto ?? SEM_NOMES;

  const { linhas, resumo } = useMemo(
    () => agregarPendencias({
      logs,
      existePorId,
      clientePorId,
      servicoPorId,
      osPorId,
      produtoPorId,
      projetoPorItem,
      produtosPorOs,
      nomePorCliente,
      nomePorProjeto,
      nomePorPessoa: nomesPessoas,
    }),
    [
      logs, existePorId, clientePorId, servicoPorId, osPorId, produtoPorId,
      projetoPorItem, produtosPorOs, nomePorCliente, nomePorProjeto, nomesPessoas,
    ],
  );

  const visiveis = useMemo(
    () => (motivoFiltro === TODOS ? linhas : linhas.filter(l => l.motivo === motivoFiltro)),
    [linhas, motivoFiltro],
  );

  // Só entram no filtro os motivos que existem de verdade no período — opção que
  // devolveria lista vazia é convite para achar que a tela quebrou.
  const motivosComLinha = MOTIVOS_POR_SEVERIDADE.filter(m => resumo.porMotivo[m] > 0);

  const semVinculoDeCliente = resumo.porMotivo.sem_cliente + resumo.porMotivo.sem_projeto;
  const semProduto = resumo.porMotivo.sem_os + resumo.porMotivo.os_sem_produto
    + resumo.porMotivo.sem_servico + resumo.porMotivo.servico_fora_da_os;

  const handleExportCsv = () => {
    triggerCsvDownload(buildPendenciasCsv(visiveis), `nao-resolvidos-${area}-${janela.slug}.csv`);
  };

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
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
          <Select value={motivoFiltro} onValueChange={setMotivoFiltro}>
            <SelectTrigger className="w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Tudo que falta ({resumo.total})</SelectItem>
              {motivosComLinha.map(motivo => (
                <SelectItem key={motivo} value={motivo}>
                  {MOTIVO_LABELS[motivo]} ({resumo.porMotivo[motivo]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={isLoading || visiveis.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Não resolvidos"
          valor={String(resumo.total)}
          hint={`de ${resumo.itensAvaliados} itens tocados no período`}
        />
        <KpiCard
          label="Sem dono"
          valor={String(semVinculoDeCliente)}
          hint="sem cliente ou fora de projeto"
        />
        <KpiCard
          label="Sem produto"
          valor={String(semProduto)}
          hint="não dá para medir tempo por produto"
        />
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-3">Item</TableHead>
                <TableHead className="px-4 py-3">Tipo</TableHead>
                <TableHead className="px-4 py-3">Projeto</TableHead>
                <TableHead className="px-4 py-3">Cliente</TableHead>
                <TableHead className="px-4 py-3">O que falta</TableHead>
                <TableHead className="px-4 py-3">Último a mexer</TableHead>
                <TableHead className="px-4 py-3 text-right">Resolver</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : visiveis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {linhas.length === 0
                        ? 'Nada pendente: todo item tocado no período tem cliente, OS e produto.'
                        : 'Nenhum item com esse motivo no período.'}
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                visiveis.map(linha => {
                  const destino = destinoPendencia(linha, area);
                  return (
                  <TableRow
                    key={linha.itemId}
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => navigate(destino.rota)}
                  >
                    <TableCell className="text-sm font-medium">{linha.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ENTITY_LABELS[linha.tipo] ?? linha.tipo}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {linha.projetoNome ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {linha.clienteNome ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className={cn('cursor-help font-normal', CORES_MOTIVO[linha.motivo])}
                          >
                            {MOTIVO_LABELS[linha.motivo]}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs">
                          <p className="text-xs leading-relaxed">
                            {MOTIVO_COMO_RESOLVER[linha.motivo]}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {linha.ultimoToquePor}
                      <span className="ml-2 text-xs text-slate-400">
                        {format(new Date(linha.ultimoToqueEm), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-2 text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`${destino.rotulo} — ${linha.nome}`}
                            // A linha inteira já navega; o botão existe para teclado
                            // e para dizer, antes do clique, onde ele cai.
                            onClick={event => {
                              event.stopPropagation();
                              navigate(destino.rota);
                            }}
                          >
                            {destino.curto}
                            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="end" className="max-w-xs">
                          <p className="text-xs leading-relaxed">{destino.rotulo}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
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
        <span>
          <strong className="font-medium">Clique na linha</strong> para abrir a tela onde o campo
          que falta é preenchido — a tarefa, o cadastro do projeto ou o de Clientes, conforme o
          motivo. Passe o mouse no motivo para ver o que fazer lá dentro.
          A fila cobre os itens que alguém tocou no período escolhido — item que
          ninguém abriu nesses dias não aparece, e item excluído depois sai da lista porque não há
          o que corrigir. Cada linha mostra só o primeiro problema dela: resolver o de cima
          costuma trazer os vínculos de baixo junto.
        </span>
      </p>
    </div>
  );
};
