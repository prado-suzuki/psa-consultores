import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";
import { isProductionEnvironment } from "@/config/api";
import type {
  DraftEntity,
  DraftParticipant,
  DraftOrdemServico,
  InscricaoIE,
} from "@/types/clientForm";

const clienteTable = isProductionEnvironment ? "cliente" : "cliente_dev";
const contribuinteTable = isProductionEnvironment
  ? "contribuinte"
  : "contribuinte_dev";
const participanteTable = isProductionEnvironment
  ? "participante"
  : "participante_dev";

// ── Payload types ──────────────────────────────────────────────

export interface SaveClientPayload {
  clientData: {
    nome: string;
    categoria: string;
    ativo: boolean;
    fixo: string;
    telefone: string;
    municipio: string;
    uf: string;
    setor_cliente: string;
    regiao: string;
  };
  entities: DraftEntity[];
  inscricoesMap: Record<string, InscricaoIE[]>;
  participants: DraftParticipant[];
  contracts: DraftOrdemServico[];
  isEditing: boolean;
  editingClienteId: string | null;
}

// ── Helpers (pure, no side‑effects) ────────────────────────────

const buildContribFields = (e: DraftEntity, clienteId: string) => ({
  cliente_id: clienteId,
  tipo_pessoa: e.tipo_pessoa,
  cpf_cnpj: e.cpf_cnpj || null,
  nome_razao_social: e.nome_razao_social,
  inscricao_estadual: e.inscricao_estadual || null,
  cod_cnae: e.cod_cnae || null,
  setor: e.setor || null,
  simples_nacional:
    e.simples_nacional === "optante"
      ? true
      : e.simples_nacional === "nao_optante"
        ? false
        : null,
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

const buildPartFields = (p: DraftParticipant, clienteId: string) => ({
  id_cliente: clienteId,
  nome: p.nome,
  cargo: p.cargo || null,
  email: p.email || null,
  telefone: p.telefone || null,
  tipo_participante: p.tipo_participante || null,
  observacoes: p.observacoes || null,
  acesso_chamados: p.acesso_chamados ?? false,
});

const buildOsFields = (c: DraftOrdemServico, clienteId: string) => ({
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
  id_servico: c.id_servico || null,
  id_produto_segmento: c.id_produto_segmento || null,
});

/** Fire‑and‑forget DW sync — errors are only logged, never thrown */
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

// ── generateNextOsNumber (exported for use in addContract) ─────

/**
 * Generates the next OS number in format XXX/YYYY.
 * Must receive the current local contracts so it can account for
 * numbers already assigned in the current session but not yet saved.
 */
export const generateNextOsNumber = async (
  localContracts: DraftOrdemServico[],
): Promise<string> => {
  const year = new Date().getFullYear();
  const suffix = `/${year}`;

  // Query ALL OS for the current year (including excluido=true) to never reuse a number
  const { data } = await (supabase.from("ordem_servico" as any) as any) // as any: tabela tipada apenas em prod
    .select("numero_os")
    .like("numero_os", `%${suffix}`)
    .order("numero_os", { ascending: false })
    .limit(1000);

  let maxSeq = 0;

  if (data && data.length > 0) {
    for (const row of data) {
      const match = (row.numero_os as string)?.match(/^(\d+)\//);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  }

  // Check local (unsaved) contracts in the same session
  for (const c of localContracts) {
    if (c.ordem_servico?.endsWith(suffix)) {
      const match = c.ordem_servico.match(/^(\d+)\//);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  }

  const next = (maxSeq + 1).toString().padStart(3, "0");
  return `${next}${suffix}`;
};

// ── Core transaction ───────────────────────────────────────────

async function executeTransaction(
  payload: SaveClientPayload,
  logAction: ReturnType<typeof useAuditLog>["logAction"],
) {
  const {
    clientData,
    entities,
    inscricoesMap,
    participants,
    contracts,
    isEditing,
    editingClienteId,
  } = payload;

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
      setor_cliente: clientData.setor_cliente || null,
      regiao: clientData.regiao || null,
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

      // Soft‑delete removed contribuintes
      const currentContribDbIds = entities
        .filter((e) => e._dbId)
        .map((e) => e._dbId!);
      const { data: dbContribs } = await supabase
        .from(contribuinteTable)
        .select("id")
        .eq("cliente_id", clienteId)
        .eq("excluido", false);
      const removedContribIds = (dbContribs || [])
        .map((c) => c.id)
        .filter((id) => !currentContribDbIds.includes(id));
      if (removedContribIds.length > 0) {
        await supabase
          .from(contribuinteTable)
          .update({ excluido: true } as any)
          .in("id", removedContribIds);
      }

      // Soft‑delete removed participantes
      const partIdField = "id_participante";
      const currentPartDbIds = participants
        .filter((p) => p._dbId)
        .map((p) => p._dbId!);
      const { data: dbParts } = await (supabase.from(participanteTable) as any)
        .select(partIdField)
        .eq("id_cliente", clienteId)
        .eq("excluido", false);
      const removedPartIds = (dbParts || [])
        .map((p: any) => p[partIdField])
        .filter((id: string) => !currentPartDbIds.includes(id));
      if (removedPartIds.length > 0) {
        await (supabase.from(participanteTable) as any)
          .update({ excluido: true })
          .in(partIdField, removedPartIds);
      }

      // Soft‑delete removed OS
      const currentOsDbIds = contracts
        .filter((c) => c._dbId)
        .map((c) => c._dbId!);
      const { data: dbOS } = await (
        supabase.from("ordem_servico" as any) as any
      )
        .select("id")
        .eq("id_cliente", clienteId)
        .eq("excluido", false);
      const removedOsIds = (dbOS || [])
        .map((o: any) => o.id)
        .filter((id: string) => !currentOsDbIds.includes(id));
      if (removedOsIds.length > 0) {
        await (supabase.from("ordem_servico" as any) as any)
          .update({ excluido: true })
          .in("id", removedOsIds);
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

    // ── Persist contribuintes ──────────────────────────────────
    for (const e of entities) {
      let contribId = e._dbId;
      if (e._dbId) {
        const { error } = await supabase
          .from(contribuinteTable)
          .update(buildContribFields(e, clienteId))
          .eq("id", e._dbId);
        if (error) throw error;
      } else {
        const { data: newContrib, error } = await supabase
          .from(contribuinteTable)
          .insert(buildContribFields(e, clienteId))
          .select("id")
          .single();
        if (error) throw error;
        contribId = newContrib.id;
      }

      // Persist inscrições estaduais
      const entityKey = e._dbId || String(e._id);
      const ies = inscricoesMap[entityKey] || [];
      if (contribId) {
        const { data: existingIEs } = await (supabase as any)
          .from("inscricao_contribuinte")
          .select("id")
          .eq("contribuinte_id", contribId);
        const currentDbIds = ies
          .filter((ie) => ie._dbId)
          .map((ie) => ie._dbId!);
        const removedIds = (existingIEs || [])
          .map((r: any) => r.id)
          .filter((id: string) => !currentDbIds.includes(id));
        if (removedIds.length > 0) {
          await (supabase as any)
            .from("inscricao_contribuinte")
            .delete()
            .in("id", removedIds);
        }
        for (const ie of ies) {
          const iePayload = {
            contribuinte_id: contribId,
            situacao: ie.situacao,
            numero_ie:
              ie.situacao === "sim" ? ie.numero_ie || null : null,
            uf: ie.uf,
          };
          if (ie._dbId) {
            await (supabase as any)
              .from("inscricao_contribuinte")
              .update(iePayload)
              .eq("id", ie._dbId);
          } else {
            await (supabase as any)
              .from("inscricao_contribuinte")
              .insert(iePayload);
          }
        }
      }
    }

    // ── Persist participantes ──────────────────────────────────
    for (const p of participants) {
      const pIdField = "id_participante";
      if (p._dbId) {
        const { error } = await (supabase.from(participanteTable) as any)
          .update(buildPartFields(p, clienteId))
          .eq(pIdField, p._dbId);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from(participanteTable) as any)
          .insert(buildPartFields(p, clienteId));
        if (error) throw error;
      }
    }

    // ── Persist ordens de serviço + distribuição ───────────────
    for (const c of contracts) {
      let osId = c._dbId;
      if (c._dbId) {
        const { error } = await (
          supabase.from("ordem_servico" as any) as any
        )
          .update(buildOsFields(c, clienteId))
          .eq("id", c._dbId);
        if (error) throw error;
      } else {
        const { data: newOs, error } = await (
          supabase.from("ordem_servico" as any) as any
        )
          .insert(buildOsFields(c, clienteId))
          .select("id")
          .single();
        if (error) throw error;
        osId = newOs.id;
      }

      // Distribuição de receita: soft‑delete existing, then insert fresh
      if (osId) {
        await (supabase.from("distribuicao_receita" as any) as any)
          .update({ excluido: true })
          .eq("id_ordem_servico", osId)
          .eq("excluido", false);
        if (c.distribuicao_receita && c.distribuicao_receita.length > 0) {
          const distPayload = c.distribuicao_receita
            .filter((d) => d.id_centro_custo)
            .map((d) => ({
              id_ordem_servico: osId,
              id_centro_custo: d.id_centro_custo,
              percentual_rateio: d.percentual_rateio || 0,
            }));
          if (distPayload.length > 0) {
            const { error: distError } = await (
              supabase.from("distribuicao_receita" as any) as any
            ).insert(distPayload);
            if (distError) throw distError;
          }
        }
      }
    }

    // ── Sync DW (fire‑and‑forget) ──────────────────────────────
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

    // ── Audit logs ─────────────────────────────────────────────
    const auditClienteId = isEditing
      ? editingClienteId!
      : createdClienteId!;

    logAction({
      area: "dev",
      entity_type: "cliente",
      entity_id: auditClienteId,
      entity_name: clientData.nome.trim(),
      action: isEditing ? "updated" : "created",
    });

    for (const e of entities) {
      logAction({
        area: "dev",
        entity_type: "contribuinte",
        entity_id: e._dbId || auditClienteId,
        entity_name: e.nome_razao_social,
        action: e._dbId ? "updated" : "created",
        details: `Cliente: ${clientData.nome.trim()}`,
      });
    }

    for (const p of participants) {
      logAction({
        area: "dev",
        entity_type: "participante",
        entity_id: p._dbId || auditClienteId,
        entity_name: p.nome,
        action: p._dbId ? "updated" : "created",
        details: `Cliente: ${clientData.nome.trim()}`,
      });
    }

    for (const c of contracts) {
      logAction({
        area: "dev",
        entity_type: "ordem_servico",
        entity_id: c._dbId || auditClienteId,
        entity_name: c.ordem_servico || "(sem número)",
        action: c._dbId ? "updated" : "created",
        details: `Cliente: ${clientData.nome.trim()}`,
      });
    }

    if (isEditing) {
      logAction({
        area: "dev",
        entity_type: "cliente",
        entity_id: auditClienteId,
        entity_name: clientData.nome.trim(),
        action: "updated",
        details: `Atualização completa: ${entities.length} contribuintes, ${participants.length} participantes, ${contracts.length} OS`,
      });
    }
  } catch (error) {
    // Rollback: delete newly created client (CASCADE removes children)
    if (createdClienteId) {
      try {
        await supabase
          .from(clienteTable)
          .delete()
          .eq("id", createdClienteId);
        console.log("[rollback] Cliente removido:", createdClienteId);
      } catch (rollbackErr) {
        console.error("[rollback] Falha ao remover cliente:", rollbackErr);
      }
    }
    throw error; // re‑throw so useMutation sees it as an error
  }
}

// ── Hook ───────────────────────────────────────────────────────

export function useSaveClientTransaction() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  /** Check whether a non‑deleted client with the same name already exists */
  const checkDuplicateName = async (nome: string): Promise<boolean> => {
    const { data: existing } = await supabase
      .from(clienteTable)
      .select("id")
      .eq("nome", nome.trim())
      .eq("excluido", false)
      .limit(1);
    return !!(existing && existing.length > 0);
  };

  const saveClient = useMutation({
    mutationFn: (payload: SaveClientPayload) =>
      executeTransaction(payload, logAction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes-lista"] });
      queryClient.invalidateQueries({ queryKey: ["clientes-filtrados"] });
      queryClient.invalidateQueries({ queryKey: ["contribuintes-modal"] });
      queryClient.invalidateQueries({
        queryKey: ["contribuintes-por-cliente"],
      });
    },
  });

  return { checkDuplicateName, saveClient, generateNextOsNumber };
}
