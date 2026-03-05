import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/lib/supabase.types';

export async function getProjects() {
  const { data, error } = await supabase.from('projects').select('*, contracts(status,mrr), tasks(*)').is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertTask(task: { id?: string; project_id: string; title: string; status: string; assigned_to?: string | null; due_date?: string | null }) {
  const { error } = await supabase.from('tasks').upsert(task);
  if (error) throw error;
}

export async function upsertProject(project: Database['public']['Tables']['projects']['Insert']) {
  const { error } = await supabase.from('projects').upsert(project);
  if (error) throw error;
}

export async function updateProject(id: string, payload: Database['public']['Tables']['projects']['Update']) {
  const { error } = await supabase.from('projects').update(payload).eq('id', id);
  if (error) throw error;
}

export async function updateTask(id: string, payload: Database['public']['Tables']['tasks']['Update']) {
  const { error } = await supabase.from('tasks').update(payload).eq('id', id);
  if (error) throw error;
}

export async function softDeleteTask(id: string) {
  const { error } = await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
