// Toolbar das páginas de cadastro: busca textual única + contagem discreta.
// Substitui FiltrosBar + PageStats no padrão "Cadastro Puro". O slot `extra`
// permite a uma página encaixar um quick-filter pontual sem retrabalho.

import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { DicaIcon } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';

interface Props {
  busca: string;
  onBusca: (valor: string) => void;
  /** Total de registros no escopo (após cluster global, antes da busca). */
  total: number;
  /** Registros visíveis após a busca. */
  visiveis: number;
  /** Substantivo [singular, plural] para a contagem. */
  substantivo: [string, string];
  placeholder?: string;
  extra?: ReactNode;
}

export default function CadastroToolbar({ busca, onBusca, total, visiveis, substantivo, placeholder, extra }: Props) {
  const plural = total === 1 ? substantivo[0] : substantivo[1];
  const contagem = visiveis === total
    ? `${total} ${plural}`
    : `${visiveis} de ${total} ${substantivo[1]}`;

  return (
    <div className="cadastro-toolbar">
      <label className="cadastro-busca" data-tour="page-search">
        <Search size={15} strokeWidth={2.2} />
        <DicaIcon text={dica('comum.busca')} />
        <input
          type="text"
          value={busca}
          onChange={(e) => onBusca(e.target.value)}
          placeholder={placeholder || 'Buscar...'}
          aria-label="Buscar"
        />
        {busca && (
          <button
            type="button"
            className="cadastro-busca-limpar"
            onClick={() => onBusca('')}
            aria-label="Limpar busca"
            title="Limpar busca"
          >
            <X size={14} />
          </button>
        )}
      </label>
      {extra}
      <span className="cadastro-contagem">{contagem}</span>
    </div>
  );
}
