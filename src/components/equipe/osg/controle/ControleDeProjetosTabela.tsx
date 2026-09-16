import { Fragment } from 'react';

import { format } from 'date-fns';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  UserX,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { parseDate } from '@/lib/dateUtils';
import {
  SEM_PROJETO,
  grupoLabel,
  statusLabel,
  type ColunaDoControle,
  type GrupoDoControle,
  type LinhaDoControle,
  type OrdemDoControle,
} from '@/lib/osgControleDeProjetos';
import { getRegiaoLabel } from '@/lib/regioes';
import { projectStatusConfig } from '@/lib/projetoStatusColors';
import { cn } from '@/lib/utils';

/** Quantas colunas a tabela tem, para o `colSpan` da cabeça de grupo. */
const COLUNAS = 9;

function data(valor: string | null): string {
  if (!valor) return '—';
  return format(parseDate(valor), 'dd/MM/yyyy');
}

/**
 * O status do produto.
 *
 * A cor vem de `projetoStatusColors.ts`, a mesma pílula que o modal de projeto
 * e a tabela de Projetos usam: na mesma ideia, duas telas não podem ter duas
 * cores.
 *
 * "Sem projeto" é tracejado e sem tom de status, porque não É um status: é a
 * ausência de projeto. Pintá-lo como os outros o poria na mesma prateleira de
 * Ativo e Pausado, que é o erro que a versão anterior cometia ao herdar o
 * estado da OS e escrever "Ativo" num produto que ninguém abriu.
 */
function Status({ linha }: { linha: LinhaDoControle }) {
  if (linha.status === SEM_PROJETO) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="cursor-default whitespace-nowrap border-dashed font-normal text-muted-foreground"
          >
            Sem projeto
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          Produto contratado nesta OS sem projeto criado. Clique para abrir um.
        </TooltipContent>
      </Tooltip>
    );
  }
  const config = projectStatusConfig(linha.status);
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap font-normal', config.badge)}>
      <span className={cn('mr-1.5 h-2 w-2 shrink-0 rounded-full', config.dot)} />
      {statusLabel(linha.status)}
    </Badge>
  );
}

/**
 * O prazo, com o aviso de vencido ao lado.
 *
 * A data continua legível quando está vencida: tingir a data inteira de
 * vermelho custaria contraste sem dizer mais do que o ícone já diz, e o ícone
 * carrega o texto acessível que a cor sozinha não carrega.
 */
function Prazo({ linha }: { linha: LinhaDoControle }) {
  if (!linha.prazoVencido) return <>{data(linha.dataFim)}</>;
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      {data(linha.dataFim)}
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertTriangle
            className="h-3.5 w-3.5 shrink-0 text-destructive"
            aria-label="Prazo vencido"
          />
        </TooltipTrigger>
        <TooltipContent>Prazo vencido e a OS continua aberta</TooltipContent>
      </Tooltip>
    </span>
  );
}

/**
 * Cabeçalho que ordena no clique.
 *
 * É `<button>` dentro do `<th>`, e não um `onClick` no `<th>`: a célula sozinha
 * não recebe foco nem responde ao Enter, e a tabela inteira ficaria fora do
 * alcance de quem navega por teclado. O `aria-sort` diz o estado para o leitor
 * de tela, que é o que o ícone diz para quem enxerga.
 */
function Cabecalho({
  campo,
  label,
  largura,
  ordem,
  onOrdenar,
  className,
}: {
  campo: ColunaDoControle;
  label: string;
  largura: string;
  ordem: OrdemDoControle;
  onOrdenar: (campo: ColunaDoControle) => void;
  className?: string;
}) {
  const ativa = ordem.campo === campo;
  const Icone = !ativa ? ArrowUpDown : ordem.ascendente ? ArrowUp : ArrowDown;
  return (
    <TableHead
      style={{ width: largura }}
      className={className}
      aria-sort={!ativa ? 'none' : ordem.ascendente ? 'ascending' : 'descending'}
    >
      <button
        type="button"
        onClick={() => onOrdenar(campo)}
        className="flex w-full items-center gap-1 text-left font-medium hover:text-foreground"
      >
        {label}
        <Icone
          className={cn('h-3.5 w-3.5 shrink-0', ativa ? 'text-primary' : 'text-muted-foreground/50')}
        />
      </button>
    </TableHead>
  );
}


/**
 * A cabeça de um grupo de executor.
 *
 * O grupo sem responsável vem primeiro e abre fechado: são 131 dos 169 produtos
 * em produção, e abertos eles empurrariam os executores para fora da primeira
 * tela. Ele é fila de delegação, não sobra, e por isso encabeça a lista em vez
 * de ficar no fim.
 */
function CabecaDoGrupo({
  grupo,
  aberto,
  onAlternar,
  colunas,
}: {
  grupo: GrupoDoControle;
  aberto: boolean;
  onAlternar: () => void;
  colunas: number;
}) {
  const Seta = aberto ? ChevronDown : ChevronRight;
  const semGente = grupo.semProjeto || grupo.semResponsavel;
  const Icone = grupo.semProjeto ? FolderPlus : UserX;
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colunas} className="bg-superficie-realce p-0">
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={aberto}
          className="flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 px-4 py-2 text-left"
        >
          <Seta className="h-4 w-4 shrink-0 text-muted-foreground" />
          {semGente && <Icone className="h-4 w-4 shrink-0 text-destructive" />}
          <span className={cn('font-medium', semGente && 'text-destructive')}>
            {grupoLabel(grupo.executor)}
          </span>
          <span className="text-sm text-muted-foreground">
            {grupo.linhas.length} {grupo.linhas.length === 1 ? 'produto' : 'produtos'}
            {' · '}
            {grupo.clientes} {grupo.clientes === 1 ? 'cliente' : 'clientes'}
          </span>
          {grupo.vencidas > 0 && (
            <span className="text-sm font-medium text-destructive">
              {grupo.vencidas} com prazo vencido
            </span>
          )}
          {/*
            O que o grupo é, em uma linha. Sem isto a contagem sozinha vira
            acusação: parte dos "sem projeto aberto" é trabalho que aconteceu
            fora da ferramenta e nunca foi registrado, e o banco não distingue os
            dois casos.
          */}
          {grupo.semProjeto && (
            <span className="basis-full pl-6 text-xs text-muted-foreground">
              Vendido nesta OS e sem projeto criado: ou ninguém abriu, ou foi feito fora da
              ferramenta. Clique numa linha para abrir o projeto.
            </span>
          )}
          {grupo.semResponsavel && (
            <span className="basis-full pl-6 text-xs text-muted-foreground">
              O projeto existe e está sem executor. Clique para delegar.
            </span>
          )}
        </button>
      </TableCell>
    </TableRow>
  );
}

/**
 * Uma linha: um produto contratado.
 *
 * O clique abre o modal de projeto — o MESMO `ProjetoDialog` da tela de
 * Projetos, montado pela página sobre o `ProjetosCadastroContext`. Não é uma
 * cópia: a edição grava pelas mutations de lá e aparece nas duas telas, que é o
 * motivo de a tela não ter formulário próprio.
 */
function LinhaDaTabela({ linha, onAbrir }: { linha: LinhaDoControle; onAbrir: () => void }) {
  return (
    <TableRow
      key={linha.chave}
      onClick={onAbrir}
      className={cn(
        'cursor-pointer hover:bg-superficie-realce',
        !linha.daArea && 'text-muted-foreground',
      )}
    >
      <TableCell className="whitespace-normal break-words font-medium">
        {linha.clienteNome}
        {!linha.clienteAtivo && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">(inativo)</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">{linha.numeroOs || '—'}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
    'whitespace-nowrap font-normal',
    // A área de fora não ganha cor: tingir as duas faria a linha
    // da TAX competir com a situação, que é o estado do trabalho.
    linha.daArea && 'border-primary/20 bg-primary/5 text-primary',
          )}
        >
          {linha.area}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-normal break-words text-sm">
        {linha.produtoNome}
      </TableCell>
      <TableCell>
        <Status linha={linha} />
      </TableCell>
      <TableCell className="whitespace-normal break-words text-sm">
        {linha.lideres.length > 0 ? (
          linha.lideres.join(', ')
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-sm">
        {linha.regiao ? (
          <Tooltip>
    <TooltipTrigger asChild>
      <span className="cursor-default">{linha.regiao}</span>
    </TooltipTrigger>
    <TooltipContent>{getRegiaoLabel(linha.regiao)}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">{data(linha.dataInicio)}</TableCell>
      <TableCell className="text-sm">
        <Prazo linha={linha} />
      </TableCell>
    </TableRow>
  );
}

export function ControleDeProjetosTabela({
  grupos,
  ordem,
  onOrdenar,
  abertos,
  onAlternar,
  onAbrirLinha,
}: {
  grupos: GrupoDoControle[];
  ordem: OrdemDoControle;
  onOrdenar: (campo: ColunaDoControle) => void;
  /** Chaves de grupo abertas. O executor `''` é o grupo sem responsável. */
  abertos: Set<string>;
  onAlternar: (executor: string) => void;
  /** Clique numa linha: abre o modal de projeto (edição, ou criação se não houver). */
  onAbrirLinha: (linha: LinhaDoControle) => void;
}) {
  if (grupos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhum produto contratado da OSG com esses filtros.
        </p>
      </div>
    );
  }

  const coluna = (campo: ColunaDoControle, label: string, largura: string, className?: string) => (
    <Cabecalho
      campo={campo}
      label={label}
      largura={largura}
      ordem={ordem}
      onOrdenar={onOrdenar}
      className={className}
    />
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {/*
              Os rótulos são os do CADASTRO, não os da planilha nem invenção
              desta tela: "Produto Contratado" e "Região" saem do formulário de
              OS, "Líder Geral" e "Status" do modal de projeto, "Data Início" e
              "Data Fim" do bloco de período da OS. Coluna com nome próprio
              obriga quem lê a traduzir de volta para achar onde se edita.

              "Área Executora" é a exceção, e é deliberada:
              `produto_segmento.cluster_id` não tem rótulo em tela nenhuma, e
              chamá-la de "Área" a confundiria com "Área do Negócio" da OS, que é
              o setor do cliente (Agropecuária, Indústria) e é outra coisa.
            */}
            {coluna('cliente', 'Cliente', '15%')}
            {coluna('os', 'OS', '8%', 'whitespace-nowrap')}
            {coluna('area', 'Área Executora', '9%')}
            {coluna('produto', 'Produto Contratado', '18%')}
            {coluna('status', 'Status', '11%')}
            {coluna('gestor', 'Líder Geral', '14%')}
            {coluna('regiao', 'Região', '7%')}
            {coluna('inicio', 'Data Início', '9%', 'whitespace-nowrap')}
            {coluna('prazo', 'Data Fim', '9%', 'whitespace-nowrap')}
          </TableRow>
        </TableHeader>
        <TableBody>
          {grupos.map((grupo) => {
            const aberto = abertos.has(grupo.executor);
            return (
              <Fragment key={grupo.executor || '__sem__'}>
                <CabecaDoGrupo
                  grupo={grupo}
                  aberto={aberto}
                  onAlternar={() => onAlternar(grupo.executor)}
                  colunas={COLUNAS}
                />
                {aberto &&
                  grupo.linhas.map((linha) => (
                    <LinhaDaTabela
                      key={linha.chave}
                      linha={linha}
                      onAbrir={() => onAbrirLinha(linha)}
                    />
                  ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
