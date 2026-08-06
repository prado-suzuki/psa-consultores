import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuditLog } from '@/hooks/useAuditLog';
import { supabase } from '@/integrations/supabase/client';
import { computeFieldDiff } from '@/lib/diffUtils';
import {
  CAMPOS_AUDITADOS_ITEM,
  encontrarItemDoCatalogo,
  encontrarManualComMesmoNome,
  montarAtualizacaoItem,
  montarItemDeCatalogo,
  montarItemManual,
  montarReativacaoItem,
  ordenarItens,
  resolverItem,
  type CatalogoDocumento,
  type EdicaoItem,
  type EstruturaDoItem,
  type ItemSolicitacao,
  type NovoItemManual,
  type SolicitacaoItemRow,
  type SolicitacaoStatus,
} from '@/lib/solicitacao';

/**
 * Camada de dados do pedido de documentos do cliente (`solicitacao` +
 * `solicitacao_item`).
 *
 * O que muda em relação ao fluxo antigo: o rascunho passa a viver no BANCO,
 * gravado a cada ação, em vez de morar em `useState` até o botão de enviar.
 * Recarregar a página ou trocar de cliente deixa de perder o que foi montado.
 *
 * Três regras que este hook faz valer, e que valem mais que a comodidade:
 *
 * 1) Item de catálogo NÃO copia texto — quem monta o payload é
 *    `src/lib/solicitacao.ts`, testado. Texto na linha = sobrescrita deliberada.
 * 2) O id da linha nova é do BANCO (`gen_random_uuid()`). Nada de chave primária
 *    sorteada no navegador: era isso que fazia o `onConflict: 'id'` do fluxo
 *    antigo parecer proteger contra duplicata sem proteger. Quem protege são os
 *    dois índices únicos de `solicitacao_item` (EDU-22).
 * 3) Remover item NÃO apaga a linha: marca `status = 'dispensado'`. O rastro
 *    fica, e a leitura do cliente (EDU-24) simplesmente não devolve o item.
 */

export const solicitacaoAtivaKey = (clienteId: string | null) =>
  ['osg-solicitacao', clienteId] as const;

/**
 * O pedido do cliente que a tela mostra, com os itens já resolvidos.
 *
 * É o não encerrado quando existe; senão, o último encerrado, que a tela exibe
 * em modo consulta.
 */
export interface SolicitacaoAtiva {
  id: string;
  clienteId: string;
  ordemServicoId: string | null;
  status: SolicitacaoStatus;
  enviadaEm: string | null;
  encerradaEm: string | null;
  observacao: string | null;
  itens: ItemSolicitacao[];
  /**
   * As linhas cruas, indexadas por id.
   *
   * A tela usa `itens`; isto existe para as mutações montarem o update contra o
   * que está gravado (nulo = herda) em vez de contra o texto já resolvido — que
   * transformaria toda edição em sobrescrita dos três campos.
   */
  linhas: Map<string, SolicitacaoItemRow>;
}

const SELECT_SOLICITACAO = `
  id, cliente_id, ordem_servico_id, status, enviada_em, encerrada_em, observacao,
  itens:solicitacao_item (
    id, item_padrao_id, granularidade, grupo, documento, entidade, nota,
    status, ordem, observacao,
    catalogo:documento_tipo (
      id, codigo, documento, entidade, nota, granularidade, grupo, ordem, confidencial
    )
  )
`;

/** Violação de índice único no Postgres. */
const UNIQUE_VIOLATION = '23505';

interface ErroPostgrest {
  code?: string;
  message?: string;
}

const codigoDoErro = (erro: unknown): string | undefined =>
  (erro as ErroPostgrest | null)?.code;

/**
 * A solicitação que a tela do consultor mostra para este cliente.
 *
 * É a não encerrada, quando existe — o índice único parcial garante no máximo
 * uma. Não havendo, é a **última encerrada**, porque a tela precisa continuar
 * mostrando o pedido fechado em modo consulta (ALE-30). Filtrar `encerrada` aqui
 * fazia a tela zerar no instante do encerramento, como se o pedido tivesse
 * sumido.
 *
 * A ordenação faz esse desempate sozinha: `encerrada_em` é nulo na ativa, e
 * `nullsFirst` a coloca à frente; entre as encerradas, vem a mais recente.
 */
async function buscarSolicitacaoDoCliente(clienteId: string): Promise<SolicitacaoAtiva | null> {
  const { data, error } = await supabase
    .from('solicitacao')
    .select(SELECT_SOLICITACAO)
    .eq('cliente_id', clienteId)
    .order('encerrada_em', { ascending: false, nullsFirst: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Sem cast de propósito: é esta atribuição que faz o typecheck conferir o
  // formato do embed (`catalogo` como objeto, não array) contra o tipo gerado.
  const linhas: SolicitacaoItemRow[] = data.itens ?? [];

  return {
    id: data.id,
    clienteId: data.cliente_id,
    ordemServicoId: data.ordem_servico_id,
    status: data.status,
    enviadaEm: data.enviada_em,
    encerradaEm: data.encerrada_em,
    observacao: data.observacao,
    itens: ordenarItens(linhas.map(resolverItem)),
    linhas: new Map(linhas.map((linha) => [linha.id, linha])),
  };
}

export function useDomainSolicitacao(clienteId: string | null) {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();
  const queryKey = solicitacaoAtivaKey(clienteId);

  const solicitacaoQuery = useQuery<SolicitacaoAtiva | null>({
    queryKey,
    queryFn: () => buscarSolicitacaoDoCliente(clienteId as string),
    enabled: Boolean(clienteId),
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey });
    // A leitura do portal do cliente (EDU-24/EDU-27) tem cache proprio: sem
    // isto, enviar ou encerrar so apareceria para o cliente no proximo refetch.
    queryClient.invalidateQueries({ queryKey: ['solicitacao-ativa-cliente'] });
  };

  /**
   * O cabeçalho aberto em que a linha nova vai entrar.
   *
   * NÃO cria. Antes criava: incluir um documento num cliente sem solicitação
   * abria um rascunho com `solicitacao.ordem_servico_id` nulo, porque o pedido
   * montado à mão não vinha de OS nenhuma. Era esse caminho que produzia
   * solicitação sem origem — e depois ninguém sabia de onde a lista tinha vindo,
   * nem o rail sabia quais produtos recortar.
   *
   * Montar à mão saiu: a solicitação nasce dos produtos da OS, pela RPC, e só por
   * ela. Incluir e dispensar item continuam livres, mas sobre um cabeçalho que já
   * existe. Sem ele, isto recusa em vez de improvisar um.
   */
  const solicitacaoAberta = async (): Promise<string> => {
    const atual = solicitacaoQuery.data ?? await buscarSolicitacaoDoCliente(clienteId as string);
    if (atual && atual.status !== 'encerrada') return atual.id;

    throw new Error(atual
      ? 'Esta solicitação está encerrada e não recebe documento novo. Abra uma nova pelo botão no topo.'
      : 'Gere a lista a partir da OS antes de incluir documentos — a solicitação nasce dos produtos da OS.');
  };

  /** A linha gravada de um item — a base do diff da auditoria. */
  const linhaDoItem = (itemId: string): SolicitacaoItemRow => {
    const linha = solicitacaoQuery.data?.linhas.get(itemId);
    if (!linha) {
      throw new Error('Item não encontrado na solicitação carregada. Recarregue a página.');
    }
    return linha;
  };

  const auditarItem = (
    item: SolicitacaoItemRow | null,
    depois: Record<string, unknown>,
    id: string,
    nome: string,
    action: 'created' | 'updated',
  ) => logAction({
    area: 'osg',
    entity_type: 'solicitacao_item',
    entity_id: id,
    entity_name: nome,
    action,
    changed_fields: computeFieldDiff(item, depois, [...CAMPOS_AUDITADOS_ITEM]),
  });

  /**
   * Monta a lista a partir dos produtos contratados da OS, pela RPC.
   *
   * A RPC é idempotente e nunca apaga: rodar de novo só acrescenta o que falta,
   * então item manual e item dispensado sobrevivem.
   *
   * Depois dela, grava a OS no cabeçalho se ele ainda não tiver uma — ver o
   * comentário no corpo.
   */
  const gerarDaOs = useMutation({
    mutationFn: async (ordemServicoId: string) => {
      if (!clienteId) throw new Error('Selecione um cliente antes de gerar a solicitação.');

      const itensAntes = solicitacaoQuery.data?.itens.length ?? 0;
      const { data, error } = await supabase.rpc('gerar_solicitacao_os', {
        _cliente_id: clienteId,
        _ordem_servico_id: ordemServicoId,
      });
      if (error) throw error;

      const criados = data ?? 0;
      let depois = await buscarSolicitacaoDoCliente(clienteId);
      if (!depois) {
        throw new Error('A geração terminou sem deixar solicitação ativa para o cliente.');
      }

      // Amarra o pedido à OS quando o cabeçalho nasceu sem uma.
      //
      // A RPC grava `solicitacao.ordem_servico_id` só quando ELA cria o
      // cabeçalho. Quem o cria antes é "Abrir nova solicitação", depois de um
      // encerramento: o rascunho nasce vazio e sem OS, e a coluna ficaria nula
      // para sempre mesmo com 60 itens vindos da OS. As solicitações antigas,
      // montadas à mão quando isso era permitido, também passam por aqui na
      // primeira geração.
      //
      // `.is('ordem_servico_id', null)` no lugar de sobrescrever: com duas OS no
      // mesmo cliente, a primeira gerada fica registrada. Sobrescrever faria a
      // coluna significar "a OS da última geração", que é outro dado com o mesmo
      // nome.
      if (!depois.ordemServicoId) {
        const { error: erroVinculo } = await supabase
          .from('solicitacao')
          .update({ ordem_servico_id: ordemServicoId })
          .eq('id', depois.id)
          .is('ordem_servico_id', null);
        if (erroVinculo) throw erroVinculo;
        depois = { ...depois, ordemServicoId };
      }

      await logAction({
        area: 'osg',
        entity_type: 'solicitacao',
        entity_id: depois.id,
        entity_name: 'Solicitação de documentos',
        action: 'updated',
        changed_fields: computeFieldDiff(
          { itens: itensAntes },
          { itens: depois.itens.length, ordem_servico_id: ordemServicoId },
          ['itens', 'ordem_servico_id'],
        ),
        details: `${criados} item(ns) gerado(s) a partir da OS`,
      });

      return criados;
    },
    onSuccess: invalidar,
    onError: (error: Error) =>
      toast.error('Não foi possível gerar a solicitação: ' + error.message),
  });

  /**
   * Pedir de novo um documento que estava dispensado.
   *
   * Reativa a linha existente em vez de inserir outra: os índices únicos recusam
   * a segunda linha, e apagar para reinserir perderia o rastro. É este caminho
   * que evita o beco sem saída — a lista de opcionais mostra o item dispensado,
   * então "Incluir" tem de significar "voltar a pedir".
   */
  const reativarExistente = async (
    item: ItemSolicitacao,
    estrutura: EstruturaDoItem | undefined,
    linha: SolicitacaoItemRow,
  ) => {
    const alteracoes = montarReativacaoItem(estrutura);

    const { error } = await supabase
      .from('solicitacao_item')
      .update(alteracoes)
      .eq('id', item.id);
    if (error) throw error;

    await auditarItem(linha, { ...linha, ...alteracoes }, item.id, item.documento, 'updated');
    return item.id;
  };

  const adicionarDoCatalogo = useMutation({
    mutationFn: async (
      { catalogo, estrutura }: { catalogo: CatalogoDocumento; estrutura?: EstruturaDoItem },
    ) => {
      if (!clienteId) throw new Error('Selecione um cliente antes de incluir documentos.');

      const jaNaSolicitacao = encontrarItemDoCatalogo(
        solicitacaoQuery.data?.itens ?? [],
        catalogo.id,
      );
      if (jaNaSolicitacao) {
        if (jaNaSolicitacao.status === 'ativo') {
          throw new Error(`"${catalogo.documento}" já está nesta solicitação.`);
        }
        return reativarExistente(jaNaSolicitacao, estrutura, linhaDoItem(jaNaSolicitacao.id));
      }

      const solicitacaoId = await solicitacaoAberta();
      // `estrutura` leva a gaveta e o grão que o analista trocou no modal; o
      // texto continua vindo do catálogo por herança.
      const payload = montarItemDeCatalogo(solicitacaoId, catalogo, estrutura);

      const { data, error } = await supabase
        .from('solicitacao_item')
        .insert(payload)
        .select('id')
        .single();

      if (error) {
        if (codigoDoErro(error) === UNIQUE_VIOLATION) {
          throw new Error(`"${catalogo.documento}" já está nesta solicitação.`);
        }
        throw error;
      }

      await auditarItem(null, payload, data.id, catalogo.documento, 'created');
      return data.id;
    },
    onSuccess: invalidar,
    onError: (error: Error) =>
      toast.error('Não foi possível incluir o documento: ' + error.message),
  });

  const adicionarManual = useMutation({
    mutationFn: async (entrada: NovoItemManual) => {
      if (!clienteId) throw new Error('Selecione um cliente antes de incluir documentos.');

      // A constraint `uq_solicitacao_item_documento` recusa a duplicata exata no
      // banco. Esta checagem vem antes por dois motivos: dá mensagem legível em
      // vez de erro de índice, e pega variação de caixa, espaço e acento, que a
      // constraint não alcança porque compara a coluna crua.
      const jaPedido = encontrarManualComMesmoNome(
        solicitacaoQuery.data?.itens ?? [],
        entrada.documento,
      );
      if (jaPedido) {
        if (jaPedido.status === 'ativo') {
          throw new Error(`"${jaPedido.documento}" já está nesta solicitação.`);
        }
        // Mesmo nome, mas dispensado: é o analista pedindo de volta.
        return reativarExistente(
          jaPedido,
          { grupo: entrada.grupo, granularidade: entrada.granularidade },
          linhaDoItem(jaPedido.id),
        );
      }

      const solicitacaoId = await solicitacaoAberta();
      const payload = montarItemManual(solicitacaoId, entrada);

      const { data, error } = await supabase
        .from('solicitacao_item')
        .insert(payload)
        .select('id')
        .single();

      if (error) {
        if (codigoDoErro(error) === UNIQUE_VIOLATION) {
          throw new Error(
            `Já existe um documento chamado "${payload.documento}" nesta solicitação.`,
          );
        }
        throw error;
      }

      await auditarItem(null, payload, data.id, payload.documento as string, 'created');
      return data.id;
    },
    onSuccess: invalidar,
    onError: (error: Error) =>
      toast.error('Não foi possível incluir o documento: ' + error.message),
  });

  /**
   * Edição de um item já pedido.
   *
   * Grava só o que mudou; campo igual ao catálogo volta a ser nulo (= volta a
   * herdar). Edição que não muda nada não vai ao banco nem à auditoria.
   */
  const editarItem = useMutation({
    mutationFn: async ({ id, edicao }: { id: string; edicao: EdicaoItem }) => {
      const linha = linhaDoItem(id);
      const alteracoes = montarAtualizacaoItem(linha, edicao);
      if (Object.keys(alteracoes).length === 0) return false;

      const { error } = await supabase
        .from('solicitacao_item')
        .update(alteracoes)
        .eq('id', id);
      if (error) throw error;

      await auditarItem(
        linha,
        { ...linha, ...alteracoes },
        id,
        resolverItem(linha).documento,
        'updated',
      );
      return true;
    },
    onSuccess: (alterou) => {
      if (alterou) invalidar();
    },
    onError: (error: Error) =>
      toast.error('Não foi possível salvar a alteração: ' + error.message),
  });

  /**
   * "Remover" da tela = dispensar, nunca `delete`.
   *
   * A linha continua na solicitação com o motivo em `observacao`; a leitura do
   * cliente só devolve os itens ativos.
   */
  const dispensarItem = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo?: string }) => {
      const linha = linhaDoItem(id);
      const alteracoes = {
        status: 'dispensado' as const,
        observacao: motivo?.trim() || null,
      };

      const { error } = await supabase
        .from('solicitacao_item')
        .update(alteracoes)
        .eq('id', id);
      if (error) throw error;

      await auditarItem(
        linha,
        { ...linha, ...alteracoes },
        id,
        resolverItem(linha).documento,
        'updated',
      );
    },
    onSuccess: invalidar,
    onError: (error: Error) =>
      toast.error('Não foi possível dispensar o documento: ' + error.message),
  });

  /**
   * Move o cabeçalho de um status para outro.
   *
   * O status esperado vai no WHERE, e não numa leitura anterior: assim dois
   * consultores clicando ao mesmo tempo não produzem duas transições nem
   * sobrescrevem `enviada_em`. Se o update não devolver linha, alguém chegou
   * antes — e isso vira erro na tela, não silêncio.
   *
   * A data vem do relógio do cliente porque o PostgREST não aceita expressão
   * (`now()`) no payload de update. A diferença é de segundos e não há regra que
   * dependa da precisão dela.
   */
  const moverStatus = async (
    de: SolicitacaoStatus[],
    para: SolicitacaoStatus,
    carimbo: 'enviada_em' | 'encerrada_em',
    erroSeNaoMoveu: string,
  ) => {
    const atual = solicitacaoQuery.data;
    if (!atual) throw new Error('Nenhuma solicitação carregada para este cliente.');

    const alteracoes = { status: para, [carimbo]: new Date().toISOString() };
    const { data, error } = await supabase
      .from('solicitacao')
      .update(alteracoes)
      .eq('id', atual.id)
      .in('status', de)
      .select('id, status');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error(erroSeNaoMoveu);

    await logAction({
      area: 'osg',
      entity_type: 'solicitacao',
      entity_id: atual.id,
      entity_name: 'Solicitação de documentos',
      action: 'updated',
      changed_fields: computeFieldDiff(
        { status: atual.status },
        alteracoes,
        ['status', carimbo],
      ),
    });
  };

  const enviarSolicitacao = useMutation({
    mutationFn: () => moverStatus(
      ['rascunho'],
      'enviada',
      'enviada_em',
      'Esta solicitação não está mais em rascunho — alguém já a enviou ou encerrou. Recarregue a página.',
    ),
    onSuccess: invalidar,
    onError: (error: Error) => toast.error('Não foi possível enviar: ' + error.message),
  });

  const encerrarSolicitacao = useMutation({
    mutationFn: () => moverStatus(
      ['rascunho', 'enviada'],
      'encerrada',
      'encerrada_em',
      'Esta solicitação já estava encerrada. Recarregue a página.',
    ),
    onSuccess: invalidar,
    onError: (error: Error) => toast.error('Não foi possível encerrar: ' + error.message),
  });

  /**
   * Abre um rascunho novo depois que o anterior foi encerrado.
   *
   * Diferente do `garantirSolicitacao`: aqui a violação de unicidade NÃO é
   * absorvida. Se o índice recusar, é o banco funcionando — existe solicitação
   * aberta para este cliente —, e a resposta certa é dizer isso, não tentar de
   * novo.
   */
  const abrirNovaSolicitacao = useMutation({
    mutationFn: async () => {
      if (!clienteId) throw new Error('Selecione um cliente.');

      const { data, error } = await supabase
        .from('solicitacao')
        .insert({ cliente_id: clienteId, status: 'rascunho' })
        .select('id')
        .single();

      if (error) {
        if (codigoDoErro(error) === UNIQUE_VIOLATION) {
          throw new Error('Este cliente já tem uma solicitação aberta.');
        }
        throw error;
      }

      await logAction({
        area: 'osg',
        entity_type: 'solicitacao',
        entity_id: data.id,
        entity_name: 'Solicitação de documentos',
        action: 'created',
        changed_fields: computeFieldDiff(
          null,
          { cliente_id: clienteId, status: 'rascunho' },
          ['cliente_id', 'status'],
        ),
      });
      return data.id;
    },
    onSuccess: invalidar,
    onError: (error: Error) =>
      toast.error('Não foi possível abrir a solicitação: ' + error.message),
  });

  return {
    solicitacao: solicitacaoQuery.data ?? null,
    itens: solicitacaoQuery.data?.itens ?? [],
    isLoading: solicitacaoQuery.isLoading,
    error: solicitacaoQuery.error,
    gerarDaOs,
    adicionarDoCatalogo,
    adicionarManual,
    editarItem,
    dispensarItem,
    enviarSolicitacao,
    encerrarSolicitacao,
    abrirNovaSolicitacao,
  };
}
