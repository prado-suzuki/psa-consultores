import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { labelCls } from '@/components/equipe/osg/formKit';
import { formSpanCls } from '@/lib/osgFormGrid';

// Selo único do cadastro (grão redefinido em 19/08/2026, ver ALE-3 /
// docs/osg/levantamento-contratos-rurais.md): **NOVO = não existe tela que
// cadastre este campo hoje**, independentemente de a coluna já existir no banco.
//
// Antes o selo comparava com o banco ("existe" quando havia coluna), o que dava a
// impressão errada de que boa parte da tela já estava resolvida — `exploracao_rural`
// tem 25 colunas e nenhuma tela grava nelas. O selo "existe" foi removido; todo
// campo que restou nesta tela precisa de tela nova, e é isso que o tech lead precisa
// ver de relance.
//
// Campos que já vêm de um cadastro existente (matrícula, bem, cartório,
// titularidade, administração, quadro societário) **não aparecem mais aqui** — não
// se redigita nem se re-exibe o que outra tela já resolve. A exceção é o campo que
// seria puxado mas hoje não tem origem nenhuma: esse aparece bloqueado (cinza), com
// o selo.
//
// A justificativa de cada campo fica em **tooltip** no ícone ao lado do rótulo
// (mesmo padrão de `DocumentoCentroRail`/`OnboardingWorkspace`: Tooltip +
// TooltipContent `max-w-xs text-xs leading-relaxed`), e não como texto sob o campo —
// os modais da OSG não têm texto sob campo nenhum, e a explicação inline esticava o
// formulário. O `TooltipProvider` é global no `App.tsx`; o preview isolado monta o
// seu próprio.

export function Selo() {
  return (
    <Badge
      variant="outline"
      className="h-4 rounded-sm border-osg-highlighter bg-osg-highlighter/25 px-1.5 text-[9px] font-bold uppercase leading-4 tracking-wide text-amber-900"
    >
      novo
    </Badge>
  );
}

/** Ícone de dica ao lado do rótulo — só aparece quando o campo tem algo a explicar. */
function Dica({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger className="text-muted-foreground/70 transition-colors hover:text-osg-700" aria-label="Por que este campo existe">
        <Info className="h-3 w-3" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">{children}</TooltipContent>
    </Tooltip>
  );
}

// Par Field/Wide compartilhado entre as abas Dados e Imóveis e origens — mesma
// grade (`formGridCls`) e o mesmo rótulo com selo em todo campo do cadastro.
export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className={`${labelCls} flex items-center gap-1.5`}>
        {label}{required && <span className="text-osg-red">*</span>}<Selo />{hint && <Dica>{hint}</Dica>}
      </Label>
      {children}
    </div>
  );
}

export function Wide({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className={`space-y-1.5 ${formSpanCls(2)}`}>
      <Label className={`${labelCls} flex items-center gap-1.5`}>
        {label}<Selo />{hint && <Dica>{hint}</Dica>}
      </Label>
      {children}
    </div>
  );
}
