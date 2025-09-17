import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Bills from "./pages/Bills";
import Reports from "./pages/Reports";
import Agents from "./pages/Agents";
import MemberInvitations from "./pages/MemberInvitations";
import AcceptInvitation from "./pages/AcceptInvitation";
import ExpenseReports from "./pages/ExpenseReports";
import Societies from "./pages/Societies";
import Debug from "./pages/Debug";
import SiteLayout from "./layout/SiteLayout";
import { AuthProvider } from "@/context/AuthContext";
import AuthPage from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/societies" element={<Societies />} />
              <Route path="/invitations" element={<MemberInvitations />} />
              <Route path="/expense-reports" element={<ExpenseReports />} />
              <Route path="/debug" element={<Debug />} />
            </Route>
            <Route path="/accept-invitation" element={<AcceptInvitation />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
