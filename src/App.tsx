import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { Loader2 } from "lucide-react";

import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";

// Chargement paresseux de chaque page — le bundle initial ne charge que ce qui est nécessaire
const Index            = lazy(() => import("./pages/Index"));
const Etablissement    = lazy(() => import("./pages/Etablissement"));
const BDL              = lazy(() => import("./pages/BDL"));
const Clubs            = lazy(() => import("./pages/Clubs"));
const BDLHistory       = lazy(() => import("./pages/BDLHistory"));
const BDLYearDetail    = lazy(() => import("./pages/BDLYearDetail"));
const BDLMemberProfile = lazy(() => import("./pages/BDLMemberProfile"));
const Actualites       = lazy(() => import("./pages/Actualites"));
const Documents        = lazy(() => import("./pages/Documents"));
const Events           = lazy(() => import("./pages/Events"));
const Calendrier       = lazy(() => import("./pages/Calendrier"));
const JOBDL            = lazy(() => import("./pages/jobdl/JOBDL"));
const JobdlArticle     = lazy(() => import("./pages/jobdl/[nor]"));
const Scrutin          = lazy(() => import("./pages/Scrutin"));
const Sondage          = lazy(() => import("./pages/Sondage"));
const Intranet         = lazy(() => import("./pages/Intranet"));
const Auth             = lazy(() => import("./pages/Auth"));
const Admin            = lazy(() => import("./pages/Admin"));
const Contact          = lazy(() => import("./pages/Contact"));
const Support          = lazy(() => import("./pages/Support"));
const Conference       = lazy(() => import("./pages/Conference"));
const CertificatVerif  = lazy(() => import("./pages/CertificatVerif"));
const Confirm          = lazy(() => import("./pages/Confirm"));
const ResetPassword    = lazy(() => import("./pages/ResetPassword"));
const Profile          = lazy(() => import("./pages/profile/Profile"));
const ProfileBDLSuivi  = lazy(() => import("./pages/profile/ProfileBDLSuivi"));
const NotFound         = lazy(() => import("./pages/NotFound"));
const Legal            = lazy(() => import("./pages/legals/Legal"));
const CGU              = lazy(() => import("./pages/legals/CGU"));
const MentionsLegales  = lazy(() => import("./pages/legals/Mentionslegales"));
const Confidentialite  = lazy(() => import("./pages/legals/Confidentialite"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

const App = () => {
  const location = useLocation();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ScrollToTop />
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />

              <Route path="/legal" element={<Legal />} />
              <Route path="/legal/cgu" element={<CGU />} />
              <Route path="/legal/mentions-legales" element={<MentionsLegales />} />
              <Route path="/legal/confidentialite" element={<Confidentialite />} />

              {/* Admin : /admin redirige vers la section par défaut */}
              <Route path="/admin" element={<Navigate to="/admin/news" replace />} />
              <Route path="/admin/:section" element={<Admin />} />

              <Route path="/etablissement" element={<Etablissement />} />
              <Route path="/bdl" element={<BDL />} />
              <Route path="/bdl/historique" element={<BDLHistory />} />
              <Route path="/bdl/historique/:year" element={<BDLYearDetail />} />
              <Route path="/bdl/:slug" element={<BDLMemberProfile />} />
              <Route path="/clubs" element={<Clubs />} />
              <Route path="/actualites" element={<Actualites />} />
              <Route path="/events" element={<Events />} />
              <Route path="/calendrier" element={<Calendrier />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/jo" element={<JOBDL />} />
              <Route path="/jo/:nor" element={<JobdlArticle />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/intranet" element={<Intranet />} />
              <Route path="/scrutin" element={<Scrutin />} />
              <Route path="/support" element={<Support />} />
              <Route path="/certificat-verif" element={<CertificatVerif />} />
              <Route path="/conference" element={<Conference />} />
              <Route path="/sondage" element={<Sondage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/bdl-profile" element={<ProfileBDLSuivi />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/confirm" element={<Confirm />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>

        <Analytics />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
