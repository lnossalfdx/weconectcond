import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isFrontOnly = !supabaseUrl || !supabaseAnonKey;

type Row = Record<string, any>;
type TableName =
  | 'profiles'
  | 'pipeline_stages'
  | 'leads'
  | 'condominiums'
  | 'contacts'
  | 'proposals'
  | 'contracts'
  | 'projects'
  | 'tasks'
  | 'work_orders'
  | 'timeline_events'
  | 'receivables';

const nowIso = () => new Date().toISOString();
const id = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);

const users = {
  'admin@condo.local': { id: 'u-admin', role: 'admin', full_name: 'Ana Admin' },
  'comercial@condo.local': { id: 'u-com', role: 'comercial', full_name: 'Carlos Comercial' },
  'tecnico@condo.local': { id: 'u-tec', role: 'tecnico', full_name: 'Tadeu Técnico' },
  'financeiro@condo.local': { id: 'u-fin', role: 'financeiro', full_name: 'Fernanda Financeiro' },
  'cs@condo.local': { id: 'u-cs', role: 'cs', full_name: 'Clara CS' },
  'leitor@condo.local': { id: 'u-read', role: 'leitor', full_name: 'Lucas Leitor' },
} as const;

const tenantId = 'front-tenant';

const mockDb: Record<TableName, Row[]> = {
  profiles: Object.values(users).map((u) => ({ user_id: u.id, tenant_id: tenantId, role: u.role, full_name: u.full_name, created_at: nowIso(), updated_at: nowIso(), deleted_at: null })),
  pipeline_stages: [
    { id: 'st-1', tenant_id: tenantId, name: 'Novo', order_no: 1, is_won: false, is_lost: false, deleted_at: null },
    { id: 'st-2', tenant_id: tenantId, name: 'Qualificação', order_no: 2, is_won: false, is_lost: false, deleted_at: null },
    { id: 'st-3', tenant_id: tenantId, name: 'Proposta', order_no: 3, is_won: false, is_lost: false, deleted_at: null },
    { id: 'st-4', tenant_id: tenantId, name: 'Fechado ganho', order_no: 4, is_won: true, is_lost: false, deleted_at: null },
  ],
  leads: Array.from({ length: 12 }).map((_, i) => ({
    id: `lead-${i + 1}`,
    tenant_id: tenantId,
    name: `Lead ${i + 1}`,
    phone: `+55 11 9${String(10000000 + i)}`,
    email: `lead${i + 1}@mail.local`,
    source: ['indicação', 'site', 'parceiro'][i % 3],
    status: ['novo', 'contato', 'negociação'][i % 3],
    score: 50 + i,
    notes: 'Lead de demonstração',
    stage_id: `st-${(i % 4) + 1}`,
    assigned_to: 'u-com',
    units_hint: 30 + i,
    urgency: ['baixa', 'media', 'alta', 'critica'][i % 4],
    created_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  })),
  condominiums: Array.from({ length: 8 }).map((_, i) => ({
    id: `cond-${i + 1}`,
    tenant_id: tenantId,
    name: `Condomínio ${i + 1}`,
    cnpj: `0000000000000${i}`,
    address: `Rua ${i + 1}, 100`,
    city: ['São Paulo', 'Campinas', 'Santos'][i % 3],
    units_count: 50 + i * 5,
    blocks_count: 2 + (i % 3),
    admin_company: `Admin ${i + 1}`,
    created_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  })),
  contacts: Array.from({ length: 8 }).map((_, i) => ({
    id: `contact-${i + 1}`,
    tenant_id: tenantId,
    condominium_id: `cond-${(i % 8) + 1}`,
    name: `Contato ${i + 1}`,
    role_in_condo: 'Síndico',
    phone: `+55 11 9${String(20000000 + i)}`,
    email: `contato${i + 1}@mail.local`,
    created_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  })),
  proposals: Array.from({ length: 6 }).map((_, i) => ({
    id: `prop-${i + 1}`,
    tenant_id: tenantId,
    lead_id: `lead-${i + 1}`,
    condominium_id: `cond-${(i % 6) + 1}`,
    status: ['rascunho', 'enviada', 'aceita'][i % 3],
    items: [{ description: 'Mensalidade', qty: 1, price: 1200 + i * 100 }],
    total: 1200 + i * 100,
    pdf_url: null,
    created_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  })),
  contracts: Array.from({ length: 4 }).map((_, i) => ({
    id: `contract-${i + 1}`,
    tenant_id: tenantId,
    proposal_id: `prop-${i + 1}`,
    status: ['ativo', 'pendente'][i % 2],
    start_date: new Date().toISOString().slice(0, 10),
    mrr: 1800 + i * 200,
    reajuste_percent: 6,
    created_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  })),
  projects: Array.from({ length: 4 }).map((_, i) => ({
    id: `project-${i + 1}`,
    tenant_id: tenantId,
    contract_id: `contract-${i + 1}`,
    status: ['planejado', 'em_andamento', 'concluido'][i % 3],
    due_date: new Date(Date.now() + 86400000 * (i + 5)).toISOString().slice(0, 10),
    created_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  })),
  tasks: Array.from({ length: 8 }).map((_, i) => ({
    id: `task-${i + 1}`,
    tenant_id: tenantId,
    project_id: `project-${(i % 4) + 1}`,
    title: `Tarefa ${i + 1}`,
    status: ['pendente', 'em_andamento', 'concluida'][i % 3],
    assigned_to: 'u-tec',
    due_date: new Date(Date.now() + 86400000 * (i + 3)).toISOString().slice(0, 10),
    created_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  })),
  work_orders: Array.from({ length: 10 }).map((_, i) => ({
    id: `os-${i + 1}`,
    tenant_id: tenantId,
    condominium_id: `cond-${(i % 8) + 1}`,
    category: ['Portaria', 'CFTV', 'Rede'][i % 3],
    priority: ['baixa', 'media', 'alta', 'critica'][i % 4],
    status: ['aberta', 'em_andamento', 'concluida'][i % 3],
    sla_due_at: new Date(Date.now() + 3600000 * (24 + i)).toISOString(),
    assigned_to: 'u-tec',
    cost: 200 + i * 25,
    description: `Chamado de demonstração #${i + 1}`,
    created_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  })),
  timeline_events: [
    { id: 'tl-1', tenant_id: tenantId, entity_type: 'lead', entity_id: 'lead-1', type: 'nota', content: 'Contato inicial realizado.', created_by: 'u-com', created_at: nowIso() },
    { id: 'tl-2', tenant_id: tenantId, entity_type: 'work_order', entity_id: 'os-1', type: 'status', content: 'Técnico em deslocamento.', created_by: 'u-tec', created_at: nowIso() },
  ],
  receivables: Array.from({ length: 8 }).map((_, i) => ({
    id: `rec-${i + 1}`,
    tenant_id: tenantId,
    contract_id: `contract-${(i % 4) + 1}`,
    due_date: new Date(Date.now() - 86400000 * i).toISOString().slice(0, 10),
    amount: 1500 + i * 70,
    status: i % 3 === 0 ? 'pago' : i % 3 === 1 ? 'aberto' : 'atrasado',
    paid_at: i % 3 === 0 ? nowIso() : null,
    created_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  })),
};

let authSession: any = null;
const listeners = new Set<(event: string, session: any) => void>();

try {
  const stored = localStorage.getItem('front-only-session');
  authSession = stored ? JSON.parse(stored) : null;
} catch {
  authSession = null;
}

function emitAuth(event: string, session: any) {
  listeners.forEach((fn) => fn(event, session));
}

function applySla(priority: string) {
  const hours = priority === 'critica' ? 6 : priority === 'alta' ? 24 : priority === 'baixa' ? 72 : 48;
  return new Date(Date.now() + hours * 3600000).toISOString();
}

function makeBuilder(table: TableName) {
  let rows = [...mockDb[table]];
  let countMode = false;
  let headMode = false;
  let pendingUpdate: Row | null = null;
  const predicates: Array<(row: Row) => boolean> = [];

  const applyPredicates = (input: Row[]) => input.filter((row) => predicates.every((p) => p(row)));

  const commitPendingUpdate = () => {
    if (!pendingUpdate) return;
    const updatePayload = pendingUpdate;
    mockDb[table] = mockDb[table].map((row) => {
      if (!predicates.every((p) => p(row))) return row;
      const next: Row = { ...row, ...updatePayload, updated_at: nowIso() };
      if (table === 'work_orders' && updatePayload.priority) next.sla_due_at = applySla(updatePayload.priority);
      return next;
    });
    rows = applyPredicates(mockDb[table]);
    pendingUpdate = null;
  };

  const builder: any = {
    select: (_query?: string, opts?: any) => {
      countMode = Boolean(opts?.count);
      headMode = Boolean(opts?.head);
      if (table === 'condominiums') {
        rows = rows.map((r) => ({ ...r, contacts: mockDb.contacts.filter((c) => c.condominium_id === r.id && !c.deleted_at) }));
      }
      if (table === 'projects') {
        rows = rows.map((r) => ({ ...r, tasks: mockDb.tasks.filter((t) => t.project_id === r.id && !t.deleted_at) }));
      }
      if (table === 'contracts') {
        rows = rows.map((r) => ({ ...r, proposals: mockDb.proposals.find((p) => p.id === r.proposal_id) ?? null }));
      }
      if (table === 'receivables') {
        rows = rows.map((r) => ({ ...r, contracts: mockDb.contracts.find((c) => c.id === r.contract_id) ?? null }));
      }
      return builder;
    },
    insert: async (payload: any) => {
      const list = Array.isArray(payload) ? payload : [payload];
      const inserted = list.map((item) => {
        const next = { ...item, id: item.id ?? id(), tenant_id: item.tenant_id ?? tenantId, created_at: nowIso(), updated_at: nowIso(), deleted_at: item.deleted_at ?? null };
        if (table === 'work_orders' && !next.sla_due_at) next.sla_due_at = applySla(next.priority ?? 'media');
        mockDb[table].push(next);
        return next;
      });
      rows = inserted;
      return { data: inserted, error: null };
    },
    upsert: async (payload: any) => {
      const list = Array.isArray(payload) ? payload : [payload];
      const out = list.map((item) => {
        const idx = mockDb[table].findIndex((r) => r.id === item.id && item.id);
        if (idx >= 0) {
          mockDb[table][idx] = { ...mockDb[table][idx], ...item, updated_at: nowIso() };
          if (table === 'work_orders' && item.priority) mockDb[table][idx].sla_due_at = applySla(item.priority);
          return mockDb[table][idx];
        }
        const created = { ...item, id: item.id ?? id(), tenant_id: item.tenant_id ?? tenantId, created_at: nowIso(), updated_at: nowIso(), deleted_at: item.deleted_at ?? null };
        if (table === 'work_orders' && !created.sla_due_at) created.sla_due_at = applySla(created.priority ?? 'media');
        mockDb[table].push(created);
        return created;
      });
      rows = out;
      return { data: out, error: null };
    },
    update: (payload: any) => {
      pendingUpdate = payload;
      return builder;
    },
    delete: () => builder,
    eq: (field: string, value: any) => {
      const predicate = (r: Row) => r[field] === value;
      predicates.push(predicate);
      rows = rows.filter(predicate);
      commitPendingUpdate();
      return builder;
    },
    ilike: (field: string, value: string) => {
      const q = value.replaceAll('%', '').toLowerCase();
      const predicate = (r: Row) => String(r[field] ?? '').toLowerCase().includes(q);
      predicates.push(predicate);
      rows = rows.filter(predicate);
      commitPendingUpdate();
      return builder;
    },
    in: (field: string, values: any[]) => {
      const predicate = (r: Row) => values.includes(r[field]);
      predicates.push(predicate);
      rows = rows.filter(predicate);
      commitPendingUpdate();
      return builder;
    },
    is: (field: string, value: any) => {
      const predicate = (r: Row) => r[field] === value;
      predicates.push(predicate);
      rows = rows.filter(predicate);
      commitPendingUpdate();
      return builder;
    },
    lt: (field: string, value: any) => {
      const predicate = (r: Row) => String(r[field]) < String(value);
      predicates.push(predicate);
      rows = rows.filter(predicate);
      commitPendingUpdate();
      return builder;
    },
    gte: (field: string, value: any) => {
      const predicate = (r: Row) => String(r[field]) >= String(value);
      predicates.push(predicate);
      rows = rows.filter(predicate);
      commitPendingUpdate();
      return builder;
    },
    order: (field: string, opts?: { ascending?: boolean }) => {
      const asc = opts?.ascending ?? true;
      rows = [...rows].sort((a, b) => (String(a[field] ?? '').localeCompare(String(b[field] ?? ''))) * (asc ? 1 : -1));
      return builder;
    },
    limit: (n: number) => {
      rows = rows.slice(0, n);
      return builder;
    },
    single: async () => ({ data: rows[0] ?? null, error: null }),
    then: (resolve: (value: any) => void) => {
      commitPendingUpdate();
      resolve({ data: headMode ? null : rows, error: null, count: countMode ? rows.length : null });
    },
    catch: () => builder,
    finally: () => builder,
  };

  return builder;
}

function createMockSupabase() {
  return {
    auth: {
      getSession: async () => ({ data: { session: authSession }, error: null }),
      onAuthStateChange: (cb: (event: string, session: any) => void) => {
        listeners.add(cb);
        return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
      },
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        if (!users[email as keyof typeof users] || password.length < 3) return { data: { session: null, user: null }, error: new Error('Credenciais inválidas') };
        const u = users[email as keyof typeof users];
        authSession = { user: { id: u.id, email }, access_token: 'front-only-token' };
        localStorage.setItem('front-only-session', JSON.stringify(authSession));
        emitAuth('SIGNED_IN', authSession);
        return { data: { session: authSession, user: authSession.user }, error: null };
      },
      signOut: async () => {
        authSession = null;
        localStorage.removeItem('front-only-session');
        emitAuth('SIGNED_OUT', null);
        return { error: null };
      },
      updateUser: async () => ({ data: { user: authSession?.user ?? null }, error: null }),
    },
    from: (table: TableName) => makeBuilder(table),
    storage: {
      from: () => ({
        upload: async (_path: string, _file: any) => ({ data: { path: 'mock-path' }, error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `#mock-${path}` } }),
      }),
    },
    channel: () => ({ on: () => ({ subscribe: () => ({ id: 'mock-channel' }) }) }),
    removeChannel: async () => ({ error: null }),
  };
}

export const supabase: any = isFrontOnly
  ? createMockSupabase()
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
