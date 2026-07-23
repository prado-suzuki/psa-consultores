import { Building2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ProjetoEquipeFields } from '@/components/equipe/projetos-cadastro/ProjetoEquipeFields';
import { ProjetoOsProdutoFields } from '@/components/equipe/projetos-cadastro/ProjetoOsProdutoFields';
import { useProjetosCadastro } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';

export function ProjetoDialog() {
  const {
    isModalOpen, setIsModalOpen, editingProject, formData, setFormData, externalClients,
    equipesOptions, handleCloseModal, handleSubmit, createProject, updateProject,
  } = useProjetosCadastro();
  return <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
    <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
      <DialogHeader><DialogTitle>{editingProject ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle></DialogHeader>
      <div className="flex-1 min-h-0 overflow-y-auto pr-4"><div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2"><Building2 className="h-4 w-4" />Identificação</h3>
          <div>
            <Label>Cliente *</Label>
            <Select value={formData.external_client_id} onValueChange={value => setFormData(previous => ({ ...previous, external_client_id: value }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>{externalClients.map(client => <SelectItem key={client.id} value={client.id}>{client.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <ProjetoOsProdutoFields />
          <div><Label>Nome do Projeto *</Label><Input value={formData.name} onChange={event => setFormData(previous => ({ ...previous, name: event.target.value }))} placeholder="Nome do projeto" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Equipe *</Label>
              <Select value={formData.equipe_id} onValueChange={value => {
                const team = equipesOptions.find(item => item.id === value);
                setFormData(previous => ({ ...previous, equipe_id: value, estrutura_area_id: team?.area_id || previous.estrutura_area_id }));
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione a equipe" /></SelectTrigger>
                <SelectContent>{equipesOptions.map(team => <SelectItem key={team.id} value={team.id}>{team.name}{team.area_name ? <span className="text-xs text-muted-foreground ml-1">— {team.area_name}</span> : null}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status <span className="text-destructive">*</span></Label>
              <Select value={formData.status} onValueChange={value => setFormData(previous => ({ ...previous, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                  <SelectItem value="planned">Planejado</SelectItem><SelectItem value="active">Ativo</SelectItem><SelectItem value="completed">Concluído</SelectItem><SelectItem value="on_hold">Pausado</SelectItem><SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2 flex items-center gap-2"><Calendar className="h-4 w-4" />Período</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Data de Início <span className="text-destructive">*</span></Label><Input type="date" value={formData.start_date} onChange={event => setFormData(previous => ({ ...previous, start_date: event.target.value }))} /></div>
            <div><Label>Data de Término <span className="text-destructive">*</span></Label><Input type="date" value={formData.end_date} onChange={event => setFormData(previous => ({ ...previous, end_date: event.target.value }))} /></div>
          </div>
        </div>
        <ProjetoEquipeFields />
        <div className="space-y-4"><h3 className="text-sm font-semibold text-foreground border-b pb-2">Detalhes</h3><div>
          <Label>Descrição do Projeto <span className="text-destructive">*</span></Label>
          <Textarea value={formData.description} onChange={event => setFormData(previous => ({ ...previous, description: event.target.value }))} placeholder="Descrição do projeto" rows={3} />
        </div></div>
        <div className="pb-4" />
      </div></div>
      <DialogFooter className="border-t pt-4 mt-0">
        <Button variant="outline" onClick={handleCloseModal}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={createProject.isPending || updateProject.isPending}>{editingProject ? 'Salvar' : 'Criar'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
