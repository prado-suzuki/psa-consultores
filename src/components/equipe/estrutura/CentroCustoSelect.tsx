import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCentroCustoList } from '@/hooks/useCategorias';

interface CentroCustoSelectProps {
  /** `''` = nenhum centro de custo. */
  value: string;
  onChange: (centroCustoId: string) => void;
  /** Texto de apoio abaixo do campo (o significado muda entre cluster e área). */
  ajuda?: string;
  /** Rótulo da opção vazia: na área,"sem CC próprio" significa herdar do cluster. */
  rotuloVazio?: string;
}

const NENHUM = '_none';

/**
 * Seleção de centro de custo, usada pelo diálogo de cluster e pelo de área.
 *
 * Existe para o campo não ser reescrito em cada formulário: antes havia três
 * cópias, que já divergiam entre si (uma filtrava inativos, as outras não).
 * O cadastro dos centros de custo é dono da lista — aqui só se referencia.
 */
export default function CentroCustoSelect({
  value, onChange, ajuda, rotuloVazio = 'Nenhum',
}: CentroCustoSelectProps) {
  const { data: centrosCusto = [] } = useCentroCustoList();
  // Inativo continua aparecendo se já estiver selecionado, senão o campo"esvazia" sozinho.
  const opcoes = centrosCusto.filter(cc => cc.is_active || cc.id === value);

  return (
    <>
      <Select value={value || NENHUM} onValueChange={v => onChange(v === NENHUM ? '' : v)}>
        <SelectTrigger><SelectValue placeholder={rotuloVazio} /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NENHUM}>{rotuloVazio}</SelectItem>
          {opcoes.map(cc => (
            <SelectItem key={cc.id} value={cc.id}>
              {cc.codigo} - {cc.nome}{cc.is_active ? '' : ' (inativo)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {ajuda && <p className="mt-1 text-xs text-slate-400">{ajuda}</p>}
    </>
  );
}
