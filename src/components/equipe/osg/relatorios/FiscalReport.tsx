import { useMemo } from 'react';
import { Landmark, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import { useAllMatriculas, type MatriculaEnriched } from '@/hooks/useDiagnosticoPatrimonial';
import { useRelatorioDP } from '@/hooks/useRelatorioDP';
import { EstruturaAtual } from './EstruturaAtual';
import { useExploracaoRural, type ExploracaoRuralRow, type OsgTipoExploracao } from '@/hooks/useExploracaoRural';

const TIPO_EXPLORACAO_LABEL: Record<OsgTipoExploracao, string> = {
  arrendamento: 'Arrendamento',
  parceria: 'Parceria',
  composse: 'Composse',
  comodato: 'Comodato',
  condominio: 'Condomínio',
  propria: 'Própria',
};

const fmtDate = (v: string | null): string => {
  if (!v) return '—';
  const [y, m, d] = v.split('-');
  return y && m && d ? `${d}/${m}/${y}` : v;
};

const fmtNum = (v: number | null): string =>
  v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

const exprRow = (r: ExploracaoRuralRow): string[] => [
  TIPO_EXPLORACAO_LABEL[r.tipo_exploracao] ?? '—',
  r.explorador_nome ?? r.explorador?.denominacao ?? '—',
  r.outorgante_nome ?? r.outorgante?.denominacao ?? '—',
  r.bem?.denominacao ?? r.imovel_descricao ?? '—',
  r.matricula_texto ?? '—',
  [r.municipio ?? '', r.uf ?? ''].filter(Boolean).join('/') || '—',
  fmtArea(r.area_total, r.area_unidade),
  fmtArea(r.area_explorada, r.area_unidade),
  r.declarado_irpf ? 'Sim' : 'Não',
  fmtDate(r.data_assinatura),
  fmtDate(r.data_encerramento),
  r.vigencia ?? '—',
  fmtNum(r.sacas_por_hectare),
];

const areaUnit = (u: string | null): string => (u === 'm2' ? 'm²' : 'ha');
const fmtArea = (v: number | null, u: string | null): string =>
  v === null || Number.isNaN(Number(v)) ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${areaUnit(u)}`;
// Só o número da matrícula na tabela; a descrição da matrícula anterior fica no cadastro.
const matTxt = (m: MatriculaEnriched): string => (m.numero ? `Mat. ${m.numero}` : '—');
const munUf = (m: MatriculaEnriched): string => [m.municipio_imovel ?? '', m.uf_imovel ?? ''].filter(Boolean).join('/') || '—';

const th = 'whitespace-nowrap border-b border-osg-200 bg-muted px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wide text-slate-500';
const td = 'border-t border-osg-100 px-3 py-2 align-top text-slate-600';

export function FiscalReport({ clienteId }: { clienteId: string }) {
  const { data: clientes = [] } = useClientesLista();
  const { data: bens = [], isLoading: loadingDP } = useRelatorioDP(clienteId);
  const { data: todasMat = [], isLoading: loadingMat } = useAllMatriculas();
  const { data: exploracoes = [] } = useExploracaoRural(clienteId);
  const clienteNome = clientes.find((c) => c.id === clienteId)?.nome ?? '';

  const matriculas = useMemo(
    () => todasMat.filter((m) => m.bem_cliente_id === clienteId || m.titular_cliente_ids.includes(clienteId)),
    [todasMat, clienteId],
  );

  if (loadingDP || loadingMat) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Carregando abertura de demanda…</p>;
  }

  const HEAD = [
    'Tipo', 'Explorador', 'Outorgante', 'Imóvel', 'Matrícula',
    'Município/UF', 'Área total', 'Área explorada', 'Decl. IRPF',
    'Assinatura', 'Encerramento', 'Vigência', 'Sacas/ha',
  ];
  // Se houver registros estruturados em exploracao_rural, usa-os; senão, fallback para matrículas
  // (mesmas colunas de exploração vazias, comportamento atual).
  const usaExploracoes = exploracoes.length > 0;
  const rows = usaExploracoes
    ? exploracoes.map(exprRow)
    : matriculas.map((m) => [
        m.tipo_exploracao_posse || '—',
        '—',
        '—',
        m.bem_denominacao || m.bem_referencia || (m.numero ? `Matrícula ${m.numero}` : 'Imóvel'),
        matTxt(m),
        munUf(m),
        fmtArea(m.area_documento, m.area_unidade),
        fmtArea(m.area_explorada, m.area_unidade),
        '—', '—', '—', '—', '—',
      ]);

  const totalAreaExplorada = usaExploracoes
    ? exploracoes.reduce((s, r) => s + (Number(r.area_explorada) || 0), 0)
    : matriculas.reduce((s, m) => s + (Number(m.area_explorada) || 0), 0);
  const secaoMeta = usaExploracoes
    ? `${exploracoes.length} registro${exploracoes.length === 1 ? '' : 's'} · ${totalAreaExplorada.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ha`
    : `${matriculas.length} matrículas · ${totalAreaExplorada.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ha`;
  const semLinhas = rows.length === 0;
  const emptyMsg = usaExploracoes
    ? 'Nenhuma exploração rural cadastrada para este cliente.'
    : 'Nenhuma matrícula cadastrada para este cliente.';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-800">
          Abertura de demanda — Planejamento Tributário · <span className="text-osg-700">{clienteNome}</span>
        </h2>
        <span className="text-xs text-slate-500">Pacote OSG → PSA Fiscal · “Imprimir” para exportar em PDF</span>
      </div>

      {/* Hand-off */}
      <div className="flex items-start gap-3 rounded-xl border border-osg-moss/20 bg-osg-moss/[0.06] px-4 py-3 text-[12.5px] leading-relaxed text-slate-600">
        <Send className="mt-0.5 h-4 w-4 shrink-0 text-osg-moss" />
        <span>
          Entrega para a <b className="font-semibold text-osg-700">área Fiscal (Planejamento Tributário)</b>: o contexto societário/patrimonial abaixo.
          Os <b className="font-semibold text-osg-700">documentos do cliente</b> e o que <b className="font-semibold text-osg-700">falta solicitar</b> ficam em <b className="font-semibold text-osg-700">Documentos do Cliente → Checklists de documentos</b>.
        </span>
      </div>

      {/* Estrutura atual (antes) */}
      <EstruturaAtual bens={bens} />

      {/* Imóveis e áreas exploradas */}
      <Secao icon={Landmark} titulo="Imóveis e áreas exploradas" meta={secaoMeta}>
        {semLinhas ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyMsg}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>{HEAD.map((h, i) => <th key={i} className={cn(th, (i === 6 || i === 7 || i === 12) && 'text-right')}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri} className="hover:bg-osg-50/30">
                    {r.map((c, ci) => (
                      <td key={ci} className={cn(td, (ci === 6 || ci === 7 || ci === 12) && 'whitespace-nowrap text-right tabular-nums', ci === 3 && 'font-medium text-slate-800')}>
                        {c || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>
    </div>
  );
}

function Secao({ icon: Icon, titulo, meta, action, children }: { icon: typeof Landmark; titulo: string; meta?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-osg-200 bg-background shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-b border-osg-100 bg-osg-50/60 px-4 py-2.5">
        <Icon className="h-4 w-4 shrink-0 text-osg-600" />
        <h3 className="text-sm font-semibold text-osg-moss">{titulo}</h3>
        <div className="ml-auto flex items-center gap-2">
          {meta && <span className="text-[11px] text-slate-500">{meta}</span>}
          {action}
        </div>
      </header>
      {children}
    </section>
  );
}

export default FiscalReport;
