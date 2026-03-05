import { supabase } from '@/lib/supabaseClient';

export async function getStages() {
  const { data, error } = await supabase.from('pipeline_stages').select('*').is('deleted_at', null).order('order_no');
  if (error) throw error;
  return data;
}

export async function getPipelineCards() {
  const { data, error } = await supabase.from('leads').select('*').is('deleted_at', null).order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function moveCard(id: string, stage_id: string) {
  const { error } = await supabase.from('leads').update({ stage_id }).eq('id', id);
  if (error) throw error;
}
