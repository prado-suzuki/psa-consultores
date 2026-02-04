import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG, type WorkPackageActivity } from '@/types/workPackage';

interface ActivityTimelineProps {
  activities: WorkPackageActivity[];
  isLoading: boolean;
  onAddComment: (comment: string) => void;
  isAddingComment: boolean;
}

export function ActivityTimeline({ 
  activities, 
  isLoading, 
  onAddComment,
  isAddingComment 
}: ActivityTimelineProps) {
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (comment.trim()) {
      onAddComment(comment);
      setComment('');
    }
  };

  const getActivityDescription = (activity: WorkPackageActivity): string => {
    switch (activity.action_type) {
      case 'created':
        return `criou este pacote de trabalho`;
      case 'status_change':
        const oldStatus = activity.old_value ? STATUS_CONFIG[activity.old_value as keyof typeof STATUS_CONFIG]?.label : 'Nenhum';
        const newStatus = activity.new_value ? STATUS_CONFIG[activity.new_value as keyof typeof STATUS_CONFIG]?.label : 'Nenhum';
        return `alterou status de ${oldStatus} para ${newStatus}`;
      case 'assignment':
        if (activity.field_name === 'assigned_to') {
          return `alterou atribuição`;
        }
        return `alterou responsável`;
      case 'comment':
        return null as unknown as string; // Comments are rendered differently
      case 'file_upload':
        return `enviou arquivo ${activity.new_value || ''}`;
      case 'relation_change':
        return `alterou relação: ${activity.new_value || ''}`;
      case 'field_update':
        return `alterou ${activity.field_name}: ${activity.old_value || 'vazio'} → ${activity.new_value || 'vazio'}`;
      default:
        return `realizou uma ação`;
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Comment input */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex gap-3">
          <Textarea
            placeholder="Adicione um comentário. Digite @ para notificar..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[80px] resize-none"
          />
        </div>
        <div className="flex justify-end mt-2">
          <Button 
            onClick={handleSubmit} 
            disabled={!comment.trim() || isAddingComment}
            size="sm"
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Enviar
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activities.length === 0 ? (
          <p className="text-center text-slate-400 py-8">
            Nenhuma atividade registrada
          </p>
        ) : (
          activities.map((activity) => {
            const isComment = activity.action_type === 'comment';
            const userName = activity.user
              ? `${activity.user.first_name} ${activity.user.last_name}`
              : 'Sistema';

            return (
              <div key={activity.id} className="flex gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className={cn(
                    'text-xs',
                    activity.user ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'
                  )}>
                    {activity.user 
                      ? getInitials(activity.user.first_name, activity.user.last_name)
                      : 'S'
                    }
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-slate-900">{userName}</span>
                    <span className="text-slate-400">
                      {format(new Date(activity.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {isComment ? (
                    <div className="mt-1 p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
                      {activity.comment}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 mt-0.5">
                      {getActivityDescription(activity)}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
