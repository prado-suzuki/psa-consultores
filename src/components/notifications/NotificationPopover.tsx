import { useNavigate } from 'react-router-dom';
import { Bell, Clock, AlertTriangle, ArrowRight, AtSign, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTicketNotifications, TicketNotification } from '@/hooks/useTicketNotifications';
import { useReviewTaskNotifications, ReviewTaskNotification } from '@/hooks/useReviewTaskNotifications';
import { useNotificacoesMencao, type MencaoNotificacao } from '@/hooks/useNotificacoesMencao';
import { hrefDeOrigem, origemDoComentario, type AreaDeProjetos } from '@/lib/feedComentarios';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificationPopoverProps {
  navigateTo: string;
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

type UnifiedNotification =
  | ({ kind: 'ticket' } & TicketNotification)
  | ({ kind: 'review' } & ReviewTaskNotification)
  | ({ kind: 'mencao' } & MencaoNotificacao);

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
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
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
            <span className="text-xs font-medium text-purple-600 dark:text-purple-300">
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
 * Menção num comentário de tarefa/projeto.
 *
 * O que a pessoa precisa para decidir se abre agora: quem a citou, onde, e o
 * começo do que foi dito — o corpo entra como recorte em texto plano, porque o
 * comentário é documento rico e o balão do sino não renderiza thread.
 */
function MencaoNotificationItem({
  notification,
  onClick,
}: {
  notification: MencaoNotificacao;
  onClick: () => void;
}) {
  const origem = origemDoComentario(notification);

  return (
    <button
      onClick={onClick}
      className="w-full p-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 group"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary">
          <AtSign className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {notification.authorName} mencionou você
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.trecho}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-medium text-primary">Menção</span>
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

export function NotificationPopover({
  navigateTo,
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

  const isLoading = ticketsLoading || reviewsLoading || mencoesLoading;
  const unreadCount =
    mencaoNotifications.length + ticketNotifications.length + reviewNotifications.length;

  const navState = backTo ? { state: { from: backTo } } : undefined;

  // Feed unificado: menções (alguém chamou a pessoa pelo nome) no topo, depois
  // revisões pendentes e por fim os chamados, na ordem de urgência já calculada.
  const items: UnifiedNotification[] = [
    ...mencaoNotifications.map((n) => ({ kind: 'mencao' as const, ...n })),
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
   * Abrir a menção é o que a marca como lida — carimba e navega sem esperar a
   * gravação, para o clique não parecer travado. Se a gravação falhar, o toast
   * do hook avisa e a menção continua na caixa.
   */
  const handleMencaoClick = (notification: MencaoNotificacao) => {
    marcarComoLidas.mutate([notification.id]);
    navigate(hrefDeOrigem(notification, mencoesArea), navState);
  };

  const handleViewAll = () => {
    navigate(navigateTo, navState);
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
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
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
