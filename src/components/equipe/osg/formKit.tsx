import type { ReactNode } from 'react';

// Kit de estilo dos formulários OSG. Nasceu na aba "Dados" do modal de matrícula
// e é reaproveitado nos demais modais (bem, pessoa) para manter o mesmo visual:
// superfície branca limpa, borda fina, foco verde-musgo e seções em "passo".

// Estilo base dos campos: superfície branca limpa, borda fina e foco verde-musgo.
export const fieldCls =
  'h-9 rounded-md border-osg-200/80 bg-white shadow-[0_1px_1px_rgba(16,24,40,0.04)] ' +
  'focus-visible:ring-1 focus-visible:ring-osg-moss/40 focus-visible:ring-offset-0 focus-visible:border-osg-moss ' +
  'focus:ring-1 focus:ring-osg-moss/40 focus:ring-offset-0 focus:border-osg-moss';

// Mesmo tratamento do fieldCls para áreas de texto (sem a altura fixa de 9).
export const textareaCls =
  'rounded-md border-osg-200/80 bg-white shadow-[0_1px_1px_rgba(16,24,40,0.04)] ' +
  'focus-visible:ring-1 focus-visible:ring-osg-moss/40 focus-visible:ring-offset-0 focus-visible:border-osg-moss';

// Caixa de switch/checkbox alinhada ao visual dos campos: borda fina, fundo branco, altura 9.
export const switchBoxCls =
  'flex h-9 items-center gap-2.5 rounded-md border border-osg-200/80 bg-white px-3 shadow-[0_1px_1px_rgba(16,24,40,0.04)]';

// Caixa de subformulário destacada em verde-musgo (ex.: "novo item" embutido).
export const subFormBoxCls =
  'rounded-md border border-osg-moss/20 bg-osg-moss/[0.04] p-4';

// Rótulo padrão dos campos. Um tom mais escuro que muted-foreground para dar
// um pouco mais de contraste à descrição dos campos.
export const labelCls = 'text-xs font-medium text-slate-600';

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
