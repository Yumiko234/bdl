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
      audience_requests: {
        Row: {
          created_at: string | null
          id: string
          message: string
          request_type: string
          requester_email: string
          requester_id: string
          requester_name: string
          review_message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          request_type: string
          requester_email: string
          requester_id: string
          requester_name: string
          review_message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          request_type?: string
          requester_email?: string
          requester_id?: string
          requester_name?: string
          review_message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      bdl_content: {
        Row: {
          content: string
          created_at: string | null
          display_order: number | null
          id: string
          section_key: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          section_key: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          section_key?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      bdl_members: {
        Row: {
          added_by: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_executive: boolean | null
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_executive?: boolean | null
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_executive?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bdl_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_forums: {
        Row: {
          class_name: string
          created_at: string | null
          description: string | null
          id: string
        }
        Insert: {
          class_name: string
          created_at?: string | null
          description?: string | null
          id?: string
        }
        Update: {
          class_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      clubs: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          name: string
          president_name: string
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          name: string
          president_name: string
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          name?: string
          president_name?: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_info: {
        Row: {
          content: string
          created_at: string | null
          display_order: number | null
          id: string
          section_key: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          section_key: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          section_key?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string
          created_at: string | null
          description: string
          file_size: string | null
          file_url: string | null
          id: string
          is_public: boolean | null
          title: string
          uploaded_by: string
          visibility: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          file_size?: string | null
          file_url?: string | null
          id?: string
          is_public?: boolean | null
          title: string
          uploaded_by: string
          visibility?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          file_size?: string | null
          file_url?: string | null
          id?: string
          is_public?: boolean | null
          title?: string
          uploaded_by?: string
          visibility?: string | null
        }
        Relationships: []
      }
      establishment_info: {
        Row: {
          content: string
          created_at: string | null
          display_order: number | null
          id: string
          section_key: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          section_key: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          section_key?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          author_avatar: string | null
          author_id: string
          author_name: string | null
          author_role: string | null
          created_at: string | null
          description: string
          end_date: string
          end_time: string | null
          id: number
          is_pinned: boolean | null
          start_date: string
          start_time: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_avatar?: string | null
          author_id: string
          author_name?: string | null
          author_role?: string | null
          created_at?: string | null
          description: string
          end_date: string
          end_time?: string | null
          id?: number
          is_pinned?: boolean | null
          start_date: string
          start_time?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_avatar?: string | null
          author_id?: string
          author_name?: string | null
          author_role?: string | null
          created_at?: string | null
          description?: string
          end_date?: string
          end_time?: string | null
          id?: number
          is_pinned?: boolean | null
          start_date?: string
          start_time?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      footer_content: {
        Row: {
          content: string
          created_at: string | null
          display_order: number | null
          id: string
          section_key: string
          title: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          section_key: string
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          section_key?: string
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      forum_messages: {
        Row: {
          author_id: string
          author_name: string
          created_at: string | null
          forum_id: string
          id: string
          message: string
        }
        Insert: {
          author_id: string
          author_name: string
          created_at?: string | null
          forum_id: string
          id?: string
          message: string
        }
        Update: {
          author_id?: string
          author_name?: string
          created_at?: string | null
          forum_id?: string
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_messages_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "class_forums"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          author_avatar: string | null
          author_id: string
          author_name: string | null
          author_role: string | null
          category: string
          content: string
          id: string
          is_important: boolean | null
          is_pinned: boolean | null
          published_at: string | null
          title: string
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          author_avatar?: string | null
          author_id: string
          author_name?: string | null
          author_role?: string | null
          category: string
          content: string
          id?: string
          is_important?: boolean | null
          is_pinned?: boolean | null
          published_at?: string | null
          title: string
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          author_avatar?: string | null
          author_id?: string
          author_name?: string | null
          author_role?: string | null
          category?: string
          content?: string
          id?: string
          is_important?: boolean | null
          is_pinned?: boolean | null
          published_at?: string | null
          title?: string
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      official_journal: {
        Row: {
          author_id: string
          author_name: string | null
          author_role: string | null
          content: string
          created_at: string
          id: string
          nor_number: string
          publication_date: string
          title: string
        }
        Insert: {
          author_id: string
          author_name?: string | null
          author_role?: string | null
          content: string
          created_at?: string
          id?: string
          nor_number: string
          publication_date: string
          title: string
        }
        Update: {
          author_id?: string
          author_name?: string | null
          author_role?: string | null
          content?: string
          created_at?: string
          id?: string
          nor_number?: string
          publication_date?: string
          title?: string
        }
        Relationships: []
      }
      president_message: {
        Row: {
          content: string
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          class_name: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          class_name?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          class_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
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
      is_bdl_staff: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "student"
        | "bdl_member"
        | "communication_manager"
        | "secretary_general"
        | "vice_president"
        | "president"
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
        "student",
        "bdl_member",
        "communication_manager",
        "secretary_general",
        "vice_president",
        "president",
      ],
    },
  },
} as const
