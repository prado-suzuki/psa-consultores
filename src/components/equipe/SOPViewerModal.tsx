 import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Badge } from '@/components/ui/badge';
 import { FileText } from 'lucide-react';
 import { renderMarkdown } from '@/lib/markdownRenderer';
 
 interface SOPViewerModalProps {
   open: boolean;
   onClose: () => void;
   processName: string;
   formattedContent: string | null;
 }
 
 export function SOPViewerModal({ open, onClose, processName, formattedContent }: SOPViewerModalProps) {
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
           {formattedContent ? (
             <div className="prose prose-sm max-w-none">
               <div className="bg-muted/30 rounded-lg p-6 border">
                 {renderMarkdown(formattedContent)}
               </div>
             </div>
           ) : (
             <div className="text-center py-12 text-muted-foreground">
               <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
               <p className="font-medium">Nenhum SOP documentado</p>
               <p className="text-sm">Este processo ainda não possui documentação formatada.</p>
             </div>
           )}
         </ScrollArea>
       </DialogContent>
     </Dialog>
   );
 }