import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { DraftEntity, InscricaoIE, DraftRepresentante, DraftOrdemServico } from '@/types/clientForm';

const clienteTable = 'cliente';
const contribuinteTable = 'contribuinte';
const representanteTable = 'representante';

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
  cluster_ids: string[];
}

interface Setters {
  setClientData: (data: ClientDataShape) => void;
  setEntities: (entities: DraftEntity[]) => void;
  setParticipants: (participants: DraftRepresentante[]) => void;
  setContracts: (contracts: DraftOrdemServico[]) => void;
  setInscricoesMap: (map: Record<string, InscricaoIE[]>) => void;
}

export const useClientEditData = (
  open: boolean,
  editingClienteId: string | null | undefined,
  setters: Setters,
) => {
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [originalSnapshot, setOriginalSnapshot] = useState<{
    clientData: ClientDataShape;
    entities: DraftEntity[];
    participants: DraftRepresentante[];
    contracts: DraftOrdemServico[];
  } | null>(null);

  useEffect(() => {
    if (!open || !editingClienteId) return;

    const loadData = async () => {
      setLoadingEdit(true);
      try {
        let snapClient: ClientDataShape | null = null;
        const { data: cli } = await supabase.from(clienteTable).select("*").eq("id", editingClienteId).maybeSingle();
        if (cli) {
          const mapped: ClientDataShape = {
            nome: cli.nome || "",
            categoria: (cli as any).categoria || "Bronze",
            ativo: cli.ativo ?? true,
            fixo: cli.fixo || "Sim",
            telefone: cli.telefone || "",
            municipio: cli.municipio || "",
            uf: cli.uf || "",
            setor_cliente: cli.setor_cliente || "",
            setor_cliente_id: (cli as any).setor_cliente_id || "",
            regiao: (cli as any).regiao || "",
            cluster_ids: [],
          };

          // Load cluster associations before finalizing mapped
          const { data: clusterRows } = await (supabase.from('cliente_clusters' as any) as any)
            .select('cluster_id')
            .eq('cliente_id', editingClienteId);
          mapped.cluster_ids = (clusterRows || []).map((r: any) => r.cluster_id as string);

          setters.setClientData(mapped);
          snapClient = structuredClone(mapped);
        }

        const { data: contribs } = await supabase
          .from(contribuinteTable)
          .select("*")
          .eq("cliente_id", editingClienteId)
          .eq("excluido", false);
        let snapEntities: DraftEntity[] = [];
        if (contribs) {
          const mapped = contribs.map((c) => ({
              _id: Date.now() + Math.random(),
              _dbId: c.id,
              tipo_pessoa: c.tipo_pessoa || "PJ",
              cpf_cnpj: c.cpf_cnpj || "",
              nome_razao_social: c.nome_razao_social || "",
              nome_fantasia: (c as any).nome_fantasia || "",
              situacao_inscricao_estadual: (c as any).situacao_inscricao_estadual || (c.inscricao_estadual ? "sim" : "isento"),
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
          setters.setEntities(mapped);
          snapEntities = structuredClone(mapped);
        }

        // Load inscricoes estaduais
        if (contribs && contribs.length > 0) {
          const contribIds = contribs.map(c => c.id);
          const { data: inscricoes } = await (supabase as any)
            .from("inscricao_contribuinte")
            .select("*")
            .in("contribuinte_id", contribIds);
          if (inscricoes) {
            const map: Record<string, InscricaoIE[]> = {};
            for (const ie of inscricoes as any[]) {
              const key = ie.contribuinte_id as string;
              if (!map[key]) map[key] = [];
              map[key].push({
                _tempId: Date.now() + Math.random(),
                _dbId: ie.id,
                situacao: ie.situacao || "sim",
                numero_ie: ie.numero_ie || "",
                uf: ie.uf || "",
              });
            }
            setters.setInscricoesMap(map);
          } else {
            setters.setInscricoesMap({});
          }
        }

        // representante table — PK is id_representante
        let snapParticipants: DraftRepresentante[] = [];
        const { data: parts } = await (supabase.from(representanteTable) as any)
          .select("*")
          .eq("id_cliente", editingClienteId)
          .eq("excluido", false);
        if (parts) {
          const mapped = parts.map((p: any) => ({
              _id: Date.now() + Math.random(),
              _dbId: p.id_representante || p.id,
              nome: p.nome || "",
              tipo_representante: p.tipo_representante || "",
              cargo: p.cargo || "",
              email: p.email || "",
              telefone: p.telefone || "",
              observacoes: p.observacoes || "",
              acesso_chamados: p.acesso_chamados ?? false,
            }));
          setters.setParticipants(mapped);
          snapParticipants = structuredClone(mapped);
        }

        // Carregar ordens de serviço do banco
        const { data: existingOS } = await (supabase.from("ordem_servico" as any) as any)
          .select("*")
          .eq("id_cliente", editingClienteId)
          .eq("excluido", false);
        if (existingOS && existingOS.length > 0) {
          const osIds = existingOS.map((os: any) => os.id);

          // Carregar distribuicao_receita
          const { data: distData } = await (supabase.from("distribuicao_receita" as any) as any)
            .select("*")
            .in("id_ordem_servico", osIds)
            .eq("excluido", false);
          const distMap: Record<string, Array<{ id_centro_custo: string; percentual_rateio: number; _dbId: string }>> = {};
          (distData || []).forEach((d: any) => {
            if (!distMap[d.id_ordem_servico]) distMap[d.id_ordem_servico] = [];
            distMap[d.id_ordem_servico].push({ id_centro_custo: d.id_centro_custo, percentual_rateio: Number(d.percentual_rateio), _dbId: d.id });
          });

          // Carregar produtos contratados de os_produtos_contratados
          // os_produtos_contratados não está no schema tipado — cast justificado
          const { data: produtosData } = await (supabase.from("os_produtos_contratados" as any) as any)
            .select("id, ordem_servico_id, produto_segmento_id, horas_contratadas")
            .in("ordem_servico_id", osIds);
          const produtosMap: Record<string, Array<{ _id: number; _dbId: string; produto_segmento_id: string; horas_contratadas?: number }>> = {};
          (produtosData || []).forEach((p: any) => {
            if (!produtosMap[p.ordem_servico_id]) produtosMap[p.ordem_servico_id] = [];
            produtosMap[p.ordem_servico_id].push({
              _id: Date.now() + Math.random(),
              _dbId: p.id,
              produto_segmento_id: p.produto_segmento_id,
              horas_contratadas: p.horas_contratadas != null ? Number(p.horas_contratadas) : undefined,
            });
          });

          const mappedContracts = existingOS.map((os: any) => ({
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
              produtos_contratados: produtosMap[os.id] || [],
              distribuicao_receita: distMap[os.id] || [],
              cluster_id: os.cluster_id || "",
            }));
          setters.setContracts(mappedContracts);

          // Store snapshot
          setOriginalSnapshot({
            clientData: snapClient!,
            entities: snapEntities,
            participants: snapParticipants,
            contracts: structuredClone(mappedContracts),
          });
        } else {
          setters.setContracts([]);
          if (snapClient) {
            setOriginalSnapshot({
              clientData: snapClient,
              entities: snapEntities,
              participants: snapParticipants,
              contracts: [],
            });
          }
        }
      } catch (err: any) {
        console.error("Erro ao carregar dados do cliente:", err);
        toast.error("Erro ao carregar dados do cliente");
      } finally {
        setLoadingEdit(false);
      }
    };
    loadData();
  }, [open, editingClienteId]);

  return { loadingEdit, originalSnapshot };
};
