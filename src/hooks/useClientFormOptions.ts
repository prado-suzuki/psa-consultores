import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useClientFormOptions = () => {
  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-roles-lider"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role").eq("role", "lider");
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles_safe").select("id, first_name, last_name");
      return data || [];
    },
  });

  const { data: catalogServices = [] } = useQuery({
    queryKey: ["servicos_prestados_services"],
    queryFn: async () => {
      // servicos_prestados is not in generated types — cast justified
      const { data } = await (supabase
        .from("servicos_prestados" as any)
        .select("id, nome, cluster_id, estrutura_clusters(name)") as any)
        .order("nome");
      return data || [];
    },
  });

  const { data: allClusters = [] } = useQuery({
    queryKey: ["estrutura_clusters_for_os_filter"],
    queryFn: async () => {
      const { data } = await supabase
        .from("estrutura_clusters")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const { data: produtoSegmentoOptions = [] } = useQuery({
    queryKey: ["produto_segmento"],
    queryFn: async () => {
      const { data } = await supabase.from("produto_segmento").select("id, codigo, nome, is_active").eq("is_active", true).order("codigo");
      return (data || []).map((p: any) => ({ value: p.codigo, label: `${p.codigo} - ${p.nome}` }));
    },
  });

  const { data: CENTRO_CUSTO_OPTIONS = [] } = useQuery({
    queryKey: ["centros_custo_options"],
    queryFn: async () => {
      const { data } = await supabase
        .from("centros_custo")
        .select("id, codigo, nome")
        .eq("is_active", true)
        .order("codigo");
      return (data || []).map((e: any) => ({ id: e.id as string, codigo: e.codigo as string, nome: e.nome as string, label: `${e.codigo} - ${e.nome}` }));
    },
  });

  const PRODUTO_SEGMENTO_OPTIONS = useMemo(() => [
    ...produtoSegmentoOptions,
    { value: "__outro__", label: "Outro (personalizado)" },
  ], [produtoSegmentoOptions]);

  const { data: produtoSegmentoFullOptions = [] } = useQuery({
    queryKey: ["produto_segmento_full"],
    queryFn: async () => {
      const { data } = await supabase.from("produto_segmento").select("id, codigo, nome, is_active, cluster_id, estrutura_clusters(name)").eq("is_active", true).order("codigo");
      return (data || []) as Array<{ id: string; codigo: string; nome: string; is_active: boolean; cluster_id: string | null; estrutura_clusters: { name: string } | null }>;
    },
  });

  const lideres = useMemo(() => {
    const liderIds = new Set(userRoles.map((r: any) => r.user_id));
    return profiles
      .filter((p: any) => liderIds.has(p.id))
      .map((p: any) => ({ id: p.id, nome: `${p.first_name || ""} ${p.last_name || ""}`.trim() }));
  }, [userRoles, profiles]);

  return {
    catalogServices,
    allClusters,
    PRODUTO_SEGMENTO_OPTIONS,
    CENTRO_CUSTO_OPTIONS,
    produtoSegmentoFullOptions,
    lideres,
  };
};
