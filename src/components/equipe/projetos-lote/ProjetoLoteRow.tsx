import { useEffect, useMemo } from 'react';
import { Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useEstruturaEquipe } from '@/hooks/useEstruturaEquipe';
import type { EstruturaEquipeOption } from '@/hooks/useEstruturaEquipes';
import {
  computeAvailableMembers, computeExecutores, computeLideres,
  SEM_EXECUTOR_FIXO_OPTION, type RoleAssignment,
} from '@/lib/projetoEquipe';
import type { LoteRow } from '@/lib/projetosLote';
import { PeopleMultiSelect, type PersonAreaGroup, type PersonOption } from './PeopleMultiSelect';

interface ProjetoLoteRowProps {
  index: number;
  row: LoteRow;
  /** Produto que já tem projeto nesta OS: linha travada, sem criar de novo. */
  jaCriado: boolean;
  updateRow: (index: number, patch: Partial<LoteRow>) => void;
  equipesOptions: EstruturaEquipeOption[];
  teamMembers: PersonOption[];
  userRoles: RoleAssignment[];
  areaGroups: PersonAreaGroup[];
  currentUserAreaIds: string[];
}

export function ProjetoLoteRow({
  index, row, jaCriado, updateRow, equipesOptions, teamMembers, userRoles, areaGroups, currentUserAreaIds,
}: ProjetoLoteRowProps) {
  const equipeId = row.equipeId || null;
  const { liderIds: equipeLiderIds, memberIds: equipeMemberIds } = useEstruturaEquipe(equipeId);

  const lideres = useMemo(() => computeLideres(teamMembers, userRoles, equipeId, equipeLiderIds, row.leaderIds),
    [teamMembers, userRoles, equipeId, equipeLiderIds, row.leaderIds]);
  const executores = useMemo(() => computeExecutores(teamMembers, userRoles, equipeId, equipeMemberIds, row.responsibleId),
    [teamMembers, userRoles, equipeId, equipeMemberIds, row.responsibleId]);
  const availableMembers = useMemo(() => computeAvailableMembers(teamMembers, equipeId, equipeMemberIds,
    row.leaderIds, row.memberIds, row.isMultidisciplinar, areaGroups),
    [teamMembers, equipeId, equipeMemberIds, row.leaderIds, row.memberIds, row.isMultidisciplinar, areaGroups]);

  // Modo multidisciplinar: mesmas áreas do cadastro único, sem os líderes já escolhidos.
  const availableMembersByArea = useMemo<PersonAreaGroup[] | undefined>(() => {
    if (!row.isMultidisciplinar) return undefined;
    const excluded = new Set(row.leaderIds);
    return areaGroups.map(group => ({
      ...group,
      members: group.members.filter(member => !excluded.has(member.id)),
      equipes: group.equipes.map(team => ({
        ...team,
        members: team.members.filter(member => !excluded.has(member.id)),
      })).filter(team => team.members.length > 0),
    })).filter(group => group.members.length > 0);
  }, [row.isMultidisciplinar, row.leaderIds, areaGroups]);

  // Líder default = gestor da equipe (quando há exatamente 1 e nenhum líder escolhido).
  useEffect(() => {
    if (equipeId && equipeLiderIds.length === 1 && row.leaderIds.length === 0) {
      updateRow(index, { leaderIds: [equipeLiderIds[0]] });
    }
  }, [equipeId, equipeLiderIds, row.leaderIds.length, index, updateRow]);

  const disabled = !row.include;

  const handleEquipeChange = (value: string) => {
    const team = equipesOptions.find(option => option.id === value);
    updateRow(index, {
      equipeId: value,
      estruturaAreaId: team?.area_id || '',
      leaderIds: [],
      responsibleId: '',
      memberIds: [],
    });
  };

  // "Sem executor fixo" mora na própria lista de executores: escolher a opção
  // liga a exceção e zera o responsável; escolher uma pessoa desliga.
  const handleExecutorChange = (value: string) => updateRow(index, {
    semExecutorFixo: value === SEM_EXECUTOR_FIXO_OPTION,
    responsibleId: value === SEM_EXECUTOR_FIXO_OPTION || value === '_none' ? '' : value,
  });

  const toggleLeader = (id: string) => {
    const has = row.leaderIds.includes(id);
    updateRow(index, {
      leaderIds: has ? row.leaderIds.filter(item => item !== id) : [...row.leaderIds, id],
      memberIds: has ? row.memberIds : row.memberIds.filter(item => item !== id),
    });
  };

  const toggleMember = (id: string) => updateRow(index, {
    memberIds: row.memberIds.includes(id) ? row.memberIds.filter(item => item !== id) : [...row.memberIds, id],
  });

  const toggleMembers = (ids: string[]) => {
    const allSelected = ids.length > 0 && ids.every(id => row.memberIds.includes(id));
    updateRow(index, {
      memberIds: allSelected
        ? row.memberIds.filter(id => !ids.includes(id))
        : [...new Set([...row.memberIds, ...ids])],
    });
  };

  const selectAllMembers = () => toggleMembers(availableMembers.map(member => member.id));

  return (
    <div className={cn('bg-card border rounded-lg overflow-hidden transition-opacity', disabled && 'opacity-60')}>
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 border-b">
        <Checkbox
          checked={row.include}
          disabled={jaCriado}
          onCheckedChange={value => updateRow(index, { include: value === true })}
        />
        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold text-foreground">{row.produtoLabel}</span>
        {jaCriado && <Badge variant="secondary" className="ml-auto shrink-0">Já criado</Badge>}
      </div>
      <div className={cn('p-4 space-y-4', disabled && 'pointer-events-none')}>
        <div>
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Nome do Projeto *</Label>
          <Input className="mt-1" value={row.name} onChange={event => updateRow(index, { name: event.target.value })} placeholder="Nome do projeto" />
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Equipe *</Label>
          <Select value={row.equipeId} onValueChange={handleEquipeChange}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a equipe" /></SelectTrigger>
            <SelectContent>{equipesOptions.map(team => (
              <SelectItem key={team.id} value={team.id}>{team.name}{team.area_name ? <span className="text-xs text-muted-foreground ml-1">— {team.area_name}</span> : null}</SelectItem>
            ))}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Líder Geral *</Label>
          <div className="mt-1">
            <PeopleMultiSelect
              options={lideres}
              selectedIds={row.leaderIds}
              onToggle={toggleLeader}
              placeholder="Selecionar líderes..."
              emptyText="Nenhum líder encontrado."
              badgeClassName="bg-success/5 text-success border-success/20"
            />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="space-y-0.5">
            <Label className="text-sm">Multidisciplinar</Label>
            <p className="text-xs text-muted-foreground">Permite selecionar membros de qualquer equipe, agrupados por área.</p>
          </div>
          <Switch
            checked={row.isMultidisciplinar}
            onCheckedChange={checked => updateRow(index, { isMultidisciplinar: checked === true })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Responsável Executor{row.semExecutorFixo ? '' : ' *'}
            </Label>
            <Select value={row.semExecutorFixo ? SEM_EXECUTOR_FIXO_OPTION : (row.responsibleId || '_none')} onValueChange={handleExecutorChange}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o executor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Selecione...</SelectItem>
                <SelectItem value={SEM_EXECUTOR_FIXO_OPTION}>Sem executor fixo</SelectItem>
                <SelectSeparator />
                {executores.map(member => <SelectItem key={member.id} value={member.id}>{member.first_name} {member.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
            {row.semExecutorFixo && <p className="text-xs text-muted-foreground mt-1">As tarefas são delegadas a qualquer membro do projeto.</p>}
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Membros do Projeto *</Label>
            <div className="mt-1">
              <PeopleMultiSelect
                options={availableMembers}
                selectedIds={row.memberIds}
                onToggle={toggleMember}
                onSelectAll={selectAllMembers}
                groups={availableMembersByArea}
                expandedGroupIds={currentUserAreaIds}
                onToggleMany={toggleMembers}
                placeholder={row.isMultidisciplinar || row.equipeId ? 'Selecionar membros...' : 'Selecione uma equipe primeiro'}
                emptyText="Nenhum membro encontrado."
                badgeClassName="bg-purple-50 text-purple-700 border-purple-200"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
