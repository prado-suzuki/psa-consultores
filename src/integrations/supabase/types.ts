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
      catalog_clients: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
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
          id?: string
          is_active?: boolean | null
          name?: string
          responsible?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cliente: {
        Row: {
          ativo: boolean | null
          created_at: string
          fixo: string | null
          id: string
          municipio: string | null
          nome: string
          setor_cliente: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          fixo?: string | null
          id?: string
          municipio?: string | null
          nome: string
          setor_cliente?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          fixo?: string | null
          id?: string
          municipio?: string | null
          nome?: string
          setor_cliente?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cliente_dev: {
        Row: {
          ativo: boolean | null
          created_at: string
          fixo: string | null
          id: string
          municipio: string | null
          nome: string
          setor_cliente: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          fixo?: string | null
          id?: string
          municipio?: string | null
          nome: string
          setor_cliente?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          fixo?: string | null
          id?: string
          municipio?: string | null
          nome?: string
          setor_cliente?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
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
          cliente_id: string
          cod_cnae: string | null
          cpf_cnpj: string | null
          created_at: string
          id: string
          inscricao_estadual: string | null
          nome_razao_social: string
          setor: string | null
          simples_nacional: boolean | null
          tipo_pessoa: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          cod_cnae?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          id?: string
          inscricao_estadual?: string | null
          nome_razao_social: string
          setor?: string | null
          simples_nacional?: boolean | null
          tipo_pessoa: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          cod_cnae?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          id?: string
          inscricao_estadual?: string | null
          nome_razao_social?: string
          setor?: string | null
          simples_nacional?: boolean | null
          tipo_pessoa?: string
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
        ]
      }
      contribuinte_dev: {
        Row: {
          cliente_id: string
          cod_cnae: string | null
          cpf_cnpj: string | null
          created_at: string
          id: string
          inscricao_estadual: string | null
          nome_razao_social: string
          setor: string | null
          simples_nacional: boolean | null
          tipo_pessoa: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          cod_cnae?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          id?: string
          inscricao_estadual?: string | null
          nome_razao_social: string
          setor?: string | null
          simples_nacional?: boolean | null
          tipo_pessoa: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          cod_cnae?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          id?: string
          inscricao_estadual?: string | null
          nome_razao_social?: string
          setor?: string | null
          simples_nacional?: boolean | null
          tipo_pessoa?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cliente_dev"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente_dev"
            referencedColumns: ["id"]
          },
        ]
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
      export_profiles: {
        Row: {
          columns: string[]
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          columns: string[]
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          columns?: string[]
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gestao_area_password: {
        Row: {
          id: string
          password_hash: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          password_hash: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          password_hash?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
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
      job_roles: {
        Row: {
          category: string | null
          created_at: string | null
          hourly_rate: number
          id: string
          is_active: boolean | null
          level: string
          monthly_salary_ref: number | null
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          hourly_rate: number
          id?: string
          is_active?: boolean | null
          level: string
          monthly_salary_ref?: number | null
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          hourly_rate?: number
          id?: string
          is_active?: boolean | null
          level?: string
          monthly_salary_ref?: number | null
          name?: string
        }
        Relationships: []
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
      process_improvements: {
        Row: {
          baseline_cost_monthly: number | null
          baseline_people_involved: number | null
          baseline_time_hours: number | null
          baseline_volume: number | null
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
          process_id: string
          project_id: string | null
          roi_fte_annual: number | null
          roi_percentage: number | null
          roi_time_months: number | null
          sprint_deliverable_id: string | null
          time_saved_hours: number | null
          time_saved_percent: number | null
          updated_at: string | null
        }
        Insert: {
          baseline_cost_monthly?: number | null
          baseline_people_involved?: number | null
          baseline_time_hours?: number | null
          baseline_volume?: number | null
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
          process_id: string
          project_id?: string | null
          roi_fte_annual?: number | null
          roi_percentage?: number | null
          roi_time_months?: number | null
          sprint_deliverable_id?: string | null
          time_saved_hours?: number | null
          time_saved_percent?: number | null
          updated_at?: string | null
        }
        Update: {
          baseline_cost_monthly?: number | null
          baseline_people_involved?: number | null
          baseline_time_hours?: number | null
          baseline_volume?: number | null
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
          process_id?: string
          project_id?: string | null
          roi_fte_annual?: number | null
          roi_percentage?: number | null
          roi_time_months?: number | null
          sprint_deliverable_id?: string | null
          time_saved_hours?: number | null
          time_saved_percent?: number | null
          updated_at?: string | null
        }
        Relationships: [
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
      process_stages: {
        Row: {
          automation_level: string | null
          created_at: string | null
          description: string | null
          frequency: string | null
          id: string
          inputs: Json | null
          name: string
          outputs: Json | null
          process_id: string | null
          related_projects: string[] | null
          responsible: string | null
          stage_order: number
          systems: Json | null
          time_current: string | null
          time_target: string | null
          updated_at: string | null
          volume: string | null
        }
        Insert: {
          automation_level?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          inputs?: Json | null
          name: string
          outputs?: Json | null
          process_id?: string | null
          related_projects?: string[] | null
          responsible?: string | null
          stage_order: number
          systems?: Json | null
          time_current?: string | null
          time_target?: string | null
          updated_at?: string | null
          volume?: string | null
        }
        Update: {
          automation_level?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          inputs?: Json | null
          name?: string
          outputs?: Json | null
          process_id?: string | null
          related_projects?: string[] | null
          responsible?: string | null
          stage_order?: number
          systems?: Json | null
          time_current?: string | null
          time_target?: string | null
          updated_at?: string | null
          volume?: string | null
        }
        Relationships: [
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
          code: string | null
          complexity_level: string | null
          cost_monthly: number | null
          created_at: string
          created_by: string | null
          description: string | null
          document_path: string | null
          evaluation_period_days: number | null
          financial_impact: string | null
          formatted_content: string | null
          frequency: string | null
          id: string
          last_ai_sync: string | null
          name: string
          people_involved: number | null
          priority: string | null
          project_id: string | null
          stage: string
          time_spent_frequency: string | null
          time_spent_hours: number | null
          updated_at: string
          volume_executions: number | null
          volume_month: number | null
        }
        Insert: {
          area?: string | null
          automation_potential?: number | null
          client_id?: string | null
          code?: string | null
          complexity_level?: string | null
          cost_monthly?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_path?: string | null
          evaluation_period_days?: number | null
          financial_impact?: string | null
          formatted_content?: string | null
          frequency?: string | null
          id?: string
          last_ai_sync?: string | null
          name: string
          people_involved?: number | null
          priority?: string | null
          project_id?: string | null
          stage?: string
          time_spent_frequency?: string | null
          time_spent_hours?: number | null
          updated_at?: string
          volume_executions?: number | null
          volume_month?: number | null
        }
        Update: {
          area?: string | null
          automation_potential?: number | null
          client_id?: string | null
          code?: string | null
          complexity_level?: string | null
          cost_monthly?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_path?: string | null
          evaluation_period_days?: number | null
          financial_impact?: string | null
          formatted_content?: string | null
          frequency?: string | null
          id?: string
          last_ai_sync?: string | null
          name?: string
          people_involved?: number | null
          priority?: string | null
          project_id?: string | null
          stage?: string
          time_spent_frequency?: string | null
          time_spent_hours?: number | null
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
            foreignKeyName: "processes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          id: string
          last_name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
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
      projects: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
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
      sprint_backlog_items: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_hours: number | null
          id: string
          moved_to_deliverable_id: string | null
          priority: string | null
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
          assigned_to: string | null
          created_at: string | null
          department: string | null
          description: string
          id: string
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_status?: string | null
          assigned_to?: string | null
          created_at?: string | null
          department?: string | null
          description: string
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_status?: string | null
          assigned_to?: string | null
          created_at?: string | null
          department?: string | null
          description?: string
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client" | "team_member"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "backlog" | "to_do" | "in_progress" | "review" | "done"
      work_cluster: "database" | "frontend" | "management"
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
      app_role: ["admin", "client", "team_member"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["backlog", "to_do", "in_progress", "review", "done"],
      work_cluster: ["database", "frontend", "management"],
    },
  },
} as const
