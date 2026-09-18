import { useMemo } from 'react';
import { Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAllMatriculas, type MatriculaEnriched } from '@/hooks/useDiagnosticoPatrimonial';
import { useExploracaoRural, type ExploracaoRuralEnriched, type OsgTipoExploracao } from '@/hooks/useExploracaoRural';

/**
 * A relação de terras exploradas, sozinha.
 *
 * NASCEU GRUDADA NO DIAGRAMA. Esta tabela e o desenho de quem explora cada
 * imóvel eram um relatório só, a "Abertura de Demanda", e saíam sempre juntos —
 * quem queria só a relação levava o diagrama, e vice-versa. Separadas, cada uma
 * é uma linha marcável na Biblioteca: escolhe-se o que ver e o que imprimir.
 *
 * O que as unia era o destinatário, não o conteúdo: as duas vão para a área
 * Fiscal no mesmo pacote. Isso continua verdade e está dito na aba, uma vez, em
 * vez de dentro de cada peça.
 */

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

/**
 * As colunas mudam com a FONTE, e não só os valores.
 *
 * A tabela imprimia sempre as treze colunas do instrumento. Quando o cliente não
 * tinha exploração cadastrada e a leitura caía para as matrículas, sete delas
 * saíam com travessão escrito no código — explorador, outorgante, declaração de
 * IRPF, assinatura, encerramento, vigência e sacas por hectare. Não era dado
 * ausente que pudesse chegar depois: são campos que só existem quando há
 * instrumento. A tabela prometia treze e entregava seis, e era esse peso morto
 * que a fazia estourar a largura da página.
 */
type Coluna = { titulo: string; numerica?: boolean; destaque?: boolean };

const COLUNAS_INSTRUMENTO: readonly Coluna[] = [
  { titulo: 'Tipo' },
  // "Explorador / Compossuidor" porque a coluna troca de significado com o tipo:
  // na parceria são os outorgados, na composse os compossuidores.
  { titulo: 'Explorador / Compossuidor' },
  { titulo: 'Outorgante' },
  { titulo: 'Imóvel', destaque: true },
  { titulo: 'Matrícula' },
  { titulo: 'Município/UF' },
  { titulo: 'Área total', numerica: true },
  { titulo: 'Área explorada', numerica: true },
  { titulo: 'Decl. IRPF' },
  { titulo: 'Assinatura' },
  { titulo: 'Encerramento' },
  { titulo: 'Vigência' },
  { titulo: 'Sacas/ha', numerica: true },
];

/** Sem instrumento não há contrato, e sem contrato não há prazo nem outorgante. */
const COLUNAS_MATRICULA: readonly Coluna[] = [
  { titulo: 'Tipo' },
  { titulo: 'Imóvel', destaque: true },
  { titulo: 'Matrícula' },
  { titulo: 'Município/UF' },
  { titulo: 'Área total', numerica: true },
  { titulo: 'Área explorada', numerica: true },
];

const th = 'whitespace-nowrap border-b border-osg-200 bg-muted px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground';
const td = 'border-t border-osg-100 px-3 py-2 align-top text-muted-foreground';

export function TerrasExploradas({
  clienteId,
  modoPrevia = false,
}: {
  clienteId: string;
  /** Dentro do modal: sem rolagem horizontal própria — quem governa a largura é o zoom. */
  modoPrevia?: boolean;
}) {
  const { data: todasMat = [], isLoading: loadingMat } = useAllMatriculas();
  const { data: exploracoes = [], isLoading: loadingExpl, isError: erroExpl } = useExploracaoRural(clienteId);

  const matriculas = useMemo(
    () => todasMat.filter((m) => m.bem_cliente_id === clienteId || m.titular_cliente_ids.includes(clienteId)),
    [todasMat, clienteId],
  );

  if (loadingMat || loadingExpl) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Carregando a relação de terras…</p>;
  }

  // Se houver registros estruturados em exploracao_rural, usa-os; senão, fallback
  // para matrículas — com MENOS COLUNAS, não com as mesmas vazias.
  //
  // LEITURA QUE FALHOU E CLIENTE SEM EXPLORAÇÃO CADASTRADA NÃO SÃO A MESMA COISA.
  // Em erro, `exploracoes` cai para [] e o `usaExploracoes` fica falso, então sem o
  // `erroExpl` a tabela trocaria de FONTE calada: imprimiria área de matrícula num
  // pacote que vai para a área Fiscal como se fosse área explorada, e o total do
  // cabeçalho da seção viria da fonte errada junto. Erro de leitura tem de aparecer.
  const usaExploracoes = exploracoes.length > 0;
  const colunas = usaExploracoes ? COLUNAS_INSTRUMENTO : COLUNAS_MATRICULA;
  const rows = erroExpl
    ? []
    : usaExploracoes
    ? exploracoes.flatMap(exprRows)
    : matriculas.map((m) => [
        m.tipo_exploracao_posse || '—',
        m.bem_denominacao || m.bem_referencia || (m.numero ? `Matrícula ${m.numero}` : 'Imóvel'),
        matTxt(m),
        munUf(m),
        fmtArea(m.area_documento, m.area_unidade),
        fmtArea(m.area_explorada, m.area_unidade),
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
      <Secao icon={Landmark} titulo="Imóveis e áreas exploradas" meta={secaoMeta}>
        {semLinhas ? (
          <p className={cn('px-4 py-8 text-center text-sm', erroExpl ? 'text-destructive' : 'text-muted-foreground')}>{emptyMsg}</p>
        ) : (
          <div className="space-y-2">
            {/* Dizer POR QUE há menos colunas, em vez de deixar a área Fiscal
                comparar dois pacotes e concluir que um veio truncado. */}
            {!usaExploracoes && (
              <p className="px-4 pt-3 text-[11.5px] leading-relaxed text-muted-foreground">
                Sem instrumento de exploração cadastrado, esta tabela sai das matrículas: as colunas
                de contrato — outorgante, prazos e sacas por hectare — não se aplicam e por isso não
                aparecem. Cadastre em <b className="font-medium text-muted-foreground">Exploração Rural</b> para
                o pacote sair completo.
              </p>
            )}
            {/* NA PRÉVIA A TABELA NÃO ROLA SOZINHA: com a barra própria, o modal
                teria duas rolagens concorrentes e o zoom não alcançaria as colunas
                que ficaram fora do cartão. Solta, ela assume a largura natural. */}
            <div className={modoPrevia ? undefined : 'overflow-x-auto'}>
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr>
                    {colunas.map((col) => (
                      <th key={col.titulo} className={cn(th, col.numerica && 'text-right')}>
                        {col.titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, ri) => (
                    <tr key={ri} className="hover:bg-osg-50/30">
                      {r.map((c, ci) => (
                        <td
                          key={ci}
                          className={cn(
                            td,
                            colunas[ci]?.numerica && 'whitespace-nowrap text-right tabular-nums',
                            colunas[ci]?.destaque && 'font-medium text-foreground',
                          )}
                        >
                          {c || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

export default TerrasExploradas;
