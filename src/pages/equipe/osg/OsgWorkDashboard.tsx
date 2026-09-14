import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GRUPOS_OSG_WORK } from '@/lib/navegacaoOsgWork';

/**
 * O painel de entrada do OSG Work: todas as telas da área, agrupadas como no menu.
 *
 * ELE ESPELHA O MENU, e agora por construção: as duas listas saem de
 * `navegacaoOsgWork`. Antes eram dois arquivos com a mesma informação e
 * divergiram — em 14/09/2026 o menu tinha 14 telas em sete grupos e este painel
 * mostrava SETE, soltas, com descrições diferentes das que a própria tela exibe
 * no cabeçalho. Quem clicava lia uma frase no cartão e encontrava outra ao
 * chegar.
 *
 * A ROTA JÁ EXISTIA E NÃO TINHA PORTA. Até 14/09 nenhum item do menu levava
 * aqui: você caía nesta tela ao entrar na área e, depois do primeiro clique,
 * não voltava mais. O "Início" da barra resolve isso, no padrão que a Tax e a
 * OSG Projects já seguiam.
 *
 * O desenho do cartão é o da OSG Projects (`OsgBoasVindas`), com a paleta da
 * área — selo `bg-osg-100`, ícone `text-osg-600`, borda `osg-300` no hover.
 * SEM o rodapé "Manual (em breve)" que existe lá: ele promete um manual que não
 * existe, e a coordenação pediu para não trazer a promessa junto.
 */
const OsgWorkDashboard = () => {
  const navigate = useNavigate();

  return (
    // Título e subtítulo no molde das outras duas áreas: a Tax abre com
    // "Bem-vindo à área Tax" e a OSG Projects com "Bem-vindo à área OSG", as
    // duas com o mesmo subtítulo. Era "OSG Work" seco, que repetia o nome já
    // escrito no topo da barra e não dizia o que fazer aqui.
    <OsgLayout title="Bem-vindo à área OSG Work" subtitle="Escolha uma ferramenta para começar">
      <div className="space-y-8">
        {GRUPOS_OSG_WORK.map((grupo) => {
          const IconeDoGrupo = grupo.icone;
          return (
            <section key={grupo.id}>
              {/* O título do grupo repete o rótulo do menu, de propósito: é o que
                  liga uma leitura à outra para quem está aprendendo a área. */}
              <div className="mb-3 flex items-center gap-2">
                <IconeDoGrupo className="h-4 w-4 flex-shrink-0 text-osg-600" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-osg-700">
                  {grupo.rotulo}
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {grupo.telas.map((tela) => (
                  <Card
                    key={tela.path}
                    className="group cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-osg-300 hover:shadow-md"
                    onClick={() => navigate(tela.path)}
                  >
                    {/* SEM ÍCONE no cartão (14/09/2026). Cada um trazia o selo
                        `bg-osg-100` com o ícone da tela, e numa grade de três
                        colunas por sete seções isso virava dezesseis selos
                        disputando atenção com os títulos. O ícone ficou onde
                        distingue: no cabeçalho da seção, um por grupo.

                        Sem o selo, a seta sobe para a linha do título em vez de
                        ficar sozinha acima dele. */}
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{tela.label}</CardTitle>
                        <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-osg-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{tela.descricao}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </OsgLayout>
  );
};

export default OsgWorkDashboard;
