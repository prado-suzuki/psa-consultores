import { useMemo } from 'react';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectSeparator, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useEstruturaClusters } from '@/hooks/useEstruturaManager';

interface ClusterSelectProps {
  /** `''` = nenhum cluster. */
  value: string;
  onChange: (clusterId: string) => void;
}

/**
 * Seleção de cluster usada nos cadastros de produto e serviço.
 * Clusters inativos são legado da fusão com `empresas_faturamento`: continuam
 * selecionáveis (há dados apontando para eles), mas separados no fim da lista.
 */
export default function ClusterSelect({ value, onChange }: ClusterSelectProps) {
  const { data: clusters = [] } = useEstruturaClusters();
  const ativos = useMemo(() => clusters.filter(c => c.is_active), [clusters]);
  const inativos = useMemo(() => clusters.filter(c => !c.is_active), [clusters]);

  return (
    <Select value={value || 'none'} onValueChange={v => onChange(v === 'none' ? '' : v)}>
      <SelectTrigger><SelectValue placeholder="Selecione um cluster..." /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nenhum</SelectItem>
        {ativos.map(c => (
          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
        ))}
        {inativos.length > 0 && (
          <SelectGroup>
            <SelectSeparator />
            <SelectLabel className="text-slate-400">Inativos</SelectLabel>
            {inativos.map(c => (
              <SelectItem key={c.id} value={c.id} className="text-slate-500">{c.name}</SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}
