export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: { id: string; name: string; created_at: string; updated_at: string; deleted_at: string | null };
        Insert: { id?: string; name: string; created_at?: string; updated_at?: string; deleted_at?: string | null };
        Update: { name?: string; updated_at?: string; deleted_at?: string | null };
      };
      profiles: {
        Row: { user_id: string; tenant_id: string; role: 'admin' | 'comercial' | 'tecnico' | 'financeiro' | 'cs' | 'leitor'; full_name: string; created_at: string; updated_at: string; deleted_at: string | null };
        Insert: { user_id: string; tenant_id: string; role?: 'admin' | 'comercial' | 'tecnico' | 'financeiro' | 'cs' | 'leitor'; full_name: string; created_at?: string; updated_at?: string; deleted_at?: string | null };
        Update: { tenant_id?: string; role?: 'admin' | 'comercial' | 'tecnico' | 'financeiro' | 'cs' | 'leitor'; full_name?: string; updated_at?: string; deleted_at?: string | null };
      };
      pipeline_stages: {
        Row: { id: string; tenant_id: string; name: string; order_no: number; is_won: boolean; is_lost: boolean; created_at: string; updated_at: string; deleted_at: string | null };
        Insert: { id?: string; tenant_id?: string; name: string; order_no: number; is_won?: boolean; is_lost?: boolean; created_at?: string; updated_at?: string; deleted_at?: string | null };
        Update: { name?: string; order_no?: number; is_won?: boolean; is_lost?: boolean; updated_at?: string; deleted_at?: string | null };
      };
      leads: {
        Row: { id: string; tenant_id: string; name: string; phone: string | null; email: string | null; source: string; status: string; score: number; notes: string | null; stage_id: string | null; assigned_to: string | null; units_hint: number | null; urgency: 'baixa' | 'media' | 'alta' | 'critica' | null; created_at: string; updated_at: string; deleted_at: string | null };
        Insert: { id?: string; tenant_id?: string; name: string; phone?: string | null; email?: string | null; source?: string; status?: string; score?: number; notes?: string | null; stage_id?: string | null; assigned_to?: string | null; units_hint?: number | null; urgency?: 'baixa' | 'media' | 'alta' | 'critica' | null; created_at?: string; updated_at?: string; deleted_at?: string | null };
        Update: { name?: string; phone?: string | null; email?: string | null; source?: string; status?: string; score?: number; notes?: string | null; stage_id?: string | null; assigned_to?: string | null; units_hint?: number | null; urgency?: 'baixa' | 'media' | 'alta' | 'critica' | null; updated_at?: string; deleted_at?: string | null };
      };
      condominiums: {
        Row: { id: string; tenant_id: string; name: string; cnpj: string | null; address: string | null; city: string | null; units_count: number; blocks_count: number; admin_company: string | null; created_at: string; updated_at: string; deleted_at: string | null };
        Insert: { id?: string; tenant_id?: string; name: string; cnpj?: string | null; address?: string | null; city?: string | null; units_count?: number; blocks_count?: number; admin_company?: string | null; created_at?: string; updated_at?: string; deleted_at?: string | null };
        Update: { name?: string; cnpj?: string | null; address?: string | null; city?: string | null; units_count?: number; blocks_count?: number; admin_company?: string | null; updated_at?: string; deleted_at?: string | null };
      };
      contacts: {
        Row: { id: string; tenant_id: string; condominium_id: string; name: string; role_in_condo: string | null; phone: string | null; email: string | null; created_at: string; updated_at: string; deleted_at: string | null };
        Insert: { id?: string; tenant_id?: string; condominium_id: string; name: string; role_in_condo?: string | null; phone?: string | null; email?: string | null; created_at?: string; updated_at?: string; deleted_at?: string | null };
        Update: { condominium_id?: string; name?: string; role_in_condo?: string | null; phone?: string | null; email?: string | null; updated_at?: string; deleted_at?: string | null };
      };
      proposals: {
        Row: { id: string; tenant_id: string; lead_id: string | null; condominium_id: string | null; status: string; items: Json; total: number; pdf_url: string | null; created_at: string; updated_at: string; deleted_at: string | null };
        Insert: { id?: string; tenant_id?: string; lead_id?: string | null; condominium_id?: string | null; status?: string; items?: Json; total?: number; pdf_url?: string | null; created_at?: string; updated_at?: string; deleted_at?: string | null };
        Update: { lead_id?: string | null; condominium_id?: string | null; status?: string; items?: Json; total?: number; pdf_url?: string | null; updated_at?: string; deleted_at?: string | null };
      };
      contracts: {
        Row: { id: string; tenant_id: string; proposal_id: string; status: string; start_date: string; mrr: number; reajuste_percent: number; created_at: string; updated_at: string; deleted_at: string | null };
        Insert: { id?: string; tenant_id?: string; proposal_id: string; status?: string; start_date: string; mrr: number; reajuste_percent?: number; created_at?: string; updated_at?: string; deleted_at?: string | null };
        Update: { proposal_id?: string; status?: string; start_date?: string; mrr?: number; reajuste_percent?: number; updated_at?: string; deleted_at?: string | null };
      };
      projects: {
        Row: { id: string; tenant_id: string; contract_id: string; status: string; due_date: string | null; created_at: string; updated_at: string; deleted_at: string | null };
        Insert: { id?: string; tenant_id?: string; contract_id: string; status?: string; due_date?: string | null; created_at?: string; updated_at?: string; deleted_at?: string | null };
        Update: { contract_id?: string; status?: string; due_date?: string | null; updated_at?: string; deleted_at?: string | null };
      };
      tasks: {
        Row: { id: string; tenant_id: string; project_id: string; title: string; status: string; assigned_to: string | null; due_date: string | null; created_at: string; updated_at: string; deleted_at: string | null };
        Insert: { id?: string; tenant_id?: string; project_id: string; title: string; status?: string; assigned_to?: string | null; due_date?: string | null; created_at?: string; updated_at?: string; deleted_at?: string | null };
        Update: { project_id?: string; title?: string; status?: string; assigned_to?: string | null; due_date?: string | null; updated_at?: string; deleted_at?: string | null };
      };
      work_orders: {
        Row: { id: string; tenant_id: string; condominium_id: string; category: string; priority: 'baixa' | 'media' | 'alta' | 'critica'; status: string; sla_due_at: string; assigned_to: string | null; cost: number; description: string; created_at: string; updated_at: string; deleted_at: string | null };
        Insert: { id?: string; tenant_id?: string; condominium_id: string; category: string; priority?: 'baixa' | 'media' | 'alta' | 'critica'; status?: string; sla_due_at?: string; assigned_to?: string | null; cost?: number; description: string; created_at?: string; updated_at?: string; deleted_at?: string | null };
        Update: { condominium_id?: string; category?: string; priority?: 'baixa' | 'media' | 'alta' | 'critica'; status?: string; sla_due_at?: string; assigned_to?: string | null; cost?: number; description?: string; updated_at?: string; deleted_at?: string | null };
      };
      timeline_events: {
        Row: { id: string; tenant_id: string; entity_type: string; entity_id: string; type: string; content: string; created_by: string | null; created_at: string };
        Insert: { id?: string; tenant_id?: string; entity_type: string; entity_id: string; type?: string; content: string; created_by?: string | null; created_at?: string };
        Update: { type?: string; content?: string; created_by?: string | null };
      };
      receivables: {
        Row: { id: string; tenant_id: string; contract_id: string; due_date: string; amount: number; status: string; paid_at: string | null; created_at: string; updated_at: string; deleted_at: string | null };
        Insert: { id?: string; tenant_id?: string; contract_id: string; due_date: string; amount: number; status?: string; paid_at?: string | null; created_at?: string; updated_at?: string; deleted_at?: string | null };
        Update: { contract_id?: string; due_date?: string; amount?: number; status?: string; paid_at?: string | null; updated_at?: string; deleted_at?: string | null };
      };
      audit_logs: {
        Row: { id: string; tenant_id: string; table_name: string; record_id: string; action: string; before: Json | null; after: Json | null; actor: string | null; created_at: string };
        Insert: { id?: string; tenant_id: string; table_name: string; record_id: string; action: string; before?: Json | null; after?: Json | null; actor?: string | null; created_at?: string };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_tenant: { Args: Record<string, never>; Returns: string };
      is_role: { Args: { requested_role: string }; Returns: boolean };
    };
    Enums: {
      app_role: 'admin' | 'comercial' | 'tecnico' | 'financeiro' | 'cs' | 'leitor';
      work_priority: 'baixa' | 'media' | 'alta' | 'critica';
      proposal_status: 'rascunho' | 'enviada' | 'aceita' | 'recusada';
      contract_status: 'ativo' | 'pendente' | 'cancelado';
      work_order_status: 'aberta' | 'em_andamento' | 'concluida' | 'cancelada';
      receivable_status: 'aberto' | 'pago' | 'atrasado';
    };
  };
}
