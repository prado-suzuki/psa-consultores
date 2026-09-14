import { useMemo, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useUserPageAccess } from '@/hooks/useUserPageAccess';
import { useUsersWithRoles, type UserWithRoles } from '@/hooks/useUsersWithRoles';
import { useDomainAreasPorUsuario } from '@/hooks/useDomainAreasPorUsuario';
import { areasDeAcessoPorUsuario } from '@/lib/areasDeAcessoDoUsuario';
import { FILTRO_VAZIO, filtrarUsuarios, ordenarUsuarios, type FiltroDeUsuarios } from '@/lib/filtroDeUsuarios';
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
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [emEdicao, setEmEdicao] = useState<UserWithRoles | null>(null);

  const { data: usuarios = [], isLoading: carregandoUsuarios } = useUsersWithRoles();
  const { data: paginas = [] } = usePagePermissions();
  const { data: acessos = [] } = useUserPageAccess();
  const { areasPorUsuario, areas } = useDomainAreasPorUsuario();

  const areasDeAcesso = useMemo(
    () => areasDeAcessoPorUsuario(paginas, acessos),
    [paginas, acessos],
  );

  const visiveis = useMemo(
    () => ordenarUsuarios(filtrarUsuarios(usuarios, filtro, areasPorUsuario)),
    [usuarios, filtro, areasPorUsuario],
  );

  /** Só quem está visível E marcado. Ver a nota no topo. */
  const alvos: AlvoDaMatriz[] = useMemo(
    () =>
      visiveis
        .filter((u) => selecionados.has(u.id))
        .map((u) => ({ id: u.id, nome: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() })),
    [visiveis, selecionados],
  );

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

          {/* O eixo da matriz. São 7 papéis e 5 áreas: juntos não cabem. */}
          <Tabs value={dimensao} onValueChange={(v) => setDimensao(v as DimensaoDaMatriz)}>
            <TabsList className="bg-foreground/[0.05] border border-border">
              <TabsTrigger
                value="papeis"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                Papéis
              </TabsTrigger>
              <TabsTrigger
                value="areas"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                Áreas de acesso
              </TabsTrigger>
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
          selecionados={selecionados}
          onAlternarSelecao={alternarSelecao}
          onSelecionarVisiveis={selecionarVisiveis}
          onEditar={setEmEdicao}
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
