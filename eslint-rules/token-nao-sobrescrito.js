/**
 * ui/token-nao-sobrescrito — cor crua escrita por cima do token que o componente já traz.
 *
 * O DEFEITO. Os componentes de `src/components/ui/` chegam com o token certo de
 * fábrica: `<Card>` já é `bg-card`, `<CardDescription>` já é
 * `text-muted-foreground`, `<SelectTrigger>` já é `bg-background border-input`.
 * Quando a `className` local escreve `bg-white` ou `text-slate-500` na MESMA
 * propriedade, ela não acrescenta nada — ela substitui o token por um valor fixo.
 * A tela para de acompanhar o tema, e ninguém vê na revisão porque parece código
 * normal.
 *
 * Foram 19 casos assim só no Controle de Acessos, e nenhum era redundância: em
 * todos, o cinza cru apagava o token.
 *
 * O QUE A REGRA *NÃO* ACUSA, e é o que a torna utilizável:
 *
 * - propriedade DIFERENTE da que o componente traz. `<Card className="border-2">`
 *   é composição normal, não conflito. (Foram 359 casos assim na varredura.)
 * - sobrescrita para OUTRO TOKEN. `<CardDescription className="text-foreground">`
 *   é escolha deliberada de hierarquia, e é assim que se sobe um texto de nível.
 *   (64 casos.)
 * - classe que vem de variável. A regra lê só literais; `className={cn(algo)}`
 *   escapa. É falso negativo consciente — preferível a acusar o que não pode ler.
 * - classe com VARIANTE (`hover:bg-slate-50`, `dark:bg-slate-800`). O componente
 *   traz o token do estado BASE; uma variante pinta OUTRO estado e não apaga nada.
 *   Tratar as duas como colisão era over-fire — foram 49 dos 465 na primeira
 *   medição, e 47 deles `dark:`. O `dark:` sobre token continua sendo dívida (o
 *   contrato já tem bloco `.dark`), mas é outra dívida e vira linha de inventário,
 *   não aviso desta regra.
 *
 * O FALSO POSITIVO POSSÍVEL, nomeado: um `bg-white` deliberado, numa tela que deve
 * sair branca em qualquer tema (impressão, por exemplo). Aí o `eslint-disable` na
 * linha é a resposta certa — e vira o registro que a gente queria de todo jeito.
 *
 * O MAPA abaixo é gerado de `src/components/ui/`, e `token-nao-sobrescrito.test.ts`
 * o confere contra os arquivos reais: componente que mudar de token no `ui/` sem o
 * mapa acompanhar quebra o teste. É o que impede a regra de virar prosa
 * desatualizada — o defeito que ela existe para pegar.
 */

/** Componente do `ui/` -> propriedade -> token que ele já traz. Gerado; ver o teste. */
export const TOKEN_DO_COMPONENTE = {
  AlertDialogContent: { bg: 'bg-background' },
  AlertDialogDescription: { text: 'text-muted-foreground' },
  AvatarFallback: { bg: 'bg-muted' },
  BreadcrumbList: { text: 'text-muted-foreground' },
  BreadcrumbPage: { text: 'text-foreground' },
  Card: { bg: 'bg-card', text: 'text-card-foreground' },
  CardDescription: { text: 'text-muted-foreground' },
  ChartTooltipContent: { bg: 'bg-background', border: 'border-border/50' },
  Command: { bg: 'bg-popover', text: 'text-popover-foreground' },
  CommandGroup: { text: 'text-foreground' },
  CommandSeparator: { bg: 'bg-border' },
  CommandShortcut: { text: 'text-muted-foreground' },
  ContextMenuContent: { bg: 'bg-popover', text: 'text-popover-foreground' },
  ContextMenuLabel: { text: 'text-foreground' },
  ContextMenuSeparator: { bg: 'bg-border' },
  ContextMenuShortcut: { text: 'text-muted-foreground' },
  ContextMenuSubContent: { bg: 'bg-popover', text: 'text-popover-foreground' },
  DialogContent: { bg: 'bg-background' },
  DialogDescription: { text: 'text-muted-foreground' },
  DrawerContent: { bg: 'bg-background' },
  DrawerDescription: { text: 'text-muted-foreground' },
  DropdownMenuContent: { bg: 'bg-popover', text: 'text-popover-foreground' },
  DropdownMenuSeparator: { bg: 'bg-muted' },
  DropdownMenuSubContent: { bg: 'bg-popover', text: 'text-popover-foreground' },
  FormDescription: { text: 'text-muted-foreground' },
  FormMessage: { text: 'text-destructive' },
  HoverCardContent: { bg: 'bg-popover', text: 'text-popover-foreground' },
  Input: { bg: 'bg-background', border: 'border-input' },
  InputOTPSlot: { border: 'border-input' },
  Menubar: { bg: 'bg-background' },
  MenubarContent: { bg: 'bg-popover', text: 'text-popover-foreground' },
  MenubarSeparator: { bg: 'bg-muted' },
  MenubarShortcut: { text: 'text-muted-foreground' },
  MenubarSubContent: { bg: 'bg-popover', text: 'text-popover-foreground' },
  NavigationMenuViewport: { bg: 'bg-popover', text: 'text-popover-foreground' },
  PopoverContent: { bg: 'bg-popover', text: 'text-popover-foreground' },
  Progress: { bg: 'bg-secondary' },
  RadioGroupItem: { border: 'border-primary', text: 'text-primary' },
  ResizableHandle: { bg: 'bg-border' },
  SelectContent: { bg: 'bg-popover', text: 'text-popover-foreground' },
  SelectSeparator: { bg: 'bg-muted' },
  SelectTrigger: { bg: 'bg-background', border: 'border-input' },
  Separator: { bg: 'bg-border' },
  SheetDescription: { text: 'text-muted-foreground' },
  SheetOverlay: { bg: 'bg-background' },
  SheetTitle: { text: 'text-foreground' },
  SidebarInput: { bg: 'bg-background' },
  SidebarInset: { bg: 'bg-background' },
  Skeleton: { bg: 'bg-muted' },
  Switch: { bg: 'bg-background' },
  TableCaption: { text: 'text-muted-foreground' },
  TableFooter: { bg: 'bg-muted/50' },
  TableHead: { text: 'text-muted-foreground' },
  TabsList: { bg: 'bg-muted', text: 'text-muted-foreground' },
  Textarea: { bg: 'bg-background', border: 'border-input' },
  ToastClose: { text: 'text-foreground/50' },
  TooltipContent: { bg: 'bg-popover', border: 'border-border', text: 'text-popover-foreground' },
};

/** Famílias de cor do Tailwind, mais `white`/`black`. */
export const FAMILIAS = [
  'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow',
  'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet',
  'purple', 'fuchsia', 'pink', 'rose',
];

const PREFIXOS = 'text|bg|border|divide|ring|placeholder|from|to|via';
/** Modificadores de estado/responsivo que não mudam a propriedade afetada. */
const VARIANTE = /^[a-z][a-z0-9-]*(?:\[[^\]]*\])?:/;

export const CRU = new RegExp(
  `^(${PREFIXOS})-(?:(?:${FAMILIAS.join('|')})-[0-9]{2,3}|white|black)(?:/[0-9.]+)?$`,
);

/** `true` quando a classe tem variante — logo pinta outro estado, não o base. */
function temVariante(classe) {
  return VARIANTE.test(classe);
}

/** Coleta todo literal de string dentro do valor de `className`. */
function literais(no, saida) {
  if (!no) return;
  switch (no.type) {
    case 'Literal':
      if (typeof no.value === 'string') saida.push(no.value);
      break;
    case 'JSXExpressionContainer':
      literais(no.expression, saida);
      break;
    case 'TemplateLiteral':
      no.quasis.forEach((q) => saida.push(q.value.cooked ?? q.value.raw ?? ''));
      no.expressions.forEach((e) => literais(e, saida));
      break;
    case 'CallExpression':
      no.arguments.forEach((a) => literais(a, saida));
      break;
    case 'ConditionalExpression':
      literais(no.consequent, saida);
      literais(no.alternate, saida);
      break;
    case 'LogicalExpression':
      literais(no.left, saida);
      literais(no.right, saida);
      break;
    case 'ArrayExpression':
      no.elements.forEach((e) => literais(e, saida));
      break;
    case 'ObjectExpression':
      no.properties.forEach((p) => {
        if (p.key) literais(p.key, saida);
      });
      break;
    default:
      break;
  }
}

export const regra = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Não sobrescrever com cor crua a propriedade que o componente do ui/ já traz tokenizada',
    },
    schema: [],
    messages: {
      apaga:
        'O `<{{componente}}>` já traz `{{token}}`. A classe `{{classe}}` substitui esse token por '
        + 'cor fixa na mesma propriedade, e a tela para de acompanhar o tema. Remova a classe (o '
        + 'componente já pinta certo) ou, se a intenção é mudar de nível, use outro TOKEN. Se a cor '
        + 'fixa for deliberada, um eslint-disable nesta linha registra o motivo.',
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        const traz = TOKEN_DO_COMPONENTE[node.name.name];
        if (!traz) return;

        const attr = node.attributes.find(
          (a) => a.type === 'JSXAttribute' && a.name && a.name.name === 'className',
        );
        if (!attr) return;

        const strs = [];
        literais(attr.value, strs);
        const vistas = new Set();
        for (const bruta of strs.join(' ').split(/\s+/)) {
          if (!bruta || temVariante(bruta)) continue;
          const propriedade = bruta.split('-')[0];
          const token = traz[propriedade];
          if (!token || !CRU.test(bruta) || vistas.has(bruta)) continue;
          vistas.add(bruta);
          context.report({
            node: attr,
            messageId: 'apaga',
            data: { componente: node.name.name, token, classe: bruta },
          });
        }
      },
    };
  },
};

export default { rules: { 'token-nao-sobrescrito': regra } };
