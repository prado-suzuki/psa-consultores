import { useEffect, useMemo, useState } from 'react';
import { Building2, FileWarning, Info, Landmark, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import { usePessoasByCliente } from '@/hooks/useQualificacaoDasPartes';
import {
  useRelatorioDP, useUpdateBemCampo,
  type CampoValidacaoDP, type DPBem, type DPMatricula, type DPTitular,
} from '@/hooks/useRelatorioDP';
import { GerarDeckButton } from '@/components/equipe/osg/relatorios/GerarApresentacao';

// ---------- formatação ----------
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtMoney = (v: number | string | null): string =>
  v === null || v === '' || Number.isNaN(Number(v)) ? '—' : brl.format(Number(v));
const fmtPct = (f: number | null): string => {
  if (f === null) return '';
  const pct = f <= 1 ? f * 100 : f;
  return `${pct.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
};
const parseMoney = (raw: string): number | null => {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
};

type Linha = { bem: DPBem; mat: DPMatricula | null };
const linhasDe = (b: DPBem): Linha[] =>
  b.matriculas.length ? b.matriculas.map((m) => ({ bem: b, mat: m })) : [{ bem: b, mat: null }];

const titularesDe = (l: Linha): DPTitular[] => (l.mat && l.mat.titulares.length ? l.mat.titulares : l.bem.titulares);
const titularTxt = (l: Linha): string => {
  const t = titularesDe(l);
  if (!t.length) return '—';
  return t.map((x) => x.denominacao + (x.fracao !== null ? ` (${fmtPct(x.fracao)})` : '')).join(', ');
};
const matTxt = (l: Linha): string => {
  if (!l.mat) return 'Não se aplica';
  const n = l.mat.numero ? `Mat. ${l.mat.numero}` : '—';
  return l.mat.matricula_anterior_texto ? `${n} (ant. ${l.mat.matricula_anterior_texto})` : n;
};
const munUfTxt = (l: Linha): string => {
  if (!l.mat) return '—';
  return [l.mat.municipio_imovel ?? '', l.mat.uf_imovel ?? ''].filter(Boolean).join('/') || '—';
};
const valContabil = (l: Linha): number | null => l.mat?.vlr_contabil ?? l.bem.vlr_contabil;

const somaContabil = (bens: DPBem[]): number =>
  bens.reduce((s, b) => s + linhasDe(b).reduce((ss, l) => ss + (Number(valContabil(l)) || 0), 0), 0);

// ---------- células editáveis (validação manual — só nos não integralizados) ----------
const editBase =
  'w-full rounded-md border border-[#efe1bd] bg-[#fffdf6] px-2 py-1 text-[12px] text-muted-foreground outline-none ' +
  'hover:border-[#e6cf94] focus:border-osg-moss focus:bg-white focus:ring-2 focus:ring-osg-moss/15';

function EditableMoney({ value, onSave }: { value: number | null; onSave: (v: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');
  if (!editing) {
    return (
      <button
        type="button"
        className={cn(editBase, 'text-right tabular-nums', value === null && 'text-muted-foreground/70')}
        onClick={() => { setRaw(value === null ? '' : String(value)); setEditing(true); }}
      >
        {value === null ? 'a informar' : fmtMoney(value)}
      </button>
    );
  }
  return (
    <input
      autoFocus
      className={cn(editBase, 'text-right tabular-nums')}
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => { setEditing(false); const n = parseMoney(raw); if (n !== value) onSave(n); }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
}

function EditableText({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <textarea
      className={cn(editBase, 'min-w-[220px] resize-y leading-snug')}
      rows={2}
      value={v}
      placeholder="a informar"
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v !== value) onSave(v); }}
    />
  );
}

// ---------- estilos de tabela ----------
const th = 'whitespace-nowrap border-b border-osg-200 bg-muted px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground';
const td = 'border-t border-osg-100 px-3 py-2 align-top text-muted-foreground';

// Colunas exatamente como no pptx (VF Potrich).
const HEAD_INT = ['Propriedade de direito', 'Referência do bem', 'Matrícula', 'Município/UF', 'Valor Contábil'];
const HEAD_FORA = [...HEAD_INT, 'Valor ITR/IPTU', 'Valor de Mercado', 'Definições/observações'];

// ---------- bloco: imóveis integralizados (1 por sociedade) — 5 colunas, read-only ----------
function BlocoIntegralizados({ titulo, meta, bens }: { titulo: string; meta: string; bens: DPBem[] }) {
  const linhas = bens.flatMap(linhasDe);
  const rows = linhas.map((l) => [titularTxt(l), l.bem.denominacao ?? '—', matTxt(l), munUfTxt(l), fmtMoney(valContabil(l))]);
  return (
    <section className="overflow-hidden rounded-xl border border-osg-200 bg-background shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-b border-osg-100 bg-osg-50/60 px-4 py-2.5">
        <Building2 className="h-4 w-4 shrink-0 text-osg-600" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-osg-800">{titulo}</h3>
          <p className="text-xs text-muted-foreground">{meta}</p>
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>{HEAD_INT.map((h, i) => <th key={i} className={cn(th, i === 4 && 'text-right')}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="hover:bg-osg-50/30">
                {r.map((c, ci) => (
                  <td key={ci} className={cn(td, ci === 4 && 'whitespace-nowrap text-right tabular-nums', ci === 1 && 'font-medium text-foreground')}>
                    {c || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- bloco: não integralizados — 8 colunas, com validação manual ----------
function BlocoForaProjeto({
  bens, meta, onEdit,
}: {
  bens: DPBem[];
  meta: string;
  onEdit: (bemId: string, campo: CampoValidacaoDP, valor: string | number | null) => void;
}) {
  const titulo = 'Imóveis não integralizados';
  const linhas = bens.flatMap(linhasDe);
  return (
    <section className="overflow-hidden rounded-xl border border-osg-200 bg-background shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-b border-osg-100 bg-osg-50/60 px-4 py-2.5">
        <FileWarning className="h-4 w-4 shrink-0 text-osg-600" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-osg-800">{titulo}</h3>
          <p className="text-xs text-muted-foreground">{meta}</p>
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              {HEAD_FORA.map((h, i) => (
                <th key={i} className={cn(th, (i === 4 || i === 5 || i === 6) && 'text-right')}>
                  {h}
                  {i === 5 && <span title="Aguardando campo (migration)" className="ml-1 text-rose-500">•</span>}
                  {i === 6 && <Pencil className="ml-1 inline h-3 w-3 text-amber-500" />}
                  {i === 7 && <Pencil className="ml-1 inline h-3 w-3 text-amber-500" />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, ri) => (
              <tr key={`${l.bem.id}-${l.mat?.id ?? ri}`} className="hover:bg-osg-50/30">
                <td className={td}>{titularTxt(l)}</td>
                <td className={cn(td, 'font-medium text-foreground')}>{l.bem.denominacao || '—'}</td>
                <td className={td}>{matTxt(l)}</td>
                <td className={cn(td, 'whitespace-nowrap')}>{munUfTxt(l)}</td>
                <td className={cn(td, 'whitespace-nowrap text-right tabular-nums')}>{fmtMoney(valContabil(l))}</td>
                <td className={cn(td, 'text-right text-muted-foreground/70')}>—</td>
                <td className={cn(td, 'w-[120px]')}>
                  <EditableMoney value={l.bem.vlr_mercado} onSave={(v) => onEdit(l.bem.id, 'vlr_mercado', v)} />
                </td>
                <td className={cn(td, 'min-w-[240px]')}>
                  <EditableText value={l.bem.motivo_nao_integralizacao ?? ''} onSave={(v) => onEdit(l.bem.id, 'motivo_nao_integralizacao', v)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DiagnosticoPatrimonialReport({ clienteId }: { clienteId: string }) {
  const { data: clientes = [] } = useClientesLista();
  const { data: pessoas = [] } = usePessoasByCliente(clienteId);
  const { data: bens = [], isLoading } = useRelatorioDP(clienteId);
  const editar = useUpdateBemCampo(clienteId);

  const clienteNome = clientes.find((c) => c.id === clienteId)?.nome ?? '';
  const pessoaNome = useMemo(() => new Map(pessoas.map((p) => [p.id, p.denominacao ?? 'Sociedade'])), [pessoas]);

  const { sociedades, fora, totais } = useMemo(() => {
    const participa = (b: DPBem) => b.participa_estruturacao !== false;
    const integralizados = bens.filter(participa);
    const foraProjeto = bens.filter((b) => !participa(b));

    const grupos = new Map<string, { nome: string; bens: DPBem[] }>();
    for (const b of integralizados) {
      const key = b.empresa_destino_pessoa_id ?? '__sem__';
      const nome = b.empresa_destino_pessoa_id
        ? (pessoaNome.get(b.empresa_destino_pessoa_id) ?? 'Sociedade')
        : 'Sociedade a definir';
      if (!grupos.has(key)) grupos.set(key, { nome, bens: [] });
      grupos.get(key)!.bens.push(b);
    }
    const socArr = [...grupos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    return {
      sociedades: socArr,
      fora: foraProjeto,
      totais: {
        lancamentos: bens.length,
        nSoc: socArr.length,
        nInt: integralizados.length,
        vInt: somaContabil(integralizados),
        nFora: foraProjeto.length,
        vFora: somaContabil(foraProjeto),
      },
    };
  }, [bens, pessoaNome]);

  const onEdit = (bemId: string, campo: CampoValidacaoDP, valor: string | number | null) =>
    editar.mutate({ bemId, campo, valor });

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Carregando diagnóstico patrimonial…</p>;
  }
  if (bens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 py-16 text-center">
        <Landmark className="h-10 w-10 text-osg-400" />
        <p className="text-sm text-muted-foreground">Nenhum bem cadastrado no Diagnóstico Patrimonial de {clienteNome || 'este cliente'}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">
            Quadro Patrimonial — <span className="text-osg-700">{clienteNome}</span>
          </h2>
          <span className="text-xs text-muted-foreground">Espelha os slides de Organização Patrimonial · fonte: módulo Diagnóstico Patrimonial</span>
        </div>
        <GerarDeckButton clienteId={clienteId} tipo="patrimonial" label="Gerar deck Patrimonial" />
      </div>

      {/* Resumo sóbrio */}
      <div className="flex overflow-hidden rounded-xl border border-osg-200 bg-background shadow-sm max-sm:flex-col">
        <ResumoCel titulo="Sociedades" valor={`${totais.nSoc}`} desc="destino de integralização" first />
        <ResumoCel titulo="Integralizados" valor={`${totais.nInt}`} desc={`${fmtMoney(totais.vInt)} contábil`} dot="bg-status-feito" />
        <ResumoCel titulo="Não integralizados" valor={`${totais.nFora}`} desc={`${fmtMoney(totais.vFora)} contábil`} dot="bg-status-alerta" />
        <ResumoCel titulo="Lançamentos" valor={`${totais.lancamentos}`} desc="bens no diagnóstico" dot="bg-status-neutro" />
      </div>

      {/* Uma tabela por sociedade de integralização (= 1 slide no deck) */}
      {sociedades.map((s) => (
        <BlocoIntegralizados
          key={s.nome}
          titulo={`Imóveis integralizados na sociedade patrimonial “${s.nome}”`}
          meta={`${s.bens.flatMap(linhasDe).length} imóveis · ${fmtMoney(somaContabil(s.bens))} contábil`}
          bens={s.bens}
        />
      ))}

      {/* Não integralizados — tabela mais larga com validação manual */}
      {fora.length > 0 && (
        <BlocoForaProjeto
          bens={fora}
          meta={`${fora.flatMap(linhasDe).length} itens · ${fmtMoney(totais.vFora)} contábil · poderão compor testamento ou aquisição direta pela PJ`}
          onEdit={onEdit}
        />
      )}

      <div className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
        <span>
          Colunas idênticas ao pptx de Organização Patrimonial. Integralizados: automáticas (bem · matrícula · titularidade).
          Não integralizados: <b className="font-semibold text-muted-foreground">Valor de Mercado</b> e <b className="font-semibold text-muted-foreground">Definições/observações</b> são validação manual da OSG (<Pencil className="inline h-3 w-3 text-amber-500" /> salva ao sair do campo);
          {' '}<b className="font-semibold text-muted-foreground">Valor ITR/IPTU</b> (•) fica em branco até criarmos o campo — pendência de migration.
          Use <b className="font-semibold text-muted-foreground">Gerar deck Patrimonial</b> para montar os slides no modelo PSA.
        </span>
      </div>
    </div>
  );
}

function ResumoCel({
  titulo, valor, desc, dot = 'bg-osg-moss', first = false,
}: { titulo: string; valor: string; desc: string; dot?: string; first?: boolean }) {
  return (
    <div className={cn('flex-1 px-5 py-3.5', !first && 'sm:border-l max-sm:border-t border-osg-100')}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className={cn('h-2 w-2 rounded-sm', dot)} /> {titulo}
      </div>
      <div className="mt-1 text-[22px] font-semibold leading-tight text-foreground">{valor}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}

export default DiagnosticoPatrimonialReport;
