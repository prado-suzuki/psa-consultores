import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────

export interface ProdutoSegmento {
  id: string;
  codigo: string;
  nome: string;
  is_active: boolean;
  cluster_id: string | null;
  estrutura_clusters: { name: string } | null;
}

export interface ServicoPrestado {
  id: string;
  nome: string;
  cluster_id: string | null;
  estrutura_clusters: { name: string } | null;
}

export interface CentroCusto {
  id: string;
  codigo: string;
  nome: string;
  is_active: boolean;
}

export interface EmpresaFat {
  id: string;
  nome: string;
  cnpj: string | null;
  centro_custo_id: string | null;
  is_active: boolean;
}

// ── Produto/Segmento ───────────────────────────────────────────────────

export const useProdutoSegmentoList = () =>
  useQuery({
    queryKey: ['produto_segmento'],
    queryFn: async () => {
      const { data, error } = await supabase.from('produto_segmento').select('id, codigo, nome, is_active, cluster_id, estrutura_clusters(name)').order('codigo');
      if (error) throw error;
      return (data || []) as ProdutoSegmento[];
    },
  });

export const useProdutoSegmentoSave = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return {
    save: async (editId: string | null, codigo: string, nome: string, clusterId: string | null) => {
      if (!codigo.trim() || !nome.trim()) { toast.error('Código e nome são obrigatórios'); throw new Error('Validation'); }
      const payload = { codigo: codigo.trim().toUpperCase(), nome: nome.trim(), cluster_id: clusterId || null };
      const entityName = `${payload.codigo} - ${payload.nome}`;
      try {
        if (editId) {
          const { error } = await supabase.from('produto_segmento').update(payload).eq('id', editId);
          if (error) throw error;
          logAction({ area: 'cadastros', entity_type: 'produto_segmento', entity_id: editId, entity_name: entityName, action: 'updated' });
          toast.success('Item atualizado');
        } else {
          const { data, error } = await supabase.from('produto_segmento').insert(payload).select('id').single();
          if (error) throw error;
          logAction({ area: 'cadastros', entity_type: 'produto_segmento', entity_id: data.id, entity_name: entityName, action: 'created' });
          toast.success('Item criado');
        }
        qc.invalidateQueries({ queryKey: ['produto_segmento'] });
      } catch (e: any) {
        if (e.code === '23505') toast.error('Código já existe');
        else if (e.message !== 'Validation') toast.error(e.message || 'Erro ao salvar');
        throw e;
      }
    },
  };
};

export const useProdutoSegmentoToggle = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (item: ProdutoSegmento) => {
      const { error } = await supabase.from('produto_segmento').update({ is_active: !item.is_active }).eq('id', item.id);
      if (error) throw error;
      return item;
    },
    onSuccess: (_, item) => {
      qc.invalidateQueries({ queryKey: ['produto_segmento'] });
      logAction({ area: 'cadastros', entity_type: 'produto_segmento', entity_id: item.id, entity_name: item.codigo, action: 'updated', changed_fields: { is_active: { old: item.is_active, new: !item.is_active } } });
    },
  });
};

export const useProdutoSegmentoDelete = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return {
    remove: async (item: ProdutoSegmento) => {
      try {
        const { error } = await supabase.from('produto_segmento').delete().eq('id', item.id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ['produto_segmento'] });
        toast.success('Item excluído');
        logAction({ area: 'cadastros', entity_type: 'produto_segmento', entity_id: item.id, entity_name: item.codigo, action: 'deleted' });
      } catch {
        toast.error('Erro ao excluir');
      }
    },
  };
};

// ── Serviços Prestados ─────────────────────────────────────────────────

export const useServicosPrestadosList = () =>
  useQuery({
    queryKey: ['servicos_prestados'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('servicos_prestados' as any)
        .select('id, nome, cluster_id, estrutura_clusters(name)') as any)
        .order('nome');
      if (error) throw error;
      return (data || []) as ServicoPrestado[];
    },
  });

export const useServicosPrestadosSave = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return {
    save: async (editId: string | null, nome: string, clusterId: string | null) => {
      if (!nome.trim()) { toast.error('Nome obrigatório'); throw new Error('Validation'); }
      const payload: any = { nome: nome.trim(), cluster_id: clusterId || null };
      try {
        if (editId) {
          const { error } = await (supabase.from('servicos_prestados' as any) as any).update(payload).eq('id', editId);
          if (error) throw error;
          logAction({ area: 'cadastros', entity_type: 'servico', entity_id: editId, entity_name: nome.trim(), action: 'updated' });
          toast.success('Serviço atualizado');
        } else {
          const { data, error } = await (supabase.from('servicos_prestados' as any) as any).insert(payload).select('id').single();
          if (error) throw error;
          logAction({ area: 'cadastros', entity_type: 'servico', entity_id: data.id, entity_name: nome.trim(), action: 'created' });
          toast.success('Serviço criado');
        }
        qc.invalidateQueries({ queryKey: ['servicos_prestados'] });
        qc.invalidateQueries({ queryKey: ['servicos_prestados_services'] });
      } catch (e: any) {
        if (e.message !== 'Validation') toast.error(e.message || 'Erro ao salvar');
        throw e;
      }
    },
  };
};

export const useServicosPrestadosDelete = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return {
    remove: async (item: { id: string; nome: string }) => {
      try {
        const { error } = await (supabase.from('servicos_prestados' as any) as any).delete().eq('id', item.id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ['servicos_prestados'] });
        qc.invalidateQueries({ queryKey: ['servicos_prestados_services'] });
        toast.success('Serviço excluído');
        logAction({ area: 'cadastros', entity_type: 'servico', entity_id: item.id, entity_name: item.nome, action: 'deleted' });
      } catch (e: any) {
        if (e.code === '23503') toast.error('Não é possível excluir: serviço em uso');
        else toast.error('Erro ao excluir');
      }
    },
  };
};

// ── Centros de Custo ───────────────────────────────────────────────────

export const useCentroCustoList = () =>
  useQuery({
    queryKey: ['centros_custo'],
    queryFn: async () => {
      const { data, error } = await supabase.from('centros_custo').select('*').order('codigo');
      if (error) throw error;
      return data as CentroCusto[];
    },
  });

export const useCentroCustoSave = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return {
    save: async (editId: string | null, codigo: string, nome: string) => {
      if (!codigo.trim() || !nome.trim()) { toast.error('Código e nome são obrigatórios'); throw new Error('Validation'); }
      const payload = { codigo: codigo.trim().toUpperCase(), nome: nome.trim() };
      const entityName = `${payload.codigo} - ${payload.nome}`;
      try {
        if (editId) {
          const { error } = await supabase.from('centros_custo').update(payload).eq('id', editId);
          if (error) throw error;
          logAction({ area: 'cadastros', entity_type: 'centro_custo', entity_id: editId, entity_name: entityName, action: 'updated' });
          toast.success('Centro de custo atualizado');
        } else {
          const { data, error } = await supabase.from('centros_custo').insert(payload).select('id').single();
          if (error) throw error;
          logAction({ area: 'cadastros', entity_type: 'centro_custo', entity_id: data.id, entity_name: entityName, action: 'created' });
          toast.success('Centro de custo criado');
        }
        qc.invalidateQueries({ queryKey: ['centros_custo'] });
      } catch (e: any) {
        if (e.code === '23505') toast.error('Código já existe');
        else if (e.message !== 'Validation') toast.error(e.message || 'Erro ao salvar');
        throw e;
      }
    },
  };
};

export const useCentroCustoToggle = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (item: CentroCusto) => {
      const { error } = await supabase.from('centros_custo').update({ is_active: !item.is_active }).eq('id', item.id);
      if (error) throw error;
      return item;
    },
    onSuccess: (_, item) => {
      qc.invalidateQueries({ queryKey: ['centros_custo'] });
      logAction({ area: 'cadastros', entity_type: 'centro_custo', entity_id: item.id, entity_name: item.codigo, action: 'updated', changed_fields: { is_active: { old: item.is_active, new: !item.is_active } } });
    },
  });
};

export const useCentroCustoDelete = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return {
    remove: async (item: CentroCusto) => {
      try {
        const { error } = await supabase.from('centros_custo').delete().eq('id', item.id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ['centros_custo'] });
        toast.success('Centro de custo excluído');
        logAction({ area: 'cadastros', entity_type: 'centro_custo', entity_id: item.id, entity_name: item.codigo, action: 'deleted' });
      } catch (e: any) {
        if (e.code === '23503') toast.error('Não é possível excluir: centro de custo em uso');
        else toast.error('Erro ao excluir');
      }
    },
  };
};

// ── Empresas Faturamento ───────────────────────────────────────────────

export const useEmpresasFaturamentoList = () =>
  useQuery({
    queryKey: ['empresas_faturamento'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas_faturamento').select('*').order('nome');
      if (error) throw error;
      return data as EmpresaFat[];
    },
  });

export const useEmpresaFaturamentoSave = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return {
    save: async (editId: string | null, nome: string, cnpj: string | null, centroCustoId: string | null) => {
      if (!nome.trim()) { toast.error('Nome é obrigatório'); throw new Error('Validation'); }
      const payload = { nome: nome.trim(), cnpj: cnpj?.trim() || null, centro_custo_id: centroCustoId || null };
      try {
        if (editId) {
          const { error } = await supabase.from('empresas_faturamento').update(payload).eq('id', editId);
          if (error) throw error;
          logAction({ area: 'cadastros', entity_type: 'empresa', entity_id: editId, entity_name: nome.trim(), action: 'updated' });
          toast.success('Empresa atualizada');
        } else {
          const { data, error } = await supabase.from('empresas_faturamento').insert(payload).select('id').single();
          if (error) throw error;
          logAction({ area: 'cadastros', entity_type: 'empresa', entity_id: data.id, entity_name: nome.trim(), action: 'created' });
          toast.success('Empresa criada');
        }
        qc.invalidateQueries({ queryKey: ['empresas_faturamento'] });
      } catch (e: any) {
        if (e.message !== 'Validation') toast.error(e.message || 'Erro ao salvar');
        throw e;
      }
    },
  };
};

export const useEmpresaFaturamentoToggle = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (item: EmpresaFat) => {
      const { error } = await supabase.from('empresas_faturamento').update({ is_active: !item.is_active }).eq('id', item.id);
      if (error) throw error;
      return item;
    },
    onSuccess: (_, item) => {
      qc.invalidateQueries({ queryKey: ['empresas_faturamento'] });
      logAction({ area: 'cadastros', entity_type: 'empresa', entity_id: item.id, entity_name: item.nome, action: 'updated', changed_fields: { is_active: { old: item.is_active, new: !item.is_active } } });
    },
  });
};

export const useEmpresaFaturamentoDelete = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return {
    remove: async (item: EmpresaFat) => {
      try {
        const { error } = await supabase.from('empresas_faturamento').delete().eq('id', item.id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ['empresas_faturamento'] });
        toast.success('Empresa excluída');
        logAction({ area: 'cadastros', entity_type: 'empresa', entity_id: item.id, entity_name: item.nome, action: 'deleted' });
      } catch (e: any) {
        if (e.code === '23503') toast.error('Não é possível excluir: empresa em uso');
        else toast.error('Erro ao excluir');
      }
    },
  };
};

// ── Produto × Serviço ─────────────────────────────────────────────────

export interface ProdutoServico {
  id: string;
  produto_segmento_id: string;
  servico_prestado_id: string;
  produto_segmento: { codigo: string; nome: string } | null;
  servicos_prestados: { nome: string } | null;
}

export const useProdutoServicoList = () =>
  useQuery({
    queryKey: ['produto_servico'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produto_servico')
        .select('id, produto_segmento_id, servico_prestado_id, produto_segmento(codigo, nome), servicos_prestados(nome)')
        .order('produto_segmento_id');
      if (error) throw error;
      return (data || []) as unknown as ProdutoServico[];
    },
  });

export const useProdutoServicoSave = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return {
    save: async (produtoSegmentoId: string, servicoPrestadoId: string, entityName: string) => {
      if (!produtoSegmentoId || !servicoPrestadoId) { toast.error('Selecione produto e serviço'); throw new Error('Validation'); }
      try {
        const { data, error } = await supabase
          .from('produto_servico')
          .insert({ produto_segmento_id: produtoSegmentoId, servico_prestado_id: servicoPrestadoId })
          .select('id')
          .single();
        if (error) throw error;
        logAction({ area: 'cadastros', entity_type: 'produto_servico' as any, entity_id: data.id, entity_name: entityName, action: 'created' });
        toast.success('Vínculo criado');
        qc.invalidateQueries({ queryKey: ['produto_servico'] });
      } catch (e: any) {
        if (e.code === '23505') toast.error('Este vínculo já existe');
        else if (e.message !== 'Validation') toast.error(e.message || 'Erro ao salvar');
        throw e;
      }
    },
  };
};

export const useProdutoServicoDelete = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return {
    remove: async (item: ProdutoServico) => {
      try {
        const { error } = await supabase.from('produto_servico').delete().eq('id', item.id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ['produto_servico'] });
        toast.success('Vínculo excluído');
        const entityName = `${item.produto_segmento?.codigo || '?'} → ${item.servicos_prestados?.nome || '?'}`;
        logAction({ area: 'cadastros', entity_type: 'produto_servico' as any, entity_id: item.id, entity_name: entityName, action: 'deleted' });
      } catch {
        toast.error('Erro ao excluir');
      }
    },
  };
};
