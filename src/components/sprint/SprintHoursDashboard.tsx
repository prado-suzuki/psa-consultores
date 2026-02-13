import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Clock, TrendingUp, User, AlertCircle, Filter } from "lucide-react";
import { format, getISOWeek, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Deliverable {
  id: string;
  title: string;
  assigned_to: string | null;
  due_date: string;
  estimated_hours: number | null;
  status: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}

type Granularity = "day" | "week" | "month" | "year";

const COLORS = [
  "hsl(var(--primary))",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#6366f1",
];

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface SprintHoursDashboardProps {
  deliverables: Deliverable[];
  profiles: Profile[];
}

export function SprintHoursDashboard({ deliverables, profiles }: SprintHoursDashboardProps) {
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [filterYear, setFilterYear] = useState<string>("__none__");
  const [filterMonth, setFilterMonth] = useState<string>("__none__");
  const [filterPerson, setFilterPerson] = useState<string>("__none__");

  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p) => {
      map[p.id] = `${p.first_name} ${p.last_name}`;
    });
    return map;
  }, [profiles]);

  const withHours = useMemo(
    () => deliverables.filter((d) => d.estimated_hours && d.estimated_hours > 0 && d.due_date),
    [deliverables]
  );

  // Extract filter options
  const availableYears = useMemo(() => {
    const years = [...new Set(withHours.map((d) => parseISO(d.due_date).getFullYear().toString()))];
    return years.sort();
  }, [withHours]);

  const availableMonths = useMemo(() => {
    const filtered = filterYear !== "__none__"
      ? withHours.filter((d) => parseISO(d.due_date).getFullYear().toString() === filterYear)
      : withHours;
    const months = [...new Set(filtered.map((d) => parseISO(d.due_date).getMonth().toString()))];
    return months.sort((a, b) => Number(a) - Number(b));
  }, [withHours, filterYear]);

  const availablePeople = useMemo(() => {
    const ids = [...new Set(withHours.map((d) => d.assigned_to).filter(Boolean))] as string[];
    return ids.map((id) => ({ id, name: profileMap[id] || "Sem nome" })).sort((a, b) => a.name.localeCompare(b.name));
  }, [withHours, profileMap]);

  // Apply filters
  const filteredWithHours = useMemo(() => {
    return withHours.filter((d) => {
      const date = parseISO(d.due_date);
      if (filterYear !== "__none__" && date.getFullYear().toString() !== filterYear) return false;
      if (filterMonth !== "__none__" && date.getMonth().toString() !== filterMonth) return false;
      if (filterPerson !== "__none__" && d.assigned_to !== filterPerson) return false;
      return true;
    });
  }, [withHours, filterYear, filterMonth, filterPerson]);

  const uniquePeople = useMemo(() => {
    const ids = [...new Set(filteredWithHours.map((d) => d.assigned_to).filter(Boolean))] as string[];
    return ids.map((id, i) => ({
      id,
      name: profileMap[id] || "Sem nome",
      color: COLORS[i % COLORS.length],
    }));
  }, [filteredWithHours, profileMap]);

  const getPeriodKey = (dateStr: string, gran: Granularity): string => {
    const date = parseISO(dateStr);
    switch (gran) {
      case "day": return format(date, "dd/MM", { locale: ptBR });
      case "week": return `S${getISOWeek(date)}`;
      case "month": return format(date, "MMM/yy", { locale: ptBR });
      case "year": return format(date, "yyyy");
    }
  };

  const getSortKey = (dateStr: string, gran: Granularity): string => {
    const date = parseISO(dateStr);
    switch (gran) {
      case "day": return dateStr;
      case "week": return `${date.getFullYear()}-${String(getISOWeek(date)).padStart(2, "0")}`;
      case "month": return format(date, "yyyy-MM");
      case "year": return format(date, "yyyy");
    }
  };

  const chartData = useMemo(() => {
    const grouped: Record<string, { period: string; sortKey: string; [personId: string]: number | string }> = {};
    filteredWithHours.forEach((d) => {
      const key = getPeriodKey(d.due_date, granularity);
      const sortKey = getSortKey(d.due_date, granularity);
      if (!grouped[key]) grouped[key] = { period: key, sortKey };
      const personId = d.assigned_to || "unassigned";
      grouped[key][personId] = ((grouped[key][personId] as number) || 0) + (d.estimated_hours || 0);
    });
    return Object.values(grouped).sort((a, b) => (a.sortKey as string).localeCompare(b.sortKey as string));
  }, [filteredWithHours, granularity]);

  const personSummary = useMemo(() => {
    const summary: Record<string, { name: string; hours: number; tasks: number }> = {};
    filteredWithHours.forEach((d) => {
      const pid = d.assigned_to || "unassigned";
      if (!summary[pid]) summary[pid] = { name: profileMap[pid] || "Não atribuído", hours: 0, tasks: 0 };
      summary[pid].hours += d.estimated_hours || 0;
      summary[pid].tasks += 1;
    });
    return Object.values(summary).sort((a, b) => b.hours - a.hours);
  }, [filteredWithHours, profileMap]);

  const totalHours = personSummary.reduce((s, p) => s + p.hours, 0);
  const uniqueDays = new Set(filteredWithHours.map((d) => d.due_date)).size;
  const avgPerDay = uniqueDays > 0 ? (totalHours / uniqueDays).toFixed(1) : "0";
  const topPerson = personSummary[0]?.name || "—";
  const tasksWithoutHours = deliverables.filter((d) => !d.estimated_hours || d.estimated_hours <= 0).length;

  const hasActiveFilters = filterYear !== "__none__" || filterMonth !== "__none__" || filterPerson !== "__none__";

  const clearFilters = () => {
    setFilterYear("__none__");
    setFilterMonth("__none__");
    setFilterPerson("__none__");
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterYear} onValueChange={(v) => { setFilterYear(v); setFilterMonth("__none__"); }}>
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Todos</SelectItem>
            {availableYears.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Todos</SelectItem>
            {availableMonths.map((m) => <SelectItem key={m} value={m}>{MONTH_NAMES[Number(m)]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPerson} onValueChange={setFilterPerson}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Todos</SelectItem>
            {availablePeople.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
            Limpar
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        <Card className="border-border min-w-[140px] flex-shrink-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock className="h-3.5 w-3.5" /> Total de Horas
            </div>
            <p className="text-xl font-bold">{totalHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card className="border-border min-w-[140px] flex-shrink-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" /> Média/Dia
            </div>
            <p className="text-xl font-bold">{avgPerDay}h</p>
          </CardContent>
        </Card>
        <Card className="border-border min-w-[140px] flex-shrink-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <User className="h-3.5 w-3.5" /> Mais Horas
            </div>
            <p className="text-lg font-bold truncate">{topPerson}</p>
          </CardContent>
        </Card>
        <Card className="border-border min-w-[140px] flex-shrink-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <AlertCircle className="h-3.5 w-3.5" /> Sem Horas
            </div>
            <p className="text-xl font-bold">{tasksWithoutHours}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-medium">Distribuição de Horas por Pessoa</CardTitle>
            <ToggleGroup type="single" value={granularity} onValueChange={(v) => v && setGranularity(v as Granularity)} size="sm" variant="outline">
              <ToggleGroupItem value="day">Dia</ToggleGroupItem>
              <ToggleGroupItem value="week">Semana</ToggleGroupItem>
              <ToggleGroupItem value="month">Mês</ToggleGroupItem>
              <ToggleGroupItem value="year">Ano</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Nenhum entregável com horas estimadas e data de entrega.
            </p>
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="period" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} unit="h" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => {
                      const person = uniquePeople.find((p) => p.id === name);
                      return [`${value}h`, person?.name || name];
                    }}
                  />
                  <Legend
                    formatter={(value: string) => {
                      const person = uniquePeople.find((p) => p.id === value);
                      return person?.name || value;
                    }}
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                  {uniquePeople.map((person) => (
                    <Bar key={person.id} dataKey={person.id} stackId="hours" fill={person.color} radius={[2, 2, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Table */}
      {personSummary.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resumo por Pessoa</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Tarefas</TableHead>
                  <TableHead className="text-right">Média h/tarefa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personSummary.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.hours.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{p.tasks}</TableCell>
                    <TableCell className="text-right">{(p.hours / p.tasks).toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
