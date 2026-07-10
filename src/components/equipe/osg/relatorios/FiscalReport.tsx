import { useMemo } from 'react';
import { FileText, HelpCircle, Landmark, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import { useAllMatriculas, type MatriculaEnriched } from '@/hooks/useDiagnosticoPatrimonial';
import { useRelatorioSocietario } from '@/hooks/useRelatorioSocietario';
import { EstruturaControle } from './SocietarioReport';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtMoney = (v: number | null): string => (v === null || Number.isNaN(Number(v)) ? '—' : brl.format(Number(v)));
const fmtArea = (v: number | null, u: string | null): string =>
  v === null || Number.isNaN(Number(v)) ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${u || 'ha'}`;
const matTxt = (m: MatriculaEnriched): string => {
  const n = m.numero ? `Mat. ${m.numero}` : '—';
  return m.matricula_anterior_texto ? `${n} (ant. ${m.matricula_anterior_texto})` : n;
};
const munUf = (m: MatriculaEnriched): string => [m.municipio_imovel ?? '', m.uf_imovel ?? ''].filter(Boolean).join('/') || '—';

const th = 'whitespace-nowrap border-b border-osg-200 bg-slate-50 px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wide text-slate-500';
const td = 'border-t border-osg-100 px-3 py-2 align-top text-slate-600';

// Documentos a solicitar ao cliente — fonte: "Lista de Solicitação_Planejamento Tributário" (9 itens).
const DOCS_FISCAL: { assunto: string; descricao: string }[] = [
  { assunto: 'DIRPF', descricao: 'Declaração de IRPF do ano-calendário mais recente — de todos os envolvidos.' },
  { assunto: 'Livro Caixa (LCDPR)', descricao: 'Livro Caixa Digital do Produtor Rural dos 2 últimos anos-calendário — de todos os envolvidos.' },
  { assunto: 'Contratos de exploração', descricao: 'Contratos de aluguel e de exploração rural vigentes (parceria, condomínio, arrendamento).' },
  { assunto: 'Bens da atividade rural', descricao: 'Relatório (excel) com datas e valores de aquisição e valores de mercado.' },
  { assunto: 'Dívidas da atividade rural', descricao: 'Relatório (excel) com valores a pagar nos próximos anos, por vencimento.' },
  { assunto: 'Investimentos', descricao: 'Projeção de investimentos para os próximos anos (descrição + valores previstos).' },
  { assunto: 'Contrato social', descricao: 'Contratos sociais das PJs já constituídas + CNPJs + regimes tributários adotados.' },
  { assunto: 'DRE', descricao: 'Demonstração do Resultado do Exercício das empresas do grupo.' },
  { assunto: 'Resultado projetado', descricao: 'Projeção do resultado (PF e PJ) por atividade, conforme os modelos de DRE.' },
];

// Questionário de qualificação — instrumento aplicado pela PSA Fiscal (anexo da demanda, não é campo da OSG).
const QUESTIONARIO: { grupo: string; perguntas: string[] }[] = [
  {
    grupo: 'Modelo de exploração atual',
    perguntas: [
      'Quem são as pessoas físicas envolvidas e quais exploram atividade rural?',
      'A exploração é individual, em condomínio rural (vários CPFs) ou em parceria?',
      'Arrendam terras de terceiros, ou arrendam parte das suas terras a terceiros? Se sim, quais imóveis?',
    ],
  },
  {
    grupo: 'Fluxo de comercialização',
    perguntas: [
      'Quais produtos são comercializados?',
      'Qual a % da produção destinada a exportação (ainda que indireta), por produto?',
      'Na pecuária, qual a % da produção destinada a abate?',
      'Como é feita a opção pelo Funrural: sobre a folha de pagamento ou sobre a comercialização?',
    ],
  },
];

export function FiscalReport({ clienteId }: { clienteId: string }) {
  const { data: clientes = [] } = useClientesLista();
  const { data: empresas = [], isLoading: loadingSoc } = useRelatorioSocietario(clienteId);
  const { data: todasMat = [], isLoading: loadingMat } = useAllMatriculas();
  const clienteNome = clientes.find((c) => c.id === clienteId)?.nome ?? '';

  const matriculas = useMemo(
    () => todasMat.filter((m) => m.bem_cliente_id === clienteId || m.titular_cliente_ids.includes(clienteId)),
    [todasMat, clienteId],
  );
  const totalArea = useMemo(() => matriculas.reduce((s, m) => s + (Number(m.area_explorada) || 0), 0), [matriculas]);

  if (loadingSoc || loadingMat) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Carregando abertura de demanda…</p>;
  }

  const HEAD = ['Imóvel', 'Município/UF', 'Matrícula', 'Valor Contábil', 'Área explorada', 'Exploração'];
  const rows = matriculas.map((m) => [
    m.bem_denominacao || m.bem_referencia || (m.numero ? `Matrícula ${m.numero}` : 'Imóvel'),
    munUf(m), matTxt(m), fmtMoney(m.vlr_contabil), fmtArea(m.area_explorada, m.area_unidade), m.tipo_exploracao_posse || '—',
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-800">
          Abertura de demanda — Planejamento Tributário · <span className="text-osg-700">{clienteNome}</span>
        </h2>
        <span className="text-xs text-slate-500">Pacote OSG → PSA Fiscal · “Imprimir” para exportar em PDF</span>
      </div>

      {/* Estrutura societária */}
      <EstruturaControle empresas={empresas} titulo="Estrutura societária do grupo" />

      {/* Imóveis e áreas exploradas */}
      <Secao icon={Landmark} titulo="Imóveis e áreas exploradas" meta={`${matriculas.length} matrículas · ${totalArea.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ha`}>
        {matriculas.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma matrícula cadastrada para este cliente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>{HEAD.map((h, i) => <th key={i} className={cn(th, (i === 3 || i === 4) && 'text-right')}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri} className="hover:bg-osg-50/30">
                    {r.map((c, ci) => (
                      <td key={ci} className={cn(td, (ci === 3 || ci === 4) && 'whitespace-nowrap text-right tabular-nums', ci === 0 && 'font-medium text-slate-800')}>
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

      {/* Documentos a solicitar ao cliente */}
      <Secao icon={ListChecks} titulo="Documentos a solicitar ao cliente" meta={`${DOCS_FISCAL.length} itens`}>
        <ul className="divide-y divide-osg-100">
          {DOCS_FISCAL.map((d, i) => (
            <li key={i} className="flex items-start gap-3 px-4 py-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-osg-100 text-[11px] font-bold tabular-nums text-osg-700">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <span className="text-[13px] font-semibold text-slate-800">{d.assunto}</span>
                <p className="text-xs leading-snug text-slate-500">{d.descricao}</p>
              </div>
              <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                Não solicitado
              </span>
            </li>
          ))}
        </ul>
      </Secao>

      {/* Questionário — anexo aplicado pela Fiscal (não é campo da OSG) */}
      <Secao icon={HelpCircle} titulo="Questionário de qualificação" meta="anexo · aplicado pela PSA Fiscal">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          {QUESTIONARIO.map((g) => (
            <div key={g.grupo}>
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <FileText className="h-3.5 w-3.5 text-slate-400" /> {g.grupo}
              </h4>
              <ol className="list-decimal space-y-1 pl-4 text-[12.5px] leading-snug text-slate-500 marker:text-slate-400">
                {g.perguntas.map((p, i) => <li key={i}>{p}</li>)}
              </ol>
            </div>
          ))}
        </div>
      </Secao>
    </div>
  );
}

function Secao({ icon: Icon, titulo, meta, children }: { icon: typeof Landmark; titulo: string; meta?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-osg-200 bg-background shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-b border-osg-100 bg-osg-50/60 px-4 py-2.5">
        <Icon className="h-4 w-4 shrink-0 text-osg-600" />
        <h3 className="text-sm font-semibold text-osg-800">{titulo}</h3>
        {meta && <span className="ml-auto text-[11px] text-slate-500">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

export default FiscalReport;
