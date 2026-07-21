import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  groupDemandItems,
  type DemandItemsByDemand,
  type EquipeDemanda,
  type EquipeDemandItem,
} from '@/lib/equipeDemandas';

export interface EquipeDemandasTeamMember {
  id: string;
  first_name: string;
  last_name: string;
}

interface EquipeDemandasPublicationHandlers {
  onTeamMembers: (members: EquipeDemandasTeamMember[]) => void;
  onDemandas: (demandas: EquipeDemanda[]) => void;
  onDemandItems: (items: DemandItemsByDemand) => void;
  onComplete: () => void;
}

interface EquipeDemandasData {
  teamMembers?: EquipeDemandasTeamMember[];
  teamMembersVersion?: number;
  demandas?: EquipeDemanda[];
  demandasVersion?: number;
  demandItems?: DemandItemsByDemand;
  demandItemsVersion?: number;
  completed: boolean;
  completionVersion?: number;
}

let publicationVersion = 0;
const nextPublicationVersion = () => ++publicationVersion;

export const equipeDemandasQueryKeys = {
  aggregate: (userId: string | undefined) =>
    ['domain-equipe-demandas', 'aggregate', userId ?? null] as const,
};

export function useEquipeDemandasQuery(
  userId: string | undefined,
  handlers: EquipeDemandasPublicationHandlers,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const publishedVersionsRef = useRef({
    teamMembers: 0,
    demandas: 0,
    demandItems: 0,
    completion: 0,
  });
  const queryClient = useQueryClient();
  const queryKey = equipeDemandasQueryKeys.aggregate(userId);

  const query = useQuery<EquipeDemandasData>({
    queryKey,
    queryFn: async () => {
      let publication: EquipeDemandasData = { completed: false };
      try {
        const { data: members } = await supabase
          .from('profiles_safe')
          .select('id, first_name, last_name')
          .order('first_name');
        publication = {
          ...publication,
          teamMembers: (members || []) as EquipeDemandasTeamMember[],
          teamMembersVersion: nextPublicationVersion(),
        };
        queryClient.setQueryData(queryKey, publication);

        const { data: demandasData } = await supabase
          .from('routines')
          .select('*')
          .order('created_at', { ascending: false });

        const demandas = (demandasData || []) as EquipeDemanda[];
        publication = { ...publication, demandas, demandasVersion: nextPublicationVersion() };
        queryClient.setQueryData(queryKey, publication);
        if (demandasData && demandasData.length > 0) {
          const { data: itemsData } = await supabase
            .from('demand_items')
            .select('*')
            .in(
              'demand_id',
              demandasData.map((demand) => demand.id),
            )
            .order('due_date', { ascending: true });
          publication = {
            ...publication,
            demandItems: groupDemandItems((itemsData || []) as EquipeDemandItem[]),
            demandItemsVersion: nextPublicationVersion(),
          };
          queryClient.setQueryData(queryKey, publication);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      return {
        ...publication,
        completed: true,
        completionVersion: nextPublicationVersion(),
      };
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    networkMode: 'always',
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (!query.data) return;
    if (
      query.data.teamMembers !== undefined &&
      query.data.teamMembersVersion !== publishedVersionsRef.current.teamMembers
    ) {
      handlersRef.current.onTeamMembers(query.data.teamMembers);
      publishedVersionsRef.current.teamMembers = query.data.teamMembersVersion || 0;
    }
    if (
      query.data.demandas !== undefined &&
      query.data.demandasVersion !== publishedVersionsRef.current.demandas
    ) {
      handlersRef.current.onDemandas(query.data.demandas);
      publishedVersionsRef.current.demandas = query.data.demandasVersion || 0;
    }
    if (
      query.data.demandItems !== undefined &&
      query.data.demandItemsVersion !== publishedVersionsRef.current.demandItems
    ) {
      handlersRef.current.onDemandItems(query.data.demandItems);
      publishedVersionsRef.current.demandItems = query.data.demandItemsVersion || 0;
    }
    if (
      query.data.completed &&
      query.data.completionVersion !== publishedVersionsRef.current.completion
    ) {
      handlersRef.current.onComplete();
      publishedVersionsRef.current.completion = query.data.completionVersion || 0;
    }
  }, [query.data]);

  return query;
}
