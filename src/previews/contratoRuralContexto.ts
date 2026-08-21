import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { MatriculaEnriched } from '@/hooks/useDiagnosticoPatrimonial';
import type { AdministradorParaMapear, CapitalSociedade } from '@/lib/templates/mapeadores';
import { mapearPessoa, mapearSociedade } from '@/lib/templates/mapeadores';
import { PARES, type Genero } from '@/lib/templates/concordancia';
import { cardinalExtenso, formatarPercentual, letraAlinea } from '@/lib/templates/extenso';
import type { Contexto } from '@/lib/templates/types';
import type {
  CompossuidorDraft, ExploracaoImovelDraft, ExploracaoRuralDraft, OrigemExternaDraft, UnidadeDePrazo,
} from './contratosExploracaoModel';

// Monta o `Contexto` (Record<string,unknown> pontilhado) que `gerarDocumento` do
// motor real (`src/lib/templates/`) consome — reaproveitando os mapeadores já
// escritos para o Contrato Social (`mapearPessoa`/`mapearSociedade`/
// `mapearAdministrador`): concordância de gênero, endereço em prosa e datas BR
// saem de lá, prontos. O que este arquivo escreve por conta própria é só o que o
// vocabulário societário não tem: naturalidade e filiação (que os dois templates
// rurais exigem e o de Contrato Social não usa), o mapeamento de imóvel (que
// precisaria da árvore bem→titularidade→cartório que a fixture/hook atual não
// tem completa) e o agrupamento de origens da Composse (achado exclusivo desta
// família de contrato).

type Campos = Record<string, string>;

/**
 * Qualificação de uma pessoa para o preâmbulo de Parceria/Composse. Reaproveita
 * `mapearPessoa` (nome, concordância de gênero — nascido/portador/inscrito/
 * residente —, endereço em prosa, CPF/RG, data de nascimento em BR) e soma
 * naturalidade + filiação por fora, porque `montarQualificacao` (a frase pronta
 * do Contrato Social) não inclui os dois — a convenção de lá não cita nem um nem
 * outro, e os dois templates oficiais da banca rural citam sempre.
 */
export function qualificarPessoaRural(pessoa: PessoaRow, opcoes: { comFiliacao?: boolean } = {}): Campos {
  const campos = mapearPessoa(pessoa);
  return {
    ...campos,
    naturalidadeMunicipio: pessoa.naturalidade_municipio ?? '',
    naturalidadeUf: pessoa.naturalidade_uf ?? '',
    temNaturalidade: pessoa.naturalidade_municipio ? 'sim' : '',
    filiacaoPai: opcoes.comFiliacao ? (pessoa.filiacao_pai ?? '') : '',
    filiacaoMae: opcoes.comFiliacao ? (pessoa.filiacao_mae ?? '') : '',
    temFiliacao: opcoes.comFiliacao && pessoa.filiacao_pai && pessoa.filiacao_mae ? 'sim' : '',
  };
}

/** Junta uma lista em prosa jurídica ("A", "A e B", "A, B e C") — mesma regra de sep/fim do motor, para textos que não são seção de repetição. */
function juntarEmProsa(itens: string[]): string {
  const validos = itens.filter(Boolean);
  if (validos.length <= 1) return validos[0] ?? '';
  return `${validos.slice(0, -1).join(', ')} e ${validos[validos.length - 1]}`;
}

/**
 * Campos de um imóvel para `{{#imoveis}}{{imovel.*}}{{/imoveis}}` e o Anexo Único
 * (a mesma seção serve aos dois — ver `06-modelo-composse-rural.md`). Mapeamento
 * próprio, não `mapearMatricula`: aquele pede a árvore `bem`/`cartorio`/
 * `titulares` inteira (titularidade por pessoa, não por cliente), que nem
 * `useAllMatriculas` nem a fixture atual carregam — ver achado no levantamento.
 * `proprietario` aqui usa `cliente_nome` como aproximação, não o titular exato.
 */
export function mapearImovelRural(item: ExploracaoImovelDraft, matricula: MatriculaEnriched | null): Campos {
  const areaTotal = matricula?.area_documento != null ? String(matricula.area_documento).replace('.', ',') : '';
  return {
    ref: item.ref,
    areaExplorada: item.areaExplorada,
    areaTotal,
    nomeImovel: matricula?.bem_denominacao ?? '',
    matricula: matricula?.numero ?? '',
    municipio: matricula?.municipio_imovel ?? '',
    uf: matricula?.uf_imovel ?? '',
    proprietario: matricula?.cliente_nome ?? '',
    cartorioComarca: matricula?.cartorio_comarca ?? '',
    cartorioUf: matricula?.cartorio_uf ?? '',
  };
}

/**
 * Campos de uma origem externa ao sistema (outorgante que não é cliente da PSA) —
 * ver `OrigemExternaDraft`. Mesma forma de `mapearSociedade` (razaoSocial/cnpj/
 * nire/juntaUf/sede/capitalValor/administradores), pro bloco do Considerando V
 * usar o mesmo `qualificacaoPJ` pras duas origens (interna e externa). `juntaUf`
 * não é campo próprio do rascunho — aproxima pela UF da sede, que costuma
 * coincidir; sem contrato real que diferencie os dois ainda.
 */
function mapearOrigemExterna(origem: OrigemExternaDraft): Campos {
  return {
    razaoSocial: origem.outorganteNome,
    cnpj: origem.outorganteCpfCnpj,
    nire: origem.outorganteNire,
    juntaUf: origem.outorganteUf,
    sede: `no município de ${origem.outorganteMunicipio}, Estado de ${origem.outorganteUf}`,
    capitalValor: origem.outorganteCapitalSocialNaAssinatura,
    administradores: origem.outorganteAdministradores,
  };
}

export interface OrigemDistintaContexto {
  letra: string;
  itens: string;
  tipoInstrumentoOrigem: string;
  /** Seções do motor não têm "senão" ({{^flag}} não existe) — os dois booleanos cobrem os dois ramos do Considerando V. */
  ehExploracaoPropria: string;
  vemDeOutroInstrumento: string;
  dataAssinatura?: string;
  outorgante?: Campos;
}

/**
 * Agrupa os imóveis da Composse por origem compartilhada, para o "Considerando
 * V" ("Item(ns) 'a' ao 'f' advém de..." — `[BV-COM]` tem 6 grupos assim para 15
 * imóveis). Simplificado: a lista de itens sai como prosa "a, b e c", não como
 * intervalo contraído "a à o" que os contratos reais usam quando é contíguo —
 * dá pra fazer a contração depois, se algum tech lead pedir.
 */
export function agruparOrigensDistintas(
  imoveis: ExploracaoImovelDraft[],
  resolverInstrumento: (ref: string) => { outorganteId: string | null; dataAssinatura: string } | null,
  pessoas: PessoaRow[],
): OrigemDistintaContexto[] {
  const grupos = new Map<string, { itens: string[]; item: ExploracaoImovelDraft }>();
  for (const imovel of imoveis) {
    const chave = imovel.origemExterna
      ? `externa:${imovel.origemExterna.tituloInstrumento}:${imovel.origemExterna.dataAssinatura}:${imovel.origemExterna.outorganteNome}`
      : imovel.instrumentoOrigemRef
        ? `instrumento:${imovel.instrumentoOrigemRef}`
        : `propria:${imovel.tipoInstrumentoOrigem}`;
    const grupo = grupos.get(chave);
    if (grupo) grupo.itens.push(imovel.ref);
    else grupos.set(chave, { itens: [imovel.ref], item: imovel });
  }

  // Objeto SEMPRE definido quando `vemDeOutroInstrumento` é 'sim' — o motor lança
  // erro em placeholder que resolve pra undefined, e uma origem sem outorgante
  // reconhecido (ref não resolvido, ou "Herança"/"Outro" sem digitação) não pode
  // derrubar a prévia inteira; sai com os campos em branco, visivelmente incompleta.
  const OUTORGANTE_VAZIO: Campos = { razaoSocial: '', cnpj: '', nire: '', juntaUf: '', sede: '', capitalValor: '', administradores: '' };

  let n = 0;
  return [...grupos.values()].map(({ itens, item }): OrigemDistintaContexto => {
    // `letraAlinea` (não charCode cru): o .docx oficial documenta "AA ao BB" pra origens
    // depois de "z" (achado ao conferir contra a fonte em 20/08/2026) — um charCode 97+n
    // ultrapassaria "z" com caractere inválido, não com a dupla letra que a banca usa.
    const letra = letraAlinea(n += 1);
    const ehExploracaoPropria = item.tipoInstrumentoOrigem === 'Exploração própria';
    const flags = { ehExploracaoPropria: ehExploracaoPropria ? 'sim' : '', vemDeOutroInstrumento: ehExploracaoPropria ? '' : 'sim' };
    if (ehExploracaoPropria) {
      return { letra, itens: juntarEmProsa(itens), tipoInstrumentoOrigem: item.tipoInstrumentoOrigem, ...flags };
    }
    if (item.origemExterna) {
      return {
        letra, itens: juntarEmProsa(itens), tipoInstrumentoOrigem: item.tipoInstrumentoOrigem, ...flags,
        dataAssinatura: item.origemExterna.dataAssinatura,
        outorgante: mapearOrigemExterna(item.origemExterna),
      };
    }
    const resolvido = item.instrumentoOrigemRef ? resolverInstrumento(item.instrumentoOrigemRef) : null;
    const outorgantePessoa = resolvido?.outorganteId ? pessoas.find((p) => p.id === resolvido.outorganteId) : null;
    return {
      letra, itens: juntarEmProsa(itens), tipoInstrumentoOrigem: item.tipoInstrumentoOrigem, ...flags,
      dataAssinatura: resolvido?.dataAssinatura ?? '',
      // `administradores` não vem de `mapearSociedade` (que só cobre os campos societários
      // básicos) — sem quem administrava a outorgante NA DATA daquele outro instrumento
      // (histórico, não o quadro atual), sai em branco mesmo, como qualquer campo sem dado.
      outorgante: outorgantePessoa ? { ...mapearSociedade(outorgantePessoa), administradores: '' } : OUTORGANTE_VAZIO,
    };
  });
}

/**
 * Acrescenta o "por extenso" a um percentual já formatado — exigência literal dos dois
 * .docx oficiais ("[% dos frutos em número e por extenso]"), confirmada no contrato
 * assinado real (`exemplo-02-parceria-bela-vista.md`, Cláusula Quinta: "10% (dez por
 * cento)"). Achado ao conferir contra o .docx em 20/08/2026: o campo ficava só com o
 * número digitado, sem o extenso que o template exige.
 *
 * Não usa `percentualExtenso` do motor (que serve à cláusula de capital social do
 * Contrato Social, registro cartorial "dez inteiros por cento") — o rural, no exemplo
 * real, omite "inteiros" pra número redondo ("dez por cento", não "dez inteiros por
 * cento"). Mesmo `cardinalExtenso` por baixo, registro mais simples por cima.
 */
function comExtensoPorCento(percentualFormatado: string): string {
  if (!percentualFormatado.trim()) return percentualFormatado;
  const numero = Number(percentualFormatado.replace('%', '').trim().replace(',', '.'));
  if (!Number.isFinite(numero)) return percentualFormatado;
  const inteiro = Math.floor(numero);
  const milesimos = Math.round((numero - inteiro) * 1000);
  const extenso = milesimos > 0
    ? `${cardinalExtenso(inteiro)} e ${cardinalExtenso(milesimos)} milésimos por cento`
    : `${cardinalExtenso(inteiro)} por cento`;
  return `${percentualFormatado} (${extenso})`;
}

/**
 * "a" à "o" → `nas alíneas "a" à "o"` (ou `na alínea "a"` com 1 só imóvel) — o Considerando I
 * do template oficial cita esse intervalo antes de remeter ao Anexo Único; a primeira versão
 * desta transcrição tinha perdido o intervalo (achado ao comparar com `06-modelo-composse-rural.md`
 * de novo em 20/08/2026).
 */
function alineasProsa(imoveis: ExploracaoImovelDraft[]): string {
  if (imoveis.length === 0) return '';
  const primeira = imoveis[0].ref;
  const ultima = imoveis[imoveis.length - 1].ref;
  return primeira === ultima ? `na alínea "${primeira}"` : `nas alíneas "${primeira}" à "${ultima}"`;
}

/** "3" + "anos" → "3 (três) anos". Sem contrato real com unidade "dias" ainda, mas cardinalExtenso cobre qualquer inteiro. */
function prazoProsa(quantidade: string, unidade: UnidadeDePrazo): string {
  const n = Number(quantidade);
  if (!Number.isFinite(n) || quantidade === '') return '';
  return `${quantidade} (${cardinalExtenso(n)}) ${unidade}`;
}

interface RecursosExternos {
  administradoresOutorgante: AdministradorParaMapear[];
  capitalSocialOutorgante: CapitalSociedade | null;
  pessoas: PessoaRow[];
  matriculas: MatriculaEnriched[];
  resolverInstrumentoOrigem: (ref: string) => { outorganteId: string | null; dataAssinatura: string } | null;
}

const testemunhasContexto = (draft: ExploracaoRuralDraft) => [
  { testemunha: { nome: draft.testemunha1Nome, cpf: draft.testemunha1Cpf, rg: draft.testemunha1Rg } },
  { testemunha: { nome: draft.testemunha2Nome, cpf: draft.testemunha2Cpf, rg: draft.testemunha2Rg } },
].filter((t) => t.testemunha.nome);

function outorganteContexto(draft: ExploracaoRuralDraft, recursos: RecursosExternos): Campos {
  const pessoa = recursos.pessoas.find((p) => p.id === draft.outorganteId);
  if (!pessoa) return { sePF: '', sePJ: '', nome: '', denominacao: '' };
  if (pessoa.tipo_pessoa === 'PJ') {
    const campos = mapearSociedade(pessoa, recursos.capitalSocialOutorgante ?? undefined);
    return {
      ...campos,
      sePJ: 'sim',
      sePF: '',
      administradores: juntarEmProsa(recursos.administradoresOutorgante.map((a) => a.pessoa.denominacao)),
    };
  }
  return { ...qualificarPessoaRural(pessoa, { comFiliacao: false }), sePF: 'sim', sePJ: '' };
}

export function montarContextoParceria(draft: ExploracaoRuralDraft, recursos: RecursosExternos): Contexto {
  const matriculaDe = (id: string | null) => recursos.matriculas.find((m) => m.id === id) ?? null;
  // Uma Parceria tem um único outorgante (confirmado 19/08) — logo um único
  // proprietário/cartório vale pra todos os imóveis do Anexo. Usa o 1º imóvel
  // como referência; nos exemplos reais os dois sempre coincidem.
  const primeiraMatricula = matriculaDe(draft.imoveis[0]?.matriculaId ?? null);
  // Fecho (achado A, relatório 14): outorgante PJ assina uma linha POR
  // administrador ("representada por" cada um), confirmado em dois contratos
  // reais (Agro Aliança) com 2 administradores assinando separado. Sem
  // administrador cadastrado, cai numa linha só com a razão social — nunca some
  // a assinatura da outorgante por falta de dado.
  const outorgantePessoa = recursos.pessoas.find((p) => p.id === draft.outorganteId);
  const outorganteSemAdministrador =
    outorgantePessoa?.tipo_pessoa === 'PJ' && recursos.administradoresOutorgante.length === 0 ? 'sim' : '';
  return {
    naturezaExploracao: draft.incluiPecuaria ? 'AGROPECUÁRIA' : 'AGRÍCOLA',
    naturezaExploracaoPlural: draft.incluiPecuaria ? 'AGROPECUÁRIAS' : 'AGRÍCOLAS',
    outorgante: outorganteContexto(draft, recursos),
    outorganteAdministradores: recursos.administradoresOutorgante.map((a) => ({ admin: { nome: a.pessoa.denominacao } })),
    outorganteSemAdministrador,
    proprietarioComum: primeiraMatricula?.cliente_nome ?? '',
    cartorioComarcaComum: primeiraMatricula?.cartorio_comarca ?? '',
    cartorioUfComum: primeiraMatricula?.cartorio_uf ?? '',
    exploradores: draft.exploradores
      .map((e) => recursos.pessoas.find((p) => p.id === e.pessoaId))
      .filter((p): p is PessoaRow => !!p)
      .map((p) => {
        const campos = qualificarPessoaRural(p, { comFiliacao: true });
        return { explorador: { ...campos, papel: PARES.outorgadoTitulo(campos.genero as Genero) } };
      }),
    imoveis: draft.imoveis.map((item) => ({ imovel: mapearImovelRural(item, matriculaDe(item.matriculaId)) })),
    dataAssinatura: draft.dataAssinatura,
    dataEncerramento: draft.dataEncerramento,
    vigenciaProrrogavel: draft.vigenciaProrrogavel ? 'sim' : '',
    percentualOutorgante: comExtensoPorCento(draft.percentualOutorgante),
    percentualExplorador: comExtensoPorCento(draft.percentualExplorador),
    culturas: draft.culturas,
    permitePenhor: draft.permitePenhor ? 'sim' : '',
    // Fixo, não campo de cadastro: nenhum contrato assinado lido tem ciclo
    // completo, só o template — ver achado 19/08 em 05-modelo-parceria-rural.md.
    // (IMEA é fixo do mesmo jeito, mas foi movido pro bloco como texto literal —
    // ver contratoRuralBlocos.ts — pra não aparecer no preview como se fosse campo.)
    temPecuariaCriaOuEngorda: 'sim',
    foroComarca: draft.foroComarca,
    foroUf: draft.foroUf,
    numeroVias: draft.numeroVias,
    testemunhas: testemunhasContexto(draft),
  };
}

export function montarContextoComposse(draft: ExploracaoRuralDraft, recursos: RecursosExternos): Contexto {
  const matriculaDe = (id: string | null) => recursos.matriculas.find((m) => m.id === id) ?? null;
  const primeiroCompossuidor = draft.compossuidores[0]
    ? recursos.pessoas.find((p) => p.id === draft.compossuidores[0].pessoaId)
    : null;
  const compossuidorParaMapear = (c: CompossuidorDraft) => {
    const pessoa = recursos.pessoas.find((p) => p.id === c.pessoaId);
    if (!pessoa) return null;
    const campos = qualificarPessoaRural(pessoa, { comFiliacao: true });
    return {
      compossuidor: {
        ...campos,
        fracao: comExtensoPorCento(formatarPercentual(Number(c.fracao) || 0)),
        papel: PARES.compossuidorTitulo(campos.genero as Genero),
      },
    };
  };
  // Isoladamente vs. em conjunto NÃO é uma terceira opção de `regraAdministracao` —
  // é derivado de quantos administradores nomeados sobraram. Prova real: o Termo
  // Aditivo do `[ROS-COM]` (docs/osg/contratos_exploracao/notebooklm/
  // exemplo-04-termo-aditivo-rossato.md) muda a MESMA cláusula de "em conjunto por
  // Dilceu Rossato e Catia Regina Randon Rossato" para "isoladamente pela
  // compossuidora Catia Regina Randon" só porque Dilceu deixou de ser compossuidor —
  // de 2 nomeados para 1. Com 1 só, "em conjunto por X;" nem faz sentido gramatical.
  const administradoresNomeadosResolvidos = draft.administradoresNomeados
    .map((a) => recursos.pessoas.find((p) => p.id === a.pessoaId))
    .filter((p): p is PessoaRow => !!p);
  return {
    compossuidores: draft.compossuidores.map(compossuidorParaMapear).filter((c): c is NonNullable<typeof c> => !!c),
    nomeComposse: primeiroCompossuidor ? `${primeiroCompossuidor.denominacao.toUpperCase()} E OUTROS` : '',
    imoveisAlineasRange: alineasProsa(draft.imoveis),
    culturas: draft.culturas,
    permitePenhor: draft.permitePenhor ? 'sim' : '',
    liquidacaoMensal: draft.liquidacaoPeriodicidade === 'mensal' ? 'sim' : '',
    liquidacaoAnual: draft.liquidacaoPeriodicidade === 'anual' ? 'sim' : '',
    liquidacaoNumeroParcelas: draft.liquidacaoNumeroParcelas,
    prazoIndivisao: prazoProsa(draft.prazoIndivisaoQuantidade, draft.prazoIndivisaoUnidade),
    indivisaoProrrogavel: draft.indivisaoProrrogavel ? 'sim' : '',
    indivisaoAvisoPrazo: prazoProsa(draft.indivisaoAvisoQuantidade, draft.indivisaoAvisoUnidade),
    regraMaioria: draft.regraAdministracao === 'maioria' ? 'sim' : '',
    regraNomeados: draft.regraAdministracao === 'nomeados' ? 'sim' : '',
    administradoresNomeados: administradoresNomeadosResolvidos.map((p) => ({ admin: { nome: p.denominacao } })),
    administradorNomeadoUnico: administradoresNomeadosResolvidos.length === 1 ? 'sim' : '',
    administradorNomeadoConjunto: administradoresNomeadosResolvidos.length >= 2 ? 'sim' : '',
    // Empacotado como `{ origem: {...} }` — mesma convenção de `imoveis`/`exploradores`/`compossuidores`
    // (item da seção de repetição sempre entra sob um nome singular), que o bloco do Considerando V espera
    // (`{{ origem.letra }}`, não `{{ letra }}`).
    origensDistintas: agruparOrigensDistintas(draft.imoveis, recursos.resolverInstrumentoOrigem, recursos.pessoas)
      .map((origem) => ({ origem })),
    imoveis: draft.imoveis.map((item) => ({ imovel: mapearImovelRural(item, matriculaDe(item.matriculaId)) })),
    foroComarca: draft.foroComarca,
    foroUf: draft.foroUf,
    dataAssinatura: draft.dataAssinatura,
    numeroVias: draft.numeroVias,
    testemunhas: testemunhasContexto(draft),
  };
}
