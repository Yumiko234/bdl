import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";

import Index from "./pages/Index";
import Etablissement from "./pages/Etablissement";
import BDL from "./pages/BDL";
import Clubs from "./pages/Clubs";
import Actualites from "./pages/Actualites";
import Documents from "./pages/Documents";
import Events from "./pages/Events";
import Contact from "./pages/Contact";
import Intranet from "./pages/Intranet";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import JOBDL from "./pages/jobdl/JOBDL";
import JobdlArticle from "./pages/jobdl/[nor]";
import Scrutin from "./pages/Scrutin";
import NotFound from "./pages/NotFound";
import BDLHistory from "./pages/BDLHistory";
import BDLYearDetail from "./pages/BDLYearDetail";
import Sondage from "./pages/Sondage";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/etablissement" element={<Etablissement />} />
          <Route path="/bdl" element={<BDL />} />
          <Route path="/bdl/historique" element={<BDLHistory />} />
          <Route path="/bdl/historique/:year" element={<BDLYearDetail />} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/actualites" element={<Actualites />} />
          <Route path="/events" element={<Events />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/jo" element={<JOBDL />} />
          <Route path="/jo/:nor" element={<JobdlArticle />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/intranet" element={<Intranet />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/scrutin" element={<Scrutin />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<NotFound />} />
        </Routes>

        {/* Suivi Vercel Analytics */}
        <Analytics />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App
