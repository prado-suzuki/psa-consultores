/**
 * O documento modelo anexado a cada bloco do mockup, com proveniência.
 *
 * É a resposta a duas perguntas do usuário: "de onde vem essa informação?" e
 * "como fica isso no contrato?". Todo dado aparece marcado em AMARELO e, ao passar
 * o mouse, diz de onde saiu, no mesmo espírito da tela Gerar Documento, onde o
 * valor é clicável e leva ao cadastro (ver `TextoFormatado.tsx` e a proveniência
 * por Symbol em `src/lib/templates/origem.ts`).
 *
 * A diferença é de propósito: aqui a marcação é PERMANENTE e amarela, porque a
 * pergunta do mockup é "quanto deste contrato o sistema já preenche?". Na tela
 * real o valor fica discreto e só se destaca no hover, porque lá a pergunta é
 * outra, "este contrato está certo?".
 *
 * A tipografia é a da folha do gerador (`FolhaDocumento.tsx`): serifada, texto
 * justificado, sobre folha branca.
 */
import type { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** De onde o valor saiu. Muda a cor da marca e o texto da tooltip. */
export type Fonte =
  /** Tabela do banco que já existe hoje. */
  | { de: 'cadastro'; onde: string; tela: string }
  /** Campo do próprio formulário de governança. */
  | { de: 'formulario'; onde: string; item: string; campo?: string }
  /** Calculado a partir de outros campos. */
  | { de: 'derivado'; onde: string };

export type Parte = string | { v: string; f: Fonte };

export type Paragrafo = {
  tipo: 'titulo' | 'centro' | 'capitulo' | 'clausula' | 'paragrafo' | 'alinea';
  partes: Parte[];
};

const FONTE_SERIF =
  "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif";

const Marca = ({ v, f, ir }: { v: string; f: Fonte; ir?: (campo: string) => void }) => {
  const alvo = f.de === 'formulario' ? f.campo : undefined;
  const cor =
    f.de === 'cadastro'
      ? 'bg-amber-200/80 decoration-amber-600'
      : f.de === 'formulario'
        ? 'bg-amber-100 decoration-amber-500'
        : 'bg-amber-50 decoration-amber-400';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role={alvo && ir ? 'button' : undefined}
          tabIndex={alvo && ir ? 0 : undefined}
          onClick={alvo && ir ? () => ir(alvo) : undefined}
          onKeyDown={
            alvo && ir
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    ir(alvo);
                  }
                }
              : undefined
          }
          className={`rounded-sm px-0.5 underline decoration-dotted underline-offset-2 ${cor} ${
            alvo && ir ? 'cursor-pointer hover:decoration-solid' : 'cursor-help'
          }`}
        >
          {v}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[360px] text-[12px] leading-snug">
        <span className="mb-0.5 block font-semibold uppercase tracking-wide text-osg-moss">
          {f.de === 'cadastro'
            ? 'o sistema já tem'
            : f.de === 'formulario'
              ? 'campo deste formulário'
              : 'calculado pelo sistema'}
        </span>
        <span className="block font-mono text-[11px]">{f.onde}</span>
        {f.de === 'cadastro' && <span className="block italic">cadastrado em {f.tela}</span>}
        {f.de === 'formulario' && <span className="block italic">preenchido em {f.item}</span>}
        {alvo && ir && (
          <span className="mt-1 block font-semibold text-osg-moss">clique para ir ao campo</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

const CLASSE: Record<Paragrafo['tipo'], string> = {
  titulo: 'text-center font-bold uppercase tracking-wide mb-1',
  centro: 'text-center font-semibold mb-0.5',
  capitulo: 'text-center font-bold uppercase tracking-wide mt-5 mb-2',
  clausula: 'text-justify indent-8 mb-2',
  paragrafo: 'text-justify indent-8 mb-2',
  alinea: 'text-justify ml-8 mb-1.5',
};

export const DocumentoModelo = ({
  rotulo,
  paragrafos,
  nota,
  aoLado,
  onIrParaCampo,
  deTotal,
}: {
  rotulo: string;
  paragrafos: Paragrafo[];
  nota?: ReactNode;
  /** true = coluna lateral: perde a borda de topo e ganha rolagem própria. */
  aoLado?: boolean;
  onIrParaCampo?: (campo: string) => void;
  /** Quantos campos o bloco tem no total, para a conta de cobertura. */
  deTotal?: number;
}) => (
  <div className={aoLado ? '' : 'mt-5 border-t-2 border-osg-100 pt-5'}>
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-osg-700">
        {rotulo}
      </span>
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="rounded-sm bg-amber-200/80 px-1">amarelo forte</span> o sistema já tem
        <span className="ml-2 rounded-sm bg-amber-100 px-1">amarelo claro</span> campo deste
        formulário
        <span className="ml-2 rounded-sm bg-amber-50 px-1">amarelo fraco</span> calculado
      </span>
    </div>
    {nota && <p className="mb-2 max-w-[76ch] text-[12.5px] leading-relaxed text-osg-500">{nota}</p>}
    {/*
      A cobertura é medida, não estimada: conta os campos distintos que aparecem
      no documento contra o total do bloco. Serve para responder "por que não vejo
      todos os campos no contrato?" com número, em vez de com desculpa. O que falta
      é campo cuja cláusula ainda não foi localizada em documento real, e nesse caso
      a referência vive só na tooltip do campo.
    */}
    {deTotal && (
      <p className="mb-3 text-[11.5px] text-muted-foreground">
        <strong className="font-semibold text-osg-700">
          {new Set(
            paragrafos
              .flatMap((p) => p.partes)
              .filter((x): x is Exclude<Parte, string> => typeof x !== 'string')
              .map((x) => (x.f.de === 'formulario' ? x.f.campo : undefined))
              .filter(Boolean),
          ).size}{' '}
          de {deTotal}
        </strong>{' '}
        campos deste bloco aparecem no documento. Os outros existem no formulário mas ainda não
        tivemos cláusula real onde encaixá-los: a referência deles fica na tooltip do próprio campo.
      </p>
    )}
    <div
      className="rounded-md border border-osg-100 bg-white px-7 py-6 text-[13.5px] leading-relaxed text-slate-800 shadow-[0_1px_3px_rgba(16,24,40,0.06)]"
      style={{ fontFamily: FONTE_SERIF }}
    >
      {paragrafos.map((p, i) => (
        <p key={i} className={CLASSE[p.tipo]}>
          {p.partes.map((parte, j) =>
            typeof parte === 'string' ? (
              <span key={j}>{parte}</span>
            ) : (
              <Marca key={j} v={parte.v} f={parte.f} ir={onIrParaCampo} />
            ),
          )}
        </p>
      ))}
    </div>
  </div>
);
