import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/lib/supabase.types';

export type LeadInsert = Database['public']['Tables']['leads']['Insert'];

export async function getLeads() {
  const { data, error } = await supabase.from('leads').select('*, pipeline_stages(name), profiles!leads_assigned_to_fkey(full_name)').is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertLead(payload: LeadInsert) {
  const { error } = await supabase.from('leads').upsert(payload);
  if (error) throw error;
}

export async function updateLead(id: string, payload: Database['public']['Tables']['leads']['Update']) {
  const { error } = await supabase.from('leads').update(payload).eq('id', id);
  if (error) throw error;
}

export async function softDeleteLead(id: string) {
  const { error } = await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
