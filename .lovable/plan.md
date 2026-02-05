
# Plano: Criar Pagina de Relatorios em Digital Rotina

## Visao Geral

Criar uma nova pagina "Relatorios" no modulo Digital Rotina, posicionada no menu lateral entre "Dashboard" e "Projetos". A pagina permitira gerar relatorios automaticos formatados com a logo da PSA, incluindo indicadores relevantes de sprints, processos, melhorias e rotinas.

---

## Estrutura de Navegacao

O menu lateral do Digital Rotina (EquipeLayout.tsx) sera atualizado:

```text
+------------------------------------------+
|  Dashboard         <-- Posicao atual     |
|  Relatorios        <-- NOVA PAGINA       |
|  v Projetos                              |
|    - Processos                           |
|    - Kanban                              |
|    - Sprints                             |
|    - Backlog                             |
|    - Daily                               |
+------------------------------------------+
```

---

## Tipos de Relatorios Disponiveis

Baseado nos dados existentes no Digital Rotina:

### 1. Relatorio de Sprint
- **Dados**: Entregas por status, horas alocadas, taxa de conclusao
- **Fonte**: `sprints`, `sprint_deliverables`
- **Filtros**: Sprint especifica ou periodo

### 2. Relatorio de Impacto Digital
- **Dados**: ROI, economia mensal/anual, FTEs liberados, top melhorias
- **Fonte**: `process_improvements`, `processes`
- **Filtros**: Periodo, projeto, area, responsavel

### 3. Relatorio de Processos
- **Dados**: Processos por area, status de mapeamento, melhorias aplicadas
- **Fonte**: `processes`, `process_improvements`
- **Filtros**: Area, projeto, periodo

### 4. Relatorio de Rotinas
- **Dados**: Rotinas ativas, frequencia, responsaveis, horas estimadas
- **Fonte**: `routines`
- **Filtros**: Responsavel, frequencia

### 5. Relatorio Consolidado Mensal
- **Dados**: Resumo de todos os indicadores do periodo
- **Fonte**: Todas as tabelas combinadas
- **Filtros**: Mes/Ano

---

## Interface da Pagina

```text
+-------------------------------------------------------------------------+
|  Relatorios                                                             |
|  Gere relatorios automaticos com indicadores do Digital Rotina          |
+-------------------------------------------------------------------------+
|                                                                         |
|  [Tipo de Relatorio v]  [Periodo: Inicio - Fim]  [Projeto v]  [Area v]  |
|                                                                         |
+-------------------------------------------------------------------------+
|                                                                         |
|  +----------------------------------+  +--------------------------------+|
|  | Sprint                           |  | Impacto Digital                ||
|  | Entregas, horas, conclusao       |  | ROI, economia, FTEs            ||
|  | [Gerar PDF] [XLSX] [HTML]        |  | [Gerar PDF] [XLSX] [HTML]      ||
|  +----------------------------------+  +--------------------------------+|
|                                                                         |
|  +----------------------------------+  +--------------------------------+|
|  | Processos                        |  | Rotinas                        ||
|  | Mapeamento, melhorias, areas     |  | Atividades recorrentes         ||
|  | [Gerar PDF] [XLSX] [HTML]        |  | [Gerar PDF] [XLSX] [HTML]      ||
|  +----------------------------------+  +--------------------------------+|
|                                                                         |
|  +---------------------------------------------------------------------+|
|  | Relatorio Consolidado Mensal                                        ||
|  | Todos os indicadores do periodo selecionado                          ||
|  | [Gerar PDF] [XLSX] [HTML]                                            ||
|  +---------------------------------------------------------------------+|
|                                                                         |
+-------------------------------------------------------------------------+
|                                                                         |
|  PREVIEW DO RELATORIO (quando gerado em HTML)                           |
|  +---------------------------------------------------------------------+|
|  |  [Logo PSA]                                                         ||
|  |  Relatorio de Impacto Digital                                        ||
|  |  Periodo: 01/01/2026 - 31/01/2026                                   ||
|  |                                                                     ||
|  |  +----------+  +----------+  +----------+  +----------+             ||
|  |  | Economia |  | Horas    |  | ROI      |  | FTEs     |             ||
|  |  | R$ 5.200 |  | 45h/mes  |  | 156%     |  | 0.3      |             ||
|  |  +----------+  +----------+  +----------+  +----------+             ||
|  |                                                                     ||
|  |  Top Melhorias:                                                     ||
|  |  1. Processo X - R$ 2.000/mes                                       ||
|  |  2. Processo Y - R$ 1.500/mes                                       ||
|  |                                                                     ||
|  +---------------------------------------------------------------------+|
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## Secao Tecnica

### Arquivos a Criar

#### 1. `src/pages/equipe/EquipeRelatorios.tsx`

Nova pagina principal com:

```typescript
import { useState } from 'react';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { FileText, FileSpreadsheet, Code, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import logoPsa from '@/assets/logo-psa.png';

// Tipos de relatorio
type ReportType = 'sprint' | 'impact' | 'processes' | 'routines' | 'consolidated';

const EquipeRelatorios = () => {
  const [reportType, setReportType] = useState<ReportType>('impact');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [projectFilter, setProjectFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [generating, setGenerating] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);
  
  // Funcoes de geracao
  // ...
};
```

#### 2. `src/lib/reportGenerator.ts`

Logica de geracao de relatorios:

```typescript
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface ReportConfig {
  type: 'sprint' | 'impact' | 'processes' | 'routines' | 'consolidated';
  dateRange: { start: string; end: string };
  projectId?: string;
  area?: string;
}

interface ReportData {
  title: string;
  subtitle: string;
  period: string;
  metrics: { label: string; value: string | number; icon?: string }[];
  tables: { title: string; headers: string[]; rows: any[][] }[];
  charts?: any[];
}

// Buscar dados para cada tipo de relatorio
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
  }
}

// Gerar HTML formatado com logo PSA
export function generateReportHTML(data: ReportData, logoBase64: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', sans-serif; padding: 40px; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
        .logo { height: 60px; }
        .title { font-size: 24px; font-weight: bold; color: #0d9488; }
        .subtitle { color: #6b7280; margin-top: 4px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
        .metric-card { background: #f8fafc; border-radius: 8px; padding: 16px; }
        .metric-value { font-size: 28px; font-weight: bold; color: #0d9488; }
        .metric-label { color: #6b7280; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #0d9488; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">${data.title}</div>
          <div class="subtitle">${data.subtitle}</div>
          <div style="color: #9ca3af; font-size: 12px; margin-top: 8px;">${data.period}</div>
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
        <h3 style="color: #374151; margin-top: 32px;">${t.title}</h3>
        <table>
          <thead>
            <tr>${t.headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${t.rows.map(row => `
              <tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
      `).join('')}
      
      <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
        Gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} | PSA Consultores
      </div>
    </body>
    </html>
  `;
}

// Gerar Excel
export function generateReportXLSX(data: ReportData): Blob {
  const wb = XLSX.utils.book_new();
  
  // Aba de metricas
  const metricsData = data.metrics.map(m => ({
    Indicador: m.label,
    Valor: m.value
  }));
  const metricsSheet = XLSX.utils.json_to_sheet(metricsData);
  XLSX.utils.book_append_sheet(wb, metricsSheet, 'Resumo');
  
  // Abas de tabelas
  data.tables.forEach(table => {
    const tableData = table.rows.map(row => {
      const obj: Record<string, any> = {};
      table.headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
    const sheet = XLSX.utils.json_to_sheet(tableData);
    XLSX.utils.book_append_sheet(wb, sheet, table.title.substring(0, 31));
  });
  
  return new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })]);
}

// Gerar PDF (usando print do HTML)
export function printReportPDF(htmlContent: string) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  }
}
```

### Arquivos a Modificar

#### 1. `src/components/equipe/EquipeLayout.tsx`

Adicionar item "Relatorios" no menu:

```typescript
const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/equipe/dashboard' },
  { icon: FileBarChart, label: 'Relatorios', path: '/equipe/relatorios' }, // NOVO
  { 
    icon: FolderKanban, 
    label: 'Projetos', 
    path: '/equipe/projetos',
    children: [
      // ...
    ]
  },
];
```

#### 2. `src/App.tsx`

Adicionar rota:

```typescript
import EquipeRelatorios from "./pages/equipe/EquipeRelatorios";

// Na secao de rotas:
<Route path="/equipe/relatorios" element={<TeamRoute><EquipeRelatorios /></TeamRoute>} />
```

---

## Dados Disponiveis para Cada Relatorio

### Relatorio de Sprint
```sql
-- Fonte: sprints + sprint_deliverables
SELECT 
  s.name, s.start_date, s.end_date, s.status,
  COUNT(sd.id) as total_entregas,
  SUM(CASE WHEN sd.status = 'completed' THEN 1 ELSE 0 END) as concluidas,
  SUM(sd.estimated_hours) as horas_totais
FROM sprints s
LEFT JOIN sprint_deliverables sd ON sd.sprint_id = s.id
WHERE s.start_date >= :inicio AND s.end_date <= :fim
GROUP BY s.id
```

### Relatorio de Impacto Digital
```sql
-- Fonte: process_improvements
SELECT 
  p.name as processo,
  pi.cost_saved_monthly,
  pi.time_saved_hours,
  pi.roi_percentage,
  pi.created_at
FROM process_improvements pi
JOIN processes p ON p.id = pi.process_id
WHERE pi.evaluation_status = 'completed'
  AND pi.created_at BETWEEN :inicio AND :fim
ORDER BY pi.cost_saved_monthly DESC
```

### Relatorio de Processos
```sql
-- Fonte: processes
SELECT 
  area,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as ativos
FROM processes
GROUP BY area
```

### Relatorio de Rotinas
```sql
-- Fonte: routines
SELECT 
  r.title,
  r.frequency,
  r.estimated_hours,
  r.status,
  p.first_name || ' ' || p.last_name as responsavel
FROM routines r
LEFT JOIN profiles p ON p.id = r.assigned_to
WHERE r.status != 'completed'
```

---

## Formatos de Exportacao

| Formato | Implementacao |
|---------|---------------|
| **PDF** | Gerar HTML e usar `window.print()` para salvar como PDF |
| **XLSX** | Biblioteca `xlsx` ja instalada no projeto |
| **HTML** | Gerar HTML completo com CSS inline para download |

---

## Fluxo de Uso

```text
1. Usuario acessa Digital Rotina > Relatorios
   |
2. Seleciona tipo de relatorio (Sprint, Impacto, etc.)
   |
3. Define filtros (periodo, projeto, area)
   |
4. Clica em "Gerar Relatorio"
   |
5. Sistema busca dados do banco
   |
6. Exibe preview HTML na tela
   |
7. Usuario escolhe formato de download:
   - [PDF] -> Abre janela de impressao
   - [XLSX] -> Download direto do arquivo
   - [HTML] -> Download do arquivo HTML
```

---

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/equipe/EquipeRelatorios.tsx` | Criar nova pagina de relatorios |
| `src/lib/reportGenerator.ts` | Criar utilitario de geracao de relatorios |
| `src/components/equipe/EquipeLayout.tsx` | Adicionar "Relatorios" no menu lateral |
| `src/App.tsx` | Adicionar rota `/equipe/relatorios` |

---

## Exemplo de Relatorio Gerado (HTML)

```text
+---------------------------------------------------------------------+
|  [Logo PSA]                         Relatorio de Impacto Digital    |
|                                     Janeiro 2026                    |
+---------------------------------------------------------------------+
|                                                                     |
|  +------------+  +------------+  +------------+  +------------+     |
|  | Economia   |  | Horas      |  | ROI Medio  |  | FTEs       |     |
|  | R$ 5.200   |  | 45h/mes    |  | 156%       |  | 0.3        |     |
|  | /mes       |  | liberadas  |  | anual      |  | liberados  |     |
|  +------------+  +------------+  +------------+  +------------+     |
|                                                                     |
|  Top 5 Melhorias por Economia                                       |
|  +-----+---------------------+----------+-----------+               |
|  | #   | Processo            | Economia | ROI       |               |
|  +-----+---------------------+----------+-----------+               |
|  | 1   | Conciliacao Fiscal  | R$ 2.000 | 200%      |               |
|  | 2   | Importacao NFe      | R$ 1.500 | 180%      |               |
|  | 3   | Apuracao ICMS       | R$ 1.000 | 120%      |               |
|  +-----+---------------------+----------+-----------+               |
|                                                                     |
|  Economia por Area                                                  |
|  +----------------+----------+--------+                             |
|  | Area           | Economia | Horas  |                             |
|  +----------------+----------+--------+                             |
|  | Fiscal         | R$ 3.500 | 30h    |                             |
|  | Transversal    | R$ 1.700 | 15h    |                             |
|  +----------------+----------+--------+                             |
|                                                                     |
+---------------------------------------------------------------------+
|  Gerado em 05/02/2026 | PSA Consultores                             |
+---------------------------------------------------------------------+
```
