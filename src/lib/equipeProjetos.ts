export type SpreadsheetRow = Record<string, unknown>;

export const PROJECT_NAME_ALIASES = [
  'Projeto',
  'projeto',
  'Project',
  'name',
  'Nome',
  'nome',
] as const;

export const PROJECT_AREA_SOURCE_ALIASES = [
  'Cliente',
  'cliente',
  'Client',
  'Empresa',
  'empresa',
] as const;

export const PROJECT_CLIENT_NAME_ALIASES = ['Empresa', 'empresa'] as const;

export interface NormalizedProjectImportRow {
  name: string;
  areaSource: unknown;
  clientName: unknown;
}

export interface ProjectImportPayload {
  name: string;
  description: string;
  status: string;
  client_name: string;
  created_by: string | undefined;
}

export function readFirstTruthySpreadsheetValue(
  row: SpreadsheetRow,
  aliases: readonly string[],
): unknown {
  for (const alias of aliases) {
    const value = row[alias];
    if (value) return value;
  }

  return '';
}

export function normalizeProjectImportRow(row: SpreadsheetRow): NormalizedProjectImportRow {
  const projectName = readFirstTruthySpreadsheetValue(row, PROJECT_NAME_ALIASES);

  return {
    name: String(projectName).trim(),
    areaSource: readFirstTruthySpreadsheetValue(row, PROJECT_AREA_SOURCE_ALIASES),
    clientName: readFirstTruthySpreadsheetValue(row, PROJECT_CLIENT_NAME_ALIASES),
  };
}

export function inferProjectArea(cliente: unknown): string {
  if (!cliente) return 'Geral';

  const normalizedClient = String(cliente).toLowerCase();
  if (normalizedClient.includes('fiscal') || normalizedClient.includes('ricardo')) {
    return 'Fiscal';
  }
  if (normalizedClient.includes('consultoria') || normalizedClient.includes('felipe')) {
    return 'Consultoria';
  }
  if (normalizedClient.includes('fixos') || normalizedClient.includes('washington')) {
    return 'Fixos';
  }
  return 'Transversal';
}

export function buildProjectImportPayload(
  row: NormalizedProjectImportRow,
  userId: string | undefined,
): ProjectImportPayload {
  return {
    name: row.name,
    description: `Área: ${inferProjectArea(row.areaSource)} | Prioridade: Média`,
    status: 'active',
    // Keep the original raw Empresa value at runtime instead of adding coercion.
    client_name: (row.clientName || 'PSA CONSULTORES') as string,
    created_by: userId,
  };
}

export function isValidProjectImportPayload(project: ProjectImportPayload): boolean {
  return Boolean(project.name && project.name.length > 0);
}

export function deduplicateProjectImportPayloads(
  projects: ProjectImportPayload[],
): ProjectImportPayload[] {
  return [...new Map(projects.map((project) => [project.name.toLowerCase(), project])).values()];
}

export function prepareProjectImportPayloads(
  rows: SpreadsheetRow[],
  userId: string | undefined,
): ProjectImportPayload[] {
  const projects = rows
    .map(normalizeProjectImportRow)
    .map((row) => buildProjectImportPayload(row, userId))
    .filter(isValidProjectImportPayload);

  return deduplicateProjectImportPayloads(projects);
}
