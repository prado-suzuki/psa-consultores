 import { useState } from 'react';
 import { Search, Filter, X, User } from 'lucide-react';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import {
   Popover,
   PopoverContent,
   PopoverTrigger,
 } from '@/components/ui/popover';
 import { Checkbox } from '@/components/ui/checkbox';
 import { Label } from '@/components/ui/label';
 import { Calendar } from '@/components/ui/calendar';
 import { format } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { 
   TaskFilters as TaskFiltersType,
   FiscalTaskStatus,
   FiscalTaskPriority,
   FiscalTaskDepartment
 } from '@/hooks/useFiscalTasks';
 
 interface TaskFiltersProps {
   filters: TaskFiltersType;
   onFiltersChange: (filters: TaskFiltersType) => void;
   teamMembers: { id: string; name: string }[];
 }
 
 const statusOptions: { value: FiscalTaskStatus; label: string }[] = [
   { value: 'backlog', label: 'Backlog' },
   { value: 'todo', label: 'A Fazer' },
   { value: 'in_progress', label: 'Em Progresso' },
   { value: 'review', label: 'Revisão' },
   { value: 'done', label: 'Concluído' },
 ];
 
 const priorityOptions: { value: FiscalTaskPriority; label: string }[] = [
   { value: 'urgent', label: 'Urgente' },
   { value: 'high', label: 'Alta' },
   { value: 'medium', label: 'Média' },
   { value: 'low', label: 'Baixa' },
 ];
 
 const departmentOptions: { value: FiscalTaskDepartment; label: string }[] = [
   { value: 'commercial', label: 'Comercial' },
   { value: 'financial', label: 'Financeiro' },
   { value: 'administrative', label: 'Administrativo' },
   { value: 'operations', label: 'Operações' },
 ];
 
 export const TaskFilters = ({ filters, onFiltersChange, teamMembers }: TaskFiltersProps) => {
   const [showAdvanced, setShowAdvanced] = useState(false);
 
   const handleSearchChange = (value: string) => {
     onFiltersChange({ ...filters, search: value || undefined });
   };
 
   const handleAssignedToChange = (value: string) => {
     onFiltersChange({ 
       ...filters, 
       assignedTo: value === 'all' ? undefined : value as 'mine' | string 
     });
   };
 
   const toggleStatusFilter = (status: FiscalTaskStatus) => {
     const current = filters.status || [];
     const updated = current.includes(status)
       ? current.filter(s => s !== status)
       : [...current, status];
     onFiltersChange({ ...filters, status: updated.length > 0 ? updated : undefined });
   };
 
   const togglePriorityFilter = (priority: FiscalTaskPriority) => {
     const current = filters.priority || [];
     const updated = current.includes(priority)
       ? current.filter(p => p !== priority)
       : [...current, priority];
     onFiltersChange({ ...filters, priority: updated.length > 0 ? updated : undefined });
   };
 
   const toggleDepartmentFilter = (department: FiscalTaskDepartment) => {
     const current = filters.department || [];
     const updated = current.includes(department)
       ? current.filter(d => d !== department)
       : [...current, department];
     onFiltersChange({ ...filters, department: updated.length > 0 ? updated : undefined });
   };
 
   const removeFilter = (type: keyof TaskFiltersType, value?: string) => {
     if (type === 'status' && value) {
       toggleStatusFilter(value as FiscalTaskStatus);
     } else if (type === 'priority' && value) {
       togglePriorityFilter(value as FiscalTaskPriority);
     } else if (type === 'department' && value) {
       toggleDepartmentFilter(value as FiscalTaskDepartment);
     } else {
       onFiltersChange({ ...filters, [type]: undefined });
     }
   };
 
   const activeFiltersCount = 
     (filters.status?.length || 0) + 
     (filters.priority?.length || 0) + 
     (filters.department?.length || 0) +
     (filters.startDate ? 1 : 0) +
     (filters.endDate ? 1 : 0);
 
   return (
     <div className="space-y-3">
       <div className="flex items-center gap-3">
         <div className="relative flex-1 max-w-sm">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Buscar tarefas..."
             value={filters.search || ''}
             onChange={(e) => handleSearchChange(e.target.value)}
             className="pl-9"
           />
         </div>
 
         <Select
           value={filters.assignedTo || 'all'}
           onValueChange={handleAssignedToChange}
         >
           <SelectTrigger className="w-48">
             <User className="h-4 w-4 mr-2" />
             <SelectValue placeholder="Responsável" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">Todas</SelectItem>
             <SelectItem value="mine">Minhas</SelectItem>
             {teamMembers.map(member => (
               <SelectItem key={member.id} value={member.id}>
                 {member.name}
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
 
         <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
           <PopoverTrigger asChild>
             <Button variant="outline" className="gap-2">
               <Filter className="h-4 w-4" />
               Filtros
               {activeFiltersCount > 0 && (
                 <Badge variant="secondary" className="ml-1">
                   {activeFiltersCount}
                 </Badge>
               )}
             </Button>
           </PopoverTrigger>
           <PopoverContent className="w-80" align="end">
             <div className="space-y-4">
               <div>
                 <Label className="text-sm font-medium">Status</Label>
                 <div className="grid grid-cols-2 gap-2 mt-2">
                   {statusOptions.map(option => (
                     <div key={option.value} className="flex items-center gap-2">
                       <Checkbox
                         id={`status-${option.value}`}
                         checked={filters.status?.includes(option.value)}
                         onCheckedChange={() => toggleStatusFilter(option.value)}
                       />
                       <Label htmlFor={`status-${option.value}`} className="text-sm">
                         {option.label}
                       </Label>
                     </div>
                   ))}
                 </div>
               </div>
 
               <div>
                 <Label className="text-sm font-medium">Prioridade</Label>
                 <div className="grid grid-cols-2 gap-2 mt-2">
                   {priorityOptions.map(option => (
                     <div key={option.value} className="flex items-center gap-2">
                       <Checkbox
                         id={`priority-${option.value}`}
                         checked={filters.priority?.includes(option.value)}
                         onCheckedChange={() => togglePriorityFilter(option.value)}
                       />
                       <Label htmlFor={`priority-${option.value}`} className="text-sm">
                         {option.label}
                       </Label>
                     </div>
                   ))}
                 </div>
               </div>
 
               <div>
                 <Label className="text-sm font-medium">Departamento</Label>
                 <div className="grid grid-cols-2 gap-2 mt-2">
                   {departmentOptions.map(option => (
                     <div key={option.value} className="flex items-center gap-2">
                       <Checkbox
                         id={`dept-${option.value}`}
                         checked={filters.department?.includes(option.value)}
                         onCheckedChange={() => toggleDepartmentFilter(option.value)}
                       />
                       <Label htmlFor={`dept-${option.value}`} className="text-sm">
                         {option.label}
                       </Label>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
           </PopoverContent>
         </Popover>
       </div>
 
       {/* Active filters badges */}
       {(filters.status?.length || filters.priority?.length || filters.department?.length) && (
         <div className="flex flex-wrap gap-2">
           {filters.status?.map(status => (
             <Badge key={status} variant="secondary" className="gap-1">
               {statusOptions.find(o => o.value === status)?.label}
               <X 
                 className="h-3 w-3 cursor-pointer" 
                 onClick={() => removeFilter('status', status)} 
               />
             </Badge>
           ))}
           {filters.priority?.map(priority => (
             <Badge key={priority} variant="secondary" className="gap-1">
               {priorityOptions.find(o => o.value === priority)?.label}
               <X 
                 className="h-3 w-3 cursor-pointer" 
                 onClick={() => removeFilter('priority', priority)} 
               />
             </Badge>
           ))}
           {filters.department?.map(dept => (
             <Badge key={dept} variant="secondary" className="gap-1">
               {departmentOptions.find(o => o.value === dept)?.label}
               <X 
                 className="h-3 w-3 cursor-pointer" 
                 onClick={() => removeFilter('department', dept)} 
               />
             </Badge>
           ))}
         </div>
       )}
     </div>
   );
 };