import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, SlidersHorizontal, Users2 } from 'lucide-react';
import { PageHeader } from '@/components/crm/page-header';
import { getUsersAndStages, softDeleteStage, updateStage, updateTenant, updateUserProfile, updateUserRole, upsertStage } from '@/features/config/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import type { Role } from '@/lib/permissions';

const roles: Role[] = ['admin', 'comercial', 'tecnico', 'financeiro', 'cs', 'leitor'];

const permissionMatrix: Array<{ resource: string; admin: string; comercial: string; tecnico: string; financeiro: string; cs: string; leitor: string }> = [
  { resource: 'Leads', admin: 'RW', comercial: 'RW', tecnico: 'R', financeiro: 'R', cs: 'R', leitor: 'R' },
  { resource: 'Pipeline', admin: 'RW', comercial: 'RW', tecnico: 'R', financeiro: 'R', cs: 'R', leitor: 'R' },
  { resource: 'Condomínios', admin: 'RW', comercial: 'RW', tecnico: 'R', financeiro: 'R', cs: 'RW', leitor: 'R' },
  { resource: 'Propostas', admin: 'RW', comercial: 'RW', tecnico: 'R', financeiro: 'R', cs: 'R', leitor: 'R' },
  { resource: 'Contratos', admin: 'RW', comercial: 'R', tecnico: 'R', financeiro: 'RW', cs: 'R', leitor: 'R' },
  { resource: 'Projetos/Tarefas', admin: 'RW', comercial: 'R', tecnico: 'RW', financeiro: 'R', cs: 'RW', leitor: 'R' },
  { resource: 'OS', admin: 'RW', comercial: 'R', tecnico: 'RW', financeiro: 'R', cs: 'R', leitor: 'R' },
  { resource: 'Financeiro', admin: 'RW', comercial: 'R', tecnico: 'R', financeiro: 'RW', cs: 'R', leitor: 'R' },
  { resource: 'Config', admin: 'RW', comercial: 'R', tecnico: 'R', financeiro: 'R', cs: 'R', leitor: 'R' },
];

function Kpi({ title, value, helper, icon }: { title: string; value: string; helper: string; icon: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border bg-card shadow-soft">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{title}</p>
          <div className="rounded-lg bg-muted p-1.5">{icon}</div>
        </div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

export function ConfigPage() {
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [stageName, setStageName] = useState('');
  const [order, setOrder] = useState(1);

  const query = useQuery({ queryKey: ['config'], queryFn: getUsersAndStages });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) => updateUserRole(userId, role),
    onSuccess: () => {
      toast.success('Papel atualizado.');
      void queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });

  const userMutation = useMutation({
    mutationFn: ({ userId, full_name }: { userId: string; full_name: string }) => updateUserProfile(userId, { full_name }),
    onSuccess: () => {
      toast.success('Usuário atualizado.');
      void queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });

  const stageMutation = useMutation({
    mutationFn: () => upsertStage({ name: stageName, order_no: order }),
    onSuccess: () => {
      setStageName('');
      toast.success('Estágio criado.');
      void queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });

  const stageUpdateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateStage(id, payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['config'] }),
  });

  const stageDeleteMutation = useMutation({
    mutationFn: softDeleteStage,
    onSuccess: () => {
      toast.success('Estágio removido.');
      void queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });

  const tenantMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateTenant(id, { name }),
    onSuccess: () => {
      toast.success('Empresa atualizada.');
      void queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });

  const users = (query.data?.users ?? []) as any[];
  const stages = (query.data?.stages ?? []) as any[];
  const tenant = query.data?.tenant as any;

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      const byRole = roleFilter === 'all' || u.role === roleFilter;
      const bySearch = !q || String(u.full_name ?? '').toLowerCase().includes(q) || String(u.user_id).toLowerCase().includes(q);
      return byRole && bySearch;
    });
  }, [users, roleFilter, userSearch]);

  const kpis = useMemo(() => {
    const admins = users.filter((u) => u.role === 'admin').length;
    const readers = users.filter((u) => u.role === 'leitor').length;
    return { users: users.length, admins, readers, stages: stages.length };
  }, [users, stages]);

  return (
    <div className="space-y-4">
      <PageHeader title="Configurações" description="Administração de empresa, usuários, papéis e funil comercial" />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi title="Usuários" value={String(kpis.users)} helper="Acessos do tenant" icon={<Users2 className="h-4 w-4" />} />
        <Kpi title="Admins" value={String(kpis.admins)} helper="Controle total" icon={<ShieldCheck className="h-4 w-4" />} />
        <Kpi title="Leitores" value={String(kpis.readers)} helper="Somente consulta" icon={<ShieldCheck className="h-4 w-4" />} />
        <Kpi title="Estágios do funil" value={String(kpis.stages)} helper="Configuração comercial" icon={<SlidersHorizontal className="h-4 w-4" />} />
      </div>

      <Tabs defaultValue="tenant">
        <TabsList>
          <TabsTrigger value="tenant">Empresa</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="stages">Funil</TabsTrigger>
          <TabsTrigger value="permissions">Permissões</TabsTrigger>
        </TabsList>

        <TabsContent value="tenant" className="mt-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Dados da empresa (tenant)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border p-3 text-sm">
                <p className="text-xs text-muted-foreground">Tenant ID</p>
                <p className="font-mono">{tenant?.id ?? '-'}</p>
              </div>
              <div className="flex gap-2">
                <Input defaultValue={tenant?.name ?? ''} onBlur={(e) => tenant?.id && tenantMutation.mutate({ id: tenant.id, name: e.target.value })} placeholder="Nome da empresa" />
                <Button variant="outline" onClick={() => void queryClient.invalidateQueries({ queryKey: ['config'] })}>Recarregar</Button>
              </div>
              <p className="text-xs text-muted-foreground">Dica: altere o nome e clique fora do campo para salvar.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Gestão de usuários e papéis</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-3">
                <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Buscar por nome/ID" />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger><SelectValue placeholder="Filtrar papel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-end text-xs text-muted-foreground">{filteredUsers.length} usuário(s)</div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <Input
                          defaultValue={user.full_name}
                          onBlur={(e) => {
                            if (e.target.value !== user.full_name) userMutation.mutate({ userId: user.user_id, full_name: e.target.value });
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{user.user_id}</TableCell>
                      <TableCell>
                        <Select value={user.role} onValueChange={(value) => roleMutation.mutate({ userId: user.user_id, role: value as Role })}>
                          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages" className="mt-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Estágios do funil comercial</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-3">
                <Input placeholder="Nome do estágio" value={stageName} onChange={(e) => setStageName(e.target.value)} />
                <Input type="number" placeholder="Ordem" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
                <Button onClick={() => stageMutation.mutate()} disabled={!stageName}>Adicionar estágio</Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Ganho</TableHead>
                    <TableHead>Perda</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stages.map((stage) => (
                    <TableRow key={stage.id}>
                      <TableCell>
                        <Input
                          className="h-8 w-20"
                          type="number"
                          defaultValue={stage.order_no}
                          onBlur={(e) => stageUpdateMutation.mutate({ id: stage.id, payload: { order_no: Number(e.target.value) } })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          defaultValue={stage.name}
                          onBlur={(e) => stageUpdateMutation.mutate({ id: stage.id, payload: { name: e.target.value } })}
                        />
                      </TableCell>
                      <TableCell>
                        <input type="checkbox" checked={Boolean(stage.is_won)} onChange={(e) => stageUpdateMutation.mutate({ id: stage.id, payload: { is_won: e.target.checked } })} />
                      </TableCell>
                      <TableCell>
                        <input type="checkbox" checked={Boolean(stage.is_lost)} onChange={(e) => stageUpdateMutation.mutate({ id: stage.id, payload: { is_lost: e.target.checked } })} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="destructive" onClick={() => stageDeleteMutation.mutate(stage.id)}>Excluir</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="mt-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Matriz de permissões por papel</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recurso</TableHead>
                    <TableHead>admin</TableHead>
                    <TableHead>comercial</TableHead>
                    <TableHead>tecnico</TableHead>
                    <TableHead>financeiro</TableHead>
                    <TableHead>cs</TableHead>
                    <TableHead>leitor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissionMatrix.map((row) => (
                    <TableRow key={row.resource}>
                      <TableCell className="font-medium">{row.resource}</TableCell>
                      <TableCell>{row.admin}</TableCell>
                      <TableCell>{row.comercial}</TableCell>
                      <TableCell>{row.tecnico}</TableCell>
                      <TableCell>{row.financeiro}</TableCell>
                      <TableCell>{row.cs}</TableCell>
                      <TableCell>{row.leitor}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
