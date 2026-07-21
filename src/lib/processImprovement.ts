import type { DomainProcessImprovementJobRole } from '@/hooks/useDomainProcessImprovement';

export type SavingsType = 'system' | 'build_vs_buy' | 'other';

export interface TeamMember {
  id?: string;
  job_role_id: string;
  hours_allocated: number;
  is_baseline: boolean;
  job_role?: DomainProcessImprovementJobRole;
}

export interface SavingsItem {
  id?: string;
  savings_type: SavingsType;
  description: string;
  cost_before: number;
  cost_after: number;
  savings_value: number;
  is_monthly: boolean;
}

export interface ProcessImprovementForm {
  process_id: string;
  sprint_deliverable_id?: string;
  project_id?: string;
  baseline_time_hours: number;
  baseline_cost_monthly: number;
  baseline_volume: number;
  baseline_people_involved: number;
  improved_time_hours: number;
  improved_cost_monthly: number;
  improved_volume: number;
  improved_people_involved: number;
  evaluation_period_days: number;
  implementation_hours: number;
  improvement_description: string;
}

export interface SavingsTotals {
  system: number;
  buildVsBuy: number;
  other: number;
}

export function createSavingsItem(type: SavingsType): SavingsItem {
  return {
    savings_type: type,
    description: '',
    cost_before: 0,
    cost_after: 0,
    savings_value: 0,
    is_monthly: type !== 'build_vs_buy',
  };
}

export function calculateSavingsTotal(items: SavingsItem[]): number {
  return items.reduce((sum, item) => sum + (item.savings_value || 0), 0);
}

export function calculateTeamCost(members: TeamMember[]): number {
  return members.reduce(
    (total, member) => total + member.hours_allocated * (member.job_role?.hourly_rate || 0),
    0,
  );
}

export function calculateTeamHours(members: TeamMember[]): number {
  return members.reduce((total, member) => total + (member.hours_allocated || 0), 0);
}

interface ImprovementPayloadInput {
  processId: string;
  deliverableId?: string;
  projectId?: string;
  userId?: string;
  form: ProcessImprovementForm;
  baselineMembers: TeamMember[];
  improvedMembers: TeamMember[];
  savingsTotals: SavingsTotals;
  now?: Date;
}

export function buildImprovementPayload({
  processId,
  deliverableId,
  projectId,
  userId,
  form,
  baselineMembers,
  improvedMembers,
  savingsTotals,
  now = new Date(),
}: ImprovementPayloadInput) {
  const baselineHours = calculateTeamHours(baselineMembers);
  const improvedHours = calculateTeamHours(improvedMembers);
  const baselineCost = calculateTeamCost(baselineMembers);
  const improvedCost = calculateTeamCost(improvedMembers);

  return {
    process_id: processId,
    sprint_deliverable_id: deliverableId || null,
    project_id: projectId || null,
    baseline_time_hours: baselineHours || form.baseline_time_hours,
    baseline_cost_monthly: baselineCost || form.baseline_cost_monthly,
    baseline_volume: form.baseline_volume,
    baseline_people_involved: baselineMembers.length || form.baseline_people_involved,
    improved_time_hours: improvedHours || form.improved_time_hours,
    improved_cost_monthly: improvedCost || form.improved_cost_monthly,
    improved_volume: form.improved_volume,
    improved_people_involved: improvedMembers.length || form.improved_people_involved,
    evaluation_period_days: form.evaluation_period_days,
    evaluation_start_date: now.toISOString().split('T')[0],
    evaluation_end_date: new Date(
      now.getTime() + form.evaluation_period_days * 24 * 60 * 60 * 1000,
    ).toISOString().split('T')[0],
    evaluation_status: 'in_evaluation',
    implementation_hours: form.implementation_hours,
    improvement_description: form.improvement_description,
    evaluated_by: userId,
    system_savings_monthly: savingsTotals.system,
    build_vs_buy_savings: savingsTotals.buildVsBuy,
    other_savings_monthly: savingsTotals.other,
  };
}

export function buildSavingsDetailsPayload(
  improvementId: string,
  systemSavings: SavingsItem[],
  buildVsBuySavings: SavingsItem[],
  otherSavings: SavingsItem[],
) {
  return [
    ...systemSavings.map(item => ({
      improvement_id: improvementId,
      savings_type: 'system' as const,
      description: item.description,
      cost_before: item.cost_before,
      cost_after: item.cost_after,
      savings_value: item.savings_value,
      is_monthly: true,
    })),
    ...buildVsBuySavings.map(item => ({
      improvement_id: improvementId,
      savings_type: 'build_vs_buy' as const,
      description: item.description,
      cost_before: item.cost_before,
      cost_after: item.cost_after,
      savings_value: item.savings_value,
      is_monthly: false,
    })),
    ...otherSavings.map(item => ({
      improvement_id: improvementId,
      savings_type: 'other' as const,
      description: item.description,
      cost_before: 0,
      cost_after: 0,
      savings_value: item.savings_value,
      is_monthly: true,
    })),
  ].filter(item => item.description.trim());
}

export function buildTeamMembersPayload(
  improvementId: string,
  baselineMembers: TeamMember[],
  improvedMembers: TeamMember[],
) {
  return [
    ...baselineMembers.map(member => ({ ...member, is_baseline: true })),
    ...improvedMembers.map(member => ({ ...member, is_baseline: false })),
  ]
    .filter(member => member.job_role_id)
    .map(member => ({
      improvement_id: improvementId,
      job_role_id: member.job_role_id,
      hours_allocated: member.hours_allocated,
      is_baseline: member.is_baseline,
    }));
}

interface ProcessUpdatePayloadInput {
  form: ProcessImprovementForm;
  improvedMembers: TeamMember[];
  roiResults?: {
    roi_percentage?: number | null;
    cost_saved_monthly?: number | null;
    time_saved_hours?: number | null;
  } | null;
  now?: Date;
}

export function buildProcessUpdatePayload({
  form,
  improvedMembers,
  roiResults,
  now = new Date(),
}: ProcessUpdatePayloadInput) {
  return {
    time_spent_hours: calculateTeamHours(improvedMembers) || form.improved_time_hours,
    cost_monthly: calculateTeamCost(improvedMembers) || form.improved_cost_monthly,
    volume_executions: form.improved_volume,
    people_involved: improvedMembers.length || form.improved_people_involved,
    last_roi_percentage: roiResults?.roi_percentage || null,
    last_cost_saved_monthly: roiResults?.cost_saved_monthly || null,
    last_time_saved_hours: roiResults?.time_saved_hours || null,
    last_improvement_date: now.toISOString(),
  };
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
