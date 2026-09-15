/**
 * A ALÇADA CHEGA EM PEÇAS, e o piso se deriva da escada.
 *
 * O caso que este arquivo guarda é a "contratação de prestadores de serviços" do
 * contrato do Zamo, que é a escada completa em uma linha só da Matriz:
 *
 *   Gestão    → até 500 mil, sobe para a Diretoria   (órgão interno, sem cláusula)
 *   Diretoria → até 5 MM, sobe para o Conselho
 *   Conselho  → até 15 MM, sobe para a Reunião de Sócios
 *
 * e cujo contrato registrado escreve, para a Diretoria, "superior a
 * R$ 500.000,00 e até R$ 5.000.000,00". O piso dela é o teto da GESTÃO, que não
 * entra no contrato: é por isso que a derivação olha as células da linha e não
 * os órgãos filtrados. Errar isto não quebra nada — produz uma alínea que
 * afirma poder que a Diretoria não tem, num documento levado a registro.
 */
import { describe, expect, it } from 'vitest';
import { entradaDaGovernanca } from './entradaGovernanca';
import { listasDaGovernanca } from '@/lib/templates/contextoGovernanca';
import { renderConteudo } from '@/lib/templates/render';
import type { Campos, ItemLista } from '@/lib/templates/mapeadores';
import type {
  AtividadeDoCatalogo, Competencia, MatrizDoCliente, PapelDeGovernanca,
} from '@/hooks/useDomainMatrizAlcadas';
import type { OrgaoGovernanca } from '@/hooks/useDomainOrgaoGovernanca';

/*
 * As linhas do banco têm dez colunas de auditoria que não dizem nada sobre a
 * alçada. As fábricas abaixo preenchem o que a derivação lê e mentem o resto,
 * com o cast declarado num lugar só.
 */
const orgao = (id: string, nome: string, noContrato = true): OrgaoGovernanca =>
  ({ id, nome, entra_no_contrato: noContrato, genero: 'M' } as OrgaoGovernanca);

interface CelulaDoTeste {
  orgao: string;
  papeis?: string[];
  naoParticipa?: boolean;
  teto?: number | null;
  unidade?: 'moeda' | 'percentual';
  base?: string | null;
  sobePara?: string | null;
  foraDaPolitica?: boolean;
}

const celula = (c: CelulaDoTeste): Competencia =>
  ({
    id: `${c.orgao}-celula`,
    orgao_id: c.orgao,
    papeis: c.papeis ?? ['papel-decide'],
    nao_participa: c.naoParticipa ?? false,
    alcada_valor: c.teto ?? null,
    alcada_unidade: c.teto === null || c.teto === undefined ? null : (c.unidade ?? 'moeda'),
    alcada_base: c.base ?? null,
    sobe_para_orgao_id: c.sobePara ?? null,
    fora_da_politica: c.foraDaPolitica ?? false,
  } as unknown as Competencia);

const matriz = (celulas: CelulaDoTeste[], atividadeId = 'ativ-servicos'): MatrizDoCliente =>
  ({
    matriz: { id: 'matriz-1' },
    linhas: [{
      id: 'linha-1',
      atividade_id: atividadeId,
      ordem: 1,
      detalhamento: null,
      competencias: celulas.map(celula),
    }],
  } as unknown as MatrizDoCliente);

const ATIVIDADES = [
  { id: 'ativ-servicos', nome: 'Contratação de prestadores de serviços' },
  { id: 'ativ-investimento', nome: 'Investimentos' },
] as unknown as AtividadeDoCatalogo[];

const PAPEIS = [
  { id: 'papel-decide', nome: 'Decide', infinitivo: 'Decidir', grupo: 'Decisão' },
  { id: 'papel-analisa', nome: 'Analisa', infinitivo: 'Analisar', grupo: 'Análise' },
] as unknown as PapelDeGovernanca[];

/** A escada do Zamo: a Gestão é interna e é ela que dá o piso da Diretoria. */
const GESTAO = orgao('gestao', 'Gestão', false);
const DIRETORIA = orgao('diretoria', 'Diretoria');
const CONSELHO = orgao('conselho', 'Conselho de Administração');
const REUNIAO = orgao('reuniao', 'Reunião de Sócios');

const ESCADA_DO_ZAMO: CelulaDoTeste[] = [
  { orgao: 'gestao', teto: 500000, sobePara: 'diretoria' },
  { orgao: 'diretoria', teto: 5000000, sobePara: 'conselho' },
  { orgao: 'conselho', teto: 15000000, sobePara: 'reuniao' },
];

/** Os campos da alínea de um órgão, pelo caminho que o bloco usa. */
function competenciaDe(
  entrada: ReturnType<typeof entradaDaGovernanca>,
  nomeDoOrgao: string,
): Campos {
  const { orgaosComCompetencia } = listasDaGovernanca(entrada);
  const item = orgaosComCompetencia.find((o) => (o.orgao as Campos).nome === nomeDoOrgao);
  if (!item) throw new Error(`órgão sem cláusula no contexto: ${nomeDoOrgao}`);
  const alineas = item.competencias as ItemLista[];
  return alineas[0].competencia as Campos;
}

const escada = (celulas: CelulaDoTeste[] = ESCADA_DO_ZAMO, orgaos = [GESTAO, DIRETORIA, CONSELHO, REUNIAO]) =>
  entradaDaGovernanca(matriz(celulas), orgaos, ATIVIDADES, PAPEIS);

describe('a alçada em peças — a escada do Zamo', () => {
  it('a Diretoria herda o piso da GESTÃO, que não entra no contrato', () => {
    const entrada = escada();
    // A Gestão é interna: não recebe cláusula…
    expect(entrada.orgaos.map((o) => o.nome)).not.toContain('Gestão');
    // …e mesmo assim é o teto dela que vira o piso da Diretoria.
    expect(competenciaDe(entrada, 'Diretoria')).toMatchObject({
      alcadaPiso: '500.000,00',
      alcadaValor: '5.000.000,00',
      temFaixa: 'sim',
      temPiso: 'sim',
      temTeto: 'sim',
      emMoeda: 'sim',
      emPercentual: '',
    });
  });

  it('cada degrau publica o extenso do seu próprio número', () => {
    const diretoria = competenciaDe(escada(), 'Diretoria');
    expect(diretoria.alcadaPisoExtenso).toBe('quinhentos mil reais');
    expect(diretoria.alcadaExtenso).toBe('cinco milhões de reais');
  });

  it('as peças escrevem os textos do contrato registrado', () => {
    const entrada = escada();
    // A faixa do meio da escada. O "superior a" e o "até" são do BLOCO: com a
    // frase pronta de `alcada` ("até R$ 5.000.000,00") não havia como escrever
    // esta linha, e era esse o defeito.
    const faixa = '{{#competencia.temFaixa}}superior a R$ {{ competencia.alcadaPiso }} '
      + 'e até R$ {{ competencia.alcadaValor }}{{/competencia.temFaixa}}';
    expect(renderConteudo(faixa, { competencia: competenciaDe(entrada, 'Diretoria') }))
      .toBe('superior a R$ 500.000,00 e até R$ 5.000.000,00');

    // O topo da escada do contrato: só o piso. Qual das redações cada órgão
    // recebe é escolha da FAMÍLIA (Frente D); a derivação entrega as duas peças.
    const soPiso = 'superior a R$ {{ competencia.alcadaPiso }} ({{ competencia.alcadaPisoExtenso }})';
    expect(renderConteudo(soPiso, { competencia: competenciaDe(entrada, 'Conselho de Administração') }))
      .toBe('superior a R$ 5.000.000,00 (cinco milhões de reais)');
  });

  it('a Reunião de Sócios recebe o piso sem ter teto próprio', () => {
    // Órgão de topo: ninguém acima, então a alçada dele é só "acima de".
    const entrada = escada([...ESCADA_DO_ZAMO, { orgao: 'reuniao', papeis: ['papel-decide'] }]);
    expect(competenciaDe(entrada, 'Reunião de Sócios')).toMatchObject({
      alcadaPiso: '15.000.000,00',
      alcadaValor: '',
      temPiso: 'sim',
      temTeto: '',
      temFaixa: '',
      emMoeda: 'sim',
    });
  });

  it('a escada inteira não gera pendência nenhuma', () => {
    expect(escada().pendencias).toEqual([]);
  });
});

describe('as regras do piso', () => {
  it('duas células apontando para o mesmo órgão: vale o MAIOR teto', () => {
    // É o único valor a partir do qual toda decisão chega a este órgão sem
    // passar por ninguém abaixo. Pegar o menor deixaria a faixa mentir sobre o
    // que já foi decidido em outro lugar.
    const entrada = escada([
      { orgao: 'gestao', teto: 500000, sobePara: 'conselho' },
      { orgao: 'diretoria', teto: 5000000, sobePara: 'conselho' },
      { orgao: 'conselho', teto: 15000000 },
    ]);
    expect(competenciaDe(entrada, 'Conselho de Administração').alcadaPiso).toBe('5.000.000,00');
  });

  it('percentual subindo para moeda: sem faixa, e a linha vira pendência', () => {
    const entrada = escada([
      { orgao: 'diretoria', teto: 10, unidade: 'percentual', base: 'orcamento_aprovado', sobePara: 'conselho' },
      { orgao: 'conselho', teto: 15000000 },
    ]);
    const conselho = competenciaDe(entrada, 'Conselho de Administração');
    expect(conselho.alcadaPiso).toBe('');
    expect(conselho.temPiso).toBe('');
    // O teto continua: o que não dá para escrever é o intervalo.
    expect(conselho.alcadaValor).toBe('15.000.000,00');
    expect(entrada.pendencias).toEqual([
      'Na atividade "Contratação de prestadores de serviços", a alçada de quem sobe e a de quem '
      + 'recebe não se comparam (unidades ou bases diferentes): a alínea sai só com o teto, sem a faixa.',
    ]);
  });

  it('dois percentuais de bases diferentes também não formam intervalo', () => {
    const entrada = escada([
      { orgao: 'diretoria', teto: 10, unidade: 'percentual', base: 'faturamento_ano_anterior', sobePara: 'conselho' },
      { orgao: 'conselho', teto: 20, unidade: 'percentual', base: 'orcamento_aprovado' },
    ]);
    expect(competenciaDe(entrada, 'Conselho de Administração').alcadaPiso).toBe('');
    expect(entrada.pendencias).toHaveLength(1);
  });

  it('percentual sobre a MESMA base forma faixa, com o extenso cartorial', () => {
    const entrada = escada([
      { orgao: 'diretoria', teto: 10, unidade: 'percentual', base: 'orcamento_aprovado', sobePara: 'conselho' },
      { orgao: 'conselho', teto: 20, unidade: 'percentual', base: 'orcamento_aprovado' },
    ]);
    expect(competenciaDe(entrada, 'Conselho de Administração')).toMatchObject({
      alcadaPiso: '10,00',
      alcadaValor: '20,00',
      alcadaPisoPercentualExtenso: 'dez inteiros por cento',
      alcadaPercentualExtenso: 'vinte inteiros por cento',
      alcadaBase: 'do orçamento aprovado',
      emPercentual: 'sim',
      emMoeda: '',
    });
    expect(entrada.pendencias).toEqual([]);
  });

  it('célula que sobe SEM alçada não dá piso a ninguém', () => {
    // Papel de análise que encaminha, ou célula que só trata do que foge da
    // política: não há teto a herdar, e inventar um seria afirmar poder.
    const entrada = escada([
      { orgao: 'diretoria', papeis: ['papel-analisa'], sobePara: 'conselho', foraDaPolitica: true },
      { orgao: 'conselho', teto: 15000000 },
    ]);
    expect(competenciaDe(entrada, 'Conselho de Administração')).toMatchObject({
      alcadaPiso: '', temPiso: '', alcadaValor: '15.000.000,00',
    });
    expect(entrada.pendencias).toEqual([]);
  });

  it('órgão com teto e ninguém apontando para ele sai sem piso', () => {
    const entrada = escada([{ orgao: 'conselho', teto: 15000000 }]);
    expect(competenciaDe(entrada, 'Conselho de Administração')).toMatchObject({
      alcadaPiso: '', temPiso: '', temFaixa: '', temTeto: 'sim',
    });
  });

  it('quem não participa não empresta nem recebe piso', () => {
    // "Não participa" é resposta, não alçada: a célula some da cláusula e não
    // pode influir na de ninguém.
    const entrada = escada([
      { orgao: 'diretoria', naoParticipa: true, teto: 5000000, sobePara: 'conselho' },
      { orgao: 'conselho', teto: 15000000 },
    ]);
    expect(competenciaDe(entrada, 'Conselho de Administração').alcadaPiso).toBe('');
  });

  it('a escada de uma linha não vaza para a linha vizinha', () => {
    const duasLinhas = {
      matriz: { id: 'matriz-1' },
      linhas: [
        {
          id: 'l1', atividade_id: 'ativ-servicos', ordem: 1, detalhamento: null,
          competencias: [
            celula({ orgao: 'diretoria', teto: 500000, sobePara: 'conselho' }),
            celula({ orgao: 'conselho', teto: 5000000 }),
          ],
        },
        {
          id: 'l2', atividade_id: 'ativ-investimento', ordem: 2, detalhamento: null,
          competencias: [celula({ orgao: 'conselho', teto: 9000000 })],
        },
      ],
    } as unknown as MatrizDoCliente;

    const entrada = entradaDaGovernanca(duasLinhas, [DIRETORIA, CONSELHO], ATIVIDADES, PAPEIS);
    const { orgaosComCompetencia } = listasDaGovernanca(entrada);
    const conselho = orgaosComCompetencia
      .find((o) => (o.orgao as Campos).nome === 'Conselho de Administração')!;
    const alineas = (conselho.competencias as ItemLista[]).map((a) => a.competencia as Campos);
    expect(alineas.map((a) => a.alcadaPiso)).toEqual(['500.000,00', '']);
  });
});
