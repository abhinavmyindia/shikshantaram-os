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
          byok: boolean | null
          call_type: string
          created_at: string | null
          estimated_cost_usd: number
          id: string
          input_tokens: number
          logged_from: string | null
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
          byok?: boolean | null
          call_type: string
          created_at?: string | null
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          logged_from?: string | null
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
          byok?: boolean | null
          call_type?: string
          created_at?: string | null
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          logged_from?: string | null
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
      byok_usage_logs: {
        Row: {
          call_type: string
          created_at: string | null
          error_message: string | null
          id: string
          input_tokens: number | null
          model: string
          module: string
          output_tokens: number | null
          provider: string
          success: boolean | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          call_type: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          model: string
          module: string
          output_tokens?: number | null
          provider: string
          success?: boolean | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          call_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          model?: string
          module?: string
          output_tokens?: number | null
          provider?: string
          success?: boolean | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          image_urls: string[] | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
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
          idempotency_key: string | null
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
          idempotency_key?: string | null
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
          idempotency_key?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          tool_module?: string | null
          type?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      deletion_requests: {
        Row: {
          admin_notes: string | null
          id: string
          reason: string | null
          requested_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_email: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          admin_notes?: string | null
          id?: string
          reason?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_email: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          admin_notes?: string | null
          id?: string
          reason?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_email?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      edge_function_logs: {
        Row: {
          action: string | null
          created_at: string | null
          function_name: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          function_name?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          function_name?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_delivery_log: {
        Row: {
          context: string | null
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          provider_message_id: string | null
          recipient_email: string
          recipient_user_id: string | null
          status: string
          triggered_by_email: string | null
          triggered_by_user_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_email: string
          recipient_user_id?: string | null
          status: string
          triggered_by_email?: string | null
          triggered_by_user_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_email?: string
          recipient_user_id?: string | null
          status?: string
          triggered_by_email?: string | null
          triggered_by_user_id?: string | null
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
      global_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
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
      price_change_log: {
        Row: {
          call_type: string
          changed_at: string | null
          changed_by: string | null
          changed_by_email: string | null
          display_name: string | null
          id: string
          new_credits: number
          old_credits: number
          reason: string | null
          tool_module: string
        }
        Insert: {
          call_type: string
          changed_at?: string | null
          changed_by?: string | null
          changed_by_email?: string | null
          display_name?: string | null
          id?: string
          new_credits: number
          old_credits: number
          reason?: string | null
          tool_module: string
        }
        Update: {
          call_type?: string
          changed_at?: string | null
          changed_by?: string | null
          changed_by_email?: string | null
          display_name?: string | null
          id?: string
          new_credits?: number
          old_credits?: number
          reason?: string | null
          tool_module?: string
        }
        Relationships: []
      }
      product_creator_configs: {
        Row: {
          created_at: string | null
          embed_url: string
          id: string
          is_active: boolean | null
          product_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          embed_url: string
          id?: string
          is_active?: boolean | null
          product_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          embed_url?: string
          id?: string
          is_active?: boolean | null
          product_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_creator_monthly_usage: {
        Row: {
          checklist_count: number | null
          colouring_book_count: number | null
          course_count: number | null
          created_at: string | null
          fiction_book_count: number | null
          id: string
          mindmap_count: number | null
          nonfiction_book_count: number | null
          updated_at: string | null
          user_id: string
          year_month: string
        }
        Insert: {
          checklist_count?: number | null
          colouring_book_count?: number | null
          course_count?: number | null
          created_at?: string | null
          fiction_book_count?: number | null
          id?: string
          mindmap_count?: number | null
          nonfiction_book_count?: number | null
          updated_at?: string | null
          user_id: string
          year_month: string
        }
        Update: {
          checklist_count?: number | null
          colouring_book_count?: number | null
          course_count?: number | null
          created_at?: string | null
          fiction_book_count?: number | null
          id?: string
          mindmap_count?: number | null
          nonfiction_book_count?: number | null
          updated_at?: string | null
          user_id?: string
          year_month?: string
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
      recent_work: {
        Row: {
          call_type: string
          created_at: string | null
          expires_at: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          subtitle: string | null
          title: string
          tool: string
          user_id: string
        }
        Insert: {
          call_type: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          subtitle?: string | null
          title: string
          tool: string
          user_id: string
        }
        Update: {
          call_type?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          subtitle?: string | null
          title?: string
          tool?: string
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
          ip_address: string | null
          notes: string | null
          payment_type: string
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          user_agent: string | null
        }
        Insert: {
          email: string
          full_name: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          payment_type: string
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          user_agent?: string | null
        }
        Update: {
          email?: string
          full_name?: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          payment_type?: string
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          user_agent?: string | null
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
      trial_requests: {
        Row: {
          access_duration_days: number | null
          access_ends_at: string | null
          access_starts_at: string | null
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          ip_address: string | null
          otp_code: string | null
          otp_expires_at: string | null
          otp_verified: boolean | null
          payment_amount: number | null
          payment_link: string | null
          payment_status: string | null
          phone: string
          status: string
          submitted_at: string | null
          trial_credits: number | null
          updated_at: string | null
          upgraded_at: string | null
          upgraded_to_tier: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_duration_days?: number | null
          access_ends_at?: string | null
          access_starts_at?: string | null
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          ip_address?: string | null
          otp_code?: string | null
          otp_expires_at?: string | null
          otp_verified?: boolean | null
          payment_amount?: number | null
          payment_link?: string | null
          payment_status?: string | null
          phone: string
          status?: string
          submitted_at?: string | null
          trial_credits?: number | null
          updated_at?: string | null
          upgraded_at?: string | null
          upgraded_to_tier?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_duration_days?: number | null
          access_ends_at?: string | null
          access_starts_at?: string | null
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          ip_address?: string | null
          otp_code?: string | null
          otp_expires_at?: string | null
          otp_verified?: boolean | null
          payment_amount?: number | null
          payment_link?: string | null
          payment_status?: string | null
          phone?: string
          status?: string
          submitted_at?: string | null
          trial_credits?: number | null
          updated_at?: string | null
          upgraded_at?: string | null
          upgraded_to_tier?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_byok_keys: {
        Row: {
          created_at: string | null
          encrypted_key: string
          id: string
          is_active: boolean | null
          is_valid: boolean | null
          iv: string
          key_hint: string
          last_used_at: string | null
          last_validated_at: string | null
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_key: string
          id?: string
          is_active?: boolean | null
          is_valid?: boolean | null
          iv: string
          key_hint: string
          last_used_at?: string | null
          last_validated_at?: string | null
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_key?: string
          id?: string
          is_active?: boolean | null
          is_valid?: boolean | null
          iv?: string
          key_hint?: string
          last_used_at?: string | null
          last_validated_at?: string | null
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      user_knowledge_docs: {
        Row: {
          created_at: string | null
          detected_niche: string | null
          expertise_tags: string[] | null
          extracted_text: string | null
          file_size_bytes: number | null
          file_type: string
          filename: string
          id: string
          is_active: boolean | null
          storage_path: string | null
          summary: string | null
          updated_at: string | null
          use_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          detected_niche?: string | null
          expertise_tags?: string[] | null
          extracted_text?: string | null
          file_size_bytes?: number | null
          file_type: string
          filename: string
          id?: string
          is_active?: boolean | null
          storage_path?: string | null
          summary?: string | null
          updated_at?: string | null
          use_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          detected_niche?: string | null
          expertise_tags?: string[] | null
          extracted_text?: string | null
          file_size_bytes?: number | null
          file_type?: string
          filename?: string
          id?: string
          is_active?: boolean | null
          storage_path?: string | null
          summary?: string | null
          updated_at?: string | null
          use_count?: number | null
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
      user_products: {
        Row: {
          author_name: string | null
          completed_at: string | null
          country: string | null
          created_at: string | null
          id: string
          niche: string | null
          product_name: string
          product_type: string
          source: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          author_name?: string | null
          completed_at?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          niche?: string | null
          product_name: string
          product_type: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          author_name?: string | null
          completed_at?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          niche?: string | null
          product_name?: string
          product_type?: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          access_tier: string
          added_by: string | null
          avatar_color: string | null
          avatar_gradient: string | null
          avatar_initials: string | null
          bio: string | null
          byok_preferred_provider: string | null
          created_at: string | null
          credits_enforcement: string | null
          deletion_requested: boolean | null
          deletion_requested_at: string | null
          facebook: string | null
          full_name: string
          id: string
          instagram: string | null
          instagram_url: string | null
          is_beta_user: boolean | null
          is_trial: boolean | null
          linkedin: string | null
          linkedin_url: string | null
          notes: string | null
          notif_credits: boolean | null
          notif_new_tools: boolean | null
          notif_security: boolean | null
          notif_tips: boolean | null
          payment_amount: number | null
          payment_status: string
          phone: string | null
          trial_ends_at: string | null
          trial_request_id: string | null
          trial_source_tier: string | null
          trial_started_at: string | null
          twitter: string | null
          twitter_url: string | null
          updated_at: string | null
          username: string | null
          website: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          access_tier?: string
          added_by?: string | null
          avatar_color?: string | null
          avatar_gradient?: string | null
          avatar_initials?: string | null
          bio?: string | null
          byok_preferred_provider?: string | null
          created_at?: string | null
          credits_enforcement?: string | null
          deletion_requested?: boolean | null
          deletion_requested_at?: string | null
          facebook?: string | null
          full_name?: string
          id: string
          instagram?: string | null
          instagram_url?: string | null
          is_beta_user?: boolean | null
          is_trial?: boolean | null
          linkedin?: string | null
          linkedin_url?: string | null
          notes?: string | null
          notif_credits?: boolean | null
          notif_new_tools?: boolean | null
          notif_security?: boolean | null
          notif_tips?: boolean | null
          payment_amount?: number | null
          payment_status?: string
          phone?: string | null
          trial_ends_at?: string | null
          trial_request_id?: string | null
          trial_source_tier?: string | null
          trial_started_at?: string | null
          twitter?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          access_tier?: string
          added_by?: string | null
          avatar_color?: string | null
          avatar_gradient?: string | null
          avatar_initials?: string | null
          bio?: string | null
          byok_preferred_provider?: string | null
          created_at?: string | null
          credits_enforcement?: string | null
          deletion_requested?: boolean | null
          deletion_requested_at?: string | null
          facebook?: string | null
          full_name?: string
          id?: string
          instagram?: string | null
          instagram_url?: string | null
          is_beta_user?: boolean | null
          is_trial?: boolean | null
          linkedin?: string | null
          linkedin_url?: string | null
          notes?: string | null
          notif_credits?: boolean | null
          notif_new_tools?: boolean | null
          notif_security?: boolean | null
          notif_tips?: boolean | null
          payment_amount?: number | null
          payment_status?: string
          phone?: string | null
          trial_ends_at?: string | null
          trial_request_id?: string | null
          trial_source_tier?: string | null
          trial_started_at?: string | null
          twitter?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_trial_request_id_fkey"
            columns: ["trial_request_id"]
            isOneToOne: false
            referencedRelation: "trial_requests"
            referencedColumns: ["id"]
          },
        ]
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
      user_byok_keys_safe: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          is_valid: boolean | null
          key_hint: string | null
          last_used_at: string | null
          last_validated_at: string | null
          provider: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          is_valid?: boolean | null
          key_hint?: string | null
          last_used_at?: string | null
          last_validated_at?: string | null
          provider?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          is_valid?: boolean | null
          key_hint?: string | null
          last_used_at?: string | null
          last_validated_at?: string | null
          provider?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      deduct_chat_credits: {
        Args: { p_amount: number; p_user_id: string }
        Returns: Json
      }
      deduct_user_credits:
        | {
            Args: {
              p_amount: number
              p_call_type: string
              p_description: string
              p_tool_module: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_call_type: string
              p_description: string
              p_idempotency_key?: string
              p_tool_module: string
              p_user_id: string
            }
            Returns: Json
          }
      delete_expired_recent_work: { Args: never; Returns: undefined }
      expire_trial_users: { Args: never; Returns: undefined }
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
