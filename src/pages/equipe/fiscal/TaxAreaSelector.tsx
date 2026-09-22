import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { usePageAccess } from '@/hooks/usePageAccess';
import { useUserAccessibleCategories } from '@/hooks/useUserAccessibleCategories';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo-psa.png';
import TaxIcon from '@/components/equipe/fiscal/TaxIcon';
import TaxWorkIcon from '@/components/equipe/fiscal/TaxWorkIcon';

const SLIDE_DURATION_MS = 280;

/*
  O GRADIENTE DA CAIXA É FEITO DAS CORES DO PRÓPRIO SELO, e não de token.

  `#0e4b5a` é o fundo do próprio selo, e `#0b3d4a` é ele um passo mais escuro,
  só para o gradiente existir. Com isso o HEXÁGONO DESAPARECE dentro da caixa e
  sobra um ladrilho só, com o glyph branco em cima — que é exatamente o efeito do
  cartão da OSG, onde o selo azul-marinho some no fundo azul-marinho e você só
  enxerga o Sísifo.

  Uma versão anterior usou a sombra do selo (`#032630`) como início do gradiente,
  imitando a OSG ao pé da letra. Não funcionou aqui: o teal do selo é um tom
  médio, e contra a sombra quase preta ele recortava o hexágono em vez de
  escondê-lo. A OSG pode fazer isso porque os dois tons dela já são escuros. O
  que se copia é o EFEITO, não os números.

  O anel dourado a 30% fecha o conjunto com a borda do selo.

  Por que não token: pelo mesmo motivo do `TaxSeal`. O selo é marca, tem que ser
  igual nos dois temas e em qualquer fundo; a caixa que o encosta precisa seguir
  a marca, não a superfície. Token aqui reintroduz a emenda no tema escuro.

  E nada de cor de estoque do Tailwind: `emerald-500` seria o caminho óbvio, e é
  o que os outros dois seletores usam, mas aquilo é legado com catraca — a
  `filaDoRedEmerald` congela a lista de `red`/`emerald` crus e só aceita que ela
  ENCOLHA.
*/
interface CartaoDeAmbiente {
  id: string;
  label: string;
  description: string;
  path: string;
  color: string;
  iconNode: React.ReactNode;
  visivel: boolean;
}

/**
 * As duas portas da área Tax, no mesmo desenho que a OSG usa desde que ganhou
 * `OSG Projects` e `OSG Work`.
 *
 * O QUE MUDOU EM 22/09/2026. Até aqui `/equipe/tax` ERA a tela de boas-vindas.
 * Ela desceu para `/equipe/tax/inicio` e este seletor tomou o lugar dela, que é
 * a mesma manobra que a OSG fez com `/equipe/osg/inicio`. Quem tiver o endereço
 * antigo salvo cai na escolha, e não mais direto na tela: foi o preço que a OSG
 * aceitou e que a consultoria confirmou aqui.
 *
 * O `Tax Work` é o antigo Digital Dev, que mudou de área, de rota e de nome.
 *
 * POR QUE OS DOIS CARTÕES SÃO FILTRADOS DE FORMAS DIFERENTES, e não é descuido:
 *
 *  · o Projects não tem página raiz cadastrada (`/equipe/tax` nunca esteve em
 *    `protectedPages.ts`), então o único sinal disponível é a CATEGORIA, que é
 *    como a OSG também decide;
 *  · o Work TEM raiz cadastrada (`/equipe/tax/work`, herdeira do `/equipe/dev`
 *    com as concessões de todo mundo intactas), então dá para perguntar
 *    exatamente quem pode entrar, em vez de mostrar um cartão que levaria a
 *    pessoa a um "Acesso Negado". É o mesmo recurso que o seletor do Digital já
 *    usa para o cartão de Acessos.
 *
 * Consequência conhecida: enquanto a migração que renomeia os caminhos não tiver
 * rodado, `/equipe/tax/work` não existe em `page_permissions`, e o
 * `usePageAccess` trata página não cadastrada como acesso livre. O cartão
 * apareceria para todo mundo. É por isso que a migração vai ANTES do código, e
 * está escrito no cabeçalho dela.
 */
const TaxAreaSelector = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { categories, isLoading: carregandoCategorias } = useUserAccessibleCategories();
  const { hasAccess: podeVerOWork, isLoading: carregandoWork } = usePageAccess('/equipe/tax/work');
  const [slide, setSlide] = useState<'left' | 'right' | null>(null);

  const isLoading = carregandoCategorias || carregandoWork;

  const handleAreaClick = (path: string, index: number, total: number) => {
    if (slide) return;
    const direction: 'left' | 'right' = total <= 1
      ? 'right'
      : index < total / 2
        ? 'right'
        : 'left';
    setSlide(direction);
    window.setTimeout(() => navigate(path), SLIDE_DURATION_MS);
  };

  const todos: CartaoDeAmbiente[] = [
    {
      id: 'projects',
      label: 'TAX Projects',
      description: 'Projetos, tarefas, clientes e a gerencial da área Tax',
      path: '/equipe/tax/inicio',
      color: 'from-[#0e4b5a] to-[#0b3d4a] ring-1 ring-[#c49a6c]/30',
      iconNode: <TaxIcon size={46} className="rounded-md" />,
      visivel: isAdmin || !!categories?.includes('tax'),
    },
    {
      id: 'work',
      label: 'TAX Work',
      description: 'Ferramentas e aplicações desenvolvidas para a área Tax',
      path: '/equipe/tax/work',
      color: 'from-[#0b3d4a] to-[#0e4b5a] ring-1 ring-[#c49a6c]/30',
      iconNode: <TaxWorkIcon size={46} className="rounded-md" />,
      visivel: podeVerOWork,
    },
  ];

  const areas = todos.filter((area) => area.visivel);
  const gridCols = areas.length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' : 'md:grid-cols-2';

  return (
    <div className="min-h-screen dark bg-background text-foreground flex items-center justify-center p-4 overflow-hidden">
      <div
        className={cn(
          'w-full max-w-4xl transition-all ease-in',
          slide === 'left' && '-translate-x-[120%] opacity-0',
          slide === 'right' && 'translate-x-[120%] opacity-0',
        )}
        style={{ transitionDuration: `${SLIDE_DURATION_MS}ms` }}
      >
        <div className="text-center mb-8">
          <img src={logo} alt="PSA Consultores" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Área Tax</h1>
          <p className="text-muted-foreground">Selecione o ambiente de trabalho</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : areas.length === 0 ? (
          <Card className="backdrop-blur-lg max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Nenhuma área disponível</CardTitle>
              <CardDescription className="text-muted-foreground">
                Você ainda não possui acesso a nenhum ambiente da área Tax.
                Solicite a um administrador a liberação dos acessos necessários.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className={`grid gap-4 ${gridCols}`}>
            {areas.map((area, idx) => (
              <Card
                key={area.id}
                className="backdrop-blur-lg cursor-pointer hover:border-primary transition-all duration-300 group"
                onClick={() => handleAreaClick(area.path, idx, areas.length)}
              >
                <CardHeader className="pb-2">
                  <div
                    className={`dark w-12 h-12 rounded-lg bg-gradient-to-br ${area.color} flex items-center justify-center mb-3 overflow-hidden`}
                  >
                    {area.iconNode}
                  </div>
                  <CardTitle className="flex items-center justify-between">
                    {area.label}
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    {area.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/equipe')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Trocar de área
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TaxAreaSelector;
