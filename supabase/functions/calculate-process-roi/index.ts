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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
      .select("*")
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

    // Calcular custos baseados nos membros da equipe
    let baselineCost = 0;
    let improvedCost = 0;

    if (teamMembers && teamMembers.length > 0) {
      teamMembers.forEach((member: any) => {
        const hourlyRate = member.job_role?.hourly_rate || 50; // Default R$ 50/hora
        const monthlyCost = (member.hours_allocated || 0) * hourlyRate;
        
        if (member.is_baseline) {
          baselineCost += monthlyCost;
        } else {
          improvedCost += monthlyCost;
        }
      });
    } else {
      // Usar valores fornecidos diretamente
      baselineCost = improvement.baseline_cost_monthly || 0;
      improvedCost = improvement.improved_cost_monthly || 0;
    }

    // Cálculos de economia
    const baselineTimeHours = improvement.baseline_time_hours || 0;
    const improvedTimeHours = improvement.improved_time_hours || 0;
    
    const timeSavedHours = baselineTimeHours - improvedTimeHours;
    const timeSavedPercent = baselineTimeHours > 0 
      ? (timeSavedHours / baselineTimeHours) * 100 
      : 0;
    
    const costSavedMonthly = baselineCost - improvedCost;
    const costSavedPercent = baselineCost > 0 
      ? (costSavedMonthly / baselineCost) * 100 
      : 0;

    // Cálculo de ROI
    const implementationHours = improvement.implementation_hours || 0;
    const avgHourlyCost = 60; // Custo médio hora da equipe digital
    const implementationCost = implementationHours * avgHourlyCost;

    const annualSavings = costSavedMonthly * 12;
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
        }
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
