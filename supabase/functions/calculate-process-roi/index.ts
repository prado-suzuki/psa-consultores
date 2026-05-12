import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { handleCorsPreflightRequest, buildCorsHeaders } from "../_shared/cors.ts";

// ============================================================
// Modos:
//   - "persist": recebe improvement_id, busca dados, calcula e ATUALIZA process_improvements (legado)
//   - "compute": recebe payload completo, calcula e DEVOLVE resultados sem persistir (cenários what-if)
// Retrocompatibilidade: se body não tiver mode, assume "persist".
// ============================================================

interface SavingsItem {
  description?: string;
  cost_before?: number;
  cost_after?: number;
  savings_value?: number;
  is_monthly?: boolean;
}

interface TeamMemberAlloc {
  hours_allocated: number;
  hourly_rate: number; // já resolvido pelo cliente
  is_baseline: boolean;
}

interface ComputePayload {
  baseline_time_hours: number;
  baseline_cost_monthly?: number;
  baseline_volume: number;
  baseline_people_involved: number;
  improved_time_hours: number;
  improved_cost_monthly?: number;
  improved_volume: number;
  improved_people_involved: number;
  implementation_hours: number;
  team_members?: TeamMemberAlloc[];
  system_savings_monthly?: number;
  build_vs_buy_savings?: number;
  other_savings_monthly?: number;
  unit_basis?: 'per_unit' | 'per_month' | 'per_year';
  avg_hourly_cost_implementation?: number; // override do custo médio de implementação
  hours_per_month?: number; // override do divisor de FTE
}

interface CalculationResult {
  time_saved_hours: number;
  time_saved_percent: number;
  cost_saved_monthly: number;
  cost_saved_percent: number;
  labor_savings_monthly: number;
  system_savings_monthly: number;
  other_savings_monthly: number;
  build_vs_buy_savings: number;
  implementation_cost: number;
  annual_savings: number;
  roi_percentage: number;
  payback_months: number;
  fte_saved: number;
  roi_fte_annual: number;
  baseline_cost_monthly: number;
  improved_cost_monthly: number;
  unit_basis: string;
  views: {
    per_unit?: { cost_saved: number; time_saved_hours: number };
    per_month: { cost_saved: number; time_saved_hours: number };
    per_year: { cost_saved: number; time_saved_hours: number };
  };
}

function calculate(p: ComputePayload): CalculationResult {
  const avgHourlyCostImpl = p.avg_hourly_cost_implementation ?? 60;
  const hoursPerMonth = p.hours_per_month ?? 176;
  const unitBasis = p.unit_basis ?? 'per_month';

  let baselineCost = 0;
  let improvedCost = 0;

  if (p.team_members && p.team_members.length > 0) {
    for (const m of p.team_members) {
      const rate = m.hourly_rate || 0;
      const monthly = (m.hours_allocated || 0) * rate;
      if (m.is_baseline) baselineCost += monthly;
      else improvedCost += monthly;
    }
  } else {
    baselineCost = p.baseline_cost_monthly || 0;
    improvedCost = p.improved_cost_monthly || 0;
  }

  const baselineTimeHours = p.baseline_time_hours || 0;
  const improvedTimeHours = p.improved_time_hours || 0;

  const timeSavedHours = baselineTimeHours - improvedTimeHours;
  const timeSavedPercent = baselineTimeHours > 0 ? (timeSavedHours / baselineTimeHours) * 100 : 0;

  const laborSavingsMonthly = baselineCost - improvedCost;
  const systemSavings = p.system_savings_monthly || 0;
  const otherSavings = p.other_savings_monthly || 0;
  const buildVsBuySavings = p.build_vs_buy_savings || 0;

  const costSavedMonthly = laborSavingsMonthly + systemSavings + otherSavings;
  const costSavedPercent = baselineCost > 0 ? (costSavedMonthly / baselineCost) * 100 : 0;

  const implementationCost = (p.implementation_hours || 0) * avgHourlyCostImpl;

  const annualSavings = (costSavedMonthly * 12) + buildVsBuySavings;
  const roiPercentage = implementationCost > 0
    ? ((annualSavings - implementationCost) / implementationCost) * 100
    : 0;

  const paybackMonths = costSavedMonthly > 0 ? implementationCost / costSavedMonthly : 0;

  const fteSaved = timeSavedHours / hoursPerMonth;
  const roiFteAnnual = fteSaved * avgHourlyCostImpl * hoursPerMonth * 12;

  // Normalização por unit_basis para comparação cruzada
  const baselineVolume = p.baseline_volume || 1;
  const perUnitCost = baselineVolume > 0 ? costSavedMonthly / baselineVolume : 0;
  const perUnitTime = baselineVolume > 0 ? timeSavedHours / baselineVolume : 0;

  return {
    time_saved_hours: timeSavedHours,
    time_saved_percent: timeSavedPercent,
    cost_saved_monthly: costSavedMonthly,
    cost_saved_percent: costSavedPercent,
    labor_savings_monthly: laborSavingsMonthly,
    system_savings_monthly: systemSavings,
    other_savings_monthly: otherSavings,
    build_vs_buy_savings: buildVsBuySavings,
    implementation_cost: implementationCost,
    annual_savings: annualSavings,
    roi_percentage: roiPercentage,
    payback_months: paybackMonths,
    fte_saved: fteSaved,
    roi_fte_annual: roiFteAnnual,
    baseline_cost_monthly: baselineCost,
    improved_cost_monthly: improvedCost,
    unit_basis: unitBasis,
    views: {
      per_unit: { cost_saved: perUnitCost, time_saved_hours: perUnitTime },
      per_month: { cost_saved: costSavedMonthly, time_saved_hours: timeSavedHours },
      per_year: { cost_saved: costSavedMonthly * 12, time_saved_hours: timeSavedHours * 12 },
    },
  };
}

serve(async (req) => {
  const _preflight = handleCorsPreflightRequest(req);
  if (_preflight) return _preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
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

    const { data: roles } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAuthorized = roles?.some(r => ['admin', 'lider', 'sublider', 'team_member'].includes(r.role));
    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Permissão negada' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const mode = body?.mode ?? 'persist';

    // ============================================================
    // MODE COMPUTE — calcula e devolve sem persistir
    // ============================================================
    if (mode === 'compute') {
      const payload: ComputePayload = body.scenario_payload ?? body.payload ?? body;
      if (payload.baseline_time_hours === undefined || payload.improved_time_hours === undefined) {
        return new Response(
          JSON.stringify({ error: 'compute: baseline_time_hours e improved_time_hours são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const results = calculate(payload);
      return new Response(
        JSON.stringify({ success: true, mode: 'compute', results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // MODE PERSIST — comportamento legado
    // ============================================================
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { improvement_id } = body;

    if (!improvement_id) {
      return new Response(
        JSON.stringify({ error: "improvement_id é obrigatório no modo persist" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const { data: teamMembers } = await supabase
      .from("improvement_team_members")
      .select(`*, job_role:job_roles(hourly_rate)`)
      .eq("improvement_id", improvement_id);

    const teamPayload: TeamMemberAlloc[] = (teamMembers ?? []).map((m: any) => ({
      hours_allocated: m.hours_allocated || 0,
      hourly_rate: m.job_role?.hourly_rate || 50,
      is_baseline: !!m.is_baseline,
    }));

    const results = calculate({
      baseline_time_hours: improvement.baseline_time_hours || 0,
      baseline_cost_monthly: improvement.baseline_cost_monthly || 0,
      baseline_volume: improvement.baseline_volume || 0,
      baseline_people_involved: improvement.baseline_people_involved || 1,
      improved_time_hours: improvement.improved_time_hours || 0,
      improved_cost_monthly: improvement.improved_cost_monthly || 0,
      improved_volume: improvement.improved_volume || 0,
      improved_people_involved: improvement.improved_people_involved || 1,
      implementation_hours: improvement.implementation_hours || 0,
      team_members: teamPayload.length > 0 ? teamPayload : undefined,
      system_savings_monthly: improvement.system_savings_monthly || 0,
      build_vs_buy_savings: improvement.build_vs_buy_savings || 0,
      other_savings_monthly: improvement.other_savings_monthly || 0,
      unit_basis: 'per_month',
    });

    const { error: updateError } = await supabase
      .from("process_improvements")
      .update({
        baseline_cost_monthly: results.baseline_cost_monthly,
        improved_cost_monthly: results.improved_cost_monthly,
        time_saved_hours: results.time_saved_hours,
        time_saved_percent: results.time_saved_percent,
        cost_saved_monthly: results.cost_saved_monthly,
        cost_saved_percent: results.cost_saved_percent,
        implementation_cost: results.implementation_cost,
        roi_time_months: results.payback_months,
        roi_fte_annual: results.roi_fte_annual,
        roi_percentage: results.roi_percentage,
        evaluation_status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", improvement_id);

    const { error: processUpdateError } = await supabase
      .from("processes")
      .update({
        last_roi_percentage: results.roi_percentage,
        last_cost_saved_monthly: results.cost_saved_monthly,
        last_time_saved_hours: results.time_saved_hours,
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
        mode: 'persist',
        results: {
          time_saved_hours: results.time_saved_hours,
          time_saved_percent: results.time_saved_percent,
          cost_saved_monthly: results.cost_saved_monthly,
          cost_saved_percent: results.cost_saved_percent,
          roi_percentage: results.roi_percentage,
          payback_months: results.payback_months,
          fte_saved: results.fte_saved,
          annual_savings: results.annual_savings
        },
        labor_savings_monthly: results.labor_savings_monthly,
        system_savings_monthly: results.system_savings_monthly,
        other_savings_monthly: results.other_savings_monthly,
        build_vs_buy_savings: results.build_vs_buy_savings
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
