import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Lock, Mail, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { signIn } from '@/features/auth/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { isFrontOnly } from '@/lib/supabaseClient';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

const quickUsers = [
  { label: 'Admin', email: 'admin@condo.local' },
  { label: 'Comercial', email: 'comercial@condo.local' },
  { label: 'Técnico', email: 'tecnico@condo.local' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-4 py-10 lg:grid-cols-2">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
            weconect CRM para Condomínios
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Venda, implantação, OS e financeiro em uma única operação.
            </h1>
            <p className="max-w-xl text-sm text-slate-300 md:text-base">
              Plataforma densa e rápida para times comerciais, técnicos, CS e financeiro operarem o ciclo completo de condomínios.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <TrendingUp className="mb-2 h-4 w-4 text-indigo-300" />
              <p className="text-xs text-slate-400">Funil e propostas</p>
              <p className="text-sm font-medium">Conversão previsível</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <ShieldCheck className="mb-2 h-4 w-4 text-emerald-300" />
              <p className="text-xs text-slate-400">RLS por tenant</p>
              <p className="text-sm font-medium">Acesso seguro por papel</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <Building2 className="mb-2 h-4 w-4 text-sky-300" />
              <p className="text-xs text-slate-400">Pós-venda + OS</p>
              <p className="text-sm font-medium">SLA e timeline</p>
            </div>
          </div>
        </section>

        <section>
          <Card className="border-slate-800 bg-slate-900/80 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Entrar no weconect</CardTitle>
              <p className="text-sm text-slate-400">Use sua conta para acessar o painel.</p>
              {isFrontOnly && (
                <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                  Modo front-only ativo: login funciona localmente para prototipação.
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="space-y-3"
                onSubmit={form.handleSubmit(async (values) => {
                  try {
                    await signIn(values.email, values.password);
                    toast.success('Acesso liberado');
                    navigate('/app/dashboard');
                  } catch (error) {
                    toast.error((error as Error).message);
                  }
                })}
              >
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">E-mail</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input className="border-slate-700 bg-slate-950 pl-9 text-slate-100" placeholder="email@empresa.com" {...form.register('email')} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Senha</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input className="border-slate-700 bg-slate-950 pl-9 text-slate-100" type="password" placeholder="********" {...form.register('password')} />
                  </div>
                </div>

                <Button className="h-10 w-full rounded-xl bg-indigo-500 text-white hover:bg-indigo-400" type="submit" disabled={form.formState.isSubmitting}>
                  Entrar no painel
                </Button>
              </form>

              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-xs text-slate-400">Acesso rápido (seed): senha `Pass@123`</p>
                <div className="flex flex-wrap gap-2">
                  {quickUsers.map((u) => (
                    <Button
                      key={u.email}
                      size="sm"
                      variant="outline"
                      className="border-slate-700 bg-transparent text-slate-200"
                      onClick={() => {
                        form.setValue('email', u.email);
                        form.setValue('password', 'Pass@123');
                      }}
                    >
                      {u.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
