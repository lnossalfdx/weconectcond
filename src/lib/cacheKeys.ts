export const cacheKeys = {
  profile: ['profile'] as const,
  dashboard: ['dashboard'] as const,
  leads: ['leads'] as const,
  stages: ['pipeline-stages'] as const,
  condos: ['condominios'] as const,
  proposals: ['proposals'] as const,
  contracts: ['contracts'] as const,
  projects: ['projects'] as const,
  tasks: ['tasks'] as const,
  os: ['work-orders'] as const,
  receivables: ['receivables'] as const,
  timeline: (entity: string, id: string) => ['timeline', entity, id] as const,
};
