import { useMemo, type CSSProperties, type ReactNode } from 'react';

import { SingleSelectCombobox } from '@/components/ui/SingleSelectCombobox';
import type { ComboOption } from '@/components/ui/MultiSelectCombobox';
import { grafiasDeDocumento } from '@/lib/buscaEmCombobox';

/**
 * O campo "contribuinte" do sistema. Par do [[SelecaoDeCliente]], e mais simples
 * que ele por um motivo de banco: contribuinte TEM `cpf_cnpj` na própria linha,
 * então não há índice a buscar — o CNPJ chega junto da lista, de graça.
 *
 * Chega quando a consulta da tela pediu a coluna. Onde ela não pediu (há hooks
 * que selecionam só `id, nome_razao_social`), o campo funciona igual e apenas
 * não mostra nem busca por CNPJ. É degradação silenciosa DE PROPÓSITO: obrigar
 * a coluna faria este componente quebrar metade das telas no dia em que
 * entrasse nelas.
 */

/** O mínimo que uma tela precisa ter de um contribuinte. */
export interface ContribuinteSelecionavel {
  id: string;
  nome_razao_social?: string | null;
  cpf_cnpj?: string | null;
}

interface SelecaoDeContribuinteProps {
  contribuintes: ContribuinteSelecionavel[] | undefined;
  /** String vazia = nada escolhido. */
  value: string;
  onChange: (contribuinteId: string) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  id?: string;
  /** Estilo do gatilho. */
  style?: CSSProperties;
  /** Desenhado à esquerda do rótulo, dentro do gatilho. */
  icone?: ReactNode;
  /** Rótulo de uma primeira linha que limpa o campo ("Todos os clientes"). */
  opcaoVazia?: string;
  /** Avisa quando a lista abre e fecha. */
  onOpenChange?: (aberto: boolean) => void;
  /**
   * Repassados ao gatilho. Existem porque o `FormControl` do react-hook-form é
   * um `Slot`: ele injeta `id`, `aria-describedby` e `aria-invalid` no filho, e
   * um componente que não os declara os descarta em silêncio — a mensagem de
   * erro do campo deixa de ser anunciada, sem aviso nenhum.
   */
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
}

export function SelecaoDeContribuinte({
  contribuintes,
  value,
  onChange,
  loading = false,
  disabled = false,
  placeholder = 'Selecione um contribuinte',
  emptyText = 'Nenhum contribuinte encontrado.',
  className,
  id,
  style,
  icone,
  opcaoVazia,
  onOpenChange,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
}: SelecaoDeContribuinteProps) {
  const options = useMemo<ComboOption[]>(
    () =>
      (contribuintes ?? []).map((contribuinte) => {
        const grafias = grafiasDeDocumento(contribuinte.cpf_cnpj);
        return {
          value: contribuinte.id,
          label: contribuinte.nome_razao_social ?? '',
          hint: grafias[0],
          keywords: grafias,
        };
      }),
    [contribuintes],
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
      style={style}
      icone={icone}
      opcaoVazia={opcaoVazia}
      onOpenChange={onOpenChange}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      aria-required={ariaRequired}
    />
  );
}
