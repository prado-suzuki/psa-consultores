import { useMemo } from 'react';

import { SingleSelectCombobox } from '@/components/ui/SingleSelectCombobox';
import type { ComboOption } from '@/components/ui/MultiSelectCombobox';
import { useCnpjsPorCliente } from '@/hooks/useCnpjsPorCliente';
import { grafiasDeDocumento, resumoDeDocumentos } from '@/lib/buscaEmCombobox';

/**
 * O campo "cliente" do sistema. UM lugar, e é o ponto dele.
 *
 * Antes de existir, cada tela montava o próprio `Select` com `clientes.map()`
 * inline — 22 arquivos com a mesma lógica escrita à mão. Trocar só o `Select`
 * pelo combobox resolveria a APARÊNCIA num lugar e deixaria o CONTEÚDO (o que
 * a lista mostra, o que a busca enxerga) copiado 22 vezes. É esta camada que
 * fecha a segunda metade: mudar aqui muda em todas.
 *
 * A lista de clientes continua vindo de fora, por prop, porque cada tela já
 * tem o próprio hook com o próprio recorte (cluster, ambiente, ativo). Quem
 * este componente busca sozinho é só o índice de CNPJ, que é igual para todas
 * — ver `useCnpjsPorCliente`.
 */

/** O mínimo que uma tela precisa ter de um cliente. Aceita a forma de qualquer hook da casa. */
export interface ClienteSelecionavel {
  id: string;
  nome?: string | null;
}

interface SelecaoDeClienteProps {
  clientes: ClienteSelecionavel[] | undefined;
  /** String vazia = nada escolhido. É a forma que as telas já usam. */
  value: string;
  onChange: (clienteId: string) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  id?: string;
  /**
   * Repassados ao gatilho. Existem porque o `FormControl` do react-hook-form é
   * um `Slot`: ele injeta `id`, `aria-describedby` e `aria-invalid` no filho, e
   * um componente que não os declara os descarta em silêncio — a mensagem de
   * erro do campo deixa de ser anunciada, sem aviso nenhum.
   */
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

export function SelecaoDeCliente({
  clientes,
  value,
  onChange,
  loading = false,
  disabled = false,
  placeholder = 'Selecione um cliente',
  emptyText = 'Nenhum cliente encontrado.',
  className,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: SelecaoDeClienteProps) {
  const cnpjsPorCliente = useCnpjsPorCliente();

  const options = useMemo<ComboOption[]>(
    () =>
      (clientes ?? []).map((cliente) => {
        const cnpjs = cnpjsPorCliente[cliente.id] ?? [];
        return {
          value: cliente.id,
          label: cliente.nome ?? '',
          hint: resumoDeDocumentos(cnpjs),
          keywords: cnpjs.flatMap(grafiasDeDocumento),
        };
      }),
    [clientes, cnpjsPorCliente],
  );

  return (
    <SingleSelectCombobox
      id={id}
      options={options}
      value={value || null}
      onChange={(escolhido) => onChange(escolhido ?? '')}
      disabled={disabled || loading}
      placeholder={loading ? 'Carregando...' : placeholder}
      emptyText={emptyText}
      className={className}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
    />
  );
}
