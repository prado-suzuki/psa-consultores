/**
 * O que o Acordo de Quotistas mostra em prosa, e o que ele registra no log.
 *
 * Mesmo papel do `matrizAlcadas.ts`: transformar linha de banco em frase de
 * gente. A auditoria da GOV-02 ensinou o porquê, e vale igual aqui. Registrar
 * "acordo_quorum: 3 linhas alteradas" obrigaria quem lê o log meses depois a
 * abrir o banco e remontar o que mudou; registrar "Alterar o contrato social:
 * antes ¾ (três quartos) dos presentes, depois a maioria dos presentes" já é a
 * resposta.
 *
 * Tudo aqui é puro. O hook chama, a tela chama, e o teste não precisa de banco.
 */

import {
  MECANISMOS,
  expressaoDoQuorum,
  type BaseQuorum,
  type ChaveMecanismo,
  type TipoQuorum,
} from '@/lib/acordoQuotistasPadrao';

/** O bastante de um quórum para escrevê-lo. */
export interface QuorumLegivel {
  materia: string;
  tipo: TipoQuorum;
  percentual?: number | null;
  base: BaseQuorum;
}

/** "Alterar o contrato social: ¾ (três quartos) dos presentes" */
export function resumoDoQuorum(q: QuorumLegivel): string {
  return `${q.materia}: ${expressaoDoQuorum(q)}`;
}

/** Os sete numa linha só, para caber num campo de log. */
export function resumoDosQuoruns(lista: readonly QuorumLegivel[]): string {
  return lista.length === 0 ? 'nenhum' : lista.map(resumoDoQuorum).join(' · ');
}

/*
 * "DESCENDENTES DE JOÃO", que é o único rótulo que documento algum usa.
 *
 * Havia escolha entre "RAMO [nome]" e "DESCENDENTES DE [nome]", e ela veio do
 * levantamento de 11/09 (`docs/osg/campos-governanca.md`). Contado nos 14
 * documentos do acervo, sete acordos e sete contratos: "RAMO [nome]" como grupo
 * da família aparece em ZERO, e "ramo" com o sentido de ramo de ATIVIDADE
 * aparece em três acordos. Imprimir "RAMO BOCOLLI" num documento que usa a
 * palavra para linha de negócio é colisão de vocabulário.
 *
 * O MOCKUP JÁ TINHA DERRUBADO ISSO, e eu reintroduzi. Está escrito em
 * `src/previews/cadastroGovernancaDados.ts`, na branch do mockup: "as duas
 * opções de cima estão escritas em documento; 'ramo familiar' não estava em
 * nenhum, e foi retirada".
 */
export function rotuloDoRamo(ramo: { nome: string }): string {
  const nome = ramo.nome.trim().toLocaleUpperCase('pt-BR');
  return `DESCENDENTES DE ${nome}`;
}

export function resumoDosRamos(lista: readonly { nome: string }[]): string {
  return lista.length === 0 ? 'nenhum' : lista.map(rotuloDoRamo).join(', ');
}

/** "1. Holding · 2. Descendentes dos signatários · 3. Demais quotistas" */
export function resumoDaOrdem(lista: readonly { quem: string; ordem: number }[]): string {
  if (lista.length === 0) return 'nenhuma';
  return [...lista]
    .sort((a, b) => a.ordem - b.ordem)
    .map((o, i) => `${i + 1}. ${o.quem}`)
    .join(' · ');
}

/** Os mecanismos marcados, pelo rótulo que a tela mostra e não pela chave. */
export function resumoDosMecanismos(chaves: readonly string[] | null | undefined): string {
  const marcados = (chaves ?? [])
    .map((c) => MECANISMOS.find((m) => m.chave === c))
    .filter((m): m is (typeof MECANISMOS)[number] => !!m)
    .map((m) => m.rotulo);
  return marcados.length === 0 ? 'nenhum' : marcados.join(', ');
}

/* --- O diff que vai para o log ---------------------------------------------- */

/** Como cada campo do acordo se chama para quem lê o histórico. */
const ROTULO_DO_CAMPO: Record<string, string> = {
  data_referencia: 'Data de referência',
  assinado_em: 'Assinado em',
  vigencia_anos: 'Vigência, em anos',
  prazo_sigilo_anos: 'Prazo de sigilo, em anos',
  metodos_avaliacao: 'Métodos de avaliação da quota',
  // Os quatro numeros da apuracao de haveres nao estao aqui porque nao sao
  // campo: 60 dias em 7 de 7, 05 anos em 3 de 3, IPCA e "maior valor" nos que
  // citam. Texto fixo do modelo, e as colunas saem na migration de 15/09.
  consolida_composse: 'Consolida composse na avaliação',
  nao_concorrencia: 'Cláusula de não concorrência',
  nao_concorrencia_prazo_anos: 'Prazo da não concorrência, em anos',
  nao_concorrencia_area: 'Área protegida pela não concorrência',
  nao_concorrencia_multa: 'Multa por descumprimento',
  nao_concorrencia_alcanca_parentes: 'A não concorrência alcança parentes e sócios',
  opcao_compra_prevista: 'Opção de compra prevista',
  opcao_compra_quem: 'Quem detém a opção de compra',
  opcao_compra_preco: 'Preço na opção de compra',
  opcao_venda_prevista: 'Opção de venda prevista',
  objetos_preferencia: 'Objetos sujeitos à preferência',
  juros_valor_subscrito: 'Juros sobre o valor subscrito',
  reuniao_previa_obrigatoria: 'Reunião prévia obrigatória',
  solucao_litigios: 'Solução de litígios',
  camara_arbitral: 'Câmara arbitral',
  prazo_indicacao_arbitros_dias: 'Prazo para indicação de árbitros, em dias',
  representante_pessoa_id: 'Representante dos quotistas',
  mecanismos: 'Mecanismos presentes',
};

/** Um valor de banco como ele se lê. Nulo não é "null", é "em branco". */
function valorLegivel(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return 'em branco';
  if (typeof valor === 'boolean') return valor ? 'sim' : 'não';
  if (Array.isArray(valor)) {
    if (valor.length === 0) return 'nenhum';
    return campo === 'mecanismos' ? resumoDosMecanismos(valor as string[]) : valor.join(', ');
  }
  return String(valor);
}

/**
 * O que mudou entre duas versões do acordo, campo a campo e em nome de gente.
 *
 * Só olha os campos que a tela oferece: `id`, `cliente_id`, `versao`, `excluido`
 * e os quatro de auditoria não entram, porque nenhum deles é coisa que o
 * consultor tenha alterado ao salvar o formulário.
 */
export function diffDoAcordo(
  antes: Record<string, unknown>,
  depois: Record<string, unknown>,
): Record<string, { old: string; new: string }> {
  const mudou: Record<string, { old: string; new: string }> = {};
  for (const campo of Object.keys(ROTULO_DO_CAMPO)) {
    if (!(campo in depois)) continue;
    const de = antes[campo] ?? null;
    const para = depois[campo] ?? null;
    if (JSON.stringify(de) === JSON.stringify(para)) continue;
    mudou[ROTULO_DO_CAMPO[campo]] = {
      old: valorLegivel(campo, de),
      new: valorLegivel(campo, para),
    };
  }
  return mudou;
}

/**
 * O mesmo para as listas filhas, que são substituídas inteiras.
 *
 * Uma entrada por lista, e não uma por linha: quem lê quer saber que a ordem da
 * preferência mudou e como ela ficou, não que a linha 2 virou linha 3.
 */
export function diffDasListas(
  antes: { quoruns: string; ramos: string; ordem: string },
  depois: { quoruns: string; ramos: string; ordem: string },
): Record<string, { old: string; new: string }> {
  const mudou: Record<string, { old: string; new: string }> = {};
  const pares: [string, keyof typeof antes][] = [
    ['Quóruns', 'quoruns'],
    ['Ramos familiares', 'ramos'],
    ['Ordem do direito de preferência', 'ordem'],
  ];
  for (const [rotulo, chave] of pares) {
    if (antes[chave] !== depois[chave]) {
      mudou[rotulo] = { old: antes[chave], new: depois[chave] };
    }
  }
  return mudou;
}

/** As chaves de mecanismo que a tela conhece, para validar o que vem de fora. */
export function mecanismoConhecido(chave: string): chave is ChaveMecanismo {
  return MECANISMOS.some((m) => m.chave === chave);
}
