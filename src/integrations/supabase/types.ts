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
      analysis_history: {
        Row: {
          asset_id: string
          asset_type: string
          created_at: string
          data_source: string | null
          id: string
          market_phase: string | null
          name: string
          price: number
          signal_label: string
          signal_score: number
          symbol: string
          user_id: string
        }
        Insert: {
          asset_id: string
          asset_type: string
          created_at?: string
          data_source?: string | null
          id?: string
          market_phase?: string | null
          name: string
          price: number
          signal_label: string
          signal_score: number
          symbol: string
          user_id: string
        }
        Update: {
          asset_id?: string
          asset_type?: string
          created_at?: string
          data_source?: string | null
          id?: string
          market_phase?: string | null
          name?: string
          price?: number
          signal_label?: string
          signal_score?: number
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          admin_reply: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          replied_at: string | null
          status: string
          subject: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          replied_at?: string | null
          status?: string
          subject?: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          replied_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      daily_analysis_cache: {
        Row: {
          analyzed_at: string
          asset_id: string
          asset_type: string
          bb_position: number | null
          change_pct: number | null
          confidence: number | null
          dividend_yield: number | null
          exchange: string | null
          forecast_return_pct: number | null
          id: string
          macd_histogram: number | null
          market_phase: string | null
          name: string
          price: number
          rsi: number | null
          signal_label: string | null
          signal_score: number | null
          sma20: number | null
          sma50: number | null
          stochastic_k: number | null
          stop_loss: number | null
          symbol: string
          target_price: number | null
          timeframe_days: number
        }
        Insert: {
          analyzed_at?: string
          asset_id: string
          asset_type: string
          bb_position?: number | null
          change_pct?: number | null
          confidence?: number | null
          dividend_yield?: number | null
          exchange?: string | null
          forecast_return_pct?: number | null
          id?: string
          macd_histogram?: number | null
          market_phase?: string | null
          name: string
          price?: number
          rsi?: number | null
          signal_label?: string | null
          signal_score?: number | null
          sma20?: number | null
          sma50?: number | null
          stochastic_k?: number | null
          stop_loss?: number | null
          symbol: string
          target_price?: number | null
          timeframe_days?: number
        }
        Update: {
          analyzed_at?: string
          asset_id?: string
          asset_type?: string
          bb_position?: number | null
          change_pct?: number | null
          confidence?: number | null
          dividend_yield?: number | null
          exchange?: string | null
          forecast_return_pct?: number | null
          id?: string
          macd_histogram?: number | null
          market_phase?: string | null
          name?: string
          price?: number
          rsi?: number | null
          signal_label?: string | null
          signal_score?: number | null
          sma20?: number | null
          sma50?: number | null
          stochastic_k?: number | null
          stop_loss?: number | null
          symbol?: string
          target_price?: number | null
          timeframe_days?: number
        }
        Relationships: []
      }
      login_history: {
        Row: {
          city: string | null
          country: string | null
          id: string
          ip_address: string | null
          signed_in_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          id?: string
          ip_address?: string | null
          signed_in_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          id?: string
          ip_address?: string | null
          signed_in_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      market_digests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          asset_type: string
          created_by: string
          generated_at: string
          greeting: string | null
          id: string
          insights: Json | null
          market_summary: string | null
          recommendations: Json | null
          status: string
          updated_at: string
          watchlist_alerts: Json | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          asset_type: string
          created_by: string
          generated_at?: string
          greeting?: string | null
          id?: string
          insights?: Json | null
          market_summary?: string | null
          recommendations?: Json | null
          status?: string
          updated_at?: string
          watchlist_alerts?: Json | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          asset_type?: string
          created_by?: string
          generated_at?: string
          greeting?: string | null
          id?: string
          insights?: Json | null
          market_summary?: string | null
          recommendations?: Json | null
          status?: string
          updated_at?: string
          watchlist_alerts?: Json | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          preferences: Json | null
          subscribed_at: string
          unsubscribed_at: string | null
          user_id: string | null
        }
        Insert: {
          email: string
          id?: string
          preferences?: Json | null
          subscribed_at?: string
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Update: {
          email?: string
          id?: string
          preferences?: Json | null
          subscribed_at?: string
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pick_snapshots: {
        Row: {
          change_from_entry_pct: number
          created_at: string
          forecast_ema_price: number | null
          forecast_ensemble_price: number | null
          forecast_holt_price: number | null
          forecast_linear_price: number | null
          forecast_monte_carlo_price: number | null
          id: string
          pick_id: string
          price: number
          snapshot_date: string
        }
        Insert: {
          change_from_entry_pct?: number
          created_at?: string
          forecast_ema_price?: number | null
          forecast_ensemble_price?: number | null
          forecast_holt_price?: number | null
          forecast_linear_price?: number | null
          forecast_monte_carlo_price?: number | null
          id?: string
          pick_id: string
          price: number
          snapshot_date: string
        }
        Update: {
          change_from_entry_pct?: number
          created_at?: string
          forecast_ema_price?: number | null
          forecast_ensemble_price?: number | null
          forecast_holt_price?: number | null
          forecast_linear_price?: number | null
          forecast_monte_carlo_price?: number | null
          id?: string
          pick_id?: string
          price?: number
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "pick_snapshots_pick_id_fkey"
            columns: ["pick_id"]
            isOneToOne: false
            referencedRelation: "tracked_picks"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alerts: {
        Row: {
          active: boolean
          alert_type: string
          asset_id: string
          asset_type: string
          created_at: string
          id: string
          name: string
          reference_price: number | null
          symbol: string
          target_pct: number | null
          target_price: number | null
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          alert_type: string
          asset_id: string
          asset_type: string
          created_at?: string
          id?: string
          name: string
          reference_price?: number | null
          symbol: string
          target_pct?: number | null
          target_price?: number | null
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          alert_type?: string
          asset_id?: string
          asset_type?: string
          created_at?: string
          id?: string
          name?: string
          reference_price?: number | null
          symbol?: string
          target_pct?: number | null
          target_price?: number | null
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_at: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          banned_at?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          banned_at?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      tracked_picks: {
        Row: {
          asset_id: string
          asset_type: string
          case_study_text: string | null
          completed_at: string | null
          confidence: number
          created_at: string
          entry_price: number
          final_price: number | null
          final_return_pct: number | null
          forecast_ema_momentum: Json | null
          forecast_ensemble: Json | null
          forecast_holt: Json | null
          forecast_linear: Json | null
          forecast_monte_carlo: Json | null
          id: string
          month_start: string
          name: string
          reasoning: string | null
          signal_label: string
          signal_score: number
          status: string
          stop_loss: number | null
          symbol: string
          target_price: number | null
        }
        Insert: {
          asset_id: string
          asset_type: string
          case_study_text?: string | null
          completed_at?: string | null
          confidence?: number
          created_at?: string
          entry_price: number
          final_price?: number | null
          final_return_pct?: number | null
          forecast_ema_momentum?: Json | null
          forecast_ensemble?: Json | null
          forecast_holt?: Json | null
          forecast_linear?: Json | null
          forecast_monte_carlo?: Json | null
          id?: string
          month_start: string
          name: string
          reasoning?: string | null
          signal_label?: string
          signal_score?: number
          status?: string
          stop_loss?: number | null
          symbol: string
          target_price?: number | null
        }
        Update: {
          asset_id?: string
          asset_type?: string
          case_study_text?: string | null
          completed_at?: string | null
          confidence?: number
          created_at?: string
          entry_price?: number
          final_price?: number | null
          final_return_pct?: number | null
          forecast_ema_momentum?: Json | null
          forecast_ensemble?: Json | null
          forecast_holt?: Json | null
          forecast_linear?: Json | null
          forecast_monte_carlo?: Json | null
          id?: string
          month_start?: string
          name?: string
          reasoning?: string | null
          signal_label?: string
          signal_score?: number
          status?: string
          stop_loss?: number | null
          symbol?: string
          target_price?: number | null
        }
        Relationships: []
      }
      unsupported_coins: {
        Row: {
          coin_id: string
          created_at: string
          id: string
          name: string
          reason: string
        }
        Insert: {
          coin_id: string
          created_at?: string
          id?: string
          name: string
          reason: string
        }
        Update: {
          coin_id?: string
          created_at?: string
          id?: string
          name?: string
          reason?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          country: string | null
          default_timeframe_days: number
          forecast_percent: number
          id: string
          risk_profile: string
          secondary_currency: string | null
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          default_timeframe_days?: number
          forecast_percent?: number
          id?: string
          risk_profile?: string
          secondary_currency?: string | null
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          default_timeframe_days?: number
          forecast_percent?: number
          id?: string
          risk_profile?: string
          secondary_currency?: string | null
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watchlist_alert_settings: {
        Row: {
          created_at: string
          deviation_threshold_pct: number
          enabled: boolean
          forecast_deviation: boolean
          frequency: string
          id: string
          last_checked_at: string | null
          signal_change: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deviation_threshold_pct?: number
          enabled?: boolean
          forecast_deviation?: boolean
          frequency?: string
          id?: string
          last_checked_at?: string | null
          signal_change?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deviation_threshold_pct?: number
          enabled?: boolean
          forecast_deviation?: boolean
          frequency?: string
          id?: string
          last_checked_at?: string | null
          signal_change?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watchlist_alert_state: {
        Row: {
          asset_id: string
          id: string
          last_forecast_price: number | null
          last_price: number | null
          last_signal_label: string | null
          last_signal_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id: string
          id?: string
          last_forecast_price?: number | null
          last_price?: number | null
          last_signal_label?: string | null
          last_signal_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          id?: string
          last_forecast_price?: number | null
          last_price?: number | null
          last_signal_label?: string | null
          last_signal_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watchlist_groups: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      watchlist_items: {
        Row: {
          added_at: string
          asset_id: string
          asset_type: string
          group_id: string | null
          id: string
          name: string
          note: string | null
          symbol: string
          user_id: string
        }
        Insert: {
          added_at?: string
          asset_id: string
          asset_type: string
          group_id?: string | null
          id?: string
          name: string
          note?: string | null
          symbol: string
          user_id: string
        }
        Update: {
          added_at?: string
          asset_id?: string
          asset_type?: string
          group_id?: string | null
          id?: string
          name?: string
          note?: string | null
          symbol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "watchlist_groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_cache_stats: {
        Args: never
        Returns: {
          asset_type: string
          count: number
          exchange: string
          newest: string
          timeframe_days: number
        }[]
      }
      get_cron_jobs: {
        Args: never
        Returns: {
          command: string
          jobname: string
          schedule: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
