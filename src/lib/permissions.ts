export type Role = 'admin' | 'comercial' | 'tecnico' | 'financeiro' | 'cs' | 'leitor';

type Resource =
  | 'leads'
  | 'pipeline'
  | 'propostas'
  | 'condominios'
  | 'os'
  | 'financeiro'
  | 'contratos'
  | 'projetos'
  | 'config'
  | 'dashboard';

type Action = 'read' | 'write' | 'admin';

const matrix: Record<Role, Record<Resource, Action[]>> = {
  admin: {
    leads: ['read', 'write', 'admin'],
    pipeline: ['read', 'write', 'admin'],
    propostas: ['read', 'write', 'admin'],
    condominios: ['read', 'write', 'admin'],
    os: ['read', 'write', 'admin'],
    financeiro: ['read', 'write', 'admin'],
    contratos: ['read', 'write', 'admin'],
    projetos: ['read', 'write', 'admin'],
    config: ['read', 'write', 'admin'],
    dashboard: ['read', 'write', 'admin'],
  },
  comercial: {
    leads: ['read', 'write'],
    pipeline: ['read', 'write'],
    propostas: ['read', 'write'],
    condominios: ['read', 'write'],
    os: ['read'],
    financeiro: ['read'],
    contratos: ['read'],
    projetos: ['read'],
    config: ['read'],
    dashboard: ['read'],
  },
  tecnico: {
    leads: ['read'],
    pipeline: ['read'],
    propostas: ['read'],
    condominios: ['read'],
    os: ['read', 'write'],
    financeiro: ['read'],
    contratos: ['read'],
    projetos: ['read', 'write'],
    config: ['read'],
    dashboard: ['read'],
  },
  financeiro: {
    leads: ['read'],
    pipeline: ['read'],
    propostas: ['read'],
    condominios: ['read'],
    os: ['read'],
    financeiro: ['read', 'write'],
    contratos: ['read', 'write'],
    projetos: ['read'],
    config: ['read'],
    dashboard: ['read'],
  },
  cs: {
    leads: ['read'],
    pipeline: ['read'],
    propostas: ['read'],
    condominios: ['read', 'write'],
    os: ['read'],
    financeiro: ['read'],
    contratos: ['read'],
    projetos: ['read', 'write'],
    config: ['read'],
    dashboard: ['read'],
  },
  leitor: {
    leads: ['read'],
    pipeline: ['read'],
    propostas: ['read'],
    condominios: ['read'],
    os: ['read'],
    financeiro: ['read'],
    contratos: ['read'],
    projetos: ['read'],
    config: ['read'],
    dashboard: ['read'],
  },
};

export function can(role: Role | undefined, action: Action, resource: Resource) {
  if (!role) return false;
  return matrix[role][resource].includes(action);
}
