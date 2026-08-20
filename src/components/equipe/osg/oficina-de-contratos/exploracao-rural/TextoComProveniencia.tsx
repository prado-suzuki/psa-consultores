import { Fragment, type ReactNode } from 'react';
import { segmentarComProveniencia, type Pedaco, type SegmentoProveniencia } from '@/lib/templates';
import type { SegmentoRender } from '@/lib/templates/render';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { rotuloDoCaminho } from '@/previews/contratoRuralRotuloCaminho';

// Renderer do preview com hover-highlight — a funcionalidade que a Oficina de Contratos
// de verdade (Gerar Documento) NÃO tem hoje: lá, passar o mouse sobre um valor não mostra
// o nome do campo (só o clique, quando há `origem` de cadastro real, abre o registro).
// Ver levantamento em `docs/osg/contratos_exploracao/09-preview-hover-highlight.md`.
//
// O que É reaproveitado do motor real, por import direto (nenhuma cópia, nenhum arquivo
// da OSG Work tocado): `segmentarComProveniencia`/`Pedaco`/`SegmentoProveniencia`
// (`src/lib/templates/proveniencia.ts`, função pura, cruza marcas *_~ + tabelas +
// proveniência) — a mesma peça que `TextoFormatado.tsx` (o renderer real) usa por dentro.
// O que é MIRADO, não copiado: a estrutura de marcas/tabela de `TextoFormatado.tsx` (que
// não expõe um jeito de injetar um hover por `Pedaco.caminho`, só clique por `origem`) e o
// destaque visual de bloco de `FolhaDocumento.tsx` (`hover:bg-osg-moss/[0.06]`) — aqui
// aplicado por TRECHO, com um popover de rótulo em vez do clique-abre-cadastro (que abriria
// modais de produção a partir de um mockup isolado, sem sentido aqui).
//
// `Pedaco.caminho` só existe em segmentos `tipo: 'valor'` (ver `render.ts`): uma seção
// `{{#flag}}…{{/flag}}` não marca o conteúdo com o caminho da própria flag — só o VALOR
// final ({{ campo }}) carrega proveniência. Por isso o hover aparece nos dados
// propriamente ditos (nomes, percentuais, datas, matrículas…), não nas flags que só
// ligam/desligam trechos.

const CLASSE_ALINHAMENTO: Record<'left' | 'center' | 'right', string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function renderPedacos(lista: Pedaco[]): ReactNode {
  return lista.map((p, j) => {
    let no: ReactNode = p.texto;
    if (p.sublinhado) no = <u>{no}</u>;
    if (p.italico) no = <em>{no}</em>;
    if (p.negrito) no = <strong>{no}</strong>;
    if (p.caminho && p.texto.trim()) {
      no = (
        <Tooltip>
          <TooltipTrigger asChild>
            <mark className="cursor-help rounded-[2px] bg-osg-highlighter/35 text-inherit transition-colors [box-decoration-break:clone] hover:bg-osg-highlighter/70 [-webkit-box-decoration-break:clone]">{no}</mark>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            <span className="mb-0.5 block font-mono text-[9px] uppercase tracking-wide text-muted-foreground">campo do cadastro</span>
            {rotuloDoCaminho(p.caminho)}
          </TooltipContent>
        </Tooltip>
      );
    }
    return <Fragment key={j}>{no}</Fragment>;
  });
}

function Tabela({ seg }: { seg: Extract<SegmentoProveniencia, { tipo: 'tabela' }> }) {
  const { grupos, cabecalho, corpo, alinhamentos } = seg;
  const colunas = cabecalho.length;
  const alinhar = (i: number) => CLASSE_ALINHAMENTO[alinhamentos[i] ?? 'left'];
  const linhas = corpo.map((cels) => Array.from({ length: colunas }, (_, i) => cels[i] ?? []));
  return (
    <table className="my-2 w-full border-collapse text-sm">
      <thead>
        {grupos && grupos.length > 0 && (
          <tr>
            {grupos.map((g, i) => (
              <th key={i} colSpan={g.span} className="border border-slate-300 px-2 py-1 text-center font-semibold">{g.texto}</th>
            ))}
          </tr>
        )}
        <tr>
          {cabecalho.map((cel, i) => (
            <th key={i} className={`border border-slate-300 px-2 py-1 font-semibold ${alinhar(i)}`}>{renderPedacos(cel)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((cels, r) => (
          <tr key={r}>
            {cels.map((cel, i) => (
              <td key={i} className={`border border-slate-300 px-2 py-1 align-top ${alinhar(i)}`}>{renderPedacos(cel)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Bloco renderizado (texto + tabela) com hover-highlight por campo — ver cabeçalho do arquivo. */
export function TextoComProveniencia({ segmentos }: { segmentos: SegmentoRender[] }) {
  const segs = segmentarComProveniencia(segmentos);
  return (
    <>
      {segs.map((seg, s) => {
        if (seg.tipo === 'tabela') return <Tabela key={s} seg={seg} />;
        const quebra = s > 0 && segs[s - 1].tipo === 'linha';
        return (
          <Fragment key={s}>
            {quebra && '\n'}
            {renderPedacos(seg.pedacos)}
          </Fragment>
        );
      })}
    </>
  );
}
