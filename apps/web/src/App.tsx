import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
import { RolesProvider } from "@/contexts/RolesContext";
import { PricingProvider } from "@/contexts/PricingContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { ScrollToTop } from "@/components/ScrollToTop";
import { FeedbackPopup } from "@/components/FeedbackPopup";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { ImpersonationApprovalPopup } from "@/components/ImpersonationApprovalPopup";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import Docs from "./pages/Docs";
import Auth from "./pages/Auth";
import Overview from "./pages/dashboard/Overview";
import ParseCV from "./pages/dashboard/ParseCV";
import BulkParse from "./pages/dashboard/BulkParse";
import DeveloperDashboard from "./pages/dashboard/DeveloperDashboard";
import OpenRoles from "./pages/dashboard/OpenRoles";
import RoleDetails from "./pages/dashboard/RoleDetails";
import AllCandidates from "./pages/dashboard/AllCandidates";
import CandidateDetail from "./pages/dashboard/CandidateDetail";
import Analytics from "./pages/Analytics";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import UpgradePlan from "./pages/UpgradePlan";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import FeatureRequests from "./pages/FeatureRequests";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import ParseScoreTest from "./pages/ParseScoreTest";

const queryClient = new QueryClient();

const AppContent = () => {
  return (
    <>
      <Toaster />
      <Sonner />
      <FeedbackPopup />
      <ImpersonationBanner />
      <ImpersonationApprovalPopup />
      <BrowserRouter>
          <ScrollToTop />
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
          <Route path="/dashboard/parse" element={<ProtectedRoute><ParseCV /></ProtectedRoute>} />
          <Route path="/dashboard/bulk-parse" element={<ProtectedRoute><BulkParse /></ProtectedRoute>} />
          <Route path="/dashboard/developer" element={<ProtectedRoute><DeveloperDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/roles" element={<ProtectedRoute><OpenRoles /></ProtectedRoute>} />
          <Route path="/dashboard/roles/:id" element={<ProtectedRoute><RoleDetails /></ProtectedRoute>} />
          <Route path="/dashboard/candidates" element={<ProtectedRoute><AllCandidates /></ProtectedRoute>} />
          <Route path="/dashboard/candidates/:candidateId/:roleId" element={<ProtectedRoute><CandidateDetail /></ProtectedRoute>} />
          <Route path="/dashboard/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/dashboard/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/upgrade" element={<ProtectedRoute><UpgradePlan /></ProtectedRoute>} />
          <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/feature-requests" element={<ProtectedRoute><FeatureRequests /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          {/* ParseScore API Test Route - ONLY in development */}
          {import.meta.env.DEV && <Route path="/test-parsescore" element={<ParseScoreTest />} />}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <ImpersonationProvider>
        <RolesProvider>
          <PricingProvider>
            <TooltipProvider>
              <AppContent />
            </TooltipProvider>
          </PricingProvider>
        </RolesProvider>
      </ImpersonationProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;