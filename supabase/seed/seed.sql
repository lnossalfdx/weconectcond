-- Seed CRM condomínio: 1 tenant, 6 users, 30 leads, 10 condomínios, 20 OS, 10 propostas, 5 contratos

with tenant as (
  insert into public.tenants (id, name)
  values ('11111111-1111-1111-1111-111111111111', 'Condo Prime')
  on conflict (id) do update set name = excluded.name
  returning id
)
select id from tenant;

-- Users (senha: Pass@123)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@condo.local', crypt('Pass@123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"tenant_id":"11111111-1111-1111-1111-111111111111","role":"admin","full_name":"Ana Admin"}', now(), now(), '', '', '', ''),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'comercial@condo.local', crypt('Pass@123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"tenant_id":"11111111-1111-1111-1111-111111111111","role":"comercial","full_name":"Carlos Comercial"}', now(), now(), '', '', '', ''),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tecnico@condo.local', crypt('Pass@123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"tenant_id":"11111111-1111-1111-1111-111111111111","role":"tecnico","full_name":"Tadeu Técnico"}', now(), now(), '', '', '', ''),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'financeiro@condo.local', crypt('Pass@123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"tenant_id":"11111111-1111-1111-1111-111111111111","role":"financeiro","full_name":"Fernanda Financeiro"}', now(), now(), '', '', '', ''),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cs@condo.local', crypt('Pass@123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"tenant_id":"11111111-1111-1111-1111-111111111111","role":"cs","full_name":"Clara CS"}', now(), now(), '', '', '', ''),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'leitor@condo.local', crypt('Pass@123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"tenant_id":"11111111-1111-1111-1111-111111111111","role":"leitor","full_name":"Lucas Leitor"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id)
values
  ('admin@condo.local','10000000-0000-0000-0000-000000000001','{"sub":"10000000-0000-0000-0000-000000000001","email":"admin@condo.local"}','email',now(),now(),now(),'20000000-0000-0000-0000-000000000001'),
  ('comercial@condo.local','10000000-0000-0000-0000-000000000002','{"sub":"10000000-0000-0000-0000-000000000002","email":"comercial@condo.local"}','email',now(),now(),now(),'20000000-0000-0000-0000-000000000002'),
  ('tecnico@condo.local','10000000-0000-0000-0000-000000000003','{"sub":"10000000-0000-0000-0000-000000000003","email":"tecnico@condo.local"}','email',now(),now(),now(),'20000000-0000-0000-0000-000000000003'),
  ('financeiro@condo.local','10000000-0000-0000-0000-000000000004','{"sub":"10000000-0000-0000-0000-000000000004","email":"financeiro@condo.local"}','email',now(),now(),now(),'20000000-0000-0000-0000-000000000004'),
  ('cs@condo.local','10000000-0000-0000-0000-000000000005','{"sub":"10000000-0000-0000-0000-000000000005","email":"cs@condo.local"}','email',now(),now(),now(),'20000000-0000-0000-0000-000000000005'),
  ('leitor@condo.local','10000000-0000-0000-0000-000000000006','{"sub":"10000000-0000-0000-0000-000000000006","email":"leitor@condo.local"}','email',now(),now(),now(),'20000000-0000-0000-0000-000000000006')
on conflict (id) do nothing;

insert into public.pipeline_stages (id, tenant_id, name, order_no, is_won, is_lost)
values
  ('30000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Novo', 1, false, false),
  ('30000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Qualificação', 2, false, false),
  ('30000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Proposta', 3, false, false),
  ('30000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Fechado ganho', 4, true, false),
  ('30000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Fechado perdido', 5, false, true)
on conflict (id) do nothing;

insert into public.condominiums (id, tenant_id, name, cnpj, address, city, units_count, blocks_count, admin_company)
select
  format('40000000-0000-0000-0000-%012s', gs)::uuid,
  '11111111-1111-1111-1111-111111111111',
  'Condomínio ' || gs,
  lpad((10000000000000 + gs)::text, 14, '0'),
  'Rua ' || gs || ', 100',
  (array['São Paulo','Campinas','Santos','Ribeirão Preto','Sorocaba'])[(gs % 5) + 1],
  40 + gs * 3,
  1 + (gs % 5),
  'Administradora ' || ((gs % 4) + 1)
from generate_series(1, 10) as gs
on conflict (id) do nothing;

insert into public.contacts (tenant_id, condominium_id, name, role_in_condo, phone, email)
select
  '11111111-1111-1111-1111-111111111111',
  c.id,
  'Contato ' || row_number() over (),
  (array['Síndico', 'Conselheiro', 'Zelador'])[(row_number() over () % 3) + 1],
  '+55 11 9' || lpad((10000000 + row_number() over ())::text, 8, '0'),
  'contato' || row_number() over () || '@condo.local'
from public.condominiums c
limit 15;

insert into public.leads (id, tenant_id, name, phone, email, source, status, notes, stage_id, assigned_to, units_hint, urgency)
select
  format('50000000-0000-0000-0000-%012s', gs)::uuid,
  '11111111-1111-1111-1111-111111111111',
  'Lead ' || gs,
  '+55 11 9' || lpad((20000000 + gs)::text, 8, '0'),
  'lead' || gs || '@mail.local',
  (array['indicação','site','parceiro','evento'])[(gs % 4) + 1],
  (array['novo','contato','negociação'])[(gs % 3) + 1],
  'Lead seed ' || gs,
  (array[
    '30000000-0000-0000-0000-000000000001'::uuid,
    '30000000-0000-0000-0000-000000000002'::uuid,
    '30000000-0000-0000-0000-000000000003'::uuid
  ])[(gs % 3) + 1],
  (array[
    '10000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000005'::uuid
  ])[(gs % 3) + 1],
  20 + gs,
  (array['baixa'::public.work_priority,'media'::public.work_priority,'alta'::public.work_priority,'critica'::public.work_priority])[(gs % 4) + 1]
from generate_series(1, 30) as gs
on conflict (id) do nothing;

insert into public.proposals (id, tenant_id, lead_id, condominium_id, status, items, total)
select
  format('60000000-0000-0000-0000-%012s', gs)::uuid,
  '11111111-1111-1111-1111-111111111111',
  format('50000000-0000-0000-0000-%012s', gs)::uuid,
  format('40000000-0000-0000-0000-%012s', ((gs - 1) % 10) + 1)::uuid,
  (array['rascunho'::public.proposal_status,'enviada'::public.proposal_status,'aceita'::public.proposal_status])[(gs % 3) + 1],
  jsonb_build_array(
    jsonb_build_object('description', 'Implantação', 'qty', 1, 'price', 2000 + gs * 100),
    jsonb_build_object('description', 'Mensalidade', 'qty', 1, 'price', 700 + gs * 10)
  ),
  (2700 + gs * 110)::numeric
from generate_series(1, 10) as gs
on conflict (id) do nothing;

insert into public.contracts (id, tenant_id, proposal_id, status, start_date, mrr, reajuste_percent)
select
  format('70000000-0000-0000-0000-%012s', gs)::uuid,
  '11111111-1111-1111-1111-111111111111',
  format('60000000-0000-0000-0000-%012s', gs)::uuid,
  (array['ativo'::public.contract_status,'pendente'::public.contract_status])[(gs % 2) + 1],
  current_date - (gs * 10),
  (1500 + gs * 200)::numeric,
  6.0
from generate_series(1, 5) as gs
on conflict (id) do nothing;

insert into public.projects (id, tenant_id, contract_id, status, due_date)
select
  format('80000000-0000-0000-0000-%012s', gs)::uuid,
  '11111111-1111-1111-1111-111111111111',
  format('70000000-0000-0000-0000-%012s', gs)::uuid,
  (array['planejado','em_andamento','concluido'])[(gs % 3) + 1],
  current_date + (gs * 12)
from generate_series(1, 5) as gs
on conflict (id) do nothing;

insert into public.tasks (tenant_id, project_id, title, status, assigned_to, due_date)
select
  '11111111-1111-1111-1111-111111111111',
  format('80000000-0000-0000-0000-%012s', ((gs - 1) % 5) + 1)::uuid,
  'Tarefa ' || gs,
  (array['pendente','em_andamento','concluida'])[(gs % 3) + 1],
  (array[
    '10000000-0000-0000-0000-000000000003'::uuid,
    '10000000-0000-0000-0000-000000000005'::uuid
  ])[(gs % 2) + 1],
  current_date + gs
from generate_series(1, 15) as gs;

insert into public.work_orders (id, tenant_id, condominium_id, category, priority, status, assigned_to, cost, description)
select
  format('90000000-0000-0000-0000-%012s', gs)::uuid,
  '11111111-1111-1111-1111-111111111111',
  format('40000000-0000-0000-0000-%012s', ((gs - 1) % 10) + 1)::uuid,
  (array['Portaria','CFTV','Rede','Controle de acesso'])[(gs % 4) + 1],
  (array['baixa'::public.work_priority,'media'::public.work_priority,'alta'::public.work_priority,'critica'::public.work_priority])[(gs % 4) + 1],
  (array['aberta'::public.work_order_status,'em_andamento'::public.work_order_status,'concluida'::public.work_order_status])[(gs % 3) + 1],
  '10000000-0000-0000-0000-000000000003',
  (300 + gs * 30)::numeric,
  'Chamado seed #' || gs
from generate_series(1, 20) as gs
on conflict (id) do nothing;

insert into public.receivables (tenant_id, contract_id, due_date, amount, status, paid_at)
select
  '11111111-1111-1111-1111-111111111111',
  format('70000000-0000-0000-0000-%012s', ((gs - 1) % 5) + 1)::uuid,
  current_date - (gs * 3),
  (1200 + gs * 70)::numeric,
  case when gs % 3 = 0 then 'pago'::public.receivable_status when gs % 3 = 1 then 'aberto'::public.receivable_status else 'atrasado'::public.receivable_status end,
  case when gs % 3 = 0 then now() - (gs || ' days')::interval else null end
from generate_series(1, 12) as gs;

insert into public.timeline_events (tenant_id, entity_type, entity_id, type, content, created_by)
values
  ('11111111-1111-1111-1111-111111111111', 'lead', '50000000-0000-0000-0000-000000000001', 'mensagem', 'Primeiro contato realizado', '10000000-0000-0000-0000-000000000002'),
  ('11111111-1111-1111-1111-111111111111', 'condominium', '40000000-0000-0000-0000-000000000001', 'nota', 'Visita técnica agendada', '10000000-0000-0000-0000-000000000005'),
  ('11111111-1111-1111-1111-111111111111', 'work_order', '90000000-0000-0000-0000-000000000001', 'status', 'OS em andamento', '10000000-0000-0000-0000-000000000003');
