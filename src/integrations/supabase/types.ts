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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
          target_user_name: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
          target_user_name?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
          target_user_name?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          call_type: string
          created_at: string | null
          estimated_cost_usd: number
          id: string
          input_tokens: number
          model: string
          module: string
          output_tokens: number
          session_id: string | null
          total_tokens: number
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          call_type: string
          created_at?: string | null
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          model: string
          module: string
          output_tokens?: number
          session_id?: string | null
          total_tokens?: number
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          call_type?: string
          created_at?: string | null
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          model?: string
          module?: string
          output_tokens?: number
          session_id?: string | null
          total_tokens?: number
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      beta_feedback: {
        Row: {
          created_at: string | null
          feedback_text: string
          id: string
          rating: number
          tool_used: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feedback_text?: string
          id?: string
          rating: number
          tool_used?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          feedback_text?: string
          id?: string
          rating?: number
          tool_used?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          created_at: string | null
          full_data: Json
          id: string
          item_type: string
          summary: string | null
          title: string
          tool: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          full_data?: Json
          id?: string
          item_type: string
          summary?: string | null
          title: string
          tool: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          full_data?: Json
          id?: string
          item_type?: string
          summary?: string | null
          title?: string
          tool?: string
          user_id?: string
        }
        Relationships: []
      }
      signup_requests: {
        Row: {
          email: string
          full_name: string
          id: string
          notes: string | null
          payment_type: string
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
        }
        Insert: {
          email: string
          full_name: string
          id?: string
          notes?: string | null
          payment_type: string
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
        }
        Update: {
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          payment_type?: string
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
        }
        Relationships: []
      }
      tool_usage: {
        Row: {
          actions_count: number | null
          created_at: string | null
          id: string
          opened_at: string | null
          session_id: string | null
          time_spent_secs: number | null
          tool_id: string
          user_id: string
        }
        Insert: {
          actions_count?: number | null
          created_at?: string | null
          id?: string
          opened_at?: string | null
          session_id?: string | null
          time_spent_secs?: number | null
          tool_id: string
          user_id: string
        }
        Update: {
          actions_count?: number | null
          created_at?: string | null
          id?: string
          opened_at?: string | null
          session_id?: string | null
          time_spent_secs?: number | null
          tool_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_usage_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          current_page: string | null
          last_seen: string | null
          session_start: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          current_page?: string | null
          last_seen?: string | null
          session_start?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          current_page?: string | null
          last_seen?: string | null
          session_start?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          access_tier: string
          added_by: string | null
          avatar_gradient: string | null
          avatar_initials: string | null
          bio: string | null
          created_at: string | null
          facebook: string | null
          full_name: string
          id: string
          instagram: string | null
          is_beta_user: boolean | null
          linkedin: string | null
          notes: string | null
          payment_amount: number | null
          payment_status: string
          phone: string | null
          twitter: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          access_tier?: string
          added_by?: string | null
          avatar_gradient?: string | null
          avatar_initials?: string | null
          bio?: string | null
          created_at?: string | null
          facebook?: string | null
          full_name?: string
          id: string
          instagram?: string | null
          is_beta_user?: boolean | null
          linkedin?: string | null
          notes?: string | null
          payment_amount?: number | null
          payment_status?: string
          phone?: string | null
          twitter?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          access_tier?: string
          added_by?: string | null
          avatar_gradient?: string | null
          avatar_initials?: string | null
          bio?: string | null
          created_at?: string | null
          facebook?: string | null
          full_name?: string
          id?: string
          instagram?: string | null
          is_beta_user?: boolean | null
          linkedin?: string | null
          notes?: string | null
          payment_amount?: number | null
          payment_status?: string
          phone?: string | null
          twitter?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_type: string | null
          duration_seconds: number | null
          id: string
          pages_visited: Json | null
          session_end: string | null
          session_start: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          pages_visited?: Json | null
          session_end?: string | null
          session_start?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          pages_visited?: Json | null
          session_end?: string | null
          session_start?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_signup_count: { Args: never; Returns: number }
      increment_tool_actions: { Args: { row_id: string }; Returns: undefined }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
