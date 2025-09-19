export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          message_type: string | null
          metadata: Json | null
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_type?: string | null
          metadata?: Json | null
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_type?: string | null
          metadata?: Json | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "collaboration_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      community_groups: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      } 
     collaboration_files: {
        Row: {
          content: string
          created_at: string
          created_by: string
          group_id: string
          id: string
          language: string
          name: string
          path: string
          updated_at: string
          version: number
        }
        Insert: {
          content?: string
          created_at?: string
          created_by: string
          group_id: string
          id?: string
          language?: string
          name: string
          path: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          group_id?: string
          id?: string
          language?: string
          name?: string
          path?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "collaboration_files_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_sessions: {
        Row: {
          cursor_position: Json | null
          current_file_id: string | null
          group_id: string
          id: string
          joined_at: string
          last_activity: string
          status: string
          user_id: string
        }
        Insert: {
          cursor_position?: Json | null
          current_file_id?: string | null
          group_id: string
          id?: string
          joined_at?: string
          last_activity?: string
          status?: string
          user_id: string
        }
        Update: {
          cursor_position?: Json | null
          current_file_id?: string | null
          group_id?: string
          id?: string
          joined_at?: string
          last_activity?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_sessions_current_file_id_fkey"
            columns: ["current_file_id"]
            isOneToOne: false
            referencedRelation: "collaboration_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      file_changes: {
        Row: {
          applied: boolean
          content: string | null
          file_id: string
          id: string
          operation_type: string
          position_end: number | null
          position_start: number
          timestamp: string
          user_id: string
          version: number
        }
        Insert: {
          applied?: boolean
          content?: string | null
          file_id: string
          id?: string
          operation_type: string
          position_end?: number | null
          position_start: number
          timestamp?: string
          user_id: string
          version: number
        }
        Update: {
          applied?: boolean
          content?: string | null
          file_id?: string
          id?: string
          operation_type?: string
          position_end?: number | null
          position_start?: number
          timestamp?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_changes_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "collaboration_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_changes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      file_bookmarks: {
        Row: {
          created_at: string
          file_id: string
          id: string
          name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_id: string
          id?: string
          name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_id?: string
          id?: string
          name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_bookmarks_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "collaboration_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      collaboration_code: {
        Row: {
          content: string
          created_at: string
          id: string
          language: string
          room_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          language?: string
          room_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          language?: string
          room_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      collaboration_rooms: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_private: boolean | null
          max_participants: number | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          max_participants?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          max_participants?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      } 
     group_memberships: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          description: string | null
          display_name: string | null
          github_url: string | null
          id: string
          is_username_set: boolean | null
          linkedin_url: string | null
          location: string | null
          skills: string[] | null
          twitter_url: string | null
          updated_at: string
          user_id: string
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          github_url?: string | null
          id?: string
          is_username_set?: boolean | null
          linkedin_url?: string | null
          location?: string | null
          skills?: string[] | null
          twitter_url?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          github_url?: string | null
          id?: string
          is_username_set?: boolean | null
          linkedin_url?: string | null
          location?: string | null
          skills?: string[] | null
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_room_participant_safe: {
        Args: { check_room_id: string; check_user_id: string }
        Returns: boolean
      }
      get_file_latest_version: {
        Args: { file_uuid: string }
        Returns: number
      }
      apply_file_changes: {
        Args: { file_uuid: string; new_content: string; change_user_id: string }
        Returns: number
      }
      get_pending_changes: {
        Args: { file_uuid: string }
        Returns: {
          id: string
          user_id: string
          operation_type: string
          position_start: number
          position_end: number | null
          content: string | null
          version: number
          timestamp: string
        }[]
      }
      update_session_activity: {
        Args: { 
          group_uuid: string
          session_user_id: string
          file_uuid?: string
          cursor_pos?: Json
        }
        Returns: void
      }
      cleanup_inactive_sessions: {
        Args: {}
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never