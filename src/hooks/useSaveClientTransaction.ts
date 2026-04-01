import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from '@/hooks/useAuditLog';
import { isProductionEnvironment, currentAmbiente } from '@/config/api';
import { toast } from 'sonner';
import type { DraftEntity, InscricaoIE, DraftParticipant, DraftOrdemServico } from '@/types/clientForm';

const clienteTable = 'cliente';
const contribuinteTable = 'contribuinte';
const participanteTable = 'participante';

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
  setor_cliente: string;
  setor_cliente_id: string;
  regiao: string;
}

interface SaveTransactionParams {
  clientData: ClientDataShape;
  entities: DraftEntity[];
  participants: DraftParticipant[];
  contracts: DraftOrdemServico[];
  inscricoesMap: Record<string, InscricaoIE[]>;
  isEditing: boolean;
  editingClienteId?: string | null;
  setoresCliente: SetorCliente[];
  getDraftPendingTabs: () => string[];
  onDuplicateFound: (name: string) => Promise<boolean>;
  onSuccess: () => void;
}

export const useSaveClientTransaction = (params: SaveTransactionParams) => {
  const {
    clientData, entities, participants, contracts, inscricoesMap,
    isEditing, editingClienteId, setoresCliente,
    getDraftPendingTabs, onDuplicateFound, onSuccess,
  } = params;

  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const executeSave = useCallback(async () => {
    if (!clientData.nome.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }

    if (!clientData.setor_cliente) {
      toast.error("Área do negócio é obrigatória");
      return;
    }
    if (!clientData.regiao) {
      toast.error("Região é obrigatória");
      return;
    }

    // --- Pre-validation: distribuicao_receita UUIDs and percentage sums ---
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const c of contracts) {
      if (c.distribuicao_receita && c.distribuicao_receita.length > 0) {
        for (const d of c.distribuicao_receita) {
          if (!d.id_centro_custo || !UUID_REGEX.test(d.id_centro_custo)) {
            toast.error(`OS "${c.ordem_servico || "(sem número)"}": selecione um centro de custo válido para cada linha de distribuição`);
            return;
          }
        }
        const totalPercent = c.distribuicao_receita.reduce((sum, d) => sum + (d.percentual_rateio || 0), 0);
        if (Math.abs(totalPercent - 100) > 0.01) {
          toast.error(`OS "${c.ordem_servico || "(sem número)"}": a soma dos percentuais de distribuição deve ser 100% (atual: ${totalPercent.toFixed(2)}%)`);
          return;
        }
      }
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
      // Dual-write: gravar setor_cliente_id (UUID) e setor_cliente (sigla) para compatibilidade
      const setorSigla = clientData.setor_cliente_id
        ? setoresCliente.find(s => s.id === clientData.setor_cliente_id)?.sigla || clientData.setor_cliente || null
        : clientData.setor_cliente || null;

      const clientPayload = {
        nome: clientData.nome.trim(),
        categoria: clientData.categoria || null,
        ativo: clientData.ativo,
        fixo: clientData.fixo || null,
        telefone: clientData.telefone.trim() || null,
        municipio: clientData.municipio.trim() || null,
        uf: clientData.uf.trim() || null,
        setor_cliente: setorSigla,
        setor_cliente_id: clientData.setor_cliente_id || null,
        regiao: clientData.regiao || null,
        ambiente: currentAmbiente,
      };

      let clienteId: string;
      let clienteResult: any;

      if (isEditing) {
        const { data: updated, error } = await supabase
          .from(clienteTable)
          .update(clientPayload)
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
          await supabase.from(contribuinteTable).update({ excluido: true } as any).in("id", removedContribIds);
        }

        // --- Participantes: update existentes, insert novos, soft-delete removidos ---
        const partIdField = "id_participante";
        const currentPartDbIds = participants.filter(p => p._dbId).map(p => p._dbId!);
        const { data: dbParts } = await (supabase.from(participanteTable) as any).select(partIdField).eq("id_cliente", clienteId).eq("excluido", false);
        const removedPartIds = (dbParts || []).map((p: any) => p[partIdField]).filter((id: string) => !currentPartDbIds.includes(id));
        if (removedPartIds.length > 0) {
          await (supabase.from(participanteTable) as any).update({ excluido: true }).in(partIdField, removedPartIds);
        }

        // --- Ordens de Serviço: update existentes, insert novos, soft-delete removidos ---
        const currentOsDbIds = contracts.filter(c => c._dbId).map(c => c._dbId!);
        // ordem_servico is not in generated types — cast justified
        const { data: dbOS } = await (supabase.from("ordem_servico" as any) as any).select("id").eq("id_cliente", clienteId).eq("excluido", false);
        const removedOsIds = (dbOS || []).map((o: any) => o.id).filter((id: string) => !currentOsDbIds.includes(id));
        if (removedOsIds.length > 0) {
          await (supabase.from("ordem_servico" as any) as any).update({ excluido: true }).in("id", removedOsIds);
        }
      } else {
        const { data: newCliente, error: clienteError } = await supabase
          .from(clienteTable)
          .insert(clientPayload)
          .select()
          .single();
        if (clienteError) throw clienteError;
        clienteId = newCliente.id;
        createdClienteId = newCliente.id;
        clienteResult = newCliente;
      }

      // --- Persistir contribuintes (update ou insert) ---
      const buildContribFields = (e: DraftEntity) => ({
        cliente_id: clienteId,
        tipo_pessoa: e.tipo_pessoa,
        cpf_cnpj: e.cpf_cnpj || null,
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
          const { error } = await supabase.from(contribuinteTable).update(buildContribFields(e)).eq("id", e._dbId);
          if (error) throw error;
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
            await (supabase as any).from("inscricao_contribuinte").delete().in("id", removedIds);
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

      // --- Persistir participantes (update ou insert) ---
      const buildPartFields = (p: DraftParticipant) => ({
        id_cliente: clienteId,
        nome: p.nome,
        cargo: p.cargo || null,
        email: p.email || null,
        telefone: p.telefone || null,
        tipo_participante: p.tipo_participante || null,
        observacoes: p.observacoes || null,
        acesso_chamados: p.acesso_chamados ?? false,
      });

      for (const p of participants) {
        const pIdField = "id_participante";
        if (p._dbId) {
          const { error } = await (supabase.from(participanteTable) as any).update(buildPartFields(p)).eq(pIdField, p._dbId);
          if (error) throw error;
        } else {
          const { error } = await (supabase.from(participanteTable) as any).insert(buildPartFields(p));
          if (error) throw error;
        }
      }

      // --- Persistir ordens de serviço (update ou insert) + distribuicao_receita + produtos_contratados ---
      const buildOsFields = (c: DraftOrdemServico) => ({
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
        // id_produto_segmento removido do payload — agora usa os_produtos_contratados
      });

      for (const c of contracts) {
        let osId = c._dbId;
        if (c._dbId) {
          const { error } = await (supabase.from("ordem_servico" as any) as any).update(buildOsFields(c)).eq("id", c._dbId);
          if (error) throw error;
        } else {
          const { data: newOs, error } = await (supabase.from("ordem_servico" as any) as any).insert(buildOsFields(c)).select("id").single();
          if (error) throw error;
          osId = newOs.id;
        }

        // Persist distribuicao_receita: soft-delete old then insert new
        if (osId) {
          await (supabase.from("distribuicao_receita" as any) as any).update({ excluido: true }).eq("id_ordem_servico", osId).eq("excluido", false);
          if (c.distribuicao_receita && c.distribuicao_receita.length > 0) {
            const distPayload = c.distribuicao_receita
              .filter(d => d.id_centro_custo)
              .map(d => ({
                id_ordem_servico: osId,
                id_centro_custo: d.id_centro_custo,
                percentual_rateio: d.percentual_rateio || 0,
              }));
            if (distPayload.length > 0) {
              const { error: distError } = await (supabase.from("distribuicao_receita" as any) as any).insert(distPayload);
              if (distError) throw distError;
            }
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
            await (supabase.from("os_produtos_contratados" as any) as any).delete().in("id", toDelete);
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
              await (supabase.from("os_produtos_contratados" as any) as any)
                .update({
                  produto_segmento_id: dp.produto_segmento_id,
                  horas_contratadas: dp.horas_contratadas ?? null,
                })
                .eq("id", dp._dbId);
            }
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
            setor_cliente: clienteResult.setor_cliente,
            municipio: clienteResult.municipio,
            uf: clienteResult.uf,
            ativo: clienteResult.ativo,
            categoria: (clienteResult as any).categoria ?? null,
            created_at: clienteResult.created_at,
            updated_at: clienteResult.updated_at,
            regiao: (clienteResult as any).regiao ?? null,
          },
        ],
      });

      queryClient.invalidateQueries({ queryKey: ["clientes-lista"] });
      queryClient.invalidateQueries({ queryKey: ["clientes-filtrados"] });
      queryClient.invalidateQueries({ queryKey: ["contribuintes-modal"] });
      queryClient.invalidateQueries({ queryKey: ["contribuintes-por-cliente"] });
      queryClient.invalidateQueries({ queryKey: ["os-produtos-contratados"] });

      // ─── Audit logs ───────────────────────────────────────────
      const auditClienteId = isEditing ? editingClienteId! : createdClienteId!;
      logAction({
        area: 'dev',
        entity_type: 'cliente',
        entity_id: auditClienteId,
        entity_name: clientData.nome.trim(),
        action: isEditing ? 'updated' : 'created',
      });

      for (const e of entities) {
        logAction({
          area: 'dev',
          entity_type: 'contribuinte',
          entity_id: e._dbId || auditClienteId,
          entity_name: e.nome_razao_social,
          action: e._dbId ? 'updated' : 'created',
          details: `Cliente: ${clientData.nome.trim()}`,
        });
      }

      for (const p of participants) {
        logAction({
          area: 'dev',
          entity_type: 'participante',
          entity_id: p._dbId || auditClienteId,
          entity_name: p.nome,
          action: p._dbId ? 'updated' : 'created',
          details: `Cliente: ${clientData.nome.trim()}`,
        });
      }

      for (const c of contracts) {
        logAction({
          area: 'dev',
          entity_type: 'ordem_servico',
          entity_id: c._dbId || auditClienteId,
          entity_name: c.ordem_servico || '(sem número)',
          action: c._dbId ? 'updated' : 'created',
          details: `Cliente: ${clientData.nome.trim()}`,
        });
      }

      if (isEditing) {
        logAction({
          area: 'dev',
          entity_type: 'cliente',
          entity_id: auditClienteId,
          entity_name: clientData.nome.trim(),
          action: 'updated',
          details: `Atualização completa: ${entities.length} contribuintes, ${participants.length} participantes, ${contracts.length} OS`,
        });
      }

      toast.success(isEditing ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!");
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
      toast.error(`Erro ao ${isEditing ? "atualizar" : "cadastrar"} cliente: ` + error.message);
    } finally {
      setSaving(false);
    }
  }, [clientData, entities, participants, contracts, inscricoesMap, isEditing, editingClienteId, setoresCliente, onDuplicateFound, onSuccess, logAction, queryClient]);

  const handleSave = useCallback(() => {
    const pendingTabs = getDraftPendingTabs();
    if (pendingTabs.length > 0) {
      return pendingTabs;
    }
    executeSave();
    return null;
  }, [getDraftPendingTabs, executeSave]);

  return { handleSave, executeSave, saving };
};
