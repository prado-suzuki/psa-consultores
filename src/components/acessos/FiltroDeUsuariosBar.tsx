import { useMemo } from 'react';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SEM_AREA, contarUsuariosPorArea, type AreaResumo, type AreasPorUsuario } from '@/lib/acessosPorArea';
import {
  FILTRO_VAZIO,
  ORDEM_DE_PAPEIS,
  contarPorPapel,
  filtroEstaVazio,
  type FiltroDeUsuarios,
  type UsuarioFiltravel,
} from '@/lib/filtroDeUsuarios';
import { ROLE_SHORT_LABELS } from './roleOptions';
import { PontoDaArea } from './PontoDaArea';
import type { AppRole } from '@/hooks/useUsersWithRoles';

/**
 * A barra de busca, papel e área da matriz de acessos.
 *
 * Ela existe porque a matriz mostra a POPULAÇÃO inteira — 68 linhas — e o gesto
 * de"ajustar o papel de meia dúzia de pessoas" começa por achar essas seis. Sem
 * filtro, a seleção em lote seria rolar e caçar.
 *
 * As contagens são de propósito calculadas sobre a lista SEM filtro: o número ao
 * lado de"Membro (14)" tem de dizer quantos membros existem, não quantos
 * sobraram do filtro anterior — senão ele zera junto com a lista e deixa de
 * servir para navegar.
 */
export interface FiltroDeUsuariosBarProps {
  filtro: FiltroDeUsuarios;
  onChange: (filtro: FiltroDeUsuarios) => void;
  /** Lista completa, sem filtro — é dela que saem as contagens. */
  usuarios: UsuarioFiltravel[];
  areas: AreaResumo[];
  areasPorUsuario: AreasPorUsuario;
  /** Quantas linhas o filtro deixou passar, para o"mostrando N de M". */
  visiveis: number;
}

export const FiltroDeUsuariosBar = ({
  filtro,
  onChange,
  usuarios,
  areas,
  areasPorUsuario,
  visiveis,
}: FiltroDeUsuariosBarProps) => {
  const contagemPorPapel = useMemo(() => contarPorPapel(usuarios), [usuarios]);

  const contagemPorArea = useMemo(
    () => contarUsuariosPorArea(usuarios.map((u) => u.id), areasPorUsuario),
    [usuarios, areasPorUsuario],
  );

  // Só entram no seletor as áreas com gente dentro — área recém-criada e ainda
  // vazia não vira opção que não filtra nada. Mesma regra da aba de Usuários.
  const opcoesDeArea = useMemo(() => {
    const comGente = areas.filter((a) => (contagemPorArea[a.id] ?? 0) > 0);
    if (!comGente.length && !contagemPorArea[SEM_AREA]) return [];
    return [
      ...comGente,
      ...(contagemPorArea[SEM_AREA]
        ? [{ id: SEM_AREA, name: 'Sem área', color: null, color_index: null }]
        : []),
    ];
  }, [areas, contagemPorArea]);

  const limpo = filtroEstaVazio(filtro);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1 min-w-0">
        <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={filtro.termo}
          onChange={(e) => onChange({ ...filtro, termo: e.target.value })}
          placeholder="Pesquisar por nome..."
          className="pl-8 h-9 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
        <Select
          value={filtro.papel}
          onValueChange={(v) => onChange({ ...filtro, papel: v as AppRole | 'all' })}
        >
          <SelectTrigger className="h-9 text-xs sm:w-40">
            <SelectValue placeholder="Papel" />
          </SelectTrigger>
          <SelectContent>
            {(['all', ...ORDEM_DE_PAPEIS] as Array<AppRole | 'all'>).map((papel) => (
              <SelectItem key={papel} value={papel} className="text-xs">
                {papel === 'all' ? 'Todos os papéis' : (ROLE_SHORT_LABELS[papel] ?? papel)}
                <span className="ml-1 text-muted-foreground">({contagemPorPapel[papel] ?? 0})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtro.areaId}
          onValueChange={(v) => onChange({ ...filtro, areaId: v })}
          disabled={opcoesDeArea.length === 0}
        >
          <SelectTrigger className="h-9 text-xs sm:w-40">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              Todas as áreas
              <span className="ml-1 text-muted-foreground">({usuarios.length})</span>
            </SelectItem>
            {opcoesDeArea.map((area) => (
              <SelectItem key={area.id} value={area.id} className="text-xs">
                <span className="flex items-center gap-1.5">
                  <PontoDaArea area={area} />
                  {area.name}
                  <span className="text-muted-foreground">({contagemPorArea[area.id] ?? 0})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* O"N de M" e o limpar só aparecem com filtro ligado: sem filtro eles
          diriam"68 de 68" e um botão que não faz nada. */}
      {!limpo && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {visiveis} de {usuarios.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-xs text-muted-foreground"
            onClick={() => onChange(FILTRO_VAZIO)}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpar
          </Button>
        </div>
      )}
    </div>
  );
};
