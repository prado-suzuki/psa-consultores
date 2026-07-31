// Fila da aba "Não resolvidos": itens de trabalho tocados no período que o
// sistema NÃO conseguiu ligar a projeto, cliente, OS ou produto contratado.
//
// É a contrapartida acionável do bucket "Sem produto identificado" da aba
// Produtos e do subcontagem de "Clientes atendidos" da aba Produtividade: em vez
// de um número grande que ninguém sabe esvaziar, cada linha diz qual item está
// solto e o que falta preencher para o número fechar.
//
// Funções puras — recebem os mapas que `useDomainOrgTasksProdutividade` já
// resolve e não falam com Supabase. Nada aqui inventa vínculo: item sem dado
// entra na fila, nunca num palpite.

import type { AuditLog } from '@/hooks/useDomainAuditLogs';
import { escapeCsv, type ClientePorId, type VinculoPorId } from '@/lib/auditProdutividade';

export type MotivoPendencia =
  | 'sem_projeto'
  | 'sem_cliente'
  | 'sem_os'
  | 'os_sem_produto'
  | 'sem_servico'
  | 'servico_fora_da_os';

/**
 * Ordem em que os motivos são tratados e exibidos — do item mais solto para o
 * detalhe de cadastro. Um item pode ter mais de um problema; a linha mostra o
 * primeiro desta lista, porque resolver os de cima muitas vezes resolve os de
 * baixo (achar o projeto traz a OS, que traz o produto).
 */
export const MOTIVOS_POR_SEVERIDADE: MotivoPendencia[] = [
  'sem_projeto', 'sem_cliente', 'sem_os', 'os_sem_produto', 'sem_servico', 'servico_fora_da_os',
];

export const MOTIVO_LABELS: Record<MotivoPendencia, string> = {
  sem_projeto: 'Tarefa fora de projeto',
  sem_cliente: 'Sem cliente',
  sem_os: 'Projeto sem OS',
  os_sem_produto: 'OS sem produto contratado',
  sem_servico: 'Sem serviço informado',
  servico_fora_da_os: 'Serviço fora da OS',
};

/** O que fazer para tirar a linha da fila — texto de hover, em linguagem de usuário. */
export const MOTIVO_COMO_RESOLVER: Record<MotivoPendencia, string> = {
  sem_projeto: 'A tarefa não está dentro de nenhum projeto, então não há OS, cliente nem produto para herdar. Mova-a para o projeto certo na tela de Projetos e tarefas.',
  sem_cliente: 'Não há cliente nem contribuinte na tarefa e o projeto dela também não tem. Preencha o contribuinte (CNPJ) no projeto ou o cliente na tarefa — sem isso o trabalho não entra em "Clientes atendidos".',
  sem_os: 'O projeto não está vinculado a nenhuma Ordem de Serviço. Sem OS não existe produto contratado para medir, e o item cai em "Sem produto identificado". Vincule a OS no cadastro do projeto.',
  os_sem_produto: 'O projeto tem OS, mas essa OS não tem nenhum produto contratado cadastrado. Lance os produtos contratados na OS.',
  sem_servico: 'A OS tem mais de um produto contratado e o item não diz qual serviço foi executado, então não há como escolher. Informe o serviço na tarefa ou no projeto.',
  servico_fora_da_os: 'O serviço do item não pertence a nenhum produto contratado nessa OS. Ou o serviço está errado no projeto/tarefa, ou falta esse produto na OS.',
};

export interface LinhaPendencia {
  /** `entity_id` do item — tarefa, subtarefa ou projeto. */
  itemId: string;
  /** `entity_type` bruto; o rótulo sai de `ENTITY_LABELS`. */
  tipo: string;
  /** Nome do item no log mais recente dele. */
  nome: string;
  /** Projeto da tarefa; null em linha de projeto e em tarefa órfã. */
  projetoId: string | null;
  projetoNome: string | null;
  clienteNome: string | null;
  motivo: MotivoPendencia;
  /** ISO do último registro no item dentro do período. */
  ultimoToqueEm: string;
  /** Quem fez esse último registro. */
  ultimoToquePor: string;
}

export interface ResumoPendencias {
  /** Linhas na fila. */
  total: number;
  /** Itens tocados no período que ainda existem — o denominador honesto. */
  itensAvaliados: number;
  porMotivo: Record<MotivoPendencia, number>;
}

export interface EntradaPendencias {
  logs: AuditLog[];
  /** Itens que ainda existem hoje; o resto é log de item apagado e sai da fila. */
  existePorId: Record<string, true>;
  clientePorId: ClientePorId;
  servicoPorId: VinculoPorId;
  osPorId: VinculoPorId;
  produtoPorId: VinculoPorId;
  /** Tarefa → projeto dela. Ausente = tarefa órfã. */
  projetoPorItem: VinculoPorId;
  /** OS → produtos contratados nela. */
  produtosPorOs: Record<string, string[]>;
  nomePorCliente: Record<string, string>;
  nomePorProjeto: Record<string, string>;
  nomePorPessoa: Record<string, string>;
}

function zerarMotivos(): Record<MotivoPendencia, number> {
  return {
    sem_projeto: 0, sem_cliente: 0, sem_os: 0,
    os_sem_produto: 0, sem_servico: 0, servico_fora_da_os: 0,
  };
}

/**
 * O que falta neste item, ou null quando está tudo resolvido.
 *
 * A cadeia do produto segue exatamente a ordem de `resolverProdutoContratado`,
 * então o motivo aponta o elo que quebrou de verdade: sem OS não há o que
 * contratar; com OS vazia não há produto; com OS de vários produtos o serviço é
 * quem decide, e sem ele (ou com serviço que não pertence à OS) o sistema se
 * recusa a escolher no chute.
 */
function motivoDoItem(
  itemId: string,
  ehProjeto: boolean,
  entrada: EntradaPendencias,
): MotivoPendencia | null {
  if (!ehProjeto && !entrada.projetoPorItem[itemId]) return 'sem_projeto';
  if (!entrada.clientePorId[itemId]) return 'sem_cliente';
  if (entrada.produtoPorId[itemId]) return null;

  const os = entrada.osPorId[itemId];
  if (!os) return 'sem_os';
  if (!entrada.produtosPorOs[os]?.length) return 'os_sem_produto';
  if (!entrada.servicoPorId[itemId]) return 'sem_servico';
  return 'servico_fora_da_os';
}

/**
 * Fila e resumo a partir dos logs do período.
 *
 * Um item aparece uma vez só, com o nome e o autor do registro mais recente dele
 * — é o "quem mexeu por último", que é a pessoa a procurar. Item apagado depois
 * não entra: o log dele sobrevive, mas a pendência não tem como ser resolvida.
 *
 * Ordena por severidade do motivo e, dentro dela, do toque mais recente para o
 * mais antigo.
 */
export function agregarPendencias(entrada: EntradaPendencias): {
  linhas: LinhaPendencia[];
  resumo: ResumoPendencias;
} {
  interface UltimoToque {
    tipo: string;
    nome: string;
    em: string;
    por: string;
  }
  const porItem = new Map<string, UltimoToque>();

  for (const log of entrada.logs) {
    if (!entrada.existePorId[log.entity_id]) continue;

    const atual = porItem.get(log.entity_id);
    if (atual && atual.em >= log.performed_at) continue;

    porItem.set(log.entity_id, {
      tipo: log.entity_type,
      nome: log.entity_name,
      em: log.performed_at,
      por: log.performed_by,
    });
  }

  const linhas: LinhaPendencia[] = [];
  const porMotivo = zerarMotivos();

  for (const [itemId, toque] of porItem) {
    const ehProjeto = toque.tipo === 'project';
    const motivo = motivoDoItem(itemId, ehProjeto, entrada);
    if (!motivo) continue;

    const projetoId = ehProjeto ? undefined : entrada.projetoPorItem[itemId];
    const clienteId = entrada.clientePorId[itemId];

    porMotivo[motivo] += 1;
    linhas.push({
      itemId,
      tipo: toque.tipo,
      nome: toque.nome?.trim() || 'Sem nome',
      projetoId: projetoId ?? null,
      projetoNome: projetoId ? entrada.nomePorProjeto[projetoId] ?? 'Projeto fora do alcance' : null,
      clienteNome: clienteId ? entrada.nomePorCliente[clienteId] ?? 'Cliente fora do alcance' : null,
      motivo,
      ultimoToqueEm: toque.em,
      ultimoToquePor: entrada.nomePorPessoa[toque.por]?.trim() || 'Desconhecido',
    });
  }

  linhas.sort((a, b) => {
    const severidade = MOTIVOS_POR_SEVERIDADE.indexOf(a.motivo)
      - MOTIVOS_POR_SEVERIDADE.indexOf(b.motivo);
    if (severidade !== 0) return severidade;
    return b.ultimoToqueEm.localeCompare(a.ultimoToqueEm);
  });

  return {
    linhas,
    resumo: { total: linhas.length, itensAvaliados: porItem.size, porMotivo },
  };
}

export interface DestinoPendencia {
  /** Rota com o deep-link montado — é para onde o clique na linha leva. */
  rota: string;
  /** Palavra do botão: onde o clique cai. */
  curto: 'Tarefa' | 'Projeto' | 'Clientes';
  /** Frase completa para o hover e o leitor de tela. */
  rotulo: string;
}

/**
 * Onde este problema se resolve.
 *
 * Cada motivo aponta para a tela que tem o campo que falta — não para "a tela do
 * item". É por isso que uma tarefa sem serviço manda para o projeto: o serviço é
 * campo do projeto, e abrir a tarefa não resolveria nada.
 *
 * `?taskId=` e `?projectId=` são os deep-links de `PainelTarefas`, que abre o
 * cadastro já no item certo.
 */
export function destinoPendencia(linha: LinhaPendencia, area: 'tax' | 'osg'): DestinoPendencia {
  const base = `/equipe/${area}/projetos`;
  const ehProjeto = linha.tipo === 'project';

  // Produto contratado se lança na OS, e a OS vive no cadastro de Clientes —
  // nem o modal da tarefa nem o do projeto mexem nos produtos da OS.
  if (linha.motivo === 'os_sem_produto') {
    return {
      rota: `${base}/clientes`,
      curto: 'Clientes',
      rotulo: 'Abrir Clientes para lançar o produto contratado na OS',
    };
  }

  // Cliente, contribuinte e projeto da tarefa são campos do modal da tarefa.
  const naTarefa = !ehProjeto && (linha.motivo === 'sem_projeto' || linha.motivo === 'sem_cliente');
  const projetoId = ehProjeto ? linha.itemId : linha.projetoId;

  if (naTarefa || !projetoId) {
    return {
      rota: `${base}/tarefas?taskId=${linha.itemId}`,
      curto: 'Tarefa',
      rotulo: 'Abrir a tarefa para preencher projeto, cliente e contribuinte',
    };
  }

  // OS e serviço são campos do projeto, mesmo quando a linha é de tarefa.
  return {
    rota: `${base}/tarefas?projectId=${projetoId}`,
    curto: 'Projeto',
    rotulo: 'Abrir o cadastro do projeto para vincular OS, serviço e cliente',
  };
}

const CABECALHO_CSV = [
  'item', 'tipo', 'projeto', 'cliente', 'o_que_falta', 'como_resolver',
  'ultimo_toque_por', 'ultimo_toque_em',
];

/** CSV da fila, na mesma ordem em que a tabela mostra as linhas. */
export function buildPendenciasCsv(linhas: LinhaPendencia[]): string {
  const sep = ';';
  const saida = [CABECALHO_CSV.join(sep)];

  for (const linha of linhas) {
    saida.push([
      escapeCsv(linha.nome),
      linha.tipo,
      escapeCsv(linha.projetoNome ?? ''),
      escapeCsv(linha.clienteNome ?? ''),
      escapeCsv(MOTIVO_LABELS[linha.motivo]),
      escapeCsv(MOTIVO_COMO_RESOLVER[linha.motivo]),
      escapeCsv(linha.ultimoToquePor),
      linha.ultimoToqueEm,
    ].join(sep));
  }

  return saida.join('\n');
}
