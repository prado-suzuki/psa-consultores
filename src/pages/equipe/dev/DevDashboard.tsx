import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DevLayout } from "@/components/equipe/dev/DevLayout";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  ExternalLink,
  BookOpen,
  FileCode2,
  FolderTree,
  ShieldAlert,
  Percent,
  Scale,
  X,
  type LucideIcon,
} from "lucide-react";
import { DEV_HUBS } from "@/constants/devHubDefinitions";
import { DEV_NAV_LABELS } from "@/constants/devNavLabels";
import { MANUAIS_AVULSOS } from "@/constants/devManuais";

interface ToolEntry {
  name: string;
  description: string;
  path: string;
  icon: LucideIcon;
  sopUrl?: string;
}

interface ToolGroup {
  label: string;
  tools: ToolEntry[];
  landingIcon?: LucideIcon;
  landingPath?: string;
  landingDescription?: string;
  landingSopUrl?: string;
}

const buildHubTools = (hub: (typeof DEV_HUBS)[keyof typeof DEV_HUBS]): ToolEntry[] =>
  hub.options.map((option) => ({
    name: option.title,
    description: option.description,
    path: option.path,
    icon: option.icon,
    sopUrl: option.sopUrl,
  }));

const toolGroups: ToolGroup[] = [
  {
    label: DEV_NAV_LABELS.consultaXmls,
    landingPath: "/equipe/tax/work/consulta-xmls",
    landingDescription: "Consulte e baixe XMLs de NFe e CT-e por cliente e período.",
    landingIcon: FileCode2,
    tools: [
      {
        name: DEV_NAV_LABELS.consultaXmls,
        description: "Consulte e baixe XMLs de NFe e CT-e por cliente e período.",
        path: "/equipe/tax/work/consulta-xmls",
        icon: FileCode2,
        sopUrl: MANUAIS_AVULSOS.consultaXmls,
      },
    ],
  },
  {
    label: DEV_HUBS.consultaSped.label,
    landingPath: DEV_HUBS.consultaSped.landingPath,
    landingDescription: DEV_HUBS.consultaSped.landingDescription,
    landingIcon: DEV_HUBS.consultaSped.landingIcon,
    landingSopUrl: DEV_HUBS.consultaSped.landingSopUrl,
    tools: buildHubTools(DEV_HUBS.consultaSped),
  },
  {
    label: DEV_HUBS.levantamentoPisCofins.label,
    landingPath: DEV_HUBS.levantamentoPisCofins.landingPath,
    landingDescription: DEV_HUBS.levantamentoPisCofins.landingDescription,
    landingIcon: DEV_HUBS.levantamentoPisCofins.landingIcon,
    landingSopUrl: DEV_HUBS.levantamentoPisCofins.landingSopUrl,
    tools: buildHubTools(DEV_HUBS.levantamentoPisCofins),
  },
  {
    label: DEV_HUBS.analiseIcms.label,
    landingPath: DEV_HUBS.analiseIcms.landingPath,
    landingDescription: DEV_HUBS.analiseIcms.landingDescription,
    landingIcon: DEV_HUBS.analiseIcms.landingIcon,
    landingSopUrl: DEV_HUBS.analiseIcms.landingSopUrl,
    tools: buildHubTools(DEV_HUBS.analiseIcms),
  },
  {
    label: DEV_NAV_LABELS.calculadoraIbsCbs,
    landingPath: "/equipe/tax/work/calculadora-ibs-cbs",
    landingDescription: "Compare a carga tributária antes e depois da reforma.",
    landingIcon: Percent,
    landingSopUrl: MANUAIS_AVULSOS.calculadoraIbsCbs,
    tools: [
      {
        name: DEV_NAV_LABELS.calculadoraIbsCbs,
        description: "Compare a carga tributária antes e depois da reforma.",
        path: "/equipe/tax/work/calculadora-ibs-cbs",
        icon: Percent,
        sopUrl: MANUAIS_AVULSOS.calculadoraIbsCbs,
      },
    ],
  },
  {
    label: DEV_HUBS.perdcomp.label,
    landingPath: DEV_HUBS.perdcomp.landingPath,
    landingDescription: DEV_HUBS.perdcomp.landingDescription,
    landingIcon: DEV_HUBS.perdcomp.landingIcon,
    landingSopUrl: DEV_HUBS.perdcomp.landingSopUrl,
    tools: buildHubTools(DEV_HUBS.perdcomp),
  },
  {
    label: DEV_NAV_LABELS.controleBalancetes,
    landingPath: "/equipe/tax/work/controle-balancetes",
    landingDescription: "Envie, consulte e acompanhe balancetes contábeis.",
    landingIcon: Scale,
    landingSopUrl: MANUAIS_AVULSOS.controleBalancetes,
    tools: [
      {
        name: DEV_NAV_LABELS.controleBalancetes,
        description: "Envie, consulte e acompanhe balancetes contábeis.",
        path: "/equipe/tax/work/controle-balancetes",
        icon: Scale,
        sopUrl: MANUAIS_AVULSOS.controleBalancetes,
      },
    ],
  },
  /*
    Procedimentos e Planejamento Tributário estavam na barra lateral e NÃO no
    catálogo: quem entrasse pelo Início não descobria que existiam. Os dois
    seguem sem manual publicado, e por isso o cartão mostra "Manual (em breve)"
    em vez de esconder a linha — o lugar do link já fica reservado, e quem
    publicar o manual só preenche a URL.

    Gerenciar dados e Solicitar ferramenta continuam de fora de propósito: a
    primeira é administração da base, a segunda é um formulário de pedido.
    Nenhuma das duas é ferramenta de trabalho.
  */
  {
    label: DEV_NAV_LABELS.procedimentos,
    landingPath: "/equipe/tax/work/procedimentos",
    landingDescription: "Consulte os procedimentos operacionais da área.",
    landingIcon: BookOpen,
    tools: [
      {
        name: DEV_NAV_LABELS.procedimentos,
        description: "Consulte os procedimentos operacionais da área.",
        path: "/equipe/tax/work/procedimentos",
        icon: BookOpen,
      },
    ],
  },
  {
    label: DEV_HUBS.planejamentoTributario.label,
    landingPath: DEV_HUBS.planejamentoTributario.landingPath,
    landingDescription: DEV_HUBS.planejamentoTributario.landingDescription,
    landingIcon: DEV_HUBS.planejamentoTributario.landingIcon,
    landingSopUrl: DEV_HUBS.planejamentoTributario.landingSopUrl,
    tools: buildHubTools(DEV_HUBS.planejamentoTributario),
  },
];

/** O que vira um bloco no catálogo: um grupo inteiro, ou uma ferramenta só. */
interface EntradaDoCatalogo {
  chave: string;
  nome: string;
  descricao: string;
  path: string;
  icon: LucideIcon;
  sopUrl?: string;
  ferramentas: number;
}

const DevDashboard = () => {
  const navigate = useNavigate();
  const [selectedToolPath, setSelectedToolPath] = useState<string>("");

  /*
    Um bloco por GRUPO, e ele abre a central. O filtro é a exceção: escolher uma
    ferramenta mostra o bloco dela sozinho, que abre a ferramenta direto.
  */
  const entradas = useMemo<EntradaDoCatalogo[]>(() => {
    if (selectedToolPath) {
      const escolhida = toolGroups
        .flatMap((group) => group.tools)
        .find((tool) => tool.path === selectedToolPath);
      if (!escolhida) return [];

      return [
        {
          chave: escolhida.path,
          nome: escolhida.name,
          descricao: escolhida.description,
          path: escolhida.path,
          icon: escolhida.icon,
          sopUrl: escolhida.sopUrl,
          ferramentas: 1,
        },
      ];
    }

    return toolGroups.map((group) => {
      // Grupo de uma ferramenta só não tem central de verdade: o bloco é a
      // própria ferramenta, e o manual dela é o manual do bloco.
      const unica = group.tools.length === 1 ? group.tools[0] : undefined;

      return {
        chave: group.label,
        nome: group.label,
        descricao: group.landingDescription ?? unica?.description ?? "",
        path: group.landingPath ?? group.tools[0].path,
        icon: group.landingIcon ?? group.tools[0].icon,
        sopUrl: group.landingSopUrl ?? unica?.sopUrl,
        ferramentas: group.tools.length,
      };
    });
  }, [selectedToolPath]);

  /* O contador segue contando FERRAMENTA, e não bloco: é o número que a pessoa
     procura, e o filtro ao lado lista uma a uma. */
  const totalFiltered = selectedToolPath
    ? entradas.length
    : toolGroups.reduce((soma, group) => soma + group.tools.length, 0);


  return (
    <DevLayout tela="inicio"    >
      {/*
        A frase "Use o filtro para localizar uma ferramenta ou navegue pelas
        categorias abaixo" saiu em 23/09/2026. Ela explicava dois controles que
        estão visíveis e se explicam sozinhos, e o princípio de
        `docs/geral/texto-explicativo-na-tela.md` é direto: explicação custa
        espaço, envelhece sozinha e compete com o rótulo que a pessoa está lendo.
        O subtítulo da página, logo acima, já diz o que a tela é.
      */}
      {/* O teto só segura monitor ultralargo; abaixo dele a página ocupa a
          largura inteira, que é como o conteúdo se distribui. */}
      <div className="mx-auto w-full max-w-[1800px] space-y-4">
        <a
          href="https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/estrutura-pastas-drive/"
          target="_blank"
          rel="noopener noreferrer"
          // Cartão de destaque, e a cor dele é ÂNCORA, não papel de status. Era
          // emerald cravado — verde no meio de uma tela teal, que não seguia
          // tema nenhum. Alerta (âmbar) foi considerado e recusado: este cartão
          // está sempre aqui, e cor é sinal de ESTADO. Alerta permanente esvazia
          // o alerta. A sombra tingida virou a da escala: era o emerald-600
          // escrito em `rgba(5,150,105,…)`, que nenhuma regra de hex enxergava.
          className="group relative block overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-primary/5 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <FolderTree className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  {/* A letra é `accent-d`, e não `primary`: o contrato do
                      `.base-theme` diz que o acento cheio serve para marca —
                      anel, barra, ponto — e que letra pequena é do degrau
                      escuro (6,72:1 contra 5,54:1). Os dois pontos abaixo SÃO
                      ponto, então neles o acento cheio é o certo. */}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-d">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>
                    Fonte dos dados
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <ShieldAlert className="h-3 w-3" /> Leitura obrigatória
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-card px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    SOP oficial
                  </span>
                </div>
                <h2 className="text-base font-bold tracking-tight text-foreground">
                  Estrutura de Pastas do Google Drive
                </h2>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                  A estrutura de pastas no Google Drive é a fonte de dados das{" "}
                  <span className="font-semibold text-foreground">ferramentas do Tax Work</span>. Salve
                  os documentos dos clientes na estrutura padrão para garantir a coleta correta e o
                  funcionamento das ferramentas. Clique em{" "}
                  <span className="font-semibold text-foreground">Abrir manual</span> para consultar a
                  estrutura completa e evitar erros de organização.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center md:flex-col md:items-end">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background shadow-sm transition-transform group-hover:translate-x-0.5">
                Abrir manual
                <ExternalLink className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </a>

        <div className="rounded-2xl border border-border/70 bg-superficie-cartao p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Catálogo de Ferramentas</h2>
              <Badge variant="secondary" className="text-[11px]">
                {totalFiltered} {totalFiltered === 1 ? "item" : "itens"}
              </Badge>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Select value={selectedToolPath} onValueChange={setSelectedToolPath}>
                <SelectTrigger className="h-9 w-full text-sm shadow-sm sm:w-80">
                  <SelectValue placeholder="Filtrar por ferramenta..." />
                </SelectTrigger>
                <SelectContent>
                  {toolGroups.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </SelectLabel>
                      {group.tools.map((tool) => (
                        <SelectItem key={tool.path} value={tool.path}>
                          {tool.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>

              {selectedToolPath && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedToolPath("")}
                  className="h-9 text-xs text-muted-foreground hover:text-primary"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Um bloco por grupo, e ele abre a central. O contador diz quantas
              ferramentas esperam lá dentro; o filtro acima lista uma a uma. */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {entradas.map((entrada) => {
              const Icon = entrada.icon;

              return (
                <Card
                  key={entrada.chave}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(entrada.path)}
                  onKeyDown={(evento) => {
                    if (evento.key === "Enter" || evento.key === " ") {
                      evento.preventDefault();
                      navigate(entrada.path);
                    }
                  }}
                  className="group flex cursor-pointer items-start gap-3 border-l-2 border-l-transparent p-4 transition-all duration-200 hover:border-l-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="min-w-0 text-sm font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
                        {entrada.nome}
                      </h3>
                      <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
                      {entrada.descricao}
                    </p>

                    {/* O manual é o único ponto do cartão que não abre a
                        central, por isso ele barra a propagação. */}
                    <div className="mt-2 flex items-center gap-2">
                      {entrada.sopUrl ? (
                        <a
                          href={entrada.sopUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(evento) => evento.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary"
                        >
                          <BookOpen className="h-3 w-3" />
                          Manual
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/70">
                          <BookOpen className="h-3 w-3" />
                          Manual (em breve)
                        </span>
                      )}

                      {entrada.ferramentas > 1 && (
                        <span className="ml-auto flex-shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {entrada.ferramentas} ferramentas
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

      </div>
    </DevLayout>
  );
};

export default DevDashboard;
