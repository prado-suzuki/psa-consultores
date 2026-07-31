import { Fragment } from 'react';
import { Check, ChevronDown, ChevronRight, ChevronsUpDown, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useProjetosCadastro } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';
import { SEM_EXECUTOR_FIXO_OPTION } from '@/lib/projetoEquipe';

interface ProjetoEquipeFieldsProps {
  /**
   * Na edição o responsável executor vive na faixa de propriedades do topo
   * (`ProjetoPropertyBar`), então a seção de equipe não o repete.
   */
  withResponsavel?: boolean;
  /**
   * Na edição o switch de multidisciplinar vai para o título da seção
   * (`MultidisciplinarToggle`), onde ocupa uma linha já existente.
   */
  withMultidisciplinar?: boolean;
}

/**
 * Switch de projeto multidisciplinar em formato compacto, para o título da
 * seção "Equipe" do modo edição. A explicação, que no formulário de criação é um
 * parágrafo, vira `title` — economiza a linha inteira que faltava para o modal
 * caber sem rolagem.
 */
export function MultidisciplinarToggle() {
  const { formData, setFormData } = useProjetosCadastro();
  return <label
    className="flex cursor-pointer items-center gap-2 text-xs font-normal normal-case tracking-normal text-muted-foreground"
    title="Permite selecionar membros de qualquer equipe, agrupados por área."
  >
    Multidisciplinar
    <Switch
      checked={formData.is_multidisciplinar}
      onCheckedChange={checked => setFormData(previous => ({ ...previous, is_multidisciplinar: checked }))}
    />
  </label>;
}

/**
 * Campos de equipe do projeto: líderes, responsável executor e membros. O título
 * da seção fica com quem renderiza (formulário de criação ou corpo da edição).
 */
export function ProjetoEquipeFields({
  withResponsavel = true,
  withMultidisciplinar = true,
}: ProjetoEquipeFieldsProps = {}) {
  const {
    formData, setFormData, teamMembers, lideres, executores, equipeId, equipeMemberIds,
    availableMembers, availableMembersByArea, memberSearch, setMemberSearch,
    collapsedAreaGroups, toggleAreaGroup, handleMemberToggle,
    semExecutorFixo, toggleSemExecutorFixo,
  } = useProjetosCadastro();
  const selectMembers = (ids: string[]) => setFormData(previous => {
    const allSelected = ids.every(id => previous.member_ids.includes(id));
    if (allSelected) {
      const remove = new Set(ids);
      return { ...previous, member_ids: previous.member_ids.filter(id => !remove.has(id)) };
    }
    return { ...previous, member_ids: [...new Set([...previous.member_ids, ...ids])] };
  });
  // "Sem executor fixo" mora na própria lista de executores: escolher a opção
  // liga a exceção e zera o responsável; escolher uma pessoa desliga.
  const handleExecutorChange = (value: string) => {
    toggleSemExecutorFixo(value === SEM_EXECUTOR_FIXO_OPTION);
    if (value !== SEM_EXECUTOR_FIXO_OPTION) {
      setFormData(previous => ({ ...previous, responsible_id: value === '_none' ? '' : value }));
    }
  };

  const liderField = <div>
      <Label>Líder Geral <span className="text-destructive">*</span></Label>
      <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-auto min-h-9 mt-1 hover:bg-background hover:text-foreground">

        {formData.leader_ids.length > 0 ? <div className="flex flex-wrap gap-1">{formData.leader_ids.map(id => {
          const member = teamMembers.find(item => item.id === id);
          return member ? <Badge key={id} variant="outline" className="bg-success/5 text-success border-success/20">{member.first_name} {member.last_name}</Badge> : null;
        })}</div> : <span className="text-muted-foreground">Selecionar líderes...</span>}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start"><Command>
        <CommandInput placeholder="Buscar líder..." /><CommandList><CommandEmpty>Nenhum líder encontrado.</CommandEmpty><CommandGroup>
          {lideres.map(member => <CommandItem key={member.id} value={`${member.first_name} ${member.last_name}`} onSelect={() => setFormData(previous => ({
            ...previous,
            leader_ids: previous.leader_ids.includes(member.id) ? previous.leader_ids.filter(id => id !== member.id) : [...previous.leader_ids, member.id],
          }))}><Check className={`mr-2 h-4 w-4 ${formData.leader_ids.includes(member.id) ? 'opacity-100' : 'opacity-0'}`} />{member.first_name} {member.last_name}</CommandItem>)}
        </CommandGroup></CommandList>
      </Command></PopoverContent></Popover>
    </div>;

  const responsavelField = <div>
      <Label>Responsável Executor{!semExecutorFixo && <> <span className="text-destructive">*</span></>}</Label>
      <Select value={semExecutorFixo ? SEM_EXECUTOR_FIXO_OPTION : formData.responsible_id} onValueChange={handleExecutorChange}>
        <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o executor" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">Selecione...</SelectItem>
          <SelectItem value={SEM_EXECUTOR_FIXO_OPTION}>Sem executor fixo</SelectItem>
          <SelectSeparator />
          {executores.map(member => <SelectItem key={member.id} value={member.id}>{member.first_name} {member.last_name}</SelectItem>)}
        </SelectContent>
      </Select>
      {semExecutorFixo && <p className="text-xs text-muted-foreground mt-1">As tarefas são delegadas a qualquer membro do projeto.</p>}
    </div>;

  const multidisciplinarRow = <div className="flex items-center justify-between gap-4 rounded-xl border px-3 py-1.5">
      <div><Label className="text-sm">Multidisciplinar</Label><p className="text-xs text-muted-foreground">Permite selecionar membros de qualquer equipe, agrupados por área.</p></div>
      <Switch checked={formData.is_multidisciplinar} onCheckedChange={checked => setFormData(previous => ({ ...previous, is_multidisciplinar: checked }))} />
    </div>;

  const membrosField = <div>
      <div className="flex flex-wrap items-center justify-between gap-x-2">
        <Label>Membros do Projeto <span className="text-destructive">*</span></Label>
        {!formData.is_multidisciplinar && equipeId && equipeMemberIds.length > 0 && <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1 text-success hover:text-success hover:bg-success/5" onClick={() => {
          const excluded = new Set(formData.leader_ids);
          const eligible = equipeMemberIds.filter(id => !excluded.has(id));
          setFormData(previous => ({ ...previous, member_ids: [...new Set([...previous.member_ids, ...eligible])] }));
        }}><UsersRound className="h-3.5 w-3.5" />Incluir todos da equipe</Button>}
      </div>
      {!formData.is_multidisciplinar && !equipeId && formData.member_ids.length === 0
        ? <p className="text-xs text-muted-foreground mt-1">Selecione uma equipe para ver os membros disponíveis.</p>
        : !formData.is_multidisciplinar && equipeId && equipeMemberIds.length === 0 && formData.member_ids.length === 0
          ? <p className="text-xs text-muted-foreground mt-1">Nenhum membro encontrado nesta equipe.</p>
          : <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-auto min-h-9 mt-1 hover:bg-background hover:text-foreground">
            {formData.member_ids.length > 0 ? <div className="flex flex-wrap gap-1">{formData.member_ids.map(id => {
              const member = teamMembers.find(item => item.id === id);
              return member ? <Badge key={id} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{member.first_name} {member.last_name}</Badge> : null;
            })}</div> : <span className="text-muted-foreground">Selecionar membros...</span>}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start"><Command>
            <CommandInput placeholder="Buscar membro..." value={memberSearch} onValueChange={setMemberSearch} />
            <CommandList><CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
              {formData.is_multidisciplinar ? availableMembersByArea.map(group => {
                const hasSearch = memberSearch.trim().length > 0;
                const collapsed = collapsedAreaGroups.has(group.area_id) && !hasSearch;
                const allSelected = group.members.length > 0 && group.members.every(member => formData.member_ids.includes(member.id));
                return <CommandGroup key={group.area_id}>
                  <CommandItem value={`__area_header_${group.area_id}__ ${group.area_name} ${group.cluster_name}`} onSelect={() => toggleAreaGroup(group.area_id)} className="bg-muted/40 data-[selected=true]:bg-muted data-[selected=true]:text-foreground font-semibold">
                    {collapsed ? <ChevronRight className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="flex-1 truncate">{group.area_name}</span>{group.cluster_name && <span className="ml-2 text-xs font-normal text-muted-foreground truncate">{group.cluster_name}</span>}<Badge variant="secondary" className="ml-2 text-xs">{group.members.length}</Badge>
                  </CommandItem>
                  {!collapsed && <>
                    <CommandItem value={`__select_all_area_${group.area_id}__`} onSelect={() => selectMembers(group.members.map(member => member.id))} className="pl-6"><Check className={`mr-2 h-4 w-4 ${allSelected ? 'opacity-100' : 'opacity-0'}`} /><span className="font-medium">Selecionar todos da área</span></CommandItem>
                    {hasSearch || group.equipes.length <= 1 ? group.members.map(member => <CommandItem key={`${group.area_id}-${member.id}`} value={`${member.first_name} ${member.last_name} ${group.area_name}`} onSelect={() => handleMemberToggle(member.id)} className="pl-6"><Check className={`mr-2 h-4 w-4 ${formData.member_ids.includes(member.id) ? 'opacity-100' : 'opacity-0'}`} />{member.first_name} {member.last_name}</CommandItem>)
                      : group.equipes.map((team, index) => <Fragment key={team.equipe_id}>
                        <div className={`px-2 ${index === 0 ? 'pt-1' : 'pt-2'} pb-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/70 border-t border-border/40 ${index === 0 ? 'border-t-0' : ''}`}>{team.equipe_name}</div>
                        {team.members.map(member => <CommandItem key={`${group.area_id}-${team.equipe_id}-${member.id}`} value={`${member.first_name} ${member.last_name} ${group.area_name} ${team.equipe_name}`} onSelect={() => handleMemberToggle(member.id)} className="pl-6"><Check className={`mr-2 h-4 w-4 ${formData.member_ids.includes(member.id) ? 'opacity-100' : 'opacity-0'}`} />{member.first_name} {member.last_name}</CommandItem>)}
                      </Fragment>)}
                  </>}
                </CommandGroup>;
              }) : <CommandGroup>
                <CommandItem value="__select_all__" onSelect={() => selectMembers(availableMembers.map(member => member.id))}><Check className={`mr-2 h-4 w-4 ${availableMembers.length > 0 && availableMembers.every(member => formData.member_ids.includes(member.id)) ? 'opacity-100' : 'opacity-0'}`} /><span className="font-medium">Selecionar todos</span></CommandItem>
                {availableMembers.map(member => <CommandItem key={member.id} value={`${member.first_name} ${member.last_name}`} onSelect={() => handleMemberToggle(member.id)}><Check className={`mr-2 h-4 w-4 ${formData.member_ids.includes(member.id) ? 'opacity-100' : 'opacity-0'}`} />{member.first_name} {member.last_name}</CommandItem>)}
              </CommandGroup>}
            </CommandList>
          </Command></PopoverContent></Popover>}
      {formData.member_ids.length > 0 && <p className="text-xs text-muted-foreground mt-1">{formData.member_ids.length} membro{formData.member_ids.length !== 1 ? 's' : ''} selecionado{formData.member_ids.length !== 1 ? 's' : ''}</p>}
    </div>;

  // Na edição, líder e membros dividem a linha: são dois seletores curtos e a
  // coluna do projeto é larga: empilhados, a seção não caberia na altura do
  // diálogo. Na criação (modal estreito) segue tudo empilhado.
  if (!withResponsavel) return <div className="space-y-3">
    <div className="grid gap-4 sm:grid-cols-2">{liderField}{membrosField}</div>
    {withMultidisciplinar && multidisciplinarRow}
  </div>;

  return <div className="space-y-4">
    {liderField}
    {responsavelField}
    {multidisciplinarRow}
    {membrosField}
  </div>;
}
