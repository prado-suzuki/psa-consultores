import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Quadro societário de TODAS as empresas do cliente, da MESMA fonte que a tela
// do Quadro Societário e o gerador de documento: `v_quadro_societario`, o
// acumulado dos movimentos de quota de cada PJ. Antes daqui o relatório lia a
// tabela `quadro_societario`, e passou a discordar da tela no dia em que a tela
// trocou de fonte, e duas telas discordando é o pior estado possível.
//
// São DUAS leituras e não um embed: o PostgREST só infere relacionamento de view
// quando a coluna vem direto da tabela base, e `pessoa_id` aqui nasce de um
// `union all` com `group by`. A view expõe `cliente_id` (da empresa), que é o
// filtro, então não é preciso juntar `pessoa` para restringir ao cliente.

export interface SocioLinha {
  pessoaId: string | null;
  nome: string;
  tipo: string | null; // 'PF' | 'PJ'
  cpfCnpj: string | null;
  quotas: number | null;
  valor: number | null;
  /**
   * DERIVADO, não lido: `v_quadro_societario` entrega quotas, não participação.
   * É preenchido depois de montar o mapa, quando `totalQuotas` da empresa já
   * existe — antes disso não há denominador. `null` quando a empresa está sem
   * quotas, para o relatório não publicar 0% como se fosse medição.
   */
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

      const linhas = (data ?? []).filter((l) => l.empresa_pessoa_id);
      if (linhas.length === 0) return [];

      // Uma leitura só para os dois papéis: a mesma PJ costuma ser empresa numa
      // linha e sócia em outra (a Participações é sócia da Agro).
      const ids = [
        ...new Set(linhas.flatMap((l) => [l.empresa_pessoa_id, l.pessoa_id])),
      ].filter((id): id is string => !!id);
      const { data: pessoas, error: errPessoas } = await supabase
        .from('pessoa')
        .select('id, denominacao, tipo_pessoa, cpf_cnpj, tipo_empresa')
        .in('id', ids);
      if (errPessoas) throw errPessoas;
      const porId = new Map((pessoas ?? []).map((p) => [p.id, p]));

      const map = new Map<string, EmpresaSocietaria>();
      for (const l of linhas) {
        const emp = porId.get(l.empresa_pessoa_id!);
        // Empresa que a RLS de `pessoa` não devolve fica fora, como ficava o
        // join inner da leitura anterior.
        if (!emp) continue;
        let e = map.get(emp.id);
        if (!e) {
          e = {
            empresaId: emp.id,
            nome: emp.denominacao ?? 'Empresa',
            cnpj: emp.cpf_cnpj ?? null,
            tipoEmpresa: emp.tipo_empresa ?? null,
            socios: [],
            totalQuotas: 0,
            totalValor: 0,
          };
          map.set(emp.id, e);
        }
        const socio = l.pessoa_id ? porId.get(l.pessoa_id) : undefined;
        e.socios.push({
          pessoaId: l.pessoa_id ?? null,
          nome: socio?.denominacao ?? '—',
          tipo: socio?.tipo_pessoa ?? null,
          cpfCnpj: socio?.cpf_cnpj ?? null,
          quotas: l.quotas,
          valor: l.vlr_total,
          // Nasce nulo: o denominador é o total da empresa, e ele só fecha
          // depois de percorrer todas as linhas dela.
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
