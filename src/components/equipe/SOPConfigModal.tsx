 import { useState, useRef } from 'react';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from '@/hooks/use-toast';
 import { Link, FileUp, FileText, Loader2, X, Upload } from 'lucide-react';
 
 interface SOPConfigModalProps {
   open: boolean;
   onClose: () => void;
   processId: string;
   processName: string;
   currentLink: string | null;
   currentDocumentPath: string | null;
   currentFormattedContent: string | null;
   onUpdated: () => void;
 }
 
 export function SOPConfigModal({
   open,
   onClose,
   processId,
   processName,
   currentLink,
   currentDocumentPath,
   currentFormattedContent,
   onUpdated
 }: SOPConfigModalProps) {
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [activeTab, setActiveTab] = useState<string>(() => {
     if (currentLink) return 'link';
     if (currentDocumentPath) return 'document';
     return 'link';
   });
   const [sopLink, setSopLink] = useState(currentLink || '');
   const [selectedFile, setSelectedFile] = useState<File | null>(null);
   const [formattedContent, setFormattedContent] = useState(currentFormattedContent || '');
   const [saving, setSaving] = useState(false);
   const [uploading, setUploading] = useState(false);
 
   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
       setSelectedFile(file);
     }
   };
 
   const handleSave = async () => {
     setSaving(true);
     try {
       let updates: {
         sop_link: string | null;
         sop_document_path: string | null;
         formatted_content: string | null;
       } = {
         sop_link: null,
         sop_document_path: null,
         formatted_content: null
       };
 
       if (activeTab === 'link') {
         updates.sop_link = sopLink.trim() || null;
       } else if (activeTab === 'document' && selectedFile) {
         setUploading(true);
         const filePath = `${processId}/${selectedFile.name}`;
         
         // Delete old file if exists
         if (currentDocumentPath) {
           await supabase.storage.from('sop-documents').remove([currentDocumentPath]);
         }
         
         const { error: uploadError } = await supabase.storage
           .from('sop-documents')
           .upload(filePath, selectedFile, { upsert: true });
         
         if (uploadError) throw uploadError;
         
         updates.sop_document_path = filePath;
         setUploading(false);
       } else if (activeTab === 'document' && currentDocumentPath) {
         // Keep existing document
         updates.sop_document_path = currentDocumentPath;
       } else if (activeTab === 'text') {
         updates.formatted_content = formattedContent.trim() || null;
       }
 
       const { error } = await supabase
         .from('processes')
         .update(updates)
         .eq('id', processId);
 
       if (error) throw error;
 
       toast({
         title: 'SOP atualizado',
         description: 'A configuração do SOP foi salva com sucesso.'
       });
 
       onUpdated();
       onClose();
     } catch (error: any) {
       console.error('Error saving SOP config:', error);
       toast({
         title: 'Erro ao salvar',
         description: error.message,
         variant: 'destructive'
       });
     } finally {
       setSaving(false);
       setUploading(false);
     }
   };
 
   const handleClearDocument = async () => {
     if (currentDocumentPath) {
       try {
         await supabase.storage.from('sop-documents').remove([currentDocumentPath]);
         const { error } = await supabase
           .from('processes')
           .update({ sop_document_path: null })
           .eq('id', processId);
         
         if (error) throw error;
         
         toast({ title: 'Documento removido' });
         onUpdated();
       } catch (error: any) {
         toast({
           title: 'Erro ao remover documento',
           description: error.message,
           variant: 'destructive'
         });
       }
     }
     setSelectedFile(null);
   };
 
   const getFileName = (path: string) => path.split('/').pop() || path;
 
   return (
     <Dialog open={open} onOpenChange={onClose}>
       <DialogContent className="max-w-lg">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <FileText className="h-5 w-5 text-primary" />
             Configurar SOP
           </DialogTitle>
           <p className="text-sm text-muted-foreground">{processName}</p>
         </DialogHeader>
 
         <div className="space-y-4">
           <p className="text-sm text-muted-foreground">
             Como deseja associar o SOP a este processo?
           </p>
 
           <Tabs value={activeTab} onValueChange={setActiveTab}>
             <TabsList className="grid w-full grid-cols-3">
               <TabsTrigger value="link" className="flex items-center gap-1">
                 <Link className="h-4 w-4" />
                 Link
               </TabsTrigger>
               <TabsTrigger value="document" className="flex items-center gap-1">
                 <FileUp className="h-4 w-4" />
                 Documento
               </TabsTrigger>
               <TabsTrigger value="text" className="flex items-center gap-1">
                 <FileText className="h-4 w-4" />
                 Texto
               </TabsTrigger>
             </TabsList>
 
             <TabsContent value="link" className="space-y-4 mt-4">
               <div className="space-y-2">
                 <Label htmlFor="sop-link">URL do SOP</Label>
                 <Input
                   id="sop-link"
                   type="url"
                   value={sopLink}
                   onChange={(e) => setSopLink(e.target.value)}
                   placeholder="https://docs.google.com/document/d/..."
                 />
                 <p className="text-xs text-muted-foreground">
                   Cole o link para o documento externo (Google Docs, Notion, SharePoint, etc.)
                 </p>
               </div>
             </TabsContent>
 
             <TabsContent value="document" className="space-y-4 mt-4">
               <input
                 ref={fileInputRef}
                 type="file"
                 accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                 className="hidden"
                 onChange={handleFileSelect}
               />
               
               {(selectedFile || currentDocumentPath) ? (
                 <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                   <div className="flex items-center gap-2">
                     <FileUp className="h-5 w-5 text-primary" />
                     <span className="text-sm font-medium">
                       {selectedFile?.name || (currentDocumentPath && getFileName(currentDocumentPath))}
                     </span>
                     {selectedFile && (
                       <span className="text-xs text-muted-foreground">
                         ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                       </span>
                     )}
                   </div>
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={handleClearDocument}
                   >
                     <X className="h-4 w-4" />
                   </Button>
                 </div>
               ) : (
                 <Button
                   variant="outline"
                   className="w-full h-24 border-dashed"
                   onClick={() => fileInputRef.current?.click()}
                 >
                   <div className="flex flex-col items-center gap-2">
                     <Upload className="h-6 w-6 text-muted-foreground" />
                     <span className="text-sm text-muted-foreground">
                       Clique para selecionar arquivo
                     </span>
                   </div>
                 </Button>
               )}
               
               <p className="text-xs text-muted-foreground">
                 Formatos aceitos: PDF, Word, Excel, PowerPoint
               </p>
             </TabsContent>
 
             <TabsContent value="text" className="space-y-4 mt-4">
               <div className="space-y-2">
                 <Label htmlFor="sop-content">Conteúdo do SOP</Label>
                 <Textarea
                   id="sop-content"
                   value={formattedContent}
                   onChange={(e) => setFormattedContent(e.target.value)}
                   placeholder="Digite o conteúdo do SOP em Markdown..."
                   rows={10}
                   className="font-mono text-sm"
                 />
                 <p className="text-xs text-muted-foreground">
                   Suporta formatação Markdown (títulos, listas, negrito, etc.)
                 </p>
               </div>
             </TabsContent>
           </Tabs>
         </div>
 
         <DialogFooter>
           <Button variant="outline" onClick={onClose} disabled={saving}>
             Cancelar
           </Button>
           <Button onClick={handleSave} disabled={saving}>
             {saving ? (
               <>
                 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                 {uploading ? 'Enviando...' : 'Salvando...'}
               </>
             ) : (
               'Salvar'
             )}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }