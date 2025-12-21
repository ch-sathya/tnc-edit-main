import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Portfolio from "./pages/Portfolio";
import Projects from "./pages/Projects";
import Collaborate from "./pages/Collaborate";
import CollaborationRoom from "./pages/CollaborationRoom";
import Community from "./pages/Community";
import News from "./pages/News";
import NewsArticle from "./components/NewsArticle";
import Auth from "./pages/Auth";
import UsernameSetup from "./pages/UsernameSetup";
import Settings from "./pages/Settings";
import ResetPassword from "./pages/ResetPassword";
import JoinRoom from "./pages/JoinRoom";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Home />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/@:username" element={<Portfolio />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/collaborate" element={<Collaborate />} />
          <Route path="/collaborate/join" element={<JoinRoom />} />
          <Route path="/collaborate/:roomId" element={<CollaborationRoom />} />
          <Route path="/community" element={<Community />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:id" element={<NewsArticle />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/setup-username" element={<UsernameSetup />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
