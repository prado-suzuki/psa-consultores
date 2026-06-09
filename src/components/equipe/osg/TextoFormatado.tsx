import { Fragment, type ReactNode } from 'react';
import { extrairRunsLinha } from '@/lib/templates/marcas';
import { segmentar, type Alinhamento, type Segmento } from '@/lib/templates/tabela';

// Renderiza texto com as marcas inline do engine (*negrito*, _itálico_,
// ~sublinhado~) como elementos React — usado nas prévias (Gerar Documento,
// Montagem). Sem dangerouslySetInnerHTML: as marcas viram <strong>/<em>/<u>
// e o resto continua texto puro.
//
// As tabelas (convenção textual `| a | b |` + separadora) são detectadas pelo
// mesmo `segmentar` que alimenta o adapter .docx, então a prévia bate com o
// documento final. Cada célula passa pelas marcas inline.
//
// O contêiner deve permitir blocos (use <div>, não <p> — <table> dentro de <p>
// é HTML inválido) e ter whitespace-pre-wrap para preservar as quebras de linha
// dos segmentos de texto.

const CLASSE_ALINHAMENTO: Record<Alinhamento, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function runs(linha: string): ReactNode {
  return extrairRunsLinha(linha).map((run, j) => {
    let no: ReactNode = run.texto;
    if (run.sublinhado) no = <u>{no}</u>;
    if (run.italico) no = <em>{no}</em>;
    if (run.negrito) no = <strong>{no}</strong>;
    return <Fragment key={j}>{no}</Fragment>;
  });
}

function Tabela({ seg }: { seg: Extract<Segmento, { tipo: 'tabela' }> }) {
  const colunas = seg.cabecalho.length;
  const alinhar = (i: number) => CLASSE_ALINHAMENTO[seg.alinhamentos[i] ?? 'left'];
  // Normaliza cada linha do corpo ao número de colunas do cabeçalho.
  const corpo = seg.corpo.map((cels) =>
    Array.from({ length: colunas }, (_, i) => cels[i] ?? ''),
  );
  return (
    <table className="my-2 w-full border-collapse text-sm">
      <thead>
        <tr>
          {seg.cabecalho.map((cel, i) => (
            <th
              key={i}
              className={`border border-slate-300 px-2 py-1 font-semibold ${alinhar(i)}`}
            >
              {runs(cel)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {corpo.map((cels, r) => (
          <tr key={r}>
            {cels.map((cel, i) => (
              <td
                key={i}
                className={`border border-slate-300 px-2 py-1 align-top ${alinhar(i)}`}
              >
                {runs(cel)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TextoFormatado({ texto }: { texto: string }) {
  const segmentos = segmentar(texto.split('\n'));
  return (
    <>
      {segmentos.map((seg, s) => {
        if (seg.tipo === 'tabela') return <Tabela key={s} seg={seg} />;
        // A quebra entre duas linhas de texto consecutivas vem do '\n'; depois de
        // uma tabela (bloco) não precisa, ela já encerra a linha.
        const quebra = s > 0 && segmentos[s - 1].tipo === 'linha';
        return (
          <Fragment key={s}>
            {quebra && '\n'}
            {runs(seg.texto)}
          </Fragment>
        );
      })}
    </>
  );
}

export default TextoFormatado;
