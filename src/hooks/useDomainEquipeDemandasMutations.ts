import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import {
  routineInsertForSupabase,
  routineUpdateForSupabase,
  type RoutineWritePayload,
} from '@/lib/equipeDemandas';

interface CreateRoutineInput extends RoutineWritePayload {
  status: string;
  created_by: string | undefined;
}

interface UpdateRoutineInput {
  id: string;
  payload: RoutineWritePayload;
}
interface UpdateStatusInput {
  id: string;
  status: string;
}

const mutationOptions = { retry: false, networkMode: 'always' } as const;
const mutationKeys = {
  createRoutine: (userId: string | undefined) =>
    ['domain-equipe-demandas', 'create-routine', userId ?? null] as const,
  updateRoutine: (userId: string | undefined) =>
    ['domain-equipe-demandas', 'update-routine', userId ?? null] as const,
  deleteRoutine: (userId: string | undefined) =>
    ['domain-equipe-demandas', 'delete-routine', userId ?? null] as const,
  createItem: (userId: string | undefined) =>
    ['domain-equipe-demandas', 'create-item', userId ?? null] as const,
  updateItemStatus: (userId: string | undefined) =>
    ['domain-equipe-demandas', 'update-item-status', userId ?? null] as const,
  deleteItem: (userId: string | undefined) =>
    ['domain-equipe-demandas', 'delete-item', userId ?? null] as const,
  updateRoutineStatus: (userId: string | undefined) =>
    ['domain-equipe-demandas', 'update-routine-status', userId ?? null] as const,
};

export function useEquipeDemandaParentMutations(userId: string | undefined) {
  const createRoutineMutation = useMutation({
    mutationKey: mutationKeys.createRoutine(userId),
    mutationFn: async (payload: CreateRoutineInput) => {
      const { error } = await supabase.from('routines').insert(routineInsertForSupabase(payload));
      if (error) throw error;
    },
    ...mutationOptions,
  });
  const updateRoutineMutation = useMutation({
    mutationKey: mutationKeys.updateRoutine(userId),
    mutationFn: async ({ id, payload }: UpdateRoutineInput) => {
      const { error } = await supabase
        .from('routines')
        .update(routineUpdateForSupabase(payload))
        .eq('id', id);
      if (error) throw error;
    },
    ...mutationOptions,
  });
  const deleteRoutineMutation = useMutation({
    mutationKey: mutationKeys.deleteRoutine(userId),
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('routines').delete().eq('id', id);
      if (error) throw error;
    },
    ...mutationOptions,
  });
  const updateRoutineStatusMutation = useMutation({
    mutationKey: mutationKeys.updateRoutineStatus(userId),
    mutationFn: async ({ id, status }: UpdateStatusInput) => {
      await supabase.from('routines').update({ status }).eq('id', id);
    },
    ...mutationOptions,
  });
  return {
    createRoutineMutation,
    updateRoutineMutation,
    deleteRoutineMutation,
    updateRoutineStatusMutation,
  };
}

export function useEquipeDemandaItemMutations(userId: string | undefined) {
  const createItemMutation = useMutation({
    mutationKey: mutationKeys.createItem(userId),
    mutationFn: async (payload: TablesInsert<'demand_items'>) => {
      const { error } = await supabase.from('demand_items').insert(payload);
      if (error) throw error;
    },
    ...mutationOptions,
  });
  const updateItemStatusMutation = useMutation({
    mutationKey: mutationKeys.updateItemStatus(userId),
    mutationFn: async ({ id, status }: UpdateStatusInput) => {
      await supabase.from('demand_items').update({ status }).eq('id', id);
    },
    ...mutationOptions,
  });
  const deleteItemMutation = useMutation({
    mutationKey: mutationKeys.deleteItem(userId),
    mutationFn: async (id: string) => {
      await supabase.from('demand_items').delete().eq('id', id);
    },
    ...mutationOptions,
  });
  return { createItemMutation, updateItemStatusMutation, deleteItemMutation };
}
