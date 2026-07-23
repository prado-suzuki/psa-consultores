import type { DomainProcessImprovementJobRole } from '@/hooks/useDomainProcessImprovement';
import type { TeamMember } from '@/lib/processImprovement';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

interface TeamEditorProps {
  title: string;
  tone: 'orange' | 'green';
  members: TeamMember[];
  jobRoles: DomainProcessImprovementJobRole[];
  cost: number;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onRoleChange: (index: number, roleId: string) => void;
  onHoursChange: (index: number, hours: number) => void;
}

const tones = {
  orange: {
    card: 'border-orange-200 bg-orange-50/50',
    title: 'text-orange-700',
    badge: 'border-orange-300 text-orange-700',
  },
  green: {
    card: 'border-green-200 bg-green-50/50',
    title: 'text-green-700',
    badge: 'border-green-300 text-green-700',
  },
};

function TeamEditor({
  title,
  tone,
  members,
  jobRoles,
  cost,
  onAdd,
  onRemove,
  onRoleChange,
  onHoursChange,
}: TeamEditorProps) {
  const classes = tones[tone];
  return (
    <Card className={classes.card}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className={`font-semibold ${classes.title}`}>{title}</h4>
          <Badge variant="outline" className={classes.badge}>
            R$ {cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
          </Badge>
        </div>
        <div className="space-y-3">
          {members.map((member, index) => (
            <div key={index} className="flex items-center gap-2">
              <Select value={member.job_role_id} onValueChange={value => onRoleChange(index, value)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecionar cargo" />
                </SelectTrigger>
                <SelectContent>
                  {jobRoles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name} (R$ {role.hourly_rate}/h)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                className="w-20"
                placeholder="h/mês"
                value={member.hours_allocated || ''}
                onChange={event => onHoursChange(index, parseFloat(event.target.value) || 0)}
              />
              <Button variant="ghost" size="icon" onClick={() => onRemove(index)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={onAdd} className="w-full border-dashed">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Membro
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface TeamComparisonProps {
  baselineMembers: TeamMember[];
  improvedMembers: TeamMember[];
  jobRoles: DomainProcessImprovementJobRole[];
  baselineCost: number;
  improvedCost: number;
  onAdd: (isBaseline: boolean) => void;
  onRemove: (index: number, isBaseline: boolean) => void;
  onRoleChange: (index: number, roleId: string, isBaseline: boolean) => void;
  onHoursChange: (index: number, hours: number, isBaseline: boolean) => void;
}

export function TeamComparison(props: TeamComparisonProps) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <TeamEditor
        title="ANTES (Baseline)"
        tone="orange"
        members={props.baselineMembers}
        jobRoles={props.jobRoles}
        cost={props.baselineCost}
        onAdd={() => props.onAdd(true)}
        onRemove={index => props.onRemove(index, true)}
        onRoleChange={(index, roleId) => props.onRoleChange(index, roleId, true)}
        onHoursChange={(index, hours) => props.onHoursChange(index, hours, true)}
      />
      <TeamEditor
        title="DEPOIS (Atual)"
        tone="green"
        members={props.improvedMembers}
        jobRoles={props.jobRoles}
        cost={props.improvedCost}
        onAdd={() => props.onAdd(false)}
        onRemove={index => props.onRemove(index, false)}
        onRoleChange={(index, roleId) => props.onRoleChange(index, roleId, false)}
        onHoursChange={(index, hours) => props.onHoursChange(index, hours, false)}
      />
    </div>
  );
}
