# weconect CRM (React + Supabase)

CRM completo para condomínios (pré-venda, pós-venda, OS e financeiro básico), multi-tenant com RLS por tenant e papel.

## Stack
- Front: React + Vite + TypeScript (strict)
- UI: TailwindCSS + componentes estilo shadcn/ui + lucide-react
- Estado: @tanstack/react-query
- Kanban: @dnd-kit
- Backend: Supabase (Postgres/Auth/Storage/Realtime)
- Sem servidor próprio

## Funcionalidades
- Login/logout + troca de senha
- Dashboard KPIs (leads 7d, propostas abertas, MRR, OS atrasadas)
- Leads (CRUD + timeline)
- Pipeline kanban com drag-and-drop persistido + realtime
- Condomínios (CRUD + contatos + upload de documentos + timeline)
- Propostas (itens + total + geração de PDF client-side + upload no Storage)
- Contratos (lista e status)
- Projetos e tarefas
- OS/chamados (CRUD + SLA automático por prioridade + realtime + timeline)
- Financeiro (recebíveis + marcar pago + inadimplência básica)
- Config (usuários/papéis e estágios do funil, admin)

## Estrutura
- `src/app`: rotas e páginas
- `src/components`: ui/layout/crm
- `src/features`: módulos por domínio (`api.ts`, componentes)
- `src/lib`: supabase client, permissions, query keys, tipos
- `supabase/migrations`: SQL completo de schema + RLS/policies/triggers/functions
- `supabase/seed`: seed fake

## Setup rápido
1. Crie um projeto no Supabase.
2. Em **SQL Editor**, rode o conteúdo de:
   - `supabase/migrations/202603050001_init_crm.sql`
3. Ainda no SQL Editor, rode:
   - `supabase/seed/seed.sql`
4. Copie `.env.example` para `.env` e preencha:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Instale e rode:

```bash
npm install
npm run dev
```

Build estático:

```bash
npm run build
npm run preview
```

## Deploy somente front (sem backend)
O projeto já funciona em modo front-only quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` não estão definidos.

### Vercel
1. Suba o repositório no GitHub.
2. Em Vercel, clique em **Add New Project** e importe o repo.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Deploy.

Obs: o arquivo `vercel.json` já está configurado para SPA rewrite (`/* -> /index.html`).

### Netlify
1. Em Netlify, clique em **Add new site** e conecte o repo.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Deploy.

Obs: o arquivo `netlify.toml` já está configurado com redirect SPA (`/* -> /index.html`).

## Usuários seed
Senha para todos: `Pass@123`
- `admin@condo.local` (admin)
- `comercial@condo.local` (comercial)
- `tecnico@condo.local` (tecnico)
- `financeiro@condo.local` (financeiro)
- `cs@condo.local` (cs)
- `leitor@condo.local` (leitor)

## Observações importantes
- Verdade final de segurança está no Postgres RLS.
- Soft delete aplicado nas tabelas principais (`deleted_at`).
- Trigger `set_default_profile_on_signup` cria perfil automaticamente a partir de `auth.users`.
- Trigger de auditoria grava inserts/updates/deletes em entidades críticas em `audit_logs`.
- SLA de OS: baixa 72h, média 48h, alta 24h, crítica 6h.
