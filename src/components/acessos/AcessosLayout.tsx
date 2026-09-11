import { ArrowLeft, ChevronLeft, ChevronRight, Menu, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { TituloDaPagina } from '@/components/layout/TituloDaPagina';
import { SidebarCartaoUsuario } from '@/components/shared/SidebarCartaoUsuario';
import { SidebarFundoGaveta } from '@/components/shared/SidebarFundoGaveta';
import { Button } from '@/components/ui/button';
import {
  useFecharGavetaAoNavegar,
  useSidebarRecolhimentoController,
} from '@/hooks/useSidebarRecolhimentoController';
import { FACE_DA_BARRA, classesItemDaBarra } from '@/lib/barraLateralCromo';
import { AREAS } from '@/lib/nomeDaArea';
import {
  SECOES_DE_ACESSOS,
  rotuloDaSecao,
  type IdDeSecaoDeAcessos,
} from '@/lib/secoesDeAcessos';
import {
  classeLarguraBarra,
  classeRecuoCabecalho,
  classesGavetaBarra,
  larguraBarraCss,
} from '@/lib/sidebarMedidas';

/**
 * A barra lateral do Controle de Acessos.
 *
 * POR QUE ELA EXISTE. Até 10/09/2026 esta era a única tela de dentro do sistema
 * **sem barra lateral**: um cabeçalho próprio no topo, com o escudo, o título e
 * os botões "Trocar área" e "Sair" escritos à mão. Por isso era também a única
 * sem o cartão do usuário. A primeira correção foi montá-la dentro do
 * `EquipeLayout`, e ela ganhou o cartão — mas com o menu do Digital Rotina
 * (Sprints, Kanban, Daily) ao lado de uma tela de administração. Barra que não
 * fala da página é pior do que barra nenhuma: ela mente sobre onde você está.
 *
 * O MENU SÃO AS ABAS. As sete seções eram `TabsTrigger` numa fila só, e sete
 * abas numa fila já estouram a largura em telas médias. Na coluna elas cabem
 * com folga, e a barra passa a dizer o que a área tem — que é o que as outras
 * oito barras fazem.
 *
 * A seção ativa continua sendo ESTADO, não rota. Sete rotas novas custariam
 * sete linhas em `src/config/protectedPages.ts` (ver a regra inegociável no
 * AGENTS.md) e um recorte de permissão por seção que ninguém pediu; o `Tabs` do
 * Radix continua no lugar, só que dirigido daqui.
 */

export interface AcessosLayoutProps {
  /** Seção aberta. É estado da página, não rota (ver a nota acima). */
  secao: IdDeSecaoDeAcessos;
  onSecaoChange: (secao: IdDeSecaoDeAcessos) => void;
  children: React.ReactNode;
}

export const AcessosLayout = ({ secao, onSecaoChange, children }: AcessosLayoutProps) => {
  const navigate = useNavigate();
  const barra = useSidebarRecolhimentoController();
  const { collapsed, setCollapsed, emGaveta } = barra;
  useFecharGavetaAoNavegar(barra);
  // Trilho de ícones é coisa de desktop. A gaveta, quando abre, abre inteira:
  // um trilho de 80px num celular ocupa espaço e não diz o nome de nada.
  const trilho = collapsed && !emGaveta;

  const escolher = (id: IdDeSecaoDeAcessos) => {
    onSecaoChange(id);
    // Aqui a seção não muda a rota, então `useFecharGavetaAoNavegar` não é
    // acionado: no celular a gaveta ficaria aberta em cima do conteúdo que a
    // pessoa acabou de pedir.
    if (emGaveta) setCollapsed(true);
  };

  return (
    <div
      // Sem fundo de página: quem pinta é o `body`, uma vez, no `index.css`.
      className="min-h-screen flex w-full relative"
    >
      {/* Fora do <aside> para não ser clipado pelo `overflow` dele. */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-6 left-[calc(var(--sidebar-width)-12px)] z-30 h-6 w-6 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground shadow-sm max-md:hidden"
        style={{ '--sidebar-width': larguraBarraCss(trilho) } as React.CSSProperties}
        onClick={() => setCollapsed(!collapsed)}
        title={trilho ? 'Expandir menu' : 'Recolher menu'}
      >
        {trilho ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      <aside
        className={`${classeLarguraBarra(trilho)} ${classesGavetaBarra(collapsed)} bg-card border-r border-border/60 flex flex-col transition-all duration-300 flex-shrink-0 sticky top-0 h-screen overflow-y-auto`}
      >
        <div className={`${classeRecuoCabecalho(trilho)} border-b border-border/60`}>
          {trilho ? (
            <div className="flex justify-center">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-foreground text-lg">{AREAS.acessos.nome}</h2>
                <p className="text-xs text-muted-foreground">{AREAS.acessos.subtitulo}</p>
              </div>
            </div>
          )}
        </div>

        <nav className="p-4 space-y-1">
          {SECOES_DE_ACESSOS.map((item) => (
            <button
              key={item.id}
              type="button"
              // O cromo é o compartilhado: pílula cheia no ativo, quadrado de
              // 40px no trilho. Sem ele esta barra nasceria com a tinta de 10%
              // que as outras oito já deixaram para trás.
              className={classesItemDaBarra({ ativo: secao === item.id, trilho })}
              onClick={() => escolher(item.id)}
              title={trilho ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!trilho && <span className="flex-1 text-left">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-border/60 space-y-2">
          {/* Cartão do usuário: padrão compartilhado, com o recolhido embutido.
              É por ele que se sai do sistema — o "Sair" que ficava no cabeçalho
              desta tela mora no menu dele desde 10/09/2026. */}
          <SidebarCartaoUsuario area="acessos" collapsed={trilho} />

          <Button
            variant="ghost"
            className={`w-full ${trilho ? 'justify-center px-2' : 'justify-start px-3'} py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-primary transition-colors ${FACE_DA_BARRA}`}
            onClick={() => navigate('/equipe/digital')}
            title={trilho ? 'Trocar área' : undefined}
          >
            <ArrowLeft className={`h-4 w-4 ${trilho ? '' : 'mr-3'}`} />
            {!trilho && 'Trocar área'}
          </Button>
        </div>
      </aside>

      {/* Fundo que fecha a gaveta no toque. Só aparece abaixo de `md`. */}
      <SidebarFundoGaveta aberta={!collapsed} onFechar={() => setCollapsed(true)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="min-h-16 border-b border-border/60 bg-card flex items-center justify-between px-4 py-2 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground"
              onClick={() => setCollapsed(!collapsed)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <TituloDaPagina
                titulo={rotuloDaSecao(secao)}
                subtitulo={AREAS.acessos.subtitulo}
                sobretitulo={AREAS.acessos.nome}
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default AcessosLayout;
