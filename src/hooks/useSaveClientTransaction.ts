import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from '@/hooks/useAuditLog';
import { assertCanPerform, type PrecheckTable, type PrecheckOp } from '@/hooks/useRlsPrecheck';
import { useAuth } from '@/contexts/AuthContext';
import { isProductionEnvironment, currentAmbiente } from '@/config/api';
import { toast } from 'sonner';
import { todayIsoBrazil } from '@/lib/dateUtils';
import { computeFieldDiff, computeEntityListDiff } from '@/lib/diffUtils';
import {
  isSameRecord,
  validateNomeCliente,
  validateClustersCliente,
  validateObservacoesCliente,
  validateContribuinteDocumento,
  validateContribuinteDados,
  findDocumentosDuplicados,
  validateRepresentante,
  validateOrdemServico,
} from '@/lib/clientFormValidation';
import type { DraftEntity, InscricaoIE, DraftRepresentante, DraftOrdemServico } from '@/types/clientForm';
import {
  RecusaDeOperacao,
  recusaDeOperacao,
  textoDeRecusa,
  textoDoSalvamentoRecusado,
  type CadastroOperacao,
} from '@/lib/rlsMessages';
import { N8N_WELCOME_WEBHOOK } from '@/lib/webhooks';
import { splitName } from '@/lib/nameUtils';
import { chaveDeNomeCliente } from '@/lib/nomeProprio';

const clienteTable = 'cliente';
const contribuinteTable = 'contribuinte';
const representanteTable = 'representante';

// Helper para sincronizar com DW
const syncCadastrosToDW = (payload: any) => {
  const environment = isProductionEnvironment ? "production" : "development";
  supabase.functions
    .invoke("sync-cadastros", {
      body: { ...payload, environment },
    })
    .then(({ error }) => {
      if (error) console.error("[sync-cadastros] Erro:", error.message);
      else console.log("[sync-cadastros] Sync iniciado");
    })
    .catch((err) => console.error("[sync-cadastros] Erro:", err));
};

/**
 * Soft-delete que confirma o resultado antes de seguir.
 *
 * `update({ excluido: true })` sem checagem falha em silêncio de dois jeitos: o
 * PostgREST devolve erro e ninguém lê, ou a policy de UPDATE não casa nenhuma
 * linha (0 rows, sem erro). Nos dois casos o save continua como se tivesse
 * excluído — e aí o registro "volta" no próximo reload e o insert seguinte
 * duplica a linha. A verificação relê os ids filtrando `excluido = false`:
 * se a linha ainda aparece assim, a exclusão não gravou.
 *
 * Restou só para `contribuinte` e `representante`. OS e rateio passaram para
 * `softDeleteViaRpc` — e estas duas tabelas têm o MESMO defeito de RLS descrito
 * lá, ainda sem correção (fora do escopo da tarefa que consertou as outras).
 */
/**
 * Precheck traduzido para o item da tela.
 *
 * `assertCanPerform` devolve a frase genérica dele ("Você precisa do papel…"),
 * que não diz em qual item o salvamento parou. Aqui a recusa passa a carregar a
 * operação, e o motivo (`reason`, `required_role`) segue junto para a categoria
 * da mensagem ser escolhida pelo motivo, não por palavra no texto.
 */
const precheck = async (
  table: PrecheckTable,
  op: PrecheckOp,
  id: string,
  operacao: CadastroOperacao,
): Promise<void> => {
  try {
    await assertCanPerform(table, op, id);
  } catch (err) {
    throw recusaDeOperacao(operacao, err);
  }
};

const softDeleteVerificado = async (
  table: string,
  idField: string,
  ids: string[],
  operacao: CadastroOperacao,
): Promise<void> => {
  // Tabelas de OS/rateio não estão no schema tipado — cast justificado
  const { error } = await (supabase.from(table as any) as any).update({ excluido: true }).in(idField, ids);
  if (error) throw recusaDeOperacao(operacao, error);
  const { data: restantes, error: reReadError } = await (supabase.from(table as any) as any)
    .select(idField)
    .in(idField, ids)
    .eq("excluido", false);
  if (reReadError) throw recusaDeOperacao(operacao, reReadError);
  if (restantes && restantes.length > 0) {
    // A linha continuar visível com `excluido = false` é a recusa silenciosa:
    // nenhuma linha foi marcada e o banco não devolveu erro.
    throw recusaDeOperacao(operacao, null, { zeroLinhas: true });
  }
};

/**
 * Soft-delete de OS e de rateio pelas funções `soft_delete_*` do banco.
 *
 * Estas duas tabelas não aceitam `update({ excluido: true })` de quem não é
 * admin. A policy de SELECT delas exige `excluido = false`, e o UPDATE tem
 * WHERE — logo exige SELECT sobre a tabela —, então o Postgres aplica as
 * policies de leitura também à LINHA NOVA. Com `excluido = true` a linha some
 * da vista de quem gravou e o comando inteiro é recusado com 42501. Não é o
 * retorno que dispara: medido, falha igual sem `RETURNING`, então tirar o
 * `.select()` não resolveria.
 *
 * As funções são SECURITY DEFINER: gravam fora da policy e conferem a permissão
 * por dentro, espelhando a mesma regra que autoriza editar a linha. Nenhuma
 * policy foi afrouxada. Ver
 * `supabase/migrations/20260820140000_soft_delete_os_e_rateio_security_definer.sql`.
 *
 * Não há `assertCanPerform` antes: o `can_perform` ensaia `UPDATE ... SET
 * id = id`, que mantém `excluido = false` e por isso sempre aprovava justamente
 * esta operação. A validação agora é a da própria função, que é tudo-ou-nada e
 * devolve quantas linhas marcou — dispensando também a releitura de conferência
 * do `softDeleteVerificado`.
 */
const softDeleteViaRpc = async (
  rpc: "soft_delete_ordem_servico" | "soft_delete_distribuicao_receita",
  ids: string[],
  operacao: CadastroOperacao,
): Promise<number> => {
  // RPCs criadas por migração, ainda fora do schema tipado — cast justificado
  const { data, error } = await (supabase.rpc as any)(rpc, { _ids: ids });
  // A frase que a função devolve nomeia a tabela e quantas linhas barrou: útil
  // no console, longe do texto que a pessoa lê.
  if (error) throw recusaDeOperacao(operacao, error);
  const marcadas = typeof data === "number" ? data : 0;
  // Só acontece quando a linha já estava excluída (caso de admin re-excluindo).
  // Qualquer id inexistente ou sem permissão já teria abortado a chamada.
  if (marcadas < ids.length) {
    console.warn(`[${rpc}] marcou ${marcadas} de ${ids.length} (${operacao.item}) — o resto já estava excluído.`);
  }
  return marcadas;
};

interface SetorCliente {
  id: string;
  sigla: string;
  nome: string;
}

interface ClientDataShape {
  nome: string;
  categoria: string;
  ativo: boolean;
  fixo: string;
  telefone: string;
  municipio: string;
  uf: string;
  observacoes: string;
  cluster_ids: string[];
}

interface OriginalSnapshot {
  clientData: ClientDataShape;
  entities: DraftEntity[];
  participants: DraftRepresentante[];
  contracts: DraftOrdemServico[];
  /** Estado das IEs no load — sem ele, mexer só numa IE não seria detectado. */
  inscricoesMap?: Record<string, InscricaoIE[]>;
}

interface SaveTransactionParams {
  clientData: ClientDataShape;
  entities: DraftEntity[];
  participants: DraftRepresentante[];
  contracts: DraftOrdemServico[];
  inscricoesMap: Record<string, InscricaoIE[]>;
  clusterIds?: string[];
  isEditing: boolean;
  editingClienteId?: string | null;
  setoresCliente: SetorCliente[];
  /**
   * Centros de custo, só para a trilha de auditoria do rateio nomear a linha.
   *
   * Sem isto, duas linhas de rateio alteradas do mesmo jeito viram dois
   * registros idênticos byte a byte, e quem for conferir não sabe qual centro
   * de custo mudou. Opcional para não quebrar quem chama o hook sem auditar
   * rateio — na falta, cai no id.
   */
  centrosCusto?: Array<{ id: string; label: string }>;
  /** Opcional: abas com rascunho pendente. Quem não usa rascunho intermediário não precisa passar. */
  getDraftPendingTabs?: () => string[];
  onDuplicateFound: (name: string) => Promise<boolean>;
  onSuccess: () => void;
  originalSnapshot?: OriginalSnapshot | null;
}

export const useSaveClientTransaction = (params: SaveTransactionParams) => {
  const {
    clientData, entities, participants, contracts, inscricoesMap, clusterIds = [],
    isEditing, editingClienteId, setoresCliente, centrosCusto = [], getDraftPendingTabs,
    onDuplicateFound, onSuccess, originalSnapshot,
  } = params;

  const { logAction } = useAuditLog();
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  /**
   * O salvamento em si. Quem chama é o `executeSave` abaixo, que segura a porta.
   *
   * `saving` não é ligado aqui dentro: ele precisa valer desde o primeiro clique,
   * antes da verificação de nome duplicado e do diálogo que ela abre.
   */
  const executarSalvamento = useCallback(async () => {
    const clienteObs = (clientData.observacoes || "").trim();

    // ─── Validação: barra só o que o usuário mexeu ──────────────────────────
    // Registro que já estava incompleto no banco e não foi tocado nesta edição
    // vira aviso pós-salvamento, não trava. Sem isso, ajustar uma OS ficava
    // refém de um contribuinte legado sem CEP em outra aba.
    const snapVal = isEditing ? originalSnapshot : null;
    const origEntities = new Map((snapVal?.entities || []).filter(e => e._dbId).map(e => [e._dbId!, e]));
    const origParts = new Map((snapVal?.participants || []).filter(p => p._dbId).map(p => [p._dbId!, p]));
    const origOs = new Map((snapVal?.contracts || []).filter(c => c._dbId).map(c => [c._dbId!, c]));
    const origInscricoes = snapVal?.inscricoesMap || {};

    // Pendências de itens não tocados — avisadas depois que o save conclui.
    const pendencias: string[] = [];
    /** @returns true se deve interromper o save (erro em item tocado). */
    const registrarErro = (erro: string | null, tocado: boolean): boolean => {
      if (!erro) return false;
      if (tocado) { toast.error(erro); return true; }
      pendencias.push(erro);
      return false;
    };

    // Nome é a identidade do cadastro: exigido sempre, tocado ou não.
    const nomeErro = validateNomeCliente(clientData.nome);
    if (nomeErro) { toast.error(nomeErro); return; }

    // Cluster também é exigido sempre, e nos dois ramos: na criação quem recusa é
    // a RPC, na edição é o gatilho DEFERRED `trg_cliente_tem_cluster` (que roda no
    // UPDATE) e o `trg_cliente_cluster_last` do vínculo. Barrar aqui só antecipa a
    // recusa do banco — que continua valendo como rede de segurança.
    const clusterErro = validateClustersCliente(clusterIds);
    if (clusterErro) { toast.error(clusterErro); return; }

    const clienteTocado = !snapVal || !isSameRecord(clientData, snapVal.clientData);
    if (registrarErro(validateObservacoesCliente(clientData), clienteTocado)) return;

    // --- Contribuintes ---
    const contribTocado = (e: DraftEntity): boolean => {
      const chave = e._dbId || String(e._id);
      const orig = e._dbId ? origEntities.get(e._dbId) : undefined;
      if (!snapVal || !orig) return true;
      return !isSameRecord(e, orig) || !isSameRecord(inscricoesMap[chave] || [], origInscricoes[chave] || []);
    };
    const tocadoPorIndice = entities.map(contribTocado);
    const duplicados = findDocumentosDuplicados(entities);
    for (const [idx, e] of entities.entries()) {
      const tocado = tocadoPorIndice[idx];
      if (registrarErro(validateContribuinteDocumento(e), tocado)) return;
      const dup = duplicados.get(idx);
      // Conflito de documento é do usuário se qualquer um do par foi mexido.
      if (dup && registrarErro(dup.message, dup.indices.some(i => tocadoPorIndice[i]))) return;
      const ies = inscricoesMap[e._dbId || String(e._id)] || [];
      if (registrarErro(validateContribuinteDados(e, ies), tocado)) return;
    }

    // --- Representantes ---
    for (const p of participants) {
      const orig = p._dbId ? origParts.get(p._dbId) : undefined;
      const tocado = !snapVal || !orig || !isSameRecord(p, orig);
      if (registrarErro(validateRepresentante(p), tocado)) return;
    }

    // --- Ordens de Serviço (empresa, área, região, produtos e rateio 100%) ---
    for (const c of contracts) {
      const orig = c._dbId ? origOs.get(c._dbId) : undefined;
      const tocado = !snapVal || !orig || !isSameRecord(c, orig);
      if (registrarErro(validateOrdemServico(c, entities), tocado)) return;
    }

    // --- Duplicate name check (only on creation) ---
    //
    // A comparação era `.eq("nome", ...)`, igualdade exata, e funcionava por
    // acidente: o gatilho `normalize_name_title_case` achatava todo mundo com
    // initcap() antes de gravar, então "AGRO MMS" e "Agro Mms" viravam a mesma
    // string no banco. Derrubado o gatilho (migração 20260813103000), a
    // igualdade exata deixaria os dois passarem como clientes distintos e o
    // aviso não dispararia. Quem diz que dois nomes são o mesmo agora é
    // `chaveDeNomeCliente`, gêmea da função SQL `nome_cliente_normalizado`.
    //
    // A comparação é feita aqui, e não no banco, por duas razões: o filtro
    // equivalente em PostgREST seria `ilike`, que trata `%`, `_` e `*` como
    // curinga e exigiria escapar o nome digitado; e o código precisa continuar
    // acertando no intervalo entre subir e o Lovable aplicar a migração. A
    // varredura é barata: roda uma única vez, só na criação, sobre uma tabela
    // de poucas centenas de linhas já recortada pela RLS.
    if (!isEditing) {
      const nomeDigitado = clientData.nome.trim();
      const chaveDigitada = chaveDeNomeCliente(nomeDigitado);
      // O recorte é o mesmo do cadastro que está prestes a nascer: o insert
      // carimba `ambiente: currentAmbiente`, então homônimo do outro ambiente
      // não é duplicata nenhuma. Sem este filtro, quem cadastra em prod é
      // avisado por causa de um cliente que só existe em dev (e vice-versa) —
      // um registro que ele não consegue abrir em tela nenhuma para conferir se
      // é mesmo o mesmo, porque as listas também recortam por `ambiente`.
      const { data: candidatos, error: erroCandidatos } = await supabase
        .from(clienteTable)
        .select("id, nome")
        .eq("excluido", false)
        .eq("ambiente", currentAmbiente);
      // Consulta falhou: `candidatos` vem nulo e a lista vazia responderia "não
      // há homônimo" com a mesma cara de quem conferiu de verdade. O salvamento
      // para aqui, porque seguir calado é criar a duplicata que esta verificação
      // existe para evitar, sem que ninguém saiba que o exame nem aconteceu.
      if (erroCandidatos) {
        console.error("[cadastro cliente] verificação de nome duplicado falhou:", erroCandidatos);
        const texto = textoDeRecusa({ item: 'cliente', acao: 'cadastrar' }, 'falha');
        toast.error(texto.titulo, { description: texto.detalhe });
        return;
      }
      const existe = (candidatos || []).some(c => chaveDeNomeCliente(c.nome) === chaveDigitada);
      if (existe) {
        const confirmed = await onDuplicateFound(nomeDigitado);
        if (!confirmed) return;
      }
    }

    let createdClienteId: string | null = null;
    // Passo corrente atualizado antes de cada write; usado no toast de RLS
    // pra dizer QUAL tabela/op recusou, em vez de um genérico "sem permissão".
    let currentStep = "cliente/update";
    try {
      // ─── O que mudou, decidido UMA vez ───────────────────────────────────
      //
      // Esta conta já existia, mas rodava lá embaixo, junto da auditoria —
      // depois de todos os UPDATE terem sido disparados. Era por isso que abrir
      // um cliente, clicar em Editar e em Salvar sem tocar em nada dizia
      // "Nenhuma alteração detectada" e mesmo assim gravava quatro linhas: a
      // auditoria sabia que nada mudou, o banco não.
      //
      // Subindo para cá, a MESMA comparação decide o que se grava e o que se
      // audita. Duas contas para a mesma pergunta acabam divergindo — foi
      // exatamente esse o defeito que f50a2703 corrigiu na tela, entre o que
      // ela apontava e o que o botão recusava.
      //
      // Fica de fora do diff o que não é dado editável na tela: `ambiente` e as
      // chaves de ligação (`cliente_id`, `id_cliente`), que valem no insert e
      // não mudam numa linha que já existe.
      const clientFields = ['nome', 'categoria', 'ativo', 'fixo', 'telefone', 'municipio', 'uf', 'observacoes'];
      const contribFields = ['tipo_pessoa', 'cpf_cnpj', 'nome_razao_social', 'nome_fantasia', 'situacao_inscricao_estadual', 'inscricao_estadual', 'cod_cnae', 'setor', 'simples_nacional', 'telefone', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'municipio', 'uf', 'contribuinte_faturamento'];
      const partFields = ['nome', 'tipo_representante', 'cargo', 'email', 'telefone', 'observacoes', 'acesso_chamados'];
      const osFields = ['ordem_servico', 'data_emissao', 'data_inicio_projeto', 'data_fim_projeto', 'valor_projeto', 'numero_parcelas', 'valor_entrada', 'valor_reembolso_km', 'valor_reembolso_refeicao', 'situacao_projeto', 'observacoes_projeto', 'cluster_id', 'contribuinte_id', 'setor_cliente', 'setor_cliente_id', 'regiao'];

      const snap = isEditing ? originalSnapshot : null;

      const clientDiff = snap
        ? computeFieldDiff(snap.clientData as unknown as Record<string, unknown>, clientData as unknown as Record<string, unknown>, clientFields)
        : null;
      const clientHasChange = !!clientDiff && Object.keys(clientDiff).length > 0;

      const contribDiffs = snap
        ? computeEntityListDiff(snap.entities as unknown as Record<string, unknown>[], entities as unknown as Record<string, unknown>[], '_dbId', contribFields)
        : [];
      const contribDiffMap = new Map(contribDiffs.map(d => [d.entityId, d.diff]));

      const partDiffs = snap
        ? computeEntityListDiff(snap.participants as unknown as Record<string, unknown>[], participants as unknown as Record<string, unknown>[], '_dbId', partFields)
        : [];
      const partDiffMap = new Map(partDiffs.map(d => [d.entityId, d.diff]));

      const osDiffs = snap
        ? computeEntityListDiff(snap.contracts as unknown as Record<string, unknown>[], contracts as unknown as Record<string, unknown>[], '_dbId', osFields)
        : [];
      const osDiffMap = new Map(osDiffs.map(d => [d.entityId, d.diff]));

      /**
       * A OS como o banco a entregou, para comparar as listas FILHAS dela.
       *
       * Rateio e produtos contratados não entram em `osDiffMap`: o diff olha
       * campo escalar, e estes são listas. Sem uma comparação própria, o rateio
       * era reescrito inteiro a cada salvamento — quatro PATCH com os mesmos
       * valores só por abrir e salvar um cliente que tem OS.
       */
      const snapOsPorId = new Map(
        (snap?.contracts ?? []).filter(c => c._dbId).map(c => [c._dbId!, c]),
      );

      /** Linha existente que precisa ir ao banco. Sem `snap` não há com que comparar: grava. */
      const linhaAlterada = (mapa: Map<string, Record<string, unknown>>, dbId: string) => {
        if (!snap) return true;
        const diff = mapa.get(dbId);
        return !!diff && Object.keys(diff).length > 0;
      };

      const clientPayload = {
        nome: clientData.nome.trim(),
        categoria: clientData.categoria || null,
        ativo: clientData.ativo,
        fixo: clientData.fixo || null,
        telefone: clientData.telefone.trim() || null,
        municipio: clientData.municipio.trim() || null,
        uf: clientData.uf.trim() || null,
        observacoes: clienteObs || null,
        ambiente: currentAmbiente,
      };

      let clienteId: string;
      let clienteResult: any;

      if (isEditing) {
        if (clientHasChange) {
          currentStep = "cliente/update";
          const { data: updated, error } = await supabase
            .from(clienteTable)
            // cast: coluna `observacoes` é aplicada via migração no Lovable e ainda não está nos tipos gerados
            .update(clientPayload as any)
            .eq("id", editingClienteId!)
            .select()
            .single();
          if (error) throw recusaDeOperacao({ item: 'cliente', acao: 'atualizar' }, error);
          clienteResult = updated;
        } else {
          // Nada mudou na aba Cliente: não há o que gravar. A linha ainda é
          // necessária porque o sync do DW mais abaixo lê dela (inclusive
          // `updated_at`), então a escrita vira leitura.
          currentStep = "cliente/read";
          const { data: atual, error } = await supabase
            .from(clienteTable)
            .select()
            .eq("id", editingClienteId!)
            .single();
          if (error) throw error;
          clienteResult = atual;
        }
        clienteId = editingClienteId!;

        // --- Contribuintes: update existentes, insert novos, soft-delete removidos ---
        const currentContribDbIds = entities.filter(e => e._dbId).map(e => e._dbId!);
        const { data: dbContribs } = await supabase.from(contribuinteTable).select("id").eq("cliente_id", clienteId).eq("excluido", false);
        const removedContribIds = (dbContribs || []).map(c => c.id).filter(id => !currentContribDbIds.includes(id));
        if (removedContribIds.length > 0) {
          currentStep = "contribuinte/soft-delete";
          await softDeleteVerificado(contribuinteTable, "id", removedContribIds, { item: 'contribuinte', acao: 'excluir' });
        }

        // --- Representantes: update existentes, insert novos, soft-delete removidos ---
        const partIdField = "id_representante";
        const currentPartDbIds = participants.filter(p => p._dbId).map(p => p._dbId!);
        const { data: dbParts } = await (supabase.from(representanteTable) as any).select(partIdField).eq("id_cliente", clienteId).eq("excluido", false);
        const removedPartIds = (dbParts || []).map((p: any) => p[partIdField]).filter((id: string) => !currentPartDbIds.includes(id));
        if (removedPartIds.length > 0) {
          currentStep = "representante/soft-delete";
          await softDeleteVerificado(representanteTable, partIdField, removedPartIds, { item: 'representante', acao: 'excluir' });
        }

        // --- Ordens de Serviço: update existentes, insert novos, soft-delete removidos ---
        const currentOsDbIds = contracts.filter(c => c._dbId).map(c => c._dbId!);
        // ordem_servico is not in generated types — cast justified
        const { data: dbOS } = await (supabase.from("ordem_servico" as any) as any).select("id").eq("id_cliente", clienteId).eq("excluido", false);
        const removedOsIds = (dbOS || []).map((o: any) => o.id).filter((id: string) => !currentOsDbIds.includes(id));
        if (removedOsIds.length > 0) {
          // A OS removida já saiu do rascunho: quem ainda sabe o número dela é o
          // snapshot do load. Sem isto a mensagem sairia com "(sem número)".
          const numeroOsRemovida = snapOsPorId.get(removedOsIds[0])?.ordem_servico || null;
          currentStep = "ordem_servico/soft-delete";
          await softDeleteViaRpc("soft_delete_ordem_servico", removedOsIds, { item: 'os', acao: 'excluir', numeroOs: numeroOsRemovida });

          // O rateio acompanha a OS: sem isso sobra linha de distribuicao_receita
          // ativa apontando pra OS excluída (receita fantasma nos relatórios).
          const { data: distDeOsRemovida, error: distOrfaError } = await (supabase.from("distribuicao_receita" as any) as any)
            .select("id")
            .in("id_ordem_servico", removedOsIds)
            .eq("excluido", false);
          if (distOrfaError) throw recusaDeOperacao({ item: 'rateio', acao: 'excluir', numeroOs: numeroOsRemovida }, distOrfaError);
          const distOrfaIds = ((distDeOsRemovida || []) as Array<{ id: string }>).map(r => r.id);
          if (distOrfaIds.length > 0) {
            currentStep = "distribuicao_receita/soft-delete-orfas";
            await softDeleteViaRpc("soft_delete_distribuicao_receita", distOrfaIds, { item: 'rateio', acao: 'excluir', numeroOs: numeroOsRemovida });
          }
        }
      } else {
        currentStep = "cliente/insert (RPC criar_cliente_com_clusters)";
        // RPC atômica: insere cliente + cliente_clusters na mesma transação
        // (contorna trigger DEFERRED trg_cliente_tem_cluster). Retorna a linha completa
        // (created_at/updated_at do banco + nome já normalizado pelo trigger).
        const { data: novo, error } = await (supabase.rpc as any)(
          'criar_cliente_com_clusters',
          { p_cliente: clientPayload, p_cluster_ids: clusterIds }
        );
        // A RPC grava cliente e vínculo de cluster na mesma transação: a recusa
        // pode ser de qualquer um dos dois, e o cadastro do cliente é o que a
        // pessoa está tentando fazer.
        if (error) throw recusaDeOperacao({ item: 'cliente', acao: 'cadastrar' }, error);
        clienteId = (novo as any).id;
        createdClienteId = clienteId;
        clienteResult = novo;
      }

      // --- Persistir contribuintes (update ou insert) ---
      const buildContribFields = (e: DraftEntity) => ({
        cliente_id: clienteId,
        // Sem isto o insert cai no DEFAULT 'prod' da coluna e o contribuinte
        // nasce em prod mesmo com o cliente em dev (localhost/preview).
        ambiente: currentAmbiente,
        tipo_pessoa: e.tipo_pessoa,
        cpf_cnpj: (e.cpf_cnpj || "").replace(/\D/g, "") || null,
        nome_razao_social: e.nome_razao_social,
        inscricao_estadual: e.inscricao_estadual || null,
        cod_cnae: e.cod_cnae || null,
        setor: e.setor || null,
        simples_nacional:
          e.simples_nacional === "optante" ? true : e.simples_nacional === "nao_optante" ? false : null,
        telefone: e.telefone || null,
        nome_fantasia: e.nome_fantasia || null,
        situacao_inscricao_estadual: e.situacao_inscricao_estadual || null,
        cep: e.cep || null,
        logradouro: e.logradouro || null,
        numero: e.numero || null,
        complemento: e.complemento || null,
        bairro: e.bairro || null,
        municipio: e.municipio || null,
        uf: e.uf || null,
        contribuinte_faturamento: e.contribuinte_faturamento ?? false,
      });

      for (const e of entities) {
        // Rotulado a cada volta: o trecho das inscrições estaduais, no fim do
        // laço, deixa o passo em `inscricao_contribuinte/*`.
        currentStep = "contribuinte/upsert";
        let contribId = e._dbId;
        if (e._dbId) {
          // Contribuinte intocado não vai ao banco. O pulo é só desta linha: as
          // inscrições estaduais logo abaixo continuam sendo reconciliadas,
          // porque elas mudam sem o contribuinte mudar.
          if (linhaAlterada(contribDiffMap, e._dbId)) {
            // Usar .select() garante que uma falha silenciosa de RLS (0 rows
            // afetadas) apareça como erro, em vez de o save "concluir" sem gravar.
            const { data: updRows, error } = await supabase.from(contribuinteTable).update(buildContribFields(e)).eq("id", e._dbId).select("id");
            if (error) throw recusaDeOperacao({ item: 'contribuinte', acao: 'atualizar' }, error);
            if (!updRows || updRows.length === 0) {
              throw recusaDeOperacao({ item: 'contribuinte', acao: 'atualizar' }, null, { zeroLinhas: true });
            }
          }
        } else {
          // Id gerado no cliente de propósito: pedir a linha de volta ligaria o
          // RETURNING, e aí o Postgres avalia a policy de SELECT sobre a linha
          // nova — que é falsa quando o cliente é de outro cluster — recusando o
          // INSERT inteiro com o mesmo 42501. Sem `.select()` o supabase-js manda
          // `Prefer: return=minimal` e a leitura nunca é consultada.
          const novoContribId = crypto.randomUUID();
          const { error } = await supabase.from(contribuinteTable).insert({ ...buildContribFields(e), id: novoContribId });
          if (error) throw recusaDeOperacao({ item: 'contribuinte', acao: 'cadastrar' }, error);
          contribId = novoContribId;
        }

        // Persist inscricoes estaduais
        const entityKey = e._dbId || String(e._id);
        const ies = inscricoesMap[entityKey] || [];
        if (contribId) {
          // O passo era `contribuinte/upsert` durante toda a gravação das
          // inscrições, e a pista apontava para a tabela errada (B6).
          currentStep = "inscricao_contribuinte/read";
          const { data: existingIEs } = await (supabase as any)
            .from("inscricao_contribuinte")
            .select("id")
            .eq("contribuinte_id", contribId);
          const currentDbIds = ies.filter(ie => ie._dbId).map(ie => ie._dbId!);
          const removedIds = (existingIEs || []).map((r: any) => r.id).filter((id: string) => !currentDbIds.includes(id));
          if (removedIds.length > 0) {
            currentStep = "inscricao_contribuinte/delete";
            // Precheck do delete em lote — RLS uniforme, basta uma linha pra cobrir todas.
            await precheck('inscricao_contribuinte', 'delete', removedIds[0], { item: 'inscricao', acao: 'excluir' });
            // O retorno destas três chamadas era aguardado sem ser lido: um 42501
            // aqui não produzia mensagem nenhuma e o salvamento seguia (B7).
            const { data: ieApagadas, error: ieDelError } = await (supabase as any)
              .from("inscricao_contribuinte").delete().in("id", removedIds).select("id");
            if (ieDelError) throw recusaDeOperacao({ item: 'inscricao', acao: 'excluir' }, ieDelError);
            if ((ieApagadas || []).length < removedIds.length) {
              throw recusaDeOperacao({ item: 'inscricao', acao: 'excluir' }, null, { zeroLinhas: true });
            }
          }
          // Precheck do update uma única vez antes do loop — se houver pelo menos uma IE existente.
          const firstUpdateIe = ies.find(ie => ie._dbId);
          if (firstUpdateIe?._dbId) {
            currentStep = "inscricao_contribuinte/update";
            await precheck('inscricao_contribuinte', 'update', firstUpdateIe._dbId, { item: 'inscricao', acao: 'atualizar' });
          }
          for (const ie of ies) {
            const iePayload = {
              contribuinte_id: contribId,
              situacao: ie.situacao,
              numero_ie: ie.situacao === "sim" ? (ie.numero_ie || null) : null,
              uf: ie.uf,
            };
            if (ie._dbId) {
              currentStep = "inscricao_contribuinte/update";
              const { data: ieAtualizada, error: ieUpdError } = await (supabase as any)
                .from("inscricao_contribuinte").update(iePayload).eq("id", ie._dbId).select("id");
              if (ieUpdError) throw recusaDeOperacao({ item: 'inscricao', acao: 'atualizar' }, ieUpdError);
              if (!ieAtualizada || ieAtualizada.length === 0) {
                throw recusaDeOperacao({ item: 'inscricao', acao: 'atualizar' }, null, { zeroLinhas: true });
              }
            } else {
              currentStep = "inscricao_contribuinte/insert";
              const { error: ieInsError } = await (supabase as any).from("inscricao_contribuinte").insert(iePayload);
              if (ieInsError) throw recusaDeOperacao({ item: 'inscricao', acao: 'cadastrar' }, ieInsError);
            }
          }
        }
      }

      // --- Persistir representantes (update ou insert) ---
      // Cria/vincula auth user via edge function `upsert-representante-user`
      // SOMENTE quando `acesso_chamados === true`. A edge function dispara o
      // webhook N8n de boas-vindas apenas quando o usuário é recém-criado.
      // splitName foi movido para `@/lib/nameUtils`.

      const adminName =
        authUser?.user_metadata?.first_name && authUser?.user_metadata?.last_name
          ? `${authUser.user_metadata.first_name} ${authUser.user_metadata.last_name}`
          : authUser?.email || 'Admin';

      const ensureRepresentanteUser = async (
        p: DraftRepresentante,
        existingUserId?: string | null,
      ): Promise<string | null> => {
        // Gate: o backend só verifica/provê usuário se o acesso a chamados estiver habilitado.
        if (!p.acesso_chamados) return existingUserId ?? null;

        const email = (p.email || '').trim();
        if (!email) return existingUserId ?? null;
        if (existingUserId) return existingUserId;
        const { first_name, last_name } = splitName(p.nome);
        if (!first_name) return null;
        try {
          const { data, error } = await supabase.functions.invoke('upsert-representante-user', {
            body: { email, first_name, last_name },
          });
          if (error) {
            console.warn('[representante user] invoke error:', error);
            toast.warning(`Não foi possível criar usuário para ${email}`);
            return null;
          }
          if (data?.error) {
            console.warn('[representante user] response error:', data.error);
            toast.warning(`Não foi possível criar usuário para ${email}: ${data.error}`);
            return null;
          }

          // Webhook de boas-vindas — só dispara para usuários recém-criados (mesmo
          // padrão fire-and-forget de useTeamMemberMutations.ts).
          if (data?.created === true) {
            const tempPassword = (data?.temporary_password as string | undefined) ?? '';
            fetch(N8N_WELCOME_WEBHOOK, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event_type: 'user_created',
                user_data: {
                  first_name,
                  last_name: last_name ?? '',
                  email,
                  roles: ['client'],
                  areas: [],
                },
                credentials: {
                  email,
                  temporary_password: tempPassword,
                },
                platform: {
                  login_url: 'https://psa-consultores.lovable.app/auth',
                  name: 'PSA Consultores',
                },
                created_by: adminName,
                created_at: new Date().toISOString(),
              }),
            }).catch((err) =>
              console.error('[representante user] Webhook boas-vindas falhou:', err)
            );
          }

          return (data?.user_id as string) || null;
        } catch (err) {
          console.error('[representante user] unexpected:', err);
          return null;
        }
      };

      const buildPartFields = (p: DraftRepresentante, userId: string | null) => ({
        id_cliente: clienteId,
        nome: p.nome,
        cargo: p.cargo || null,
        email: p.email || null,
        telefone: p.telefone || null,
        tipo_representante: p.tipo_representante || null,
        observacoes: p.observacoes || null,
        acesso_chamados: p.acesso_chamados ?? false,
        user_id: userId,
      });

      currentStep = "representante/upsert";
      for (const p of participants) {
        const pIdField = "id_representante";
        if (p._dbId) {
          // Fetch current user_id to avoid overwriting existing link
          const { data: current } = await (supabase.from(representanteTable) as any)
            .select('user_id')
            .eq(pIdField, p._dbId)
            .maybeSingle();
          const currentUserId = (current as any)?.user_id ?? null;
          const linkedUserId = await ensureRepresentanteUser(p, currentUserId);
          // O vínculo com o usuário entra na conta junto com os campos: ele é
          // resolvido aqui, não vem do rascunho, então não aparece no diff. Sem
          // isto, um representante que só ganhou conta de acesso não teria o
          // `user_id` gravado.
          if (linhaAlterada(partDiffMap, p._dbId) || linkedUserId !== currentUserId) {
            // `.select()` para que a recusa de 0 linhas apareça: sem ela o
            // salvamento seguia e terminava anunciando sucesso (B3).
            const { data: updPart, error } = await (supabase.from(representanteTable) as any)
              .update(buildPartFields(p, linkedUserId))
              .eq(pIdField, p._dbId)
              .select(pIdField);
            if (error) throw recusaDeOperacao({ item: 'representante', acao: 'atualizar' }, error);
            if (!updPart || updPart.length === 0) {
              throw recusaDeOperacao({ item: 'representante', acao: 'atualizar' }, null, { zeroLinhas: true });
            }
          }
        } else {
          const linkedUserId = await ensureRepresentanteUser(p, null);
          const { error } = await (supabase.from(representanteTable) as any).insert(buildPartFields(p, linkedUserId));
          if (error) throw recusaDeOperacao({ item: 'representante', acao: 'cadastrar' }, error);
        }
      }

      // --- Persistir ordens de serviço (update ou insert) + distribuicao_receita + produtos_contratados ---
      const buildOsFields = (c: DraftOrdemServico) => {
        // Dual-write: gravar setor_cliente_id (UUID) e setor_cliente (sigla) para compatibilidade
        const setorSigla = c.setor_cliente_id
          ? setoresCliente.find(s => s.id === c.setor_cliente_id)?.sigla || c.setor_cliente || null
          : c.setor_cliente || null;
        return {
          id_cliente: clienteId,
          numero_os: c.ordem_servico || null,
          data_emissao: c.data_emissao || null,
          data_inicio: c.data_inicio_projeto || null,
          data_fim: c.data_fim_projeto || null,
          valor_projeto: c.valor_projeto || 0,
          // Nulo é "não informado" e é aceito pela coluna; o valor da parcela
          // não vai no payload — é derivado na tela (src/lib/osParcelamento.ts).
          numero_parcelas: c.numero_parcelas ?? null,
          valor_entrada: c.valor_entrada || 0,
          valor_reembolso_km: c.valor_reembolso_km || 0,
          valor_reembolso_refeicao: c.valor_reembolso_refeicao || 0,
          situacao: c.situacao_projeto || "em_andamento",
          observacoes: c.observacoes_projeto || null,
          cluster_id: c.cluster_id || null,
          contribuinte_id: c.contribuinte_id || null,
          setor_cliente: setorSigla,
          setor_cliente_id: c.setor_cliente_id || null,
          regiao: c.regiao || null,
        };
      };

      /**
       * Alguma lista filha de OS mudou (rateio ou produtos contratados).
       *
       * Existe porque `nothingChanged`, lá embaixo, só soma cliente,
       * contribuintes, representantes e OS. Mexer só no rateio gravava o valor
       * novo e a tela dizia "Nenhuma alteração detectada" — a mensagem mentia
       * justamente para quem tinha acabado de mexer.
       */
      let filhosDeOsAlterados = false;

      // Precheck do update uma única vez antes do loop — se houver pelo menos uma OS existente.
      const firstUpdateOs = contracts.find(c => c._dbId);
      if (firstUpdateOs?._dbId) {
        await precheck('ordem_servico', 'update', firstUpdateOs._dbId, {
          item: 'os', acao: 'atualizar', numeroOs: firstUpdateOs.ordem_servico,
        });
      }

      for (const c of contracts) {
        currentStep = c._dbId ? "ordem_servico/update" : "ordem_servico/insert";
        let osId = c._dbId;
        if (c._dbId) {
          // Como no contribuinte: pular a OS intocada não pula o rateio nem os
          // produtos contratados, que são reconciliados logo abaixo.
          if (linhaAlterada(osDiffMap, c._dbId)) {
            // .select() para que uma falha silenciosa de RLS (0 rows) apareça como
            // erro, em vez de o save "concluir" sem gravar a OS.
            const { data: updOs, error } = await (supabase.from("ordem_servico" as any) as any).update(buildOsFields(c)).eq("id", c._dbId).select("id");
            if (error) throw recusaDeOperacao({ item: 'os', acao: 'atualizar', numeroOs: c.ordem_servico }, error);
            if (!updOs || updOs.length === 0) {
              throw recusaDeOperacao({ item: 'os', acao: 'atualizar', numeroOs: c.ordem_servico }, null, { zeroLinhas: true });
            }
          }
        } else {
          // Emissão é a data em que a OS foi criada, e é o insert que marca esse
          // instante. O formulário já preenche na criação da linha, mas o
          // fallback aqui fecha os caminhos que não passam por lá (rascunho
          // antigo, OS clonada) — a coluna nunca nasce vazia.
          // Id gerado no cliente pelo mesmo motivo do contribuinte: RETURNING
          // faria a policy de SELECT recusar o INSERT com 42501.
          const novaOsId = crypto.randomUUID();
          const { error } = await (supabase.from("ordem_servico" as any) as any)
            .insert({ ...buildOsFields(c), data_emissao: c.data_emissao || todayIsoBrazil(), id: novaOsId });
          if (error) throw recusaDeOperacao({ item: 'os', acao: 'cadastrar', numeroOs: c.ordem_servico }, error);
          osId = novaOsId;
        }

        // Persist distribuicao_receita: reconciliação por _dbId (linha a linha).
        // O padrão anterior era "marca tudo como excluído e reinsere a lista".
        // Quando o soft-delete não pegava (erro engolido ou 0 rows por RLS) o
        // insert entrava de novo e as linhas antigas continuavam ativas — cada
        // salvamento somava um centro de custo repetido no rateio (100% → 200% →
        // 300%…), até o total estourar 100% e travar o save do cliente inteiro.
        // Aqui quem ficou é atualizado no lugar, só o que é novo é inserido e só
        // o que saiu do rateio é excluído (com verificação). Reinserir é
        // impossível, então salvar duas vezes não duplica nada.
        if (osId) {
          const draftDist = (c.distribuicao_receita || []).filter(d => d.id_centro_custo);
          const { data: dbDist, error: dbDistError } = await (supabase.from("distribuicao_receita" as any) as any)
            .select("id")
            .eq("id_ordem_servico", osId)
            .eq("excluido", false);
          if (dbDistError) throw recusaDeOperacao({ item: 'rateio', acao: 'atualizar', numeroOs: c.ordem_servico }, dbDistError);

          const rotuloOs = c.ordem_servico || "(sem número)";
          const mantidos = new Set(draftDist.map(d => d._dbId).filter(Boolean) as string[]);
          const distRemovidos = ((dbDist || []) as Array<{ id: string }>)
            .map(r => r.id)
            .filter(id => !mantidos.has(id));

          if (distRemovidos.length > 0) {
            // Sem este rótulo o passo continuava valendo "ordem_servico/update"
            // e o toast culpava a OS por um erro que aconteceu no rateio.
            //
            // RPC, não softDeleteVerificado + assertCanPerform: distribuicao_receita
            // tem o MESMO defeito de RLS de ordem_servico (ver softDeleteViaRpc acima)
            // — update direto de quem não é admin falha com 42501, e assertCanPerform
            // não pega porque o precheck dele não reproduz esse caso. A função
            // dispensa o precheck de propósito (ela é a própria validação).
            currentStep = "distribuicao_receita/soft-delete";
            await softDeleteViaRpc("soft_delete_distribuicao_receita", distRemovidos, { item: 'rateio', acao: 'excluir', numeroOs: c.ordem_servico });
            filhosDeOsAlterados = true;
            logAction({
              area: 'dev',
              entity_type: 'ordem_servico',
              entity_id: osId!,
              entity_name: rotuloOs,
              action: 'updated',
              details: `Rateio: ${distRemovidos.length} linha(s) removida(s)`,
            });
          }

          // O que o banco entregou para esta OS, linha a linha do rateio. É com
          // isto que se decide gravar — comparar contra o snapshot, e não contra
          // uma segunda leitura, é o que evita a diferença de arredondamento
          // (33.339999999999996 nunca vai ser igual a 33.34 relido).
          const distOriginal = new Map(
            ((c._dbId ? snapOsPorId.get(c._dbId)?.distribuicao_receita : undefined) ?? [])
              .filter(d => d._dbId)
              .map(d => [d._dbId!, d]),
          );

          for (const d of draftDist.filter(d => d._dbId)) {
            const original = distOriginal.get(d._dbId!);
            const mudou =
              !original ||
              original.id_centro_custo !== d.id_centro_custo ||
              (original.percentual_rateio ?? 0) !== (d.percentual_rateio ?? 0);
            if (!mudou) continue;

            currentStep = "distribuicao_receita/update";
            const { data: updDist, error: updDistError } = await (supabase.from("distribuicao_receita" as any) as any)
              .update({ id_centro_custo: d.id_centro_custo, percentual_rateio: d.percentual_rateio || 0 })
              .eq("id", d._dbId)
              .select("id");
            if (updDistError) throw recusaDeOperacao({ item: 'rateio', acao: 'atualizar', numeroOs: c.ordem_servico }, updDistError);
            // 0 rows aqui significa linha inexistente ou RLS barrando. Reinserir
            // seria justamente o que duplicava o rateio — então falha alto.
            if (!updDist || updDist.length === 0) {
              throw recusaDeOperacao({ item: 'rateio', acao: 'atualizar', numeroOs: c.ordem_servico }, null, { zeroLinhas: true });
            }
            filhosDeOsAlterados = true;
            // Diff campo-a-campo, como o AGENTS.md exige de toda escrita.
            //
            // O centro de custo vai no `entity_name`, pelo rótulo que a tela
            // mostra. Ele é o que distingue uma linha de rateio da outra: duas
            // linhas que caem de 33,33 para 30 produziriam dois registros
            // idênticos byte a byte, e quem conferisse não saberia qual mudou.
            // Pelo UUID distinguiria, mas ninguém lê UUID numa trilha.
            const rotuloCc = centrosCusto.find(cc => cc.id === d.id_centro_custo)?.label
              || d.id_centro_custo;
            logAction({
              area: 'dev',
              entity_type: 'ordem_servico',
              entity_id: osId!,
              entity_name: `${rotuloOs} · ${rotuloCc}`,
              action: 'updated',
              details: `Rateio da OS ${rotuloOs}`,
              changed_fields: computeFieldDiff(
                (original ?? {}) as unknown as Record<string, unknown>,
                d as unknown as Record<string, unknown>,
                ['id_centro_custo', 'percentual_rateio'],
              ),
            });
          }

          const distNovos = draftDist.filter(d => !d._dbId);
          if (distNovos.length > 0) {
            currentStep = "distribuicao_receita/insert";
            const { error: distError } = await (supabase.from("distribuicao_receita" as any) as any).insert(
              distNovos.map(d => ({
                id_ordem_servico: osId,
                id_centro_custo: d.id_centro_custo,
                percentual_rateio: d.percentual_rateio || 0,
              }))
            );
            if (distError) throw recusaDeOperacao({ item: 'rateio', acao: 'cadastrar', numeroOs: c.ordem_servico }, distError);
            filhosDeOsAlterados = true;
            logAction({
              area: 'dev',
              entity_type: 'ordem_servico',
              entity_id: osId!,
              entity_name: rotuloOs,
              action: 'updated',
              details: `Rateio: ${distNovos.length} linha(s) adicionada(s)`,
            });
          }

          // Persist os_produtos_contratados: selective upsert preserving _dbId
          const draftProdutos = c.produtos_contratados || [];
          // os_produtos_contratados não está no schema tipado — cast justificado
          const { data: existingProdutos } = await (supabase.from("os_produtos_contratados" as any) as any)
            .select("id, produto_segmento_id, horas_contratadas")
            .eq("ordem_servico_id", osId);
          const existingMap = new Map<string, { produto_segmento_id: string; horas_contratadas: number | null }>((existingProdutos || []).map((p: any) => [p.id, { produto_segmento_id: p.produto_segmento_id, horas_contratadas: p.horas_contratadas }]));

          // Determine which to keep, insert, and delete
          const draftDbIds = new Set(draftProdutos.filter(p => p._dbId).map(p => p._dbId!));
          const toDelete = (existingProdutos || []).filter((p: any) => !draftDbIds.has(p.id)).map((p: any) => p.id);

          // Delete removed
          if (toDelete.length > 0) {
            currentStep = "os_produtos_contratados/delete";
            // `.select()` para a recusa de 0 linhas não passar como sucesso (B3).
            const { data: prodApagados, error: delProdError } = await (supabase.from("os_produtos_contratados" as any) as any)
              .delete().in("id", toDelete).select("id");
            if (delProdError) throw recusaDeOperacao({ item: 'produto', acao: 'excluir', numeroOs: c.ordem_servico }, delProdError);
            if ((prodApagados || []).length < toDelete.length) {
              throw recusaDeOperacao({ item: 'produto', acao: 'excluir', numeroOs: c.ordem_servico }, null, { zeroLinhas: true });
            }
            filhosDeOsAlterados = true;
            for (const delId of toDelete) {
              const delProdId = existingMap.get(delId);
              logAction({
                area: 'dev',
                entity_type: 'ordem_servico',
                entity_id: osId!,
                entity_name: c.ordem_servico || '(sem número)',
                action: 'updated',
                details: `Produto removido da OS: ${delProdId}`,
              });
            }
          }

          // Insert new (no _dbId)
          const toInsert = draftProdutos.filter(p => !p._dbId);
          if (toInsert.length > 0) {
            currentStep = "os_produtos_contratados/insert";
            const insertPayload = toInsert.map(p => ({
              ordem_servico_id: osId,
              produto_segmento_id: p.produto_segmento_id,
              horas_contratadas: p.horas_contratadas ?? null,
            }));
            const { error: insErr } = await (supabase.from("os_produtos_contratados" as any) as any).insert(insertPayload);
            if (insErr) throw recusaDeOperacao({ item: 'produto', acao: 'cadastrar', numeroOs: c.ordem_servico }, insErr);
            filhosDeOsAlterados = true;
            for (const ins of toInsert) {
              logAction({
                area: 'dev',
                entity_type: 'ordem_servico',
                entity_id: osId!,
                entity_name: c.ordem_servico || '(sem número)',
                action: 'updated',
                details: `Produto adicionado à OS: ${ins.produto_segmento_id}`,
              });
            }
          }

          // Update existing (with _dbId) — only if produto_segmento_id or horas_contratadas changed
          for (const dp of draftProdutos.filter(p => p._dbId)) {
            const old = existingMap.get(dp._dbId!);
            if (!old) continue;
            const prodChanged = old.produto_segmento_id !== dp.produto_segmento_id;
            const horasChanged = (old.horas_contratadas ?? null) !== (dp.horas_contratadas ?? null);
            if (prodChanged || horasChanged) {
              currentStep = "os_produtos_contratados/update";
              const { data: updProd, error: updProdError } = await (supabase.from("os_produtos_contratados" as any) as any)
                .update({
                  produto_segmento_id: dp.produto_segmento_id,
                  horas_contratadas: dp.horas_contratadas ?? null,
                })
                .eq("id", dp._dbId)
                .select("id");
              if (updProdError) throw recusaDeOperacao({ item: 'produto', acao: 'atualizar', numeroOs: c.ordem_servico }, updProdError);
              if (!updProd || updProd.length === 0) {
                throw recusaDeOperacao({ item: 'produto', acao: 'atualizar', numeroOs: c.ordem_servico }, null, { zeroLinhas: true });
              }
              filhosDeOsAlterados = true;
            }
          }
        }
      }

      // --- Persist cliente_clusters (incremental upsert) ---
      // Só no ramo de edição: na criação, a RPC criar_cliente_com_clusters já
      // gravou os vínculos na mesma transação. Rodar aqui violaria o
      // UNIQUE (cliente_id, cluster_id).
      if (isEditing) {
        // cliente_clusters não está no schema tipado — cast justificado
        const { data: existingClusters } = await (supabase.from('cliente_clusters' as any) as any)
          .select('id, cluster_id')
          .eq('cliente_id', clienteId);
        const existingClusterIds = new Set((existingClusters || []).map((r: any) => r.cluster_id as string));
        const desiredClusterIds = new Set(clusterIds);
        // INSERT new
        const toInsertClusters = clusterIds.filter(id => !existingClusterIds.has(id));
        if (toInsertClusters.length > 0) {
          currentStep = "cliente_clusters/insert";
          const payload = toInsertClusters.map(cid => ({ cliente_id: clienteId, cluster_id: cid }));
          const { error: insErr } = await (supabase.from('cliente_clusters' as any) as any).insert(payload);
          if (insErr) throw recusaDeOperacao({ item: 'cluster', acao: 'cadastrar' }, insErr);
        }
        // DELETE removed
        const toDeleteClusterRows = (existingClusters || []).filter((r: any) => !desiredClusterIds.has(r.cluster_id));
        if (toDeleteClusterRows.length > 0) {
          currentStep = "cliente_clusters/delete";
          const deleteIds = toDeleteClusterRows.map((r: any) => r.id);
          // `.select()` para a recusa de 0 linhas não passar como sucesso (B3):
          // o vínculo continuaria no banco e a tela diria que removeu.
          const { data: clustersRemovidos, error: delErr } = await (supabase.from('cliente_clusters' as any) as any)
            .delete().in('id', deleteIds).select('id');
          if (delErr) throw recusaDeOperacao({ item: 'cluster', acao: 'excluir' }, delErr);
          if ((clustersRemovidos || []).length < deleteIds.length) {
            throw recusaDeOperacao({ item: 'cluster', acao: 'excluir' }, null, { zeroLinhas: true });
          }
        }
      }

      syncCadastrosToDW({
        clientes: [
          {
            id_cliente: clienteResult.id,
            nome: clienteResult.nome,
            fixo: clienteResult.fixo,
            telefone: clienteResult.telefone,
            municipio: clienteResult.municipio,
            uf: clienteResult.uf,
            ativo: clienteResult.ativo,
            categoria: (clienteResult as any).categoria ?? null,
            created_at: clienteResult.created_at,
            updated_at: clienteResult.updated_at,
          },
        ],
      });

      queryClient.invalidateQueries({ queryKey: ["clientes-lista"] });
      queryClient.invalidateQueries({ queryKey: ["clientes-filtrados"] });
      queryClient.invalidateQueries({ queryKey: ["contribuintes-modal"] });
      queryClient.invalidateQueries({ queryKey: ["contribuintes-por-cliente"] });
      queryClient.invalidateQueries({ queryKey: ["os-produtos-contratados"] });
      // Linhas expandidas da lista de clientes (OS + produtos, contribuintes)
      queryClient.invalidateQueries({ queryKey: ["os-expand"] });
      queryClient.invalidateQueries({ queryKey: ["contribuintes-expand"] });

      // ─── Audit logs with granular changed_fields ─────────────
      const auditClienteId = isEditing ? editingClienteId! : createdClienteId!;

      // Os diffs são os mesmos que decidiram o que gravar, lá em cima. Recalcular
      // aqui abriria espaço para a auditoria e o banco discordarem.

      // Cliente
      // Só emitir audit de cliente se houve criação OU se realmente houve alteração
      // (evita "fantasmas" com changed_fields=null quando o usuário salva sem mudar nada).
      if (!isEditing || clientHasChange) {
        logAction({
          area: 'dev',
          entity_type: 'cliente',
          entity_id: auditClienteId,
          entity_name: clientData.nome.trim(),
          action: isEditing ? 'updated' : 'created',
          changed_fields: clientHasChange ? clientDiff : undefined,
        });
      }

      // Contribuintes
      for (const e of entities) {
        const diff = e._dbId ? contribDiffMap.get(e._dbId) : undefined;
        // Skip audit for existing entities with no changes
        if (e._dbId && (!diff || Object.keys(diff).length === 0)) continue;
        logAction({
          area: 'dev',
          entity_type: 'contribuinte',
          entity_id: e._dbId || auditClienteId,
          entity_name: e.nome_razao_social,
          action: e._dbId ? 'updated' : 'created',
          details: `Cliente: ${clientData.nome.trim()}`,
          changed_fields: diff,
        });
      }

      // Representantes
      for (const p of participants) {
        const diff = p._dbId ? partDiffMap.get(p._dbId) : undefined;
        if (p._dbId && (!diff || Object.keys(diff).length === 0)) continue;
        logAction({
          area: 'dev',
          entity_type: 'representante',
          entity_id: p._dbId || auditClienteId,
          entity_name: p.nome,
          action: p._dbId ? 'updated' : 'created',
          details: `Cliente: ${clientData.nome.trim()}`,
          changed_fields: diff,
        });
      }

      // Ordens de Serviço
      for (const c of contracts) {
        const diff = c._dbId ? osDiffMap.get(c._dbId) : undefined;
        if (c._dbId && (!diff || Object.keys(diff).length === 0)) continue;
        logAction({
          area: 'dev',
          entity_type: 'ordem_servico',
          entity_id: c._dbId || auditClienteId,
          entity_name: c.ordem_servico || '(sem número)',
          action: c._dbId ? 'updated' : 'created',
          details: `Cliente: ${clientData.nome.trim()}`,
          changed_fields: diff,
        });
      }

      // Soft-deleted entities
      if (isEditing && snap) {
        const currentContribIds = new Set(entities.filter(e => e._dbId).map(e => e._dbId!));
        for (const old of snap.entities) {
          if (old._dbId && !currentContribIds.has(old._dbId)) {
            logAction({ area: 'dev', entity_type: 'contribuinte', entity_id: old._dbId, entity_name: old.nome_razao_social, action: 'deleted', details: `Cliente: ${clientData.nome.trim()}` });
          }
        }
        const currentPartIds = new Set(participants.filter(p => p._dbId).map(p => p._dbId!));
        for (const old of snap.participants) {
          if (old._dbId && !currentPartIds.has(old._dbId)) {
            logAction({ area: 'dev', entity_type: 'representante', entity_id: old._dbId, entity_name: old.nome, action: 'deleted', details: `Cliente: ${clientData.nome.trim()}` });
          }
        }
        const currentOsIds = new Set(contracts.filter(c => c._dbId).map(c => c._dbId!));
        for (const old of snap.contracts) {
          if (old._dbId && !currentOsIds.has(old._dbId)) {
            logAction({ area: 'dev', entity_type: 'ordem_servico', entity_id: old._dbId, entity_name: old.ordem_servico || '(sem número)', action: 'deleted', details: `Cliente: ${clientData.nome.trim()}` });
          }
        }
      }

      // Feedback preciso: se estava editando e nenhuma entidade teve diff real,
      // informar explicitamente para o usuário perceber que o que ele editou
      // não chegou ao estado salvo (ex.: edição inline não commitada na aba).
      const nothingChanged =
        isEditing &&
        !clientHasChange &&
        contribDiffs.length === 0 &&
        partDiffs.length === 0 &&
        osDiffs.length === 0 &&
        // Rateio e produtos são listas filhas da OS e não aparecem nos diffs
        // acima. Sem esta parcela, mexer só no rateio gravava o valor novo e a
        // tela ainda dizia "Nenhuma alteração detectada".
        !filhosDeOsAlterados;
      if (nothingChanged) {
        toast.info("Nenhuma alteração detectada. Se você editou algum item, confirme o botão Salvar da linha antes de salvar o cliente.");
      } else {
        // Um aviso só para o salvamento inteiro: as frases de cada item servem
        // para nomear a etapa que falhou, não para anunciar etapa concluída.
        toast.success(isEditing ? "Cliente atualizado com sucesso." : "Cliente cadastrado com sucesso.");
      }

      // Aviso (não bloqueante) do que já estava incompleto e não foi tocado:
      // salvar segue funcionando, mas a pendência não passa despercebida.
      if (pendencias.length > 0) {
        const amostra = pendencias.slice(0, 2).join(" · ");
        const extras = pendencias.length - 2;
        toast.warning(
          `Pendências em itens que você não alterou: ${amostra}${extras > 0 ? ` · +${extras}` : ""}`,
          { duration: 10000 },
        );
      }
      onSuccess();
    } catch (error: any) {
      // Rollback: desfaz o cliente recém-criado (CASCADE remove os filhos).
      //
      // O retorno não era lido: quando o desfazer era recusado, o cliente
      // continuava no banco pela metade e ninguém ficava sabendo — é o que
      // deixou cliente órfão em produção.
      // A conferência é por releitura, e não por `.select()`: pedir a linha de
      // volta ligaria o RETURNING, e o cliente recém-criado pode nascer
      // invisível para quem o criou (cluster de outra área) — a policy de
      // leitura recusaria o DELETE inteiro, justamente o oposto do que se quer
      // aqui. Se a linha continuar visível, o desfazer não gravou.
      let desfazerFalhou = false;
      if (createdClienteId) {
        const { error: rollbackError } = await supabase
          .from(clienteTable).delete().eq("id", createdClienteId);
        const { data: aindaLa } = await supabase
          .from(clienteTable).select("id").eq("id", createdClienteId);
        desfazerFalhou = !!rollbackError || (aindaLa || []).length > 0;
        if (desfazerFalhou) {
          console.error("[rollback] Falha ao remover cliente:", createdClienteId, rollbackError);
        } else {
          console.log("[rollback] Cliente removido:", createdClienteId);
        }
      }

      // O diagnóstico — passo, código e frase crua do banco — fica aqui, para
      // abrir chamado sem reproduzir o erro. Nada disso vai para a tela.
      const recusa = error instanceof RecusaDeOperacao ? error : null;
      console.error(
        "[cadastro cliente] erro:", error,
        "passo:", currentStep,
        recusa ? `categoria: ${recusa.categoria} · item: ${recusa.operacao.item}/${recusa.operacao.acao}` : "",
      );

      const texto = recusa
        ? textoDoSalvamentoRecusado(recusa)
        // Falha que não passou pela tradução (rede, bug, validação de trigger):
        // ainda assim a pessoa precisa saber que o salvamento não aconteceu.
        : textoDeRecusa({ item: 'cliente', acao: isEditing ? 'atualizar' : 'cadastrar' }, 'falha');
      toast.error(texto.titulo, { description: texto.detalhe });

      if (desfazerFalhou) {
        const desfazer = textoDeRecusa({ item: 'cliente', acao: 'excluir' }, 'falha');
        toast.error(desfazer.titulo, { description: desfazer.detalhe, duration: 10000 });
      }
    }
  }, [clientData, entities, participants, contracts, inscricoesMap, clusterIds, isEditing, editingClienteId, setoresCliente, centrosCusto, onDuplicateFound, onSuccess, logAction, queryClient, originalSnapshot, authUser]);

  /**
   * Um salvamento por vez, do primeiro clique até o fim.
   *
   * `disabled={saving}` no botão não bastava: `saving` só virava `true` depois da
   * verificação de nome duplicado e do diálogo de confirmação que ela abre, então
   * dois cliques seguidos disparavam duas verificações e dois cadastros do mesmo
   * cliente. Agora a bandeira sobe antes de qualquer `await`.
   *
   * A trava é a `ref`, não o estado: `setSaving` só chega ao botão no render
   * seguinte, e dois cliques no mesmo quadro passariam os dois. A `ref` muda no
   * ato. O estado continua existindo para a tela (botão desabilitado e spinner),
   * agora pelo tempo inteiro da operação, inclusive enquanto o diálogo está aberto.
   */
  const salvamentoEmCurso = useRef(false);
  const executeSave = useCallback(async () => {
    if (salvamentoEmCurso.current) return;
    salvamentoEmCurso.current = true;
    setSaving(true);
    try {
      await executarSalvamento();
    } finally {
      salvamentoEmCurso.current = false;
      setSaving(false);
    }
  }, [executarSalvamento]);

  // Mantido para as telas que ainda barram o save quando há rascunho de aba
  // aberto; devolve as abas pendentes em vez de salvar.
  const handleSave = useCallback(() => {
    const pendingTabs = getDraftPendingTabs?.() ?? [];
    if (pendingTabs.length > 0) return pendingTabs;
    executeSave();
    return null;
  }, [getDraftPendingTabs, executeSave]);

  return { handleSave, executeSave, saving };
};
