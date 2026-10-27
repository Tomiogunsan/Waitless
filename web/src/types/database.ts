
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "appointments": {
                  Row: {
                    "actual_ended_at": string | null,"actual_started_at": string | null,"cancellation_reason": string | null,"cancelled_at": string | null,"cancelled_by": string | null,"cancelled_by_patient": boolean,"checked_in_at": string | null,"created_at": string,"department_id": string,"id": string,"no_show_at": string | null,"no_show_by": string | null,"original_scheduled_at": string,"patient_id": string,"physician_id": string,"physician_role": string,"reference_code": string,"reschedule_needs_review": boolean,"reschedule_review_reason": string | null,"scheduled_at": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_ended_at"?: string | null,"actual_started_at"?: string | null,"cancellation_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"cancelled_by_patient"?: boolean,"checked_in_at"?: string | null,"created_at"?: string,"department_id": string,"id"?: string,"no_show_at"?: string | null,"no_show_by"?: string | null,"original_scheduled_at": string,"patient_id": string,"physician_id": string,"physician_role"?: string,"reference_code"?: string,"reschedule_needs_review"?: boolean,"reschedule_review_reason"?: string | null,"scheduled_at": string,"status"?: string
                  }
                  Update: {
                    "actual_ended_at"?: string | null,"actual_started_at"?: string | null,"cancellation_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"cancelled_by_patient"?: boolean,"checked_in_at"?: string | null,"created_at"?: string,"department_id"?: string,"id"?: string,"no_show_at"?: string | null,"no_show_by"?: string | null,"original_scheduled_at"?: string,"patient_id"?: string,"physician_id"?: string,"physician_role"?: string,"reference_code"?: string,"reschedule_needs_review"?: boolean,"reschedule_review_reason"?: string | null,"scheduled_at"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "appointments_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_no_show_by_fkey"
      columns: ["no_show_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: false
      referencedRelation: "patients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_physician_id_physician_role_fkey"
      columns: ["physician_id","physician_role"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id","role"]
    }
                  ]
                },"departments": {
                  Row: {
                    "created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"patient_medical_info": {
                  Row: {
                    "allergies": string,"medical_history": string | null,"patient_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allergies"?: string,"medical_history"?: string | null,"patient_id": string,"updated_at"?: string
                  }
                  Update: {
                    "allergies"?: string,"medical_history"?: string | null,"patient_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "patient_medical_info_patient_id_fkey"
      columns: ["patient_id"]
isOneToOne: true
      referencedRelation: "patients"
      referencedColumns: ["id"]
    }
                  ]
                },"patients": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string,"id": string,"phone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name": string,"id"?: string,"phone": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"phone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"physician_schedule_exceptions": {
                  Row: {
                    "created_at": string,"exception_date": string,"id": string,"physician_id": string,"physician_role": string,"reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"exception_date": string,"id"?: string,"physician_id": string,"physician_role"?: string,"reason"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"exception_date"?: string,"id"?: string,"physician_id"?: string,"physician_role"?: string,"reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "physician_schedule_exceptions_physician_id_physician_role_fkey"
      columns: ["physician_id","physician_role"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id","role"]
    }
                  ]
                },"physician_working_hours": {
                  Row: {
                    "created_at": string,"day_of_week": number,"end_time": string,"id": string,"physician_id": string,"physician_role": string,"start_time": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"day_of_week": number,"end_time": string,"id"?: string,"physician_id": string,"physician_role"?: string,"start_time": string
                  }
                  Update: {
                    "created_at"?: string,"day_of_week"?: number,"end_time"?: string,"id"?: string,"physician_id"?: string,"physician_role"?: string,"start_time"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "physician_working_hours_physician_id_physician_role_fkey"
      columns: ["physician_id","physician_role"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id","role"]
    }
                  ]
                },"staff": {
                  Row: {
                    "deactivated_at": string | null,"department_id": string | null,"full_name": string,"id": string,"is_active": boolean,"role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "deactivated_at"?: string | null,"department_id"?: string | null,"full_name": string,"id": string,"is_active"?: boolean,"role": string
                  }
                  Update: {
                    "deactivated_at"?: string | null,"department_id"?: string | null,"full_name"?: string,"id"?: string,"is_active"?: boolean,"role"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    }
                  ]
                },"visit_notes": {
                  Row: {
                    "appointment_id": string,"created_at": string,"diagnosis": string,"id": string,"physician_id": string,"physician_role": string,"prescription": string | null,"symptoms": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "appointment_id": string,"created_at"?: string,"diagnosis": string,"id"?: string,"physician_id": string,"physician_role"?: string,"prescription"?: string | null,"symptoms": string,"updated_at"?: string
                  }
                  Update: {
                    "appointment_id"?: string,"created_at"?: string,"diagnosis"?: string,"id"?: string,"physician_id"?: string,"physician_role"?: string,"prescription"?: string | null,"symptoms"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visit_notes_appointment_id_physician_id_fkey"
      columns: ["appointment_id","physician_id"]
isOneToOne: false
      referencedRelation: "appointments"
      referencedColumns: ["id","physician_id"]
    },{
      foreignKeyName: "visit_notes_physician_id_physician_role_fkey"
      columns: ["physician_id","physician_role"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id","role"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "appointment_time_range":
{ Args: { "p_scheduled_at": string }; Returns: unknown
                           },
"book_appointment":
{ Args: { "p_patient_id": string,"p_physician_id": string,"p_scheduled_at": string }; Returns: string
                           },
"book_public_appointment":
{ Args: { "p_department_id": string,"p_email"?: string,"p_full_name": string,"p_phone": string,"p_scheduled_at": string }; Returns: {
              "appointment_time": string,"booking_reference": string,"department_name": string
            }[]
                           },
"cancel_appointment":
{ Args: { "p_appointment_id": string,"p_reason"?: string }; Returns: undefined
                           },
"cancel_public_appointment":
{ Args: { "p_phone": string,"p_reason"?: string,"p_reference_code": string }; Returns: undefined
                           },
"change_staff_role":
{ Args: { "p_department_id"?: string,"p_role": string,"p_staff_id": string }; Returns: undefined
                           },
"check_in_appointment":
{ Args: { "p_appointment_id": string }; Returns: undefined
                           },
"complete_consultation":
{ Args: { "p_appointment_id": string }; Returns: undefined
                           },
"current_staff_role":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_available_slots":
{ Args: { "p_date": string,"p_department_id": string }; Returns: {
              "is_available": boolean,"slot_at": string
            }[]
                           },
"get_public_appointment":
{ Args: { "p_phone": string,"p_reference_code": string }; Returns: {
              "appointment_status": string,"appointment_time": string,"booking_reference": string,"department_name": string,"physician_name": string,"time_under_review": boolean
            }[]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"lock_staff_for_admin_change":
{ Args: { "p_staff_id": string }; Returns: undefined
                           },
"mark_appointment_no_show":
{ Args: { "p_appointment_id": string }; Returns: undefined
                           },
"normalize_phone":
{ Args: { "p_phone": string }; Returns: string
                           },
"physician_is_available":
{ Args: { "p_exclude_appointment_id"?: string,"p_physician_id": string,"p_require_slot_start"?: boolean,"p_scheduled_at": string }; Returns: boolean
                           },
"physician_treats_appointment_patient":
{ Args: { "p_appointment_id": string }; Returns: boolean
                           },
"physician_treats_patient":
{ Args: { "p_patient_id": string }; Returns: boolean
                           },
"pick_free_physician":
{ Args: { "p_department_id": string,"p_exclude_appointment_id"?: string,"p_exclude_physician_id"?: string,"p_require_slot_start"?: boolean,"p_scheduled_at": string }; Returns: string
                           },
"reassign_appointment":
{ Args: { "p_appointment_id": string,"p_new_physician_id"?: string }; Returns: string
                           },
"reassign_physician_appointments":
{ Args: { "p_physician_id": string }; Returns: {
              "needs_review_count": number,"reassigned_count": number
            }[]
                           },
"reschedule_appointment":
{ Args: { "p_appointment_id": string,"p_new_scheduled_at": string }; Returns: undefined
                           },
"reschedule_public_appointment":
{ Args: { "p_new_scheduled_at": string,"p_phone": string,"p_reference_code": string }; Returns: {
              "appointment_time": string,"booking_reference": string,"department_name": string
            }[]
                           },
"save_visit_note":
{ Args: { "p_appointment_id": string,"p_diagnosis": string,"p_prescription"?: string,"p_symptoms": string }; Returns: string
                           },
"set_staff_active":
{ Args: { "p_active": boolean,"p_staff_id": string }; Returns: undefined
                           },
"start_consultation":
{ Args: { "p_appointment_id": string }; Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
