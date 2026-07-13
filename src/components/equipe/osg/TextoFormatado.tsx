import { Fragment, type ReactNode } from 'react';
import { extrairRunsLinha } from '@/lib/templates/marcas';
import { segmentar, type Alinhamento } from '@/lib/templates/tabela';
import {
  segmentarComProveniencia,
  type Pedaco,
  type SegmentoProveniencia,
} from '@/lib/templates/proveniencia';
import type { OrigemValor, SegmentoRender } from '@/lib/templates/render';

// Renderiza texto com as marcas inline do engine (*negrito*, _itálico_,
// ~sublinhado~) como elementos React — usado nas prévias (Gerar Documento,
// Montagem). Sem dangerouslySetInnerHTML: as marcas viram <strong>/<em>/<u>
// e o resto continua texto puro.
//
// As tabelas (convenção textual `| a | b |` + separadora) são detectadas pelo
// mesmo `segmentar` que alimenta o adapter .docx, então a prévia bate com o
// documento final. Cada célula passa pelas marcas inline.
//
// Modo segmentado (prévia da Gerar): com `segmentos` do render estruturado, os
// valores que vieram de placeholder com proveniência viram spans clicáveis —
// clique abre o cadastro de origem (onClickOrigem), sem propagar para o bloco.
//
// O contêiner deve permitir blocos (use <div>, não <p> — <table> dentro de <p>
// é HTML inválido) e ter whitespace-pre-wrap para preservar as quebras de linha
// dos segmentos de texto.

const CLASSE_ALINHAMENTO: Record<Alinhamento, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

// Placeholder do engine: {{ campo }}, {{#colecao}}, {{/colecao}}. Na prévia da
// Montagem (texto cru, antes do preenchimento) viram marca-texto osg-highlighter.
const TOKEN_PLACEHOLDER = /\{\{[^{}]*\}\}/g;

/** Quebra o texto cru em nós, envolvendo cada {{ ... }} num marca-texto. */
function realcarPlaceholders(texto: string): ReactNode {
  const partes: ReactNode[] = [];
  let cursor = 0;
  let k = 0;
  for (const m of texto.matchAll(TOKEN_PLACEHOLDER)) {
    const inicio = m.index!;
    if (inicio > cursor) partes.push(texto.slice(cursor, inicio));
    partes.push(
      <mark
        key={`ph-${k++}`}
        className="rounded-[2px] bg-osg-highlighter/60 px-0.5 text-inherit [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
      >
        {m[0]}
      </mark>,
    );
    cursor = inicio + m[0].length;
  }
  if (partes.length === 0) return texto;
  if (cursor < texto.length) partes.push(texto.slice(cursor));
  return partes;
}

function runs(linha: string, realcarCampos = false): ReactNode {
  return extrairRunsLinha(linha).map((run, j) => {
    let no: ReactNode = realcarCampos ? realcarPlaceholders(run.texto) : run.texto;
    if (run.sublinhado) no = <u>{no}</u>;
    if (run.italico) no = <em>{no}</em>;
    if (run.negrito) no = <strong>{no}</strong>;
    return <Fragment key={j}>{no}</Fragment>;
  });
}

interface ClickOrigem {
  onClickOrigem?: (origem: OrigemValor) => void;
  origemClicavel?: (origem: OrigemValor) => boolean;
}

function pedacos(lista: Pedaco[], { onClickOrigem, origemClicavel }: ClickOrigem): ReactNode {
  return lista.map((p, j) => {
    let no: ReactNode = p.texto;
    if (p.sublinhado) no = <u>{no}</u>;
    if (p.italico) no = <em>{no}</em>;
    if (p.negrito) no = <strong>{no}</strong>;
    const origem = p.origem;
    if (origem && onClickOrigem && (origemClicavel?.(origem) ?? true)) {
      const abrir = () => onClickOrigem(origem);
      no = (
        <span
          role="button"
          tabIndex={0}
          title="Abrir o cadastro deste dado"
          className="cursor-pointer rounded-sm transition-colors hover:bg-osg-moss/10 hover:underline hover:decoration-osg-moss/70 hover:decoration-dotted hover:underline-offset-4"
          onClick={(e) => {
            // O bloco em volta abre o popover "Editar bloco" no clique — o
            // valor clicável é um gesto próprio, não pode subir.
            e.stopPropagation();
            abrir();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              abrir();
            }
          }}
        >
          {no}
        </span>
      );
    }
    // Trecho alterado por um override: marca-texto terracota (diff por palavra).
    // box-decoration-clone para o realce envolver bem trechos que quebram linha.
    if (p.realce) {
      no = (
        <mark className="rounded-[2px] bg-osg-highlighter/60 text-inherit [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
          {no}
        </mark>
      );
    }
    return <Fragment key={j}>{no}</Fragment>;
  });
}

interface CelulasTabela {
  grupos?: { texto: ReactNode; span: number }[];
  cabecalho: ReactNode[];
  corpo: ReactNode[][];
  alinhamentos: Alinhamento[];
}

function Tabela({ grupos, cabecalho, corpo, alinhamentos }: CelulasTabela) {
  const colunas = cabecalho.length;
  const alinhar = (i: number) => CLASSE_ALINHAMENTO[alinhamentos[i] ?? 'left'];
  // Normaliza cada linha do corpo ao número de colunas do cabeçalho.
  const linhas = corpo.map((cels) => Array.from({ length: colunas }, (_, i) => cels[i] ?? ''));
  return (
    <table className="my-2 w-full border-collapse text-sm">
      <thead>
        {grupos && grupos.length > 0 && (
          <tr>
            {grupos.map((g, i) => (
              <th
                key={i}
                colSpan={g.span}
                className="border border-slate-300 px-2 py-1 text-center font-semibold"
              >
                {g.texto}
              </th>
            ))}
          </tr>
        )}
        <tr>
          {cabecalho.map((cel, i) => (
            <th
              key={i}
              className={`border border-slate-300 px-2 py-1 font-semibold ${alinhar(i)}`}
            >
              {cel}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((cels, r) => (
          <tr key={r}>
            {cels.map((cel, i) => (
              <td
                key={i}
                className={`border border-slate-300 px-2 py-1 align-top ${alinhar(i)}`}
              >
                {cel}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface TextoFormatadoProps extends ClickOrigem {
  texto?: string;
  /** Modo segmentado (render estruturado): quando presente, `texto` é ignorado. */
  segmentos?: SegmentoRender[];
  /**
   * Prévia da Montagem: o texto ainda tem placeholders crus ({{ ... }}), que
   * viram marca-texto osg-highlighter. Só vale no modo `texto` (no segmentado os
   * placeholders já foram resolvidos em valores).
   */
  realcarPlaceholders?: boolean;
}

export function TextoFormatado({
  texto,
  segmentos,
  onClickOrigem,
  origemClicavel,
  realcarPlaceholders: realcar = false,
}: TextoFormatadoProps) {
  if (segmentos) {
    const click: ClickOrigem = { onClickOrigem, origemClicavel };
    const segs: SegmentoProveniencia[] = segmentarComProveniencia(segmentos);
    return (
      <>
        {segs.map((seg, s) => {
          if (seg.tipo === 'tabela') {
            return (
              <Tabela
                key={s}
                grupos={seg.grupos?.map((g) => ({ texto: g.texto, span: g.span }))}
                cabecalho={seg.cabecalho.map((cel) => pedacos(cel, click))}
                corpo={seg.corpo.map((cels) => cels.map((cel) => pedacos(cel, click)))}
                alinhamentos={seg.alinhamentos}
              />
            );
          }
          const quebra = s > 0 && segs[s - 1].tipo === 'linha';
          return (
            <Fragment key={s}>
              {quebra && '\n'}
              {pedacos(seg.pedacos, click)}
            </Fragment>
          );
        })}
      </>
    );
  }

  const segmentados = segmentar((texto ?? '').split('\n'));
  const renderLinha = (linha: string) => runs(linha, realcar);
  return (
    <>
      {segmentados.map((seg, s) => {
        if (seg.tipo === 'tabela') {
          return (
            <Tabela
              key={s}
              grupos={seg.grupos?.map((g) => ({ texto: g.texto, span: g.span }))}
              cabecalho={seg.cabecalho.map(renderLinha)}
              corpo={seg.corpo.map((cels) => cels.map(renderLinha))}
              alinhamentos={seg.alinhamentos}
            />
          );
        }
        // A quebra entre duas linhas de texto consecutivas vem do '\n'; depois de
        // uma tabela (bloco) não precisa, ela já encerra a linha.
        const quebra = s > 0 && segmentados[s - 1].tipo === 'linha';
        return (
          <Fragment key={s}>
            {quebra && '\n'}
            {renderLinha(seg.texto)}
          </Fragment>
        );
      })}
    </>
  );
}

export default TextoFormatado;
