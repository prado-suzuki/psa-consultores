import { useState } from 'react';
import EstruturaManager from '@/components/equipe/estrutura/EstruturaManager';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSyncProtectedPages } from '@/hooks/useSyncProtectedPages';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  ShieldCheck, 
  Users, 
  FileText, 
  RefreshCw,
  Plus,
  Trash2,
  ArrowLeft,
  LogOut,
  Repeat,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  UserPlus,
  CheckCircle2,
  Copy,
  Pencil,
  Building2,
  FolderKanban,
  Workflow,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GestaoClientesContent } from '@/pages/equipe/dev/GestaoClientes';
import CadastroCategorias from '@/components/equipe/CadastroCategorias';


interface PagePermission {
  id: string;
  page_path: string;
  page_name: string;
  page_description: string | null;
  category: string;
  is_active: boolean;
  requires_admin: boolean;
  requires_team_member: boolean;
}

interface UserWithRoles {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: string[];
}

interface UserPageAccess {
  id: string;
  user_id: string;
  page_permission_id: string;
  granted_at: string;
}

interface AreaInterna {
  id: string;
  name: string;
  responsible: string | null;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  estrutura_area_id: string | null;
}

interface CadastroStats {
  clients: number;
  projects: number;
  processes: number;
}

const INITIAL_VISIBLE_PAGES = 5;

// Area -> categories mapping
const AREA_CATEGORIES_MAP: Record<string, { label: string; categories: string[] }> = {
  digital: { label: 'Digital', categories: ['rotina', 'dev'] },
  tax: { label: 'Tax', categories: ['tax', 'projetos', 'fiscal'] },
  osg: { label: 'OSG', categories: ['osg'] },
  board: { label: 'Gerencial', categories: ['board'] },
  controle_site: { label: 'Chamados', categories: ['gestao'] },
};

const EquipeControleAcessos = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { syncPages, isSyncing } = useSyncProtectedPages();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  // User creation states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    roles: [] as string[],
    areas: [] as string[],
  });
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  // Edit user states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editUser, setEditUser] = useState({
    first_name: '',
    last_name: '',
    email: '',
    roles: [] as string[],
    areas: [] as string[],
  });

  // Delete user states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Cadastros states
  const [cadastroAreas, setCadastroAreas] = useState<AreaInterna[]>([]);
  const [cadastroStats, setCadastroStats] = useState<CadastroStats>({ clients: 0, projects: 0, processes: 0 });
  const [cadastroLoading, setCadastroLoading] = useState(false);
  const [cadastroDialogOpen, setCadastroDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaInterna | null>(null);
  const [cadastroForm, setCadastroForm] = useState({
    name: '',
    responsible: '',
    description: '',
    color: '#3B82F6',
    estrutura_area_id: '' as string,
  });

  const colorPresets = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
    '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6',
  ];

  // Fetch page permissions
  const { data: pages, isLoading: loadingPages } = useQuery({
    queryKey: ['page-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_permissions')
        .select('*')
        .order('category', { ascending: true });
      
      if (error) throw error;
      return data as PagePermission[];
    },
  });

  // Fetch users with roles
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email');
      
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      const usersWithRoles = profiles.map(profile => ({
        ...profile,
        roles: roles
          .filter(r => r.user_id === profile.id)
          .map(r => r.role)
      }));

      return usersWithRoles as UserWithRoles[];
    },
  });

  // Fetch user page access
  const { data: userAccess } = useQuery({
    queryKey: ['user-page-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_page_access')
        .select('*');
      
      if (error) throw error;
      return data as UserPageAccess[];
    },
  });

  // Fetch estrutura_areas for mapping select
  const { data: estruturaAreas = [] } = useQuery({
    queryKey: ['estrutura-areas-for-mapping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_areas')
        .select('id, name, color')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string; color: string | null }[];
    },
  });

  // Toggle page active status
  const togglePageMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('page_permissions')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-permissions'] });
      toast.success('Permissão atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar permissão');
    },
  });

  // Grant user access to page
  const grantAccessMutation = useMutation({
    mutationFn: async ({ userId, pageId }: { userId: string; pageId: string }) => {
      const { error } = await supabase
        .from('user_page_access')
        .insert({
          user_id: userId,
          page_permission_id: pageId,
          granted_by: user?.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      toast.success('Acesso concedido');
    },
    onError: () => {
      toast.error('Erro ao conceder acesso');
    },
  });

  // Revoke user access
  const revokeAccessMutation = useMutation({
    mutationFn: async ({ userId, pageId }: { userId: string; pageId: string }) => {
      const { error } = await supabase
        .from('user_page_access')
        .delete()
        .eq('user_id', userId)
        .eq('page_permission_id', pageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      toast.success('Acesso revogado');
    },
    onError: () => {
      toast.error('Erro ao revogar acesso');
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('create-team-member', {
        body: userData,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao criar usuário');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: async (data) => {
      // Grant area access if team_member and areas selected
      if ((newUser.roles.includes('team_member') || newUser.roles.includes('lider') || newUser.roles.includes('sublider')) && newUser.areas.length > 0 && data?.user_id) {
        try {
          const categoriesToGrant = newUser.areas.flatMap(area => AREA_CATEGORIES_MAP[area]?.categories || []);
          const { data: pagePerms } = await supabase
            .from('page_permissions')
            .select('id')
            .in('category', categoriesToGrant);
          
          if (pagePerms && pagePerms.length > 0) {
            const accessRecords = pagePerms.map(p => ({
              user_id: data.user_id,
              page_permission_id: p.id,
              granted_by: user?.id,
            }));
            await supabase.from('user_page_access').insert(accessRecords);
          }
        } catch (err) {
          console.error('Error granting area access:', err);
        }
      }
      
      // Fire-and-forget: dispara webhook n8n para e-mail de boas-vindas
      const adminName = user?.user_metadata?.first_name && user?.user_metadata?.last_name
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
        : user?.email || 'Admin';

      fetch('https://psadigital.app.n8n.cloud/webhook/8dd8b7e4-2843-4ab6-bf97-7a3941548153', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'user_created',
          user_data: {
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            email: newUser.email,
            roles: newUser.roles,
            areas: newUser.areas,
          },
          credentials: {
            email: newUser.email,
            temporary_password: newUser.password,
          },
          platform: {
            login_url: 'https://psa-consultores.lovable.app/auth',
            name: 'PSA Consultores',
          },
          created_by: adminName,
          created_at: new Date().toISOString(),
        }),
      }).catch((err) => console.error('[Webhook boas-vindas] Falha ao disparar:', err));

      setCreatedCredentials({ email: newUser.email, password: newUser.password });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      toast.success('Usuário criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.first_name || !newUser.last_name || !newUser.email || !newUser.password) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleCloseCreateDialog = () => {
    setIsCreateOpen(false);
    setCreatedCredentials(null);
    setNewUser({ first_name: '', last_name: '', email: '', password: '', roles: [], areas: [] });
    setShowPassword(false);
  };

  // Edit user mutation
  const editUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error('Nenhum usuário selecionado');

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: editUser.first_name,
          last_name: editUser.last_name,
          email: editUser.email,
        })
        .eq('id', selectedUserId);

      if (profileError) throw profileError;

      // Sync roles - get current roles
      const { data: currentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', selectedUserId);

      if (rolesError) throw rolesError;

      const currentRoleNames = currentRoles?.map(r => r.role) || [];
      const rolesToAdd = editUser.roles.filter(r => !currentRoleNames.includes(r as typeof currentRoleNames[number]));
      const rolesToRemove = currentRoleNames.filter(r => !editUser.roles.includes(r));

      // Remove roles
      for (const role of rolesToRemove) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUserId)
          .eq('role', role as any);
        if (error) throw error;
      }

      // Add roles
      for (const role of rolesToAdd) {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUserId, role: role as any });
        if (error) throw error;
      }

      // Sync area access
      if (editUser.roles.includes('team_member') || editUser.roles.includes('lider') || editUser.roles.includes('sublider')) {
        const selectedCategories = editUser.areas.flatMap(area => AREA_CATEGORIES_MAP[area]?.categories || []);
        
        // Get all page permissions
        const { data: allPagePerms } = await supabase
          .from('page_permissions')
          .select('id, category');
        
        if (allPagePerms) {
          // Pages that should have access (from selected areas)
          const shouldHaveAccess = new Set(
            allPagePerms.filter(p => selectedCategories.includes(p.category)).map(p => p.id)
          );
          
          // Pages from all areas (to know which to potentially revoke)
          const allAreaCategories = Object.values(AREA_CATEGORIES_MAP).flatMap(a => a.categories);
          const allAreaPageIds = new Set(
            allPagePerms.filter(p => allAreaCategories.includes(p.category)).map(p => p.id)
          );
          
          // Current access
          const currentAccessIds = new Set(
            userAccess?.filter(a => a.user_id === selectedUserId).map(a => a.page_permission_id) || []
          );
          
          // Grant missing
          const toGrant = [...shouldHaveAccess].filter(id => !currentAccessIds.has(id));
          if (toGrant.length > 0) {
            await supabase.from('user_page_access').insert(
              toGrant.map(pageId => ({
                user_id: selectedUserId,
                page_permission_id: pageId,
                granted_by: user?.id,
              }))
            );
          }
          
          // Revoke from deselected areas only
          const toRevoke = [...allAreaPageIds].filter(id => !shouldHaveAccess.has(id) && currentAccessIds.has(id));
          if (toRevoke.length > 0) {
            for (const pageId of toRevoke) {
              await supabase
                .from('user_page_access')
                .delete()
                .eq('user_id', selectedUserId)
                .eq('page_permission_id', pageId);
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      setIsEditOpen(false);
      toast.success('Usuário atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar usuário');
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error('Nenhum usuário selecionado');

      const response = await supabase.functions.invoke('delete-team-member', {
        body: { user_id: selectedUserId },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      setSelectedUserId(null);
      setIsDeleteOpen(false);
      toast.success('Usuário excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir usuário');
    },
  });

  const handleOpenEdit = () => {
    if (!selectedUser || !selectedUserId) return;
    
    // Infer current areas from user_page_access
    const userAccessIds = userAccess?.filter(a => a.user_id === selectedUserId).map(a => a.page_permission_id) || [];
    const userPageCategories = new Set(
      pages?.filter(p => userAccessIds.includes(p.id)).map(p => p.category) || []
    );
    
    const inferredAreas: string[] = [];
    for (const [areaKey, areaDef] of Object.entries(AREA_CATEGORIES_MAP)) {
      const hasAllCategories = areaDef.categories.every(cat => userPageCategories.has(cat));
      if (hasAllCategories && areaDef.categories.some(cat => userPageCategories.has(cat))) {
        inferredAreas.push(areaKey);
      }
    }
    
    setEditUser({
      first_name: selectedUser.first_name,
      last_name: selectedUser.last_name,
      email: selectedUser.email || '',
      roles: [...selectedUser.roles],
      areas: inferredAreas,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser.first_name || !editUser.last_name || !editUser.email) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    editUserMutation.mutate();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para área de transferência');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Cadastros functions
  const fetchCadastros = async () => {
    try {
      setCadastroLoading(true);
      const { data: clientsData, error: clientsError } = await supabase
        .from('catalog_clients')
        .select('*')
        .order('name');
      if (clientsError) throw clientsError;
      setCadastroAreas(clientsData || []);

      const [projectsRes, processesRes] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('processes').select('id', { count: 'exact', head: true }),
      ]);
      setCadastroStats({
        clients: clientsData?.length || 0,
        projects: projectsRes.count || 0,
        processes: processesRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching cadastros:', error);
      toast.error('Erro ao carregar cadastros');
    } finally {
      setCadastroLoading(false);
    }
  };

  const openCadastroCreate = () => {
    setEditingArea(null);
    setCadastroForm({ name: '', responsible: '', description: '', color: '#3B82F6', estrutura_area_id: '' });
    setCadastroDialogOpen(true);
  };

  const openCadastroEdit = (area: AreaInterna) => {
    setEditingArea(area);
    setCadastroForm({
      name: area.name,
      responsible: area.responsible || '',
      description: area.description || '',
      color: area.color || '#3B82F6',
      estrutura_area_id: area.estrutura_area_id || '',
    });
    setCadastroDialogOpen(true);
  };

  const handleSaveCadastro = async () => {
    if (!cadastroForm.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    try {
      const payload = {
        name: cadastroForm.name.trim(),
        responsible: cadastroForm.responsible.trim() || null,
        description: cadastroForm.description.trim() || null,
        color: cadastroForm.color,
        estrutura_area_id: cadastroForm.estrutura_area_id || null,
      };
      if (editingArea) {
        const { error } = await supabase.from('catalog_clients').update(payload).eq('id', editingArea.id);
        if (error) throw error;
        toast.success('Área atualizada');
      } else {
        const { error } = await supabase.from('catalog_clients').insert(payload);
        if (error) throw error;
        toast.success('Área criada');
      }
      setCadastroDialogOpen(false);
      fetchCadastros();
    } catch (error: any) {
      if (error.code === '23505') toast.error('Já existe uma área com esse nome');
      else toast.error('Erro ao salvar');
    }
  };

  const handleToggleCadastroActive = async (area: AreaInterna) => {
    try {
      const { error } = await supabase.from('catalog_clients').update({ is_active: !area.is_active }).eq('id', area.id);
      if (error) throw error;
      toast.success(area.is_active ? 'Área desativada' : 'Área ativada');
      fetchCadastros();
    } catch {
      toast.error('Erro ao alterar status');
    }
  };

  const handleDeleteCadastro = async (area: AreaInterna) => {
    if (!confirm(`Tem certeza que deseja excluir "${area.name}"?`)) return;
    try {
      const { error } = await supabase.from('catalog_clients').delete().eq('id', area.id);
      if (error) throw error;
      toast.success('Área excluída');
      fetchCadastros();
    } catch (error: any) {
      if (error.code === '23503') toast.error('Não é possível excluir: existem projetos ou processos vinculados');
      else toast.error('Erro ao excluir');
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      rotina: 'Digital Rotina',
      dev: 'Digital Dev',
      gestao: 'Gestão',
      geral: 'Geral',
      tax: 'Tax',
      projetos: 'Projetos',
      fiscal: 'Fiscal',
      osg: 'OSG',
      board: 'Gerencial',
      fixos: 'Fixos',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      rotina: 'bg-teal-100 text-teal-700 border-teal-200',
      dev: 'bg-slate-100 text-slate-700 border-slate-200',
      gestao: 'bg-teal-50 text-teal-600 border-teal-100',
      geral: 'bg-slate-50 text-slate-600 border-slate-100',
      tax: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      projetos: 'bg-blue-100 text-blue-700 border-blue-200',
      fiscal: 'bg-amber-100 text-amber-700 border-amber-200',
      osg: 'bg-purple-100 text-purple-700 border-purple-200',
      board: 'bg-rose-100 text-rose-700 border-rose-200',
      fixos: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    };
    return colors[category] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const groupedPages = pages?.reduce((acc, page) => {
    if (!acc[page.category]) {
      acc[page.category] = [];
    }
    acc[page.category].push(page);
    return acc;
  }, {} as Record<string, PagePermission[]>) || {};

  const hasAccess = (userId: string, pageId: string) => {
    return userAccess?.some(a => a.user_id === userId && a.page_permission_id === pageId) || false;
  };

  const selectedUser = users?.find(u => u.id === selectedUserId);

  const handleRefreshPages = () => {
    // Sync pages from config and invalidate caches
    syncPages();
  };

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 h-16 border-b border-slate-200/60 bg-white">
        <div className="container mx-auto px-4 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-teal-600" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-slate-900">Controle de Acessos</h1>
                <p className="text-xs text-slate-500">Gestão de usuários e liberação de acessos</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/equipe/digital')}
                className="text-slate-600 hover:text-teal-600 hover:bg-slate-50"
              >
                <Repeat className="h-4 w-4 mr-2" />
                Trocar área
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-slate-600 hover:text-teal-600 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <ScrollArea className="h-[calc(100vh-64px)]">
        <main className="container mx-auto px-4 py-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border-slate-200/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Páginas Ativas</CardTitle>
                  <div className="p-2 rounded-full bg-teal-100">
                    <FileText className="h-4 w-4 text-teal-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {pages?.filter(p => p.is_active).length || 0}
                  </div>
                  <p className="text-sm text-slate-500">de {pages?.length || 0} páginas</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Usuários</CardTitle>
                  <div className="p-2 rounded-full bg-teal-100">
                    <Users className="h-4 w-4 text-teal-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{users?.length || 0}</div>
                  <p className="text-sm text-slate-500">cadastrados no sistema</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Permissões Customizadas</CardTitle>
                  <div className="p-2 rounded-full bg-teal-100">
                    <ShieldCheck className="h-4 w-4 text-teal-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{userAccess?.length || 0}</div>
                  <p className="text-sm text-slate-500">acessos individuais</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="pages" className="space-y-4">
              <TabsList className="bg-slate-100 border border-slate-200">
                <TabsTrigger 
                  value="pages" 
                  className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Páginas
                </TabsTrigger>
                <TabsTrigger 
                  value="cadastros"
                  className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700"
                  onClick={() => { if (cadastroAreas.length === 0) fetchCadastros(); }}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Cadastros Estrutura
                </TabsTrigger>
                <TabsTrigger 
                  value="users" 
                  className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Usuários Estrutura
                </TabsTrigger>
                <TabsTrigger 
                  value="cadastros_clientes" 
                  className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Cadastros Clientes
                </TabsTrigger>
                <TabsTrigger 
                  value="cadastro_categorias" 
                  className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700"
                >
                  <FolderKanban className="h-4 w-4 mr-2" />
                  Cadastro Categorias
                </TabsTrigger>
              </TabsList>

              {/* Pages Tab */}
              <TabsContent value="pages" className="space-y-4">
                {/* Header com botão de atualizar */}
                <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                  <div>
                    <h3 className="text-base font-medium text-slate-900">Páginas Cadastradas</h3>
                    <p className="text-sm text-slate-500">Atualize para ver novas páginas implementadas</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshPages}
                    disabled={loadingPages || isSyncing}
                    className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-teal-600"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${(loadingPages || isSyncing) ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando...' : 'Atualizar lista'}
                  </Button>
                </div>

                {loadingPages ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
                  </div>
                ) : (
                  Object.entries(groupedPages).map(([category, categoryPages]) => {
                    const isExpanded = expandedCategories[category];
                    const visiblePages = isExpanded 
                      ? categoryPages 
                      : categoryPages.slice(0, INITIAL_VISIBLE_PAGES);
                    const hasMore = categoryPages.length > INITIAL_VISIBLE_PAGES;
                    const remainingCount = categoryPages.length - INITIAL_VISIBLE_PAGES;

                    return (
                      <Card key={category} className="bg-white border-slate-200/60 shadow-sm">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <Badge className={getCategoryColor(category)}>
                              {getCategoryLabel(category)}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {categoryPages.length} páginas
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow className="border-slate-200 hover:bg-transparent">
                                <TableHead className="text-slate-600 bg-slate-50">Página</TableHead>
                                <TableHead className="text-slate-600 bg-slate-50">Caminho</TableHead>
                                <TableHead className="text-slate-600 bg-slate-50">Requisitos</TableHead>
                                <TableHead className="text-slate-600 bg-slate-50 text-right">Ativo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {visiblePages.map((page) => (
                                <TableRow key={page.id} className="border-slate-200 hover:bg-slate-50">
                                  <TableCell>
                                    <div>
                                      <p className="font-medium text-slate-900">{page.page_name}</p>
                                      {page.page_description && (
                                        <p className="text-xs text-slate-500">{page.page_description}</p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-slate-600 font-mono text-xs">
                                    {page.page_path}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      {page.requires_admin && (
                                        <Badge variant="outline" className="text-xs border-red-200 text-red-600 bg-red-50">
                                          Admin
                                        </Badge>
                                      )}
                                      {page.requires_team_member && (
                                        <Badge variant="outline" className="text-xs border-teal-200 text-teal-600 bg-teal-50">
                                          Team
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Switch
                                      checked={page.is_active}
                                      onCheckedChange={(checked) => 
                                        togglePageMutation.mutate({ id: page.id, isActive: checked })
                                      }
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>

                          {hasMore && (
                            <div className="pt-3 border-t border-slate-200 mt-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-slate-600 hover:text-teal-600 hover:bg-slate-50"
                                onClick={() => toggleCategoryExpansion(category)}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-4 w-4 mr-2" />
                                    Ocultar registros
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-4 w-4 mr-2" />
                                    Mostrar mais {remainingCount} registros
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users" className="space-y-4">
                {/* Header com botão de criar usuário */}
                <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                  <div>
                    <h3 className="text-base font-medium text-slate-900">Usuários do Sistema</h3>
                    <p className="text-sm text-slate-500">Gerencie usuários e suas permissões de acesso</p>
                  </div>
                  <Dialog open={isCreateOpen} onOpenChange={(open) => {
                    if (!open) handleCloseCreateDialog();
                    else setIsCreateOpen(true);
                  }}>
                    <DialogTrigger asChild>
                      <Button className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
                        <UserPlus className="h-4 w-4" />
                        Criar Novo Usuário
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg bg-white border-slate-200 max-h-[85vh] overflow-y-auto">
                      {createdCredentials ? (
                        <>
                          <DialogHeader>
                            <DialogTitle className="text-slate-900 flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-teal-600" />
                              Usuário Criado!
                            </DialogTitle>
                            <DialogDescription className="text-slate-500">
                              Compartilhe as credenciais abaixo com o novo usuário
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label className="text-slate-500 text-xs">Email</Label>
                                  <p className="text-slate-900 font-mono text-sm">{createdCredentials.email}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-600 hover:text-teal-600"
                                  onClick={() => copyToClipboard(createdCredentials.email)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label className="text-slate-500 text-xs">Senha temporária</Label>
                                  <p className="text-slate-900 font-mono text-sm">{createdCredentials.password}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-600 hover:text-teal-600"
                                  onClick={() => copyToClipboard(createdCredentials.password)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 text-center">
                              O usuário deve trocar a senha no primeiro acesso
                            </p>
                          </div>
                          <DialogFooter>
                            <Button 
                              onClick={handleCloseCreateDialog}
                              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                            >
                              Fechar
                            </Button>
                          </DialogFooter>
                        </>
                      ) : (
                        <form onSubmit={handleCreateUser}>
                          <DialogHeader>
                            <DialogTitle className="text-slate-900">Criar Novo Usuário</DialogTitle>
                            <DialogDescription className="text-slate-500">
                              Preencha os dados para criar um novo membro da equipe
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="first_name" className="text-slate-700">Nome *</Label>
                                <Input
                                  id="first_name"
                                  value={newUser.first_name}
                                  onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                                  className="bg-white border-slate-200 text-slate-900"
                                  placeholder="Nome"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="last_name" className="text-slate-700">Sobrenome *</Label>
                                <Input
                                  id="last_name"
                                  value={newUser.last_name}
                                  onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                                  className="bg-white border-slate-200 text-slate-900"
                                  placeholder="Sobrenome"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email" className="text-slate-700">Email *</Label>
                              <Input
                                id="email"
                                type="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                className="bg-white border-slate-200 text-slate-900"
                                placeholder="email@exemplo.com"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="password" className="text-slate-700">Senha *</Label>
                              <div className="relative">
                                <Input
                                  id="password"
                                  type={showPassword ? 'text' : 'password'}
                                  value={newUser.password}
                                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                  className="bg-white border-slate-200 text-slate-900 pr-10"
                                  placeholder="Mínimo 6 caracteres"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-teal-600"
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <Label className="text-slate-700 text-sm font-medium">Papéis do usuário</Label>
                              {[
                                { value: 'admin', label: 'Administrador', desc: 'Acesso total ao sistema' },
                                { value: 'team_member', label: 'Membro', desc: 'Acesso às áreas da equipe' },
                                { value: 'lider', label: 'Líder Geral', desc: 'Visibilidade global de projetos e tarefas' },
                                { value: 'sublider', label: 'Sublíder', desc: 'Apoio à liderança com visibilidade ampliada' },
                                { value: 'client', label: 'Cliente', desc: 'Acesso ao portal do cliente' },
                                { value: 'timecliente', label: 'Time Cliente', desc: 'Membro da equipe do cliente' },
                              ].map((role) => (
                                <div key={role.value} className="flex items-start space-x-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                                  <Checkbox
                                    id={`role_${role.value}`}
                                    checked={newUser.roles.includes(role.value)}
                                    onCheckedChange={(checked) => {
                                      setNewUser(prev => ({
                                        ...prev,
                                        roles: checked
                                          ? [...prev.roles, role.value]
                                          : prev.roles.filter(r => r !== role.value),
                                      }));
                                    }}
                                    className="border-slate-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 mt-0.5"
                                  />
                                  <div>
                                    <Label htmlFor={`role_${role.value}`} className="text-slate-900 text-sm font-medium cursor-pointer">
                                      {role.label}
                                    </Label>
                                    <p className="text-xs text-slate-500">{role.desc}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {(newUser.roles.includes('team_member') || newUser.roles.includes('lider') || newUser.roles.includes('sublider')) && (
                              <div className="space-y-3">
                                <Label className="text-slate-700 text-sm font-medium">Áreas de Acesso</Label>
                                <p className="text-xs text-slate-500">Selecione as áreas que o membro terá acesso</p>
                                {Object.entries(AREA_CATEGORIES_MAP).map(([key, area]) => (
                                  <div key={key} className="flex items-start space-x-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                                    <Checkbox
                                      id={`area_${key}`}
                                      checked={newUser.areas.includes(key)}
                                      onCheckedChange={(checked) => {
                                        setNewUser(prev => ({
                                          ...prev,
                                          areas: checked
                                            ? [...prev.areas, key]
                                            : prev.areas.filter(a => a !== key),
                                        }));
                                      }}
                                      className="border-slate-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 mt-0.5"
                                    />
                                    <div>
                                      <Label htmlFor={`area_${key}`} className="text-slate-900 text-sm font-medium cursor-pointer">
                                        {area.label}
                                      </Label>
                                      <p className="text-xs text-slate-500">
                                        {area.categories.join(', ')}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <DialogFooter className="gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleCloseCreateDialog}
                              className="border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                              Cancelar
                            </Button>
                            <Button 
                              type="submit"
                              disabled={createUserMutation.isPending}
                              className="bg-teal-600 hover:bg-teal-700 text-white"
                            >
                              {createUserMutation.isPending ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Criando...
                                </>
                              ) : (
                                'Criar Usuário'
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Users List */}
                  <Card className="bg-white border-slate-200/60 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-slate-900 text-sm">Usuários</CardTitle>
                      <CardDescription className="text-slate-500">
                        Selecione um usuário para gerenciar acessos
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                      {loadingUsers ? (
                        <div className="flex items-center justify-center py-4">
                          <RefreshCw className="h-5 w-5 animate-spin text-teal-600" />
                        </div>
                      ) : (
                        users?.map((u) => (
                          <button
                            key={u.id}
                            className={`w-full p-3 rounded-lg text-left transition-colors ${
                              selectedUserId === u.id
                                ? 'bg-teal-500/10 border border-teal-200'
                                : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                            }`}
                            onClick={() => setSelectedUserId(u.id)}
                          >
                            <p className="font-medium text-slate-900 text-sm">
                              {u.first_name} {u.last_name}
                            </p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                            <div className="flex gap-1 mt-1">
                              {u.roles.map((role) => (
                                <Badge
                                  key={role}
                                  variant="outline"
                                  className={`text-xs ${
                                    role === 'admin'
                                      ? 'border-red-200 text-red-600 bg-red-50'
                                      : role === 'lider'
                                      ? 'border-amber-200 text-amber-600 bg-amber-50'
                                      : role === 'sublider'
                                      ? 'border-orange-200 text-orange-600 bg-orange-50'
                                      : role === 'team_member'
                                      ? 'border-teal-200 text-teal-600 bg-teal-50'
                                      : role === 'timecliente'
                                      ? 'border-cyan-200 text-cyan-600 bg-cyan-50'
                                      : 'border-slate-200 text-slate-600 bg-slate-50'
                                  }`}
                                >
                                  {{ admin: 'Admin', team_member: 'Membro', lider: 'Líder Geral', sublider: 'Sublíder', client: 'Cliente', timecliente: 'Time Cliente' }[role] || role}
                                </Badge>
                              ))}
                            </div>
                          </button>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* User Permissions */}
                  <Card className="lg:col-span-2 bg-white border-slate-200/60 shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-slate-900 text-sm">
                            {selectedUser
                              ? `Acessos de ${selectedUser.first_name} ${selectedUser.last_name}`
                              : 'Selecione um usuário'}
                          </CardTitle>
                          <CardDescription className="text-slate-500">
                            Gerencie as permissões individuais de acesso às páginas
                          </CardDescription>
                        </div>
                        {selectedUser && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleOpenEdit}
                              className="border-slate-200 text-slate-600 hover:text-teal-600 hover:bg-teal-50"
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            {selectedUser.id !== user?.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsDeleteOpen(true)}
                                className="border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Excluir
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="max-h-[600px] overflow-y-auto">
                      {selectedUserId ? (
                        <div className="space-y-4">
                          {Object.entries(groupedPages).map(([category, categoryPages]) => (
                            <div key={category} className="space-y-2">
                              <Badge className={getCategoryColor(category)}>
                                {getCategoryLabel(category)}
                              </Badge>
                              <div className="space-y-1">
                                {categoryPages.map((page) => {
                                  const userHasAccess = hasAccess(selectedUserId, page.id);
                                  const userIsAdmin = selectedUser?.roles.includes('admin') || false;
                                  const requiresAdminOnly = page.requires_admin && !userIsAdmin;
                                  return (
                                    <div
                                      key={page.id}
                                      className={`flex items-center justify-between p-2 rounded-lg ${requiresAdminOnly ? 'bg-slate-100 opacity-60' : 'bg-slate-50'}`}
                                    >
                                      <div>
                                        <p className="text-sm text-slate-900">{page.page_name}</p>
                                        <p className="text-xs text-slate-500">{page.page_path}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {requiresAdminOnly ? (
                                          <span className="text-xs text-slate-400 italic" title="Requer permissão de administrador">
                                            Requer admin
                                          </span>
                                        ) : userHasAccess ? (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() =>
                                              revokeAccessMutation.mutate({
                                                userId: selectedUserId,
                                                pageId: page.id,
                                              })
                                            }
                                          >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Revogar
                                          </Button>
                                        ) : (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                            onClick={() =>
                                              grantAccessMutation.mutate({
                                                userId: selectedUserId,
                                                pageId: page.id,
                                              })
                                            }
                                          >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Conceder
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Selecione um usuário na lista ao lado</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Cadastros Estrutura Tab */}
              <TabsContent value="cadastros" className="space-y-4">
                <EstruturaManager />
              </TabsContent>

              {/* Cadastros Clientes Tab */}
              <TabsContent value="cadastros_clientes" className="space-y-4">
                <GestaoClientesContent />
              </TabsContent>

              {/* Cadastro Categorias Tab */}
              <TabsContent value="cadastro_categorias" className="space-y-4">
                <CadastroCategorias />
              </TabsContent>
            </Tabs>

      {/* Cadastro Dialog */}
      <Dialog open={cadastroDialogOpen} onOpenChange={setCadastroDialogOpen}>
        <DialogContent className="bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">{editingArea ? 'Editar Área' : 'Nova Área'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cadastro-name">Nome da Área *</Label>
              <Input id="cadastro-name" value={cadastroForm.name} onChange={(e) => setCadastroForm({ ...cadastroForm, name: e.target.value })} placeholder="Ex: Fiscal, Consultoria, Digital..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cadastro-responsible">Líder da Área</Label>
              <Input id="cadastro-responsible" value={cadastroForm.responsible} onChange={(e) => setCadastroForm({ ...cadastroForm, responsible: e.target.value })} placeholder="Ex: Ricardo, Felipe..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cadastro-description">Descrição</Label>
              <Input id="cadastro-description" value={cadastroForm.description} onChange={(e) => setCadastroForm({ ...cadastroForm, description: e.target.value })} placeholder="Descrição opcional" />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {colorPresets.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${cadastroForm.color === color ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setCadastroForm({ ...cadastroForm, color })}
                    />
                  ))}
                </div>
                <Input type="color" value={cadastroForm.color} onChange={(e) => setCadastroForm({ ...cadastroForm, color: e.target.value })} className="w-12 h-8 p-0 border-0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vincular à Estrutura Organizacional</Label>
              <Select
                value={cadastroForm.estrutura_area_id}
                onValueChange={(value) => setCadastroForm({ ...cadastroForm, estrutura_area_id: value === '_none' ? '' : value })}
              >
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue placeholder="Nenhuma (sem vínculo)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhuma (sem vínculo)</SelectItem>
                  {estruturaAreas.map((ea) => (
                    <SelectItem key={ea.id} value={ea.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ea.color || '#94a3b8' }} />
                        {ea.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">Associa esta área legada à estrutura organizacional (cluster → área → equipe)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCadastroDialogOpen(false)} className="border-slate-200 text-slate-600">Cancelar</Button>
            <Button onClick={handleSaveCadastro} className="bg-teal-600 hover:bg-teal-700 text-white">{editingArea ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </div>
        </main>
      </ScrollArea>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg bg-white border-slate-200 max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className="text-slate-900">Editar Usuário</DialogTitle>
              <DialogDescription className="text-slate-500">
                Altere os dados e papéis do usuário
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_first_name" className="text-slate-700">Nome *</Label>
                  <Input
                    id="edit_first_name"
                    value={editUser.first_name}
                    onChange={(e) => setEditUser({ ...editUser, first_name: e.target.value })}
                    className="bg-white border-slate-200 text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_last_name" className="text-slate-700">Sobrenome *</Label>
                  <Input
                    id="edit_last_name"
                    value={editUser.last_name}
                    onChange={(e) => setEditUser({ ...editUser, last_name: e.target.value })}
                    className="bg-white border-slate-200 text-slate-900"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_email" className="text-slate-700">Email *</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  className="bg-white border-slate-200 text-slate-900"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-slate-700 text-sm font-medium">Papéis do usuário</Label>
                {[
                  { value: 'admin', label: 'Administrador', desc: 'Acesso total ao sistema' },
                  { value: 'team_member', label: 'Membro', desc: 'Acesso às áreas da equipe' },
                  { value: 'lider', label: 'Líder Geral', desc: 'Visibilidade global de projetos e tarefas' },
                  { value: 'sublider', label: 'Sublíder', desc: 'Apoio à liderança com visibilidade ampliada' },
                  { value: 'client', label: 'Cliente', desc: 'Acesso ao portal do cliente' },
                  { value: 'timecliente', label: 'Time Cliente', desc: 'Membro da equipe do cliente' },
                ].map((role) => (
                  <div key={role.value} className="flex items-start space-x-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <Checkbox
                      id={`edit_role_${role.value}`}
                      checked={editUser.roles.includes(role.value)}
                      onCheckedChange={(checked) => {
                        setEditUser(prev => ({
                          ...prev,
                          roles: checked
                            ? [...prev.roles, role.value]
                            : prev.roles.filter(r => r !== role.value),
                        }));
                      }}
                      className="border-slate-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 mt-0.5"
                    />
                    <div>
                      <Label htmlFor={`edit_role_${role.value}`} className="text-slate-900 text-sm font-medium cursor-pointer">
                        {role.label}
                      </Label>
                      <p className="text-xs text-slate-500">{role.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              {(editUser.roles.includes('team_member') || editUser.roles.includes('lider') || editUser.roles.includes('sublider')) && (
                <div className="space-y-3">
                  <Label className="text-slate-700 text-sm font-medium">Áreas de Acesso</Label>
                  <p className="text-xs text-slate-500">Selecione as áreas que o membro terá acesso</p>
                  {Object.entries(AREA_CATEGORIES_MAP).map(([key, area]) => (
                    <div key={key} className="flex items-start space-x-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <Checkbox
                        id={`edit_area_${key}`}
                        checked={editUser.areas.includes(key)}
                        onCheckedChange={(checked) => {
                          setEditUser(prev => ({
                            ...prev,
                            areas: checked
                              ? [...prev.areas, key]
                              : prev.areas.filter(a => a !== key),
                          }));
                        }}
                        className="border-slate-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 mt-0.5"
                      />
                      <div>
                        <Label htmlFor={`edit_area_${key}`} className="text-slate-900 text-sm font-medium cursor-pointer">
                          {area.label}
                        </Label>
                        <p className="text-xs text-slate-500">
                          {area.categories.join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={editUserMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {editUserMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-white border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Tem certeza que deseja excluir o usuário{' '}
              <strong className="text-slate-700">
                {selectedUser?.first_name} {selectedUser?.last_name}
              </strong>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 text-slate-600">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserMutation.mutate()}
              disabled={deleteUserMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Usuário'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EquipeControleAcessos;
