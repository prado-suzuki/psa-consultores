import type { ReactNode } from 'react';

// Kit de estilo dos formulários OSG. Nasceu na aba "Dados" do modal de matrícula
// e é reaproveitado nos demais modais (bem, pessoa) para manter o mesmo visual:
// superfície branca limpa, borda fina, foco verde-musgo e seções em "passo".

// Estilo base dos campos: superfície branca limpa, borda fina e foco verde-musgo.
export const fieldCls =
  'h-9 rounded-md border-osg-200/80 bg-background shadow-[0_1px_1px_rgba(16,24,40,0.04)] ' +
  'focus-visible:ring-1 focus-visible:ring-osg-moss/40 focus-visible:ring-offset-0 focus-visible:border-osg-moss ' +
  'focus:ring-1 focus:ring-osg-moss/40 focus:ring-offset-0 focus:border-osg-moss';

// Mesmo tratamento do fieldCls para áreas de texto (sem a altura fixa de 9).
export const textareaCls =
  'rounded-md border-osg-200/80 bg-background shadow-[0_1px_1px_rgba(16,24,40,0.04)] ' +
  'focus-visible:ring-1 focus-visible:ring-osg-moss/40 focus-visible:ring-offset-0 focus-visible:border-osg-moss';

// Caixa de switch/checkbox alinhada ao visual dos campos: borda fina, fundo branco, altura 9.
export const switchBoxCls =
  'flex h-9 items-center gap-2.5 rounded-md border border-osg-200/80 bg-background px-3 shadow-[0_1px_1px_rgba(16,24,40,0.04)]';

// Caixa de subformulário destacada em verde-musgo (ex.: "novo item" embutido).
export const subFormBoxCls =
  'rounded-md border border-osg-moss/20 bg-osg-moss/[0.04] p-4';

// Rótulo padrão dos campos.
//
// Era `text-muted-foreground` — cinza AZULADO, do Tailwind, na área cujas superfícies são
// bege e cujo neutro é quente. Numa linha de campos sobre `--osg-50`, os rótulos
// puxavam para o frio junto de números em `osg-700`. O `--muted-foreground` da OSG
// (24 12% 42%) tem praticamente a mesma luminosidade do slate-600 (44,7%), então o
// contraste não muda: muda a matiz, que passa a ser a da área.
export const labelCls = 'text-xs font-medium text-muted-foreground';

/**
 * UM CAMPO: rótulo ACIMA do controle.
 *
 * É a única gramática de rótulo dos formulários OSG, e existe como componente para
 * não ser reinventada por tela. Antes conviviam duas — rótulo acima nos parâmetros e
 * rótulo AO LADO nos campos de adicionar pessoa —, e numa mesma barra isso deixa os
 * controles em alturas diferentes, porque um tem uma linha de texto em cima e o outro
 * não.
 *
 * Use sempre dentro de uma linha `items-end`: aí os controles alinham pela base,
 * tenham rótulo ou não.
 */
export function Campo({ rotulo, htmlFor, className, children }: {
  /**
   * Texto, ou um nó: quem precisa de dica no rótulo passa o rótulo já envolvido no
   * gatilho dela. O kit compartilhado não conhece o tooltip de nenhuma tela, e é assim
   * que ele continua não conhecendo.
   */
  rotulo: ReactNode;
  /**
   * Id do controle, quando ele é um input de verdade: aí o rótulo é um `<label>` e
   * clicar no texto foca o campo. Sem isso o rótulo é só texto, e o controle precisa
   * do próprio `aria-label` — é o caso do `Select` do Radix, que é um botão, e
   * envolver botão em `<label>` dispara o clique duas vezes.
   */
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      {htmlFor
        ? <label htmlFor={htmlFor} className={`block ${labelCls}`}>{rotulo}</label>
        : <span className={`block ${labelCls}`}>{rotulo}</span>}
      {children}
    </div>
  );
}

// Abas dos modais OSG (matrícula, bem). Sublinhado em "passo" com realce
// verde-musgo no item ativo (fundo osg-50 + traço de 3px) e hover nos inativos —
// pensado para chamar atenção e não passar batido.
export const osgTabsListCls =
  'h-auto w-full justify-start gap-2 rounded-none border-b border-osg-100 bg-transparent p-0 text-muted-foreground';

export const osgTabTriggerCls =
  'relative -mb-px rounded-t-md border-b-[3px] border-transparent bg-transparent px-3 pb-2.5 pt-1.5 ' +
  'text-sm font-semibold text-muted-foreground shadow-none transition-colors hover:bg-osg-50 hover:text-osg-700 ' +
  'data-[state=active]:border-osg-moss data-[state=active]:bg-osg-50 data-[state=active]:text-osg-700 data-[state=active]:shadow-none';

// Seção como "passo" estruturado: trilho vertical verde-musgo na lateral + linha
// fina horizontal separando as zonas, com número de ordem (01, 02…). Os slots
// `badge` (após o número) e `actions` (à direita) permitem reaproveitar a mesma
// moldura com chips e botões.
export function FieldSection({
  number, title, hint, badge, actions, children,
}: {
  number: string;
  title: string;
  hint?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-6 border-t-2 border-osg-100 pt-6 first:mt-0 first:border-t-0 first:pt-0">
      <div className="relative pl-6">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1 rounded-full bg-osg-moss/70"
        />
        <div className="mb-4 flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold tabular-nums text-osg-moss">{number}</span>
          {badge}
          <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-osg-700">{title}</h4>
          {hint && <span className="ml-auto text-[11px] font-medium text-muted-foreground">{hint}</span>}
          {actions && <span className={hint ? 'ml-2' : 'ml-auto'}>{actions}</span>}
        </div>
        {children}
      </div>
    </section>
  );
}
