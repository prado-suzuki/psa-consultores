import { AREAS } from '@/lib/nomeDaArea';
import { TituloDaPagina } from '@/components/layout/TituloDaPagina';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ButtonTooltip } from '@/components/ui/button-tooltip';
import { GrupoDaBarra } from '@/components/layout/GrupoDaBarra';
import TaxWorkIcon from '@/components/equipe/fiscal/TaxWorkIcon';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';
import { PendingTicketsAlert } from '@/components/notifications/PendingTicketsAlert';
import {
  Home,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Menu,
  Plus,
  ArrowLeft,
  ArrowLeftRight,
  FileCode2,
  FolderSearch,
  ClipboardList,
  ChartColumn,
  FileSpreadsheet,
  Target,
  Database,
  Calculator,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import { DEV_HUBS } from '@/constants/devHubDefinitions';
import { DEV_NAV_LABELS } from '@/constants/devNavLabels';
import { TELAS_DO_DEV } from '@/config/telasDoDigitalDev';
import { SidebarCartaoUsuario } from '@/components/shared/SidebarCartaoUsuario';
import {
  useFecharGavetaAoNavegar,
  useSidebarRecolhimentoController,
} from '@/hooks/useSidebarRecolhimentoController';
import { SidebarFundoGaveta } from '@/components/shared/SidebarFundoGaveta';
import {
  classeLarguraBarra,
  classeRecuoCabecalho,
  classesGavetaBarra,
} from '@/lib/sidebarMedidas';
import { classesItemDaBarra } from '@/lib/barraLateralCromo';
import { manualDaRota } from '@/constants/devManuais';
import { resolverCabecalhoDoDev, type CabecalhoDoDev } from '@/config/telasDoDigitalDev';
import { cn } from '@/lib/utils';

/**
 * Ou `tela` — o nome e a explicação vindos de `@/config/telasDoDigitalDev` — ou
 * `title`/`subtitle` escritos à mão, para as telas sem nome fixo (o detalhe da
 * ferramenta exibe o nome que vem do banco). Nunca os dois: o tipo não compila.
 */
type DevLayoutProps = CabecalhoDoDev & {
  children: React.ReactNode;
  headerActions?: React.ReactNode;
};

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  matchPaths?: string[];
}

const navItems: NavItem[] = [
  /*
    "Início", e não o nome da tela, É O PADRÃO DAS OUTRAS TRÊS ÁREAS: a barra da
    Tax Projects, a da OSG Projects e a da OSG Work abrem todas com um item
    `Início` de ícone de casa. Esta era a única fora, mostrando o título comprido
    ("Ferramentas Tax Work") como primeiro item do menu. Apontado pela
    consultoria em 22/09/2026.

    Isso ABRE EXCEÇÃO à regra do `telasDoDigitalDev`, que manda o rótulo do menu
    ser o mesmo nome que a página exibe. A regra existe para NOME DE TELA, e é
    onde ela vale. "Início" não é nome de tela, é palavra de NAVEGAÇÃO, e as
    outras três áreas já a tratam assim.
  */
  { icon: Home, label: 'Início', path: '/equipe/tax/work' },
  { icon: Plus, label: DEV_NAV_LABELS.novaFerramenta, path: '/equipe/tax/work/nova-ferramenta' },
  // `FileCode2` e não `LayoutDashboard`: os dois itens vinham com o MESMO
  // ícone, e enquanto a barra não tinha trilho isso não aparecia — o ícone
  // sequer era desenhado. No trilho de 80px sobra só o ícone, e dois botões
  // idênticos não se distinguem.
  { icon: FileCode2, label: DEV_NAV_LABELS.consultaXmls, path: '/equipe/tax/work/consulta-xmls' },
];

const spedSubItems: NavItem[] = DEV_HUBS.consultaSped.options.map((option) => ({
  icon: option.icon,
  label: option.title,
  path: option.path,
}));

const pisCofinsSubItems: NavItem[] = DEV_HUBS.levantamentoPisCofins.options.map((option) => ({
  icon: option.icon,
  label: option.title,
  path: option.path,
}));

const analiseIcmsSubItems: NavItem[] = DEV_HUBS.analiseIcms.options.map((option) => ({
  icon: option.icon,
  label: option.title,
  path: option.path,
}));

const perdcompSubItems: NavItem[] = DEV_HUBS.perdcomp.options.map((option) => ({
  icon: option.icon,
  label: option.title,
  path: option.path,
}));

const planejamentoTributarioSubItems: NavItem[] = DEV_HUBS.planejamentoTributario.options.map(
  (option) => ({
    icon: option.icon,
    label: option.title,
    path: option.path,
  }),
);

const gerenciarDadosSubItems: NavItem[] = DEV_HUBS.gerenciarDados.options.map((option) => ({
  icon: option.icon,
  label: option.title,
  path: option.path,
}));

const navItemsAfterGroups: NavItem[] = [
  {
    icon: Calculator,
    label: DEV_NAV_LABELS.calculadoraIbsCbs,
    path: '/equipe/tax/work/calculadora-ibs-cbs',
  },
  {
    icon: FileSpreadsheet,
    label: DEV_NAV_LABELS.controleBalancetes,
    path: '/equipe/tax/work/controle-balancetes',
  },
  { icon: BookOpen, label: DEV_NAV_LABELS.procedimentos, path: '/equipe/tax/work/procedimentos' },
];

export const DevLayout = ({ children, headerActions, ...cabecalho }: DevLayoutProps) => {
  const { title, subtitle } = resolverCabecalhoDoDev(cabecalho);
  const navigate = useNavigate();
  const location = useLocation();
  // A rota decide o manual: nenhuma página precisa passar a URL (ver `devManuais`).
  const manualDestaTela = manualDaRota(location.pathname);
  // O recolhimento automático em telas de trabalho largo mora no hook — é a
  // tela que pede, com `useTelaDeTrabalhoLargo()`; o layout não conhece rotas.
  const barra = useSidebarRecolhimentoController();
  const { collapsed, setCollapsed, emGaveta } = barra;
  // No celular a barra é gaveta: cada navegação a fecha (ver o hook).
  useFecharGavetaAoNavegar(barra);
  // Recolhida, a barra vira TRILHO de 80px com os ícones — não some mais. Era
  // a última que zerava a largura (a Rotina saiu de lá antes), e sumir deixa o
  // usuário sem âncora: o menu inteiro desaparece e o único caminho de volta é
  // o hambúrguer do cabeçalho. Na gaveta não existe trilho: ela é sempre de
  // 16rem e desliza para fora da tela com os rótulos montados.
  const trilho = collapsed && !emGaveta;

  /*
    As classes do rótulo no recolhimento, iguais às da OSG: `opacity-0` sozinho
    não basta, porque invisível não é o mesmo que SEM ESPAÇO. O item recolhido é
    uma caixa de 40px com `justify-center`, e um rótulo transparente que continua
    ocupando largura faz o flex centralizar ÍCONE + RÓTULO, tirando o ícone do
    centro. Por isso `w-0 overflow-hidden` junto.

    Passar sempre por ÚLTIMO no `cn()`: o `twMerge` dá a vitória a quem vem
    depois, e um `w-4` posterior ao `w-0` devolveria a largura.
  */
  const rotuloCls = cn(
    'transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
    trilho ? 'w-0 overflow-hidden opacity-0' : 'opacity-100',
  );

  const isItemActive = (item: NavItem) =>
    item.path === location.pathname || item.matchPaths?.includes(location.pathname) === true;

  const isSpedActive =
    location.pathname === DEV_HUBS.consultaSped.landingPath ||
    spedSubItems.some((item) => location.pathname === item.path);
  const isPisCofinsActive =
    location.pathname === DEV_HUBS.levantamentoPisCofins.landingPath ||
    pisCofinsSubItems.some((item) => location.pathname === item.path);
  const isAnaliseIcmsActive =
    location.pathname === DEV_HUBS.analiseIcms.landingPath ||
    analiseIcmsSubItems.some((item) => location.pathname === item.path);
  const isPerdcompActive =
    location.pathname === DEV_HUBS.perdcomp.landingPath ||
    perdcompSubItems.some((item) => location.pathname === item.path);
  const isPlanejamentoTributarioActive =
    location.pathname === DEV_HUBS.planejamentoTributario.landingPath ||
    planejamentoTributarioSubItems.some((item) => location.pathname === item.path);
  const isGerenciarDadosActive =
    location.pathname === DEV_HUBS.gerenciarDados.landingPath ||
    gerenciarDadosSubItems.some((item) => location.pathname === item.path);

  return (
    <div
      // Sem fundo de página: quem pinta é o `body`, uma vez, no `index.css`.
      // Oito layouts decidindo isso por conta própria foi como cinco deles
      // acabaram pintando com a superfície REBAIXADA. Ver a nota lá.
      className="flex min-h-screen w-full"
    >
      {/* A barra e o botão de recolher são IRMÃOS, e não pai e filho: o botão
          pousa meio fora da borda direita (`-right-3`) e o `overflow-y-auto` da
          barra o recortaria pela metade. Mesmo arranjo da Tax, da OSG e da
          Rotina. */}
      <div
        className={cn(
          // `relative` aqui apaga o `sticky` no `tailwind-merge`. Ver a nota
          // no `FiscalSidebar`.
          'sticky top-0 h-screen flex-shrink-0 transition-all duration-300 ease-in-out',
          classeLarguraBarra(trilho),
          classesGavetaBarra(collapsed),
        )}
      >
        {/* `max-md:hidden`: na gaveta quem abre é o hambúrguer do cabeçalho e
            quem fecha é o fundo escuro — aqui o botão pousaria fora da tela. */}
        <ButtonTooltip text={trilho ? 'Expandir menu' : 'Recolher menu'} side="right">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-6 -right-3 z-20 h-6 w-6 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground shadow-sm max-md:hidden"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={trilho ? 'Expandir menu' : 'Recolher menu'}
          >
            {trilho ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </Button>
        </ButtonTooltip>

        <aside className="h-full w-full border-r border-border/60 bg-card flex flex-col overflow-x-hidden overflow-y-auto scrollbar-hide">
            {/* Cabeçalho. No trilho sobra um SELO, que esta barra não tinha: o
                cabeçalho dela era texto puro, e texto puro não sobrevive a
                80px. O recuo cai de `p-6` para `p-4` — com 24px de cada lado
                sobrariam 32px de largura útil para um selo de 40px. */}
            <div
              className={cn(
                'flex-shrink-0 border-b border-border/60',
                classeRecuoCabecalho(trilho),
              )}
            >
              {trilho ? (
                <div className="flex justify-center">
                  <div className="flex h-10 w-10 items-center justify-center">
                    <TaxWorkIcon size={40} className="block h-full w-full" />
                  </div>
                </div>
              ) : (
                // O SELO É O DA ÁREA, não um ícone de biblioteca dentro de um
                // quadrado tingido. Era um `LayoutDashboard` sobre `bg-primary/10`,
                // enquanto as duas barras da OSG mostram o selo hexagonal delas e
                // a Tax Projects mostra o porquinho. Apontado pela consultoria em
                // 22/09/2026. A caixa tingida saiu junto: o selo já tem forma e
                // fundo próprios, e o quadrado atrás dele criava uma moldura que
                // nenhuma outra área tem.
                //
                // O selo entra também aberta. Sem ele o cabeçalho era só texto
                // e fechava 92px contra os 88 das outras oito — 4px que faziam
                // a linha divisória pular ao trocar de área.
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                    <TaxWorkIcon size={40} className="block h-full w-full" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-foreground">{AREAS.dev.nome}</h2>
                    <p className="text-xs text-muted-foreground">{AREAS.dev.subtitulo}</p>
                  </div>
                </div>
              )}
            </div>

            <nav className="space-y-1 p-4">
              {/*
                O RÓTULO DO GRUPO PREFERE O ENCURTADO. Dois títulos não cabem nos
                ~210px da barra e saíam com reticências no meio da palavra
                ("Consulta de arquivos S..."). O nome inteiro continua na página,
                que é onde ele informa; ver `rotuloNaBarra` em
                `telasDoDigitalDev`.
              */}
              {/*
                `<button>` NATIVO, e não o `Button` do shadcn. O componente traz
                `justify-center`, `gap-2` e `px-4` próprios, que brigavam com o
                `gap-2.5 px-2.5` do `classesItemDaBarra`: os itens simples
                nasciam deslocados alguns pixels à direita dos cabeçalhos de
                grupo, que já usam `<button>` nativo. Na barra aberta isso lia
                como texto centralizado no meio de uma lista alinhada à esquerda.
                Apontado pela consultoria em 22/09/2026, com print.

                O rótulo em `<span>` com `rotuloCls` é o mesmo do `GrupoDaBarra`:
                ele desbota e ZERA a largura no trilho, em vez de sumir de
                estalo — e sem zerar a largura o flex centraliza ícone + rótulo e
                tira o ícone do centro.
              */}
              {navItems.map((item) => (
                <ButtonTooltip key={item.path} text={trilho ? item.label : undefined} side="right">
                  <button
                    type="button"
                    className={classesItemDaBarra({ ativo: isItemActive(item), trilho })}
                    onClick={() => navigate(item.path)}
                    aria-label={trilho ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className={cn('flex-1 min-w-0 truncate text-left', rotuloCls)}>
                      {item.label}
                    </span>
                  </button>
                </ButtonTooltip>
              ))}

              <GrupoDaBarra
                icone={FolderSearch}
                rotulo={TELAS_DO_DEV.consultaSped.rotuloNaBarra ?? DEV_HUBS.consultaSped.label}
                ativo={isSpedActive}
                itens={spedSubItems}
                trilho={trilho}
                rotuloCls={rotuloCls}
                classeDaBorda="border-border"
                aoClicarNoCabecalho={() => navigate(DEV_HUBS.consultaSped.landingPath)}
              />

              <GrupoDaBarra
                icone={ClipboardList}
                rotulo={TELAS_DO_DEV.levantamentoPisCofins.rotuloNaBarra ?? DEV_HUBS.levantamentoPisCofins.label}
                ativo={isPisCofinsActive}
                itens={pisCofinsSubItems}
                trilho={trilho}
                rotuloCls={rotuloCls}
                classeDaBorda="border-border"
                aoClicarNoCabecalho={() => navigate(DEV_HUBS.levantamentoPisCofins.landingPath)}
              />

              <GrupoDaBarra
                icone={ChartColumn}
                rotulo={DEV_HUBS.analiseIcms.label}
                ativo={isAnaliseIcmsActive}
                itens={analiseIcmsSubItems}
                trilho={trilho}
                rotuloCls={rotuloCls}
                classeDaBorda="border-border"
                aoClicarNoCabecalho={() => navigate(DEV_HUBS.analiseIcms.landingPath)}
              />

              <GrupoDaBarra
                icone={ArrowLeftRight}
                rotulo={DEV_HUBS.perdcomp.label}
                ativo={isPerdcompActive}
                itens={perdcompSubItems}
                trilho={trilho}
                rotuloCls={rotuloCls}
                classeDaBorda="border-border"
                aoClicarNoCabecalho={() => navigate(DEV_HUBS.perdcomp.landingPath)}
              />

              {navItemsAfterGroups.map((item) => (
                <ButtonTooltip key={item.path} text={trilho ? item.label : undefined} side="right">
                  <button
                    type="button"
                    className={classesItemDaBarra({ ativo: isItemActive(item), trilho })}
                    onClick={() => navigate(item.path)}
                    aria-label={trilho ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className={cn('flex-1 min-w-0 truncate text-left', rotuloCls)}>
                      {item.label}
                    </span>
                  </button>
                </ButtonTooltip>
              ))}

              <GrupoDaBarra
                icone={Target}
                rotulo={DEV_HUBS.planejamentoTributario.label}
                ativo={isPlanejamentoTributarioActive}
                itens={planejamentoTributarioSubItems}
                trilho={trilho}
                rotuloCls={rotuloCls}
                classeDaBorda="border-border"
                aoClicarNoCabecalho={() => navigate(DEV_HUBS.planejamentoTributario.landingPath)}
              />

              <GrupoDaBarra
                icone={Database}
                rotulo={DEV_HUBS.gerenciarDados.label}
                ativo={isGerenciarDadosActive}
                itens={gerenciarDadosSubItems}
                trilho={trilho}
                rotuloCls={rotuloCls}
                classeDaBorda="border-border"
                aoClicarNoCabecalho={() => navigate(DEV_HUBS.gerenciarDados.landingPath)}
              />
            </nav>

            <div className="mt-auto space-y-2 border-t border-border/60 p-4">
              {/* Era markup copiado a mao — a setima copia deste cartao, sem o
                  estado recolhido e mostrando o pedaco do e-mail no lugar do
                  nome. O componente compartilhado traz os dois de graca. */}
              <SidebarCartaoUsuario area="dev" collapsed={trilho} />

              <ButtonTooltip text={trilho ? 'Voltar para Tax' : undefined} side="right">
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full rounded-lg py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary',
                    trilho ? 'justify-center px-2' : 'justify-start px-3',
                  )}
                  onClick={() => navigate('/equipe/tax')}
                  aria-label={trilho ? 'Voltar para Tax' : undefined}
                >
                  <ArrowLeft className={cn('h-4 w-4', !trilho && 'mr-3')} />
                  {!trilho && 'Voltar para Tax'}
                </Button>
              </ButtonTooltip>

            </div>
        </aside>
      </div>

      {/* Fundo que fecha a gaveta no toque. Só aparece abaixo de `md`. */}
      <SidebarFundoGaveta aberta={!collapsed} onFechar={() => setCollapsed(true)} />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* `min-h` e não `h-16` fixo, para o título poder crescer sem cortar:
            com altura fixa mais o `overflow-hidden` do <main>, ele cortava no
            meio. Desde 10/09/2026 os SETE cabeçalhos do produto são assim,
            porque o título subiu para 30px e a 64px não cabe mais.

            ⚠️ ESTA NOTA JÁ ESTEVE ERRADA, e a correção é sobre o método de
            medir. O texto original dizia que "alguns títulos de hub (ex.
            PIS/COFINS, PERDCOMP) passam de 100 caracteres em CAIXA ALTA". Em
            10/09/2026 eu declarei isso FALSO e escrevi a refutação aqui —
            errado. O texto original estava CERTO.

            O que eu medi foi `title="..."` literal nas páginas, e achei 28
            caracteres no máximo. O que eu não medi foi o título que chega por
            VARIÁVEL: o `DevHubPage.tsx:19` passa `title={hub.title}`, e os
            hubs vivem em `constants/devHubDefinitions.ts`. Lá estava o de 112
            caracteres, em caixa alta:

              LEVANTAMENTO PIS/COFINS — PROGRAMA DE INTEGRAÇÃO SOCIAL E
              CONTRIBUIÇÃO PARA O FINANCIAMENTO DA SEGURIDADE SOCIAL

            e mais um de 99 (PERDCOMP) — os DOIS hubs que a nota citava pelo
            nome. Ela era precisa; meu comando é que era estreito.

            A caixa alta saiu em 10/09 (catraca em `tituloEmCaixaAlta.test.ts`),
            o comprimento não: o maior segue com 112 caracteres, agora em caixa
            baixa. É por isso que `min-h` continua obrigatório aqui.

            O comando que enxerga os dois caminhos:

              grep -rhoE "(^|[^a-z])title:\s*'[^']+'" src/constants/devHubDefinitions.ts
              grep -rh -A 2 '<DevLayout' src/pages/equipe/dev/*.tsx | grep -oE '(^|[^a-z])title="[^"]*"'

            (o `[^a-z]` é obrigatório nos dois: sem ele o grep casa o fim de
            `subtitle=` e o número sai errado — foi o que aconteceu comigo.) */}
        <header className="flex min-h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-2 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setCollapsed(false)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}

            <TituloDaPagina
              titulo={title}
              subtitulo={subtitle}
              sobretitulo={AREAS.dev.nome}
            />
          </div>

          {/*
            `flex-shrink-0` AQUI É O CONSERTO DA TELA ESTREITA. Sem ele este bloco
            se recusava a encolher e roubava a largura do título, que era o único
            vizinho com `min-w-0`: em meia tela ou no celular, "Análise de ICMS"
            quebrava letra por letra numa coluna de uns 40px. Reportado pela
            consultoria em 22/09/2026, com print.

            A causa é só desta área: a OSG e a Tax Projects têm o mesmo cabeçalho
            e não quebram porque não têm o botão do manual, que é o elemento a
            mais. Ele fica, porque é o que a Tax tem de melhor aqui; o que cede é
            o RÓTULO dele, abaixo de `sm`.
          */}
          <div className="flex flex-shrink-0 items-center gap-3">
            {/* O manual sai do SUBTÍTULO e vira ação do cabeçalho. Antes ele era
                apêndice da frase ("... | Acessar SOP desta ferramenta"), o que
                misturava ação de interface com a explicação da tela — e só
                aparecia nas três páginas que passavam a URL. Agora a rota resolve
                pelo mesmo registro que o catálogo usa, então o botão nasce no
                mesmo lugar em toda ferramenta que tenha manual. */}
            {manualDestaTela && (
              <ButtonTooltip text="Acessar manual">
                <Button variant="outline" size="sm" asChild className="gap-1.5">
                  <a
                    href={manualDestaTela}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Acessar manual"
                  >
                    <BookOpen className="h-4 w-4" />
                    {/* O rótulo some no estreito e o botão vira só ícone; o nome
                        segue no `aria-label` e no tooltip. */}
                    <span className="hidden sm:inline">Acessar manual</span>
                    <ExternalLink className="hidden h-3.5 w-3.5 sm:inline" />
                  </a>
                </Button>
              </ButtonTooltip>
            )}
            {/* SEM espelho: "chamados dos clientes desta área" não se aplica ao
                Digital, que não tem clientes. Ver o bloco `ESPELHO` em
                `src/lib/areaTheme.ts`. */}
            <NotificationPopover baseDosChamados="/equipe/chamados" backTo={location.pathname} />
            {headerActions}
          </div>
        </header>

        <PendingTicketsAlert navigateTo="/equipe/chamados" backTo={location.pathname} />

        <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto">
          <div className="w-full min-w-0 p-4 md:p-5">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default DevLayout;
