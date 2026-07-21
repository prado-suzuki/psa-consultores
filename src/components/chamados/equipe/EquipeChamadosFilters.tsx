import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EquipeChamadosFilters as Filters } from '@/lib/equipeChamados';

interface NamedOption { id: string; name: string }
interface EquipeChamadosFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  mostrarUrgentes: boolean;
  onMostrarUrgentesChange: (checked: boolean) => void;
  areas: NamedOption[];
  clusters: NamedOption[];
  filteredCount: number;
  totalCount: number;
  onReset: () => void;
}

export function EquipeChamadosFilters({ filters, onFiltersChange, mostrarUrgentes, onMostrarUrgentesChange, areas, clusters, filteredCount, totalCount, onReset }: EquipeChamadosFiltersProps) {
  const update = (field: keyof Filters, value: string) => onFiltersChange({ ...filters, [field]: value });
  return (
    <Card className="mb-6">
      <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <FilterSelect label="Período" value={filters.periodo} onChange={(value) => update('periodo', value)} options={[
            ['todas', 'Todas as datas'], ['hoje', 'Hoje'], ['7dias', 'Últimos 7 dias'], ['30dias', 'Últimos 30 dias'], ['mes', 'Este mês'],
          ]} />
          <FilterSelect label="Status" value={filters.status} onChange={(value) => update('status', value)} options={[
            ['todos', 'Todos'], ['aberto', 'Aberto'], ['em_andamento', 'Em Andamento'], ['resolvido', 'Resolvido'], ['fechado', 'Fechado'],
          ]} />
          <FilterSelect label="Prioridade" value={filters.prioridade} onChange={(value) => update('prioridade', value)} options={[
            ['todas', 'Todas'], ['baixa', 'Baixa'], ['normal', 'Normal'], ['alta', 'Alta'], ['urgente', 'Urgente'],
          ]} />
          <FilterSelect label="Departamento" value={filters.departamento} onChange={(value) => update('departamento', value)} options={[
            ['todos', 'Todos Departamentos'], ['contabilidade', 'Contabilidade/Societário'], ['icms_ipi', 'ICMS/IPI'], ['irpj_csll', 'IRPJ/CSLL'], ['pis_cofins', 'PIS/COFINS'], ['produtor_rural', 'Produtor Rural PF'], ['outros', 'Outros'],
          ]} />
          <FilterSelect label="Área" value={filters.area} onChange={(value) => update('area', value)} options={[
            ['todos', 'Todas Áreas'], ...areas.map((area) => [area.id, area.name] as [string, string]),
          ]} />
          <FilterSelect label="Cluster" value={filters.cluster} onChange={(value) => update('cluster', value)} options={[
            ['todos', 'Todos'], ...clusters.map((cluster) => [cluster.id, cluster.name] as [string, string]),
          ]} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label>ID do Chamado</Label>
            <Input placeholder="Buscar por ID" value={filters.searchId} onChange={(event) => update('searchId', event.target.value)} />
          </div>
          <div className="flex items-center gap-2 h-10">
            <Checkbox id="urgentes" checked={mostrarUrgentes} onCheckedChange={(checked) => onMostrarUrgentesChange(checked === true)} />
            <Label htmlFor="urgentes" className="text-sm cursor-pointer">Apenas urgentes (&lt; 2 dias)</Label>
          </div>
          <Button variant="outline" onClick={onReset}>Limpar Filtros</Button>
          <div className="text-sm text-muted-foreground">{filteredCount} de {totalCount} chamados</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FilterSelectProps { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }
function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(([optionValue, text]) => <SelectItem key={optionValue} value={optionValue}>{text}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
