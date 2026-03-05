import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCondominios, upsertCondo, addContact, softDeleteCondo } from '@/features/condominios/api';
import { cacheKeys } from '@/lib/cacheKeys';
import { PageHeader } from '@/components/crm/page-header';
import { DataTable } from '@/components/crm/data-table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Timeline } from '@/features/timeline/components';
import { useAuth } from '@/features/auth/auth-context';
import { can, type Role } from '@/lib/permissions';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export function CondominiosPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const role = profile?.role as Role | undefined;
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');

  const query = useQuery({ queryKey: cacheKeys.condos, queryFn: getCondominios });

  const createMutation = useMutation({
    mutationFn: () => upsertCondo({ name, units_count: 0, blocks_count: 0 }),
    onSuccess: () => {
      setName('');
      void queryClient.invalidateQueries({ queryKey: cacheKeys.condos });
    },
  });

  const contactMutation = useMutation({
    mutationFn: () => addContact({ condominium_id: selected!, name: contactName }),
    onSuccess: () => {
      setContactName('');
      void queryClient.invalidateQueries({ queryKey: cacheKeys.condos });
    },
  });

  const deleteMutation = useMutation({ mutationFn: softDeleteCondo, onSuccess: () => void queryClient.invalidateQueries({ queryKey: cacheKeys.condos }) });

  const selectedCondo = useMemo(() => query.data?.find((c: any) => c.id === selected), [query.data, selected]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Condomínios"
        description="Base de clientes e prospects"
        actions={
          can(role, 'write', 'condominios') && (
            <Dialog>
              <DialogTrigger asChild><Button>Novo condomínio</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo condomínio</DialogTitle></DialogHeader>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
                <Button onClick={() => createMutation.mutate()} disabled={!name}>Salvar</Button>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <DataTable
        rows={query.data ?? []}
        columns={[
          { key: 'name', label: 'Nome' },
          { key: 'city', label: 'Cidade' },
          { key: 'units_count', label: 'Unidades' },
          {
            key: 'id',
            label: 'Ações',
            render: (row) => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate(`/app/condominios/${String(row.id)}`)}>Abrir</Button>
                <Button size="sm" variant="outline" onClick={() => setSelected(String(row.id))}>Detalhes</Button>
                {can(role, 'write', 'condominios') && <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(String(row.id))}>Excluir</Button>}
              </div>
            ),
          },
        ]}
      />

      {selectedCondo && (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Contatos · {selectedCondo.name}</h3>
            <div className="mb-2 flex gap-2">
              <Input placeholder="Novo contato" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              <Button onClick={() => contactMutation.mutate()} disabled={!contactName}>Adicionar</Button>
            </div>
            <div className="space-y-1">
              {selectedCondo.contacts?.map((c: { id: string; name: string; email: string | null }) => <div key={c.id} className="rounded-md border p-2 text-sm">{c.name} {c.email ? `· ${c.email}` : ''}</div>)}
            </div>

            <div className="mt-4">
              <h4 className="mb-2 text-sm font-semibold">Documentos</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const fileInput = document.createElement('input');
                  fileInput.type = 'file';
                  fileInput.accept = '.pdf,.doc,.docx';
                  fileInput.onchange = async () => {
                    const file = fileInput.files?.[0];
                    if (!file || !selectedCondo) return;
                    const path = `${selectedCondo.id}/${Date.now()}-${file.name}`;
                    const { error } = await supabase.storage.from('condo-documents').upload(path, file);
                    if (error) toast.error(error.message);
                    else toast.success('Documento enviado');
                  };
                  fileInput.click();
                }}
              >
                Upload de documento
              </Button>
            </div>
          </div>
          <Timeline entityType="condominium" entityId={selectedCondo.id} />
        </div>
      )}
    </div>
  );
}
