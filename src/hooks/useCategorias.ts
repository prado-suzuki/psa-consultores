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

// EmpresaFat removida — empresas agora vivem dentro de estrutura_clusters


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
    /** Devolve o id do item criado (ou o editado), para a tela já selecioná-lo. */
    save: async (editId: string | null, codigo: string, nome: string, clusterId: string | null): Promise<string> => {
      if (!codigo.trim() || !nome.trim()) { toast.error('Código e nome são obrigatórios'); throw new Error('Validation'); }
      const payload = { codigo: codigo.trim().toUpperCase(), nome: nome.trim(), cluster_id: clusterId || null };
      const entityName = `${payload.codigo} - ${payload.nome}`;
      try {
        let id = editId;
        if (editId) {
          const { error } = await supabase.from('produto_segmento').update(payload).eq('id', editId);
          if (error) throw error;
          logAction({ area: 'cadastros', entity_type: 'produto_segmento', entity_id: editId, entity_name: entityName, action: 'updated' });
          toast.success('Item atualizado');
        } else {
          const { data, error } = await supabase.from('produto_segmento').insert(payload).select('id').single();
          if (error) throw error;
          id = data.id;
          logAction({ area: 'cadastros', entity_type: 'produto_segmento', entity_id: data.id, entity_name: entityName, action: 'created' });
          toast.success('Item criado');
        }
        qc.invalidateQueries({ queryKey: ['produto_segmento'] });
        return id!;
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
    /** Devolve o id do serviço criado (ou o editado), para a tela já vinculá-lo. */
    save: async (editId: string | null, nome: string, clusterId: string | null): Promise<string> => {
      if (!nome.trim()) { toast.error('Nome obrigatório'); throw new Error('Validation'); }
      const payload: any = { nome: nome.trim(), cluster_id: clusterId || null };
      try {
        let id = editId;
        if (editId) {
          const { error } = await (supabase.from('servicos_prestados' as any) as any).update(payload).eq('id', editId);
          if (error) throw error;
          logAction({ area: 'cadastros', entity_type: 'servico', entity_id: editId, entity_name: nome.trim(), action: 'updated' });
          toast.success('Serviço atualizado');
        } else {
          const { data, error } = await (supabase.from('servicos_prestados' as any) as any).insert(payload).select('id').single();
          if (error) throw error;
          id = data.id;
          logAction({ area: 'cadastros', entity_type: 'servico', entity_id: data.id, entity_name: nome.trim(), action: 'created' });
          toast.success('Serviço criado');
        }
        qc.invalidateQueries({ queryKey: ['servicos_prestados'] });
        qc.invalidateQueries({ queryKey: ['servicos_prestados_services'] });
        return id!;
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
// Tabela `empresas_faturamento` foi mesclada em `estrutura_clusters`.
// Hooks removidos — gerencie empresa/cnpj/centro de custo direto no cluster.


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

/** Lê `code`/`message` do erro do Supabase sem recorrer a `any`. */
const erroSupabase = (erro: unknown): { code?: string; message?: string } =>
  (erro && typeof erro === 'object' ? erro : {}) as { code?: string; message?: string };

/** Prefixo do id de linha otimista — nunca chega ao banco. */
const VINCULO_OTIMISTA = 'otimista:';

export const isVinculoOtimista = (id: string) => id.startsWith(VINCULO_OTIMISTA);

/**
 * O vínculo produto×serviço define quais serviços aparecem no cadastro de
 * projetos (`project-servicos-by-produto`), então toda mutação aqui invalida
 * também essa lista para a outra tela não ficar com dado velho.
 */
const invalidarVinculos = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['produto_servico'] });
  qc.invalidateQueries({ queryKey: ['project-servicos-by-produto'] });
};

interface ProdutoServicoToggleVars {
  produtoSegmentoId: string;
  servicoPrestadoId: string;
  /** Vínculo atual quando a ação é desvincular; `null` para criar. */
  vinculoAtual: ProdutoServico | null;
  entityName: string;
}

/**
 * Liga/desliga um vínculo com atualização otimista do cache: a marcação
 * responde na hora e o sucesso não dispara toast — o próprio estado do
 * checkbox é o feedback. Erro faz rollback e avisa.
 */
export const useProdutoServicoToggle = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (vars: ProdutoServicoToggleVars) => {
      if (vars.vinculoAtual) {
        const { error } = await supabase.from('produto_servico').delete().eq('id', vars.vinculoAtual.id);
        if (error) throw error;
        return { action: 'deleted' as const, id: vars.vinculoAtual.id };
      }
      const { data, error } = await supabase
        .from('produto_servico')
        .insert({ produto_segmento_id: vars.produtoSegmentoId, servico_prestado_id: vars.servicoPrestadoId })
        .select('id')
        .single();
      if (error) throw error;
      return { action: 'created' as const, id: data.id };
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['produto_servico'] });
      const anterior = qc.getQueryData<ProdutoServico[]>(['produto_servico']);
      qc.setQueryData<ProdutoServico[]>(['produto_servico'], (atual = []) =>
        vars.vinculoAtual
          ? atual.filter(i => i.id !== vars.vinculoAtual!.id)
          : [...atual, {
              id: `${VINCULO_OTIMISTA}${vars.produtoSegmentoId}:${vars.servicoPrestadoId}`,
              produto_segmento_id: vars.produtoSegmentoId,
              servico_prestado_id: vars.servicoPrestadoId,
              produto_segmento: null,
              servicos_prestados: null,
            }],
      );
      return { anterior };
    },
    onSuccess: (resultado, vars) => {
      logAction({
        area: 'cadastros', entity_type: 'produto_servico',
        entity_id: resultado.id, entity_name: vars.entityName, action: resultado.action,
      });
    },
    onError: (erro: unknown, _vars, contexto) => {
      if (contexto?.anterior) qc.setQueryData(['produto_servico'], contexto.anterior);
      const { code, message } = erroSupabase(erro);
      if (code === '23505') toast.error('Este vínculo já existe');
      else toast.error(message || 'Erro ao salvar vínculo');
    },
    onSettled: () => invalidarVinculos(qc),
  });
};

export type ProdutoServicoLoteVars =
  | {
      acao: 'vincular';
      produtoSegmentoId: string;
      produtoCodigo: string;
      servicos: { id: string; nome: string }[];
    }
  | {
      acao: 'desvincular';
      produtoCodigo: string;
      vinculos: { id: string; servicoNome: string }[];
    };

/** Vincula/desvincula vários serviços de uma vez, com um único toast de resumo. */
export const useProdutoServicoLote = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (vars: ProdutoServicoLoteVars) => {
      if (vars.acao === 'vincular') {
        const { data, error } = await supabase
          .from('produto_servico')
          .insert(vars.servicos.map(s => ({
            produto_segmento_id: vars.produtoSegmentoId,
            servico_prestado_id: s.id,
          })))
          .select('id, servico_prestado_id');
        if (error) throw error;
        return { acao: 'vincular' as const, criados: data ?? [] };
      }
      const { error } = await supabase
        .from('produto_servico')
        .delete()
        .in('id', vars.vinculos.map(v => v.id));
      if (error) throw error;
      return { acao: 'desvincular' as const };
    },
    onSuccess: (resultado, vars) => {
      if (resultado.acao === 'vincular' && vars.acao === 'vincular') {
        const nomePorServico = new Map(vars.servicos.map(s => [s.id, s.nome]));
        resultado.criados.forEach(linha => {
          logAction({
            area: 'cadastros', entity_type: 'produto_servico', entity_id: linha.id,
            entity_name: `${vars.produtoCodigo} → ${nomePorServico.get(linha.servico_prestado_id) || '?'}`,
            action: 'created',
          });
        });
        toast.success(`${resultado.criados.length} vínculo(s) criado(s)`);
        return;
      }
      if (vars.acao === 'desvincular') {
        vars.vinculos.forEach(vinculo => {
          logAction({
            area: 'cadastros', entity_type: 'produto_servico', entity_id: vinculo.id,
            entity_name: `${vars.produtoCodigo} → ${vinculo.servicoNome}`, action: 'deleted',
          });
        });
        toast.success(`${vars.vinculos.length} vínculo(s) removido(s)`);
      }
    },
    onError: (erro: unknown) => {
      toast.error(erroSupabase(erro).message || 'Erro ao aplicar os vínculos');
    },
    onSettled: () => invalidarVinculos(qc),
  });
};
