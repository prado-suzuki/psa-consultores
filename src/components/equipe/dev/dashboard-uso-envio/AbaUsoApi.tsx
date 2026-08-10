/**
 * Aba "Uso da API" — volume por mes, ferramenta, operacao e usuario.
 * Fonte: GET /api/v1/analytics/uso/api-consumo (hoje: fixture).
 *
 * Conta todo o tráfego, mantém a série em ordem cronológica e identifica
 * separadamente pessoas e contas de automação.
 */
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsUsoApiResponse } from '@/lib/analytics-uso/types';
import {
  BotaoExpandir,
  CelulaBarra,
  FaixaResumo,
  FraseInsight,
  Painel,
  Tabela,
  TagAutomacao,
  Td,
  Th,
  Tr,
} from './primitivos';
import {
  AXIS_STYLE,
  GRAY,
  GRID_STYLE,
  LIME,
  RISCO,
  TEAL,
  TOOLTIP_STYLE,
  mesLabel,
  ms,
  num,
  numCurto,
  pct,
  useSort,
  useTopN,
} from './formatadores';
import { TOOLTIP_COLUNA, TOOLTIP_TECNICO } from './tooltips';
import { ALTURA_GRAFICO, ALTURA_LISTA, COL_APOIO, COL_PRINCIPAL, GRADE_TOPO } from './layout';

import { insightConcentracao, insightLider } from '@/lib/analytics-uso/insights';
import { mesEstaParcial } from '@/lib/analytics-uso/metricas';
import { prepararUsoApiViewModel } from '@/lib/analytics-uso/viewModels';

interface Props {
  dados?: AnalyticsUsoApiResponse;
  carregando: boolean;
  /** 0 = todo o período. Recorta a série mensal no cliente (modo fixture). */
  mesesRecorte?: number;
  usuarioSelecionado?: string;
  onSelecionarUsuario: (usuario?: string) => void;
}

export const AbaUsoApi = ({
  dados,
  carregando,
  mesesRecorte = 0,
  usuarioSelecionado,
  onSelecionarUsuario,
}: Props) => {
  const viewModel = useMemo(
    () => prepararUsoApiViewModel(dados, mesesRecorte),
    [dados, mesesRecorte],
  );
  const {
    totais: t,
    porMes,
    porFerramenta,
    porTipoOperacao,
    usuarios,
    chamadasAutomacao,
    medianaRequisicoes,
    mediaRequisicoes,
    comparacaoChamadas: mesChamadas,
    picoMes,
    maxUsuario,
  } = viewModel;

  const tabelaFerramentas = useSort(porFerramenta, 'chamadas');
  const ferramentasGrafico = useMemo(
    () => tabelaFerramentas.sorted.slice(0, 8),
    [tabelaFerramentas.sorted],
  );

  const { insightConcentracaoPessoa, insightFerramenta, insightPico, insightPessoa } = useMemo(
    () => ({
      insightConcentracaoPessoa: insightConcentracao(
        usuarios,
        (item) => item.chamadas,
        (item) => item.usuario,
        'requisições',
        { tom: 'alerta', piso: 0.4 },
      ),
      insightFerramenta: insightConcentracao(
        porFerramenta,
        (item) => item.chamadas,
        (item) => item.ferramenta,
        'requisições',
        { piso: 0.3 },
      ),
      insightPico: insightLider(
        porMes,
        (item) => item.chamadas,
        (item) => `${item.mes.slice(5, 7)}/${item.mes.slice(2, 4)}`,
        (valor) => `foi o mês de maior volume, com ${valor} requisições.`,
      ),
      insightPessoa: insightLider(
        usuarios,
        (item) => item.chamadas,
        (item) => item.usuario,
        (valor) => `fez ${valor} requisições, o maior uso individual.`,
      ),
    }),
    [porFerramenta, porMes, usuarios],
  );
  // "A que mais falha" so vale destacar com volume; 100% de erro em 25 chamadas
  // e ruido, nao incidente.
  const tabela = useSort(usuarios, 'chamadas');
  const pessoas = useTopN(tabela.sorted, 20);

  const fimPeriodo = dados?.periodo.fim ?? '';
  const serieMes = useMemo(
    () =>
      porMes.map((item) => ({
        ...item,
        label: `${mesLabel(item.mes)}${mesEstaParcial(item.mes, fimPeriodo) ? '*' : ''}`,
      })),
    [fimPeriodo, porMes],
  );

  return (
    <div className="space-y-3">
      <FaixaResumo
        colunas={3}
        carregando={carregando}
        itens={[
          {
            label: 'Requisições no período',
            valor: num(t?.chamadas),
            variacao:
              mesChamadas.anterior != null
                ? {
                    pct: mesChamadas.pct ?? undefined,
                    valor: num(mesChamadas.anterior),
                    rotulo: `período anterior · ${mesChamadas.rotulo}`,
                    melhorQuando: 'sobe',
                  }
                : undefined,
            tooltip: TOOLTIP_TECNICO.chamadas,
          },
          {
            label: 'Usuários ativos',
            valor: dados ? num(usuarios.length) : '—',
            variacao: dados
              ? {
                  valor: num(chamadasAutomacao),
                  rotulo: 'requisições vieram de automação, fora desta conta',
                }
              : undefined,
            tooltip: TOOLTIP_TECNICO.usuariosHumanos,
          },
          {
            label: 'Requisições por pessoa',
            valor: dados ? num(medianaRequisicoes) : '—',
            variacao: dados
              ? {
                  valor: num(mediaRequisicoes),
                  rotulo: 'é a média, puxada pelo maior usuário',
                }
              : undefined,
            tooltip: TOOLTIP_TECNICO.requisicoesPorUsuario,
          },
        ]}
      />

      <div className={GRADE_TOPO}>
        <Painel
          titulo="Requisições por mês"
          resumo={<FraseInsight insight={insightPico} />}
          descricao="* mês parcial."
          altura={ALTURA_GRAFICO}
          carregando={carregando}
          vazio={serieMes.length === 0}
          className={COL_PRINCIPAL}
        >
          <ResponsiveContainer width="100%" height="100%" debounce={100}>
            <BarChart
              accessibilityLayer
              data={serieMes}
              margin={{ top: 6, right: 4, left: 0, bottom: 6 }}
            >
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="label" {...AXIS_STYLE} tickMargin={8} />
              <YAxis {...AXIS_STYLE} padding={{ top: 10 }} tickFormatter={numCurto} width={58} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [num(v), 'chamadas']} />
              <Bar
                isAnimationActive={false}
                dataKey="chamadas"
                radius={[3, 3, 0, 0]}
                maxBarSize={38}
              >
                {serieMes.map((m) => (
                  <Cell key={m.mes} fill={m.mes === picoMes?.mes ? LIME[500] : TEAL[600]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Painel>

        <Painel
          titulo="Requisições por tipo de operação"
          altura={ALTURA_GRAFICO}
          carregando={carregando}
          vazio={porTipoOperacao.length === 0}
          className={COL_APOIO}
        >
          <ResponsiveContainer width="100%" height="100%" debounce={100}>
            <BarChart
              accessibilityLayer
              data={porTipoOperacao}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 6 }}
            >
              <CartesianGrid {...GRID_STYLE} horizontal={false} vertical />
              <XAxis type="number" {...AXIS_STYLE} tickFormatter={numCurto} />
              <YAxis
                type="category"
                dataKey="tipoOperacao"
                width={128}
                {...AXIS_STYLE}
                tick={{ ...AXIS_STYLE.tick, fontSize: 10 }}
              />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [num(v), 'chamadas']} />
              <Bar
                isAnimationActive={false}
                dataKey="chamadas"
                name="requisições"
                fill={TEAL[600]}
                radius={[0, 3, 3, 0]}
                maxBarSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </Painel>
      </div>

      <Painel
        titulo="Requisições por ferramenta"
        resumo={<FraseInsight insight={insightFerramenta} />}
        descricao="Passe o mouse na barra para o detalhe."
        tooltip={TOOLTIP_TECNICO.ferramentas}
        altura={ALTURA_LISTA}
        carregando={carregando}
        vazio={porFerramenta.length === 0}
      >
        <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <BarChart
            accessibilityLayer
            data={ferramentasGrafico}
            layout="vertical"
            margin={{ top: 4, right: 52, left: 4, bottom: 6 }}
          >
            <CartesianGrid {...GRID_STYLE} horizontal={false} vertical />
            <XAxis type="number" {...AXIS_STYLE} tickFormatter={numCurto} />
            <YAxis
              type="category"
              dataKey="ferramenta"
              width={186}
              {...AXIS_STYLE}
              tick={{ ...AXIS_STYLE.tick, fontSize: 11 }}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(v: number, _n, item) => [
                `${num(v)} requisições · ${num(item?.payload?.usuarios)} pessoas · p95 ${ms(item?.payload?.latP95Ms)}`,
                '',
              ]}
            />
            <Bar
              isAnimationActive={false}
              dataKey="chamadas"
              name="requisições"
              fill={TEAL[600]}
              radius={[0, 3, 3, 0]}
              maxBarSize={14}
            >
              <LabelList
                dataKey="chamadas"
                position="right"
                formatter={(v: number) => num(v)}
                style={{ fontSize: 11, fill: GRAY[600], fontFamily: "'Work Sans', sans-serif" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Painel>

      <Painel
        titulo="Requisições por pessoa"
        resumo={<FraseInsight insight={insightConcentracaoPessoa ?? insightPessoa} />}
        descricao="Clique em uma pessoa para filtrar toda a página."
        carregando={carregando}
      >
        <>
          <Tabela altura={ALTURA_LISTA} caption="Requisições por pessoa">
            <thead>
              <tr>
                <Th campo="usuario" estado={tabela} tooltip={TOOLTIP_COLUNA.pessoa}>
                  Usuário
                </Th>
                <Th
                  campo="chamadas"
                  estado={tabela}
                  alinhar="right"
                  tooltip={TOOLTIP_COLUNA.requisicoes}
                >
                  Requisições
                </Th>
                <Th
                  campo="erros"
                  estado={tabela}
                  alinhar="right"
                  tooltip={TOOLTIP_COLUNA.errosPessoa}
                >
                  Erros
                </Th>
                <Th
                  campo="taxaErro"
                  estado={tabela}
                  alinhar="right"
                  tooltip={TOOLTIP_COLUNA.taxaErroPessoa}
                >
                  Taxa de erro
                </Th>
                <Th
                  campo="diasAtivos"
                  estado={tabela}
                  alinhar="right"
                  tooltip={TOOLTIP_COLUNA.diasAtivos}
                >
                  Dias ativos
                </Th>
                <Th
                  campo="ferramentasUsadas"
                  estado={tabela}
                  alinhar="right"
                  tooltip={TOOLTIP_COLUNA.ferramentasDistintas}
                >
                  Ferramentas
                </Th>
              </tr>
            </thead>
            <tbody>
              {pessoas.visiveis.map((u) => (
                <Tr
                  key={u.usuario}
                  onClick={
                    u.automacao
                      ? undefined
                      : () =>
                          onSelecionarUsuario(
                            usuarioSelecionado === u.usuario ? undefined : u.usuario,
                          )
                  }
                  selecionado={usuarioSelecionado === u.usuario}
                  rotuloInteracao={
                    u.automacao ? undefined : `Filtrar todo o dashboard por ${u.usuario}`
                  }
                >
                  <Td className="text-slate-800">
                    <span className="font-medium">{u.usuario}</span>
                    {u.automacao && <TagAutomacao />}
                  </Td>
                  <Td alinhar="right">
                    <CelulaBarra valor={u.chamadas} max={maxUsuario} rotulo={num(u.chamadas)} />
                  </Td>
                  <Td alinhar="right" className={u.erros > 0 ? 'text-slate-800' : 'text-slate-300'}>
                    {num(u.erros)}
                  </Td>
                  <Td alinhar="right">
                    {u.taxaErro >= 0.2 ? (
                      <span
                        className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                        style={{ background: '#FFF1F2', color: RISCO }}
                      >
                        {pct(u.taxaErro, 0)}
                      </span>
                    ) : (
                      <span className={u.taxaErro > 0 ? 'text-slate-600' : 'text-slate-300'}>
                        {pct(u.taxaErro, 0)}
                      </span>
                    )}
                  </Td>
                  <Td alinhar="right" className="text-slate-600">
                    {num(u.diasAtivos)}
                  </Td>
                  <Td alinhar="right" className="text-slate-600">
                    {num(u.ferramentasUsadas)}
                  </Td>
                </Tr>
              ))}
              {!carregando && pessoas.visiveis.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
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
  );
};
