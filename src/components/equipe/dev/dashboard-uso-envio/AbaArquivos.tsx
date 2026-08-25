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
  AXIS_STYLE,
  COR_ERRO,
  COR_NEUTRA,
  GRAY,
  GRID_STYLE,
  TEAL,
  TOOLTIP_STYLE,
  mesLabel,
  num,
  numCurto,
  pct,
  useSort,
  useTopN,
} from './formatadores';
import { TOOLTIP_COLUNA, TOOLTIP_TECNICO } from './tooltips';
import {
  ALTURA_GRAFICO,
  ALTURA_LISTA,
  COL_APOIO,
  COL_PRINCIPAL,
  GRADE_DUPLA,
  GRADE_TOPO,
} from './layout';

import { insightConcentracao, insightLider, insightPiorMes } from '@/lib/analytics-uso/insights';
import { prepararArquivosViewModel } from '@/lib/analytics-uso/viewModels';

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
  const viewModel = useMemo(
    () => prepararArquivosViewModel(dados, mesesRecorte),
    [dados, mesesRecorte],
  );
  const {
    totais: t,
    porMes,
    porCausa,
    porCliente,
    usuarios,
    maxEnviados,
    maxRejeitado,
    comparacaoEnviados: mesIngeridos,
    comparacaoRejeitados: mesRejeitados,
  } = viewModel;

  const fimPeriodo = dados?.periodo.fim ?? '';
  const tabela = useSort(usuarios, 'naoEntraram');
  const tabelaClientes = useSort(porCliente, 'naoEntraram');
  const pessoas = useTopN(tabela.sorted, 20);
  const clientes = useTopN(tabelaClientes.sorted, 20);

  const serieMes = useMemo(
    () =>
      porMes.map((item) => ({
        ...item,
        label: `${mesLabel(item.mes)}${mesEstaParcial(item.mes, fimPeriodo) ? '*' : ''}`,
      })),
    [fimPeriodo, porMes],
  );

  const { causasAusente, insightCausa, insightRejeicao, insightIngestor, insightPiorMesRejeicao } =
    useMemo(() => {
      const causas = porCausa.filter((item) => item.impacto === 'ausente');
      return {
        causasAusente: causas,
        insightCausa: insightConcentracao(
          causas,
          (item) => item.erros,
          (item) => item.causa.toLowerCase(),
          'rejeições',
          { rotuloEntidade: 'Causa dominante:', tom: 'risco', piso: 0.3 },
        ),
        insightRejeicao: insightConcentracao(
          porCliente,
          (item) => item.naoEntraram,
          (item) => item.cliente,
          'rejeições',
          { rotuloEntidade: 'A pasta da', tom: 'risco' },
        ),
        insightIngestor: insightLider(
          usuarios,
          (item) => item.enviados,
          (item) => item.usuario,
          (valor) => `ingeriu ${valor} documentos, o maior volume da equipe.`,
        ),
        insightPiorMesRejeicao: insightPiorMes(
          porMes,
          (item) => item.naoEntraram,
          (valor) => `${valor.toLocaleString('pt-BR')} documentos`,
          'rejeição',
        ),
      };
    }, [porCausa, porCliente, porMes, usuarios]);

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
          vazio={serieMes.length === 0}
          className={COL_PRINCIPAL}
        >
          <ResponsiveContainer width="100%" height="100%" debounce={100}>
            <BarChart
              accessibilityLayer
              data={serieMes}
              margin={{ top: 4, right: 8, left: 0, bottom: 6 }}
            >
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="label" {...AXIS_STYLE} tickMargin={8} />
              <YAxis {...AXIS_STYLE} padding={{ top: 10 }} tickFormatter={numCurto} width={58} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, n: string) => [num(v), n]} />
              <Bar
                isAnimationActive={false}
                dataKey="enviados"
                name="arquivos enviados"
                fill={TEAL[600]}
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                isAnimationActive={false}
                dataKey="naoEntraram"
                name="rejeitados"
                fill={COR_ERRO}
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                isAnimationActive={false}
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
          vazio={causasAusente.length === 0}
          className={COL_APOIO}
        >
          <ResponsiveContainer width="100%" height="100%" debounce={100}>
            <BarChart
              accessibilityLayer
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
              <Bar
                isAnimationActive={false}
                dataKey="erros"
                fill={COR_ERRO}
                radius={[0, 3, 3, 0]}
                maxBarSize={16}
              >
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
          <>
            <Tabela altura={ALTURA_LISTA} caption="Documentos rejeitados por pasta de cliente">
              <thead>
                <tr>
                  <Th campo="cliente" estado={tabelaClientes} tooltip={TOOLTIP_COLUNA.pastaCliente}>
                    Pasta do cliente
                  </Th>
                  <Th
                    campo="naoEntraram"
                    estado={tabelaClientes}
                    alinhar="right"
                    tooltip={TOOLTIP_COLUNA.rejeitados}
                  >
                    Rejeitados
                  </Th>
                  <Th
                    campo="enviados"
                    estado={tabelaClientes}
                    alinhar="right"
                    tooltip={TOOLTIP_COLUNA.ingeridos}
                  >
                    Arquivos enviados
                  </Th>
                  <Th
                    campo="reenvios"
                    estado={tabelaClientes}
                    alinhar="right"
                    tooltip={TOOLTIP_COLUNA.duplicatas}
                  >
                    Duplicatas
                  </Th>
                </tr>
              </thead>
              <tbody>
                {clientes.visiveis.map((c) => (
                  <Tr key={c.cliente}>
                    <Td className="max-w-[190px] truncate text-foreground">{c.cliente}</Td>
                    <Td alinhar="right">
                      {c.naoEntraram > 0 ? (
                        <CelulaBarra
                          valor={c.naoEntraram}
                          max={maxRejeitado}
                          cor={COR_ERRO}
                          rotulo={num(c.naoEntraram)}
                        />
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </Td>
                    <Td alinhar="right" className="text-muted-foreground">
                      {num(c.enviados)}
                    </Td>
                    <Td
                      alinhar="right"
                      className={c.reenvios ? 'text-muted-foreground' : 'text-muted-foreground'}
                    >
                      {num(c.reenvios)}
                    </Td>
                  </Tr>
                ))}
                {!carregando && clientes.visiveis.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">
                      Nenhuma pasta encontrada para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </Tabela>
            {clientes.temMais && (
              <BotaoExpandir
                expandido={clientes.expandido}
                total={clientes.total}
                limite={20}
                onClick={() => clientes.setExpandido((valor) => !valor)}
              />
            )}
          </>
        </Painel>

        <Painel
          titulo="Arquivos enviados por pessoa"
          resumo={<FraseInsight insight={insightIngestor} />}
          descricao="Clique em uma pessoa para filtrar a página."
          carregando={carregando}
        >
          <>
            <Tabela altura={ALTURA_LISTA} caption="Arquivos enviados por pessoa">
              <thead>
                <tr>
                  <Th campo="usuario" estado={tabela} tooltip={TOOLTIP_COLUNA.pessoa}>
                    Pessoa
                  </Th>
                  <Th
                    campo="enviados"
                    estado={tabela}
                    alinhar="right"
                    tooltip={TOOLTIP_COLUNA.ingeridos}
                  >
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
                {pessoas.visiveis.map((u) => (
                  <Tr key={u.usuario}>
                    <Td>
                      <button
                        type="button"
                        onClick={() =>
                          onSelecionarUsuario(
                            usuarioSelecionado === u.usuario ? undefined : u.usuario,
                          )
                        }
                        className={
                          usuarioSelecionado === u.usuario
                            ? 'font-semibold text-[var(--bd-accent-d)] underline underline-offset-2'
                            : 'font-medium text-foreground hover:text-[var(--bd-accent-d)] hover:underline'
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
                      className={u.naoEntraram ? 'font-medium text-foreground' : 'text-muted-foreground'}
                    >
                      {num(u.naoEntraram)}
                    </Td>
                    <Td
                      alinhar="right"
                      className={u.erroDuplicidade ? 'text-muted-foreground' : 'text-muted-foreground'}
                    >
                      {num(u.erroDuplicidade)}
                    </Td>
                  </Tr>
                ))}
                {!carregando && pessoas.visiveis.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">
                      Nenhuma pessoa encontrada para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </Tabela>
            {pessoas.temMais && (
              <BotaoExpandir
                expandido={pessoas.expandido}
                total={pessoas.total}
                limite={20}
                onClick={() => pessoas.setExpandido((valor) => !valor)}
              />
            )}
          </>
        </Painel>
      </div>
    </div>
  );
};
