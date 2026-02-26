import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { isProductionEnvironment } from '@/config/api';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, X, Trash2, Building2, Loader2, CheckCircle2, Pencil, ChevronRight, ChevronLeft, Search, ChevronDown, Save, Copy, CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { parseDate } from '@/lib/dateUtils';
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

const TIPO_PARTICIPANTE_OPTIONS = [
  'Sócio/Proprietário',
  'Contador',
  'Advogado',
  'Procurador',
  'Representante Legal',
  'Diretor/Gestor',
  'Consultor Externo',
  'Outros',
];

// Types for draft items
interface DraftEntity {
  _id: number;
  tipo_pessoa: string;
  cpf_cnpj: string;
  nome_razao_social: string;
  nome_fantasia: string;
  situacao_inscricao_estadual: string; // 'sim' | 'isento' | 'nao' | ''
  inscricao_estadual: string;
  cod_cnae: string;
  setor: string;
  simples_nacional: boolean;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
}

interface DraftParticipant {
  _id: number;
  nome: string;
  tipo_participante: string;
  cargo: string;
  email: string;
  telefone: string;
  observacoes: string;
  acesso_chamados: boolean;
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

// --- Mask utilities ---
const formatCpfCnpj = (value: string, tipo: string): string => {
  const digits = value.replace(/\D/g, '');
  if (tipo === 'PF') {
    const d = digits.slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  const d = digits.slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

const formatCep = (value: string): string => {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

const formatPhone = (value: string): string => {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

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
  readOnly?: boolean;
}

export default function NewClientModal({ open, onOpenChange, editingClienteId, readOnly = false }: NewClientModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'cliente' | 'contribuintes' | 'participantes' | 'contratos'>('cliente');
  const [isReadOnly, setIsReadOnly] = useState(readOnly);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Inline expand/edit states
  const [expandedEntityId, setExpandedEntityId] = useState<number | null>(null);
  const [editingEntityId, setEditingEntityId] = useState<number | null>(null);
  const [editingEntityData, setEditingEntityData] = useState<Partial<DraftEntity> | null>(null);

  const [expandedParticipantId, setExpandedParticipantId] = useState<number | null>(null);
  const [editingParticipantId, setEditingParticipantId] = useState<number | null>(null);
  const [editingParticipantData, setEditingParticipantData] = useState<Partial<DraftParticipant> | null>(null);

  const [expandedContractId, setExpandedContractId] = useState<number | null>(null);
  const [editingContractId, setEditingContractId] = useState<number | null>(null);
  const [editingContractData, setEditingContractData] = useState<Partial<DraftContract> | null>(null);

  // Sync isReadOnly when modal opens or readOnly prop changes
  useEffect(() => {
    if (open) setIsReadOnly(readOnly);
  }, [open, readOnly]);

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

  // Default states
  const defaultClientData = {
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
    empresa_faturamento: '',
    regiao: '',
  };

  // Section 1 - Client data
  const [clientData, setClientData] = useState(defaultClientData);

  // Section 2 - Contribuintes
  const [entities, setEntities] = useState<DraftEntity[]>([]);
  const [draftEntity, setDraftEntity] = useState<Partial<DraftEntity>>({
    tipo_pessoa: 'PJ', cpf_cnpj: '', nome_razao_social: '', nome_fantasia: '',
    situacao_inscricao_estadual: '', inscricao_estadual: '',
    cod_cnae: '', setor: 'Indústria', simples_nacional: false,
    cep: '', logradouro: '', numero: '', complemento: '',
    bairro: '', municipio: '', uf: '',
  });

  // Section 3 - Participantes
  const [participants, setParticipants] = useState<DraftParticipant[]>([]);
  const [draftParticipant, setDraftParticipant] = useState({
    nome: '', tipo_participante: '', cargo: '', email: '', telefone: '', observacoes: '', acesso_chamados: false,
  });

  // Section 4 - OS (Ordem de Serviço)
  const [contracts, setContracts] = useState<DraftContract[]>([]);
  const [draftContract, setDraftContract] = useState({
    ordem_servico: '', data_emissao: '', nome_projeto: '', descricao_projeto: '',
    data_inicio_projeto: '', data_fim_projeto: '', valor_projeto: 0,
    valor_reembolso_km: 0, valor_reembolso_refeicao: 0, gestor_responsavel: '',
  });

  // --- Unsaved changes detection ---
  const initialSnapshotRef = useRef<string | null>(null);

  const currentSnapshot = useMemo(() => JSON.stringify({ clientData, entities, participants, contracts }), [clientData, entities, participants, contracts]);

  const hasUnsavedChanges = useMemo(() => {
    if (!initialSnapshotRef.current) return false;
    return currentSnapshot !== initialSnapshotRef.current;
  }, [currentSnapshot]);

  // Capture initial snapshot once loading completes
  useEffect(() => {
    if (open && !loadingEdit) {
      // Small delay to let restored/loaded data settle
      const t = setTimeout(() => {
        initialSnapshotRef.current = JSON.stringify({ clientData, entities, participants, contracts });
      }, 100);
      return () => clearTimeout(t);
    }
    if (!open) {
      initialSnapshotRef.current = null;
    }
  }, [open, loadingEdit]);

  // Beforeunload protection
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // Draft persistence for new client mode
  const draftValues = useMemo(() => ({
    clientData, entities, participants, contracts,
  }), [clientData, entities, participants, contracts]);
  const draftEnabled = open && !isEditing;
  const { restore: restoreDraft, clear: clearDraft } = useDraftPersistence(
    'newclient-form-draft', draftValues, draftEnabled, user?.id,
  );

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
            empresa_faturamento: (cli as any).empresa_faturamento || '',
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
            nome_fantasia: '',
            situacao_inscricao_estadual: c.inscricao_estadual ? 'sim' : 'isento',
            inscricao_estadual: c.inscricao_estadual || '',
            cod_cnae: c.cod_cnae || '',
            setor: c.setor || '',
            simples_nacional: c.simples_nacional ?? false,
            cep: '',
            logradouro: '',
            numero: '',
            complemento: '',
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
            tipo_participante: (p as any).tipo_participante || '',
            cargo: p.cargo || '',
            email: p.email || '',
            telefone: p.telefone || '',
            observacoes: (p as any).observacoes || '',
            acesso_chamados: (p as any).acesso_chamados ?? false,
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

  // Restore draft for new client mode
  useEffect(() => {
    if (!open || isEditing) return;
    const saved = restoreDraft();
    if (saved) {
      if (saved.clientData) setClientData(saved.clientData);
      if (saved.entities) setEntities(saved.entities);
      if (saved.participants) setParticipants(saved.participants);
      if (saved.contracts) setContracts(saved.contracts);
    }
  }, [open, isEditing]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // --- ENTITY HANDLERS ---
  // --- CNPJ FETCH ---
  const handleCnpjBlur = async (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 14) return;
    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      setDraftEntity(prev => ({
        ...prev,
        nome_razao_social: data.razao_social || prev?.nome_razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        cod_cnae: data.cnae_fiscal ? String(data.cnae_fiscal) : (prev?.cod_cnae || ''),
        cep: data.cep ? String(data.cep).replace(/\D/g, '') : (prev?.cep || ''),
        logradouro: data.logradouro || prev?.logradouro || '',
        numero: data.numero || prev?.numero || '',
        complemento: data.complemento || prev?.complemento || '',
        bairro: data.bairro || prev?.bairro || '',
        municipio: data.municipio || prev?.municipio || '',
        uf: data.uf || prev?.uf || '',
      }));
      toast.success('Dados preenchidos via CNPJ');
    } catch {
      toast.error('CNPJ não encontrado na base federal');
    } finally {
      setCnpjLoading(false);
    }
  };

  // --- CEP FETCH ---
  const handleCepBlur = async (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error('not found');
      setDraftEntity(prev => ({
        ...prev,
        logradouro: data.logradouro || prev?.logradouro || '',
        bairro: data.bairro || prev?.bairro || '',
        municipio: data.localidade || prev?.municipio || '',
        uf: data.uf || prev?.uf || '',
      }));
      toast.success('Endereço preenchido via CEP');
    } catch {
      toast.error('CEP não encontrado');
    } finally {
      setCepLoading(false);
    }
  };

  const addEntity = () => {
    if (!draftEntity.nome_razao_social?.trim()) { toast.error('Razão Social é obrigatória'); return; }
    
    const cpfCnpjDigits = (draftEntity.cpf_cnpj || '').replace(/\D/g, '');
    if (!cpfCnpjDigits) { toast.error('CPF/CNPJ é obrigatório'); return; }
    if (cpfCnpjDigits.length !== 11 && cpfCnpjDigits.length !== 14) {
      toast.error('CPF deve ter 11 dígitos ou CNPJ 14 dígitos'); return;
    }

    if (!draftEntity.cep?.trim()) { toast.error('CEP é obrigatório'); return; }
    if (!draftEntity.logradouro?.trim()) { toast.error('Logradouro é obrigatório'); return; }
    if (!draftEntity.bairro?.trim()) { toast.error('Bairro é obrigatório'); return; }
    if (!draftEntity.municipio?.trim()) { toast.error('Município é obrigatório'); return; }
    if (!draftEntity.uf?.trim() || (draftEntity.uf?.trim().length !== 2)) { toast.error('UF deve ter 2 caracteres'); return; }

    if (!draftEntity.situacao_inscricao_estadual) { toast.error('Informe a situação da inscrição estadual'); return; }
    if (draftEntity.situacao_inscricao_estadual === 'sim' && !draftEntity.inscricao_estadual?.trim()) { toast.error('Informe o número da inscrição estadual'); return; }

    if (draftEntity.tipo_pessoa === 'PJ') {
      if (!draftEntity.cod_cnae?.trim()) { toast.error('CNAE é obrigatório para PJ'); return; }
    }

    setEntities([...entities, { ...draftEntity, _id: Date.now() + Math.random() } as DraftEntity]);
    setDraftEntity({
      tipo_pessoa: 'PJ', cpf_cnpj: '', nome_razao_social: '', nome_fantasia: '',
      situacao_inscricao_estadual: '', inscricao_estadual: '',
      cod_cnae: '', setor: 'Indústria', simples_nacional: false,
      cep: '', logradouro: '', numero: '', complemento: '',
      bairro: '', municipio: '', uf: '',
    });
  };

  // --- PARTICIPANT HANDLERS ---
  const addParticipant = () => {
    if (!draftParticipant.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!draftParticipant.tipo_participante) { toast.error('Tipo de Participante é obrigatório'); return; }

    if (!draftParticipant.email.trim()) { toast.error('Email é obrigatório'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(draftParticipant.email.trim())) { toast.error('Formato de e-mail inválido'); return; }

    if (draftParticipant.telefone.trim()) {
      const telDigits = draftParticipant.telefone.replace(/\D/g, '');
      if (telDigits.length < 10) { toast.error('Telefone deve ter no mínimo 10 dígitos'); return; }
    }

    if (draftParticipant.observacoes.trim() && draftParticipant.observacoes.trim().length < 20) {
      toast.error('Observações deve ter no mínimo 20 caracteres'); return;
    }

    setParticipants([...participants, { ...draftParticipant, _id: Date.now() + Math.random() } as DraftParticipant]);
    setDraftParticipant({ nome: '', tipo_participante: '', cargo: '', email: '', telefone: '', observacoes: '', acesso_chamados: false });
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

  // --- INLINE EDIT HELPERS ---
  const handleInlineCnpjBlur = async (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 14) return;
    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      setEditingEntityData(prev => prev ? ({
        ...prev,
        nome_razao_social: data.razao_social || prev.nome_razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        cod_cnae: data.cnae_fiscal ? String(data.cnae_fiscal) : (prev.cod_cnae || ''),
        cep: data.cep ? String(data.cep).replace(/\D/g, '') : (prev.cep || ''),
        logradouro: data.logradouro || prev.logradouro || '',
        numero: data.numero || prev.numero || '',
        complemento: data.complemento || prev.complemento || '',
        bairro: data.bairro || prev.bairro || '',
        municipio: data.municipio || prev.municipio || '',
        uf: data.uf || prev.uf || '',
      }) : prev);
      toast.success('Dados preenchidos via CNPJ');
    } catch { toast.error('CNPJ não encontrado'); }
    finally { setCnpjLoading(false); }
  };

  const handleInlineCepBlur = async (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error('not found');
      setEditingEntityData(prev => prev ? ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro || '',
        bairro: data.bairro || prev.bairro || '',
        municipio: data.localidade || prev.municipio || '',
        uf: data.uf || prev.uf || '',
      }) : prev);
      toast.success('Endereço preenchido via CEP');
    } catch { toast.error('CEP não encontrado'); }
    finally { setCepLoading(false); }
  };

  const startEditEntity = (ent: DraftEntity) => {
    setEditingEntityId(ent._id);
    setEditingEntityData({ ...ent });
  };
  const cancelEditEntity = () => { setEditingEntityId(null); setEditingEntityData(null); };
  const saveEditEntity = () => {
    if (!editingEntityData || editingEntityId == null) return;
    if (!editingEntityData.cep?.trim()) { toast.error('CEP é obrigatório'); return; }
    setEntities(entities.map(e => e._id === editingEntityId ? { ...e, ...editingEntityData } as DraftEntity : e));
    setEditingEntityId(null); setEditingEntityData(null);
    toast.success('Contribuinte atualizado');
  };

  const startEditParticipant = (p: DraftParticipant) => {
    setEditingParticipantId(p._id);
    setEditingParticipantData({ ...p });
  };
  const cancelEditParticipant = () => { setEditingParticipantId(null); setEditingParticipantData(null); };
  const saveEditParticipant = () => {
    if (!editingParticipantData || editingParticipantId == null) return;
    setParticipants(participants.map(p => p._id === editingParticipantId ? { ...p, ...editingParticipantData } as DraftParticipant : p));
    setEditingParticipantId(null); setEditingParticipantData(null);
    toast.success('Participante atualizado');
  };

  const startEditContract = (c: DraftContract) => {
    setEditingContractId(c._id);
    setEditingContractData({ ...c });
  };
  const cancelEditContract = () => { setEditingContractId(null); setEditingContractData(null); };
  const saveEditContract = () => {
    if (!editingContractData || editingContractId == null) return;
    setContracts(contracts.map(c => c._id === editingContractId ? { ...c, ...editingContractData } as DraftContract : c));
    setEditingContractId(null); setEditingContractData(null);
    toast.success('OS atualizada');
  };

  // Field display helper
  const FieldPair = ({ label, value }: { label: string; value: string | undefined }) => (
    <div>
      <span className="text-[10px] font-bold uppercase text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground">{value || '—'}</div>
    </div>
  );

  // --- Copy address from first entity ---
  const handleCopyFirstAddress = () => {
    if (entities.length === 0) return;
    const first = entities[0];
    if (!first.cep?.trim()) {
      toast.warning('O primeiro contribuinte não possui endereço cadastrado');
      return;
    }
    setDraftEntity(prev => ({
      ...prev,
      cep: first.cep,
      logradouro: first.logradouro,
      numero: first.numero,
      complemento: first.complemento,
      bairro: first.bairro,
      municipio: first.municipio,
      uf: first.uf,
    }));
    toast.success('Endereço copiado do primeiro contribuinte');
  };

  // --- FINAL SAVE ---
  const handleSave = async () => {
    if (!clientData.nome.trim()) { toast.error('Nome do cliente é obrigatório'); return; }

    if (!clientData.setor_cliente) { toast.error('Área do negócio é obrigatória'); return; }
    if (!clientData.tipo_produto_segmento) { toast.error('Tipo de produto/segmento é obrigatório'); return; }
    if (clientData.tipo_produto_segmento === '__outro__' && !clientData.tipo_produto_segmento_custom.trim()) {
      toast.error('Informe o nome do produto/segmento personalizado'); return;
    }
    if (!clientData.empresa_faturamento) { toast.error('Empresa / Faturamento é obrigatória'); return; }
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
    setClientData({ ...defaultClientData });
    setEntities([]);
    setParticipants([]);
    setContracts([]);
    setDraftContract({
      ordem_servico: '', data_emissao: '', nome_projeto: '', descricao_projeto: '',
      data_inicio_projeto: '', data_fim_projeto: '', valor_projeto: 0,
      valor_reembolso_km: 0, valor_reembolso_refeicao: 0, gestor_responsavel: '',
    });
    setDraftParticipant({ nome: '', tipo_participante: '', cargo: '', email: '', telefone: '', observacoes: '', acesso_chamados: false });
    setActiveTab('cliente');
    setIsReadOnly(readOnly);
    setShowExitConfirm(false);
    clearDraft();
    onOpenChange(false);
  };

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else {
      resetAndClose();
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleAttemptClose(); }}>
      <DialogContent
        className={cn(
          "max-w-5xl h-[95vh] p-0 flex flex-col overflow-hidden gap-0",
          "[&>button]:hidden"
        )}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">
          {isEditing ? 'Editar Cliente' : 'Cadastrar Cliente'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulário de cadastro de cliente com contribuintes, participantes e contratos
        </DialogDescription>
        {/* Header */}
        <div className="px-6 py-3 border-b flex justify-between items-center bg-muted/50 shrink-0">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            {isReadOnly ? (
              <Building2 className="text-teal-600" size={22} />
            ) : isEditing ? (
              <Pencil className="text-teal-600" size={22} />
            ) : (
              <Plus className="text-teal-600" size={22} />
            )}
            {isReadOnly ? 'Visualizar Cliente' : isEditing ? 'Editar Cliente' : 'Cadastrar Cliente'}
          </h2>
          <div className="flex items-center gap-2">
            {isReadOnly && (
              <Button
                onClick={() => setIsReadOnly(false)}
                className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                size="sm"
              >
                <Pencil size={14} />
                Editar
              </Button>
            )}
            <button onClick={handleAttemptClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
              <X size={22} />
            </button>
          </div>
        </div>

        {loadingEdit ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 pt-2 shrink-0">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="cliente">Dados do Cliente/Grupo</TabsTrigger>
                  <TabsTrigger value="contribuintes">Contribuintes</TabsTrigger>
                  <TabsTrigger value="participantes">Participantes</TabsTrigger>
                  <TabsTrigger value="contratos">OS - Ordem de Serviço</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <TabsContent value="cliente" className="mt-0 p-3 md:p-4">
                  <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="px-4 py-2 bg-muted/50 border-b">
                      <h3 className="text-sm font-bold text-foreground">Dados do Cliente/Grupo</h3>
                    </div>
                    <div className="px-4 py-3 flex flex-col gap-2.5">

                      {/* 1. Nome */}
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                        <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">Nome do Cliente / Grupo *</Label>
                        <Input
                          autoFocus={!isReadOnly}
                          disabled={isReadOnly}
                          value={clientData.nome}
                          onChange={e => setClientData({ ...clientData, nome: e.target.value })}
                          placeholder="Ex: Grupo Empresarial Silva"
                          className="flex-1 h-8"
                        />
                      </div>

                      {/* 2. Categoria */}
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                        <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">Categoria</Label>
                        <Select disabled={isReadOnly} value={clientData.categoria} onValueChange={v => setClientData({ ...clientData, categoria: v })}>
                          <SelectTrigger className="flex-1 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Bronze">Bronze</SelectItem>
                            <SelectItem value="Prata">Prata</SelectItem>
                            <SelectItem value="Ouro">Ouro</SelectItem>
                            <SelectItem value="Diamante">Diamante</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 3. Status */}
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                        <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">Status</Label>
                        <div className="flex items-center gap-2">
                          <Switch disabled={isReadOnly} checked={clientData.ativo} onCheckedChange={c => setClientData({ ...clientData, ativo: c })} />
                          <span className="text-xs font-medium">{clientData.ativo ? 'Ativo' : 'Inativo'}</span>
                        </div>
                      </div>

                      {/* 4. Tipo de Relacionamento */}
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                        <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">Tipo de relacionamento</Label>
                        <div className="flex border rounded-md overflow-hidden">
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => setClientData({ ...clientData, fixo: 'Sim' })}
                            className={`px-4 py-1.5 text-xs font-semibold transition-colors ${clientData.fixo === 'Sim' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                          >Fixo</button>
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => setClientData({ ...clientData, fixo: 'Não' })}
                            className={`px-4 py-1.5 text-xs font-semibold border-l transition-colors ${clientData.fixo === 'Não' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                          >Pontual</button>
                        </div>
                      </div>

                      {/* 5. Área do Negócio */}
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                        <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">Área do negócio *</Label>
                        <Select disabled={isReadOnly} value={clientData.setor_cliente || '__none__'} onValueChange={v => setClientData({ ...clientData, setor_cliente: v === '__none__' ? '' : v })}>
                          <SelectTrigger className="flex-1 h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
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

                      {/* 6. Tipo de produto/segmento */}
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                          <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">Tipo de produto/segmento *</Label>
                          <Select disabled={isReadOnly} value={clientData.tipo_produto_segmento || '__none__'} onValueChange={v => setClientData({ ...clientData, tipo_produto_segmento: v === '__none__' ? '' : v, tipo_produto_segmento_custom: v !== '__outro__' ? '' : clientData.tipo_produto_segmento_custom })}>
                            <SelectTrigger className="flex-1 h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Selecione...</SelectItem>
                              {PRODUTO_SEGMENTO_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {clientData.tipo_produto_segmento === '__outro__' && (
                          <div className="md:ml-[12.75rem] md:pl-3">
                            <Input
                              disabled={isReadOnly}
                              className="h-8"
                              value={clientData.tipo_produto_segmento_custom}
                              onChange={e => setClientData({ ...clientData, tipo_produto_segmento_custom: e.target.value })}
                              placeholder="Nome do novo produto/segmento"
                            />
                          </div>
                        )}
                      </div>

                      {/* 7. Região */}
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                        <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">Região *</Label>
                        <Select disabled={isReadOnly} value={clientData.regiao || '__none__'} onValueChange={v => setClientData({ ...clientData, regiao: v === '__none__' ? '' : v })}>
                          <SelectTrigger className="flex-1 h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
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

                      {/* 8. Empresa / Faturamento */}
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                        <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">Empresa / Faturamento *</Label>
                        <Select disabled={isReadOnly} value={clientData.empresa_faturamento || '__none__'} onValueChange={v => setClientData({ ...clientData, empresa_faturamento: v === '__none__' ? '' : v })}>
                          <SelectTrigger className="flex-1 h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Selecione...</SelectItem>
                            <SelectItem value="PRADO ADVOGADOS">PRADO ADVOGADOS</SelectItem>
                            <SelectItem value="PRADO CONSULTORES">PRADO CONSULTORES</SelectItem>
                            <SelectItem value="PRADO SUZUKI">PRADO SUZUKI</SelectItem>
                            <SelectItem value="PROFITTO">PROFITTO</SelectItem>
                            <SelectItem value="PROTENUN">PROTENUN</SelectItem>
                            <SelectItem value="PSA ADM JUDICIAL">PSA ADM JUDICIAL</SelectItem>
                            <SelectItem value="PSA AUDITORES">PSA AUDITORES</SelectItem>
                            <SelectItem value="PSA NORTE">PSA NORTE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="contribuintes" className="mt-0 p-3 md:p-4">
                  <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-3">
                      <h3 className="text-sm font-bold text-foreground">Contribuintes ({entities.length})</h3>
                    </div>
                    <div className="px-4 py-3">
                      {entities.length > 0 && (
                        <div className="space-y-3 mb-4">
                          {entities.map(ent => {
                            const isExpanded = expandedEntityId === ent._id;
                            const isEditingThis = editingEntityId === ent._id;
                            const ed = isEditingThis ? editingEntityData : null;
                            return (
                              <div key={ent._id} className="bg-muted/30 border rounded-lg overflow-hidden transition-all hover:shadow-md">
                                {/* Header - always visible */}
                                <button
                                  type="button"
                                  className="w-full flex items-center justify-between p-4 text-left"
                                  onClick={() => { if (!isEditingThis) setExpandedEntityId(isExpanded ? null : ent._id); }}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-foreground truncate">{ent.nome_razao_social}</div>
                                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{ent.cpf_cnpj || '-'}</div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-2">
                                    {ent.simples_nacional && <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-bold text-foreground">Simples</span>}
                                    <Badge variant="outline" className="text-[10px]">{ent.tipo_pessoa}</Badge>
                                    <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                                  </div>
                                </button>

                                {/* Expanded content */}
                                {isExpanded && !isEditingThis && (
                                  <div className="px-4 pb-4 border-t pt-3">
                                    <div className="flex justify-end gap-2 mb-3">
                                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={(e) => { e.stopPropagation(); startEditEntity(ent); }}>
                                        <Pencil size={12} /> Editar
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button size="sm" variant="outline" className="gap-1.5 text-xs text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                                            <Trash2 size={12} /> Remover
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Remover contribuinte</AlertDialogTitle>
                                            <AlertDialogDescription>Tem certeza que deseja remover "{ent.nome_razao_social}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setEntities(entities.filter(x => x._id !== ent._id)); setExpandedEntityId(null); }}>Remover</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                                      <FieldPair label="Tipo Pessoa" value={ent.tipo_pessoa} />
                                      <FieldPair label="CPF/CNPJ" value={ent.cpf_cnpj} />
                                      <FieldPair label="Razão Social / Nome Completo" value={ent.nome_razao_social} />
                                      <FieldPair label="Nome Fantasia" value={ent.nome_fantasia} />
                                      <FieldPair label="Inscrição Estadual" value={ent.situacao_inscricao_estadual === 'isento' ? 'Isento' : ent.situacao_inscricao_estadual === 'nao' ? 'Não' : (ent.inscricao_estadual || '—')} />
                                      {ent.tipo_pessoa === 'PJ' && <FieldPair label="CNAE" value={ent.cod_cnae} />}
                                      {ent.tipo_pessoa === 'PJ' && <FieldPair label="Simples Nacional" value={ent.simples_nacional ? 'Sim' : 'Não'} />}
                                      <FieldPair label="CEP" value={ent.cep} />
                                      <FieldPair label="Logradouro" value={ent.logradouro} />
                                      <FieldPair label="Número" value={ent.numero} />
                                      <FieldPair label="Complemento" value={ent.complemento} />
                                      <FieldPair label="Bairro" value={ent.bairro} />
                                      <FieldPair label="Município" value={ent.municipio} />
                                      <FieldPair label="UF" value={ent.uf} />
                                    </div>
                                  </div>
                                )}

                                {/* Inline edit mode */}
                                {isExpanded && isEditingThis && ed && (
                                  <div className="px-4 pb-4 border-t pt-3">
                                    <div className="flex flex-col gap-2.5">
                                      {/* Tipo */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Tipo</Label>
                                        <div className="flex-1">
                                          <Select value={ed.tipo_pessoa || 'PJ'} onValueChange={v => setEditingEntityData({ ...ed, tipo_pessoa: v, cpf_cnpj: '' })}>
                                            <SelectTrigger className="h-8 max-w-[160px]"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="PJ">PJ</SelectItem><SelectItem value="PF">PF</SelectItem></SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                      {/* CPF/CNPJ */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">CPF/CNPJ</Label>
                                        <div className="flex-1">
                                          <div className="relative">
                                            <Input value={ed.cpf_cnpj || ''} onChange={e => setEditingEntityData({ ...ed, cpf_cnpj: formatCpfCnpj(e.target.value, ed.tipo_pessoa || 'PJ') })} onBlur={e => handleInlineCnpjBlur(e.target.value)} className="font-mono pr-8 h-8" />
                                            {cnpjLoading && <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />}
                                          </div>
                                        </div>
                                      </div>
                                      {/* Razão Social */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Razão Social *</Label>
                                        <div className="flex-1">
                                          <Input value={ed.nome_razao_social || ''} onChange={e => setEditingEntityData({ ...ed, nome_razao_social: e.target.value })} className="font-medium h-8" />
                                        </div>
                                      </div>
                                      {/* Nome Fantasia */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Nome Fantasia</Label>
                                        <div className="flex-1">
                                          <Input value={ed.nome_fantasia || ''} onChange={e => setEditingEntityData({ ...ed, nome_fantasia: e.target.value })} disabled={ed.tipo_pessoa === 'PF'} className="h-8" />
                                        </div>
                                      </div>
                                      {/* Inscrição Estadual */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Inscrição Estadual</Label>
                                        <div className="flex-1">
                                          <Select value={ed.situacao_inscricao_estadual || '__none__'} onValueChange={v => setEditingEntityData({ ...ed, situacao_inscricao_estadual: v === '__none__' ? '' : v, inscricao_estadual: v !== 'sim' ? '' : (ed.inscricao_estadual || '') })}>
                                            <SelectTrigger className="h-8 max-w-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent><SelectItem value="__none__">Selecione...</SelectItem><SelectItem value="sim">Sim</SelectItem><SelectItem value="isento">Isento</SelectItem><SelectItem value="nao">Não</SelectItem></SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                      {/* Nº IE */}
                                      {ed.situacao_inscricao_estadual === 'sim' && (
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Nº IE</Label>
                                          <div className="flex-1">
                                            <Input value={ed.inscricao_estadual || ''} onChange={e => setEditingEntityData({ ...ed, inscricao_estadual: e.target.value })} className="h-8" />
                                          </div>
                                        </div>
                                      )}
                                      {/* CNAE */}
                                      {ed.tipo_pessoa === 'PJ' && (
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">CNAE</Label>
                                          <div className="flex-1">
                                            <Input value={ed.cod_cnae || ''} onChange={e => setEditingEntityData({ ...ed, cod_cnae: e.target.value })} className="h-8 max-w-[200px]" />
                                          </div>
                                        </div>
                                      )}
                                      {/* Simples Nacional */}
                                      {ed.tipo_pessoa === 'PJ' && (
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Simples Nacional</Label>
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 h-8">
                                              <Checkbox checked={ed.simples_nacional || false} onCheckedChange={c => setEditingEntityData({ ...ed, simples_nacional: !!c })} />
                                              <span className="text-sm">Optante</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      {/* CEP */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">CEP *</Label>
                                        <div className="flex-1">
                                          <div className="relative max-w-[160px]">
                                            <Input value={ed.cep || ''} onChange={e => setEditingEntityData({ ...ed, cep: formatCep(e.target.value) })} onBlur={e => handleInlineCepBlur(e.target.value)} className="font-mono pr-8 h-8" />
                                            {cepLoading && <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />}
                                          </div>
                                        </div>
                                      </div>
                                      {/* UF */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">UF</Label>
                                        <div className="flex-1">
                                          <Input value={ed.uf || ''} onChange={e => setEditingEntityData({ ...ed, uf: e.target.value })} maxLength={2} className="h-8 max-w-[120px]" />
                                        </div>
                                      </div>
                                      {/* Município */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Município</Label>
                                        <div className="flex-1">
                                          <Input value={ed.municipio || ''} onChange={e => setEditingEntityData({ ...ed, municipio: e.target.value })} className="h-8" />
                                        </div>
                                      </div>
                                      {/* Bairro */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Bairro</Label>
                                        <div className="flex-1">
                                          <Input value={ed.bairro || ''} onChange={e => setEditingEntityData({ ...ed, bairro: e.target.value })} className="h-8" />
                                        </div>
                                      </div>
                                      {/* Logradouro */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Logradouro</Label>
                                        <div className="flex-1">
                                          <Input value={ed.logradouro || ''} onChange={e => setEditingEntityData({ ...ed, logradouro: e.target.value })} className="h-8" />
                                        </div>
                                      </div>
                                      {/* Número */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Número</Label>
                                        <div className="flex-1">
                                          <Input value={ed.numero || ''} onChange={e => setEditingEntityData({ ...ed, numero: e.target.value })} className="h-8 max-w-[120px]" />
                                        </div>
                                      </div>
                                      {/* Complemento */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Complemento</Label>
                                        <div className="flex-1">
                                          <Input value={ed.complemento || ''} onChange={e => setEditingEntityData({ ...ed, complemento: e.target.value })} className="h-8" />
                                        </div>
                                      </div>
                                      <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                                        <Button size="sm" variant="outline" onClick={cancelEditEntity}>Cancelar</Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"><Save size={14} /> Salvar</Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Salvar alterações</AlertDialogTitle>
                                              <AlertDialogDescription>Deseja salvar as alterações feitas neste contribuinte?</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction className="bg-teal-600 hover:bg-teal-700 text-white" onClick={saveEditEntity}>Salvar</AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!isReadOnly && (
                      <div className="bg-muted/50 rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-muted-foreground uppercase">
                            Novo Contribuinte
                          </h4>
                          {entities.length > 0 && (
                            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleCopyFirstAddress}>
                              <Copy size={12} /> Copiar endereço do primeiro contribuinte
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-col gap-2.5">
                          {/* Tipo */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Tipo</Label>
                            <div className="flex-1">
                              <Select value={draftEntity.tipo_pessoa || 'PJ'} onValueChange={v => setDraftEntity({ ...draftEntity, tipo_pessoa: v, cpf_cnpj: '' })}>
                                <SelectTrigger className="h-8 max-w-[160px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PJ">PJ</SelectItem>
                                  <SelectItem value="PF">PF</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {/* CPF/CNPJ */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">CPF/CNPJ *</Label>
                            <div className="flex-1">
                              <div className="relative">
                                <Input
                                  value={draftEntity.cpf_cnpj || ''}
                                  onChange={e => setDraftEntity({ ...draftEntity, cpf_cnpj: formatCpfCnpj(e.target.value, draftEntity.tipo_pessoa || 'PJ') })}
                                  onBlur={e => handleCnpjBlur(e.target.value)}
                                  placeholder={draftEntity.tipo_pessoa === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                                  className="font-mono pr-8 h-8"
                                />
                                {cnpjLoading && <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />}
                              </div>
                            </div>
                          </div>
                          {/* Razão Social */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Razão Social *</Label>
                            <div className="flex-1">
                              <Input value={draftEntity.nome_razao_social || ''} onChange={e => setDraftEntity({ ...draftEntity, nome_razao_social: e.target.value })} placeholder="Nome Empresarial" className="font-medium h-8" />
                            </div>
                          </div>
                          {/* Nome Fantasia */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Nome Fantasia</Label>
                            <div className="flex-1">
                              <Input value={draftEntity.nome_fantasia || ''} onChange={e => setDraftEntity({ ...draftEntity, nome_fantasia: e.target.value })} placeholder="Nome Fantasia" disabled={draftEntity.tipo_pessoa === 'PF'} className="h-8" />
                            </div>
                          </div>
                          {/* Inscrição Estadual */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Inscrição Estadual *</Label>
                            <div className="flex-1">
                              <Select value={draftEntity.situacao_inscricao_estadual || '__none__'} onValueChange={v => setDraftEntity({ ...draftEntity, situacao_inscricao_estadual: v === '__none__' ? '' : v, inscricao_estadual: v !== 'sim' ? '' : (draftEntity.inscricao_estadual || '') })}>
                                <SelectTrigger className="h-8 max-w-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Selecione...</SelectItem>
                                  <SelectItem value="sim">Sim</SelectItem>
                                  <SelectItem value="isento">Isento</SelectItem>
                                  <SelectItem value="nao">Não</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {/* Nº IE */}
                          {draftEntity.situacao_inscricao_estadual === 'sim' && (
                            <div className="flex flex-row items-center gap-4">
                              <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Nº IE *</Label>
                              <div className="flex-1">
                                <Input value={draftEntity.inscricao_estadual || ''} onChange={e => setDraftEntity({ ...draftEntity, inscricao_estadual: e.target.value })} placeholder="Nº Inscrição" className="h-8" />
                              </div>
                            </div>
                          )}
                          {/* CNAE */}
                          {draftEntity.tipo_pessoa === 'PJ' && (
                            <div className="flex flex-row items-center gap-4">
                              <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">CNAE *</Label>
                              <div className="flex-1">
                                <Input value={draftEntity.cod_cnae || ''} onChange={e => setDraftEntity({ ...draftEntity, cod_cnae: e.target.value })} placeholder="0000-0/00" className="h-8 max-w-[200px]" />
                              </div>
                            </div>
                          )}
                          {/* Simples Nacional */}
                          {draftEntity.tipo_pessoa === 'PJ' && (
                            <div className="flex flex-row items-center gap-4">
                              <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Simples Nacional</Label>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 h-8">
                                  <Checkbox
                                    checked={draftEntity.simples_nacional || false}
                                    onCheckedChange={c => setDraftEntity({ ...draftEntity, simples_nacional: !!c })}
                                  />
                                  <span className="text-sm">Optante</span>
                                </div>
                              </div>
                            </div>
                          )}
                          {/* CEP */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">CEP *</Label>
                            <div className="flex-1">
                              <div className="relative max-w-[160px]">
                                <Input
                                  value={draftEntity.cep || ''}
                                  onChange={e => setDraftEntity({ ...draftEntity, cep: formatCep(e.target.value) })}
                                  onBlur={e => handleCepBlur(e.target.value)}
                                  placeholder="00000-000"
                                  className="font-mono pr-8 h-8"
                                />
                                {cepLoading && <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />}
                              </div>
                            </div>
                          </div>
                          {/* UF */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">UF *</Label>
                            <div className="flex-1">
                              <Input value={draftEntity.uf || ''} onChange={e => setDraftEntity({ ...draftEntity, uf: e.target.value })} maxLength={2} className="h-8 max-w-[120px]" />
                            </div>
                          </div>
                          {/* Município */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Município *</Label>
                            <div className="flex-1">
                              <Input value={draftEntity.municipio || ''} onChange={e => setDraftEntity({ ...draftEntity, municipio: e.target.value })} className="h-8" />
                            </div>
                          </div>
                          {/* Bairro */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Bairro *</Label>
                            <div className="flex-1">
                              <Input value={draftEntity.bairro || ''} onChange={e => setDraftEntity({ ...draftEntity, bairro: e.target.value })} className="h-8" />
                            </div>
                          </div>
                          {/* Logradouro */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Logradouro *</Label>
                            <div className="flex-1">
                              <Input value={draftEntity.logradouro || ''} onChange={e => setDraftEntity({ ...draftEntity, logradouro: e.target.value })} placeholder="Rua, Av., Rod..." className="h-8" />
                            </div>
                          </div>
                          {/* Número */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Número</Label>
                            <div className="flex-1">
                              <Input value={draftEntity.numero || ''} onChange={e => setDraftEntity({ ...draftEntity, numero: e.target.value })} placeholder="Nº" className="h-8 max-w-[120px]" />
                            </div>
                          </div>
                          {/* Complemento */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Complemento</Label>
                            <div className="flex-1">
                              <Input value={draftEntity.complemento || ''} onChange={e => setDraftEntity({ ...draftEntity, complemento: e.target.value })} placeholder="Sala, Andar..." className="h-8" />
                            </div>
                          </div>
                          <div className="flex justify-end mt-2">
                            <Button onClick={addEntity} className="gap-2">
                              Adicionar à Lista
                            </Button>
                          </div>
                        </div>
                      </div>
                      )}
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="participantes" className="mt-0 p-3 md:p-4">
                  <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-3">
                      <h3 className="text-sm font-bold text-foreground">Participantes ({participants.length})</h3>
                    </div>
                    <div className="px-4 py-3">
                      {participants.length > 0 && (
                        <div className="space-y-3 mb-4">
                          {participants.map(part => {
                            const isExpanded = expandedParticipantId === part._id;
                            const isEditingThis = editingParticipantId === part._id;
                            const ep = isEditingThis ? editingParticipantData : null;
                            return (
                              <div key={part._id} className="bg-muted/30 border rounded-lg overflow-hidden transition-all hover:shadow-md">
                                <button
                                  type="button"
                                  className="w-full flex items-center justify-between p-4 text-left"
                                  onClick={() => { if (!isEditingThis) setExpandedParticipantId(isExpanded ? null : part._id); }}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-foreground truncate">{part.nome}</div>
                                    <div className="text-sm text-muted-foreground">{part.tipo_participante}{part.cargo ? ` — ${part.cargo}` : ''}</div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-2">
                                    {part.acesso_chamados && <Badge variant="outline" className="text-[10px]">Chamados</Badge>}
                                    <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                                  </div>
                                </button>

                                {isExpanded && !isEditingThis && (
                                  <div className="px-4 pb-4 border-t pt-3">
                                    <div className="flex justify-end gap-2 mb-3">
                                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => startEditParticipant(part)}>
                                        <Pencil size={12} /> Editar
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button size="sm" variant="outline" className="gap-1.5 text-xs text-destructive hover:text-destructive">
                                            <Trash2 size={12} /> Remover
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Remover participante</AlertDialogTitle>
                                            <AlertDialogDescription>Tem certeza que deseja remover "{part.nome}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setParticipants(participants.filter(p => p._id !== part._id)); setExpandedParticipantId(null); }}>Remover</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                      <FieldPair label="Nome" value={part.nome} />
                                      <FieldPair label="Tipo de Participante" value={part.tipo_participante} />
                                      <FieldPair label="Cargo" value={part.cargo} />
                                      <FieldPair label="Email" value={part.email} />
                                      <FieldPair label="Telefone" value={part.telefone} />
                                      <FieldPair label="Acesso a Chamados" value={part.acesso_chamados ? 'Sim' : 'Não'} />
                                      {part.observacoes && <div className="col-span-2"><FieldPair label="Observações" value={part.observacoes} /></div>}
                                    </div>
                                  </div>
                                )}

                                {isExpanded && isEditingThis && ep && (
                                  <div className="px-4 pb-4 border-t pt-3">
                                    <div className="flex flex-col gap-2.5">
                                      {/* Nome */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Nome *</Label>
                                        <div className="flex-1">
                                          <Input value={ep.nome || ''} onChange={e => setEditingParticipantData({ ...ep, nome: e.target.value })} className="h-8" />
                                        </div>
                                      </div>
                                      {/* Tipo */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Tipo *</Label>
                                        <div className="flex-1">
                                          <Select value={ep.tipo_participante || '__none__'} onValueChange={v => setEditingParticipantData({ ...ep, tipo_participante: v === '__none__' ? '' : v })}>
                                            <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="__none__">Selecione...</SelectItem>
                                              {TIPO_PARTICIPANTE_OPTIONS.map(opt => (
                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                      {/* Cargo */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Cargo</Label>
                                        <div className="flex-1">
                                          <Input value={ep.cargo || ''} onChange={e => setEditingParticipantData({ ...ep, cargo: e.target.value })} className="h-8" />
                                        </div>
                                      </div>
                                      {/* Email */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Email *</Label>
                                        <div className="flex-1">
                                          <Input value={ep.email || ''} onChange={e => setEditingParticipantData({ ...ep, email: e.target.value })} className="h-8" />
                                        </div>
                                      </div>
                                      {/* Telefone */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Telefone</Label>
                                        <div className="flex-1">
                                          <Input value={ep.telefone || ''} onChange={e => setEditingParticipantData({ ...ep, telefone: formatPhone(e.target.value) })} className="h-8" />
                                        </div>
                                      </div>
                                      {/* Acesso Chamados */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Acesso Chamados</Label>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 h-8">
                                            <Switch checked={ep.acesso_chamados ?? false} onCheckedChange={c => setEditingParticipantData({ ...ep, acesso_chamados: c })} />
                                            <span className="text-sm">{ep.acesso_chamados ? 'Ativado' : 'Desativado'}</span>
                                          </div>
                                        </div>
                                      </div>
                                      {/* Observações */}
                                      <div className="flex flex-row items-start gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground pt-2">Observações</Label>
                                        <div className="flex-1">
                                          <Textarea value={ep.observacoes || ''} onChange={e => setEditingParticipantData({ ...ep, observacoes: e.target.value })} className="min-h-[60px]" />
                                        </div>
                                      </div>
                                      <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                                        <Button size="sm" variant="outline" onClick={cancelEditParticipant}>Cancelar</Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"><Save size={14} /> Salvar</Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Salvar alterações</AlertDialogTitle>
                                              <AlertDialogDescription>Deseja salvar as alterações feitas neste participante?</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction className="bg-teal-600 hover:bg-teal-700 text-white" onClick={saveEditParticipant}>Salvar</AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!isReadOnly && (
                      <div className="bg-muted/50 rounded-lg border p-4">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase mb-3">
                          Novo Participante
                        </h4>
                        <div className="flex flex-col gap-2.5">
                          {/* Nome */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Nome *</Label>
                            <div className="flex-1">
                              <Input value={draftParticipant.nome} onChange={e => setDraftParticipant({ ...draftParticipant, nome: e.target.value })} placeholder="Nome do contato" className="font-medium h-8" />
                            </div>
                          </div>
                          {/* Tipo */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Tipo *</Label>
                            <div className="flex-1">
                              <Select value={draftParticipant.tipo_participante || '__none__'} onValueChange={v => setDraftParticipant({ ...draftParticipant, tipo_participante: v === '__none__' ? '' : v })}>
                                <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Selecione...</SelectItem>
                                  {TIPO_PARTICIPANTE_OPTIONS.map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {/* Cargo */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Cargo</Label>
                            <div className="flex-1">
                              <Input value={draftParticipant.cargo} onChange={e => setDraftParticipant({ ...draftParticipant, cargo: e.target.value })} className="h-8" />
                            </div>
                          </div>
                          {/* Email */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Email *</Label>
                            <div className="flex-1">
                              <Input value={draftParticipant.email} onChange={e => setDraftParticipant({ ...draftParticipant, email: e.target.value })} className="h-8" />
                            </div>
                          </div>
                          {/* Telefone */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Telefone</Label>
                            <div className="flex-1">
                              <Input value={draftParticipant.telefone} onChange={e => setDraftParticipant({ ...draftParticipant, telefone: formatPhone(e.target.value) })} className="h-8" />
                            </div>
                          </div>
                          {/* Acesso Chamados */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Acesso Chamados</Label>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 h-8">
                                <Switch checked={draftParticipant.acesso_chamados} onCheckedChange={c => setDraftParticipant({ ...draftParticipant, acesso_chamados: c })} />
                                <span className="text-sm">{draftParticipant.acesso_chamados ? 'Ativado' : 'Desativado'}</span>
                              </div>
                            </div>
                          </div>
                          {/* Observações */}
                          <div className="flex flex-row items-start gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground pt-2">Observações</Label>
                            <div className="flex-1">
                              <Textarea
                                value={draftParticipant.observacoes}
                                onChange={e => setDraftParticipant({ ...draftParticipant, observacoes: e.target.value })}
                                placeholder="Observações sobre o participante (mín. 20 caracteres se preenchido)..."
                                className="min-h-[60px]"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end mt-2">
                            <Button onClick={addParticipant} className="gap-2">
                              Adicionar à Lista
                            </Button>
                          </div>
                        </div>
                      </div>
                      )}
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="contratos" className="mt-0 p-3 md:p-4">
                  <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-3">
                      <h3 className="text-sm font-bold text-foreground">OS - Ordem de Serviço ({contracts.length})</h3>
                    </div>
                    <div className="px-4 py-3">
                      {contracts.length > 0 && (
                        <div className="space-y-3 mb-6">
                          {contracts.map(cont => {
                            const isExpanded = expandedContractId === cont._id;
                            const isEditingThis = editingContractId === cont._id;
                            const ec = isEditingThis ? editingContractData : null;
                            return (
                              <div key={cont._id} className="bg-muted/30 border rounded-lg overflow-hidden transition-all hover:shadow-md">
                                <button
                                  type="button"
                                  className="w-full flex items-center justify-between p-4 text-left"
                                  onClick={() => { if (!isEditingThis) setExpandedContractId(isExpanded ? null : cont._id); }}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-muted text-foreground">OS {cont.ordem_servico}</span>
                                      <span className="font-semibold text-sm text-foreground truncate">{cont.nome_projeto}</span>
                                    </div>
                                    <div className="font-bold text-foreground mt-0.5">{formatCurrency(cont.valor_projeto)}</div>
                                  </div>
                                  <ChevronDown size={16} className={cn("text-muted-foreground transition-transform ml-2", isExpanded && "rotate-180")} />
                                </button>

                                {isExpanded && !isEditingThis && (
                                  <div className="px-4 pb-4 border-t pt-3">
                                    <div className="flex justify-end gap-2 mb-3">
                                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => startEditContract(cont)}>
                                        <Pencil size={12} /> Editar
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button size="sm" variant="outline" className="gap-1.5 text-xs text-destructive hover:text-destructive">
                                            <Trash2 size={12} /> Remover
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Remover OS</AlertDialogTitle>
                                            <AlertDialogDescription>Tem certeza que deseja remover a OS "{cont.ordem_servico} - {cont.nome_projeto}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setContracts(contracts.filter(c => c._id !== cont._id)); setExpandedContractId(null); }}>Remover</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                                      <FieldPair label="Ordem de Serviço" value={cont.ordem_servico} />
                                      <FieldPair label="Data Emissão" value={cont.data_emissao} />
                                      <FieldPair label="Gestor Responsável" value={cont.gestor_responsavel} />
                                      <FieldPair label="Nome do Projeto" value={cont.nome_projeto} />
                                      {cont.descricao_projeto && <div className="col-span-2 md:col-span-3"><FieldPair label="Descrição" value={cont.descricao_projeto} /></div>}
                                      <FieldPair label="Data Início" value={cont.data_inicio_projeto} />
                                      <FieldPair label="Data Fim" value={cont.data_fim_projeto} />
                                      <FieldPair label="Valor do Projeto" value={formatCurrency(cont.valor_projeto)} />
                                      <FieldPair label="Reembolso km" value={formatCurrency(cont.valor_reembolso_km)} />
                                      <FieldPair label="Reembolso refeição" value={formatCurrency(cont.valor_reembolso_refeicao)} />
                                    </div>
                                  </div>
                                )}

                                {isExpanded && isEditingThis && ec && (
                                  <div className="px-4 pb-4 border-t pt-3">
                                    <div className="flex flex-col gap-2.5">
                                      {/* OS */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">OS *</Label>
                                        <div className="flex-1">
                                          <Input value={ec.ordem_servico || ''} onChange={e => setEditingContractData({ ...ec, ordem_servico: e.target.value })} className="h-8 max-w-[200px]" />
                                        </div>
                                      </div>
                                      {/* Data Emissão */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Data Emissão *</Label>
                                        <div className="flex-1">
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button variant="outline" className={cn("h-8 max-w-[200px] justify-start text-left font-normal", !ec.data_emissao && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {ec.data_emissao ? format(parseDate(ec.data_emissao), "dd/MM/yyyy") : "Selecione..."}
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                                              <Calendar mode="single" selected={ec.data_emissao ? parseDate(ec.data_emissao) : undefined} onSelect={(date) => { if (date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); setEditingContractData({ ...ec, data_emissao: `${y}-${m}-${d}` }); } }} disabled={(date) => date.getFullYear() < 2000 || date.getFullYear() > 2060} initialFocus className="p-3 pointer-events-auto" />
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                      </div>
                                      {/* Gestor */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Gestor *</Label>
                                        <div className="flex-1">
                                          <Select value={ec.gestor_responsavel || '__none__'} onValueChange={v => setEditingContractData({ ...ec, gestor_responsavel: v === '__none__' ? '' : v })}>
                                            <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="__none__">Selecione...</SelectItem>
                                              {lideres.map(l => (
                                                <SelectItem key={l.id} value={l.nome}>{l.nome}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                      {/* Projeto */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Projeto *</Label>
                                        <div className="flex-1">
                                          <Input value={ec.nome_projeto || ''} onChange={e => setEditingContractData({ ...ec, nome_projeto: e.target.value })} className="h-8" />
                                        </div>
                                      </div>
                                      {/* Descrição */}
                                      <div className="flex flex-row items-start gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground pt-2">Descrição</Label>
                                        <div className="flex-1">
                                          <Textarea value={ec.descricao_projeto || ''} onChange={e => setEditingContractData({ ...ec, descricao_projeto: e.target.value })} className="min-h-[60px]" maxLength={500} />
                                          <p className="text-xs text-muted-foreground text-right mt-1">{(ec.descricao_projeto || '').length}/500</p>
                                        </div>
                                      </div>
                                      {/* Data Início + Data Fim (lado a lado) */}
                                      <div className="flex flex-row items-center gap-6">
                                        <div className="flex flex-row items-center gap-4 flex-1">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Data Início *</Label>
                                          <div className="flex-1">
                                            <Popover>
                                              <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("h-8 max-w-[200px] justify-start text-left font-normal", !ec.data_inicio_projeto && "text-muted-foreground")}>
                                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                                  {ec.data_inicio_projeto ? format(parseDate(ec.data_inicio_projeto), "dd/MM/yyyy") : "Selecione..."}
                                                </Button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                                                <Calendar mode="single" selected={ec.data_inicio_projeto ? parseDate(ec.data_inicio_projeto) : undefined} onSelect={(date) => { if (date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); setEditingContractData({ ...ec, data_inicio_projeto: `${y}-${m}-${d}` }); } }} disabled={(date) => date.getFullYear() < 2000 || date.getFullYear() > 2060} initialFocus className="p-3 pointer-events-auto" />
                                              </PopoverContent>
                                            </Popover>
                                          </div>
                                        </div>
                                        <div className="flex flex-row items-center gap-4 flex-1">
                                          <Label className="w-32 shrink-0 text-xs font-semibold text-muted-foreground">Data Fim</Label>
                                          <div className="flex-1">
                                            <Popover>
                                              <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("h-8 max-w-[200px] justify-start text-left font-normal", !ec.data_fim_projeto && "text-muted-foreground")}>
                                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                                  {ec.data_fim_projeto ? format(parseDate(ec.data_fim_projeto), "dd/MM/yyyy") : "Selecione..."}
                                                </Button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                                                <Calendar mode="single" selected={ec.data_fim_projeto ? parseDate(ec.data_fim_projeto) : undefined} onSelect={(date) => { if (date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); setEditingContractData({ ...ec, data_fim_projeto: `${y}-${m}-${d}` }); } }} disabled={(date) => date.getFullYear() < 2000 || date.getFullYear() > 2060} initialFocus className="p-3 pointer-events-auto" />
                                              </PopoverContent>
                                            </Popover>
                                          </div>
                                        </div>
                                      </div>
                                      {/* Valor */}
                                      <div className="flex flex-row items-center gap-4">
                                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Valor (R$) *</Label>
                                        <div className="flex-1">
                                          <Input type="number" value={ec.valor_projeto || 0} onChange={e => setEditingContractData({ ...ec, valor_projeto: Number(e.target.value) })} className="h-8 max-w-[200px]" />
                                        </div>
                                      </div>
                                      {/* Reembolsos (lado a lado) */}
                                      <div className="flex flex-row items-center gap-6">
                                        <div className="flex flex-row items-center gap-4 flex-1">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Reembolso por km (R$)</Label>
                                          <div className="flex-1">
                                            <Input type="number" value={ec.valor_reembolso_km || 0} onChange={e => setEditingContractData({ ...ec, valor_reembolso_km: Number(e.target.value) })} className="h-8 max-w-[160px]" />
                                          </div>
                                        </div>
                                        <div className="flex flex-row items-center gap-4 flex-1">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Reembolso refeição (R$)</Label>
                                          <div className="flex-1">
                                            <Input type="number" value={ec.valor_reembolso_refeicao || 0} onChange={e => setEditingContractData({ ...ec, valor_reembolso_refeicao: Number(e.target.value) })} className="h-8 max-w-[160px]" />
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                                        <Button size="sm" variant="outline" onClick={cancelEditContract}>Cancelar</Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"><Save size={14} /> Salvar</Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Salvar alterações</AlertDialogTitle>
                                              <AlertDialogDescription>Deseja salvar as alterações feitas nesta OS?</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction className="bg-teal-600 hover:bg-teal-700 text-white" onClick={saveEditContract}>Salvar</AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!isReadOnly && (
                      <div className="bg-muted/50 rounded-lg border p-4">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase mb-3">Nova OS</h4>
                        <div className="flex flex-col gap-2.5">
                          {/* Nº OS */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Nº OS *</Label>
                            <div className="flex-1">
                              <Input value={draftContract.ordem_servico} onChange={e => setDraftContract({ ...draftContract, ordem_servico: e.target.value })} placeholder="Ex: 001/2025" className="h-8 max-w-[200px]" />
                            </div>
                          </div>
                          {/* Data Emissão */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Data Emissão *</Label>
                            <div className="flex-1">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className={cn("h-8 max-w-[200px] justify-start text-left font-normal", !draftContract.data_emissao && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {draftContract.data_emissao ? format(parseDate(draftContract.data_emissao), "dd/MM/yyyy") : "Selecione..."}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                                  <Calendar mode="single" selected={draftContract.data_emissao ? parseDate(draftContract.data_emissao) : undefined} onSelect={(date) => { if (date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); setDraftContract({ ...draftContract, data_emissao: `${y}-${m}-${d}` }); } }} disabled={(date) => date.getFullYear() < 2000 || date.getFullYear() > 2060} initialFocus className="p-3 pointer-events-auto" />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                          {/* Gestor */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Gestor *</Label>
                            <div className="flex-1">
                              <Select value={draftContract.gestor_responsavel || '__none__'} onValueChange={v => setDraftContract({ ...draftContract, gestor_responsavel: v === '__none__' ? '' : v })}>
                                <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Selecione...</SelectItem>
                                  {lideres.map(l => (
                                    <SelectItem key={l.id} value={l.nome}>{l.nome}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {/* Projeto */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Projeto *</Label>
                            <div className="flex-1">
                              <Input value={draftContract.nome_projeto} onChange={e => setDraftContract({ ...draftContract, nome_projeto: e.target.value })} className="h-8" />
                            </div>
                          </div>
                          {/* Descrição */}
                          <div className="flex flex-row items-start gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground pt-2">Descrição</Label>
                            <div className="flex-1">
                              <Textarea
                                value={draftContract.descricao_projeto}
                                onChange={e => setDraftContract({ ...draftContract, descricao_projeto: e.target.value })}
                                placeholder="Mín. 20 caracteres se preenchido..."
                                className="min-h-[60px]"
                                maxLength={500}
                              />
                              <p className="text-xs text-muted-foreground text-right mt-1">{draftContract.descricao_projeto.length}/500</p>
                            </div>
                          </div>
                          {/* Data Início + Data Fim (lado a lado) */}
                          <div className="flex flex-row items-center gap-6">
                            <div className="flex flex-row items-center gap-4 flex-1">
                              <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Data Início *</Label>
                              <div className="flex-1">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("h-8 max-w-[200px] justify-start text-left font-normal", !draftContract.data_inicio_projeto && "text-muted-foreground")}>
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {draftContract.data_inicio_projeto ? format(parseDate(draftContract.data_inicio_projeto), "dd/MM/yyyy") : "Selecione..."}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                                    <Calendar mode="single" selected={draftContract.data_inicio_projeto ? parseDate(draftContract.data_inicio_projeto) : undefined} onSelect={(date) => { if (date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); setDraftContract({ ...draftContract, data_inicio_projeto: `${y}-${m}-${d}` }); } }} disabled={(date) => date.getFullYear() < 2000 || date.getFullYear() > 2060} initialFocus className="p-3 pointer-events-auto" />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                            <div className="flex flex-row items-center gap-4 flex-1">
                              <Label className="w-32 shrink-0 text-xs font-semibold text-muted-foreground">Data Fim</Label>
                              <div className="flex-1">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("h-8 max-w-[200px] justify-start text-left font-normal", !draftContract.data_fim_projeto && "text-muted-foreground")}>
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {draftContract.data_fim_projeto ? format(parseDate(draftContract.data_fim_projeto), "dd/MM/yyyy") : "Selecione..."}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                                    <Calendar mode="single" selected={draftContract.data_fim_projeto ? parseDate(draftContract.data_fim_projeto) : undefined} onSelect={(date) => { if (date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); setDraftContract({ ...draftContract, data_fim_projeto: `${y}-${m}-${d}` }); } }} disabled={(date) => date.getFullYear() < 2000 || date.getFullYear() > 2060} initialFocus className="p-3 pointer-events-auto" />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          </div>
                          {/* Valor */}
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Valor (R$) *</Label>
                            <div className="flex-1">
                              <Input type="number" value={draftContract.valor_projeto} onChange={e => setDraftContract({ ...draftContract, valor_projeto: Number(e.target.value) })} className="h-8 max-w-[200px]" />
                            </div>
                          </div>
                          {/* Reembolsos (lado a lado) */}
                          <div className="flex flex-row items-center gap-6">
                            <div className="flex flex-row items-center gap-4 flex-1">
                              <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Reembolso por km (R$)</Label>
                              <div className="flex-1">
                                <Input type="number" value={draftContract.valor_reembolso_km} onChange={e => setDraftContract({ ...draftContract, valor_reembolso_km: Number(e.target.value) })} className="h-8 max-w-[160px]" />
                              </div>
                            </div>
                            <div className="flex flex-row items-center gap-4 flex-1">
                              <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Reembolso refeição (R$)</Label>
                              <div className="flex-1">
                                <Input type="number" value={draftContract.valor_reembolso_refeicao} onChange={e => setDraftContract({ ...draftContract, valor_reembolso_refeicao: Number(e.target.value) })} className="h-8 max-w-[160px]" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end mt-4 pt-2 border-t">
                          <Button onClick={addContract} className="gap-2">
                            Adicionar OS à Lista
                          </Button>
                        </div>
                      </div>
                      )}
                    </div>
                  </section>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            {/* Footer */}
            <div className="p-4 border-t bg-card flex justify-between shrink-0">
              <div>
                {!isFirstTab && (
                  <Button variant="outline" onClick={handleBack} className="gap-2">
                    <ChevronLeft size={16} /> Voltar
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                {isReadOnly ? (
                  !isLastTab && (
                    <Button onClick={handleNext} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                      Avançar <ChevronRight size={16} />
                    </Button>
                  )
                ) : (
                  <>
                    <Button variant="outline" onClick={handleAttemptClose}>Cancelar</Button>
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
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>

    {/* Exit confirmation AlertDialog */}
    <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dados não salvos</AlertDialogTitle>
          <AlertDialogDescription>
            Você tem dados não salvos. Deseja sair sem salvar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>Continuar Editando</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={resetAndClose}>Sair</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
