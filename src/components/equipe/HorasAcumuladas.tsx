import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useDomainHorasAcumuladas } from '@/hooks/useDomainHorasAcumuladas';
import { Clock, User } from 'lucide-react';

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
  const { data: hoursData = [], isLoading: loading } = useDomainHorasAcumuladas({
    sprintId,
    showRoutines,
  });

  const getProgressColor = (total: number) => {
    const percentage = (total / maxHoursPerWeek) * 100;
    if (percentage > 100) return 'bg-red-500';
    if (percentage > 80) return 'bg-yellow-500';
    return 'bg-primary';
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (hoursData.length === 0) {
    return (
      <Card className="border-border">
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
    <Card className="border-border">
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
        
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-gray-700">Total Alocado</span>
            <span className="text-primary">{totalHours.toFixed(1)}h</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
