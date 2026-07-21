import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DraftOrdemServico } from "@/types/clientForm";

export function useGenerateNextOsNumber() {
  return useMutation({
    networkMode: "always",
    mutationFn: async (localContracts: DraftOrdemServico[]): Promise<string> => {
      const year = new Date().getFullYear();
      const suffix = `/${year}`;

      const { data } = await supabase
        .from("ordem_servico")
        .select("numero_os")
        .like("numero_os", `%${suffix}`)
        .order("numero_os", { ascending: false })
        .limit(1000);

      let maxSeq = 0;

      if (data && data.length > 0) {
        for (const row of data) {
          const match = row.numero_os?.match(/^(\d+)\//);
          if (match) {
            const seq = parseInt(match[1], 10);
            if (seq > maxSeq) maxSeq = seq;
          }
        }
      }

      for (const contract of localContracts) {
        if (contract.ordem_servico?.endsWith(suffix)) {
          const match = contract.ordem_servico.match(/^(\d+)\//);
          if (match) {
            const seq = parseInt(match[1], 10);
            if (seq > maxSeq) maxSeq = seq;
          }
        }
      }

      const next = (maxSeq + 1).toString().padStart(3, "0");
      return `${next}${suffix}`;
    },
  });
}
