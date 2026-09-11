import { useQuery } from "@tanstack/react-query";

import { currentAmbiente } from "@/config/api";
import { supabase } from "@/integrations/supabase/client";

interface ConsultaXMLsCliente {
  id: string;
  nome: string;
}

interface ConsultaXMLsContribuinte {
  id: string;
  nome_razao_social: string;
  cpf_cnpj: string | null;
  cliente_id: string | null;
}

export function useDomainConsultaXMLs(selectedCliente: string) {
  const clientesQuery = useQuery({
    queryKey: ["clientes-list"],
    queryFn: async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const { data, error } = await supabase
        .from("cliente")
        .select("id, nome")
        .eq("ativo", true)
        .eq("excluido", false)
        .eq("ambiente", currentAmbiente)
        .order("nome");

      if (error) {
        console.error("Erro ao buscar clientes:", error);
        throw new Error(`Erro ao carregar clientes: ${error.message}`);
      }

      return data as ConsultaXMLsCliente[];
    },
  });

  const contribuintesQuery = useQuery({
    queryKey: ["contribuintes-list", selectedCliente],
    queryFn: async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      let query = supabase
        .from("contribuinte")
        .select("id, nome_razao_social, cpf_cnpj, cliente_id")
        .eq("excluido", false)
        .eq("ambiente", currentAmbiente)
        .order("nome_razao_social");

      if (selectedCliente && selectedCliente !== "all") {
        query = query.eq("cliente_id", selectedCliente);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar contribuintes:", error);
        if (error.message.includes("JWT")) {
          throw new Error("Sessão expirada. Faça login novamente.");
        }
        throw new Error(`Erro ao carregar contribuintes: ${error.message}`);
      }

      return data as ConsultaXMLsContribuinte[];
    },
    retry: (failureCount, error) => {
      if ((error as Error).message.includes("Sessão expirada")) return false;
      return failureCount < 2;
    },
  });

  return { clientesQuery, contribuintesQuery };
}
