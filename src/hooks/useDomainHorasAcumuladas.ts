import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/supabasePagination';

interface DeliverableHoursRow {
  id: string;
  assigned_to: string | null;
  estimated_hours: number | null;
}

interface RoutineHoursRow {
  id: string;
  assigned_to: string | null;
  estimated_hours: number | null;
  frequency: string | null;
}

export interface HorasAcumuladasData {
  userId: string;
  name: string;
  sprintHours: number;
  routineHours: number;
  total: number;
}

interface HorasAcumuladasParams {
  sprintId?: string;
  showRoutines: boolean;
}

const horasAcumuladasKeys = {
  data: ({ sprintId, showRoutines }: HorasAcumuladasParams) =>
    ['domain-horas-acumuladas', sprintId ?? null, showRoutines] as const,
};

export const useDomainHorasAcumuladas = ({
  sprintId,
  showRoutines,
}: HorasAcumuladasParams) =>
  useQuery<HorasAcumuladasData[]>({
    queryKey: horasAcumuladasKeys.data({ sprintId, showRoutines }),
    queryFn: async () => {
      try {
        // Fetch team members
        const { data: members } = await supabase
          .from('profiles_safe')
          .select('id, first_name, last_name')
          .order('first_name');

        if (!members) return [];

        const hoursMap: Record<string, HorasAcumuladasData> = {};

        // Initialize all members
        members.forEach((member) => {
          hoursMap[member.id] = {
            userId: member.id,
            name: `${member.first_name} ${member.last_name}`.trim() || 'Sem nome',
            sprintHours: 0,
            routineHours: 0,
            total: 0,
          };
        });

        // Fetch sprint hours from deliverables — paginado porque sem sprintId isso lê a tabela
        // inteira, e o corte de linhas do PostgREST fazia a soma de horas parar no teto sem avisar.
        // Ver supabasePagination.
        const { rows: deliverables } = await fetchAllRows<DeliverableHoursRow>((from, to) => {
          const query = supabase
            .from('sprint_deliverables')
            .select('id, assigned_to, estimated_hours', { count: 'exact' });
          return (sprintId ? query.eq('sprint_id', sprintId) : query)
            .order('id', { ascending: true })
            .range(from, to);
        });

        if (deliverables) {
          deliverables.forEach((deliverable) => {
            if (
              deliverable.assigned_to &&
              deliverable.estimated_hours &&
              hoursMap[deliverable.assigned_to]
            ) {
              hoursMap[deliverable.assigned_to].sprintHours += Number(
                deliverable.estimated_hours,
              );
            }
          });
        }

        // Fetch routine hours if enabled — a outra metade desta mesma soma, também lida inteira.
        if (showRoutines) {
          const { rows: routines } = await fetchAllRows<RoutineHoursRow>((from, to) =>
            supabase
              .from('routines')
              .select('id, assigned_to, estimated_hours, frequency', { count: 'exact' })
              .order('id', { ascending: true })
              .range(from, to),
          );

          if (routines) {
            routines.forEach((routine) => {
              if (
                routine.assigned_to &&
                routine.estimated_hours &&
                hoursMap[routine.assigned_to]
              ) {
                // Convert to weekly hours based on frequency
                let weeklyHours = Number(routine.estimated_hours);
                if (routine.frequency === 'daily') {
                  weeklyHours *= 5; // 5 work days
                } else if (routine.frequency === 'monthly') {
                  weeklyHours /= 4; // 4 weeks per month
                }
                hoursMap[routine.assigned_to].routineHours += weeklyHours;
              }
            });
          }
        }

        // Calculate totals and filter out members with no hours
        return Object.values(hoursMap)
          .map((data) => ({
            ...data,
            total: data.sprintHours + data.routineHours,
          }))
          .filter((data) => data.total > 0)
          .sort((a, b) => b.total - a.total);
      } catch (error) {
        console.error('Error fetching hours data:', error);
        return [];
      }
    },
    staleTime: 0,
    gcTime: 0,
    placeholderData: keepPreviousData,
  });
