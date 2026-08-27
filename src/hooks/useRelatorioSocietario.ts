import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Quadro societário de TODAS as empresas do cliente numa única leitura.
// Fonte: `v_quadro_societario`, a visão derivada do livro de movimentos
// (`movimentacao_quotas`), que substituiu a tabela `quadro_societario`.
// O percentual é DERIVADO de quotas/Σquotas (a view não guarda percentual).

export interface SocioLinha {
  pessoaId: string | null;
  nome: string;
  tipo: string | null; // 'PF' | 'PJ'
  cpfCnpj: string | null;
  quotas: number | null;
  valor: number | null;
  percentual: number | null;
}

export interface EmpresaSocietaria {
  empresaId: string;
  nome: string;
  cnpj: string | null;
  tipoEmpresa: string | null; // PR=Proprietária · CN=Controladora · SC=Sócia
  socios: SocioLinha[];
  totalQuotas: number;
  totalValor: number;
}

export function useRelatorioSocietario(clienteId: string | null) {
  return useQuery<EmpresaSocietaria[]>({
    queryKey: ['relatorio-societario', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];

      const { data, error } = await supabase
        .from('v_quadro_societario')
        .select('empresa_pessoa_id, pessoa_id, quotas, vlr_total')
        .eq('cliente_id', clienteId);
      if (error) throw error;

      const linhas = data ?? [];
      if (linhas.length === 0) return [];

      const ids = [
        ...new Set(
          linhas.flatMap((l) => [l.empresa_pessoa_id, l.pessoa_id]).filter(Boolean) as string[],
        ),
      ];

      const { data: pessoas, error: erroPessoas } = await supabase
        .from('pessoa')
        .select('id, denominacao, cpf_cnpj, tipo_pessoa, tipo_empresa')
        .in('id', ids);
      if (erroPessoas) throw erroPessoas;

      const porId = new Map((pessoas ?? []).map((p) => [p.id, p]));
      const map = new Map<string, EmpresaSocietaria>();

      for (const l of linhas) {
        const empresaId = l.empresa_pessoa_id;
        if (!empresaId) continue;
        const emp = porId.get(empresaId);
        if (!emp) continue;

        if (!map.has(empresaId)) {
          map.set(empresaId, {
            empresaId,
            nome: emp.denominacao ?? 'Empresa',
            cnpj: emp.cpf_cnpj ?? null,
            tipoEmpresa: emp.tipo_empresa ?? null,
            socios: [],
            totalQuotas: 0,
            totalValor: 0,
          });
        }

        const e = map.get(empresaId)!;
        const socio = l.pessoa_id ? porId.get(l.pessoa_id) : undefined;
        e.socios.push({
          pessoaId: l.pessoa_id ?? null,
          nome: socio?.denominacao ?? '—',
          tipo: socio?.tipo_pessoa ?? null,
          cpfCnpj: socio?.cpf_cnpj ?? null,
          quotas: l.quotas ?? null,
          valor: l.vlr_total ?? null,
          percentual: null,
        });
        e.totalQuotas += Number(l.quotas) || 0;
        e.totalValor += Number(l.vlr_total) || 0;
      }

      const arr = [...map.values()];
      arr.forEach((e) => {
        e.socios.sort((a, b) => (Number(b.quotas) || 0) - (Number(a.quotas) || 0));
        // Percentual derivado: a view entrega quotas, não participação.
        e.socios.forEach((s) => {
          s.percentual = e.totalQuotas > 0 && s.quotas != null
            ? (Number(s.quotas) / e.totalQuotas) * 100
            : null;
        });
      });
      arr.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      return arr;
    },
    enabled: !!clienteId,
  });
}
