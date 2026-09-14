import { useMemo, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useUserPageAccess } from '@/hooks/useUserPageAccess';
import { useUsersWithRoles, type UserWithRoles } from '@/hooks/useUsersWithRoles';
import { useDomainAreasPorUsuario } from '@/hooks/useDomainAreasPorUsuario';
import {
  useEstruturaAreasTodas,
  useEstruturaClusters,
  useEstruturaEquipesTodas,
  useEstruturaMembros,
} from '@/hooks/useEstruturaManager';
import { CLASSES_DA_ABA, CLASSES_DA_LISTA_DE_ABAS } from '@/lib/abasDaSecao';
import { areasDeAcessoPorUsuario } from '@/lib/areasDeAcessoDoUsuario';
import { cn } from '@/lib/utils';
import { colunasDeEquipeDaMatriz, equipesPorUsuario } from '@/lib/equipesDaEstrutura';
import {
  FILTRO_VAZIO,
  ORDEM_PADRAO,
  filtrarUsuarios,
  ordenarUsuariosPor,
  type FiltroDeUsuarios,
  type OrdemDaMatriz,
} from '@/lib/filtroDeUsuarios';
import type { AlvoDaMatriz } from '@/hooks/useAcessosEmLote';
import { BarraDeLoteDeAcessos } from './BarraDeLoteDeAcessos';
import { EditUserDialog } from './EditUserDialog';
import { FiltroDeUsuariosBar } from './FiltroDeUsuariosBar';
import { MatrizDeAcessos, type DimensaoDaMatriz } from './MatrizDeAcessos';

/**
 * O painel editável de Papéis e Áreas — filtros, interruptor de eixo, seleção
 * em lote e a matriz.
 *
 * ## Duas coisas se chamam"área" nesta tela, e elas NÃO são a mesma
 *
 * - `areasPorUsuario` (de `useDomainAreasPorUsuario`) é a área da ESTRUTURA:
 *   em que equipe/área organizacional a pessoa está. Alimenta o filtro.
 * - `areasDeAcesso` (de `areasDeAcessoPorUsuario`) é a área de ACESSO: a quais
 *   categorias de página a pessoa alcança. É o que as colunas desenham.
 *
 * Alguém pode estar na área Tax da estrutura e não ter acesso à área Tax do
 * sistema — é justamente esse descompasso que esta tela existe para consertar.
 *
 * ## A seleção só alcança quem está na tela
 *
 * Quem sai pelo filtro sai da seleção efetiva. Sem isso, marcar 20 pessoas,
 * filtrar por"Tax" e clicar em Remover atingiria gente que a pessoa não está
 * vendo — o tipo de surpresa que não tem desfazer bom o bastante.
 */
export const PainelDaMatrizDeAcessos = () => {
  const [filtro, setFiltro] = useState<FiltroDeUsuarios>(FILTRO_VAZIO);
  const [dimensao, setDimensao] = useState<DimensaoDaMatriz>('papeis');
  const [ordem, setOrdem] = useState<OrdemDaMatriz>(ORDEM_PADRAO);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [emEdicao, setEmEdicao] = useState<UserWithRoles | null>(null);

  const { data: usuarios = [], isLoading: carregandoUsuarios } = useUsersWithRoles();
  const { data: paginas = [] } = usePagePermissions();
  const { data: acessos = [] } = useUserPageAccess();
  const { areasPorUsuario, areas } = useDomainAreasPorUsuario();

  // A estrutura vem INTEIRA aqui, incluindo o que foi desativado — ver
  // `useEstruturaAreasTodas`. Desativar uma equipe não desliga ninguém dela, e
  // uma coluna a menos seria um vínculo sem tela para removê-lo.
  const { data: clusters = [] } = useEstruturaClusters();
  const { data: areasEstrutura = [] } = useEstruturaAreasTodas();
  const { data: equipes = [] } = useEstruturaEquipesTodas();
  const { data: membros = [] } = useEstruturaMembros();

  const areasDeAcesso = useMemo(
    () => areasDeAcessoPorUsuario(paginas, acessos),
    [paginas, acessos],
  );

  const colunasEquipe = useMemo(
    () => colunasDeEquipeDaMatriz(clusters, areasEstrutura, equipes, membros),
    [clusters, areasEstrutura, equipes, membros],
  );
  const equipesDoUsuarioMapa = useMemo(() => equipesPorUsuario(membros), [membros]);

  /**
   * "Tem esta coluna ligada?", para a ordenação por coluna da matriz.
   *
   * A mesma pergunta que a célula desenha — e é ela que a ordenação por coluna
   * usa para pôr quem tem no topo. Mora aqui, e não na `MatrizDeAcessos`,
   * porque quem ordena é este componente: a matriz recebe a lista pronta.
   */
  const colunaLigada = (usuario: UserWithRoles, coluna: string) =>
    dimensao === 'papeis'
      ? usuario.roles.includes(coluna as (typeof usuario.roles)[number])
      : dimensao === 'areas'
        ? (areasDeAcesso[usuario.id]?.has(coluna as never) ?? false)
        : (equipesDoUsuarioMapa[usuario.id]?.has(coluna) ?? false);

  const visiveis = useMemo(
    () =>
      ordenarUsuariosPor(
        filtrarUsuarios(usuarios, filtro, areasPorUsuario),
        ordem,
        colunaLigada,
      ),
    // `colunaLigada` é recriada a cada render de propósito: ela fecha sobre
    // `dimensao`, `areasDeAcesso` e o mapa de equipes, que já estão na lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usuarios, filtro, areasPorUsuario, ordem, dimensao, areasDeAcesso, equipesDoUsuarioMapa],
  );

  /** Só quem está visível E marcado. Ver a nota no topo. */
  const alvos: AlvoDaMatriz[] = useMemo(
    () =>
      visiveis
        .filter((u) => selecionados.has(u.id))
        .map((u) => ({ id: u.id, nome: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() })),
    [visiveis, selecionados],
  );

  /**
   * Trocar de eixo devolve a ordem ao padrão **quando ela era por coluna**.
   *
   * Ordenar por"Admin" e passar para Equipes deixaria a ordenação apontando
   * para uma coluna que não existe mais naquele eixo: `ligada` responderia
   * `false` para todo mundo, a lista cairia num empate geral ordenado por nome,
   * e nenhum cabeçalho mostraria seta explicando por quê. Uma tabela ordenada
   * por um critério invisível é pior do que uma tabela sem ordenação.
   *
   * Ordem por nome ou por e-mail atravessa a troca — essas colunas existem nos
   * três eixos, e perdê-las seria desfazer um gesto que continua válido.
   */
  const trocarDimensao = (nova: DimensaoDaMatriz) => {
    setDimensao(nova);
    if (ordem.campo === 'coluna') setOrdem(ORDEM_PADRAO);
  };

  const alternarSelecao = (userId: string) =>
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(userId)) proximo.delete(userId);
      else proximo.add(userId);
      return proximo;
    });

  const selecionarVisiveis = (marcar: boolean) =>
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      for (const u of visiveis) {
        if (marcar) proximo.add(u.id);
        else proximo.delete(u.id);
      }
      return proximo;
    });

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-foreground">Usuários e Permissões</CardTitle>
            <CardDescription>
              Clique numa célula para conceder ou remover. A alteração grava na hora, e o aviso traz
              o Desfazer.
            </CardDescription>
          </div>

          {/* O eixo da matriz. 7 papéis + 5 áreas + 11 equipes: juntos, não
              cabem em tela nenhuma; um de cada vez, cabem todos. */}
          <Tabs value={dimensao} onValueChange={(v) => trocarDimensao(v as DimensaoDaMatriz)}>
            <TabsList className={cn(CLASSES_DA_LISTA_DE_ABAS, 'flex-wrap h-auto')}>
              {[
                { id: 'papeis', rotulo: 'Papéis' },
                { id: 'areas', rotulo: 'Áreas de acesso' },
                { id: 'equipes', rotulo: 'Equipes' },
              ].map((aba) => (
                <TabsTrigger key={aba.id} value={aba.id} className={CLASSES_DA_ABA}>
                  {aba.rotulo}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <FiltroDeUsuariosBar
          filtro={filtro}
          onChange={setFiltro}
          usuarios={usuarios}
          areas={areas}
          areasPorUsuario={areasPorUsuario}
          visiveis={visiveis.length}
        />

        {alvos.length > 0 && (
          <BarraDeLoteDeAcessos
            alvos={alvos}
            paginas={paginas}
            onLimpar={() => setSelecionados(new Set())}
          />
        )}
      </CardHeader>

      <CardContent>
        <MatrizDeAcessos
          usuarios={visiveis}
          dimensao={dimensao}
          areasDeAcesso={areasDeAcesso}
          paginas={paginas}
          colunasDeEquipe={colunasEquipe}
          equipesPorUsuario={equipesDoUsuarioMapa}
          selecionados={selecionados}
          onAlternarSelecao={alternarSelecao}
          onSelecionarVisiveis={selecionarVisiveis}
          onEditar={setEmEdicao}
          ordem={ordem}
          onOrdemChange={setOrdem}
          isLoading={carregandoUsuarios}
        />
      </CardContent>

      {/* Nome, e-mail e equipe continuam aqui — a matriz cobre papel e área. */}
      <EditUserDialog
        open={emEdicao !== null}
        onOpenChange={(aberto) => !aberto && setEmEdicao(null)}
        user={emEdicao}
      />
    </Card>
  );
};
