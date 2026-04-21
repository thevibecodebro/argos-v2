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
      call_annotations: {
        Row: {
          author_id: string
          call_id: string
          created_at: string
          id: string
          note: string
          timestamp_seconds: number | null
        }
        Insert: {
          author_id: string
          call_id: string
          created_at?: string
          id?: string
          note: string
          timestamp_seconds?: number | null
        }
        Update: {
          author_id?: string
          call_id?: string
          created_at?: string
          id?: string
          note?: string
          timestamp_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "call_annotations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_annotations_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      call_moments: {
        Row: {
          call_id: string
          category: string | null
          created_at: string
          highlight_note: string | null
          id: string
          is_highlight: boolean
          observation: string | null
          recommendation: string | null
          severity: string | null
          timestamp_seconds: number | null
        }
        Insert: {
          call_id: string
          category?: string | null
          created_at?: string
          highlight_note?: string | null
          id?: string
          is_highlight?: boolean
          observation?: string | null
          recommendation?: string | null
          severity?: string | null
          timestamp_seconds?: number | null
        }
        Update: {
          call_id?: string
          category?: string | null
          created_at?: string
          highlight_note?: string | null
          id?: string
          is_highlight?: boolean
          observation?: string | null
          recommendation?: string | null
          severity?: string | null
          timestamp_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "call_moments_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      call_scores: {
        Row: {
          call_id: string
          created_at: string
          id: string
          rubric_category_id: string
          score: number
        }
        Insert: {
          call_id: string
          created_at?: string
          id?: string
          rubric_category_id: string
          score: number
        }
        Update: {
          call_id?: string
          created_at?: string
          id?: string
          rubric_category_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "call_scores_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_scores_rubric_category_id_fkey"
            columns: ["rubric_category_id"]
            isOneToOne: false
            referencedRelation: "rubric_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      call_processing_jobs: {
        Row: {
          attempt_count: number
          call_id: string
          created_at: string
          id: string
          last_error: string | null
          last_stage: string | null
          lock_expires_at: string | null
          locked_at: string | null
          max_attempts: number
          next_run_at: string
          rubric_id: string | null
          source_content_type: string | null
          source_file_name: string
          source_origin: string
          source_size_bytes: number | null
          source_storage_path: string
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          call_id: string
          created_at?: string
          id?: string
          last_error?: string | null
          last_stage?: string | null
          lock_expires_at?: string | null
          locked_at?: string | null
          max_attempts?: number
          next_run_at?: string
          rubric_id?: string | null
          source_content_type?: string | null
          source_file_name: string
          source_origin: string
          source_size_bytes?: number | null
          source_storage_path: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          call_id?: string
          created_at?: string
          id?: string
          last_error?: string | null
          last_stage?: string | null
          lock_expires_at?: string | null
          locked_at?: string | null
          max_attempts?: number
          next_run_at?: string
          rubric_id?: string | null
          source_content_type?: string | null
          source_file_name?: string
          source_origin?: string
          source_size_bytes?: number | null
          source_storage_path?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_processing_jobs_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: true
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_processing_jobs_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          call_stage_reached: string | null
          call_topic: string | null
          closing_score: number | null
          confidence: string | null
          consent_confirmed: boolean
          created_at: string
          crm_deal_id: string | null
          discovery_score: number | null
          duration_seconds: number | null
          frame_control_score: number | null
          id: string
          improvements: Json | null
          objection_score: number | null
          org_id: string
          overall_score: number | null
          pain_expansion_score: number | null
          rapport_score: number | null
          recommended_drills: Json | null
          recording_url: string | null
          rep_id: string
          rubric_id: string | null
          solution_score: number | null
          status: string
          strengths: Json | null
          transcript: Json | null
          transcript_url: string | null
          zoom_meeting_id: string | null
          zoom_recording_id: string | null
        }
        Insert: {
          call_stage_reached?: string | null
          call_topic?: string | null
          closing_score?: number | null
          confidence?: string | null
          consent_confirmed?: boolean
          created_at?: string
          crm_deal_id?: string | null
          discovery_score?: number | null
          duration_seconds?: number | null
          frame_control_score?: number | null
          id?: string
          improvements?: Json | null
          objection_score?: number | null
          org_id: string
          overall_score?: number | null
          pain_expansion_score?: number | null
          rapport_score?: number | null
          recommended_drills?: Json | null
          recording_url?: string | null
          rep_id: string
          rubric_id?: string | null
          solution_score?: number | null
          status?: string
          strengths?: Json | null
          transcript?: Json | null
          transcript_url?: string | null
          zoom_meeting_id?: string | null
          zoom_recording_id?: string | null
        }
        Update: {
          call_stage_reached?: string | null
          call_topic?: string | null
          closing_score?: number | null
          confidence?: string | null
          consent_confirmed?: boolean
          created_at?: string
          crm_deal_id?: string | null
          discovery_score?: number | null
          duration_seconds?: number | null
          frame_control_score?: number | null
          id?: string
          improvements?: Json | null
          objection_score?: number | null
          org_id?: string
          overall_score?: number | null
          pain_expansion_score?: number | null
          rapport_score?: number | null
          recommended_drills?: Json | null
          recording_url?: string | null
          rep_id?: string
          rubric_id?: string | null
          solution_score?: number | null
          status?: string
          strengths?: Json | null
          transcript?: Json | null
          transcript_url?: string | null
          zoom_meeting_id?: string | null
          zoom_recording_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_integrations: {
        Row: {
          access_token: string
          connected_at: string
          id: string
          location_id: string
          location_name: string | null
          org_id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          connected_at?: string
          id?: string
          location_id: string
          location_name?: string | null
          org_id: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          connected_at?: string
          id?: string
          location_id?: string
          location_name?: string | null
          org_id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghl_integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          org_id: string
          role: string
          team_ids: string[] | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          org_id: string
          role: string
          team_ids?: string[] | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          org_id?: string
          role?: string
          team_ids?: string[] | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      org_compliance: {
        Row: {
          acknowledged_at: string
          acknowledged_by: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          org_id: string
          tos_version: string | null
          user_agent: string | null
        }
        Insert: {
          acknowledged_at?: string
          acknowledged_by: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          org_id: string
          tos_version?: string | null
          user_agent?: string | null
        }
        Update: {
          acknowledged_at?: string
          acknowledged_by?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          org_id?: string
          tos_version?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_compliance_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_compliance_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          plan: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          plan?: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          plan?: string
          slug?: string
        }
        Relationships: []
      }
      rep_manager_assignments: {
        Row: {
          created_at: string
          id: string
          manager_id: string
          org_id: string
          rep_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_id: string
          org_id: string
          rep_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_id?: string
          org_id?: string
          rep_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rep_manager_assignments_manager_org_id_users_id_org_id_fkey"
            columns: ["manager_id", "org_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "rep_manager_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rep_manager_assignments_rep_org_id_users_id_org_id_fkey"
            columns: ["rep_id", "org_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      roleplay_sessions: {
        Row: {
          created_at: string
          difficulty: string | null
          focus_category_slug: string | null
          focus_mode: string
          id: string
          industry: string | null
          org_id: string
          overall_score: number | null
          origin: string
          persona: string | null
          rep_id: string
          rubric_id: string | null
          scenario_brief: string | null
          scenario_summary: string | null
          source_call_id: string | null
          scorecard: Json | null
          status: string
          transcript: Json | null
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          focus_category_slug?: string | null
          focus_mode?: string
          id?: string
          industry?: string | null
          org_id: string
          overall_score?: number | null
          origin?: string
          persona?: string | null
          rep_id: string
          rubric_id?: string | null
          scenario_brief?: string | null
          scenario_summary?: string | null
          source_call_id?: string | null
          scorecard?: Json | null
          status?: string
          transcript?: Json | null
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          focus_category_slug?: string | null
          focus_mode?: string
          id?: string
          industry?: string | null
          org_id?: string
          overall_score?: number | null
          origin?: string
          persona?: string | null
          rep_id?: string
          rubric_id?: string | null
          scenario_brief?: string | null
          scenario_summary?: string | null
          source_call_id?: string | null
          scorecard?: Json | null
          status?: string
          transcript?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "roleplay_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roleplay_sessions_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roleplay_sessions_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roleplay_sessions_source_call_id_fkey"
            columns: ["source_call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      rubric_categories: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          rubric_id: string
          scoring_criteria: Json
          slug: string
          sort_order: number
          weight: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          name: string
          rubric_id: string
          scoring_criteria?: Json
          slug: string
          sort_order?: number
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          rubric_id?: string
          scoring_criteria?: Json
          slug?: string
          sort_order?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "rubric_categories_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrics: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_template: boolean
          name: string
          org_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_template?: boolean
          name: string
          org_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_template?: boolean
          name?: string
          org_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "rubrics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubrics_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          created_at: string
          id: string
          membership_type: string
          org_id: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          membership_type: string
          org_id: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          membership_type?: string
          org_id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_org_id_teams_id_org_id_fkey"
            columns: ["team_id", "org_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "team_memberships_user_org_id_users_id_org_id_fkey"
            columns: ["user_id", "org_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      team_permission_grants: {
        Row: {
          created_at: string
          granted_by: string
          id: string
          org_id: string
          permission_key: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by: string
          id?: string
          org_id: string
          permission_key: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string
          id?: string
          org_id?: string
          permission_key?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_permission_grants_granted_by_org_id_users_id_org_id_fkey"
            columns: ["granted_by", "org_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "team_permission_grants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_permission_grants_team_org_id_teams_id_org_id_fkey"
            columns: ["team_id", "org_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "team_permission_grants_user_org_id_users_id_org_id_fkey"
            columns: ["user_id", "org_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          org_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          org_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          order_index: number | null
          org_id: string
          quiz_data: Json | null
          skill_category: string | null
          title: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number | null
          org_id: string
          quiz_data?: Json | null
          skill_category?: string | null
          title?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number | null
          org_id?: string
          quiz_data?: Json | null
          skill_category?: string | null
          title?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_modules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_progress: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          attempts: number
          completed_at: string | null
          due_date: string | null
          id: string
          module_id: string
          rep_id: string
          score: number | null
          status: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          attempts?: number
          completed_at?: string | null
          due_date?: string | null
          id?: string
          module_id: string
          rep_id: string
          score?: number | null
          status?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          attempts?: number
          completed_at?: string | null
          due_date?: string | null
          id?: string
          module_id?: string
          rep_id?: string
          score?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progress_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          display_name_set: boolean
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          legacy_replit_user_id: string | null
          org_id: string | null
          profile_image_url: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name_set?: boolean
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          legacy_replit_user_id?: string | null
          org_id?: string | null
          profile_image_url?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name_set?: boolean
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          legacy_replit_user_id?: string | null
          org_id?: string | null
          profile_image_url?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_integrations: {
        Row: {
          access_token: string
          connected_at: string
          id: string
          org_id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
          webhook_id: string | null
          webhook_token: string | null
          zoom_account_id: string | null
          zoom_user_id: string | null
        }
        Insert: {
          access_token: string
          connected_at?: string
          id?: string
          org_id: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          webhook_id?: string | null
          webhook_token?: string | null
          zoom_account_id?: string | null
          zoom_user_id?: string | null
        }
        Update: {
          access_token?: string
          connected_at?: string
          id?: string
          org_id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          webhook_id?: string | null
          webhook_token?: string | null
          zoom_account_id?: string | null
          zoom_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      call_belongs_to_current_org: {
        Args: { target_call_id: string }
        Returns: boolean
      }
      current_user_can_read_call_with_permissions: {
        Args: { required_permissions: string[]; target_call_id: string }
        Returns: boolean
      }
      current_user_can_read_rep_with_permissions: {
        Args: { required_permissions: string[]; target_rep_id: string }
        Returns: boolean
      }
      current_user_can_see_team: {
        Args: { target_team_id: string }
        Returns: boolean
      }
      current_user_can_write_call_with_permissions: {
        Args: { required_permissions: string[]; target_call_id: string }
        Returns: boolean
      }
      current_user_can_write_rep_with_permissions: {
        Args: { required_permissions: string[]; target_rep_id: string }
        Returns: boolean
      }
      current_user_is_org_wide: { Args: never; Returns: boolean }
      current_user_org_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      user_belongs_to_current_org: {
        Args: { target_user_id: string }
        Returns: boolean
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
