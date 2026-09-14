/**
 * O texto que vai para o espaço do Google Chat, e o agrupamento que decide
 * quantas mensagens saem.
 *
 * Puro de propósito, e em `_shared` porque é daqui que a Edge Function alcança
 * (Deno não enxerga `src/`) e é daqui que o vitest roda (ver `SEM_DOM` no
 * `vitest.config.ts`). Nada de rede, nada de Deno: quem posta é o `index.ts`.
 *
 * A ENTRADA É A `avisos_para_o_chat`, uma linha por tarefa, já deduplicada e já
 * com a área resolvida. Este arquivo não sabe o que é `notificacao` nem
 * `notificacao_envio`.
 *
 * OS RÓTULOS SÃO OS DO SINO, copiados de `src/lib/notificacoesInternas.ts` — que
 * por sua vez carregam decisão escrita da Patrícia ("Prazo de tarefa", e não
 * "Prazo próximo", porque o mesmo tipo cobre o aviso de três dias antes e o de
 * vence hoje; 02/09/2026). A mesma coisa chamada pelo mesmo nome nos dois
 * lugares: quem recebe no Chat e depois abre o sino tem de ler a mesma palavra.
 * Não dá para importar o arquivo de lá, então a cópia é deliberada e está
 * marcada nos dois lados.
 */

/** Os quatro tipos que a `avisos_para_o_chat` devolve. */
export type TipoDeAviso =
  | "tarefa_prazo_proximo"
  | "tarefa_atrasada"
  | "tarefa_atribuida"
  | "tarefa_em_revisao";

/** Uma linha de `public.avisos_para_o_chat(...)`. */
export interface AvisoDoChat {
  area_nome: string;
  tipo: TipoDeAviso;
  entidade_id: string;
  task_title: string;
  due_date: string | null;
  project_id: string;
  project_name: string | null;
  dono_nome: string | null;
  chave: string;
}

/**
 * Uma mensagem pronta para um espaço.
 *
 * `chaves` é o que amarra o texto ao registro: são as reservas de
 * `notificacao_envio` que esta mensagem cobre. Uma por TAREFA, mesmo quando a
 * mensagem é um resumo com várias — assim, se o POST falhar, dá para marcar
 * exatamente quais tarefas não saíram, em vez de um "falhou" solto.
 */
export interface MensagemDoChat {
  area: string;
  texto: string;
  threadKey: string;
  chaves: string[];
}

/** Rótulo por tipo. Igual ao do sino. */
const ROTULO: Record<TipoDeAviso, string> = {
  tarefa_prazo_proximo: "Prazo de tarefa",
  tarefa_atrasada: "Tarefa atrasada",
  tarefa_atribuida: "Tarefa atribuída",
  tarefa_em_revisao: "Revisão pendente",
};

/**
 * Os dois que viram RESUMO, e não mensagem avulsa.
 *
 * Eles nascem todos no mesmo minuto, do cron das 11h UTC, enquanto os outros
 * dois nascem de trigger, um de cada vez, ao longo do dia. Agrupar o que já
 * chega em lote é o que separa um aviso de um despejo.
 */
const AGRUPA_EM_RESUMO = new Set<TipoDeAviso>(["tarefa_prazo_proximo", "tarefa_atrasada"]);

/**
 * De qual área para qual rota. É o mesmo par que decide o segredo do webhook, e
 * as duas únicas áreas com projeto (medido em produção em 14/09/2026).
 *
 * Área fora do mapa fica SEM LINK, e não sem mensagem: o link é conveniência, o
 * aviso é o conteúdo. Quem de fato barra área nova é a falta do segredo.
 */
const ROTA_DA_AREA: Record<string, string> = {
  Tax: "tax",
  OSG: "osg",
};

/**
 * `<` e `>` são o que delimita link no Chat, então um título que os contenha
 * comeria o resto da linha. Medido em produção em 14/09/2026: nenhum título de
 * tarefa tem qualquer um dos dois. A troca existe porque título é texto livre
 * digitado por gente, e o dano seria silencioso.
 *
 * `*`, `_` e `~` (negrito, itálico, riscado) NÃO são tratados: também não
 * ocorrem hoje, e o pior caso deles é cosmético dentro da própria linha, não
 * texto sumido.
 */
function semDelimitador(texto: string): string {
  return texto.replace(/</g, "\u2039").replace(/>/g, "\u203a");
}

/** `2026-09-17` -> `17/09`. Sem `Date`, que deslocaria o dia pelo fuso. */
export function dataCurta(iso: string | null): string | null {
  if (!iso) return null;
  const [, mes, dia] = iso.split("-");
  return mes && dia ? `${dia}/${mes}` : null;
}

function linkDaTarefa(aviso: AvisoDoChat, baseUrl: string): string {
  const rota = ROTA_DA_AREA[aviso.area_nome];
  const titulo = semDelimitador(aviso.task_title);
  if (!rota) return titulo;
  return `<${baseUrl}/equipe/${rota}/projetos/tarefas?taskId=${aviso.entidade_id}|${titulo}>`;
}

/** "vence 17/09" ou "venceu 13/09", conforme o aviso seja antes ou depois. */
function prazoEmPalavras(aviso: AvisoDoChat): string | null {
  const data = dataCurta(aviso.due_date);
  if (!data) return null;
  return aviso.tipo === "tarefa_atrasada" ? `venceu ${data}` : `vence ${data}`;
}

function linhaDeResumo(aviso: AvisoDoChat, baseUrl: string): string {
  const partes = [prazoEmPalavras(aviso), aviso.dono_nome, aviso.project_name]
    .filter((p): p is string => Boolean(p))
    .map(semDelimitador);
  return `• ${linkDaTarefa(aviso, baseUrl)}${partes.length ? ` — ${partes.join(" · ")}` : ""}`;
}

function mensagemAvulsa(aviso: AvisoDoChat, baseUrl: string): string {
  const cabecalho = aviso.dono_nome
    ? `*${ROTULO[aviso.tipo]}* — ${semDelimitador(aviso.dono_nome)}`
    : `*${ROTULO[aviso.tipo]}*`;
  const rodape = [aviso.project_name ? semDelimitador(aviso.project_name) : null, prazoEmPalavras(aviso)]
    .filter((p): p is string => Boolean(p))
    .join(" · ");
  return [cabecalho, linkDaTarefa(aviso, baseUrl), rodape].filter(Boolean).join("\n");
}

/**
 * Agrupa por área e monta o texto de cada mensagem.
 *
 * `dia` entra como parâmetro em vez de sair de `new Date()` porque é o mesmo dia
 * que a chave de idempotência carrega, e ele é calculado em `America/Cuiaba`
 * pelo banco. Duas fontes para a mesma data é como um resumo acaba numa thread
 * e a reserva dele em outra.
 *
 * A ORDEM DE SAÍDA segue a ordem de entrada, que a `avisos_para_o_chat` já
 * devolve ordenada por área, tipo e prazo.
 */
export function montarMensagens(
  avisos: AvisoDoChat[],
  baseUrl: string,
  dia: string,
): MensagemDoChat[] {
  const mensagens: MensagemDoChat[] = [];
  const resumos = new Map<string, AvisoDoChat[]>();

  for (const aviso of avisos) {
    if (AGRUPA_EM_RESUMO.has(aviso.tipo)) {
      const grupo = `${aviso.area_nome}:${aviso.tipo}`;
      const atual = resumos.get(grupo);
      if (atual) atual.push(aviso);
      else resumos.set(grupo, [aviso]);
      continue;
    }
    mensagens.push({
      area: aviso.area_nome,
      texto: mensagemAvulsa(aviso, baseUrl),
      // Thread por PROJETO no avulso: é a conversa que a pessoa acompanha.
      threadKey: `projeto:${aviso.project_id}`,
      chaves: [aviso.chave],
    });
  }

  for (const [grupo, doGrupo] of resumos) {
    const primeiro = doGrupo[0];
    const titulo = `*${ROTULO[primeiro.tipo]}* — ${doGrupo.length === 1 ? "1 tarefa" : `${doGrupo.length} tarefas`}`;
    mensagens.push({
      area: primeiro.area_nome,
      texto: [titulo, ...doGrupo.map((a) => linhaDeResumo(a, baseUrl))].join("\n"),
      // O resumo NÃO cabe numa thread de projeto: ele atravessa projetos. A
      // thread dele é do dia, então a varredura de amanhã não empilha no resumo
      // de hoje.
      threadKey: `${grupo}:${dia}`,
      chaves: doGrupo.map((a) => a.chave),
    });
  }

  return mensagens;
}
