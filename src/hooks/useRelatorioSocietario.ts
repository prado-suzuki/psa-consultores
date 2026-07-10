import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Quadro societário de TODAS as empresas do cliente numa única leitura.
// Filtra por empresa.cliente_id via join inner. Só tabelas existentes.

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

const SELECT = `
  id, empresa_pessoa_id, socio_pessoa_id, quotas, vlr_total, percentual,
  empresa:empresa_pessoa_id!inner ( id, denominacao, cpf_cnpj, cliente_id, tipo_empresa ),
  socio:socio_pessoa_id ( id, denominacao, tipo_pessoa, cpf_cnpj )
`;

export function useRelatorioSocietario(clienteId: string | null) {
  return useQuery<EmpresaSocietaria[]>({
    queryKey: ['relatorio-societario', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase.from('quadro_societario').select(SELECT).eq('empresa.cliente_id', clienteId);
      if (error) throw error;

      const map = new Map<string, EmpresaSocietaria>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const r of (data ?? []) as any[]) {
        const emp = r.empresa;
        if (!emp) continue;
        if (!map.has(emp.id)) {
          map.set(emp.id, {
            empresaId: emp.id,
            nome: emp.denominacao ?? 'Empresa',
            cnpj: emp.cpf_cnpj ?? null,
            tipoEmpresa: emp.tipo_empresa ?? null,
            socios: [],
            totalQuotas: 0,
            totalValor: 0,
          });
        }
        const e = map.get(emp.id)!;
        e.socios.push({
          pessoaId: r.socio?.id ?? null,
          nome: r.socio?.denominacao ?? '—',
          tipo: r.socio?.tipo_pessoa ?? null,
          cpfCnpj: r.socio?.cpf_cnpj ?? null,
          quotas: r.quotas,
          valor: r.vlr_total,
          percentual: r.percentual,
        });
        e.totalQuotas += Number(r.quotas) || 0;
        e.totalValor += Number(r.vlr_total) || 0;
      }

      const arr = [...map.values()];
      arr.forEach((e) => e.socios.sort((a, b) => (Number(b.quotas) || 0) - (Number(a.quotas) || 0)));
      arr.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      return arr;
    },
    enabled: !!clienteId,
  });
}
