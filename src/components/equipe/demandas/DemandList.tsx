import type { Dispatch, SetStateAction } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EMPTY_SUBDEMAND_DRAFT,
  type DemandItemsByDemand,
  type EquipeDemanda,
  type EquipeDemandItem,
  type EquipeSubdemandDraft,
} from '@/lib/equipeDemandas';
import type { DemandTeamMember } from '@/components/equipe/demandas/DemandDialogs';

interface DemandListProps {
  loading: boolean;
  demands: EquipeDemanda[];
  demandItems: DemandItemsByDemand;
  teamMembers: DemandTeamMember[];
  expandedDemands: Set<string>;
  addingSubdemandTo: string | null;
  setAddingSubdemandTo: Dispatch<SetStateAction<string | null>>;
  subdemandDraft: EquipeSubdemandDraft;
  setSubdemandDraft: Dispatch<SetStateAction<EquipeSubdemandDraft>>;
  onCreateDemand: () => void;
  onEditDemand: (demand: EquipeDemanda) => void;
  onToggleExpanded: (demandId: string) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onAddSubdemand: (demandId: string, parentDemand: EquipeDemanda) => void;
  onToggleSubdemandStatus: (item: EquipeDemandItem) => void;
  onDeleteSubdemand: (itemId: string) => void;
}

export const DemandList = ({
  loading,
  demands,
  demandItems,
  teamMembers,
  expandedDemands,
  addingSubdemandTo,
  setAddingSubdemandTo,
  subdemandDraft,
  setSubdemandDraft,
  onCreateDemand,
  onEditDemand,
  onToggleExpanded,
  onToggleStatus,
  onAddSubdemand,
  onToggleSubdemandStatus,
  onDeleteSubdemand,
}: DemandListProps) => {
  const getMemberName = (memberId: string | null) => {
    if (!memberId) return null;
    const member = teamMembers.find((candidate) => candidate.id === memberId);
    return member ? `${member.first_name} ${member.last_name}`.trim() : null;
  };

  const getFrequencyBadge = (frequency: string | null) => {
    if (!frequency) return null;
    const config: Record<string, { label: string; className: string }> = {
      daily: { label: 'Diária', className: 'bg-blue-100 text-blue-700' },
      weekly: { label: 'Semanal', className: 'bg-purple-100 text-purple-700' },
      monthly: { label: 'Mensal', className: 'bg-orange-100 text-orange-700' },
    };
    const { label, className } = config[frequency] || {
      label: frequency,
      className: 'bg-muted',
    };
    return <Badge className={className}>{label}</Badge>;
  };

  const formatDateRange = (startDate: string | null, dueDate: string | null) => {
    if (!dueDate) return null;
    const start = startDate ? format(new Date(startDate), 'dd/MM', { locale: ptBR }) : '';
    const end = format(new Date(dueDate), 'dd/MM', { locale: ptBR });
    return start ? `${start} - ${end}` : `até ${end}`;
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : demands.length > 0 ? (
        demands.map((demand) => {
          const items = demandItems[demand.id] || [];
          const doneItems = items.filter((item) => item.status === 'done').length;
          const isExpanded = expandedDemands.has(demand.id);

          return (
            <Card key={demand.id} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`mt-1 ${demand.status === 'done' ? 'text-green-600' : 'text-gray-400'}`}
                      onClick={() => onToggleStatus(demand.id, demand.status)}
                    >
                      {demand.status === 'done' ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <AlertCircle className="h-6 w-6" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <h3
                        className={`font-medium ${demand.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}
                      >
                        {demand.title}
                      </h3>
                      {demand.description && (
                        <p className="text-sm text-gray-500 mt-1">{demand.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {demand.assigned_to && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="h-3 w-3" />
                            {getMemberName(demand.assigned_to)}
                          </div>
                        )}
                        {demand.estimated_hours && (
                          <Badge
                            variant="outline"
                            className="border-border text-gray-600 text-xs"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {demand.estimated_hours}h
                          </Badge>
                        )}
                        {demand.is_recurring ? (
                          <>
                            {getFrequencyBadge(demand.frequency)}
                            <Repeat className="h-4 w-4 text-gray-400" />
                          </>
                        ) : (
                          demand.due_date && (
                            <Badge
                              variant="outline"
                              className="border-primary/25 bg-accent/5 text-teal-700 text-xs"
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDateRange(demand.start_date, demand.due_date)}
                            </Badge>
                          )
                        )}
                        {items.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {doneItems}/{items.length} subdemandas
                          </Badge>
                        )}
                      </div>

                      {(!demand.is_recurring || items.length > 0) && (
                        <Collapsible
                          open={isExpanded}
                          onOpenChange={() => onToggleExpanded(demand.id)}
                          className="mt-3"
                        >
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                            >
                              <ChevronDown
                                className={`h-3 w-3 mr-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                              Subdemandas ({items.length})
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2 space-y-2 pl-2 border-l-2 border-border">
                            {items.map((item) => (
                              <div key={item.id} className="flex items-center gap-2 py-1">
                                <Checkbox
                                  checked={item.status === 'done'}
                                  onCheckedChange={() => onToggleSubdemandStatus(item)}
                                  className="h-4 w-4"
                                />
                                <span
                                  className={`flex-1 text-sm ${item.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                                >
                                  {item.title}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  até {format(new Date(item.due_date), 'dd/MM')}
                                </Badge>
                                {item.assigned_to && (
                                  <span className="text-xs text-gray-500">
                                    {getMemberName(item.assigned_to)}
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-gray-400 hover:text-red-500"
                                  onClick={() => onDeleteSubdemand(item.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            {addingSubdemandTo === demand.id ? (
                              <div className="p-3 bg-gray-50 rounded-lg space-y-3 mt-2">
                                <Input
                                  placeholder="Título da subdemanda"
                                  value={subdemandDraft.title}
                                  onChange={(e) =>
                                    setSubdemandDraft({ ...subdemandDraft, title: e.target.value })
                                  }
                                  className="h-8 text-sm"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    type="date"
                                    value={subdemandDraft.due_date}
                                    onChange={(e) =>
                                      setSubdemandDraft({
                                        ...subdemandDraft,
                                        due_date: e.target.value,
                                      })
                                    }
                                    className="h-8 text-sm"
                                    min={demand.start_date || undefined}
                                    max={demand.due_date || undefined}
                                  />
                                  <Select
                                    value={subdemandDraft.assigned_to}
                                    onValueChange={(value) =>
                                      setSubdemandDraft({ ...subdemandDraft, assigned_to: value })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue placeholder="Responsável" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {teamMembers.map((member) => (
                                        <SelectItem key={member.id} value={member.id}>
                                          {member.first_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => onAddSubdemand(demand.id, demand)}
                                    className="h-7 text-xs"
                                  >
                                    Adicionar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setAddingSubdemandTo(null);
                                      setSubdemandDraft({ ...EMPTY_SUBDEMAND_DRAFT });
                                    }}
                                    className="h-7 text-xs"
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-gray-500 hover:text-primary"
                                onClick={() => setAddingSubdemandTo(demand.id)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Adicionar Subdemanda
                              </Button>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-gray-700"
                    onClick={() => onEditDemand(demand)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card className="border-border">
          <CardContent className="py-16 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma demanda criada</h3>
            <p className="text-gray-500 mb-4">Crie demandas para organizar o trabalho da equipe</p>
            <Button className="bg-primary hover:bg-primary/90" onClick={onCreateDemand}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Demanda
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
