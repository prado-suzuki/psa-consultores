import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  InternaNotificationItem,
  LinhaDoSino,
  MencaoNotificationItem,
  ReviewNotificationItem,
  TicketNotificationItem,
} from '@/components/notifications/ItensDoSino';
import { useTicketNotifications, type TicketNotification } from '@/hooks/useTicketNotifications';
import {
  useReviewTaskNotifications,
  type ReviewTaskNotification,
} from '@/hooks/useReviewTaskNotifications';
import { useNotificacoesMencao, type MencaoNotificacao } from '@/hooks/useNotificacoesMencao';
import { useNotificacoesInternas, type NotificacaoInterna } from '@/hooks/useNotificacoesInternas';
import { useSinoVisto } from '@/hooks/useSinoVisto';
import { hrefDeOrigem, type AreaDeProjetos } from '@/lib/feedComentarios';
import { destinoDoAviso } from '@/lib/notificacoesInternas';
import {
  VISIVEIS_ANTES_DE_EXPANDIR,
  aconteceuDepois,
  ordenarItensDoSino,
  type ItemDoSino,
} from '@/lib/sinoNotificacoes';
import { AreaLoader } from '@/components/equipe/AreaLoader';
import { cn } from '@/lib/utils';

interface NotificationPopoverProps {
  /**
   * Base a partir da qual se monta a rota do DETALHE de um chamado.
   *
   * Chamava-se `navigateTo` enquanto o rodapé tinha o botão "Ver todos os
   * chamados"; o botão saiu em 14/09/2026 (o rodapé agora abre o resto da própria
   * lista) e ninguém mais navega para cá — `handleTicketClick` faz
   * `baseDosChamados.replace('/chamados','')` e acrescenta `/chamados/<id>`.
   *
   * O nome novo não é cosmético: a varredura de `areaTheme.test.ts` cobra a chave
   * de espelho de toda linha `navigateTo=` que aponta para rota espelhável, e
   * cobrava certo enquanto isto navegava para a LISTA. O DETALHE de um chamado
   * não espelha por decisão antiga (não tem escopo para filtrar, logo não pode
   * ter cor de escopo — ver `ROTAS_ESPELHADAS` em `src/lib/areaTheme.ts`), e a
   * prop `espelho` saiu junto com o botão que a usava.
   */
  baseDosChamados: string;
  /** Origem, para que o botão "Voltar" da lista de chamados retorne à área correta. */
  backTo?: string;
  /**
   * Rota da tela de tarefas para onde as notificações de revisão navegam
   * (com ?taskId=<id>). O deep-link abre o modal ignorando filtros/escopo.
   */
  tasksNavigateTo?: string;
  /**
   * Moldura em que a menção abre a tarefa/projeto de origem. Só define a base do
   * link — o deep-link ignora filtros e escopo, e a RLS é o único limite, então
   * uma menção da outra área abre normalmente pela moldura atual.
   */
  mencoesArea?: AreaDeProjetos;
}

/**
 * Um item do balão, com o que as quatro fontes NÃO têm em comum resolvido: uma
 * chave de render estável, a data que serve de critério no histórico, e se o item
 * é novo para quem está olhando.
 *
 * `naoLido` tem origem diferente por fonte, e é o ponto inteiro de `ItemDoSino`:
 * nas persistidas é `lido_em`, nas derivadas é a comparação com o marco local de
 * "já olhei o sino" — ver `src/lib/sinoNotificacoes.ts`.
 */
type UnifiedNotification = ItemDoSino &
  (
    | ({ kind: 'ticket' } & TicketNotification)
    | ({ kind: 'review' } & ReviewTaskNotification)
    | ({ kind: 'mencao' } & MencaoNotificacao)
    | ({ kind: 'interna' } & NotificacaoInterna)
  );

export function NotificationPopover({
  baseDosChamados,
  backTo,
  tasksNavigateTo = '/equipe/tax/projetos/tarefas',
  mencoesArea = 'tax',
}: NotificationPopoverProps) {
  const navigate = useNavigate();
  const {
    notifications: ticketNotifications,
    urgentCount,
    isLoading: ticketsLoading,
  } = useTicketNotifications();
  const { notifications: reviewNotifications, isLoading: reviewsLoading } =
    useReviewTaskNotifications();
  const {
    notifications: mencaoNotifications,
    idsNaoLidos: idsMencoesNaoLidas,
    isLoading: mencoesLoading,
    marcarComoLidas,
  } = useNotificacoesMencao();
  const {
    notifications: internaNotifications,
    idsNaoLidos: idsInternasNaoLidos,
    isLoading: internasLoading,
    marcarComoLidas: marcarInternasLidas,
  } = useNotificacoesInternas();

  const { vistoEm, marcarVisto } = useSinoVisto();
  const [aberto, setAberto] = useState(false);
  /**
   * O que estava novo no instante em que o balão abriu.
   *
   * Sem esta fotografia a lista se rearranjaria debaixo do dedo de quem acabou de
   * abri-la: abrir carimba as menções e os avisos como lidos, a query se invalida,
   * volta em dois segundos com tudo lido, e os itens saltariam do bloco "novo"
   * para o histórico na frente da pessoa. A fotografia segura o destaque até o
   * balão fechar.
   */
  const [novosNaAbertura, setNovosNaAbertura] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  /**
   * O balão abre curto e cresce sob pedido.
   *
   * Mostrar as 30 de cara faria uma caixa longa toda vez, inclusive para quem só
   * quer ver o que chegou — que é o caso comum. Volta a falso ao fechar, em
   * `aoMudarAbertura`: a próxima abertura recomeça curta.
   */
  const [expandido, setExpandido] = useState(false);

  const isLoading = ticketsLoading || reviewsLoading || mencoesLoading || internasLoading;

  const navState = backTo ? { state: { from: backTo } } : undefined;

  // Feed unificado: menções (alguém chamou a pessoa pelo nome) no topo, depois os
  // avisos internos, que são acontecimentos e não estado pendente, depois as
  // revisões e por fim os chamados, na ordem de urgência já calculada. A ordem
  // desta lista É a ordem do bloco "novo" no balão — ver `ordenarItensDoSino`.
  const items: UnifiedNotification[] = useMemo(
    () => [
      ...mencaoNotifications.map((n) => ({
        ...n,
        kind: 'mencao' as const,
        chave: `mencao-${n.id}`,
        quando: n.created_at,
        naoLido: !n.lida,
      })),
      ...internaNotifications.map((n) => ({
        ...n,
        kind: 'interna' as const,
        chave: `interna-${n.id}`,
        quando: n.created_at,
        naoLido: n.lido_em === null,
      })),
      // As duas fontes derivadas não têm `lido_em` para carimbar: o aviso É o
      // estado pendente. Para elas, "novo" é ter mexido depois da última vez que
      // a pessoa abriu o balão.
      ...reviewNotifications.map((n) => ({
        ...n,
        kind: 'review' as const,
        chave: `review-${n.id}`,
        quando: n.updated_at,
        naoLido: aconteceuDepois(n.updated_at, vistoEm),
      })),
      ...ticketNotifications.map((n) => ({
        ...n,
        kind: 'ticket' as const,
        chave: `ticket-${n.id}`,
        quando: n.updated_at,
        naoLido: aconteceuDepois(n.updated_at, vistoEm),
      })),
    ],
    [mencaoNotifications, internaNotifications, reviewNotifications, ticketNotifications, vistoEm],
  );

  // Conta AVISOS, não movimentações: um aviso interno pode representar 63
  // documentos (`quantidade`), e somar isso faria a bolinha saltar para 63 por um
  // evento só, destoando das outras três fontes. A contagem aparece dentro do item.
  //
  // E conta só o que é NOVO, não o que está pendente: desde 14/09/2026 a bolinha
  // responde "chegou coisa desde que olhei?", e some quando a pessoa abre o balão.
  // O que continua pendente não sumiu — está na lista, agora com histórico.
  const unreadCount = items.filter((item) => item.naoLido).length;

  /**
   * A lista como o balão mostra: a fotografia da abertura mantém em destaque o que
   * acabou de ser carimbado, e o que chegar com o balão aberto entra como novo
   * também (será carimbado na próxima abertura).
   */
  const itensDaVista = useMemo(
    () =>
      ordenarItensDoSino(
        items.map((item) => ({
          ...item,
          naoLido: item.naoLido || novosNaAbertura.has(item.chave),
        })),
      ),
    [items, novosNaAbertura],
  );
  const novosNaVista = itensDaVista.filter((item) => item.naoLido).length;
  const itensNaTela = expandido ? itensDaVista : itensDaVista.slice(0, VISIVEIS_ANTES_DE_EXPANDIR);
  const restantes = itensDaVista.length - itensNaTela.length;

  /**
   * Abrir o balão É ver as notificações: a bolinha zera aqui.
   *
   * Três escritas, porque são três caixas diferentes. As duas persistidas recebem
   * `lido_em` no banco (e a leitura viaja para qualquer navegador); as derivadas
   * não têm onde receber carimbo, então o que avança é o marco local.
   *
   * **Consequência registrada:** `notificacao_agrupamento_uq` é único por
   * `(destinatario_id, agrupamento_chave)` *enquanto não lido*, e é o que faz 63
   * documentos do mesmo cliente virarem uma linha com `quantidade = 63`. Marcar
   * como lido fecha essa janela — daqui para a frente, quem abre o sino com
   * frequência verá o mesmo evento em linhas separadas em vez de uma linha
   * somada. É o preço de a bolinha baixar ao ser vista, e é o comportamento
   * pedido.
   */
  const aoMudarAbertura = (proximo: boolean) => {
    setAberto(proximo);
    setExpandido(false);
    if (!proximo) return;

    setNovosNaAbertura(new Set(items.filter((item) => item.naoLido).map((item) => item.chave)));
    if (idsMencoesNaoLidas.length > 0) marcarComoLidas.mutate(idsMencoesNaoLidas);
    if (idsInternasNaoLidos.length > 0) marcarInternasLidas.mutate(idsInternasNaoLidos);
    marcarVisto();
  };

  /**
   * Abrir um item fecha o balão.
   *
   * Passou a ser possível quando o balão virou controlado (14/09/2026). Antes ele
   * ficava aberto sobre a tela de destino, porque clique DENTRO do
   * `PopoverContent` não dispara o fechamento por clique fora do Radix — a pessoa
   * navegava e a lista continuava pendurada por cima do que ela foi ver.
   */
  const handleTicketClick = (ticketId: string) => {
    const basePath = baseDosChamados.replace('/chamados', '');
    setAberto(false);
    navigate(`${basePath}/chamados/${ticketId}`, navState);
  };

  const handleReviewClick = (taskId: string) => {
    setAberto(false);
    navigate(`${tasksNavigateTo}?taskId=${taskId}`, navState);
  };

  /**
   * Abrir a menção (ou a resposta) é o que a marca como lida — carimba e navega
   * sem esperar a gravação, para o clique não parecer travado. Se a gravação
   * falhar, o toast do hook avisa e a linha continua na caixa.
   */
  const handleMencaoClick = (notification: MencaoNotificacao) => {
    // A caixa traz também o que já foi lido: recarimbar só gastaria uma escrita e
    // ainda adiantaria `lido_em` de uma leitura que aconteceu antes.
    if (!notification.lida) marcarComoLidas.mutate([notification.id]);
    setAberto(false);
    navigate(hrefDeOrigem(notification, mencoesArea), navState);
  };

  /**
   * Mesmo padrão do de menção: carimba e navega sem esperar a gravação.
   *
   * O destino é DERIVADO da entidade, não lido de uma coluna: `href` vem nulo em
   * todo aviso gravado pelos triggers, por decisão registrada na migração da
   * EDU-2, porque a rota depende de qual sino a pessoa está olhando e
   * `tasksNavigateTo` é justamente essa informação.
   *
   * Aviso sem destino ainda assim é marcado como lido. O de documento recebido
   * aponta para um cliente e não existe tela de destino por cliente; se o clique
   * não fizesse nada, a linha ficaria pendurada no sino sem jeito de baixar.
   */
  const handleInternaClick = (notification: NotificacaoInterna) => {
    if (notification.lido_em === null) marcarInternasLidas.mutate([notification.id]);
    setAberto(false);
    const destino = destinoDoAviso(notification, tasksNavigateTo, mencoesArea);
    if (destino) navigate(destino, navState);
  };

  return (
    <Popover open={aberto} onOpenChange={aoMudarAbertura}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-medium flex items-center justify-center',
                urgentCount > 0
                  ? 'bg-destructive text-destructive-foreground animate-pulse'
                  : 'bg-primary text-primary-foreground',
              )}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Notificações</h3>
            {/* "novas", e não "pendentes": o balão mostra histórico desde
                14/09/2026, e o que se destaca aqui é o que chegou desde a última
                abertura. A contagem segue a fotografia da abertura, então não
                muda no meio da leitura. */}
            {novosNaVista > 0 && (
              <span className="text-xs text-muted-foreground">
                {novosNaVista} nova{novosNaVista > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-6 text-center">
            <AreaLoader area={mencoesArea} size={40} className="mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
          </div>
        ) : (
          <>
            {/* `[&>[data-radix-scroll-area-viewport]>div]:!block` nao e enfeite: o
                Radix injeta um div com `display: table` dentro do viewport, e table
                dimensiona pelo CONTEUDO. Com ele, a linha de texto passava dos 320px
                do popover, o `truncate` e o `line-clamp-2` nao tinham o que cortar, e
                quem cortava era o `overflow-hidden`, no meio da palavra e sem
                reticencias. Voltando para `block`, o texto respeita a largura e as
                reticencias aparecem. Escopo local de proposito: mexer no
                `ScrollArea` compartilhado mudaria todas as telas de uma vez. */}
            <ScrollArea
              className={cn(
                // Curto por padrão, alto depois do "mostrar mais" — e rolável nos
                // dois casos, porque um aviso interno pode ocupar quatro linhas e
                // cinco deles já passariam da tela.
                //
                // O TETO VAI NO VIEWPORT, não na raiz do `ScrollArea`, e isso não é
                // detalhe: a raiz é `relative overflow-hidden` e o viewport do Radix
                // é `h-full`. Com `max-h-*` só na raiz, `h-full` do filho resolve
                // para `auto` (a raiz não tem altura definida), o viewport cresce
                // com o conteúdo, e quem corta é o `overflow-hidden` da raiz — sem
                // barra e sem rolagem. Era o estado anterior: da sexta notificação
                // em diante, ninguém alcançava.
                expandido
                  ? '[&>[data-radix-scroll-area-viewport]]:max-h-[32rem]'
                  : '[&>[data-radix-scroll-area-viewport]]:max-h-80',
                '[&>[data-radix-scroll-area-viewport]>div]:!block',
              )}
            >
              {itensNaTela.map((item) => (
                <LinhaDoSino key={item.chave} naoLida={item.naoLido}>
                  {item.kind === 'mencao' ? (
                    <MencaoNotificationItem
                      notification={item}
                      onClick={() => handleMencaoClick(item)}
                    />
                  ) : item.kind === 'interna' ? (
                    <InternaNotificationItem
                      notification={item}
                      onClick={() => handleInternaClick(item)}
                    />
                  ) : item.kind === 'review' ? (
                    <ReviewNotificationItem
                      notification={item}
                      onClick={() => handleReviewClick(item.id)}
                    />
                  ) : (
                    <TicketNotificationItem
                      notification={item}
                      onClick={() => handleTicketClick(item.id)}
                    />
                  )}
                </LinhaDoSino>
              ))}
            </ScrollArea>

            {/* Rodapé: só existe enquanto há o que revelar.
                Era "Ver todos os chamados", que levava para a lista de chamados —
                um destino só, de uma das quatro fontes, no pé de um balão que
                mostra as quatro. Desde 14/09/2026 o rodapé abre o resto DESTA
                lista, que é o que a pessoa está olhando. */}
            {restantes > 0 && (
              <div className="p-2 border-t border-border">
                <Button
                  variant="ghost"
                  className="w-full text-sm text-primary hover:text-primary hover:bg-primary/5"
                  onClick={() => setExpandido(true)}
                >
                  Mostrar mais {restantes} {restantes > 1 ? 'notificações' : 'notificação'}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
