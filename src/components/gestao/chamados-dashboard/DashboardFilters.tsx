import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type DashboardFilters as Filters,
  departmentLabels,
  periodoLabels,
} from '@/lib/gestaoChamadosDashboardAnalytics';

interface NamedOption {
  id: string;
  name: string;
}

interface DashboardFiltersProps {
  filters: Filters;
  /** Nomes de cliente presentes nos chamados carregados, já ordenados. */
  clientes: string[];
  areas: NamedOption[];
  clusters: NamedOption[];
  onChange: (filters: Filters) => void;
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function DashboardFilters({
  filters,
  clientes,
  areas,
  clusters,
  onChange,
}: DashboardFiltersProps) {
  const update = (field: keyof Filters) => (value: string) =>
    onChange({ ...filters, [field]: value });
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <FilterSelect
          label="Período"
          value={filters.periodo}
          options={Object.entries(periodoLabels)}
          onChange={update('periodo')}
        />
        <FilterSelect
          label="Cliente"
          value={filters.cliente}
          options={[
            ['todos', 'Todos'],
            ...clientes.map((nome) => [nome, nome] as [string, string]),
          ]}
          onChange={update('cliente')}
        />
        <FilterSelect
          label="Departamento"
          value={filters.departamento}
          options={[['todos', 'Todos'], ...Object.entries(departmentLabels)]}
          onChange={update('departamento')}
        />
        <FilterSelect
          label="Área"
          value={filters.area}
          options={[
            ['todos', 'Todas'],
            ...areas.map(({ id, name }) => [id, name] as [string, string]),
          ]}
          onChange={update('area')}
        />
        <FilterSelect
          label="Cluster"
          value={filters.cluster}
          options={[
            ['todos', 'Todos'],
            ...clusters.map(({ id, name }) => [id, name] as [string, string]),
          ]}
          onChange={update('cluster')}
        />
      </div>
    </div>
  );
}
