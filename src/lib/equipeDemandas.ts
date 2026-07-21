import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export interface EquipeDemanda {
  id: string;
  title: string;
  description: string | null;
  is_recurring: boolean;
  frequency: string | null;
  start_date: string | null;
  due_date: string | null;
  status: string;
  assigned_to: string | null;
  estimated_hours: number | null;
}

export interface EquipeDemandItem {
  id: string;
  demand_id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: string;
  assigned_to: string | null;
  estimated_hours: number | null;
}

export interface EquipeDemandaDraft {
  title: string;
  description: string;
  is_recurring: boolean;
  frequency: string;
  start_date: string;
  due_date: string;
  assigned_to: string;
  estimated_hours: string;
}

export interface EquipeSubdemandDraft {
  title: string;
  description: string;
  due_date: string;
  assigned_to: string;
  estimated_hours: string;
}

export type DemandItemsByDemand = Record<string, EquipeDemandItem[]>;

export const EMPTY_DEMANDA_DRAFT: EquipeDemandaDraft = {
  title: '',
  description: '',
  is_recurring: false,
  frequency: 'daily',
  start_date: '',
  due_date: '',
  assigned_to: '',
  estimated_hours: '',
};

export const EMPTY_SUBDEMAND_DRAFT: EquipeSubdemandDraft = {
  title: '',
  description: '',
  due_date: '',
  assigned_to: '',
  estimated_hours: '',
};

export interface RoutineWritePayload {
  title: string;
  description: string | null;
  is_recurring: boolean;
  frequency: string | null;
  start_date: string | null;
  due_date: string | null;
  assigned_to: string | null;
  estimated_hours: number | null;
}

export function buildRoutinePayload(draft: EquipeDemandaDraft): RoutineWritePayload {
  return {
    title: draft.title,
    description: draft.description || null,
    is_recurring: draft.is_recurring,
    frequency: draft.is_recurring ? draft.frequency : null,
    start_date: !draft.is_recurring && draft.start_date ? draft.start_date : null,
    due_date: !draft.is_recurring && draft.due_date ? draft.due_date : null,
    assigned_to: draft.assigned_to || null,
    estimated_hours: draft.estimated_hours ? Number(draft.estimated_hours) : null,
  };
}

export function buildCreateRoutinePayload(
  draft: EquipeDemandaDraft,
  userId: string | undefined,
): RoutineWritePayload & { status: string; created_by: string | undefined } {
  return { ...buildRoutinePayload(draft), status: 'pending', created_by: userId };
}

export function buildDemandItemPayload(
  demandId: string,
  draft: EquipeSubdemandDraft,
): TablesInsert<'demand_items'> {
  return {
    demand_id: demandId,
    title: draft.title,
    description: draft.description || null,
    due_date: draft.due_date,
    assigned_to: draft.assigned_to || null,
    estimated_hours: draft.estimated_hours ? Number(draft.estimated_hours) : null,
    status: 'pending',
  };
}

export function groupDemandItems(items: EquipeDemandItem[]): DemandItemsByDemand {
  const grouped: DemandItemsByDemand = {};
  items.forEach((item) => {
    if (!grouped[item.demand_id]) grouped[item.demand_id] = [];
    grouped[item.demand_id].push(item);
  });
  return grouped;
}

export type SubdemandDateValidation = 'after-parent-due-date' | 'before-parent-start-date' | null;

export function validateSubdemandDate(
  dueDate: string,
  parent: EquipeDemanda,
): SubdemandDateValidation {
  if (parent.is_recurring || !parent.due_date) return null;
  if (dueDate > parent.due_date) return 'after-parent-due-date';
  if (parent.start_date && dueDate < parent.start_date) return 'before-parent-start-date';
  return null;
}

export function toggledDemandStatus(status: string): string {
  return status === 'pending' ? 'done' : 'pending';
}

export function patchDemandStatus(
  demands: EquipeDemanda[],
  id: string,
  status: string,
): EquipeDemanda[] {
  return demands.map((demand) => (demand.id === id ? { ...demand, status } : demand));
}

export function routineInsertForSupabase(
  payload: RoutineWritePayload & {
    status: string;
    created_by: string | undefined;
  },
): TablesInsert<'routines'> {
  // The dormant UI intentionally sends frequency:null for nonrecurring routines,
  // despite the generated schema declaring frequency as non-null.
  return payload as unknown as TablesInsert<'routines'>;
}

export function routineUpdateForSupabase(payload: RoutineWritePayload): TablesUpdate<'routines'> {
  // Preserve the same legacy frequency:null payload on updates.
  return payload as unknown as TablesUpdate<'routines'>;
}
