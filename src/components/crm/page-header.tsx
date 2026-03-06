import { cn } from '@/lib/utils';

export function PageHeader({ title, description, actions, className }: { title: string; description?: string; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex flex-col justify-between gap-2 rounded-2xl border bg-card p-4 md:flex-row md:items-center', className)}>
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions ? <div className="crm-page-header-actions">{actions}</div> : null}
    </div>
  );
}
