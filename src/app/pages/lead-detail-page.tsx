import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Mail, Phone, User } from 'lucide-react';
import { PageHeader } from '@/components/crm/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { Timeline } from '@/features/timeline/components';

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();

  const query = useQuery({
    queryKey: ['lead-detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();
      if (error) throw error;
      return data as any;
    },
  });

  const lead = query.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Detalhe do Lead"
        description="Visão completa da oportunidade"
        actions={
          <Button variant="outline" asChild>
            <Link to="/app/leads"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link>
          </Button>
        }
      />

      {lead && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{lead.name}</span>
                <Badge>{lead.score}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{lead.email || '-'}</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{lead.phone || '-'}</div>
              <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />Origem: {lead.source}</div>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">Notas</p>
                <p>{lead.notes || 'Sem notas.'}</p>
              </div>
            </CardContent>
          </Card>
          <Timeline entityType="lead" entityId={lead.id} />
        </div>
      )}
    </div>
  );
}
