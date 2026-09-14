import { useMemo, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AREA_CATEGORIES_MAP, type AreaKey } from '@/config/areaCategories';
import {
  useEstruturaAreas,
  useEstruturaClusters,
  useEstruturaEquipes,
} from '@/hooks/useEstruturaManager';
import { caminhoDaEquipe, montarGruposDeEquipe } from '@/lib/equipesDaEstrutura';
import type { PaginaComCategoria } from '@/lib/areasDeAcessoDoUsuario';
import { ORDEM_DE_PAPEIS } from '@/lib/filtroDeUsuarios';
import {
  avisarComDesfazer,
  contagemDePessoas,
  useAplicarAreaDeAcesso,
  useAplicarEquipe,
  useAplicarPapel,
  type AlvoDaMatriz,
} from '@/hooks/useAcessosEmLote';
import { ROLE_SHORT_LABELS } from './roleOptions';
import { SelecaoDeEquipe } from './SelecaoDeEquipe';
import type { AppRole } from '@/hooks/useUsersWithRoles';

/**
 * A barra que aparece quando há linhas marcadas na matriz.
 *
 * ## Por que três linhas explícitas e não um menu"Aplicar…"
 *
 * As três dimensões (papel, área, equipe) são as três coisas que o diálogo de
 * edição pede uma pessoa por vez, e é para não abrir 20 diálogos que esta barra
 * existe. Escondê-las atrás de um menu devolveria um clique a cada uma e
 * apagaria da tela justamente a resposta para"o que eu consigo mudar daqui".
 *
 * ## Conceder e Remover são dois botões, não um interruptor
 *
 * Em lote não existe"o estado atual": das 12 pessoas marcadas, 9 podem já ter
 * o papel e 3 não. Um interruptor teria de escolher um estado para mostrar, e
 * qualquer escolha mentiria sobre parte da seleção. Dois verbos dizem o que vai
 * acontecer, e a mutação só escreve em quem de fato muda.
 */
export interface BarraDeLoteDeAcessosProps {
  /** Ids marcados. A barra não aparece com a lista vazia. */
  alvos: AlvoDaMatriz[];
  paginas: PaginaComCategoria[];
  onLimpar: () => void;
}

export const BarraDeLoteDeAcessos = ({ alvos, paginas, onLimpar }: BarraDeLoteDeAcessosProps) => {
  const [papel, setPapel] = useState<AppRole | ''>('');
  const [area, setArea] = useState<AreaKey | ''>('');
  const [equipeId, setEquipeId] = useState('');

  const { data: clusters = [] } = useEstruturaClusters();
  const { data: areasEstrutura = [] } = useEstruturaAreas();
  const { data: equipes = [] } = useEstruturaEquipes();
  const grupos = useMemo(
    () => montarGruposDeEquipe(clusters, areasEstrutura, equipes),
    [clusters, areasEstrutura, equipes],
  );

  const aplicarPapel = useAplicarPapel();
  const aplicarArea = useAplicarAreaDeAcesso();
  const aplicarEquipe = useAplicarEquipe();

  const userIds = alvos.map((a) => a.id);
  const quantas = contagemDePessoas(alvos.length);
  const ocupado = aplicarPapel.isPending || aplicarArea.isPending || aplicarEquipe.isPending;

  const erro = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : 'Não foi possível aplicar a alteração.');

  const rodarPapel = (conceder: boolean, ids = userIds) => {
    if (!papel) return;
    aplicarPapel
      .mutateAsync({ userIds: ids, papel, conceder, alvos })
      .then((resultado) =>
        avisarComDesfazer(
          resultado,
          {
            feito: `${ROLE_SHORT_LABELS[papel] ?? papel}: ${conceder ? 'concedido a' : 'removido de'} ${contagemDePessoas(resultado.alterados.length)}`,
            nada: `Ninguém mudou — a seleção já estava assim.`,
          },
          (alterados) => rodarPapel(!conceder, alterados),
        ),
      )
      .catch(erro);
  };

  const rodarArea = (conceder: boolean, ids = userIds) => {
    if (!area) return;
    aplicarArea
      .mutateAsync({ userIds: ids, area, conceder, alvos, paginas })
      .then((resultado) =>
        avisarComDesfazer(
          resultado,
          {
            feito: `${AREA_CATEGORIES_MAP[area].label}: ${conceder ? 'concedida a' : 'removida de'} ${contagemDePessoas(resultado.alterados.length)}`,
            nada: 'Ninguém mudou — a seleção já estava assim.',
          },
          (alterados) => rodarArea(!conceder, alterados),
        ),
      )
      .catch(erro);
  };

  const rodarEquipe = (conceder: boolean, ids = userIds) => {
    if (!equipeId) return;
    const equipeNome = caminhoDaEquipe(equipeId, grupos) ?? equipeId;
    aplicarEquipe
      .mutateAsync({ userIds: ids, equipeId, equipeNome, conceder, alvos })
      .then((resultado) =>
        avisarComDesfazer(
          resultado,
          {
            feito: `${equipeNome}: ${conceder ? 'entraram' : 'saíram'} ${contagemDePessoas(resultado.alterados.length)}`,
            nada: 'Ninguém mudou — a seleção já estava assim.',
          },
          (alterados) => rodarEquipe(!conceder, alterados),
        ),
      )
      .catch(erro);
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/[0.06] p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{quantas} selecionada{alvos.length === 1 ? '' : 's'}</p>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground" onClick={onLimpar}>
          <X className="h-3.5 w-3.5 mr-1" />
          Limpar seleção
        </Button>
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        <LinhaDeLote
          rotulo="Papel"
          vazio={!papel}
          ocupado={ocupado}
          onConceder={() => rodarPapel(true)}
          onRemover={() => rodarPapel(false)}
        >
          <Select value={papel} onValueChange={(v) => setPapel(v as AppRole)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Escolher papel..." /></SelectTrigger>
            <SelectContent>
              {ORDEM_DE_PAPEIS.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">{ROLE_SHORT_LABELS[p] ?? p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </LinhaDeLote>

        <LinhaDeLote
          rotulo="Área de acesso"
          vazio={!area}
          ocupado={ocupado}
          onConceder={() => rodarArea(true)}
          onRemover={() => rodarArea(false)}
        >
          <Select value={area} onValueChange={(v) => setArea(v as AreaKey)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Escolher área..." /></SelectTrigger>
            <SelectContent>
              {(Object.keys(AREA_CATEGORIES_MAP) as AreaKey[]).map((chave) => (
                <SelectItem key={chave} value={chave} className="text-xs">
                  {AREA_CATEGORIES_MAP[chave].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </LinhaDeLote>

        <LinhaDeLote
          rotulo="Equipe na estrutura"
          vazio={!equipeId}
          ocupado={ocupado}
          onConceder={() => rodarEquipe(true)}
          onRemover={() => rodarEquipe(false)}
        >
          <SelecaoDeEquipe
            value={equipeId}
            onChange={setEquipeId}
            grupos={grupos}
            disabled={grupos.length === 0}
            placeholder={grupos.length ? 'Escolher equipe...' : 'Nenhuma equipe cadastrada'}
            className="h-8 text-xs"
          />
        </LinhaDeLote>
      </div>
    </div>
  );
};

/** Uma dimensão da barra: rótulo, seletor e os dois verbos. */
const LinhaDeLote = ({
  rotulo,
  vazio,
  ocupado,
  children,
  onConceder,
  onRemover,
}: {
  rotulo: string;
  /** Sem nada escolhido no seletor — os dois botões ficam inertes. */
  vazio: boolean;
  ocupado: boolean;
  children: React.ReactNode;
  onConceder: () => void;
  onRemover: () => void;
}) => (
  <div className="space-y-1.5">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{rotulo}</p>
    <div className="flex items-center gap-1.5">
      <div className="min-w-0 flex-1">{children}</div>
      <Button
        size="sm"
        variant="outline"
        className="h-8 px-2 shrink-0"
        disabled={vazio || ocupado}
        onClick={onConceder}
        title={`Conceder ${rotulo.toLowerCase()} aos selecionados`}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 px-2 shrink-0"
        disabled={vazio || ocupado}
        onClick={onRemover}
        title={`Remover ${rotulo.toLowerCase()} dos selecionados`}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
);
