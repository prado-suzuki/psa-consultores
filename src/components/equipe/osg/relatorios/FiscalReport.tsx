import { useMemo } from 'react';
import { Archive, Download, FileText, HelpCircle, Landmark, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import { useAllMatriculas, type MatriculaEnriched } from '@/hooks/useDiagnosticoPatrimonial';
import { useRelatorioDP } from '@/hooks/useRelatorioDP';
import { useDocumentosByCliente, useBaixarDocumento, type DocCategoria, type DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';
import { EstruturaAtual } from './EstruturaAtual';

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

const CAT_LABEL: Record<DocCategoria, string> = {
  declaracao_ir: 'Declaração de IR (DIRPF)',
  cadastros_fiscais: 'Cadastros fiscais',
  bens_direitos: 'Bens e direitos',
  agrarios: 'Agrários (contratos / matrículas)',
  societarios: 'Societários',
  sucessorios: 'Sucessórios',
  pessoais: 'Pessoais',
  georreferenciamento: 'Georreferenciamento',
  outros: 'Outros',
};

// Documentos a solicitar (Lista de Solicitação_Planejamento Tributário). cat/kw estimam se já
// foi recebido (por categoria ou nome do arquivo); a OSG confirma.
type ReqDoc = { assunto: string; descricao: string; cat: DocCategoria | null; kw: string[]; modelo?: boolean };
const DOCS_FISCAL: ReqDoc[] = [
  { assunto: 'DIRPF', descricao: 'Declaração de IRPF do ano-calendário mais recente — de todos os envolvidos.', cat: 'declaracao_ir', kw: ['irpf', 'dirpf', 'declara'] },
  { assunto: 'Livro Caixa (LCDPR)', descricao: 'Livro Caixa Digital do Produtor Rural dos 2 últimos anos-calendário.', cat: 'cadastros_fiscais', kw: ['lcdpr', 'livro caixa', 'coletanac'] },
  { assunto: 'Contratos de exploração', descricao: 'Aluguel e exploração rural vigentes (parceria, condomínio, arrendamento).', cat: 'agrarios', kw: ['contrato', 'parceria', 'arrenda', 'cess'] },
  { assunto: 'Bens da atividade rural', descricao: 'Relatório com datas/valores de aquisição e valores de mercado.', cat: 'bens_direitos', kw: ['bens', 'ativo', 'máquina', 'equipamento'] },
  { assunto: 'Dívidas da atividade rural', descricao: 'Relatório com valores a pagar nos próximos anos, por vencimento.', cat: null, kw: ['dívida', 'divida', 'emprést', 'emprest', 'financ'] },
  { assunto: 'Investimentos', descricao: 'Projeção de investimentos para os próximos anos.', cat: null, kw: ['investi'] },
  { assunto: 'Contrato social', descricao: 'Contratos sociais das PJs + CNPJs + regimes tributários.', cat: 'societarios', kw: ['contrato social', 'estatuto', 'altera'] },
  { assunto: 'DRE', descricao: 'Demonstração do Resultado do Exercício das empresas do grupo.', cat: null, kw: ['dre', 'balanç', 'balanc', 'demonstra'] },
  { assunto: 'Resultado projetado', descricao: 'Projeção do resultado (PF e PJ) por atividade — conforme modelo de DRE.', cat: null, kw: [], modelo: true },
];

const QUESTIONARIO: { grupo: string; perguntas: string[] }[] = [
  { grupo: 'Modelo de exploração atual', perguntas: [
    'Quem são as pessoas físicas envolvidas e quais exploram atividade rural?',
    'A exploração é individual, em condomínio rural (vários CPFs) ou em parceria?',
    'Arrendam terras de terceiros, ou arrendam parte das suas terras a terceiros? Se sim, quais imóveis?',
  ] },
  { grupo: 'Fluxo de comercialização', perguntas: [
    'Quais produtos são comercializados?',
    'Qual a % da produção destinada a exportação (ainda que indireta), por produto?',
    'Na pecuária, qual a % da produção destinada a abate?',
    'Como é feita a opção pelo Funrural: sobre a folha de pagamento ou sobre a comercialização?',
  ] },
];

const matchDocs = (req: ReqDoc, docs: DocumentoArquivoRow[]): DocumentoArquivoRow[] =>
  docs.filter((d) => {
    const nome = (d.nome_original ?? '').toLowerCase();
    if (req.kw.some((k) => nome.includes(k))) return true;
    return !!req.cat && d.categoria === req.cat;
  });

export function FiscalReport({ clienteId }: { clienteId: string }) {
  const { data: clientes = [] } = useClientesLista();
  const { data: bens = [], isLoading: loadingDP } = useRelatorioDP(clienteId);
  const { data: todasMat = [], isLoading: loadingMat } = useAllMatriculas();
  const { data: docs = [] } = useDocumentosByCliente(clienteId);
  const baixar = useBaixarDocumento();
  const clienteNome = clientes.find((c) => c.id === clienteId)?.nome ?? '';

  const matriculas = useMemo(
    () => todasMat.filter((m) => m.bem_cliente_id === clienteId || m.titular_cliente_ids.includes(clienteId)),
    [todasMat, clienteId],
  );
  const totalArea = useMemo(() => matriculas.reduce((s, m) => s + (Number(m.area_explorada) || 0), 0), [matriculas]);

  if (loadingDP || loadingMat) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Carregando abertura de demanda…</p>;
  }

  const HEAD = ['Imóvel', 'Município/UF', 'Matrícula', 'Valor Contábil', 'Área explorada', 'Exploração'];
  const rows = matriculas.map((m) => [
    m.bem_denominacao || m.bem_referencia || (m.numero ? `Matrícula ${m.numero}` : 'Imóvel'),
    munUf(m), matTxt(m), fmtMoney(m.vlr_contabil), fmtArea(m.area_explorada, m.area_unidade), m.tipo_exploracao_posse || '—',
  ]);

  const faltantes = DOCS_FISCAL.filter((d) => !d.modelo && matchDocs(d, docs).length === 0).length;
  const matchedIds = new Set(DOCS_FISCAL.flatMap((d) => matchDocs(d, docs).map((f) => f.id)));
  const orfaos = docs.filter((d) => !matchedIds.has(d.id));
  const baixarTodos = () => docs.filter((d) => d.gcs_uri).forEach((d, i) => window.setTimeout(() => baixar.mutate(d), i * 500));

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
          Entrega para a <b className="font-semibold text-osg-700">área Fiscal (Planejamento Tributário)</b>: o contexto societário/patrimonial abaixo,
          os <b className="font-semibold text-osg-700">documentos do cliente</b> (para baixar/anexar) e o que <b className="font-semibold text-osg-700">falta solicitar</b>.
        </span>
      </div>

      {/* Estrutura atual (antes) */}
      <EstruturaAtual bens={bens} />

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

      {/* Documentos do cliente — recebidos (com download) + o que falta solicitar, por tipo */}
      <Secao
        icon={Archive}
        titulo="Documentos do cliente"
        meta={`${docs.length} recebido${docs.length === 1 ? '' : 's'} · ${faltantes} a solicitar`}
        action={docs.length > 0 ? (
          <button
            type="button"
            onClick={baixarTodos}
            disabled={baixar.isPending}
            className="inline-flex items-center gap-1.5 rounded-md border border-osg-300 bg-osg-50 px-2.5 py-1 text-[11px] font-semibold text-osg-700 transition-colors hover:bg-osg-100 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Baixar todos
          </button>
        ) : undefined}
      >
        <ul className="divide-y divide-osg-100">
          {DOCS_FISCAL.map((d, i) => {
            const achados = matchDocs(d, docs);
            const estado = d.modelo ? 'modelo' : achados.length ? 'recebido' : 'solicitar';
            return (
              <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-osg-100 text-[11px] font-bold tabular-nums text-osg-700">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-slate-800">{d.assunto}</span>
                    {estado === 'recebido' ? <Pill tone="ok">Recebido{achados.length > 1 ? ` (${achados.length})` : ''}</Pill>
                      : estado === 'modelo' ? <Pill tone="neutral">Modelo (anexo)</Pill>
                        : <Pill tone="pend">A solicitar</Pill>}
                  </div>
                  <p className="text-xs leading-snug text-slate-500">{d.descricao}</p>
                  {achados.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {achados.map((f) => (
                        <div key={f.id} className="flex items-center gap-1.5 text-[11.5px] text-slate-500">
                          <FileText className="h-3 w-3 shrink-0 text-slate-400" /><span className="min-w-0 truncate">{f.nome_original}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
          {orfaos.length > 0 && (
            <li className="flex items-start gap-3 px-4 py-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">+</span>
              <div className="min-w-0 flex-1">
                <span className="text-[13px] font-semibold text-slate-800">Outros documentos recebidos</span>
                <div className="mt-1 space-y-0.5">
                  {orfaos.map((f) => (
                    <div key={f.id} className="flex items-center gap-1.5 text-[11.5px] text-slate-500">
                      <FileText className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate">{f.nome_original}</span>
                      <span className="shrink-0 text-[10px] text-slate-400">{CAT_LABEL[f.categoria]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </li>
          )}
        </ul>
        <p className="border-t border-osg-100 px-4 py-2 text-[11px] leading-relaxed text-slate-500">
          “Recebido / A solicitar” é estimado pela categoria/nome do arquivo — a OSG confirma. “Baixar todos” abre os arquivos disponíveis (permita pop-ups).
        </p>
      </Secao>

      {/* Questionário — anexo aplicado pela Fiscal */}
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

function Pill({ tone, children }: { tone: 'ok' | 'pend' | 'neutral'; children: React.ReactNode }) {
  const cls = {
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    pend: 'border-amber-200 bg-amber-50 text-amber-700',
    neutral: 'border-slate-200 bg-slate-50 text-slate-500',
  }[tone];
  return <span className={cn('inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', cls)}>{children}</span>;
}

function Secao({ icon: Icon, titulo, meta, action, children }: { icon: typeof Landmark; titulo: string; meta?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-osg-200 bg-background shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-b border-osg-100 bg-osg-50/60 px-4 py-2.5">
        <Icon className="h-4 w-4 shrink-0 text-osg-600" />
        <h3 className="text-sm font-semibold text-osg-800">{titulo}</h3>
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
