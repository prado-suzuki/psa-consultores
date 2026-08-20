import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { labelCls } from '@/components/equipe/osg/formKit';
import { formSpanCls } from '@/lib/osgFormGrid';
import { trechosDoCampo, type CampoContrato } from '@/previews/contratoRuralCampoOrigem';
import { fonteDoCampo } from '@/previews/contratoRuralCampoFonte';
import type { TipoExploracao } from '@/previews/contratosExploracaoModel';

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
// **POSSUI** (20/08/2026): um segundo rótulo, pro caso intermediário — campo que
// SELECIONA uma pessoa/matrícula/arquivo que já tem cadastro em outro módulo
// (Outorgante, Exploradores, Compossuidores, Administradores nomeados, Imóvel/
// matrícula, Estudo fiscal, Documento comprobatório). "NOVO" continua só pra campo
// sem cadastro nenhum atrás (foro, testemunha, indivisão, percentuais…) — antes os
// dois apareciam como "NOVO" igual, dando a impressão de que pessoa/matrícula também
// precisavam de tela nova. Ver `fonte.tag` em `contratoRuralCampoFonte.ts`.
//
// A justificativa de cada campo fica em **tooltip** no ícone ao lado do rótulo
// (mesmo padrão de `DocumentoCentroRail`/`OnboardingWorkspace`: Tooltip +
// TooltipContent `max-w-xs text-xs leading-relaxed`), e não como texto sob o campo —
// os modais da OSG não têm texto sob campo nenhum, e a explicação inline esticava o
// formulário. O `TooltipProvider` é global no `App.tsx`; o preview isolado monta o
// seu próprio.

const badgeBaseCls = 'h-4 rounded-sm px-1.5 text-[9px] font-bold uppercase leading-4 tracking-wide';
/** Cor por tag: "novo" continua âmbar (alerta — falta tela); "possui" vira verde (já tem cadastro em outro módulo). */
const badgeCorPorTag: Record<'novo' | 'possui', string> = {
  novo: 'border-osg-highlighter bg-osg-highlighter/25 text-amber-900',
  possui: 'border-emerald-300 bg-emerald-50 text-emerald-700',
};

/**
 * Selo "NOVO" ou "POSSUI". Quando `origem` é passado (o `campo` do `trecho`), a própria
 * tag ganha um SEGUNDO tooltip — diferente do tooltip de trecho do modelo
 * (`Dica`/`TrechoDoModelo`, que mostra ONDE o campo aparece no texto): este mostra O QUE
 * o campo significa e DE QUE contrato/exemplo/decisão/cadastro ele foi tirado (pedido do
 * usuário em 20/08/2026 — a tag por si só não bastava pra lembrar a origem de campos
 * como "indivisão"). O RÓTULO da tag também muda com `fonte.tag` (ajuste no mesmo dia,
 * depois do usuário notar que "outorgante"/"exploradores"/"imóvel" apareciam como NOVO
 * igual a "foro"/"testemunha" — dando a impressão de que pessoa/matrícula também
 * precisavam de cadastro novo): campo que só SELECIONA um registro que já tem tela
 * própria (pessoa, matrícula, arquivo) mostra "possui"; campo sem cadastro nenhum por
 * trás mostra "novo". Fonte do conteúdo: `contratoRuralCampoFonte.ts`.
 */
export function Selo({ origem }: { origem?: CampoContrato }) {
  const fonte = origem ? fonteDoCampo(origem) : null;
  if (!fonte) {
    return <Badge variant="outline" className={`${badgeBaseCls} ${badgeCorPorTag.novo}`}>novo</Badge>;
  }
  return (
    <Tooltip>
      <TooltipTrigger aria-label="O que é este campo e de onde ele veio">
        <Badge variant="outline" className={`${badgeBaseCls} ${badgeCorPorTag[fonte.tag]} cursor-help`}>{fonte.tag}</Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm text-xs leading-relaxed">
        <p>{fonte.explicacao}</p>
        <p className="mt-1.5 border-t border-border pt-1.5 text-[11px] italic text-muted-foreground">{fonte.fonte}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/** Ícone de dica ao lado do rótulo — só aparece quando o campo tem algo a explicar. */
function Dica({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger className="text-muted-foreground/70 transition-colors hover:text-osg-700" aria-label="Onde este campo entra no contrato">
        <Info className="h-3 w-3" />
      </TooltipTrigger>
      <TooltipContent className="max-w-sm text-xs leading-relaxed">{children}</TooltipContent>
    </Tooltip>
  );
}

/** Referência a um campo do contrato — `{ tipo, campo }` aciona o tooltip de trecho literal do modelo em vez de texto de justificativa. */
export interface Trecho {
  tipo: TipoExploracao;
  campo: CampoContrato;
}

/**
 * Corpo do tooltip "onde isso entra no contrato": mostra o trecho LITERAL do modelo
 * oficial (o mesmo texto que `gerarComposicao` usa pra gerar o documento — ver
 * `contratoRuralBlocos.ts`/`contratoRuralCampoOrigem.ts`), com o campo em destaque como
 * `{{caminho}}`. Campo sem placeholder no modelo (referência de arquivo, cláusula de
 * redação fixa) mostra o motivo em vez de fingir uma ocorrência que não existe.
 */
function TrechoDoModelo({ tipo, campo }: Trecho) {
  const resultado = trechosDoCampo(tipo, campo);
  if (!resultado.ok) {
    return (
      <div className="space-y-1.5">
        <p>{resultado.motivo}</p>
        {resultado.trechoFixo && (
          <p className="border-t border-border pt-1.5 text-[11px] italic text-muted-foreground">
            <span className="font-semibold not-italic text-osg-700">{resultado.trechoFixo.rotulo}:</span> "{resultado.trechoFixo.depois}"
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {resultado.trechos.map((t, i) => (
        <p key={i}>
          <span className="mb-0.5 block font-mono text-[10px] font-semibold uppercase tracking-wide text-osg-700">{t.rotulo}</span>
          {t.antes && `${t.antes} `}
          <span className="rounded-sm bg-osg-100 px-1 py-0.5 font-mono text-[11px] font-semibold text-osg-800">{t.campo}</span>
          {t.depois && ` ${t.depois}`}
        </p>
      ))}
      {resultado.extras > 0 && (
        <p className="text-[10px] italic text-muted-foreground">
          + {resultado.extras} outra{resultado.extras > 1 ? 's' : ''} ocorrência{resultado.extras > 1 ? 's' : ''} no modelo.
        </p>
      )}
    </div>
  );
}

// Par Field/Wide compartilhado entre as abas Dados e Imóveis e origens — mesma
// grade (`formGridCls`) e o mesmo rótulo com selo em todo campo do cadastro.
// `trecho` é o padrão novo (tooltip = trecho literal do modelo); `hint` segue existindo
// só pro campo cuja dica não é "onde no contrato" (ex.: "Tipo de exploração", que escolhe
// QUAL modelo renderiza, não um valor dentro de um).
export function Field({ label, required, hint, trecho, children }: { label: string; required?: boolean; hint?: ReactNode; trecho?: Trecho; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className={`${labelCls} flex items-center gap-1.5`}>
        {label}{required && <span className="text-osg-red">*</span>}<Selo origem={trecho?.campo} />
        {trecho ? <Dica><TrechoDoModelo {...trecho} /></Dica> : hint && <Dica>{hint}</Dica>}
      </Label>
      {children}
    </div>
  );
}

export function Wide({ label, hint, trecho, children }: { label: string; hint?: ReactNode; trecho?: Trecho; children: ReactNode }) {
  return (
    <div className={`space-y-1.5 ${formSpanCls(2)}`}>
      <Label className={`${labelCls} flex items-center gap-1.5`}>
        {label}<Selo origem={trecho?.campo} />
        {trecho ? <Dica><TrechoDoModelo {...trecho} /></Dica> : hint && <Dica>{hint}</Dica>}
      </Label>
      {children}
    </div>
  );
}

/** Campo de linha inteira (4 colunas) — pra grupo com sub-campos (Testemunha: nome + CPF + RG) que não cabe espremido nas 2 colunas do `Wide` junto de outros campos na mesma linha. */
export function Full({ label, hint, trecho, children }: { label: string; hint?: ReactNode; trecho?: Trecho; children: ReactNode }) {
  return (
    <div className={`space-y-1.5 ${formSpanCls(4)}`}>
      <Label className={`${labelCls} flex items-center gap-1.5`}>
        {label}<Selo origem={trecho?.campo} />
        {trecho ? <Dica><TrechoDoModelo {...trecho} /></Dica> : hint && <Dica>{hint}</Dica>}
      </Label>
      {children}
    </div>
  );
}

/** Sub-campo dentro de um `Full`/`Wide` (ex.: Nome/CPF/RG dentro de "Testemunha 1") — rótulo pequeno + dica própria, sem selo (o grupo já leva um). */
export function SubCampo({ label, trecho, children }: { label: string; trecho: Trecho; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}<Dica><TrechoDoModelo {...trecho} /></Dica>
      </span>
      {children}
    </div>
  );
}

/** Rótulo de uma lista (Exploradores, Compossuidores, Administradores nomeados) — mesmo par selo+dica dos campos, sem o `<div>` de campo único porque a lista tem seu próprio layout embaixo. */
export function ListaLabel({ label, trecho }: { label: string; trecho: Trecho }) {
  return (
    <Label className={`${labelCls} mb-1.5 flex items-center gap-1.5`}>
      {label}<Selo origem={trecho.campo} /><Dica><TrechoDoModelo {...trecho} /></Dica>
    </Label>
  );
}
