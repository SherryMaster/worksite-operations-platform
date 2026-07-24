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
          role: Database["public"]["Enums"]["application_role"];
          updated_at: string;
        };
        Insert: {
          clerk_user_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          role: Database["public"]["Enums"]["application_role"];
          updated_at?: string;
        };
        Update: {
          clerk_user_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
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
    };
    Enums: {
      application_role: "CEO" | "FOREMAN";
      audit_source: "ONLINE" | "IMPORT" | "OFFLINE_SYNC";
      project_status:
        "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
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
    },
  },
} as const;
