import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isProductionEnvironment } from '@/config/api';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, Trash2, Building2, Loader2, Layers, CheckCircle2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const clienteTable = isProductionEnvironment ? 'cliente' : 'cliente_dev';
const contribuinteTable = isProductionEnvironment ? 'contribuinte' : 'contribuinte_dev';
const participanteTable = isProductionEnvironment ? 'participante' : 'participante_dev';
const contratoTable = isProductionEnvironment ? 'contrato' : 'contrato_dev';
const servicoTable = isProductionEnvironment ? 'servico' : 'servico_dev';

// Types for draft items
interface DraftEntity {
  _id: number;
  tipo_pessoa: string;
  cpf_cnpj: string;
  nome_razao_social: string;
  inscricao_estadual: string;
  cod_cnae: string;
  setor: string;
  simples_nacional: boolean;
}

interface DraftParticipant {
  _id: number;
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
}

interface DraftService {
  _id: number;
  descricao: string;
  id_catalog_client: string;
  catalog_name: string;
}

interface DraftContract {
  _id: number;
  tipo_contrato: string;
  numero_contrato: string;
  data_inicio: string;
  data_fim: string;
  valor_fixo: number;
  aliquota_contrato: number;
  services: DraftService[];
}

// Helper para sincronizar com DW
const syncCadastrosToDW = (payload: any) => {
  const environment = isProductionEnvironment ? 'production' : 'development';
  supabase.functions.invoke('sync-cadastros', {
    body: { ...payload, environment }
  }).then(({ error }) => {
    if (error) console.error('[sync-cadastros] Erro:', error.message);
    else console.log('[sync-cadastros] Sync iniciado');
  }).catch(err => console.error('[sync-cadastros] Erro:', err));
};

interface NewClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClienteId?: string | null;
}

export default function NewClientModal({ open, onOpenChange, editingClienteId }: NewClientModalProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const isEditing = !!editingClienteId;

  // Section 1 - Client data
  const [clientData, setClientData] = useState({
    nome: '',
    categoria: 'Bronze',
    ativo: true,
    fixo: 'Sim',
    telefone: '',
    municipio: '',
    uf: '',
  });

  // Section 2 - Contribuintes
  const [entities, setEntities] = useState<DraftEntity[]>([]);
  const [draftEntity, setDraftEntity] = useState<Partial<DraftEntity>>({
    tipo_pessoa: 'PJ', cpf_cnpj: '', nome_razao_social: '', inscricao_estadual: '',
    cod_cnae: '', setor: 'Indústria', simples_nacional: false,
  });

  // Section 3 - Participantes
  const [participants, setParticipants] = useState<DraftParticipant[]>([]);
  const [draftParticipant, setDraftParticipant] = useState({
    nome: '', cargo: '', email: '', telefone: '',
  });

  // Section 4 - Contratos
  const [contracts, setContracts] = useState<DraftContract[]>([]);
  const [draftContract, setDraftContract] = useState({
    tipo_contrato: 'Mensal', numero_contrato: '', data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '', valor_fixo: 0, aliquota_contrato: 0,
  });
  const [draftServices, setDraftServices] = useState<DraftService[]>([]);
  const [activeServiceIndex, setActiveServiceIndex] = useState<number | null>(null);

  // Query catalog_clients for team select
  const { data: catalogClients = [] } = useQuery({
    queryKey: ['catalog-clients-for-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalog_clients')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Query existing service descriptions for autocomplete
  const { data: existingServices = [] } = useQuery({
    queryKey: ['existing-services-autocomplete'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servico')
        .select('descricao')
        .not('descricao', 'is', null);
      if (error) throw error;
      const unique = [...new Set(data.map((s: any) => s.descricao))].filter(Boolean).sort();
      return unique as string[];
    },
    enabled: open,
  });

  // Load existing data when editing
  useEffect(() => {
    if (!open || !editingClienteId) return;

    const loadData = async () => {
      setLoadingEdit(true);
      try {
        // 1. Cliente
        const { data: cli } = await supabase.from(clienteTable).select('*').eq('id', editingClienteId).maybeSingle();
        if (cli) {
          setClientData({
            nome: cli.nome || '',
            categoria: (cli as any).categoria || 'Bronze',
            ativo: cli.ativo ?? true,
            fixo: cli.fixo || 'Sim',
            telefone: cli.telefone || '',
            municipio: cli.municipio || '',
            uf: cli.uf || '',
          });
        }

        // 2. Contribuintes
        const { data: contribs } = await supabase.from(contribuinteTable).select('*').eq('cliente_id', editingClienteId);
        if (contribs) {
          setEntities(contribs.map(c => ({
            _id: Date.now() + Math.random(),
            tipo_pessoa: c.tipo_pessoa || 'PJ',
            cpf_cnpj: c.cpf_cnpj || '',
            nome_razao_social: c.nome_razao_social || '',
            inscricao_estadual: c.inscricao_estadual || '',
            cod_cnae: c.cod_cnae || '',
            setor: c.setor || '',
            simples_nacional: c.simples_nacional ?? false,
          })));
        }

        // 3. Participantes
        const { data: parts } = await (supabase.from(participanteTable) as any).select('*').eq('id_cliente', editingClienteId);
        if (parts) {
          setParticipants(parts.map((p: any) => ({
            _id: Date.now() + Math.random(),
            nome: p.nome || '',
            cargo: p.cargo || '',
            email: p.email || '',
            telefone: p.telefone || '',
          })));
        }

        // 4. Contratos + Servicos
        const { data: contratos } = await (supabase.from(contratoTable) as any).select('*').eq('id_cliente', editingClienteId);
        // Fetch services for each contract separately
        const contratosWithServices = [];
        for (const c of (contratos || [])) {
          const { data: servicos } = await (supabase.from(servicoTable) as any).select('*').eq('id_contrato', c.id_contrato);
          contratosWithServices.push({ ...c, servico: servicos || [] });
        }
        if (contratosWithServices.length > 0) {
          setContracts(contratosWithServices.map((c: any) => ({
            _id: Date.now() + Math.random(),
            tipo_contrato: c.tipo_contrato || 'Mensal',
            numero_contrato: c.numero_contrato || '',
            data_inicio: c.data_inicio || '',
            data_fim: c.data_fim || '',
            valor_fixo: c.valor_fixo || 0,
            aliquota_contrato: c.aliquota_contrato || 0,
            services: (c.servico || []).map((s: any) => ({
              _id: Date.now() + Math.random(),
              descricao: s.descricao || '',
              id_catalog_client: s.id_catalog_client || '',
              catalog_name: catalogClients.find((cc: any) => cc.id === s.id_catalog_client)?.name || '',
            })),
          })));
        }
      } catch (err: any) {
        console.error('Erro ao carregar dados do cliente:', err);
        toast.error('Erro ao carregar dados do cliente');
      } finally {
        setLoadingEdit(false);
      }
    };
    loadData();
  }, [open, editingClienteId]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // --- ENTITY HANDLERS ---
  const addEntity = () => {
    if (!draftEntity.nome_razao_social) { toast.error('Razão Social é obrigatória'); return; }
    setEntities([...entities, { ...draftEntity, _id: Date.now() + Math.random() } as DraftEntity]);
    setDraftEntity({ tipo_pessoa: 'PJ', cpf_cnpj: '', nome_razao_social: '', inscricao_estadual: '', cod_cnae: '', setor: 'Indústria', simples_nacional: false });
  };

  // --- PARTICIPANT HANDLERS ---
  const addParticipant = () => {
    if (!draftParticipant.nome) { toast.error('Nome é obrigatório'); return; }
    setParticipants([...participants, { ...draftParticipant, _id: Date.now() + Math.random() } as DraftParticipant]);
    setDraftParticipant({ nome: '', cargo: '', email: '', telefone: '' });
  };

  // --- CONTRACT / SERVICE HANDLERS ---
  const addEmptyService = () => {
    setDraftServices([...draftServices, {
      _id: Date.now() + Math.random(),
      descricao: '',
      id_catalog_client: '',
      catalog_name: '',
    }]);
  };

  const removeServiceFromDraft = (id: number) => {
    setDraftServices(draftServices.filter(s => s._id !== id));
  };

  const updateServiceField = (id: number, field: keyof DraftService, value: string) => {
    setDraftServices(draftServices.map(s => {
      if (s._id !== id) return s;
      if (field === 'id_catalog_client') {
        const cat = catalogClients.find(c => c.id === value);
        return { ...s, id_catalog_client: value, catalog_name: cat?.name || '' };
      }
      return { ...s, [field]: value };
    }));
  };

  const addContract = () => {
    setContracts([...contracts, {
      ...draftContract, _id: Date.now() + Math.random(), services: [...draftServices],
    } as DraftContract]);
    setDraftContract({ tipo_contrato: 'Mensal', numero_contrato: '', data_inicio: new Date().toISOString().split('T')[0], data_fim: '', valor_fixo: 0, aliquota_contrato: 0 });
    setDraftServices([]);
  };

  // --- FINAL SAVE ---
  const handleSave = async () => {
    if (!clientData.nome.trim()) { toast.error('Nome do cliente é obrigatório'); return; }
    setSaving(true);
    try {
      const clientPayload = {
        nome: clientData.nome.trim(),
        categoria: clientData.categoria || null,
        ativo: clientData.ativo,
        fixo: clientData.fixo || null,
        telefone: clientData.telefone.trim() || null,
        municipio: clientData.municipio.trim() || null,
        uf: clientData.uf.trim() || null,
      };

      let clienteId: string;
      let clienteResult: any;

      if (isEditing) {
        // UPDATE existing client
        const { data: updated, error } = await supabase
          .from(clienteTable)
          .update(clientPayload)
          .eq('id', editingClienteId!)
          .select()
          .single();
        if (error) throw error;
        clienteId = editingClienteId!;
        clienteResult = updated;

        // Delete + re-insert contribuintes
        await supabase.from(contribuinteTable).delete().eq('cliente_id', clienteId);

        // Delete servicos + contratos
        const { data: existingContratos } = await (supabase.from(contratoTable) as any).select('id_contrato').eq('id_cliente', clienteId);
        if (existingContratos && existingContratos.length > 0) {
          const contratoIds = existingContratos.map((c: any) => c.id_contrato);
          await (supabase.from(servicoTable) as any).delete().in('id_contrato', contratoIds);
          await (supabase.from(contratoTable) as any).delete().eq('id_cliente', clienteId);
        }

        // Delete + re-insert participantes
        await (supabase.from(participanteTable) as any).delete().eq('id_cliente', clienteId);
      } else {
        // INSERT new client
        const { data: newCliente, error: clienteError } = await supabase
          .from(clienteTable)
          .insert(clientPayload)
          .select()
          .single();
        if (clienteError) throw clienteError;
        clienteId = newCliente.id;
        clienteResult = newCliente;
      }

      // 2. Insert contribuintes
      if (entities.length > 0) {
        const contribPayload = entities.map(e => ({
          cliente_id: clienteId,
          tipo_pessoa: e.tipo_pessoa,
          cpf_cnpj: e.cpf_cnpj || null,
          nome_razao_social: e.nome_razao_social,
          inscricao_estadual: e.inscricao_estadual || null,
          cod_cnae: e.cod_cnae || null,
          setor: e.setor || null,
          simples_nacional: e.simples_nacional,
        }));
        const { error: contribError } = await supabase.from(contribuinteTable).insert(contribPayload);
        if (contribError) throw contribError;
      }

      // 3. Insert participantes
      if (participants.length > 0) {
        const partPayload = participants.map(p => ({
          id_cliente: clienteId,
          nome: p.nome,
          cargo: p.cargo || null,
          email: p.email || null,
          telefone: p.telefone || null,
        }));
        const { error: partError } = await (supabase.from(participanteTable) as any).insert(partPayload);
        if (partError) throw partError;
      }

      // 4. Insert contratos + serviços
      for (const contract of contracts) {
        const { data: newContrato, error: contratoError } = await (supabase
          .from(contratoTable) as any)
          .insert({
            id_cliente: clienteId,
            tipo_contrato: contract.tipo_contrato || null,
            numero_contrato: contract.numero_contrato || null,
            data_inicio: contract.data_inicio || null,
            data_fim: contract.data_fim || null,
            valor_fixo: contract.valor_fixo || null,
            aliquota_contrato: contract.aliquota_contrato || null,
          })
          .select()
          .single();
        if (contratoError) throw contratoError;

        if (contract.services.length > 0) {
          const svcPayload = contract.services.map(s => ({
            id_contrato: newContrato.id_contrato,
            descricao: s.descricao || null,
            valor: null,
            id_catalog_client: s.id_catalog_client || null,
          }));
          const { error: svcError } = await (supabase.from(servicoTable) as any).insert(svcPayload);
          if (svcError) throw svcError;
        }
      }

      // 5. Sync DW
      syncCadastrosToDW({
        clientes: [{
          id_cliente: clienteResult.id,
          nome: clienteResult.nome,
          fixo: clienteResult.fixo,
          telefone: clienteResult.telefone,
          setor_cliente: clienteResult.setor_cliente,
          municipio: clienteResult.municipio,
          uf: clienteResult.uf,
          ativo: clienteResult.ativo,
          categoria: (clienteResult as any).categoria ?? null,
          created_at: clienteResult.created_at,
          updated_at: clienteResult.updated_at,
        }]
      });

      // 6. Cleanup
      queryClient.invalidateQueries({ queryKey: ['clientes-lista'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-filtrados'] });
      queryClient.invalidateQueries({ queryKey: ['contribuintes-modal'] });
      queryClient.invalidateQueries({ queryKey: ['contribuintes-por-cliente'] });
      toast.success(isEditing ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
      resetAndClose();
    } catch (error: any) {
      toast.error(`Erro ao ${isEditing ? 'atualizar' : 'cadastrar'} cliente: ` + error.message);
    } finally {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setClientData({ nome: '', categoria: 'Bronze', ativo: true, fixo: 'Sim', telefone: '', municipio: '', uf: '' });
    setEntities([]);
    setParticipants([]);
    setContracts([]);
    setDraftServices([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); }}>
      <DialogContent
        className={cn(
          "max-w-5xl h-[95vh] p-0 flex flex-col overflow-hidden gap-0",
          "[&>button]:hidden"
        )}
      >
        {/* Header */}
        <div className="px-8 py-5 border-b flex justify-between items-center bg-muted/50 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {isEditing ? (
                <Pencil className="text-teal-600" size={28} />
              ) : (
                <Plus className="text-teal-600" size={28} />
              )}
              {isEditing ? 'Editar Cliente' : 'Cadastro Completo'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? 'Edite os dados do cliente, contribuintes, contatos e contratos.'
                : 'Adicione todos os dados do cliente, contribuintes, contatos e contratos.'}
            </p>
          </div>
          <button onClick={resetAndClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
            <X size={28} />
          </button>
        </div>

        {loadingEdit ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <>
            {/* Scrollable Body */}
            <ScrollArea className="flex-1">
              <div className="p-6 md:p-10 space-y-8">

                {/* === SECTION 1: DADOS DO CLIENTE === */}
                <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-muted/50 border-b flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold border border-blue-200">1</div>
                    <h3 className="text-lg font-bold text-foreground">Dados do Cliente</h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-5">
                    <div className="col-span-12 md:col-span-6">
                      <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Nome do Cliente / Grupo *</Label>
                      <Input
                        autoFocus
                        value={clientData.nome}
                        onChange={e => setClientData({ ...clientData, nome: e.target.value })}
                        placeholder="Ex: Grupo Empresarial Silva"
                        className="text-base font-bold"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Categoria</Label>
                      <Select value={clientData.categoria} onValueChange={v => setClientData({ ...clientData, categoria: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bronze">Bronze</SelectItem>
                          <SelectItem value="Prata">Prata</SelectItem>
                          <SelectItem value="Ouro">Ouro</SelectItem>
                          <SelectItem value="Diamante">Diamante</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Status</Label>
                      <div className="flex items-center gap-2 h-10">
                        <Switch checked={clientData.ativo} onCheckedChange={c => setClientData({ ...clientData, ativo: c })} />
                        <span className="text-sm">{clientData.ativo ? 'Ativo' : 'Inativo'}</span>
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Tipo Relacionamento</Label>
                      <div className="flex bg-muted p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setClientData({ ...clientData, fixo: 'Sim' })}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${clientData.fixo === 'Sim' ? 'bg-card text-blue-700 shadow-sm' : 'text-muted-foreground'}`}
                        >Fixo</button>
                        <button
                          type="button"
                          onClick={() => setClientData({ ...clientData, fixo: 'Não' })}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${clientData.fixo === 'Não' ? 'bg-card text-orange-700 shadow-sm' : 'text-muted-foreground'}`}
                        >Pontual</button>
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Telefone</Label>
                      <Input value={clientData.telefone} onChange={e => setClientData({ ...clientData, telefone: e.target.value })} />
                    </div>
                    <div className="col-span-8 md:col-span-4">
                      <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Município</Label>
                      <Input value={clientData.municipio} onChange={e => setClientData({ ...clientData, municipio: e.target.value })} />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">UF</Label>
                      <Input value={clientData.uf} onChange={e => setClientData({ ...clientData, uf: e.target.value })} maxLength={2} />
                    </div>
                  </div>
                </section>

                {/* === SECTION 2: CONTRIBUINTES === */}
                <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-muted/50 border-b flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold border border-purple-200">2</div>
                    <h3 className="text-lg font-bold text-foreground">Contribuintes ({entities.length})</h3>
                  </div>
                  <div className="p-6">
                    {entities.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {entities.map(ent => (
                          <div key={ent._id} className="bg-purple-50 border border-purple-100 rounded-lg p-4 relative group hover:shadow-md transition-all">
                            <button onClick={() => setEntities(entities.filter(e => e._id !== ent._id))} className="absolute top-2 right-2 text-purple-300 hover:text-red-500 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={14} />
                            </button>
                            <div className="font-bold text-foreground">{ent.nome_razao_social}</div>
                            <div className="text-xs text-muted-foreground font-mono mt-1">{ent.cpf_cnpj || '-'}</div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-purple-200 font-bold text-purple-700">{ent.setor}</span>
                              {ent.simples_nacional && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Simples</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-muted/50 rounded-lg border p-5">
                      <h4 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
                        <Plus size={16} /> Novo Contribuinte
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Tipo</Label>
                          <Select value={draftEntity.tipo_pessoa || 'PJ'} onValueChange={v => setDraftEntity({ ...draftEntity, tipo_pessoa: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PJ">PJ</SelectItem>
                              <SelectItem value="PF">PF</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-8 md:col-span-3">
                          <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">CPF/CNPJ</Label>
                          <Input value={draftEntity.cpf_cnpj || ''} onChange={e => setDraftEntity({ ...draftEntity, cpf_cnpj: e.target.value })} placeholder="000.000.000-00" className="font-mono" />
                        </div>
                        <div className="col-span-12 md:col-span-7">
                          <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Razão Social *</Label>
                          <Input value={draftEntity.nome_razao_social || ''} onChange={e => setDraftEntity({ ...draftEntity, nome_razao_social: e.target.value })} placeholder="Nome Empresarial" className="font-medium" />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Insc. Estadual</Label>
                          <Input value={draftEntity.inscricao_estadual || ''} onChange={e => setDraftEntity({ ...draftEntity, inscricao_estadual: e.target.value })} placeholder="Isento" />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">CNAE</Label>
                          <Input value={draftEntity.cod_cnae || ''} onChange={e => setDraftEntity({ ...draftEntity, cod_cnae: e.target.value })} placeholder="0000-0/00" />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Setor</Label>
                          <Select value={draftEntity.setor || 'Indústria'} onValueChange={v => setDraftEntity({ ...draftEntity, setor: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Indústria">Indústria</SelectItem>
                              <SelectItem value="Agronegócio">Agronegócio</SelectItem>
                              <SelectItem value="Transportes">Transportes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Simples Nacional</Label>
                          <div className="flex items-center gap-2 h-10">
                            <Checkbox
                              checked={draftEntity.simples_nacional || false}
                              onCheckedChange={c => setDraftEntity({ ...draftEntity, simples_nacional: !!c })}
                            />
                            <span className="text-sm">Optante</span>
                          </div>
                        </div>
                        <div className="col-span-12 flex justify-end mt-2">
                          <Button onClick={addEntity} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                            <Plus size={16} /> Adicionar à Lista
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* === SECTION 3: PARTICIPANTES === */}
                <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-muted/50 border-b flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-bold border border-amber-200">3</div>
                    <h3 className="text-lg font-bold text-foreground">Participantes ({participants.length})</h3>
                  </div>
                  <div className="p-6">
                    {participants.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {participants.map(part => (
                          <div key={part._id} className="bg-amber-50 border border-amber-100 rounded-lg p-4 relative group hover:shadow-md transition-all">
                            <button onClick={() => setParticipants(participants.filter(p => p._id !== part._id))} className="absolute top-2 right-2 text-amber-300 hover:text-red-500 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={14} />
                            </button>
                            <div className="font-bold text-foreground">{part.nome}</div>
                            <div className="text-sm text-muted-foreground">{part.cargo}</div>
                            <div className="text-xs text-muted-foreground mt-1">{part.email}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-muted/50 rounded-lg border p-5">
                      <h4 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
                        <Plus size={16} /> Novo Participante
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="col-span-12 md:col-span-4">
                          <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Nome Completo *</Label>
                          <Input value={draftParticipant.nome} onChange={e => setDraftParticipant({ ...draftParticipant, nome: e.target.value })} placeholder="Nome do contato" className="font-medium" />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Cargo</Label>
                          <Input value={draftParticipant.cargo} onChange={e => setDraftParticipant({ ...draftParticipant, cargo: e.target.value })} />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Email</Label>
                          <Input value={draftParticipant.email} onChange={e => setDraftParticipant({ ...draftParticipant, email: e.target.value })} />
                        </div>
                        <div className="col-span-6 md:col-span-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Telefone</Label>
                          <Input value={draftParticipant.telefone} onChange={e => setDraftParticipant({ ...draftParticipant, telefone: e.target.value })} />
                        </div>
                        <div className="col-span-12 flex justify-end mt-2">
                          <Button onClick={addParticipant} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
                            <Plus size={16} /> Adicionar à Lista
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* === SECTION 4: CONTRATOS === */}
                <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-muted/50 border-b flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold border border-emerald-200">4</div>
                    <h3 className="text-lg font-bold text-foreground">Contratos ({contracts.length})</h3>
                  </div>
                  <div className="p-6">
                    {contracts.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {contracts.map(cont => (
                          <div key={cont._id} className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 relative group hover:shadow-md transition-all">
                            <button onClick={() => setContracts(contracts.filter(c => c._id !== cont._id))} className="absolute top-2 right-2 text-emerald-300 hover:text-red-500 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={14} />
                            </button>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${cont.tipo_contrato === 'Mensal' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{cont.tipo_contrato}</span>
                              <span className="font-mono text-xs text-muted-foreground">{cont.numero_contrato || 'S/N'}</span>
                            </div>
                            <div className="font-bold text-lg text-emerald-700">{formatCurrency(cont.valor_fixo)}</div>
                            {cont.services.length > 0 && (
                              <div className="pt-2 border-t border-emerald-100 space-y-1 mt-2">
                                {cont.services.map(s => (
                                  <div key={s._id} className="flex justify-between text-xs text-muted-foreground">
                                    <span className="truncate max-w-[120px]">{s.descricao}</span>
                                    <span className="text-emerald-600 font-medium">{s.catalog_name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-muted/50 rounded-lg border p-5">
                      <h4 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
                        <Plus size={16} /> Novo Contrato
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                        <div className="col-span-6 md:col-span-3">
                          <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Tipo</Label>
                          <Select value={draftContract.tipo_contrato} onValueChange={v => setDraftContract({ ...draftContract, tipo_contrato: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Mensal">Mensal (Fixo)</SelectItem>
                              <SelectItem value="Pontual">Pontual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Número (ID)</Label>
                          <Input value={draftContract.numero_contrato} onChange={e => setDraftContract({ ...draftContract, numero_contrato: e.target.value })} placeholder="2024.001" />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Início</Label>
                          <Input type="date" value={draftContract.data_inicio} onChange={e => setDraftContract({ ...draftContract, data_inicio: e.target.value })} />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Fim</Label>
                          <Input type="date" value={draftContract.data_fim} onChange={e => setDraftContract({ ...draftContract, data_fim: e.target.value })} />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <Label className="text-xs font-bold uppercase text-emerald-600 mb-1 block">Valor (R$)</Label>
                          <Input type="number" value={draftContract.valor_fixo} onChange={e => setDraftContract({ ...draftContract, valor_fixo: Number(e.target.value) })} className="border-emerald-200 text-emerald-800 font-bold" />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <Label className="text-xs font-bold uppercase text-emerald-600 mb-1 block">Alíquota (%)</Label>
                          <Input type="number" value={draftContract.aliquota_contrato} onChange={e => setDraftContract({ ...draftContract, aliquota_contrato: Number(e.target.value) })} className="border-emerald-200 text-emerald-800 font-bold" />
                        </div>
                      </div>

                      {/* Services sub-section */}
                      <div className="bg-card border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                            <Layers size={14} /> Serviços do Contrato
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addEmptyService}
                            className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1"
                          >
                            <Plus size={12} /> Adicionar Serviço
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {draftServices.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground text-xs italic border border-dashed rounded">
                              Nenhum serviço adicionado. Clique em "Adicionar Serviço".
                            </div>
                          ) : (
                            draftServices.map((svc, idx) => {
                              const filteredSuggestions = svc.descricao.trim()
                                ? existingServices.filter(s => s.toLowerCase().includes(svc.descricao.toLowerCase()) && s.toLowerCase() !== svc.descricao.toLowerCase())
                                : [];
                              return (
                                <div key={svc._id} className="flex gap-2 items-start">
                                  {/* Autocomplete input */}
                                  <div className="relative flex-1">
                                    <Input
                                      value={svc.descricao}
                                      onChange={e => {
                                        updateServiceField(svc._id, 'descricao', e.target.value);
                                        setActiveServiceIndex(idx);
                                      }}
                                      onFocus={() => setActiveServiceIndex(idx)}
                                      onBlur={() => setTimeout(() => setActiveServiceIndex(null), 200)}
                                      placeholder="Digite o nome do serviço..."
                                      className="text-sm"
                                    />
                                    {activeServiceIndex === idx && filteredSuggestions.length > 0 && (
                                      <div className="absolute left-0 right-0 top-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto z-50">
                                        {filteredSuggestions.slice(0, 8).map((suggestion, i) => (
                                          <button
                                            key={i}
                                            type="button"
                                            onMouseDown={e => e.preventDefault()}
                                            onClick={() => {
                                              updateServiceField(svc._id, 'descricao', suggestion);
                                              setActiveServiceIndex(null);
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                                          >
                                            {suggestion}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  {/* Team select */}
                                  <div className="w-48">
                                    <Select
                                      value={svc.id_catalog_client || '__none__'}
                                      onValueChange={v => updateServiceField(svc._id, 'id_catalog_client', v === '__none__' ? '' : v)}
                                    >
                                      <SelectTrigger className="text-sm h-10">
                                        <SelectValue placeholder="Equipe..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">Selecionar equipe</SelectItem>
                                        {catalogClients.map(cat => (
                                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {/* Remove button */}
                                  <button
                                    onClick={() => removeServiceFromDraft(svc._id)}
                                    className="text-muted-foreground hover:text-destructive mt-2.5"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end mt-4 pt-2 border-t">
                        <Button onClick={addContract} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                          <Plus size={16} /> Adicionar Contrato à Lista
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>

              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-6 border-t bg-card flex justify-end shrink-0 gap-3">
              <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={20} />}
                {isEditing ? 'Salvar Alterações' : 'Salvar Cliente Completo'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
