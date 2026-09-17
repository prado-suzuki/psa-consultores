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
  statusLabel,
  type ColunaDoControle,
  type GrupoDoControle,
  type LinhaDoControle,
  type OrdemDoControle,
} from '@/lib/osgControleDeProjetos';
import { getRegiaoLabel } from '@/lib/regioes';
import { projectStatusConfig } from '@/lib/projetoStatusColors';
import { cn } from '@/lib/utils';

/** Quantas colunas a tabela tem, para o `colSpan` da faixa de grupo. */
const COLUNAS = 11;

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
 * A descrição do projeto, a mesma que o modal edita.
 *
 * Cortada em três linhas com o texto inteiro no tooltip: é campo livre, e
 * deixá-la crescer faria uma linha de descrição longa empurrar a altura de todas
 * as outras nove colunas. Três e não duas porque a coluna Cliente já usa as três
 * ("[TESTE] Dinossauro Aposentado Previdência e Fósseis Ltda" quebra em três
 * linhas), então a descrição cresce dentro da altura que a linha já tem.
 * Produto sem projeto cai no traço junto com o projeto
 * de descrição vazia — os dois estados já se distinguem na coluna Status, e
 * repetir a distinção aqui só encheria a célula.
 */
function Descricao({ linha }: { linha: LinhaDoControle }) {
  if (!linha.descricao) return <span className="text-muted-foreground">—</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="line-clamp-3 cursor-default whitespace-normal break-words text-left">
          {linha.descricao}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm whitespace-pre-wrap">{linha.descricao}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Uma lista de gente numa célula: executores ou líderes.
 *
 * A mesma célula para as duas colunas porque o par OS/produto pode ter mais de
 * um projeto, e nos dois casos o que chega é uma lista sem repetição, já
 * ordenada pelo `montarControleDeProjetos`. Vazio é traço, e é informação: no
 * executor ele separa o produto vendido sem projeto criado do projeto aberto
 * sem ninguém dentro — os dois se distinguem pela coluna Status ao lado.
 */
function Pessoas({ nomes }: { nomes: string[] }) {
  if (nomes.length === 0) return <span className="text-muted-foreground">—</span>;
  return <>{nomes.join(', ')}</>;
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
 * A faixa de um grupo, quando a barra pede agrupamento.
 *
 * É uma linha `colSpan` DENTRO da mesma `<Table>`, e não um cartão por grupo
 * como em `ProjetosCadastroTable`: com onze colunas, um cartão por grupo faria
 * cada bloco calcular a própria largura e as colunas deixariam de se alinhar de
 * um grupo para o outro.
 *
 * A FAIXA É `bg-muted` — o neutro CHEIO da área, sem alfa —, e a linha embaixo é
 * branca. Chegou aqui em três passos, e o do meio foi recusado OLHANDO.
 *
 * Ela era `bg-superficie-realce` com a linha transparente sobre o cartão, e as
 * duas ficavam a **1,106:1** uma da outra na OSG (1,120 na Tax) — menos que o
 * 1,24:1 com que a borda de 1px se separa do cartão. Embranquecer a linha subiu
 * para 1,186, ainda pouco, e a faixa foi para a ÂNCORA (`bg-primary/10`), como a
 * faixa de cliente de `ProjetosTarefasList`: 1,250, com separação de MATIZ.
 *
 * ⚠️ **E ficou feia, na palavra dela (17/09/2026), por um motivo que só existe na
 * OSG.** A âncora é musgo (matiz 149) e a superfície é areia (matiz 32), 117° de
 * distância; compostas a 10%, dão **matiz 98** — um verde-amarelado embarrado.
 * Na Tax as duas concordam (192 contra 192) e o mesmo `primary/10` sai limpo, o
 * que é exatamente o que o levantamento de 03/09 já tinha medido sobre fill de
 * âncora na OSG.
 *
 * `bg-muted` cheio resolve sem tirar separação: **1,227** na OSG (1,260 na Tax),
 * contra 1,250 da âncora — três milésimos de diferença —, e a faixa volta a ser a
 * areia da própria área em vez de uma cor nova. O `primary/6` foi medido junto e
 * não serve: 1,175, abaixo do ponto de partida, e ainda verde.
 */
function FaixaDoGrupo({
  grupo,
  aberto,
  onAlternar,
  mostrarClientes,
}: {
  grupo: GrupoDoControle;
  aberto: boolean;
  onAlternar: () => void;
  /** Falso quando o agrupamento é POR cliente: a contagem seria sempre 1. */
  mostrarClientes: boolean;
}) {
  const Seta = aberto ? ChevronDown : ChevronRight;
  const semGente = grupo.semProjeto || grupo.semResponsavel;
  const Icone = grupo.semProjeto ? FolderPlus : UserX;
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={COLUNAS} className="border-b bg-muted p-0">
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={aberto}
          className="flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 px-4 py-2 text-left"
        >
          <Seta className="h-4 w-4 shrink-0 text-muted-foreground" />
          {semGente && <Icone className="h-4 w-4 shrink-0 text-destructive" />}
          <span className={cn('font-medium', semGente && 'text-destructive')}>{grupo.rotulo}</span>
          <span className="text-sm text-muted-foreground">
            {grupo.linhas.length} {grupo.linhas.length === 1 ? 'produto' : 'produtos'}
            {mostrarClientes && (
              <>
                {' · '}
                {grupo.clientes} {grupo.clientes === 1 ? 'cliente' : 'clientes'}
              </>
            )}
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
        // A linha de último nível fica no `bg-card` LIMPO, e quem carrega tinta
        // é a faixa do grupo, quando há uma. Mesmo par de `ProjetosTarefasList`,
        // pelo mesmo motivo medido lá: a faixa é o cabeçalho do bloco, então é
        // ela que recebe a cor da área, e a linha embaixo volta ao branco.
        'cursor-pointer bg-card',
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
        <Pessoas nomes={linha.executores} />
      </TableCell>
      <TableCell className="whitespace-normal break-words text-sm">
        <Pessoas nomes={linha.lideres} />
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
      <TableCell className="text-sm">
        <Descricao linha={linha} />
      </TableCell>
    </TableRow>
  );
}

export function ControleDeProjetosTabela({
  linhas,
  grupos,
  ordem,
  onOrdenar,
  fechados,
  onAlternar,
  onAbrirLinha,
  agrupadoPorCliente,
}: {
  /** Já filtradas e ordenadas pela página: a tabela só desenha. */
  linhas: LinhaDoControle[];
  /** `null` = sem agrupamento, que é como a tela abre. */
  grupos: GrupoDoControle[] | null;
  ordem: OrdemDoControle;
  onOrdenar: (campo: ColunaDoControle) => void;
  /** Chaves de grupo fechadas. Só importa quando há agrupamento. */
  fechados: Set<string>;
  onAlternar: (chave: string) => void;
  /** Clique numa linha: abre o modal de projeto (edição, ou criação se não houver). */
  onAbrirLinha: (linha: LinhaDoControle) => void;
  agrupadoPorCliente: boolean;
}) {
  if (linhas.length === 0) {
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
              OS, "Responsável Executor", "Líder Geral", "Status" e "Descrição"
              do modal de projeto, "Data Início" e "Data Fim" do bloco de período
              da OS. Coluna com nome próprio obriga quem lê a traduzir de volta
              para achar onde se edita.

              "Área Executora" é a exceção, e é deliberada:
              `produto_segmento.cluster_id` não tem rótulo em tela nenhuma, e
              chamá-la de "Área" a confundiria com "Área do Negócio" da OS, que é
              o setor do cliente (Agropecuária, Indústria) e é outra coisa.

              Executor antes de Líder Geral porque é essa a ordem da planilha
              (coluna B, Equipe OSG; coluna C, Gestor) e a da leitura: quem toca
              o trabalho antes de quem responde por ele.
            */}
            {coluna('cliente', 'Cliente', '12%')}
            {coluna('os', 'OS', '6%', 'whitespace-nowrap')}
            {coluna('area', 'Área Executora', '8%')}
            {coluna('produto', 'Produto Contratado', '14%')}
            {coluna('status', 'Status', '9%')}
            {coluna('executor', 'Responsável Executor', '11%')}
            {coluna('gestor', 'Líder Geral', '11%')}
            {coluna('regiao', 'Região', '5%')}
            {coluna('inicio', 'Data Início', '6%', 'whitespace-nowrap')}
            {coluna('prazo', 'Data Fim', '6%', 'whitespace-nowrap')}
            {coluna('descricao', 'Descrição', '12%')}
          </TableRow>
        </TableHeader>
        <TableBody>
          {grupos === null
            ? linhas.map((linha) => (
                <LinhaDaTabela
                  key={linha.chave}
                  linha={linha}
                  onAbrir={() => onAbrirLinha(linha)}
                />
              ))
            : grupos.map((grupo) => {
                const aberto = !fechados.has(grupo.chave);
                return (
                  <Fragment key={grupo.chave}>
                    <FaixaDoGrupo
                      grupo={grupo}
                      aberto={aberto}
                      onAlternar={() => onAlternar(grupo.chave)}
                      mostrarClientes={!agrupadoPorCliente}
                    />
                    {aberto &&
                      grupo.linhas.map((linha) => (
                        // A chave leva a do grupo junto: a mesma linha pode
                        // estar em dois grupos (produto de dois executores), e
                        // só a chave da linha se repetiria dentro da tabela.
                        <LinhaDaTabela
                          key={`${grupo.chave}::${linha.chave}`}
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
