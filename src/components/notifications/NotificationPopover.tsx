import { useNavigate } from 'react-router-dom';
import { Bell, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTicketNotifications, TicketNotification } from '@/hooks/useTicketNotifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificationPopoverProps {
  navigateTo: string;
}

const departmentLabels: Record<string, string> = {
  'icms_ipi': 'ICMS/IPI',
  'pis_cofins': 'PIS/COFINS',
  'irpj_csll': 'IRPJ/CSLL',
  'contabil': 'Contábil',
  'geral': 'Geral',
};

function NotificationItem({ notification, onClick }: { notification: TicketNotification; onClick: () => void }) {
  const statusColors = {
    atrasado: 'bg-destructive text-destructive-foreground',
    urgente: 'bg-amber-500 text-white',
    normal: 'bg-primary/10 text-primary'
  };
  
  const statusIcons = {
    atrasado: AlertTriangle,
    urgente: Clock,
    normal: Clock
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

export function NotificationPopover({ navigateTo }: NotificationPopoverProps) {
  const navigate = useNavigate();
  const { notifications, unreadCount, urgentCount, isLoading } = useTicketNotifications();
  
  const handleNotificationClick = (ticketId: string) => {
    // Navigate to the specific ticket
    const basePath = navigateTo.replace('/chamados', '');
    navigate(`${basePath}/chamados/${ticketId}`);
  };
  
  const handleViewAll = () => {
    navigate(navigateTo);
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
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum chamado pendente
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-80">
              {notifications.slice(0, 5).map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification.id)}
                />
              ))}
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
