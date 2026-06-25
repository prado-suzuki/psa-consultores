import { MultiSelectCombobox } from './MultiSelectCombobox';

/**
 * Seletor de clusters com "Todos os clusters" como PRIMEIRO item da lista
 * (não toggle). Modela o valor como { all, ids }:
 *  - escolher "Todos os clusters" → { all: true, ids: [] }
 *  - escolher clusters específicos → { all: false, ids: [...] }
 * Selecionar um específico enquanto "Todos" está ativo troca para o específico.
 */
const ALL = '__all__';

export interface ClusterAccessValue {
  all: boolean;
  ids: string[];
}

interface ClusterAccessSelectProps {
  clusters: { id: string; name: string }[];
  value: ClusterAccessValue;
  onChange: (v: ClusterAccessValue) => void;
  className?: string;
}

export function ClusterAccessSelect({ clusters, value, onChange, className }: ClusterAccessSelectProps) {
  const options = [
    { value: ALL, label: 'Todos os clusters' },
    ...clusters.map((c) => ({ value: c.id, label: c.name })),
  ];
  const selected = value.all ? [ALL] : value.ids;

  const handle = (next: string[]) => {
    const hasAll = next.includes(ALL);
    // acabou de marcar "Todos" → tudo
    if (hasAll && !value.all) return onChange({ all: true, ids: [] });
    // "Todos" estava ativo e marcou um específico → vira específico (tira o "Todos")
    if (hasAll && value.all) {
      const ids = next.filter((v) => v !== ALL);
      return onChange(ids.length ? { all: false, ids } : { all: true, ids: [] });
    }
    // sem "Todos"
    onChange({ all: false, ids: next });
  };

  return (
    <MultiSelectCombobox
      options={options}
      selected={selected}
      onChange={handle}
      placeholder="Adicionar clusters…"
      searchPlaceholder="Buscar cluster…"
      emptyText="Nenhum cluster."
      addLabel="adicionar cluster"
      className={className}
    />
  );
}
