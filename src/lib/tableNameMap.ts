// Tradução de nomes de "resource" legados (vindos do tempo da API Express /
// SQLite) para os nomes reais das tabelas no Postgres do Supabase. Mantida
// como camada de compat: quando um caller passa um nome herdado (`projetos`,
// `processos`, `etapas`...) o mapa resolve para a tabela equivalente do
// schema novo (`projects`, `processes`, `process_stages`...).
//
// Pasta `lib/` por ser um helper puro (sem I/O), conforme plan.md.

export const TABLE_NAME_MAP: Record<string, string> = {
  // Nomes em português (Express/SQLite) → tabelas Supabase nativas
  projetos: 'projects',
  processos: 'processes',
  etapas: 'process_stages',
  melhorias: 'process_improvements',
  snapshots: 'process_scenarios',
  responsaveis: 'job_roles',
  documentos: 'documentos_processo',
  sistemas: 'sistemas_processo',
  'cascata-eventos': 'cascata_eventos',
  'cascata-evento-etapas': 'cascata_evento_etapas',

  // Identidade — nomes já idênticos no Supabase, listados para clareza.
  projects: 'projects',
  processes: 'processes',
  process_stages: 'process_stages',
  process_improvements: 'process_improvements',
  process_scenarios: 'process_scenarios',
  job_roles: 'job_roles',
  documentos_processo: 'documentos_processo',
  sistemas_processo: 'sistemas_processo',
  cascata_eventos: 'cascata_eventos',
  cascata_evento_etapas: 'cascata_evento_etapas',
};

export function resolveTable(name: string): string {
  return TABLE_NAME_MAP[name] ?? name;
}
