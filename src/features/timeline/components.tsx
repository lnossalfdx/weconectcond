import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cacheKeys } from '@/lib/cacheKeys';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { dateFormat } from '@/lib/utils';

export function Timeline({ entityType, entityId }: { entityType: string; entityId: string }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');

  const query = useQuery({
    queryKey: cacheKeys.timeline(entityType, entityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('timeline_events').insert({ entity_type: entityType, entity_id: entityId, type: 'nota', content });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent('');
      void queryClient.invalidateQueries({ queryKey: cacheKeys.timeline(entityType, entityId) });
    },
  });

  return (
    <div className="space-y-3 rounded-xl border p-3">
      <h4 className="text-sm font-semibold">Timeline</h4>
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Registrar evento/mensagem" />
      <Button size="sm" onClick={() => mutation.mutate()} disabled={!content.trim() || mutation.isPending}>
        Adicionar
      </Button>

      <div className="space-y-2">
        {query.data?.map((event: any) => (
          <div key={event.id} className="rounded-md border p-2 text-sm">
            <p>{event.content}</p>
            <p className="text-xs text-muted-foreground">{dateFormat.format(new Date(event.created_at))}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
