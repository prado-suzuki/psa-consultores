import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDomainClienteDashboard(userId: string | undefined) {
  const ticketsQuery = useQuery({
    queryKey: ["client-tickets", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 0,
    gcTime: 0,
  });

  const visibleProjectsQuery = useQuery({
    queryKey: ["client-visible-projects", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("client_visible_projects")
        .select(
          `
          id,
          visible_since,
          notes,
          projects (
            id,
            name,
            description,
            status,
            start_date,
            end_date
          )
        `,
        )
        .eq("user_id", userId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 0,
    gcTime: 0,
  });

  return { ticketsQuery, visibleProjectsQuery };
}
