import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellRing,
  Clock,
  AlertTriangle,
  ArrowRight,
  AtSign,
  ClipboardCheck,
  FileCheck,
  FileText,
  FileX,
  Reply,
  Send,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTicketNotifications, TicketNotification } from '@/hooks/useTicketNotifications';
import { useReviewTaskNotifications, ReviewTaskNotification } from '@/hooks/useReviewTaskNotifications';
import { useNotificacoesMencao, type MencaoNotificacao } from '@/hooks/useNotificacoesMencao';
import { useNotificacoesInternas, type NotificacaoInterna } from '@/hooks/useNotificacoesInternas';
import { hrefDeOrigem, origemDoComentario, type AreaDeProjetos } from '@/lib/feedComentarios';
import {
  apresentacaoDoAviso,
  destinoDoAviso,
  textoDaRepeticao,
  type NotificacaoTipo,
} from '@/lib/notificacoesInternas';
import { AreaLoader } from '@/components/equipe/AreaLoader';
import { cn } from '@/lib/utils';
import { linkEspelhado, type ChaveDeEspelho } from '@/lib/areaTheme';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificationPopoverProps {
  navigateTo: string;
  /**
   * Ambiente em que esta tela está ESPELHADA, quando está.
   *
   * Prop separada do `navigateTo` de propósito: o parâmetro NÃO pode viajar
   * dentro do caminho. `handleTicketClick` faz `navigateTo.replace('/chamados','')`
   * para montar a rota do detalhe — com a query no caminho, sairia
   * `/equipe?area=tax/chamados/123`. E o detalhe de um chamado não deve espelhar
   * de todo jeito: ele não tem escopo para filtrar, logo não pode ter cor de
   * escopo (ver `ROTAS_ESPELHADAS` em `src/lib/areaTheme.ts`).
   *
   * Então o espelho entra SÓ na navegação para a LISTA.
   */
  espelho?: ChaveDeEspelho;

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

const departmentLabels: Record<string, string> = {
  'icms_ipi': 'ICMS/IPI',
  'pis_cofins': 'PIS/COFINS',
  'irpj_csll': 'IRPJ/CSLL',
  'contabil': 'Contábil',
  'geral': 'Geral',
};

/**
 * Ícone por tipo de aviso interno.
 *
 * `Record` exaustivo sobre o enum do banco: um oitavo tipo, depois de regenerar
 * `types.ts`, quebra a compilação aqui e no rótulo, em vez de aparecer sem ícone
 * na tela. `tarefa_em_revisao` reusa o `ClipboardCheck` do aviso derivado de
 * revisão, porque é o mesmo assunto visto do outro lado.
 *
 * Os 5 `chamado_*` (ALE-1) nunca deveriam renderizar aqui — ver o comentário
 * equivalente em `notificacoesInternas.ts` sobre `APRESENTACAO`. `Bell`
 * genérico só para satisfazer o `Record`, não é escolha de design.
 */
const ICONES_INTERNAS: Record<NotificacaoTipo, LucideIcon> = {
  tarefa_atribuida: UserPlus,
  tarefa_em_revisao: ClipboardCheck,
  documento_recebido: FileText,
  solicitacao_enviada: Send,
  documento_aprovado: FileCheck,
  documento_recusado: FileX,
  cobranca_pendencia: BellRing,
  chamado_criado: Bell,
  chamado_atribuido: Bell,
  chamado_respondido: Bell,
  chamado_vencido: Bell,
  chamado_resolvido: Bell,
};

type UnifiedNotification =
  | ({ kind: 'ticket' } & TicketNotification)
  | ({ kind: 'review' } & ReviewTaskNotification)
  | ({ kind: 'mencao' } & MencaoNotificacao)
  | ({ kind: 'interna' } & NotificacaoInterna);

function TicketNotificationItem({
  notification,
  onClick,
}: {
  notification: TicketNotification;
  onClick: () => void;
}) {
  const statusColors = {
    atrasado: 'bg-destructive text-destructive-foreground',
    urgente: 'bg-amber-500 text-white',
    normal: 'bg-primary/10 text-primary',
  };

  const statusIcons = {
    atrasado: AlertTriangle,
    urgente: Clock,
    normal: Clock,
  };

  const StatusIcon = statusIcons[notification.prazoInfo.status];

  return (
    <button
      onClick={onClick}
      className="w-full p-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 group"
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          statusColors[notification.prazoInfo.status]
        )}>
          <StatusIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {notification.clientName}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">
              Chamado
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {departmentLabels[notification.department] || notification.department}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className={cn(
              "text-xs font-medium",
              notification.prazoInfo.status === 'atrasado' && 'text-destructive',
              notification.prazoInfo.status === 'urgente' && 'text-amber-600',
              notification.prazoInfo.status === 'normal' && 'text-muted-foreground'
            )}>
              {notification.prazoInfo.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.updated_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

function ReviewNotificationItem({
  notification,
  onClick,
}: {
  notification: ReviewTaskNotification;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full p-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 group"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-100 text-purple-700">
          <ClipboardCheck className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            Enviada por {notification.assignedToName}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-medium text-purple-600">
              Revisão pendente
            </span>
            {notification.projectName && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground truncate">
                  {notification.projectName}
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.updated_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

/**
 * Menção ou resposta num comentário de tarefa/projeto.
 *
 * O que a pessoa precisa para decidir se abre agora: quem a citou (ou respondeu),
 * onde, e o começo do que foi dito — o corpo entra como recorte em texto plano,
 * porque o comentário é documento rico e o balão do sino não renderiza thread.
 *
 * Um item só para os dois motivos porque a caixa é a mesma
 * (`org_comment_mentions`) e o destino do clique também: a thread de origem. O
 * `motivo` muda apenas como a linha se apresenta — ícone, chamada e etiqueta —,
 * para "respondeu você" não chegar disfarçado de menção.
 */
function MencaoNotificationItem({
  notification,
  onClick,
}: {
  notification: MencaoNotificacao;
  onClick: () => void;
}) {
  const origem = origemDoComentario(notification);
  const ehResposta = notification.motivo === 'resposta';
  const MotivoIcon = ehResposta ? Reply : AtSign;

  return (
    <button
      onClick={onClick}
      className="w-full p-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 group"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary">
          <MotivoIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {notification.authorName} {ehResposta ? 'respondeu você' : 'mencionou você'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.trecho}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-medium text-primary">
              {ehResposta ? 'Resposta' : 'Menção'}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground truncate">
              {origem.rotulo} {origem.titulo}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

/**
 * Aviso interno, a primeira fonte do sino que não é derivada: a linha vem de
 * `public.notificacao`, gravada por trigger do banco.
 *
 * Um item só para os sete tipos, porque a linha já traz título e corpo prontos —
 * o `tipo` muda apenas ícone, etiqueta e tom. A contagem de repetições aparece
 * quando o mesmo evento se acumulou na mesma chave, e sem ela o agrupamento
 * ficaria invisível: 63 documentos do mesmo cliente no mesmo dia são UMA linha
 * com `quantidade = 63`.
 */
function InternaNotificationItem({
  notification,
  onClick,
}: {
  notification: NotificacaoInterna;
  onClick: () => void;
}) {
  const { rotulo, tom } = apresentacaoDoAviso(notification.tipo);
  const Icone = ICONES_INTERNAS[notification.tipo] ?? Bell;
  const repeticao = textoDaRepeticao(notification.quantidade);

  return (
    <button
      onClick={onClick}
      className="w-full p-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 group"
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          tom
        )}>
          <Icone className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {notification.titulo}
          </p>
          {notification.corpo && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {notification.corpo}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-medium text-primary">
              {rotulo}
            </span>
            {repeticao && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {repeticao}
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

export function NotificationPopover({
  navigateTo,
  espelho,
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
  const {
    notifications: reviewNotifications,
    isLoading: reviewsLoading,
  } = useReviewTaskNotifications();
  const {
    notifications: mencaoNotifications,
    isLoading: mencoesLoading,
    marcarComoLidas,
  } = useNotificacoesMencao();
  const {
    notifications: internaNotifications,
    isLoading: internasLoading,
    marcarComoLidas: marcarInternasLidas,
  } = useNotificacoesInternas();

  const isLoading = ticketsLoading || reviewsLoading || mencoesLoading || internasLoading;
  // Conta AVISOS, não movimentações: um aviso interno pode representar 63
  // documentos (`quantidade`), e somar isso faria a bolinha saltar para 63 por um
  // evento só, destoando das outras três fontes. A contagem aparece dentro do item.
  const unreadCount =
    mencaoNotifications.length +
    internaNotifications.length +
    ticketNotifications.length +
    reviewNotifications.length;

  const navState = backTo ? { state: { from: backTo } } : undefined;

  // Feed unificado: menções (alguém chamou a pessoa pelo nome) no topo, depois os
  // avisos internos, que são acontecimentos e não estado pendente, depois as
  // revisões e por fim os chamados, na ordem de urgência já calculada.
  const items: UnifiedNotification[] = [
    ...mencaoNotifications.map((n) => ({ kind: 'mencao' as const, ...n })),
    ...internaNotifications.map((n) => ({ kind: 'interna' as const, ...n })),
    ...reviewNotifications.map((n) => ({ kind: 'review' as const, ...n })),
    ...ticketNotifications.map((n) => ({ kind: 'ticket' as const, ...n })),
  ];

  const handleTicketClick = (ticketId: string) => {
    const basePath = navigateTo.replace('/chamados', '');
    navigate(`${basePath}/chamados/${ticketId}`, navState);
  };

  const handleReviewClick = (taskId: string) => {
    navigate(`${tasksNavigateTo}?taskId=${taskId}`, navState);
  };

  /**
   * Abrir a menção (ou a resposta) é o que a marca como lida — carimba e navega
   * sem esperar a gravação, para o clique não parecer travado. Se a gravação
   * falhar, o toast do hook avisa e a linha continua na caixa.
   */
  const handleMencaoClick = (notification: MencaoNotificacao) => {
    marcarComoLidas.mutate([notification.id]);
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
    marcarInternasLidas.mutate([notification.id]);
    const destino = destinoDoAviso(notification, tasksNavigateTo);
    if (destino) navigate(destino, navState);
  };

  const handleViewAll = () => {
    navigate(espelho ? linkEspelhado(navigateTo, espelho) : navigateTo, navState);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-medium flex items-center justify-center",
              urgentCount > 0
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "bg-primary text-primary-foreground"
            )}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Notificações</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {unreadCount} pendente{unreadCount > 1 ? 's' : ''}
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
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-80">
              {items.slice(0, 5).map((item) => {
                if (item.kind === 'mencao') {
                  return (
                    <MencaoNotificationItem
                      key={`mencao-${item.id}`}
                      notification={item}
                      onClick={() => handleMencaoClick(item)}
                    />
                  );
                }
                if (item.kind === 'interna') {
                  return (
                    <InternaNotificationItem
                      key={`interna-${item.id}`}
                      notification={item}
                      onClick={() => handleInternaClick(item)}
                    />
                  );
                }
                if (item.kind === 'review') {
                  return (
                    <ReviewNotificationItem
                      key={`review-${item.id}`}
                      notification={item}
                      onClick={() => handleReviewClick(item.id)}
                    />
                  );
                }
                return (
                  <TicketNotificationItem
                    key={`ticket-${item.id}`}
                    notification={item}
                    onClick={() => handleTicketClick(item.id)}
                  />
                );
              })}
            </ScrollArea>

            {/* Footer */}
            <div className="p-2 border-t border-border">
              <Button
                variant="ghost"
                className="w-full text-sm text-primary hover:text-primary hover:bg-primary/5"
                onClick={handleViewAll}
              >
                Ver todos os chamados
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
