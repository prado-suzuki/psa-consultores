/**
 * Bloco "faturamento detalhado" do dashboard Clientes e OS: alterna entre
 * centro de custo e cliente (como o "Por área / Por cliente" do Power BI da
 * diretoria) e mostra a mesma matriz nas duas visões — barras com o ranking e
 * tabela dimensão × mês logo abaixo.
 *
 * Gráfico e tabela saem da MESMA `MatrizMensal`, então nunca divergem: o que
 * muda é só quantas linhas cabem no gráfico.
 */
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList,
} from 'recharts';
import { SEM_CENTRO_CUSTO, SEM_PRODUTO, SEM_SERVICO, SEM_DATA } from '@/lib/dashboardClientesOs/aggregations';
import type { MatrizMensal } from '@/lib/dashboardClientesOs/types';
import {
  ACENTO, NEUTRO, AXIS, GRID, TOOLTIP, brl, brlMil, milAxis, mesColuna, celulaBRL, pctDoTotal,
  larguraEixo, td, thFixo, tdNome, tdTotal, numerico,
} from './shared';
import { ChartEmpty } from './ChartEmpty';

/** Detalhamento do bloco de faturamento. */
export type Detalhe = 'centro_custo' | 'servico' | 'produto' | 'cliente';

/**
 * Cada visão: rótulo do botão, nome da dimensão nos títulos e a explicação de
 * COMO a receita foi dividida (rateio nunca pode ficar implícito).
 */
const VISOES: Record<Detalhe, { botao: string; dimensao: string; coluna: string; nota: string }> = {
  centro_custo: {
    botao: 'Por centro de custo',
    dimensao: 'centro de custo',
    coluna: 'Centro de custo',
    nota: 'Receita das OS dividida pelo percentual de rateio de cada centro de custo',
  },
  servico: {
    botao: 'Por serviço',
    dimensao: 'serviço',
    coluna: 'Serviço',
    nota: 'Serviço cadastrado na OS (um por OS) — o valor entra inteiro, sem rateio',
  },
  produto: {
    botao: 'Por produto',
    dimensao: 'produto',
    coluna: 'Produto',
    nota: 'Receita das OS dividida entre os produtos contratados pelas horas de cada um (em partes iguais quando a OS não tem horas)',
  },
  cliente: {
    botao: 'Por cliente',
    dimensao: 'cliente',
    coluna: 'Cliente',
    nota: 'Receita das OS por cliente',
  },
};

/** Barras no gráfico: acima disso a leitura morre — a matriz abaixo traz a lista inteira. */
const MAX_BARRAS = 15;
/** Buckets do "não classificado": barra cinza, para não parecerem uma dimensão real. */
const SEM_CLASSIFICACAO = new Set([SEM_CENTRO_CUSTO.id, SEM_PRODUTO.id, SEM_SERVICO.id]);

interface Props {
  detalhe: Detalhe;
  onDetalheChange: (d: Detalhe) => void;
  matriz: MatrizMensal;
}

export const FaturamentoDetalhe = ({ detalhe, onDetalheChange, matriz }: Props) => {
  const visao = VISOES[detalhe];
  const dimensao = visao.dimensao;
  const total = matriz.linhas.reduce((acc, l) => acc + l.total, 0);
  const barras = matriz.linhas.slice(0, MAX_BARRAS);
  const somaMes = (mes: string) => matriz.linhas.reduce((acc, l) => acc + (l.porMes[mes] ?? 0), 0);

  return (
    <>
      <div className="v4-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div>
            <div className="v4-card-title" style={{ marginBottom: 2 }}>Faturamento por {dimensao} (R$)</div>
            <div style={{ fontSize: 11, color: 'var(--board-v4-ink3)' }}>
              {visao.nota}
              {matriz.linhas.length > MAX_BARRAS
                && ` · gráfico mostra os ${MAX_BARRAS} maiores de ${matriz.linhas.length}; a tabela abaixo traz todos`}
            </div>
          </div>
          <div className="v3-segs">
            {(Object.keys(VISOES) as Detalhe[]).map((k) => (
              <button key={k} className={`v3-seg ${detalhe === k ? 'on' : ''}`} onClick={() => onDetalheChange(k)}>
                {VISOES[k].botao}
              </button>
            ))}
          </div>
        </div>

        {barras.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(140, barras.length * 30 + 30)}>
            <BarChart data={barras} layout="vertical" margin={{ top: 4, right: 128, bottom: 4, left: 4 }}>
              <CartesianGrid {...GRID} horizontal={false} />
              <XAxis type="number" {...AXIS} tickFormatter={milAxis} />
              <YAxis type="category" dataKey="label" {...AXIS} width={larguraEixo(barras)} interval={0} />
              <Tooltip formatter={(v: number) => brl(v)} {...TOOLTIP} />
              {/* Série única: a barra é o acento da área; o "não classificado" sai no
                  neutro, para não parecer uma dimensão real. */}
              <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {barras.map((l) => (
                  <Cell key={l.id} fill={SEM_CLASSIFICACAO.has(l.id) ? NEUTRO : ACENTO} />
                ))}
                <LabelList
                  dataKey="total" position="right"
                  formatter={(v: number | string) => `${brlMil(Number(v))} · ${pctDoTotal(Number(v), total)}`}
                  style={{ fontSize: 11, fontWeight: 600, fill: 'var(--board-v4-ink2)' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <ChartEmpty msg="Sem OS no período" />}
      </div>

      <div className="v4-card">
        <div className="v4-card-title">
          Faturamento por {dimensao} e mês (R$)
          {matriz.linhas.length > 0 && (
            <span style={{ fontWeight: 400, color: 'var(--board-v4-ink3)' }}> · {matriz.linhas.length} linhas</span>
          )}
        </div>
        {matriz.linhas.length > 0 ? (
          <div style={{ maxHeight: 460, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thFixo, textAlign: 'left', minWidth: 200, left: 0, zIndex: 3 }}>
                    {visao.coluna}
                  </th>
                  {matriz.meses.map((m) => (
                    <th key={m} style={{ ...thFixo, textAlign: 'right' }}>{mesColuna(m)}</th>
                  ))}
                  {matriz.temSemData && <th style={{ ...thFixo, textAlign: 'right' }}>Sem data</th>}
                  <th style={{ ...thFixo, textAlign: 'right', borderLeft: '1px solid var(--board-v4-line)' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {matriz.linhas.map((l) => (
                  <tr key={l.id}>
                    <td style={tdNome}>{l.label}</td>
                    {matriz.meses.map((m) => (
                      <td key={m} style={{ ...td, ...numerico }}>{celulaBRL(l.porMes[m])}</td>
                    ))}
                    {matriz.temSemData && <td style={{ ...td, ...numerico }}>{celulaBRL(l.porMes[SEM_DATA])}</td>}
                    <td style={{ ...td, ...numerico, fontWeight: 700, borderLeft: '1px solid var(--board-v4-line)' }}>
                      {celulaBRL(l.total)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...tdTotal, fontWeight: 700, left: 0, zIndex: 3 }}>Total geral</td>
                  {matriz.meses.map((m) => (
                    <td key={m} style={{ ...tdTotal, ...numerico }}>{celulaBRL(somaMes(m))}</td>
                  ))}
                  {matriz.temSemData && <td style={{ ...tdTotal, ...numerico }}>{celulaBRL(somaMes(SEM_DATA))}</td>}
                  <td style={{ ...tdTotal, ...numerico, fontWeight: 700, borderLeft: '1px solid var(--board-v4-line)' }}>
                    {celulaBRL(total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : <ChartEmpty msg="Sem OS no período" />}
      </div>
    </>
  );
};
