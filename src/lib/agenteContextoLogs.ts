/**
 * Snapshot do Board · Logs da equipe para o Agente PSA.
 *
 * ESCOLHA DELIBERADA, e vale ler antes de "melhorar" este arquivo: o snapshot
 * publica CONTAGEM DE REGISTRO, não as colunas derivadas das abas.
 *
 * As abas ("Produtividade", "Pessoas", "Não resolvidos") calculam colunas com
 * regra própria — `processosExecutados` só conta o que a pessoa levou a
 * concluído, `tarefasAbertas` olha o estado de HOJE, e ambas dependem de mapas
 * de nome, horas, cliente e status que a aba monta. Reproduzir isso aqui seria
 * uma segunda implementação da mesma regra, e no dia em que uma mudasse a tela
 * e o agente passariam a discordar sobre a mesma pessoa.
 *
 * Então o agente recebe o que é indiscutível — quantos registros, de quem, de
 * que tipo, sobre o quê — e cada campo diz exatamente o que é. Para a pergunta
 * "quem produziu mais", a resposta honesta do agente é apontar a aba, não
 * recalcular por baixo dela.
 *
 * O PERÍODO vem da URL (`useAuditPeriodo`), o mesmo que as abas leem. Sem isso,
 * o agente responderia sobre uma janela e a tela mostraria outra.
 */
import type { BlocoContexto, ContextoTela } from '@/hooks/useAgenteContexto';

export interface LogDeAuditoria {
  area: string;
  entity_type: string;
  action: string;
  performed_by: string;
  performed_at: string;
}

export interface EntradaContextoLogs {
  /** Rótulo do escopo escolhido no seletor da tela. */
  areaLabel: string;
  /** Rótulo do período, como o seletor das abas mostra. */
  periodoLabel: string;
  janela: { desde: string | null; ate: string | null };
  logs: LogDeAuditoria[];
  /** id do profile -> nome. O que não estiver aqui vira "não identificado". */
  nomePorId: Record<string, string>;
  /** `true` enquanto a consulta de logs não respondeu. */
  carregando: boolean;
  falhas: string[];
}

const contar = <T,>(itens: T[], chave: (t: T) => string) => {
  const mapa = new Map<string, number>();
  for (const i of itens) mapa.set(chave(i), (mapa.get(chave(i)) ?? 0) + 1);
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
};

const ROTULO_ACAO: Record<string, string> = {
  created: 'criações', updated: 'edições', deleted: 'exclusões',
};

const SUGESTOES = [
  'Quantos registros de auditoria há no período e de quantas pessoas?',
  'Que tipo de cadastro concentra as alterações?',
  'Alguém deixou de registrar no período?',
];

export function contextoBoardLogs(e: EntradaContextoLogs): ContextoTela {
  const porPessoa = contar(e.logs, (l) => l.performed_by);
  const porAcao = contar(e.logs, (l) => l.action);
  const porEntidade = contar(e.logs, (l) => l.entity_type);
  const porDia = contar(e.logs, (l) => l.performed_at.slice(0, 10));

  const resumo: BlocoContexto = {
    id: 'resumo',
    titulo: 'Registros de auditoria na janela',
    janela: e.periodoLabel,
    nota: 'CONTAGEM DE REGISTRO — não é a coluna "processos executados" das abas, '
      + 'que tem regra própria (só o que foi levado a concluído). Para produtividade '
      + 'por pessoa, a fonte é a aba Produtividade.',
    campos: [
      { rotulo: 'Registros no período', valor: String(e.logs.length) },
      { rotulo: 'Pessoas que registraram algo', valor: String(porPessoa.length) },
      {
        rotulo: 'Dias com pelo menos um registro',
        valor: String(porDia.length),
      },
      {
        rotulo: 'Início da janela',
        valor: e.janela.desde,
        nota: e.janela.desde === null ? 'todo o histórico' : undefined,
      },
      {
        rotulo: 'Fim da janela',
        valor: e.janela.ate,
        nota: e.janela.ate === null ? 'até agora' : undefined,
      },
    ],
  };

  const blocos: BlocoContexto[] = [resumo];

  if (porPessoa.length > 0) {
    blocos.push({
      id: 'pessoas',
      titulo: 'Quem registrou',
      janela: e.periodoLabel,
      nota: 'Quantidade de REGISTROS, não de entregas.',
      campos: [{
        rotulo: 'Quem mais registrou',
        valor: `${e.nomePorId[porPessoa[0][0]] ?? 'não identificado'} · ${porPessoa[0][1]}`,
      }],
      itens: porPessoa.slice(0, 12).map(([id, qtd]) => ({
        pessoa: e.nomePorId[id] ?? 'não identificado',
        registros: qtd,
      })),
    });
  }

  if (porEntidade.length > 0) {
    blocos.push({
      id: 'o_que',
      titulo: 'Sobre o que são os registros',
      janela: e.periodoLabel,
      campos: porAcao.map(([acao, qtd]) => ({
        rotulo: ROTULO_ACAO[acao] ?? acao,
        valor: String(qtd),
      })),
      itens: porEntidade.slice(0, 12).map(([tipo, qtd]) => ({
        tipo_de_cadastro: tipo,
        registros: qtd,
      })),
    });
  }

  return {
    rotulo: 'Board · Logs da equipe (auditoria)',
    filtros: { área: e.areaLabel, período: e.periodoLabel },
    blocos,
    avisos: e.falhas.length > 0 ? [`falha ao carregar: ${e.falhas.join(', ')}`] : undefined,
    sugestoes: SUGESTOES,
  };
}
