import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Clock3, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/crm/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Timeline } from '@/features/timeline/components';
import { supabase } from '@/lib/supabaseClient';

export function OsDetailPage() {
  const { id } = useParams<{ id: string }>();

  const query = useQuery({
    queryKey: ['os-detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('work_orders').select('*').eq('id', id).single();
      if (error) throw error;
      return data as any;
    },
  });

  const os = query.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Detalhe da OS"
        description="Acompanhamento operacional"
        actions={
          <Button variant="outline" asChild>
            <Link to="/app/os"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link>
          </Button>
        }
      />

      {os && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wrench className="h-4 w-4" />{os.category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-muted-foreground" />Prioridade: <Badge variant="warning">{os.priority}</Badge></div>
              <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-muted-foreground" />SLA: {os.sla_due_at}</div>
              <div>
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p>{os.description}</p>
              </div>
            </CardContent>
          </Card>
          <Timeline entityType="work_order" entityId={os.id} />
        </div>
      )}
    </div>
  );
}
