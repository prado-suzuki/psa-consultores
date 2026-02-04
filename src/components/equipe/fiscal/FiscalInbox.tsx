import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Inbox, Bell, CheckCircle, Clock } from 'lucide-react';

type FilterType = 'nao_lido' | 'todos';

export function FiscalInbox() {
  const [filter, setFilter] = useState<FilterType>('nao_lido');

  // Mock data - will be replaced with real notifications
  const notifications: Array<{
    id: string;
    type: 'mention' | 'assignment' | 'status_change';
    title: string;
    description: string;
    time: string;
    read: boolean;
  }> = [];

  const filteredNotifications = filter === 'nao_lido' 
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant={filter === 'nao_lido' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('nao_lido')}
          className={filter === 'nao_lido' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
        >
          <Clock className="h-4 w-4 mr-2" />
          Nao lido
        </Button>
        <Button
          variant={filter === 'todos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('todos')}
          className={filter === 'todos' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Todos
        </Button>
      </div>

      {/* Notifications List */}
      <div className="bg-white border border-slate-200 rounded-lg">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Inbox className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma notificacao</p>
            <p className="text-sm mt-1">
              {filter === 'nao_lido' 
                ? 'Voce nao tem notificacoes nao lidas'
                : 'Sua caixa de entrada esta vazia'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-emerald-50/50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    notification.type === 'mention' 
                      ? 'bg-blue-100 text-blue-600'
                      : notification.type === 'assignment'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{notification.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{notification.description}</p>
                    <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
                  </div>
                  {!notification.read && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                      Novo
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
