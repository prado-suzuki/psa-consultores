import { useMemo } from 'react';
import { Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useDomainAuditProdutividade, useDomainOrgTasksProdutividade } from '@/hooks/useDomainAuditLogs';
import { useProfilesNomeMap } from '@/hooks/useDomainProfiles';
import {
  agregarClientePorProduto, agregarPessoaPorProduto, agregarPorProduto,
  buildProdutosCsv, idsTocados,
  type ClientePorId, type HorasPorId, type VinculoPorId,
} from '@/lib/auditProdutividade';
import { useAuditPeriodo } from '@/hooks/useAuditPeriodo';
import type { AuditArea } from '@/lib/auditAreas';
import { triggerCsvDownload } from '@/lib/roiCsv';
import { AuditLimiteAviso } from './AuditLimiteAviso';
import { AuditTempoMedioProduto } from './AuditTempoMedioProduto';

interface AuditProdutosTableProps {
  /** Área do módulo, ou 'todas' no consolidado do Board. */
  area: AuditArea;
}

const SEM_HORAS: HorasPorId = {};
const SEM_VINCULO: VinculoPorId = {};
const SEM_CLIENTE: ClientePorId = {};
const SEM_NOMES: Record<string, string> = {};

/**
 * Aba Produtos: quanto tempo cada tipo de produto contratado consome por item
 * entregue, somando a equipe.
 *
 * Fica separada da aba Produtividade de propósito — lá a pergunta é sobre
 * pessoa, aqui é sobre produto, e a média da equipe não é a média das médias por
 * pessoa (cada uma tem um divisor diferente de itens com apontamento). Os
 * produtos de UMA pessoa continuam na linha expandida da aba Produtividade.
 */
export const AuditProdutosTable = ({ area }: AuditProdutosTableProps) => {
  // O período é compartilhado com as outras abas — ver `useAuditPeriodo`.
  const { periodo, setPeriodo, opcoes, janela } = useAuditPeriodo();

  const { data: logs = [], isLoading } = useDomainAuditProdutividade(area, janela);
  // `profiles_safe`: `profiles` só tem SELECT para admin, e o nome de quem
  // trabalhou no produto precisa aparecer para o time todo.
  const { data: nomesPessoas = {} } = useProfilesNomeMap('profiles_safe');

  // Horas e produto dos itens tocados — a lista de ids sai dos próprios logs.
  const ids = useMemo(() => idsTocados(logs), [logs]);
  const { data: vinculos } = useDomainOrgTasksProdutividade(ids);
  // Fallbacks são constantes de módulo: literais `{}` aqui trocariam de
  // identidade a cada render e invalidariam o useMemo abaixo sem motivo.
  const horas = vinculos?.horas ?? SEM_HORAS;
  const produtoPorId = vinculos?.produtoPorId ?? SEM_VINCULO;
  const nomePorProduto = vinculos?.nomePorProduto ?? SEM_NOMES;
  // Cliente já vem resolvido do hook (contribuinte normalizado para o grupo) —
  // o drill por cliente não custa nenhuma consulta a mais.
  const clientePorId = vinculos?.clientePorId ?? SEM_CLIENTE;
  const nomePorCliente = vinculos?.nomePorCliente ?? SEM_NOMES;

  const linhas = useMemo(
    () => agregarPorProduto(logs, horas, produtoPorId, nomePorProduto),
    [logs, horas, produtoPorId, nomePorProduto],
  );

  // Conteúdo da linha expandida: quem mexeu em cada produto. Sai do mesmo par
  // pessoa × produto da expansão da aba Produtividade, só lido ao contrário.
  const pessoasPorProduto = useMemo(
    () => agregarPessoaPorProduto(logs, horas, produtoPorId, nomesPessoas),
    [logs, horas, produtoPorId, nomesPessoas],
  );

  // Os dois níveis do drill: os clientes de cada produto e, dentro do cliente,
  // quem executou. Saem juntos do mesmo acumulador para a conta fechar.
  const clientesPorProduto = useMemo(
    () => agregarClientePorProduto(
      logs, horas, produtoPorId, clientePorId, nomePorCliente, nomesPessoas,
    ),
    [logs, horas, produtoPorId, clientePorId, nomePorCliente, nomesPessoas],
  );

  const handleExportCsv = () => {
    triggerCsvDownload(buildProdutosCsv(linhas), `produtos-${area}-${janela.slug}.csv`);
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

      <AuditTempoMedioProduto
        linhas={linhas}
        isLoading={isLoading}
        pessoasPorProduto={pessoasPorProduto}
        clientesPorProduto={clientesPorProduto}
      />

      <AuditLimiteAviso total={logs.length} />

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <strong className="font-medium">Clique num produto</strong> para ver em quais clientes
          as horas dele foram gastas e, clicando no cliente, quem está executando ali; a aba
          "Colaboradores" do painel mostra o produto inteiro sem quebrar por cliente. Passe o
          mouse no nome de qualquer coluna para ver o que aquele número significa. Cliente é o
          grupo: os vários CNPJs de um mesmo cliente entram numa linha só. As horas de cada
          cliente somam a linha do produto porque contam apenas itens concluídos — o que está em
          andamento aparece em "Tocados", não nas horas. Já somar os "Tocados" das pessoas pode
          passar o total do cliente: duas pessoas na mesma tarefa contam uma vez cada. A média por
          produto é da equipe, não a média das médias por pessoa, porque cada pessoa tem um número
          diferente de itens com horas apontadas. Para o caminho inverso (os produtos de uma
          pessoa), clique na linha dela na aba Produtividade.
        </span>
      </p>
    </div>
  );
};
