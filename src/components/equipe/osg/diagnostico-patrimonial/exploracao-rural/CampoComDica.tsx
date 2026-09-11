import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Campo as FormKitCampo } from '@/components/equipe/osg/formKit';
import { formSpanCls } from '@/lib/osgFormGrid';

/**
 * Campo do cadastro de exploração rural: rótulo + dica + controle.
 *
 * DUAS REGRAS, aprendidas na primeira revisão da tela (01/09/2026):
 *
 * 1. **A explicação vai no TOOLTIP, nunca embaixo do campo.** Texto solto sob o
 *    controle muda a altura daquela célula, e numa grade de 4 colunas isso desalinha
 *    a linha inteira — foi exatamente o que aconteceu com "Culturas" ao lado dos dois
 *    switches. Sem texto embaixo, todos os controles têm a mesma altura (h-9) e a
 *    linha fecha sozinha.
 *
 * 2. **A dica descreve o CAMPO, não a origem dele.** Nada de nome de cliente, código
 *    de contrato real (`[BV-COM]`, `[MMS-PAR]`), número de cláusula ou justificativa
 *    de levantamento. Esse lastro é valioso e continua no código, nos comentários e
 *    nos relatórios da ALE-3 — mas quem usa a tela quer saber o que preencher ali,
 *    não de qual contrato o campo foi deduzido. Vazar isso na interface expõe caso de
 *    cliente para quem não deveria ver.
 *
 * O tooltip segue o padrão único da OSG: `max-w-xs text-xs leading-relaxed`, gatilho
 * em ícone ao lado do rótulo. O `TooltipProvider` é global no `App.tsx`.
 */
export function Dica({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        // `tabIndex={-1}`: a dica é apoio, não parada obrigatória do Tab. Quem navega
        // por teclado passa direto para o controle; o mouse alcança do mesmo jeito.
        tabIndex={-1}
        className="text-muted-foreground/60 transition-colors hover:text-osg-moss"
        aria-label="O que é este campo"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">{children}</TooltipContent>
    </Tooltip>
  );
}

interface CampoProps {
  label: string;
  /** O que o campo é e para que serve, em português simples. */
  dica?: string;
  required?: boolean;
  /** Valor do `data-campo`, lido por `@/lib/osg/validacaoFormulario` para focar o campo. */
  campo?: string;
  /** Quantas colunas ocupar na grade (1 por padrão). */
  colunas?: 2 | 3 | 4;
  children: React.ReactNode;
}

/**
 * Invólucro FINO sobre o `Campo` do formKit — nunca uma segunda gramática de
 * rótulo.
 *
 * O kit compartilhado não conhece o tooltip de tela nenhuma, e continua não
 * conhecendo: ele recebe o rótulo JÁ envolvido no gatilho da dica, que é
 * exatamente o que o `rotulo: ReactNode` dele foi feito para aceitar. O que sobra
 * aqui é o que é desta tela: a dica e o número de colunas da grade.
 *
 * O alinhamento entre campos da mesma linha é do kit também: use a grade com
 * `items-end`, e os controles encostam pela base mesmo quando um rótulo quebra em
 * duas linhas — em vez de cada tela inventar o seu `justify-end`.
 */
export function Campo({ label, dica, required, campo, colunas, children }: CampoProps) {
  return (
    <FormKitCampo
      rotulo={
        <span className="flex items-start gap-1.5">
          <span className="min-w-0">{label}</span>
          {/* `shrink-0` e `mt-px`: o ícone não encolhe e fica na linha da primeira
              palavra quando o rótulo quebra. */}
          {dica && <span className="mt-px shrink-0"><Dica>{dica}</Dica></span>}
        </span>
      }
      required={required}
      campo={campo}
      className={colunas ? formSpanCls(colunas) : undefined}
    >
      {children}
    </FormKitCampo>
  );
}

/**
 * Valor que vem de outro cadastro e não se edita aqui. Mesma altura de um campo
 * (h-9), para não quebrar a linha da grade.
 */
export function ValorDerivado({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-9 items-center rounded-md border border-osg-200/80 bg-muted/30 px-3 text-sm text-muted-foreground">
      {children}
    </div>
  );
}
