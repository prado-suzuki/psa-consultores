/**
 * Grade fixa das abas do dashboard tecnico.
 *
 * Existe para que trocar de aba nao "salte": o valor dentro do painel muda, a
 * posicao dele nao. Antes cada aba tinha a sua grade (2 colunas na Saude, 5 nas
 * outras) e alturas proprias (132, 148, 196, 205, e uma dinamica em funcao do
 * numero de ferramentas), entao cada clique na aba reposicionava tudo.
 *
 * Regra: nenhuma aba define altura ou grade por conta propria. Se um conteudo
 * nao couber, o conteudo rola dentro do painel — a moldura nao cresce.
 */

/** Linha A: dois graficos lado a lado, logo abaixo dos KPIs. */
export const GRADE_TOPO = 'grid gap-3 lg:grid-cols-5';
export const COL_PRINCIPAL = 'lg:col-span-3';
export const COL_APOIO = 'lg:col-span-2';

/** Linha B em diante: dois paineis iguais. */
export const GRADE_DUPLA = 'grid gap-3 lg:grid-cols-2';

/** Area de plotagem dos graficos da linha A. Igual nas tres abas. */
export const ALTURA_GRAFICO = 240;

/** Area rolavel de tabela e de grafico longo (ferramentas, endpoints). */
export const ALTURA_LISTA = 300;

/**
 * Altura minima do corpo do KPI. Um cartao com linha de comparacao e outro sem
 * tem alturas diferentes; sem o piso, a faixa escura muda de altura entre abas
 * e empurra todo o resto da pagina.
 */
export const ALTURA_MIN_KPI = 62;

/**
 * Altura minima do cabecalho do painel (titulo + subtitulo + frase de insight).
 * Painel sem insight ficaria mais baixo que o vizinho na mesma linha.
 */
export const ALTURA_MIN_CABECALHO = 56;
