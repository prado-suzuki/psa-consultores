/**
 * Os órgãos de governança que a OSG usa como padrão.
 *
 * Confirmado pela analista de governança em 01/09/2026: estes três são o padrão
 * interno, e o cliente **acrescenta os dele** por cima. O caso real citado são os
 * gerentes, que um cliente gosta de pôr nas alçadas.
 *
 * São os mesmos três que recebem cláusula de competência no contrato social,
 * medido de forma independente no modelo `VF_Contrato Social - Governança com
 * conselho.docx`: existe "Compete à Reunião de Sócios", "Compete ao Conselho de
 * Administração" e "Compete à Diretoria", e os gerentes aparecem lá apenas como
 * objeto ("aprovar a contratação dos gerentes"), nunca como órgão com
 * competência. Duas fontes independentes, a medição e a analista, deram a mesma
 * lista.
 *
 * POR QUE AQUI E NÃO NUMA TABELA DE REFERÊNCIA. São três nomes que saem dos
 * modelos de contrato e não mudam. Uma tabela traria migration, RLS e uma tela
 * para manter, sem retorno. Isto NÃO é enum de coluna: `orgao_governanca.nome` é
 * texto livre de propósito, e esta lista é só a semente do botão. Se um dia a
 * lista virar coisa viva, promove para tabela sem mexer no schema.
 *
 * Nem todo cliente tem os três: a consultoria avisou em 20/08 que alguns não têm
 * Conselho de Administração, só Diretoria. Por isso o botão SEMEIA, e o
 * consultor apaga o que não se aplica.
 */

import { cardinalExtenso, numeralContrato } from '@/lib/templates/extenso';

export interface OrgaoPadrao {
  nome: string;
  /** Todos os três recebem cláusula no contrato social. */
  entraNoContrato: boolean;
  /**
   * Gênero gramatical do nome, para a cláusula concordar: "o Conselho será
   * compostO" contra "a Diretoria será compostA".
   *
   * Escrito à mão nos três, e não adivinhado, porque aqui é catálogo. Para os
   * órgãos que o cliente inventa, quem adivinha é `generoDoOrgao`.
   */
  genero: 'M' | 'F';
  /**
   * A identidade do padrão, que sobrevive a um rename. Hoje `ehOrgaoPadrao`
   * compara o NOME, então renomear solta a trava de ordem e faz o botão de
   * padrões oferecer criar outro órgão igual.
   */
  chave: 'reuniao_socios' | 'conselho_administracao' | 'diretoria_executiva';
}

export const ORGAOS_GOVERNANCA_PADRAO: readonly OrgaoPadrao[] = [
  { nome: 'Reunião de Sócios', entraNoContrato: true, genero: 'F', chave: 'reuniao_socios' },
  { nome: 'Conselho de Administração', entraNoContrato: true, genero: 'M', chave: 'conselho_administracao' },
  { nome: 'Diretoria Executiva', entraNoContrato: true, genero: 'F', chave: 'diretoria_executiva' },
] as const;

/** Comparação de nome de órgão: sem espaço nas pontas e sem caixa. */
export function mesmaChaveDeOrgao(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('pt-BR') === b.trim().toLocaleLowerCase('pt-BR');
}

/** O mínimo para reconhecer um órgão: como ele se chama e se carrega a chave. */
export interface OrgaoIdentificavel {
  nome: string;
  padrao_chave?: string | null;
}

/**
 * Este órgão É este padrão?
 *
 * A CHAVE MANDA, E O NOME É SÓ A REDE PARA LINHA ANTIGA. Era o contrário até
 * 14/09, e o efeito apareceu na validação: bastou trocar uma letra em "Reunião
 * de Sócios" para o sistema concluir que ela não existia e oferecer criar outra,
 * deixando o cliente com duas. A chave nasceu em 11/09 justamente para
 * sobreviver a um rename, e só o vínculo automático da tela Gerar a usava.
 *
 * Com chave presente a comparação é SÓ por chave, nunca por nome também: um
 * órgão que carrega `diretoria_executiva` e foi renomeado para "Conselho de
 * Administração" continua sendo a Diretoria, e cair no nome faria dele os dois.
 *
 * Sem chave, cai no nome. É o caso do órgão cadastrado antes de 11/09 e do que
 * alguém digitou à mão em vez de usar o botão de padrões.
 */
export function ehEstePadrao(orgao: OrgaoIdentificavel, padrao: OrgaoPadrao): boolean {
  if (orgao.padrao_chave) return orgao.padrao_chave === padrao.chave;
  return mesmaChaveDeOrgao(orgao.nome, padrao.nome);
}

/* --- Gênero do nome do órgão ---------------------------------------------- */

/**
 * O NÚCLEO manda no gênero, e o núcleo é a PRIMEIRA palavra.
 *
 * Eu tinha registrado em 11/09 que o gênero não se deduz do nome, e estava
 * pela metade: não se deduz da TERMINAÇÃO, que foi o que testei ("Conselho de
 * Administração" acaba em palavra feminina, e "gestão" e "órgão" acabam igual
 * sendo uma feminina e outro masculino). Da primeira palavra se deduz.
 *
 * Medido nos sete contratos do acervo: os nomes de órgão que aparecem são
 * "Conselho de Administração" (432 menções), "Reunião de Sócios" (374),
 * "Conselho Consultivo" (10), "Conselho Fiscal" (5) e "Diretoria" (3). Cinco
 * nomes, três núcleos. A lista abaixo cobre os três e mais os que a consultoria
 * pode escrever, e não precisa ser exaustiva: o que ela não souber cai na
 * terminação, e o que a terminação não souber vira pergunta na tela.
 */
const NUCLEOS_MASCULINOS = [
  'conselho', 'comite', 'colegiado', 'grupo', 'nucleo', 'forum', 'orgao', 'departamento',
];

const NUCLEOS_FEMININOS = [
  'diretoria', 'reuniao', 'assembleia', 'gestao', 'presidencia', 'superintendencia',
  'comissao', 'junta', 'mesa', 'camara', 'gerencia', 'coordenacao', 'secretaria',
  'administracao', 'auditoria', 'controladoria',
];

/**
 * Terminações que decidem sozinhas, quando o núcleo é desconhecido.
 *
 * `-ao` está fora de propósito: é justamente a ambígua ("a gestão" contra "o
 * órgão"). `-cao` e `-sao` entram porque aí a ambiguidade some ("a decisão", "a
 * direção"), e por serem mais específicas têm de ser testadas ANTES de `-ao`.
 */
const TERMINACOES_FEMININAS = ['cao', 'sao', 'dade', 'ncia', 'oria', 'agem', 'tude', 'eza', 'ura'];
const TERMINACOES_MASCULINAS = ['mento', 'ismo', 'ario', 'orio'];

/** Sem acento, sem caixa, sem pontuação: a forma em que as listas acima estão. */
function semAcento(palavra: string): string {
  return palavra
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z]/g, '');
}

/**
 * O gênero do nome de um órgão, ou `null` quando não dá para saber.
 *
 * `null` NÃO é "masculino por padrão": é o sinal de que a tela precisa
 * perguntar. Chutar masculino em silêncio é o defeito que isto existe para
 * evitar, porque ele sai no contrato como "A Diretoria será compostO".
 */
export function generoDoOrgao(nome: string): 'M' | 'F' | null {
  const inteiro = nome.trim();
  if (!inteiro) return null;

  // O catálogo vence a adivinhação: nos três padrão o gênero está escrito.
  const padrao = ORGAOS_GOVERNANCA_PADRAO.find((p) => mesmaChaveDeOrgao(p.nome, inteiro));
  if (padrao) return padrao.genero;

  const nucleo = semAcento(inteiro.split(/\s+/)[0] ?? '');
  if (!nucleo) return null;
  if (NUCLEOS_MASCULINOS.includes(nucleo)) return 'M';
  if (NUCLEOS_FEMININOS.includes(nucleo)) return 'F';

  if (TERMINACOES_FEMININAS.some((t) => nucleo.endsWith(t))) return 'F';
  if (TERMINACOES_MASCULINAS.some((t) => nucleo.endsWith(t))) return 'M';
  return null;
}

/** "O Conselho Gestor" / "A Diretoria" — a frase que a tela mostra em vez de perguntar. */
export function comArtigo(nome: string, genero: 'M' | 'F'): string {
  return `${genero === 'F' ? 'A' : 'O'} ${nome.trim()}`;
}

/**
 * "A, B e C" — a juntura de lista em prosa.
 *
 * Gêmea da que `mapeadores.ts` usa para o campo `cargos`. Duplicada de
 * propósito: puxar o mapeador do motor para a tela de cadastro traria junto o
 * vocabulário inteiro, por quatro linhas. Se as duas divergirem, a do motor é a
 * que vale, porque é ela que escreve o documento.
 */
function emProsa(itens: readonly string[]): string {
  if (itens.length === 0) return '';
  if (itens.length === 1) return itens[0];
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

/** "03 (três)" — o numeral do jeito que o contrato lê em voz alta. */
function porExtenso(n: number): string {
  return `${numeralContrato(n)} (${cardinalExtenso(n)})`;
}

/**
 * A cláusula de composição como ela sairia, para a tela mostrar antes de salvar.
 *
 * É PRÉVIA, e não a cláusula de verdade: o texto final vem do bloco que a GOV-C
 * escrever, e pode ter parágrafos que isto não conhece. O que esta função
 * garante é o que depende do cadastro, que é a concordância e os números.
 *
 * A redação segue a do contrato do Mattei, cláusulas sétima e décima terceira:
 * "O Conselho Administração será composto por no mínimo 04 (quatro) e no máximo
 * 07 (sete) membros, com mandato de 02 (dois) anos, admitida a reeleição."
 *
 * Devolve string vazia quando não há o que descrever, e aí a tela diz isso com
 * as próprias palavras em vez de mostrar meia frase.
 */
export function previaDaClausula(p: {
  nome: string;
  genero: 'M' | 'F' | null;
  membros_minimo?: number | null;
  membros_maximo?: number | null;
  mandato_anos?: number | null;
  cargos_do_orgao?: string[] | null;
}): string {
  const nome = p.nome.trim();
  if (!nome || !p.genero) return '';

  const { membros_minimo: min, membros_maximo: max } = p;
  let membros = '';
  // Mínimo igual ao máximo encolhe a frase, que é a redação do Horita e do
  // Bela Vista: "composto por 03 (três) membros".
  if (min != null && max != null) {
    membros = min === max
      ? `por ${porExtenso(min)} membros`
      : `por no mínimo ${porExtenso(min)} e no máximo ${porExtenso(max)} membros`;
  } else if (min != null) membros = `por no mínimo ${porExtenso(min)} membros`;
  else if (max != null) membros = `por até ${porExtenso(max)} membros`;

  const temMandato = p.mandato_anos != null;
  if (!membros && !temMandato) return '';

  const composto = p.genero === 'F' ? 'composta' : 'composto';
  let frase = membros
    ? `${comArtigo(nome, p.genero)} será ${composto} ${membros}`
    : `${comArtigo(nome, p.genero)} terá mandato`;

  const cargos = (p.cargos_do_orgao ?? []).filter(Boolean);
  if (cargos.length > 0) frase += `, sendo ${emProsa(cargos)}`;

  if (temMandato) {
    frase += membros
      ? `, com mandato de ${porExtenso(p.mandato_anos!)} anos, sendo admitida a reeleição`
      : ` de ${porExtenso(p.mandato_anos!)} anos, sendo admitida a reeleição`;
  }

  return `${frase}.`;
}

/**
 * "3 a 6 membros · mandato de 3 anos · Presidente, Secretário".
 *
 * A linha que a lista de órgãos mostra sob o nome, para conferir a
 * parametrização sem abrir o modal. Vazia quando não há nada preenchido, e aí a
 * tela não desenha nada em vez de desenhar um travessão.
 */
export function resumoDoOrgao(p: {
  membros_minimo?: number | null;
  membros_maximo?: number | null;
  mandato_anos?: number | null;
  cargos_do_orgao?: string[] | null;
}): string {
  const partes: string[] = [];

  const { membros_minimo: min, membros_maximo: max } = p;
  // Mínimo igual ao máximo é número fixo, e a cláusula escreve assim também.
  if (min != null && max != null) partes.push(min === max ? `${min} membros` : `${min} a ${max} membros`);
  else if (min != null) partes.push(`a partir de ${min} membros`);
  else if (max != null) partes.push(`até ${max} membros`);

  if (p.mandato_anos != null) {
    partes.push(`mandato de ${p.mandato_anos} ${p.mandato_anos === 1 ? 'ano' : 'anos'}`);
  }

  const cargos = (p.cargos_do_orgao ?? []).filter(Boolean);
  if (cargos.length > 0) partes.push(cargos.join(', '));

  return partes.join(' · ');
}

/**
 * Quais padrões ainda faltam numa lista já cadastrada.
 *
 * O botão de semear acrescenta só o que falta, e não o pacote inteiro: assim ele
 * continua útil depois da primeira vez, e clicar duas vezes não duplica. Um botão
 * que só aparecesse com a lista vazia apareceria uma vez na vida e sumiria, sem
 * jeito de trazer de volta um padrão apagado por engano.
 */
export function padroesFaltando(existentes: readonly OrgaoIdentificavel[]): OrgaoPadrao[] {
  return ORGAOS_GOVERNANCA_PADRAO.filter(
    (padrao) => !existentes.some((orgao) => ehEstePadrao(orgao, padrao)),
  );
}

/**
 * Mensagem de erro legível para o cadastro de órgão.
 *
 * Sem isto, o `toast` mostra a mensagem crua do Postgres, do tipo
 * `duplicate key value violates unique constraint "orgao_governanca_nome_uq"`.
 * É o mesmo defeito que a criação de tarefa carregava e que apareceu na
 * validação de 31/08: erro de banco chegando à tela em vocabulário de banco.
 *
 * Traduz o que a tabela pode recusar e preserva o resto, para não engolir erro
 * desconhecido num texto genérico.
 */
export function erroDeOrgaoGovernanca(erro: unknown): string {
  const mensagem = erro instanceof Error
    ? erro.message
    : typeof erro === 'string'
      ? erro
      : (erro as { message?: string })?.message ?? '';

  if (mensagem.includes('orgao_governanca_nome_uq')) {
    return 'Este cliente já tem um órgão com esse nome.';
  }
  if (mensagem.includes('orgao_governanca_nome_ck')) {
    return 'O nome do órgão não pode ficar em branco.';
  }
  if (mensagem.includes('orgao_governanca_vigencia_ck')) {
    return 'O fim da vigência não pode ser antes do início.';
  }
  if (mensagem.includes('row-level security')) {
    return 'Você não tem permissão para alterar os órgãos deste cliente.';
  }
  return mensagem || 'Não foi possível salvar o órgão. Tente novamente.';
}

/** É um dos três padrão da OSG? Reconhece pela chave, com o nome de rede. */
export function ehOrgaoPadrao(orgao: OrgaoIdentificavel): boolean {
  return ORGAOS_GOVERNANCA_PADRAO.some((p) => ehEstePadrao(orgao, p));
}

/**
 * A hierarquia está arrumada?
 *
 * Arrumada quer dizer: os padrão que existem ocupam as primeiras posições, na
 * ordem oficial, e os do cliente vêm depois. No contrato social a ordem dos três
 * é dada (Reunião de Sócios, Conselho de Administração, Diretoria Executiva), e a
 * consultoria confirmou em 03/09/2026 que órgão de cliente nunca fica acima
 * deles.
 *
 * Serve para o botão de padrões continuar aparecendo quando os três já existem
 * mas estão fora de lugar, que é o caso de quem cadastrou um deles à mão em vez
 * de usar o botão.
 */
export function hierarquiaArrumada(naOrdem: readonly OrgaoIdentificavel[]): boolean {
  const padroesPresentes = ORGAOS_GOVERNANCA_PADRAO
    .filter((p) => naOrdem.some((o) => ehEstePadrao(o, p)));

  const topo = naOrdem.slice(0, padroesPresentes.length);
  return padroesPresentes.every((p, i) => !!topo[i] && ehEstePadrao(topo[i], p));
}
