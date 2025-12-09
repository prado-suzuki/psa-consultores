import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, User } from 'lucide-react';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
}

interface HoursData {
  userId: string;
  name: string;
  sprintHours: number;
  routineHours: number;
  total: number;
}

interface HorasAcumuladasProps {
  sprintId?: string;
  showRoutines?: boolean;
  title?: string;
  maxHoursPerWeek?: number;
}

export const HorasAcumuladas = ({ 
  sprintId, 
  showRoutines = true, 
  title = "Horas Alocadas por Pessoa",
  maxHoursPerWeek = 40
}: HorasAcumuladasProps) => {
  const [hoursData, setHoursData] = useState<HoursData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHoursData();
  }, [sprintId]);

  const fetchHoursData = async () => {
    try {
      // Fetch team members
      const { data: members } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('first_name');

      if (!members) return;

      const hoursMap: Record<string, HoursData> = {};
      
      // Initialize all members
      members.forEach(member => {
        hoursMap[member.id] = {
          userId: member.id,
          name: `${member.first_name} ${member.last_name}`.trim() || 'Sem nome',
          sprintHours: 0,
          routineHours: 0,
          total: 0
        };
      });

      // Fetch sprint hours from deliverables
      let deliverablesQuery = supabase
        .from('sprint_deliverables')
        .select('assigned_to, estimated_hours');
      
      if (sprintId) {
        deliverablesQuery = deliverablesQuery.eq('sprint_id', sprintId);
      }

      const { data: deliverables } = await deliverablesQuery;

      if (deliverables) {
        deliverables.forEach(deliverable => {
          if (deliverable.assigned_to && deliverable.estimated_hours && hoursMap[deliverable.assigned_to]) {
            hoursMap[deliverable.assigned_to].sprintHours += Number(deliverable.estimated_hours);
          }
        });
      }

      // Fetch routine hours if enabled
      if (showRoutines) {
        const { data: routines } = await supabase
          .from('routines')
          .select('assigned_to, estimated_hours, frequency');

        if (routines) {
          routines.forEach(routine => {
            if (routine.assigned_to && routine.estimated_hours && hoursMap[routine.assigned_to]) {
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
      const result = Object.values(hoursMap)
        .map(data => ({
          ...data,
          total: data.sprintHours + data.routineHours
        }))
        .filter(data => data.total > 0)
        .sort((a, b) => b.total - a.total);

      setHoursData(result);
    } catch (error) {
      console.error('Error fetching hours data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (total: number) => {
    const percentage = (total / maxHoursPerWeek) * 100;
    if (percentage > 100) return 'bg-red-500';
    if (percentage > 80) return 'bg-yellow-500';
    return 'bg-primary';
  };

  if (loading) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (hoursData.length === 0) {
    return (
      <Card className="bg-white border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-gray-900 text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm text-center py-4">
            Nenhuma hora alocada ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalHours = hoursData.reduce((sum, d) => sum + d.total, 0);

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-gray-900 text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hoursData.map((data) => (
          <div key={data.userId} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700 font-medium">{data.name}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-500">
                {showRoutines && (
                  <>
                    <span className="text-xs">Sprint: {data.sprintHours.toFixed(1)}h</span>
                    <span className="text-xs">Rotina: {data.routineHours.toFixed(1)}h</span>
                  </>
                )}
                <span className="font-semibold text-gray-700">{data.total.toFixed(1)}h</span>
              </div>
            </div>
            <Progress 
              value={Math.min((data.total / maxHoursPerWeek) * 100, 100)} 
              className="h-2"
            />
          </div>
        ))}
        
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-gray-700">Total Alocado</span>
            <span className="text-primary">{totalHours.toFixed(1)}h</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
