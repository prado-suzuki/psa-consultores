export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_change_log: {
        Row: {
          action: string
          changed_by: string
          created_at: string | null
          details: Json | null
          id: string
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          action: string
          changed_by: string
          created_at?: string | null
          details?: Json | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          action?: string
          changed_by?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: []
      }
      administracao: {
        Row: {
          administrador_pessoa_id: string
          cargo: string | null
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          pj_pessoa_id: string
          pode_isoladamente: boolean | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          administrador_pessoa_id: string
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          pj_pessoa_id: string
          pode_isoladamente?: boolean | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          administrador_pessoa_id?: string
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          pj_pessoa_id?: string
          pode_isoladamente?: boolean | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "administracao_administrador_pessoa_id_fkey"
            columns: ["administrador_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "administracao_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "administracao_pj_pessoa_id_fkey"
            columns: ["pj_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "administracao_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analises_semestrais: {
        Row: {
          ajustes_necessarios: string | null
          ciclo_id: string | null
          comentario_avaliado: string | null
          comentario_lider: string | null
          created_at: string | null
          entregas_realizadas: string | null
          id: string
          responsavel_id: string | null
          riscos_identificados: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          ajustes_necessarios?: string | null
          ciclo_id?: string | null
          comentario_avaliado?: string | null
          comentario_lider?: string | null
          created_at?: string | null
          entregas_realizadas?: string | null
          id?: string
          responsavel_id?: string | null
          riscos_identificados?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          ajustes_necessarios?: string | null
          ciclo_id?: string | null
          comentario_avaliado?: string | null
          comentario_lider?: string | null
          created_at?: string | null
          entregas_realizadas?: string | null
          id?: string
          responsavel_id?: string | null
          riscos_identificados?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analises_semestrais_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          },
        ]
      }
      area_servicos: {
        Row: {
          estrutura_area_id: string
          id: string
          servico_id: string
        }
        Insert: {
          estrutura_area_id: string
          id?: string
          servico_id: string
        }
        Update: {
          estrutura_area_id?: string
          id?: string
          servico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "area_servicos_estrutura_area_id_fkey"
            columns: ["estrutura_area_id"]
            isOneToOne: false
            referencedRelation: "estrutura_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_area_categorias_categoria_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_prestados"
            referencedColumns: ["id"]
          },
        ]
      }
      atualizacoes_meta: {
        Row: {
          autor_id: string | null
          comentario: string | null
          created_at: string | null
          id: string
          meta_id: string | null
          progresso_anterior: number | null
          progresso_novo: number | null
        }
        Insert: {
          autor_id?: string | null
          comentario?: string | null
          created_at?: string | null
          id?: string
          meta_id?: string | null
          progresso_anterior?: number | null
          progresso_novo?: number | null
        }
        Update: {
          autor_id?: string | null
          comentario?: string | null
          created_at?: string | null
          id?: string
          meta_id?: string | null
          progresso_anterior?: number | null
          progresso_novo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "atualizacoes_meta_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          area: string
          changed_fields: Json | null
          details: string | null
          entity_id: string
          entity_name: string
          entity_type: string
          id: string
          performed_at: string
          performed_by: string
        }
        Insert: {
          action: string
          area: string
          changed_fields?: Json | null
          details?: string | null
          entity_id: string
          entity_name: string
          entity_type: string
          id?: string
          performed_at?: string
          performed_by: string
        }
        Update: {
          action?: string
          area?: string
          changed_fields?: Json | null
          details?: string | null
          entity_id?: string
          entity_name?: string
          entity_type?: string
          id?: string
          performed_at?: string
          performed_by?: string
        }
        Relationships: []
      }
      bem: {
        Row: {
          ccir_codigo: string | null
          cliente_id: string
          created_at: string
          created_by: string | null
          denominacao: string
          descricao_outros: string | null
          empresa_destino_pessoa_id: string | null
          id: string
          imposto_anual_exercicio: number | null
          inscricao_municipal: string | null
          motivo_nao_integralizacao: string | null
          observacao: string | null
          participa_estruturacao: boolean
          referencia_dp: string
          status_integralizacao: string | null
          tipo_bem: string
          updated_at: string
          updated_by: string | null
          vlr_benfeitorias: number | null
          vlr_contabil: number | null
          vlr_contabil_ajustado: number | null
          vlr_imposto_anual: number | null
          vlr_itr_iptu: number | null
          vlr_mercado: number | null
        }
        Insert: {
          ccir_codigo?: string | null
          cliente_id: string
          created_at?: string
          created_by?: string | null
          denominacao: string
          descricao_outros?: string | null
          empresa_destino_pessoa_id?: string | null
          id?: string
          imposto_anual_exercicio?: number | null
          inscricao_municipal?: string | null
          motivo_nao_integralizacao?: string | null
          observacao?: string | null
          participa_estruturacao?: boolean
          referencia_dp: string
          status_integralizacao?: string | null
          tipo_bem: string
          updated_at?: string
          updated_by?: string | null
          vlr_benfeitorias?: number | null
          vlr_contabil?: number | null
          vlr_contabil_ajustado?: number | null
          vlr_imposto_anual?: number | null
          vlr_itr_iptu?: number | null
          vlr_mercado?: number | null
        }
        Update: {
          ccir_codigo?: string | null
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          denominacao?: string
          descricao_outros?: string | null
          empresa_destino_pessoa_id?: string | null
          id?: string
          imposto_anual_exercicio?: number | null
          inscricao_municipal?: string | null
          motivo_nao_integralizacao?: string | null
          observacao?: string | null
          participa_estruturacao?: boolean
          referencia_dp?: string
          status_integralizacao?: string | null
          tipo_bem?: string
          updated_at?: string
          updated_by?: string | null
          vlr_benfeitorias?: number | null
          vlr_contabil?: number | null
          vlr_contabil_ajustado?: number | null
          vlr_imposto_anual?: number | null
          vlr_itr_iptu?: number | null
          vlr_mercado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bem_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bem_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bem_empresa_destino_pessoa_id_fkey"
            columns: ["empresa_destino_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bem_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_integralizacao: {
        Row: {
          bem_id: string
          cliente_id: string
          created_at: string
          created_by: string | null
          empresa_destino_pessoa_id: string
          id: string
          pct_capital: number | null
          pct_vlr_contabil: number | null
          pct_vlr_mercado: number | null
          reserva_capital: number | null
          socio_pessoa_id: string
          updated_at: string
          updated_by: string | null
          vlr_capital_arredondado: number | null
          vlr_contabil: number | null
          vlr_mercado: number | null
        }
        Insert: {
          bem_id: string
          cliente_id: string
          created_at?: string
          created_by?: string | null
          empresa_destino_pessoa_id: string
          id?: string
          pct_capital?: number | null
          pct_vlr_contabil?: number | null
          pct_vlr_mercado?: number | null
          reserva_capital?: number | null
          socio_pessoa_id: string
          updated_at?: string
          updated_by?: string | null
          vlr_capital_arredondado?: number | null
          vlr_contabil?: number | null
          vlr_mercado?: number | null
        }
        Update: {
          bem_id?: string
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          empresa_destino_pessoa_id?: string
          id?: string
          pct_capital?: number | null
          pct_vlr_contabil?: number | null
          pct_vlr_mercado?: number | null
          reserva_capital?: number | null
          socio_pessoa_id?: string
          updated_at?: string
          updated_by?: string | null
          vlr_capital_arredondado?: number | null
          vlr_contabil?: number | null
          vlr_mercado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_integralizacao_bem_id_fkey"
            columns: ["bem_id"]
            isOneToOne: false
            referencedRelation: "bem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_integralizacao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_integralizacao_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_integralizacao_empresa_destino_pessoa_id_fkey"
            columns: ["empresa_destino_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_integralizacao_socio_pessoa_id_fkey"
            columns: ["socio_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_integralizacao_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cartorio: {
        Row: {
          comarca: string
          created_at: string
          created_by: string | null
          id: string
          nome_completo: string
          uf: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          comarca: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome_completo: string
          uf: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          comarca?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome_completo?: string
          uf?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cartorio_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartorio_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_clients: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          estrutura_area_id: string | null
          id: string
          is_active: boolean | null
          name: string
          responsible: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          estrutura_area_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          responsible?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          estrutura_area_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          responsible?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_clients_estrutura_area_id_fkey"
            columns: ["estrutura_area_id"]
            isOneToOne: false
            referencedRelation: "estrutura_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_custo: {
        Row: {
          codigo: string
          created_at: string | null
          id: string
          is_active: boolean | null
          nome: string
        }
        Insert: {
          codigo: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          nome: string
        }
        Update: {
          codigo?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          nome?: string
        }
        Relationships: []
      }
      checklist_cliente_item: {
        Row: {
          bem_id: string | null
          categoria: Database["public"]["Enums"]["osg_doc_categoria"] | null
          categoria_docbox: string | null
          cliente_id: string
          confidencial: boolean
          created_at: string
          created_by: string | null
          documento: string
          entidade: string
          id: string
          item_padrao_id: string | null
          matricula_id: string | null
          modulo: string
          nota: string | null
          obrigatorio: boolean
          observacao: string | null
          origem: Database["public"]["Enums"]["osg_checklist_origem"]
          pessoa_id: string | null
          status: Database["public"]["Enums"]["osg_checklist_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bem_id?: string | null
          categoria?: Database["public"]["Enums"]["osg_doc_categoria"] | null
          categoria_docbox?: string | null
          cliente_id: string
          confidencial?: boolean
          created_at?: string
          created_by?: string | null
          documento: string
          entidade: string
          id?: string
          item_padrao_id?: string | null
          matricula_id?: string | null
          modulo: string
          nota?: string | null
          obrigatorio?: boolean
          observacao?: string | null
          origem?: Database["public"]["Enums"]["osg_checklist_origem"]
          pessoa_id?: string | null
          status?: Database["public"]["Enums"]["osg_checklist_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bem_id?: string | null
          categoria?: Database["public"]["Enums"]["osg_doc_categoria"] | null
          categoria_docbox?: string | null
          cliente_id?: string
          confidencial?: boolean
          created_at?: string
          created_by?: string | null
          documento?: string
          entidade?: string
          id?: string
          item_padrao_id?: string | null
          matricula_id?: string | null
          modulo?: string
          nota?: string | null
          obrigatorio?: boolean
          observacao?: string | null
          origem?: Database["public"]["Enums"]["osg_checklist_origem"]
          pessoa_id?: string | null
          status?: Database["public"]["Enums"]["osg_checklist_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_cliente_item_bem_id_fkey"
            columns: ["bem_id"]
            isOneToOne: false
            referencedRelation: "bem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_cliente_item_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_cliente_item_item_padrao_id_fkey"
            columns: ["item_padrao_id"]
            isOneToOne: false
            referencedRelation: "checklist_item_padrao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_cliente_item_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_cliente_item_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_item_padrao: {
        Row: {
          ativo: boolean
          categoria: Database["public"]["Enums"]["osg_doc_categoria"] | null
          categoria_docbox: string | null
          codigo: string
          confidencial: boolean
          created_at: string
          created_by: string | null
          documento: string
          entidade: string
          granularidade: string
          id: string
          modulo: string
          nota: string | null
          obrigatorio_default: boolean
          ordem: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["osg_doc_categoria"] | null
          categoria_docbox?: string | null
          codigo: string
          confidencial?: boolean
          created_at?: string
          created_by?: string | null
          documento: string
          entidade: string
          granularidade?: string
          id?: string
          modulo: string
          nota?: string | null
          obrigatorio_default?: boolean
          ordem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["osg_doc_categoria"] | null
          categoria_docbox?: string | null
          codigo?: string
          confidencial?: boolean
          created_at?: string
          created_by?: string | null
          documento?: string
          entidade?: string
          granularidade?: string
          id?: string
          modulo?: string
          nota?: string | null
          obrigatorio_default?: boolean
          ordem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ciclos_avaliacao: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_analise_semestral: string | null
          data_fim: string
          data_inicio: string
          descricao: string | null
          id: string
          nome: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_analise_semestral?: string | null
          data_fim: string
          data_inicio: string
          descricao?: string | null
          id?: string
          nome: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data_analise_semestral?: string | null
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          id?: string
          nome?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      client_documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          document_type: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          name: string
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_type: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          name: string
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_type?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          name?: string
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      client_visible_projects: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          project_id: string
          user_id: string
          visible_since: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          project_id: string
          user_id: string
          visible_since?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          user_id?: string
          visible_since?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_visible_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente: {
        Row: {
          ambiente: string
          ativo: boolean | null
          categoria: string | null
          created_at: string
          excluido: boolean
          fixo: string | null
          id: string
          municipio: string | null
          nome: string
          observacoes: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ambiente?: string
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string
          excluido?: boolean
          fixo?: string | null
          id?: string
          municipio?: string | null
          nome: string
          observacoes?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ambiente?: string
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string
          excluido?: boolean
          fixo?: string | null
          id?: string
          municipio?: string | null
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cliente_clusters: {
        Row: {
          cliente_id: string
          cluster_id: string
          created_at: string
          id: string
        }
        Insert: {
          cliente_id: string
          cluster_id: string
          created_at?: string
          id?: string
        }
        Update: {
          cliente_id?: string
          cluster_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_clusters_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_clusters_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      codigo_receita: {
        Row: {
          codigo: string
          created_at: string
          denominacao_receita: string
          grupo_tributo_id: string
          id: string
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          denominacao_receita: string
          grupo_tributo_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          denominacao_receita?: string
          grupo_tributo_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "codigo_receita_grupo_tributo_id_fkey"
            columns: ["grupo_tributo_id"]
            isOneToOne: false
            referencedRelation: "grupo_tributo"
            referencedColumns: ["id"]
          },
        ]
      }
      comentarios_avaliacao: {
        Row: {
          autor_id: string
          ciclo_id: string | null
          conteudo: string
          created_at: string | null
          destinatario_id: string | null
          id: string
          lido: boolean | null
          lido_em: string | null
          tipo: string
          updated_at: string | null
          visivel_para_membro: boolean | null
        }
        Insert: {
          autor_id: string
          ciclo_id?: string | null
          conteudo: string
          created_at?: string | null
          destinatario_id?: string | null
          id?: string
          lido?: boolean | null
          lido_em?: string | null
          tipo: string
          updated_at?: string | null
          visivel_para_membro?: boolean | null
        }
        Update: {
          autor_id?: string
          ciclo_id?: string | null
          conteudo?: string
          created_at?: string | null
          destinatario_id?: string | null
          id?: string
          lido?: boolean | null
          lido_em?: string | null
          tipo?: string
          updated_at?: string | null
          visivel_para_membro?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_avaliacao_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos: {
        Row: {
          atendido_por: string | null
          como_conheceu: string | null
          created_at: string | null
          email: string
          empresa: string | null
          id: string
          mensagem: string
          nome_completo: string
          notas_internas: string | null
          porte_empresa: string | null
          servico_interesse: string | null
          status: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          atendido_por?: string | null
          como_conheceu?: string | null
          created_at?: string | null
          email: string
          empresa?: string | null
          id?: string
          mensagem: string
          nome_completo: string
          notas_internas?: string | null
          porte_empresa?: string | null
          servico_interesse?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          atendido_por?: string | null
          como_conheceu?: string | null
          created_at?: string | null
          email?: string
          empresa?: string | null
          id?: string
          mensagem?: string
          nome_completo?: string
          notas_internas?: string | null
          porte_empresa?: string | null
          servico_interesse?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contribuinte: {
        Row: {
          ambiente: string
          bairro: string | null
          cep: string | null
          cliente_id: string
          cod_cnae: string | null
          complemento: string | null
          contribuinte_faturamento: boolean | null
          cpf_cnpj: string | null
          created_at: string
          excluido: boolean
          id: string
          inscricao_estadual: string | null
          logradouro: string | null
          municipio: string | null
          nome_fantasia: string | null
          nome_razao_social: string
          numero: string | null
          setor: string | null
          setor_cliente_id: string | null
          simples_nacional: boolean | null
          situacao_inscricao_estadual: string | null
          telefone: string | null
          tipo_pessoa: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          ambiente?: string
          bairro?: string | null
          cep?: string | null
          cliente_id: string
          cod_cnae?: string | null
          complemento?: string | null
          contribuinte_faturamento?: boolean | null
          cpf_cnpj?: string | null
          created_at?: string
          excluido?: boolean
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          municipio?: string | null
          nome_fantasia?: string | null
          nome_razao_social: string
          numero?: string | null
          setor?: string | null
          setor_cliente_id?: string | null
          simples_nacional?: boolean | null
          situacao_inscricao_estadual?: string | null
          telefone?: string | null
          tipo_pessoa: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ambiente?: string
          bairro?: string | null
          cep?: string | null
          cliente_id?: string
          cod_cnae?: string | null
          complemento?: string | null
          contribuinte_faturamento?: boolean | null
          cpf_cnpj?: string | null
          created_at?: string
          excluido?: boolean
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          municipio?: string | null
          nome_fantasia?: string | null
          nome_razao_social?: string
          numero?: string | null
          setor?: string | null
          setor_cliente_id?: string | null
          simples_nacional?: boolean | null
          situacao_inscricao_estadual?: string | null
          telefone?: string | null
          tipo_pessoa?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribuinte_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribuinte_setor_cliente_id_fkey"
            columns: ["setor_cliente_id"]
            isOneToOne: false
            referencedRelation: "setor_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      contribuinte_bal_config: {
        Row: {
          balancete_detalhamento: boolean | null
          created_at: string
          id: string
          id_contribuinte: string
          updated_at: string
        }
        Insert: {
          balancete_detalhamento?: boolean | null
          created_at?: string
          id?: string
          id_contribuinte: string
          updated_at?: string
        }
        Update: {
          balancete_detalhamento?: boolean | null
          created_at?: string
          id?: string
          id_contribuinte?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribuinte_bal_config_id_contribuinte_fkey"
            columns: ["id_contribuinte"]
            isOneToOne: true
            referencedRelation: "contribuinte"
            referencedColumns: ["id"]
          },
        ]
      }
      correcoes_icms: {
        Row: {
          ambiente: string
          campos: Json
          competencia: string | null
          contribuinte_id: string
          created_at: string
          created_by: string | null
          data_lancamento: string
          descricao: string
          excluido: boolean
          familia: string
          id: string
          produto: string | null
          updated_at: string
        }
        Insert: {
          ambiente?: string
          campos?: Json
          competencia?: string | null
          contribuinte_id: string
          created_at?: string
          created_by?: string | null
          data_lancamento: string
          descricao: string
          excluido?: boolean
          familia: string
          id?: string
          produto?: string | null
          updated_at?: string
        }
        Update: {
          ambiente?: string
          campos?: Json
          competencia?: string | null
          contribuinte_id?: string
          created_at?: string
          created_by?: string | null
          data_lancamento?: string
          descricao?: string
          excluido?: boolean
          familia?: string
          id?: string
          produto?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_standups: {
        Row: {
          blockers: string | null
          created_at: string | null
          date: string
          did_yesterday: string | null
          id: string
          process_id: string | null
          project_id: string | null
          sprint_id: string | null
          user_id: string
          will_do_today: string | null
        }
        Insert: {
          blockers?: string | null
          created_at?: string | null
          date?: string
          did_yesterday?: string | null
          id?: string
          process_id?: string | null
          project_id?: string | null
          sprint_id?: string | null
          user_id: string
          will_do_today?: string | null
        }
        Update: {
          blockers?: string | null
          created_at?: string | null
          date?: string
          did_yesterday?: string | null
          id?: string
          process_id?: string | null
          project_id?: string | null
          sprint_id?: string | null
          user_id?: string
          will_do_today?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_standups_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_standups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_standups_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_cliente_access: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          dashboard_id: string
          id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          dashboard_id: string
          id?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          dashboard_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_cliente_access_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_cliente_access_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_cliente_access_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_cluster_access: {
        Row: {
          cluster_id: string
          created_at: string
          created_by: string | null
          dashboard_id: string
          id: string
        }
        Insert: {
          cluster_id: string
          created_at?: string
          created_by?: string | null
          dashboard_id: string
          id?: string
        }
        Update: {
          cluster_id?: string
          created_at?: string
          created_by?: string | null
          dashboard_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_cluster_access_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_cluster_access_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_cluster_access_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          all_clusters: boolean
          created_at: string
          created_by: string | null
          embed_url: string
          filter_type: string
          grupo: string | null
          id: string
          is_active: boolean
          min_role: Database["public"]["Enums"]["app_role"] | null
          name: string
          param_names: string[]
          sop_url: string | null
          target_page: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          all_clusters?: boolean
          created_at?: string
          created_by?: string | null
          embed_url: string
          filter_type?: string
          grupo?: string | null
          id?: string
          is_active?: boolean
          min_role?: Database["public"]["Enums"]["app_role"] | null
          name: string
          param_names?: string[]
          sop_url?: string | null
          target_page?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          all_clusters?: boolean
          created_at?: string
          created_by?: string | null
          embed_url?: string
          filter_type?: string
          grupo?: string | null
          id?: string
          is_active?: boolean
          min_role?: Database["public"]["Enums"]["app_role"] | null
          name?: string
          param_names?: string[]
          sop_url?: string | null
          target_page?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboards_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dcomp: {
        Row: {
          atualizado_em: string | null
          atualizado_por: string | null
          criado_em: string | null
          criado_por: string | null
          dt_envio: string
          mes_ano_exercicio: string
          nr_dcomp_ret: string | null
          nr_documento: string
          nr_per_orig: string
          vlr_compensado: number
        }
        Insert: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          criado_em?: string | null
          criado_por?: string | null
          dt_envio: string
          mes_ano_exercicio: string
          nr_dcomp_ret?: string | null
          nr_documento: string
          nr_per_orig: string
          vlr_compensado: number
        }
        Update: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          criado_em?: string | null
          criado_por?: string | null
          dt_envio?: string
          mes_ano_exercicio?: string
          nr_dcomp_ret?: string | null
          nr_documento?: string
          nr_per_orig?: string
          vlr_compensado?: number
        }
        Relationships: [
          {
            foreignKeyName: "dcomp_nr_dcomp_ret_fkey"
            columns: ["nr_dcomp_ret"]
            isOneToOne: false
            referencedRelation: "dcomp"
            referencedColumns: ["nr_documento"]
          },
          {
            foreignKeyName: "dcomp_nr_per_orig_fkey"
            columns: ["nr_per_orig"]
            isOneToOne: false
            referencedRelation: "per"
            referencedColumns: ["nr_per"]
          },
          {
            foreignKeyName: "dcomp_nr_per_orig_fkey"
            columns: ["nr_per_orig"]
            isOneToOne: false
            referencedRelation: "per_with_contribuinte"
            referencedColumns: ["nr_per"]
          },
        ]
      }
      deliverable_attachments: {
        Row: {
          deliverable_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string | null
          id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          deliverable_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type?: string | null
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          deliverable_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string | null
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_attachments_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "sprint_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_items: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          demand_id: string
          description: string | null
          due_date: string
          estimated_hours: number | null
          id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          demand_id: string
          description?: string | null
          due_date: string
          estimated_hours?: number | null
          id?: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          demand_id?: string
          description?: string | null
          due_date?: string
          estimated_hours?: number | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demand_items_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      difal_decisao: {
        Row: {
          cod_ncm: string
          decidido_em: string | null
          decisao: string
          id: string
          id_icms_st_bq: string | null
          sessao_id: string
        }
        Insert: {
          cod_ncm: string
          decidido_em?: string | null
          decisao: string
          id?: string
          id_icms_st_bq?: string | null
          sessao_id: string
        }
        Update: {
          cod_ncm?: string
          decidido_em?: string | null
          decisao?: string
          id?: string
          id_icms_st_bq?: string | null
          sessao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "difal_decisao_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "difal_sessao"
            referencedColumns: ["id"]
          },
        ]
      }
      difal_sessao: {
        Row: {
          cliente_id: string
          cliente_nome: string | null
          criado_em: string | null
          id: string
          periodo: string
          request_original: Json
          sincronizado_em: string | null
          status: string
          uf: string
          usuario_id: string
        }
        Insert: {
          cliente_id: string
          cliente_nome?: string | null
          criado_em?: string | null
          id?: string
          periodo: string
          request_original: Json
          sincronizado_em?: string | null
          status?: string
          uf: string
          usuario_id: string
        }
        Update: {
          cliente_id?: string
          cliente_nome?: string | null
          criado_em?: string | null
          id?: string
          periodo?: string
          request_original?: Json
          sincronizado_em?: string | null
          status?: string
          uf?: string
          usuario_id?: string
        }
        Relationships: []
      }
      distribuicao_dcomp: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          codigo_receita_id: string | null
          competencia: string | null
          criado_em: string
          criado_por: string | null
          grupo_tributo_id: string | null
          id: string
          nr_documento: string
          tributo: string
          valor_original: number | null
          valor_tributo: number
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          codigo_receita_id?: string | null
          competencia?: string | null
          criado_em?: string
          criado_por?: string | null
          grupo_tributo_id?: string | null
          id?: string
          nr_documento: string
          tributo: string
          valor_original?: number | null
          valor_tributo?: number
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          codigo_receita_id?: string | null
          competencia?: string | null
          criado_em?: string
          criado_por?: string | null
          grupo_tributo_id?: string | null
          id?: string
          nr_documento?: string
          tributo?: string
          valor_original?: number | null
          valor_tributo?: number
        }
        Relationships: [
          {
            foreignKeyName: "distribuicao_dcomp_codigo_receita_id_fkey"
            columns: ["codigo_receita_id"]
            isOneToOne: false
            referencedRelation: "codigo_receita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribuicao_dcomp_grupo_tributo_id_fkey"
            columns: ["grupo_tributo_id"]
            isOneToOne: false
            referencedRelation: "grupo_tributo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribuicao_dcomp_nr_documento_fkey"
            columns: ["nr_documento"]
            isOneToOne: false
            referencedRelation: "dcomp"
            referencedColumns: ["nr_documento"]
          },
        ]
      }
      distribuicao_receita: {
        Row: {
          created_at: string | null
          excluido: boolean
          id: string
          id_centro_custo: string
          id_ordem_servico: string
          percentual_rateio: number
        }
        Insert: {
          created_at?: string | null
          excluido?: boolean
          id?: string
          id_centro_custo: string
          id_ordem_servico: string
          percentual_rateio?: number
        }
        Update: {
          created_at?: string | null
          excluido?: boolean
          id?: string
          id_centro_custo?: string
          id_ordem_servico?: string
          percentual_rateio?: number
        }
        Relationships: [
          {
            foreignKeyName: "distribuicao_receita_id_centro_custo_fkey"
            columns: ["id_centro_custo"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribuicao_receita_id_ordem_servico_fkey"
            columns: ["id_ordem_servico"]
            isOneToOne: false
            referencedRelation: "ordem_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_arquivo: {
        Row: {
          ambiente: string
          area: Database["public"]["Enums"]["osg_doc_area"] | null
          bem_id: string | null
          categoria: Database["public"]["Enums"]["osg_doc_categoria"]
          checklist_item_id: string | null
          checksum: string | null
          cliente_id: string
          contribuinte_id: string | null
          created_at: string
          created_by: string | null
          documento_gerado_id: string | null
          excluido: boolean
          fonte: Database["public"]["Enums"]["osg_doc_fonte"]
          gcs_uri: string | null
          id: string
          matricula_id: string | null
          mime: string | null
          nome_original: string
          org_projects_id: string | null
          pessoa_id: string | null
          status: Database["public"]["Enums"]["osg_doc_status"]
          tamanho: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ambiente?: string
          area?: Database["public"]["Enums"]["osg_doc_area"] | null
          bem_id?: string | null
          categoria: Database["public"]["Enums"]["osg_doc_categoria"]
          checklist_item_id?: string | null
          checksum?: string | null
          cliente_id: string
          contribuinte_id?: string | null
          created_at?: string
          created_by?: string | null
          documento_gerado_id?: string | null
          excluido?: boolean
          fonte?: Database["public"]["Enums"]["osg_doc_fonte"]
          gcs_uri?: string | null
          id?: string
          matricula_id?: string | null
          mime?: string | null
          nome_original: string
          org_projects_id?: string | null
          pessoa_id?: string | null
          status?: Database["public"]["Enums"]["osg_doc_status"]
          tamanho?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ambiente?: string
          area?: Database["public"]["Enums"]["osg_doc_area"] | null
          bem_id?: string | null
          categoria?: Database["public"]["Enums"]["osg_doc_categoria"]
          checklist_item_id?: string | null
          checksum?: string | null
          cliente_id?: string
          contribuinte_id?: string | null
          created_at?: string
          created_by?: string | null
          documento_gerado_id?: string | null
          excluido?: boolean
          fonte?: Database["public"]["Enums"]["osg_doc_fonte"]
          gcs_uri?: string | null
          id?: string
          matricula_id?: string | null
          mime?: string | null
          nome_original?: string
          org_projects_id?: string | null
          pessoa_id?: string | null
          status?: Database["public"]["Enums"]["osg_doc_status"]
          tamanho?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documento_arquivo_bem_id_fkey"
            columns: ["bem_id"]
            isOneToOne: false
            referencedRelation: "bem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_arquivo_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_cliente_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_arquivo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_arquivo_documento_gerado_id_fkey"
            columns: ["documento_gerado_id"]
            isOneToOne: false
            referencedRelation: "documento_gerado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_arquivo_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_arquivo_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_gerado: {
        Row: {
          caminho_arquivo: string | null
          cliente_id: string
          created_at: string
          created_by: string | null
          documento_anterior_id: string | null
          documento_raiz_id: string | null
          documento_template_id: string | null
          gerado_em: string | null
          gerado_por_id: string | null
          id: string
          observacao: string | null
          pj_pessoa_id: string | null
          snapshot_dados: Json | null
          snapshot_flags: Json | null
          snapshot_validado_em: string | null
          snapshot_versoes_blocos: Json | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          caminho_arquivo?: string | null
          cliente_id: string
          created_at?: string
          created_by?: string | null
          documento_anterior_id?: string | null
          documento_raiz_id?: string | null
          documento_template_id?: string | null
          gerado_em?: string | null
          gerado_por_id?: string | null
          id?: string
          observacao?: string | null
          pj_pessoa_id?: string | null
          snapshot_dados?: Json | null
          snapshot_flags?: Json | null
          snapshot_validado_em?: string | null
          snapshot_versoes_blocos?: Json | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          caminho_arquivo?: string | null
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          documento_anterior_id?: string | null
          documento_raiz_id?: string | null
          documento_template_id?: string | null
          gerado_em?: string | null
          gerado_por_id?: string | null
          id?: string
          observacao?: string | null
          pj_pessoa_id?: string | null
          snapshot_dados?: Json | null
          snapshot_flags?: Json | null
          snapshot_validado_em?: string | null
          snapshot_versoes_blocos?: Json | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documento_gerado_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_gerado_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_gerado_documento_anterior_id_fkey"
            columns: ["documento_anterior_id"]
            isOneToOne: false
            referencedRelation: "documento_gerado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_gerado_documento_raiz_id_fkey"
            columns: ["documento_raiz_id"]
            isOneToOne: false
            referencedRelation: "documento_gerado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_gerado_documento_template_id_fkey"
            columns: ["documento_template_id"]
            isOneToOne: false
            referencedRelation: "tmpl_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_gerado_gerado_por_id_fkey"
            columns: ["gerado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_gerado_pj_pessoa_id_fkey"
            columns: ["pj_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_gerado_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_horas_historico: {
        Row: {
          alterado_por: string | null
          documento_id: string
          horas_antes: number | null
          horas_depois: number | null
          id: number
          registrado_em: string
        }
        Insert: {
          alterado_por?: string | null
          documento_id: string
          horas_antes?: number | null
          horas_depois?: number | null
          id?: never
          registrado_em?: string
        }
        Update: {
          alterado_por?: string | null
          documento_id?: string
          horas_antes?: number | null
          horas_depois?: number | null
          id?: never
          registrado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_horas_historico_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_notificacao_visto: {
        Row: {
          documento_gerado_id: string
          user_id: string
          visto_em: string
        }
        Insert: {
          documento_gerado_id: string
          user_id: string
          visto_em?: string
        }
        Update: {
          documento_gerado_id?: string
          user_id?: string
          visto_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_notificacao_visto_documento_gerado_id_fkey"
            columns: ["documento_gerado_id"]
            isOneToOne: false
            referencedRelation: "documento_gerado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_notificacao_visto_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_override: {
        Row: {
          bloco_alvo_id: string | null
          bloco_substituto_id: string | null
          created_at: string
          created_by: string | null
          documento_gerado_id: string
          id: string
          observacao: string | null
          ordem: number | null
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bloco_alvo_id?: string | null
          bloco_substituto_id?: string | null
          created_at?: string
          created_by?: string | null
          documento_gerado_id: string
          id?: string
          observacao?: string | null
          ordem?: number | null
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bloco_alvo_id?: string | null
          bloco_substituto_id?: string | null
          created_at?: string
          created_by?: string | null
          documento_gerado_id?: string
          id?: string
          observacao?: string | null
          ordem?: number | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documento_override_bloco_alvo_id_fkey"
            columns: ["bloco_alvo_id"]
            isOneToOne: false
            referencedRelation: "tmpl_bloco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_override_bloco_substituto_id_fkey"
            columns: ["bloco_substituto_id"]
            isOneToOne: false
            referencedRelation: "tmpl_bloco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_override_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_override_documento_gerado_id_fkey"
            columns: ["documento_gerado_id"]
            isOneToOne: false
            referencedRelation: "documento_gerado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_override_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_processo: {
        Row: {
          canonico_id: string | null
          categoria: string | null
          cluster_id: string | null
          created_at: string
          estrutura_entrada: string | null
          estruturado: string | null
          formato: string | null
          id: string
          nome: string
          origem: string | null
          tempo_minutos: number | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          canonico_id?: string | null
          categoria?: string | null
          cluster_id?: string | null
          created_at?: string
          estrutura_entrada?: string | null
          estruturado?: string | null
          formato?: string | null
          id?: string
          nome: string
          origem?: string | null
          tempo_minutos?: number | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          canonico_id?: string | null
          categoria?: string | null
          cluster_id?: string | null
          created_at?: string
          estrutura_entrada?: string | null
          estruturado?: string | null
          formato?: string | null
          id?: string
          nome?: string
          origem?: string | null
          tempo_minutos?: number | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_processo_canonico_id_fkey"
            columns: ["canonico_id"]
            isOneToOne: false
            referencedRelation: "documentos_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_processo_cluster_id_fk"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_type: string | null
          id: string
          ticket_id: string | null
          uploaded_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_type?: string | null
          id?: string
          ticket_id?: string | null
          uploaded_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_type?: string | null
          id?: string
          ticket_id?: string | null
          uploaded_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      efd_correcoes: {
        Row: {
          arquivo_id: string | null
          arquivo_tipo: string
          ativo: boolean | null
          batch_id: string | null
          campos_alterados: Json | null
          contribuinte_id: string
          created_at: string | null
          empresa_cnpj: string | null
          id: string
          motivo: string | null
          periodo: string | null
          registro_original_id: string | null
          registro_tipo: string
          snapshot: Json
          sync_error: string | null
          sync_sent_at: string | null
          sync_status: string | null
          tipo_operacao: string
          usuario_id: string
        }
        Insert: {
          arquivo_id?: string | null
          arquivo_tipo: string
          ativo?: boolean | null
          batch_id?: string | null
          campos_alterados?: Json | null
          contribuinte_id: string
          created_at?: string | null
          empresa_cnpj?: string | null
          id?: string
          motivo?: string | null
          periodo?: string | null
          registro_original_id?: string | null
          registro_tipo: string
          snapshot: Json
          sync_error?: string | null
          sync_sent_at?: string | null
          sync_status?: string | null
          tipo_operacao: string
          usuario_id: string
        }
        Update: {
          arquivo_id?: string | null
          arquivo_tipo?: string
          ativo?: boolean | null
          batch_id?: string | null
          campos_alterados?: Json | null
          contribuinte_id?: string
          created_at?: string | null
          empresa_cnpj?: string | null
          id?: string
          motivo?: string | null
          periodo?: string | null
          registro_original_id?: string | null
          registro_tipo?: string
          snapshot?: Json
          sync_error?: string | null
          sync_sent_at?: string | null
          sync_status?: string | null
          tipo_operacao?: string
          usuario_id?: string
        }
        Relationships: []
      }
      estrutura_areas: {
        Row: {
          cluster_id: string
          color: string | null
          cost_center_id: string | null
          created_at: string
          gestor_chamados_id: string | null
          id: string
          is_active: boolean
          name: string
          page_categories: string[] | null
          updated_at: string
        }
        Insert: {
          cluster_id: string
          color?: string | null
          cost_center_id?: string | null
          created_at?: string
          gestor_chamados_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          page_categories?: string[] | null
          updated_at?: string
        }
        Update: {
          cluster_id?: string
          color?: string | null
          cost_center_id?: string | null
          created_at?: string
          gestor_chamados_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          page_categories?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estrutura_areas_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estrutura_areas_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estrutura_areas_gestor_chamados_id_fkey"
            columns: ["gestor_chamados_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      estrutura_clusters: {
        Row: {
          cnpj: string | null
          cost_center_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          nome_empresa: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          cost_center_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          nome_empresa?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          cost_center_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          nome_empresa?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estrutura_clusters_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
        ]
      }
      estrutura_equipe_membros: {
        Row: {
          created_at: string
          equipe_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          equipe_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          equipe_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estrutura_equipe_membros_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "estrutura_equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estrutura_equipe_membros_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      estrutura_equipes: {
        Row: {
          area_id: string
          created_at: string
          gestor_id: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          area_id: string
          created_at?: string
          gestor_id?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          area_id?: string
          created_at?: string
          gestor_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "estrutura_equipes_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "estrutura_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estrutura_equipes_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      etapa_documentos: {
        Row: {
          created_at: string
          documento_id: string
          etapa_id: string
          id: string
          scenario: string
          sentido: string
          volume: number | null
        }
        Insert: {
          created_at?: string
          documento_id: string
          etapa_id: string
          id?: string
          scenario?: string
          sentido: string
          volume?: number | null
        }
        Update: {
          created_at?: string
          documento_id?: string
          etapa_id?: string
          id?: string
          scenario?: string
          sentido?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "etapa_documentos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_processo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapa_documentos_etapa_fk"
            columns: ["etapa_id", "scenario"]
            isOneToOne: false
            referencedRelation: "process_stages"
            referencedColumns: ["id", "scenario"]
          },
        ]
      }
      etapa_responsaveis: {
        Row: {
          created_at: string
          etapa_id: string
          horas: number | null
          id: string
          papel: string
          responsavel_id: string
          scenario: string
        }
        Insert: {
          created_at?: string
          etapa_id: string
          horas?: number | null
          id?: string
          papel: string
          responsavel_id: string
          scenario?: string
        }
        Update: {
          created_at?: string
          etapa_id?: string
          horas?: number | null
          id?: string
          papel?: string
          responsavel_id?: string
          scenario?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapa_responsaveis_etapa_fk"
            columns: ["etapa_id", "scenario"]
            isOneToOne: false
            referencedRelation: "process_stages"
            referencedColumns: ["id", "scenario"]
          },
          {
            foreignKeyName: "etapa_responsaveis_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      etapa_sistemas: {
        Row: {
          created_at: string
          etapa_id: string
          id: string
          rateio: number | null
          scenario: string
          sistema_id: string
        }
        Insert: {
          created_at?: string
          etapa_id: string
          id?: string
          rateio?: number | null
          scenario?: string
          sistema_id: string
        }
        Update: {
          created_at?: string
          etapa_id?: string
          id?: string
          rateio?: number | null
          scenario?: string
          sistema_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapa_sistemas_etapa_fk"
            columns: ["etapa_id", "scenario"]
            isOneToOne: false
            referencedRelation: "process_stages"
            referencedColumns: ["id", "scenario"]
          },
          {
            foreignKeyName: "etapa_sistemas_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "sistemas_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      exploracao_rural: {
        Row: {
          area_explorada: number | null
          area_total: number | null
          area_unidade: string
          bem_id: string | null
          cliente_id: string
          created_at: string
          created_by: string | null
          data_assinatura: string | null
          data_encerramento: string | null
          declarado_irpf: boolean
          explorador_nome: string | null
          explorador_pessoa_id: string | null
          id: string
          imovel_descricao: string | null
          matricula_texto: string | null
          municipio: string | null
          outorgante_nome: string | null
          outorgante_pessoa_id: string | null
          referencia: string | null
          sacas_por_hectare: number | null
          tipo_exploracao: Database["public"]["Enums"]["osg_tipo_exploracao"]
          uf: string | null
          updated_at: string
          updated_by: string | null
          vigencia: string | null
        }
        Insert: {
          area_explorada?: number | null
          area_total?: number | null
          area_unidade?: string
          bem_id?: string | null
          cliente_id: string
          created_at?: string
          created_by?: string | null
          data_assinatura?: string | null
          data_encerramento?: string | null
          declarado_irpf?: boolean
          explorador_nome?: string | null
          explorador_pessoa_id?: string | null
          id?: string
          imovel_descricao?: string | null
          matricula_texto?: string | null
          municipio?: string | null
          outorgante_nome?: string | null
          outorgante_pessoa_id?: string | null
          referencia?: string | null
          sacas_por_hectare?: number | null
          tipo_exploracao: Database["public"]["Enums"]["osg_tipo_exploracao"]
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
          vigencia?: string | null
        }
        Update: {
          area_explorada?: number | null
          area_total?: number | null
          area_unidade?: string
          bem_id?: string | null
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          data_assinatura?: string | null
          data_encerramento?: string | null
          declarado_irpf?: boolean
          explorador_nome?: string | null
          explorador_pessoa_id?: string | null
          id?: string
          imovel_descricao?: string | null
          matricula_texto?: string | null
          municipio?: string | null
          outorgante_nome?: string | null
          outorgante_pessoa_id?: string | null
          referencia?: string | null
          sacas_por_hectare?: number | null
          tipo_exploracao?: Database["public"]["Enums"]["osg_tipo_exploracao"]
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
          vigencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exploracao_rural_bem_id_fkey"
            columns: ["bem_id"]
            isOneToOne: false
            referencedRelation: "bem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exploracao_rural_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exploracao_rural_explorador_pessoa_id_fkey"
            columns: ["explorador_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exploracao_rural_outorgante_pessoa_id_fkey"
            columns: ["outorgante_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
        ]
      }
      export_profiles: {
        Row: {
          columns: string[]
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          tool_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          columns: string[]
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          tool_type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          columns?: string[]
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          tool_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          anonimo: boolean | null
          ciclo_id: string | null
          comportamento: string
          contexto: string
          created_at: string | null
          de_usuario_id: string | null
          id: string
          impacto: string
          para_usuario_id: string | null
          tipo: string
          visivel_para_avaliado: boolean | null
        }
        Insert: {
          anonimo?: boolean | null
          ciclo_id?: string | null
          comportamento: string
          contexto: string
          created_at?: string | null
          de_usuario_id?: string | null
          id?: string
          impacto: string
          para_usuario_id?: string | null
          tipo: string
          visivel_para_avaliado?: boolean | null
        }
        Update: {
          anonimo?: boolean | null
          ciclo_id?: string | null
          comportamento?: string
          contexto?: string
          created_at?: string | null
          de_usuario_id?: string | null
          id?: string
          impacto?: string
          para_usuario_id?: string | null
          tipo?: string
          visivel_para_avaliado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          },
        ]
      }
      gargalo_etapas: {
        Row: {
          created_at: string
          etapa_id: string
          gargalo_id: string
          id: string
          scenario: string
        }
        Insert: {
          created_at?: string
          etapa_id: string
          gargalo_id: string
          id?: string
          scenario?: string
        }
        Update: {
          created_at?: string
          etapa_id?: string
          gargalo_id?: string
          id?: string
          scenario?: string
        }
        Relationships: [
          {
            foreignKeyName: "gargalo_etapas_etapa_fk"
            columns: ["etapa_id", "scenario"]
            isOneToOne: false
            referencedRelation: "process_stages"
            referencedColumns: ["id", "scenario"]
          },
          {
            foreignKeyName: "gargalo_etapas_gargalo_id_fkey"
            columns: ["gargalo_id"]
            isOneToOne: false
            referencedRelation: "gargalos"
            referencedColumns: ["id"]
          },
        ]
      }
      gargalo_melhorias: {
        Row: {
          created_at: string
          gargalo_id: string
          id: string
          melhoria_id: string
        }
        Insert: {
          created_at?: string
          gargalo_id: string
          id?: string
          melhoria_id: string
        }
        Update: {
          created_at?: string
          gargalo_id?: string
          id?: string
          melhoria_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gargalo_melhorias_gargalo_id_fkey"
            columns: ["gargalo_id"]
            isOneToOne: false
            referencedRelation: "gargalos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gargalo_melhorias_melhoria_id_fkey"
            columns: ["melhoria_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          },
        ]
      }
      gargalo_processos: {
        Row: {
          created_at: string
          gargalo_id: string
          id: string
          processo_id: string
        }
        Insert: {
          created_at?: string
          gargalo_id: string
          id?: string
          processo_id: string
        }
        Update: {
          created_at?: string
          gargalo_id?: string
          id?: string
          processo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gargalo_processos_gargalo_id_fkey"
            columns: ["gargalo_id"]
            isOneToOne: false
            referencedRelation: "gargalos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gargalo_processos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      gargalo_responsaveis: {
        Row: {
          created_at: string
          gargalo_id: string
          horas: number | null
          id: string
          responsavel_id: string
        }
        Insert: {
          created_at?: string
          gargalo_id: string
          horas?: number | null
          id?: string
          responsavel_id: string
        }
        Update: {
          created_at?: string
          gargalo_id?: string
          horas?: number | null
          id?: string
          responsavel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gargalo_responsaveis_gargalo_id_fkey"
            columns: ["gargalo_id"]
            isOneToOne: false
            referencedRelation: "gargalos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gargalo_responsaveis_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      gargalos: {
        Row: {
          cluster_id: string | null
          created_at: string
          custo_externo_unico: number | null
          descricao: string | null
          horas_gastas: number | null
          horas_implementacao: number | null
          id: string
          melhoria_id: string | null
          nome: string
          origem: string | null
          taxa_captura_apos_melhoria: number | null
          taxa_ocorrencia: number | null
          updated_at: string
        }
        Insert: {
          cluster_id?: string | null
          created_at?: string
          custo_externo_unico?: number | null
          descricao?: string | null
          horas_gastas?: number | null
          horas_implementacao?: number | null
          id?: string
          melhoria_id?: string | null
          nome: string
          origem?: string | null
          taxa_captura_apos_melhoria?: number | null
          taxa_ocorrencia?: number | null
          updated_at?: string
        }
        Update: {
          cluster_id?: string | null
          created_at?: string
          custo_externo_unico?: number | null
          descricao?: string | null
          horas_gastas?: number | null
          horas_implementacao?: number | null
          id?: string
          melhoria_id?: string | null
          nome?: string
          origem?: string | null
          taxa_captura_apos_melhoria?: number | null
          taxa_ocorrencia?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gargalos_cluster_id_fk"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gargalos_melhoria_id_fkey"
            columns: ["melhoria_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          },
        ]
      }
      grupo_tributo: {
        Row: {
          created_at: string
          denominacao: string
          id: string
          sigla: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          denominacao: string
          id?: string
          sigla: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          denominacao?: string
          id?: string
          sigla?: string
          updated_at?: string
        }
        Relationships: []
      }
      impedimento: {
        Row: {
          area_afetada: number | null
          cancelado: boolean
          created_at: string
          created_by: string | null
          credor_nome: string | null
          credor_pessoa_id: string | null
          data_constituicao: string | null
          data_validade: string | null
          descricao: string | null
          id: string
          impede_transferencia: boolean
          matricula_id: string
          referencia: string | null
          tipo: string
          updated_at: string
          updated_by: string | null
          vlr: number | null
        }
        Insert: {
          area_afetada?: number | null
          cancelado?: boolean
          created_at?: string
          created_by?: string | null
          credor_nome?: string | null
          credor_pessoa_id?: string | null
          data_constituicao?: string | null
          data_validade?: string | null
          descricao?: string | null
          id?: string
          impede_transferencia?: boolean
          matricula_id: string
          referencia?: string | null
          tipo: string
          updated_at?: string
          updated_by?: string | null
          vlr?: number | null
        }
        Update: {
          area_afetada?: number | null
          cancelado?: boolean
          created_at?: string
          created_by?: string | null
          credor_nome?: string | null
          credor_pessoa_id?: string | null
          data_constituicao?: string | null
          data_validade?: string | null
          descricao?: string | null
          id?: string
          impede_transferencia?: boolean
          matricula_id?: string
          referencia?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          vlr?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "impedimento_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impedimento_credor_pessoa_id_fkey"
            columns: ["credor_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impedimento_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impedimento_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      improvement_savings_details: {
        Row: {
          cost_after: number | null
          cost_before: number | null
          created_at: string | null
          description: string
          id: string
          improvement_id: string
          is_monthly: boolean | null
          savings_type: string
          savings_value: number
        }
        Insert: {
          cost_after?: number | null
          cost_before?: number | null
          created_at?: string | null
          description: string
          id?: string
          improvement_id: string
          is_monthly?: boolean | null
          savings_type: string
          savings_value?: number
        }
        Update: {
          cost_after?: number | null
          cost_before?: number | null
          created_at?: string | null
          description?: string
          id?: string
          improvement_id?: string
          is_monthly?: boolean | null
          savings_type?: string
          savings_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "improvement_savings_details_improvement_id_fkey"
            columns: ["improvement_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          },
        ]
      }
      improvement_team_members: {
        Row: {
          created_at: string | null
          hours_allocated: number | null
          id: string
          improvement_id: string
          is_baseline: boolean | null
          job_role_id: string | null
          profile_id: string | null
        }
        Insert: {
          created_at?: string | null
          hours_allocated?: number | null
          id?: string
          improvement_id: string
          is_baseline?: boolean | null
          job_role_id?: string | null
          profile_id?: string | null
        }
        Update: {
          created_at?: string | null
          hours_allocated?: number | null
          id?: string
          improvement_id?: string
          is_baseline?: boolean | null
          job_role_id?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "improvement_team_members_improvement_id_fkey"
            columns: ["improvement_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_team_members_job_role_id_fkey"
            columns: ["job_role_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inscricao_contribuinte: {
        Row: {
          contribuinte_id: string
          created_at: string | null
          id: string
          numero_ie: string | null
          situacao: string
          uf: string
          updated_at: string | null
        }
        Insert: {
          contribuinte_id: string
          created_at?: string | null
          id?: string
          numero_ie?: string | null
          situacao?: string
          uf: string
          updated_at?: string | null
        }
        Update: {
          contribuinte_id?: string
          created_at?: string | null
          id?: string
          numero_ie?: string | null
          situacao?: string
          uf?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inscricao_contribuinte_contribuinte_id_fkey"
            columns: ["contribuinte_id"]
            isOneToOne: false
            referencedRelation: "contribuinte"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_acao_1a1: {
        Row: {
          created_at: string | null
          descricao: string
          id: string
          prazo: string | null
          responsavel_id: string | null
          reuniao_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao: string
          id?: string
          prazo?: string | null
          responsavel_id?: string | null
          reuniao_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string
          id?: string
          prazo?: string | null
          responsavel_id?: string | null
          reuniao_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_acao_1a1_reuniao_id_fkey"
            columns: ["reuniao_id"]
            isOneToOne: false
            referencedRelation: "reunioes_1a1"
            referencedColumns: ["id"]
          },
        ]
      }
      job_roles: {
        Row: {
          category: string | null
          cluster_id: string | null
          created_at: string | null
          hourly_rate: number
          id: string
          is_active: boolean | null
          level: string
          monthly_salary_ref: number | null
          name: string
          type: string | null
        }
        Insert: {
          category?: string | null
          cluster_id?: string | null
          created_at?: string | null
          hourly_rate: number
          id?: string
          is_active?: boolean | null
          level: string
          monthly_salary_ref?: number | null
          name: string
          type?: string | null
        }
        Update: {
          category?: string | null
          cluster_id?: string | null
          created_at?: string | null
          hourly_rate?: number
          id?: string
          is_active?: boolean | null
          level?: string
          monthly_salary_ref?: number | null
          name?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_roles_cluster_id_fk"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      kpis_meta: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          meta_id: string | null
          nome: string
          unidade: string | null
          updated_at: string | null
          valor_alvo: number
          valor_atual: number | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          meta_id?: string | null
          nome: string
          unidade?: string | null
          updated_at?: string | null
          valor_alvo: number
          valor_atual?: number | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          meta_id?: string | null
          nome?: string
          unidade?: string | null
          updated_at?: string | null
          valor_alvo?: number
          valor_atual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpis_meta_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas"
            referencedColumns: ["id"]
          },
        ]
      }
      matricula: {
        Row: {
          area_documento: number
          area_explorada: number | null
          area_real: number | null
          area_unidade: string
          bem_id: string | null
          cartorio_id: string
          confrontacoes_texto: string | null
          created_at: string
          created_by: string | null
          data_matricula: string | null
          descricao_psa_completa: string | null
          folha: string | null
          georref_prejudica_transferencia: boolean | null
          georreferenciado: string | null
          id: string
          imposto_anual_exercicio: number | null
          livro: string | null
          matricula_anterior_id: string | null
          matricula_anterior_texto: string | null
          municipio_imovel: string
          numero: string
          origem_descricao: string | null
          tipo_bem: string | null
          tipo_exploracao_posse: string | null
          uf_imovel: string
          updated_at: string
          updated_by: string | null
          vlr_benfeitorias: number | null
          vlr_contabil: number | null
          vlr_contabil_ajustado: number | null
          vlr_imposto_anual: number | null
          vlr_mercado: number | null
        }
        Insert: {
          area_documento: number
          area_explorada?: number | null
          area_real?: number | null
          area_unidade: string
          bem_id?: string | null
          cartorio_id: string
          confrontacoes_texto?: string | null
          created_at?: string
          created_by?: string | null
          data_matricula?: string | null
          descricao_psa_completa?: string | null
          folha?: string | null
          georref_prejudica_transferencia?: boolean | null
          georreferenciado?: string | null
          id?: string
          imposto_anual_exercicio?: number | null
          livro?: string | null
          matricula_anterior_id?: string | null
          matricula_anterior_texto?: string | null
          municipio_imovel: string
          numero: string
          origem_descricao?: string | null
          tipo_bem?: string | null
          tipo_exploracao_posse?: string | null
          uf_imovel: string
          updated_at?: string
          updated_by?: string | null
          vlr_benfeitorias?: number | null
          vlr_contabil?: number | null
          vlr_contabil_ajustado?: number | null
          vlr_imposto_anual?: number | null
          vlr_mercado?: number | null
        }
        Update: {
          area_documento?: number
          area_explorada?: number | null
          area_real?: number | null
          area_unidade?: string
          bem_id?: string | null
          cartorio_id?: string
          confrontacoes_texto?: string | null
          created_at?: string
          created_by?: string | null
          data_matricula?: string | null
          descricao_psa_completa?: string | null
          folha?: string | null
          georref_prejudica_transferencia?: boolean | null
          georreferenciado?: string | null
          id?: string
          imposto_anual_exercicio?: number | null
          livro?: string | null
          matricula_anterior_id?: string | null
          matricula_anterior_texto?: string | null
          municipio_imovel?: string
          numero?: string
          origem_descricao?: string | null
          tipo_bem?: string | null
          tipo_exploracao_posse?: string | null
          uf_imovel?: string
          updated_at?: string
          updated_by?: string | null
          vlr_benfeitorias?: number | null
          vlr_contabil?: number | null
          vlr_contabil_ajustado?: number | null
          vlr_imposto_anual?: number | null
          vlr_mercado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matricula_bem_id_fkey"
            columns: ["bem_id"]
            isOneToOne: false
            referencedRelation: "bem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matricula_cartorio_id_fkey"
            columns: ["cartorio_id"]
            isOneToOne: false
            referencedRelation: "cartorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matricula_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matricula_matricula_anterior_id_fkey"
            columns: ["matricula_anterior_id"]
            isOneToOne: false
            referencedRelation: "matricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matricula_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      melhoria_acoes_td: {
        Row: {
          acao_td: string
          created_at: string
          id: string
          melhoria_id: string
          ordem: number | null
        }
        Insert: {
          acao_td: string
          created_at?: string
          id?: string
          melhoria_id: string
          ordem?: number | null
        }
        Update: {
          acao_td?: string
          created_at?: string
          id?: string
          melhoria_id?: string
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "melhoria_acoes_td_melhoria_id_fkey"
            columns: ["melhoria_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          },
        ]
      }
      melhoria_processos: {
        Row: {
          created_at: string
          id: string
          melhoria_id: string
          processo_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          melhoria_id: string
          processo_id: string
        }
        Update: {
          created_at?: string
          id?: string
          melhoria_id?: string
          processo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "melhoria_processos_melhoria_id_fkey"
            columns: ["melhoria_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "melhoria_processos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      melhoria_responsaveis: {
        Row: {
          created_at: string
          horas: number | null
          id: string
          melhoria_id: string
          papel: string
          responsavel_id: string
        }
        Insert: {
          created_at?: string
          horas?: number | null
          id?: string
          melhoria_id: string
          papel?: string
          responsavel_id: string
        }
        Update: {
          created_at?: string
          horas?: number | null
          id?: string
          melhoria_id?: string
          papel?: string
          responsavel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "melhoria_responsaveis_melhoria_id_fkey"
            columns: ["melhoria_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "melhoria_responsaveis_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      melhoria_sistemas: {
        Row: {
          created_at: string
          id: string
          melhoria_id: string
          rateio: number | null
          sistema_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          melhoria_id: string
          rateio?: number | null
          sistema_id: string
        }
        Update: {
          created_at?: string
          id?: string
          melhoria_id?: string
          rateio?: number | null
          sistema_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "melhoria_sistemas_melhoria_id_fkey"
            columns: ["melhoria_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "melhoria_sistemas_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "sistemas_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          ajuste_qualitativo: string | null
          ajuste_qualitativo_publico: string | null
          ciclo_id: string | null
          classificacao_final: string | null
          comentario_membro: string | null
          created_at: string | null
          created_by: string | null
          criterio_evidencia: string | null
          descricao: string | null
          dimensao: string
          id: string
          meta_pai_id: string | null
          nivel: string
          peso: number | null
          prazo: string | null
          progresso_atual: number | null
          recomendacao_decisao: string | null
          responsavel_id: string | null
          status: string | null
          titulo: string
          ultima_atualizacao_membro: string | null
          updated_at: string | null
        }
        Insert: {
          ajuste_qualitativo?: string | null
          ajuste_qualitativo_publico?: string | null
          ciclo_id?: string | null
          classificacao_final?: string | null
          comentario_membro?: string | null
          created_at?: string | null
          created_by?: string | null
          criterio_evidencia?: string | null
          descricao?: string | null
          dimensao: string
          id?: string
          meta_pai_id?: string | null
          nivel: string
          peso?: number | null
          prazo?: string | null
          progresso_atual?: number | null
          recomendacao_decisao?: string | null
          responsavel_id?: string | null
          status?: string | null
          titulo: string
          ultima_atualizacao_membro?: string | null
          updated_at?: string | null
        }
        Update: {
          ajuste_qualitativo?: string | null
          ajuste_qualitativo_publico?: string | null
          ciclo_id?: string | null
          classificacao_final?: string | null
          comentario_membro?: string | null
          created_at?: string | null
          created_by?: string | null
          criterio_evidencia?: string | null
          descricao?: string | null
          dimensao?: string
          id?: string
          meta_pai_id?: string | null
          nivel?: string
          peso?: number | null
          prazo?: string | null
          progresso_atual?: number | null
          recomendacao_decisao?: string | null
          responsavel_id?: string | null
          status?: string | null
          titulo?: string
          ultima_atualizacao_membro?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_meta_pai_id_fkey"
            columns: ["meta_pai_id"]
            isOneToOne: false
            referencedRelation: "metas"
            referencedColumns: ["id"]
          },
        ]
      }
      novidades: {
        Row: {
          ativo: boolean | null
          botao_texto: string | null
          botao_url: string | null
          categoria: string
          conteudo_completo: string | null
          created_at: string | null
          created_by: string | null
          data_publicacao: string | null
          descricao: string
          id: string
          imagem_lateral_posicao: string | null
          imagem_lateral_url: string | null
          imagem_url: string | null
          itens: string[] | null
          texto_original: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          botao_texto?: string | null
          botao_url?: string | null
          categoria: string
          conteudo_completo?: string | null
          created_at?: string | null
          created_by?: string | null
          data_publicacao?: string | null
          descricao: string
          id?: string
          imagem_lateral_posicao?: string | null
          imagem_lateral_url?: string | null
          imagem_url?: string | null
          itens?: string[] | null
          texto_original?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          botao_texto?: string | null
          botao_url?: string | null
          categoria?: string
          conteudo_completo?: string | null
          created_at?: string | null
          created_by?: string | null
          data_publicacao?: string | null
          descricao?: string
          id?: string
          imagem_lateral_posicao?: string | null
          imagem_lateral_url?: string | null
          imagem_url?: string | null
          itens?: string[] | null
          texto_original?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ordem_servico: {
        Row: {
          cluster_id: string | null
          created_at: string | null
          data_emissao: string | null
          data_fim: string | null
          data_inicio: string | null
          excluido: boolean
          id: string
          id_cliente: string
          id_produto_segmento: string | null
          id_servico: string | null
          numero_os: string | null
          observacoes: string | null
          regiao: string | null
          setor_cliente: string | null
          setor_cliente_id: string | null
          situacao: string | null
          updated_at: string | null
          valor_projeto: number | null
          valor_reembolso_km: number | null
          valor_reembolso_refeicao: number | null
        }
        Insert: {
          cluster_id?: string | null
          created_at?: string | null
          data_emissao?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          excluido?: boolean
          id?: string
          id_cliente: string
          id_produto_segmento?: string | null
          id_servico?: string | null
          numero_os?: string | null
          observacoes?: string | null
          regiao?: string | null
          setor_cliente?: string | null
          setor_cliente_id?: string | null
          situacao?: string | null
          updated_at?: string | null
          valor_projeto?: number | null
          valor_reembolso_km?: number | null
          valor_reembolso_refeicao?: number | null
        }
        Update: {
          cluster_id?: string | null
          created_at?: string | null
          data_emissao?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          excluido?: boolean
          id?: string
          id_cliente?: string
          id_produto_segmento?: string | null
          id_servico?: string | null
          numero_os?: string | null
          observacoes?: string | null
          regiao?: string | null
          setor_cliente?: string | null
          setor_cliente_id?: string | null
          situacao?: string | null
          updated_at?: string | null
          valor_projeto?: number | null
          valor_reembolso_km?: number | null
          valor_reembolso_refeicao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordem_servico_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordem_servico_id_produto_segmento_fkey"
            columns: ["id_produto_segmento"]
            isOneToOne: false
            referencedRelation: "produto_segmento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordem_servico_id_servico_fkey"
            columns: ["id_servico"]
            isOneToOne: false
            referencedRelation: "servicos_prestados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordem_servico_setor_cliente_id_fkey"
            columns: ["setor_cliente_id"]
            isOneToOne: false
            referencedRelation: "setor_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      org_project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "org_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      org_projects: {
        Row: {
          contribuinte_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          equipe_id: string | null
          estrutura_area_id: string | null
          external_client_id: string | null
          id: string
          is_multidisciplinar: boolean
          leader_id: string | null
          name: string
          objective: string | null
          ordem_servico_id: string | null
          responsible_id: string | null
          servico_id: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          contribuinte_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          equipe_id?: string | null
          estrutura_area_id?: string | null
          external_client_id?: string | null
          id?: string
          is_multidisciplinar?: boolean
          leader_id?: string | null
          name: string
          objective?: string | null
          ordem_servico_id?: string | null
          responsible_id?: string | null
          servico_id?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          contribuinte_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          equipe_id?: string | null
          estrutura_area_id?: string | null
          external_client_id?: string | null
          id?: string
          is_multidisciplinar?: boolean
          leader_id?: string | null
          name?: string
          objective?: string | null
          ordem_servico_id?: string | null
          responsible_id?: string | null
          servico_id?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_projects_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "estrutura_equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_projects_estrutura_area_id_fkey"
            columns: ["estrutura_area_id"]
            isOneToOne: false
            referencedRelation: "estrutura_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_projects_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_projects_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordem_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_projects_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_projects_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_prestados"
            referencedColumns: ["id"]
          },
        ]
      }
      org_task_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          is_system: boolean | null
          task_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          task_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          task_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "org_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_tasks: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          assigned_to_name: string | null
          category: Database["public"]["Enums"]["fiscal_task_category"]
          client_id: string | null
          contribuinte_id: string | null
          created_at: string | null
          created_by: string | null
          department:
            | Database["public"]["Enums"]["fiscal_task_department"]
            | null
          description: string | null
          due_date: string | null
          due_time: string | null
          estimated_hours: number | null
          id: string
          is_recurring: boolean | null
          parent_task_id: string | null
          priority: Database["public"]["Enums"]["fiscal_task_priority"]
          project_id: string | null
          recurrence_type:
            | Database["public"]["Enums"]["fiscal_recurrence_type"]
            | null
          reviewer_id: string | null
          servico_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["fiscal_task_status"]
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          category?: Database["public"]["Enums"]["fiscal_task_category"]
          client_id?: string | null
          contribuinte_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department?:
            | Database["public"]["Enums"]["fiscal_task_department"]
            | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          estimated_hours?: number | null
          id?: string
          is_recurring?: boolean | null
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["fiscal_task_priority"]
          project_id?: string | null
          recurrence_type?:
            | Database["public"]["Enums"]["fiscal_recurrence_type"]
            | null
          reviewer_id?: string | null
          servico_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["fiscal_task_status"]
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          category?: Database["public"]["Enums"]["fiscal_task_category"]
          client_id?: string | null
          contribuinte_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department?:
            | Database["public"]["Enums"]["fiscal_task_department"]
            | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          estimated_hours?: number | null
          id?: string
          is_recurring?: boolean | null
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["fiscal_task_priority"]
          project_id?: string | null
          recurrence_type?:
            | Database["public"]["Enums"]["fiscal_recurrence_type"]
            | null
          reviewer_id?: string | null
          servico_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["fiscal_task_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_tasks_categoria_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_prestados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_tasks_contribuinte_id_fkey"
            columns: ["contribuinte_id"]
            isOneToOne: false
            referencedRelation: "contribuinte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "org_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "org_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_tasks_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      os_produtos_contratados: {
        Row: {
          created_at: string | null
          horas_contratadas: number | null
          id: string
          ordem_servico_id: string
          produto_segmento_id: string
        }
        Insert: {
          created_at?: string | null
          horas_contratadas?: number | null
          id?: string
          ordem_servico_id: string
          produto_segmento_id: string
        }
        Update: {
          created_at?: string | null
          horas_contratadas?: number | null
          id?: string
          ordem_servico_id?: string
          produto_segmento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_produtos_contratados_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordem_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_produtos_contratados_produto_segmento_id_fkey"
            columns: ["produto_segmento_id"]
            isOneToOne: false
            referencedRelation: "produto_segmento"
            referencedColumns: ["id"]
          },
        ]
      }
      page_permissions: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          page_description: string | null
          page_name: string
          page_path: string
          requires_admin: boolean | null
          requires_team_member: boolean | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          page_description?: string | null
          page_name: string
          page_path: string
          requires_admin?: boolean | null
          requires_team_member?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          page_description?: string | null
          page_name?: string
          page_path?: string
          requires_admin?: boolean | null
          requires_team_member?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      parentesco: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          natureza: string | null
          parente_pessoa_id: string
          pessoa_id: string
          tipo: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          natureza?: string | null
          parente_pessoa_id: string
          pessoa_id: string
          tipo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          natureza?: string | null
          parente_pessoa_id?: string
          pessoa_id?: string
          tipo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parentesco_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parentesco_parente_pessoa_id_fkey"
            columns: ["parente_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parentesco_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parentesco_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      per: {
        Row: {
          atualizado_em: string | null
          atualizado_por: string | null
          criado_em: string | null
          criado_por: string | null
          dt_solicitada: string
          exercicio: number
          id_contribuinte: string
          nr_per: string
          nr_proc_ret: string | null
          porcentagem_psa: number | null
          tp_credito: string
          tri_exercicio: number
          vlr_credito: number
          vlr_ressarcido: number | null
          vlr_ressarcido_original: number | null
        }
        Insert: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          criado_em?: string | null
          criado_por?: string | null
          dt_solicitada: string
          exercicio: number
          id_contribuinte: string
          nr_per: string
          nr_proc_ret?: string | null
          porcentagem_psa?: number | null
          tp_credito: string
          tri_exercicio: number
          vlr_credito: number
          vlr_ressarcido?: number | null
          vlr_ressarcido_original?: number | null
        }
        Update: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          criado_em?: string | null
          criado_por?: string | null
          dt_solicitada?: string
          exercicio?: number
          id_contribuinte?: string
          nr_per?: string
          nr_proc_ret?: string | null
          porcentagem_psa?: number | null
          tp_credito?: string
          tri_exercicio?: number
          vlr_credito?: number
          vlr_ressarcido?: number | null
          vlr_ressarcido_original?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "per_nr_proc_ret_fkey"
            columns: ["nr_proc_ret"]
            isOneToOne: false
            referencedRelation: "per"
            referencedColumns: ["nr_per"]
          },
          {
            foreignKeyName: "per_nr_proc_ret_fkey"
            columns: ["nr_proc_ret"]
            isOneToOne: false
            referencedRelation: "per_with_contribuinte"
            referencedColumns: ["nr_per"]
          },
        ]
      }
      per_situacao: {
        Row: {
          criado_em: string | null
          criado_por: string | null
          dt_pagamento: string | null
          id: string
          nr_proc_per: string
          situacao: string
        }
        Insert: {
          criado_em?: string | null
          criado_por?: string | null
          dt_pagamento?: string | null
          id?: string
          nr_proc_per: string
          situacao: string
        }
        Update: {
          criado_em?: string | null
          criado_por?: string | null
          dt_pagamento?: string | null
          id?: string
          nr_proc_per?: string
          situacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "per_situacao_nr_proc_per_fkey"
            columns: ["nr_proc_per"]
            isOneToOne: false
            referencedRelation: "per"
            referencedColumns: ["nr_per"]
          },
          {
            foreignKeyName: "per_situacao_nr_proc_per_fkey"
            columns: ["nr_proc_per"]
            isOneToOne: false
            referencedRelation: "per_with_contribuinte"
            referencedColumns: ["nr_per"]
          },
        ]
      }
      performance_preferencias: {
        Row: {
          area_padrao: string | null
          dashboard_layout: Json | null
          id: string
          periodo_padrao: string | null
          updated_at: string | null
          usuario_id: string | null
          widgets_ocultos: string[] | null
        }
        Insert: {
          area_padrao?: string | null
          dashboard_layout?: Json | null
          id?: string
          periodo_padrao?: string | null
          updated_at?: string | null
          usuario_id?: string | null
          widgets_ocultos?: string[] | null
        }
        Update: {
          area_padrao?: string | null
          dashboard_layout?: Json | null
          id?: string
          periodo_padrao?: string | null
          updated_at?: string | null
          usuario_id?: string | null
          widgets_ocultos?: string[] | null
        }
        Relationships: []
      }
      pessoa: {
        Row: {
          cliente_id: string
          conjuge_id: string | null
          contribuinte_id: string | null
          cpf_cnpj: string | null
          created_at: string
          created_by: string | null
          data_constituicao: string | null
          data_nascimento: string | null
          denominacao: string
          documento_identidade_numero: string | null
          documento_identidade_orgao: string | null
          documento_identidade_tipo: string | null
          documento_identidade_uf: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_complemento: string | null
          endereco_logradouro: string | null
          endereco_municipio: string | null
          endereco_numero: string | null
          endereco_uf: string | null
          estado_civil: string | null
          filiacao_mae: string | null
          filiacao_mae_pessoa_id: string | null
          filiacao_pai: string | null
          filiacao_pai_pessoa_id: string | null
          genero: string | null
          id: string
          is_fundador: boolean
          junta_comercial_uf: string | null
          nacionalidade: string | null
          naturalidade_municipio: string | null
          naturalidade_uf: string | null
          nire: string | null
          objeto_social: string | null
          profissao: string | null
          regime_bens: string | null
          status_constituicao: string | null
          tipo_empresa: string | null
          tipo_pessoa: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cliente_id: string
          conjuge_id?: string | null
          contribuinte_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_constituicao?: string | null
          data_nascimento?: string | null
          denominacao: string
          documento_identidade_numero?: string | null
          documento_identidade_orgao?: string | null
          documento_identidade_tipo?: string | null
          documento_identidade_uf?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_municipio?: string | null
          endereco_numero?: string | null
          endereco_uf?: string | null
          estado_civil?: string | null
          filiacao_mae?: string | null
          filiacao_mae_pessoa_id?: string | null
          filiacao_pai?: string | null
          filiacao_pai_pessoa_id?: string | null
          genero?: string | null
          id?: string
          is_fundador?: boolean
          junta_comercial_uf?: string | null
          nacionalidade?: string | null
          naturalidade_municipio?: string | null
          naturalidade_uf?: string | null
          nire?: string | null
          objeto_social?: string | null
          profissao?: string | null
          regime_bens?: string | null
          status_constituicao?: string | null
          tipo_empresa?: string | null
          tipo_pessoa: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cliente_id?: string
          conjuge_id?: string | null
          contribuinte_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_constituicao?: string | null
          data_nascimento?: string | null
          denominacao?: string
          documento_identidade_numero?: string | null
          documento_identidade_orgao?: string | null
          documento_identidade_tipo?: string | null
          documento_identidade_uf?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_municipio?: string | null
          endereco_numero?: string | null
          endereco_uf?: string | null
          estado_civil?: string | null
          filiacao_mae?: string | null
          filiacao_mae_pessoa_id?: string | null
          filiacao_pai?: string | null
          filiacao_pai_pessoa_id?: string | null
          genero?: string | null
          id?: string
          is_fundador?: boolean
          junta_comercial_uf?: string | null
          nacionalidade?: string | null
          naturalidade_municipio?: string | null
          naturalidade_uf?: string | null
          nire?: string | null
          objeto_social?: string | null
          profissao?: string | null
          regime_bens?: string | null
          status_constituicao?: string | null
          tipo_empresa?: string | null
          tipo_pessoa?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_conjuge_id_fkey"
            columns: ["conjuge_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_contribuinte_id_fkey"
            columns: ["contribuinte_id"]
            isOneToOne: false
            referencedRelation: "contribuinte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_filiacao_mae_pessoa_id_fkey"
            columns: ["filiacao_mae_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_filiacao_pai_pessoa_id_fkey"
            columns: ["filiacao_pai_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pis_cofins_class: {
        Row: {
          classificado_em: string | null
          classificado_por: string | null
          cod_ncm: string | null
          cod_produto: string | null
          created_at: string
          id: string
          id_contribuinte: string | null
          id_regra: string | null
        }
        Insert: {
          classificado_em?: string | null
          classificado_por?: string | null
          cod_ncm?: string | null
          cod_produto?: string | null
          created_at?: string
          id?: string
          id_contribuinte?: string | null
          id_regra?: string | null
        }
        Update: {
          classificado_em?: string | null
          classificado_por?: string | null
          cod_ncm?: string | null
          cod_produto?: string | null
          created_at?: string
          id?: string
          id_contribuinte?: string | null
          id_regra?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pis_cofins_class_classificado_por_fkey"
            columns: ["classificado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pis_cofins_class_id_contribuinte_fkey"
            columns: ["id_contribuinte"]
            isOneToOne: false
            referencedRelation: "contribuinte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pis_cofins_class_id_regra_fkey"
            columns: ["id_regra"]
            isOneToOne: false
            referencedRelation: "pis_cofins_regra"
            referencedColumns: ["id"]
          },
        ]
      }
      pis_cofins_regra: {
        Row: {
          base_legal: string | null
          cod_ncm: string
          created_at: string
          cst_cofins: string | null
          cst_pis: string | null
          data_vigencia_fim: number | null
          data_vigencia_inicio: number | null
          desc_cst: string | null
          id: string
          id_segmento: string
          observacoes: string | null
          permite_credito: string | null
          tipo_credito: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          base_legal?: string | null
          cod_ncm: string
          created_at?: string
          cst_cofins?: string | null
          cst_pis?: string | null
          data_vigencia_fim?: number | null
          data_vigencia_inicio?: number | null
          desc_cst?: string | null
          id?: string
          id_segmento: string
          observacoes?: string | null
          permite_credito?: string | null
          tipo_credito?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          base_legal?: string | null
          cod_ncm?: string
          created_at?: string
          cst_cofins?: string | null
          cst_pis?: string | null
          data_vigencia_fim?: number | null
          data_vigencia_inicio?: number | null
          desc_cst?: string | null
          id?: string
          id_segmento?: string
          observacoes?: string | null
          permite_credito?: string | null
          tipo_credito?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ppr_regras_ciclo: {
        Row: {
          ciclo_id: string | null
          classificacao: string
          created_at: string | null
          descricao_publica: string | null
          faixa_maxima: number | null
          faixa_minima: number
          id: string
          multiplicador_bonus: number
        }
        Insert: {
          ciclo_id?: string | null
          classificacao: string
          created_at?: string | null
          descricao_publica?: string | null
          faixa_maxima?: number | null
          faixa_minima: number
          id?: string
          multiplicador_bonus?: number
        }
        Update: {
          ciclo_id?: string | null
          classificacao?: string
          created_at?: string | null
          descricao_publica?: string | null
          faixa_maxima?: number | null
          faixa_minima?: number
          id?: string
          multiplicador_bonus?: number
        }
        Relationships: [
          {
            foreignKeyName: "ppr_regras_ciclo_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          },
        ]
      }
      procedimentos: {
        Row: {
          ai_complexidade: string | null
          ai_cover_url: string | null
          ai_etapas: Json | null
          ai_resumo: string | null
          ai_tags: string[] | null
          ai_titulo: string | null
          arquivo_path: string | null
          confirmado_em: string | null
          confirmado_por: string | null
          created_at: string | null
          created_by: string | null
          erro_mensagem: string | null
          id: string
          processos_associados: string[] | null
          source_type: string
          source_url: string | null
          status_geracao: string | null
          status_publicacao: string | null
          updated_at: string | null
        }
        Insert: {
          ai_complexidade?: string | null
          ai_cover_url?: string | null
          ai_etapas?: Json | null
          ai_resumo?: string | null
          ai_tags?: string[] | null
          ai_titulo?: string | null
          arquivo_path?: string | null
          confirmado_em?: string | null
          confirmado_por?: string | null
          created_at?: string | null
          created_by?: string | null
          erro_mensagem?: string | null
          id?: string
          processos_associados?: string[] | null
          source_type: string
          source_url?: string | null
          status_geracao?: string | null
          status_publicacao?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_complexidade?: string | null
          ai_cover_url?: string | null
          ai_etapas?: Json | null
          ai_resumo?: string | null
          ai_tags?: string[] | null
          ai_titulo?: string | null
          arquivo_path?: string | null
          confirmado_em?: string | null
          confirmado_por?: string | null
          created_at?: string | null
          created_by?: string | null
          erro_mensagem?: string | null
          id?: string
          processos_associados?: string[] | null
          source_type?: string
          source_url?: string | null
          status_geracao?: string | null
          status_publicacao?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      process_improvements: {
        Row: {
          baseline_cost_monthly: number | null
          baseline_people_involved: number | null
          baseline_time_hours: number | null
          baseline_volume: number | null
          build_vs_buy_savings: number | null
          cluster_id: string | null
          cost_saved_monthly: number | null
          cost_saved_percent: number | null
          created_at: string | null
          evaluated_by: string | null
          evaluation_end_date: string | null
          evaluation_period_days: number | null
          evaluation_start_date: string | null
          evaluation_status: string | null
          id: string
          implementation_cost: number | null
          implementation_hours: number | null
          improved_cost_monthly: number | null
          improved_people_involved: number | null
          improved_time_hours: number | null
          improved_volume: number | null
          improvement_description: string | null
          improvement_status: string | null
          one_time_external_cost: number | null
          other_savings_monthly: number | null
          process_id: string
          project_id: string | null
          roi_fte_annual: number | null
          roi_percentage: number | null
          roi_time_months: number | null
          sprint_deliverable_id: string | null
          system_savings_monthly: number | null
          time_saved_hours: number | null
          time_saved_percent: number | null
          training_hours: number | null
          updated_at: string | null
        }
        Insert: {
          baseline_cost_monthly?: number | null
          baseline_people_involved?: number | null
          baseline_time_hours?: number | null
          baseline_volume?: number | null
          build_vs_buy_savings?: number | null
          cluster_id?: string | null
          cost_saved_monthly?: number | null
          cost_saved_percent?: number | null
          created_at?: string | null
          evaluated_by?: string | null
          evaluation_end_date?: string | null
          evaluation_period_days?: number | null
          evaluation_start_date?: string | null
          evaluation_status?: string | null
          id?: string
          implementation_cost?: number | null
          implementation_hours?: number | null
          improved_cost_monthly?: number | null
          improved_people_involved?: number | null
          improved_time_hours?: number | null
          improved_volume?: number | null
          improvement_description?: string | null
          improvement_status?: string | null
          one_time_external_cost?: number | null
          other_savings_monthly?: number | null
          process_id: string
          project_id?: string | null
          roi_fte_annual?: number | null
          roi_percentage?: number | null
          roi_time_months?: number | null
          sprint_deliverable_id?: string | null
          system_savings_monthly?: number | null
          time_saved_hours?: number | null
          time_saved_percent?: number | null
          training_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          baseline_cost_monthly?: number | null
          baseline_people_involved?: number | null
          baseline_time_hours?: number | null
          baseline_volume?: number | null
          build_vs_buy_savings?: number | null
          cluster_id?: string | null
          cost_saved_monthly?: number | null
          cost_saved_percent?: number | null
          created_at?: string | null
          evaluated_by?: string | null
          evaluation_end_date?: string | null
          evaluation_period_days?: number | null
          evaluation_start_date?: string | null
          evaluation_status?: string | null
          id?: string
          implementation_cost?: number | null
          implementation_hours?: number | null
          improved_cost_monthly?: number | null
          improved_people_involved?: number | null
          improved_time_hours?: number | null
          improved_volume?: number | null
          improvement_description?: string | null
          improvement_status?: string | null
          one_time_external_cost?: number | null
          other_savings_monthly?: number | null
          process_id?: string
          project_id?: string | null
          roi_fte_annual?: number | null
          roi_percentage?: number | null
          roi_time_months?: number | null
          sprint_deliverable_id?: string | null
          system_savings_monthly?: number | null
          time_saved_hours?: number | null
          time_saved_percent?: number | null
          training_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_improvements_cluster_id_fk"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_improvements_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_improvements_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_improvements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_improvements_sprint_deliverable_id_fkey"
            columns: ["sprint_deliverable_id"]
            isOneToOne: false
            referencedRelation: "sprint_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      process_scenarios: {
        Row: {
          annual_cost: number | null
          annual_hours: number | null
          annual_savings: number | null
          computed_metrics: Json | null
          created_at: string
          created_by: string
          description: string | null
          hours_freed: number | null
          id: string
          improvement_id: string | null
          investment: number | null
          is_locked: boolean
          locked_fields: string[]
          name: string
          notes: string | null
          parameters: Json
          parent_scenario_id: string | null
          payback_months: number | null
          process_id: string
          project_id: string | null
          roi_percent: number | null
          scenario_kind: Database["public"]["Enums"]["scenario_kind"]
          scenario_type: Database["public"]["Enums"]["scenario_type"]
          snapshot_at: string | null
          status: Database["public"]["Enums"]["scenario_status"]
          unit_basis: Database["public"]["Enums"]["scenario_unit_basis"]
          updated_at: string
          varied_field: string
        }
        Insert: {
          annual_cost?: number | null
          annual_hours?: number | null
          annual_savings?: number | null
          computed_metrics?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          hours_freed?: number | null
          id?: string
          improvement_id?: string | null
          investment?: number | null
          is_locked?: boolean
          locked_fields?: string[]
          name: string
          notes?: string | null
          parameters: Json
          parent_scenario_id?: string | null
          payback_months?: number | null
          process_id: string
          project_id?: string | null
          roi_percent?: number | null
          scenario_kind: Database["public"]["Enums"]["scenario_kind"]
          scenario_type?: Database["public"]["Enums"]["scenario_type"]
          snapshot_at?: string | null
          status?: Database["public"]["Enums"]["scenario_status"]
          unit_basis?: Database["public"]["Enums"]["scenario_unit_basis"]
          updated_at?: string
          varied_field: string
        }
        Update: {
          annual_cost?: number | null
          annual_hours?: number | null
          annual_savings?: number | null
          computed_metrics?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          hours_freed?: number | null
          id?: string
          improvement_id?: string | null
          investment?: number | null
          is_locked?: boolean
          locked_fields?: string[]
          name?: string
          notes?: string | null
          parameters?: Json
          parent_scenario_id?: string | null
          payback_months?: number | null
          process_id?: string
          project_id?: string | null
          roi_percent?: number | null
          scenario_kind?: Database["public"]["Enums"]["scenario_kind"]
          scenario_type?: Database["public"]["Enums"]["scenario_type"]
          snapshot_at?: string | null
          status?: Database["public"]["Enums"]["scenario_status"]
          unit_basis?: Database["public"]["Enums"]["scenario_unit_basis"]
          updated_at?: string
          varied_field?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_scenarios_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_scenarios_improvement_id_fkey"
            columns: ["improvement_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_scenarios_parent_scenario_id_fkey"
            columns: ["parent_scenario_id"]
            isOneToOne: false
            referencedRelation: "process_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_scenarios_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_scenarios_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      process_stages: {
        Row: {
          automation_level: string | null
          created_at: string | null
          description: string | null
          error_cost: number | null
          error_rate: number | null
          error_volume: number | null
          execution: string | null
          frequency: string | null
          id: string
          inputs: Json | null
          job_role_id: string | null
          lead_time_days: number | null
          name: string
          outputs: Json | null
          process_id: string | null
          related_projects: string[] | null
          responsible: string | null
          rework_rate: number | null
          scenario: string
          stage_as_is_id: string | null
          stage_order: number
          systems: Json | null
          time_current: string | null
          time_target: string | null
          updated_at: string | null
          volume: string | null
          volume_per_process: number | null
        }
        Insert: {
          automation_level?: string | null
          created_at?: string | null
          description?: string | null
          error_cost?: number | null
          error_rate?: number | null
          error_volume?: number | null
          execution?: string | null
          frequency?: string | null
          id?: string
          inputs?: Json | null
          job_role_id?: string | null
          lead_time_days?: number | null
          name: string
          outputs?: Json | null
          process_id?: string | null
          related_projects?: string[] | null
          responsible?: string | null
          rework_rate?: number | null
          scenario?: string
          stage_as_is_id?: string | null
          stage_order: number
          systems?: Json | null
          time_current?: string | null
          time_target?: string | null
          updated_at?: string | null
          volume?: string | null
          volume_per_process?: number | null
        }
        Update: {
          automation_level?: string | null
          created_at?: string | null
          description?: string | null
          error_cost?: number | null
          error_rate?: number | null
          error_volume?: number | null
          execution?: string | null
          frequency?: string | null
          id?: string
          inputs?: Json | null
          job_role_id?: string | null
          lead_time_days?: number | null
          name?: string
          outputs?: Json | null
          process_id?: string | null
          related_projects?: string[] | null
          responsible?: string | null
          rework_rate?: number | null
          scenario?: string
          stage_as_is_id?: string | null
          stage_order?: number
          systems?: Json | null
          time_current?: string | null
          time_target?: string | null
          updated_at?: string | null
          volume?: string | null
          volume_per_process?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "process_stages_job_role_id_fkey"
            columns: ["job_role_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_stages_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          area: string | null
          automation_potential: number | null
          client_id: string | null
          cluster_id: string | null
          code: string | null
          complexity_level: string | null
          cost_monthly: number | null
          created_at: string
          created_by: string | null
          deliverable: string | null
          description: string | null
          document_path: string | null
          equipe_id: string | null
          evaluation_period_days: number | null
          evaluation_status: string | null
          financial_impact: string | null
          formatted_content: string | null
          frequency: string | null
          id: string
          last_ai_sync: string | null
          last_cost_saved_monthly: number | null
          last_improvement_date: string | null
          last_roi_percentage: number | null
          last_time_saved_hours: number | null
          mapped_at: string | null
          name: string
          order_index: number | null
          people_involved: number | null
          priority: string | null
          project_id: string | null
          sop_before_content: string | null
          sop_before_document_path: string | null
          sop_before_link: string | null
          sop_document_path: string | null
          sop_link: string | null
          stage: string
          time_spent_frequency: string | null
          time_spent_hours: number | null
          training_hours: number | null
          updated_at: string
          volume_executions: number | null
          volume_month: number | null
        }
        Insert: {
          area?: string | null
          automation_potential?: number | null
          client_id?: string | null
          cluster_id?: string | null
          code?: string | null
          complexity_level?: string | null
          cost_monthly?: number | null
          created_at?: string
          created_by?: string | null
          deliverable?: string | null
          description?: string | null
          document_path?: string | null
          equipe_id?: string | null
          evaluation_period_days?: number | null
          evaluation_status?: string | null
          financial_impact?: string | null
          formatted_content?: string | null
          frequency?: string | null
          id?: string
          last_ai_sync?: string | null
          last_cost_saved_monthly?: number | null
          last_improvement_date?: string | null
          last_roi_percentage?: number | null
          last_time_saved_hours?: number | null
          mapped_at?: string | null
          name: string
          order_index?: number | null
          people_involved?: number | null
          priority?: string | null
          project_id?: string | null
          sop_before_content?: string | null
          sop_before_document_path?: string | null
          sop_before_link?: string | null
          sop_document_path?: string | null
          sop_link?: string | null
          stage?: string
          time_spent_frequency?: string | null
          time_spent_hours?: number | null
          training_hours?: number | null
          updated_at?: string
          volume_executions?: number | null
          volume_month?: number | null
        }
        Update: {
          area?: string | null
          automation_potential?: number | null
          client_id?: string | null
          cluster_id?: string | null
          code?: string | null
          complexity_level?: string | null
          cost_monthly?: number | null
          created_at?: string
          created_by?: string | null
          deliverable?: string | null
          description?: string | null
          document_path?: string | null
          equipe_id?: string | null
          evaluation_period_days?: number | null
          evaluation_status?: string | null
          financial_impact?: string | null
          formatted_content?: string | null
          frequency?: string | null
          id?: string
          last_ai_sync?: string | null
          last_cost_saved_monthly?: number | null
          last_improvement_date?: string | null
          last_roi_percentage?: number | null
          last_time_saved_hours?: number | null
          mapped_at?: string | null
          name?: string
          order_index?: number | null
          people_involved?: number | null
          priority?: string | null
          project_id?: string | null
          sop_before_content?: string | null
          sop_before_document_path?: string | null
          sop_before_link?: string | null
          sop_document_path?: string | null
          sop_link?: string | null
          stage?: string
          time_spent_frequency?: string | null
          time_spent_hours?: number | null
          training_hours?: number | null
          updated_at?: string
          volume_executions?: number | null
          volume_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "catalog_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processes_cluster_id_fk"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processes_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "estrutura_equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_segmento: {
        Row: {
          cluster_id: string | null
          codigo: string
          created_at: string | null
          id: string
          is_active: boolean | null
          nome: string
        }
        Insert: {
          cluster_id?: string | null
          codigo: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          nome: string
        }
        Update: {
          cluster_id?: string | null
          codigo?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_segmento_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_servico: {
        Row: {
          id: string
          produto_segmento_id: string
          servico_prestado_id: string
        }
        Insert: {
          id?: string
          produto_segmento_id: string
          servico_prestado_id: string
        }
        Update: {
          id?: string
          produto_segmento_id?: string
          servico_prestado_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_servico_produto_segmento_id_fkey"
            columns: ["produto_segmento_id"]
            isOneToOne: false
            referencedRelation: "produto_segmento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_servico_servico_prestado_id_fkey"
            columns: ["servico_prestado_id"]
            isOneToOne: false
            referencedRelation: "servicos_prestados"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          first_access_at: string | null
          first_access_done: boolean | null
          first_name: string
          id: string
          last_name: string | null
          last_sign_in_at: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          first_access_at?: string | null
          first_access_done?: boolean | null
          first_name: string
          id: string
          last_name?: string | null
          last_sign_in_at?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          first_access_at?: string | null
          first_access_done?: boolean | null
          first_name?: string
          id?: string
          last_name?: string | null
          last_sign_in_at?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_documents: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          process_id: string | null
          sprint_id: string | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          process_id?: string | null
          sprint_id?: string | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          process_id?: string | null
          sprint_id?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_processes: {
        Row: {
          created_at: string | null
          id: string
          impact_type: string | null
          impacted_stages: string[] | null
          process_id: string | null
          project_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          impact_type?: string | null
          impacted_stages?: string[] | null
          process_id?: string | null
          project_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          impact_type?: string | null
          impacted_stages?: string[] | null
          process_id?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_processes_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_processes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_servicos: {
        Row: {
          id: string
          project_id: string
          servico_id: string
        }
        Insert: {
          id?: string
          project_id: string
          servico_id: string
        }
        Update: {
          id?: string
          project_id?: string
          servico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_project_servicos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "org_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_project_categorias_categoria_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_prestados"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          area: string | null
          client_id: string | null
          client_name: string | null
          cluster_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          equipe_id: string | null
          external_client_id: string | null
          id: string
          justification_detail: string | null
          justification_type: string | null
          leader_id: string | null
          name: string
          product_service: string | null
          project_front: string | null
          projects_per_year: number | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          area?: string | null
          client_id?: string | null
          client_name?: string | null
          cluster_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          equipe_id?: string | null
          external_client_id?: string | null
          id?: string
          justification_detail?: string | null
          justification_type?: string | null
          leader_id?: string | null
          name: string
          product_service?: string | null
          project_front?: string | null
          projects_per_year?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          area?: string | null
          client_id?: string | null
          client_name?: string | null
          cluster_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          equipe_id?: string | null
          external_client_id?: string | null
          id?: string
          justification_detail?: string | null
          justification_type?: string | null
          leader_id?: string | null
          name?: string
          product_service?: string | null
          project_front?: string | null
          projects_per_year?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "catalog_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_cluster_id_fk"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "estrutura_equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_external_client_id_fkey"
            columns: ["external_client_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_flag_valor: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          flag_id: string
          id: string
          pj_pessoa_id: string | null
          setado_por_id: string | null
          updated_at: string
          updated_by: string | null
          valor: boolean
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          flag_id: string
          id?: string
          pj_pessoa_id?: string | null
          setado_por_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valor: boolean
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          flag_id?: string
          id?: string
          pj_pessoa_id?: string | null
          setado_por_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valor?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "projeto_flag_valor_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_flag_valor_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_flag_valor_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "tmpl_flag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_flag_valor_pj_pessoa_id_fkey"
            columns: ["pj_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_flag_valor_setado_por_id_fkey"
            columns: ["setado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_flag_valor_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_justificativas: {
        Row: {
          created_at: string
          id: string
          justificativa: string
          ordem: number | null
          projeto_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          justificativa: string
          ordem?: number | null
          projeto_id: string
        }
        Update: {
          created_at?: string
          id?: string
          justificativa?: string
          ordem?: number | null
          projeto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_justificativas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      quadro_societario: {
        Row: {
          created_at: string
          created_by: string | null
          data_referencia: string | null
          empresa_pessoa_id: string
          id: string
          percentual: number | null
          quotas: number | null
          socio_pessoa_id: string
          updated_at: string
          updated_by: string | null
          vlr_total: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_referencia?: string | null
          empresa_pessoa_id: string
          id?: string
          percentual?: number | null
          quotas?: number | null
          socio_pessoa_id: string
          updated_at?: string
          updated_by?: string | null
          vlr_total?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_referencia?: string | null
          empresa_pessoa_id?: string
          id?: string
          percentual?: number | null
          quotas?: number | null
          socio_pessoa_id?: string
          updated_at?: string
          updated_by?: string | null
          vlr_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quadro_societario_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quadro_societario_empresa_pessoa_id_fkey"
            columns: ["empresa_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quadro_societario_socio_pessoa_id_fkey"
            columns: ["socio_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quadro_societario_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios_gerados: {
        Row: {
          ciclo_id: string | null
          conteudo_ia: string | null
          gerado_em: string | null
          gerado_por: string | null
          id: string
          membro_id: string | null
          status: string | null
          tipo: string
        }
        Insert: {
          ciclo_id?: string | null
          conteudo_ia?: string | null
          gerado_em?: string | null
          gerado_por?: string | null
          id?: string
          membro_id?: string | null
          status?: string | null
          tipo: string
        }
        Update: {
          ciclo_id?: string | null
          conteudo_ia?: string | null
          gerado_em?: string | null
          gerado_por?: string | null
          id?: string
          membro_id?: string | null
          status?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_gerados_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          },
        ]
      }
      representante: {
        Row: {
          acesso_chamados: boolean | null
          cargo: string | null
          created_at: string | null
          email: string | null
          excluido: boolean
          id_cliente: string
          id_representante: string
          nome: string
          observacoes: string | null
          telefone: string | null
          tipo_representante: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          acesso_chamados?: boolean | null
          cargo?: string | null
          created_at?: string | null
          email?: string | null
          excluido?: boolean
          id_cliente: string
          id_representante?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          tipo_representante?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          acesso_chamados?: boolean | null
          cargo?: string | null
          created_at?: string | null
          email?: string | null
          excluido?: boolean
          id_cliente?: string
          id_representante?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          tipo_representante?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "representante_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      reunioes_1a1: {
        Row: {
          ciclo_id: string | null
          created_at: string | null
          data_reuniao: string
          id: string
          lider_id: string | null
          membro_id: string | null
          observacoes_lider: string | null
          sentimento: number | null
          temas_discutidos: string | null
          updated_at: string | null
        }
        Insert: {
          ciclo_id?: string | null
          created_at?: string | null
          data_reuniao: string
          id?: string
          lider_id?: string | null
          membro_id?: string | null
          observacoes_lider?: string | null
          sentimento?: number | null
          temas_discutidos?: string | null
          updated_at?: string | null
        }
        Update: {
          ciclo_id?: string | null
          created_at?: string | null
          data_reuniao?: string
          id?: string
          lider_id?: string | null
          membro_id?: string | null
          observacoes_lider?: string | null
          sentimento?: number | null
          temas_discutidos?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_1a1_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          },
        ]
      }
      rls_precheck_allowed_tables: {
        Row: {
          allowed_ops: string[]
          created_at: string
          table_name: string
        }
        Insert: {
          allowed_ops?: string[]
          created_at?: string
          table_name: string
        }
        Update: {
          allowed_ops?: string[]
          created_at?: string
          table_name?: string
        }
        Relationships: []
      }
      roi_snapshots: {
        Row: {
          annual_cost: number | null
          annual_hours: number | null
          annual_savings: number | null
          checkpoint_id: string
          created_at: string
          created_by: string | null
          hours_freed: number | null
          id: string
          investment: number | null
          label: string | null
          payback_months: number | null
          process_id: string
          roi_percent: number | null
          scope_id: string | null
          scope_kind: string
          snapshot_at: string
        }
        Insert: {
          annual_cost?: number | null
          annual_hours?: number | null
          annual_savings?: number | null
          checkpoint_id: string
          created_at?: string
          created_by?: string | null
          hours_freed?: number | null
          id?: string
          investment?: number | null
          label?: string | null
          payback_months?: number | null
          process_id: string
          roi_percent?: number | null
          scope_id?: string | null
          scope_kind: string
          snapshot_at?: string
        }
        Update: {
          annual_cost?: number | null
          annual_hours?: number | null
          annual_savings?: number | null
          checkpoint_id?: string
          created_at?: string
          created_by?: string | null
          hours_freed?: number | null
          id?: string
          investment?: number | null
          label?: string | null
          payback_months?: number | null
          process_id?: string
          roi_percent?: number | null
          scope_id?: string | null
          scope_kind?: string
          snapshot_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roi_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roi_snapshots_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          frequency: string
          id: string
          is_recurring: boolean | null
          start_date: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          frequency?: string
          id?: string
          is_recurring?: boolean | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          frequency?: string
          id?: string
          is_recurring?: boolean | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routines_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos_prestados: {
        Row: {
          cluster_id: string | null
          id: string
          nome: string
        }
        Insert: {
          cluster_id?: string | null
          id?: string
          nome: string
        }
        Update: {
          cluster_id?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicos_prestados_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      setor_cliente: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          sigla: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          sigla: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          sigla?: string
        }
        Relationships: []
      }
      sistema_clusters: {
        Row: {
          cluster_id: string
          created_at: string
          id: string
          rateio: number | null
          sistema_id: string
        }
        Insert: {
          cluster_id: string
          created_at?: string
          id?: string
          rateio?: number | null
          sistema_id: string
        }
        Update: {
          cluster_id?: string
          created_at?: string
          id?: string
          rateio?: number | null
          sistema_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sistema_clusters_cluster_id_fk"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sistema_clusters_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "sistemas_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      sistema_responsaveis: {
        Row: {
          created_at: string
          horas: number | null
          id: string
          responsavel_id: string
          sistema_id: string
        }
        Insert: {
          created_at?: string
          horas?: number | null
          id?: string
          responsavel_id: string
          sistema_id: string
        }
        Update: {
          created_at?: string
          horas?: number | null
          id?: string
          responsavel_id?: string
          sistema_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sistema_responsaveis_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sistema_responsaveis_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "sistemas_processo"
            referencedColumns: ["id"]
          },
        ]
      }
      sistemas_processo: {
        Row: {
          cluster_id: string | null
          created_at: string
          custo_licenca_mensal: number | null
          custo_por_operacao: number | null
          custo_setup: number | null
          custo_variavel_por_uso: number | null
          descricao: string | null
          id: string
          nome: string
          obs_custo_por_operacao: string | null
          obs_licenca: string | null
          obs_variavel: string | null
          origem: string | null
          tipo: string | null
          tipo_custo: string | null
          updated_at: string
        }
        Insert: {
          cluster_id?: string | null
          created_at?: string
          custo_licenca_mensal?: number | null
          custo_por_operacao?: number | null
          custo_setup?: number | null
          custo_variavel_por_uso?: number | null
          descricao?: string | null
          id?: string
          nome: string
          obs_custo_por_operacao?: string | null
          obs_licenca?: string | null
          obs_variavel?: string | null
          origem?: string | null
          tipo?: string | null
          tipo_custo?: string | null
          updated_at?: string
        }
        Update: {
          cluster_id?: string | null
          created_at?: string
          custo_licenca_mensal?: number | null
          custo_por_operacao?: number | null
          custo_setup?: number | null
          custo_variavel_por_uso?: number | null
          descricao?: string | null
          id?: string
          nome?: string
          obs_custo_por_operacao?: string | null
          obs_licenca?: string | null
          obs_variavel?: string | null
          origem?: string | null
          tipo?: string | null
          tipo_custo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sistemas_processo_cluster_id_fk"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_backlog_items: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_hours: number | null
          id: string
          moved_to_deliverable_id: string | null
          priority: string | null
          project_id: string | null
          sprint_id: string | null
          status: string | null
          suggested_by: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          moved_to_deliverable_id?: string | null
          priority?: string | null
          project_id?: string | null
          sprint_id?: string | null
          status?: string | null
          suggested_by?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          moved_to_deliverable_id?: string | null
          priority?: string | null
          project_id?: string | null
          sprint_id?: string | null
          status?: string | null
          suggested_by?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprint_backlog_items_moved_to_deliverable_id_fkey"
            columns: ["moved_to_deliverable_id"]
            isOneToOne: false
            referencedRelation: "sprint_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_backlog_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_backlog_items_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_backlog_items_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_deliverables: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string
          estimated_hours: number | null
          id: string
          parent_id: string | null
          process_id: string | null
          project_id: string | null
          sprint_id: string | null
          start_date: string | null
          status: string | null
          task_code: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date: string
          estimated_hours?: number | null
          id?: string
          parent_id?: string | null
          process_id?: string | null
          project_id?: string | null
          sprint_id?: string | null
          start_date?: string | null
          status?: string | null
          task_code?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          estimated_hours?: number | null
          id?: string
          parent_id?: string | null
          process_id?: string | null
          project_id?: string | null
          sprint_id?: string | null
          start_date?: string | null
          status?: string | null
          task_code?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprint_deliverables_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_deliverables_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "sprint_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_deliverables_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_deliverables_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_events: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string | null
          event_date: string
          event_type: string | null
          id: string
          location: string | null
          participants: string[] | null
          sprint_id: string | null
          start_time: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          location?: string | null
          participants?: string[] | null
          sprint_id?: string | null
          start_time?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          location?: string | null
          participants?: string[] | null
          sprint_id?: string | null
          start_time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_events_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_metrics: {
        Row: {
          category: string | null
          created_at: string | null
          current_value: number | null
          id: string
          name: string
          sprint_id: string | null
          target_value: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          name: string
          sprint_id?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          name?: string
          sprint_id?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprint_metrics_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string
          goal: string | null
          id: string
          name: string
          project_id: string | null
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date: string
          goal?: string | null
          id?: string
          name: string
          project_id?: string | null
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          goal?: string | null
          id?: string
          name?: string
          project_id?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          cluster: Database["public"]["Enums"]["work_cluster"]
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"] | null
          sprint_id: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          cluster: Database["public"]["Enums"]["work_cluster"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          sprint_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          cluster?: Database["public"]["Enums"]["work_cluster"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          sprint_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string | null
          id: string
          ticket_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_path: string
          file_size: number
          file_type?: string | null
          id?: string
          ticket_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string | null
          id?: string
          ticket_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          is_admin: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          activity_status: string | null
          assigned_at: string | null
          assigned_to: string | null
          cliente_id: string | null
          closed_at: string | null
          cluster_id: string | null
          created_at: string | null
          deadline: string | null
          department: string | null
          description: string
          estrutura_area_id: string | null
          id: string
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_status?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          cliente_id?: string | null
          closed_at?: string | null
          cluster_id?: string | null
          created_at?: string | null
          deadline?: string | null
          department?: string | null
          description: string
          estrutura_area_id?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_status?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          cliente_id?: string | null
          closed_at?: string | null
          cluster_id?: string | null
          created_at?: string | null
          deadline?: string | null
          department?: string | null
          description?: string
          estrutura_area_id?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_estrutura_area_id_fkey"
            columns: ["estrutura_area_id"]
            isOneToOne: false
            referencedRelation: "estrutura_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      titularidade: {
        Row: {
          bem_id: string | null
          created_at: string
          created_by: string | null
          fracao: number | null
          id: string
          integralizador: boolean
          matricula_id: string | null
          tipo: string
          titular_pessoa_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bem_id?: string | null
          created_at?: string
          created_by?: string | null
          fracao?: number | null
          id?: string
          integralizador?: boolean
          matricula_id?: string | null
          tipo: string
          titular_pessoa_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bem_id?: string | null
          created_at?: string
          created_by?: string | null
          fracao?: number | null
          id?: string
          integralizador?: boolean
          matricula_id?: string | null
          tipo?: string
          titular_pessoa_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "titularidade_bem_id_fkey"
            columns: ["bem_id"]
            isOneToOne: false
            referencedRelation: "bem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titularidade_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titularidade_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titularidade_titular_pessoa_id_fkey"
            columns: ["titular_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titularidade_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tmpl_bloco: {
        Row: {
          ancora: string | null
          ativo: boolean
          autor_id: string | null
          bloco_origem_id: string | null
          categoria: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          escopo_documento_raiz_id: string | null
          id: string
          nome: string
          repete_colecao: string | null
          tipo: string
          tipo_derivacao: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ancora?: string | null
          ativo?: boolean
          autor_id?: string | null
          bloco_origem_id?: string | null
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          escopo_documento_raiz_id?: string | null
          id?: string
          nome: string
          repete_colecao?: string | null
          tipo?: string
          tipo_derivacao?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ancora?: string | null
          ativo?: boolean
          autor_id?: string | null
          bloco_origem_id?: string | null
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          escopo_documento_raiz_id?: string | null
          id?: string
          nome?: string
          repete_colecao?: string | null
          tipo?: string
          tipo_derivacao?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tmpl_bloco_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmpl_bloco_bloco_origem_id_fkey"
            columns: ["bloco_origem_id"]
            isOneToOne: false
            referencedRelation: "tmpl_bloco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmpl_bloco_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmpl_bloco_escopo_documento_raiz_fk"
            columns: ["escopo_documento_raiz_id"]
            isOneToOne: false
            referencedRelation: "documento_gerado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmpl_bloco_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tmpl_bloco_flag: {
        Row: {
          bloco_id: string
          created_at: string
          created_by: string | null
          flag_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bloco_id: string
          created_at?: string
          created_by?: string | null
          flag_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bloco_id?: string
          created_at?: string
          created_by?: string | null
          flag_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tmpl_bloco_flag_bloco_id_fkey"
            columns: ["bloco_id"]
            isOneToOne: false
            referencedRelation: "tmpl_bloco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmpl_bloco_flag_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmpl_bloco_flag_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "tmpl_flag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmpl_bloco_flag_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tmpl_bloco_versao: {
        Row: {
          atual: boolean
          autor_id: string | null
          bloco_id: string
          caminho_arquivo: string | null
          changelog: string | null
          checksum: string | null
          conteudo: string | null
          created_at: string
          created_by: string | null
          id: string
          numero_versao: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          atual?: boolean
          autor_id?: string | null
          bloco_id: string
          caminho_arquivo?: string | null
          changelog?: string | null
          checksum?: string | null
          conteudo?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          numero_versao: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          atual?: boolean
          autor_id?: string | null
          bloco_id?: string
          caminho_arquivo?: string | null
          changelog?: string | null
          checksum?: string | null
          conteudo?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          numero_versao?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tmpl_bloco_versao_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmpl_bloco_versao_bloco_id_fkey"
            columns: ["bloco_id"]
            isOneToOne: false
            referencedRelation: "tmpl_bloco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmpl_bloco_versao_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmpl_bloco_versao_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tmpl_documento: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          tipo: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          tipo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tmpl_documento_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmpl_documento_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tmpl_documento_bloco: {
        Row: {
          bloco_id: string
          created_at: string
          created_by: string | null
          documento_id: string
          id: string
          obrigatorio: boolean
          observacao: string | null
          ordem: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bloco_id: string
          created_at?: string
          created_by?: string | null
          documento_id: string
          id?: string
          obrigatorio?: boolean
          observacao?: string | null
          ordem: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bloco_id?: string
          created_at?: string
          created_by?: string | null
          documento_id?: string
          id?: string
          obrigatorio?: boolean
          observacao?: string | null
          ordem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tmpl_documento_bloco_bloco_id_fkey"
            columns: ["bloco_id"]
            isOneToOne: false
            referencedRelation: "tmpl_bloco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmpl_documento_bloco_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmpl_documento_bloco_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "tmpl_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmpl_documento_bloco_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tmpl_flag: {
        Row: {
          ativo: boolean
          campo: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          entidade: string | null
          escopo: string
          expressao_sql: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
          updated_by: string | null
          valor: string | null
        }
        Insert: {
          ativo?: boolean
          campo?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          entidade?: string | null
          escopo: string
          expressao_sql?: string | null
          id?: string
          nome: string
          tipo: string
          updated_at?: string
          updated_by?: string | null
          valor?: string | null
        }
        Update: {
          ativo?: boolean
          campo?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          entidade?: string | null
          escopo?: string
          expressao_sql?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tmpl_flag_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tmpl_flag_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_area_access: {
        Row: {
          area: string
          granted_at: string | null
          granted_by: string | null
          id: string
          tool_id: string | null
        }
        Insert: {
          area: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          tool_id?: string | null
        }
        Update: {
          area?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          tool_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_area_access_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_page_access: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          page_permission_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          page_permission_id: string
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          page_permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_page_access_page_permission_id_fkey"
            columns: ["page_permission_id"]
            isOneToOne: false
            referencedRelation: "page_permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      cliente_setor_regiao_atual: {
        Row: {
          id_cliente: string | null
          regiao: string | null
          setor_cliente: string | null
          setor_cliente_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordem_servico_setor_cliente_id_fkey"
            columns: ["setor_cliente_id"]
            isOneToOne: false
            referencedRelation: "setor_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      per_with_contribuinte: {
        Row: {
          atualizado_em: string | null
          atualizado_por: string | null
          contribuinte_ambiente: string | null
          contribuinte_nome: string | null
          criado_em: string | null
          criado_por: string | null
          dt_solicitada: string | null
          exercicio: number | null
          id_contribuinte: string | null
          nr_per: string | null
          nr_proc_ret: string | null
          porcentagem_psa: number | null
          tp_credito: string | null
          tri_exercicio: number | null
          vlr_credito: number | null
          vlr_ressarcido: number | null
        }
        Relationships: [
          {
            foreignKeyName: "per_nr_proc_ret_fkey"
            columns: ["nr_proc_ret"]
            isOneToOne: false
            referencedRelation: "per"
            referencedColumns: ["nr_per"]
          },
          {
            foreignKeyName: "per_nr_proc_ret_fkey"
            columns: ["nr_proc_ret"]
            isOneToOne: false
            referencedRelation: "per_with_contribuinte"
            referencedColumns: ["nr_per"]
          },
        ]
      }
      profiles_safe: {
        Row: {
          first_name: string | null
          id: string | null
          last_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_perform: {
        Args: { p_id: string; p_op: string; p_table: string }
        Returns: Json
      }
      can_view_contribuinte: {
        Args: { _contribuinte_id: string; _uid: string }
        Returns: boolean
      }
      can_view_org_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_ticket: { Args: { _ticket_id: string }; Returns: boolean }
      cliente_id_de_bem: { Args: { _bem_id: string }; Returns: string }
      cliente_id_de_matricula: {
        Args: { _matricula_id: string }
        Returns: string
      }
      cliente_id_de_pessoa: { Args: { _pessoa_id: string }; Returns: string }
      cliente_visivel_para: { Args: { _cliente_id: string }; Returns: boolean }
      criar_bem_com_titular: {
        Args: { bem_data: Json; titular_data: Json }
        Returns: {
          ccir_codigo: string | null
          cliente_id: string
          created_at: string
          created_by: string | null
          denominacao: string
          descricao_outros: string | null
          empresa_destino_pessoa_id: string | null
          id: string
          imposto_anual_exercicio: number | null
          inscricao_municipal: string | null
          motivo_nao_integralizacao: string | null
          observacao: string | null
          participa_estruturacao: boolean
          referencia_dp: string
          status_integralizacao: string | null
          tipo_bem: string
          updated_at: string
          updated_by: string | null
          vlr_benfeitorias: number | null
          vlr_contabil: number | null
          vlr_contabil_ajustado: number | null
          vlr_imposto_anual: number | null
          vlr_itr_iptu: number | null
          vlr_mercado: number | null
        }
        SetofOptions: {
          from: "*"
          to: "bem"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      criar_cliente_com_clusters: {
        Args: { p_cliente: Json; p_cluster_ids: string[] }
        Returns: Json
      }
      criar_matricula_com_titular: {
        Args: { matricula_data: Json; titular_data: Json }
        Returns: {
          area_documento: number
          area_explorada: number | null
          area_real: number | null
          area_unidade: string
          bem_id: string | null
          cartorio_id: string
          confrontacoes_texto: string | null
          created_at: string
          created_by: string | null
          data_matricula: string | null
          descricao_psa_completa: string | null
          folha: string | null
          georref_prejudica_transferencia: boolean | null
          georreferenciado: string | null
          id: string
          imposto_anual_exercicio: number | null
          livro: string | null
          matricula_anterior_id: string | null
          matricula_anterior_texto: string | null
          municipio_imovel: string
          numero: string
          origem_descricao: string | null
          tipo_bem: string | null
          tipo_exploracao_posse: string | null
          uf_imovel: string
          updated_at: string
          updated_by: string | null
          vlr_benfeitorias: number | null
          vlr_contabil: number | null
          vlr_contabil_ajustado: number | null
          vlr_imposto_anual: number | null
          vlr_mercado: number | null
        }
        SetofOptions: {
          from: "*"
          to: "matricula"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dashboard_project_ids_for_cluster: {
        Args: { _cluster_id: string; _include_orphans?: boolean }
        Returns: string[]
      }
      gargalo_cluster_visivel: {
        Args: { _gargalo_id: string }
        Returns: boolean
      }
      get_accessible_dashboards: {
        Args: { _target_page?: string }
        Returns: {
          filter_type: string
          id: string
          name: string
          sop_url: string
          target_page: string
        }[]
      }
      get_cluster_members: {
        Args: { _cluster_id: string }
        Returns: {
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_clusters_do_cliente_atual: {
        Args: never
        Returns: {
          cliente_id: string
          cluster_id: string
          cluster_name: string
        }[]
      }
      get_dashboard_embed_url: {
        Args: { _dashboard_id: string }
        Returns: Json
      }
      get_internal_users: {
        Args: never
        Returns: {
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_ordens_by_client_name: {
        Args: { p_client_id: string }
        Returns: {
          cluster_id: string | null
          created_at: string | null
          data_emissao: string | null
          data_fim: string | null
          data_inicio: string | null
          excluido: boolean
          id: string
          id_cliente: string
          id_produto_segmento: string | null
          id_servico: string | null
          numero_os: string | null
          observacoes: string | null
          regiao: string | null
          setor_cliente: string | null
          setor_cliente_id: string | null
          situacao: string | null
          updated_at: string | null
          valor_projeto: number | null
          valor_reembolso_km: number | null
          valor_reembolso_refeicao: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "ordem_servico"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_profiles_with_email: {
        Args: never
        Returns: {
          email: string
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_profiles_with_min_role: {
        Args: { _minimum_role: Database["public"]["Enums"]["app_role"] }
        Returns: {
          email: string
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_ticket_atendentes: {
        Args: { _ticket_ids: string[] }
        Returns: {
          first_name: string
          last_name: string
          ticket_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_or_higher: {
        Args: {
          _minimum_role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_area_member: {
        Args: { _estrutura_area_id: string; _user_id: string }
        Returns: boolean
      }
      is_membro_digital: { Args: { p_uid: string }; Returns: boolean }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_ticket_assigned_to: {
        Args: { p_ticket_id: string; p_user_id: string }
        Returns: boolean
      }
      is_valid_org_task_reviewer: {
        Args: {
          _assigned_to: string
          _project_id: string
          _reviewer_id: string
        }
        Returns: boolean
      }
      list_profiles_safe: {
        Args: never
        Returns: {
          first_name: string
          id: string
          last_name: string
        }[]
      }
      mapa_uuid: { Args: { slug: string }; Returns: string }
      mark_stuck_procedimentos: {
        Args: { timeout_minutes?: number }
        Returns: number
      }
      melhoria_cluster_visivel: {
        Args: { _melhoria_id: string }
        Returns: boolean
      }
      org_project_cluster_ids: {
        Args: { _project_id: string }
        Returns: string[]
      }
      org_task_visivel: { Args: { p_task_id: string }; Returns: boolean }
      preview_dashboard_embed_url: {
        Args: {
          _cliente_id?: string
          _cluster_ids?: string[]
          _dashboard_id: string
          _mode: string
          _user_id?: string
        }
        Returns: Json
      }
      process_stage_cluster_visivel: {
        Args: { _etapa_id: string }
        Returns: boolean
      }
      psa_mapa_uuid: { Args: { slug: string }; Returns: string }
      resolve_user_cliente_id: { Args: { _uid: string }; Returns: string }
      resolve_user_cluster_ids: { Args: { _uid: string }; Returns: string[] }
      sistema_cluster_visivel: {
        Args: { _sistema_id: string }
        Returns: boolean
      }
      sprint_visivel: { Args: { p_sprint_id: string }; Returns: boolean }
      user_estrutura_area_ids: { Args: { _user_id: string }; Returns: string[] }
      user_estrutura_equipe_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "client"
        | "team_member"
        | "lider"
        | "sublider"
        | "timecliente"
      fiscal_recurrence_type: "daily" | "weekly" | "monthly" | "yearly"
      fiscal_task_category: "task" | "fixed_event"
      fiscal_task_department:
        | "commercial"
        | "financial"
        | "administrative"
        | "operations"
      fiscal_task_priority: "low" | "medium" | "high" | "urgent"
      fiscal_task_status:
        | "backlog"
        | "waiting_client"
        | "todo"
        | "in_progress"
        | "review"
        | "em_ajuste"
        | "done"
      osg_checklist_origem: "padrao" | "manual"
      osg_checklist_status:
        | "pendente"
        | "solicitado"
        | "recebido"
        | "dispensado"
        | "nao_aplicavel"
        | "nao_solicitado"
      osg_doc_area: "osg" | "fiscal"
      osg_doc_categoria:
        | "bens_direitos"
        | "cadastros_fiscais"
        | "declaracao_ir"
        | "agrarios"
        | "pessoais"
        | "societarios"
        | "sucessorios"
        | "outros"
        | "georreferenciamento"
      osg_doc_fonte: "cliente" | "psa" | "arquivar"
      osg_doc_status: "pendente" | "ativo"
      osg_tipo_exploracao:
        | "arrendamento"
        | "parceria"
        | "composse"
        | "comodato"
        | "condominio"
        | "propria"
      scenario_kind: "scale" | "efficiency" | "investment"
      scenario_status:
        | "draft"
        | "analyzing"
        | "approved"
        | "promoted"
        | "archived"
      scenario_type: "baseline" | "variant" | "target"
      scenario_unit_basis: "per_unit" | "per_month" | "per_year"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "backlog" | "to_do" | "in_progress" | "review" | "done"
      work_cluster: "database" | "frontend" | "management"
      work_package_activity_type:
        | "status_change"
        | "assignment"
        | "comment"
        | "file_upload"
        | "relation_change"
        | "field_update"
        | "created"
      work_package_area: "fiscal" | "osg" | "fixos" | "pontuais"
      work_package_priority: "alta" | "normal" | "baixa"
      work_package_relation_type:
        | "filho"
        | "relacionado"
        | "anterior"
        | "sucessor"
        | "pai"
        | "duplicado"
      work_package_stage:
        | "solicitacao_documentos"
        | "analise_documentacao"
        | "elaboracao_wp"
        | "elaboracao_relatorios"
        | "entrega_cliente"
        | "conclusao"
      work_package_status:
        | "novo"
        | "pendente_agendamento"
        | "agendado"
        | "em_progresso"
        | "em_revisao"
        | "concluido"
        | "rejeitado"
      work_package_type: "fase" | "tarefa" | "epico"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "client",
        "team_member",
        "lider",
        "sublider",
        "timecliente",
      ],
      fiscal_recurrence_type: ["daily", "weekly", "monthly", "yearly"],
      fiscal_task_category: ["task", "fixed_event"],
      fiscal_task_department: [
        "commercial",
        "financial",
        "administrative",
        "operations",
      ],
      fiscal_task_priority: ["low", "medium", "high", "urgent"],
      fiscal_task_status: [
        "backlog",
        "waiting_client",
        "todo",
        "in_progress",
        "review",
        "em_ajuste",
        "done",
      ],
      osg_checklist_origem: ["padrao", "manual"],
      osg_checklist_status: [
        "pendente",
        "solicitado",
        "recebido",
        "dispensado",
        "nao_aplicavel",
        "nao_solicitado",
      ],
      osg_doc_area: ["osg", "fiscal"],
      osg_doc_categoria: [
        "bens_direitos",
        "cadastros_fiscais",
        "declaracao_ir",
        "agrarios",
        "pessoais",
        "societarios",
        "sucessorios",
        "outros",
        "georreferenciamento",
      ],
      osg_doc_fonte: ["cliente", "psa", "arquivar"],
      osg_doc_status: ["pendente", "ativo"],
      osg_tipo_exploracao: [
        "arrendamento",
        "parceria",
        "composse",
        "comodato",
        "condominio",
        "propria",
      ],
      scenario_kind: ["scale", "efficiency", "investment"],
      scenario_status: [
        "draft",
        "analyzing",
        "approved",
        "promoted",
        "archived",
      ],
      scenario_type: ["baseline", "variant", "target"],
      scenario_unit_basis: ["per_unit", "per_month", "per_year"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["backlog", "to_do", "in_progress", "review", "done"],
      work_cluster: ["database", "frontend", "management"],
      work_package_activity_type: [
        "status_change",
        "assignment",
        "comment",
        "file_upload",
        "relation_change",
        "field_update",
        "created",
      ],
      work_package_area: ["fiscal", "osg", "fixos", "pontuais"],
      work_package_priority: ["alta", "normal", "baixa"],
      work_package_relation_type: [
        "filho",
        "relacionado",
        "anterior",
        "sucessor",
        "pai",
        "duplicado",
      ],
      work_package_stage: [
        "solicitacao_documentos",
        "analise_documentacao",
        "elaboracao_wp",
        "elaboracao_relatorios",
        "entrega_cliente",
        "conclusao",
      ],
      work_package_status: [
        "novo",
        "pendente_agendamento",
        "agendado",
        "em_progresso",
        "em_revisao",
        "concluido",
        "rejeitado",
      ],
      work_package_type: ["fase", "tarefa", "epico"],
    },
  },
} as const
