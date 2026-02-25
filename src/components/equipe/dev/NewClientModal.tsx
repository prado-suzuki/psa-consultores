import { useState, useEffect, useMemo } from 'react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, X, Trash2, Building2, Loader2, CheckCircle2, Pencil, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

const clienteTable = isProductionEnvironment ? 'cliente' : 'cliente_dev';
const contribuinteTable = isProductionEnvironment ? 'contribuinte' : 'contribuinte_dev';
const participanteTable = isProductionEnvironment ? 'participante' : 'participante_dev';
const contratoTable = isProductionEnvironment ? 'contrato' : 'contrato_dev';

const PRODUTO_SEGMENTO_OPTIONS = [
  { value: 'ASO', label: 'ASO - Auditoria Pessoa Jurídica' },
  { value: 'AFI', label: 'AFI - Auditoria Pessoa Física' },
  { value: 'PFT', label: 'PFT - Consultoria Profitto' },
  { value: 'PTN', label: 'PTN - Consultoria Protenun' },
  { value: 'DHU', label: 'DHU - Consultoria em Recursos Humanos' },
  { value: 'FMB', label: 'FMB - Consultoria Family Business' },
  { value: 'OS1', label: 'OS1 - Sucessão Familiar - 1.0 (jurídico)' },
  { value: 'OSG', label: 'OSG - Sucessão Familiar - 2.0 (jurídico + governança)' },
  { value: 'SOC', label: 'SOC - Consultoria em Organização Societária' },
  { value: 'OUT', label: 'OUT - Receitas com Parceiros' },
  { value: 'PTR', label: 'PTR - Planejamento Tributário' },
  { value: 'REA', label: 'REA - Reduções de Encargos na Venda de Ativos' },
  { value: 'ACF', label: 'ACF - Assessoramento Contábil e Fiscal' },
  { value: 'RRT', label: 'RRT - Recuperação e Ressarcimento Tributário Administrativo' },
  { value: 'DTB', label: 'DTB - Defesas Tributárias Federais, Estaduais e Previdenciárias' },
  { value: 'EDP', label: 'EDP - Emissão de Pareceres' },
  { value: 'RTJ', label: 'RTJ - Recuperação Tributária Jurídica' },
  { value: 'RSC', label: 'RSC - Reestruturação Societária' },
  { value: 'IPC', label: 'IPC - Implantação de Programa de COMPLIANCE' },
  { value: 'CDI', label: 'CDI - Implantação de Canal de Denúncia e Investigação nas Empresas' },
  { value: 'AIV', label: 'AIV - Ação de Inventário' },
  { value: 'APV', label: 'APV - Antecipação de Provas' },
  { value: 'AGP', label: 'AGP - Ações de Grande Porte' },
  { value: 'JCM', label: 'JCM - Consultoria Jurídica Civil Mensal' },
  { value: 'ACO', label: 'ACO - Ações Coletivas' },
  { value: 'ADJ', label: 'ADJ - Administração Judicial' },
  { value: 'CJP', label: 'CJP - Consultoria Jurídica Pontual' },
  { value: 'DIV', label: 'DIV - Diversos' },
  { value: '__outro__', label: 'Outro (personalizado)' },
];

// Types for draft items
interface DraftEntity {
  _id: number;
  tipo_pessoa: string;
  cpf_cnpj: string;
  nome_razao_social: string;
  situacao_inscricao_estadual: string; // 'sim' | 'isento' | ''
  inscricao_estadual: string;
  cod_cnae: string;
  setor: string;
  simples_nacional: boolean;
  logradouro: string;
  bairro: string;
  municipio: string;
  uf: string;
}

interface DraftParticipant {
  _id: number;
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
  observacoes: string;
}

interface DraftContract {
  _id: number;
  ordem_servico: string;
  data_emissao: string;
  nome_projeto: string;
  descricao_projeto: string;
  data_inicio_projeto: string;
  data_fim_projeto: string;
  valor_projeto: number;
  valor_reembolso_km: number;
  valor_reembolso_refeicao: number;
  gestor_responsavel: string;
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
  const [activeTab, setActiveTab] = useState<'cliente' | 'contribuintes' | 'participantes' | 'contratos'>('cliente');

  const tabOrder: typeof activeTab[] = ['cliente', 'contribuintes', 'participantes', 'contratos'];
  const currentTabIndex = tabOrder.indexOf(activeTab);
  const isLastTab = currentTabIndex === tabOrder.length - 1;
  const isFirstTab = currentTabIndex === 0;

  const handleNext = () => {
    if (!isLastTab) setActiveTab(tabOrder[currentTabIndex + 1]);
  };
  const handleBack = () => {
    if (!isFirstTab) setActiveTab(tabOrder[currentTabIndex - 1]);
  };

  const isEditing = !!editingClienteId;

  // Queries for lider dropdown
  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles-lider'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'lider');
      return data || [];
    }
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name');
      return data || [];
    }
  });

  const lideres = useMemo(() => {
    const liderIds = new Set(userRoles.map((r: any) => r.user_id));
    return profiles
      .filter((p: any) => liderIds.has(p.id))
      .map((p: any) => ({ id: p.id, nome: `${p.first_name || ''} ${p.last_name || ''}`.trim() }));
  }, [userRoles, profiles]);

  // Section 1 - Client data
  const [clientData, setClientData] = useState({
    nome: '',
    categoria: 'Bronze',
    ativo: true,
    fixo: 'Sim',
    telefone: '',
    municipio: '',
    uf: '',
    setor_cliente: '',
    tipo_produto_segmento: '',
    tipo_produto_segmento_custom: '',
    equipe_responsavel: '',
    regiao: '',
  });

  // Section 2 - Contribuintes
  const [entities, setEntities] = useState<DraftEntity[]>([]);
  const [draftEntity, setDraftEntity] = useState<Partial<DraftEntity>>({
    tipo_pessoa: 'PJ', cpf_cnpj: '', nome_razao_social: '',
    situacao_inscricao_estadual: '', inscricao_estadual: '',
    cod_cnae: '', setor: 'Indústria', simples_nacional: false,
    logradouro: '', bairro: '', municipio: '', uf: '',
  });

  // Section 3 - Participantes
  const [participants, setParticipants] = useState<DraftParticipant[]>([]);
  const [draftParticipant, setDraftParticipant] = useState({
    nome: '', cargo: '', email: '', telefone: '', observacoes: '',
  });

  // Section 4 - OS (Ordem de Serviço)
  const [contracts, setContracts] = useState<DraftContract[]>([]);
  const [draftContract, setDraftContract] = useState({
    ordem_servico: '', data_emissao: '', nome_projeto: '', descricao_projeto: '',
    data_inicio_projeto: '', data_fim_projeto: '', valor_projeto: 0,
    valor_reembolso_km: 0, valor_reembolso_refeicao: 0, gestor_responsavel: '',
  });

  // Load existing data when editing
  useEffect(() => {
    if (!open || !editingClienteId) return;

    const loadData = async () => {
      setLoadingEdit(true);
      try {
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
            setor_cliente: cli.setor_cliente || '',
            tipo_produto_segmento: '',
            tipo_produto_segmento_custom: '',
            equipe_responsavel: (cli as any).equipe_responsavel || '',
            regiao: (cli as any).regiao || '',
          });
        }

        const { data: contribs } = await supabase.from(contribuinteTable).select('*').eq('cliente_id', editingClienteId);
        if (contribs) {
          setEntities(contribs.map(c => ({
            _id: Date.now() + Math.random(),
            tipo_pessoa: c.tipo_pessoa || 'PJ',
            cpf_cnpj: c.cpf_cnpj || '',
            nome_razao_social: c.nome_razao_social || '',
            situacao_inscricao_estadual: c.inscricao_estadual ? 'sim' : 'isento',
            inscricao_estadual: c.inscricao_estadual || '',
            cod_cnae: c.cod_cnae || '',
            setor: c.setor || '',
            simples_nacional: c.simples_nacional ?? false,
            logradouro: '',
            bairro: '',
            municipio: '',
            uf: '',
          })));
        }

        const { data: parts } = await (supabase.from(participanteTable) as any).select('*').eq('id_cliente', editingClienteId);
        if (parts) {
          setParticipants(parts.map((p: any) => ({
            _id: Date.now() + Math.random(),
            nome: p.nome || '',
            cargo: p.cargo || '',
            email: p.email || '',
            telefone: p.telefone || '',
            observacoes: (p as any).observacoes || '',
          })));
        }

        setContracts([]);
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
    if (!draftEntity.nome_razao_social?.trim()) { toast.error('Razão Social é obrigatória'); return; }
    
    const cpfCnpjDigits = (draftEntity.cpf_cnpj || '').replace(/\D/g, '');
    if (!cpfCnpjDigits) { toast.error('CPF/CNPJ é obrigatório'); return; }
    if (cpfCnpjDigits.length !== 11 && cpfCnpjDigits.length !== 14) {
      toast.error('CPF deve ter 11 dígitos ou CNPJ 14 dígitos'); return;
    }

    if (!draftEntity.logradouro?.trim()) { toast.error('Logradouro é obrigatório'); return; }
    if (!draftEntity.bairro?.trim()) { toast.error('Bairro é obrigatório'); return; }
    if (!draftEntity.municipio?.trim()) { toast.error('Município é obrigatório'); return; }
    if (!draftEntity.uf?.trim() || (draftEntity.uf?.trim().length !== 2)) { toast.error('UF deve ter 2 caracteres'); return; }

    if (!draftEntity.situacao_inscricao_estadual) { toast.error('Informe a situação da inscrição estadual'); return; }
    if (draftEntity.situacao_inscricao_estadual === 'sim' && !draftEntity.inscricao_estadual?.trim()) { toast.error('Informe o número da inscrição estadual'); return; }

    if (draftEntity.tipo_pessoa === 'PJ') {
      if (!draftEntity.cod_cnae?.trim()) { toast.error('CNAE é obrigatório para PJ'); return; }
      if (!draftEntity.setor?.trim()) { toast.error('Setor é obrigatório para PJ'); return; }
    }

    setEntities([...entities, { ...draftEntity, _id: Date.now() + Math.random() } as DraftEntity]);
    setDraftEntity({
      tipo_pessoa: 'PJ', cpf_cnpj: '', nome_razao_social: '',
      situacao_inscricao_estadual: '', inscricao_estadual: '',
      cod_cnae: '', setor: 'Indústria', simples_nacional: false,
      logradouro: '', bairro: '', municipio: '', uf: '',
    });
  };

  // --- PARTICIPANT HANDLERS ---
  const addParticipant = () => {
    if (!draftParticipant.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!draftParticipant.cargo.trim()) { toast.error('Cargo é obrigatório'); return; }

    if (draftParticipant.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(draftParticipant.email.trim())) { toast.error('Formato de e-mail inválido'); return; }
    }

    if (draftParticipant.telefone.trim()) {
      const telDigits = draftParticipant.telefone.replace(/\D/g, '');
      if (telDigits.length < 10) { toast.error('Telefone deve ter no mínimo 10 dígitos'); return; }
    }

    if (draftParticipant.observacoes.trim() && draftParticipant.observacoes.trim().length < 20) {
      toast.error('Observações deve ter no mínimo 20 caracteres'); return;
    }

    setParticipants([...participants, { ...draftParticipant, _id: Date.now() + Math.random() } as DraftParticipant]);
    setDraftParticipant({ nome: '', cargo: '', email: '', telefone: '', observacoes: '' });
  };

  // --- OS HANDLERS ---
  const addContract = () => {
    if (!draftContract.ordem_servico.trim()) { toast.error('Número da OS é obrigatório'); return; }
    if (!draftContract.nome_projeto.trim()) { toast.error('Nome do Projeto é obrigatório'); return; }
    if (!draftContract.data_emissao) { toast.error('Data de Emissão é obrigatória'); return; }
    if (!draftContract.data_inicio_projeto) { toast.error('Data de Início é obrigatória'); return; }
    if (!draftContract.gestor_responsavel) { toast.error('Gestor Responsável é obrigatório'); return; }
    if (draftContract.valor_projeto <= 0) { toast.error('Valor do Projeto deve ser maior que zero'); return; }

    if (draftContract.descricao_projeto.trim() && draftContract.descricao_projeto.trim().length < 20) {
      toast.error('Descrição do Projeto deve ter no mínimo 20 caracteres'); return;
    }

    setContracts([...contracts, { ...draftContract, _id: Date.now() + Math.random() } as DraftContract]);
    setDraftContract({
      ordem_servico: '', data_emissao: '', nome_projeto: '', descricao_projeto: '',
      data_inicio_projeto: '', data_fim_projeto: '', valor_projeto: 0,
      valor_reembolso_km: 0, valor_reembolso_refeicao: 0, gestor_responsavel: '',
    });
  };

  // --- FINAL SAVE ---
  const handleSave = async () => {
    if (!clientData.nome.trim()) { toast.error('Nome do cliente é obrigatório'); return; }

    if (!clientData.setor_cliente) { toast.error('Área do negócio é obrigatória'); return; }
    if (!clientData.tipo_produto_segmento) { toast.error('Tipo de produto/segmento é obrigatório'); return; }
    if (clientData.tipo_produto_segmento === '__outro__' && !clientData.tipo_produto_segmento_custom.trim()) {
      toast.error('Informe o nome do produto/segmento personalizado'); return;
    }
    if (!clientData.equipe_responsavel) { toast.error('Equipe responsável é obrigatória'); return; }
    if (!clientData.regiao) { toast.error('Região é obrigatória'); return; }

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
        setor_cliente: clientData.setor_cliente || null,
      };

      let clienteId: string;
      let clienteResult: any;

      if (isEditing) {
        const { data: updated, error } = await supabase
          .from(clienteTable)
          .update(clientPayload)
          .eq('id', editingClienteId!)
          .select()
          .single();
        if (error) throw error;
        clienteId = editingClienteId!;
        clienteResult = updated;

        await supabase.from(contribuinteTable).delete().eq('cliente_id', clienteId);

        const { data: existingContratos } = await (supabase.from(contratoTable) as any).select('id_contrato').eq('id_cliente', clienteId);
        if (existingContratos && existingContratos.length > 0) {
          await (supabase.from(contratoTable) as any).delete().eq('id_cliente', clienteId);
        }

        await (supabase.from(participanteTable) as any).delete().eq('id_cliente', clienteId);
      } else {
        const { data: newCliente, error: clienteError } = await supabase
          .from(clienteTable)
          .insert(clientPayload)
          .select()
          .single();
        if (clienteError) throw clienteError;
        clienteId = newCliente.id;
        clienteResult = newCliente;
      }

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

      console.log('[OS] Dados locais (não salvos no banco):', contracts);

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
    setClientData({ nome: '', categoria: 'Bronze', ativo: true, fixo: 'Sim', telefone: '', municipio: '', uf: '', setor_cliente: '', tipo_produto_segmento: '', tipo_produto_segmento_custom: '', equipe_responsavel: '', regiao: '' });
    setEntities([]);
    setParticipants([]);
    setContracts([]);
    setDraftContract({
      ordem_servico: '', data_emissao: '', nome_projeto: '', descricao_projeto: '',
      data_inicio_projeto: '', data_fim_projeto: '', valor_projeto: 0,
      valor_reembolso_km: 0, valor_reembolso_refeicao: 0, gestor_responsavel: '',
    });
    setActiveTab('cliente');
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
              {isEditing ? 'Editar Cliente' : 'Cadastrar Cliente'}
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
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 pt-4 shrink-0">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="cliente">Dados do Cliente/Grupo</TabsTrigger>
                  <TabsTrigger value="contribuintes">Contribuintes</TabsTrigger>
                  <TabsTrigger value="participantes">Participantes</TabsTrigger>
                  <TabsTrigger value="contratos">OS - Ordem de Serviço</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <TabsContent value="cliente" className="mt-0 p-6 md:p-10">
                  <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-muted/50 border-b flex items-center gap-3">
                      <h3 className="text-lg font-bold text-foreground">Dados do Cliente/Grupo</h3>
                    </div>
                    <div className="p-6 grid grid-cols-12 gap-5">
                      <div className="col-span-12">
                        <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Nome do Cliente / Grupo *</Label>
                        <Input
                          autoFocus
                          value={clientData.nome}
                          onChange={e => setClientData({ ...clientData, nome: e.target.value })}
                          placeholder="Ex: Grupo Empresarial Silva"
                          className="text-base font-bold"
                        />
                      </div>
                      <div className="col-span-6">
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
                      <div className="col-span-6">
                        <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Status</Label>
                        <div className="flex items-center gap-2 h-10">
                          <Switch checked={clientData.ativo} onCheckedChange={c => setClientData({ ...clientData, ativo: c })} />
                          <span className="text-sm">{clientData.ativo ? 'Ativo' : 'Inativo'}</span>
                        </div>
                      </div>
                      <div className="col-span-12">
                        <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Tipo de relacionamento</Label>
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
                      <div className="col-span-12">
                        <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Área do negócio *</Label>
                        <Select value={clientData.setor_cliente || '__none__'} onValueChange={v => setClientData({ ...clientData, setor_cliente: v === '__none__' ? '' : v })}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Selecione...</SelectItem>
                            <SelectItem value="REV">REV - Revendas de insumos, máquinas e cerealistas</SelectItem>
                            <SelectItem value="INS">INS - Instituições do agro</SelectItem>
                            <SelectItem value="COO">COO - Cooperativas agropecuárias</SelectItem>
                            <SelectItem value="AGR">AGR - Produção agropecuária</SelectItem>
                            <SelectItem value="IND">IND - Agroindústria</SelectItem>
                            <SelectItem value="INF">INF - Infraestrutura e concessões</SelectItem>
                            <SelectItem value="DIV">DIV - Outros diversos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-12">
                        <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Tipo de produto/segmento *</Label>
                        <Select value={clientData.tipo_produto_segmento || '__none__'} onValueChange={v => setClientData({ ...clientData, tipo_produto_segmento: v === '__none__' ? '' : v, tipo_produto_segmento_custom: v !== '__outro__' ? '' : clientData.tipo_produto_segmento_custom })}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Selecione...</SelectItem>
                            {PRODUTO_SEGMENTO_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {clientData.tipo_produto_segmento === '__outro__' && (
                          <Input
                            className="mt-2"
                            value={clientData.tipo_produto_segmento_custom}
                            onChange={e => setClientData({ ...clientData, tipo_produto_segmento_custom: e.target.value })}
                            placeholder="Nome do novo produto/segmento"
                          />
                        )}
                      </div>
                      <div className="col-span-12">
                        <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Equipe responsável *</Label>
                        <Select value={clientData.equipe_responsavel || '__none__'} onValueChange={v => setClientData({ ...clientData, equipe_responsavel: v === '__none__' ? '' : v })}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Selecione...</SelectItem>
                            <SelectItem value="Administracao Executiva">Administração Executiva</SelectItem>
                            <SelectItem value="Administracao Judicial - PSA Adm Judicial">Administração Judicial - PSA Adm Judicial</SelectItem>
                            <SelectItem value="Administrativo">Administrativo</SelectItem>
                            <SelectItem value="Auditoria - PSA Auditores">Auditoria - PSA Auditores</SelectItem>
                            <SelectItem value="Auditoria - PSA Norte">Auditoria - PSA Norte</SelectItem>
                            <SelectItem value="CCR - Prado Advogados">CCR - Prado Advogados</SelectItem>
                            <SelectItem value="Comercial">Comercial</SelectItem>
                            <SelectItem value="Compliance - Prado Advogados">Compliance - Prado Advogados</SelectItem>
                            <SelectItem value="Comunicacao">Comunicação</SelectItem>
                            <SelectItem value="Consultoria Fiscal - PSA Consultores">Consultoria Fiscal - PSA Consultores</SelectItem>
                            <SelectItem value="Consultoria Tributaria - Prado Advogados">Consultoria Tributária - Prado Advogados</SelectItem>
                            <SelectItem value="Legal - Prado Advogados">Legal - Prado Advogados</SelectItem>
                            <SelectItem value="OSG - Protenun">OSG - Protenun</SelectItem>
                            <SelectItem value="Outsourcing - Profitto">Outsourcing - Profitto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-12">
                        <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Região *</Label>
                        <Select value={clientData.regiao || '__none__'} onValueChange={v => setClientData({ ...clientData, regiao: v === '__none__' ? '' : v })}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Selecione...</SelectItem>
                            <SelectItem value="BRA">BRA - Bahia, Goiás, Distrito Federal</SelectItem>
                            <SelectItem value="3NO">3NO - BR-163 Norte</SelectItem>
                            <SelectItem value="3SU">3SU - BR-163 Sul, Vale do Araguaia, Serra da Petrovina, Norte do MS</SelectItem>
                            <SelectItem value="PAR">PAR - Chapadão do Parecis, região sucroalcooleira, Rondônia</SelectItem>
                            <SelectItem value="CBA">CBA - Baixada Cuiabana</SelectItem>
                            <SelectItem value="RAO">RAO - Sul do MS, Paraná, SC, Cerrado Mineiro, São Paulo</SelectItem>
                            <SelectItem value="MPT">MPT - Mapito, BR-010, Pará</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="contribuintes" className="mt-0 p-6 md:p-10">
                  <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-muted/50 border-b flex items-center gap-3">
                      <h3 className="text-lg font-bold text-foreground">Contribuintes ({entities.length})</h3>
                    </div>
                    <div className="p-6">
                      {entities.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          {entities.map(ent => (
                            <div key={ent._id} className="bg-muted/30 border rounded-lg p-4 relative group hover:shadow-md transition-all">
                              <button onClick={() => setEntities(entities.filter(e => e._id !== ent._id))} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 bg-card rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14} />
                              </button>
                              <div className="font-bold text-foreground">{ent.nome_razao_social}</div>
                              <div className="text-xs text-muted-foreground font-mono mt-1">{ent.cpf_cnpj || '-'}</div>
                              {ent.tipo_pessoa === 'PJ' && (
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] bg-card px-2 py-0.5 rounded border font-bold text-foreground">{ent.setor}</span>
                                  {ent.simples_nacional && <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-bold text-foreground">Simples</span>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="bg-muted/50 rounded-lg border p-5">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase mb-4">
                          Novo Contribuinte
                        </h4>
                        <div className="grid grid-cols-12 gap-4">
                          <div className="col-span-3">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Tipo</Label>
                            <Select value={draftEntity.tipo_pessoa || 'PJ'} onValueChange={v => setDraftEntity({ ...draftEntity, tipo_pessoa: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PJ">PJ</SelectItem>
                                <SelectItem value="PF">PF</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-9">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">CPF/CNPJ *</Label>
                            <Input value={draftEntity.cpf_cnpj || ''} onChange={e => setDraftEntity({ ...draftEntity, cpf_cnpj: e.target.value })} placeholder="000.000.000-00" className="font-mono" />
                          </div>
                          <div className="col-span-12">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Razão Social *</Label>
                            <Input value={draftEntity.nome_razao_social || ''} onChange={e => setDraftEntity({ ...draftEntity, nome_razao_social: e.target.value })} placeholder="Nome Empresarial" className="font-medium" />
                          </div>

                          {/* Situação Inscrição Estadual */}
                          <div className="col-span-6">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Inscrição Estadual *</Label>
                            <Select value={draftEntity.situacao_inscricao_estadual || '__none__'} onValueChange={v => setDraftEntity({ ...draftEntity, situacao_inscricao_estadual: v === '__none__' ? '' : v, inscricao_estadual: v !== 'sim' ? '' : (draftEntity.inscricao_estadual || '') })}>
                              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Selecione...</SelectItem>
                                <SelectItem value="sim">Sim</SelectItem>
                                <SelectItem value="isento">Isento</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-6">
                            {draftEntity.situacao_inscricao_estadual === 'sim' && (
                              <>
                                <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Nº Inscrição Estadual *</Label>
                                <Input value={draftEntity.inscricao_estadual || ''} onChange={e => setDraftEntity({ ...draftEntity, inscricao_estadual: e.target.value })} placeholder="Nº Inscrição" />
                              </>
                            )}
                          </div>

                          {draftEntity.tipo_pessoa === 'PJ' && (
                            <>
                              <div className="col-span-4">
                                <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">CNAE *</Label>
                                <Input value={draftEntity.cod_cnae || ''} onChange={e => setDraftEntity({ ...draftEntity, cod_cnae: e.target.value })} placeholder="0000-0/00" />
                              </div>
                              <div className="col-span-4">
                                <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Setor *</Label>
                                <Select value={draftEntity.setor || 'Indústria'} onValueChange={v => setDraftEntity({ ...draftEntity, setor: v })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Indústria">Indústria</SelectItem>
                                    <SelectItem value="Agronegócio">Agronegócio</SelectItem>
                                    <SelectItem value="Transportes">Transportes</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-4">
                                <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Simples Nacional</Label>
                                <div className="flex items-center gap-2 h-10">
                                  <Checkbox
                                    checked={draftEntity.simples_nacional || false}
                                    onCheckedChange={c => setDraftEntity({ ...draftEntity, simples_nacional: !!c })}
                                  />
                                  <span className="text-sm">Optante</span>
                                </div>
                              </div>
                            </>
                          )}
                          <div className="col-span-12">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Logradouro *</Label>
                            <Input value={draftEntity.logradouro || ''} onChange={e => setDraftEntity({ ...draftEntity, logradouro: e.target.value })} placeholder="Rua, Av., Rod..." />
                          </div>
                          <div className="col-span-4">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Bairro *</Label>
                            <Input value={draftEntity.bairro || ''} onChange={e => setDraftEntity({ ...draftEntity, bairro: e.target.value })} />
                          </div>
                          <div className="col-span-5">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Município *</Label>
                            <Input value={draftEntity.municipio || ''} onChange={e => setDraftEntity({ ...draftEntity, municipio: e.target.value })} />
                          </div>
                          <div className="col-span-3">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">UF *</Label>
                            <Input value={draftEntity.uf || ''} onChange={e => setDraftEntity({ ...draftEntity, uf: e.target.value })} maxLength={2} />
                          </div>
                          <div className="col-span-12 flex justify-end mt-2">
                            <Button onClick={addEntity} className="gap-2">
                              Adicionar à Lista
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="participantes" className="mt-0 p-6 md:p-10">
                  <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-muted/50 border-b flex items-center gap-3">
                      <h3 className="text-lg font-bold text-foreground">Participantes ({participants.length})</h3>
                    </div>
                    <div className="p-6">
                      {participants.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          {participants.map(part => (
                            <div key={part._id} className="bg-muted/30 border rounded-lg p-4 relative group hover:shadow-md transition-all">
                              <button onClick={() => setParticipants(participants.filter(p => p._id !== part._id))} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 bg-card rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14} />
                              </button>
                              <div className="font-bold text-foreground">{part.nome}</div>
                              <div className="text-sm text-muted-foreground">{part.cargo}</div>
                              <div className="text-xs text-muted-foreground mt-1">{part.email}</div>
                              {part.observacoes && <div className="text-xs text-muted-foreground mt-1 truncate" title={part.observacoes}>{part.observacoes}</div>}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="bg-muted/50 rounded-lg border p-5">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase mb-4">
                          Novo Participante
                        </h4>
                        <div className="grid grid-cols-12 gap-4">
                          <div className="col-span-6">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Nome Completo *</Label>
                            <Input value={draftParticipant.nome} onChange={e => setDraftParticipant({ ...draftParticipant, nome: e.target.value })} placeholder="Nome do contato" className="font-medium" />
                          </div>
                          <div className="col-span-6">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Cargo *</Label>
                            <Input value={draftParticipant.cargo} onChange={e => setDraftParticipant({ ...draftParticipant, cargo: e.target.value })} />
                          </div>
                          <div className="col-span-6">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Email</Label>
                            <Input value={draftParticipant.email} onChange={e => setDraftParticipant({ ...draftParticipant, email: e.target.value })} />
                          </div>
                          <div className="col-span-6">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Telefone</Label>
                            <Input value={draftParticipant.telefone} onChange={e => setDraftParticipant({ ...draftParticipant, telefone: e.target.value })} />
                          </div>
                          <div className="col-span-12">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Observações</Label>
                            <Textarea
                              value={draftParticipant.observacoes}
                              onChange={e => setDraftParticipant({ ...draftParticipant, observacoes: e.target.value })}
                              placeholder="Observações sobre o participante (mín. 20 caracteres se preenchido)..."
                              className="min-h-[60px]"
                            />
                          </div>
                          <div className="col-span-12 flex justify-end mt-2">
                            <Button onClick={addParticipant} className="gap-2">
                              Adicionar à Lista
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="contratos" className="mt-0 p-6 md:p-10">
                  <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-muted/50 border-b flex items-center gap-3">
                      <h3 className="text-lg font-bold text-foreground">OS - Ordem de Serviço ({contracts.length})</h3>
                    </div>
                    <div className="p-6">
                      {contracts.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                          {contracts.map(cont => (
                             <div key={cont._id} className="bg-muted/30 border rounded-lg p-4 relative group hover:shadow-md transition-all">
                              <button onClick={() => setContracts(contracts.filter(c => c._id !== cont._id))} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 bg-card rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14} />
                              </button>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-muted text-foreground">OS {cont.ordem_servico}</span>
                                <span className="text-xs text-muted-foreground">{cont.gestor_responsavel || '—'}</span>
                              </div>
                              <div className="font-semibold text-sm text-foreground truncate">{cont.nome_projeto}</div>
                              <div className="font-bold text-lg text-foreground mt-1">{formatCurrency(cont.valor_projeto)}</div>
                              <div className="flex gap-3 text-[11px] text-muted-foreground mt-2">
                                {cont.data_inicio_projeto && <span>Início: {cont.data_inicio_projeto}</span>}
                                {cont.data_fim_projeto && <span>Fim: {cont.data_fim_projeto}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="bg-muted/50 rounded-lg border p-5">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase mb-4">
                          Nova OS
                        </h4>
                        <div className="grid grid-cols-12 gap-4">
                          <div className="col-span-6">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Ordem de Serviço *</Label>
                            <Input value={draftContract.ordem_servico} onChange={e => setDraftContract({ ...draftContract, ordem_servico: e.target.value })} placeholder="OS-001" />
                          </div>
                          <div className="col-span-6">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Data de Emissão *</Label>
                            <Input type="date" value={draftContract.data_emissao} onChange={e => setDraftContract({ ...draftContract, data_emissao: e.target.value })} />
                          </div>
                          <div className="col-span-12">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Gestor Responsável *</Label>
                            <Select value={draftContract.gestor_responsavel || '__none__'} onValueChange={v => setDraftContract({ ...draftContract, gestor_responsavel: v === '__none__' ? '' : v })}>
                              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Selecione...</SelectItem>
                                {lideres.map(l => (
                                  <SelectItem key={l.id} value={l.nome}>{l.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-12">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Nome do Projeto *</Label>
                            <Input value={draftContract.nome_projeto} onChange={e => setDraftContract({ ...draftContract, nome_projeto: e.target.value })} />
                          </div>
                          <div className="col-span-12">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Descrição do Projeto</Label>
                            <Textarea
                              value={draftContract.descricao_projeto}
                              onChange={e => setDraftContract({ ...draftContract, descricao_projeto: e.target.value })}
                              placeholder="Mín. 20 caracteres se preenchido..."
                              className="min-h-[80px]"
                            />
                          </div>
                          <div className="col-span-6">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Data Início *</Label>
                            <Input type="date" value={draftContract.data_inicio_projeto} onChange={e => setDraftContract({ ...draftContract, data_inicio_projeto: e.target.value })} />
                          </div>
                          <div className="col-span-6">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Data Fim</Label>
                            <Input type="date" value={draftContract.data_fim_projeto} onChange={e => setDraftContract({ ...draftContract, data_fim_projeto: e.target.value })} />
                          </div>
                          <div className="col-span-12">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Valor do Projeto (R$) *</Label>
                            <Input type="number" value={draftContract.valor_projeto} onChange={e => setDraftContract({ ...draftContract, valor_projeto: Number(e.target.value) })} />
                          </div>
                          <div className="col-span-6">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Reembolso por km (R$)</Label>
                            <Input type="number" value={draftContract.valor_reembolso_km} onChange={e => setDraftContract({ ...draftContract, valor_reembolso_km: Number(e.target.value) })} />
                          </div>
                          <div className="col-span-6">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Reembolso refeição (R$)</Label>
                            <Input type="number" value={draftContract.valor_reembolso_refeicao} onChange={e => setDraftContract({ ...draftContract, valor_reembolso_refeicao: Number(e.target.value) })} />
                          </div>
                        </div>

                        <div className="flex justify-end mt-4 pt-2 border-t">
                          <Button onClick={addContract} className="gap-2">
                            Adicionar OS à Lista
                          </Button>
                        </div>
                      </div>
                    </div>
                  </section>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            {/* Footer */}
            <div className="p-6 border-t bg-card flex justify-between shrink-0">
              <div>
                {!isFirstTab && (
                  <Button variant="outline" onClick={handleBack} className="gap-2">
                    <ChevronLeft size={16} /> Voltar
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
                {isLastTab ? (
                  <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={20} />}
                    {isEditing ? 'Salvar Alterações' : 'Salvar Cliente'}
                  </Button>
                ) : (
                  <Button onClick={handleNext} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                    Avançar <ChevronRight size={16} />
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
