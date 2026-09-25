/**
 * Montagem da ação `abrir_tarefa` devolvida pela edge function `ditar`.
 *
 * O perfil `comentario-para-tarefa` extrai título, descrição e as menções
 * contextuais (responsável, cliente, projeto, horas). Os campos estruturados
 * chegam aqui já interpretados e validados pelo contrato
 * (`interpretarEnriquecimento`); este módulo só os traduz para a resposta HTTP:
 * menções nulas seguem nulas (quem menciona não existe → campo vazio no modal) e
 * horas fora do domínio (não finitas ou ≤ 0) viram null em vez de reprovarem o
 * ditado inteiro — o fallback de degradar para texto comum fica no `ditar`.
 *
 * A IA nunca devolve ID de cadastro: só nomes e valores, resolvidos depois no
 * frontend contra as listas permitidas (`src/lib/resolverTarefaDitada.ts`).
 */
import type { DestinoEnriquecimento, ValorEnriquecido } from './enriquecimentoTexto.ts';

export interface ClassificacaoDitado {
  nome: string;
  versao: number;
  classe: string;
  certeza: 'alta' | 'media' | 'baixa';
}

export interface AcaoAbrirTarefa {
  tipo: 'abrir_tarefa';
  titulo: string;
  descricao: string;
  responsavel_mencionado: string | null;
  cliente_mencionado: string | null;
  projeto_mencionado: string | null;
  horas_estimadas: number | null;
  classificacao: ClassificacaoDitado;
}

type CamposEnriquecidos = Record<
  string,
  { valor: ValorEnriquecido; destino: DestinoEnriquecimento }
>;

function valorDe(campos: CamposEnriquecidos, nome: string): ValorEnriquecido | null {
  return campos[nome]?.valor ?? null;
}

/** Menção textual: null quando ausente, anulada ou vazia; nunca string vazia. */
function mencaoDe(campos: CamposEnriquecidos, nome: string): string | null {
  const valor = valorDe(campos, nome);
  if (!valor || valor.tipo !== 'texto' || valor.texto === null) return null;
  const texto = valor.texto.trim();
  return texto || null;
}

function textoObrigatorio(campos: CamposEnriquecidos, nome: string): string {
  const valor = valorDe(campos, nome);
  if (!valor || valor.tipo !== 'texto' || valor.texto === null || !valor.texto.trim()) {
    throw new Error(`O perfil de tarefa não devolveu o campo obrigatório "${nome}".`);
  }
  return valor.texto;
}

/** Horas faladas: finitas e maiores que zero, ou null. */
function horasDe(campos: CamposEnriquecidos): number | null {
  const valor = valorDe(campos, 'horas_estimadas');
  if (!valor || valor.tipo !== 'numero' || valor.numero === null) return null;
  return Number.isFinite(valor.numero) && valor.numero > 0 ? valor.numero : null;
}

export function montarAcaoTarefa(
  campos: CamposEnriquecidos,
  classificacao: ClassificacaoDitado,
): AcaoAbrirTarefa {
  return {
    tipo: 'abrir_tarefa',
    titulo: textoObrigatorio(campos, 'titulo'),
    descricao: textoObrigatorio(campos, 'descricao'),
    responsavel_mencionado: mencaoDe(campos, 'responsavel_mencionado'),
    cliente_mencionado: mencaoDe(campos, 'cliente_mencionado'),
    projeto_mencionado: mencaoDe(campos, 'projeto_mencionado'),
    horas_estimadas: horasDe(campos),
    classificacao,
  };
}
