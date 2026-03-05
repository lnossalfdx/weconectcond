import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/lib/supabase.types';

export async function getUsersAndStages() {
  const [users, stages, tenant] = await Promise.all([
    supabase.from('profiles').select('*').is('deleted_at', null).order('full_name'),
    supabase.from('pipeline_stages').select('*').is('deleted_at', null).order('order_no'),
    supabase.from('tenants').select('*').is('deleted_at', null).limit(1).single(),
  ]);

  if (users.error) throw users.error;
  if (stages.error) throw stages.error;
  if (tenant.error) throw tenant.error;

  return { users: users.data, stages: stages.data, tenant: tenant.data };
}

export async function updateUserRole(user_id: string, role: Database['public']['Enums']['app_role']) {
  const { error } = await supabase.from('profiles').update({ role }).eq('user_id', user_id);
  if (error) throw error;
}

export async function updateUserProfile(user_id: string, payload: Database['public']['Tables']['profiles']['Update']) {
  const { error } = await supabase.from('profiles').update(payload).eq('user_id', user_id);
  if (error) throw error;
}

export async function upsertStage(stage: { id?: string; name: string; order_no: number; is_won?: boolean; is_lost?: boolean }) {
  const { error } = await supabase.from('pipeline_stages').upsert(stage);
  if (error) throw error;
}

export async function updateStage(id: string, payload: Database['public']['Tables']['pipeline_stages']['Update']) {
  const { error } = await supabase.from('pipeline_stages').update(payload).eq('id', id);
  if (error) throw error;
}

export async function softDeleteStage(id: string) {
  const { error } = await supabase.from('pipeline_stages').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function updateTenant(id: string, payload: Database['public']['Tables']['tenants']['Update']) {
  const { error } = await supabase.from('tenants').update(payload).eq('id', id);
  if (error) throw error;
}
