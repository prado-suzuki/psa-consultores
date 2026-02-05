 import { useState } from 'react';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Textarea } from '@/components/ui/textarea';
 import { Label } from '@/components/ui/label';
 import { Avatar, AvatarFallback } from '@/components/ui/avatar';
 import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { FiscalTask, useReassignFiscalTask } from '@/hooks/useFiscalTasks';
 import { useAuth } from '@/contexts/AuthContext';
 
 interface ReassignModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   task: FiscalTask | null;
   teamMembers: { id: string; name: string }[];
 }
 
 export const ReassignModal = ({ 
   open, 
   onOpenChange, 
   task,
   teamMembers 
 }: ReassignModalProps) => {
   const [selectedMember, setSelectedMember] = useState<string>('');
   const [comment, setComment] = useState('');
   const reassignTask = useReassignFiscalTask();
   const { user } = useAuth();
 
   const getInitials = (name: string) => {
     return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
   };
 
   const handleReassign = async () => {
     if (!task || !selectedMember || !comment.trim()) return;
 
     const member = teamMembers.find(m => m.id === selectedMember);
     if (!member) return;
 
     try {
       // Get current user name from user metadata or email
       const currentUserName = user?.user_metadata?.first_name 
         ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
         : user?.email || 'Usuário';
 
       await reassignTask.mutateAsync({
         taskId: task.id,
         newAssigneeId: selectedMember,
         newAssigneeName: member.name,
         comment: comment.trim(),
         currentUserName,
       });
       onOpenChange(false);
       setSelectedMember('');
       setComment('');
     } catch (error) {
       console.error('Error reassigning task:', error);
     }
   };
 
   const filteredMembers = teamMembers.filter(m => m.id !== task?.assigned_to);
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle>Reatribuir Tarefa</DialogTitle>
         </DialogHeader>
 
         <div className="space-y-4">
           <div>
             <p className="text-sm text-muted-foreground mb-2">
               Tarefa: <strong>{task?.title}</strong>
             </p>
             {task?.assigned_to_name && (
               <p className="text-sm text-muted-foreground">
                 Atual responsável: <strong>{task.assigned_to_name}</strong>
               </p>
             )}
           </div>
 
           <div>
             <Label className="text-sm font-medium">Novo Responsável</Label>
             <ScrollArea className="h-48 mt-2 border rounded-lg p-2">
               <RadioGroup value={selectedMember} onValueChange={setSelectedMember}>
                 {filteredMembers.map(member => (
                   <div 
                     key={member.id}
                     className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                   >
                     <RadioGroupItem value={member.id} id={member.id} />
                     <Avatar className="h-8 w-8">
                       <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                         {getInitials(member.name)}
                       </AvatarFallback>
                     </Avatar>
                     <Label htmlFor={member.id} className="cursor-pointer flex-1">
                       {member.name}
                     </Label>
                   </div>
                 ))}
               </RadioGroup>
             </ScrollArea>
           </div>
 
           <div>
             <Label htmlFor="comment" className="text-sm font-medium">
               Motivo da Reatribuição *
             </Label>
             <Textarea
               id="comment"
               value={comment}
               onChange={(e) => setComment(e.target.value)}
               placeholder="Explique o motivo da reatribuição..."
               rows={3}
               className="mt-2"
             />
           </div>
         </div>
 
         <DialogFooter>
           <Button variant="outline" onClick={() => onOpenChange(false)}>
             Cancelar
           </Button>
           <Button 
             onClick={handleReassign}
             disabled={!selectedMember || !comment.trim() || reassignTask.isPending}
           >
             Reatribuir
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 };