import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/app/pages/login-page';
import { DashboardPage } from '@/app/pages/dashboard-page';
import { LeadsPage } from '@/app/pages/leads-page';
import { PipelinePage } from '@/app/pages/pipeline-page';
import { CondominiosPage } from '@/app/pages/condominios-page';
import { PropostasPage } from '@/app/pages/propostas-page';
import { ContratosPage } from '@/app/pages/contratos-page';
import { ProjetosPage } from '@/app/pages/projetos-page';
import { OsPage } from '@/app/pages/os-page';
import { FinanceiroPage } from '@/app/pages/financeiro-page';
import { ConfigPage } from '@/app/pages/config-page';
import { LeadDetailPage } from '@/app/pages/lead-detail-page';
import { CondominioDetailPage } from '@/app/pages/condominio-detail-page';
import { OsDetailPage } from '@/app/pages/os-detail-page';
import { AppShell } from '@/components/layout/app-shell';
import { RequireAuth, RequireRole } from '@/app/guards';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/app" element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route element={<RequireRole resource="leads" action="read" />}><Route path="leads" element={<LeadsPage />} /><Route path="leads/:id" element={<LeadDetailPage />} /></Route>
          <Route element={<RequireRole resource="pipeline" action="read" />}><Route path="pipeline" element={<PipelinePage />} /></Route>
          <Route element={<RequireRole resource="condominios" action="read" />}><Route path="condominios" element={<CondominiosPage />} /><Route path="condominios/:id" element={<CondominioDetailPage />} /></Route>
          <Route element={<RequireRole resource="propostas" action="read" />}><Route path="propostas" element={<PropostasPage />} /></Route>
          <Route element={<RequireRole resource="contratos" action="read" />}><Route path="contratos" element={<ContratosPage />} /></Route>
          <Route element={<RequireRole resource="projetos" action="read" />}><Route path="projetos" element={<ProjetosPage />} /></Route>
          <Route element={<RequireRole resource="os" action="read" />}><Route path="os" element={<OsPage />} /><Route path="os/:id" element={<OsDetailPage />} /></Route>
          <Route element={<RequireRole resource="financeiro" action="read" />}><Route path="financeiro" element={<FinanceiroPage />} /></Route>
          <Route element={<RequireRole resource="config" action="admin" />}><Route path="config" element={<ConfigPage />} /></Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  );
}
