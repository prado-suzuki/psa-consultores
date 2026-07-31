import { Fragment, useState } from 'react';
import { Check, ChevronDown, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface PersonOption {
  id: string;
  first_name: string;
  last_name: string;
}

/** Área com seus membros (e a quebra por equipe) para o modo multidisciplinar. */
export interface PersonAreaGroup {
  area_id: string;
  area_name: string;
  cluster_name: string;
  members: PersonOption[];
  equipes: Array<{ equipe_id: string; equipe_name: string; members: PersonOption[] }>;
}

interface PeopleMultiSelectProps {
  options: PersonOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll?: () => void;
  /** Modo agrupado (multidisciplinar): `options` continua sendo a união, usada nos badges. */
  groups?: PersonAreaGroup[];
  /** Áreas já expandidas na abertura do modo agrupado; as demais iniciam recolhidas. */
  expandedGroupIds?: string[];
  /** Alterna vários de uma vez (usado no "Selecionar todos da área"). */
  onToggleMany?: (ids: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  badgeClassName?: string;
}

/** Seleção múltipla de pessoas (líderes/membros) via popover com busca. */
export function PeopleMultiSelect({
  options, selectedIds, onToggle, onSelectAll, groups, expandedGroupIds = [], onToggleMany,
  placeholder = 'Selecionar...', emptyText = 'Ninguém encontrado.', badgeClassName,
}: PeopleMultiSelectProps) {
  const [search, setSearch] = useState('');
  const [collapsedOverride, setCollapsedOverride] = useState<Set<string> | null>(null);
  const selectedSet = new Set(selectedIds);
  const allSelected = options.length > 0 && options.every(option => selectedSet.has(option.id));
  const hasSearch = search.trim().length > 0;
  const expandedSet = new Set(expandedGroupIds);
  const isCollapsed = (areaId: string) => !hasSearch
    && (collapsedOverride ? collapsedOverride.has(areaId) : !expandedSet.has(areaId));
  const toggleGroup = (areaId: string) => setCollapsedOverride(previous => {
    const next = new Set(previous ?? (groups || []).filter(group => !expandedSet.has(group.area_id)).map(group => group.area_id));
    if (next.has(areaId)) next.delete(areaId); else next.add(areaId);
    return next;
  });
  const renderPerson = (key: string, person: PersonOption, extraValue: string) => (
    <CommandItem key={key} value={`${person.first_name} ${person.last_name} ${extraValue}`} onSelect={() => onToggle(person.id)} className="pl-6">
      <Check className={`mr-2 h-4 w-4 ${selectedSet.has(person.id) ? 'opacity-100' : 'opacity-0'}`} />
      {person.first_name} {person.last_name}
    </CommandItem>
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between h-auto min-h-9 hover:bg-background hover:text-foreground">
          {selectedIds.length > 0
            ? <div className="flex flex-wrap gap-1">{options.filter(option => selectedSet.has(option.id)).map(option => (
                <Badge key={option.id} variant="outline" className={badgeClassName}>{option.first_name} {option.last_name}</Badge>
              ))}</div>
            : <span className="text-muted-foreground text-sm">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {groups ? groups.map(group => {
              const collapsed = isCollapsed(group.area_id);
              const areaSelected = group.members.length > 0 && group.members.every(member => selectedSet.has(member.id));
              return (
                <CommandGroup key={group.area_id}>
                  <CommandItem
                    value={`__area_header_${group.area_id}__ ${group.area_name} ${group.cluster_name}`}
                    onSelect={() => toggleGroup(group.area_id)}
                    className="bg-muted/40 data-[selected=true]:bg-muted data-[selected=true]:text-foreground font-semibold"
                  >
                    {collapsed
                      ? <ChevronRight className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      : <ChevronDown className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="flex-1 truncate">{group.area_name}</span>
                    {group.cluster_name && <span className="ml-2 text-xs font-normal text-muted-foreground truncate">{group.cluster_name}</span>}
                    <Badge variant="secondary" className="ml-2 text-xs">{group.members.length}</Badge>
                  </CommandItem>
                  {!collapsed && <>
                    {onToggleMany && (
                      <CommandItem value={`__select_all_area_${group.area_id}__`} onSelect={() => onToggleMany(group.members.map(member => member.id))} className="pl-6">
                        <Check className={`mr-2 h-4 w-4 ${areaSelected ? 'opacity-100' : 'opacity-0'}`} />
                        <span className="font-medium">Selecionar todos da área</span>
                      </CommandItem>
                    )}
                    {hasSearch || group.equipes.length <= 1
                      ? group.members.map(member => renderPerson(`${group.area_id}-${member.id}`, member, group.area_name))
                      : group.equipes.map((team, index) => (
                        <Fragment key={team.equipe_id}>
                          <div className={`px-2 ${index === 0 ? 'pt-1 border-t-0' : 'pt-2 border-t border-border/40'} pb-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/70`}>{team.equipe_name}</div>
                          {team.members.map(member => renderPerson(`${group.area_id}-${team.equipe_id}-${member.id}`, member, `${group.area_name} ${team.equipe_name}`))}
                        </Fragment>
                      ))}
                  </>}
                </CommandGroup>
              );
            }) : (
              <CommandGroup>
                {onSelectAll && options.length > 0 && (
                  <CommandItem value="__select_all__" onSelect={onSelectAll}>
                    <Check className={`mr-2 h-4 w-4 ${allSelected ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="font-medium">Selecionar todos</span>
                  </CommandItem>
                )}
                {options.map(option => (
                  <CommandItem key={option.id} value={`${option.first_name} ${option.last_name}`} onSelect={() => onToggle(option.id)}>
                    <Check className={`mr-2 h-4 w-4 ${selectedSet.has(option.id) ? 'opacity-100' : 'opacity-0'}`} />
                    {option.first_name} {option.last_name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
