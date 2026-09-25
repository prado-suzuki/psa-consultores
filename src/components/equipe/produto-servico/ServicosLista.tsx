import { useMemo, useState, type ReactNode } from 'react';
import { Copy, Layers, Link2, Pencil, Plus, Search, Trash2, Unlink } from 'lucide-react';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  listRowAria, listRowClasses, listRowFocusClasses, listRowTitleClasses,
} from '@/lib/listRowStates';
import { dividirNomeServico, faixaDeSelecao } from '@/lib/produtoServicoNomes';
import type { FiltroVinculo } from '@/lib/produtoServicoVinculo';
import type { ProdutoSegmento } from '@/hooks/useCategorias';
import { ButtonTooltip } from '@/components/ui/button-tooltip';

export interface ServicoNaLista {
  id: string;
  nome: string;
  /** Vinculado ao produto aberto. */
  vinculado: boolean;
  /** Gravando agora — a linha fica inerte. */
  salvando: boolean;
  /** Em quantos produtos este serviço é usado, no total. */
  usadoEm: number;
  clusterId: string | null;
  clusterNome: string | null;
}

const MODOS: { valor: FiltroVinculo; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'vinculados', rotulo: 'Só vinculados' },
  { valor: 'disponiveis', rotulo: 'Só os que faltam' },
];

interface Props {
  produto: ProdutoSegmento | null;
  /**
   * Os produtos que a coluna da esquerda lista. Abaixo de `lg` essa coluna não
   * existe, e é por este seletor que se troca de produto.
   */
  produtos: ProdutoSegmento[];
  onSelecionarProduto: (produtoId: string) => void;
  /**
   * Os serviços que o produto JÁ tem, na ordem do código. Primeiro bloco.
   *
   * Quem decide o bloco é o retrato dos vínculos de quando a lista se assentou,
   * e não a caixa marcada agora — o motivo está no `ProdutosServicosTab`. Daí a
   * linha deste bloco poder aparecer desmarcada, e a de baixo marcada.
   */
  vinculados: ServicoNaLista[];
  /** Os do cluster do produto que faltam vincular, na ordem do código. */
  faltam: ServicoNaLista[];
  /** Serviços de outros clusters (e os sem cluster), na mesma ordem. */
  outrosClusters: ServicoNaLista[];
  mostrarOutros: boolean;
  onMostrarOutros: (mostrar: boolean) => void;
  /** Ids na ordem em que a tela os mostra — base do shift+clique. */
  idsVisiveis: string[];
  resumo: { vinculados: number; total: number };
  filtro: { busca: string; modo: FiltroVinculo };
  onFiltroChange: (patch: Partial<{ busca: string; modo: FiltroVinculo }>) => void;
  marcados: Set<string>;
  onMarcar: (ids: string[], marcar: boolean) => void;
  onLimparMarcados: () => void;
  servicoAbertoId: string | null;
  onAbrirServico: (servico: ServicoNaLista) => void;
  onLote: (acao: 'vincular' | 'desvincular', servicos: ServicoNaLista[]) => void;
  /** Liga/desliga o vínculo de UM serviço, na hora. É o clique da caixa. */
  onAlternarVinculo: (servico: ServicoNaLista) => void;
  onNovo: () => void;
  /** Abre a cópia do conjunto de serviços de outro produto. */
  onCopiarDeOutro: () => void;
  /** Há produto de onde copiar? Sem nenhum, o botão não aparece. */
  podeCopiar: boolean;
  /** Abre o formulário do PRODUTO aberto — é o único lugar que edita o nome dele. */
  onEditarProduto: () => void;
  onExcluirProduto: () => void;
  /** Faixa de aviso logo abaixo do cabeçalho (produto sem vínculo nenhum). */
  aviso?: ReactNode;
  carregando: boolean;
}

/**
 * Coluna central: os serviços do produto aberto, em DOIS blocos corridos.
 *
 * Substituiu, em 27/08/2026, um agrupamento de dois níveis — cluster e, dentro
 * dele, "seção" — que a curadoria julgou mais difícil que a lista crua. O motivo
 * está no dado: não existe coluna de seção em `servicos_prestados`, então a seção
 * era o primeiro número recortado da string do nome, e o cabeçalho recolhível
 * dizia "Seção 1", "Seção 2". Número sem nome não orienta ninguém — e, com só a
 * primeira seção aberta, vincular cinco serviços custava abrir cinco sanfonas
 * sobre 113 itens, dos quais só os do cluster do produto interessavam.
 *
 * O que ficou no lugar:
 *
 * · UMA lista, ordenada pelo código que já vem no nome ("1.1", "1.2", "2.1"…).
 *   A ordem faz o trabalho que o agrupamento tentava fazer, sem esconder nada.
 *   Desde 16/09/2026 essa lista abre partida em DOIS blocos — "Vinculados" e
 *   "Faltam vincular" —, porque num produto de 5 serviços num cluster de 40 os
 *   cinco que interessam ficavam espalhados e só se achavam um a um. A ordem do
 *   código continua valendo DENTRO de cada bloco, e o corte não é ao vivo: ele
 *   se refaz no assentamento, para o clique na caixa não mover a linha.
 * · Por padrão só o CLUSTER DO PRODUTO. Os outros clusters ficam atrás de um
 *   botão no fim da lista — existem (há serviço sem cluster no catálogo), mas
 *   não é neles que se mexe.
 * · Vincular em bloco continua tendo dois caminhos: a busca ("6." traz o que era
 *   a seção 6) somada ao "Vincular todos os visíveis", e o shift+clique.
 *
 * DOIS GESTOS, DOIS SIGNIFICADOS, e é o que a caixa comunica:
 *
 * · a CAIXA é o vínculo. Um clique liga ou desliga na hora, com "Desfazer" no
 *   toast. Marcada = vinculado, e é por isso que ela leva o acento.
 * · SHIFT+clique no nome seleciona a faixa para ação em massa, com preenchimento
 *   NEUTRO. A barra em massa só aparece daí.
 *
 * As linhas são FAIXAS, não cartões: sem raio, sem borda em volta, separadas por
 * um fio. Quem manda na cor do estado é o `listRowStates`; a forma é local.
 */
export default function ServicosLista({
  produto, produtos, onSelecionarProduto,
  vinculados, faltam, outrosClusters, mostrarOutros, onMostrarOutros,
  idsVisiveis, resumo, filtro, onFiltroChange,
  marcados, onMarcar, onLimparMarcados, servicoAbertoId, onAbrirServico,
  onLote, onAlternarVinculo, onNovo, onCopiarDeOutro, podeCopiar,
  onEditarProduto, onExcluirProduto, aviso, carregando,
}: Props) {
  const [ancora, setAncora] = useState<string | null>(null);
  const [confirmarDesvincular, setConfirmarDesvincular] = useState(false);
  /** As duas ações que alcançam a lista inteira passam por confirmação. */
  const [acaoVisiveis, setAcaoVisiveis] = useState<'vincular' | 'desvincular' | null>(null);

  const marcadosNaTela = useMemo(
    () => idsVisiveis.filter((id) => marcados.has(id)),
    [idsVisiveis, marcados],
  );
  // "Visíveis" é literal: o que está na tela depois de busca, filtro e da
  // decisão de mostrar ou não os outros clusters.
  const visiveis = useMemo(
    () => [...vinculados, ...faltam, ...(mostrarOutros ? outrosClusters : [])],
    [vinculados, faltam, outrosClusters, mostrarOutros],
  );
  const porId = useMemo(() => new Map(visiveis.map((s) => [s.id, s])), [visiveis]);

  const selecionados = marcadosNaTela
    .map((id) => porId.get(id))
    .filter((s): s is ServicoNaLista => !!s);
  const paraVincular = selecionados.filter((s) => !s.vinculado);
  const paraDesvincular = selecionados.filter((s) => s.vinculado);

  const visiveisSemVinculo = visiveis.filter((s) => !s.vinculado);
  const visiveisComVinculo = visiveis.filter((s) => s.vinculado);

  /** Clique no nome: abre no painel. Com shift: seleciona a faixa, sem abrir. */
  const clicarNome = (servico: ServicoNaLista, comShift: boolean) => {
    if (!comShift) {
      setAncora(servico.id);
      onAbrirServico(servico);
      return;
    }
    onMarcar(faixaDeSelecao(idsVisiveis, ancora, servico.id), !marcados.has(servico.id));
    setAncora(servico.id);
  };

  if (!produto) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Escolha um produto à esquerda para ver e marcar os serviços dele.
        </p>
        <Button size="sm" variant="outline" onClick={onNovo}>
          <Plus className="mr-1 h-3.5 w-3.5" />Novo serviço
        </Button>
      </div>
    );
  }

  const nomesDoAviso = paraDesvincular.slice(0, 3).map((s) => dividirNomeServico(s.nome).nome);
  const restante = paraDesvincular.length - nomesDoAviso.length;

  /** A faixa de um serviço. Sai daqui duas vezes: cluster do produto e outros. */
  const linha = (servico: ServicoNaLista, comCluster: boolean, codigoAcima?: string | null) => {
    const aberto = servico.id === servicoAbertoId;
    const marcado = marcados.has(servico.id);
    const estado = {
      selecionado: marcado,
      vinculado: servico.vinculado,
      desabilitado: servico.salvando,
    };
    const { codigo, nome } = dividirNomeServico(servico.nome);
    return (
      <li key={servico.id}>
        <div
          className={cn(
            listRowClasses(estado),
            'items-center gap-2.5 rounded-none border-y-0 border-r-0 px-2 py-0 min-h-9',
            aberto && 'bg-muted/70',
          )}
        >
          {/* A CAIXA É O VÍNCULO. Um clique liga ou desliga na hora; o
              "Desfazer" vem no toast. */}
          <Checkbox
            checked={servico.vinculado}
            disabled={servico.salvando}
            aria-label={`${servico.vinculado ? 'Desvincular' : 'Vincular'} ${nome}`}
            onCheckedChange={() => onAlternarVinculo(servico)}
          />
          {/*
            O CÓDIGO SÓ APARECE QUANDO MUDA.

            Nos dois catálogos ele é o mesmo prefixo lido do nome, mas significa
            coisas diferentes (conferido em produção em 16/09/2026): na OSG os 40
            serviços têm 40 códigos distintos — o código É o serviço, e aqui nada
            muda, toda linha mostra o seu. No Tax os 82 se distribuem em 25
            prefixos, o "1.1" cobre 8 serviços e 14 nomes não têm prefixo nenhum:
            repetir "1.1" oito vezes, ou "—" quatorze, é uma coluna dizendo a
            mesma coisa linha após linha.

            Escondido, e não apagado: o espaço fica reservado (a largura é fixa),
            os nomes seguem alinhados e o código volta a aparecer na primeira
            linha do grupo seguinte — o que dá à lista a marcação de seção que as
            sanfonas de "Seção 1" tentaram dar, sem cabeçalho e sem nada para
            abrir. O `aria-label` da caixa nunca dependeu do código.
          */}
          <span className="w-[46px] shrink-0 truncate text-center font-mono text-[11px] text-muted-foreground">
            {codigo === codigoAcima ? '' : codigo || '—'}
          </span>
          <ButtonTooltip text="Clique para ver os detalhes · Shift+clique para selecionar a faixa">
            <button
            type="button"
            onClick={(evento) => clicarNome(servico, evento.shiftKey)}
            {...listRowAria({ vinculado: aberto })}
            className={cn(
              'min-w-0 flex-1 truncate py-2 text-left text-[13px]',
              listRowTitleClasses(estado),
              listRowFocusClasses(),
            )}
          >
            {nome}
          </button>
          </ButtonTooltip>
          {/* O selo do cluster só aparece FORA do cluster do produto: dentro
              dele seria a mesma palavra repetida em toda linha. */}
          {comCluster && (
            <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
              {servico.clusterNome || 'sem cluster'}
            </Badge>
          )}
          {/*
            Saíram daqui a palavra "vinculado" e o "usado em N produtos".

            O primeiro repetia o que a caixa marcada já diz, na mesma linha. O
            segundo é sobre o serviço no catálogo inteiro, não sobre este
            produto — informação de outra pergunta, repetida em todas as linhas
            da lista. Ele continua existindo, no painel do serviço, sob "Uso",
            onde é a pergunta que está sendo feita.
          */}
        </div>
      </li>
    );
  };

  const listaVazia = visiveis.length === 0;

  /**
   * O rótulo de um bloco. Aparece só quando os DOIS blocos têm linha: com um
   * bloco sozinho na tela — produto sem nenhum vínculo, filtro "Só vinculados",
   * busca que sobrou um item — ele nomeia o óbvio e gasta uma linha.
   *
   * Sem número: o retrato que decide o bloco não se refaz a cada clique, então
   * um "Vinculados (5)" ficaria brigando com a caixa que a pessoa acabou de
   * marcar. Os contadores ao vivo já estão em dois lugares — o "5 de 40" do
   * cabeçalho e o "x/y nesta lista" da faixa abaixo dele.
   */
  const comRotulos = vinculados.length > 0 && faltam.length > 0;

  /**
   * Um bloco de linhas. Cada uma recebe o código da linha ACIMA DELA para poder
   * esconder o próprio quando é o mesmo — e cada bloco começa do zero, porque a
   * primeira linha de um bloco não tem linha acima.
   */
  const blocoDeLinhas = (itens: ServicoNaLista[], comCluster: boolean) => (
    <ul className="divide-y">
      {itens.map((servico, i) => linha(
        servico,
        comCluster,
        i === 0 ? undefined : dividirNomeServico(itens[i - 1].nome).codigo,
      ))}
    </ul>
  );
  const rotuloDeBloco = (texto: string, extra?: string) => (
    <p
      className={cn(
        'px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground',
        extra,
      )}
    >
      {texto}
    </p>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Cabeçalho fixo do produto aberto */}
      <div className="shrink-0 space-y-2 border-b bg-muted/40 px-4 py-2.5">
        {/*
          Abaixo de `lg` a coluna de produtos não está na tela, então o nome do
          produto aberto deixa de ser um rótulo e vira o CONTROLE que troca de
          produto. Acima de `lg` a coluna já faz esse trabalho, e aqui o nome
          volta a ser só o título do que está aberto.
        */}
        <Select value={produto.id} onValueChange={onSelecionarProduto}>
          <SelectTrigger className="h-8 w-full text-sm lg:hidden" aria-label="Produto aberto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {produtos.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-sm">
                <span className="font-mono text-[11px] text-muted-foreground">{p.codigo || '—'}</span>
                {' '}{p.nome || '(sem nome)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="hidden font-mono text-xs text-muted-foreground lg:inline">{produto.codigo || '—'}</span>
          <span className="hidden text-sm font-semibold text-foreground lg:inline">{produto.nome || '(sem nome)'}</span>
          {produto.estrutura_clusters?.name && (
            <Badge variant="outline" className="hidden text-[10px] font-normal lg:inline-flex">
              {produto.estrutura_clusters.name}
            </Badge>
          )}
          {/* O lápis do PRODUTO mora ao lado do nome do produto, e o do SERVIÇO
              no rodapé do painel. Só o ícone: o rótulo por extenso disputava a
              linha com o nome do produto, e a barra de baixo já estava cheia. O
              que diz de qual cadastro ele é continua sendo a POSIÇÃO — encostado
              no nome do produto — mais o rótulo acessível. */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground"
            onClick={onEditarProduto}
            title="Editar produto"
            aria-label="Editar produto"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
            onClick={onExcluirProduto}
            title="Excluir produto"
            aria-label="Excluir produto"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          <span className="ml-auto text-xs text-muted-foreground">
            <strong className="font-semibold text-primary">{resumo.vinculados}</strong>
            {' '}de {resumo.total} serviços vinculados
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[110px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filtro.busca}
              onChange={(e) => onFiltroChange({ busca: e.target.value })}
              placeholder="Buscar serviço..."
              aria-label="Buscar serviço"
              className="h-8 bg-background pl-8 text-sm"
            />
          </div>

          {/*
            Três modos num seletor, e não em três botões lado a lado. O grupo de
            botões custava ~210px de uma barra que já não cabia — a busca chegava
            a "Buscar servi" — para oferecer duas opções que quase nunca são
            usadas. Nenhuma saiu: o que mudou é que agora elas custam o tamanho
            de uma, e a busca fica com a largura que sobra.
          */}
          <Select
            value={filtro.modo}
            onValueChange={(valor) => onFiltroChange({ modo: valor as FiltroVinculo })}
          >
            <SelectTrigger className="h-8 w-[124px] shrink-0 text-xs" aria-label="Filtrar serviços">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODOS.map((modo) => (
                <SelectItem key={modo.valor} value={modo.valor} className="text-xs">
                  {modo.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/*
            Cabe aqui porque o dropdown de ações em massa e os dois botões de
            filtro saíram desta barra. Fica ao lado do "Novo serviço" de
            propósito: são os dois jeitos de encher um produto — um serviço por
            vez, ou o conjunto de um produto parecido.
          */}
          {podeCopiar && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0 text-xs"
              onClick={onCopiarDeOutro}
            >
              <Copy className="mr-1 h-3 w-3" />Copiar de outro produto
            </Button>
          )}

          <Button size="sm" variant="outline" className="h-8 shrink-0 text-xs" onClick={onNovo}>
            <Plus className="mr-1 h-3 w-3" />Novo serviço
          </Button>
        </div>
      </div>

      {aviso && <div className="shrink-0 px-4 pt-2">{aviso}</div>}

      {/* Barra de ação em massa — o mesmo componente das tarefas. */}
      {marcadosNaTela.length > 0 && (
        <div className="shrink-0 px-4 pt-2">
          <BulkActionBar
            count={marcadosNaTela.length}
            label={(n) => `${n} ${n === 1 ? 'serviço selecionado' : 'serviços selecionados'}`}
            onClear={onLimparMarcados}
            actions={[
              {
                label: 'Vincular',
                icon: <Link2 className="h-3.5 w-3.5" />,
                disabled: paraVincular.length === 0,
                onClick: () => onLote('vincular', paraVincular),
              },
              {
                label: 'Desvincular',
                icon: <Unlink className="h-3.5 w-3.5" />,
                variant: 'destructive',
                disabled: paraDesvincular.length === 0,
                onClick: () => setConfirmarDesvincular(true),
              },
            ]}
          />
        </div>
      )}

      {/*
        A caixa de marcar TODOS os visíveis, alinhada com as caixas das linhas.

        Substitui o menu "Ações em massa", que era um dropdown de duas opções
        — vincular e desvincular os visíveis — ocupando o dobro da largura e
        escondendo atrás de um clique o gesto que toda lista com caixas já tem
        na primeira linha. As duas ações continuam aqui: qual das duas a caixa
        faz depende do que está na tela, e é o rótulo ao lado que diz qual é.
      */}
      {!carregando && visiveis.length > 0 && (
        <div className="flex shrink-0 items-center gap-2.5 border-b bg-muted/30 px-4 py-1.5">
          <Checkbox
            checked={visiveisSemVinculo.length === 0}
            aria-label={visiveisSemVinculo.length > 0
              ? `Vincular os ${visiveisSemVinculo.length} serviços visíveis que faltam`
              : `Desvincular os ${visiveisComVinculo.length} serviços visíveis`}
            onCheckedChange={() => setAcaoVisiveis(
              visiveisSemVinculo.length > 0 ? 'vincular' : 'desvincular',
            )}
          />
          <button
            type="button"
            className="text-left text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => setAcaoVisiveis(
              visiveisSemVinculo.length > 0 ? 'vincular' : 'desvincular',
            )}
          >
            {visiveisSemVinculo.length > 0
              ? `Vincular ${visiveisSemVinculo.length === 1
                  ? 'o serviço que falta' : `os ${visiveisSemVinculo.length} que faltam`}`
              : `Desvincular ${visiveisComVinculo.length === 1
                  ? 'o serviço visível' : `os ${visiveisComVinculo.length} visíveis`}`}
          </button>
          <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {visiveisComVinculo.length}/{visiveis.length} nesta lista
          </span>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        {carregando ? (
          <div className="space-y-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : listaVazia ? (
          <p className="py-10 text-center text-sm italic text-muted-foreground">
            {filtro.busca
              ? 'Nenhum serviço encontrado com esse texto.'
              : filtro.modo === 'vinculados'
                ? 'Este produto ainda não tem serviços vinculados.'
                : 'Nenhum serviço cadastrado neste cluster.'}
          </p>
        ) : (
          <>
            {/* O que o produto JÁ tem, no topo: é a pergunta com que se entra na
                tela, e num cluster de 40 serviços ela não se responde varrendo
                a lista atrás de caixa marcada. */}
            {vinculados.length > 0 && (
              <>
                {comRotulos && rotuloDeBloco('Vinculados')}
                {blocoDeLinhas(vinculados, false)}
              </>
            )}
            {faltam.length > 0 && (
              <>
                {comRotulos && rotuloDeBloco('Faltam vincular', 'mt-2 border-t pt-2')}
                {blocoDeLinhas(faltam, false)}
              </>
            )}
          </>
        )}

        {/*
          Os outros clusters ficam FECHADOS por padrão. Um produto Tax não tem o
          que fazer com os serviços da OSG, e eram eles que faziam a lista passar
          de 72 para 113 itens. Fechados, e não removidos: existe serviço sem
          cluster no catálogo, e ele não pode ficar inalcançável.
        */}
        {!carregando && outrosClusters.length > 0 && (
          <div className="mt-2 border-t pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full justify-start text-xs text-muted-foreground"
              onClick={() => onMostrarOutros(!mostrarOutros)}
              aria-expanded={mostrarOutros}
            >
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              {mostrarOutros
                ? `Ocultar os ${outrosClusters.length} serviços de outros clusters`
                : `Ver ${outrosClusters.length} ${outrosClusters.length === 1 ? 'serviço' : 'serviços'} de outros clusters`}
            </Button>
            {mostrarOutros && blocoDeLinhas(outrosClusters, true)}
          </div>
        )}
      </div>

      {/*
        A confirmação das ações em massa veio inteira do `AcoesEmMassaMenu`, que
        deixou de existir. As DUAS confirmam, e não só a que desvincula: são as
        ações mais abrangentes da tela — mudam o que nasce em todo projeto novo
        do produto — e "visíveis" é literal, busca e filtro contam.
      */}
      <AlertDialog open={acaoVisiveis !== null} onOpenChange={(a) => !a && setAcaoVisiveis(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {acaoVisiveis === 'vincular'
                ? `Vincular ${visiveisSemVinculo.length} ${visiveisSemVinculo.length === 1 ? 'serviço' : 'serviços'}?`
                : `Desvincular ${visiveisComVinculo.length} ${visiveisComVinculo.length === 1 ? 'serviço' : 'serviços'}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {acaoVisiveis === 'vincular'
                ? `Todos os serviços visíveis passam a valer para projetos de "${produto.codigo} — ${produto.nome}".`
                : `Os serviços visíveis deixam de estar disponíveis para projetos de "${produto.codigo} — ${produto.nome}".`}
              {' '}A ação vale só para o que está na tela agora — busca e filtro contam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={acaoVisiveis === 'desvincular'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined}
              onClick={() => {
                if (acaoVisiveis === 'vincular') onLote('vincular', visiveisSemVinculo);
                else onLote('desvincular', visiveisComVinculo);
                setAcaoVisiveis(null);
              }}
            >
              {acaoVisiveis === 'vincular' ? 'Vincular' : 'Desvincular'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmarDesvincular} onOpenChange={setConfirmarDesvincular}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Desvincular {paraDesvincular.length} {paraDesvincular.length === 1 ? 'serviço' : 'serviços'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deixam de estar disponíveis para projetos de{' '}
              <strong>{produto.codigo} — {produto.nome}</strong>:{' '}
              {nomesDoAviso.join(', ')}
              {restante > 0 && ` e outros ${restante} serviço${restante === 1 ? '' : 's'}`}.
              {' '}Você pode vinculá-los de novo depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onLote('desvincular', paraDesvincular)}
            >
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
