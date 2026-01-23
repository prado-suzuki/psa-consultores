import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TicketNotification {
  id: string;
  title: string;
  department: string;
  priority: string;
  updated_at: string;
  activity_status: string;
  status: string;
  clientName: string;
  prazoInfo: {
    status: 'normal' | 'urgente' | 'atrasado';
    label: string;
    daysRemaining: number;
  };
}

function calcularPrazoNotification(updatedAt: string, activityStatus: string): TicketNotification['prazoInfo'] {
  const now = new Date();
  const updated = new Date(updatedAt);
  
  // Calculate business days elapsed
  let businessDays = 0;
  const current = new Date(updated);
  
  while (current < now) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
  }
  
  const prazoMaximo = 5;
  const diasRestantes = prazoMaximo - businessDays;
  
  // Only consider deadline if awaiting analyst response
  if (activityStatus !== 'aguardando_resposta') {
    return { status: 'normal', label: 'Aguardando cliente', daysRemaining: diasRestantes };
  }
  
  if (diasRestantes < 0) {
    return { status: 'atrasado', label: `Atrasado ${Math.abs(diasRestantes)} dia(s)`, daysRemaining: diasRestantes };
  } else if (diasRestantes <= 1) {
    return { status: 'urgente', label: diasRestantes === 0 ? 'Vence hoje' : 'Vence amanhã', daysRemaining: diasRestantes };
  } else {
    return { status: 'normal', label: `${diasRestantes} dias restantes`, daysRemaining: diasRestantes };
  }
}

export function useTicketNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['ticket-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Fetch tickets assigned to user that are awaiting response
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select(`
          id,
          title,
          department,
          priority,
          updated_at,
          activity_status,
          status,
          user_id
        `)
        .eq('assigned_to', user.id)
        .eq('activity_status', 'aguardando_resposta')
        .not('status', 'in', '("resolvido","fechado")')
        .order('updated_at', { ascending: true })
        .limit(20);
      
      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
      
      if (!tickets || tickets.length === 0) return [];
      
      // Fetch client names
      const creatorIds = [...new Set(tickets.map(t => t.user_id).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', creatorIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Cliente';
            return { ...acc, [p.id]: fullName };
          }, {} as Record<string, string>);
        }
      }
      
      // Map to notification format
      const mappedNotifications: TicketNotification[] = tickets.map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        department: ticket.department || 'Geral',
        priority: ticket.priority || 'media',
        updated_at: ticket.updated_at,
        activity_status: ticket.activity_status || 'aguardando_resposta',
        status: ticket.status,
        clientName: ticket.user_id ? profilesMap[ticket.user_id] || 'Cliente' : 'Cliente',
        prazoInfo: calcularPrazoNotification(ticket.updated_at, ticket.activity_status || 'aguardando_resposta')
      }));
      
      // Sort by urgency: atrasado first, then urgente, then by days remaining
      return mappedNotifications.sort((a, b) => {
        const urgencyOrder = { atrasado: 0, urgente: 1, normal: 2 };
        const urgencyDiff = urgencyOrder[a.prazoInfo.status] - urgencyOrder[b.prazoInfo.status];
        if (urgencyDiff !== 0) return urgencyDiff;
        return a.prazoInfo.daysRemaining - b.prazoInfo.daysRemaining;
      });
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds - reduced for faster updates
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Realtime subscription for instant updates
  useEffect(() => {
    if (!user?.id) return;
    
    const channel = supabase
      .channel(`ticket-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `assigned_to=eq.${user.id}`
        },
        () => {
          // Refetch when any ticket assigned to user changes
          queryClient.invalidateQueries({ queryKey: ['ticket-notifications', user.id] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
  
  const urgentCount = notifications.filter(n => n.prazoInfo.status === 'atrasado' || n.prazoInfo.status === 'urgente').length;
  
  return {
    notifications,
    unreadCount: notifications.length,
    urgentCount,
    isLoading,
    refetch
  };
}
