import { Filter, MapPin, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  situacaoLabel,
  type FiltrosDoControle,
  type LinhaDoControle,
} from '@/lib/osgControleDeProjetos';
import { getRegiaoLabel } from '@/lib/regioes';

interface Props {
  filtros: FiltrosDoControle;
  setFiltros: (filtros: FiltrosDoControle) => void;
  opcoes: { situacoes: string[]; regioes: string[] };
  total: number;
  visiveis: number;
  vencidas: number;
}

/**
 * Barra de filtros do Controle de Projetos.
 *
 * A busca é um campo de texto e não um seletor de cliente: na planilha a equipe
 * achava a linha com Ctrl+F, e o que ela digitava tanto era nome de cliente
 * quanto número de OS quanto um pedaço da observação. Um `SelecaoDeCliente`
 * responderia só a primeira das três.
 */
export function ControleDeProjetosToolbar({
  filtros,
  setFiltros,
  opcoes,
  total,
  visiveis,
  vencidas,
}: Props) {
  const temFiltro = Boolean(filtros.busca || filtros.situacao || filtros.regiao);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-sm text-muted-foreground">
          {temFiltro ? `${visiveis} de ${total} ordens de serviço` : `${total} ordens de serviço`}
        </p>
        {vencidas > 0 && (
          <p className="text-sm font-medium text-destructive">
            {vencidas} com prazo vencido
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />

        <div className="relative w-full min-w-0 sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filtros.busca}
            onChange={(evento) => setFiltros({ ...filtros, busca: evento.target.value })}
            placeholder="Cliente, número da OS ou observação"
            className="pl-9"
            aria-label="Buscar por cliente, número da OS ou observação"
          />
        </div>

        <Select
          value={filtros.situacao || 'all'}
          onValueChange={(valor) =>
            setFiltros({ ...filtros, situacao: valor === 'all' ? '' : valor })
          }
        >
          <SelectTrigger className="w-44" aria-label="Filtrar por situação">
            <SelectValue placeholder="Situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as situações</SelectItem>
            {opcoes.situacoes.map((situacao) => (
              <SelectItem key={situacao} value={situacao}>
                {situacaoLabel(situacao)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtros.regiao || 'all'}
          onValueChange={(valor) => setFiltros({ ...filtros, regiao: valor === 'all' ? '' : valor })}
        >
          <SelectTrigger className="w-56" aria-label="Filtrar por região">
            <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Região" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as regiões</SelectItem>
            {opcoes.regioes.map((regiao) => (
              <SelectItem key={regiao} value={regiao}>
                {getRegiaoLabel(regiao)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {temFiltro && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFiltros({ busca: '', situacao: '', regiao: '' })}
          >
            <X className="mr-1 h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}

/** Reexportado para a página não precisar conhecer o tipo da lista. */
export type { LinhaDoControle };
