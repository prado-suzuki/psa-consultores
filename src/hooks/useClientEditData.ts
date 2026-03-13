import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isProductionEnvironment } from "@/config/api";
import type {
  DraftEntity,
  DraftParticipant,
  DraftOrdemServico,
  InscricaoIE,
} from "@/types/clientForm";

const clienteTable = isProductionEnvironment ? "cliente" : "cliente_dev";
const contribuinteTable = isProductionEnvironment ? "contribuinte" : "contribuinte_dev";
const participanteTable = isProductionEnvironment ? "participante" : "participante_dev";

interface ClientEditResult {
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
  } | null;
  entities: DraftEntity[];
  inscricoesMap: Record<string, InscricaoIE[]>;
  participants: DraftParticipant[];
  contracts: DraftOrdemServico[];
  isLoading: boolean;
  error: Error | null;
}

async function fetchClientEditData(clienteId: string) {
  // 1. Cliente
  const { data: cli } = await supabase
    .from(clienteTable)
    .select("*")
    .eq("id", clienteId)
    .maybeSingle();

  const clientData = cli
    ? {
        nome: cli.nome || "",
        categoria: (cli as any).categoria || "Bronze", // as any: campo pode não estar tipado no env dev
        ativo: cli.ativo ?? true,
        fixo: cli.fixo || "Sim",
        telefone: cli.telefone || "",
        municipio: cli.municipio || "",
        uf: cli.uf || "",
        setor_cliente: cli.setor_cliente || "",
        regiao: (cli as any).regiao || "",
      }
    : null;

  // 2. Contribuintes
  const { data: contribs } = await supabase
    .from(contribuinteTable)
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("excluido", false);

  const entities: DraftEntity[] = (contribs || []).map((c) => ({
    _id: Date.now() + Math.random(),
    _dbId: c.id,
    tipo_pessoa: c.tipo_pessoa || "PJ",
    cpf_cnpj: c.cpf_cnpj || "",
    nome_razao_social: c.nome_razao_social || "",
    nome_fantasia: (c as any).nome_fantasia || "",
    situacao_inscricao_estadual:
      (c as any).situacao_inscricao_estadual || (c.inscricao_estadual ? "sim" : "isento"),
    inscricao_estadual: c.inscricao_estadual || "",
    cod_cnae: c.cod_cnae || "",
    setor: c.setor || "",
    simples_nacional:
      c.simples_nacional === true ? "optante" : c.simples_nacional === false ? "nao_optante" : "",
    telefone: (c as any).telefone || "",
    cep: (c as any).cep || "",
    logradouro: (c as any).logradouro || "",
    numero: (c as any).numero || "",
    complemento: (c as any).complemento || "",
    bairro: (c as any).bairro || "",
    municipio: (c as any).municipio || "",
    uf: (c as any).uf || "",
    contribuinte_faturamento: (c as any).contribuinte_faturamento ?? false,
    atividade_principal: "",
  }));

  // 3. Inscrições estaduais
  let inscricoesMap: Record<string, InscricaoIE[]> = {};
  if (contribs && contribs.length > 0) {
    const contribIds = contribs.map((c) => c.id);
    const { data: inscricoes } = await (supabase as any)
      .from("inscricao_contribuinte")
      .select("*")
      .in("contribuinte_id", contribIds);
    if (inscricoes) {
      for (const ie of inscricoes as any[]) {
        const key = ie.contribuinte_id as string;
        if (!inscricoesMap[key]) inscricoesMap[key] = [];
        inscricoesMap[key].push({
          _tempId: Date.now() + Math.random(),
          _dbId: ie.id,
          situacao: ie.situacao || "sim",
          numero_ie: ie.numero_ie || "",
          uf: ie.uf || "",
        });
      }
    }
  }

  // 4. Participantes
  const { data: parts } = await (supabase.from(participanteTable) as any)
    .select("*")
    .eq("id_cliente", clienteId)
    .eq("excluido", false);

  const participants: DraftParticipant[] = (parts || []).map((p: any) => ({
    _id: Date.now() + Math.random(),
    _dbId: p.id || p.id_participante,
    nome: p.nome || "",
    tipo_participante: p.tipo_participante || "",
    cargo: p.cargo || "",
    email: p.email || "",
    telefone: p.telefone || "",
    observacoes: p.observacoes || "",
    acesso_chamados: p.acesso_chamados ?? false,
  }));

  // 5. Ordens de serviço + distribuição de receita
  const { data: existingOS } = await (supabase.from("ordem_servico" as any) as any)
    .select("*")
    .eq("id_cliente", clienteId)
    .eq("excluido", false);

  let contractsList: DraftOrdemServico[] = [];
  if (existingOS && existingOS.length > 0) {
    const osIds = existingOS.map((os: any) => os.id);
    const { data: distData } = await (supabase.from("distribuicao_receita" as any) as any)
      .select("*")
      .in("id_ordem_servico", osIds)
      .eq("excluido", false);

    const distMap: Record<string, Array<{ id_centro_custo: string; percentual_rateio: number; _dbId: string }>> = {};
    (distData || []).forEach((d: any) => {
      if (!distMap[d.id_ordem_servico]) distMap[d.id_ordem_servico] = [];
      distMap[d.id_ordem_servico].push({
        id_centro_custo: d.id_centro_custo,
        percentual_rateio: Number(d.percentual_rateio),
        _dbId: d.id,
      });
    });

    contractsList = existingOS.map((os: any) => ({
      _id: Date.now() + Math.random(),
      _dbId: os.id,
      ordem_servico: os.numero_os || "",
      data_emissao: os.data_emissao || "",
      data_inicio_projeto: os.data_inicio || "",
      data_fim_projeto: os.data_fim || "",
      valor_projeto: os.valor_projeto || 0,
      valor_reembolso_km: os.valor_reembolso_km || 0,
      valor_reembolso_refeicao: os.valor_reembolso_refeicao || 0,
      situacao_projeto: os.situacao || "em_andamento",
      observacoes_projeto: os.observacoes || "",
      id_servico: os.id_servico || "",
      id_produto_segmento: os.id_produto_segmento || "",
      distribuicao_receita: distMap[os.id] || [],
    }));
  }

  return {
    clientData,
    entities,
    inscricoesMap,
    participants,
    contracts: contractsList,
  };
}

/**
 * Hook that fetches all edit data for a client (cliente, contribuintes,
 * inscrições estaduais, participantes and ordens de serviço).
 * Returns data already mapped to the draft formats expected by NewClientModal.
 */
export function useClientEditData(
  clienteId: string | null,
  enabled: boolean,
): ClientEditResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["client-edit-data", clienteId],
    queryFn: () => fetchClientEditData(clienteId!),
    enabled: enabled && !!clienteId,
    staleTime: 0, // Always refetch when opening editor
  });

  return {
    clientData: data?.clientData ?? null,
    entities: data?.entities ?? [],
    inscricoesMap: data?.inscricoesMap ?? {},
    participants: data?.participants ?? [],
    contracts: data?.contracts ?? [],
    isLoading,
    error: error as Error | null,
  };
}
