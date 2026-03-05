import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/lib/supabase.types';

export type ContractInsert = Database['public']['Tables']['contracts']['Insert'];

export async function getContracts() {
  const { data, error } = await supabase.from('contracts').select('*, proposals(total,status)').is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertContract(payload: ContractInsert) {
  const { data, error } = await supabase.from('contracts').upsert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateContract(id: string, payload: Database['public']['Tables']['contracts']['Update']) {
  const { error } = await supabase.from('contracts').update(payload).eq('id', id);
  if (error) throw error;
}

export async function softDeleteContract(id: string) {
  const { error } = await supabase.from('contracts').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function createReceivablesForContract(contractId: string, startDate: string, amount: number, months = 12) {
  const due = new Date(startDate);
  const payload = Array.from({ length: months }).map((_, i) => {
    const d = new Date(due);
    d.setMonth(d.getMonth() + i);
    return {
      contract_id: contractId,
      due_date: d.toISOString().slice(0, 10),
      amount,
      status: 'aberto',
    };
  });
  const { error } = await supabase.from('receivables').insert(payload);
  if (error) throw error;
}
