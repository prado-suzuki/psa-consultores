-- Limpar referências em sprint_deliverables
UPDATE sprint_deliverables SET project_id = NULL, process_id = NULL;

-- Limpar referências em daily_standups
UPDATE daily_standups SET project_id = NULL, process_id = NULL;

-- Limpar referências em sprints
UPDATE sprints SET project_id = NULL;

-- Deletar tabelas dependentes
DELETE FROM project_processes;
DELETE FROM process_stages;

-- Deletar dados principais
DELETE FROM processes;
DELETE FROM projects;