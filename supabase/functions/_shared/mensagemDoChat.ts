/**
 * O texto que vai para o espaço do Google Chat, e o agrupamento que decide
 * quantas mensagens saem.
 *
 * Puro de propósito, e em `_shared` porque é daqui que a Edge Function alcança
 * (Deno não enxerga `src/`) e é daqui que o vitest roda (ver `SEM_DOM` no
 * `vitest.config.ts`). Nada de rede, nada de Deno: quem posta é o `index.ts`.
 *
 * A ENTRADA É A `avisos_para_o_chat`, uma linha por tarefa, já deduplicada, já
 * com a área resolvida e já ordenada por área, responsável e prazo — que é
 * exatamente como a mensagem agrupa.
 *
 * ── A FORMA DA MENSAGEM, decidida pela Patrícia em 14/09/2026, olhando as
 * primeiras mensagens no espaço ──
 *
 * PRAZO AGRUPA POR PESSOA, NÃO POR MARCO. A pergunta que um grupo faz é "de quem
 * é a bola", não "o que vence hoje": o nome da pessoa é o cabeçalho, e o marco
 * vai no fim de cada linha. Por isso "vence hoje", "vence em 3 dias" e "atrasada"
 * convivem na mesma mensagem, ao contrário do sino, onde cada aviso é uma linha
 * na caixa de UMA pessoa e o marco é o título.
 *
 * O MARCO É DERIVADO DO PRAZO, e não do tipo do aviso. `tarefa_prazo_proximo`
 * cobre dois marcos (faltam 3 dias e vence hoje) — decisão registrada em
 * `notificacoesInternas.ts` — então o tipo não basta para escrever a frase. Com a
 * data, a frase sai certa mesmo se o cron pular um dia e pegar a tarefa noutro
 * ponto da régua.
 *
 * CADA LINHA CARREGA RESPONSÁVEL, PROJETO, CLIENTE E DATA. O responsável virou o
 * cabeçalho do grupo; os outros três vão na linha.
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
  cliente_nome: string | null;
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

/**
 * Rótulo dos avisos que saem avulsos. Igual ao do sino
 * (`src/lib/notificacoesInternas.ts`), menos o "Você é o responsável" do
 * `tarefa_atribuida`: no sino ele fala com uma pessoa só, e num espaço onde todo
 * mundo lê, "você" não tem a quem se referir.
 */
const ROTULO_AVULSO: Record<string, string> = {
  tarefa_atribuida: "Tarefa atribuída",
  tarefa_em_revisao: "Revisão pendente",
};

/**
 * Os dois tipos que entram no resumo de prazo.
 *
 * Eles nascem no mesmo minuto, do cron das 11h UTC, enquanto os outros dois
 * nascem de trigger, um de cada vez. Agrupar o que já chega em lote é o que
 * separa um aviso de um despejo — e os dois entram na MESMA mensagem porque o
 * agrupamento é por pessoa, e a pessoa é a mesma tenha a tarefa vencido ontem ou
 * vença daqui a três dias.
 */
const E_DE_PRAZO = new Set<TipoDeAviso>(["tarefa_prazo_proximo", "tarefa_atrasada"]);

/**
 * De qual área para qual rota. É o mesmo par que decide o segredo do webhook.
 *
 * Área fora do mapa fica SEM LINK, e não sem mensagem: o link é conveniência, o
 * aviso é o conteúdo. Quem de fato barra área nova é a falta do segredo.
 */
const ROTA_DA_AREA: Record<string, string> = {
  Tax: "tax",
  OSG: "osg",
};

const SEM_DONO = "Sem responsável";

/**
 * Separa os avisos cujo espaço está configurado dos que não têm para onde ir.
 *
 * ISTO ACONTECE ANTES DA RESERVA, e a ordem é o ponto. Reservar e depois marcar
 * `falhou` deixaria a chave de idempotência GRAVADA: a `avisos_para_o_chat`
 * filtra por ela, a tarefa nunca mais é devolvida, e o aviso não sairia nem
 * depois que o espaço daquela área fosse criado.
 *
 * E ligar uma área de cada vez é o caminho NORMAL — o primeiro espaço a existir
 * foi o da OSG, em 14/09/2026. Área sem espaço não é erro: é área que ainda não
 * chegou a vez.
 */
export function separarPorEspaco(
  avisos: AvisoDoChat[],
  temEspaco: (area: string) => boolean,
): { comEspaco: AvisoDoChat[]; semEspaco: Record<string, number> } {
  const comEspaco: AvisoDoChat[] = [];
  const semEspaco: Record<string, number> = {};
  for (const aviso of avisos) {
    if (temEspaco(aviso.area_nome)) {
      comEspaco.push(aviso);
    } else {
      semEspaco[aviso.area_nome] = (semEspaco[aviso.area_nome] ?? 0) + 1;
    }
  }
  return { comEspaco, semEspaco };
}

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
  return texto.replace(/</g, "‹").replace(/>/g, "›");
}

/** `2026-09-17` -> `17/09`. Sem `Date`, que deslocaria o dia pelo fuso. */
export function dataCurta(iso: string | null): string | null {
  if (!iso) return null;
  const [, mes, dia] = iso.split("-");
  return mes && dia ? `${dia}/${mes}` : null;
}

/**
 * Quantos dias separam duas datas ISO.
 *
 * `Date.UTC` a partir das partes, e não `new Date(iso)`: a segunda forma lê a
 * string como instante UTC e, num fuso a oeste, devolve o dia anterior.
 */
function diasEntre(de: string, ate: string): number {
  const [ay, am, ad] = de.split("-").map(Number);
  const [by, bm, bd] = ate.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/**
 * A frase do prazo, derivada da data e não do tipo do aviso.
 *
 * "atrasada desde 08/09", "vence hoje (14/09)", "vence amanhã (15/09)",
 * "vence em 3 dias (17/09)".
 */
export function frasePrazo(dueDate: string | null, hoje: string): string | null {
  const data = dataCurta(dueDate);
  if (!dueDate || !data) return null;
  const dias = diasEntre(hoje, dueDate);
  if (dias < 0) return `atrasada desde ${data}`;
  if (dias === 0) return `vence hoje (${data})`;
  if (dias === 1) return `vence amanhã (${data})`;
  return `vence em ${dias} dias (${data})`;
}

function linkDaTarefa(aviso: AvisoDoChat, baseUrl: string): string {
  const rota = ROTA_DA_AREA[aviso.area_nome];
  const titulo = semDelimitador(aviso.task_title);
  if (!rota) return titulo;
  return `<${baseUrl}/equipe/${rota}/projetos/tarefas?taskId=${aviso.entidade_id}|${titulo}>`;
}

/** Projeto e cliente, na ordem, pulando o que faltar. */
function contexto(aviso: AvisoDoChat): string[] {
  return [aviso.project_name, aviso.cliente_nome]
    .filter((p): p is string => Boolean(p))
    .map(semDelimitador);
}

function linhaDePrazo(aviso: AvisoDoChat, baseUrl: string, hoje: string): string {
  const prazo = frasePrazo(aviso.due_date, hoje);
  const resto = [...contexto(aviso)];
  const cauda = prazo ? [prazo, ...resto] : resto;
  return `• ${linkDaTarefa(aviso, baseUrl)}${cauda.length ? ` — ${cauda.join(" · ")}` : ""}`;
}

function mensagemAvulsa(aviso: AvisoDoChat, baseUrl: string, hoje: string): string {
  const rotulo = ROTULO_AVULSO[aviso.tipo] ?? "Aviso";
  const cabecalho = aviso.dono_nome
    ? `*${rotulo}* · ${semDelimitador(aviso.dono_nome)}`
    : `*${rotulo}*`;
  const prazo = frasePrazo(aviso.due_date, hoje);
  const rodape = [...contexto(aviso), ...(prazo ? [prazo] : [])].join(" · ");
  return [cabecalho, linkDaTarefa(aviso, baseUrl), rodape].filter(Boolean).join("\n");
}

/**
 * A primeira ocorrência de cada tarefa, preservando a ordem.
 *
 * A frase do prazo sai da DATA, então dois avisos da mesma tarefa produzem a
 * mesma linha — ficar com a primeira não perde nada.
 */
function porTarefa(avisos: AvisoDoChat[]): AvisoDoChat[] {
  const vistas = new Set<string>();
  return avisos.filter((a) => {
    if (vistas.has(a.entidade_id)) return false;
    vistas.add(a.entidade_id);
    return true;
  });
}

/** Agrupa preservando a ordem de chegada, que a `avisos_para_o_chat` já ordenou. */
function agruparPor<T>(itens: T[], chave: (item: T) => string): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const item of itens) {
    const k = chave(item);
    const atual = grupos.get(k);
    if (atual) atual.push(item);
    else grupos.set(k, [item]);
  }
  return grupos;
}

/**
 * Agrupa por área e monta o texto de cada mensagem.
 *
 * `hoje` entra como parâmetro em vez de sair de `new Date()` porque é o mesmo dia
 * que a chave de idempotência carrega, e ele é calculado em `America/Cuiaba` pelo
 * banco. Duas fontes para a mesma data é como um resumo acaba numa thread e a
 * reserva dele em outra.
 */
export function montarMensagens(
  avisos: AvisoDoChat[],
  baseUrl: string,
  hoje: string,
): MensagemDoChat[] {
  const mensagens: MensagemDoChat[] = [];
  const prazos: AvisoDoChat[] = [];

  for (const aviso of avisos) {
    if (E_DE_PRAZO.has(aviso.tipo)) {
      prazos.push(aviso);
      continue;
    }
    mensagens.push({
      area: aviso.area_nome,
      texto: mensagemAvulsa(aviso, baseUrl, hoje),
      // Thread por PROJETO no avulso: é a conversa que a pessoa acompanha.
      threadKey: `projeto:${aviso.project_id}`,
      chaves: [aviso.chave],
    });
  }

  for (const [area, daArea] of agruparPor(prazos, (a) => a.area_nome)) {
    const porPessoa = agruparPor(daArea, (a) => a.dono_nome ?? SEM_DONO);
    const corpo: string[] = [];
    for (const [pessoa, tarefas] of porPessoa) {
      corpo.push(`*${semDelimitador(pessoa)}*`);
      // UMA LINHA POR TAREFA, e não por aviso. A mesma tarefa pode ter os dois
      // tipos de prazo no mesmo dia (`tarefa_prazo_proximo` e `tarefa_atrasada`),
      // e antes isso não aparecia porque cada tipo ia para uma mensagem. Agora
      // que convivem na mesma lista, sem isto a tarefa se repete — visto na
      // primeira passada com dados reais, em 14/09/2026.
      //
      // As duas chaves continuam na mensagem (ver `chaves`, abaixo): reservar só
      // uma deixaria a outra viva para ser oferecida de novo amanhã.
      for (const tarefa of porTarefa(tarefas)) {
        corpo.push(linhaDePrazo(tarefa, baseUrl, hoje));
      }
      corpo.push("");
    }
    mensagens.push({
      area,
      texto: [
        `*Prazos · ${area}* — ${daArea.length === 1 ? "1 tarefa" : `${daArea.length} tarefas`}`,
        "",
        ...corpo,
      ].join("\n").trimEnd(),
      // O resumo NÃO cabe numa thread de projeto: ele atravessa projetos e
      // pessoas. A thread dele é do dia, então a varredura de amanhã não empilha
      // no resumo de hoje.
      threadKey: `prazos:${area}:${hoje}`,
      chaves: daArea.map((a) => a.chave),
    });
  }

  return mensagens;
}
