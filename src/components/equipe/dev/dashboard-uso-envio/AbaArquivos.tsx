/**
 * Aba "Ingestao de arquivos" — o que a equipe subiu e o que nao chegou na base.
 * Fonte: GET /api/v1/analytics/uso/arquivos (hoje: fixture).
 *
 * A tela gira em torno de UMA pergunta: "o documento entrou?".
 * "Falha" sozinho engana — verifiquei no BigQuery que das 2.142 falhas de
 * duplicidade, 1.783 apontam para chave que JA esta em psa_nfe/psa_cte (reenvio
 * do mesmo arquivo, nada perdido), enquanto dos 1.333 XML de CT-e barrados por
 * namespace NENHUM entrou depois. Sao dois fenomenos opostos que o numero
 * agregado somava: Araguaia tinha 1.620 "falhas" das quais 1.600 eram reenvio,
 * e Barralcool tinha 1.347 das quais 1.346 eram perda real.
 *
 * Automacao fica fora de todos os blocos (filtrada na SQL): 21.778 dos 22.066
 * envios eram do robo e afogavam a leitura da equipe.
 */
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsArquivosResponse } from '@/lib/analytics-uso/types';
import { mesEstaParcial } from '@/lib/analytics-uso/metricas';
import {
  BotaoExpandir,
  CelulaBarra,
  FaixaResumo,
  TermoColorido,
  FraseInsight,
  Painel,
  Tabela,
  Td,
  Th,
  Tr,
} from './primitivos';
import {
  ALERTA,
  AXIS_STYLE,
  COR_ERRO,
  COR_NEUTRA,
  RISCO,
  GRAY,
  GRID_STYLE,
  TEAL,
  TOOLTIP_STYLE,
  dataBR,
  mesLabel,
  num,
  numCurto,
  pct,
  useSort,
} from './formatadores';
import { TOOLTIP_COLUNA, TOOLTIP_TECNICO } from './tooltips';
import { compararPeriodo, recortarSerie, somar } from '@/lib/analytics-uso/periodo';
import {
  ALTURA_GRAFICO,
  ALTURA_LISTA,
  COL_APOIO,
  COL_PRINCIPAL,
  GRADE_DUPLA,
  GRADE_TOPO,
} from './layout';

import {
  insightConcentracao,
  insightLider,
  insightPiorMes,
} from '@/lib/analytics-uso/insights';

const TOP_CLIENTES = 8;

interface Props {
  dados?: AnalyticsArquivosResponse;
  carregando: boolean;
  /** 0 = todo o período. Recorta a série mensal no cliente (modo fixture). */
  mesesRecorte?: number;
  usuarioSelecionado?: string;
  onSelecionarUsuario: (usuario?: string) => void;
}

export const AbaArquivos = ({
  dados,
  carregando,
  mesesRecorte = 0,
  usuarioSelecionado,
  onSelecionarUsuario,
}: Props) => {
  const totaisBrutos = dados?.totais;
  const serieCompleta = dados?.porMes ?? [];
  const recorteAtivo = mesesRecorte > 0;
  const porMes = recortarSerie(dados?.porMes ?? [], mesesRecorte).serie;
  const porCausa = dados?.porCausa ?? [];
  const porCliente = dados?.porCliente ?? [];
  const usuarios = useMemo(() => dados?.porUsuario ?? [], [dados]);

  const fimPeriodo = dados?.periodo.fim ?? '';
  const t = recorteAtivo
    ? {
        ...totaisBrutos!,
        enviados: somar(porMes, (m) => m.enviados),
        naoEntraram: somar(porMes, (m) => m.naoEntraram),
        reenvios: somar(porMes, (m) => m.reenvios),
      }
    : totaisBrutos;
  const tabela = useSort(usuarios, 'naoEntraram');
  const maxEnviados = usuarios.reduce((m, u) => Math.max(m, u.enviados), 0);
  const tabelaClientes = useSort(porCliente, 'naoEntraram');
  const maxRejeitado = porCliente.reduce((m, c) => Math.max(m, c.naoEntraram), 0);
  const topPessoa = [...usuarios].sort((a, b) => b.enviados - a.enviados)[0];

  const serieMes = porMes.map((m) => ({
    ...m,
    label: `${mesLabel(m.mes)}${mesEstaParcial(m.mes, fimPeriodo) ? '*' : ''}`,
  }));

  // Ordena pela perda real, nao pelo total de falhas — senao Araguaia (1.600
  // reenvios) aparece como pior cliente sendo que quase nada se perdeu la.
  const clientes = [...porCliente]
    .filter((c) => c.naoEntraram > 0 || c.enviados > 0)
    .sort((a, b) => b.naoEntraram - a.naoEntraram)
    .slice(0, TOP_CLIENTES);

  const causasAusente = porCausa.filter((c) => c.impacto === 'ausente');
  const clientesAfetados = porCliente.filter((c) => c.naoEntraram > 0).length;
  const mesIngeridos = compararPeriodo(serieCompleta, (m) => m.enviados, mesesRecorte);
  const mesRejeitados = compararPeriodo(serieCompleta, (m) => m.naoEntraram, mesesRecorte);

  const insightCausa = insightConcentracao(
    causasAusente,
    (c) => c.erros,
    (c) => c.causa.toLowerCase(),
    'rejeições',
    { rotuloEntidade: 'Causa dominante:', tom: 'risco', piso: 0.3 },
  );

  const insightRejeicao = insightConcentracao(
    porCliente,
    (c) => c.naoEntraram,
    (c) => c.cliente,
    'rejeições',
    { rotuloEntidade: 'A pasta da', tom: 'risco' },
  );
  const insightIngestor = insightLider(
    usuarios,
    (u) => u.enviados,
    (u) => u.usuario,
    (v) => `ingeriu ${v} documentos, o maior volume da equipe.`,
  );
  const insightPiorMesRejeicao = insightPiorMes(
    porMes,
    (m) => m.naoEntraram,
    (v) => `${v.toLocaleString('pt-BR')} documentos`,
    'rejeição',
  );

  return (
    <div className="space-y-3">
      <FaixaResumo
        colunas={3}
        carregando={carregando}
        itens={[
          {
            label: 'Arquivos enviados',
            valor: num(t?.enviados),
            variacao:
                mesIngeridos.anterior != null
                  ? {
                      pct: mesIngeridos.pct ?? undefined,
                      valor: num(mesIngeridos.anterior),
                      rotulo: `período anterior · ${mesIngeridos.rotulo}`,
                      melhorQuando: 'sobe',
                    }
                  : undefined,
            tooltip: TOOLTIP_TECNICO.documentosNaBase,
            tom: 'positivo',
          },
          {
            label: 'Rejeitados',
            valor: num(t?.naoEntraram),
            variacao:
                mesRejeitados.anterior != null
                  ? {
                      pct: mesRejeitados.pct ?? undefined,
                      valor: num(mesRejeitados.anterior),
                      rotulo: `período anterior · ${mesRejeitados.rotulo}`,
                      melhorQuando: 'desce',
                    }
                  : undefined,
            tooltip: TOOLTIP_TECNICO.naoEntraram,
            tom: (t?.naoEntraram ?? 0) > 0 ? 'risco' : 'positivo',
          },
          {
            label: 'Duplicatas',
            valor: num(t?.reenvios),
            variacao: {
              valor: num(t?.automacaoEnviados),
              rotulo: 'documentos processados pela automação, fora desta conta',
            },
            tooltip: TOOLTIP_TECNICO.reenvios,
            tom: 'alerta',
          },
        ]}
      />


      <div className={GRADE_TOPO}>
        <Painel
          titulo="Arquivos enviados e rejeitados por mês"
          resumo={<FraseInsight insight={insightPiorMesRejeicao} />}
          descricao={
            <>
              <TermoColorido cor={TEAL[600]}>Arquivos enviados</TermoColorido>,{' '}
              <TermoColorido cor={COR_ERRO}>rejeitados</TermoColorido> e{' '}
              <TermoColorido cor={COR_NEUTRA}>duplicatas</TermoColorido> por mês. * mês parcial.
            </>
          }
          tooltip={TOOLTIP_TECNICO.evolucaoIngestao}
          altura={ALTURA_GRAFICO}
          carregando={carregando}
          className={COL_PRINCIPAL}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serieMes} margin={{ top: 4, right: 8, left: 0, bottom: 6 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="label" {...AXIS_STYLE} tickMargin={8} />
              <YAxis {...AXIS_STYLE} padding={{ top: 10 }} tickFormatter={numCurto} width={58} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, n: string) => [num(v), n]} />
              <Bar
                dataKey="enviados"
                name="arquivos enviados"
                fill={TEAL[600]}
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="naoEntraram"
                name="rejeitados"
                fill={COR_ERRO}
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="reenvios"
                name="duplicatas"
                fill={COR_NEUTRA}
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </Painel>

        <Painel
          titulo="Por que os documentos foram rejeitados"
          resumo={<FraseInsight insight={insightCausa} />}
          descricao="Duplicata não entra nesta contagem."
          tooltip={TOOLTIP_TECNICO.causasFalha}
          altura={ALTURA_GRAFICO}
          carregando={carregando}
          className={COL_APOIO}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={causasAusente}
              layout="vertical"
              margin={{ top: 4, right: 44, left: 4, bottom: 6 }}
            >
              <CartesianGrid {...GRID_STYLE} horizontal={false} vertical />
              <XAxis type="number" {...AXIS_STYLE} tickFormatter={numCurto} />
              <YAxis
                type="category"
                dataKey="causa"
                width={126}
                {...AXIS_STYLE}
                tick={{ ...AXIS_STYLE.tick, fontSize: 10 }}
              />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [num(v), 'documentos']} />
              <Bar dataKey="erros" fill={COR_ERRO} radius={[0, 3, 3, 0]} maxBarSize={16}>
                <LabelList
                  dataKey="erros"
                  position="right"
                  formatter={(v: number) => num(v)}
                  style={{ fontSize: 10, fill: GRAY[500], fontFamily: "'Work Sans', sans-serif" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Painel>
      </div>

      <div className={GRADE_DUPLA}>
        <Painel
          titulo="Documentos rejeitados por pasta de cliente"
          resumo={<FraseInsight insight={insightRejeicao} />}
          descricao={`${num(porCliente.length)} pastas no período.`}
          tooltip={TOOLTIP_TECNICO.clientes}
          carregando={carregando}
        >
          <Tabela altura={ALTURA_LISTA}>
            <thead>
              <tr>
                <Th campo="cliente" estado={tabelaClientes} tooltip={TOOLTIP_COLUNA.pastaCliente}>
                  Pasta do cliente
                </Th>
                <Th campo="naoEntraram" estado={tabelaClientes} alinhar="right" tooltip={TOOLTIP_COLUNA.rejeitados}>
                  Rejeitados
                </Th>
                <Th campo="enviados" estado={tabelaClientes} alinhar="right" tooltip={TOOLTIP_COLUNA.ingeridos}>
                  Arquivos enviados
                </Th>
                <Th campo="reenvios" estado={tabelaClientes} alinhar="right" tooltip={TOOLTIP_COLUNA.duplicatas}>
                  Duplicatas
                </Th>
              </tr>
            </thead>
            <tbody>
              {tabelaClientes.sorted.map((c) => (
                <Tr key={c.cliente}>
                  <Td className="max-w-[190px] truncate text-slate-800">{c.cliente}</Td>
                  <Td alinhar="right">
                    {c.naoEntraram > 0 ? (
                      <CelulaBarra
                        valor={c.naoEntraram}
                        max={maxRejeitado}
                        cor={COR_ERRO}
                        rotulo={num(c.naoEntraram)}
                      />
                    ) : (
                      <span className="text-slate-300">0</span>
                    )}
                  </Td>
                  <Td alinhar="right" className="text-slate-600">
                    {num(c.enviados)}
                  </Td>
                  <Td
                    alinhar="right"
                    className={c.reenvios ? 'text-slate-500' : 'text-slate-300'}
                  >
                    {num(c.reenvios)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Tabela>
        </Painel>

        <Painel
          titulo="Arquivos enviados por pessoa"
          resumo={<FraseInsight insight={insightIngestor} />}
          descricao="Clique em uma pessoa para filtrar a página."
          carregando={carregando}
        >
          <Tabela altura={ALTURA_LISTA}>
            <thead>
              <tr>
                <Th campo="usuario" estado={tabela} tooltip={TOOLTIP_COLUNA.pessoa}>
                  Pessoa
                </Th>
                <Th campo="enviados" estado={tabela} alinhar="right" tooltip={TOOLTIP_COLUNA.ingeridos}>
                  Arquivos enviados
                </Th>
                <Th
                  campo="naoEntraram"
                  estado={tabela}
                  alinhar="right"
                tooltip={TOOLTIP_COLUNA.rejeitados}
                >
                  Rejeitados
                </Th>
                <Th
                  campo="erroDuplicidade"
                  estado={tabela}
                  alinhar="right"
                tooltip={TOOLTIP_COLUNA.duplicatas}
                >
                  Duplicatas
                </Th>
              </tr>
            </thead>
            <tbody>
              {tabela.sorted.map((u) => (
                <Tr key={u.usuario}>
                  <Td>
                    <button
                      type="button"
                      onClick={() =>
                        onSelecionarUsuario(usuarioSelecionado === u.usuario ? undefined : u.usuario)
                      }
                      className={
                        usuarioSelecionado === u.usuario
                          ? 'font-semibold text-teal-700 underline underline-offset-2'
                          : 'font-medium text-slate-800 hover:text-teal-700 hover:underline'
                      }
                    >
                      {u.usuario}
                    </button>
                  </Td>
                  <Td alinhar="right">
                    <CelulaBarra valor={u.enviados} max={maxEnviados} rotulo={num(u.enviados)} />
                  </Td>
                  <Td
                    alinhar="right"
                    className={u.naoEntraram ? 'font-medium text-slate-800' : 'text-slate-300'}
                  >
                    {num(u.naoEntraram)}
                  </Td>
                  <Td
                    alinhar="right"
                    className={u.erroDuplicidade ? 'text-slate-500' : 'text-slate-300'}
                  >
                    {num(u.erroDuplicidade)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Tabela>
        </Painel>
      </div>

    </div>
  );
};
