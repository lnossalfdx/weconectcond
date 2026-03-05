import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/lib/supabase.types';

export type OsInsert = Database['public']['Tables']['work_orders']['Insert'];

export async function getWorkOrders() {
  const { data, error } = await supabase.from('work_orders').select('*, condominiums(name), profiles!work_orders_assigned_to_fkey(full_name)').is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertWorkOrder(payload: OsInsert) {
  const { error } = await supabase.from('work_orders').upsert(payload);
  if (error) throw error;
}

export async function updateWorkOrder(id: string, payload: Database['public']['Tables']['work_orders']['Update']) {
  const { error } = await supabase.from('work_orders').update(payload).eq('id', id);
  if (error) throw error;
}

export async function softDeleteWorkOrder(id: string) {
  const { error } = await supabase.from('work_orders').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
