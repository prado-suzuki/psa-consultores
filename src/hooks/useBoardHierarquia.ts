import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STALE_TIME = 5 * 60 * 1000;

export interface ClusterOpcao {
  id: string;
  nome: string;
  ativo: boolean;
  /** Tem ao menos uma área com projeto vinculado -- ver regra de visibilidade. */
  temMovimento: boolean;
}

export interface AreaOpcao {
  id: string;
  nome: string;
  ativo: boolean;
  clusterId: string;
  temMovimento: boolean;
}

export interface EquipeOpcao {
  id: string;
  nome: string;
  areaId: string;
}

interface RowsBrutas {
  clusters: { id: string; name: string; is_active: boolean }[];
  areas: { id: string; name: string; is_active: boolean; cluster_id: string }[];
  equipes: { id: string; name: string; area_id: string | null }[];
  areasComMovimento: Set<string>;
}

/**
 * A árvore CLUSTER -> ÁREA -> EQUIPE do cadastro, com a regra de visibilidade
 * do Bloco G (21/08): mostra o registro quando está ATIVO, mesmo sem
 * movimento, E quando TEM MOVIMENTO (pelo menos 1 `org_projects` vinculado),
 * mesmo inativo. Esconde só o que está inativo E vazio.
 *
 * Caso real que motivou a regra: o cluster "Prado Advogados" está
 * `is_active = false`, mas tem duas áreas ATIVAS dentro (PRADO ADV CIVIL,
 * TAX LEGAL) com OS rateada -- com uma regra que só olhasse
 * `cluster.is_active`, o cluster desaparecia e levava as duas áreas com ele.
 * Aqui o cluster aparece porque pelo menos uma área dele tem movimento.
 *
 * "Tem movimento" é medido por `org_projects.estrutura_area_id` -- é a fonte
 * mais barata disponível hoje (não soma OS/centro de custo, que não tem
 * vínculo de área). Documentado aqui para quem for revisar o critério.
 */
export function useBoardHierarquia() {
  const query = useQuery<RowsBrutas>({
    queryKey: ['board-hierarquia-cluster-area-equipe'],
    staleTime: STALE_TIME,
    queryFn: async () => {
      const [clustersRes, areasRes, equipesRes, projetosRes] = await Promise.all([
        supabase.from('estrutura_clusters').select('id, name, is_active'),
        supabase.from('estrutura_areas').select('id, name, is_active, cluster_id'),
        supabase.from('estrutura_equipes').select('id, name, area_id'),
        supabase.from('org_projects').select('estrutura_area_id'),
      ]);
      if (clustersRes.error) throw clustersRes.error;
      if (areasRes.error) throw areasRes.error;
      if (equipesRes.error) throw equipesRes.error;
      if (projetosRes.error) throw projetosRes.error;

      const areasComMovimento = new Set<string>();
      for (const p of projetosRes.data ?? []) {
        if (p.estrutura_area_id) areasComMovimento.add(p.estrutura_area_id);
      }

      return {
        clusters: (clustersRes.data ?? []) as RowsBrutas['clusters'],
        areas: (areasRes.data ?? []) as RowsBrutas['areas'],
        equipes: (equipesRes.data ?? []) as RowsBrutas['equipes'],
        areasComMovimento,
      };
    },
  });

  const areasPorCluster = useMemo(() => {
    const mapa = new Map<string, AreaOpcao[]>();
    for (const a of query.data?.areas ?? []) {
      const opcao: AreaOpcao = {
        id: a.id,
        nome: a.name,
        ativo: a.is_active,
        clusterId: a.cluster_id,
        temMovimento: query.data?.areasComMovimento.has(a.id) ?? false,
      };
      const arr = mapa.get(a.cluster_id);
      if (arr) arr.push(opcao); else mapa.set(a.cluster_id, [opcao]);
    }
    return mapa;
  }, [query.data]);

  const clusters = useMemo<ClusterOpcao[]>(() => {
    return (query.data?.clusters ?? [])
      .map((c) => {
        const areasDoCluster = areasPorCluster.get(c.id) ?? [];
        const temMovimento = areasDoCluster.some((a) => a.temMovimento);
        return { id: c.id, nome: c.name, ativo: c.is_active, temMovimento };
      })
      .filter((c) => c.ativo || c.temMovimento)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [query.data, areasPorCluster]);

  const areasVisiveisPorCluster = useMemo(() => {
    const mapa = new Map<string, AreaOpcao[]>();
    for (const [clusterId, areas] of areasPorCluster) {
      mapa.set(
        clusterId,
        areas
          .filter((a) => a.ativo || a.temMovimento)
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      );
    }
    return mapa;
  }, [areasPorCluster]);

  const equipesPorArea = useMemo(() => {
    const mapa = new Map<string, EquipeOpcao[]>();
    for (const e of query.data?.equipes ?? []) {
      if (!e.area_id) continue;
      const opcao: EquipeOpcao = { id: e.id, nome: e.name, areaId: e.area_id };
      const arr = mapa.get(e.area_id);
      if (arr) arr.push(opcao); else mapa.set(e.area_id, [opcao]);
    }
    for (const arr of mapa.values()) arr.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return mapa;
  }, [query.data]);

  return {
    isLoading: query.isLoading,
    isError: query.isError,
    clusters,
    areasPorCluster: areasVisiveisPorCluster,
    equipesPorArea,
  };
}
