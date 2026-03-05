import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/lib/supabase.types';

export type CondoInsert = Database['public']['Tables']['condominiums']['Insert'];
export type ContactInsert = Database['public']['Tables']['contacts']['Insert'];

export async function getCondominios() {
  const { data, error } = await supabase.from('condominiums').select('*, contacts(*)').is('deleted_at', null).order('name');
  if (error) throw error;
  return data;
}

export async function upsertCondo(payload: CondoInsert) {
  const { error } = await supabase.from('condominiums').upsert(payload);
  if (error) throw error;
}

export async function addContact(payload: ContactInsert) {
  const { error } = await supabase.from('contacts').insert(payload);
  if (error) throw error;
}

export async function softDeleteCondo(id: string) {
  const { error } = await supabase.from('condominiums').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
