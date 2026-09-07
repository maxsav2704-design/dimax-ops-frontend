import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { apiFetch } from "@/lib/api";
import { normalizeAuthSession } from "@/lib/auth-session";

import Index from "./views/Index";
import CalendarPage from "./views/CalendarPage";
import InstallersPage from "./views/InstallersPage";
import JournalPage from "./views/JournalPage";
import JournalFormPage from "./views/JournalFormPage";
import LoginPage from "./views/LoginPage";
import ProjectsPage from "./views/ProjectsPage";
import ReportsPage from "./views/ReportsPage";
import DocumentsPage from "./views/DocumentsPage";
import EarningsLedgerPage from "./views/EarningsLedgerPage";
import SettingsPage from "./views/SettingsPage";
import NotFound from "./views/NotFound";

const queryClient = new QueryClient();

type AuthMeResponse = {
  role: "ADMIN" | "INSTALLER";
  admin_scope?: "OWNER" | "OPERATIONS" | "FINANCE" | "VIEWER" | null;
  can_view_rates?: boolean | null;
};

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const authQuery = useQuery({
    queryKey: ["legacy-auth-me"],
    queryFn: async () => {
      const response = await apiFetch<AuthMeResponse>("/api/v1/auth/me");
      return normalizeAuthSession(response);
    },
    retry: false,
    staleTime: 60_000,
  });

  if (authQuery.isPending) {
    return null;
  }

  const session = authQuery.data ?? null;
  const next = `${location.pathname}${location.search}${location.hash}`;

  if (!session) {
    return <Navigate to={`/login?next=${encodeURIComponent(next)}&error=auth_required`} replace />;
  }

  if (session.role !== "ADMIN") {
    return <Navigate to={`/login?next=${encodeURIComponent(next)}&error=admin_only`} replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Index />
              </RequireAuth>
            }
          />
          <Route
            path="/projects"
            element={
              <RequireAuth>
                <ProjectsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/calendar"
            element={
              <RequireAuth>
                <CalendarPage />
              </RequireAuth>
            }
          />
          <Route
            path="/installers"
            element={
              <RequireAuth>
                <InstallersPage />
              </RequireAuth>
            }
          />
          <Route
            path="/journal"
            element={
              <RequireAuth>
                <JournalPage />
              </RequireAuth>
            }
          />
          <Route
            path="/journal/:id"
            element={
              <RequireAuth>
                <JournalFormPage />
              </RequireAuth>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAuth>
                <ReportsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/documents"
            element={
              <RequireAuth>
                <DocumentsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/earnings-ledger"
            element={
              <RequireAuth>
                <EarningsLedgerPage />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
