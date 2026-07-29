import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from '@/hooks/useAuditLog';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { useAuth } from '@/contexts/AuthContext';
import { isProductionEnvironment, currentAmbiente } from '@/config/api';
import { toast } from 'sonner';
import { computeFieldDiff, computeEntityListDiff } from '@/lib/diffUtils';
import {
  isSameRecord,
  validateNomeCliente,
  validateObservacoesCliente,
  validateContribuinteDocumento,
  validateContribuinteDados,
  findDocumentosDuplicados,
  validateRepresentante,
  validateOrdemServico,
} from '@/lib/clientFormValidation';
import type { DraftEntity, InscricaoIE, DraftRepresentante, DraftOrdemServico } from '@/types/clientForm';
import { N8N_WELCOME_WEBHOOK } from '@/lib/webhooks';
import { splitName } from '@/lib/nameUtils';

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
 */
const softDeleteVerificado = async (
  table: string,
  idField: string,
  ids: string[],
  rotulo: string,
): Promise<void> => {
  // Tabelas de OS/rateio não estão no schema tipado — cast justificado
  const { error } = await (supabase.from(table as any) as any).update({ excluido: true }).in(idField, ids);
  if (error) throw error;
  const { data: restantes, error: reReadError } = await (supabase.from(table as any) as any)
    .select(idField)
    .in(idField, ids)
    .eq("excluido", false);
  if (reReadError) throw reReadError;
  if (restantes && restantes.length > 0) {
    throw new Error(
      `Não foi possível excluir ${restantes.length} ${rotulo}. O banco recusou a exclusão (permissão/RLS) — nada foi removido. Fale com a liderança.`
    );
  }
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
  /** Opcional: abas com rascunho pendente. Quem não usa rascunho intermediário não precisa passar. */
  getDraftPendingTabs?: () => string[];
  onDuplicateFound: (name: string) => Promise<boolean>;
  onSuccess: () => void;
  originalSnapshot?: OriginalSnapshot | null;
}

export const useSaveClientTransaction = (params: SaveTransactionParams) => {
  const {
    clientData, entities, participants, contracts, inscricoesMap, clusterIds = [],
    isEditing, editingClienteId, setoresCliente, getDraftPendingTabs,
    onDuplicateFound, onSuccess, originalSnapshot,
  } = params;

  const { logAction } = useAuditLog();
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const executeSave = useCallback(async () => {
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
      if (registrarErro(validateOrdemServico(c), tocado)) return;
    }

    // --- Duplicate name check (only on creation) ---
    if (!isEditing) {
      const { data: existing } = await supabase
        .from(clienteTable)
        .select("id, nome")
        .eq("nome", clientData.nome.trim())
        .eq("excluido", false)
        .limit(1);
      if (existing && existing.length > 0) {
        const confirmed = await onDuplicateFound(clientData.nome.trim());
        if (!confirmed) return;
      }
    }

    setSaving(true);
    let createdClienteId: string | null = null;
    try {
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
        const { data: updated, error } = await supabase
          .from(clienteTable)
          // cast: coluna `observacoes` é aplicada via migração no Lovable e ainda não está nos tipos gerados
          .update(clientPayload as any)
          .eq("id", editingClienteId!)
          .select()
          .single();
        if (error) throw error;
        clienteId = editingClienteId!;
        clienteResult = updated;

        // --- Contribuintes: update existentes, insert novos, soft-delete removidos ---
        const currentContribDbIds = entities.filter(e => e._dbId).map(e => e._dbId!);
        const { data: dbContribs } = await supabase.from(contribuinteTable).select("id").eq("cliente_id", clienteId).eq("excluido", false);
        const removedContribIds = (dbContribs || []).map(c => c.id).filter(id => !currentContribDbIds.includes(id));
        if (removedContribIds.length > 0) {
          await softDeleteVerificado(contribuinteTable, "id", removedContribIds, "contribuinte(s)");
        }

        // --- Representantes: update existentes, insert novos, soft-delete removidos ---
        const partIdField = "id_representante";
        const currentPartDbIds = participants.filter(p => p._dbId).map(p => p._dbId!);
        const { data: dbParts } = await (supabase.from(representanteTable) as any).select(partIdField).eq("id_cliente", clienteId).eq("excluido", false);
        const removedPartIds = (dbParts || []).map((p: any) => p[partIdField]).filter((id: string) => !currentPartDbIds.includes(id));
        if (removedPartIds.length > 0) {
          await softDeleteVerificado(representanteTable, partIdField, removedPartIds, "representante(s)");
        }

        // --- Ordens de Serviço: update existentes, insert novos, soft-delete removidos ---
        const currentOsDbIds = contracts.filter(c => c._dbId).map(c => c._dbId!);
        // ordem_servico is not in generated types — cast justified
        const { data: dbOS } = await (supabase.from("ordem_servico" as any) as any).select("id").eq("id_cliente", clienteId).eq("excluido", false);
        const removedOsIds = (dbOS || []).map((o: any) => o.id).filter((id: string) => !currentOsDbIds.includes(id));
        if (removedOsIds.length > 0) {
          // Precheck do soft-delete em lote — RLS uniforme, basta uma linha pra cobrir todas.
          await assertCanPerform('ordem_servico', 'update', removedOsIds[0]);
          await softDeleteVerificado("ordem_servico", "id", removedOsIds, "OS");

          // O rateio acompanha a OS: sem isso sobra linha de distribuicao_receita
          // ativa apontando pra OS excluída (receita fantasma nos relatórios).
          const { data: distDeOsRemovida, error: distOrfaError } = await (supabase.from("distribuicao_receita" as any) as any)
            .select("id")
            .in("id_ordem_servico", removedOsIds)
            .eq("excluido", false);
          if (distOrfaError) throw distOrfaError;
          const distOrfaIds = ((distDeOsRemovida || []) as Array<{ id: string }>).map(r => r.id);
          if (distOrfaIds.length > 0) {
            await assertCanPerform('distribuicao_receita', 'update', distOrfaIds[0]);
            await softDeleteVerificado("distribuicao_receita", "id", distOrfaIds, "linha(s) de Distribuição de Receita da OS excluída");
          }
        }
      } else {
        // RPC atômica: insere cliente + cliente_clusters na mesma transação
        // (contorna trigger DEFERRED trg_cliente_tem_cluster). Retorna a linha completa
        // (created_at/updated_at do banco + nome já normalizado pelo trigger).
        const { data: novo, error } = await (supabase.rpc as any)(
          'criar_cliente_com_clusters',
          { p_cliente: clientPayload, p_cluster_ids: clusterIds }
        );
        if (error) throw error;
        clienteId = (novo as any).id;
        createdClienteId = clienteId;
        clienteResult = novo;
      }

      // --- Persistir contribuintes (update ou insert) ---
      const buildContribFields = (e: DraftEntity) => ({
        cliente_id: clienteId,
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
        let contribId = e._dbId;
        if (e._dbId) {
          // Usar .select() garante que uma falha silenciosa de RLS (0 rows
          // afetadas) apareça como erro, em vez de o save "concluir" sem gravar.
          const { data: updRows, error } = await supabase.from(contribuinteTable).update(buildContribFields(e)).eq("id", e._dbId).select("id");
          if (error) throw error;
          if (!updRows || updRows.length === 0) {
            throw new Error(`UPDATE de contribuinte ${e._dbId} não atingiu nenhuma linha (RLS ou id inválido).`);
          }
        } else {
          const { data: newContrib, error } = await supabase.from(contribuinteTable).insert(buildContribFields(e)).select("id").single();
          if (error) throw error;
          contribId = newContrib.id;
        }

        // Persist inscricoes estaduais
        const entityKey = e._dbId || String(e._id);
        const ies = inscricoesMap[entityKey] || [];
        if (contribId) {
          const { data: existingIEs } = await (supabase as any)
            .from("inscricao_contribuinte")
            .select("id")
            .eq("contribuinte_id", contribId);
          const currentDbIds = ies.filter(ie => ie._dbId).map(ie => ie._dbId!);
          const removedIds = (existingIEs || []).map((r: any) => r.id).filter((id: string) => !currentDbIds.includes(id));
          if (removedIds.length > 0) {
            // Precheck do delete em lote — RLS uniforme, basta uma linha pra cobrir todas.
            await assertCanPerform('inscricao_contribuinte', 'delete', removedIds[0]);
            await (supabase as any).from("inscricao_contribuinte").delete().in("id", removedIds);
          }
          // Precheck do update uma única vez antes do loop — se houver pelo menos uma IE existente.
          const firstUpdateIe = ies.find(ie => ie._dbId);
          if (firstUpdateIe?._dbId) {
            await assertCanPerform('inscricao_contribuinte', 'update', firstUpdateIe._dbId);
          }
          for (const ie of ies) {
            const iePayload = {
              contribuinte_id: contribId,
              situacao: ie.situacao,
              numero_ie: ie.situacao === "sim" ? (ie.numero_ie || null) : null,
              uf: ie.uf,
            };
            if (ie._dbId) {
              await (supabase as any).from("inscricao_contribuinte").update(iePayload).eq("id", ie._dbId);
            } else {
              await (supabase as any).from("inscricao_contribuinte").insert(iePayload);
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
          const { error } = await (supabase.from(representanteTable) as any)
            .update(buildPartFields(p, linkedUserId))
            .eq(pIdField, p._dbId);
          if (error) throw error;
        } else {
          const linkedUserId = await ensureRepresentanteUser(p, null);
          const { error } = await (supabase.from(representanteTable) as any).insert(buildPartFields(p, linkedUserId));
          if (error) throw error;
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
          valor_reembolso_km: c.valor_reembolso_km || 0,
          valor_reembolso_refeicao: c.valor_reembolso_refeicao || 0,
          situacao: c.situacao_projeto || "em_andamento",
          observacoes: c.observacoes_projeto || null,
          cluster_id: c.cluster_id || null,
          setor_cliente: setorSigla,
          setor_cliente_id: c.setor_cliente_id || null,
          regiao: c.regiao || null,
        };
      };

      // Precheck do update uma única vez antes do loop — se houver pelo menos uma OS existente.
      const firstUpdateOs = contracts.find(c => c._dbId);
      if (firstUpdateOs?._dbId) {
        await assertCanPerform('ordem_servico', 'update', firstUpdateOs._dbId);
      }

      for (const c of contracts) {
        let osId = c._dbId;
        if (c._dbId) {
          // .select() para que uma falha silenciosa de RLS (0 rows) apareça como
          // erro, em vez de o save "concluir" sem gravar a OS.
          const { data: updOs, error } = await (supabase.from("ordem_servico" as any) as any).update(buildOsFields(c)).eq("id", c._dbId).select("id");
          if (error) throw error;
          if (!updOs || updOs.length === 0) {
            throw new Error(`UPDATE da OS ${c.ordem_servico || "(sem número)"} não atingiu nenhuma linha (RLS ou id inválido).`);
          }
        } else {
          const { data: newOs, error } = await (supabase.from("ordem_servico" as any) as any).insert(buildOsFields(c)).select("id").single();
          if (error) throw error;
          osId = newOs.id;
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
          if (dbDistError) throw dbDistError;

          const rotuloOs = c.ordem_servico || "(sem número)";
          const mantidos = new Set(draftDist.map(d => d._dbId).filter(Boolean) as string[]);
          const distRemovidos = ((dbDist || []) as Array<{ id: string }>)
            .map(r => r.id)
            .filter(id => !mantidos.has(id));

          if (distRemovidos.length > 0) {
            // Precheck do soft-delete em lote — RLS uniforme, basta uma linha pra cobrir todas.
            await assertCanPerform('distribuicao_receita', 'update', distRemovidos[0]);
            await softDeleteVerificado("distribuicao_receita", "id", distRemovidos, `linha(s) de Distribuição de Receita da OS ${rotuloOs}`);
          }

          for (const d of draftDist.filter(d => d._dbId)) {
            const { data: updDist, error: updDistError } = await (supabase.from("distribuicao_receita" as any) as any)
              .update({ id_centro_custo: d.id_centro_custo, percentual_rateio: d.percentual_rateio || 0 })
              .eq("id", d._dbId)
              .select("id");
            if (updDistError) throw updDistError;
            // 0 rows aqui significa linha inexistente ou RLS barrando. Reinserir
            // seria justamente o que duplicava o rateio — então falha alto.
            if (!updDist || updDist.length === 0) {
              throw new Error(
                `Não foi possível atualizar a Distribuição de Receita da OS ${rotuloOs}. Feche e abra o cadastro para recarregar os dados e tente de novo.`
              );
            }
          }

          const distNovos = draftDist.filter(d => !d._dbId);
          if (distNovos.length > 0) {
            const { error: distError } = await (supabase.from("distribuicao_receita" as any) as any).insert(
              distNovos.map(d => ({
                id_ordem_servico: osId,
                id_centro_custo: d.id_centro_custo,
                percentual_rateio: d.percentual_rateio || 0,
              }))
            );
            if (distError) throw distError;
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
            const { error: delProdError } = await (supabase.from("os_produtos_contratados" as any) as any).delete().in("id", toDelete);
            if (delProdError) throw delProdError;
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
            const insertPayload = toInsert.map(p => ({
              ordem_servico_id: osId,
              produto_segmento_id: p.produto_segmento_id,
              horas_contratadas: p.horas_contratadas ?? null,
            }));
            const { error: insErr } = await (supabase.from("os_produtos_contratados" as any) as any).insert(insertPayload);
            if (insErr) throw insErr;
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
              const { error: updProdError } = await (supabase.from("os_produtos_contratados" as any) as any)
                .update({
                  produto_segmento_id: dp.produto_segmento_id,
                  horas_contratadas: dp.horas_contratadas ?? null,
                })
                .eq("id", dp._dbId);
              if (updProdError) throw updProdError;
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
          const payload = toInsertClusters.map(cid => ({ cliente_id: clienteId, cluster_id: cid }));
          const { error: insErr } = await (supabase.from('cliente_clusters' as any) as any).insert(payload);
          if (insErr) throw insErr;
        }
        // DELETE removed
        const toDeleteClusterRows = (existingClusters || []).filter((r: any) => !desiredClusterIds.has(r.cluster_id));
        if (toDeleteClusterRows.length > 0) {
          const deleteIds = toDeleteClusterRows.map((r: any) => r.id);
          await (supabase.from('cliente_clusters' as any) as any).delete().in('id', deleteIds);
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
      const clientFields = ['nome', 'categoria', 'ativo', 'fixo', 'telefone', 'municipio', 'uf', 'observacoes'];
      const contribFields = ['tipo_pessoa', 'cpf_cnpj', 'nome_razao_social', 'nome_fantasia', 'situacao_inscricao_estadual', 'inscricao_estadual', 'cod_cnae', 'setor', 'simples_nacional', 'telefone', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'municipio', 'uf', 'contribuinte_faturamento'];
      const partFields = ['nome', 'tipo_representante', 'cargo', 'email', 'telefone', 'observacoes', 'acesso_chamados'];
      const osFields = ['ordem_servico', 'data_emissao', 'data_inicio_projeto', 'data_fim_projeto', 'valor_projeto', 'valor_reembolso_km', 'valor_reembolso_refeicao', 'situacao_projeto', 'observacoes_projeto', 'cluster_id', 'setor_cliente', 'setor_cliente_id', 'regiao'];

      const snap = isEditing ? originalSnapshot : null;

      // Cliente
      const clientDiff = snap
        ? computeFieldDiff(snap.clientData as unknown as Record<string, unknown>, clientData as unknown as Record<string, unknown>, clientFields)
        : null;
      const clientHasChange = !!clientDiff && Object.keys(clientDiff).length > 0;
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
      const contribDiffs = snap
        ? computeEntityListDiff(snap.entities as unknown as Record<string, unknown>[], entities as unknown as Record<string, unknown>[], '_dbId', contribFields)
        : [];
      const contribDiffMap = new Map(contribDiffs.map(d => [d.entityId, d.diff]));

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
      const partDiffs = snap
        ? computeEntityListDiff(snap.participants as unknown as Record<string, unknown>[], participants as unknown as Record<string, unknown>[], '_dbId', partFields)
        : [];
      const partDiffMap = new Map(partDiffs.map(d => [d.entityId, d.diff]));

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
      const osDiffs = snap
        ? computeEntityListDiff(snap.contracts as unknown as Record<string, unknown>[], contracts as unknown as Record<string, unknown>[], '_dbId', osFields)
        : [];
      const osDiffMap = new Map(osDiffs.map(d => [d.entityId, d.diff]));

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
        osDiffs.length === 0;
      if (nothingChanged) {
        toast.info("Nenhuma alteração detectada. Se você editou algum item, confirme o botão Salvar da linha antes de salvar o cliente.");
      } else {
        toast.success(isEditing ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!");
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
      // Rollback: delete newly created client (CASCADE removes children)
      if (createdClienteId) {
        try {
          await supabase.from(clienteTable).delete().eq("id", createdClienteId);
          console.log("[rollback] Cliente removido:", createdClienteId);
        } catch (rollbackErr) {
          console.error("[rollback] Falha ao remover cliente:", rollbackErr);
        }
      }
      console.error("[cadastro cliente] erro:", error);
      const rlsMsg = (error?.message || "").toLowerCase();
      const isRls =
        error?.code === "42501" ||
        rlsMsg.includes("row-level security") ||
        rlsMsg.includes("violates row") ||
        rlsMsg.includes("permission denied");
      const acao = isEditing ? "atualizar" : "cadastrar";
      toast.error(
        isRls
          ? `Sem permissão para ${acao} cliente com o seu perfil/cluster. Fale com a liderança.`
          : `Erro ao ${acao} cliente: ` + error.message
      );
    } finally {
      setSaving(false);
    }
  }, [clientData, entities, participants, contracts, inscricoesMap, clusterIds, isEditing, editingClienteId, setoresCliente, onDuplicateFound, onSuccess, logAction, queryClient, originalSnapshot, authUser]);

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
