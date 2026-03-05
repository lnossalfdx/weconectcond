import { useMemo, useState } from 'react';
import { Search, UserCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { signOut } from '@/features/auth/api';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/features/auth/auth-context';
import { toast } from 'sonner';
import { changePassword } from '@/features/auth/api';

export function Topbar() {
  const { profile } = useAuth();
  const [q, setQ] = useState('');

  const searchQuery = useQuery({
    queryKey: ['global-search', q],
    enabled: q.length > 1,
    queryFn: async () => {
      const [leads, condos, os] = await Promise.all([
        supabase.from('leads').select('id,name').ilike('name', `%${q}%`).limit(5),
        supabase.from('condominiums').select('id,name').ilike('name', `%${q}%`).limit(5),
        supabase.from('work_orders').select('id,category,description').ilike('description', `%${q}%`).limit(5),
      ]);
      if (leads.error) throw leads.error;
      if (condos.error) throw condos.error;
      if (os.error) throw os.error;
      return { leads: leads.data, condos: condos.data, os: os.data };
    },
  });

  const passwordAction = async () => {
    const pwd = window.prompt('Nova senha (mín. 6 caracteres):');
    if (!pwd) return;
    if (pwd.length < 6) {
      toast.error('Senha muito curta');
      return;
    }
    await changePassword(pwd);
    toast.success('Senha alterada');
  };

  const results = useMemo(() => searchQuery.data, [searchQuery.data]);

  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Busca global: lead, condomínio, OS" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
          {q.length > 1 && (
            <div className="absolute mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-card p-2 shadow-soft">
              <p className="mb-1 text-xs text-muted-foreground">Resultados</p>
              {(results?.leads ?? []).map((item: { id: string; name: string }) => <div key={item.id} className="rounded-md px-2 py-1 text-sm hover:bg-muted">Lead: {item.name}</div>)}
              {(results?.condos ?? []).map((item: { id: string; name: string }) => <div key={item.id} className="rounded-md px-2 py-1 text-sm hover:bg-muted">Condomínio: {item.name}</div>)}
              {(results?.os ?? []).map((item: { id: string; category: string; description: string }) => <div key={item.id} className="rounded-md px-2 py-1 text-sm hover:bg-muted">OS: {item.category} · {item.description}</div>)}
              {!results?.leads?.length && !results?.condos?.length && !results?.os?.length && <div className="px-2 py-1 text-xs text-muted-foreground">Nenhum resultado</div>}
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <UserCircle className="h-4 w-4" />
              {profile?.full_name ?? 'Usuário'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={passwordAction}>Trocar senha</DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                await signOut();
                toast.success('Sessão encerrada');
              }}
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
