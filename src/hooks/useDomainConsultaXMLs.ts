import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { currentAmbiente } from "@/config/api";
import { supabase } from "@/integrations/supabase/client";

interface ConsultaXMLsCliente {
  id: string;
  nome: string;
}

interface CnpjDeCliente {
  cliente_id: string;
  cpf_cnpj: string | null;
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

  /**
   * Os CNPJs de cada cliente, para o campo de cliente se deixar buscar por CNPJ.
   *
   * Consulta SEPARADA, e não uma coluna a mais no `clientesQuery`, por dois
   * motivos: `cliente` não TEM CNPJ (a coluna vive em `contribuinte`, e um
   * cliente tem vários), e mexer no `select` do `clientesQuery` mudaria a forma
   * do que já está em cache sob `clientes-list`. Aqui o recorte por
   * `selectedCliente` não entra de propósito — o índice precisa cobrir a lista
   * inteira, senão só se acha por CNPJ o cliente que já está selecionado.
   */
  const cnpjsQuery = useQuery({
    queryKey: ["clientes-cnpjs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contribuinte")
        .select("cliente_id, cpf_cnpj")
        .eq("excluido", false)
        .eq("ambiente", currentAmbiente);

      if (error) {
        console.error("Erro ao buscar CNPJs dos clientes:", error);
        throw new Error(`Erro ao carregar CNPJs dos clientes: ${error.message}`);
      }

      return data as CnpjDeCliente[];
    },
  });

  const cnpjsPorCliente = useMemo(() => {
    const mapa: Record<string, string[]> = {};
    for (const linha of cnpjsQuery.data ?? []) {
      if (!linha.cliente_id || !linha.cpf_cnpj) continue;
      (mapa[linha.cliente_id] ??= []).push(linha.cpf_cnpj);
    }
    return mapa;
  }, [cnpjsQuery.data]);

  return { clientesQuery, contribuintesQuery, cnpjsPorCliente };
}
