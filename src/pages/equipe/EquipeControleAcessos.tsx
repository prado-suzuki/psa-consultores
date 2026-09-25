import { useState } from 'react';
import { AcessosLayout } from '@/components/acessos/AcessosLayout';
import { SECAO_INICIAL, type IdDeSecaoDeAcessos } from '@/lib/secoesDeAcessos';
import EstruturaManager from '@/components/equipe/estrutura/EstruturaManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Network, Wallet } from 'lucide-react';
import { CLASSES_DA_ABA, CLASSES_DA_LISTA_DE_ABAS } from '@/lib/abasDaSecao';
import { GestaoClientesContent } from '@/pages/equipe/fiscal/GestaoClientes';
import CadastroCategorias from '@/components/equipe/CadastroCategorias';
import CentroCustoTab from '@/components/equipe/CentroCustoTab';
import { PagesTab } from '@/components/acessos/PagesTab';
import { UsersTab } from '@/components/acessos/UsersTab';
import { UsersRolesView } from '@/components/acessos/UsersRolesView';
import DashboardsTab from '@/components/acessos/DashboardsTab';
import { AccessStatsCards } from '@/components/acessos/AccessStatsCards';
import { AgenteTab } from '@/components/acessos/AgenteTab';
import { EnriquecimentoPerfisTab } from '@/components/acessos/EnriquecimentoPerfisTab';

/**
 * Fachada do Controle de Acessos: a barra escolhe a seção, cada seção é um
 * componente.
 *
 * O QUE SAIU EM 14/09/2026. Esta página carregava um cadastro de Área inteiro —
 * diálogo de criar/editar, oito cores em hexadecimal mais um seletor de cor, e
 * as funções de criar, editar, ativar e excluir em `catalog_clients`. Nada
 * disso era alcançável: `setCadastroDialogOpen(true)` só existia dentro de duas
 * funções que nenhum botão chamava, desde que a seção "Cadastros Estrutura"
 * passou a ser o `EstruturaManager`. O que continuava vivo era o efeito
 * colateral — ao abrir a seção, uma busca em `catalog_clients`, `projects` e
 * `processes` para alimentar estado que nenhum JSX lia.
 *
 * O seletor de cor era também o último lugar do sistema que gravava cor de área
 * à mão, contra o que está escrito em `src/lib/corDaArea.ts`: a cor sai de
 * `color_index`, e o override em hexadecimal não tem tela de propósito — foi um
 * seletor como esse que produziu sete áreas verdes em dez.
 *
 * Com isso `catalog_clients` deixa de ter escrita no aplicativo; as telas de
 * Projetos, Processos e Mapa continuam LENDO a tabela normalmente.
 */
const EquipeControleAcessos = () => {
  // A seção aberta é estado, não rota: são sete seções de uma tela só, e cada
  // uma como rota custaria uma linha em `protectedPages.ts` e um recorte de
  // permissão que ninguém pediu. A barra (`AcessosLayout`) lê e escreve daqui.
  const [secao, setSecao] = useState<IdDeSecaoDeAcessos>(SECAO_INICIAL);

  // A barra desta tela são as seções que eram abas: ver `AcessosLayout`.
  // O título da página passa a ser o da seção aberta.
  return (
    <AcessosLayout secao={secao} onSecaoChange={setSecao}>

          <div className="space-y-6">
            {/*
              Os cartões falam de Páginas, Usuários e Permissões — e por isso
              não aparecem em Produtos & Serviços, que não é sobre nenhum dos
              três. Lá eles custavam a altura da primeira dobra para empurrar
              para baixo a bancada em que o trabalho é feito.

              Em Papéis a faixa é outra: a seção já abre o total de usuários em
              quatro cartões logo abaixo, e repetir o mesmo número em cima era
              gastar a primeira dobra para dizer duas vezes. O porquê de cada
              cartão que entrou e saiu está no `AccessStatsCards`.
            */}
            {secao !== 'cadastro_categorias' && (
              <AccessStatsCards variante={secao === 'papeis' ? 'papeis' : 'geral'} />
            )}

            {/* Tabs */}
            {/* Sem `TabsList`: quem troca de secao e a barra. */}
            <Tabs value={secao} onValueChange={(v) => setSecao(v as IdDeSecaoDeAcessos)} className="space-y-4">

              {/* Pages Tab (extraído em componente) */}
              <TabsContent value="pages" className="space-y-4">
                <PagesTab />
              </TabsContent>

              {/* Users Tab (extraído em componente) */}
              <TabsContent value="users" className="space-y-4">
                <UsersTab />
              </TabsContent>

              {/* Cadastros Estrutura Tab — dona da estrutura organizacional:
                  clusters/empresas, áreas, equipes, membros e centros de custo.
                  Os dois cadastros são irmãos em sub-abas, nunca empilhados. */}
              <TabsContent value="cadastros" className="space-y-4">
                <Tabs defaultValue="organizacao" className="space-y-4">
                  <TabsList className={CLASSES_DA_LISTA_DE_ABAS}>
                    <TabsTrigger value="organizacao" className={CLASSES_DA_ABA}>
                      <Network className="h-4 w-4 mr-2" />
                      Estrutura
                    </TabsTrigger>
                    <TabsTrigger value="centros_custo" className={CLASSES_DA_ABA}>
                      <Wallet className="h-4 w-4 mr-2" />
                      Centros de Custo
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="organizacao">
                    <EstruturaManager />
                  </TabsContent>

                  <TabsContent value="centros_custo">
                    <Card className="border-border/60 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-foreground">Centros de Custo</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Usados pelos clusters e pelas áreas — cada área pode ter o seu.
                        </p>
                      </CardHeader>
                      <CardContent>
                        <CentroCustoTab />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* Cadastros Clientes Tab */}
              {/* A matriz das 7 permissoes e a legenda do que cada papel abre.
                  Ela morava em `/gestao/acessos`, que nenhum menu linkava: a
                  tela existia, funcionava, e so abria digitando a URL.

                  A celula grava no clique desde 14/09/2026, e a selecao aplica
                  papel, area e equipe em lote. As props `variant`/`editavel`
                  sairam no mesmo dia: existiam para uma versao so-leitura em
                  `/administracao/acessos`, uma rota que dava 404 desde
                  13/01/2026. Esta e a unica chamada do componente. */}
              <TabsContent value="papeis" className="space-y-4">
                <UsersRolesView />
              </TabsContent>

              <TabsContent value="cadastros_clientes" className="space-y-4">
                <GestaoClientesContent todosOsClusters />
              </TabsContent>

              {/* Cadastro Categorias Tab */}
              <TabsContent value="cadastro_categorias" className="space-y-4">
                <CadastroCategorias />
              </TabsContent>

              {/* Dashboards Tab (cadastro) */}
              <TabsContent value="dashboards" className="space-y-4">
                <DashboardsTab />
              </TabsContent>

              {/* Agente Tab — cockpit do Agente PSA: configuracao, prompt,
                  nivel de acesso, o que ele processa por resposta, volume de
                  insights e o historico de aprendizado. */}
              <TabsContent value="agente" className="space-y-4">
                <AgenteTab />
              </TabsContent>

              {/* Perfis de IA Tab — gestão de enriquecimento_perfil: instruções,
                  modelo, temperatura e contrato de saída que a edge function
                  enriquecer-texto aplica a cada chamada. */}
              <TabsContent value="enriquecimento_perfis" className="space-y-4">
                <EnriquecimentoPerfisTab />
              </TabsContent>
            </Tabs>
          </div>
    </AcessosLayout>
  );
};

export default EquipeControleAcessos;
