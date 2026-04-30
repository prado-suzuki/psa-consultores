import { useState, useEffect, useRef } from 'react';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateTicketGestao, useTicketEmpresas, useTicketAreasForCliente, useTicketClientProfiles } from '@/hooks/useCreateTicket';
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

export function CreateTicketDialog({ open, onOpenChange, onSuccess }: CreateTicketDialogProps) {
  const { user } = useAuth();
  const createTicket = useCreateTicketGestao();

  const { data: clients = [], isLoading: loadingClients } = useTicketClientProfiles();
  const { data: empresas = [], isLoading: loadingEmpresas } = useTicketEmpresas();

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

  const { data: filteredAreas = [], isLoading: loadingAreas } = useTicketAreasForCliente(
    formData.cliente_id || undefined
  );

  const { restore, clear } = useDraftPersistence('ticket-form-draft', formData, open, user?.id);

  useEffect(() => {
    if (open) {
      const saved = restore();
      if (saved) {
        setFormData(saved as typeof formData);
      }
    }
  }, [open]);

  // Auto-select if only one area
  useEffect(() => {
    if (filteredAreas.length === 1) {
      setFormData(prev => ({ ...prev, estrutura_area_id: filteredAreas[0].id }));
    }
  }, [filteredAreas]);

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

    try {
      // Derive cluster_id from selected area
      const selectedArea = filteredAreas.find(a => a.id === formData.estrutura_area_id);
      const clusterId = selectedArea?.cluster_id || null;

      await createTicket.mutateAsync({
        title: formData.title,
        description: formData.description,
        department: formData.department || null,
        priority: formData.priority,
        user_id: formData.user_id,
        cliente_id: formData.cliente_id,
        estrutura_area_id: formData.estrutura_area_id,
        files: selectedFiles,
        cluster_id: clusterId,
      });

      toast({
        title: 'Chamado criado',
        description: 'O chamado foi criado com sucesso.',
      });

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
    } catch {
      toast({
        title: 'Erro ao criar chamado',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  const loading = createTicket.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) clear(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Novo Chamado</DialogTitle>
          <DialogDescription className="text-slate-500">
            Crie um chamado em nome de um representante do cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Representante */}
          <div className="space-y-2">
            <Label htmlFor="client" className="text-slate-700">Representante <RequiredMark /></Label>
            <Select
              value={formData.user_id}
              onValueChange={(v) => setFormData({ ...formData, user_id: v })}
            >
              <SelectTrigger className="bg-white border-slate-200">
                <SelectValue placeholder={loadingClients ? "Carregando..." : "Selecione o representante"} />
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

          {/* Cliente */}
          <div className="space-y-2">
            <Label className="text-slate-700">Cliente <RequiredMark /></Label>
            <Select
              value={formData.cliente_id}
              onValueChange={handleEmpresaChange}
            >
              <SelectTrigger className="bg-white border-slate-200">
                <SelectValue placeholder={loadingEmpresas ? "Carregando..." : "Selecione o cliente"} />
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
                      ? "Selecione o cliente primeiro"
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
              <Label className="text-slate-700">Categoria</Label>
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
