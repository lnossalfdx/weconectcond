import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail, ShieldCheck, TrendingUp, Wrench } from 'lucide-react';
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
    <div className="min-h-screen bg-[#030712] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_88%_85%,rgba(16,185,129,0.12),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:36px_36px]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-slate-700/70 bg-[#060d1f]/95 shadow-[0_28px_90px_rgba(2,6,23,0.8)] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative p-7 md:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-600/80 bg-slate-900/90 px-3 py-1 text-xs text-slate-100">
              <img src="/logo.png" alt="weconect" className="h-4 w-4 rounded-sm object-cover" />
              weconect CRM para Condomínios
            </div>

            <div className="mt-8 space-y-4">
              <h1 className="max-w-xl text-4xl font-semibold leading-[1.03] tracking-tight text-white md:text-6xl">
                Plataforma premium para operação de condomínios.
              </h1>
              <p className="max-w-lg text-base text-slate-300">
                Comercial, contratos, implantação, chamados e financeiro no mesmo fluxo com visão executiva em tempo real.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-700/90 bg-[#0b142a]/85 p-4">
                <TrendingUp className="mb-2 h-4 w-4 text-cyan-300" />
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Comercial</p>
                <p className="text-sm font-medium text-white">Conversão previsível</p>
              </div>
              <div className="rounded-2xl border border-slate-700/90 bg-[#0b142a]/85 p-4">
                <ShieldCheck className="mb-2 h-4 w-4 text-emerald-300" />
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Segurança</p>
                <p className="text-sm font-medium text-white">RLS por tenant</p>
              </div>
              <div className="rounded-2xl border border-slate-700/90 bg-[#0b142a]/85 p-4">
                <Wrench className="mb-2 h-4 w-4 text-indigo-300" />
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Operação</p>
                <p className="text-sm font-medium text-white">SLA e execução</p>
              </div>
            </div>
          </section>

          <section className="border-t border-slate-700/70 bg-gradient-to-b from-[#0a1530] to-[#081126] p-6 md:p-10 lg:border-l lg:border-t-0">
            <Card className="rounded-3xl border-slate-600/80 bg-[#0a1833]/90 shadow-[0_20px_60px_rgba(2,6,23,0.6)]">
              <CardHeader className="space-y-2">
                <div className="mb-1 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-500/70 bg-slate-900/70">
                  <img src="/logo.png" alt="Logo weconect" className="h-8 w-8 rounded object-cover" />
                </div>
                <CardTitle className="text-3xl font-semibold tracking-tight text-white">Entrar no weconect</CardTitle>
                <p className="text-sm text-slate-300">Acesse seu painel para continuar.</p>
                {isFrontOnly && (
                  <div className="rounded-lg border border-amber-400/50 bg-amber-400/15 px-3 py-2 text-xs text-amber-200">
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
                    <label className="text-xs font-medium text-slate-300">E-mail</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input className="h-12 rounded-xl border-slate-600 bg-[#060d1f] pl-9 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-cyan-400/60" placeholder="email@empresa.com" {...form.register('email')} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Senha</label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input className="h-12 rounded-xl border-slate-600 bg-[#060d1f] pl-9 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-cyan-400/60" type="password" placeholder="********" {...form.register('password')} />
                    </div>
                  </div>

                  <Button className="h-12 w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-900/40 hover:from-cyan-400 hover:via-blue-400 hover:to-indigo-400" type="submit" disabled={form.formState.isSubmitting}>
                    Entrar no painel
                  </Button>
                </form>

                <div className="space-y-2 rounded-xl border border-slate-600/80 bg-[#060d1f]/85 p-3">
                  <p className="text-xs text-slate-400">Acesso rápido (seed): senha `Pass@123`</p>
                  <div className="flex flex-wrap gap-2">
                    {quickUsers.map((u) => (
                      <Button
                        key={u.email}
                        size="sm"
                        variant="outline"
                        className="border-slate-600 bg-slate-900/60 text-slate-100 hover:bg-slate-800"
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
    </div>
  );
}
