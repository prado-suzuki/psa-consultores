 import { useState, useEffect } from 'react';
 import { EquipeLayout } from '@/components/equipe/EquipeLayout';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Badge } from '@/components/ui/badge';
 import { Separator } from '@/components/ui/separator';
 import { supabase } from '@/integrations/supabase/client';
 import { 
   FileText, 
   FileSpreadsheet, 
   Code, 
   Download,
   Calendar,
   TrendingUp,
   Workflow,
   Clock,
   BarChart3,
   Loader2,
   Eye
 } from 'lucide-react';
 import logoPsa from '@/assets/logo-psa.png';
 import { 
   fetchReportData, 
   generateReportHTML, 
   generateReportXLSX, 
   printReportPDF,
   downloadReportHTML,
   downloadReportXLSX,
   ReportConfig,
   ReportData
 } from '@/lib/reportGenerator';
 import { toast } from 'sonner';
 
 type ReportType = 'sprint' | 'impact' | 'processes' | 'routines' | 'consolidated';
 
 interface ReportOption {
   type: ReportType;
   title: string;
   description: string;
   icon: React.ElementType;
   color: string;
 }
 
 const reportOptions: ReportOption[] = [
   {
     type: 'sprint',
     title: 'Sprints',
     description: 'Entregas, horas alocadas e taxa de conclusão',
     icon: Calendar,
     color: 'bg-blue-100 text-blue-600'
   },
   {
     type: 'impact',
     title: 'Impacto Digital',
     description: 'ROI, economia mensal e FTEs liberados',
     icon: TrendingUp,
     color: 'bg-green-100 text-green-600'
   },
   {
     type: 'processes',
     title: 'Processos',
     description: 'Mapeamento, áreas e melhorias aplicadas',
     icon: Workflow,
     color: 'bg-purple-100 text-purple-600'
   },
   {
     type: 'routines',
     title: 'Rotinas',
     description: 'Atividades recorrentes e responsáveis',
     icon: Clock,
     color: 'bg-orange-100 text-orange-600'
   }
 ];
 
 const EquipeRelatorios = () => {
   const [dateRange, setDateRange] = useState({ start: '', end: '' });
   const [generating, setGenerating] = useState<ReportType | null>(null);
   const [previewData, setPreviewData] = useState<ReportData | null>(null);
   const [previewHtml, setPreviewHtml] = useState<string | null>(null);
   const [logoBase64, setLogoBase64] = useState<string>('');
   const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
   const [projectFilter, setProjectFilter] = useState<string>('');
 
   // Convert logo to base64 on mount
   useEffect(() => {
     const convertLogo = async () => {
       try {
         const response = await fetch(logoPsa);
         const blob = await response.blob();
         const reader = new FileReader();
         reader.onloadend = () => {
           setLogoBase64(reader.result as string);
         };
         reader.readAsDataURL(blob);
       } catch (error) {
         console.error('Error converting logo:', error);
       }
     };
     convertLogo();
   }, []);
 
   // Fetch projects for filter
   useEffect(() => {
     const fetchProjects = async () => {
       const { data } = await supabase
         .from('projects')
         .select('id, name')
         .order('name');
       if (data) setProjects(data);
     };
     fetchProjects();
   }, []);
 
   const handleGenerateReport = async (type: ReportType, format: 'pdf' | 'xlsx' | 'html' | 'preview') => {
     setGenerating(type);
     
     try {
       const config: ReportConfig = {
         type,
         dateRange,
         projectId: projectFilter || undefined
       };
 
       const data = await fetchReportData(config);
       
       if (format === 'preview') {
         setPreviewData(data);
         const html = generateReportHTML(data, logoBase64);
         setPreviewHtml(html);
         toast.success('Preview gerado!');
       } else if (format === 'pdf') {
         const html = generateReportHTML(data, logoBase64);
         printReportPDF(html);
         toast.success('Abrindo janela de impressão...');
       } else if (format === 'xlsx') {
         const blob = generateReportXLSX(data);
         const filename = `relatorio-${type}-${new Date().toISOString().split('T')[0]}`;
         downloadReportXLSX(blob, filename);
         toast.success('Download iniciado!');
       } else if (format === 'html') {
         const html = generateReportHTML(data, logoBase64);
         const filename = `relatorio-${type}-${new Date().toISOString().split('T')[0]}`;
         downloadReportHTML(html, filename);
         toast.success('Download iniciado!');
       }
     } catch (error) {
       console.error('Error generating report:', error);
       toast.error('Erro ao gerar relatório');
     } finally {
       setGenerating(null);
     }
   };
 
   const handleGenerateConsolidated = async (format: 'pdf' | 'xlsx' | 'html') => {
     setGenerating('consolidated');
     
     try {
       const config: ReportConfig = {
         type: 'consolidated',
         dateRange,
         projectId: projectFilter || undefined
       };
 
       const data = await fetchReportData(config);
       
       if (format === 'pdf') {
         const html = generateReportHTML(data, logoBase64);
         printReportPDF(html);
         toast.success('Abrindo janela de impressão...');
       } else if (format === 'xlsx') {
         const blob = generateReportXLSX(data);
         const filename = `relatorio-consolidado-${new Date().toISOString().split('T')[0]}`;
         downloadReportXLSX(blob, filename);
         toast.success('Download iniciado!');
       } else if (format === 'html') {
         const html = generateReportHTML(data, logoBase64);
         const filename = `relatorio-consolidado-${new Date().toISOString().split('T')[0]}`;
         downloadReportHTML(html, filename);
         toast.success('Download iniciado!');
       }
     } catch (error) {
       console.error('Error generating report:', error);
       toast.error('Erro ao gerar relatório');
     } finally {
       setGenerating(null);
     }
   };
 
   return (
     <EquipeLayout 
       title="Relatórios" 
       subtitle="Gere relatórios automáticos com indicadores do Digital Rotina"
     >
       <div className="space-y-6">
         {/* Filters */}
         <Card>
           <CardHeader className="pb-4">
             <CardTitle className="text-lg flex items-center gap-2">
               <BarChart3 className="h-5 w-5 text-primary" />
               Filtros do Relatório
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="space-y-2">
                 <Label>Data Início</Label>
                 <Input
                   type="date"
                   value={dateRange.start}
                   onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                 />
               </div>
               <div className="space-y-2">
                 <Label>Data Fim</Label>
                 <Input
                   type="date"
                   value={dateRange.end}
                   onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                 />
               </div>
               <div className="space-y-2">
                 <Label>Projeto</Label>
                 <Select value={projectFilter} onValueChange={setProjectFilter}>
                   <SelectTrigger>
                     <SelectValue placeholder="Todos os projetos" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="">Todos os projetos</SelectItem>
                     {projects.map(p => (
                       <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="flex items-end">
                 <Button 
                   variant="outline" 
                   className="w-full"
                   onClick={() => {
                     setDateRange({ start: '', end: '' });
                     setProjectFilter('');
                   }}
                 >
                   Limpar Filtros
                 </Button>
               </div>
             </div>
           </CardContent>
         </Card>
 
         {/* Report Types Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {reportOptions.map((option) => (
             <Card key={option.type} className="hover:shadow-md transition-shadow">
               <CardHeader className="pb-3">
                 <div className="flex items-start justify-between">
                   <div className="flex items-center gap-3">
                     <div className={`p-2.5 rounded-lg ${option.color}`}>
                       <option.icon className="h-5 w-5" />
                     </div>
                     <div>
                       <CardTitle className="text-base">{option.title}</CardTitle>
                       <CardDescription className="text-sm mt-0.5">
                         {option.description}
                       </CardDescription>
                     </div>
                   </div>
                 </div>
               </CardHeader>
               <CardContent className="pt-0">
                 <div className="flex flex-wrap gap-2">
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => handleGenerateReport(option.type, 'preview')}
                     disabled={generating === option.type}
                   >
                     {generating === option.type ? (
                       <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                     ) : (
                       <Eye className="h-4 w-4 mr-1.5" />
                     )}
                     Preview
                   </Button>
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => handleGenerateReport(option.type, 'pdf')}
                     disabled={generating === option.type}
                   >
                     <FileText className="h-4 w-4 mr-1.5" />
                     PDF
                   </Button>
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => handleGenerateReport(option.type, 'xlsx')}
                     disabled={generating === option.type}
                   >
                     <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                     Excel
                   </Button>
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => handleGenerateReport(option.type, 'html')}
                     disabled={generating === option.type}
                   >
                     <Code className="h-4 w-4 mr-1.5" />
                     HTML
                   </Button>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>
 
         {/* Consolidated Report */}
         <Card className="border-primary/20 bg-primary/5">
           <CardHeader className="pb-3">
             <div className="flex items-start justify-between">
               <div className="flex items-center gap-3">
                 <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                   <BarChart3 className="h-5 w-5" />
                 </div>
                 <div>
                   <CardTitle className="text-base flex items-center gap-2">
                     Relatório Consolidado
                     <Badge variant="secondary" className="text-xs">Completo</Badge>
                   </CardTitle>
                   <CardDescription className="text-sm mt-0.5">
                     Todos os indicadores do período em um único relatório
                   </CardDescription>
                 </div>
               </div>
             </div>
           </CardHeader>
           <CardContent className="pt-0">
             <div className="flex flex-wrap gap-2">
               <Button
                 onClick={() => handleGenerateConsolidated('pdf')}
                 disabled={generating === 'consolidated'}
               >
                 {generating === 'consolidated' ? (
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                 ) : (
                   <FileText className="h-4 w-4 mr-2" />
                 )}
                 Gerar PDF
               </Button>
               <Button
                 variant="outline"
                 onClick={() => handleGenerateConsolidated('xlsx')}
                 disabled={generating === 'consolidated'}
               >
                 <FileSpreadsheet className="h-4 w-4 mr-2" />
                 Excel
               </Button>
               <Button
                 variant="outline"
                 onClick={() => handleGenerateConsolidated('html')}
                 disabled={generating === 'consolidated'}
               >
                 <Code className="h-4 w-4 mr-2" />
                 HTML
               </Button>
             </div>
           </CardContent>
         </Card>
 
         {/* Preview Section */}
         {previewHtml && (
           <Card>
             <CardHeader className="pb-3">
               <div className="flex items-center justify-between">
                 <CardTitle className="text-lg">Preview do Relatório</CardTitle>
                 <Button 
                   variant="ghost" 
                   size="sm"
                   onClick={() => {
                     setPreviewHtml(null);
                     setPreviewData(null);
                   }}
                 >
                   Fechar Preview
                 </Button>
               </div>
             </CardHeader>
             <CardContent className="p-0">
               <div className="border rounded-lg overflow-hidden bg-white">
                 <iframe
                   srcDoc={previewHtml}
                   className="w-full h-[600px] border-0"
                   title="Report Preview"
                 />
               </div>
             </CardContent>
           </Card>
         )}
       </div>
     </EquipeLayout>
   );
 };
 
 export default EquipeRelatorios;