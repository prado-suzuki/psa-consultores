import * as XLSX from 'xlsx';

export interface Project {
  id: string;
  name: string;
  code?: string;
}

export interface Process {
  id: string;
  name: string;
  code?: string;
}

export interface ExcelRow {
  Sprint: string;
  ID: string;
  Título: string;
  Subtarefa: string;
  Responsável: string;
  Descrição: string;
  'Estimativa (h)': number;
  'Data de Entrega': string;
  Projeto?: string;
  Processo?: string;
}

export interface ParsedTask {
  taskCode: string;
  title: string;
  subtaskTitle: string;
  responsible: string;
  description: string;
  estimatedHours: number;
  dueDate: string;
  projectName: string;
  processName: string;
}

export interface TaskGroup {
  title: string;
  responsible: string;
  subtasks: ParsedTask[];
  totalHours: number;
  minDate: string;
  maxDate: string;
}

export interface ImportPreview {
  sprintName: string;
  taskGroups: TaskGroup[];
  totalTasks: number;
  totalSubtasks: number;
  totalHours: number;
  responsibles: string[];
  unmappedResponsibles: string[];
}

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}

export function findProjectByName(name: string, projects: Project[]): Project | null {
  if (!name?.trim()) return null;
  const normalized = name.trim().toLowerCase();
  return projects.find(p =>
    p.name.toLowerCase().includes(normalized) ||
    p.code?.toLowerCase().includes(normalized)
  ) || null;
}

export function findProcessByName(name: string, processes: Process[]): Process | null {
  if (!name?.trim()) return null;
  const normalized = name.trim().toLowerCase();
  return processes.find(p =>
    p.name.toLowerCase().includes(normalized) ||
    p.code?.toLowerCase().includes(normalized)
  ) || null;
}

// Parse Excel date (can be number or string)
function parseExcelDate(value: any): string {
  if (!value) return '';
  
  const currentYear = new Date().getFullYear(); // 2025
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let dateStr = '';
  
  // If it's a number (Excel serial date)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const year = date.y;
      const month = String(date.m).padStart(2, '0');
      const day = String(date.d).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
    }
  }
  
  // If it's a string
  if (typeof value === 'string') {
    const parts = value.split('/');
    
    // Format "17/12" (without year) - assume current year
    if (parts.length === 2) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      dateStr = `${currentYear}-${month}-${day}`;
    }
    
    // Format "17/12/2024" or "17/12/24"
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2];
      // Handle 2-digit year (24 -> 2024)
      if (year.length === 2) {
        year = `20${year}`;
      }
      dateStr = `${year}-${month}-${day}`;
    }
    
    // Already in ISO format
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      dateStr = value;
    }
  }
  
  // If date is more than 30 days in the past, correct to current year
  if (dateStr) {
    const parsedDate = new Date(dateStr + 'T00:00:00');
    const daysDiff = (today.getTime() - parsedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 30) {
      // Extract month and day, apply current year
      const [, month, day] = dateStr.split('-');
      const correctedDate = new Date(currentYear, parseInt(month) - 1, parseInt(day));
      
      // If corrected date is still in the past, it's okay for sprint planning
      return `${currentYear}-${month}-${day}`;
    }
  }
  
  return dateStr;
}

// Find profile by first name (fuzzy match)
export function findProfileByName(name: string, profiles: Profile[]): Profile | null {
  if (!name) return null;
  
  const normalizedName = name.toLowerCase().trim();
  
  // Try exact first name match
  let profile = profiles.find(p => 
    p.first_name.toLowerCase() === normalizedName
  );
  if (profile) return profile;
  
  // Try partial match
  profile = profiles.find(p => 
    p.first_name.toLowerCase().includes(normalizedName) ||
    normalizedName.includes(p.first_name.toLowerCase())
  );
  if (profile) return profile;
  
  // Try full name match
  profile = profiles.find(p => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    return fullName.includes(normalizedName) || normalizedName.includes(fullName);
  });
  
  return profile || null;
}

export function parseExcelFile(file: File): Promise<ExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);
        
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function processExcelData(rows: ExcelRow[], profiles: Profile[], projects: Project[], processes: Process[]): ImportPreview {
  const taskGroups: Map<string, TaskGroup> = new Map();
  const allResponsibles: Set<string> = new Set();
  let sprintName = '';
  
  rows.forEach(row => {
    if (!sprintName && row.Sprint) {
      sprintName = row.Sprint;
    }
    
    const responsible = row.Responsável || '';
    if (responsible) {
      allResponsibles.add(responsible);
    }
    
    const parsedTask: ParsedTask = {
      taskCode: row.ID || '',
      title: row.Título || '',
      subtaskTitle: row.Subtarefa || '',
      responsible,
      description: row.Descrição || '',
      estimatedHours: parseFloat(String(row['Estimativa (h)'] || 0)) || 0,
      dueDate: parseExcelDate(row['Data de Entrega']),
      projectName: row.Projeto || '',
      processName: row.Processo || ''
    };
    
    const groupKey = row.Título || 'Sem título';
    
    if (!taskGroups.has(groupKey)) {
      taskGroups.set(groupKey, {
        title: groupKey,
        responsible: responsible,
        subtasks: [],
        totalHours: 0,
        minDate: parsedTask.dueDate,
        maxDate: parsedTask.dueDate
      });
    }
    
    const group = taskGroups.get(groupKey)!;
    group.subtasks.push(parsedTask);
    group.totalHours += parsedTask.estimatedHours;
    
    if (parsedTask.dueDate) {
      if (!group.minDate || parsedTask.dueDate < group.minDate) {
        group.minDate = parsedTask.dueDate;
      }
      if (!group.maxDate || parsedTask.dueDate > group.maxDate) {
        group.maxDate = parsedTask.dueDate;
      }
    }
  });
  
  // Check which responsibles can be mapped
  const responsibles = Array.from(allResponsibles);
  const unmappedResponsibles = responsibles.filter(name => !findProfileByName(name, profiles));
  
  const taskGroupsArray = Array.from(taskGroups.values());
  const totalSubtasks = taskGroupsArray.reduce((sum, g) => sum + g.subtasks.length, 0);
  const totalHours = taskGroupsArray.reduce((sum, g) => sum + g.totalHours, 0);
  
  return {
    sprintName,
    taskGroups: taskGroupsArray,
    totalTasks: taskGroupsArray.length,
    totalSubtasks,
    totalHours,
    responsibles,
    unmappedResponsibles
  };
}

export interface CreateDeliverableData {
  sprint_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  start_date: string | null;
  due_date: string;
  estimated_hours: number | null;
  status: string;
  parent_id: string | null;
  task_code: string | null;
  project_id: string | null;
  process_id: string | null;
}

export function convertToDeliverables(
  preview: ImportPreview,
  sprintId: string,
  sprintStartDate: string,
  responsibleMapping: Record<string, string>,
  profiles: Profile[]
): CreateDeliverableData[] {
  const deliverables: CreateDeliverableData[] = [];
  
  preview.taskGroups.forEach((group, groupIndex) => {
    // Create parent task
    const parentTaskCode = `${groupIndex + 1}`;
    const parentResponsible = group.responsible 
      ? (responsibleMapping[group.responsible] || findProfileByName(group.responsible, profiles)?.id || null)
      : null;
    
    const parentDeliverable: CreateDeliverableData = {
      sprint_id: sprintId,
      title: group.title,
      description: `${group.subtasks.length} subtarefas • ${group.totalHours}h total`,
      assigned_to: parentResponsible,
      start_date: group.minDate || sprintStartDate,
      due_date: group.maxDate || sprintStartDate,
      estimated_hours: group.totalHours,
      status: 'pending',
      parent_id: null,
      task_code: parentTaskCode,
      project_id: null,
      process_id: null
    };
    
    deliverables.push(parentDeliverable);
    
    // Create subtasks - they'll get parent_id after insert
    group.subtasks.forEach((subtask) => {
      const subtaskResponsible = subtask.responsible 
        ? (responsibleMapping[subtask.responsible] || findProfileByName(subtask.responsible, profiles)?.id || null)
        : null;
      
      const subtaskDeliverable: CreateDeliverableData = {
        sprint_id: sprintId,
        title: subtask.subtaskTitle || subtask.title,
        description: subtask.description || null,
        assigned_to: subtaskResponsible,
        start_date: subtask.dueDate || sprintStartDate,
        due_date: subtask.dueDate || sprintStartDate,
        estimated_hours: subtask.estimatedHours || null,
        status: 'pending',
        parent_id: null, // Will be set after parent insert
        task_code: subtask.taskCode || null,
        project_id: null,
        process_id: null
      };
      
      deliverables.push(subtaskDeliverable);
    });
  });
  
  return deliverables;
}
