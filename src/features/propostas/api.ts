import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/lib/supabase.types';

export type ProposalInsert = Database['public']['Tables']['proposals']['Insert'];

export async function getProposals() {
  const { data, error } = await supabase.from('proposals').select('*, leads(name), condominiums(name)').is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertProposal(payload: ProposalInsert) {
  const response = await supabase.from('proposals').upsert(payload);
  const maybeBuilder = response as any;
  const finalResponse =
    typeof maybeBuilder?.select === 'function'
      ? await maybeBuilder.select('*').single()
      : response;
  const { data, error } = finalResponse as any;
  if (error) throw error;
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

export async function updateProposal(id: string, payload: Database['public']['Tables']['proposals']['Update']) {
  const { error } = await supabase.from('proposals').update(payload).eq('id', id);
  if (error) throw error;
}

export async function softDeleteProposal(id: string) {
  const { error } = await supabase.from('proposals').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
