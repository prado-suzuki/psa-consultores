import { useState, useEffect, useRef } from 'react';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Upload, X, FileText } from 'lucide-react';
import { RequiredMark } from '@/components/ui/required-mark';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const departmentLabels: Record<string, string> = {
  contabilidade: 'Contabilidade/Societário',
  icms_ipi: 'ICMS/IPI',
  irpj_csll: 'IRPJ/CSLL',
  pis_cofins: 'PIS/COFINS',
  produtor_rural: 'Produtor Rural PF',
  outros: 'Outros',
};

const priorityLabels: Record<string, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

interface Empresa {
  id: string;
  nome: string;
}

interface Area {
  id: string;
  name: string;
  cluster_id: string;
}

export function CreateTicketDialog({ open, onOpenChange, onSuccess }: CreateTicketDialogProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Profile[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [filteredAreas, setFilteredAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: '',
    priority: 'normal',
    user_id: '',
    cliente_id: '',
    estrutura_area_id: '',
  });

  const { restore, clear } = useDraftPersistence('ticket-form-draft', formData, open, user?.id);

  useEffect(() => {
    if (open) {
      fetchClients();
      fetchEmpresas();
      const saved = restore();
      if (saved) {
        setFormData(saved as typeof formData);
      }
    }
  }, [open]);

  // When cliente_id changes, fetch clusters → filter areas
  useEffect(() => {
    if (!formData.cliente_id) {
      setFilteredAreas([]);
      return;
    }
    fetchAreasForCliente(formData.cliente_id);
  }, [formData.cliente_id]);

  const fetchEmpresas = async () => {
    try {
      setLoadingEmpresas(true);
      const { data } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .order('nome');
      setEmpresas(data || []);
    } catch (error) {
      console.error('Error fetching empresas:', error);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const fetchAreasForCliente = async (clienteId: string) => {
    try {
      setLoadingAreas(true);

      // 1. Get clusters for this client
      const { data: clusterLinks } = await supabase
        .from('cliente_clusters')
        .select('cluster_id')
        .eq('cliente_id', clienteId);

      const clusterIds = (clusterLinks || []).map(c => c.cluster_id);

      // 2. Fetch areas — filtered by clusters if any, otherwise all active
      let query = supabase
        .from('estrutura_areas')
        .select('id, name, cluster_id')
        .eq('is_active', true)
        .order('name');

      if (clusterIds.length > 0) {
        query = query.in('cluster_id', clusterIds);
      }

      const { data: areasData } = await query;
      const result = (areasData || []) as Area[];
      setFilteredAreas(result);

      // Auto-select if only one area
      if (result.length === 1) {
        setFormData(prev => ({ ...prev, estrutura_area_id: result[0].id }));
      }
    } catch (error) {
      console.error('Error fetching areas for client:', error);
    } finally {
      setLoadingAreas(false);
    }
  };

  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'client');

      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .rpc('get_profiles_with_email' as any)
          .in('id', userIds)
          .order('first_name');

        setClients(profilesData || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: `${file.name} excede 10MB`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleEmpresaChange = (v: string) => {
    setFormData(prev => ({ ...prev, cliente_id: v, estrutura_area_id: '' }));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.user_id || !formData.cliente_id || !formData.estrutura_area_id) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const insertPayload: any = {
        title: formData.title,
        description: formData.description,
        department: formData.department || null,
        priority: formData.priority,
        user_id: formData.user_id,
        cliente_id: formData.cliente_id,
        estrutura_area_id: formData.estrutura_area_id,
        status: 'aberto',
        activity_status: 'aguardando_resposta',
      };

      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert(insertPayload)
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Upload attachments if any
      if (selectedFiles.length > 0 && ticket) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${ticket.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('ticket-attachments')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            continue;
          }

          await supabase.from('ticket_attachments').insert({
            ticket_id: ticket.id,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: formData.user_id,
          });
        }
      }

      // Disparar notificação (fire-and-forget)
      if (ticket) {
        supabase.functions.invoke('notify-ticket', {
          body: {
            event_type: 'ticket_created',
            ticket_id: ticket.id,
            actor_name: 'Gestão PSA',
          }
        }).catch(console.error);
      }

      toast({
        title: 'Chamado criado',
        description: 'O chamado foi criado com sucesso.',
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        department: '',
        priority: 'normal',
        user_id: '',
        cliente_id: '',
        estrutura_area_id: '',
      });
      setSelectedFiles([]);
      clear();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Erro ao criar chamado',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) clear(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Novo Chamado</DialogTitle>
          <DialogDescription className="text-slate-500">
            Crie um chamado em nome de um cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Usuário (Cliente) */}
          <div className="space-y-2">
            <Label htmlFor="client" className="text-slate-700">Usuário (Cliente) <RequiredMark /></Label>
            <Select
              value={formData.user_id}
              onValueChange={(v) => setFormData({ ...formData, user_id: v })}
            >
              <SelectTrigger className="bg-white border-slate-200">
                <SelectValue placeholder={loadingClients ? "Carregando..." : "Selecione o usuário"} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.first_name} {client.last_name} ({client.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Empresa */}
          <div className="space-y-2">
            <Label className="text-slate-700">Empresa <RequiredMark /></Label>
            <Select
              value={formData.cliente_id}
              onValueChange={handleEmpresaChange}
            >
              <SelectTrigger className="bg-white border-slate-200">
                <SelectValue placeholder={loadingEmpresas ? "Carregando..." : "Selecione a empresa"} />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-slate-700">Título <RequiredMark /></Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Título do chamado"
              className="bg-white border-slate-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-700">Descrição <RequiredMark /></Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o chamado..."
              rows={4}
              className="bg-white border-slate-200"
            />
          </div>

          {/* Área (filtrada pelos clusters da empresa) */}
          <div className="space-y-2">
            <Label className="text-slate-700">Área <RequiredMark /></Label>
            <Select
              value={formData.estrutura_area_id}
              onValueChange={(v) => setFormData({ ...formData, estrutura_area_id: v })}
              disabled={!formData.cliente_id}
            >
              <SelectTrigger className="bg-white border-slate-200">
                <SelectValue
                  placeholder={
                    !formData.cliente_id
                      ? "Selecione a empresa primeiro"
                      : loadingAreas
                        ? "Carregando..."
                        : "Selecione a área"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredAreas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Assunto</Label>
              <Select
                value={formData.department}
                onValueChange={(v) => setFormData({ ...formData, department: v })}
              >
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(departmentLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v })}
              >
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label className="text-slate-700">Anexos</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                Adicionar arquivos
              </Button>
            </div>
            {selectedFiles.length > 0 && (
              <div className="space-y-2 mt-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="flex-1 truncate text-slate-700">{file.name}</span>
                    <span className="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-400 hover:text-red-500"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => { clear(); onOpenChange(false); }}
            className="border-slate-200 text-slate-600"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Criando...
              </span>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Criar Chamado
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
