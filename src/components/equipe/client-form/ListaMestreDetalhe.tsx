// Casca da lista mestre e detalhe do cadastro de cliente.
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

export interface LinhaLista {
  id: number;
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

export interface ListaMestreDetalheProps {
  /** Cabeçalho da seção, com a contagem. Ex.: "OS - Ordem de Serviço (3)". */
  titulo: string;
  /** Botão de criar, quando o escopo permite. */
  acaoCriar?: ReactNode;
  linhas: LinhaLista[];
  selecionadoId: number | null;
  onSelecionar: (id: number) => void;
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

export default function ListaMestreDetalhe({
  titulo,
  acaoCriar,
  linhas,
  selecionadoId,
  onSelecionar,
  vazio,
  cabecalhoDetalhe,
  acoesDetalhe,
  chaveDetalhe,
  children,
}: ListaMestreDetalheProps) {
  const acento = useAcentoArea();
  return (
    <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
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
        <div className="flex min-h-[300px] max-h-[62vh] overflow-hidden">
          <nav
            aria-label={titulo}
            className="w-[228px] min-w-0 shrink-0 border-r overflow-y-auto"
          >
            <ul className="divide-y">
              {linhas.map((linha) => {
                const selecionada = linha.id === selecionadoId;
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
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500"
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
            <div
              // A chave remonta o painel na troca de item ou de modo, e é ela que
              // dispara a passagem. O prefixo motion-safe respeita quem pediu ao
              // sistema para reduzir animação.
              key={chaveDetalhe ?? selecionadoId ?? "vazio"}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-1 motion-safe:duration-200"
            >
              {children}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
