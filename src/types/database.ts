export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      application_users: {
        Row: {
          clerk_user_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          mfa_required: boolean;
          role: Database["public"]["Enums"]["application_role"];
          updated_at: string;
        };
        Insert: {
          clerk_user_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          mfa_required?: boolean;
          role: Database["public"]["Enums"]["application_role"];
          updated_at?: string;
        };
        Update: {
          clerk_user_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          mfa_required?: boolean;
          role?: Database["public"]["Enums"]["application_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_entries: {
        Row: {
          action: string;
          actor_user_id: string;
          after_data: Json | null;
          before_data: Json | null;
          entity_id: string;
          entity_type: string;
          id: string;
          module: string;
          occurred_at: string;
          source: Database["public"]["Enums"]["audit_source"];
        };
        Insert: {
          action: string;
          actor_user_id?: string;
          after_data?: Json | null;
          before_data?: Json | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          module: string;
          occurred_at?: string;
          source?: Database["public"]["Enums"]["audit_source"];
        };
        Update: {
          action?: string;
          actor_user_id?: string;
          after_data?: Json | null;
          before_data?: Json | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          module?: string;
          occurred_at?: string;
          source?: Database["public"]["Enums"]["audit_source"];
        };
        Relationships: [
          {
            foreignKeyName: "audit_entries_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
        ];
      };
      company_settings: {
        Row: {
          currency_code: string;
          display_name: string | null;
          legal_name: string | null;
          singleton: boolean;
          timezone: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          currency_code?: string;
          display_name?: string | null;
          legal_name?: string | null;
          singleton?: boolean;
          timezone?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          currency_code?: string;
          display_name?: string | null;
          legal_name?: string | null;
          singleton?: boolean;
          timezone?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "company_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
        ];
      };
      document_types: {
        Row: {
          created_at: string;
          created_by: string;
          expects_expiry_date: boolean;
          expects_issue_date: boolean;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          expects_expiry_date?: boolean;
          expects_issue_date?: boolean;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
          updated_by?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          expects_expiry_date?: boolean;
          expects_issue_date?: boolean;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_types_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_types_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
        ];
      };
      foreman_project_assignments: {
        Row: {
          created_at: string;
          created_by: string;
          ended_by: string | null;
          ends_on: string | null;
          foreman_user_id: string;
          id: string;
          project_id: string;
          starts_on: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          ended_by?: string | null;
          ends_on?: string | null;
          foreman_user_id: string;
          id?: string;
          project_id: string;
          starts_on?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          ended_by?: string | null;
          ends_on?: string | null;
          foreman_user_id?: string;
          id?: string;
          project_id?: string;
          starts_on?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "foreman_project_assignments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "foreman_project_assignments_ended_by_fkey";
            columns: ["ended_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "foreman_project_assignments_foreman_user_id_fkey";
            columns: ["foreman_user_id"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "foreman_project_assignments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_status_history: {
        Row: {
          changed_by: string;
          effective_at: string;
          id: string;
          project_id: string;
          status: Database["public"]["Enums"]["project_status"];
        };
        Insert: {
          changed_by?: string;
          effective_at?: string;
          id?: string;
          project_id: string;
          status: Database["public"]["Enums"]["project_status"];
        };
        Update: {
          changed_by?: string;
          effective_at?: string;
          id?: string;
          project_id?: string;
          status?: Database["public"]["Enums"]["project_status"];
        };
        Relationships: [
          {
            foreignKeyName: "project_status_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_status_history_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          client_name: string;
          contractor_name: string | null;
          created_at: string;
          created_by: string;
          end_date: string | null;
          id: string;
          location: string;
          name: string;
          notes: string | null;
          start_date: string;
          status: Database["public"]["Enums"]["project_status"];
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          client_name: string;
          contractor_name?: string | null;
          created_at?: string;
          created_by?: string;
          end_date?: string | null;
          id?: string;
          location: string;
          name: string;
          notes?: string | null;
          start_date: string;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
          updated_by?: string;
        };
        Update: {
          client_name?: string;
          contractor_name?: string | null;
          created_at?: string;
          created_by?: string;
          end_date?: string | null;
          id?: string;
          location?: string;
          name?: string;
          notes?: string | null;
          start_date?: string;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
        ];
      };
      skill_levels: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
          updated_by?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "skill_levels_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "skill_levels_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
        ];
      };
      trades: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
          updated_by?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trades_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trades_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
        ];
      };
      worker_classification_periods: {
        Row: {
          created_at: string;
          created_by: string;
          ended_by: string | null;
          ends_on: string | null;
          id: string;
          skill_level_id: string;
          starts_on: string;
          trade_id: string;
          updated_at: string;
          worker_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          ended_by?: string | null;
          ends_on?: string | null;
          id?: string;
          skill_level_id: string;
          starts_on: string;
          trade_id: string;
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          ended_by?: string | null;
          ends_on?: string | null;
          id?: string;
          skill_level_id?: string;
          starts_on?: string;
          trade_id?: string;
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "worker_classification_periods_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_classification_periods_ended_by_fkey";
            columns: ["ended_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_classification_periods_skill_level_id_fkey";
            columns: ["skill_level_id"];
            isOneToOne: false;
            referencedRelation: "skill_levels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_classification_periods_trade_id_fkey";
            columns: ["trade_id"];
            isOneToOne: false;
            referencedRelation: "trades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_classification_periods_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      worker_documents: {
        Row: {
          bucket_id: string;
          byte_size: number;
          changed_by: string | null;
          created_at: string;
          document_number: string | null;
          document_type_id: string | null;
          expiry_date: string | null;
          file_kind: Database["public"]["Enums"]["worker_file_kind"];
          id: string;
          issue_date: string | null;
          mime_type: string;
          object_path: string;
          original_filename: string;
          replaced_by_id: string | null;
          status: Database["public"]["Enums"]["worker_document_status"];
          updated_at: string;
          uploaded_by: string;
          worker_id: string;
        };
        Insert: {
          bucket_id: string;
          byte_size: number;
          changed_by?: string | null;
          created_at?: string;
          document_number?: string | null;
          document_type_id?: string | null;
          expiry_date?: string | null;
          file_kind: Database["public"]["Enums"]["worker_file_kind"];
          id?: string;
          issue_date?: string | null;
          mime_type: string;
          object_path: string;
          original_filename: string;
          replaced_by_id?: string | null;
          status?: Database["public"]["Enums"]["worker_document_status"];
          updated_at?: string;
          uploaded_by?: string;
          worker_id: string;
        };
        Update: {
          bucket_id?: string;
          byte_size?: number;
          changed_by?: string | null;
          created_at?: string;
          document_number?: string | null;
          document_type_id?: string | null;
          expiry_date?: string | null;
          file_kind?: Database["public"]["Enums"]["worker_file_kind"];
          id?: string;
          issue_date?: string | null;
          mime_type?: string;
          object_path?: string;
          original_filename?: string;
          replaced_by_id?: string | null;
          status?: Database["public"]["Enums"]["worker_document_status"];
          updated_at?: string;
          uploaded_by?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "worker_documents_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_documents_document_type_id_fkey";
            columns: ["document_type_id"];
            isOneToOne: false;
            referencedRelation: "document_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_documents_replaced_by_id_fkey";
            columns: ["replaced_by_id"];
            isOneToOne: false;
            referencedRelation: "worker_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_documents_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_documents_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      worker_employment_periods: {
        Row: {
          created_at: string;
          created_by: string;
          ended_by: string | null;
          ends_on: string | null;
          id: string;
          reason: string | null;
          starts_on: string;
          status: Database["public"]["Enums"]["worker_employment_status"];
          updated_at: string;
          worker_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          ended_by?: string | null;
          ends_on?: string | null;
          id?: string;
          reason?: string | null;
          starts_on: string;
          status: Database["public"]["Enums"]["worker_employment_status"];
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          ended_by?: string | null;
          ends_on?: string | null;
          id?: string;
          reason?: string | null;
          starts_on?: string;
          status?: Database["public"]["Enums"]["worker_employment_status"];
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "worker_employment_periods_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_employment_periods_ended_by_fkey";
            columns: ["ended_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_employment_periods_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      worker_food_deduction_periods: {
        Row: {
          created_at: string;
          created_by: string;
          ended_by: string | null;
          ends_on: string | null;
          id: string;
          monthly_amount_sen: number;
          starts_on: string;
          updated_at: string;
          worker_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          ended_by?: string | null;
          ends_on?: string | null;
          id?: string;
          monthly_amount_sen?: number;
          starts_on: string;
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          ended_by?: string | null;
          ends_on?: string | null;
          id?: string;
          monthly_amount_sen?: number;
          starts_on?: string;
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "worker_food_deduction_periods_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_food_deduction_periods_ended_by_fkey";
            columns: ["ended_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_food_deduction_periods_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      worker_project_assignments: {
        Row: {
          created_at: string;
          created_by: string;
          ended_by: string | null;
          ends_on: string | null;
          id: string;
          project_id: string;
          starts_on: string;
          updated_at: string;
          worker_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          ended_by?: string | null;
          ends_on?: string | null;
          id?: string;
          project_id: string;
          starts_on: string;
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          ended_by?: string | null;
          ends_on?: string | null;
          id?: string;
          project_id?: string;
          starts_on?: string;
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "worker_project_assignments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_project_assignments_ended_by_fkey";
            columns: ["ended_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_project_assignments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_project_assignments_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      worker_rate_periods: {
        Row: {
          created_at: string;
          created_by: string;
          ended_by: string | null;
          ends_on: string | null;
          hourly_rate_sen: number;
          id: string;
          starts_on: string;
          updated_at: string;
          worker_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          ended_by?: string | null;
          ends_on?: string | null;
          hourly_rate_sen: number;
          id?: string;
          starts_on: string;
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          ended_by?: string | null;
          ends_on?: string | null;
          hourly_rate_sen?: number;
          id?: string;
          starts_on?: string;
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "worker_rate_periods_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_rate_periods_ended_by_fkey";
            columns: ["ended_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_rate_periods_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      workers: {
        Row: {
          address: string | null;
          alternate_phone: string | null;
          cnic_number: string | null;
          created_at: string;
          created_by: string;
          id: string;
          legal_name: string;
          nationality: string | null;
          notes: string | null;
          passport_number: string | null;
          phone_number: string;
          updated_at: string;
          updated_by: string;
          work_permit_expiry_date: string | null;
          work_permit_issue_date: string | null;
          work_permit_number: string | null;
        };
        Insert: {
          address?: string | null;
          alternate_phone?: string | null;
          cnic_number?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          legal_name: string;
          nationality?: string | null;
          notes?: string | null;
          passport_number?: string | null;
          phone_number: string;
          updated_at?: string;
          updated_by?: string;
          work_permit_expiry_date?: string | null;
          work_permit_issue_date?: string | null;
          work_permit_number?: string | null;
        };
        Update: {
          address?: string | null;
          alternate_phone?: string | null;
          cnic_number?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          legal_name?: string;
          nationality?: string | null;
          notes?: string | null;
          passport_number?: string | null;
          phone_number?: string;
          updated_at?: string;
          updated_by?: string;
          work_permit_expiry_date?: string | null;
          work_permit_issue_date?: string | null;
          work_permit_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workers_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workers_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      assign_foreman: {
        Args: {
          foreman_user_id: string;
          project_id: string;
          starts_on: string;
        };
        Returns: string;
      };
      create_worker: {
        Args: {
          p_address: string;
          p_alternate_phone: string;
          p_assignment_starts_on: string;
          p_cnic_number: string;
          p_employment_starts_on: string;
          p_employment_status: Database["public"]["Enums"]["worker_employment_status"];
          p_food_deduction_sen: number;
          p_hourly_rate_sen: number;
          p_legal_name: string;
          p_nationality: string;
          p_notes: string;
          p_passport_number: string;
          p_phone_number: string;
          p_project_id: string;
          p_rate_starts_on: string;
          p_skill_level_id: string;
          p_trade_id: string;
          p_work_permit_expiry_date: string;
          p_work_permit_issue_date: string;
          p_work_permit_number: string;
        };
        Returns: string;
      };
      create_worker_record: {
        Args: {
          p_address: string;
          p_alternate_phone: string;
          p_assignment_starts_on: string;
          p_cnic_number: string;
          p_employment_starts_on: string;
          p_employment_status: Database["public"]["Enums"]["worker_employment_status"];
          p_food_deduction_sen: number;
          p_hourly_rate_sen: number;
          p_legal_name: string;
          p_nationality: string;
          p_notes: string;
          p_passport_number: string;
          p_phone_number: string;
          p_project_id: string;
          p_rate_starts_on: string;
          p_skill_level_id: string;
          p_trade_id: string;
          p_work_permit_expiry_date: string;
          p_work_permit_issue_date: string;
          p_work_permit_number: string;
        };
        Returns: string;
      };
      edit_worker_profile: {
        Args: {
          p_address: string;
          p_alternate_phone: string;
          p_cnic_number: string;
          p_food_deduction_sen: number;
          p_legal_name: string;
          p_nationality: string;
          p_notes: string;
          p_passport_number: string;
          p_phone_number: string;
          p_skill_level_id: string;
          p_trade_id: string;
          p_work_permit_expiry_date: string;
          p_work_permit_issue_date: string;
          p_work_permit_number: string;
          p_worker_id: string;
        };
        Returns: undefined;
      };
      move_worker: {
        Args: {
          p_project_id: string;
          p_starts_on: string;
          p_worker_id: string;
        };
        Returns: undefined;
      };
      register_worker_file: {
        Args: {
          p_bucket_id: string;
          p_byte_size: number;
          p_document_number: string;
          p_document_type_id: string;
          p_expiry_date: string;
          p_file_kind: Database["public"]["Enums"]["worker_file_kind"];
          p_id: string;
          p_issue_date: string;
          p_mime_type: string;
          p_object_path: string;
          p_original_filename: string;
          p_replace_document_id: string;
          p_worker_id: string;
        };
        Returns: undefined;
      };
      remove_worker_file: {
        Args: { p_document_id: string };
        Returns: {
          bucket_id: string;
          object_path: string;
        }[];
      };
      set_worker_employment_status: {
        Args: {
          p_reason: string;
          p_starts_on: string;
          p_status: Database["public"]["Enums"]["worker_employment_status"];
          p_worker_id: string;
        };
        Returns: undefined;
      };
      set_worker_rate: {
        Args: {
          p_hourly_rate_sen: number;
          p_starts_on: string;
          p_worker_id: string;
        };
        Returns: undefined;
      };
      transfer_worker: {
        Args: {
          p_project_id: string;
          p_starts_on: string;
          p_worker_id: string;
        };
        Returns: undefined;
      };
      update_worker_profile: {
        Args: {
          p_address: string;
          p_alternate_phone: string;
          p_cnic_number: string;
          p_food_deduction_sen: number;
          p_legal_name: string;
          p_nationality: string;
          p_notes: string;
          p_passport_number: string;
          p_phone_number: string;
          p_skill_level_id: string;
          p_trade_id: string;
          p_work_permit_expiry_date: string;
          p_work_permit_issue_date: string;
          p_work_permit_number: string;
          p_worker_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      application_role: "CEO" | "FOREMAN";
      audit_source: "ONLINE" | "IMPORT" | "OFFLINE_SYNC";
      project_status:
        "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
      worker_document_status: "ACTIVE" | "REPLACED" | "REMOVED";
      worker_employment_status:
        "ACTIVE" | "SUSPENDED" | "LEFT_COMPANY" | "ARCHIVED";
      worker_file_kind: "PHOTO" | "DOCUMENT";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      application_role: ["CEO", "FOREMAN"],
      audit_source: ["ONLINE", "IMPORT", "OFFLINE_SYNC"],
      project_status: [
        "PLANNED",
        "ACTIVE",
        "COMPLETED",
        "CANCELLED",
        "ARCHIVED",
      ],
      worker_document_status: ["ACTIVE", "REPLACED", "REMOVED"],
      worker_employment_status: [
        "ACTIVE",
        "SUSPENDED",
        "LEFT_COMPANY",
        "ARCHIVED",
      ],
      worker_file_kind: ["PHOTO", "DOCUMENT"],
    },
  },
} as const;
