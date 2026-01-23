import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MessageSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTicketNotifications } from '@/hooks/useTicketNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface PendingTicketsAlertProps {
  navigateTo: string;
}

export function PendingTicketsAlert({ navigateTo }: PendingTicketsAlertProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, urgentCount, isLoading } = useTicketNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Get current notification IDs for comparison
  const currentNotificationIds = useMemo(() => 
    notifications.map(n => n.id).sort().join(','),
    [notifications]
  );
  
  // Check sessionStorage and detect new tickets
  useEffect(() => {
    if (!user?.id) return;
    
    const dismissKey = `pending-tickets-dismissed-${user.id}`;
    const dismissedData = sessionStorage.getItem(dismissKey);
    
    if (!dismissedData) {
      setIsDismissed(false);
      return;
    }
    
    try {
      const { ids: dismissedIds } = JSON.parse(dismissedData);
      const currentIds = notifications.map(n => n.id);
      
      // Check if there are new tickets that weren't in the dismissed list
      const hasNewTickets = currentIds.some(id => !dismissedIds.includes(id));
      
      if (hasNewTickets && currentIds.length > 0) {
        setIsDismissed(false);
      } else {
        setIsDismissed(true);
      }
    } catch {
      setIsDismissed(false);
    }
  }, [user?.id, currentNotificationIds, notifications]);
  
  // Show alert after a short delay if there are notifications
  useEffect(() => {
    if (isLoading || isDismissed || unreadCount === 0) {
      setIsVisible(false);
      return;
    }
    
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000); // 1 second delay for smooth entrance
    
    return () => clearTimeout(timer);
  }, [isLoading, isDismissed, unreadCount]);
  
  // Auto-hide after 30 seconds
  useEffect(() => {
    if (!isVisible) return;
    
    const timer = setTimeout(() => {
      handleDismiss();
    }, 30000);
    
    return () => clearTimeout(timer);
  }, [isVisible]);
  
  const handleDismiss = () => {
    if (!user?.id) return;
    
    setIsVisible(false);
    setIsDismissed(true);
    
    const dismissKey = `pending-tickets-dismissed-${user.id}`;
    sessionStorage.setItem(dismissKey, JSON.stringify({
      ids: notifications.map(n => n.id),
      timestamp: Date.now()
    }));
  };
  
  const handleViewTickets = () => {
    handleDismiss();
    navigate(navigateTo);
  };
  
  if (!isVisible) return null;
  
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 w-full max-w-md",
        "animate-in slide-in-from-bottom-5 fade-in duration-500"
      )}
    >
      <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden">
        {/* Colored top bar based on urgency */}
        <div className={cn(
          "h-1",
          urgentCount > 0 ? "bg-destructive" : "bg-primary"
        )} />
        
        <div className="p-5">
          {/* Header with close button */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                urgentCount > 0 ? "bg-destructive/10" : "bg-primary/10"
              )}>
                <MessageSquare className={cn(
                  "h-5 w-5",
                  urgentCount > 0 ? "text-destructive" : "text-primary"
                )} />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">
                  {unreadCount === 1 
                    ? 'Você tem 1 chamado pendente'
                    : `Você tem ${unreadCount} chamados pendentes`
                  }
                </h4>
                {urgentCount > 0 && (
                  <p className="text-xs text-destructive font-medium mt-0.5">
                    {urgentCount} {urgentCount === 1 ? 'urgente' : 'urgentes'} ou atrasados
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground -mt-1 -mr-2"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4">
            {urgentCount > 0 
              ? 'Alguns chamados estão próximos do prazo ou atrasados. Acesse a área de chamados para responder.'
              : 'Há chamados aguardando sua resposta. Acesse a área de chamados para visualizá-los.'
            }
          </p>
          
          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleDismiss}
            >
              Ignorar
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleViewTickets}
            >
              Ver Chamados
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
