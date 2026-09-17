import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

import { cardinalExtenso, letraAlinea } from './extenso';
import {
  mapearAcordoQuotistas, mapearPessoa, mapearSociedade,
  type AcordoParaMapear, type Campos, type ItemLista,
} from './mapeadores';

/**
 * O contexto do Acordo de Quotistas para o motor: os parâmetros do acordo e as
 * cinco listas dele.
 *
 * Esta camada é PURA, no molde de `contextoGovernanca.ts` e `contextoRural.ts`:
 * quem vai ao banco é o controller, e aqui só se arruma o que ele trouxe. É o
 * que permite conferir uma cláusula contra o documento real sem subir banco, e
 * foi assim que apareceu o defeito das condicionais em 15/09.
 *
 * E NÃO PUXA OS RÓTULOS DA TELA, que é o acoplamento que importa evitar aqui. O
 * cadastro (`lib/acordoGrupos`) tem as palavras do FORMULÁRIO, e o documento usa
 * outras para as mesmas chaves: a tela diz "Equipamentos" e o acordo escreve
 * "implementos"; a tela diz "Imóveis" e o acordo escreve "bens imóveis". Puxar
 * de lá colocaria a linguagem do formulário dentro do contrato, e amarraria a
 * redação a uma mexida de rótulo na tela.
 *
 * (`PessoaRow` vem de fora, como em `mapeadores.ts`: é o formato da linha do
 * banco, não vocabulário de tela.)
 */

/* --- O vocabulário do DOCUMENTO, que não é o da tela ------------------------ */

/*
 * Os objetos sujeitos à preferência, com a palavra que o acordo usa.
 *
 * Literal do AgroAliança, 1.1.8: o direito "de adquirirem, com prioridade sobre
 * TERCEIROS e demais QUOTISTAS, as QUOTAS, bens imóveis, máquinas, implementos,
 * participações em SOCIEDADES RELACIONADAS e oportunidades de negócio".
 */
const OBJETO_NO_DOCUMENTO: Record<string, string> = {
  quotas: 'as QUOTAS',
  imoveis: 'bens imóveis',
  maquinas: 'máquinas',
  equipamentos: 'implementos',
  participacoes: 'participações em SOCIEDADES RELACIONADAS',
  oportunidades: 'oportunidades de negócio',
};

/*
 * Os métodos de apuração, idem.
 *
 * A dupla avaliação não é um terceiro cálculo: é mandar fazer os dois e ficar
 * com o maior, que é o "maior valor" que todos os acordos que combinam escrevem.
 */
const METODO_NO_DOCUMENTO: Record<string, string> = {
  patrimonio_liquido: 'o patrimônio líquido',
  fluxo_de_caixa_descontado: 'o fluxo de caixa descontado',
  dupla_avaliacao: 'a dupla avaliação, prevalecendo o maior valor',
};

/**
 * Lista em prosa com "e" antes do último, que é como o documento enumera.
 *
 * "as QUOTAS, bens imóveis, máquinas, implementos, participações em SOCIEDADES
 * RELACIONADAS e oportunidades de negócio" — vírgula entre todos e "e" só no
 * fim, sem vírgula antes dele.
 */
function emProsa(itens: string[]): string {
  if (itens.length === 0) return '';
  if (itens.length === 1) return itens[0];
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

/** Traduz as chaves gravadas para as palavras do documento, na ordem do catálogo. */
function prosaDasChaves(chaves: readonly string[], vocabulario: Record<string, string>): string {
  const ordem = Object.keys(vocabulario);
  const escolhidas = ordem.filter((c) => chaves.includes(c)).map((c) => vocabulario[c]);
  return emProsa(escolhidas);
}

/* --- O que o controller entrega -------------------------------------------- */

/** Uma linha de `acordo_quorum`, já com a expressão montada pelo cadastro. */
export interface QuorumParaMapear {
  /**
   * A chave do catálogo (`alterar_contrato_social`…), que diz ONDE ele escreve.
   * Nula na linha que o consultor acrescentou à mão, que não tem lugar fixo.
   */
  chave: string | null;
  materia: string;
  /** "¾ (três quartos) do capital social", de `expressaoDoQuorum`. */
  expressao: string;
  /** Só a quantidade: "75% (setenta e cinco por cento)", "a maioria". */
  quantidade: string;
  /** A mesma quantidade em fração, para o aumento de capital. */
  quantidadeEmFracao: string;
  ordem: number;
}

/** Uma linha de `acordo_ramo_familiar`. Só o nome se digita. */
export interface RamoParaMapear {
  nome: string;
  ordem: number;
}

/** Uma linha de `acordo_ordem_preferencia`. */
export interface PreferenteParaMapear {
  quem: string;
  ordem: number;
}

export interface EntradaAcordo {
  /** O cabeçalho, como o mapeador o espera, menos o que se deriva das listas. */
  acordo: Omit<AcordoParaMapear, 'temRamos' | 'quantosRamos'
    | 'ordemPreferencia' | 'objetosPreferencia'>;
  quoruns: QuorumParaMapear[];
  ramos: RamoParaMapear[];
  ordemPreferencia: PreferenteParaMapear[];
  /** Os quotistas que assinaram a PRIMEIRA versão, já qualificados. */
  signatarios: PessoaRow[];
  /** As outras empresas do grupo alcançadas pelo acordo. */
  /** As chaves de `objetos_preferencia`, para virar prosa aqui. */
  objetosPreferencia?: readonly string[] | null;
}

/* --- A saída ---------------------------------------------------------------- */

/**
 * A definição de um ramo, como o acordo a escreve.
 *
 * AgroAliança, 1.1.7: "(a) DESCENDENTES DE CRISTINA, formado por CRISTINA e seus
 * descendentes em linha vertical". O rótulo e a definição saem os dois do nome,
 * porque a frase depois da vírgula é fixa no modelo: o que varia é quem é o
 * fundador.
 *
 * Em caixa alta porque é termo definido, e o acordo repete termo definido em
 * caixa alta o documento inteiro.
 */
function ramoNoDocumento(nome: string): { rotulo: string; definicao: string } {
  const fundador = nome.trim().toUpperCase();
  return {
    rotulo: `DESCENDENTES DE ${fundador}`,
    definicao: `formado por ${fundador} e seus descendentes em linha vertical`,
  };
}

/** Os campos do binding `acordo`, com o que se deduz das listas já dentro. */
/**
 * O QUÓRUM DE CADA MATÉRIA, no campo da matéria dela.
 *
 * Os sete quóruns do cadastro NÃO são sete alíneas de uma lista, e supor isso
 * teria produzido documento errado. Cruzado com o modelo, linha a linha:
 *
 *   ordinaria                       alínea "para as demais matérias"
 *   alterar_contrato_social         alínea dos 75%
 *   nomear_administrador_nao_socio  DUAS alíneas, porque o modelo separa o caso
 *                                   do capital integralizado do não integralizado
 *   destituir_administrador         alínea da maioria
 *   aumento_de_capital              FORA da escada, na Cláusula Quarta
 *   reuniao_previa                  FORA da escada, na Cláusula Vigésima Quarta
 *   instalacao                      não aparece no Acordo; é regra do contrato
 *                                   social (art. 1.074 do Código Civil)
 *
 * Por isso cada um vira um campo com o nome da chave, e o bloco cita o seu. Um
 * laço `{{#quoruns}}` escreveria os sete em fila num lugar só, o que o modelo
 * não faz em nenhum acordo do acervo.
 */
const CHAVES_DE_QUORUM = [
  'instalacao', 'ordinaria', 'alterar_contrato_social', 'nomear_administrador_nao_socio',
  'destituir_administrador', 'aumento_de_capital', 'reuniao_previa',
] as const;

/** `alterar_contrato_social` vira `quorumAlterarContratoSocial`. */
function nomeDoCampo(chave: string): string {
  const camel = chave.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  return `quorum${camel[0].toUpperCase()}${camel.slice(1)}`;
}

function quorunsPorChave(quoruns: readonly QuorumParaMapear[]): Campos {
  const out: Campos = {};
  /*
   * AS SETE SAEM SEMPRE, vazias quando a linha não existe.
   *
   * Mesma regra de `publicarOpcionais`, e pelo mesmo motivo: placeholder AUSENTE
   * derruba o documento inteiro, placeholder vazio só deixa a frase sem o
   * número. Um acordo antigo, ou um em que alguém apagou uma linha, não pode
   * levar o documento junto. Foi o teste do acordo vazio que cobrou.
   */
  for (const chave of CHAVES_DE_QUORUM) {
    out[nomeDoCampo(chave)] = '';
    out[`${nomeDoCampo(chave)}Fracao`] = '';
  }
  for (const q of quoruns) {
    /*
     * SEM CHAVE, o quórum não vira campo. `acordo_quorum.chave` é ANULÁVEL: o
     * catálogo semeia as sete com chave, mas a tela deixa acrescentar linha
     * livre, e essa não tem lugar fixo no documento. Sem esta guarda, uma linha
     * dessas derrubava a geração inteira com "Cannot read properties of
     * undefined", e foi o teste da cadeia que pegou.
     */
    if (!q.chave) continue;
    out[nomeDoCampo(q.chave)] = q.quantidade;
    out[`${nomeDoCampo(q.chave)}Fracao`] = q.quantidadeEmFracao;
  }
  return out;
}

export function camposDoAcordo(entrada: EntradaAcordo): Campos {
  const objetos = entrada.objetosPreferencia ?? [];
  /*
   * A ORDEM IMPORTA, e ela me pegou. `mapearAcordoQuotistas` passa por
   * `publicarOpcionais`, que publica '' para todo campo declarado e não
   * preenchido, e os quóruns agora são campos declarados. Com eles antes, os
   * vazios do mapeador sobrescreviam os valores de verdade e o documento saía
   * com a lacuna no lugar do número, sem erro nenhum.
   */
  return {
    ...mapearAcordoQuotistas({
    ...entrada.acordo,
    temRamos: entrada.ramos.length > 0,
    quantosRamos: entrada.ramos.length || null,
    /*
     * A FILA EM PROSA, para a cláusula que a diz numa frase só. A mesma fila sai
     * como lista, para o bloco que quer uma alínea por posição; as duas vêm da
     * mesma tabela, e por isso se montam no mesmo lugar.
     */
    ordemPreferencia: emProsa(
      [...entrada.ordemPreferencia].sort((a, b) => a.ordem - b.ordem).map((p) => p.quem),
    ) || null,
    objetosPreferencia: prosaDasChaves(objetos, OBJETO_NO_DOCUMENTO) || null,
    objetosPreferenciaChaves: [...objetos],
    }),
    ...quorunsPorChave(entrada.quoruns),
  };
}

/**
 * A apuração de haveres em prosa, para o bloco que a escreve numa frase.
 *
 * Separada de `camposDoAcordo` porque não é campo do cadastro: é a tradução dos
 * métodos marcados para as palavras do documento. Quem a quiser usa
 * `{{ acordo.metodosEmProsa }}`.
 */
export function metodosEmProsa(chaves: readonly string[] | null | undefined): string {
  return prosaDasChaves(chaves ?? [], METODO_NO_DOCUMENTO);
}

/**
 * As cinco listas do acordo, prontas para as seções de repetição.
 *
 * TODAS ELAS GANHAM `alinea` E `ordem`, mesmo as que hoje nenhum bloco numera.
 * O custo é uma linha por lista, e o contrário custa caro: descobrir que falta a
 * letra ao escrever a cláusula significa voltar aqui, e enquanto isso o bloco
 * resolve `{{ quorum.alinea }}` como string vazia e a alínea sai sem letra, sem
 * erro nenhum na tela.
 */
export function listasDoAcordo(entrada: EntradaAcordo): Record<string, ItemLista[]> {
  const porOrdem = <T extends { ordem: number }>(l: readonly T[]) =>
    [...l].sort((a, b) => a.ordem - b.ordem);

  const quorunsDoAcordo: ItemLista[] = porOrdem(entrada.quoruns).map((q, i) => ({
    quorum: {
      materia: q.materia,
      expressao: q.expressao,
      // `letraAlinea` é 1-based: a alínea 1 é "a".
      alinea: letraAlinea(i + 1),
      ordem: String(i + 1),
    } as Campos,
  }));

  const ramosFamiliares: ItemLista[] = porOrdem(entrada.ramos).map((r, i) => ({
    ramo: {
      nome: r.nome.trim(),
      ...ramoNoDocumento(r.nome),
      alinea: letraAlinea(i + 1),
      ordem: String(i + 1),
    } as Campos,
  }));

  const ordemDaPreferencia: ItemLista[] = porOrdem(entrada.ordemPreferencia).map((p, i) => ({
    preferente: {
      quem: p.quem,
      alinea: letraAlinea(i + 1),
      ordem: String(i + 1),
    } as Campos,
  }));

  /*
   * OS SIGNATÁRIOS SÃO PESSOA, e por isso passam pelo mapeador de pessoa: o
   * documento os qualifica por inteiro no preâmbulo, com nacionalidade, estado
   * civil, CPF e endereço, como faz com os sócios do contrato. Montar aqui um
   * objeto só com o nome daria um preâmbulo sem qualificação, que é documento
   * que a Junta devolve.
   */
  const quotistasSignatarios: ItemLista[] = entrada.signatarios.map((p, i) => ({
    quotista: { ...mapearPessoa(p), ordem: String(i + 1) } as Campos,
  }));

  return {
    quorunsDoAcordo,
    ramosFamiliares,
    ordemDaPreferencia,
    quotistasSignatarios,
  };
}

/**
 * Quantos ramos por extenso, para quem precisar fora do contexto montado.
 *
 * O motor já entrega `acordo.quantosRamosExtenso`; esta existe para o teste e
 * para quem montar um contexto à mão.
 */
export function quantosRamosExtenso(quantos: number): string {
  return quantos > 0 ? cardinalExtenso(quantos) : '';
}
