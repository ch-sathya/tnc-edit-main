import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { TopLoadingBar } from "@/components/TopLoadingBar";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Portfolio from "./pages/Portfolio";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Editor from "./pages/Editor";
import Collaborate from "./pages/Collaborate";
import CollaborationRoom from "./pages/CollaborationRoom";
import Community from "./pages/Community";
import Connections from "./pages/Connections";
import News from "./pages/News";
import NewsArticle from "./components/NewsArticle";
import Auth from "./pages/Auth";
import UsernameSetup from "./pages/UsernameSetup";
import Settings from "./pages/Settings";
import ResetPassword from "./pages/ResetPassword";
import JoinRoom from "./pages/JoinRoom";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import UserProfile from "./pages/UserProfile";
import SharedSnippet from "./pages/SharedSnippet";
import Notifications from "./pages/Notifications";

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex items-center gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
      <span className="text-sm">Loading…</span>
    </div>
  </div>
);

// Smooth route transitions with top loading bar
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <>
      <TopLoadingBar />
      <div key={location.pathname} className="min-h-screen animate-fade-in">
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/home" element={<Home />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/dashboard" element={<Portfolio />} />
            <Route path="/@:username" element={<Portfolio />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/editor/:projectId" element={<Editor />} />
            <Route path="/collaborate" element={<Collaborate />} />
            <Route path="/collaborate/join" element={<JoinRoom />} />
            <Route path="/collaborate/:roomId" element={<CollaborationRoom />} />
            <Route path="/community" element={<Community />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/user/:userId" element={<UserProfile />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:id" element={<NewsArticle />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/setup-username" element={<UsernameSetup />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/snippet/:shortCode" element={<SharedSnippet />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </>
  );
};

const App = () => {
  // Ensure dark mode is set immediately to prevent white flash
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
