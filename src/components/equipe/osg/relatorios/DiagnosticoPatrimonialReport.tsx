import { useMemo } from 'react';
import { Info, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import { usePessoasByCliente } from '@/hooks/useQualificacaoDasPartes';
import { useRelatorioDP, type DPBem, type DPMatricula, type DPTitular } from '@/hooks/useRelatorioDP';
import { MolduraDeSlide, NotaDaPrevia } from '@/components/equipe/osg/relatorios/MolduraDeSlide';
import { nomeDaPeca } from '@/components/equipe/osg/relatorios/catalogoDaBiblioteca';

/** O mesmo texto da ficha que abre esta peça — ver `nomeDaPeca`. */
const NOME_DA_PECA = nomeDaPeca('dp');

/**
 * SÓ O QUE VIRA SLIDE. Esta peça mostrava também os "imóveis não integralizados",
 * com três colunas que não existem em template nenhum — ITR/IPTU, Valor de
 * Mercado e Definições/observações — e duas delas editáveis. Era planilha de
 * trabalho dentro de uma prévia de apresentação, e a `carregarPatrimonial`
 * descarta `participa_estruturacao = false` antes de montar o deck: aquele bloco
 * nunca chegou ao .pptx.
 *
 * A passada de validação foi para o Cadastro Patrimonial, que ganhou o filtro
 * "não integralizados" no mesmo passo — os dois campos editáveis já viviam lá,
 * no `BemDadosTab`. O que fica aqui é o espelho do template, coluna por coluna.
 *
 * O resumo no topo mantém a contagem dos que ficaram de fora. Sem ela, bem fora
 * do projeto sumiria do relatório sem deixar rastro, e ninguém saberia que o
 * deck não cobre o patrimônio inteiro.
 */

// ---------- formatação ----------
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtMoney = (v: number | string | null): string =>
  v === null || v === '' || Number.isNaN(Number(v)) ? '—' : brl.format(Number(v));
const fmtPct = (f: number | null): string => {
  if (f === null) return '';
  const pct = f <= 1 ? f * 100 : f;
  return `${pct.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
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

// ---------- estilos de tabela ----------
const th = 'whitespace-nowrap border-b border-osg-200 bg-muted px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground';
const td = 'border-t border-osg-100 px-3 py-2 align-top text-muted-foreground';

/**
 * As cinco colunas do slide, na ordem dos cinco tokens do template:
 * `PROP`, `REF`, `MAT`, `MUN`, `VALOR`. Uma sexta faria a tela prometer uma
 * coluna que o .pptx não tem — foi o que aconteceu enquanto o ITR/IPTU e as
 * duas colunas de validação moravam aqui.
 */
const HEAD = ['Propriedade de direito', 'Referência do bem', 'Matrícula', 'Município/UF', 'Valor Contábil'];

// ---------- bloco: imóveis integralizados (1 por sociedade) = 1 slide ----------
function BlocoIntegralizados({ titulo, meta, bens, numero, total }: { titulo: string; meta: string; bens: DPBem[]; numero: number; total: number }) {
  const linhas = bens.flatMap(linhasDe);
  const rows = linhas.map((l) => [titularTxt(l), l.bem.denominacao ?? '—', matTxt(l), munUfTxt(l), fmtMoney(valContabil(l))]);
  return (
    <MolduraDeSlide numero={numero} total={total} titulo={titulo} meta={meta}>
      <div className="-mx-4 -my-3 overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>{HEAD.map((h, i) => <th key={i} className={cn(th, i === 4 && 'text-right')}>{h}</th>)}</tr>
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
    </MolduraDeSlide>
  );
}

export function DiagnosticoPatrimonialReport({ clienteId }: { clienteId: string }) {
  const { data: clientes = [] } = useClientesLista();
  const { data: pessoas = [] } = usePessoasByCliente(clienteId);
  const { data: bens = [], isLoading } = useRelatorioDP(clienteId);

  const clienteNome = clientes.find((c) => c.id === clienteId)?.nome ?? '';
  const pessoaNome = useMemo(() => new Map(pessoas.map((p) => [p.id, p.denominacao ?? 'Sociedade'])), [pessoas]);

  // Os não integralizados não viram bloco, mas continuam CONTADOS: é o resumo
  // que diz que o deck não cobre o patrimônio inteiro.
  const { sociedades, totais } = useMemo(() => {
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

  /**
   * UM SLIDE POR SOCIEDADE, e só.
   *
   * A conta somava o bloco de não integralizados, e estava errada: a
   * `carregarPatrimonial` da edge function descarta `participa_estruturacao = false`
   * antes de montar o deck. Aquele bloco nunca chegou ao .pptx — a tela dizia
   * "Slide 3 de 3" para uma página que o arquivo não tem.
   *
   * O agrupamento aqui é por `empresa_destino_pessoa_id` e lá é pelo NOME da
   * empresa destino. Duas pessoas distintas com a mesma denominação sairiam como
   * dois blocos aqui e um slide lá; é o único jeito de esta conta divergir.
   */
  const totalDeSlides = sociedades.length;

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Carregando diagnóstico patrimonial…</p>;
  }
  if (bens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 py-16 text-center">
        <Landmark className="h-10 w-10 text-osg-500" />
        {/* "Nenhum bem cadastrado no Cadastro Patrimonial" repetiria a palavra
            depois do renome de 14/09/2026; o verbo sai e o nome da tela fica,
            que é o que diz onde resolver. */}
        <p className="text-sm text-muted-foreground">Nenhum bem no Cadastro Patrimonial de {clienteNome || 'este cliente'}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">
            {NOME_DA_PECA} — <span className="text-osg-700">{clienteNome}</span>
          </h2>
          {/* O relatório é o "Diagnóstico Patrimonial"; a FONTE é a tela de
              cadastro, que virou "Cadastro Patrimonial". Os dois nomes juntos
              aqui são o que desfaz a confusão que o renome atacou — não são a
              mesma coisa. */}
          <span className="text-xs text-muted-foreground">Espelha os slides de Organização Patrimonial · fonte: módulo Cadastro Patrimonial</span>
        </div>
      </div>

      {/* Resumo sóbrio */}
      <div className="flex overflow-hidden rounded-xl border border-osg-200 bg-background shadow-sm max-sm:flex-col">
        <ResumoCel titulo="Sociedades" valor={`${totais.nSoc}`} desc="destino de integralização" first />
        <ResumoCel titulo="Integralizados" valor={`${totais.nInt}`} desc={`${fmtMoney(totais.vInt)} contábil`} dot="bg-status-feito" />
        {/* Fora do deck, e a contagem é o que diz isso. Estes bens não têm slide;
            quem precisa tratá-los vai ao Cadastro Patrimonial, no filtro
            "Não integralizados". */}
        <ResumoCel titulo="Não integralizados" valor={`${totais.nFora}`} desc="fora do deck" dot="bg-status-alerta" />
        <ResumoCel titulo="Lançamentos" valor={`${totais.lancamentos}`} desc="bens no cadastro" dot="bg-status-neutro" />
      </div>

      {/* Uma tabela por sociedade de integralização = 1 slide no deck. */}
      {sociedades.map((s, i) => (
        <BlocoIntegralizados
          key={s.nome}
          numero={i + 1}
          total={totalDeSlides}
          titulo={`Imóveis integralizados na sociedade patrimonial “${s.nome}”`}
          meta={`${s.bens.flatMap(linhasDe).length} imóveis · ${fmtMoney(somaContabil(s.bens))} contábil`}
          bens={s.bens}
        />
      ))}

      {totais.nFora > 0 && (
        <div className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
          <span>
            {totais.nFora === 1 ? 'Um bem não entra' : `${totais.nFora} bens não entram`} na estruturação e por isso
            {totais.nFora === 1 ? ' não tem' : ' não têm'} slide aqui. Valor de mercado e motivo se preenchem no{' '}
            <b className="font-semibold text-muted-foreground">Cadastro Patrimonial</b>, filtrando por “Não integralizados”.
          </span>
        </div>
      )}

      <NotaDaPrevia deck="Organização Patrimonial" />
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
