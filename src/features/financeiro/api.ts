import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/lib/supabase.types';

export async function getReceivables() {
  const { data, error } = await supabase.from('receivables').select('*, contracts(id,mrr,status)').is('deleted_at', null).order('due_date');
  if (error) throw error;
  return data;
}

export async function markAsPaid(id: string) {
  const { error } = await supabase.from('receivables').update({ status: 'pago', paid_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function updateReceivable(id: string, payload: Database['public']['Tables']['receivables']['Update']) {
  const { error } = await supabase.from('receivables').update(payload).eq('id', id);
  if (error) throw error;
}

export async function bulkMarkAsPaid(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from('receivables').update({ status: 'pago', paid_at: new Date().toISOString() }).in('id', ids);
  if (error) throw error;
}
