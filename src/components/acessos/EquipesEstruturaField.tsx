import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import {
  useEstruturaAreas,
  useEstruturaClusters,
  useEstruturaEquipes,
} from '@/hooks/useEstruturaManager';
import {
  areasDeAcessoDaEquipe,
  caminhoDaEquipe,
  montarGruposDeEquipe,
} from '@/lib/equipesDaEstrutura';
import type { AreaKey } from '@/config/areaCategories';

export interface EquipesEstruturaFieldProps {
  /** Equipes já escolhidas (ids de `estrutura_equipes`). */
  value: string[];
  onChange: (equipeIds: string[]) => void;
  /**
   * Áreas de acesso implicadas pela equipe escolhida — a tela usa para já
   * marcar a caixa correspondente em vez de pedir a mesma área duas vezes.
   */
  onAreasImplicadas?: (areas: AreaKey[]) => void;
}

/**
 * Escolha da equipe da estrutura direto no cadastro do usuário.
 *
 * Pede só a equipe: cluster e área saem dela e aparecem no caminho, então
 * ninguém precisa ir à aba Cadastros Estrutura depois para vincular a pessoa.
 * Aceita mais de uma equipe porque a estrutura aceita — quem está em duas não
 * perde uma delas ao salvar por aqui.
 */
export const EquipesEstruturaField = ({
  value,
  onChange,
  onAreasImplicadas,
}: EquipesEstruturaFieldProps) => {
  const { data: clusters = [] } = useEstruturaClusters();
  const { data: areas = [] } = useEstruturaAreas();
  const { data: equipes = [] } = useEstruturaEquipes();

  const grupos = useMemo(
    () => montarGruposDeEquipe(clusters, areas, equipes),
    [clusters, areas, equipes],
  );

  const disponiveis = useMemo(
    () =>
      grupos
        .map((grupo) => ({
          ...grupo,
          equipes: grupo.equipes.filter((equipe) => !value.includes(equipe.id)),
        }))
        .filter((grupo) => grupo.equipes.length > 0),
    [grupos, value],
  );

  const adicionar = (equipeId: string) => {
    onChange([...value, equipeId]);
    onAreasImplicadas?.(areasDeAcessoDaEquipe(equipeId, equipes, areas));
  };

  const remover = (equipeId: string) => {
    onChange(value.filter((id) => id !== equipeId));
  };

  const semOpcoes = grupos.length === 0;

  return (
    <div className="space-y-3">
      <Label className="text-slate-700 text-sm font-medium">Equipe na estrutura</Label>
      <p className="text-xs text-slate-500">
        Cluster e área vêm da equipe escolhida. Sem isso a pessoa fica em"Sem área".
      </p>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((equipeId) => (
            <Badge key={equipeId} variant="secondary" className="gap-1 pr-1 text-xs font-normal">
              {caminhoDaEquipe(equipeId, grupos) ?? equipeId}
              <button
                type="button"
                aria-label="Remover equipe"
                onClick={() => remover(equipeId)}
                className="ml-0.5 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Select value="" onValueChange={adicionar} disabled={semOpcoes || disponiveis.length === 0}>
        <SelectTrigger className="h-9 bg-white border-slate-200 text-sm">
          <SelectValue
            placeholder={
              semOpcoes
                ? 'Nenhuma equipe cadastrada na estrutura'
                : disponiveis.length === 0
                  ? 'Já está em todas as equipes'
                  : value.length === 0
                    ? 'Selecionar equipe...'
                    : '+ Adicionar outra equipe...'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {disponiveis.map((grupo) => (
            <SelectGroup key={grupo.areaId}>
              <SelectLabel className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {grupo.cor && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: grupo.cor }}
                  />
                )}
                {grupo.caminho}
              </SelectLabel>
              {grupo.equipes.map((equipe) => (
                <SelectItem key={equipe.id} value={equipe.id} className="text-xs">
                  {equipe.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
