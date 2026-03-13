import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImprovementData {
  id: string;
  baseline_time_hours: number;
  baseline_cost_monthly: number;
  baseline_volume: number;
  baseline_people_involved: number;
  improved_time_hours: number;
  improved_cost_monthly: number;
  improved_volume: number;
  improved_people_involved: number;
  implementation_hours: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create user client to verify authentication
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Role check - only team members and admins can use this function
    const { data: roles } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAuthorized = roles?.some(r => r.role === 'admin' || r.role === 'team_member');
    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Permissão negada' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for data operations after auth is confirmed
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { improvement_id } = await req.json();

    if (!improvement_id) {
      return new Response(
        JSON.stringify({ error: "improvement_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar dados da melhoria
    const { data: improvement, error: fetchError } = await supabase
      .from("process_improvements")
      .select("*, system_savings_monthly, build_vs_buy_savings, other_savings_monthly")
      .eq("id", improvement_id)
      .single();

    if (fetchError || !improvement) {
      return new Response(
        JSON.stringify({ error: "Melhoria não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar membros da equipe com custos (baseline e melhorado)
    const { data: teamMembers } = await supabase
      .from("improvement_team_members")
      .select(`
        *,
        job_role:job_roles(hourly_rate)
      `)
      .eq("improvement_id", improvement_id);

    // Buscar etapas do processo com job_roles para baseline automático
    const { data: processStages } = await supabase
      .from("process_stages")
      .select(`
        id, name, time_current, time_target, job_role_id,
        job_role:job_roles(hourly_rate)
      `)
      .eq("process_id", improvement.process_id)
      .not("job_role_id", "is", null);

    // Helper: parse time strings to hours
    const parseTimeToHours = (time: string | null): number => {
      if (!time) return 0;
      const t = time.trim().toLowerCase();
      const match = t.match(/^([\d.,]+)\s*(h|hora|horas|min|minuto|minutos|dia|dias|d)?$/i);
      if (!match) return 0;
      const value = parseFloat(match[1].replace(",", "."));
      if (isNaN(value)) return 0;
      const unit = match[2] || "h";
      if (unit.startsWith("min")) return value / 60;
      if (unit.startsWith("dia") || unit === "d") return value * 8;
      return value;
    };

    // Calcular custos baseados nos membros da equipe
    let baselineCost = 0;
    let improvedCost = 0;

    if (teamMembers && teamMembers.length > 0) {
      teamMembers.forEach((member: any) => {
        const hourlyRate = member.job_role?.hourly_rate || 50;
        const monthlyCost = (member.hours_allocated || 0) * hourlyRate;
        
        if (member.is_baseline) {
          baselineCost += monthlyCost;
        } else {
          improvedCost += monthlyCost;
        }
      });
    } else if (processStages && processStages.length > 0) {
      // Fallback: use process stages as baseline source
      processStages.forEach((stage: any) => {
        const hourlyRate = stage.job_role?.hourly_rate || 50;
        const hours = parseTimeToHours(stage.time_current);
        baselineCost += hours * hourlyRate;
      });
      improvedCost = improvement.improved_cost_monthly || 0;
    } else {
      baselineCost = improvement.baseline_cost_monthly || 0;
      improvedCost = improvement.improved_cost_monthly || 0;
    }

    // Cálculos de economia de mão de obra
    const baselineTimeHours = improvement.baseline_time_hours || 0;
    const improvedTimeHours = improvement.improved_time_hours || 0;
    
    const timeSavedHours = baselineTimeHours - improvedTimeHours;
    const timeSavedPercent = baselineTimeHours > 0 
      ? (timeSavedHours / baselineTimeHours) * 100 
      : 0;
    
    const laborSavingsMonthly = baselineCost - improvedCost;
    
    // Economias adicionais
    const systemSavings = improvement.system_savings_monthly || 0;
    const otherSavings = improvement.other_savings_monthly || 0;
    const buildVsBuySavings = improvement.build_vs_buy_savings || 0;
    
    // Economia total mensal
    const costSavedMonthly = laborSavingsMonthly + systemSavings + otherSavings;
    const costSavedPercent = baselineCost > 0 
      ? (costSavedMonthly / baselineCost) * 100 
      : 0;

    // Cálculo de ROI
    const implementationHours = improvement.implementation_hours || 0;
    const avgHourlyCost = 60; // Custo médio hora da equipe digital
    const implementationCost = implementationHours * avgHourlyCost;

    // Economia anual incluindo savings únicos (build vs buy)
    const annualSavings = (costSavedMonthly * 12) + buildVsBuySavings;
    const roiPercentage = implementationCost > 0 
      ? ((annualSavings - implementationCost) / implementationCost) * 100 
      : 0;
    
    const paybackMonths = costSavedMonthly > 0 
      ? implementationCost / costSavedMonthly 
      : 0;

    // FTE liberados (considerando 176 horas úteis mensais)
    const fteSaved = timeSavedHours / 176;
    const roiFteAnnual = fteSaved * avgHourlyCost * 176 * 12;

    // Atualizar registro com resultados
    const { error: updateError } = await supabase
      .from("process_improvements")
      .update({
        baseline_cost_monthly: baselineCost,
        improved_cost_monthly: improvedCost,
        time_saved_hours: timeSavedHours,
        time_saved_percent: timeSavedPercent,
        cost_saved_monthly: costSavedMonthly,
        cost_saved_percent: costSavedPercent,
        implementation_cost: implementationCost,
        roi_time_months: paybackMonths,
        roi_fte_annual: roiFteAnnual,
        roi_percentage: roiPercentage,
        evaluation_status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", improvement_id);

    // Também atualizar a tabela processes com os resultados de ROI
    const { error: processUpdateError } = await supabase
      .from("processes")
      .update({
        last_roi_percentage: roiPercentage,
        last_cost_saved_monthly: costSavedMonthly,
        last_time_saved_hours: timeSavedHours,
        last_improvement_date: new Date().toISOString()
      })
      .eq("id", improvement.process_id);

    if (processUpdateError) {
      console.error("Error updating process ROI:", processUpdateError);
    }

    if (updateError) {
      console.error("Error updating improvement:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar melhoria" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: {
          time_saved_hours: timeSavedHours,
          time_saved_percent: timeSavedPercent,
          cost_saved_monthly: costSavedMonthly,
          cost_saved_percent: costSavedPercent,
          roi_percentage: roiPercentage,
          payback_months: paybackMonths,
          fte_saved: fteSaved,
          annual_savings: annualSavings
        },
        labor_savings_monthly: laborSavingsMonthly,
        system_savings_monthly: systemSavings,
        other_savings_monthly: otherSavings,
        build_vs_buy_savings: buildVsBuySavings
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error calculating ROI:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
