import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelecaoDeEquipe } from './SelecaoDeEquipe';
import { X } from 'lucide-react';
import {
  useEstruturaAreas,
  useEstruturaAreasTodas,
  useEstruturaClusters,
  useEstruturaEquipes,
  useEstruturaEquipesTodas,
  useEstruturaMembros,
} from '@/hooks/useEstruturaManager';
import {
  areasDeAcessoDaEquipe,
  caminhoDeQualquerEquipe,
  colunasDeEquipeDaMatriz,
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

  /*
   * OFERECER e MOSTRAR pedem listas diferentes, e confundir as duas imprimia
   * UUID na tela.
   *
   * O seletor abaixo oferece só equipe ativa (`grupos`) — entrar numa equipe
   * que a estrutura fechou seria abrir caminho para lugar nenhum. Mas os chips
   * acima mostram vínculo que JÁ EXISTE, e desativar uma equipe não desliga
   * ninguém dela: em 14/09/2026 produção tinha 15 pessoas em três equipes
   * desativadas. Para essas, `caminhoDaEquipe` devolvia `null`, o `?? equipeId`
   * assumia, e o chip exibia `32bc9000-f524-43f0-9aa9-44d2381c17d7` — que é
   * como o defeito apareceu, numa captura de tela.
   */
  const { data: areasTodas = [] } = useEstruturaAreasTodas();
  const { data: equipesTodas = [] } = useEstruturaEquipesTodas();
  const { data: membros = [] } = useEstruturaMembros();
  const todasAsColunas = useMemo(
    () => colunasDeEquipeDaMatriz(clusters, areasTodas, equipesTodas, membros),
    [clusters, areasTodas, equipesTodas, membros],
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
      <Label className="text-foreground text-sm font-medium">Equipe na estrutura</Label>
      <p className="text-xs text-muted-foreground">
        Cluster e área vêm da equipe escolhida. Sem isso a pessoa fica em"Sem área".
      </p>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((equipeId) => (
            <Badge key={equipeId} variant="secondary" className="gap-1 pr-1 text-xs font-normal">
              {/* Nunca cai no id: um UUID não diz a ninguém de que equipe se
                  trata, e"equipe desconhecida" é o que a pessoa precisa ler
                  quando nem a estrutura sabe mais. */}
              {caminhoDeQualquerEquipe(equipeId, todasAsColunas) ?? 'Equipe desconhecida'}
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

      {/* `value=""` sempre: este seletor não guarda escolha, ele ACRESCENTA — o
          que já foi escolhido está nos chips acima. */}
      <SelecaoDeEquipe
        value=""
        onChange={adicionar}
        grupos={disponiveis}
        disabled={semOpcoes || disponiveis.length === 0}
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
    </div>
  );
};
