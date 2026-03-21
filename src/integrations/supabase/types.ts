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
      activity_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          module: string | null
          session_id: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          module?: string | null
          session_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          module?: string | null
          session_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
          display_name: string | null
          email: string | null
          invited_at: string | null
          invited_by: string | null
          is_owner: boolean | null
          last_active: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          invited_at?: string | null
          invited_by?: string | null
          is_owner?: boolean | null
          last_active?: string | null
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          invited_at?: string | null
          invited_by?: string | null
          is_owner?: boolean | null
          last_active?: string | null
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
      credit_pricing: {
        Row: {
          call_type: string
          credits: number
          display_name: string
          id: string
          is_active: boolean | null
          tool_module: string
          updated_at: string | null
        }
        Insert: {
          call_type: string
          credits: number
          display_name: string
          id?: string
          is_active?: boolean | null
          tool_module: string
          updated_at?: string | null
        }
        Update: {
          call_type?: string
          credits?: number
          display_name?: string
          id?: string
          is_active?: boolean | null
          tool_module?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          ai_usage_log_id: string | null
          amount: number
          balance_after: number
          call_type: string | null
          created_at: string | null
          description: string | null
          gifted_by: string | null
          id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          tool_module: string | null
          type: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          ai_usage_log_id?: string | null
          amount: number
          balance_after: number
          call_type?: string | null
          created_at?: string | null
          description?: string | null
          gifted_by?: string | null
          id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          tool_module?: string | null
          type: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          ai_usage_log_id?: string | null
          amount?: number
          balance_after?: number
          call_type?: string | null
          created_at?: string | null
          description?: string | null
          gifted_by?: string | null
          id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          tool_module?: string | null
          type?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          additional_data: Json | null
          auto_diagnosis: string | null
          browser: string | null
          created_at: string | null
          device_type: string | null
          error_type: string
          fingerprint: string | null
          first_seen_at: string | null
          id: string
          is_resolved: boolean | null
          last_seen_at: string | null
          message: string
          module: string | null
          occurrence_count: number | null
          os: string | null
          page_url: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          stack_trace: string | null
          suggested_fix: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          additional_data?: Json | null
          auto_diagnosis?: string | null
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          error_type: string
          fingerprint?: string | null
          first_seen_at?: string | null
          id?: string
          is_resolved?: boolean | null
          last_seen_at?: string | null
          message: string
          module?: string | null
          occurrence_count?: number | null
          os?: string | null
          page_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          stack_trace?: string | null
          suggested_fix?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          additional_data?: Json | null
          auto_diagnosis?: string | null
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          error_type?: string
          fingerprint?: string | null
          first_seen_at?: string | null
          id?: string
          is_resolved?: boolean | null
          last_seen_at?: string | null
          message?: string
          module?: string | null
          occurrence_count?: number | null
          os?: string | null
          page_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          stack_trace?: string | null
          suggested_fix?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      login_sessions: {
        Row: {
          browser: string | null
          browser_version: string | null
          created_at: string | null
          device_type: string | null
          id: string
          ip_address: string
          ip_city: string | null
          ip_country: string | null
          ip_isp: string | null
          ip_lat: number | null
          ip_lon: number | null
          ip_org: string | null
          ip_state: string | null
          ip_timezone: string | null
          is_active: boolean | null
          last_seen: string | null
          logged_out_at: string | null
          logout_reason: string | null
          os: string | null
          os_version: string | null
          session_token: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address: string
          ip_city?: string | null
          ip_country?: string | null
          ip_isp?: string | null
          ip_lat?: number | null
          ip_lon?: number | null
          ip_org?: string | null
          ip_state?: string | null
          ip_timezone?: string | null
          is_active?: boolean | null
          last_seen?: string | null
          logged_out_at?: string | null
          logout_reason?: string | null
          os?: string | null
          os_version?: string | null
          session_token: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string
          ip_city?: string | null
          ip_country?: string | null
          ip_isp?: string | null
          ip_lat?: number | null
          ip_lon?: number | null
          ip_org?: string | null
          ip_state?: string | null
          ip_timezone?: string | null
          is_active?: boolean | null
          last_seen?: string | null
          logged_out_at?: string | null
          logout_reason?: string | null
          os?: string | null
          os_version?: string | null
          session_token?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      razorpay_orders: {
        Row: {
          amount_inr: number
          bonus_credits: number | null
          created_at: string | null
          credits_to_add: number
          id: string
          paid_at: string | null
          razorpay_order_id: string
          razorpay_payment_id: string | null
          status: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          amount_inr: number
          bonus_credits?: number | null
          created_at?: string | null
          credits_to_add: number
          id?: string
          paid_at?: string | null
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          status?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          amount_inr?: number
          bonus_credits?: number | null
          created_at?: string | null
          credits_to_add?: number
          id?: string
          paid_at?: string | null
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          status?: string | null
          user_email?: string | null
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
      security_events: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          description: string | null
          device_info: string | null
          event_type: string
          id: string
          ip_address: string | null
          ip_location: string | null
          is_reviewed: boolean | null
          metadata: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          device_info?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          ip_location?: string | null
          is_reviewed?: boolean | null
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          device_info?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          ip_location?: string | null
          is_reviewed?: boolean | null
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string | null
          user_email?: string | null
          user_id?: string | null
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
      team_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          invited_by_name: string | null
          role: string
          status: string | null
          token: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          invited_by_name?: string | null
          role: string
          status?: string | null
          token?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          invited_by_name?: string | null
          role?: string
          status?: string | null
          token?: string | null
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
      user_credits: {
        Row: {
          balance: number
          free_credits_given: number
          lifetime_spent: number
          lifetime_topped: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          free_credits_given?: number
          lifetime_spent?: number
          lifetime_topped?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          free_credits_given?: number
          lifetime_spent?: number
          lifetime_topped?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      user_security_settings: {
        Row: {
          block_reason: string | null
          blocked_at: string | null
          blocked_by: string | null
          created_at: string | null
          id: string
          ip_whitelist: Json | null
          is_blocked: boolean | null
          last_violation_at: string | null
          max_concurrent_sessions: number | null
          max_unique_ips: number | null
          notes: string | null
          trusted_ips: Json | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          violation_count: number | null
        }
        Insert: {
          block_reason?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string | null
          id?: string
          ip_whitelist?: Json | null
          is_blocked?: boolean | null
          last_violation_at?: string | null
          max_concurrent_sessions?: number | null
          max_unique_ips?: number | null
          notes?: string | null
          trusted_ips?: Json | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          violation_count?: number | null
        }
        Update: {
          block_reason?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string | null
          id?: string
          ip_whitelist?: Json | null
          is_blocked?: boolean | null
          last_violation_at?: string | null
          max_concurrent_sessions?: number | null
          max_unique_ips?: number | null
          notes?: string | null
          trusted_ips?: Json | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          violation_count?: number | null
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
      add_user_credits: {
        Args: {
          p_amount: number
          p_description: string
          p_gifted_by?: string
          p_razorpay_order_id?: string
          p_razorpay_payment_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      deduct_user_credits: {
        Args: {
          p_amount: number
          p_call_type: string
          p_description: string
          p_tool_module: string
          p_user_id: string
        }
        Returns: Json
      }
      get_my_admin_role: { Args: never; Returns: string }
      get_signup_count: { Args: never; Returns: number }
      has_admin_role: {
        Args: { _roles: string[]; _user_id: string }
        Returns: boolean
      }
      increment_tool_actions: { Args: { row_id: string }; Returns: undefined }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      is_team_member: { Args: { _user_id: string }; Returns: boolean }
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
