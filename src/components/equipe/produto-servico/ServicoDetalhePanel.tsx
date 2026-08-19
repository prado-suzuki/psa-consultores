import { Link2, MousePointerClick, PanelRightClose, Pencil, Plus, Trash2, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { dividirNomeServico } from '@/lib/produtoServicoSecoes';
import type { ServicoNaLista } from './ServicosSecaoLista';

export interface ProdutoVinculado {
  id: string;
  codigo: string | null;
  nome: string | null;
}

interface Props {
  servico: ServicoNaLista | null;
  /** Nome do cluster padrão do serviço, quando tem. */
  cluster: string | null;
  /** Produtos aos quais este serviço já está vinculado. */
  vinculados: ProdutoVinculado[];
  /** Produtos aos quais ele ainda NÃO está — alimenta o vínculo reverso. */
  disponiveis: ProdutoVinculado[];
  onDesvincular: (produto: ProdutoVinculado) => void;
  onVincular: (produtoId: string) => void;
  onEditar: () => void;
  onExcluir: () => void;
  onFechar: () => void;
  carregando: boolean;
}

/**
 * Painel direito: o serviço aberto, e sobretudo em QUE produtos ele vive.
 *
 * O que este painel mostra é o que o banco tem. `servicos_prestados` são três
 * colunas — `id`, `nome`, `cluster_id` —, então não há descrição, status,
 * complexidade nem horas estimadas para exibir. Eles ficam de fora INTEIROS, em
 * vez de aparecerem como rótulo seguido de travessão: campo vazio na tela ensina
 * a pessoa a procurar um dado que não existe, e sugere que alguém esqueceu de
 * preencher.
 *
 * O miolo é a lista de vinculações, e ela é o caminho reverso da tela: da
 * esquerda para a direita liga-se um produto a vários serviços; aqui liga-se um
 * serviço a vários produtos, sem trocar de produto aberto.
 */
export default function ServicoDetalhePanel({
  servico, cluster, vinculados, disponiveis, onDesvincular, onVincular,
  onEditar, onExcluir, onFechar, carregando,
}: Props) {
  if (carregando) {
    return (
      <aside className="w-[320px] shrink-0 space-y-3 border-l p-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </aside>
    );
  }

  if (!servico) {
    // Vazio ANCORADO: o painel ocupa quase um terço da largura, e um parágrafo
    // solto encostado na borda lê como área em branco por engano, não como
    // "falta escolher". Ícone e texto centrados dizem que o espaço é de alguém.
    return (
      <aside className="flex w-[320px] shrink-0 flex-col items-center justify-center gap-3 border-l p-6 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-muted" aria-hidden>
          <MousePointerClick className="h-5 w-5 text-muted-foreground" />
        </span>
        <p className="text-sm font-medium text-foreground">
          Selecione um serviço para ver os detalhes
        </p>
        <p className="max-w-[220px] text-xs leading-relaxed text-muted-foreground">
          Clique no nome de um serviço na lista ao lado para ver o cluster dele e
          em quais produtos ele já é usado.
        </p>
      </aside>
    );
  }

  const { codigo, nome } = dividirNomeServico(servico.nome);

  return (
    <aside className="flex w-[320px] shrink-0 flex-col overflow-hidden border-l">
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
        <span className="font-mono text-[11px] text-muted-foreground">{codigo || 'sem código'}</span>
        {servico.vinculado && (
          <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
            vinculado
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-7 w-7 text-muted-foreground"
          onClick={onFechar}
          aria-label="Fechar painel de detalhes"
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {/* O nome é o elemento mais forte do painel e quebra à vontade. */}
        <h3 className="text-[18px] font-semibold leading-snug text-foreground">{nome}</h3>

        {/* Metadados EMPILHADOS: rótulo em cima, valor embaixo. Lado a lado, o
            valor era cortado — nome de cluster é longo e a coluna tem 320px. */}
        <dl className="space-y-3">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cluster padrão
            </dt>
            <dd className="mt-0.5 text-sm text-foreground">{cluster || 'sem cluster'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Uso
            </dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {servico.usadoEm} {servico.usadoEm === 1 ? 'produto' : 'produtos'}
            </dd>
          </div>
        </dl>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Vinculações
          </p>
          {vinculados.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">
              Este serviço ainda não está em nenhum produto.
            </p>
          ) : (
            <ul className="space-y-1">
              {vinculados.map((produto) => (
                <li
                  key={produto.id}
                  className="group flex items-center gap-2 rounded-md border px-2 py-1.5"
                >
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  <span className="w-[52px] shrink-0 truncate font-mono text-[11px] text-muted-foreground">
                    {produto.codigo || '—'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                    {produto.nome || '(sem nome)'}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Desvincular de ${produto.codigo || produto.nome}`}
                    onClick={() => onDesvincular(produto)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {disponiveis.length > 0 && (
            <div className="mt-2">
              <Select value="" onValueChange={onVincular}>
                <SelectTrigger className="h-8 text-xs" aria-label="Vincular a outro produto">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Plus className="h-3.5 w-3.5" />
                    <SelectValue placeholder="Vincular a outro produto" />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {disponiveis.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {produto.codigo || '—'}
                      </span>
                      {' '}{produto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/*
        Editar e excluir vivem AQUI, e não na linha da lista. A linha tem 36px e
        já carrega caixa, código, nome e o contador de uso; dois botões de ícone
        a mais só apareceriam no hover, que é onde a tela antiga os escondia. No
        painel eles ficam visíveis, ao lado do serviço a que se referem.
      */}
      <div className="flex shrink-0 items-center gap-2 border-t px-4 py-2">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onEditar}>
          <Pencil className="mr-1 h-3 w-3" />Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={onExcluir}
        >
          <Trash2 className="mr-1 h-3 w-3" />Excluir
        </Button>
      </div>
    </aside>
  );
}
