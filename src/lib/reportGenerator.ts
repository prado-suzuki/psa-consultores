 import { supabase } from '@/integrations/supabase/client';
 import * as XLSX from 'xlsx';
 
 export interface ReportConfig {
   type: 'sprint' | 'impact' | 'processes' | 'routines' | 'consolidated';
   dateRange: { start: string; end: string };
   projectId?: string;
   area?: string;
 }
 
 export interface ReportData {
   title: string;
   subtitle: string;
   period: string;
   metrics: { label: string; value: string | number }[];
   tables: { title: string; headers: string[]; rows: any[][] }[];
 }
 
 // Fetch Sprint Data
 async function fetchSprintData(config: ReportConfig): Promise<ReportData> {
   try {
   const { data: sprints } = await supabase
     .from('sprints')
     .select(`
       *,
       sprint_deliverables(*)
     `)
     .gte('start_date', config.dateRange.start || '2000-01-01')
     .lte('end_date', config.dateRange.end || '2099-12-31');
 
   const totalSprints = sprints?.length || 0;
   const totalDeliverables = sprints?.reduce((sum, s) => sum + (s.sprint_deliverables?.length || 0), 0) || 0;
   const completedDeliverables = sprints?.reduce((sum, s) => 
     sum + (s.sprint_deliverables?.filter((d: any) => d.status === 'completed').length || 0), 0) || 0;
   const totalHours = sprints?.reduce((sum, s) => 
     sum + (s.sprint_deliverables?.reduce((h: number, d: any) => h + (d.estimated_hours || 0), 0) || 0), 0) || 0;
 
   const completionRate = totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0;
 
   return {
     title: 'Relatório de Sprints',
     subtitle: 'Acompanhamento de entregas e progresso',
     period: `${config.dateRange.start ? new Date(config.dateRange.start).toLocaleDateString('pt-BR') : 'Início'} - ${config.dateRange.end ? new Date(config.dateRange.end).toLocaleDateString('pt-BR') : 'Atual'}`,
     metrics: [
       { label: 'Sprints', value: totalSprints },
       { label: 'Entregas', value: totalDeliverables },
       { label: 'Concluídas', value: completedDeliverables },
       { label: 'Taxa de Conclusão', value: `${completionRate}%` },
       { label: 'Horas Alocadas', value: `${totalHours}h` },
     ],
     tables: [
       {
         title: 'Sprints do Período',
         headers: ['Sprint', 'Início', 'Fim', 'Status', 'Entregas', 'Concluídas'],
         rows: sprints?.map(s => [
           s.name,
           new Date(s.start_date).toLocaleDateString('pt-BR'),
           new Date(s.end_date).toLocaleDateString('pt-BR'),
           s.status === 'completed' ? 'Concluída' : s.status === 'active' ? 'Ativa' : 'Planejada',
           s.sprint_deliverables?.length || 0,
           s.sprint_deliverables?.filter((d: any) => d.status === 'completed').length || 0
         ]) || []
       }
     ]
   };
   } catch (error) {
     console.error('Error fetching sprint data:', error);
     return {
       title: 'Relatório de Sprints',
       subtitle: 'Erro ao carregar dados',
       period: 'N/A',
       metrics: [],
       tables: []
     };
   }
 }
 
 // Fetch Impact Data
 async function fetchImpactData(config: ReportConfig): Promise<ReportData> {
   try {
   let query = supabase
     .from('process_improvements')
     .select(`
       *,
       processes(name, area)
     `)
     .eq('evaluation_status', 'completed');
 
   if (config.dateRange.start) {
     query = query.gte('created_at', config.dateRange.start);
   }
   if (config.dateRange.end) {
     query = query.lte('created_at', config.dateRange.end);
   }
 
   const { data: improvements } = await query;
 
   const totalSavings = improvements?.reduce((sum, i) => sum + (i.cost_saved_monthly || 0), 0) || 0;
   const totalHours = improvements?.reduce((sum, i) => sum + (i.time_saved_hours || 0), 0) || 0;
   const avgRoi = improvements?.length ? 
     Math.round(improvements.reduce((sum, i) => sum + (i.roi_percentage || 0), 0) / improvements.length) : 0;
   const ftes = (totalHours / 176).toFixed(2);
 
   return {
     title: 'Relatório de Impacto Digital',
     subtitle: 'ROI, economia mensal e horas liberadas',
     period: `${config.dateRange.start ? new Date(config.dateRange.start).toLocaleDateString('pt-BR') : 'Início'} - ${config.dateRange.end ? new Date(config.dateRange.end).toLocaleDateString('pt-BR') : 'Atual'}`,
     metrics: [
       { label: 'Economia Mensal', value: `R$ ${totalSavings.toLocaleString('pt-BR')}` },
       { label: 'Horas Liberadas/mês', value: `${totalHours}h` },
       { label: 'ROI Médio', value: `${avgRoi}%` },
       { label: 'FTEs Liberados', value: ftes },
       { label: 'Melhorias Avaliadas', value: improvements?.length || 0 },
     ],
     tables: [
       {
         title: 'Top Melhorias por Economia',
         headers: ['Processo', 'Área', 'Economia/mês', 'Horas/mês', 'ROI'],
         rows: improvements?.sort((a, b) => (b.cost_saved_monthly || 0) - (a.cost_saved_monthly || 0))
           .slice(0, 10)
           .map(i => [
             i.processes?.name || '-',
             i.processes?.area || '-',
             `R$ ${(i.cost_saved_monthly || 0).toLocaleString('pt-BR')}`,
             `${i.time_saved_hours || 0}h`,
             `${i.roi_percentage || 0}%`
           ]) || []
       }
     ]
   };
   } catch (error) {
     console.error('Error fetching impact data:', error);
     return {
       title: 'Relatório de Impacto Digital',
       subtitle: 'Erro ao carregar dados',
       period: 'N/A',
       metrics: [],
       tables: []
     };
   }
 }
 
 // Fetch Processes Data
 async function fetchProcessesData(config: ReportConfig): Promise<ReportData> {
   try {
   let query = supabase.from('processes').select('*');
   
   if (config.area) {
     query = query.eq('area', config.area);
   }
   if (config.projectId) {
     query = query.eq('project_id', config.projectId);
   }
 
   const { data: processes } = await query;
 
   const byArea = processes?.reduce((acc: Record<string, number>, p) => {
     const area = p.area || 'Sem área';
     acc[area] = (acc[area] || 0) + 1;
     return acc;
   }, {}) || {};
 
   const byStage = processes?.reduce((acc: Record<string, number>, p) => {
     const stage = p.stage || 'Não iniciado';
     acc[stage] = (acc[stage] || 0) + 1;
     return acc;
   }, {}) || {};
 
   return {
     title: 'Relatório de Processos',
     subtitle: 'Mapeamento e status dos processos',
     period: `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
     metrics: [
       { label: 'Total de Processos', value: processes?.length || 0 },
       { label: 'Áreas', value: Object.keys(byArea).length },
       { label: 'Mapeados', value: processes?.filter(p => p.stage === 'mapped').length || 0 },
       { label: 'Com Melhoria', value: processes?.filter(p => p.last_improvement_date).length || 0 },
     ],
     tables: [
       {
         title: 'Processos por Área',
         headers: ['Área', 'Quantidade'],
         rows: Object.entries(byArea).map(([area, count]) => [area, count])
       },
       {
         title: 'Processos por Estágio',
         headers: ['Estágio', 'Quantidade'],
         rows: Object.entries(byStage).map(([stage, count]) => [
           stage === 'mapped' ? 'Mapeado' : stage === 'documented' ? 'Documentado' : stage,
           count
         ])
       }
     ]
   };
   } catch (error) {
     console.error('Error fetching processes data:', error);
     return {
       title: 'Relatório de Processos',
       subtitle: 'Erro ao carregar dados',
       period: 'N/A',
       metrics: [],
       tables: []
     };
   }
 }
 
 // Fetch Routines Data
 async function fetchRoutinesData(config: ReportConfig): Promise<ReportData> {
   try {
   const { data: routines } = await supabase
     .from('routines')
    .select('*')
     .neq('status', 'completed');
 
  // Fetch profiles separately
  const assignedIds = routines?.map(r => r.assigned_to).filter((id): id is string => !!id) || [];
  const { data: profilesData } = assignedIds.length > 0 
    ? await supabase.from('profiles_safe').select('id, first_name, last_name').in('id', assignedIds)
    : { data: [] };

  const profilesMap = new Map(
    (profilesData || []).map(p => [p.id, p] as const)
  );

   const byFrequency = routines?.reduce((acc: Record<string, number>, r) => {
     const freq = r.frequency || 'Não definida';
     acc[freq] = (acc[freq] || 0) + 1;
     return acc;
   }, {}) || {};
 
   const totalHours = routines?.reduce((sum, r) => sum + (r.estimated_hours || 0), 0) || 0;
 
   return {
     title: 'Relatório de Rotinas',
     subtitle: 'Atividades recorrentes da equipe',
     period: `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
     metrics: [
       { label: 'Rotinas Ativas', value: routines?.length || 0 },
       { label: 'Horas Estimadas', value: `${totalHours}h` },
       { label: 'Diárias', value: byFrequency['daily'] || 0 },
       { label: 'Semanais', value: byFrequency['weekly'] || 0 },
       { label: 'Mensais', value: byFrequency['monthly'] || 0 },
     ],
     tables: [
       {
         title: 'Rotinas por Frequência',
         headers: ['Frequência', 'Quantidade'],
         rows: Object.entries(byFrequency).map(([freq, count]) => [
           freq === 'daily' ? 'Diária' : freq === 'weekly' ? 'Semanal' : freq === 'monthly' ? 'Mensal' : freq,
           count
         ])
       },
       {
         title: 'Lista de Rotinas',
         headers: ['Título', 'Frequência', 'Horas', 'Responsável'],
        rows: routines?.map(r => {
          const profile = r.assigned_to ? profilesMap.get(r.assigned_to) : null;
          return [
            r.title,
            r.frequency === 'daily' ? 'Diária' : r.frequency === 'weekly' ? 'Semanal' : r.frequency === 'monthly' ? 'Mensal' : r.frequency,
            `${r.estimated_hours || 0}h`,
            profile ? `${(profile as any).first_name} ${(profile as any).last_name}` : '-'
          ];
        }) || []
       }
     ]
   };
   } catch (error) {
     console.error('Error fetching routines data:', error);
     return {
       title: 'Relatório de Rotinas',
       subtitle: 'Erro ao carregar dados',
       period: 'N/A',
       metrics: [],
       tables: []
     };
   }
 }
 
 // Fetch Consolidated Data
 async function fetchConsolidatedData(config: ReportConfig): Promise<ReportData> {
   try {
   const [sprintData, impactData, processData, routineData] = await Promise.all([
     fetchSprintData(config),
     fetchImpactData(config),
     fetchProcessesData(config),
     fetchRoutinesData(config)
   ]);
 
   return {
     title: 'Relatório Consolidado',
     subtitle: 'Visão geral do Digital Rotina',
     period: `${config.dateRange.start ? new Date(config.dateRange.start).toLocaleDateString('pt-BR') : 'Início'} - ${config.dateRange.end ? new Date(config.dateRange.end).toLocaleDateString('pt-BR') : 'Atual'}`,
     metrics: [
       ...impactData.metrics.slice(0, 2),
       { label: 'Processos', value: processData.metrics[0].value },
       { label: 'Sprints', value: sprintData.metrics[0].value },
       { label: 'Rotinas', value: routineData.metrics[0].value },
     ],
     tables: [
       impactData.tables[0],
       sprintData.tables[0],
       processData.tables[0]
     ]
   };
   } catch (error) {
     console.error('Error fetching consolidated data:', error);
     return {
       title: 'Relatório Consolidado',
       subtitle: 'Erro ao carregar dados',
       period: 'N/A',
       metrics: [],
       tables: []
     };
   }
 }
 
 // Main fetch function
 export async function fetchReportData(config: ReportConfig): Promise<ReportData> {
   switch (config.type) {
     case 'sprint':
       return fetchSprintData(config);
     case 'impact':
       return fetchImpactData(config);
     case 'processes':
       return fetchProcessesData(config);
     case 'routines':
       return fetchRoutinesData(config);
     case 'consolidated':
       return fetchConsolidatedData(config);
     default:
       return fetchConsolidatedData(config);
   }
 }
 
 // Generate HTML Report
 export function generateReportHTML(data: ReportData, logoBase64: string): string {
   return `
     <!DOCTYPE html>
     <html lang="pt-BR">
     <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>${data.title}</title>
       <style>
         * { box-sizing: border-box; margin: 0; padding: 0; }
         body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: white; color: #1e293b; }
         .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #0d9488; }
         .header-text .title { font-size: 28px; font-weight: bold; color: #0d9488; }
         .header-text .subtitle { color: #64748b; margin-top: 4px; font-size: 16px; }
         .header-text .period { color: #94a3b8; font-size: 13px; margin-top: 8px; }
         .logo { height: 60px; }
         .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 40px; }
         .metric-card { background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
         .metric-value { font-size: 32px; font-weight: bold; color: #0d9488; }
         .metric-label { color: #64748b; font-size: 14px; margin-top: 4px; }
         .section-title { font-size: 18px; font-weight: 600; color: #334155; margin: 32px 0 16px 0; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
         table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
         th { background: #0d9488; color: white; padding: 12px 16px; text-align: left; font-weight: 600; font-size: 14px; }
         th:first-child { border-radius: 8px 0 0 0; }
         th:last-child { border-radius: 0 8px 0 0; }
         td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
         tr:nth-child(even) { background: #f8fafc; }
         tr:hover { background: #f1f5f9; }
         .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; text-align: center; }
         @media print {
           body { padding: 20px; }
           .metrics-grid { grid-template-columns: repeat(5, 1fr); }
         }
       </style>
     </head>
     <body>
       <div class="header">
         <div class="header-text">
           <div class="title">${data.title}</div>
           <div class="subtitle">${data.subtitle}</div>
           <div class="period">${data.period}</div>
         </div>
         <img src="${logoBase64}" class="logo" alt="PSA Consultores" />
       </div>
       
       <div class="metrics-grid">
         ${data.metrics.map(m => `
           <div class="metric-card">
             <div class="metric-value">${m.value}</div>
             <div class="metric-label">${m.label}</div>
           </div>
         `).join('')}
       </div>
       
       ${data.tables.map(t => `
         <h3 class="section-title">${t.title}</h3>
         <table>
           <thead>
             <tr>${t.headers.map(h => `<th>${h}</th>`).join('')}</tr>
           </thead>
           <tbody>
             ${t.rows.length > 0 ? t.rows.map(row => `
               <tr>${row.map(cell => `<td>${cell ?? '-'}</td>`).join('')}</tr>
             `).join('') : '<tr><td colspan="' + t.headers.length + '" style="text-align: center; color: #94a3b8;">Nenhum dado encontrado</td></tr>'}
           </tbody>
         </table>
       `).join('')}
       
       <div class="footer">
         Gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} | PSA Consultores
       </div>
     </body>
     </html>
   `;
 }
 
 // Generate XLSX Report
 export function generateReportXLSX(data: ReportData): Blob {
   const wb = XLSX.utils.book_new();
   
   // Metrics sheet
   const metricsData = data.metrics.map(m => ({
     Indicador: m.label,
     Valor: m.value
   }));
   const metricsSheet = XLSX.utils.json_to_sheet(metricsData);
   XLSX.utils.book_append_sheet(wb, metricsSheet, 'Resumo');
   
   // Table sheets
   data.tables.forEach(table => {
     if (table.rows.length === 0) return;
     const tableData = table.rows.map(row => {
       const obj: Record<string, any> = {};
       table.headers.forEach((h, i) => { obj[h] = row[i]; });
       return obj;
     });
     const sheet = XLSX.utils.json_to_sheet(tableData);
     const sheetName = table.title.substring(0, 31).replace(/[\\/*?[\]]/g, '');
     XLSX.utils.book_append_sheet(wb, sheet, sheetName);
   });
   
   const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
   return new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
 }
 
 // Print to PDF
 export function printReportPDF(htmlContent: string) {
   const printWindow = window.open('', '_blank');
   if (printWindow) {
     printWindow.document.write(htmlContent);
     printWindow.document.close();
     setTimeout(() => printWindow.print(), 500);
   }
 }
 
 // Download HTML
 export function downloadReportHTML(htmlContent: string, filename: string) {
   const blob = new Blob([htmlContent], { type: 'text/html' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = `${filename}.html`;
   a.click();
   URL.revokeObjectURL(url);
 }
 
 // Download XLSX
 export function downloadReportXLSX(blob: Blob, filename: string) {
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = `${filename}.xlsx`;
   a.click();
   URL.revokeObjectURL(url);
 }