import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";

import { getAccessToken } from "@/lib/api";

import Index from "./views/Index";
import CalendarPage from "./views/CalendarPage";
import InstallersPage from "./views/InstallersPage";
import JournalPage from "./views/JournalPage";
import JournalFormPage from "./views/JournalFormPage";
import LoginPage from "./views/LoginPage";
import ProjectsPage from "./views/ProjectsPage";
import ReportsPage from "./views/ReportsPage";
import SettingsPage from "./views/SettingsPage";
import NotFound from "./views/NotFound";

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: ReactNode }) {
  const token = getAccessToken();
  if (!token) {
    return <Navigate to="/login" replace />;
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
