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
      profiles: {
        Row: {
          id: string
          first_name: string
          last_name: string | null
          phone: string | null
          company: string | null
          created_at: string | null
          updated_at: string | null
          email: string | null
          first_access_done: boolean | null
          first_access_at: string | null
          last_sign_in_at: string | null
        }
        Insert: {
          id: string
          first_name: string
          last_name?: string | null
          phone?: string | null
          company?: string | null
          created_at?: string | null
          updated_at?: string | null
          email?: string | null
          first_access_done?: boolean | null
          first_access_at?: string | null
          last_sign_in_at?: string | null
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string | null
          phone?: string | null
          company?: string | null
          created_at?: string | null
          updated_at?: string | null
          email?: string | null
          first_access_done?: boolean | null
          first_access_at?: string | null
          last_sign_in_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: unknown
        }
        Insert: {
          id?: string
          user_id: string
          role?: unknown
        }
        Update: {
          id?: string
          user_id?: string
          role?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tickets: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          status: string | null
          priority: string | null
          created_at: string | null
          updated_at: string | null
          department: string | null
          assigned_to: string | null
          activity_status: string | null
          deadline: string | null
          estrutura_area_id: string | null
          cliente_id: string | null
          cluster_id: string | null
          closed_at: string | null
          assigned_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          status?: string | null
          priority?: string | null
          created_at?: string | null
          updated_at?: string | null
          department?: string | null
          assigned_to?: string | null
          activity_status?: string | null
          deadline?: string | null
          estrutura_area_id?: string | null
          cliente_id?: string | null
          cluster_id?: string | null
          closed_at?: string | null
          assigned_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          status?: string | null
          priority?: string | null
          created_at?: string | null
          updated_at?: string | null
          department?: string | null
          assigned_to?: string | null
          activity_status?: string | null
          deadline?: string | null
          estrutura_area_id?: string | null
          cliente_id?: string | null
          cluster_id?: string | null
          closed_at?: string | null
          assigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tickets_estrutura_area_id_fkey"
            columns: ["estrutura_area_id"]
            isOneToOne: false
            referencedRelation: "estrutura_areas"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tickets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tickets_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          }
        ]
      }
      documents: {
        Row: {
          id: string
          user_id: string
          ticket_id: string | null
          file_name: string
          file_path: string
          file_type: string | null
          uploaded_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          ticket_id?: string | null
          file_name: string
          file_path: string
          file_type?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          ticket_id?: string | null
          file_name?: string
          file_path?: string
          file_type?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documents_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ticket_messages: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          message: string
          is_admin: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          ticket_id: string
          user_id: string
          message: string
          is_admin?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string
          message?: string
          is_admin?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sprints: {
        Row: {
          id: string
          name: string
          goal: string | null
          start_date: string
          end_date: string
          status: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          project_id: string | null
        }
        Insert: {
          id?: string
          name: string
          goal?: string | null
          start_date: string
          end_date: string
          status?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          project_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          goal?: string | null
          start_date?: string
          end_date?: string
          status?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprints_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      daily_standups: {
        Row: {
          id: string
          sprint_id: string | null
          user_id: string
          date: string
          did_yesterday: string | null
          will_do_today: string | null
          blockers: string | null
          created_at: string | null
          project_id: string | null
          process_id: string | null
          blocked_deliverable_id: string | null
          blocker_owner: string | null
        }
        Insert: {
          id?: string
          sprint_id?: string | null
          user_id: string
          date?: string
          did_yesterday?: string | null
          will_do_today?: string | null
          blockers?: string | null
          created_at?: string | null
          project_id?: string | null
          process_id?: string | null
          blocked_deliverable_id?: string | null
          blocker_owner?: string | null
        }
        Update: {
          id?: string
          sprint_id?: string | null
          user_id?: string
          date?: string
          did_yesterday?: string | null
          will_do_today?: string | null
          blockers?: string | null
          created_at?: string | null
          project_id?: string | null
          process_id?: string | null
          blocked_deliverable_id?: string | null
          blocker_owner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_standups_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "daily_standups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "daily_standups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "daily_standups_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "daily_standups_blocked_deliverable_id_fkey"
            columns: ["blocked_deliverable_id"]
            isOneToOne: false
            referencedRelation: "sprint_deliverables"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "daily_standups_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprint_resumo"
            referencedColumns: ["sprint_id"]
          }
        ]
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          status: string | null
          client_name: string | null
          start_date: string | null
          end_date: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          client_id: string | null
          external_client_id: string | null
          leader_id: string | null
          area: string | null
          product_service: string | null
          project_front: string | null
          justification_type: string | null
          justification_detail: string | null
          equipe_id: string | null
          cluster_id: string | null
          projects_per_year: number | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: string | null
          client_name?: string | null
          start_date?: string | null
          end_date?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          client_id?: string | null
          external_client_id?: string | null
          leader_id?: string | null
          area?: string | null
          product_service?: string | null
          project_front?: string | null
          justification_type?: string | null
          justification_detail?: string | null
          equipe_id?: string | null
          cluster_id?: string | null
          projects_per_year?: number | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: string | null
          client_name?: string | null
          start_date?: string | null
          end_date?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          client_id?: string | null
          external_client_id?: string | null
          leader_id?: string | null
          area?: string | null
          product_service?: string | null
          project_front?: string | null
          justification_type?: string | null
          justification_detail?: string | null
          equipe_id?: string | null
          cluster_id?: string | null
          projects_per_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "estrutura_equipes"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "catalog_clients"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "projects_external_client_id_fkey"
            columns: ["external_client_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "projects_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "projects_cluster_id_fk"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          }
        ]
      }
      routines: {
        Row: {
          id: string
          title: string
          description: string | null
          frequency: string
          status: string
          assigned_to: string | null
          estimated_hours: number | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          is_recurring: boolean | null
          start_date: string | null
          due_date: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          frequency?: string
          status?: string
          assigned_to?: string | null
          estimated_hours?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          is_recurring?: boolean | null
          start_date?: string | null
          due_date?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          frequency?: string
          status?: string
          assigned_to?: string | null
          estimated_hours?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          is_recurring?: boolean | null
          start_date?: string | null
          due_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routines_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "routines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      sprint_deliverables: {
        Row: {
          id: string
          sprint_id: string | null
          title: string
          description: string | null
          assigned_to: string | null
          due_date: string
          status: string | null
          completed_at: string | null
          created_at: string | null
          updated_at: string | null
          estimated_hours: number | null
          start_date: string | null
          parent_id: string | null
          task_code: string | null
          project_id: string | null
          process_id: string | null
          actual_hours: number | null
          retrospective_report: string | null
        }
        Insert: {
          id?: string
          sprint_id?: string | null
          title: string
          description?: string | null
          assigned_to?: string | null
          due_date: string
          status?: string | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          estimated_hours?: number | null
          start_date?: string | null
          parent_id?: string | null
          task_code?: string | null
          project_id?: string | null
          process_id?: string | null
          actual_hours?: number | null
          retrospective_report?: string | null
        }
        Update: {
          id?: string
          sprint_id?: string | null
          title?: string
          description?: string | null
          assigned_to?: string | null
          due_date?: string
          status?: string | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          estimated_hours?: number | null
          start_date?: string | null
          parent_id?: string | null
          task_code?: string | null
          project_id?: string | null
          process_id?: string | null
          actual_hours?: number | null
          retrospective_report?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprint_deliverables_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "sprint_deliverables_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "sprint_deliverables"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "sprint_deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "sprint_deliverables_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "sprint_deliverables_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "sprint_deliverables_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprint_resumo"
            referencedColumns: ["sprint_id"]
          }
        ]
      }
      sprint_events: {
        Row: {
          id: string
          sprint_id: string | null
          title: string
          description: string | null
          event_date: string
          start_time: string | null
          end_time: string | null
          event_type: string | null
          participants: string[] | null
          location: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          sprint_id?: string | null
          title: string
          description?: string | null
          event_date: string
          start_time?: string | null
          end_time?: string | null
          event_type?: string | null
          participants?: string[] | null
          location?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          sprint_id?: string | null
          title?: string
          description?: string | null
          event_date?: string
          start_time?: string | null
          end_time?: string | null
          event_type?: string | null
          participants?: string[] | null
          location?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprint_events_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "sprint_events_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprint_resumo"
            referencedColumns: ["sprint_id"]
          }
        ]
      }
      sprint_metrics: {
        Row: {
          id: string
          sprint_id: string | null
          name: string
          target_value: number | null
          current_value: number | null
          unit: string | null
          category: string | null
          updated_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          sprint_id?: string | null
          name: string
          target_value?: number | null
          current_value?: number | null
          unit?: string | null
          category?: string | null
          updated_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          sprint_id?: string | null
          name?: string
          target_value?: number | null
          current_value?: number | null
          unit?: string | null
          category?: string | null
          updated_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprint_metrics_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "sprint_metrics_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprint_resumo"
            referencedColumns: ["sprint_id"]
          }
        ]
      }
      processes: {
        Row: {
          id: string
          name: string
          description: string | null
          area: string | null
          stage: string
          priority: string | null
          frequency: string | null
          volume_month: number | null
          financial_impact: string | null
          project_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          code: string | null
          client_id: string | null
          formatted_content: string | null
          document_path: string | null
          last_ai_sync: string | null
          time_spent_hours: number | null
          time_spent_frequency: string | null
          cost_monthly: number | null
          volume_executions: number | null
          people_involved: number | null
          complexity_level: string | null
          automation_potential: number | null
          evaluation_period_days: number | null
          sop_link: string | null
          sop_document_path: string | null
          last_roi_percentage: number | null
          last_cost_saved_monthly: number | null
          last_time_saved_hours: number | null
          last_improvement_date: string | null
          sop_before_link: string | null
          sop_before_document_path: string | null
          sop_before_content: string | null
          equipe_id: string | null
          cluster_id: string | null
          order_index: number | null
          deliverable: string | null
          evaluation_status: string | null
          training_hours: number | null
          mapped_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          area?: string | null
          stage?: string
          priority?: string | null
          frequency?: string | null
          volume_month?: number | null
          financial_impact?: string | null
          project_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          code?: string | null
          client_id?: string | null
          formatted_content?: string | null
          document_path?: string | null
          last_ai_sync?: string | null
          time_spent_hours?: number | null
          time_spent_frequency?: string | null
          cost_monthly?: number | null
          volume_executions?: number | null
          people_involved?: number | null
          complexity_level?: string | null
          automation_potential?: number | null
          evaluation_period_days?: number | null
          sop_link?: string | null
          sop_document_path?: string | null
          last_roi_percentage?: number | null
          last_cost_saved_monthly?: number | null
          last_time_saved_hours?: number | null
          last_improvement_date?: string | null
          sop_before_link?: string | null
          sop_before_document_path?: string | null
          sop_before_content?: string | null
          equipe_id?: string | null
          cluster_id?: string | null
          order_index?: number | null
          deliverable?: string | null
          evaluation_status?: string | null
          training_hours?: number | null
          mapped_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          area?: string | null
          stage?: string
          priority?: string | null
          frequency?: string | null
          volume_month?: number | null
          financial_impact?: string | null
          project_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          code?: string | null
          client_id?: string | null
          formatted_content?: string | null
          document_path?: string | null
          last_ai_sync?: string | null
          time_spent_hours?: number | null
          time_spent_frequency?: string | null
          cost_monthly?: number | null
          volume_executions?: number | null
          people_involved?: number | null
          complexity_level?: string | null
          automation_potential?: number | null
          evaluation_period_days?: number | null
          sop_link?: string | null
          sop_document_path?: string | null
          last_roi_percentage?: number | null
          last_cost_saved_monthly?: number | null
          last_time_saved_hours?: number | null
          last_improvement_date?: string | null
          sop_before_link?: string | null
          sop_before_document_path?: string | null
          sop_before_content?: string | null
          equipe_id?: string | null
          cluster_id?: string | null
          order_index?: number | null
          deliverable?: string | null
          evaluation_status?: string | null
          training_hours?: number | null
          mapped_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processes_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "estrutura_equipes"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "processes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "processes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "catalog_clients"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "processes_cluster_id_fk"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          }
        ]
      }
      process_stages: {
        Row: {
          id: string
          process_id: string | null
          stage_order: number
          name: string
          description: string | null
          responsible: string | null
          time_current: string | null
          time_target: string | null
          frequency: string | null
          volume: string | null
          automation_level: string | null
          inputs: Json | null
          outputs: Json | null
          systems: Json | null
          related_projects: string[] | null
          created_at: string | null
          updated_at: string | null
          job_role_id: string | null
          scenario: string
          stage_as_is_id: string | null
          execution: string | null
          lead_time_days: number | null
          volume_per_process: number | null
          error_rate: number | null
          rework_rate: number | null
          error_cost: number | null
          error_volume: number | null
        }
        Insert: {
          id?: string
          process_id?: string | null
          stage_order: number
          name: string
          description?: string | null
          responsible?: string | null
          time_current?: string | null
          time_target?: string | null
          frequency?: string | null
          volume?: string | null
          automation_level?: string | null
          inputs?: Json | null
          outputs?: Json | null
          systems?: Json | null
          related_projects?: string[] | null
          created_at?: string | null
          updated_at?: string | null
          job_role_id?: string | null
          scenario?: string
          stage_as_is_id?: string | null
          execution?: string | null
          lead_time_days?: number | null
          volume_per_process?: number | null
          error_rate?: number | null
          rework_rate?: number | null
          error_cost?: number | null
          error_volume?: number | null
        }
        Update: {
          id?: string
          process_id?: string | null
          stage_order?: number
          name?: string
          description?: string | null
          responsible?: string | null
          time_current?: string | null
          time_target?: string | null
          frequency?: string | null
          volume?: string | null
          automation_level?: string | null
          inputs?: Json | null
          outputs?: Json | null
          systems?: Json | null
          related_projects?: string[] | null
          created_at?: string | null
          updated_at?: string | null
          job_role_id?: string | null
          scenario?: string
          stage_as_is_id?: string | null
          execution?: string | null
          lead_time_days?: number | null
          volume_per_process?: number | null
          error_rate?: number | null
          rework_rate?: number | null
          error_cost?: number | null
          error_volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "process_stages_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "process_stages_job_role_id_fkey"
            columns: ["job_role_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          }
        ]
      }
      project_processes: {
        Row: {
          id: string
          project_id: string | null
          process_id: string | null
          impact_type: string | null
          impacted_stages: string[] | null
          created_at: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          process_id?: string | null
          impact_type?: string | null
          impacted_stages?: string[] | null
          created_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          process_id?: string | null
          impact_type?: string | null
          impacted_stages?: string[] | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_processes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "project_processes_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          }
        ]
      }
      ticket_attachments: {
        Row: {
          id: string
          ticket_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string | null
          uploaded_by: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type?: string | null
          uploaded_by?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string | null
          uploaded_by?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      deliverable_attachments: {
        Row: {
          id: string
          deliverable_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string | null
          uploaded_by: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          deliverable_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type?: string | null
          uploaded_by?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          deliverable_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string | null
          uploaded_by?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_attachments_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "sprint_deliverables"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "deliverable_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      project_documents: {
        Row: {
          id: string
          title: string
          description: string | null
          file_name: string
          file_path: string
          file_type: string | null
          file_size: number | null
          category: string | null
          sprint_id: string | null
          uploaded_by: string | null
          created_at: string | null
          updated_at: string | null
          process_id: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          file_name: string
          file_path: string
          file_type?: string | null
          file_size?: number | null
          category?: string | null
          sprint_id?: string | null
          uploaded_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          process_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_type?: string | null
          file_size?: number | null
          category?: string | null
          sprint_id?: string | null
          uploaded_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          process_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "project_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "project_documents_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "project_documents_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprint_resumo"
            referencedColumns: ["sprint_id"]
          }
        ]
      }
      demand_items: {
        Row: {
          id: string
          demand_id: string
          title: string
          description: string | null
          due_date: string
          status: string | null
          assigned_to: string | null
          estimated_hours: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          demand_id: string
          title: string
          description?: string | null
          due_date: string
          status?: string | null
          assigned_to?: string | null
          estimated_hours?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          demand_id?: string
          title?: string
          description?: string | null
          due_date?: string
          status?: string | null
          assigned_to?: string | null
          estimated_hours?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demand_items_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          }
        ]
      }
      sprint_backlog_items: {
        Row: {
          id: string
          sprint_id: string | null
          title: string
          description: string | null
          priority: string | null
          estimated_hours: number | null
          suggested_by: string | null
          status: string | null
          moved_to_deliverable_id: string | null
          created_at: string | null
          updated_at: string | null
          project_id: string | null
          cluster_id: string | null
        }
        Insert: {
          id?: string
          sprint_id?: string | null
          title: string
          description?: string | null
          priority?: string | null
          estimated_hours?: number | null
          suggested_by?: string | null
          status?: string | null
          moved_to_deliverable_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          project_id?: string | null
          cluster_id?: string | null
        }
        Update: {
          id?: string
          sprint_id?: string | null
          title?: string
          description?: string | null
          priority?: string | null
          estimated_hours?: number | null
          suggested_by?: string | null
          status?: string | null
          moved_to_deliverable_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          project_id?: string | null
          cluster_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprint_backlog_items_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "sprint_backlog_items_moved_to_deliverable_id_fkey"
            columns: ["moved_to_deliverable_id"]
            isOneToOne: false
            referencedRelation: "sprint_deliverables"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "sprint_backlog_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "sprint_backlog_items_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "sprint_backlog_items_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "sprint_backlog_items_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprint_resumo"
            referencedColumns: ["sprint_id"]
          }
        ]
      }
      tools: {
        Row: {
          id: string
          name: string
          description: string | null
          status: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [

        ]
      }
      tool_area_access: {
        Row: {
          id: string
          tool_id: string | null
          area: string
          granted_by: string | null
          granted_at: string | null
        }
        Insert: {
          id?: string
          tool_id?: string | null
          area: string
          granted_by?: string | null
          granted_at?: string | null
        }
        Update: {
          id?: string
          tool_id?: string | null
          area?: string
          granted_by?: string | null
          granted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_area_access_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          }
        ]
      }
      cliente: {
        Row: {
          id: string
          nome: string
          fixo: string | null
          telefone: string | null
          created_at: string
          updated_at: string
          municipio: string | null
          uf: string | null
          ativo: boolean | null
          categoria: string | null
          excluido: boolean
          ambiente: string
          observacoes: string | null
        }
        Insert: {
          id?: string
          nome: string
          fixo?: string | null
          telefone?: string | null
          created_at?: string
          updated_at?: string
          municipio?: string | null
          uf?: string | null
          ativo?: boolean | null
          categoria?: string | null
          excluido?: boolean
          ambiente?: string
          observacoes?: string | null
        }
        Update: {
          id?: string
          nome?: string
          fixo?: string | null
          telefone?: string | null
          created_at?: string
          updated_at?: string
          municipio?: string | null
          uf?: string | null
          ativo?: boolean | null
          categoria?: string | null
          excluido?: boolean
          ambiente?: string
          observacoes?: string | null
        }
        Relationships: [

        ]
      }
      contribuinte: {
        Row: {
          id: string
          cliente_id: string
          tipo_pessoa: string
          cpf_cnpj: string | null
          nome_razao_social: string
          inscricao_estadual: string | null
          cod_cnae: string | null
          setor: string | null
          simples_nacional: boolean | null
          created_at: string
          updated_at: string
          telefone: string | null
          nome_fantasia: string | null
          situacao_inscricao_estadual: string | null
          cep: string | null
          logradouro: string | null
          numero: string | null
          complemento: string | null
          bairro: string | null
          municipio: string | null
          uf: string | null
          contribuinte_faturamento: boolean | null
          excluido: boolean
          ambiente: string
          setor_cliente_id: string | null
        }
        Insert: {
          id?: string
          cliente_id: string
          tipo_pessoa: string
          cpf_cnpj?: string | null
          nome_razao_social: string
          inscricao_estadual?: string | null
          cod_cnae?: string | null
          setor?: string | null
          simples_nacional?: boolean | null
          created_at?: string
          updated_at?: string
          telefone?: string | null
          nome_fantasia?: string | null
          situacao_inscricao_estadual?: string | null
          cep?: string | null
          logradouro?: string | null
          numero?: string | null
          complemento?: string | null
          bairro?: string | null
          municipio?: string | null
          uf?: string | null
          contribuinte_faturamento?: boolean | null
          excluido?: boolean
          ambiente?: string
          setor_cliente_id?: string | null
        }
        Update: {
          id?: string
          cliente_id?: string
          tipo_pessoa?: string
          cpf_cnpj?: string | null
          nome_razao_social?: string
          inscricao_estadual?: string | null
          cod_cnae?: string | null
          setor?: string | null
          simples_nacional?: boolean | null
          created_at?: string
          updated_at?: string
          telefone?: string | null
          nome_fantasia?: string | null
          situacao_inscricao_estadual?: string | null
          cep?: string | null
          logradouro?: string | null
          numero?: string | null
          complemento?: string | null
          bairro?: string | null
          municipio?: string | null
          uf?: string | null
          contribuinte_faturamento?: boolean | null
          excluido?: boolean
          ambiente?: string
          setor_cliente_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contribuinte_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "contribuinte_setor_cliente_id_fkey"
            columns: ["setor_cliente_id"]
            isOneToOne: false
            referencedRelation: "setor_cliente"
            referencedColumns: ["id"]
          }
        ]
      }
      export_profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          columns: string[]
          is_default: boolean | null
          created_at: string | null
          updated_at: string | null
          tool_type: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          columns: string[]
          is_default?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          tool_type?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          columns?: string[]
          is_default?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          tool_type?: string
        }
        Relationships: [

        ]
      }
      novidades: {
        Row: {
          id: string
          categoria: string
          titulo: string
          descricao: string
          data_publicacao: string | null
          itens: string[] | null
          imagem_url: string | null
          botao_texto: string | null
          botao_url: string | null
          ativo: boolean | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          conteudo_completo: string | null
          imagem_lateral_url: string | null
          imagem_lateral_posicao: string | null
          texto_original: string | null
        }
        Insert: {
          id?: string
          categoria: string
          titulo: string
          descricao: string
          data_publicacao?: string | null
          itens?: string[] | null
          imagem_url?: string | null
          botao_texto?: string | null
          botao_url?: string | null
          ativo?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          conteudo_completo?: string | null
          imagem_lateral_url?: string | null
          imagem_lateral_posicao?: string | null
          texto_original?: string | null
        }
        Update: {
          id?: string
          categoria?: string
          titulo?: string
          descricao?: string
          data_publicacao?: string | null
          itens?: string[] | null
          imagem_url?: string | null
          botao_texto?: string | null
          botao_url?: string | null
          ativo?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          conteudo_completo?: string | null
          imagem_lateral_url?: string | null
          imagem_lateral_posicao?: string | null
          texto_original?: string | null
        }
        Relationships: [

        ]
      }
      page_permissions: {
        Row: {
          id: string
          page_path: string
          page_name: string
          page_description: string | null
          category: string
          is_active: boolean | null
          requires_admin: boolean | null
          requires_team_member: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          page_path: string
          page_name: string
          page_description?: string | null
          category?: string
          is_active?: boolean | null
          requires_admin?: boolean | null
          requires_team_member?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          page_path?: string
          page_name?: string
          page_description?: string | null
          category?: string
          is_active?: boolean | null
          requires_admin?: boolean | null
          requires_team_member?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [

        ]
      }
      user_page_access: {
        Row: {
          id: string
          user_id: string
          page_permission_id: string
          granted_by: string | null
          granted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          page_permission_id: string
          granted_by?: string | null
          granted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          page_permission_id?: string
          granted_by?: string | null
          granted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_page_access_page_permission_id_fkey"
            columns: ["page_permission_id"]
            isOneToOne: false
            referencedRelation: "page_permissions"
            referencedColumns: ["id"]
          }
        ]
      }
      access_change_log: {
        Row: {
          id: string
          user_id: string
          changed_by: string
          action: string
          old_value: string | null
          new_value: string | null
          details: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          changed_by: string
          action: string
          old_value?: string | null
          new_value?: string | null
          details?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          changed_by?: string
          action?: string
          old_value?: string | null
          new_value?: string | null
          details?: Json | null
          created_at?: string | null
        }
        Relationships: [

        ]
      }
      contatos: {
        Row: {
          id: string
          nome_completo: string
          email: string
          telefone: string | null
          empresa: string | null
          mensagem: string
          servico_interesse: string | null
          status: string | null
          notas_internas: string | null
          atendido_por: string | null
          created_at: string | null
          updated_at: string | null
          porte_empresa: string | null
          como_conheceu: string | null
        }
        Insert: {
          id?: string
          nome_completo: string
          email: string
          telefone?: string | null
          empresa?: string | null
          mensagem: string
          servico_interesse?: string | null
          status?: string | null
          notas_internas?: string | null
          atendido_por?: string | null
          created_at?: string | null
          updated_at?: string | null
          porte_empresa?: string | null
          como_conheceu?: string | null
        }
        Update: {
          id?: string
          nome_completo?: string
          email?: string
          telefone?: string | null
          empresa?: string | null
          mensagem?: string
          servico_interesse?: string | null
          status?: string | null
          notas_internas?: string | null
          atendido_por?: string | null
          created_at?: string | null
          updated_at?: string | null
          porte_empresa?: string | null
          como_conheceu?: string | null
        }
        Relationships: [

        ]
      }
      difal_sessao: {
        Row: {
          id: string
          usuario_id: string
          cliente_id: string
          cliente_nome: string | null
          periodo: string
          uf: string
          request_original: Json
          status: string
          criado_em: string | null
          sincronizado_em: string | null
        }
        Insert: {
          id?: string
          usuario_id: string
          cliente_id: string
          cliente_nome?: string | null
          periodo: string
          uf: string
          request_original: Json
          status?: string
          criado_em?: string | null
          sincronizado_em?: string | null
        }
        Update: {
          id?: string
          usuario_id?: string
          cliente_id?: string
          cliente_nome?: string | null
          periodo?: string
          uf?: string
          request_original?: Json
          status?: string
          criado_em?: string | null
          sincronizado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "difal_sessao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
        ]
      }
      difal_decisao: {
        Row: {
          id: string
          sessao_id: string
          cod_ncm: string
          decisao: string
          id_icms_st_bq: string | null
          decidido_em: string | null
        }
        Insert: {
          id?: string
          sessao_id: string
          cod_ncm: string
          decisao: string
          id_icms_st_bq?: string | null
          decidido_em?: string | null
        }
        Update: {
          id?: string
          sessao_id?: string
          cod_ncm?: string
          decisao?: string
          id_icms_st_bq?: string | null
          decidido_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "difal_decisao_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "difal_sessao"
            referencedColumns: ["id"]
          }
        ]
      }
      catalog_clients: {
        Row: {
          id: string
          name: string
          responsible: string | null
          description: string | null
          color: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
          estrutura_area_id: string | null
        }
        Insert: {
          id?: string
          name: string
          responsible?: string | null
          description?: string | null
          color?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          estrutura_area_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          responsible?: string | null
          description?: string | null
          color?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          estrutura_area_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_clients_estrutura_area_id_fkey"
            columns: ["estrutura_area_id"]
            isOneToOne: false
            referencedRelation: "estrutura_areas"
            referencedColumns: ["id"]
          }
        ]
      }
      job_roles: {
        Row: {
          id: string
          name: string
          level: string
          category: string | null
          hourly_rate: number
          monthly_salary_ref: number | null
          is_active: boolean | null
          created_at: string | null
          cluster_id: string | null
          type: string | null
        }
        Insert: {
          id?: string
          name: string
          level: string
          category?: string | null
          hourly_rate: number
          monthly_salary_ref?: number | null
          is_active?: boolean | null
          created_at?: string | null
          cluster_id?: string | null
          type?: string | null
        }
        Update: {
          id?: string
          name?: string
          level?: string
          category?: string | null
          hourly_rate?: number
          monthly_salary_ref?: number | null
          is_active?: boolean | null
          created_at?: string | null
          cluster_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_roles_cluster_id_fk"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          }
        ]
      }
      process_improvements: {
        Row: {
          id: string
          process_id: string
          sprint_deliverable_id: string | null
          project_id: string | null
          baseline_time_hours: number | null
          baseline_cost_monthly: number | null
          baseline_volume: number | null
          baseline_people_involved: number | null
          improved_time_hours: number | null
          improved_cost_monthly: number | null
          improved_volume: number | null
          improved_people_involved: number | null
          evaluation_period_days: number | null
          evaluation_start_date: string | null
          evaluation_end_date: string | null
          evaluation_status: string | null
          time_saved_hours: number | null
          cost_saved_monthly: number | null
          time_saved_percent: number | null
          cost_saved_percent: number | null
          implementation_hours: number | null
          implementation_cost: number | null
          roi_time_months: number | null
          roi_fte_annual: number | null
          roi_percentage: number | null
          improvement_description: string | null
          evaluated_by: string | null
          created_at: string | null
          updated_at: string | null
          system_savings_monthly: number | null
          build_vs_buy_savings: number | null
          other_savings_monthly: number | null
          cluster_id: string | null
          improvement_status: string | null
          training_hours: number | null
          one_time_external_cost: number | null
        }
        Insert: {
          id?: string
          process_id: string
          sprint_deliverable_id?: string | null
          project_id?: string | null
          baseline_time_hours?: number | null
          baseline_cost_monthly?: number | null
          baseline_volume?: number | null
          baseline_people_involved?: number | null
          improved_time_hours?: number | null
          improved_cost_monthly?: number | null
          improved_volume?: number | null
          improved_people_involved?: number | null
          evaluation_period_days?: number | null
          evaluation_start_date?: string | null
          evaluation_end_date?: string | null
          evaluation_status?: string | null
          time_saved_hours?: number | null
          cost_saved_monthly?: number | null
          time_saved_percent?: number | null
          cost_saved_percent?: number | null
          implementation_hours?: number | null
          implementation_cost?: number | null
          roi_time_months?: number | null
          roi_fte_annual?: number | null
          roi_percentage?: number | null
          improvement_description?: string | null
          evaluated_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          system_savings_monthly?: number | null
          build_vs_buy_savings?: number | null
          other_savings_monthly?: number | null
          cluster_id?: string | null
          improvement_status?: string | null
          training_hours?: number | null
          one_time_external_cost?: number | null
        }
        Update: {
          id?: string
          process_id?: string
          sprint_deliverable_id?: string | null
          project_id?: string | null
          baseline_time_hours?: number | null
          baseline_cost_monthly?: number | null
          baseline_volume?: number | null
          baseline_people_involved?: number | null
          improved_time_hours?: number | null
          improved_cost_monthly?: number | null
          improved_volume?: number | null
          improved_people_involved?: number | null
          evaluation_period_days?: number | null
          evaluation_start_date?: string | null
          evaluation_end_date?: string | null
          evaluation_status?: string | null
          time_saved_hours?: number | null
          cost_saved_monthly?: number | null
          time_saved_percent?: number | null
          cost_saved_percent?: number | null
          implementation_hours?: number | null
          implementation_cost?: number | null
          roi_time_months?: number | null
          roi_fte_annual?: number | null
          roi_percentage?: number | null
          improvement_description?: string | null
          evaluated_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          system_savings_monthly?: number | null
          build_vs_buy_savings?: number | null
          other_savings_monthly?: number | null
          cluster_id?: string | null
          improvement_status?: string | null
          training_hours?: number | null
          one_time_external_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "process_improvements_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "process_improvements_sprint_deliverable_id_fkey"
            columns: ["sprint_deliverable_id"]
            isOneToOne: false
            referencedRelation: "sprint_deliverables"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "process_improvements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "process_improvements_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "process_improvements_cluster_id_fk"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          }
        ]
      }
      improvement_team_members: {
        Row: {
          id: string
          improvement_id: string
          profile_id: string | null
          job_role_id: string | null
          hours_allocated: number | null
          is_baseline: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          improvement_id: string
          profile_id?: string | null
          job_role_id?: string | null
          hours_allocated?: number | null
          is_baseline?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          improvement_id?: string
          profile_id?: string | null
          job_role_id?: string | null
          hours_allocated?: number | null
          is_baseline?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "improvement_team_members_improvement_id_fkey"
            columns: ["improvement_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "improvement_team_members_job_role_id_fkey"
            columns: ["job_role_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "improvement_team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      client_visible_projects: {
        Row: {
          id: string
          user_id: string
          project_id: string
          visible_since: string | null
          notes: string | null
          created_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          visible_since?: string | null
          notes?: string | null
          created_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          visible_since?: string | null
          notes?: string | null
          created_at?: string | null
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_visible_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "client_visible_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "client_visible_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      client_documents: {
        Row: {
          id: string
          user_id: string
          document_type: string
          name: string
          description: string | null
          url: string | null
          file_path: string | null
          file_name: string | null
          file_size: number | null
          created_at: string | null
          created_by: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          document_type: string
          name: string
          description?: string | null
          url?: string | null
          file_path?: string | null
          file_name?: string | null
          file_size?: number | null
          created_at?: string | null
          created_by?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          document_type?: string
          name?: string
          description?: string | null
          url?: string | null
          file_path?: string | null
          file_name?: string | null
          file_size?: number | null
          created_at?: string | null
          created_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "client_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      per: {
        Row: {
          nr_per: string
          exercicio: number
          tri_exercicio: number
          dt_solicitada: string
          tp_credito: string
          vlr_credito: number
          nr_proc_ret: string | null
          criado_em: string | null
          criado_por: string | null
          id_contribuinte: string
          atualizado_em: string | null
          atualizado_por: string | null
          vlr_ressarcido: number | null
          porcentagem_psa: number | null
          vlr_ressarcido_original: number | null
        }
        Insert: {
          nr_per: string
          exercicio: number
          tri_exercicio: number
          dt_solicitada: string
          tp_credito: string
          vlr_credito: number
          nr_proc_ret?: string | null
          criado_em?: string | null
          criado_por?: string | null
          id_contribuinte: string
          atualizado_em?: string | null
          atualizado_por?: string | null
          vlr_ressarcido?: number | null
          porcentagem_psa?: number | null
          vlr_ressarcido_original?: number | null
        }
        Update: {
          nr_per?: string
          exercicio?: number
          tri_exercicio?: number
          dt_solicitada?: string
          tp_credito?: string
          vlr_credito?: number
          nr_proc_ret?: string | null
          criado_em?: string | null
          criado_por?: string | null
          id_contribuinte?: string
          atualizado_em?: string | null
          atualizado_por?: string | null
          vlr_ressarcido?: number | null
          porcentagem_psa?: number | null
          vlr_ressarcido_original?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "per_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "per_nr_proc_ret_fkey"
            columns: ["nr_proc_ret"]
            isOneToOne: false
            referencedRelation: "per"
            referencedColumns: ["nr_per"]
          }
          {
            foreignKeyName: "per_nr_proc_ret_fkey"
            columns: ["nr_proc_ret"]
            isOneToOne: false
            referencedRelation: "per_with_contribuinte"
            referencedColumns: ["nr_per"]
          }
        ]
      }
      per_situacao: {
        Row: {
          id: string
          nr_proc_per: string
          situacao: string
          dt_pagamento: string | null
          criado_em: string | null
          criado_por: string | null
        }
        Insert: {
          id?: string
          nr_proc_per: string
          situacao: string
          dt_pagamento?: string | null
          criado_em?: string | null
          criado_por?: string | null
        }
        Update: {
          id?: string
          nr_proc_per?: string
          situacao?: string
          dt_pagamento?: string | null
          criado_em?: string | null
          criado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "per_situacao_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "per_situacao_nr_proc_per_fkey"
            columns: ["nr_proc_per"]
            isOneToOne: false
            referencedRelation: "per"
            referencedColumns: ["nr_per"]
          }
          {
            foreignKeyName: "per_situacao_nr_proc_per_fkey"
            columns: ["nr_proc_per"]
            isOneToOne: false
            referencedRelation: "per_with_contribuinte"
            referencedColumns: ["nr_per"]
          }
        ]
      }
      dcomp: {
        Row: {
          nr_documento: string
          nr_per_orig: string
          mes_ano_exercicio: string
          dt_envio: string
          vlr_compensado: number
          criado_em: string | null
          criado_por: string | null
          atualizado_em: string | null
          atualizado_por: string | null
          nr_dcomp_ret: string | null
        }
        Insert: {
          nr_documento: string
          nr_per_orig: string
          mes_ano_exercicio: string
          dt_envio: string
          vlr_compensado: number
          criado_em?: string | null
          criado_por?: string | null
          atualizado_em?: string | null
          atualizado_por?: string | null
          nr_dcomp_ret?: string | null
        }
        Update: {
          nr_documento?: string
          nr_per_orig?: string
          mes_ano_exercicio?: string
          dt_envio?: string
          vlr_compensado?: number
          criado_em?: string | null
          criado_por?: string | null
          atualizado_em?: string | null
          atualizado_por?: string | null
          nr_dcomp_ret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dcomp_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "dcomp_nr_per_orig_fkey"
            columns: ["nr_per_orig"]
            isOneToOne: false
            referencedRelation: "per"
            referencedColumns: ["nr_per"]
          }
          {
            foreignKeyName: "dcomp_nr_dcomp_ret_fkey"
            columns: ["nr_dcomp_ret"]
            isOneToOne: false
            referencedRelation: "dcomp"
            referencedColumns: ["nr_documento"]
          }
          {
            foreignKeyName: "dcomp_nr_per_orig_fkey"
            columns: ["nr_per_orig"]
            isOneToOne: false
            referencedRelation: "per_with_contribuinte"
            referencedColumns: ["nr_per"]
          }
        ]
      }
      org_tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          status: unknown
          priority: unknown
          assigned_to: string | null
          assigned_to_name: string | null
          created_by: string | null
          due_date: string | null
          due_time: string | null
          is_recurring: boolean | null
          recurrence_type: unknown | null
          category: unknown
          tags: string[] | null
          department: unknown | null
          parent_task_id: string | null
          created_at: string | null
          updated_at: string | null
          project_id: string
          client_id: string | null
          servico_id: string | null
          start_date: string | null
          contribuinte_id: string | null
          estimated_hours: number | null
          actual_hours: number | null
          reviewer_id: string | null
          tarefa_padrao_id: string | null
          ticket_id: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: unknown
          priority?: unknown
          assigned_to?: string | null
          assigned_to_name?: string | null
          created_by?: string | null
          due_date?: string | null
          due_time?: string | null
          is_recurring?: boolean | null
          recurrence_type?: unknown | null
          category?: unknown
          tags?: string[] | null
          department?: unknown | null
          parent_task_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          project_id: string
          client_id?: string | null
          servico_id?: string | null
          start_date?: string | null
          contribuinte_id?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          reviewer_id?: string | null
          tarefa_padrao_id?: string | null
          ticket_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: unknown
          priority?: unknown
          assigned_to?: string | null
          assigned_to_name?: string | null
          created_by?: string | null
          due_date?: string | null
          due_time?: string | null
          is_recurring?: boolean | null
          recurrence_type?: unknown | null
          category?: unknown
          tags?: string[] | null
          department?: unknown | null
          parent_task_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          project_id?: string
          client_id?: string | null
          servico_id?: string | null
          start_date?: string | null
          contribuinte_id?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          reviewer_id?: string | null
          tarefa_padrao_id?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "org_tasks"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "org_projects"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_tasks_categoria_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_prestados"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_tasks_contribuinte_id_fkey"
            columns: ["contribuinte_id"]
            isOneToOne: false
            referencedRelation: "contribuinte"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_tasks_tarefa_padrao_id_fkey"
            columns: ["tarefa_padrao_id"]
            isOneToOne: false
            referencedRelation: "produto_tarefa_padrao"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_tasks_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_tasks_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      org_task_comments: {
        Row: {
          id: string
          task_id: string
          user_id: string | null
          user_name: string | null
          comment: string
          is_system: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          task_id: string
          user_id?: string | null
          user_name?: string | null
          comment: string
          is_system?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string | null
          user_name?: string | null
          comment?: string
          is_system?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "org_tasks"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      improvement_savings_details: {
        Row: {
          id: string
          improvement_id: string
          savings_type: string
          description: string
          cost_before: number | null
          cost_after: number | null
          savings_value: number
          is_monthly: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          improvement_id: string
          savings_type: string
          description: string
          cost_before?: number | null
          cost_after?: number | null
          savings_value?: number
          is_monthly?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          improvement_id?: string
          savings_type?: string
          description?: string
          cost_before?: number | null
          cost_after?: number | null
          savings_value?: number
          is_monthly?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "improvement_savings_details_improvement_id_fkey"
            columns: ["improvement_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          }
        ]
      }
      org_projects: {
        Row: {
          id: string
          name: string
          description: string | null
          status: string | null
          external_client_id: string | null
          responsible_id: string | null
          leader_id: string | null
          objective: string | null
          start_date: string | null
          end_date: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          contribuinte_id: string | null
          estrutura_area_id: string | null
          ordem_servico_id: string | null
          servico_id: string | null
          equipe_id: string | null
          is_multidisciplinar: boolean
          produto_segmento_id: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: string | null
          external_client_id?: string | null
          responsible_id?: string | null
          leader_id?: string | null
          objective?: string | null
          start_date?: string | null
          end_date?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          contribuinte_id?: string | null
          estrutura_area_id?: string | null
          ordem_servico_id?: string | null
          servico_id?: string | null
          equipe_id?: string | null
          is_multidisciplinar?: boolean
          produto_segmento_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: string | null
          external_client_id?: string | null
          responsible_id?: string | null
          leader_id?: string | null
          objective?: string | null
          start_date?: string | null
          end_date?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          contribuinte_id?: string | null
          estrutura_area_id?: string | null
          ordem_servico_id?: string | null
          servico_id?: string | null
          equipe_id?: string | null
          is_multidisciplinar?: boolean
          produto_segmento_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_projects_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "estrutura_equipes"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_projects_estrutura_area_id_fkey"
            columns: ["estrutura_area_id"]
            isOneToOne: false
            referencedRelation: "estrutura_areas"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_projects_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_projects_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_projects_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_prestados"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_projects_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordem_servico"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_projects_produto_segmento_id_fkey"
            columns: ["produto_segmento_id"]
            isOneToOne: false
            referencedRelation: "produto_segmento"
            referencedColumns: ["id"]
          }
        ]
      }
      representante: {
        Row: {
          id_representante: string
          id_cliente: string
          nome: string
          email: string | null
          telefone: string | null
          cargo: string | null
          created_at: string | null
          updated_at: string | null
          tipo_representante: string | null
          observacoes: string | null
          acesso_chamados: boolean | null
          excluido: boolean
          user_id: string | null
        }
        Insert: {
          id_representante?: string
          id_cliente: string
          nome: string
          email?: string | null
          telefone?: string | null
          cargo?: string | null
          created_at?: string | null
          updated_at?: string | null
          tipo_representante?: string | null
          observacoes?: string | null
          acesso_chamados?: boolean | null
          excluido?: boolean
          user_id?: string | null
        }
        Update: {
          id_representante?: string
          id_cliente?: string
          nome?: string
          email?: string | null
          telefone?: string | null
          cargo?: string | null
          created_at?: string | null
          updated_at?: string | null
          tipo_representante?: string | null
          observacoes?: string | null
          acesso_chamados?: boolean | null
          excluido?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "representante_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "representante_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      org_project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "org_projects"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          area: string
          entity_type: string
          entity_id: string
          entity_name: string
          action: string
          changed_fields: Json | null
          performed_by: string
          performed_at: string
          details: string | null
        }
        Insert: {
          id?: string
          area: string
          entity_type: string
          entity_id: string
          entity_name: string
          action: string
          changed_fields?: Json | null
          performed_by: string
          performed_at?: string
          details?: string | null
        }
        Update: {
          id?: string
          area?: string
          entity_type?: string
          entity_id?: string
          entity_name?: string
          action?: string
          changed_fields?: Json | null
          performed_by?: string
          performed_at?: string
          details?: string | null
        }
        Relationships: [

        ]
      }
      servicos_prestados: {
        Row: {
          id: string
          nome: string
          cluster_id: string | null
        }
        Insert: {
          id?: string
          nome: string
          cluster_id?: string | null
        }
        Update: {
          id?: string
          nome?: string
          cluster_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicos_prestados_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          }
        ]
      }
      area_servicos: {
        Row: {
          id: string
          servico_id: string
          estrutura_area_id: string
        }
        Insert: {
          id?: string
          servico_id: string
          estrutura_area_id: string
        }
        Update: {
          id?: string
          servico_id?: string
          estrutura_area_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_area_categorias_categoria_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_prestados"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "area_servicos_estrutura_area_id_fkey"
            columns: ["estrutura_area_id"]
            isOneToOne: false
            referencedRelation: "estrutura_areas"
            referencedColumns: ["id"]
          }
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
            foreignKeyName: "tax_project_categorias_categoria_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_prestados"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_project_servicos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "org_projects"
            referencedColumns: ["id"]
          }
        ]
      }
      ordem_servico: {
        Row: {
          id: string
          id_cliente: string
          numero_os: string | null
          data_emissao: string | null
          data_inicio: string | null
          data_fim: string | null
          valor_projeto: number | null
          valor_reembolso_km: number | null
          valor_reembolso_refeicao: number | null
          situacao: string | null
          observacoes: string | null
          created_at: string | null
          updated_at: string | null
          id_servico: string | null
          id_produto_segmento: string | null
          excluido: boolean
          cluster_id: string | null
          regiao: string | null
          setor_cliente: string | null
          setor_cliente_id: string | null
          numero_parcelas: number | null
          valor_entrada: number | null
        }
        Insert: {
          id?: string
          id_cliente: string
          numero_os?: string | null
          data_emissao?: string | null
          data_inicio?: string | null
          data_fim?: string | null
          valor_projeto?: number | null
          valor_reembolso_km?: number | null
          valor_reembolso_refeicao?: number | null
          situacao?: string | null
          observacoes?: string | null
          created_at?: string | null
          updated_at?: string | null
          id_servico?: string | null
          id_produto_segmento?: string | null
          excluido?: boolean
          cluster_id?: string | null
          regiao?: string | null
          setor_cliente?: string | null
          setor_cliente_id?: string | null
          numero_parcelas?: number | null
          valor_entrada?: number | null
        }
        Update: {
          id?: string
          id_cliente?: string
          numero_os?: string | null
          data_emissao?: string | null
          data_inicio?: string | null
          data_fim?: string | null
          valor_projeto?: number | null
          valor_reembolso_km?: number | null
          valor_reembolso_refeicao?: number | null
          situacao?: string | null
          observacoes?: string | null
          created_at?: string | null
          updated_at?: string | null
          id_servico?: string | null
          id_produto_segmento?: string | null
          excluido?: boolean
          cluster_id?: string | null
          regiao?: string | null
          setor_cliente?: string | null
          setor_cliente_id?: string | null
          numero_parcelas?: number | null
          valor_entrada?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordem_servico_setor_cliente_id_fkey"
            columns: ["setor_cliente_id"]
            isOneToOne: false
            referencedRelation: "setor_cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "ordem_servico_id_servico_fkey"
            columns: ["id_servico"]
            isOneToOne: false
            referencedRelation: "servicos_prestados"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "ordem_servico_id_produto_segmento_fkey"
            columns: ["id_produto_segmento"]
            isOneToOne: false
            referencedRelation: "produto_segmento"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "ordem_servico_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          }
        ]
      }
      contribuinte_bal_config: {
        Row: {
          id: string
          id_contribuinte: string
          balancete_detalhamento: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          id_contribuinte: string
          balancete_detalhamento?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          id_contribuinte?: string
          balancete_detalhamento?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribuinte_bal_config_id_contribuinte_fkey"
            columns: ["id_contribuinte"]
            isOneToOne: true
            referencedRelation: "contribuinte"
            referencedColumns: ["id"]
          }
        ]
      }
      estrutura_clusters: {
        Row: {
          id: string
          name: string
          is_active: boolean
          created_at: string
          updated_at: string
          nome_empresa: string | null
          cnpj: string | null
          cost_center_id: string | null
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          nome_empresa?: string | null
          cnpj?: string | null
          cost_center_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          nome_empresa?: string | null
          cnpj?: string | null
          cost_center_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estrutura_clusters_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          }
        ]
      }
      estrutura_areas: {
        Row: {
          id: string
          cluster_id: string
          name: string
          color: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          page_categories: string[] | null
          cost_center_id: string | null
          gestor_chamados_id: string | null
        }
        Insert: {
          id?: string
          cluster_id: string
          name: string
          color?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          page_categories?: string[] | null
          cost_center_id?: string | null
          gestor_chamados_id?: string | null
        }
        Update: {
          id?: string
          cluster_id?: string
          name?: string
          color?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          page_categories?: string[] | null
          cost_center_id?: string | null
          gestor_chamados_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estrutura_areas_gestor_chamados_id_fkey"
            columns: ["gestor_chamados_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "estrutura_areas_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "estrutura_areas_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          }
        ]
      }
      estrutura_equipes: {
        Row: {
          id: string
          area_id: string
          name: string
          is_active: boolean
          created_at: string
          gestor_id: string | null
        }
        Insert: {
          id?: string
          area_id: string
          name: string
          is_active?: boolean
          created_at?: string
          gestor_id?: string | null
        }
        Update: {
          id?: string
          area_id?: string
          name?: string
          is_active?: boolean
          created_at?: string
          gestor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estrutura_equipes_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "estrutura_equipes_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "estrutura_areas"
            referencedColumns: ["id"]
          }
        ]
      }
      estrutura_equipe_membros: {
        Row: {
          id: string
          equipe_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          equipe_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          equipe_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estrutura_equipe_membros_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "estrutura_equipes"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "estrutura_equipe_membros_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      produto_segmento: {
        Row: {
          id: string
          codigo: string
          nome: string
          is_active: boolean | null
          created_at: string | null
          cluster_id: string | null
          is_canal_chamados: boolean
        }
        Insert: {
          id?: string
          codigo: string
          nome: string
          is_active?: boolean | null
          created_at?: string | null
          cluster_id?: string | null
          is_canal_chamados?: boolean
        }
        Update: {
          id?: string
          codigo?: string
          nome?: string
          is_active?: boolean | null
          created_at?: string | null
          cluster_id?: string | null
          is_canal_chamados?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "produto_segmento_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          }
        ]
      }
      centros_custo: {
        Row: {
          id: string
          codigo: string
          nome: string
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          codigo: string
          nome: string
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          codigo?: string
          nome?: string
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: [

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
          }
          {
            foreignKeyName: "produto_servico_servico_prestado_id_fkey"
            columns: ["servico_prestado_id"]
            isOneToOne: false
            referencedRelation: "servicos_prestados"
            referencedColumns: ["id"]
          }
        ]
      }
      inscricao_contribuinte: {
        Row: {
          id: string
          contribuinte_id: string
          situacao: string
          numero_ie: string | null
          uf: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          contribuinte_id: string
          situacao?: string
          numero_ie?: string | null
          uf: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          contribuinte_id?: string
          situacao?: string
          numero_ie?: string | null
          uf?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inscricao_contribuinte_contribuinte_id_fkey"
            columns: ["contribuinte_id"]
            isOneToOne: false
            referencedRelation: "contribuinte"
            referencedColumns: ["id"]
          }
        ]
      }
      distribuicao_receita: {
        Row: {
          id: string
          id_ordem_servico: string
          id_centro_custo: string
          percentual_rateio: number
          created_at: string | null
          excluido: boolean
        }
        Insert: {
          id?: string
          id_ordem_servico: string
          id_centro_custo: string
          percentual_rateio?: number
          created_at?: string | null
          excluido?: boolean
        }
        Update: {
          id?: string
          id_ordem_servico?: string
          id_centro_custo?: string
          percentual_rateio?: number
          created_at?: string | null
          excluido?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "distribuicao_receita_id_ordem_servico_fkey"
            columns: ["id_ordem_servico"]
            isOneToOne: false
            referencedRelation: "ordem_servico"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "distribuicao_receita_id_centro_custo_fkey"
            columns: ["id_centro_custo"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          }
        ]
      }
      efd_correcoes: {
        Row: {
          id: string
          contribuinte_id: string
          arquivo_id: string | null
          empresa_cnpj: string | null
          periodo: string | null
          arquivo_tipo: string
          registro_tipo: string
          registro_original_id: string | null
          tipo_operacao: string
          snapshot: Json
          campos_alterados: Json | null
          batch_id: string | null
          motivo: string | null
          usuario_id: string
          created_at: string | null
          ativo: boolean | null
          sync_status: string | null
          sync_sent_at: string | null
          sync_error: string | null
        }
        Insert: {
          id?: string
          contribuinte_id: string
          arquivo_id?: string | null
          empresa_cnpj?: string | null
          periodo?: string | null
          arquivo_tipo: string
          registro_tipo: string
          registro_original_id?: string | null
          tipo_operacao: string
          snapshot: Json
          campos_alterados?: Json | null
          batch_id?: string | null
          motivo?: string | null
          usuario_id: string
          created_at?: string | null
          ativo?: boolean | null
          sync_status?: string | null
          sync_sent_at?: string | null
          sync_error?: string | null
        }
        Update: {
          id?: string
          contribuinte_id?: string
          arquivo_id?: string | null
          empresa_cnpj?: string | null
          periodo?: string | null
          arquivo_tipo?: string
          registro_tipo?: string
          registro_original_id?: string | null
          tipo_operacao?: string
          snapshot?: Json
          campos_alterados?: Json | null
          batch_id?: string | null
          motivo?: string | null
          usuario_id?: string
          created_at?: string | null
          ativo?: boolean | null
          sync_status?: string | null
          sync_sent_at?: string | null
          sync_error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "efd_correcoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      pis_cofins_regra: {
        Row: {
          id: string
          id_segmento: string
          cod_ncm: string
          cst_pis: string | null
          cst_cofins: string | null
          desc_cst: string | null
          base_legal: string | null
          permite_credito: string | null
          tipo_credito: string | null
          observacoes: string | null
          data_vigencia_inicio: number | null
          data_vigencia_fim: number | null
          created_at: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          id_segmento: string
          cod_ncm: string
          cst_pis?: string | null
          cst_cofins?: string | null
          desc_cst?: string | null
          base_legal?: string | null
          permite_credito?: string | null
          tipo_credito?: string | null
          observacoes?: string | null
          data_vigencia_inicio?: number | null
          data_vigencia_fim?: number | null
          created_at?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          id_segmento?: string
          cod_ncm?: string
          cst_pis?: string | null
          cst_cofins?: string | null
          desc_cst?: string | null
          base_legal?: string | null
          permite_credito?: string | null
          tipo_credito?: string | null
          observacoes?: string | null
          data_vigencia_inicio?: number | null
          data_vigencia_fim?: number | null
          created_at?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [

        ]
      }
      pis_cofins_class: {
        Row: {
          id: string
          cod_ncm: string | null
          cod_produto: string | null
          id_contribuinte: string | null
          id_regra: string | null
          classificado_por: string | null
          classificado_em: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cod_ncm?: string | null
          cod_produto?: string | null
          id_contribuinte?: string | null
          id_regra?: string | null
          classificado_por?: string | null
          classificado_em?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cod_ncm?: string | null
          cod_produto?: string | null
          id_contribuinte?: string | null
          id_regra?: string | null
          classificado_por?: string | null
          classificado_em?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pis_cofins_class_id_contribuinte_fkey"
            columns: ["id_contribuinte"]
            isOneToOne: false
            referencedRelation: "contribuinte"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "pis_cofins_class_id_regra_fkey"
            columns: ["id_regra"]
            isOneToOne: false
            referencedRelation: "pis_cofins_regra"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "pis_cofins_class_classificado_por_fkey"
            columns: ["classificado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      setor_cliente: {
        Row: {
          id: string
          nome: string
          sigla: string
          descricao: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          nome: string
          sigla: string
          descricao?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          nome?: string
          sigla?: string
          descricao?: string | null
          created_at?: string | null
        }
        Relationships: [

        ]
      }
      procedimentos: {
        Row: {
          id: string
          source_url: string | null
          source_type: string
          arquivo_path: string | null
          processos_associados: string[] | null
          ai_titulo: string | null
          ai_resumo: string | null
          ai_etapas: Json | null
          ai_complexidade: string | null
          ai_tags: string[] | null
          status_geracao: string | null
          status_publicacao: string | null
          erro_mensagem: string | null
          confirmado_por: string | null
          confirmado_em: string | null
          created_by: string | null
          updated_at: string | null
          created_at: string | null
          ai_cover_url: string | null
        }
        Insert: {
          id?: string
          source_url?: string | null
          source_type: string
          arquivo_path?: string | null
          processos_associados?: string[] | null
          ai_titulo?: string | null
          ai_resumo?: string | null
          ai_etapas?: Json | null
          ai_complexidade?: string | null
          ai_tags?: string[] | null
          status_geracao?: string | null
          status_publicacao?: string | null
          erro_mensagem?: string | null
          confirmado_por?: string | null
          confirmado_em?: string | null
          created_by?: string | null
          updated_at?: string | null
          created_at?: string | null
          ai_cover_url?: string | null
        }
        Update: {
          id?: string
          source_url?: string | null
          source_type?: string
          arquivo_path?: string | null
          processos_associados?: string[] | null
          ai_titulo?: string | null
          ai_resumo?: string | null
          ai_etapas?: Json | null
          ai_complexidade?: string | null
          ai_tags?: string[] | null
          status_geracao?: string | null
          status_publicacao?: string | null
          erro_mensagem?: string | null
          confirmado_por?: string | null
          confirmado_em?: string | null
          created_by?: string | null
          updated_at?: string | null
          created_at?: string | null
          ai_cover_url?: string | null
        }
        Relationships: [

        ]
      }
      ciclos_avaliacao: {
        Row: {
          id: string
          nome: string
          data_inicio: string
          data_fim: string
          data_analise_semestral: string | null
          status: string | null
          descricao: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          nome: string
          data_inicio: string
          data_fim: string
          data_analise_semestral?: string | null
          status?: string | null
          descricao?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          nome?: string
          data_inicio?: string
          data_fim?: string
          data_analise_semestral?: string | null
          status?: string | null
          descricao?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [

        ]
      }
      metas: {
        Row: {
          id: string
          ciclo_id: string | null
          meta_pai_id: string | null
          nivel: string
          dimensao: string
          titulo: string
          descricao: string | null
          criterio_evidencia: string | null
          prazo: string | null
          peso: number | null
          responsavel_id: string | null
          progresso_atual: number | null
          classificacao_final: string | null
          ajuste_qualitativo: string | null
          status: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          ajuste_qualitativo_publico: string | null
          recomendacao_decisao: string | null
          ultima_atualizacao_membro: string | null
          comentario_membro: string | null
        }
        Insert: {
          id?: string
          ciclo_id?: string | null
          meta_pai_id?: string | null
          nivel: string
          dimensao: string
          titulo: string
          descricao?: string | null
          criterio_evidencia?: string | null
          prazo?: string | null
          peso?: number | null
          responsavel_id?: string | null
          progresso_atual?: number | null
          classificacao_final?: string | null
          ajuste_qualitativo?: string | null
          status?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          ajuste_qualitativo_publico?: string | null
          recomendacao_decisao?: string | null
          ultima_atualizacao_membro?: string | null
          comentario_membro?: string | null
        }
        Update: {
          id?: string
          ciclo_id?: string | null
          meta_pai_id?: string | null
          nivel?: string
          dimensao?: string
          titulo?: string
          descricao?: string | null
          criterio_evidencia?: string | null
          prazo?: string | null
          peso?: number | null
          responsavel_id?: string | null
          progresso_atual?: number | null
          classificacao_final?: string | null
          ajuste_qualitativo?: string | null
          status?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          ajuste_qualitativo_publico?: string | null
          recomendacao_decisao?: string | null
          ultima_atualizacao_membro?: string | null
          comentario_membro?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "metas_meta_pai_id_fkey"
            columns: ["meta_pai_id"]
            isOneToOne: false
            referencedRelation: "metas"
            referencedColumns: ["id"]
          }
        ]
      }
      kpis_meta: {
        Row: {
          id: string
          meta_id: string | null
          nome: string
          descricao: string | null
          valor_alvo: number
          valor_atual: number | null
          unidade: string | null
          updated_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          meta_id?: string | null
          nome: string
          descricao?: string | null
          valor_alvo: number
          valor_atual?: number | null
          unidade?: string | null
          updated_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          meta_id?: string | null
          nome?: string
          descricao?: string | null
          valor_alvo?: number
          valor_atual?: number | null
          unidade?: string | null
          updated_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpis_meta_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas"
            referencedColumns: ["id"]
          }
        ]
      }
      atualizacoes_meta: {
        Row: {
          id: string
          meta_id: string | null
          progresso_anterior: number | null
          progresso_novo: number | null
          comentario: string | null
          autor_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          meta_id?: string | null
          progresso_anterior?: number | null
          progresso_novo?: number | null
          comentario?: string | null
          autor_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          meta_id?: string | null
          progresso_anterior?: number | null
          progresso_novo?: number | null
          comentario?: string | null
          autor_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atualizacoes_meta_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas"
            referencedColumns: ["id"]
          }
        ]
      }
      analises_semestrais: {
        Row: {
          id: string
          ciclo_id: string | null
          responsavel_id: string | null
          entregas_realizadas: string | null
          riscos_identificados: string | null
          ajustes_necessarios: string | null
          comentario_lider: string | null
          comentario_avaliado: string | null
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          ciclo_id?: string | null
          responsavel_id?: string | null
          entregas_realizadas?: string | null
          riscos_identificados?: string | null
          ajustes_necessarios?: string | null
          comentario_lider?: string | null
          comentario_avaliado?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          ciclo_id?: string | null
          responsavel_id?: string | null
          entregas_realizadas?: string | null
          riscos_identificados?: string | null
          ajustes_necessarios?: string | null
          comentario_lider?: string | null
          comentario_avaliado?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analises_semestrais_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          }
        ]
      }
      feedbacks: {
        Row: {
          id: string
          ciclo_id: string | null
          tipo: string
          de_usuario_id: string | null
          para_usuario_id: string | null
          contexto: string
          comportamento: string
          impacto: string
          anonimo: boolean | null
          visivel_para_avaliado: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          ciclo_id?: string | null
          tipo: string
          de_usuario_id?: string | null
          para_usuario_id?: string | null
          contexto: string
          comportamento: string
          impacto: string
          anonimo?: boolean | null
          visivel_para_avaliado?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          ciclo_id?: string | null
          tipo?: string
          de_usuario_id?: string | null
          para_usuario_id?: string | null
          contexto?: string
          comportamento?: string
          impacto?: string
          anonimo?: boolean | null
          visivel_para_avaliado?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          }
        ]
      }
      reunioes_1a1: {
        Row: {
          id: string
          lider_id: string | null
          membro_id: string | null
          ciclo_id: string | null
          data_reuniao: string
          temas_discutidos: string | null
          sentimento: number | null
          observacoes_lider: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          lider_id?: string | null
          membro_id?: string | null
          ciclo_id?: string | null
          data_reuniao: string
          temas_discutidos?: string | null
          sentimento?: number | null
          observacoes_lider?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          lider_id?: string | null
          membro_id?: string | null
          ciclo_id?: string | null
          data_reuniao?: string
          temas_discutidos?: string | null
          sentimento?: number | null
          observacoes_lider?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_1a1_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          }
        ]
      }
      itens_acao_1a1: {
        Row: {
          id: string
          reuniao_id: string | null
          descricao: string
          responsavel_id: string | null
          prazo: string | null
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          reuniao_id?: string | null
          descricao: string
          responsavel_id?: string | null
          prazo?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          reuniao_id?: string | null
          descricao?: string
          responsavel_id?: string | null
          prazo?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_acao_1a1_reuniao_id_fkey"
            columns: ["reuniao_id"]
            isOneToOne: false
            referencedRelation: "reunioes_1a1"
            referencedColumns: ["id"]
          }
        ]
      }
      performance_preferencias: {
        Row: {
          id: string
          usuario_id: string | null
          periodo_padrao: string | null
          area_padrao: string | null
          widgets_ocultos: string[] | null
          updated_at: string | null
          dashboard_layout: Json | null
        }
        Insert: {
          id?: string
          usuario_id?: string | null
          periodo_padrao?: string | null
          area_padrao?: string | null
          widgets_ocultos?: string[] | null
          updated_at?: string | null
          dashboard_layout?: Json | null
        }
        Update: {
          id?: string
          usuario_id?: string | null
          periodo_padrao?: string | null
          area_padrao?: string | null
          widgets_ocultos?: string[] | null
          updated_at?: string | null
          dashboard_layout?: Json | null
        }
        Relationships: [

        ]
      }
      ppr_regras_ciclo: {
        Row: {
          id: string
          ciclo_id: string | null
          faixa_minima: number
          faixa_maxima: number | null
          classificacao: string
          multiplicador_bonus: number
          descricao_publica: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          ciclo_id?: string | null
          faixa_minima: number
          faixa_maxima?: number | null
          classificacao: string
          multiplicador_bonus?: number
          descricao_publica?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          ciclo_id?: string | null
          faixa_minima?: number
          faixa_maxima?: number | null
          classificacao?: string
          multiplicador_bonus?: number
          descricao_publica?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ppr_regras_ciclo_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          }
        ]
      }
      comentarios_avaliacao: {
        Row: {
          id: string
          ciclo_id: string | null
          autor_id: string
          destinatario_id: string | null
          tipo: string
          conteudo: string
          visivel_para_membro: boolean | null
          lido: boolean | null
          lido_em: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          ciclo_id?: string | null
          autor_id: string
          destinatario_id?: string | null
          tipo: string
          conteudo: string
          visivel_para_membro?: boolean | null
          lido?: boolean | null
          lido_em?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          ciclo_id?: string | null
          autor_id?: string
          destinatario_id?: string | null
          tipo?: string
          conteudo?: string
          visivel_para_membro?: boolean | null
          lido?: boolean | null
          lido_em?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_avaliacao_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          }
        ]
      }
      relatorios_gerados: {
        Row: {
          id: string
          ciclo_id: string | null
          membro_id: string | null
          tipo: string
          conteudo_ia: string | null
          gerado_por: string | null
          gerado_em: string | null
          status: string | null
        }
        Insert: {
          id?: string
          ciclo_id?: string | null
          membro_id?: string | null
          tipo: string
          conteudo_ia?: string | null
          gerado_por?: string | null
          gerado_em?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          ciclo_id?: string | null
          membro_id?: string | null
          tipo?: string
          conteudo_ia?: string | null
          gerado_por?: string | null
          gerado_em?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_gerados_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          }
        ]
      }
      os_produtos_contratados: {
        Row: {
          id: string
          ordem_servico_id: string
          produto_segmento_id: string
          created_at: string | null
          horas_contratadas: number | null
        }
        Insert: {
          id?: string
          ordem_servico_id: string
          produto_segmento_id: string
          created_at?: string | null
          horas_contratadas?: number | null
        }
        Update: {
          id?: string
          ordem_servico_id?: string
          produto_segmento_id?: string
          created_at?: string | null
          horas_contratadas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "os_produtos_contratados_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordem_servico"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "os_produtos_contratados_produto_segmento_id_fkey"
            columns: ["produto_segmento_id"]
            isOneToOne: false
            referencedRelation: "produto_segmento"
            referencedColumns: ["id"]
          }
        ]
      }
      cliente_clusters: {
        Row: {
          id: string
          cliente_id: string
          cluster_id: string
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          cluster_id: string
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          cluster_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_clusters_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "cliente_clusters_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          }
        ]
      }
      correcoes_icms: {
        Row: {
          id: string
          contribuinte_id: string
          familia: string
          data_lancamento: string
          competencia: string | null
          descricao: string
          produto: string | null
          campos: Json
          ambiente: string
          excluido: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contribuinte_id: string
          familia: string
          data_lancamento: string
          competencia?: string | null
          descricao: string
          produto?: string | null
          campos?: Json
          ambiente?: string
          excluido?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contribuinte_id?: string
          familia?: string
          data_lancamento?: string
          competencia?: string | null
          descricao?: string
          produto?: string | null
          campos?: Json
          ambiente?: string
          excluido?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [

        ]
      }
      distribuicao_dcomp: {
        Row: {
          id: string
          nr_documento: string
          tributo: string
          valor_tributo: number
          criado_em: string
          criado_por: string | null
          atualizado_em: string
          atualizado_por: string | null
          competencia: string | null
          valor_original: number | null
          grupo_tributo_id: string | null
          codigo_receita_id: string | null
        }
        Insert: {
          id?: string
          nr_documento: string
          tributo: string
          valor_tributo?: number
          criado_em?: string
          criado_por?: string | null
          atualizado_em?: string
          atualizado_por?: string | null
          competencia?: string | null
          valor_original?: number | null
          grupo_tributo_id?: string | null
          codigo_receita_id?: string | null
        }
        Update: {
          id?: string
          nr_documento?: string
          tributo?: string
          valor_tributo?: number
          criado_em?: string
          criado_por?: string | null
          atualizado_em?: string
          atualizado_por?: string | null
          competencia?: string | null
          valor_original?: number | null
          grupo_tributo_id?: string | null
          codigo_receita_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribuicao_dcomp_grupo_tributo_id_fkey"
            columns: ["grupo_tributo_id"]
            isOneToOne: false
            referencedRelation: "grupo_tributo"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "distribuicao_dcomp_codigo_receita_id_fkey"
            columns: ["codigo_receita_id"]
            isOneToOne: false
            referencedRelation: "codigo_receita"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "distribuicao_dcomp_nr_documento_fkey"
            columns: ["nr_documento"]
            isOneToOne: false
            referencedRelation: "dcomp"
            referencedColumns: ["nr_documento"]
          }
        ]
      }
      process_scenarios: {
        Row: {
          id: string
          process_id: string
          parent_scenario_id: string | null
          improvement_id: string | null
          project_id: string | null
          name: string
          description: string | null
          scenario_kind: unknown
          scenario_type: unknown
          unit_basis: unknown
          status: unknown
          varied_field: string
          locked_fields: string[]
          parameters: Json
          computed_metrics: Json | null
          is_locked: boolean
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
          snapshot_at: string | null
          annual_cost: number | null
          annual_hours: number | null
          annual_savings: number | null
          roi_percent: number | null
          payback_months: number | null
          hours_freed: number | null
          investment: number | null
        }
        Insert: {
          id?: string
          process_id: string
          parent_scenario_id?: string | null
          improvement_id?: string | null
          project_id?: string | null
          name: string
          description?: string | null
          scenario_kind: unknown
          scenario_type?: unknown
          unit_basis?: unknown
          status?: unknown
          varied_field: string
          locked_fields?: string[]
          parameters: Json
          computed_metrics?: Json | null
          is_locked?: boolean
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
          snapshot_at?: string | null
          annual_cost?: number | null
          annual_hours?: number | null
          annual_savings?: number | null
          roi_percent?: number | null
          payback_months?: number | null
          hours_freed?: number | null
          investment?: number | null
        }
        Update: {
          id?: string
          process_id?: string
          parent_scenario_id?: string | null
          improvement_id?: string | null
          project_id?: string | null
          name?: string
          description?: string | null
          scenario_kind?: unknown
          scenario_type?: unknown
          unit_basis?: unknown
          status?: unknown
          varied_field?: string
          locked_fields?: string[]
          parameters?: Json
          computed_metrics?: Json | null
          is_locked?: boolean
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          snapshot_at?: string | null
          annual_cost?: number | null
          annual_hours?: number | null
          annual_savings?: number | null
          roi_percent?: number | null
          payback_months?: number | null
          hours_freed?: number | null
          investment?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "process_scenarios_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "process_scenarios_parent_scenario_id_fkey"
            columns: ["parent_scenario_id"]
            isOneToOne: false
            referencedRelation: "process_scenarios"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "process_scenarios_improvement_id_fkey"
            columns: ["improvement_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "process_scenarios_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "process_scenarios_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      grupo_tributo: {
        Row: {
          id: string
          sigla: string
          denominacao: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sigla: string
          denominacao: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sigla?: string
          denominacao?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [

        ]
      }
      codigo_receita: {
        Row: {
          id: string
          grupo_tributo_id: string
          codigo: string
          denominacao_receita: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          grupo_tributo_id: string
          codigo: string
          denominacao_receita: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          grupo_tributo_id?: string
          codigo?: string
          denominacao_receita?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "codigo_receita_grupo_tributo_id_fkey"
            columns: ["grupo_tributo_id"]
            isOneToOne: false
            referencedRelation: "grupo_tributo"
            referencedColumns: ["id"]
          }
        ]
      }
      rls_precheck_allowed_tables: {
        Row: {
          table_name: string
          allowed_ops: string[]
          created_at: string
        }
        Insert: {
          table_name: string
          allowed_ops?: string[]
          created_at?: string
        }
        Update: {
          table_name?: string
          allowed_ops?: string[]
          created_at?: string
        }
        Relationships: [

        ]
      }
      pessoa: {
        Row: {
          id: string
          cliente_id: string
          contribuinte_id: string | null
          tipo_pessoa: string
          denominacao: string
          cpf_cnpj: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          endereco_complemento: string | null
          endereco_bairro: string | null
          endereco_municipio: string | null
          endereco_uf: string | null
          endereco_cep: string | null
          nacionalidade: string | null
          estado_civil: string | null
          regime_bens: string | null
          data_nascimento: string | null
          filiacao_pai: string | null
          filiacao_mae: string | null
          profissao: string | null
          documento_identidade_numero: string | null
          documento_identidade_orgao: string | null
          documento_identidade_uf: string | null
          conjuge_id: string | null
          nire: string | null
          junta_comercial_uf: string | null
          data_constituicao: string | null
          objeto_social: string | null
          status_constituicao: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
          documento_identidade_tipo: string | null
          genero: string | null
          naturalidade_municipio: string | null
          naturalidade_uf: string | null
          filiacao_pai_pessoa_id: string | null
          filiacao_mae_pessoa_id: string | null
          is_fundador: boolean
          tipo_empresa: string | null
        }
        Insert: {
          id?: string
          cliente_id: string
          contribuinte_id?: string | null
          tipo_pessoa: string
          denominacao: string
          cpf_cnpj?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_complemento?: string | null
          endereco_bairro?: string | null
          endereco_municipio?: string | null
          endereco_uf?: string | null
          endereco_cep?: string | null
          nacionalidade?: string | null
          estado_civil?: string | null
          regime_bens?: string | null
          data_nascimento?: string | null
          filiacao_pai?: string | null
          filiacao_mae?: string | null
          profissao?: string | null
          documento_identidade_numero?: string | null
          documento_identidade_orgao?: string | null
          documento_identidade_uf?: string | null
          conjuge_id?: string | null
          nire?: string | null
          junta_comercial_uf?: string | null
          data_constituicao?: string | null
          objeto_social?: string | null
          status_constituicao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          documento_identidade_tipo?: string | null
          genero?: string | null
          naturalidade_municipio?: string | null
          naturalidade_uf?: string | null
          filiacao_pai_pessoa_id?: string | null
          filiacao_mae_pessoa_id?: string | null
          is_fundador?: boolean
          tipo_empresa?: string | null
        }
        Update: {
          id?: string
          cliente_id?: string
          contribuinte_id?: string | null
          tipo_pessoa?: string
          denominacao?: string
          cpf_cnpj?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_complemento?: string | null
          endereco_bairro?: string | null
          endereco_municipio?: string | null
          endereco_uf?: string | null
          endereco_cep?: string | null
          nacionalidade?: string | null
          estado_civil?: string | null
          regime_bens?: string | null
          data_nascimento?: string | null
          filiacao_pai?: string | null
          filiacao_mae?: string | null
          profissao?: string | null
          documento_identidade_numero?: string | null
          documento_identidade_orgao?: string | null
          documento_identidade_uf?: string | null
          conjuge_id?: string | null
          nire?: string | null
          junta_comercial_uf?: string | null
          data_constituicao?: string | null
          objeto_social?: string | null
          status_constituicao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          documento_identidade_tipo?: string | null
          genero?: string | null
          naturalidade_municipio?: string | null
          naturalidade_uf?: string | null
          filiacao_pai_pessoa_id?: string | null
          filiacao_mae_pessoa_id?: string | null
          is_fundador?: boolean
          tipo_empresa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "pessoa_contribuinte_id_fkey"
            columns: ["contribuinte_id"]
            isOneToOne: false
            referencedRelation: "contribuinte"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "pessoa_conjuge_id_fkey"
            columns: ["conjuge_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "pessoa_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "pessoa_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "pessoa_filiacao_pai_pessoa_id_fkey"
            columns: ["filiacao_pai_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "pessoa_filiacao_mae_pessoa_id_fkey"
            columns: ["filiacao_mae_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
        ]
      }
      parentesco: {
        Row: {
          id: string
          pessoa_id: string
          parente_pessoa_id: string
          tipo: string | null
          natureza: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          pessoa_id: string
          parente_pessoa_id: string
          tipo?: string | null
          natureza?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          pessoa_id?: string
          parente_pessoa_id?: string
          tipo?: string | null
          natureza?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parentesco_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "parentesco_parente_pessoa_id_fkey"
            columns: ["parente_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "parentesco_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "parentesco_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      cartorio: {
        Row: {
          id: string
          nome_completo: string
          comarca: string
          uf: string
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          nome_completo: string
          comarca: string
          uf: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          nome_completo?: string
          comarca?: string
          uf?: string
          created_at?: string
          created_by?: string | null
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
          }
          {
            foreignKeyName: "cartorio_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      bem: {
        Row: {
          id: string
          cliente_id: string
          referencia_dp: string
          tipo_bem: string
          denominacao: string
          vlr_contabil: number | null
          vlr_contabil_ajustado: number | null
          vlr_benfeitorias: number | null
          vlr_mercado: number | null
          vlr_imposto_anual: number | null
          imposto_anual_exercicio: number | null
          ccir_codigo: string | null
          inscricao_municipal: string | null
          status_integralizacao: string | null
          empresa_destino_pessoa_id: string | null
          participa_estruturacao: boolean
          motivo_nao_integralizacao: string | null
          observacao: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
          descricao_outros: string | null
          vlr_itr_iptu: number | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          endereco_complemento: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          area_construida_m2: number | null
        }
        Insert: {
          id?: string
          cliente_id: string
          referencia_dp: string
          tipo_bem: string
          denominacao: string
          vlr_contabil?: number | null
          vlr_contabil_ajustado?: number | null
          vlr_benfeitorias?: number | null
          vlr_mercado?: number | null
          vlr_imposto_anual?: number | null
          imposto_anual_exercicio?: number | null
          ccir_codigo?: string | null
          inscricao_municipal?: string | null
          status_integralizacao?: string | null
          empresa_destino_pessoa_id?: string | null
          participa_estruturacao?: boolean
          motivo_nao_integralizacao?: string | null
          observacao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          descricao_outros?: string | null
          vlr_itr_iptu?: number | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_complemento?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          area_construida_m2?: number | null
        }
        Update: {
          id?: string
          cliente_id?: string
          referencia_dp?: string
          tipo_bem?: string
          denominacao?: string
          vlr_contabil?: number | null
          vlr_contabil_ajustado?: number | null
          vlr_benfeitorias?: number | null
          vlr_mercado?: number | null
          vlr_imposto_anual?: number | null
          imposto_anual_exercicio?: number | null
          ccir_codigo?: string | null
          inscricao_municipal?: string | null
          status_integralizacao?: string | null
          empresa_destino_pessoa_id?: string | null
          participa_estruturacao?: boolean
          motivo_nao_integralizacao?: string | null
          observacao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          descricao_outros?: string | null
          vlr_itr_iptu?: number | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_complemento?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          area_construida_m2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bem_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "bem_empresa_destino_pessoa_id_fkey"
            columns: ["empresa_destino_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "bem_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "bem_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      matricula: {
        Row: {
          id: string
          bem_id: string | null
          numero: string
          matricula_anterior_id: string | null
          matricula_anterior_texto: string | null
          livro: string | null
          folha: string | null
          data_matricula: string | null
          cartorio_id: string
          municipio_imovel: string
          uf_imovel: string
          area_documento: number
          area_real: number | null
          area_explorada: number | null
          area_unidade: string
          georreferenciado: string | null
          georref_prejudica_transferencia: boolean | null
          tipo_exploracao_posse: string | null
          descricao_psa_completa: string | null
          confrontacoes_texto: string | null
          origem_descricao: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
          tipo_bem: string | null
          vlr_contabil: number | null
          vlr_contabil_ajustado: number | null
          vlr_benfeitorias: number | null
          vlr_mercado: number | null
          vlr_imposto_anual: number | null
          imposto_anual_exercicio: number | null
          cliente_id: string | null
        }
        Insert: {
          id?: string
          bem_id?: string | null
          numero: string
          matricula_anterior_id?: string | null
          matricula_anterior_texto?: string | null
          livro?: string | null
          folha?: string | null
          data_matricula?: string | null
          cartorio_id: string
          municipio_imovel: string
          uf_imovel: string
          area_documento: number
          area_real?: number | null
          area_explorada?: number | null
          area_unidade: string
          georreferenciado?: string | null
          georref_prejudica_transferencia?: boolean | null
          tipo_exploracao_posse?: string | null
          descricao_psa_completa?: string | null
          confrontacoes_texto?: string | null
          origem_descricao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          tipo_bem?: string | null
          vlr_contabil?: number | null
          vlr_contabil_ajustado?: number | null
          vlr_benfeitorias?: number | null
          vlr_mercado?: number | null
          vlr_imposto_anual?: number | null
          imposto_anual_exercicio?: number | null
          cliente_id?: string | null
        }
        Update: {
          id?: string
          bem_id?: string | null
          numero?: string
          matricula_anterior_id?: string | null
          matricula_anterior_texto?: string | null
          livro?: string | null
          folha?: string | null
          data_matricula?: string | null
          cartorio_id?: string
          municipio_imovel?: string
          uf_imovel?: string
          area_documento?: number
          area_real?: number | null
          area_explorada?: number | null
          area_unidade?: string
          georreferenciado?: string | null
          georref_prejudica_transferencia?: boolean | null
          tipo_exploracao_posse?: string | null
          descricao_psa_completa?: string | null
          confrontacoes_texto?: string | null
          origem_descricao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          tipo_bem?: string | null
          vlr_contabil?: number | null
          vlr_contabil_ajustado?: number | null
          vlr_benfeitorias?: number | null
          vlr_mercado?: number | null
          vlr_imposto_anual?: number | null
          imposto_anual_exercicio?: number | null
          cliente_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matricula_matricula_anterior_id_fkey"
            columns: ["matricula_anterior_id"]
            isOneToOne: false
            referencedRelation: "matricula"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "matricula_cartorio_id_fkey"
            columns: ["cartorio_id"]
            isOneToOne: false
            referencedRelation: "cartorio"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "matricula_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "matricula_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "matricula_bem_id_fkey"
            columns: ["bem_id"]
            isOneToOne: false
            referencedRelation: "bem"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "matricula_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
        ]
      }
      titularidade: {
        Row: {
          id: string
          matricula_id: string | null
          titular_pessoa_id: string
          tipo: string
          fracao: number | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
          bem_id: string | null
          integralizador: boolean
        }
        Insert: {
          id?: string
          matricula_id?: string | null
          titular_pessoa_id: string
          tipo: string
          fracao?: number | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          bem_id?: string | null
          integralizador?: boolean
        }
        Update: {
          id?: string
          matricula_id?: string | null
          titular_pessoa_id?: string
          tipo?: string
          fracao?: number | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          bem_id?: string | null
          integralizador?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "titularidade_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matricula"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "titularidade_titular_pessoa_id_fkey"
            columns: ["titular_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "titularidade_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "titularidade_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "titularidade_bem_id_fkey"
            columns: ["bem_id"]
            isOneToOne: false
            referencedRelation: "bem"
            referencedColumns: ["id"]
          }
        ]
      }
      impedimento: {
        Row: {
          id: string
          matricula_id: string
          tipo: string
          referencia: string | null
          descricao: string | null
          credor_pessoa_id: string | null
          credor_nome: string | null
          data_constituicao: string | null
          data_validade: string | null
          vlr: number | null
          area_afetada: number | null
          impede_transferencia: boolean
          cancelado: boolean
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          matricula_id: string
          tipo: string
          referencia?: string | null
          descricao?: string | null
          credor_pessoa_id?: string | null
          credor_nome?: string | null
          data_constituicao?: string | null
          data_validade?: string | null
          vlr?: number | null
          area_afetada?: number | null
          impede_transferencia?: boolean
          cancelado?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          matricula_id?: string
          tipo?: string
          referencia?: string | null
          descricao?: string | null
          credor_pessoa_id?: string | null
          credor_nome?: string | null
          data_constituicao?: string | null
          data_validade?: string | null
          vlr?: number | null
          area_afetada?: number | null
          impede_transferencia?: boolean
          cancelado?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impedimento_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matricula"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "impedimento_credor_pessoa_id_fkey"
            columns: ["credor_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "impedimento_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "impedimento_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      tmpl_flag: {
        Row: {
          id: string
          nome: string
          tipo: string
          escopo: string
          expressao_sql: string | null
          descricao: string | null
          ativo: boolean
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
          entidade: string | null
          campo: string | null
          valor: string | null
        }
        Insert: {
          id?: string
          nome: string
          tipo: string
          escopo: string
          expressao_sql?: string | null
          descricao?: string | null
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          entidade?: string | null
          campo?: string | null
          valor?: string | null
        }
        Update: {
          id?: string
          nome?: string
          tipo?: string
          escopo?: string
          expressao_sql?: string | null
          descricao?: string | null
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          entidade?: string | null
          campo?: string | null
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tmpl_flag_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tmpl_flag_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      tmpl_documento: {
        Row: {
          id: string
          nome: string
          tipo: string | null
          descricao: string | null
          ativo: boolean
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          nome: string
          tipo?: string | null
          descricao?: string | null
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          nome?: string
          tipo?: string | null
          descricao?: string | null
          ativo?: boolean
          created_at?: string
          created_by?: string | null
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
          }
          {
            foreignKeyName: "tmpl_documento_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      tmpl_bloco: {
        Row: {
          id: string
          nome: string
          categoria: string | null
          descricao: string | null
          escopo_documento_raiz_id: string | null
          bloco_origem_id: string | null
          tipo_derivacao: string | null
          ativo: boolean
          autor_id: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
          tipo: string
          repete_colecao: string | null
          ancora: string | null
          familia_id: string | null
          variante_seletor: Json | null
          variante_rotulo: string | null
          variante_ordem: number | null
        }
        Insert: {
          id?: string
          nome: string
          categoria?: string | null
          descricao?: string | null
          escopo_documento_raiz_id?: string | null
          bloco_origem_id?: string | null
          tipo_derivacao?: string | null
          ativo?: boolean
          autor_id?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          tipo?: string
          repete_colecao?: string | null
          ancora?: string | null
          familia_id?: string | null
          variante_seletor?: Json | null
          variante_rotulo?: string | null
          variante_ordem?: number | null
        }
        Update: {
          id?: string
          nome?: string
          categoria?: string | null
          descricao?: string | null
          escopo_documento_raiz_id?: string | null
          bloco_origem_id?: string | null
          tipo_derivacao?: string | null
          ativo?: boolean
          autor_id?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          tipo?: string
          repete_colecao?: string | null
          ancora?: string | null
          familia_id?: string | null
          variante_seletor?: Json | null
          variante_rotulo?: string | null
          variante_ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tmpl_bloco_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "tmpl_bloco"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tmpl_bloco_bloco_origem_id_fkey"
            columns: ["bloco_origem_id"]
            isOneToOne: false
            referencedRelation: "tmpl_bloco"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tmpl_bloco_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tmpl_bloco_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tmpl_bloco_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tmpl_bloco_escopo_documento_raiz_fk"
            columns: ["escopo_documento_raiz_id"]
            isOneToOne: false
            referencedRelation: "documento_gerado"
            referencedColumns: ["id"]
          }
        ]
      }
      tmpl_bloco_versao: {
        Row: {
          id: string
          bloco_id: string
          numero_versao: number
          caminho_arquivo: string | null
          checksum: string | null
          atual: boolean
          autor_id: string | null
          changelog: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
          conteudo: string | null
        }
        Insert: {
          id?: string
          bloco_id: string
          numero_versao: number
          caminho_arquivo?: string | null
          checksum?: string | null
          atual?: boolean
          autor_id?: string | null
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          conteudo?: string | null
        }
        Update: {
          id?: string
          bloco_id?: string
          numero_versao?: number
          caminho_arquivo?: string | null
          checksum?: string | null
          atual?: boolean
          autor_id?: string | null
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          conteudo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tmpl_bloco_versao_bloco_id_fkey"
            columns: ["bloco_id"]
            isOneToOne: false
            referencedRelation: "tmpl_bloco"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tmpl_bloco_versao_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tmpl_bloco_versao_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tmpl_bloco_versao_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      tmpl_bloco_flag: {
        Row: {
          bloco_id: string
          flag_id: string
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bloco_id: string
          flag_id: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bloco_id?: string
          flag_id?: string
          created_at?: string
          created_by?: string | null
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
          }
          {
            foreignKeyName: "tmpl_bloco_flag_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "tmpl_flag"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tmpl_bloco_flag_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tmpl_bloco_flag_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      tmpl_documento_bloco: {
        Row: {
          id: string
          documento_id: string
          bloco_id: string
          ordem: number
          obrigatorio: boolean
          observacao: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          documento_id: string
          bloco_id: string
          ordem: number
          obrigatorio?: boolean
          observacao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          documento_id?: string
          bloco_id?: string
          ordem?: number
          obrigatorio?: boolean
          observacao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tmpl_documento_bloco_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tmpl_documento_bloco_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "tmpl_documento"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tmpl_documento_bloco_bloco_id_fkey"
            columns: ["bloco_id"]
            isOneToOne: false
            referencedRelation: "tmpl_bloco"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "tmpl_documento_bloco_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      projeto_flag_valor: {
        Row: {
          id: string
          cliente_id: string
          pj_pessoa_id: string | null
          flag_id: string
          valor: boolean
          setado_por_id: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          cliente_id: string
          pj_pessoa_id?: string | null
          flag_id: string
          valor: boolean
          setado_por_id?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          cliente_id?: string
          pj_pessoa_id?: string | null
          flag_id?: string
          valor?: boolean
          setado_por_id?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projeto_flag_valor_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "projeto_flag_valor_pj_pessoa_id_fkey"
            columns: ["pj_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "projeto_flag_valor_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "tmpl_flag"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "projeto_flag_valor_setado_por_id_fkey"
            columns: ["setado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "projeto_flag_valor_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "projeto_flag_valor_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      documento_gerado: {
        Row: {
          id: string
          cliente_id: string
          pj_pessoa_id: string | null
          documento_template_id: string | null
          documento_anterior_id: string | null
          documento_raiz_id: string | null
          caminho_arquivo: string | null
          snapshot_flags: Json | null
          snapshot_dados: Json | null
          snapshot_versoes_blocos: Json | null
          status: string
          gerado_por_id: string | null
          gerado_em: string | null
          observacao: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
          snapshot_validado_em: string | null
        }
        Insert: {
          id?: string
          cliente_id: string
          pj_pessoa_id?: string | null
          documento_template_id?: string | null
          documento_anterior_id?: string | null
          documento_raiz_id?: string | null
          caminho_arquivo?: string | null
          snapshot_flags?: Json | null
          snapshot_dados?: Json | null
          snapshot_versoes_blocos?: Json | null
          status?: string
          gerado_por_id?: string | null
          gerado_em?: string | null
          observacao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          snapshot_validado_em?: string | null
        }
        Update: {
          id?: string
          cliente_id?: string
          pj_pessoa_id?: string | null
          documento_template_id?: string | null
          documento_anterior_id?: string | null
          documento_raiz_id?: string | null
          caminho_arquivo?: string | null
          snapshot_flags?: Json | null
          snapshot_dados?: Json | null
          snapshot_versoes_blocos?: Json | null
          status?: string
          gerado_por_id?: string | null
          gerado_em?: string | null
          observacao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          snapshot_validado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documento_gerado_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_gerado_pj_pessoa_id_fkey"
            columns: ["pj_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_gerado_documento_template_id_fkey"
            columns: ["documento_template_id"]
            isOneToOne: false
            referencedRelation: "tmpl_documento"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_gerado_documento_anterior_id_fkey"
            columns: ["documento_anterior_id"]
            isOneToOne: false
            referencedRelation: "documento_gerado"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_gerado_documento_raiz_id_fkey"
            columns: ["documento_raiz_id"]
            isOneToOne: false
            referencedRelation: "documento_gerado"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_gerado_gerado_por_id_fkey"
            columns: ["gerado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_gerado_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_gerado_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      documento_override: {
        Row: {
          id: string
          documento_gerado_id: string
          tipo: string
          bloco_alvo_id: string | null
          bloco_substituto_id: string | null
          ordem: number | null
          observacao: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          documento_gerado_id: string
          tipo: string
          bloco_alvo_id?: string | null
          bloco_substituto_id?: string | null
          ordem?: number | null
          observacao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          documento_gerado_id?: string
          tipo?: string
          bloco_alvo_id?: string | null
          bloco_substituto_id?: string | null
          ordem?: number | null
          observacao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documento_override_documento_gerado_id_fkey"
            columns: ["documento_gerado_id"]
            isOneToOne: false
            referencedRelation: "documento_gerado"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_override_bloco_alvo_id_fkey"
            columns: ["bloco_alvo_id"]
            isOneToOne: false
            referencedRelation: "tmpl_bloco"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_override_bloco_substituto_id_fkey"
            columns: ["bloco_substituto_id"]
            isOneToOne: false
            referencedRelation: "tmpl_bloco"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_override_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_override_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      administracao: {
        Row: {
          id: string
          pj_pessoa_id: string
          administrador_pessoa_id: string
          cargo: string | null
          pode_isoladamente: boolean | null
          data_inicio: string | null
          data_fim: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
          poderes: Json | null
        }
        Insert: {
          id?: string
          pj_pessoa_id: string
          administrador_pessoa_id: string
          cargo?: string | null
          pode_isoladamente?: boolean | null
          data_inicio?: string | null
          data_fim?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          poderes?: Json | null
        }
        Update: {
          id?: string
          pj_pessoa_id?: string
          administrador_pessoa_id?: string
          cargo?: string | null
          pode_isoladamente?: boolean | null
          data_inicio?: string | null
          data_fim?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          poderes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "administracao_pj_pessoa_id_fkey"
            columns: ["pj_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "administracao_administrador_pessoa_id_fkey"
            columns: ["administrador_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "administracao_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "administracao_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      quadro_societario: {
        Row: {
          id: string
          empresa_pessoa_id: string
          socio_pessoa_id: string
          quotas: number | null
          vlr_total: number | null
          percentual: number | null
          data_referencia: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          empresa_pessoa_id: string
          socio_pessoa_id: string
          quotas?: number | null
          vlr_total?: number | null
          percentual?: number | null
          data_referencia?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          empresa_pessoa_id?: string
          socio_pessoa_id?: string
          quotas?: number | null
          vlr_total?: number | null
          percentual?: number | null
          data_referencia?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quadro_societario_empresa_pessoa_id_fkey"
            columns: ["empresa_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "quadro_societario_socio_pessoa_id_fkey"
            columns: ["socio_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "quadro_societario_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "quadro_societario_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      capital_integralizacao: {
        Row: {
          id: string
          cliente_id: string
          bem_id: string
          socio_pessoa_id: string
          empresa_destino_pessoa_id: string
          vlr_mercado: number | null
          pct_vlr_mercado: number | null
          vlr_contabil: number | null
          pct_vlr_contabil: number | null
          vlr_capital_arredondado: number | null
          pct_capital: number | null
          reserva_capital: number | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          cliente_id: string
          bem_id: string
          socio_pessoa_id: string
          empresa_destino_pessoa_id: string
          vlr_mercado?: number | null
          pct_vlr_mercado?: number | null
          vlr_contabil?: number | null
          pct_vlr_contabil?: number | null
          vlr_capital_arredondado?: number | null
          pct_capital?: number | null
          reserva_capital?: number | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          cliente_id?: string
          bem_id?: string
          socio_pessoa_id?: string
          empresa_destino_pessoa_id?: string
          vlr_mercado?: number | null
          pct_vlr_mercado?: number | null
          vlr_contabil?: number | null
          pct_vlr_contabil?: number | null
          vlr_capital_arredondado?: number | null
          pct_capital?: number | null
          reserva_capital?: number | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_integralizacao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "capital_integralizacao_bem_id_fkey"
            columns: ["bem_id"]
            isOneToOne: false
            referencedRelation: "bem"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "capital_integralizacao_socio_pessoa_id_fkey"
            columns: ["socio_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "capital_integralizacao_empresa_destino_pessoa_id_fkey"
            columns: ["empresa_destino_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "capital_integralizacao_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "capital_integralizacao_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      projeto_justificativas: {
        Row: {
          id: string
          projeto_id: string
          justificativa: string
          ordem: number | null
          created_at: string
        }
        Insert: {
          id?: string
          projeto_id: string
          justificativa: string
          ordem?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          projeto_id?: string
          justificativa?: string
          ordem?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_justificativas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      documentos_processo: {
        Row: {
          id: string
          nome: string
          tipo: string | null
          categoria: string | null
          formato: string | null
          origem: string | null
          tempo_minutos: number | null
          estrutura_entrada: string | null
          estruturado: string | null
          canonico_id: string | null
          cluster_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          tipo?: string | null
          categoria?: string | null
          formato?: string | null
          origem?: string | null
          tempo_minutos?: number | null
          estrutura_entrada?: string | null
          estruturado?: string | null
          canonico_id?: string | null
          cluster_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          tipo?: string | null
          categoria?: string | null
          formato?: string | null
          origem?: string | null
          tempo_minutos?: number | null
          estrutura_entrada?: string | null
          estruturado?: string | null
          canonico_id?: string | null
          cluster_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_processo_canonico_id_fkey"
            columns: ["canonico_id"]
            isOneToOne: false
            referencedRelation: "documentos_processo"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documentos_processo_cluster_id_fk"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          }
        ]
      }
      sistemas_processo: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          tipo: string | null
          origem: string | null
          cluster_id: string | null
          custo_licenca_mensal: number | null
          custo_variavel_por_uso: number | null
          custo_por_operacao: number | null
          custo_setup: number | null
          tipo_custo: string | null
          obs_licenca: string | null
          obs_variavel: string | null
          obs_custo_por_operacao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          tipo?: string | null
          origem?: string | null
          cluster_id?: string | null
          custo_licenca_mensal?: number | null
          custo_variavel_por_uso?: number | null
          custo_por_operacao?: number | null
          custo_setup?: number | null
          tipo_custo?: string | null
          obs_licenca?: string | null
          obs_variavel?: string | null
          obs_custo_por_operacao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          tipo?: string | null
          origem?: string | null
          cluster_id?: string | null
          custo_licenca_mensal?: number | null
          custo_variavel_por_uso?: number | null
          custo_por_operacao?: number | null
          custo_setup?: number | null
          tipo_custo?: string | null
          obs_licenca?: string | null
          obs_variavel?: string | null
          obs_custo_por_operacao?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sistemas_processo_cluster_id_fk"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          }
        ]
      }
      etapa_responsaveis: {
        Row: {
          id: string
          etapa_id: string
          scenario: string
          responsavel_id: string
          papel: string
          horas: number | null
          created_at: string
        }
        Insert: {
          id?: string
          etapa_id: string
          scenario?: string
          responsavel_id: string
          papel: string
          horas?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          etapa_id?: string
          scenario?: string
          responsavel_id?: string
          papel?: string
          horas?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapa_responsaveis_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "etapa_responsaveis_etapa_fk"
            columns: ["etapa_id", "scenario"]
            isOneToOne: false
            referencedRelation: "process_stages"
            referencedColumns: ["id", "scenario"]
          }
        ]
      }
      etapa_sistemas: {
        Row: {
          id: string
          etapa_id: string
          scenario: string
          sistema_id: string
          rateio: number | null
          created_at: string
        }
        Insert: {
          id?: string
          etapa_id: string
          scenario?: string
          sistema_id: string
          rateio?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          etapa_id?: string
          scenario?: string
          sistema_id?: string
          rateio?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapa_sistemas_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "sistemas_processo"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "etapa_sistemas_etapa_fk"
            columns: ["etapa_id", "scenario"]
            isOneToOne: false
            referencedRelation: "process_stages"
            referencedColumns: ["id", "scenario"]
          }
        ]
      }
      etapa_documentos: {
        Row: {
          id: string
          etapa_id: string
          scenario: string
          documento_id: string
          sentido: string
          volume: number | null
          created_at: string
        }
        Insert: {
          id?: string
          etapa_id: string
          scenario?: string
          documento_id: string
          sentido: string
          volume?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          etapa_id?: string
          scenario?: string
          documento_id?: string
          sentido?: string
          volume?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapa_documentos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_processo"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "etapa_documentos_etapa_fk"
            columns: ["etapa_id", "scenario"]
            isOneToOne: false
            referencedRelation: "process_stages"
            referencedColumns: ["id", "scenario"]
          }
        ]
      }
      gargalos: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          origem: string | null
          cluster_id: string | null
          melhoria_id: string | null
          horas_gastas: number | null
          horas_implementacao: number | null
          taxa_ocorrencia: number | null
          taxa_captura_apos_melhoria: number | null
          custo_externo_unico: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          origem?: string | null
          cluster_id?: string | null
          melhoria_id?: string | null
          horas_gastas?: number | null
          horas_implementacao?: number | null
          taxa_ocorrencia?: number | null
          taxa_captura_apos_melhoria?: number | null
          custo_externo_unico?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          origem?: string | null
          cluster_id?: string | null
          melhoria_id?: string | null
          horas_gastas?: number | null
          horas_implementacao?: number | null
          taxa_ocorrencia?: number | null
          taxa_captura_apos_melhoria?: number | null
          custo_externo_unico?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gargalos_melhoria_id_fkey"
            columns: ["melhoria_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "gargalos_cluster_id_fk"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          }
        ]
      }
      gargalo_processos: {
        Row: {
          id: string
          gargalo_id: string
          processo_id: string
          created_at: string
        }
        Insert: {
          id?: string
          gargalo_id: string
          processo_id: string
          created_at?: string
        }
        Update: {
          id?: string
          gargalo_id?: string
          processo_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gargalo_processos_gargalo_id_fkey"
            columns: ["gargalo_id"]
            isOneToOne: false
            referencedRelation: "gargalos"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "gargalo_processos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          }
        ]
      }
      gargalo_responsaveis: {
        Row: {
          id: string
          gargalo_id: string
          responsavel_id: string
          horas: number | null
          created_at: string
        }
        Insert: {
          id?: string
          gargalo_id: string
          responsavel_id: string
          horas?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          gargalo_id?: string
          responsavel_id?: string
          horas?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gargalo_responsaveis_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "gargalo_responsaveis_gargalo_id_fkey"
            columns: ["gargalo_id"]
            isOneToOne: false
            referencedRelation: "gargalos"
            referencedColumns: ["id"]
          }
        ]
      }
      documento_horas_historico: {
        Row: {
          id: number
          documento_id: string
          horas_antes: number | null
          horas_depois: number | null
          alterado_por: string | null
          registrado_em: string
        }
        Insert: {
          id?: number
          documento_id: string
          horas_antes?: number | null
          horas_depois?: number | null
          alterado_por?: string | null
          registrado_em?: string
        }
        Update: {
          id?: number
          documento_id?: string
          horas_antes?: number | null
          horas_depois?: number | null
          alterado_por?: string | null
          registrado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_horas_historico_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_processo"
            referencedColumns: ["id"]
          }
        ]
      }
      sistema_clusters: {
        Row: {
          id: string
          sistema_id: string
          cluster_id: string
          rateio: number | null
          created_at: string
        }
        Insert: {
          id?: string
          sistema_id: string
          cluster_id: string
          rateio?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          sistema_id?: string
          cluster_id?: string
          rateio?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sistema_clusters_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "sistemas_processo"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "sistema_clusters_cluster_id_fk"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          }
        ]
      }
      sistema_responsaveis: {
        Row: {
          id: string
          sistema_id: string
          responsavel_id: string
          horas: number | null
          created_at: string
        }
        Insert: {
          id?: string
          sistema_id: string
          responsavel_id: string
          horas?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          sistema_id?: string
          responsavel_id?: string
          horas?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sistema_responsaveis_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "sistemas_processo"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "sistema_responsaveis_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          }
        ]
      }
      melhoria_processos: {
        Row: {
          id: string
          melhoria_id: string
          processo_id: string
          created_at: string
        }
        Insert: {
          id?: string
          melhoria_id: string
          processo_id: string
          created_at?: string
        }
        Update: {
          id?: string
          melhoria_id?: string
          processo_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "melhoria_processos_melhoria_id_fkey"
            columns: ["melhoria_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "melhoria_processos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          }
        ]
      }
      melhoria_sistemas: {
        Row: {
          id: string
          melhoria_id: string
          sistema_id: string
          rateio: number | null
          created_at: string
        }
        Insert: {
          id?: string
          melhoria_id: string
          sistema_id: string
          rateio?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          melhoria_id?: string
          sistema_id?: string
          rateio?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "melhoria_sistemas_melhoria_id_fkey"
            columns: ["melhoria_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "melhoria_sistemas_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "sistemas_processo"
            referencedColumns: ["id"]
          }
        ]
      }
      melhoria_responsaveis: {
        Row: {
          id: string
          melhoria_id: string
          responsavel_id: string
          papel: string
          horas: number | null
          created_at: string
        }
        Insert: {
          id?: string
          melhoria_id: string
          responsavel_id: string
          papel?: string
          horas?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          melhoria_id?: string
          responsavel_id?: string
          papel?: string
          horas?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "melhoria_responsaveis_melhoria_id_fkey"
            columns: ["melhoria_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "melhoria_responsaveis_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          }
        ]
      }
      melhoria_acoes_td: {
        Row: {
          id: string
          melhoria_id: string
          acao_td: string
          ordem: number | null
          created_at: string
        }
        Insert: {
          id?: string
          melhoria_id: string
          acao_td: string
          ordem?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          melhoria_id?: string
          acao_td?: string
          ordem?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "melhoria_acoes_td_melhoria_id_fkey"
            columns: ["melhoria_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          }
        ]
      }
      gargalo_etapas: {
        Row: {
          id: string
          gargalo_id: string
          etapa_id: string
          scenario: string
          created_at: string
        }
        Insert: {
          id?: string
          gargalo_id: string
          etapa_id: string
          scenario?: string
          created_at?: string
        }
        Update: {
          id?: string
          gargalo_id?: string
          etapa_id?: string
          scenario?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gargalo_etapas_gargalo_id_fkey"
            columns: ["gargalo_id"]
            isOneToOne: false
            referencedRelation: "gargalos"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "gargalo_etapas_etapa_fk"
            columns: ["etapa_id", "scenario"]
            isOneToOne: false
            referencedRelation: "process_stages"
            referencedColumns: ["id", "scenario"]
          }
        ]
      }
      gargalo_melhorias: {
        Row: {
          id: string
          gargalo_id: string
          melhoria_id: string
          created_at: string
        }
        Insert: {
          id?: string
          gargalo_id: string
          melhoria_id: string
          created_at?: string
        }
        Update: {
          id?: string
          gargalo_id?: string
          melhoria_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gargalo_melhorias_gargalo_id_fkey"
            columns: ["gargalo_id"]
            isOneToOne: false
            referencedRelation: "gargalos"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "gargalo_melhorias_melhoria_id_fkey"
            columns: ["melhoria_id"]
            isOneToOne: false
            referencedRelation: "process_improvements"
            referencedColumns: ["id"]
          }
        ]
      }
      documento_notificacao_visto: {
        Row: {
          user_id: string
          documento_gerado_id: string
          visto_em: string
        }
        Insert: {
          user_id: string
          documento_gerado_id: string
          visto_em?: string
        }
        Update: {
          user_id?: string
          documento_gerado_id?: string
          visto_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_notificacao_visto_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_notificacao_visto_documento_gerado_id_fkey"
            columns: ["documento_gerado_id"]
            isOneToOne: false
            referencedRelation: "documento_gerado"
            referencedColumns: ["id"]
          }
        ]
      }
      documento_arquivo: {
        Row: {
          id: string
          cliente_id: string
          fonte: unknown
          categoria: unknown
          bem_id: string | null
          matricula_id: string | null
          pessoa_id: string | null
          documento_gerado_id: string | null
          nome_original: string
          gcs_uri: string | null
          checksum: string | null
          mime: string | null
          tamanho: number | null
          status: unknown
          excluido: boolean
          ambiente: string
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
          checklist_item_id: string | null
          area: unknown | null
          solicitacao_id: string | null
          triado_em: string | null
          triado_por: string | null
          documento_tipo_id: string | null
          revisao: unknown
          revisao_em: string | null
          revisao_por: string | null
          revisao_motivo: string | null
        }
        Insert: {
          id?: string
          cliente_id: string
          fonte?: unknown
          categoria: unknown
          bem_id?: string | null
          matricula_id?: string | null
          pessoa_id?: string | null
          documento_gerado_id?: string | null
          nome_original: string
          gcs_uri?: string | null
          checksum?: string | null
          mime?: string | null
          tamanho?: number | null
          status?: unknown
          excluido?: boolean
          ambiente?: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          checklist_item_id?: string | null
          area?: unknown | null
          solicitacao_id?: string | null
          triado_em?: string | null
          triado_por?: string | null
          documento_tipo_id?: string | null
          revisao?: unknown
          revisao_em?: string | null
          revisao_por?: string | null
          revisao_motivo?: string | null
        }
        Update: {
          id?: string
          cliente_id?: string
          fonte?: unknown
          categoria?: unknown
          bem_id?: string | null
          matricula_id?: string | null
          pessoa_id?: string | null
          documento_gerado_id?: string | null
          nome_original?: string
          gcs_uri?: string | null
          checksum?: string | null
          mime?: string | null
          tamanho?: number | null
          status?: unknown
          excluido?: boolean
          ambiente?: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          checklist_item_id?: string | null
          area?: unknown | null
          solicitacao_id?: string | null
          triado_em?: string | null
          triado_por?: string | null
          documento_tipo_id?: string | null
          revisao?: unknown
          revisao_em?: string | null
          revisao_por?: string | null
          revisao_motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documento_arquivo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_arquivo_bem_id_fkey"
            columns: ["bem_id"]
            isOneToOne: false
            referencedRelation: "bem"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_arquivo_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matricula"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_arquivo_documento_tipo_id_fkey"
            columns: ["documento_tipo_id"]
            isOneToOne: false
            referencedRelation: "documento_tipo"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_arquivo_revisao_por_fkey"
            columns: ["revisao_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_arquivo_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_arquivo_documento_gerado_id_fkey"
            columns: ["documento_gerado_id"]
            isOneToOne: false
            referencedRelation: "documento_gerado"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_arquivo_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacao"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_arquivo_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_cliente_item"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_arquivo_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "cobertura_documentos_cliente"
            referencedColumns: ["checklist_item_id"]
          }
        ]
      }
      dashboards: {
        Row: {
          id: string
          name: string
          embed_url: string
          param_names: string[]
          filter_type: string
          target_page: string | null
          is_active: boolean
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
          sop_url: string | null
          min_role: unknown | null
          grupo: string | null
          all_clusters: boolean
        }
        Insert: {
          id?: string
          name: string
          embed_url: string
          param_names?: string[]
          filter_type?: string
          target_page?: string | null
          is_active?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          sop_url?: string | null
          min_role?: unknown | null
          grupo?: string | null
          all_clusters?: boolean
        }
        Update: {
          id?: string
          name?: string
          embed_url?: string
          param_names?: string[]
          filter_type?: string
          target_page?: string | null
          is_active?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          sop_url?: string | null
          min_role?: unknown | null
          grupo?: string | null
          all_clusters?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "dashboards_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      roi_snapshots: {
        Row: {
          id: string
          checkpoint_id: string
          scope_kind: string
          scope_id: string | null
          process_id: string
          label: string | null
          snapshot_at: string
          annual_cost: number | null
          annual_hours: number | null
          annual_savings: number | null
          roi_percent: number | null
          payback_months: number | null
          hours_freed: number | null
          investment: number | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          checkpoint_id: string
          scope_kind: string
          scope_id?: string | null
          process_id: string
          label?: string | null
          snapshot_at?: string
          annual_cost?: number | null
          annual_hours?: number | null
          annual_savings?: number | null
          roi_percent?: number | null
          payback_months?: number | null
          hours_freed?: number | null
          investment?: number | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          checkpoint_id?: string
          scope_kind?: string
          scope_id?: string | null
          process_id?: string
          label?: string | null
          snapshot_at?: string
          annual_cost?: number | null
          annual_hours?: number | null
          annual_savings?: number | null
          roi_percent?: number | null
          payback_months?: number | null
          hours_freed?: number | null
          investment?: number | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roi_snapshots_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "roi_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      dashboard_cluster_access: {
        Row: {
          id: string
          dashboard_id: string
          cluster_id: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          dashboard_id: string
          cluster_id: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          dashboard_id?: string
          cluster_id?: string
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_cluster_access_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "dashboard_cluster_access_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "estrutura_clusters"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "dashboard_cluster_access_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      dashboard_cliente_access: {
        Row: {
          id: string
          dashboard_id: string
          cliente_id: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          dashboard_id: string
          cliente_id: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          dashboard_id?: string
          cliente_id?: string
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_cliente_access_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "dashboard_cliente_access_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "dashboard_cliente_access_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      documento_tipo: {
        Row: {
          id: string
          codigo: string
          modulo: string
          entidade: string
          documento: string
          nota: string | null
          categoria: unknown | null
          categoria_docbox: string | null
          confidencial: boolean
          obrigatorio_default: boolean
          granularidade: string
          ordem: number
          ativo: boolean
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
          grupo: unknown
          cliente_id: string | null
          solicitacao_item_id: string | null
        }
        Insert: {
          id?: string
          codigo: string
          modulo: string
          entidade: string
          documento: string
          nota?: string | null
          categoria?: unknown | null
          categoria_docbox?: string | null
          confidencial?: boolean
          obrigatorio_default?: boolean
          granularidade?: string
          ordem?: number
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          grupo: unknown
          cliente_id?: string | null
          solicitacao_item_id?: string | null
        }
        Update: {
          id?: string
          codigo?: string
          modulo?: string
          entidade?: string
          documento?: string
          nota?: string | null
          categoria?: unknown | null
          categoria_docbox?: string | null
          confidencial?: boolean
          obrigatorio_default?: boolean
          granularidade?: string
          ordem?: number
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
          grupo?: unknown
          cliente_id?: string | null
          solicitacao_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documento_tipo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "documento_tipo_solicitacao_item_id_fkey"
            columns: ["solicitacao_item_id"]
            isOneToOne: false
            referencedRelation: "solicitacao_item"
            referencedColumns: ["id"]
          }
        ]
      }
      checklist_cliente_item: {
        Row: {
          id: string
          cliente_id: string
          item_padrao_id: string | null
          modulo: string
          entidade: string
          documento: string
          nota: string | null
          categoria: unknown | null
          categoria_docbox: string | null
          confidencial: boolean
          obrigatorio: boolean
          origem: unknown
          status: unknown
          pessoa_id: string | null
          bem_id: string | null
          matricula_id: string | null
          observacao: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          cliente_id: string
          item_padrao_id?: string | null
          modulo: string
          entidade: string
          documento: string
          nota?: string | null
          categoria?: unknown | null
          categoria_docbox?: string | null
          confidencial?: boolean
          obrigatorio?: boolean
          origem?: unknown
          status?: unknown
          pessoa_id?: string | null
          bem_id?: string | null
          matricula_id?: string | null
          observacao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          cliente_id?: string
          item_padrao_id?: string | null
          modulo?: string
          entidade?: string
          documento?: string
          nota?: string | null
          categoria?: unknown | null
          categoria_docbox?: string | null
          confidencial?: boolean
          obrigatorio?: boolean
          origem?: unknown
          status?: unknown
          pessoa_id?: string | null
          bem_id?: string | null
          matricula_id?: string | null
          observacao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_cliente_item_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "checklist_cliente_item_item_padrao_id_fkey"
            columns: ["item_padrao_id"]
            isOneToOne: false
            referencedRelation: "documento_tipo"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "checklist_cliente_item_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "checklist_cliente_item_bem_id_fkey"
            columns: ["bem_id"]
            isOneToOne: false
            referencedRelation: "bem"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "checklist_cliente_item_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matricula"
            referencedColumns: ["id"]
          }
        ]
      }
      exploracao_rural: {
        Row: {
          id: string
          cliente_id: string
          referencia: string | null
          tipo_exploracao: unknown
          bem_id: string | null
          imovel_descricao: string | null
          matricula_texto: string | null
          municipio: string | null
          uf: string | null
          area_total: number | null
          area_explorada: number | null
          area_unidade: string
          explorador_pessoa_id: string | null
          explorador_nome: string | null
          outorgante_pessoa_id: string | null
          outorgante_nome: string | null
          declarado_irpf: boolean
          data_assinatura: string | null
          data_encerramento: string | null
          vigencia: string | null
          sacas_por_hectare: number | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          cliente_id: string
          referencia?: string | null
          tipo_exploracao: unknown
          bem_id?: string | null
          imovel_descricao?: string | null
          matricula_texto?: string | null
          municipio?: string | null
          uf?: string | null
          area_total?: number | null
          area_explorada?: number | null
          area_unidade?: string
          explorador_pessoa_id?: string | null
          explorador_nome?: string | null
          outorgante_pessoa_id?: string | null
          outorgante_nome?: string | null
          declarado_irpf?: boolean
          data_assinatura?: string | null
          data_encerramento?: string | null
          vigencia?: string | null
          sacas_por_hectare?: number | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          cliente_id?: string
          referencia?: string | null
          tipo_exploracao?: unknown
          bem_id?: string | null
          imovel_descricao?: string | null
          matricula_texto?: string | null
          municipio?: string | null
          uf?: string | null
          area_total?: number | null
          area_explorada?: number | null
          area_unidade?: string
          explorador_pessoa_id?: string | null
          explorador_nome?: string | null
          outorgante_pessoa_id?: string | null
          outorgante_nome?: string | null
          declarado_irpf?: boolean
          data_assinatura?: string | null
          data_encerramento?: string | null
          vigencia?: string | null
          sacas_por_hectare?: number | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exploracao_rural_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "exploracao_rural_bem_id_fkey"
            columns: ["bem_id"]
            isOneToOne: false
            referencedRelation: "bem"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "exploracao_rural_explorador_pessoa_id_fkey"
            columns: ["explorador_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "exploracao_rural_outorgante_pessoa_id_fkey"
            columns: ["outorgante_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
        ]
      }
      org_comments: {
        Row: {
          id: string
          entity_type: unknown
          entity_id: string
          project_id: string
          parent_id: string | null
          kind: unknown
          body: string
          metadata: Json
          author_id: string | null
          author_name: string | null
          editado_em: string | null
          excluido: boolean
          excluido_em: string | null
          excluido_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          entity_type: unknown
          entity_id: string
          project_id: string
          parent_id?: string | null
          kind?: unknown
          body: string
          metadata?: Json
          author_id?: string | null
          author_name?: string | null
          editado_em?: string | null
          excluido?: boolean
          excluido_em?: string | null
          excluido_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          entity_type?: unknown
          entity_id?: string
          project_id?: string
          parent_id?: string | null
          kind?: unknown
          body?: string
          metadata?: Json
          author_id?: string | null
          author_name?: string | null
          editado_em?: string | null
          excluido?: boolean
          excluido_em?: string | null
          excluido_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "org_projects"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_comments"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_comments_excluido_por_fkey"
            columns: ["excluido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_comments_feed"
            referencedColumns: ["id"]
          }
        ]
      }
      org_comment_mentions: {
        Row: {
          id: string
          comment_id: string
          mentioned_user_id: string
          lido_em: string | null
          created_at: string
          motivo: string
        }
        Insert: {
          id?: string
          comment_id: string
          mentioned_user_id: string
          lido_em?: string | null
          created_at?: string
          motivo?: string
        }
        Update: {
          id?: string
          comment_id?: string
          mentioned_user_id?: string
          lido_em?: string | null
          created_at?: string
          motivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "org_comments"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_comment_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "org_comments_feed"
            referencedColumns: ["id"]
          }
        ]
      }
      org_comment_attachments: {
        Row: {
          id: string
          comment_id: string
          file_path: string
          file_name: string
          file_size: number
          file_type: string | null
          width: number | null
          height: number | null
          uploaded_by: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          file_path: string
          file_name: string
          file_size: number
          file_type?: string | null
          width?: number | null
          height?: number | null
          uploaded_by?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          file_path?: string
          file_name?: string
          file_size?: number
          file_type?: string | null
          width?: number | null
          height?: number | null
          uploaded_by?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_comment_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "org_comments"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_comment_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_comment_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "org_comments_feed"
            referencedColumns: ["id"]
          }
        ]
      }
      produto_documento_tipo: {
        Row: {
          id: string
          produto_segmento_id: string
          item_padrao_id: string
          obrigatorio: boolean
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          produto_segmento_id: string
          item_padrao_id: string
          obrigatorio?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          produto_segmento_id?: string
          item_padrao_id?: string
          obrigatorio?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_documento_tipo_item_padrao_id_fkey"
            columns: ["item_padrao_id"]
            isOneToOne: false
            referencedRelation: "documento_tipo"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "produto_documento_tipo_produto_segmento_id_fkey"
            columns: ["produto_segmento_id"]
            isOneToOne: false
            referencedRelation: "produto_segmento"
            referencedColumns: ["id"]
          }
        ]
      }
      solicitacao: {
        Row: {
          id: string
          cliente_id: string
          ordem_servico_id: string | null
          status: unknown
          enviada_em: string | null
          encerrada_em: string | null
          observacao: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          cliente_id: string
          ordem_servico_id?: string | null
          status?: unknown
          enviada_em?: string | null
          encerrada_em?: string | null
          observacao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          cliente_id?: string
          ordem_servico_id?: string | null
          status?: unknown
          enviada_em?: string | null
          encerrada_em?: string | null
          observacao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "solicitacao_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordem_servico"
            referencedColumns: ["id"]
          }
        ]
      }
      solicitacao_item: {
        Row: {
          id: string
          solicitacao_id: string
          item_padrao_id: string | null
          granularidade: string
          grupo: unknown
          documento: string | null
          entidade: string | null
          nota: string | null
          status: unknown
          ordem: number
          observacao: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          solicitacao_id: string
          item_padrao_id?: string | null
          granularidade: string
          grupo: unknown
          documento?: string | null
          entidade?: string | null
          nota?: string | null
          status?: unknown
          ordem?: number
          observacao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          solicitacao_id?: string
          item_padrao_id?: string | null
          granularidade?: string
          grupo?: unknown
          documento?: string | null
          entidade?: string | null
          nota?: string | null
          status?: unknown
          ordem?: number
          observacao?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacao_item_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacao"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "solicitacao_item_item_padrao_id_fkey"
            columns: ["item_padrao_id"]
            isOneToOne: false
            referencedRelation: "documento_tipo"
            referencedColumns: ["id"]
          }
        ]
      }
      bkp_20260807_ticket_messages_dup: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          is_admin: boolean | null
          message: string
          created_at: string | null
          copia_numero: number
          segundos_apos: number
          backup_em: string
        }
        Insert: {
          id: string
          ticket_id: string
          user_id: string
          is_admin?: boolean | null
          message: string
          created_at?: string | null
          copia_numero: number
          segundos_apos: number
          backup_em?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string
          is_admin?: boolean | null
          message?: string
          created_at?: string | null
          copia_numero?: number
          segundos_apos?: number
          backup_em?: string
        }
        Relationships: [

        ]
      }
      solicitacao_item_nao_aplicavel: {
        Row: {
          id: string
          solicitacao_item_id: string
          cliente_id: string
          pessoa_id: string | null
          bem_id: string | null
          matricula_id: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          solicitacao_item_id: string
          cliente_id: string
          pessoa_id?: string | null
          bem_id?: string | null
          matricula_id?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          solicitacao_item_id?: string
          cliente_id?: string
          pessoa_id?: string | null
          bem_id?: string | null
          matricula_id?: string | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacao_item_nao_aplicavel_solicitacao_item_id_fkey"
            columns: ["solicitacao_item_id"]
            isOneToOne: false
            referencedRelation: "solicitacao_item"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "solicitacao_item_nao_aplicavel_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "solicitacao_item_nao_aplicavel_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoa"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "solicitacao_item_nao_aplicavel_bem_id_fkey"
            columns: ["bem_id"]
            isOneToOne: false
            referencedRelation: "bem"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "solicitacao_item_nao_aplicavel_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matricula"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "solicitacao_item_nao_aplicavel_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      sprint_deliverables_backup_20260809: {
        Row: {
          id: string | null
          sprint_id: string | null
          task_code: string | null
          title: string | null
          description: string | null
          salvo_em: string | null
        }
        Insert: {
          id?: string | null
          sprint_id?: string | null
          task_code?: string | null
          title?: string | null
          description?: string | null
          salvo_em?: string | null
        }
        Update: {
          id?: string | null
          sprint_id?: string | null
          task_code?: string | null
          title?: string | null
          description?: string | null
          salvo_em?: string | null
        }
        Relationships: [

        ]
      }
      notificacao: {
        Row: {
          id: string
          destinatario_id: string
          tipo: unknown
          titulo: string
          corpo: string | null
          entidade_tipo: string
          entidade_id: string
          href: string | null
          agrupamento_chave: string
          quantidade: number
          metadata: Json
          lido_em: string | null
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          destinatario_id: string
          tipo: unknown
          titulo: string
          corpo?: string | null
          entidade_tipo: string
          entidade_id: string
          href?: string | null
          agrupamento_chave: string
          quantidade?: number
          metadata?: Json
          lido_em?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          destinatario_id?: string
          tipo?: unknown
          titulo?: string
          corpo?: string | null
          entidade_tipo?: string
          entidade_id?: string
          href?: string | null
          agrupamento_chave?: string
          quantidade?: number
          metadata?: Json
          lido_em?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacao_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notificacao_envio: {
        Row: {
          id: string
          notificacao_id: string | null
          canal: unknown
          tipo: unknown
          entidade_tipo: string
          entidade_id: string
          agrupamento_chave: string | null
          destinatario_id: string | null
          destinatario_email: string | null
          destinatario_telefone: string | null
          destinatario_papel: string | null
          sucesso: boolean
          erro: string | null
          metadata: Json
          enviado_em: string | null
          status: unknown
          entregue_em: string | null
          lido_em: string | null
          erro_codigo: string | null
          chave_idempotencia: string | null
          provedor_message_id: string | null
        }
        Insert: {
          id?: string
          notificacao_id?: string | null
          canal: unknown
          tipo: unknown
          entidade_tipo: string
          entidade_id: string
          agrupamento_chave?: string | null
          destinatario_id?: string | null
          destinatario_email?: string | null
          destinatario_telefone?: string | null
          destinatario_papel?: string | null
          sucesso?: boolean
          erro?: string | null
          metadata?: Json
          enviado_em?: string | null
          status?: unknown
          entregue_em?: string | null
          lido_em?: string | null
          erro_codigo?: string | null
          chave_idempotencia?: string | null
          provedor_message_id?: string | null
        }
        Update: {
          id?: string
          notificacao_id?: string | null
          canal?: unknown
          tipo?: unknown
          entidade_tipo?: string
          entidade_id?: string
          agrupamento_chave?: string | null
          destinatario_id?: string | null
          destinatario_email?: string | null
          destinatario_telefone?: string | null
          destinatario_papel?: string | null
          sucesso?: boolean
          erro?: string | null
          metadata?: Json
          enviado_em?: string | null
          status?: unknown
          entregue_em?: string | null
          lido_em?: string | null
          erro_codigo?: string | null
          chave_idempotencia?: string | null
          provedor_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacao_envio_notificacao_id_fkey"
            columns: ["notificacao_id"]
            isOneToOne: false
            referencedRelation: "notificacao"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "notificacao_envio_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      produto_tarefa_padrao: {
        Row: {
          id: string
          produto_segmento_id: string
          titulo: string
          descricao: string | null
          ordem: number
          papel_responsavel: string
          dias_offset: number
          horas_estimadas: number | null
          ativo: boolean
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          produto_segmento_id: string
          titulo: string
          descricao?: string | null
          ordem: number
          papel_responsavel?: string
          dias_offset?: number
          horas_estimadas?: number | null
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          produto_segmento_id?: string
          titulo?: string
          descricao?: string | null
          ordem?: number
          papel_responsavel?: string
          dias_offset?: number
          horas_estimadas?: number | null
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_tarefa_padrao_produto_segmento_id_fkey"
            columns: ["produto_segmento_id"]
            isOneToOne: false
            referencedRelation: "produto_segmento"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      sprint_resumo: {
        Row: {
          sprint_id: string | null
          horas_alocadas: number | null
          custo_economizado_mensal: number | null
          horas_liberadas: number | null
          melhorias: number | null
        }
        Relationships: [

        ]
      }
      per_with_contribuinte: {
        Row: {
          nr_per: string | null
          exercicio: number | null
          tri_exercicio: number | null
          dt_solicitada: string | null
          tp_credito: string | null
          vlr_credito: number | null
          nr_proc_ret: string | null
          criado_em: string | null
          criado_por: string | null
          id_contribuinte: string | null
          atualizado_em: string | null
          atualizado_por: string | null
          vlr_ressarcido: number | null
          porcentagem_psa: number | null
          contribuinte_nome: string | null
          contribuinte_ambiente: string | null
        }
        Relationships: [
          {
            foreignKeyName: "per_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "per_nr_proc_ret_fkey"
            columns: ["nr_proc_ret"]
            isOneToOne: false
            referencedRelation: "per"
            referencedColumns: ["nr_per"]
          }
          {
            foreignKeyName: "per_nr_proc_ret_fkey"
            columns: ["nr_proc_ret"]
            isOneToOne: false
            referencedRelation: "per_with_contribuinte"
            referencedColumns: ["nr_per"]
          }
        ]
      }
      org_comments_feed: {
        Row: {
          id: string | null
          entity_type: unknown | null
          entity_id: string | null
          project_id: string | null
          parent_id: string | null
          kind: unknown | null
          body: string | null
          metadata: Json | null
          author_id: string | null
          author_name: string | null
          editado_em: string | null
          created_at: string | null
          updated_at: string | null
          entity_title: string | null
          project_name: string | null
          reply_count: number | null
          attachment_count: number | null
          excluido: boolean | null
          client_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "org_projects"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_comments"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_comments_feed"
            referencedColumns: ["id"]
          }
          {
            foreignKeyName: "org_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      cobertura_documentos_cliente: {
        Row: {
          cliente_id: string | null
          checklist_item_id: string | null
          entidade_tipo: string | null
          entidade_id: string | null
          entidade_rotulo: string | null
          entidade_catalogo: string | null
          modulo: string | null
          documento: string | null
          categoria: unknown | null
          obrigatorio: boolean | null
          status: unknown | null
          arquivos_vinculados: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_cliente_item_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles_safe: {
        Row: {
          id: string | null
          first_name: string | null
          last_name: string | null
        }
        Relationships: [

        ]
      }
      cliente_setor_regiao_atual: {
        Row: {
          id_cliente: string | null
          setor_cliente: string | null
          setor_cliente_id: string | null
          regiao: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordem_servico_setor_cliente_id_fkey"
            columns: ["setor_cliente_id"]
            isOneToOne: false
            referencedRelation: "setor_cliente"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_project_member: {
        Args: {
          _user_id: string
          _project_id: string
        }
        Returns: boolean
      }
      is_area_member: {
        Args: {
          _user_id: string
          _estrutura_area_id: string
        }
        Returns: boolean
      }
      get_ordens_by_client_name: {
        Args: {
          p_client_id: string
        }
        Returns: Database["public"]["Tables"]["ordem_servico"]["Row"][]
      }
      get_profiles_with_email: {
        Args: {
        }
        Returns: { id: string; first_name: string; last_name: string; email: string }[]
      }
      is_ticket_assigned_to: {
        Args: {
          p_ticket_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      has_role_or_higher: {
        Args: {
          _user_id: string
          _minimum_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      get_internal_users: {
        Args: {
        }
        Returns: { id: string; first_name: string; last_name: string }[]
      }
      user_estrutura_area_ids: {
        Args: {
          _user_id: string
        }
        Returns: string
      }
      user_estrutura_equipe_ids: {
        Args: {
          _user_id: string
        }
        Returns: string
      }
      can_view_org_project: {
        Args: {
          _user_id: string
          _project_id: string
        }
        Returns: boolean
      }
      get_profiles_with_min_role: {
        Args: {
          _minimum_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: { id: string; first_name: string; last_name: string; email: string }[]
      }
      can_perform: {
        Args: {
          p_table: string
          p_op: string
          p_id: string
        }
        Returns: Json
      }
      criar_matricula_com_titular: {
        Args: {
          matricula_data: Json
          titular_data: Json
        }
        Returns: Database["public"]["Tables"]["matricula"]["Row"]
      }
      mark_stuck_procedimentos: {
        Args: {
          timeout_minutes?: number
        }
        Returns: number
      }
      criar_bem_com_titular: {
        Args: {
          bem_data: Json
          titular_data: Json
        }
        Returns: Database["public"]["Tables"]["bem"]["Row"]
      }
      mapa_uuid: {
        Args: {
          slug: string
        }
        Returns: string
      }
      psa_mapa_uuid: {
        Args: {
          slug: string
        }
        Returns: string
      }
      resolve_user_cluster_ids: {
        Args: {
          _uid: string
        }
        Returns: string[]
      }
      resolve_user_cliente_id: {
        Args: {
          _uid: string
        }
        Returns: string
      }
      get_dashboard_embed_url: {
        Args: {
          _dashboard_id: string
        }
        Returns: Json
      }
      preview_dashboard_embed_url: {
        Args: {
          _dashboard_id: string
          _mode: string
          _cluster_ids?: string[]
          _user_id?: string
          _cliente_id?: string
        }
        Returns: Json
      }
      get_accessible_dashboards: {
        Args: {
          _target_page?: string
        }
        Returns: { id: string; name: string; filter_type: string; target_page: string; sop_url: string }[]
      }
      get_cluster_members: {
        Args: {
          _cluster_id: string
        }
        Returns: { id: string; first_name: string; last_name: string }[]
      }
      org_project_cluster_ids: {
        Args: {
          _project_id: string
        }
        Returns: string[]
      }
      dashboard_project_ids_for_cluster: {
        Args: {
          _cluster_id: string
          _include_orphans?: boolean
        }
        Returns: string
      }
      cliente_visivel_para: {
        Args: {
          _cliente_id: string
        }
        Returns: boolean
      }
      cliente_id_de_pessoa: {
        Args: {
          _pessoa_id: string
        }
        Returns: string
      }
      cliente_id_de_bem: {
        Args: {
          _bem_id: string
        }
        Returns: string
      }
      cliente_id_de_matricula: {
        Args: {
          _matricula_id: string
        }
        Returns: string
      }
      is_membro_digital: {
        Args: {
          p_uid: string
        }
        Returns: boolean
      }
      sprint_visivel: {
        Args: {
          p_sprint_id: string
        }
        Returns: boolean
      }
      org_task_visivel: {
        Args: {
          p_task_id: string
        }
        Returns: boolean
      }
      can_view_contribuinte: {
        Args: {
          _uid: string
          _contribuinte_id: string
        }
        Returns: boolean
      }
      can_view_ticket: {
        Args: {
          _ticket_id: string
        }
        Returns: boolean
      }
      get_ticket_atendentes: {
        Args: {
          _ticket_ids: string[]
        }
        Returns: { ticket_id: string; first_name: string; last_name: string }[]
      }
      get_clusters_do_cliente_atual: {
        Args: {
        }
        Returns: { cliente_id: string; cluster_id: string; cluster_name: string }[]
      }
      process_stage_cluster_visivel: {
        Args: {
          _etapa_id: string
        }
        Returns: boolean
      }
      gargalo_cluster_visivel: {
        Args: {
          _gargalo_id: string
        }
        Returns: boolean
      }
      is_valid_org_task_reviewer: {
        Args: {
          _reviewer_id: string
          _project_id: string
          _assigned_to: string
        }
        Returns: boolean
      }
      melhoria_cluster_visivel: {
        Args: {
          _melhoria_id: string
        }
        Returns: boolean
      }
      sistema_cluster_visivel: {
        Args: {
          _sistema_id: string
        }
        Returns: boolean
      }
      criar_cliente_com_clusters: {
        Args: {
          p_cliente: Json
          p_cluster_ids: string[]
        }
        Returns: Json
      }
      list_profiles_safe: {
        Args: {
        }
        Returns: { id: string; first_name: string; last_name: string }[]
      }
      get_uploader_names: {
        Args: {
          _ids: string[]
        }
        Returns: { user_id: string; display_name: string }[]
      }
      soft_delete_documento_cliente: {
        Args: {
          _id: string
        }
        Returns: undefined
      }
      get_checklist_solicitado_cliente: {
        Args: {
        }
        Returns: { item_id: string; documento: string; entidade: string; categoria: string; categoria_docbox: string; nota: string; confidencial: boolean; rotulo_instancia: string; recebido: boolean; arquivo_nome: string }[]
      }
      anexar_documento_solicitado: {
        Args: {
          _item_id: string
          _gcs_uri: string
          _checksum: string
          _tamanho: number
          _mime: string
          _nome_original: string
          _ambiente: string
        }
        Returns: string
      }
      visible_org_project_ids: {
        Args: {
          _uid: string
        }
        Returns: string[]
      }
      own_org_task_ids: {
        Args: {
          _uid: string
        }
        Returns: string[]
      }
      gerar_solicitacao_os: {
        Args: {
          _cliente_id: string
          _ordem_servico_id: string
        }
        Returns: number
      }
      feed_org_comments: {
        Args: {
          _cursor_created_at?: string
          _cursor_id?: string
          _limit?: number
          _client_ids?: string[]
          _project_ids?: string[]
          _author_ids?: string[]
          _only_mentions?: boolean
          _since?: string
        }
        Returns: Database["public"]["Tables"]["org_comments_feed"]["Row"][]
      }
      criar_org_comment: {
        Args: {
          _id: string
          _entity_type: Database["public"]["Enums"]["org_comment_entity"]
          _entity_id: string
          _parent_id: string
          _body: string
          _mentions: string[]
          _attachments: Json
          _respondido_id?: string
        }
        Returns: string
      }
      pode_gerenciar_novidades: {
        Args: {
          _user_id: string
        }
        Returns: boolean
      }
      precheck_allowed_ops: {
        Args: {
          p_table: string
        }
        Returns: string[]
      }
      criar_notificacao: {
        Args: {
          _destinatario_id: string
          _tipo: Database["public"]["Enums"]["notificacao_tipo"]
          _titulo: string
          _entidade_tipo: string
          _entidade_id: string
          _corpo?: string
          _href?: string
          _agrupamento?: string
          _metadata?: Json
        }
        Returns: string
      }
      registrar_envio: {
        Args: {
          _canal: Database["public"]["Enums"]["notificacao_canal"]
          _tipo: Database["public"]["Enums"]["notificacao_tipo"]
          _entidade_tipo: string
          _entidade_id: string
          _notificacao_id?: string
          _destinatario_id?: string
          _email?: string
          _telefone?: string
          _papel?: string
          _agrupamento?: string
          _sucesso?: boolean
          _erro?: string
          _metadata?: Json
        }
        Returns: string
      }
      destinatarios_cliente: {
        Args: {
          _cliente_id: string
        }
        Returns: { user_id: string; nome: string; email: string; telefone: string }[]
      }
      sublider_na_os: {
        Args: {
          _ordem_servico_id: string
        }
        Returns: boolean
      }
      nome_cliente_normalizado: {
        Args: {
          p_nome: string
        }
        Returns: string
      }
      anexar_documento_pendencia: {
        Args: {
          _solicitacao_item_id: string
          _alvo_kind: string
          _alvo_id: string
          _categoria: string
          _gcs_uri: string
          _checksum: string
          _tamanho: number
          _mime: string
          _nome_original: string
          _ambiente: string
        }
        Returns: string
      }
      revisar_documento_pendencia: {
        Args: {
          _documento_id: string
          _veredito: string
          _motivo?: string
        }
        Returns: undefined
      }
      reservar_envio: {
        Args: {
          _chave: string
          _canal: Database["public"]["Enums"]["notificacao_canal"]
          _tipo: Database["public"]["Enums"]["notificacao_tipo"]
          _entidade_tipo: string
          _entidade_id: string
          _destinatario_id?: string
          _email?: string
          _telefone?: string
          _papel?: string
          _metadata?: Json
        }
        Returns: string
      }
      confirmar_envio: {
        Args: {
          _id: string
          _status: Database["public"]["Enums"]["notificacao_envio_status"]
          _provedor_message_id?: string
          _erro_codigo?: string
          _erro?: string
        }
        Returns: undefined
      }
      gerar_tarefas_projeto: {
        Args: {
          _project_id: string
        }
        Returns: number
      }
      fechar_chamados_resolvidos_sem_resposta: {
        Args: {
        }
        Returns: number
      }
      get_solicitacao_ativa_cliente: {
        Args: {
        }
        Returns: Json
      }
      get_pendencias_documentos_cliente: {
        Args: {
        }
        Returns: Json
      }
      ve_todas_as_sprints: {
        Args: {
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        "admin" |
        "client" |
        "team_member" |
        "lider" |
        "sublider" |
        "timecliente" |
        "marketing"
      work_cluster:
        "database" |
        "frontend" |
        "management"
      task_priority:
        "low" |
        "medium" |
        "high" |
        "urgent"
      work_package_type:
        "fase" |
        "tarefa" |
        "epico"
      work_package_status:
        "novo" |
        "pendente_agendamento" |
        "agendado" |
        "em_progresso" |
        "em_revisao" |
        "concluido" |
        "rejeitado"
      work_package_priority:
        "alta" |
        "normal" |
        "baixa"
      work_package_area:
        "fiscal" |
        "osg" |
        "fixos" |
        "pontuais"
      work_package_stage:
        "solicitacao_documentos" |
        "analise_documentacao" |
        "elaboracao_wp" |
        "elaboracao_relatorios" |
        "entrega_cliente" |
        "conclusao"
      work_package_relation_type:
        "filho" |
        "relacionado" |
        "anterior" |
        "sucessor" |
        "pai" |
        "duplicado"
      work_package_activity_type:
        "status_change" |
        "assignment" |
        "comment" |
        "file_upload" |
        "relation_change" |
        "field_update" |
        "created"
      fiscal_task_status:
        "backlog" |
        "waiting_client" |
        "todo" |
        "in_progress" |
        "review" |
        "em_ajuste" |
        "done"
      fiscal_task_priority:
        "low" |
        "medium" |
        "high" |
        "urgent"
      fiscal_task_category:
        "task" |
        "fixed_event"
      fiscal_recurrence_type:
        "daily" |
        "weekly" |
        "monthly" |
        "yearly"
      fiscal_task_department:
        "commercial" |
        "financial" |
        "administrative" |
        "operations"
      scenario_kind:
        "scale" |
        "efficiency" |
        "investment"
      scenario_type:
        "baseline" |
        "variant" |
        "target"
      scenario_unit_basis:
        "per_unit" |
        "per_month" |
        "per_year"
      scenario_status:
        "draft" |
        "analyzing" |
        "approved" |
        "promoted" |
        "archived"
      osg_doc_fonte:
        "cliente" |
        "psa" |
        "arquivar"
      osg_doc_categoria:
        "bens_direitos" |
        "cadastros_fiscais" |
        "declaracao_ir" |
        "agrarios" |
        "pessoais" |
        "societarios" |
        "sucessorios" |
        "outros" |
        "georreferenciamento"
      osg_doc_status:
        "pendente" |
        "ativo"
      osg_checklist_origem:
        "padrao" |
        "manual"
      osg_checklist_status:
        "pendente" |
        "solicitado" |
        "recebido" |
        "dispensado" |
        "nao_aplicavel" |
        "nao_solicitado"
      osg_doc_area:
        "osg" |
        "fiscal"
      osg_tipo_exploracao:
        "arrendamento" |
        "parceria" |
        "composse" |
        "comodato" |
        "condominio" |
        "propria"
      org_comment_entity:
        "org_task" |
        "org_project"
      org_comment_kind:
        "comment" |
        "assignment_changed" |
        "review_submitted" |
        "review_approved" |
        "review_adjustments" |
        "status_changed" |
        "documentos_solicitados"
      osg_doc_grupo:
        "pf" |
        "pj" |
        "bens_imoveis" |
        "outros"
      osg_solicitacao_status:
        "rascunho" |
        "enviada" |
        "em_checklist" |
        "encerrada"
      osg_solicitacao_item_status:
        "ativo" |
        "dispensado"
      notificacao_tipo:
        "tarefa_atribuida" |
        "tarefa_em_revisao" |
        "documento_recebido" |
        "solicitacao_enviada" |
        "documento_aprovado" |
        "documento_recusado" |
        "cobranca_pendencia" |
        "chamado_criado" |
        "chamado_atribuido" |
        "chamado_respondido" |
        "chamado_vencido" |
        "chamado_resolvido"
      notificacao_canal:
        "sino" |
        "email" |
        "whatsapp"
      osg_doc_revisao:
        "pendente" |
        "aprovado" |
        "recusado"
      notificacao_envio_status:
        "pendente" |
        "enviado" |
        "entregue" |
        "lido" |
        "falhou" |
        "ignorado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof Database["public"]["CompositeTypes"]
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
        "marketing"
      ],
      work_cluster: [
        "database",
        "frontend",
        "management"
      ],
      task_priority: [
        "low",
        "medium",
        "high",
        "urgent"
      ],
      work_package_type: [
        "fase",
        "tarefa",
        "epico"
      ],
      work_package_status: [
        "novo",
        "pendente_agendamento",
        "agendado",
        "em_progresso",
        "em_revisao",
        "concluido",
        "rejeitado"
      ],
      work_package_priority: [
        "alta",
        "normal",
        "baixa"
      ],
      work_package_area: [
        "fiscal",
        "osg",
        "fixos",
        "pontuais"
      ],
      work_package_stage: [
        "solicitacao_documentos",
        "analise_documentacao",
        "elaboracao_wp",
        "elaboracao_relatorios",
        "entrega_cliente",
        "conclusao"
      ],
      work_package_relation_type: [
        "filho",
        "relacionado",
        "anterior",
        "sucessor",
        "pai",
        "duplicado"
      ],
      work_package_activity_type: [
        "status_change",
        "assignment",
        "comment",
        "file_upload",
        "relation_change",
        "field_update",
        "created"
      ],
      fiscal_task_status: [
        "backlog",
        "waiting_client",
        "todo",
        "in_progress",
        "review",
        "em_ajuste",
        "done"
      ],
      fiscal_task_priority: [
        "low",
        "medium",
        "high",
        "urgent"
      ],
      fiscal_task_category: [
        "task",
        "fixed_event"
      ],
      fiscal_recurrence_type: [
        "daily",
        "weekly",
        "monthly",
        "yearly"
      ],
      fiscal_task_department: [
        "commercial",
        "financial",
        "administrative",
        "operations"
      ],
      scenario_kind: [
        "scale",
        "efficiency",
        "investment"
      ],
      scenario_type: [
        "baseline",
        "variant",
        "target"
      ],
      scenario_unit_basis: [
        "per_unit",
        "per_month",
        "per_year"
      ],
      scenario_status: [
        "draft",
        "analyzing",
        "approved",
        "promoted",
        "archived"
      ],
      osg_doc_fonte: [
        "cliente",
        "psa",
        "arquivar"
      ],
      osg_doc_categoria: [
        "bens_direitos",
        "cadastros_fiscais",
        "declaracao_ir",
        "agrarios",
        "pessoais",
        "societarios",
        "sucessorios",
        "outros",
        "georreferenciamento"
      ],
      osg_doc_status: [
        "pendente",
        "ativo"
      ],
      osg_checklist_origem: [
        "padrao",
        "manual"
      ],
      osg_checklist_status: [
        "pendente",
        "solicitado",
        "recebido",
        "dispensado",
        "nao_aplicavel",
        "nao_solicitado"
      ],
      osg_doc_area: [
        "osg",
        "fiscal"
      ],
      osg_tipo_exploracao: [
        "arrendamento",
        "parceria",
        "composse",
        "comodato",
        "condominio",
        "propria"
      ],
      org_comment_entity: [
        "org_task",
        "org_project"
      ],
      org_comment_kind: [
        "comment",
        "assignment_changed",
        "review_submitted",
        "review_approved",
        "review_adjustments",
        "status_changed",
        "documentos_solicitados"
      ],
      osg_doc_grupo: [
        "pf",
        "pj",
        "bens_imoveis",
        "outros"
      ],
      osg_solicitacao_status: [
        "rascunho",
        "enviada",
        "em_checklist",
        "encerrada"
      ],
      osg_solicitacao_item_status: [
        "ativo",
        "dispensado"
      ],
      notificacao_tipo: [
        "tarefa_atribuida",
        "tarefa_em_revisao",
        "documento_recebido",
        "solicitacao_enviada",
        "documento_aprovado",
        "documento_recusado",
        "cobranca_pendencia",
        "chamado_criado",
        "chamado_atribuido",
        "chamado_respondido",
        "chamado_vencido",
        "chamado_resolvido"
      ],
      notificacao_canal: [
        "sino",
        "email",
        "whatsapp"
      ],
      osg_doc_revisao: [
        "pendente",
        "aprovado",
        "recusado"
      ],
      notificacao_envio_status: [
        "pendente",
        "enviado",
        "entregue",
        "lido",
        "falhou",
        "ignorado"
      ]
    },
  },
} as const
