import { useMemo, useState } from 'react';
import { MapPin, Users, AlertTriangle, X } from 'lucide-react';
import {
  MAPA_BRASIL_CREDITO,
  MAPA_BRASIL_UF_CENTROIDES,
  MAPA_BRASIL_UF_PATHS,
  MAPA_BRASIL_VIEWBOX,
} from '@/lib/mapaBrasilUf';
import {
  agregarClientesPorRegiao,
  escalaDaAgregacao,
  municipiosDaUf,
  pintarEstados,
  rotuloFaixa,
  SEM_UF,
  type ClienteRegiao,
} from '@/lib/clientesPorRegiao';
import { useOsVolumePorCliente } from '@/hooks/useOsVolumePorCliente';
import { formatCurrencyDisplay } from '@/components/equipe/client-form/constants';

/**
 * Mapa de calor (choropleth) dos clientes por estado, para o módulo Gerencial.
 *
 * Um modo só: QUANTIDADE de clientes. A coloração por faturamento fica para
 * quando a cobertura de OS estiver completa — hoje pintaria região "fria" por
 * falta de cadastro, não por falta de dinheiro. A agregação já aceita um peso
 * parametrizável, então essa troca não exige reescrever mapa nem agregação.
 *
 * A legenda separa TRÊS coisas que costumam ser confundidas:
 * - faixas de cor  → valor real de clientes no estado;
 * - hachura cinza  → estado com ZERO clientes (fato conhecido);
 * - chip "sem UF"  → clientes que existem mas sem localização cadastrada
 *                    (desconhecido). Não são pintáveis, então aparecem fora do
 *                    mapa, contados e clicáveis.
 */

/**
 * Rampa sequencial por opacidade sobre o ACENTO do Board (o teal
 * institucional, `--bd-accent`). Era o índigo #5B6EF0 em RGB cravado.
 * Continua em `hsl(... / alpha)` e não em token de tema porque o SVG precisa
 * dos cinco passos ao mesmo tempo, e não existe token por passo.
 * O rótulo da UF vira branco a partir do quarto passo (ver `fill`, abaixo),
 * que é onde o fundo escurece o suficiente para o texto escuro falhar.
 */
const RAMPA_ALPHAS = [0.18, 0.34, 0.52, 0.72, 0.95];
const corDaFaixa = (indice: number) =>
  `hsl(175 82% 29% / ${RAMPA_ALPHAS[Math.min(indice, RAMPA_ALPHAS.length - 1)]})`;

const PATTERN_ZERO = 'board-mapa-sem-cliente';

/**
 * Ajuste fino do rótulo de UFs apertadas. O DF é um enclave dentro de GO e o
 * centroide dos dois cai quase no mesmo ponto — sem o deslocamento as duas
 * siglas se sobrepõem. Só desloca o TEXTO; a geometria não muda.
 */
const AJUSTE_ROTULO: Record<string, { dx: number; dy: number }> = {
  DF: { dx: 30, dy: -16 },
};

interface BoardMapaClientesProps {
  clientes: readonly ClienteRegiao[];
  /** Quando true, o total exibido é de fato a empresa toda (RLS libera tudo). */
  escopoTotal?: boolean;
}

/** Quantas linhas o ranking "Top clientes" mostra antes de rolar. */
const TOP_CLIENTES_QTD = 8;

export const BoardMapaClientes = ({ clientes, escopoTotal }: BoardMapaClientesProps) => {
  const [ufSelecionada, setUfSelecionada] = useState<string | null>(null);
  const [hover, setHover] = useState<{ uf: string; x: number; y: number } | null>(null);
  const { data: volumePorCliente } = useOsVolumePorCliente();

  const agregacao = useMemo(() => agregarClientesPorRegiao(clientes), [clientes]);
  const escala = useMemo(() => escalaDaAgregacao(agregacao), [agregacao]);
  const pintura = useMemo(() => pintarEstados(agregacao, escala), [agregacao, escala]);

  // Top clientes por VALOR total de OS (reunião 17/08, P8) -- ocupa o painel
  // de municípios quando nenhum estado está selecionado, no lugar do "clique
  // num estado" vazio.
  const topClientes = useMemo(() => {
    if (!volumePorCliente) return [];
    return clientes
      .map((c) => ({ id: c.id, nome: c.nome || '—', ...(volumePorCliente.get(c.id) ?? { projetos: 0, valor: 0 }) }))
      .filter((c) => c.projetos > 0 || c.valor > 0)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, TOP_CLIENTES_QTD);
  }, [clientes, volumePorCliente]);

  const municipios = ufSelecionada ? municipiosDaUf(agregacao, ufSelecionada) : [];
  const selecionado =
    ufSelecionada === SEM_UF
      ? agregacao.semUf
      : ufSelecionada
        ? agregacao.porUf[ufSelecionada]
        : null;

  const estadosComCliente = agregacao.ufsComDado.length;
  const semUfClientes = agregacao.semUf.clientes;
  const hoverInfo = hover ? pintura[hover.uf] : null;

  const alternarUf = (uf: string) => setUfSelecionada((atual) => (atual === uf ? null : uf));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* ── Mapa ── */}
      <div className="board-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              className="text-[15px] font-bold tracking-[-0.01em]"
              style={{ fontFamily: "'Instrument Sans', sans-serif", letterSpacing: '-.02em', color: 'var(--board-t1)' }}
            >
              Onde estão os clientes
            </h2>
            <p className="mt-0.5 text-[12px]" style={{ color: 'var(--board-t3)' }}>
              {agregacao.totalClientes} cliente{agregacao.totalClientes === 1 ? '' : 's'} visíve
              {agregacao.totalClientes === 1 ? 'l' : 'is'} no seu acesso · {agregacao.totalAtivos}{' '}
              ativo{agregacao.totalAtivos === 1 ? '' : 's'} · {estadosComCliente} estado
              {estadosComCliente === 1 ? '' : 's'}
            </p>
            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--board-t4)' }}>
              {escopoTotal
                ? 'Seu perfil enxerga todos os clusters — este total é a empresa toda.'
                : 'O total respeita seu acesso por cluster: pode não incluir clientes de outras áreas.'}
            </p>
          </div>

          {semUfClientes > 0 && (
            <button
              type="button"
              onClick={() => alternarUf(SEM_UF)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
              style={{
                background: ufSelecionada === SEM_UF ? 'var(--board-amber-s)' : 'var(--board-bg)',
                border: `1px solid ${ufSelecionada === SEM_UF ? 'var(--board-amber)' : 'var(--board-border)'}`,
              }}
              aria-label={`${semUfClientes} clientes sem UF informada — ver municípios`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: 'var(--board-amber)' }} />
              <span>
                <span
                  className="block text-[15px] font-bold leading-none"
                  style={{ color: 'var(--board-t1)' }}
                >
                  {semUfClientes}
                </span>
                <span className="block text-[10.5px]" style={{ color: 'var(--board-t3)' }}>
                  sem UF informada
                </span>
              </span>
            </button>
          )}
        </div>

        <div
          className="relative mt-3"
          onMouseLeave={() => setHover(null)}
          onPointerLeave={() => setHover(null)}
        >
          <svg
            viewBox={MAPA_BRASIL_VIEWBOX}
            className="mx-auto block h-auto w-full max-w-[560px]"
            role="group"
            aria-label="Mapa do Brasil por estado com a quantidade de clientes"
          >
            <defs>
              {/* Hachura = "zero clientes". Um canal visual diferente da rampa
                  de cor, para não depender só de tonalidade. */}
              <pattern
                id={PATTERN_ZERO}
                width="7"
                height="7"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="7" height="7" fill="var(--board-border-s)" />
                <line x1="0" y1="0" x2="0" y2="7" stroke="var(--board-border)" strokeWidth="2.5" />
              </pattern>
            </defs>

            {Object.entries(MAPA_BRASIL_UF_PATHS).map(([uf, d]) => {
              const estado = pintura[uf];
              const selecionadoUf = ufSelecionada === uf;
              const rotulo = `${estado.nome} (${uf}): ${estado.clientes} cliente${
                estado.clientes === 1 ? '' : 's'
              }`;

              return (
                <path
                  key={uf}
                  d={d}
                  tabIndex={0}
                  role="button"
                  aria-label={rotulo}
                  aria-pressed={selecionadoUf}
                  className="cursor-pointer outline-none transition-[stroke,stroke-width]"
                  style={{
                    fill:
                      estado.categoria === 'zero'
                        ? `url(#${PATTERN_ZERO})`
                        : corDaFaixa(estado.indiceFaixa ?? 0),
                    stroke: selecionadoUf ? 'var(--board-t1)' : 'var(--board-card)',
                    strokeWidth: selecionadoUf ? 4 : 1.6,
                    strokeLinejoin: 'round',
                  }}
                  onClick={() => alternarUf(uf)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      alternarUf(uf);
                    }
                  }}
                  onFocus={() =>
                    setHover({
                      uf,
                      x: MAPA_BRASIL_UF_CENTROIDES[uf].x,
                      y: MAPA_BRASIL_UF_CENTROIDES[uf].y,
                    })
                  }
                  onBlur={() => setHover(null)}
                  onMouseMove={(e) => {
                    const box = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                    if (!box) return;
                    setHover({ uf, x: e.clientX - box.left, y: e.clientY - box.top });
                  }}
                >
                  {/* Tooltip nativo — garante o número mesmo sem JS de hover. */}
                  <title>{rotulo}</title>
                </path>
              );
            })}

            {/* Sigla dentro do estado: a informação não fica só na cor. */}
            {Object.entries(MAPA_BRASIL_UF_CENTROIDES).map(([uf, pos]) => (
              <text
                key={uf}
                x={pos.x + (AJUSTE_ROTULO[uf]?.dx ?? 0)}
                y={pos.y + (AJUSTE_ROTULO[uf]?.dy ?? 0)}
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none select-none"
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  fill: (pintura[uf].indiceFaixa ?? -1) >= 3 ? '#FFFFFF' : 'var(--board-t2)',
                  opacity: pintura[uf].categoria === 'zero' ? 0.45 : 1,
                }}
              >
                {uf}
              </text>
            ))}
          </svg>

          {hover && hoverInfo && (
            <div
              className="pointer-events-none absolute z-10 rounded-lg px-2.5 py-1.5 text-[11.5px] shadow-lg"
              style={{
                left: Math.max(0, hover.x + 12),
                top: Math.max(0, hover.y - 8),
                background: 'var(--board-card)',
                border: '1px solid var(--board-border)',
                color: 'var(--board-t1)',
              }}
            >
              <span className="font-semibold">
                {hoverInfo.uf} · {hoverInfo.nome}
              </span>
              <span className="block" style={{ color: 'var(--board-t2)' }}>
                {hoverInfo.clientes} cliente{hoverInfo.clientes === 1 ? '' : 's'}
                {hoverInfo.clientes > 0 && ` · ${hoverInfo.ativos} ativo${hoverInfo.ativos === 1 ? '' : 's'}`}
              </span>
            </div>
          )}
        </div>

        {/* ── Legenda ── */}
        <div
          className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3"
          style={{ borderColor: 'var(--board-border-s)' }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.1em]"
            style={{ color: 'var(--board-t4)' }}
          >
            Clientes por estado
          </span>

          {escala.faixas.length === 0 ? (
            <span className="text-[11.5px]" style={{ color: 'var(--board-t3)' }}>
              Nenhum cliente com UF informada — nada para colorir.
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {escala.faixas.map((faixa) => (
                <span key={faixa.indice} className="flex items-center gap-1.5">
                  <span
                    className="h-3 w-5 rounded-sm"
                    style={{
                      background: corDaFaixa(faixa.indice),
                      border: '1px solid var(--board-border)',
                    }}
                  />
                  <span className="text-[11.5px]" style={{ color: 'var(--board-t2)' }}>
                    {rotuloFaixa(faixa)}
                  </span>
                </span>
              ))}
            </div>
          )}

          <span className="flex items-center gap-1.5">
            {/* Hachura em CSS: um `url(#pattern)` de outro <svg> no mesmo
                documento resolve, mas é frágil — aqui não vale o risco. */}
            <span
              className="h-3 w-5 rounded-sm"
              aria-hidden="true"
              style={{
                border: '1px solid var(--board-border)',
                background:
                  'repeating-linear-gradient(45deg, var(--board-border-s) 0 2px, var(--board-border) 2px 4px)',
              }}
            />
            <span className="text-[11.5px]" style={{ color: 'var(--board-t2)' }}>
              Zero clientes
            </span>
          </span>

          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" style={{ color: 'var(--board-amber)' }} />
            <span className="text-[11.5px]" style={{ color: 'var(--board-t2)' }}>
              Sem dado de localização: {semUfClientes} cliente{semUfClientes === 1 ? '' : 's'}
              {semUfClientes > 0 ? ' (fora do mapa)' : ''}
            </span>
          </span>

          <span className="ml-auto text-[10px]" style={{ color: 'var(--board-t4)' }}>
            {MAPA_BRASIL_CREDITO}
          </span>
        </div>
      </div>

      {/* ── Painel de municípios ── */}
      <div className="board-card flex flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3
              className="flex items-center gap-1.5 text-[13px] font-bold"
              style={{ fontFamily: "'Instrument Sans', sans-serif", letterSpacing: '-.02em', color: 'var(--board-t1)' }}
            >
              <MapPin className="h-3.5 w-3.5" style={{ color: 'var(--board-indigo)' }} />
              {selecionado ? selecionado.nome : 'Top clientes'}
            </h3>
            {selecionado ? (
              <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--board-t3)' }}>
                {selecionado.clientes} cliente{selecionado.clientes === 1 ? '' : 's'} ·{' '}
                {selecionado.ativos} ativo{selecionado.ativos === 1 ? '' : 's'} ·{' '}
                {municipios.length} município{municipios.length === 1 ? '' : 's'}
              </p>
            ) : topClientes.length > 0 && (
              <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--board-t3)' }}>
                por valor de OS · clique num estado para ver municípios
              </p>
            )}
          </div>
          {ufSelecionada && (
            <button
              type="button"
              onClick={() => setUfSelecionada(null)}
              aria-label="Limpar estado selecionado"
              className="rounded-md p-1 transition-colors"
              style={{ color: 'var(--board-t3)' }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {!ufSelecionada ? (
          topClientes.length === 0 ? (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center"
              style={{ color: 'var(--board-t3)' }}
            >
              <Users className="h-5 w-5" style={{ color: 'var(--board-t4)' }} />
              <span className="text-[12px]">
                Nenhuma OS cadastrada para ranquear clientes ainda.
              </span>
            </div>
          ) : (
            <ul className="mt-3 space-y-px">
              {topClientes.map((c, i) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5"
                  style={{ background: i % 2 === 0 ? 'var(--board-border-s)' : 'transparent' }}
                >
                  <span
                    className="w-4 shrink-0 text-[11px] font-semibold tabular-nums"
                    style={{ color: 'var(--board-t4)' }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate text-[12.5px]"
                    style={{ color: 'var(--board-t1)' }}
                    title={c.nome}
                  >
                    {c.nome}
                  </span>
                  <span
                    className="shrink-0 text-[11px] tabular-nums"
                    style={{ color: 'var(--board-t3)' }}
                    title={`${c.projetos} OS`}
                  >
                    {c.projetos} OS
                  </span>
                  <span
                    className="shrink-0 text-[12px] font-semibold tabular-nums"
                    style={{ color: 'var(--board-t1)', minWidth: 64, textAlign: 'right' }}
                  >
                    {formatCurrencyDisplay(c.valor)}
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : municipios.length === 0 ? (
          <div className="py-8 text-center text-[12px]" style={{ color: 'var(--board-t3)' }}>
            Nenhum cliente cadastrado nesse recorte.
          </div>
        ) : (
          <ul className="mt-3 max-h-[420px] space-y-px overflow-y-auto">
            {municipios.map((m) => (
              <li
                key={m.rotulo}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
                style={{ background: 'var(--board-border-s)' }}
              >
                <span
                  className="truncate text-[12.5px]"
                  style={{
                    color: m.municipio ? 'var(--board-t2)' : 'var(--board-t4)',
                    fontStyle: m.municipio ? undefined : 'italic',
                  }}
                >
                  {m.rotulo}
                </span>
                <span
                  className="shrink-0 text-[12px] font-semibold tabular-nums"
                  style={{ color: 'var(--board-t1)' }}
                >
                  {m.clientes}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default BoardMapaClientes;
