import { AREAS } from '@/lib/nomeDaArea';
import { TituloDaPagina } from '@/components/layout/TituloDaPagina';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SelecaoDeCliente } from '@/components/equipe/selecao/SelecaoDeCliente';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';
import {
  Briefcase,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  ArrowLeft,
  Shield,
  Users,
  Landmark,
  FileText,
  Building2,
  AlertCircle,
  FileSignature,
  FolderArchive,
  PieChart,
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  FileBarChart2,
  MessageSquare,
  MessagesSquare,
  Home,
  LineChart,
  Rocket,
  Scale,
  Sprout,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useFecharGavetaAoNavegar,
  useSidebarRecolhimentoController,
} from '@/hooks/useSidebarRecolhimentoController';
import { SidebarCartaoUsuario } from '@/components/shared/SidebarCartaoUsuario';
import { SidebarFundoGaveta } from '@/components/shared/SidebarFundoGaveta';
import {
  classeLarguraBarra,
  classeRecuoCabecalho,
  classesGavetaBarra,
} from '@/lib/sidebarMedidas';
import { FACE_DA_BARRA, classesItemDaBarra } from '@/lib/barraLateralCromo';
import OsgWorkIcon from '@/components/equipe/osg/OsgWorkIcon';
import OsgProjectsIcon from '@/components/equipe/osg/OsgProjectsIcon';
import { linkEspelhado } from '@/lib/areaTheme';

const OsgWorkClienteBar = () => {
  const { clienteId, setClienteId } = useOsgWork();
  const { data: clientes = [], isLoading } = useClientesLista();
  const clienteSelecionado = clientes.find((c) => c.id === clienteId);
  const semCliente = !clienteId;

  return (
    <div
      className={cn(
        'border-b px-6 py-3 transition-colors',
        semCliente ? 'bg-osg-50 border-osg-100' : 'bg-osg-50/40 border-osg-100',
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <div
            className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center',
              semCliente ? 'bg-osg-500 text-white animate-pulse' : 'bg-osg-100 text-osg-700',
            )}
          >
            <Building2 className="h-4 w-4 flex-shrink-0" />
          </div>
          <Label className="text-sm font-bold text-osg-700 uppercase tracking-wide">Cliente</Label>
        </div>
        <div className="flex-1 max-w-md">
          <SelecaoDeCliente
            clientes={clientes}
            value={clienteId}
            onChange={setClienteId}
            loading={isLoading}
            placeholder="Selecione um cliente..."
            className={cn(
              'w-full min-w-0 h-10 font-medium',
              semCliente
                ? 'border-2 border-osg-300 ring-2 ring-osg-100 bg-background'
                : 'border-osg-200 bg-background',
            )}
          />
        </div>
        {semCliente ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-osg-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Selecione um cliente para usar as ferramentas</span>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground truncate">
            Trabalhando em: <span className="font-semibold">{clienteSelecionado?.nome}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface OsgLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export const OsgLayout = ({ children, title, subtitle, headerActions }: OsgLayoutProps) => {
  const { isAdmin, isLider } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Telas de trabalho largas recolhem a barra sozinhas — quem pede é a própria
  // tela, com `useTelaDeTrabalhoLargo()`; este layout não conhece rota nenhuma.
  const barra = useSidebarRecolhimentoController();
  const { collapsed, setCollapsed, emGaveta } = barra;
  // No celular a barra é gaveta: cada navegação a fecha (ver o hook).
  useFecharGavetaAoNavegar(barra);
  // Trilho de ícones é coisa de desktop. A gaveta, quando abre, abre inteira:
  // um trilho de 80px num celular ocupa espaço e não diz o nome de nada.
  const trilho = collapsed && !emGaveta;
  // "Gerencial" só aparece para líder+ (isLider é estrito, não engloba admin).
  const canGerencial = isAdmin || isLider;

  // Os rótulos ficam SEMPRE montados e são clipados pela largura da <aside>.
  // Desmontá-los (o `{!trilho && ...}` de antes) fazia o texto sumir de
  // estalo enquanto a barra ainda encolhia — é isso que dava a sensação de
  // corte seco. Agora eles desbotam e deslizam junto com a largura: ao recolher
  // saem primeiro (sem delay), ao expandir entram depois que a barra já abriu.
  const rotuloCls = cn(
    'transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
    trilho
      ? // `w-0 overflow-hidden` além do `opacity-0`: invisível não é o mesmo que
        // sem espaço. O item recolhido é uma caixa de 40px com `justify-center`
        // (ver `classesItemDaBarra`), e um rótulo transparente que continua
        // ocupando a largura dele faz o flex centralizar ÍCONE + RÓTULO — o
        // ícone sai do centro, e cada um sai um tanto diferente, porque o
        // deslocamento depende do tamanho do rótulo. O módulo do cromo conta
        // com o chamador omitindo o rótulo (`{!trilho && …}`); aqui ele não é
        // omitido de propósito, para desbotar em vez de sumir de estalo, então
        // quem tira o espaço é esta linha.
        //
        // `flex-none` junto do `w-0`: três rótulos de cabeçalho de grupo
        // (Onboarding, Governança, Documentos) traziam `flex-1`, que liga
        // `flex-grow: 1` — o rótulo de largura ZERO voltava a esticar e
        // empurrava o ícone. Medido: 12,5px fora do centro, só nesses três.
        // Por isso os pontos de uso passam `rotuloCls` por ÚLTIMO no `cn()`:
        // `w-0` e `flex-none` só vencem se vierem depois.
        'pointer-events-none w-0 flex-none overflow-hidden -translate-x-1 opacity-0'
      : 'opacity-100 delay-150',
  );

  // O tema da área NÃO é aplicado aqui: quem o aplica é o `AreaThemeProvider`,
  // a partir da rota, acima dos gates de acesso (ver `src/lib/areaTheme.ts`).

  const isWork = location.pathname.startsWith('/equipe/osg/work');
  const isProjects =
    location.pathname.startsWith('/equipe/osg/inicio') ||
    location.pathname.startsWith('/equipe/osg/dashboard') ||
    location.pathname.startsWith('/equipe/osg/projetos') ||
    // `/equipe/osg/gerencial` cobre tudo do agrupador novo, inclusive
    // logs-equipe e chamados, que agora vivem debaixo dele.
    location.pathname.startsWith('/equipe/osg/gerencial') ||
    location.pathname.startsWith('/equipe/osg/auditoria');

  // Itens do agrupador "Projetos" — espelhado da área Tax (Dashboard / Projetos /
  // Auditoria). Expande no hover e fica aberto quando uma rota filha está ativa.
  const projetosItems = [
    { path: '/equipe/osg/projetos/clientes', label: 'Clientes', icon: ClipboardList },
    { path: '/equipe/osg/projetos/cadastro', label: 'Projetos e tarefas', icon: FolderKanban },
    { path: '/equipe/osg/projetos/feed', label: 'Feed', icon: MessagesSquare },
  ];
  const isProjetosActive = location.pathname.startsWith('/equipe/osg/projetos');

  // Itens do agrupador "Gerencial" — espelha o da Tax. "Dashboards" é a tela que
  // antes se chamava Gerencial (mesmo endereço, rótulo novo); chamados e logs
  // vieram para debaixo dela.
  const gerencialItems = [
    { path: '/equipe/osg/gerencial', label: 'Dashboards', icon: LayoutDashboard },
    { path: '/equipe/osg/gerencial/chamados', label: 'Gestão de Chamados', icon: MessageSquare },
    {
      path: '/equipe/osg/gerencial/chamados/dashboard',
      label: 'Dashboard de Chamados',
      icon: LineChart,
    },
    { path: '/equipe/osg/gerencial/logs-equipe', label: 'Logs de Uso', icon: Shield },
  ];
  const isGerencialActive = location.pathname.startsWith('/equipe/osg/gerencial');

  // Itens do agrupador "Documentos" — expande no hover (e fica aberto na rota ativa)
  const docItems = [
    { path: '/equipe/osg/work/biblioteca-modelos', label: 'Biblioteca de Modelos' },
    { path: '/equipe/osg/work/montagem-documentos', label: 'Montagem de Documentos' },
    { path: '/equipe/osg/work/gerar-documento', label: 'Gerar Documento' },
  ];
  const isDocsActive = docItems.some((item) => item.path === location.pathname);

  // Itens do agrupador "Onboarding" — a solicitação inicial e a tela onde os
  // arquivos que chegaram viram cadastro. Mesmo padrão de dropdown por hover.
  const onbItems = [
    // O rótulo acompanha o título da tela (10/09/2026, Patrícia): mesmo nome
    // para a mesma coisa no menu e no cabeçalho. A rota segue `onboarding`
    // porque está gravada em `page_permissions` — endereço é técnico, rótulo é
    // do usuário, e os dois não precisam casar.
    { path: '/equipe/osg/work/onboarding', label: 'Solicitação de documentos' },
    { path: '/equipe/osg/work/onboarding/cadastro', label: 'Cadastro por Documento' },
  ];
  const isOnbActive = onbItems.some((item) => item.path === location.pathname);

  // Itens do agrupador "Documentos do Cliente" — mesmo padrão de dropdown por hover
  const docClienteItems = [
    { path: '/equipe/osg/work/documentos', label: 'Explorador de arquivos' },
    // Singular desde 10/09/2026: eram duas abas (Pendências e Planejamento
    // tributário) e sobrou uma. A rota segue no plural — é endereço, não rótulo.
    { path: '/equipe/osg/work/checklists', label: 'Checklist de documentos' },
  ];
  const isDocClienteActive = docClienteItems.some((item) => item.path === location.pathname);

  // Itens do agrupador "Governança" (GOV-01). Nasce com um item só, de propósito:
  // o levantamento mapeou seis documentos de governança, e cada um vira tela ou
  // parte de tela. Criar o agrupador agora evita que o segundo entre solto e o
  // terceiro obrigue a renomear endereço já com permissão concedida, o que exige
  // migration com UPDATE porque o sincronizador de páginas casa por CAMINHO.
  const govItems = [
    { path: '/equipe/osg/work/governanca/orgaos', label: 'Órgãos de Governança' },
    { path: '/equipe/osg/work/governanca/matriz', label: 'Matriz de Alçadas' },
  ];
  const isGovActive = govItems.some((item) => item.path === location.pathname);

  // Os NOMES moram em `@/lib/nomeDaArea`; a decisão de qual rota é qual fica
  // aqui, onde os predicados já existem para o menu.
  const area = isWork ? AREAS.osgWork : isProjects ? AREAS.osgProjects : AREAS.osg;
  const areaLabel = area.nome;
  const areaSubtitle = area.subtitulo;
  const AreaIcon = isWork ? (
    <OsgWorkIcon size={40} className="h-full w-full block" />
  ) : isProjects ? (
    <OsgProjectsIcon size={40} className="h-full w-full block" />
  ) : (
    <Briefcase className="h-5 w-5 text-osg-600" />
  );

  return (
    <div
      // Sem fundo de página: quem pinta é o `body`, uma vez, no `index.css`.
      // Oito layouts decidindo isso por conta própria foi como cinco deles
      // acabaram pintando com a superfície REBAIXADA. Ver a nota lá.
      className="min-h-screen flex w-full"
    >
      {/* Sidebar wrapper — keeps toggle button outside the scroll container */}
      <div
        className={cn(
          'flex-shrink-0 sticky top-0 h-screen relative',
          // Só a largura anima (o `transition-all` de antes também pegava cor e
          // sombra). A curva é ease-out-quint: sai rápido e "pousa" devagar.
          //
          // A curva vai como propriedade arbitrária, e não pela utilitária
          // `ease` com valor entre colchetes: naquela forma o Tailwind 3 não
          // desambigua entre `transition-timing-function` e
          // `animation-timing-function`, avisa no build e DESCARTA a classe. A
          // barra vinha animando sem curva nenhuma — sem erro de build, de lint
          // ou de tipo. Mesmo defeito que a duração das linhas de lista tinha.
          'transition-[width] duration-500',
          '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
          'motion-reduce:transition-none',
          // 5rem, e não 4rem: ver docs/geral/sidebar-recolhe-em-tela-larga.md.
          classeLarguraBarra(trilho),
          // Abaixo de `md` a barra sai do fluxo e vira gaveta: sem isto ela come
          // 256px de um aparelho de 390px e o conteúdo quebra uma letra por linha.
          classesGavetaBarra(collapsed),
        )}
      >
        {/* Toggle Button — sibling of <aside> so it isn't clipped by overflow */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 -right-3 z-20 h-6 w-6 rounded-full border border-border bg-background hover:bg-muted text-muted-foreground shadow-sm max-md:hidden"
          onClick={() => setCollapsed(!collapsed)}
        >
          {trilho ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>

        {/* overflow-x-hidden: é este clipe que "engole" os rótulos conforme a
            largura diminui, em vez de eles sumirem de uma vez. */}
        <aside className="h-full w-full bg-background border-r border-border/60 flex flex-col overflow-y-auto overflow-x-hidden">
          {/* Header. `classeRecuoCabecalho` e não `px-4 py-6`: com o recuo
              fixo, a barra recolhida mantinha 88px de cabeçalho contra os 72
              das outras, e a linha divisória pulava ao trocar de área. */}
          <div className={cn(classeRecuoCabecalho(trilho), 'border-b border-border/60')}>
            {/* No trilho o `gap-3` sai. Ele parece inofensivo com o rótulo
                reduzido a zero, mas continua ocupando 12px: com 48px úteis
                (`p-4` em 80px), o selo de 40 mais o gap davam 52 e o
                `overflow-x-hidden` da barra comia a borda direita da logo —
                que foi como ela "sumiu". As outras cinco barras já trocam de
                arranjo aqui; esta era a que faltava. */}
            <div className={cn('flex items-center', trilho ? 'justify-center' : 'gap-3')}>
              <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
                {AreaIcon}
              </div>
              <div className={cn('min-w-0 whitespace-nowrap', rotuloCls)}>
                <h2 className={cn(FACE_DA_BARRA, 'font-semibold text-foreground text-lg')}>{areaLabel}</h2>
                <p className="text-xs text-muted-foreground">{areaSubtitle}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1">
            {/* ───── OSG Projects: Dashboard + Projetos (espelhado da área Tax). */}
            {/* Aparece só fora do OSG Work, que mantém suas próprias ferramentas. */}
            {isProjects && (
              <>
                <button
                  onClick={() => navigate('/equipe/osg/inicio')}
                  className={cn(
                                        classesItemDaBarra({ ativo: location.pathname === '/equipe/osg/inicio', trilho }),
                  )}
                >
                  <Home className="h-4 w-4 flex-shrink-0" />
                  <span className={cn('whitespace-nowrap', rotuloCls)}>Início</span>
                </button>
                <button
                  onClick={() => navigate('/equipe/osg/dashboard')}
                  className={cn(
                                        classesItemDaBarra({ ativo: location.pathname === '/equipe/osg/dashboard', trilho }),
                  )}
                >
                  <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                  <span className={cn('whitespace-nowrap', rotuloCls)}>Dashboard</span>
                </button>

                {/* Agrupador "Projetos" — expande no hover (e fica aberto na rota ativa) */}
                <div className="group/proj">
                  <button
                    type="button"
                    className={cn(
                                            // Cabeçalho de grupo: quem está aberto é o filho — ver `ancestral`.
                      classesItemDaBarra({ ativo: false, ancestral: isProjetosActive, trilho }),
                    )}
                  >
                    <FolderKanban className="h-4 w-4 flex-shrink-0" />
                    <span className={cn('whitespace-nowrap', rotuloCls)}>Projetos</span>
                    <ChevronDown
                      className={cn(
                        // `rotuloCls` por ÚLTIMO, e `ml-auto` só com a barra aberta. Antes o
                        // `w-4` vinha depois do `w-0` do `rotuloCls` e o twMerge dava a vitória
                        // ao `w-4`: no trilho a seta continuava com 16px e o `ml-auto` a jogava
                        // na borda direita, empurrando o ícone para a esquerda. Medido no DOM:
                        // ícone a 27,5px num trilho de centro 39,5 — 12,5px fora, só nos
                        // cabeçalhos de grupo, que são os únicos itens com três filhos.
                        'h-4 w-4 flex-shrink-0 duration-300',
                        !trilho && 'ml-auto',
                        isProjetosActive ? 'rotate-180' : 'group-hover/proj:rotate-180',
                        rotuloCls,
                      )}
                    />
                  </button>

                  <div
                    className={cn(
                      'grid transition-[grid-template-rows] duration-300 ease-out',
                      trilho
                        ? 'grid-rows-[0fr]'
                        : isProjetosActive
                          ? 'grid-rows-[1fr]'
                          : 'grid-rows-[0fr] group-hover/proj:grid-rows-[1fr]',
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div
                        className={cn(
                          'space-y-1 pt-1',
                          trilho ? '' : 'ml-2 pl-2 border-l border-osg-100',
                        )}
                      >
                        {projetosItems.map(({ path, label, icon: Icon }) => (
                          <button
                            key={path}
                            onClick={() => navigate(path)}
                            className={cn(
                                                            classesItemDaBarra({ ativo: location.pathname === path, trilho }),
                            )}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className={cn('whitespace-nowrap', rotuloCls)}>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ───── OSG Work: ferramentas próprias (inalteradas) ───── */}
            {isWork && (
              <>
                {/* Agrupador "Onboarding" — expande no hover (e fica aberto na rota ativa) */}
                <div className="group/onb">
                  <button
                    type="button"
                    className={cn(
                                            // Cabeçalho de grupo: quem está aberto é o filho — ver `ancestral`.
                      classesItemDaBarra({ ativo: false, ancestral: isOnbActive, trilho }),
                    )}
                  >
                    <Rocket className="h-4 w-4 flex-shrink-0" />
                    <span className={cn('flex-1 min-w-0 truncate text-left', rotuloCls)}>
                      Onboarding
                    </span>
                    <ChevronDown
                      className={cn(
                        // `rotuloCls` por ÚLTIMO, e `ml-auto` só com a barra aberta. Antes o
                        // `w-4` vinha depois do `w-0` do `rotuloCls` e o twMerge dava a vitória
                        // ao `w-4`: no trilho a seta continuava com 16px e o `ml-auto` a jogava
                        // na borda direita, empurrando o ícone para a esquerda. Medido no DOM:
                        // ícone a 27,5px num trilho de centro 39,5 — 12,5px fora, só nos
                        // cabeçalhos de grupo, que são os únicos itens com três filhos.
                        'h-4 w-4 flex-shrink-0 duration-300',
                        isOnbActive ? 'rotate-180' : 'group-hover/onb:rotate-180',
                        rotuloCls,
                      )}
                    />
                  </button>

                  <div
                    className={cn(
                      'grid transition-[grid-template-rows] duration-300 ease-out',
                      trilho
                        ? 'grid-rows-[0fr]'
                        : isOnbActive
                          ? 'grid-rows-[1fr]'
                          : 'grid-rows-[0fr] group-hover/onb:grid-rows-[1fr]',
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div
                        className={cn(
                          'space-y-1 pt-1',
                          trilho ? '' : 'ml-2 pl-2 border-l border-osg-100',
                        )}
                      >
                        {onbItems.map(({ path, label }) => (
                          <button
                            key={path}
                            onClick={() => navigate(path)}
                            className={cn(
                                                            classesItemDaBarra({ ativo: location.pathname === path, trilho }),
                            )}
                          >
                            <span className={cn('whitespace-nowrap', rotuloCls)}>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/equipe/osg/work/qualificacao-das-partes')}
                  className={cn(
                                        classesItemDaBarra({ ativo: location.pathname === '/equipe/osg/work/qualificacao-das-partes', trilho }),
                  )}
                >
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span className={cn('whitespace-nowrap', rotuloCls)}>
                    Qualificação das Partes
                  </span>
                </button>
                <button
                  onClick={() => navigate('/equipe/osg/work/diagnostico-patrimonial')}
                  className={cn(
                                        classesItemDaBarra({ ativo: location.pathname === '/equipe/osg/work/diagnostico-patrimonial', trilho }),
                  )}
                >
                  <Landmark className="h-4 w-4 flex-shrink-0" />
                  <span className={cn('whitespace-nowrap', rotuloCls)}>
                    Diagnóstico Patrimonial
                  </span>
                </button>
                <button
                  onClick={() => navigate('/equipe/osg/work/controle-matriculas')}
                  className={cn(
                                        classesItemDaBarra({ ativo: location.pathname === '/equipe/osg/work/controle-matriculas', trilho }),
                  )}
                >
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className={cn('whitespace-nowrap', rotuloCls)}>Controle de Matrículas</span>
                </button>
                {/* Agrupador "Oficina de Contratos" — expande no hover com animação suave */}
                <div className="group/docs">
                  <button
                    type="button"
                    className={cn(
                                            // Cabeçalho de grupo: quem está aberto é o filho — ver `ancestral`.
                      classesItemDaBarra({ ativo: false, ancestral: isDocsActive, trilho }),
                    )}
                  >
                    <FileSignature className="h-4 w-4 flex-shrink-0" />
                    <span className={cn('whitespace-nowrap', rotuloCls)}>Oficina de Contratos</span>
                    <ChevronDown
                      className={cn(
                        // `rotuloCls` por ÚLTIMO, e `ml-auto` só com a barra aberta. Antes o
                        // `w-4` vinha depois do `w-0` do `rotuloCls` e o twMerge dava a vitória
                        // ao `w-4`: no trilho a seta continuava com 16px e o `ml-auto` a jogava
                        // na borda direita, empurrando o ícone para a esquerda. Medido no DOM:
                        // ícone a 27,5px num trilho de centro 39,5 — 12,5px fora, só nos
                        // cabeçalhos de grupo, que são os únicos itens com três filhos.
                        'h-4 w-4 flex-shrink-0 duration-300',
                        !trilho && 'ml-auto',
                        isDocsActive ? 'rotate-180' : 'group-hover/docs:rotate-180',
                        rotuloCls,
                      )}
                    />
                  </button>

                  <div
                    className={cn(
                      'grid transition-[grid-template-rows] duration-300 ease-out',
                      trilho
                        ? 'grid-rows-[0fr]'
                        : isDocsActive
                          ? 'grid-rows-[1fr]'
                          : 'grid-rows-[0fr] group-hover/docs:grid-rows-[1fr]',
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div
                        className={cn(
                          'space-y-1 pt-1',
                          trilho ? '' : 'ml-2 pl-2 border-l border-osg-100',
                        )}
                      >
                        {docItems.map(({ path, label }) => (
                          <button
                            key={path}
                            onClick={() => navigate(path)}
                            className={cn(
                                                            classesItemDaBarra({ ativo: location.pathname === path, trilho }),
                            )}
                          >
                            <span className={cn('whitespace-nowrap', rotuloCls)}>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/equipe/osg/work/quadro-societario')}
                  className={cn(
                                        classesItemDaBarra({ ativo: location.pathname === '/equipe/osg/work/quadro-societario', trilho }),
                  )}
                >
                  <PieChart className="h-4 w-4 flex-shrink-0" />
                  <span className={cn('whitespace-nowrap', rotuloCls)}>Quadro Societário</span>
                </button>
                {/* Ao lado do Quadro Societário porque é o irmão conceitual: cadastro
              relacional (instrumento + partes), não cadastro atômico. */}
                <button
                  onClick={() => navigate('/equipe/osg/work/exploracao-rural')}
                  className={cn(
                                        classesItemDaBarra({ ativo: location.pathname === '/equipe/osg/work/exploracao-rural', trilho }),
                  )}
                >
                  <Sprout className="h-4 w-4 flex-shrink-0" />
                  <span className={cn('whitespace-nowrap', rotuloCls)}>Exploração Rural</span>
                </button>
                <button
                  onClick={() => navigate('/equipe/osg/work/calculadora-itcmd')}
                  className={cn(
                                        classesItemDaBarra({ ativo: location.pathname === '/equipe/osg/work/calculadora-itcmd', trilho }),
                  )}
                >
                  <Calculator className="h-4 w-4 flex-shrink-0" />
                  <span className={cn('whitespace-nowrap', rotuloCls)}>Calculadora de ITCD</span>
                </button>
                {/* Agrupador "Governança" — mesmo padrão de dropdown por hover */}
                <div className="group/gov">
                  <button
                    type="button"
                    className={cn(
                                            // Cabeçalho de grupo: quem está aberto é o filho — ver `ancestral`.
                      classesItemDaBarra({ ativo: false, ancestral: isGovActive, trilho }),
                    )}
                  >
                    <Scale className="h-4 w-4 flex-shrink-0" />
                    <span className={cn('flex-1 min-w-0 truncate text-left', rotuloCls)}>
                      Governança
                    </span>
                    <ChevronDown
                      className={cn(
                        // `rotuloCls` por ÚLTIMO, e `ml-auto` só com a barra aberta. Antes o
                        // `w-4` vinha depois do `w-0` do `rotuloCls` e o twMerge dava a vitória
                        // ao `w-4`: no trilho a seta continuava com 16px e o `ml-auto` a jogava
                        // na borda direita, empurrando o ícone para a esquerda. Medido no DOM:
                        // ícone a 27,5px num trilho de centro 39,5 — 12,5px fora, só nos
                        // cabeçalhos de grupo, que são os únicos itens com três filhos.
                        'h-4 w-4 flex-shrink-0 duration-300',
                        isGovActive ? 'rotate-180' : 'group-hover/gov:rotate-180',
                        rotuloCls,
                      )}
                    />
                  </button>

                  <div
                    className={cn(
                      'grid transition-[grid-template-rows] duration-300 ease-out',
                      trilho
                        ? 'grid-rows-[0fr]'
                        : isGovActive
                          ? 'grid-rows-[1fr]'
                          : 'grid-rows-[0fr] group-hover/gov:grid-rows-[1fr]',
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div
                        className={cn(
                          'space-y-1 pt-1',
                          trilho ? '' : 'ml-2 pl-2 border-l border-osg-100',
                        )}
                      >
                        {govItems.map(({ path, label }) => (
                          <button
                            key={path}
                            onClick={() => navigate(path)}
                            className={cn(
                                                            classesItemDaBarra({ ativo: location.pathname === path, trilho }),
                            )}
                          >
                            <span className={cn('whitespace-nowrap', rotuloCls)}>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Agrupador "Documentos do Cliente" — expande no hover com animação suave */}
                <div className="group/docsCli">
                  <button
                    type="button"
                    className={cn(
                                            // Cabeçalho de grupo: quem está aberto é o filho — ver `ancestral`.
                      classesItemDaBarra({ ativo: false, ancestral: isDocClienteActive, trilho }),
                    )}
                  >
                    <FolderArchive className="h-4 w-4 flex-shrink-0" />
                    <span className={cn('flex-1 min-w-0 truncate text-left', rotuloCls)}>
                      Documentos
                    </span>
                    <ChevronDown
                      className={cn(
                        // `rotuloCls` por ÚLTIMO, e `ml-auto` só com a barra aberta. Antes o
                        // `w-4` vinha depois do `w-0` do `rotuloCls` e o twMerge dava a vitória
                        // ao `w-4`: no trilho a seta continuava com 16px e o `ml-auto` a jogava
                        // na borda direita, empurrando o ícone para a esquerda. Medido no DOM:
                        // ícone a 27,5px num trilho de centro 39,5 — 12,5px fora, só nos
                        // cabeçalhos de grupo, que são os únicos itens com três filhos.
                        'h-4 w-4 flex-shrink-0 duration-300',
                        isDocClienteActive ? 'rotate-180' : 'group-hover/docsCli:rotate-180',
                        rotuloCls,
                      )}
                    />
                  </button>

                  <div
                    className={cn(
                      'grid transition-[grid-template-rows] duration-300 ease-out',
                      trilho
                        ? 'grid-rows-[0fr]'
                        : isDocClienteActive
                          ? 'grid-rows-[1fr]'
                          : 'grid-rows-[0fr] group-hover/docsCli:grid-rows-[1fr]',
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div
                        className={cn(
                          'space-y-1 pt-1',
                          trilho ? '' : 'ml-2 pl-2 border-l border-osg-100',
                        )}
                      >
                        {docClienteItems.map(({ path, label }) => (
                          <button
                            key={path}
                            onClick={() => navigate(path)}
                            className={cn(
                                                            classesItemDaBarra({ ativo: location.pathname === path, trilho }),
                            )}
                          >
                            <span className={cn('whitespace-nowrap', rotuloCls)}>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/equipe/osg/work/relatorios')}
                  className={cn(
                                        classesItemDaBarra({ ativo: location.pathname === '/equipe/osg/work/relatorios', trilho }),
                  )}
                >
                  <FileBarChart2 className="h-4 w-4 flex-shrink-0" />
                  <span className={cn('whitespace-nowrap', rotuloCls)}>Relatórios</span>
                </button>
              </>
            )}

            {/* Agrupador "Gerencial" — exclusivo da área Projetos e só para líder+.
              Reúne o que antes eram dois itens soltos (Gerencial e Auditoria) mais
              as duas telas de chamados que vieram da área de Gestão. Espelha o
              agrupador "Projetos" logo acima; clicar no próprio grupo abre
              "Dashboards", que é a tela que antes se chamava Gerencial. */}
            {isProjects && canGerencial && (
              <div className="group/ger">
                <button
                  type="button"
                  onClick={() => navigate('/equipe/osg/gerencial')}
                  className={cn(
                                        // Cabeçalho de grupo: quem está aberto é o filho — ver `ancestral`.
                    classesItemDaBarra({ ativo: false, ancestral: isGerencialActive, trilho }),
                  )}
                >
                  <LineChart className="h-4 w-4 flex-shrink-0" />
                  <span className={cn('whitespace-nowrap', rotuloCls)}>Gerencial</span>
                  <ChevronDown
                    className={cn(
                      // `rotuloCls` por ÚLTIMO, e `ml-auto` só com a barra aberta. Antes o
                      // `w-4` vinha depois do `w-0` do `rotuloCls` e o twMerge dava a vitória
                      // ao `w-4`: no trilho a seta continuava com 16px e o `ml-auto` a jogava
                      // na borda direita, empurrando o ícone para a esquerda. Medido no DOM:
                      // ícone a 27,5px num trilho de centro 39,5 — 12,5px fora, só nos
                      // cabeçalhos de grupo, que são os únicos itens com três filhos.
                      'h-4 w-4 flex-shrink-0 duration-300',
                      !trilho && 'ml-auto',
                      isGerencialActive ? 'rotate-180' : 'group-hover/ger:rotate-180',
                      rotuloCls,
                    )}
                  />
                </button>

                <div
                  className={cn(
                    'grid transition-[grid-template-rows] duration-300 ease-out',
                    trilho
                      ? 'grid-rows-[0fr]'
                      : isGerencialActive
                        ? 'grid-rows-[1fr]'
                        : 'grid-rows-[0fr] group-hover/ger:grid-rows-[1fr]',
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div
                      className={cn(
                        'space-y-1 pt-1',
                        trilho ? '' : 'ml-2 pl-2 border-l border-osg-100',
                      )}
                    >
                      {gerencialItems.map(({ path, label, icon: Icon }) => (
                        <button
                          key={path}
                          onClick={() => navigate(path)}
                          // Rótulo comprido ("Dashboard de Chamados") corta com
                          // reticências em vez de vazar, e o título traz o inteiro.
                          title={label}
                          className={cn(
                                                        classesItemDaBarra({ ativo: location.pathname === path, trilho, sub: true }),
                          )}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span className={cn('min-w-0 truncate', rotuloCls)}>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chamados — atalho espelhado da área Tax (mesma página /equipe/chamados,
              que já escopa o filtro de cluster pelo cluster do usuário OSG).
              Some para o Líder Geral, que tem "Gestão de Chamados" no dropdown
              Gerencial: dois caminhos para chamado no mesmo menu confundem.
              Admin NÃO perde o item — admin vê tudo. É só o menu; a página
              segue liberada para quem tiver o link. */}
            {isProjects && !isLider && (
              <button
                onClick={() => navigate(linkEspelhado('/equipe/chamados', 'osg'))}
                className={cn(
                                    classesItemDaBarra({ ativo: location.pathname.startsWith('/equipe/chamados'), trilho }),
                )}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <span className={cn('whitespace-nowrap', rotuloCls)}>Chamados</span>
              </button>
            )}
          </nav>

          {/* Footer Actions */}
          <div className="mt-auto p-4 border-t border-border/60 space-y-2">
            {/* Cartão do usuário: padrão compartilhado, com o recolhido embutido. */}
            <SidebarCartaoUsuario area="osg" collapsed={trilho} />

            <Button
              variant="ghost"
              className="w-full justify-start px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-osg-600 transition-colors"
              onClick={() => navigate('/equipe/osg')}
              title={trilho ? 'Trocar área' : undefined}
            >
              <ArrowLeft className="h-4 w-4 mr-3 flex-shrink-0" />
              <span className={cn('whitespace-nowrap', rotuloCls)}>Trocar área</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-osg-600 transition-colors"
              onClick={() => navigate('/')}
              title={trilho ? 'Voltar ao site' : undefined}
            >
              <ArrowLeft className="h-4 w-4 mr-3 flex-shrink-0" />
              <span className={cn('whitespace-nowrap', rotuloCls)}>Voltar ao site</span>
            </Button>
          </div>
        </aside>
      </div>

      {/* Fundo que fecha a gaveta no toque. Só aparece abaixo de `md`. */}
      <SidebarFundoGaveta aberta={!collapsed} onFechar={() => setCollapsed(true)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
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
              <TituloDaPagina titulo={title} subtitulo={subtitle} sobretitulo={areaLabel} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {headerActions}
            <NotificationPopover
              navigateTo="/equipe/chamados"
              espelho="osg"
              tasksNavigateTo="/equipe/osg/projetos/tarefas"
              mencoesArea="osg"
            />
          </div>
        </header>

        {isWork && <OsgWorkClienteBar />}

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default OsgLayout;
