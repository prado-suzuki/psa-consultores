

## Plan: Add "Horas Estimadas" column to the Projects table

### What
Add a new column after "Término" in the projects table at `/equipe/tax/projetos/cadastro` that shows the total estimated hours from all tasks (`fiscal_tasks`) linked to each project.

### Technical approach

**File: `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`**

1. **New query** — Fetch aggregated estimated hours per project from `fiscal_tasks`:
   ```ts
   const { data: projectHours = {} } = useQuery({
     queryKey: ['fiscal-project-hours'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('fiscal_tasks')
         .select('project_id, estimated_hours');
       if (error) throw error;
       const map: Record<string, number> = {};
       (data || []).forEach(t => {
         if (t.project_id && t.estimated_hours) {
           map[t.project_id] = (map[t.project_id] || 0) + t.estimated_hours;
         }
       });
       return map;
     },
   });
   ```

2. **Table header** — Add `<TableHead>Horas Est.</TableHead>` after the "Término" column (line ~628). Update `colSpan` from 9 to 10.

3. **Table cell** — After the "Término" cell (line ~693), add:
   ```tsx
   <TableCell className="text-sm text-slate-600">
     {projectHours[project.id] ? `${projectHours[project.id]}h` : '-'}
   </TableCell>
   ```

### No database changes required
The data already exists in the `fiscal_tasks` table with `project_id` and `estimated_hours` columns.

