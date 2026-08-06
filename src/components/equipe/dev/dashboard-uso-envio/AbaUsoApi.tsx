/**
 * Aba "Uso da API" — volume por mes, ferramenta, operacao e usuario.
 * Fonte: GET /api/v1/analytics/uso/api-consumo (hoje: fixture).
 *
 * Conta todo o tráfego, mantém a série em ordem cronológica e identifica
 * separadamente pessoas e contas de automação.
 */
import { useMemo, useState } from 'react';
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
  CelulaBarra,
  FaixaResumo,
  FraseInsight,
  Painel,
  Tabela,
  TagAutomacao,
  Td,
  TextoComTooltip,
  Th,
  ThEstatico,
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
} from './formatadores';
import { TOOLTIP_COLUNA, TOOLTIP_TECNICO } from './tooltips';
import { compararPeriodo, recortarSerie, somar } from '@/lib/analytics-uso/periodo';
import {
  ALTURA_GRAFICO,
  ALTURA_LISTA,
  COL_APOIO,
  COL_PRINCIPAL,
  GRADE_TOPO,
} from './layout';

import { insightConcentracao, insightLider } from '@/lib/analytics-uso/insights';
import { META_TAXA_ERRO_API } from '@/lib/analytics-uso/metricas';
import { mesEstaParcial } from '@/lib/analytics-uso/metricas';


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

  const totaisBrutos = dados?.totais;
  const serieCompleta = dados?.porMes ?? [];
  const recorteAtivo = mesesRecorte > 0;
  const porMes = recortarSerie(dados?.porMes ?? [], mesesRecorte).serie;
  const porFerramenta = useMemo(
    () => (dados?.porFerramenta ?? []).slice().sort((a, b) => b.chamadas - a.chamadas),
    [dados],
  );
  const porTipoOperacao = dados?.porTipoOperacao ?? [];
  const todosUsuarios = useMemo(() => dados?.porUsuario ?? [], [dados]);

  // Ranking e de pessoas: conta de servico nao disputa posicao com gente.
  // O volume dela continua nos totais da faixa de resumo.
  const usuarios = useMemo(
    () =>
      todosUsuarios
        .filter((u) => !u.automacao)
        // taxa derivada aqui: o payload traz absolutos, e so o absoluto escondia
        // quem tem 101 erros em 162 chamadas atras de quem tem 123 em 1.936.
        .map((u) => ({ ...u, taxaErro: u.chamadas > 0 ? u.erros / u.chamadas : 0 })),
    [todosUsuarios],
  );
  const chamadasAutomacao = todosUsuarios
    .filter((u) => u.automacao)
    .reduce((s, u) => s + u.chamadas, 0);
  const usuariosHumanos = todosUsuarios.filter((u) => !u.automacao).length;

  const tabelaFerramentas = useSort(porFerramenta, 'chamadas');
  // Mediana, nao media: com um usuario em 7.259 e a metade da equipe abaixo de
  // 130, a media descreve o outlier, nao a equipe.

  const ordenadas = usuarios.map((u) => u.chamadas).sort((a, b) => a - b);
  const medianaRequisicoes = ordenadas.length ? ordenadas[Math.floor(ordenadas.length / 2)] : 0;
  const mediaRequisicoes = usuarios.length
    ? Math.round(usuarios.reduce((acc, u) => acc + u.chamadas, 0) / usuarios.length)
    : 0;

  const insightConcentracaoPessoa = insightConcentracao(
    usuarios,
    (u) => u.chamadas,
    (u) => u.usuario,
    'requisições',
    { tom: 'alerta', piso: 0.4 },
  );

  const insightFerramenta = insightConcentracao(
    porFerramenta,
    (f) => f.chamadas,
    (f) => f.ferramenta,
    'requisições',
    { piso: 0.3 },
  );
  const insightPico = insightLider(
    porMes,
    (m) => m.chamadas,
    (m) => `${m.mes.slice(5, 7)}/${m.mes.slice(2, 4)}`,
    (v) => `foi o mês de maior volume, com ${v} requisições.`,
  );
  const insightPessoa = insightLider(
    usuarios,
    (u) => u.chamadas,
    (u) => u.usuario,
    (v) => `fez ${v} requisições, o maior uso individual.`,
  );
  // "A que mais falha" so vale destacar com volume; 100% de erro em 25 chamadas
  // e ruido, nao incidente.
  const ferramentaProblema = [...porFerramenta]
    .filter((f) => f.chamadas >= 100)
    .sort((a, b) => b.taxaErro - a.taxaErro)[0];
  const tabela = useSort(usuarios, 'chamadas');
  const maxUsuario = usuarios.reduce((m, u) => Math.max(m, u.chamadas), 0);
  const maxFerramenta = porFerramenta.reduce((m, f) => Math.max(m, f.chamadas), 0);

  const fimPeriodo = dados?.periodo.fim ?? '';
  const t = recorteAtivo
    ? { ...totaisBrutos!, chamadas: somar(porMes, (m) => m.chamadas) }
    : totaisBrutos;
  const mesChamadas = compararPeriodo(serieCompleta, (m) => m.chamadas, mesesRecorte);
  const serieMes = porMes.map((m) => ({
    ...m,
    label: `${mesLabel(m.mes)}${mesEstaParcial(m.mes, fimPeriodo) ? '*' : ''}`,
  }));
  const picoMes = porMes.reduce<(typeof porMes)[number] | null>(
    (acc, m) => (!acc || m.chamadas > acc.chamadas ? m : acc),
    null,
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
            valor: num(usuarios.length),
            variacao: {
              valor: num(chamadasAutomacao),
              rotulo: 'requisições vieram de automação, fora desta conta',
            },
            tooltip: TOOLTIP_TECNICO.usuariosHumanos,
          },
          {
            label: 'Requisições por pessoa',
            valor: num(medianaRequisicoes),
            variacao: {
              valor: num(mediaRequisicoes),
              rotulo: 'é a média, puxada pelo maior usuário',
            },
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
          className={COL_PRINCIPAL}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serieMes} margin={{ top: 6, right: 4, left: 0, bottom: 6 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="label" {...AXIS_STYLE} tickMargin={8} />
              <YAxis {...AXIS_STYLE} padding={{ top: 10 }} tickFormatter={numCurto} width={58} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [num(v), 'chamadas']} />
              <Bar dataKey="chamadas" radius={[3, 3, 0, 0]} maxBarSize={38}>
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
          className={COL_APOIO}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
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
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={tabelaFerramentas.sorted}
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
        <Tabela altura={ALTURA_LISTA}>
          <thead>
            <tr>
              <Th campo="usuario" estado={tabela} tooltip={TOOLTIP_COLUNA.pessoa}>
                Usuário
              </Th>
              <Th campo="chamadas" estado={tabela} alinhar="right" tooltip={TOOLTIP_COLUNA.requisicoes}>
                Requisições
              </Th>
              <Th campo="erros" estado={tabela} alinhar="right" tooltip={TOOLTIP_COLUNA.errosPessoa}>
                Erros
              </Th>
              <Th campo="taxaErro" estado={tabela} alinhar="right" tooltip={TOOLTIP_COLUNA.taxaErroPessoa}>
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
            {tabela.sorted.map((u) => (
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
          </tbody>
        </Tabela>
      </Painel>
    </div>
  );
};
