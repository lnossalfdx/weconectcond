create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'comercial', 'tecnico', 'financeiro', 'cs', 'leitor');
create type public.work_priority as enum ('baixa', 'media', 'alta', 'critica');
create type public.proposal_status as enum ('rascunho', 'enviada', 'aceita', 'recusada');
create type public.contract_status as enum ('ativo', 'pendente', 'cancelado');
create type public.work_order_status as enum ('aberta', 'em_andamento', 'concluida', 'cancelada');
create type public.receivable_status as enum ('aberto', 'pago', 'atrasado');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id),
  role public.app_role not null default 'leitor',
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null,
  order_no int not null,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, name)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null,
  phone text,
  email text,
  source text not null default 'indicação',
  status text not null default 'novo',
  score int not null default 0,
  notes text,
  stage_id uuid references public.pipeline_stages(id),
  assigned_to uuid references public.profiles(user_id),
  units_hint int,
  urgency public.work_priority,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.condominiums (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null,
  cnpj text,
  address text,
  city text,
  units_count int not null default 0,
  blocks_count int not null default 0,
  admin_company text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  condominium_id uuid not null references public.condominiums(id),
  name text not null,
  role_in_condo text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  lead_id uuid references public.leads(id),
  condominium_id uuid references public.condominiums(id),
  status public.proposal_status not null default 'rascunho',
  items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  proposal_id uuid not null references public.proposals(id),
  status public.contract_status not null default 'pendente',
  start_date date not null,
  mrr numeric(12,2) not null,
  reajuste_percent numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  contract_id uuid not null references public.contracts(id),
  status text not null default 'planejado',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  project_id uuid not null references public.projects(id),
  title text not null,
  status text not null default 'pendente',
  assigned_to uuid references public.profiles(user_id),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  condominium_id uuid not null references public.condominiums(id),
  category text not null,
  priority public.work_priority not null default 'media',
  status public.work_order_status not null default 'aberta',
  sla_due_at timestamptz not null default now(),
  assigned_to uuid references public.profiles(user_id),
  cost numeric(12,2) not null default 0,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  entity_type text not null,
  entity_id uuid not null,
  type text not null default 'nota',
  content text not null,
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now()
);

create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  contract_id uuid not null references public.contracts(id),
  due_date date not null,
  amount numeric(12,2) not null,
  status public.receivable_status not null default 'aberto',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  table_name text not null,
  record_id uuid not null,
  action text not null,
  before jsonb,
  after jsonb,
  actor uuid,
  created_at timestamptz not null default now()
);

create index idx_profiles_tenant on public.profiles(tenant_id);
create index idx_leads_tenant on public.leads(tenant_id, stage_id);
create index idx_stages_tenant on public.pipeline_stages(tenant_id, order_no);
create index idx_condos_tenant on public.condominiums(tenant_id);
create index idx_contacts_condo on public.contacts(tenant_id, condominium_id);
create index idx_proposals_tenant on public.proposals(tenant_id, status);
create index idx_contracts_tenant on public.contracts(tenant_id, status);
create index idx_projects_tenant on public.projects(tenant_id, status);
create index idx_tasks_project on public.tasks(tenant_id, project_id, status);
create index idx_work_orders_tenant on public.work_orders(tenant_id, status, priority);
create index idx_timeline_entity on public.timeline_events(tenant_id, entity_type, entity_id);
create index idx_receivables_tenant on public.receivables(tenant_id, status, due_date);
create index idx_audit_tenant on public.audit_logs(tenant_id, table_name);

create or replace function public.get_user_tenant()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where user_id = auth.uid() and deleted_at is null limit 1;
$$;

create or replace function public.get_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid() and deleted_at is null limit 1;
$$;

create or replace function public.is_role(requested_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_user_role()::text = requested_role;
$$;

create or replace function public.can_access(resource text, action text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r public.app_role;
begin
  r := public.get_user_role();

  if r is null then
    return false;
  end if;

  if r = 'admin' then
    return true;
  end if;

  if action = 'read' then
    return true;
  end if;

  if r = 'leitor' then
    return false;
  end if;

  if r = 'comercial' and resource in ('leads', 'pipeline_stages', 'proposals', 'condominiums', 'contacts', 'timeline_events') then
    return true;
  end if;

  if r = 'tecnico' and resource in ('work_orders', 'projects', 'tasks', 'timeline_events') then
    return true;
  end if;

  if r = 'financeiro' and resource in ('contracts', 'receivables') then
    return true;
  end if;

  if r = 'cs' and resource in ('condominiums', 'contacts', 'projects', 'tasks', 'timeline_events') then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.fill_tenant_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := public.get_user_tenant();
  end if;
  return new;
end;
$$;

create or replace function public.compute_lead_score(units_count int, urgency public.work_priority, source text)
returns int
language plpgsql
as $$
declare
  urgency_score int := 0;
  source_score int := 0;
begin
  urgency_score := case urgency when 'critica' then 40 when 'alta' then 25 when 'media' then 15 else 5 end;
  source_score := case lower(coalesce(source, '')) when 'indicação' then 25 when 'site' then 15 when 'parceiro' then 20 else 10 end;
  return coalesce(units_count, 0) + urgency_score + source_score;
end;
$$;

create or replace function public.lead_score_trigger()
returns trigger
language plpgsql
as $$
begin
  new.score := public.compute_lead_score(new.units_hint, new.urgency, new.source);
  return new;
end;
$$;

create or replace function public.work_order_sla_trigger()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.priority is distinct from old.priority then
    new.sla_due_at := now() + (
      case new.priority
        when 'baixa' then interval '72 hours'
        when 'media' then interval '48 hours'
        when 'alta' then interval '24 hours'
        when 'critica' then interval '6 hours'
      end
    );
  end if;
  return new;
end;
$$;

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tenant uuid;
begin
  tenant := coalesce(new.tenant_id, old.tenant_id);
  insert into public.audit_logs(tenant_id, table_name, record_id, action, before, after, actor)
  values (
    tenant,
    tg_table_name,
    coalesce(new.id, old.id),
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    auth.uid()
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.set_default_profile_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  incoming_tenant uuid;
  created_tenant uuid;
  role_text text;
begin
  incoming_tenant := nullif(new.raw_user_meta_data ->> 'tenant_id', '')::uuid;
  role_text := coalesce(new.raw_user_meta_data ->> 'role', 'leitor');

  if incoming_tenant is null then
    insert into public.tenants(name) values (coalesce(new.raw_user_meta_data ->> 'tenant_name', 'Tenant ' || new.id::text)) returning id into created_tenant;
    incoming_tenant := created_tenant;
  end if;

  insert into public.profiles(user_id, tenant_id, role, full_name)
  values (
    new.id,
    incoming_tenant,
    case
      when role_text in ('admin', 'comercial', 'tecnico', 'financeiro', 'cs', 'leitor') then role_text::public.app_role
      else 'leitor'::public.app_role
    end,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_tenants_updated before update on public.tenants for each row execute function public.set_updated_at();
create trigger trg_stages_updated before update on public.pipeline_stages for each row execute function public.set_updated_at();
create trigger trg_leads_updated before update on public.leads for each row execute function public.set_updated_at();
create trigger trg_condos_updated before update on public.condominiums for each row execute function public.set_updated_at();
create trigger trg_contacts_updated before update on public.contacts for each row execute function public.set_updated_at();
create trigger trg_proposals_updated before update on public.proposals for each row execute function public.set_updated_at();
create trigger trg_contracts_updated before update on public.contracts for each row execute function public.set_updated_at();
create trigger trg_projects_updated before update on public.projects for each row execute function public.set_updated_at();
create trigger trg_tasks_updated before update on public.tasks for each row execute function public.set_updated_at();
create trigger trg_work_orders_updated before update on public.work_orders for each row execute function public.set_updated_at();
create trigger trg_receivables_updated before update on public.receivables for each row execute function public.set_updated_at();

create trigger trg_stage_tenant before insert on public.pipeline_stages for each row execute function public.fill_tenant_id();
create trigger trg_lead_tenant before insert on public.leads for each row execute function public.fill_tenant_id();
create trigger trg_condo_tenant before insert on public.condominiums for each row execute function public.fill_tenant_id();
create trigger trg_contact_tenant before insert on public.contacts for each row execute function public.fill_tenant_id();
create trigger trg_proposal_tenant before insert on public.proposals for each row execute function public.fill_tenant_id();
create trigger trg_contract_tenant before insert on public.contracts for each row execute function public.fill_tenant_id();
create trigger trg_project_tenant before insert on public.projects for each row execute function public.fill_tenant_id();
create trigger trg_task_tenant before insert on public.tasks for each row execute function public.fill_tenant_id();
create trigger trg_work_order_tenant before insert on public.work_orders for each row execute function public.fill_tenant_id();
create trigger trg_timeline_tenant before insert on public.timeline_events for each row execute function public.fill_tenant_id();
create trigger trg_receivable_tenant before insert on public.receivables for each row execute function public.fill_tenant_id();

create trigger trg_lead_score before insert or update on public.leads for each row execute function public.lead_score_trigger();
create trigger trg_work_order_sla before insert or update of priority on public.work_orders for each row execute function public.work_order_sla_trigger();

create trigger trg_audit_leads after insert or update or delete on public.leads for each row execute function public.audit_trigger();
create trigger trg_audit_condos after insert or update or delete on public.condominiums for each row execute function public.audit_trigger();
create trigger trg_audit_proposals after insert or update or delete on public.proposals for each row execute function public.audit_trigger();
create trigger trg_audit_contracts after insert or update or delete on public.contracts for each row execute function public.audit_trigger();
create trigger trg_audit_work_orders after insert or update or delete on public.work_orders for each row execute function public.audit_trigger();
create trigger trg_audit_receivables after insert or update or delete on public.receivables for each row execute function public.audit_trigger();

create trigger on_auth_user_created after insert on auth.users for each row execute function public.set_default_profile_on_signup();

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.leads enable row level security;
alter table public.condominiums enable row level security;
alter table public.contacts enable row level security;
alter table public.proposals enable row level security;
alter table public.contracts enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.work_orders enable row level security;
alter table public.timeline_events enable row level security;
alter table public.receivables enable row level security;
alter table public.audit_logs enable row level security;

create policy tenants_read on public.tenants for select using (id = public.get_user_tenant());
create policy tenants_admin_write on public.tenants for all using (public.is_role('admin') and id = public.get_user_tenant()) with check (public.is_role('admin') and id = public.get_user_tenant());

create policy profiles_read on public.profiles for select using (tenant_id = public.get_user_tenant());
create policy profiles_admin_write on public.profiles for all using (public.is_role('admin') and tenant_id = public.get_user_tenant()) with check (public.is_role('admin') and tenant_id = public.get_user_tenant());

create policy stages_select on public.pipeline_stages for select using (tenant_id = public.get_user_tenant() and public.can_access('pipeline_stages', 'read'));
create policy stages_insert on public.pipeline_stages for insert with check (tenant_id = public.get_user_tenant() and public.can_access('pipeline_stages', 'write'));
create policy stages_update on public.pipeline_stages for update using (tenant_id = public.get_user_tenant() and public.can_access('pipeline_stages', 'write')) with check (tenant_id = public.get_user_tenant() and public.can_access('pipeline_stages', 'write'));
create policy stages_delete on public.pipeline_stages for delete using (tenant_id = public.get_user_tenant() and public.can_access('pipeline_stages', 'write'));

create policy leads_select on public.leads for select using (tenant_id = public.get_user_tenant() and public.can_access('leads', 'read'));
create policy leads_insert on public.leads for insert with check (tenant_id = public.get_user_tenant() and public.can_access('leads', 'write'));
create policy leads_update on public.leads for update using (tenant_id = public.get_user_tenant() and public.can_access('leads', 'write')) with check (tenant_id = public.get_user_tenant() and public.can_access('leads', 'write'));
create policy leads_delete on public.leads for delete using (tenant_id = public.get_user_tenant() and public.can_access('leads', 'write'));

create policy condos_select on public.condominiums for select using (tenant_id = public.get_user_tenant() and public.can_access('condominiums', 'read'));
create policy condos_insert on public.condominiums for insert with check (tenant_id = public.get_user_tenant() and public.can_access('condominiums', 'write'));
create policy condos_update on public.condominiums for update using (tenant_id = public.get_user_tenant() and public.can_access('condominiums', 'write')) with check (tenant_id = public.get_user_tenant() and public.can_access('condominiums', 'write'));
create policy condos_delete on public.condominiums for delete using (tenant_id = public.get_user_tenant() and public.can_access('condominiums', 'write'));

create policy contacts_select on public.contacts for select using (tenant_id = public.get_user_tenant() and public.can_access('contacts', 'read'));
create policy contacts_insert on public.contacts for insert with check (tenant_id = public.get_user_tenant() and public.can_access('contacts', 'write'));
create policy contacts_update on public.contacts for update using (tenant_id = public.get_user_tenant() and public.can_access('contacts', 'write')) with check (tenant_id = public.get_user_tenant() and public.can_access('contacts', 'write'));
create policy contacts_delete on public.contacts for delete using (tenant_id = public.get_user_tenant() and public.can_access('contacts', 'write'));

create policy proposals_select on public.proposals for select using (tenant_id = public.get_user_tenant() and public.can_access('proposals', 'read'));
create policy proposals_insert on public.proposals for insert with check (tenant_id = public.get_user_tenant() and public.can_access('proposals', 'write'));
create policy proposals_update on public.proposals for update using (tenant_id = public.get_user_tenant() and public.can_access('proposals', 'write')) with check (tenant_id = public.get_user_tenant() and public.can_access('proposals', 'write'));
create policy proposals_delete on public.proposals for delete using (tenant_id = public.get_user_tenant() and public.can_access('proposals', 'write'));

create policy contracts_select on public.contracts for select using (tenant_id = public.get_user_tenant() and public.can_access('contracts', 'read'));
create policy contracts_insert on public.contracts for insert with check (tenant_id = public.get_user_tenant() and public.can_access('contracts', 'write'));
create policy contracts_update on public.contracts for update using (tenant_id = public.get_user_tenant() and public.can_access('contracts', 'write')) with check (tenant_id = public.get_user_tenant() and public.can_access('contracts', 'write'));
create policy contracts_delete on public.contracts for delete using (tenant_id = public.get_user_tenant() and public.can_access('contracts', 'write'));

create policy projects_select on public.projects for select using (tenant_id = public.get_user_tenant() and public.can_access('projects', 'read'));
create policy projects_insert on public.projects for insert with check (tenant_id = public.get_user_tenant() and public.can_access('projects', 'write'));
create policy projects_update on public.projects for update using (tenant_id = public.get_user_tenant() and public.can_access('projects', 'write')) with check (tenant_id = public.get_user_tenant() and public.can_access('projects', 'write'));
create policy projects_delete on public.projects for delete using (tenant_id = public.get_user_tenant() and public.can_access('projects', 'write'));

create policy tasks_select on public.tasks for select using (tenant_id = public.get_user_tenant() and public.can_access('tasks', 'read'));
create policy tasks_insert on public.tasks for insert with check (tenant_id = public.get_user_tenant() and public.can_access('tasks', 'write'));
create policy tasks_update on public.tasks for update using (tenant_id = public.get_user_tenant() and public.can_access('tasks', 'write')) with check (tenant_id = public.get_user_tenant() and public.can_access('tasks', 'write'));
create policy tasks_delete on public.tasks for delete using (tenant_id = public.get_user_tenant() and public.can_access('tasks', 'write'));

create policy work_orders_select on public.work_orders for select using (tenant_id = public.get_user_tenant() and public.can_access('work_orders', 'read'));
create policy work_orders_insert on public.work_orders for insert with check (tenant_id = public.get_user_tenant() and public.can_access('work_orders', 'write'));
create policy work_orders_update on public.work_orders for update using (tenant_id = public.get_user_tenant() and public.can_access('work_orders', 'write')) with check (tenant_id = public.get_user_tenant() and public.can_access('work_orders', 'write'));
create policy work_orders_delete on public.work_orders for delete using (tenant_id = public.get_user_tenant() and public.can_access('work_orders', 'write'));

create policy timeline_select on public.timeline_events for select using (tenant_id = public.get_user_tenant() and public.can_access('timeline_events', 'read'));
create policy timeline_insert on public.timeline_events for insert with check (tenant_id = public.get_user_tenant() and public.can_access('timeline_events', 'write'));
create policy timeline_update on public.timeline_events for update using (tenant_id = public.get_user_tenant() and public.can_access('timeline_events', 'write')) with check (tenant_id = public.get_user_tenant() and public.can_access('timeline_events', 'write'));
create policy timeline_delete on public.timeline_events for delete using (tenant_id = public.get_user_tenant() and public.can_access('timeline_events', 'write'));

create policy receivables_select on public.receivables for select using (tenant_id = public.get_user_tenant() and public.can_access('receivables', 'read'));
create policy receivables_insert on public.receivables for insert with check (tenant_id = public.get_user_tenant() and public.can_access('receivables', 'write'));
create policy receivables_update on public.receivables for update using (tenant_id = public.get_user_tenant() and public.can_access('receivables', 'write')) with check (tenant_id = public.get_user_tenant() and public.can_access('receivables', 'write'));
create policy receivables_delete on public.receivables for delete using (tenant_id = public.get_user_tenant() and public.can_access('receivables', 'write'));

create policy audit_logs_read on public.audit_logs for select using (tenant_id = public.get_user_tenant() and public.is_role('admin'));

insert into storage.buckets (id, name, public) values ('proposal-pdfs', 'proposal-pdfs', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('condo-documents', 'condo-documents', false) on conflict (id) do nothing;

create policy proposal_pdfs_read on storage.objects for select using (bucket_id = 'proposal-pdfs' and auth.role() = 'authenticated');
create policy proposal_pdfs_write on storage.objects for insert with check (bucket_id = 'proposal-pdfs' and auth.role() = 'authenticated');
create policy proposal_pdfs_update on storage.objects for update using (bucket_id = 'proposal-pdfs' and auth.role() = 'authenticated');

create policy condo_docs_read on storage.objects for select using (bucket_id = 'condo-documents' and auth.role() = 'authenticated');
create policy condo_docs_write on storage.objects for insert with check (bucket_id = 'condo-documents' and auth.role() = 'authenticated');
create policy condo_docs_update on storage.objects for update using (bucket_id = 'condo-documents' and auth.role() = 'authenticated');
