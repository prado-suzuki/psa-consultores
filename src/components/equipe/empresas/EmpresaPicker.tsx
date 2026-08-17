import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { encontrarEmpresa, listarEmpresasCadastradas } from '@/lib/empresasFaturamento';
import { useEstruturaClusters } from '@/hooks/useEstruturaManager';

export interface EmpresaValor {
  nome: string;
  cnpj: string;
}

interface EmpresaPickerProps {
  value: EmpresaValor;
  onChange: (valor: EmpresaValor) => void;
  /** Cluster em edição — não entra como "outro cluster que usa a empresa". */
  clusterAtualId?: string | null;
}

const SEM_EMPRESA = '_nenhuma';
const NOVA_EMPRESA = '_nova';

/**
 * Escolhe a empresa de faturamento entre as já cadastradas — razão social e CNPJ
 * vêm juntos, então não se redigita o que já existe, e a mesma empresa não vira
 * duas grafias. Os campos ficam visíveis para completar um CNPJ que falta,
 * corrigir a razão social ou cadastrar uma empresa nova.
 *
 * As empresas são derivadas de `estrutura_clusters`: a empresa é par de colunas
 * do cluster, não uma entidade própria (ver `lib/empresasFaturamento`).
 */
export default function EmpresaPicker({ value, onChange, clusterAtualId }: EmpresaPickerProps) {
  const { data: clusters = [] } = useEstruturaClusters();
  const empresas = useMemo(() => listarEmpresasCadastradas(clusters), [clusters]);
  const selecionada = encontrarEmpresa(empresas, value.nome);

  // Nome preenchido fora da lista = empresa nova/renomeada sendo digitada.
  const [digitando, setDigitando] = useState(false);
  const modoLivre = digitando || (!!value.nome.trim() && !selecionada);
  // Os campos ficam à mostra sempre que há empresa: é onde se completa um CNPJ
  // que ainda não foi informado ou se corrige a razão social.
  const mostrarCampos = modoLivre || !!value.nome.trim();

  const valorSelect = selecionada ? selecionada.nome : modoLivre ? NOVA_EMPRESA : SEM_EMPRESA;

  const handleSelect = (valor: string) => {
    if (valor === NOVA_EMPRESA) {
      setDigitando(true);
      onChange({ nome: '', cnpj: '' });
      return;
    }
    setDigitando(false);
    if (valor === SEM_EMPRESA) {
      onChange({ nome: '', cnpj: '' });
      return;
    }
    const empresa = empresas.find(e => e.nome === valor);
    onChange({ nome: empresa?.nome || '', cnpj: empresa?.cnpj || '' });
  };

  const outrosClusters = selecionada
    ? selecionada.clusters.filter(c => c.id !== clusterAtualId).map(c => c.name)
    : [];

  return (
    <div className="space-y-2">
      <div>
        <Label>Empresa de faturamento</Label>
        <Select value={valorSelect} onValueChange={handleSelect}>
          <SelectTrigger><SelectValue placeholder="Selecionar empresa..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value={SEM_EMPRESA}>Nenhuma</SelectItem>
            {empresas.map(empresa => (
              <SelectItem key={empresa.nome} value={empresa.nome}>
                {empresa.nome}{empresa.cnpj ? ` · ${empresa.cnpj}` : ''}
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectItem value={NOVA_EMPRESA}>+ Cadastrar nova empresa...</SelectItem>
          </SelectContent>
        </Select>
        {outrosClusters.length > 0 && (
          <p className="mt-1 text-xs text-slate-400">
            Também usada em {outrosClusters.join(', ')}.
          </p>
        )}
      </div>

      {mostrarCampos && (
        <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50/60 p-3">
          <div>
            <Label className="text-xs">Razão social</Label>
            <Input
              value={value.nome}
              onChange={e => onChange({ ...value, nome: e.target.value })}
              placeholder="Ex: PSA Consultores Ltda"
              className="bg-white"
            />
          </div>
          <div>
            <Label className="text-xs">CNPJ</Label>
            <Input
              value={value.cnpj}
              onChange={e => onChange({ ...value, cnpj: e.target.value })}
              placeholder="00.000.000/0000-00"
              className="bg-white"
            />
            {selecionada && !selecionada.cnpj && (
              <p className="mt-1 text-xs text-amber-700">
                Esta empresa ainda está sem CNPJ — informe aqui.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
