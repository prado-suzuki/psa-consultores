import { Link2, Pencil, Plus, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { dividirNomeServico } from '@/lib/produtoServicoNomes';
import type { ServicoNaLista } from './ServicosLista';

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
  carregando: boolean;
}

/**
 * O serviço aberto, e sobretudo em QUE produtos ele vive.
 *
 * Passou por três formatos, e o tamanho é o assunto dos três:
 *
 * · coluna fixa de 320px, até 14/09/2026. Era o terço direito da tela dizendo
 *   "Selecione um serviço" na maior parte do tempo, enquanto a lista — onde o
 *   trabalho acontece — ficava com o que sobrava.
 * · painel lateral de altura inteira (`Sheet`), até 16/09/2026. Resolveu o vazio
 *   permanente, mas trocou-o por 384px × a altura da janela para mostrar um nome,
 *   um cluster, um número e uma lista que em produção tem NO MÁXIMO 3 linhas
 *   (média 1,1 produto por serviço). Exagerado para tão pouca informação.
 * · diálogo do tamanho do conteúdo, agora: `sm:max-w-md`, altura automática.
 *
 * O que saiu no caminho, e não foi de leve: o nome repetido em `h3` além do
 * título, o selo "vinculado" — a lista de produtos abaixo já contém o produto
 * aberto, que é a mesma informação dita por extenso — e o `<dl>` de metadados
 * empilhados. Código, cluster e uso viram UMA linha de contexto sob o título.
 *
 * O que este painel mostra continua sendo o que o banco tem.
 * `servicos_prestados` são três colunas — `id`, `nome`, `cluster_id` —, então não
 * há descrição, status, complexidade nem horas estimadas para exibir. Eles ficam
 * de fora INTEIROS, em vez de aparecerem como rótulo seguido de travessão: campo
 * vazio na tela ensina a pessoa a procurar um dado que não existe, e sugere que
 * alguém esqueceu de preencher.
 *
 * O miolo é a lista de vinculações, e ela é o caminho reverso da tela: da
 * esquerda para a direita liga-se um produto a vários serviços; aqui liga-se um
 * serviço a vários produtos, sem trocar de produto aberto.
 *
 * Ele renderiza o cabeçalho do diálogo (o `DialogTitle` é obrigação de
 * acessibilidade do Radix, e o título é o nome do serviço), mas não o `Dialog`:
 * quem abre e fecha é `ProdutosServicosTab`.
 */
export default function ServicoDetalhePanel({
  servico, cluster, vinculados, disponiveis, onDesvincular, onVincular,
  onEditar, onExcluir, carregando,
}: Props) {
  // O vazio e o "selecione um serviço" saíram com a coluna fixa: sem serviço
  // aberto este painel simplesmente não existe na tela. O título continua aqui
  // porque um diálogo sem `DialogTitle` estoura o aviso do Radix.
  if (carregando || !servico) {
    return (
      <>
        <DialogHeader className="sr-only">
          <DialogTitle>Serviço</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-9 w-full" />
        </div>
      </>
    );
  }

  const { codigo, nome } = dividirNomeServico(servico.nome);
  /* Código, cluster e uso numa linha só. Empilhados em `<dl>` eles ocupavam três
     blocos de rótulo maiúsculo para caber em meia linha de texto. */
  const contexto = [
    codigo,
    cluster || 'sem cluster',
    `usado em ${servico.usadoEm} ${servico.usadoEm === 1 ? 'produto' : 'produtos'}`,
  ].filter(Boolean).join(' · ');

  return (
    <>
      {/* `pr-8`: o X de fechar do `DialogContent` fica em `right-4 top-4`, e
          nome de serviço chega a 77 caracteres — sem a folga ele passa por baixo. */}
      <DialogHeader>
        <DialogTitle className="pr-8 text-base leading-snug">{nome}</DialogTitle>
        <DialogDescription className="text-xs">{contexto}</DialogDescription>
      </DialogHeader>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Em que produtos
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
                className="flex items-center gap-2 rounded-md border px-2 py-1.5"
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

      {/*
        Editar e excluir vivem AQUI, e não na linha da lista. A linha é uma faixa
        de uma altura, com caixa, código e nome; dois botões de ícone a mais só
        apareceriam no hover, que é onde a tela antiga os escondia. Neste painel
        eles ficam visíveis, ao lado do serviço a que se referem.

        Não é `DialogFooter`: o padrão dele empilha invertido no estreito e
        empurra tudo para a direita, e aqui as duas ações não são "confirmar e
        cancelar" — são duas ações sobre o mesmo cadastro, e a destrutiva fica na
        ponta oposta da que se usa todo dia.
      */}
      <div className="flex items-center justify-between gap-2 border-t pt-3">
        {/* "Editar serviço", e nao "Editar": a tela tem dois cadastros abertos
            ao mesmo tempo — o produto na coluna do meio e o servico aqui — e o
            rotulo curto nao dizia qual dos dois este botao muda. */}
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onEditar}>
          <Pencil className="mr-1 h-3 w-3" />Editar serviço
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
    </>
  );
}
