import { useMemo } from 'react';
import { Landmark, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import { useAllMatriculas, type MatriculaEnriched } from '@/hooks/useDiagnosticoPatrimonial';
import { useRelatorioDP } from '@/hooks/useRelatorioDP';
import { EstruturaAtual } from './EstruturaAtual';
import { useExploracaoRural, type ExploracaoRuralEnriched, type OsgTipoExploracao } from '@/hooks/useExploracaoRural';

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

/**
 * Vigência, DERIVADA das datas — a coluna de texto livre `exploracao_rural.vigencia`
 * saiu do schema em 01/09/2026 porque duplicava `data_assinatura`/`data_encerramento`
 * e divergia delas.
 *
 * O início nem sempre é a assinatura: o contrato da Agro Aliança foi assinado em
 * 20/03/2026 e vigora "a partir de 16 de setembro de 2.026". Quando
 * `data_inicio_vigencia` está preenchida, é ela que manda.
 */
const vigenciaTexto = (r: ExploracaoRuralEnriched): string => {
  const inicio = r.data_inicio_vigencia ?? r.data_assinatura;
  if (r.tipo_exploracao === 'composse') {
    // Composse não expira: ela tem prazo de INDIVISÃO, que é outra coisa.
    if (!r.prazo_indivisao_quantidade) return inicio ? `desde ${fmtDate(inicio)}` : '—';
    const unidade = r.prazo_indivisao_unidade ?? 'anos';
    const prorroga = r.indivisao_prorrogavel ? ', prorrogável' : '';
    return `indivisão de ${r.prazo_indivisao_quantidade} ${unidade}${prorroga}`;
  }
  if (!inicio && !r.data_encerramento) return '—';
  if (r.data_encerramento) {
    return `${fmtDate(inicio)} a ${fmtDate(r.data_encerramento)}${r.vigencia_prorrogavel ? ' (prorrogável)' : ''}`;
  }
  return `desde ${fmtDate(inicio)}${r.vigencia_prorrogavel ? ' (prorrogável)' : ''}`;
};

/** Nomes das partes do lado que explora: exploradores na parceria, compossuidores na composse. */
const partesQueExploram = (r: ExploracaoRuralEnriched): string => {
  const papel = r.tipo_exploracao === 'composse' ? 'compossuidor' : 'explorador';
  const nomes = r.partes
    .filter((p) => p.papel === papel)
    .sort((a, b) => a.ordem - b.ordem)
    .map((p) => p.pessoa?.denominacao)
    .filter((n): n is string => !!n);
  return nomes.length ? nomes.join('; ') : '—';
};

/**
 * UMA LINHA POR IMÓVEL, repetindo os dados do instrumento.
 *
 * Mudou junto com a migration que criou `exploracao_rural_imovel` (01/09/2026): antes
 * o cabeçalho tinha um imóvel só, então instrumento e linha eram a mesma coisa. O
 * `[BV-COM]` reúne 15 imóveis numa composse, e a seção se chama "Imóveis e áreas
 * exploradas" — uma linha agregada esconderia justamente o que ela promete mostrar.
 *
 * Instrumento sem imóvel ainda rende uma linha, com as colunas de imóvel vazias: não
 * cadastrar o Anexo não pode fazer o instrumento desaparecer do relatório.
 */
const exprRows = (r: ExploracaoRuralEnriched): string[][] => {
  const comuns = {
    tipo: TIPO_EXPLORACAO_LABEL[r.tipo_exploracao] ?? '—',
    partes: partesQueExploram(r),
    outorgante: r.outorgante?.denominacao ?? '—',
    irpf: r.declarado_irpf ? 'Sim' : 'Não',
    assinatura: fmtDate(r.data_assinatura),
    encerramento: fmtDate(r.data_encerramento),
    vigencia: vigenciaTexto(r),
    sacas: fmtNum(r.sacas_por_hectare),
  };
  const linha = (imovel: string, matricula: string, munUf: string, total: string, cedida: string) => [
    comuns.tipo, comuns.partes, comuns.outorgante, imovel, matricula, munUf,
    total, cedida, comuns.irpf, comuns.assinatura, comuns.encerramento,
    comuns.vigencia, comuns.sacas,
  ];
  if (r.imoveis.length === 0) return [linha('—', '—', '—', '—', '—')];
  return [...r.imoveis]
    .sort((a, b) => a.ordem - b.ordem)
    .map((item) => {
      const m = item.matricula;
      return linha(
        m?.bem?.denominacao ?? (m?.numero ? `Matrícula ${m.numero}` : '—'),
        m?.numero ? `Mat. ${m.numero}` : '—',
        [m?.municipio_imovel ?? '', m?.uf_imovel ?? ''].filter(Boolean).join('/') || '—',
        // Área total é da MATRÍCULA (o imóvel); área explorada é a cedida NESTE
        // instrumento. No Anexo do [BV-COM] a segunda é sempre menor que a primeira.
        fmtArea(m?.area_documento ?? null, m?.area_unidade ?? null),
        fmtArea(item.area_explorada, item.area_unidade),
      );
    });
};

const areaUnit = (u: string | null): string => (u === 'm2' ? 'm²' : 'ha');
const fmtArea = (v: number | null, u: string | null): string =>
  v === null || Number.isNaN(Number(v)) ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${areaUnit(u)}`;
// Só o número da matrícula na tabela; a descrição da matrícula anterior fica no cadastro.
const matTxt = (m: MatriculaEnriched): string => (m.numero ? `Mat. ${m.numero}` : '—');
const munUf = (m: MatriculaEnriched): string => [m.municipio_imovel ?? '', m.uf_imovel ?? ''].filter(Boolean).join('/') || '—';

const th = 'whitespace-nowrap border-b border-osg-200 bg-muted px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground';
const td = 'border-t border-osg-100 px-3 py-2 align-top text-muted-foreground';

export function FiscalReport({ clienteId }: { clienteId: string }) {
  const { data: clientes = [] } = useClientesLista();
  const { data: bens = [], isLoading: loadingDP } = useRelatorioDP(clienteId);
  const { data: todasMat = [], isLoading: loadingMat } = useAllMatriculas();
  const { data: exploracoes = [], isLoading: loadingExpl, isError: erroExpl } = useExploracaoRural(clienteId);
  const clienteNome = clientes.find((c) => c.id === clienteId)?.nome ?? '';

  const matriculas = useMemo(
    () => todasMat.filter((m) => m.bem_cliente_id === clienteId || m.titular_cliente_ids.includes(clienteId)),
    [todasMat, clienteId],
  );

  if (loadingDP || loadingMat || loadingExpl) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Carregando abertura de demanda…</p>;
  }

  const HEAD = [
    // "Explorador / Compossuidor" porque a coluna troca de significado com o tipo:
    // na parceria são os outorgados, na composse os compossuidores.
    'Tipo', 'Explorador / Compossuidor', 'Outorgante', 'Imóvel', 'Matrícula',
    'Município/UF', 'Área total', 'Área explorada', 'Decl. IRPF',
    'Assinatura', 'Encerramento', 'Vigência', 'Sacas/ha',
  ];
  // Se houver registros estruturados em exploracao_rural, usa-os; senão, fallback para matrículas
  // (mesmas colunas de exploração vazias, comportamento atual).
  //
  // LEITURA QUE FALHOU E CLIENTE SEM EXPLORAÇÃO CADASTRADA NÃO SÃO A MESMA COISA.
  // Em erro, `exploracoes` cai para [] e o `usaExploracoes` fica falso, então sem o
  // `erroExpl` a tabela trocaria de FONTE calada: imprimiria área de matrícula num
  // pacote que vai para a área Fiscal como se fosse área explorada, e o total do
  // cabeçalho da seção viria da fonte errada junto. Erro de leitura tem de aparecer.
  const usaExploracoes = exploracoes.length > 0;
  const rows = erroExpl
    ? []
    : usaExploracoes
    ? exploracoes.flatMap(exprRows)
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

  // A área cedida agora mora no ITEM, não no cabeçalho: soma sobre os imóveis de
  // todos os instrumentos. Converte para ha antes de somar — item em m² e item em ha
  // no mesmo total seria número sem significado.
  const totalAreaExplorada = usaExploracoes
    ? exploracoes.reduce(
        (s, r) =>
          s +
          r.imoveis.reduce((si, i) => {
            const valor = Number(i.area_explorada) || 0;
            return si + (i.area_unidade === 'm2' ? valor / 10000 : valor);
          }, 0),
        0,
      )
    : matriculas.reduce((s, m) => s + (Number(m.area_explorada) || 0), 0);
  const totalImoveis = exploracoes.reduce((s, r) => s + r.imoveis.length, 0);
  const secaoMeta = erroExpl
    ? 'leitura indisponível'
    : usaExploracoes
    ? `${exploracoes.length} instrumento${exploracoes.length === 1 ? '' : 's'} · ${totalImoveis} imóvel${totalImoveis === 1 ? '' : 'is'} · ${totalAreaExplorada.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ha`
    : `${matriculas.length} matrículas · ${totalAreaExplorada.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ha`;
  const semLinhas = rows.length === 0;
  const emptyMsg = erroExpl
    ? 'Não foi possível ler as explorações rurais deste cliente. Recarregue antes de entregar este pacote: sem essa leitura a tabela cairia para os dados de matrícula, que não são a mesma coisa.'
    : usaExploracoes
    ? 'Nenhuma exploração rural cadastrada para este cliente.'
    : 'Nenhuma matrícula cadastrada para este cliente.';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">
          Abertura de demanda — Planejamento Tributário · <span className="text-osg-700">{clienteNome}</span>
        </h2>
        <span className="text-xs text-muted-foreground">Pacote OSG → PSA Fiscal · “Imprimir” para exportar em PDF</span>
      </div>

      {/* Hand-off */}
      <div className="flex items-start gap-3 rounded-xl border border-osg-moss/20 bg-osg-moss/[0.06] px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
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
          <p className={cn('px-4 py-8 text-center text-sm', erroExpl ? 'text-osg-red' : 'text-muted-foreground')}>{emptyMsg}</p>
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
                      <td key={ci} className={cn(td, (ci === 6 || ci === 7 || ci === 12) && 'whitespace-nowrap text-right tabular-nums', ci === 3 && 'font-medium text-foreground')}>
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
          {meta && <span className="text-[11px] text-muted-foreground">{meta}</span>}
          {action}
        </div>
      </header>
      {children}
    </section>
  );
}

export default FiscalReport;
