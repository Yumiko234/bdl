import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/etablissement" element={<Etablissement />} />
        <Route path="/bdl" element={<BDL />} />
        <Route path="/clubs" element={<Clubs />} />
        <Route path="/actualites" element={<Actualites />} />
        <Route path="/events" element={<Events />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/jobdl" element={<JOBDL />} />
        <Route path="/jobdl/:nor" element={<JobdlArticle />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/intranet" element={<Intranet />} />
        <Route path="/admin" element={<Admin />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
