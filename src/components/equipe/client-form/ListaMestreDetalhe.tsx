// Casca de lista mestre e detalhe.
//
// Nasceu para o cadastro de cliente e hoje serve DOIS contextos: as três abas do
// cadastro (dentro de modal) e a bancada Produtos & Serviços (página inteira). É
// o que a prop `moldura` distingue.
//
// O nome do arquivo e a pasta (`client-form/`) ficaram do primeiro contexto e
// mentem sobre o alcance. Mover para um lugar neutro é a arrumação certa, mas
// pertence a uma mudança própria — não à que estreia a segunda tela.
//
// Substitui a sanfona: a lista fica fixa à esquerda, com uma linha de resumo por
// item, e o detalhe ocupa a direita. Escolher na lista troca o detalhe; a edição
// continua sendo ato deliberado, pelo lápis que vive na faixa de ações.
//
// Duas áreas de rolagem INDEPENDENTES, e isso não é detalhe: com uma barra só,
// rolar um formulário comprido empurraria a lista para fora da tela e mataria o
// motivo de ela ser fixa.
//
// O componente não sabe o que é OS, contribuinte ou representante. Recebe as
// linhas já resumidas e o conteúdo do detalhe, e é por isso que as três abas
// podem usar a mesma casca sem repetir a lógica de novo — foi a duplicação
// dessa lógica que fez o mesmo defeito de navegação existir nas três.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useAcentoArea } from './acentoArea';

/**
 * `Id` é genérico com padrão `number` porque as abas de cliente identificam a
 * linha pelo `_id` local (numérico) e a bancada Produtos & Serviços pelo uuid do
 * banco. O padrão mantém os três consumidores originais compilando sem escrever
 * o tipo.
 */
export interface LinhaLista<Id extends string | number = number> {
  id: Id;
  /** Primeira linha do resumo: o que identifica o item de relance. */
  titulo: ReactNode;
  /** Segunda linha, opcional: documento, cargo, produtos. */
  subtitulo?: ReactNode;
  /** Canto direito: etiqueta curta (PF/PJ, valor). */
  etiqueta?: ReactNode;
  /** Marca de alteração não salva, calculada por `idsAlterados`. */
  alterado?: boolean;
  /**
   * Há campo obrigatório em falta neste item. Vence o âmbar de "alterado": os
   * dois pontos lado a lado numa lista de 228px viram ruído, e entre "mexido" e
   * "falta preencher" quem precisa de atenção primeiro é a falta.
   */
  pendente?: boolean;
}

export interface ListaMestreDetalheProps<Id extends string | number = number> {
  /** Cabeçalho da seção, com a contagem. Ex.: "OS - Ordem de Serviço (3)". */
  titulo: string;
  /** Botão de criar, quando o escopo permite. */
  acaoCriar?: ReactNode;
  /**
   * `NoInfer` aqui e em `onSelecionar`/`renderLinha` não é firula: sem ele, o
   * array de literais passado inline é contextualmente tipado por
   * `LinhaLista<Id>` e a inferência entra em círculo — `Id` cai na constraint
   * `string | number` e os três consumidores param de compilar, porque um
   * `Dispatch<SetStateAction<number>>` não aceita `string`. Fixando a inferência
   * em `selecionadoId`, `Id` sai `number` para eles e `string` para a bancada.
   */
  linhas: LinhaLista<NoInfer<Id>>[];
  selecionadoId: Id | null;
  onSelecionar: (id: NoInfer<Id>) => void;
  /**
   * Largura da coluna da lista, como classe. O padrão é o das abas de cliente.
   */
  larguraLista?: string;
  /**
   * Substitui a linha INTEIRA — inclusive o botão. Quem passa isto assume a
   * seleção, o foco e o `aria-current`, e ganha em troca liberdade de layout.
   *
   * Existe porque a linha padrão é uma faixa de uma altura: o título trunca em
   * `whitespace-nowrap` e divide o espaço com o ponto de pendência. A bancada
   * Produtos & Serviços precisa de três blocos empilhados ocupando a largura
   * toda, com o nome quebrando em duas linhas antes de truncar — não dá para
   * chegar lá por parâmetro, só trocando o markup.
   *
   * Sem esta prop, nada muda: as três abas de cliente seguem na linha padrão.
   *
   * EFEITO COLATERAL, e ele é deliberado: passar `renderLinha` também remove o
   * `divide-y` da lista. Linha custom desenha o próprio separador — a de
   * Produtos & Serviços é um cartão empilhado, e o fio da casca cortaria dentro
   * dele. Está escrito aqui porque comportamento implícito em prop de render é
   * como se descobre bug três meses depois.
   */
  renderLinha?: (args: {
    linha: LinhaLista<NoInfer<Id>>;
    selecionada: boolean;
    selecionar: () => void;
  }) => ReactNode;
  /**
   * Filtros que pertencem à lista (busca, chips), fixos no topo da coluna
   * enquanto ela rola. Fora daqui eles teriam de subir para cima do painel
   * inteiro, onde pareceriam filtrar também o detalhe.
   */
  cabecalhoLista?: ReactNode;
  /**
   * Onde esta casca está montada.
   *
   * `'modal'` (padrão) é para o que ela sempre foi: dentro do cadastro de
   * cliente, com teto de 62vh e o detalhe já embrulhado em padding, rolagem e
   * animação de troca.
   *
   * `'pagina'` tira o teto e entrega o slot do detalhe CRU, sem padding nem
   * rolagem. Uma bancada de página inteira monta colunas próprias ali dentro, e
   * cada uma quer a própria barra de rolagem — embrulhar tudo numa só produz
   * rolagem aninhada, que é pior que nenhuma.
   */
  moldura?: 'modal' | 'pagina';
  /** Texto de lista vazia. */
  vazio: ReactNode;
  /** Título do item aberto, no topo do detalhe. */
  cabecalhoDetalhe?: ReactNode;
  /** Lápis e lixeira do item aberto. */
  acoesDetalhe?: ReactNode;
  /**
   * O que, ao mudar, deve reanimar o painel. Por padrão é a troca de item;
   * quem também alterna leitura e edição passa os dois juntos, para a transição
   * de modo ganhar a mesma passagem.
   */
  chaveDetalhe?: string | number | null;
  /** O formulário ou a leitura do item selecionado. */
  children: ReactNode;
}

export default function ListaMestreDetalhe<Id extends string | number = number>({
  titulo,
  acaoCriar,
  linhas,
  selecionadoId,
  onSelecionar,
  larguraLista = 'w-[228px]',
  renderLinha,
  cabecalhoLista,
  moldura = 'modal',
  vazio,
  cabecalhoDetalhe,
  acoesDetalhe,
  chaveDetalhe,
  children,
}: ListaMestreDetalheProps<Id>) {
  const acento = useAcentoArea();
  return (
    <section
      className={cn(
        'bg-card rounded-xl border shadow-sm overflow-hidden',
        // Em pagina a casca precisa VIRAR item flex do pai e distribuir a altura
        // que recebe. Sem isto o `flex-1` da linha de baixo nao tem contra o que
        // crescer, a altura vira a do conteudo da lista (19 produtos = ~1500px)
        // e as colunas do detalhe caem centradas fora da tela — foi exatamente
        // como a bancada Produtos & Servicos apareceu vazia a direita.
        moldura === 'pagina' && 'flex min-h-0 flex-1 flex-col',
      )}
    >
      <div className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between gap-3">
        <h3 className="min-w-0 truncate text-sm font-bold text-foreground">{titulo}</h3>
        {acaoCriar && <div className="shrink-0">{acaoCriar}</div>}
      </div>

      {linhas.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground italic">{vazio}</p>
      ) : (
        // Altura mínima para o painel não pular a cada item selecionado, e teto
        // para o formulário longo rolar em vez de esticar o modal. Sem o teto o
        // conteúdo curto deixava um vazio enorme embaixo.
        //
        // `overflow-hidden` aqui não é enfeite: sem ele um valor comprido no
        // detalhe empurra a linha inteira e corta os botões do cabeçalho.
        <div className={cn(
          'flex overflow-hidden',
          // `min-h-0` e `min-h-[300px]` na mesma classe seriam duas regras de
          // igual peso e a ordem no bundle decidiria — por isso cada moldura
          // traz o seu, e nunca os dois.
          moldura === 'modal' ? 'min-h-[300px] max-h-[62vh]' : 'min-h-0 flex-1',
        )}>
          <nav
            aria-label={titulo}
            className={cn('min-w-0 shrink-0 border-r overflow-y-auto', larguraLista)}
          >
            {cabecalhoLista && (
              <div className="sticky top-0 z-10 border-b bg-card px-2.5 py-2">{cabecalhoLista}</div>
            )}
            <ul className={cn(!renderLinha && 'divide-y')}>
              {linhas.map((linha) => {
                const selecionada = linha.id === selecionadoId;
                if (renderLinha) {
                  return (
                    <li key={linha.id}>
                      {renderLinha({
                        linha,
                        selecionada,
                        selecionar: () => onSelecionar(linha.id),
                      })}
                    </li>
                  );
                }
                return (
                  <li key={linha.id}>
                    <button
                      type="button"
                      aria-current={selecionada ? 'true' : undefined}
                      onClick={() => onSelecionar(linha.id)}
                      className={cn(
                        'w-full px-3 py-2.5 text-left transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        'border-l-2',
                        selecionada ? acento.selecionado : 'border-l-transparent hover:bg-muted/60',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn('min-w-0 flex-1 truncate text-sm', selecionada ? 'font-bold text-foreground' : 'font-medium text-foreground')}>
                          {linha.titulo}
                        </span>
                        {linha.pendente ? (
                          <span
                            title="Campos obrigatórios em falta neste item"
                            aria-label="Campos obrigatórios em falta neste item"
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-destructive"
                          />
                        ) : linha.alterado ? (
                          <span
                            title="Alterações não salvas neste item"
                            aria-label="Alterações não salvas neste item"
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-warning"
                          />
                        ) : null}
                      </div>
                      {linha.subtitulo && (
                        <div className="truncate text-xs text-muted-foreground">{linha.subtitulo}</div>
                      )}
                      {linha.etiqueta && <div className="mt-1">{linha.etiqueta}</div>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {(cabecalhoDetalhe || acoesDetalhe) && (
              <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2">
                <div className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{cabecalhoDetalhe}</div>
                <div className="flex shrink-0 items-center gap-1.5">{acoesDetalhe}</div>
              </div>
            )}
            {/*
              `overflow-x-hidden` é a trava final: mesmo que um conteúdo novo
              esqueça de encolher, ele é cortado aqui em vez de alargar o painel
              e empurrar os botões do cabeçalho para fora da tela.
            */}
            {moldura === 'pagina' ? (
              // Slot cru: quem monta colunas aqui dentro cuida da própria
              // rolagem. Sem `key` também — remontar a árvore a cada troca de
              // item jogaria fora o estado das colunas (sanfona, seleção).
              <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>
            ) : (
              <div
                // A chave remonta o painel na troca de item ou de modo, e é ela que
                // dispara a passagem. O prefixo motion-safe respeita quem pediu ao
                // sistema para reduzir animação.
                key={chaveDetalhe ?? selecionadoId ?? "vazio"}
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-1 motion-safe:duration-200"
              >
                {children}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
