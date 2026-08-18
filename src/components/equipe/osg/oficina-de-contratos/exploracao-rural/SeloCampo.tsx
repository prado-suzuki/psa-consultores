import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { labelCls } from '@/components/equipe/osg/formKit';
import { formSpanCls } from '@/lib/osgFormGrid';

// Selo que a consultora confere campo a campo (ver ALE-3,
// docs/osg/levantamento-contratos-rurais.md, seção 2): "existe" é coluna que já
// mora em outro cadastro (matrícula, pessoa, exploracao_rural); "novo" é campo
// sem coluna hoje, que só existe neste rascunho de tela.

const baseCls = 'h-4 rounded-sm px-1.5 text-[9px] font-bold uppercase tracking-wide leading-4';

export function SeloExiste() {
  return (
    <Badge variant="outline" className={`${baseCls} border-emerald-300 bg-emerald-50 text-emerald-700`}>
      existe
    </Badge>
  );
}

export function SeloNovo() {
  return (
    <Badge variant="outline" className={`${baseCls} border-osg-highlighter bg-osg-highlighter/25 text-amber-900`}>
      novo
    </Badge>
  );
}

export function Selo({ tipo }: { tipo: 'existe' | 'novo' }) {
  return tipo === 'existe' ? <SeloExiste /> : <SeloNovo />;
}

// Par Field/Wide compartilhado entre as abas Dados e Imóveis e origens — mesma
// grade (`formGridCls`) e o mesmo rótulo com selo em todo campo do cadastro.
export function Field({ label, required, selo, hint, children }: { label: string; required?: boolean; selo: 'existe' | 'novo'; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className={`${labelCls} flex items-center gap-1.5`}>{label}{required && <span className="text-osg-red">*</span>}<Selo tipo={selo} /></Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Wide({ label, selo, children }: { label: string; selo: 'existe' | 'novo'; children: ReactNode }) {
  return (
    <div className={`space-y-1.5 ${formSpanCls(2)}`}>
      <Label className={`${labelCls} flex items-center gap-1.5`}>{label}<Selo tipo={selo} /></Label>
      {children}
    </div>
  );
}
