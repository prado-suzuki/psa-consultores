 import { useState, useEffect } from 'react';
 import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Button } from '@/components/ui/button';
 import { supabase } from '@/integrations/supabase/client';
 import { FileText, ExternalLink, Download, Link, FileUp, Loader2 } from 'lucide-react';
 import { renderMarkdown } from '@/lib/markdownRenderer';
 
 interface SOPViewerModalProps {
   open: boolean;
   onClose: () => void;
   processName: string;
   formattedContent: string | null;
   sopLink?: string | null;
   sopDocumentPath?: string | null;
 }
 
 export function SOPViewerModal({ 
   open, 
   onClose, 
   processName, 
   formattedContent,
   sopLink,
   sopDocumentPath
 }: SOPViewerModalProps) {
   const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
   const [loadingUrl, setLoadingUrl] = useState(false);
 
   useEffect(() => {
     if (open && sopDocumentPath) {
       setLoadingUrl(true);
       supabase.storage
         .from('sop-documents')
         .createSignedUrl(sopDocumentPath, 3600)
         .then(({ data, error }) => {
           if (!error && data) {
             setDownloadUrl(data.signedUrl);
           }
           setLoadingUrl(false);
         });
     } else {
       setDownloadUrl(null);
     }
   }, [open, sopDocumentPath]);
 
   const getFileName = (path: string) => path.split('/').pop() || path;
 
   const hasContent = sopLink || sopDocumentPath || formattedContent;
 
   return (
     <Dialog open={open} onOpenChange={onClose}>
       <DialogContent className="max-w-3xl max-h-[85vh]">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <FileText className="h-5 w-5 text-primary" />
             SOP Mapeado
           </DialogTitle>
           <p className="text-sm text-muted-foreground">{processName}</p>
         </DialogHeader>
 
         <ScrollArea className="h-[60vh] pr-4">
           {sopLink ? (
             <div className="bg-muted/30 rounded-lg p-6 border">
               <div className="flex items-center gap-3 mb-4">
                 <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                   <Link className="h-5 w-5 text-primary" />
                 </div>
                 <div>
                   <p className="font-medium">Link externo para documentação</p>
                   <p className="text-sm text-muted-foreground truncate max-w-md">{sopLink}</p>
                 </div>
               </div>
               <Button onClick={() => window.open(sopLink, '_blank')}>
                 <ExternalLink className="h-4 w-4 mr-2" />
                 Abrir em nova aba
               </Button>
             </div>
           ) : sopDocumentPath ? (
             <div className="bg-muted/30 rounded-lg p-6 border">
               <div className="flex items-center gap-3 mb-4">
                 <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                   <FileUp className="h-5 w-5 text-primary" />
                 </div>
                 <div>
                   <p className="font-medium">Documento anexado</p>
                   <p className="text-sm text-muted-foreground">{getFileName(sopDocumentPath)}</p>
                 </div>
               </div>
               {loadingUrl ? (
                 <Button disabled>
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                   Carregando...
                 </Button>
               ) : downloadUrl ? (
                 <Button onClick={() => window.open(downloadUrl, '_blank')}>
                   <Download className="h-4 w-4 mr-2" />
                   Baixar documento
                 </Button>
               ) : (
                 <Button disabled variant="outline">
                   Documento não disponível
                 </Button>
               )}
             </div>
           ) : formattedContent ? (
             <div className="prose prose-sm max-w-none">
               <div className="bg-muted/30 rounded-lg p-6 border">
                 {renderMarkdown(formattedContent)}
               </div>
             </div>
           ) : (
             <div className="text-center py-12 text-muted-foreground">
               <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
               <p className="font-medium">Nenhum SOP documentado</p>
               <p className="text-sm">Este processo ainda não possui documentação configurada.</p>
               <p className="text-sm mt-1">Use o botão "Configurar SOP" para adicionar um link, documento ou texto.</p>
             </div>
           )}
         </ScrollArea>
       </DialogContent>
     </Dialog>
   );
 }