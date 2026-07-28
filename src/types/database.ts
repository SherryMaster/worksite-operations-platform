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
      attendance_sessions: {
        Row: {
          correction_note: string | null;
          created_at: string;
          created_by: string;
          entered_at: string;
          exited_at: string | null;
          id: string;
          project_id: string;
          record_status: Database["public"]["Enums"]["attendance_record_status"];
          source: Database["public"]["Enums"]["audit_source"];
          updated_at: string;
          updated_by: string;
          work_date: string;
          worker_id: string;
        };
        Insert: {
          correction_note?: string | null;
          created_at?: string;
          created_by?: string;
          entered_at: string;
          exited_at?: string | null;
          id: string;
          project_id: string;
          record_status?: Database["public"]["Enums"]["attendance_record_status"];
          source?: Database["public"]["Enums"]["audit_source"];
          updated_at?: string;
          updated_by?: string;
          work_date: string;
          worker_id: string;
        };
        Update: {
          correction_note?: string | null;
          created_at?: string;
          created_by?: string;
          entered_at?: string;
          exited_at?: string | null;
          id?: string;
          project_id?: string;
          record_status?: Database["public"]["Enums"]["attendance_record_status"];
          source?: Database["public"]["Enums"]["audit_source"];
          updated_at?: string;
          updated_by?: string;
          work_date?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_sessions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_sessions_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_sessions_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance_sync_actions: {
        Row: {
          action_type: string;
          actor_user_id: string;
          client_action_id: string;
          processed_at: string;
          project_id: string;
          request_data: Json;
          result_data: Json;
          status: Database["public"]["Enums"]["attendance_sync_status"];
        };
        Insert: {
          action_type: string;
          actor_user_id?: string;
          client_action_id: string;
          processed_at?: string;
          project_id: string;
          request_data: Json;
          result_data: Json;
          status: Database["public"]["Enums"]["attendance_sync_status"];
        };
        Update: {
          action_type?: string;
          actor_user_id?: string;
          client_action_id?: string;
          processed_at?: string;
          project_id?: string;
          request_data?: Json;
          result_data?: Json;
          status?: Database["public"]["Enums"]["attendance_sync_status"];
        };
        Relationships: [
          {
            foreignKeyName: "attendance_sync_actions_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_sync_actions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
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
      break_intervals: {
        Row: {
          attendance_session_id: string;
          correction_note: string | null;
          created_at: string;
          created_by: string;
          ended_at: string | null;
          id: string;
          record_status: Database["public"]["Enums"]["attendance_record_status"];
          source: Database["public"]["Enums"]["audit_source"];
          started_at: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          attendance_session_id: string;
          correction_note?: string | null;
          created_at?: string;
          created_by?: string;
          ended_at?: string | null;
          id: string;
          record_status?: Database["public"]["Enums"]["attendance_record_status"];
          source?: Database["public"]["Enums"]["audit_source"];
          started_at: string;
          updated_at?: string;
          updated_by?: string;
        };
        Update: {
          attendance_session_id?: string;
          correction_note?: string | null;
          created_at?: string;
          created_by?: string;
          ended_at?: string | null;
          id?: string;
          record_status?: Database["public"]["Enums"]["attendance_record_status"];
          source?: Database["public"]["Enums"]["audit_source"];
          started_at?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "break_intervals_attendance_session_id_fkey";
            columns: ["attendance_session_id"];
            isOneToOne: false;
            referencedRelation: "attendance_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "break_intervals_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "break_intervals_updated_by_fkey";
            columns: ["updated_by"];
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
      leave_request_documents: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          leave_request_id: string;
          mime_type: string;
          object_path: string;
          original_filename: string;
          size_bytes: number;
          uploaded_by: string;
        };
        Insert: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          leave_request_id: string;
          mime_type: string;
          object_path: string;
          original_filename: string;
          size_bytes: number;
          uploaded_by?: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          leave_request_id?: string;
          mime_type?: string;
          object_path?: string;
          original_filename?: string;
          size_bytes?: number;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leave_request_documents_leave_request_id_fkey";
            columns: ["leave_request_id"];
            isOneToOne: true;
            referencedRelation: "approved_leave_days";
            referencedColumns: ["leave_request_id"];
          },
          {
            foreignKeyName: "leave_request_documents_leave_request_id_fkey";
            columns: ["leave_request_id"];
            isOneToOne: true;
            referencedRelation: "leave_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leave_request_documents_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
        ];
      };
      leave_requests: {
        Row: {
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          decision_note: string | null;
          ends_on: string;
          id: string;
          leave_type_id: string;
          notes: string | null;
          project_id: string;
          reason: string | null;
          starts_on: string;
          status: Database["public"]["Enums"]["leave_request_status"];
          submitted_by: string;
          updated_at: string;
          worker_id: string;
        };
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_note?: string | null;
          ends_on: string;
          id?: string;
          leave_type_id: string;
          notes?: string | null;
          project_id: string;
          reason?: string | null;
          starts_on: string;
          status?: Database["public"]["Enums"]["leave_request_status"];
          submitted_by?: string;
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_note?: string | null;
          ends_on?: string;
          id?: string;
          leave_type_id?: string;
          notes?: string | null;
          project_id?: string;
          reason?: string | null;
          starts_on?: string;
          status?: Database["public"]["Enums"]["leave_request_status"];
          submitted_by?: string;
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leave_requests_decided_by_fkey";
            columns: ["decided_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey";
            columns: ["leave_type_id"];
            isOneToOne: false;
            referencedRelation: "leave_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leave_requests_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leave_requests_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leave_requests_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      leave_types: {
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
            foreignKeyName: "leave_types_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leave_types_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
        ];
      };
      migration_batches: {
        Row: {
          committed_at: string | null;
          created_at: string;
          created_by: string;
          file_checksum: string;
          file_name: string;
          id: string;
          issues: Json;
          payload: Json;
          status: Database["public"]["Enums"]["migration_batch_status"];
          summary: Json;
        };
        Insert: {
          committed_at?: string | null;
          created_at?: string;
          created_by?: string;
          file_checksum: string;
          file_name: string;
          id?: string;
          issues?: Json;
          payload: Json;
          status?: Database["public"]["Enums"]["migration_batch_status"];
          summary?: Json;
        };
        Update: {
          committed_at?: string | null;
          created_at?: string;
          created_by?: string;
          file_checksum?: string;
          file_name?: string;
          id?: string;
          issues?: Json;
          payload?: Json;
          status?: Database["public"]["Enums"]["migration_batch_status"];
          summary?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "migration_batches_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll_adjustments: {
        Row: {
          amount_sen: number;
          created_at: string;
          created_by: string;
          id: string;
          kind: Database["public"]["Enums"]["payroll_adjustment_kind"];
          payroll_month: string;
          reason: string;
          settled_at: string | null;
          source: Database["public"]["Enums"]["payroll_adjustment_source"];
          source_payroll_worker_id: string | null;
          status: Database["public"]["Enums"]["payroll_adjustment_status"];
          target_payroll_worker_id: string | null;
          updated_at: string;
          worker_id: string;
        };
        Insert: {
          amount_sen: number;
          created_at?: string;
          created_by?: string;
          id?: string;
          kind: Database["public"]["Enums"]["payroll_adjustment_kind"];
          payroll_month: string;
          reason: string;
          settled_at?: string | null;
          source?: Database["public"]["Enums"]["payroll_adjustment_source"];
          source_payroll_worker_id?: string | null;
          status?: Database["public"]["Enums"]["payroll_adjustment_status"];
          target_payroll_worker_id?: string | null;
          updated_at?: string;
          worker_id: string;
        };
        Update: {
          amount_sen?: number;
          created_at?: string;
          created_by?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["payroll_adjustment_kind"];
          payroll_month?: string;
          reason?: string;
          settled_at?: string | null;
          source?: Database["public"]["Enums"]["payroll_adjustment_source"];
          source_payroll_worker_id?: string | null;
          status?: Database["public"]["Enums"]["payroll_adjustment_status"];
          target_payroll_worker_id?: string | null;
          updated_at?: string;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payroll_adjustments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_adjustments_source_payroll_worker_id_fkey";
            columns: ["source_payroll_worker_id"];
            isOneToOne: false;
            referencedRelation: "payroll_workers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_adjustments_target_payroll_worker_id_fkey";
            columns: ["target_payroll_worker_id"];
            isOneToOne: false;
            referencedRelation: "payroll_workers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_adjustments_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll_approval_revisions: {
        Row: {
          approved_at: string;
          approved_by: string;
          id: string;
          payroll_run_id: string;
          revision: number;
          snapshot: Json;
        };
        Insert: {
          approved_at?: string;
          approved_by: string;
          id?: string;
          payroll_run_id: string;
          revision: number;
          snapshot: Json;
        };
        Update: {
          approved_at?: string;
          approved_by?: string;
          id?: string;
          payroll_run_id?: string;
          revision?: number;
          snapshot?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "payroll_approval_revisions_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_approval_revisions_payroll_run_id_fkey";
            columns: ["payroll_run_id"];
            isOneToOne: false;
            referencedRelation: "payroll_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll_earning_buckets: {
        Row: {
          amount_sen: number;
          category: Database["public"]["Enums"]["payroll_earning_category"];
          created_at: string;
          hourly_rate_sen: number;
          id: string;
          minutes: number;
          multiplier_basis_points: number;
          payroll_worker_id: string;
          project_id: string;
          rate_period_id: string;
        };
        Insert: {
          amount_sen: number;
          category: Database["public"]["Enums"]["payroll_earning_category"];
          created_at?: string;
          hourly_rate_sen: number;
          id?: string;
          minutes: number;
          multiplier_basis_points: number;
          payroll_worker_id: string;
          project_id: string;
          rate_period_id: string;
        };
        Update: {
          amount_sen?: number;
          category?: Database["public"]["Enums"]["payroll_earning_category"];
          created_at?: string;
          hourly_rate_sen?: number;
          id?: string;
          minutes?: number;
          multiplier_basis_points?: number;
          payroll_worker_id?: string;
          project_id?: string;
          rate_period_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payroll_earning_buckets_payroll_worker_id_fkey";
            columns: ["payroll_worker_id"];
            isOneToOne: false;
            referencedRelation: "payroll_workers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_earning_buckets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_earning_buckets_rate_period_id_fkey";
            columns: ["rate_period_id"];
            isOneToOne: false;
            referencedRelation: "worker_rate_periods";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll_exceptions: {
        Row: {
          blocking: boolean;
          created_at: string;
          exception_type: Database["public"]["Enums"]["payroll_exception_type"];
          id: string;
          message: string;
          payroll_worker_id: string;
          project_id: string | null;
          work_date: string | null;
        };
        Insert: {
          blocking?: boolean;
          created_at?: string;
          exception_type: Database["public"]["Enums"]["payroll_exception_type"];
          id?: string;
          message: string;
          payroll_worker_id: string;
          project_id?: string | null;
          work_date?: string | null;
        };
        Update: {
          blocking?: boolean;
          created_at?: string;
          exception_type?: Database["public"]["Enums"]["payroll_exception_type"];
          id?: string;
          message?: string;
          payroll_worker_id?: string;
          project_id?: string | null;
          work_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payroll_exceptions_payroll_worker_id_fkey";
            columns: ["payroll_worker_id"];
            isOneToOne: false;
            referencedRelation: "payroll_workers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_exceptions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll_payments: {
        Row: {
          amount_sen: number;
          approval_revision_id: string;
          id: string;
          method: Database["public"]["Enums"]["payroll_payment_method"];
          notes: string | null;
          paid_at: string;
          paid_by: string;
          payment_date: string;
          payroll_worker_id: string;
          reference: string | null;
        };
        Insert: {
          amount_sen: number;
          approval_revision_id: string;
          id?: string;
          method: Database["public"]["Enums"]["payroll_payment_method"];
          notes?: string | null;
          paid_at?: string;
          paid_by?: string;
          payment_date: string;
          payroll_worker_id: string;
          reference?: string | null;
        };
        Update: {
          amount_sen?: number;
          approval_revision_id?: string;
          id?: string;
          method?: Database["public"]["Enums"]["payroll_payment_method"];
          notes?: string | null;
          paid_at?: string;
          paid_by?: string;
          payment_date?: string;
          payroll_worker_id?: string;
          reference?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payroll_payments_approval_revision_id_fkey";
            columns: ["approval_revision_id"];
            isOneToOne: false;
            referencedRelation: "payroll_approval_revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_payments_paid_by_fkey";
            columns: ["paid_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_payments_payroll_worker_id_fkey";
            columns: ["payroll_worker_id"];
            isOneToOne: true;
            referencedRelation: "payroll_workers";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll_runs: {
        Row: {
          additions_sen: number;
          approved_at: string | null;
          approved_by: string | null;
          blocking_exception_count: number;
          calculation_revision: number;
          created_at: string;
          deductions_sen: number;
          food_deductions_sen: number;
          generated_at: string;
          generated_by: string;
          gross_earnings_sen: number;
          id: string;
          net_payroll_sen: number;
          payroll_month: string;
          period_end: string;
          period_start: string;
          status: Database["public"]["Enums"]["payroll_run_status"];
          updated_at: string;
          worker_count: number;
        };
        Insert: {
          additions_sen?: number;
          approved_at?: string | null;
          approved_by?: string | null;
          blocking_exception_count?: number;
          calculation_revision?: number;
          created_at?: string;
          deductions_sen?: number;
          food_deductions_sen?: number;
          generated_at?: string;
          generated_by?: string;
          gross_earnings_sen?: number;
          id?: string;
          net_payroll_sen?: number;
          payroll_month: string;
          period_end: string;
          period_start: string;
          status?: Database["public"]["Enums"]["payroll_run_status"];
          updated_at?: string;
          worker_count?: number;
        };
        Update: {
          additions_sen?: number;
          approved_at?: string | null;
          approved_by?: string | null;
          blocking_exception_count?: number;
          calculation_revision?: number;
          created_at?: string;
          deductions_sen?: number;
          food_deductions_sen?: number;
          generated_at?: string;
          generated_by?: string;
          gross_earnings_sen?: number;
          id?: string;
          net_payroll_sen?: number;
          payroll_month?: string;
          period_end?: string;
          period_start?: string;
          status?: Database["public"]["Enums"]["payroll_run_status"];
          updated_at?: string;
          worker_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "payroll_runs_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_runs_generated_by_fkey";
            columns: ["generated_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll_source_days: {
        Row: {
          approved_leave: boolean;
          created_at: string;
          day_type: Database["public"]["Enums"]["attendance_day_type"];
          id: string;
          leave_type_name: string | null;
          normal_minutes: number;
          overtime_minutes: number;
          payroll_worker_id: string;
          project_id: string;
          public_holiday_minutes: number;
          sunday_minutes: number;
          work_date: string;
        };
        Insert: {
          approved_leave?: boolean;
          created_at?: string;
          day_type: Database["public"]["Enums"]["attendance_day_type"];
          id?: string;
          leave_type_name?: string | null;
          normal_minutes?: number;
          overtime_minutes?: number;
          payroll_worker_id: string;
          project_id: string;
          public_holiday_minutes?: number;
          sunday_minutes?: number;
          work_date: string;
        };
        Update: {
          approved_leave?: boolean;
          created_at?: string;
          day_type?: Database["public"]["Enums"]["attendance_day_type"];
          id?: string;
          leave_type_name?: string | null;
          normal_minutes?: number;
          overtime_minutes?: number;
          payroll_worker_id?: string;
          project_id?: string;
          public_holiday_minutes?: number;
          sunday_minutes?: number;
          work_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payroll_source_days_payroll_worker_id_fkey";
            columns: ["payroll_worker_id"];
            isOneToOne: false;
            referencedRelation: "payroll_workers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_source_days_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll_statements: {
        Row: {
          approval_revision_id: string;
          generated_at: string;
          generated_by: string;
          id: string;
          payroll_worker_id: string;
          snapshot: Json;
          statement_number: string;
        };
        Insert: {
          approval_revision_id: string;
          generated_at?: string;
          generated_by?: string;
          id?: string;
          payroll_worker_id: string;
          snapshot: Json;
          statement_number: string;
        };
        Update: {
          approval_revision_id?: string;
          generated_at?: string;
          generated_by?: string;
          id?: string;
          payroll_worker_id?: string;
          snapshot?: Json;
          statement_number?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payroll_statements_approval_revision_id_fkey";
            columns: ["approval_revision_id"];
            isOneToOne: false;
            referencedRelation: "payroll_approval_revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_statements_generated_by_fkey";
            columns: ["generated_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_statements_payroll_worker_id_fkey";
            columns: ["payroll_worker_id"];
            isOneToOne: false;
            referencedRelation: "payroll_workers";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll_workers: {
        Row: {
          additions_sen: number;
          calculated_at: string;
          calculation_revision: number;
          created_at: string;
          deductions_sen: number;
          food_deduction_sen: number;
          gross_earnings_sen: number;
          id: string;
          net_pay_sen: number;
          normal_minutes: number;
          overtime_minutes: number;
          payment_status: Database["public"]["Enums"]["payroll_payment_status"];
          payroll_run_id: string;
          primary_project_id: string | null;
          public_holiday_minutes: number;
          sunday_minutes: number;
          updated_at: string;
          worker_id: string;
          worker_name: string;
        };
        Insert: {
          additions_sen?: number;
          calculated_at?: string;
          calculation_revision?: number;
          created_at?: string;
          deductions_sen?: number;
          food_deduction_sen?: number;
          gross_earnings_sen?: number;
          id?: string;
          net_pay_sen?: number;
          normal_minutes?: number;
          overtime_minutes?: number;
          payment_status?: Database["public"]["Enums"]["payroll_payment_status"];
          payroll_run_id: string;
          primary_project_id?: string | null;
          public_holiday_minutes?: number;
          sunday_minutes?: number;
          updated_at?: string;
          worker_id: string;
          worker_name: string;
        };
        Update: {
          additions_sen?: number;
          calculated_at?: string;
          calculation_revision?: number;
          created_at?: string;
          deductions_sen?: number;
          food_deduction_sen?: number;
          gross_earnings_sen?: number;
          id?: string;
          net_pay_sen?: number;
          normal_minutes?: number;
          overtime_minutes?: number;
          payment_status?: Database["public"]["Enums"]["payroll_payment_status"];
          payroll_run_id?: string;
          primary_project_id?: string | null;
          public_holiday_minutes?: number;
          sunday_minutes?: number;
          updated_at?: string;
          worker_id?: string;
          worker_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payroll_workers_payroll_run_id_fkey";
            columns: ["payroll_run_id"];
            isOneToOne: false;
            referencedRelation: "payroll_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_workers_primary_project_id_fkey";
            columns: ["primary_project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_workers_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      project_days: {
        Row: {
          correction_note: string | null;
          created_at: string;
          created_by: string;
          day_type: Database["public"]["Enums"]["attendance_day_type"];
          id: string;
          project_id: string;
          source: Database["public"]["Enums"]["audit_source"];
          updated_at: string;
          updated_by: string;
          work_date: string;
        };
        Insert: {
          correction_note?: string | null;
          created_at?: string;
          created_by?: string;
          day_type: Database["public"]["Enums"]["attendance_day_type"];
          id?: string;
          project_id: string;
          source?: Database["public"]["Enums"]["audit_source"];
          updated_at?: string;
          updated_by?: string;
          work_date: string;
        };
        Update: {
          correction_note?: string | null;
          created_at?: string;
          created_by?: string;
          day_type?: Database["public"]["Enums"]["attendance_day_type"];
          id?: string;
          project_id?: string;
          source?: Database["public"]["Enums"]["audit_source"];
          updated_at?: string;
          updated_by?: string;
          work_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_days_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_days_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_days_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "application_users";
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
      approved_leave_days: {
        Row: {
          leave_date: string | null;
          leave_request_id: string | null;
          leave_type_id: string | null;
          payable_minutes: number | null;
          project_id: string | null;
          worker_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey";
            columns: ["leave_type_id"];
            isOneToOne: false;
            referencedRelation: "leave_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leave_requests_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leave_requests_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      add_payroll_adjustment: {
        Args: {
          p_amount_sen: number;
          p_kind: Database["public"]["Enums"]["payroll_adjustment_kind"];
          p_payroll_run_id: string;
          p_reason: string;
          p_worker_id: string;
        };
        Returns: string;
      };
      apply_attendance_action: {
        Args: {
          p_action_type: string;
          p_client_action_id: string;
          p_payload: Json;
          p_project_id: string;
        };
        Returns: Json;
      };
      approve_payroll: { Args: { p_payroll_run_id: string }; Returns: string };
      assign_foreman: {
        Args: {
          foreman_user_id: string;
          project_id: string;
          starts_on: string;
        };
        Returns: string;
      };
      commit_migration_batch: { Args: { p_batch_id: string }; Returns: Json };
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
      decide_leave_request: {
        Args: {
          p_decision: Database["public"]["Enums"]["leave_request_status"];
          p_decision_note?: string;
          p_leave_request_id: string;
        };
        Returns: undefined;
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
      generate_payroll: { Args: { p_payroll_month: string }; Returns: string };
      move_worker: {
        Args: {
          p_project_id: string;
          p_starts_on: string;
          p_worker_id: string;
        };
        Returns: undefined;
      };
      record_payroll_payment: {
        Args: {
          p_method: Database["public"]["Enums"]["payroll_payment_method"];
          p_notes?: string;
          p_payment_date: string;
          p_payroll_worker_id: string;
          p_reference?: string;
        };
        Returns: string;
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
      remove_payroll_adjustment: {
        Args: { p_adjustment_id: string };
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
      submit_leave_request: {
        Args: {
          p_ends_on: string;
          p_leave_type_id: string;
          p_notes?: string;
          p_project_id: string;
          p_reason?: string;
          p_starts_on: string;
          p_worker_id: string;
        };
        Returns: string;
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
      attendance_day_type: "NORMAL" | "SUNDAY" | "PUBLIC_HOLIDAY";
      attendance_record_status: "ACTIVE" | "VOID";
      attendance_sync_status: "SYNCED" | "FAILED" | "CONFLICT";
      audit_source: "ONLINE" | "IMPORT" | "OFFLINE_SYNC";
      leave_request_status: "PENDING" | "APPROVED" | "REJECTED";
      migration_batch_status: "PREVIEWED" | "COMMITTED";
      payroll_adjustment_kind: "ADDITION" | "DEDUCTION";
      payroll_adjustment_source: "MANUAL" | "CORRECTION";
      payroll_adjustment_status: "PENDING" | "APPLIED" | "SETTLED";
      payroll_earning_category:
        "NORMAL" | "OVERTIME" | "SUNDAY" | "PUBLIC_HOLIDAY";
      payroll_exception_type:
        | "INCOMPLETE_ATTENDANCE"
        | "OPEN_OR_INVALID_BREAK"
        | "MISSING_RATE"
        | "ATTENDANCE_LEAVE_CONFLICT"
        | "NEGATIVE_NET_PAY"
        | "CALCULATION_FAILURE";
      payroll_payment_method: "CASH" | "BANK_TRANSFER";
      payroll_payment_status: "UNPAID" | "PAID";
      payroll_run_status: "DRAFT" | "NEEDS_REVIEW" | "APPROVED";
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
      attendance_day_type: ["NORMAL", "SUNDAY", "PUBLIC_HOLIDAY"],
      attendance_record_status: ["ACTIVE", "VOID"],
      attendance_sync_status: ["SYNCED", "FAILED", "CONFLICT"],
      audit_source: ["ONLINE", "IMPORT", "OFFLINE_SYNC"],
      leave_request_status: ["PENDING", "APPROVED", "REJECTED"],
      migration_batch_status: ["PREVIEWED", "COMMITTED"],
      payroll_adjustment_kind: ["ADDITION", "DEDUCTION"],
      payroll_adjustment_source: ["MANUAL", "CORRECTION"],
      payroll_adjustment_status: ["PENDING", "APPLIED", "SETTLED"],
      payroll_earning_category: [
        "NORMAL",
        "OVERTIME",
        "SUNDAY",
        "PUBLIC_HOLIDAY",
      ],
      payroll_exception_type: [
        "INCOMPLETE_ATTENDANCE",
        "OPEN_OR_INVALID_BREAK",
        "MISSING_RATE",
        "ATTENDANCE_LEAVE_CONFLICT",
        "NEGATIVE_NET_PAY",
        "CALCULATION_FAILURE",
      ],
      payroll_payment_method: ["CASH", "BANK_TRANSFER"],
      payroll_payment_status: ["UNPAID", "PAID"],
      payroll_run_status: ["DRAFT", "NEEDS_REVIEW", "APPROVED"],
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
